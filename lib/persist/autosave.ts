/**
 * Autosave runtime — workspaceStore.structureVersion 변경을 구독해서
 * debounce 후 IndexedDB 에 XML 을 저장.
 *
 * Anchor: docs/spec/22_autosave.md §4.
 *
 * 흐름:
 *   1. settingsStore.autosave === true 일 때만 활성.
 *   2. 어느 워크스페이스라도 structureVersion 이 bump → debounce(autosaveDebounceMs).
 *   3. debounce 후 adapter.serializeXml(html/css/i18n) 합본 (1 XML) → saveWorkspace.
 *   4. 실패 (quota / too-large / unknown) → 토스트 1회, autosave 자동 OFF 는 X
 *      (사용자 의도에 어긋남). 다음 변경에 재시도.
 *
 * SSR safe — installAutosave 는 client effect 안에서만 호출 (EditorShell).
 *
 * 안전장치
 *   - 영시영 / 특정 시트 종류 hardcoding 없음 (XML 그대로 저장).
 *   - 10MB 초과 시 skip + 토스트 1회.
 *   - quota 초과 시 토스트 1회 (rate-limited 30s).
 *   - 같은 structureVersion 으로 중복 호출 방지 (subscribe selector 가 처리).
 */

import { toast } from 'sonner';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import {
  WORKSPACE_KEYS,
  useWorkspaceStore,
  type WorkspaceKey,
} from '@/lib/stores/workspaceStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import {
  usePreviewStore,
  type AssetReplacementProfile,
} from '@/lib/stores/previewStore';
import { AUTOSAVE_KEY, saveWorkspace, type SaveError, type SaveResult } from './indexeddb';

/** 복합 XML 형태 — 3 워크스페이스 합본. spec 22 §3.2. */
const COMBINED_XML_VERSION = 2;

export type ParsedCombinedXml = Record<WorkspaceKey, string> & {
  assetReplacementMap?: string;
  assetReplacementProfiles?: AssetReplacementProfile[];
  activeAssetReplacementProfileId?: string | null;
  documentLanguage?: string;
};

/**
 * 3 워크스페이스 (html/css/i18n) XML 을 하나의 wrapper 로 묶는다.
 * 복구 시 같은 wrapper 를 파싱해 각 워크스페이스로 분배.
 */
export function buildCombinedXml(): string {
  const adapter = getBlocklyAdapter();
  const previewState = usePreviewStore.getState();
  const assetReplacementMap = previewState.assetReplacementMap;
  const assetReplacementProfiles = previewState.assetReplacementProfiles;
  const activeAssetReplacementProfileId = previewState.activeAssetReplacementProfileId;
  const documentLanguage = previewState.documentLanguage;
  const parts: string[] = [];
  parts.push(
    `<r20-autosave version="${COMBINED_XML_VERSION}" ts="${Date.now()}">`,
  );
  for (const key of WORKSPACE_KEYS) {
    const xml = adapter.serializeXml(key) || '';
    // CDATA wrap — 안의 ]]> 는 split 으로 회피.
    const safe = xml.replace(/\]\]>/g, ']]]]><![CDATA[>');
    parts.push(`<ws key="${key}"><![CDATA[${safe}]]></ws>`);
  }
  parts.push('<preview>');
  parts.push(
    `<asset-replacement-map><![CDATA[${escapeCdata(assetReplacementMap)}]]></asset-replacement-map>`,
  );
  parts.push(
    `<asset-replacement-profiles active-id="${escapeAttr(activeAssetReplacementProfileId ?? '')}"><![CDATA[${escapeCdata(JSON.stringify(assetReplacementProfiles))}]]></asset-replacement-profiles>`,
  );
  parts.push(
    `<document-language><![CDATA[${escapeCdata(documentLanguage)}]]></document-language>`,
  );
  parts.push('</preview>');
  parts.push('</r20-autosave>');
  return parts.join('');
}

function escapeCdata(text: string): string {
  return String(text ?? '').replace(/\]\]>/g, ']]]]><![CDATA[>');
}

function escapeAttr(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 복구 — combined XML 을 파싱해 { html, css, i18n } 로 분해.
 * 파싱 실패 / 형식 어김 시 null.
 *
 * DOMParser 사용 — 브라우저 한정 (autosave 복구 자체가 client 한정).
 */
export function parseCombinedXml(
  xml: string,
): ParsedCombinedXml | null {
  if (typeof DOMParser === 'undefined') return null;
  if (!xml || typeof xml !== 'string') return null;
  try {
    const dom = new DOMParser().parseFromString(xml, 'application/xml');
    const root = dom.documentElement;
    if (!root || root.nodeName !== 'r20-autosave') return null;
    const wsNodes = root.getElementsByTagName('ws');
    const out: Partial<Record<WorkspaceKey, string>> = {};
    for (let i = 0; i < wsNodes.length; i++) {
      const node = wsNodes[i];
      const key = node.getAttribute('key') as WorkspaceKey | null;
      if (!key || !WORKSPACE_KEYS.includes(key)) continue;
      out[key] = node.textContent ?? '';
    }
    // 3개 모두 있어야 valid (없으면 빈 XML 로 채워줘도 OK 하지만 안전선 = 모두 존재).
    const previewNode = root.getElementsByTagName('preview')[0] ?? null;
    const assetMapNode = previewNode?.getElementsByTagName('asset-replacement-map')[0] ?? null;
    const profileNode = previewNode?.getElementsByTagName('asset-replacement-profiles')[0] ?? null;
    const languageNode = previewNode?.getElementsByTagName('document-language')[0] ?? null;
    return {
      html: out.html ?? '',
      css: out.css ?? '',
      i18n: out.i18n ?? '',
      worker: out.worker ?? '',
      assetReplacementMap: assetMapNode ? assetMapNode.textContent ?? '' : undefined,
      assetReplacementProfiles: parseAssetReplacementProfiles(profileNode?.textContent ?? ''),
      activeAssetReplacementProfileId: profileNode?.getAttribute('active-id') || null,
      documentLanguage: languageNode ? languageNode.textContent ?? '' : undefined,
    };
  } catch {
    return null;
  }
}

function parseAssetReplacementProfiles(text: string): AssetReplacementProfile[] | undefined {
  if (!text.trim()) return undefined;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return undefined;
    return parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        text: String(item.text ?? ''),
        updatedAt: Number(item.updatedAt ?? 0),
      }));
  } catch {
    return undefined;
  }
}

let installed = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastErrorAt = 0;
let unsubVersion: (() => void) | null = null;
let unsubPreview: (() => void) | null = null;

/**
 * EditorShell mount 시 1회 호출. 두 번째 호출은 no-op (idempotent).
 *
 * unmount 시 cleanup — 호출자가 반환된 함수를 호출하면 timer + subscribe 해제.
 */
export function installAutosave(): () => void {
  if (installed) return () => {};
  installed = true;

  const trigger = (): void => {
    const settings = useSettingsStore.getState();
    if (!settings.autosave) return;
    if (timer) clearTimeout(timer);
    const ms = Math.max(500, settings.autosaveDebounceMs ?? 5000);
    timer = setTimeout(() => {
      timer = null;
      void runSave();
    }, ms);
  };

  // workspaceStore.structureVersion 변경 구독.
  // 3 워크스페이스 합산 version — 어느 하나라도 바뀌면 trigger.
  unsubVersion = useWorkspaceStore.subscribe((state, prev) => {
    const sumNow =
      WORKSPACE_KEYS.reduce((sum, key) => sum + state.workspaces[key].structureVersion, 0);
    const sumPrev =
      WORKSPACE_KEYS.reduce((sum, key) => sum + prev.workspaces[key].structureVersion, 0);
    if (sumNow !== sumPrev) trigger();
  });
  unsubPreview = usePreviewStore.subscribe((state, prev) => {
    if (state.assetReplacementMap !== prev.assetReplacementMap) trigger();
    if (state.assetReplacementProfiles !== prev.assetReplacementProfiles) trigger();
    if (state.activeAssetReplacementProfileId !== prev.activeAssetReplacementProfileId) trigger();
    if (state.documentLanguage !== prev.documentLanguage) trigger();
  });

  return () => {
    installed = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (unsubVersion) {
      unsubVersion();
      unsubVersion = null;
    }
    if (unsubPreview) {
      unsubPreview();
      unsubPreview = null;
    }
  };
}

/** 토스트 분기 — 같은 에러는 30초당 한 번만 (UI 스팸 방지). */
function notifyError(kind: SaveError): void {
  const now = Date.now();
  if (now - lastErrorAt < 30_000) return;
  lastErrorAt = now;
  switch (kind) {
    case 'too-large':
      toast.warning('자동 저장 건너뜀 — 워크스페이스가 10MB 를 넘었습니다.', {
        duration: 4000,
      });
      break;
    case 'quota-exceeded':
      toast.error('자동 저장 실패 — 브라우저 저장 공간이 부족합니다.', {
        duration: 4000,
      });
      break;
    case 'idb-unavailable':
      toast.warning('자동 저장 불가 — 이 브라우저는 IndexedDB 를 지원하지 않습니다.', {
        duration: 4000,
      });
      break;
    case 'invalid-key':
    case 'unknown':
    default:
      toast.error('자동 저장 실패 — 잠시 후 재시도합니다.', { duration: 3000 });
      break;
  }
}

export async function saveCurrentWorkspaceSnapshot(): Promise<SaveResult> {
  try {
    const xml = buildCombinedXml();
    const state = useWorkspaceStore.getState();
    const blockCount =
      WORKSPACE_KEYS.reduce((sum, key) => sum + state.workspaces[key].blockCount, 0);
    const result = await saveWorkspace(AUTOSAVE_KEY, xml, {
      ts: Date.now(),
      blockCount,
    });
    if (!result.ok) {
      notifyError(result.error ?? 'unknown');
      return result;
    }
    for (const key of WORKSPACE_KEYS) {
      useWorkspaceStore.getState().markSaved(key);
    }
    return result;
  } catch {
    notifyError('unknown');
    return { ok: false, error: 'unknown' };
  }
}

async function runSave(): Promise<void> {
  await saveCurrentWorkspaceSnapshot();
}

/**
 * Manual flush — test / 페이지 종료 hook 등에서 즉시 저장하고 싶을 때.
 * pending timer 가 있으면 즉시 실행.
 */
export async function flushAutosave(): Promise<SaveResult | null> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const settings = useSettingsStore.getState();
  if (!settings.autosave) return null;
  return saveCurrentWorkspaceSnapshot();
}

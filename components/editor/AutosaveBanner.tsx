'use client';

/**
 * Autosave 복구 배너 — 페이지 진입 시 IndexedDB 에 저장된 직전 workspace 가
 * 있으면 표시. [복구] / [무시] 두 버튼.
 *
 * Anchor: docs/spec/22_autosave.md §5.
 *
 * - [복구] → parseCombinedXml → adapter.hydrateFromXml(html/css/i18n) → store sync.
 * - [무시] → deleteWorkspace(AUTOSAVE_KEY).
 * - X (닫기) → 그대로 두기 (다음 진입 때 다시 보임).
 *
 * UI 정책
 *   - mainMode 무관, EditorShell 상단에 sticky.
 *   - 토스트가 아니라 dismissible banner 인 이유 — 토스트는 timeout 사라짐 →
 *     "복구할 마지막 기회" 가 손쉽게 사라지면 위험.
 */

import { useState } from 'react';
import { History } from 'lucide-react';
import { toast } from 'sonner';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { WORKSPACE_KEYS, useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { usePreviewStore } from '@/lib/stores/previewStore';
import {
  deleteWorkspace,
  AUTOSAVE_KEY,
  type SaveMeta,
} from '@/lib/persist/indexeddb';
import { parseCombinedXml } from '@/lib/persist/autosave';

interface Props {
  /** combined XML payload — buildCombinedXml() 의 출력. */
  xml: string;
  meta: SaveMeta;
  /** 사용자가 [복구] 또는 [무시] 또는 [X] 한 후 호출 — banner 닫기. */
  onDismiss: () => void;
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

export default function AutosaveBanner({ xml, meta, onDismiss }: Props) {
  const [busy, setBusy] = useState(false);

  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const parts = parseCombinedXml(xml);
      if (!parts) {
        toast.error('복구 실패 — 저장된 데이터 형식을 읽을 수 없습니다.');
        // 손상된 데이터는 삭제 (계속 banner 띄울 이유 없음).
        await deleteWorkspace(AUTOSAVE_KEY);
        onDismiss();
        return;
      }
      const adapter = getBlocklyAdapter();
      // 각 워크스페이스 hydrate — adapter 가 ws 등록 안 됐으면 no-op.
      for (const key of WORKSPACE_KEYS) {
        const wsXml = parts[key];
        if (wsXml) {
          try {
            adapter.hydrateFromXml(key, wsXml);
          } catch (e) {
            // 한 워크스페이스 실패해도 나머지는 계속.
             
            console.error(`[autosave] hydrate ${key} failed:`, e);
          }
        }
      }
      // changeListener 가 bumpStructure 호출하지만, 안전을 위해 explicit count 동기화.
      // (Blockly.Events.disable 안에서 hydrate 했으면 listener 가 못 잡았을 수 있음.)
      const store = useWorkspaceStore.getState();
      const previewStore = usePreviewStore.getState();
      if (parts.assetReplacementMap !== undefined) {
        previewStore.setAssetReplacementMap(parts.assetReplacementMap);
      }
      if (parts.assetReplacementProfiles !== undefined) {
        previewStore.setAssetReplacementProfiles(
          parts.assetReplacementProfiles,
          parts.activeAssetReplacementProfileId ?? null,
        );
      }
      if (parts.documentLanguage !== undefined && parts.documentLanguage.trim()) {
        previewStore.setDocumentLanguage(parts.documentLanguage);
      }
      for (const key of WORKSPACE_KEYS) {
        const ws = adapter.getWorkspace(key);
        if (ws) {
          const count = ws.getAllBlocks(false).length;
          store.bumpStructure(key, count);
        }
      }
      toast.success(`복구 완료 — ${meta.blockCount}개 블록.`, { duration: 2500 });
      // 복구 후 autosave entry 는 그대로 둔다 — 다음 변경 시 새로 덮어쓰면 됨.
      onDismiss();
    } catch (e) {
       
      console.error('[autosave] restore failed', e);
      toast.error('복구 중 오류가 발생했습니다.');
      onDismiss();
    } finally {
      setBusy(false);
    }
  };

  const onIgnore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteWorkspace(AUTOSAVE_KEY);
    } finally {
      setBusy(false);
      onDismiss();
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="autosave-banner"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] px-4 py-2.5 text-sm text-foreground"
    >
      <History className="h-[18px] w-[18px] shrink-0 text-[var(--warning)]" aria-hidden="true" />
      <span className="font-semibold">이 브라우저에 저장해 둔 작업이 있어요.</span>
      <span className="text-[var(--text-secondary)]">
        {relativeTime(meta.ts)} · 블록 {meta.blockCount}개
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onRestore}
          className="rounded-full bg-[var(--primary-strong)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-strong-hover)] active:scale-[0.97] disabled:opacity-50"
          data-testid="autosave-restore"
        >
          이어서 하기
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onIgnore}
          className="rounded-full border-[1.5px] border-[var(--border-strong)] px-4 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground active:scale-[0.97] disabled:opacity-50"
          data-testid="autosave-ignore"
        >
          지우기
        </button>
        <button
          type="button"
          aria-label="알림 닫기"
          onClick={onDismiss}
          className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground"
          data-testid="autosave-close"
        >
          ×
        </button>
      </div>
    </div>
  );
}

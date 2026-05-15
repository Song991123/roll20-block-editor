/**
 * Example registry — 정적 sample 시트 카탈로그.
 *
 * Anchor:
 *   - docs/spec/10_system_architecture.md §4.4 (examplesStore)
 *   - feedback_general_purpose_blocks.md (V2 catalog generality 검증)
 *
 * V2 검증 (D&D 5e):
 *   `public/examples/dnd5e/*` 의 정적 XML / meta 를 fetch → adapter.hydrateFromXml
 *   으로 3 워크스페이스 (html/css/i18n) 채움.
 *
 * Generator 변경 0건 — 모든 D&D 5e 데이터는 example 파일 안에. lib/blocks/*.ts 의
 * generator 들은 일반화된 catalog 그대로 사용. 일반화 검증의 핵심.
 */

import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import {
  useWorkspaceStore,
  type WorkspaceKey,
} from '@/lib/stores/workspaceStore';

export interface ExampleDescriptor {
  id: string;
  name: string;
  shortName: string;
  description: string;
  /** UI 표시 이모지 / 라벨. */
  icon: string;
  /** public/ 내 상대 경로 (basePath 자동 처리). */
  htmlXmlPath: string;
  cssXmlPath?: string;
  i18nXmlPath?: string;
  metaPath: string;
  systemTags: string[];
}

/**
 * V2 (D&D 5e) + V3 (PbtA narrative) 가상 sample 2 종.
 * 둘 다 lib/blocks/ generator 변경 0건 — 같은 130-block 카탈로그가 능력치 무거운
 * 시스템과 narrative 시스템 양쪽을 다 cover 한다는 generality 검증.
 */
export const EXAMPLES: ExampleDescriptor[] = [
  {
    id: 'dnd5e',
    name: 'D&D 5e 캐릭터 시트',
    shortName: 'D&D 5e',
    description:
      '능력치 6 / 내성 6 / 기능 18 + HP · AC · 이니셔티브 + 장비·마법 반복 섹션 + rolltemplate (V2 검증 sample).',
    icon: '🐉',
    htmlXmlPath: 'examples/dnd5e/dnd5e.xml',
    cssXmlPath: 'examples/dnd5e/dnd5e.css.xml',
    i18nXmlPath: 'examples/dnd5e/dnd5e.i18n.xml',
    metaPath: 'examples/dnd5e/dnd5e.meta.json',
    systemTags: ['d20', 'fantasy', 'tabletop', 'dnd'],
  },
  {
    id: 'pbta_narrative',
    name: 'PbtA Narrative 캐릭터 시트',
    shortName: 'PbtA Narrative',
    description:
      'Cool/Hard/Hot/Sharp/Weird 5 stat + 5단 피해 시계 + 6 무브(2d6+stat) + 장비·Hx 반복 + 내력·성장 (V3 narrative 검증).',
    icon: '🃏',
    htmlXmlPath: 'examples/pbta_narrative/pbta.xml',
    cssXmlPath: 'examples/pbta_narrative/pbta.css.xml',
    i18nXmlPath: 'examples/pbta_narrative/pbta.i18n.xml',
    metaPath: 'examples/pbta_narrative/pbta.meta.json',
    systemTags: ['pbta', 'narrative', 'indie', 'no-stat-system'],
  },
];

/**
 * 정적 asset URL 생성기. Next.js basePath 와 호환.
 *
 * 페이지가 `/roll20-block-editor/` 같은 basePath 아래에서 서빙되면,
 * 상대 경로 fetch 는 자동으로 같은 base 아래에서 resolve 된다 (trailingSlash:true).
 * SSR 단계에서는 basePath 가 없으므로 그대로 반환 (실 fetch 는 클라이언트만 실행).
 */
export function getExampleAssetUrl(relPath: string): string {
  const cleanRel = relPath.replace(/^\//, '');
  if (typeof window !== 'undefined') {
    // window.location.href 가 basePath 포함 → 상대 URL 로 resolve 하면 base 자동 부착.
    return new URL(cleanRel, window.location.href).toString();
  }
  return cleanRel;
}

/**
 * Example 단일 항목 로드 — html/css/i18n 3 워크스페이스를 동시에 채움.
 *
 * 모든 fetch 가 끝난 뒤 adapter.hydrateFromXml 을 동기 호출 → workspace
 * changeListener 가 자동으로 setXmlCache 호출.
 *
 * 실패 시 throw — 호출자가 toast 등으로 처리.
 */
export async function loadExampleIntoWorkspaces(
  descriptor: ExampleDescriptor,
): Promise<{ html: number; css: number; i18n: number }> {
  const adapter = getBlocklyAdapter();

  const [htmlXml, cssXml, i18nXml] = await Promise.all([
    fetchText(getExampleAssetUrl(descriptor.htmlXmlPath)),
    descriptor.cssXmlPath
      ? fetchText(getExampleAssetUrl(descriptor.cssXmlPath))
      : Promise.resolve<string>(''),
    descriptor.i18nXmlPath
      ? fetchText(getExampleAssetUrl(descriptor.i18nXmlPath))
      : Promise.resolve<string>(''),
  ]);

  const targets: Array<{ key: WorkspaceKey; xml: string }> = [
    { key: 'html', xml: htmlXml },
    { key: 'css', xml: cssXml },
    { key: 'i18n', xml: i18nXml },
  ];

  const counts = { html: 0, css: 0, i18n: 0 };

  for (const { key, xml } of targets) {
    if (!xml) {
      useWorkspaceStore.getState().resetWorkspace(key);
      continue;
    }
    adapter.hydrateFromXml(key, xml);
    const ws = adapter.getWorkspace(key);
    const count = ws?.getAllBlocks(false).length ?? 0;
    counts[key] = count;
    useWorkspaceStore.getState().setXmlCache(key, xml, count);
    useWorkspaceStore.getState().markSaved(key);
  }

  return counts;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export function getExampleById(id: string): ExampleDescriptor | null {
  return EXAMPLES.find((e) => e.id === id) ?? null;
}

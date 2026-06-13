/**
 * Example registry ???뺤쟻 sample ?쒗듃 移댄깉濡쒓렇.
 *
 * Anchor:
 *   - docs/spec/10_system_architecture.md 짠4.4 (examplesStore)
 *   - feedback_general_purpose_blocks.md (V2 catalog generality 寃利?
 *
 * V2 寃利?(D&D 5e):
 *   `public/examples/dnd5e/*` ???뺤쟻 XML / meta 瑜?fetch ??adapter.hydrateFromXml
 *   ?쇰줈 3 ?뚰겕?ㅽ럹?댁뒪 (html/css/i18n) 梨꾩?.
 *
 * Generator 蹂寃?0嫄???紐⑤뱺 D&D 5e ?곗씠?곕뒗 example ?뚯씪 ?덉뿉. lib/blocks/*.ts ??
 * generator ?ㅼ? ?쇰컲?붾맂 catalog 洹몃?濡??ъ슜. ?쇰컲??寃利앹쓽 ?듭떖.
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
  /** UI ?쒖떆 ?대え吏 / ?쇰꺼. */
  icon: string;
  /** public/ ???곷? 寃쎈줈 (basePath ?먮룞 泥섎━). */
  htmlXmlPath: string;
  cssXmlPath?: string;
  i18nXmlPath?: string;
  metaPath: string;
  systemTags: string[];
}

/**
 * Public examples must be synthetic and copyright-safe.
 * Real Roll20/community/user sheets belong in ignored local fixtures only.
 */
export const EXAMPLES: ExampleDescriptor[] = [];

/**
 * ?뺤쟻 asset URL ?앹꽦湲? Next.js basePath ? ?명솚.
 *
 * ?섏씠吏媛 `/roll20-block-editor/` 媛숈? basePath ?꾨옒?먯꽌 ?쒕튃?섎㈃,
 * ?곷? 寃쎈줈 fetch ???먮룞?쇰줈 媛숈? base ?꾨옒?먯꽌 resolve ?쒕떎 (trailingSlash:true).
 * SSR ?④퀎?먯꽌??basePath 媛 ?놁쑝誘濡?洹몃?濡?諛섑솚 (??fetch ???대씪?댁뼵?몃쭔 ?ㅽ뻾).
 */
export function getExampleAssetUrl(relPath: string): string {
  const cleanRel = relPath.replace(/^\//, '');
  if (typeof window !== 'undefined') {
    // window.location.href 媛 basePath ?ы븿 ???곷? URL 濡?resolve ?섎㈃ base ?먮룞 遺李?
    return new URL(cleanRel, window.location.href).toString();
  }
  return cleanRel;
}

/**
 * Example ?⑥씪 ??ぉ 濡쒕뱶 ??html/css/i18n 3 ?뚰겕?ㅽ럹?댁뒪瑜??숈떆??梨꾩?.
 *
 * 紐⑤뱺 fetch 媛 ?앸궃 ??adapter.hydrateFromXml ???숆린 ?몄텧 ??workspace
 * changeListener 媛 ?먮룞?쇰줈 bumpStructure ?몄텧 (FINISHED_LOADING ?대깽??.
 *
 * ?ㅽ뙣 ??throw ???몄텧?먭? toast ?깆쑝濡?泥섎━.
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
    useWorkspaceStore.getState().bumpStructure(key, count);
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

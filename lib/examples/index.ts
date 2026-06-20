/**
 * Public example registry.
 *
 * Public examples must be synthetic and copyright-safe. Real Roll20,
 * community, commissioned, or user-owned sheets must stay in ignored local
 * fixtures/reports and must not be shipped in the public app.
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
  /** Small UI label/icon for the example menu. */
  icon: string;
  /** Path under public/. Resolved against the current Next.js basePath. */
  htmlXmlPath: string;
  cssXmlPath?: string;
  i18nXmlPath?: string;
  metaPath: string;
  systemTags: string[];
}

export const EXAMPLES: ExampleDescriptor[] = [];

/**
 * Resolve public example asset URLs under the current Next.js basePath.
 */
export function getExampleAssetUrl(relPath: string): string {
  const cleanRel = relPath.replace(/^\//, '');
  if (typeof window !== 'undefined') {
    return new URL(cleanRel, window.location.href).toString();
  }
  return cleanRel;
}

/**
 * Load one example into the HTML/CSS/i18n workspaces.
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
    { key: 'worker', xml: '' },
  ];

  const counts: Record<WorkspaceKey, number> = { html: 0, css: 0, i18n: 0, worker: 0 };

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

/**
 * 블록 등록 + 카탈로그 조회 진입점.
 * Anchor: docs/spec/02_functional_spec.md §3 + docs/spec/13_roadmap.md §3.
 * Stage A-9 + Option A-2:
 *   Expression 21 + Container 18 + Input 9 + Display 7 + Dice 12
 *   + SheetWorker 25 + i18n 11 + CSS 19 + Advanced 4 + Composite 4
 *   = 130 블록 등록.
 */

import {
  CATEGORIES,
  CATEGORY_ORDER,
  type BlockCategory,
  type BlockDef,
  type CategoryMeta,
} from './types';
import { registerExpressionBlocks } from './expression';
import { registerContainerBlocks } from './container';
import { registerInputBlocks } from './input';
import { registerDisplayBlocks } from './display';
import { registerDiceBlocks } from './dice';
import { registerSheetWorkerBlocks } from './sheet_worker';
import { registerI18nBlocks } from './i18n';
import { registerCssBlocks } from './css';
import { registerAdvancedBlocks } from './advanced';
import { registerCompositeBlocks } from './composite';

const ALL_BLOCKS: BlockDef[] = [];
let registered = false;
let registeredVersion = 0;
const subs = new Set<() => void>();

export function registerAllBlocks(): void {
  if (registered) return;
  registerExpressionBlocks(ALL_BLOCKS);
  registerContainerBlocks(ALL_BLOCKS);
  registerInputBlocks(ALL_BLOCKS);
  registerDisplayBlocks(ALL_BLOCKS);
  registerDiceBlocks(ALL_BLOCKS);
  registerSheetWorkerBlocks(ALL_BLOCKS);
  registerI18nBlocks(ALL_BLOCKS);
  registerCssBlocks(ALL_BLOCKS);
  registerAdvancedBlocks(ALL_BLOCKS);
  registerCompositeBlocks(ALL_BLOCKS);
  registered = true;
  registeredVersion += 1;
  for (const cb of subs) cb();
}

export function subscribeBlocksRegistry(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function getRegistryVersion(): number {
  return registeredVersion;
}

export function blocksByCategory(cat: BlockCategory): BlockDef[] {
  return ALL_BLOCKS.filter((b) => b.category === cat);
}

export function searchBlocks(q: string): BlockDef[] {
  if (!q.trim()) return [];
  const needle = q.trim().toLowerCase();
  return ALL_BLOCKS.filter(
    (b) =>
      b.label.toLowerCase().includes(needle) ||
      b.type.toLowerCase().includes(needle) ||
      b.tooltip.toLowerCase().includes(needle),
  );
}

export interface CategoryBundle {
  meta: CategoryMeta;
  blocks: BlockDef[];
}

export function getCatalogBundles(includeAdvanced: boolean): CategoryBundle[] {
  return CATEGORY_ORDER.filter((id) => includeAdvanced || !CATEGORIES[id].advanced).map(
    (id) => ({ meta: CATEGORIES[id], blocks: blocksByCategory(id) }),
  );
}

export function getAllBlocks(): BlockDef[] {
  return ALL_BLOCKS;
}

/** type → BlockDef lookup (인스턴스 추가 / 인스펙터 메타 사용). */
export function getBlockDef(type: string): BlockDef | null {
  return ALL_BLOCKS.find((b) => b.type === type) ?? null;
}

export { CATEGORIES, CATEGORY_ORDER };

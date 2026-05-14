/**
 * 블록 등록 + 카탈로그 조회 진입점.
 *
 * Anchor: docs/spec/02_functional_spec.md §3 + docs/spec/13_roadmap.md §3.
 *
 * Stage A 에서 9 카테고리 파일이 채워지면 본 registry 가 모두 묶음.
 * 현재 = Stage S (UX 셸) 단계의 placeholder — 카테고리 메타만.
 */

import {
  CATEGORIES,
  CATEGORY_ORDER,
  type BlockCategory,
  type BlockDef,
  type CategoryMeta,
} from './types';

const ALL_BLOCKS: BlockDef[] = [];
let registered = false;

/**
 * 본 함수 호출 시 모든 블록이 Blockly.Blocks 에 등록.
 * 멱등 — 두 번 호출해도 같은 type 은 silent overwrite.
 *
 * Stage A 의 9 카테고리 파일이 본 모듈에 import → ALL_BLOCKS push.
 */
export function registerAllBlocks(): void {
  if (registered) return;
  // Stage A 의 카테고리별 register 함수 호출 위치.
  // import { registerExpressionBlocks } from './expression';
  // registerExpressionBlocks(ALL_BLOCKS);
  registered = true;
}

/** UI 가 호출 — 카테고리별 블록 목록. */
export function blocksByCategory(cat: BlockCategory): BlockDef[] {
  return ALL_BLOCKS.filter((b) => b.category === cat);
}

/** 검색 — 한국어 라벨 + 영어 type 매칭. */
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

/** 카탈로그 = 카테고리 메타 + 안에 블록 목록. UI 표시용. */
export interface CategoryBundle {
  meta: CategoryMeta;
  blocks: BlockDef[];
}

export function getCatalogBundles(includeAdvanced: boolean): CategoryBundle[] {
  return CATEGORY_ORDER.filter((id) => includeAdvanced || !CATEGORIES[id].advanced).map(
    (id) => ({
      meta: CATEGORIES[id],
      blocks: blocksByCategory(id),
    }),
  );
}

export function getAllBlocks(): BlockDef[] {
  return ALL_BLOCKS;
}

export { CATEGORIES, CATEGORY_ORDER };

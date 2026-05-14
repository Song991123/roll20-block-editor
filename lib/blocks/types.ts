/**
 * 블록 메타 TS 타입.
 *
 * Scratch 분류학 (04_block_taxonomy_v2.md §3) 그대로:
 * 6 shape × 9 category × typed slot.
 */

export type BlockShape =
  | 'hat'        // 진입점 (sheet worker on_change)
  | 'stack'      // 일반 명령 (한 줄)
  | 'c'          // C-block (1 statement slot)
  | 'e'          // E-block (if-else, 2 statement slot)
  | 'cap'        // 종결
  | 'reporter'   // 값 반환 (둥근)
  | 'boolean';   // bool 반환 (육각)

export type BlockCategory =
  | 'container'
  | 'input'
  | 'display'
  | 'dice'
  | 'expression'
  | 'sheet_worker'
  | 'i18n'
  | 'css'
  | 'advanced';

export type BlockSlotKind =
  | 'statement'
  | 'value-number'
  | 'value-string'
  | 'value-boolean'
  | 'value-color'
  | 'dropdown';

export interface BlockMeta {
  type: string;          // 'r20_section' 등
  shape: BlockShape;
  category: BlockCategory;
  hue: number;           // Blockly setColour 값 (Scratch hue 매핑, 04_block_taxonomy_v2.md §4)
  tooltip: string;
}

/**
 * Phase 1: 빈 placeholder. Phase 2 에서 130 BlockMeta 등록.
 */
export const ALL_BLOCK_META: BlockMeta[] = [];

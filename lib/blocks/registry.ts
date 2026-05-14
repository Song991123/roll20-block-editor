import * as Blockly from 'blockly';
import { CATEGORIES } from './categories';

/**
 * 블록 등록 진입점.
 *
 * Phase 1: 표준 Blockly 블록 (logic/math/text) 만 toolbox 노출.
 * 추후: 9 카테고리 130 블록 (docs/audit/04_block_taxonomy_v2.md §3) JSON 정의 import + register.
 *
 * registerAllBlocks 는 멱등 — 같은 type 재정의 시 Blockly 가 silent overwrite.
 */
export function registerAllBlocks(): void {
  // 추후 9 카테고리 블록 정의 import.
}

/**
 * Phase 1 toolbox — 표준 블록만, 친화적 한글 라벨.
 * 카테고리 colour 는 Scratch hue (lib/blocks/categories.ts).
 *
 * 추후 9 카테고리 × 130 블록 toolbox 로 대체.
 */
export function getDefaultToolbox(): Blockly.utils.toolbox.ToolboxDefinition {
  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: CATEGORIES.logic.label,
        colour: String(CATEGORIES.logic.hue),
        contents: [
          { kind: 'block', type: 'controls_if' },
          { kind: 'block', type: 'logic_compare' },
          { kind: 'block', type: 'logic_operation' },
          { kind: 'block', type: 'logic_boolean' },
          { kind: 'block', type: 'logic_negate' },
          { kind: 'block', type: 'logic_null' },
        ],
      },
      {
        kind: 'category',
        name: CATEGORIES.math.label,
        colour: String(CATEGORIES.math.hue),
        contents: [
          { kind: 'block', type: 'math_number' },
          { kind: 'block', type: 'math_arithmetic' },
          { kind: 'block', type: 'math_single' },
          { kind: 'block', type: 'math_round' },
          { kind: 'block', type: 'math_modulo' },
          { kind: 'block', type: 'math_constrain' },
          { kind: 'block', type: 'math_random_int' },
        ],
      },
      {
        kind: 'category',
        name: CATEGORIES.text.label,
        colour: String(CATEGORIES.text.hue),
        contents: [
          { kind: 'block', type: 'text' },
          { kind: 'block', type: 'text_join' },
          { kind: 'block', type: 'text_length' },
          { kind: 'block', type: 'text_print' },
        ],
      },
      {
        kind: 'category',
        name: CATEGORIES.variables.label,
        colour: String(CATEGORIES.variables.hue),
        custom: 'VARIABLE',
      },
    ],
  };
}

// 후방 호환 — BlockWorkspace 에서 import 하는 이전 이름 유지.
export const getPhase1Toolbox = getDefaultToolbox;

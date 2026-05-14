import * as Blockly from 'blockly';

/**
 * 블록 등록 진입점.
 *
 * Phase 1: 빈 + 표준 Blockly 블록 (logic/math) 만 toolbox 노출.
 * Phase 2: 9 카테고리 130 블록 (04_block_taxonomy_v2.md §3) JSON 정의 import + register.
 *
 * registerAllBlocks 는 멱등 — 같은 type 재정의 시 Blockly 가 silent overwrite.
 */
export function registerAllBlocks(): void {
  // Phase 2 에서:
  // import { containerBlockJson } from './container';
  // import { inputBlockJson } from './input';
  // ... 9 카테고리
  // Blockly.defineBlocksWithJsonArray([...containerBlockJson, ...]);

  // Phase 1 에서는 표준 블록 (logic / math / text / variables) 만 사용 — Blockly 기본 제공.
}

/**
 * Phase 1 toolbox.
 *
 * Roll20 블록 셋이 아직 마이그레이션 안 됐으므로, "Blockly inject 동작 확인" 만 가능한
 * 표준 블록만 노출. Phase 2 에서 9 카테고리 × 130 블록 toolbox 로 대체.
 */
export function getPhase1Toolbox(): Blockly.utils.toolbox.ToolboxDefinition {
  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: '논리 (Phase 1 sample)',
        colour: '#5C81A6',
        contents: [
          { kind: 'block', type: 'controls_if' },
          { kind: 'block', type: 'logic_compare' },
          { kind: 'block', type: 'logic_operation' },
          { kind: 'block', type: 'logic_boolean' },
        ],
      },
      {
        kind: 'category',
        name: '수학 (Phase 1 sample)',
        colour: '#5CA65C',
        contents: [
          { kind: 'block', type: 'math_number' },
          { kind: 'block', type: 'math_arithmetic' },
          { kind: 'block', type: 'math_single' },
        ],
      },
      {
        kind: 'category',
        name: '텍스트 (Phase 1 sample)',
        colour: '#5CA68D',
        contents: [
          { kind: 'block', type: 'text' },
          { kind: 'block', type: 'text_print' },
        ],
      },
    ],
  };
}

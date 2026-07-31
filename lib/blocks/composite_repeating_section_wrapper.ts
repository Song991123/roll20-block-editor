/**
 * Composite block — `r20_repeating_section_wrapper` (Phase 2).
 *
 * Anchor: docs/spec/26_composite_blocks.md §6 (Phase 2).
 *
 * 본 파일은 Blockly BlockDef + init + generator wiring 만 담당. 실제 HTML
 * 렌더링 로직은 `composite_repeating_section_wrapper_emit.ts` (pure module,
 * Blockly 의존 0) 에 분리. 단위 테스트도 emit 모듈만 호출.
 *
 * 일반화 — Roll20 `<fieldset class="repeating_X">` 표준 idiom. legacy-sheet-corpus / DnD
 * 5e / CoC / PbtA / WoD 등 거의 모든 시스템에 동일 패턴. 시스템 specific
 * 토큰 0. legacy-sheet-corpus hardcoding 0.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';
import {
  type RepeatingSectionWrapperFields,
  EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
  renderRepeatingSectionWrapperHtml,
} from './composite_repeating_section_wrapper_emit';

export {
  renderRepeatingSectionWrapperHtml,
  type RepeatingSectionWrapperFields,
  EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
};

const COMPOSITE = 'composite' as const;
/** spec §3.1 — Composite 카테고리 hue (gray-purple). composite.ts 와 동일. */
const HUE = 270;

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

function setStatementHooks(b: Blockly.Block): void {
  b.setPreviousStatement(true, null);
  b.setNextStatement(true, null);
}

function readField(block: unknown, name: string, fallback = ''): string {
  const b = block as Blockly.Block;
  const v = b.getFieldValue(name);
  return v == null ? fallback : String(v);
}

function emitRepeatingSectionWrapper(
  block: unknown,
  ctx: GeneratorContext,
): string {
  const f: RepeatingSectionWrapperFields = {
    SECTION_NAME: readField(block, 'SECTION_NAME').trim(),
    FIELDSET_CLASS: readField(block, 'FIELDSET_CLASS').trim(),
    FIELDSET_STYLE: readField(block, 'FIELDSET_STYLE').trim(),
    HAS_HEADER: readField(block, 'HAS_HEADER', 'FALSE'),
    HEADER_THEAD_CLASS: readField(block, 'HEADER_THEAD_CLASS').trim(),
    HEADER_TR_CLASS: readField(block, 'HEADER_TR_CLASS').trim(),
    COLUMNS: readField(block, 'COLUMNS'),
  };
  const body = ctx.statementToCode(block, 'CONTENT') || '';
  return renderRepeatingSectionWrapperHtml(f, body, (code, sev, msg) => {
    const b = block as Blockly.Block;
    ctx.warn(b.id, code, msg, sev);
  });
}

// ---------------------------------------------------------------------------
// BlockDef
// ---------------------------------------------------------------------------

export const COMPOSITE_REPEATING_SECTION_WRAPPER: BlockDef = {
  type: 'r20_repeating_section_wrapper',
  shape: 'c',
  category: COMPOSITE,
  label: '묶음: 반복 섹션 wrapper',
  tooltip:
    '`<fieldset class="repeating_X">` + 선택 thead + 자식 행. 반복 섹션 1 묶음 = 1 블록.',
  init: mkInit((b) => {
    b.appendDummyInput().appendField('반복 섹션');
    b.appendDummyInput()
      .appendField('NAME (repeating_X)')
      .appendField(new Blockly.FieldTextInput(''), 'SECTION_NAME');
    b.appendDummyInput()
      .appendField('fieldset class')
      .appendField(new Blockly.FieldTextInput(''), 'FIELDSET_CLASS');
    b.appendDummyInput()
      .appendField('fieldset style')
      .appendField(new Blockly.FieldTextInput(''), 'FIELDSET_STYLE');
    b.appendDummyInput()
      .appendField('헤더 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['아니오', 'FALSE'],
          ['예', 'TRUE'],
        ]),
        'HAS_HEADER',
      );
    b.appendDummyInput()
      .appendField('헤더 thead class')
      .appendField(new Blockly.FieldTextInput(''), 'HEADER_THEAD_CLASS');
    b.appendDummyInput()
      .appendField('헤더 tr class')
      .appendField(new Blockly.FieldTextInput(''), 'HEADER_TR_CLASS');
    b.appendDummyInput()
      .appendField('컬럼 (key|text|class, 줄)')
      .appendField(new Blockly.FieldTextInput(''), 'COLUMNS');
    b.appendStatementInput('CONTENT').setCheck(null);
    setStatementHooks(b);
  }),
  generator: (block, ctx) => emitRepeatingSectionWrapper(block, ctx),
  inspectorSchema: [
    {
      name: 'SECTION_NAME',
      label: '반복 NAME',
      kind: 'text',
      placeholder: 'inventory',
      description: '`repeating_NAME` 으로 emit. 영문/숫자/_ 만 사용.',
    },
    { name: 'FIELDSET_CLASS', label: 'fieldset 추가 class', kind: 'text' },
    { name: 'FIELDSET_STYLE', label: 'fieldset style', kind: 'text' },
    {
      name: 'HAS_HEADER',
      label: '헤더 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'HEADER_THEAD_CLASS', label: '헤더 thead class', kind: 'text' },
    { name: 'HEADER_TR_CLASS', label: '헤더 tr class', kind: 'text' },
    {
      name: 'COLUMNS',
      label: '헤더 컬럼 (key|text|class)',
      kind: 'textarea',
      placeholder: 'col_name|이름|col-class\ncol_qty|수량|col-class',
      description: '한 줄에 한 컬럼. i18n_key|text|th_class 포맷.',
    },
  ],
};

/**
 * Registry entry point — composite_attribute_card.ts /
 * composite_skill_row.ts 와 같은 contract.
 */
export function registerCompositeRepeatingSectionWrapperBlocks(
  target: BlockDef[],
): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;
  target.push(COMPOSITE_REPEATING_SECTION_WRAPPER);
  if (COMPOSITE_REPEATING_SECTION_WRAPPER.init) {
    blocksMap[COMPOSITE_REPEATING_SECTION_WRAPPER.type] = {
      init: COMPOSITE_REPEATING_SECTION_WRAPPER.init as unknown as () => void,
    };
  }
}

/** Generator mapping — emit-worker lookup (composite.ts 와 동일 패턴). */
export const COMPOSITE_REPEATING_SECTION_WRAPPER_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = {
  [COMPOSITE_REPEATING_SECTION_WRAPPER.type]: emitRepeatingSectionWrapper,
};

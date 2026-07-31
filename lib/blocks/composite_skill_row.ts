/**
 * Composite block — `r20_skill_row` (Phase 2).
 *
 * Anchor: docs/spec/26_composite_blocks.md §6 (Phase 2).
 *
 * 본 파일은 Blockly BlockDef + init + generator wiring 만 담당. 실제 HTML
 * 렌더링 로직은 `composite_skill_row_emit.ts` (pure module, Blockly 의존 0)
 * 에 분리. 단위 테스트도 emit 모듈만 호출.
 *
 * 일반화 — roll20-sheet-builder / CoC / DnD 5e / PbtA / 인세인 어떤 시트도 같은 schema:
 *   `<tr>` 한 행 = (체크박스?) + (label, 보통 i18n) + (input) + (roll button?).
 *   각 부분은 선택적. 시스템 specific 토큰 0. roll20-sheet-builder hardcoding 0.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';
import {
  type SkillRowFields,
  EMPTY_SKILL_ROW_FIELDS,
  renderSkillRowHtml,
} from './composite_skill_row_emit';

export {
  renderSkillRowHtml,
  type SkillRowFields,
  EMPTY_SKILL_ROW_FIELDS,
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

function emitSkillRow(block: unknown, ctx: GeneratorContext): string {
  const f: SkillRowFields = {
    TR_CLASS: readField(block, 'TR_CLASS').trim(),
    TR_STYLE: readField(block, 'TR_STYLE').trim(),
    TR_ATTRS: readField(block, 'TR_ATTRS'),
    CELL_COUNT: readField(block, 'CELL_COUNT', '0'),
    CELL_LAYOUT: readField(block, 'CELL_LAYOUT'),
    CELL_TD_CLASSES: readField(block, 'CELL_TD_CLASSES'),
    CELL_TD_ATTRS: readField(block, 'CELL_TD_ATTRS'),
    CELL_TD_TEXTS: readField(block, 'CELL_TD_TEXTS'),
    HAS_CHECKBOX: readField(block, 'HAS_CHECKBOX', 'FALSE'),
    CHECKBOX_TD_CLASS: readField(block, 'CHECKBOX_TD_CLASS').trim(),
    CHECKBOX_NAME: readField(block, 'CHECKBOX_NAME').trim(),
    CHECKBOX_CLASS: readField(block, 'CHECKBOX_CLASS').trim(),
    CHECKBOX_VALUE: readField(block, 'CHECKBOX_VALUE'),
    CHECKBOX_CHECKED: readField(block, 'CHECKBOX_CHECKED', 'FALSE'),
    CHECKBOX_ATTRS: readField(block, 'CHECKBOX_ATTRS'),
    HAS_LABEL: readField(block, 'HAS_LABEL', 'FALSE'),
    LABEL_TD_CLASS: readField(block, 'LABEL_TD_CLASS').trim(),
    I18N_KEY: readField(block, 'I18N_KEY').trim(),
    LABEL_TEXT: readField(block, 'LABEL_TEXT'),
    LABEL_TAG: readField(block, 'LABEL_TAG').trim(),
    LABEL_CLASS: readField(block, 'LABEL_CLASS').trim(),
    LABEL_ATTRS: readField(block, 'LABEL_ATTRS'),
    HAS_INPUT: readField(block, 'HAS_INPUT', 'FALSE'),
    INPUT_TD_CLASS: readField(block, 'INPUT_TD_CLASS').trim(),
    INPUT_TYPE: readField(block, 'INPUT_TYPE', 'text').trim() || 'text',
    INPUT_NAME: readField(block, 'INPUT_NAME').trim(),
    INPUT_CLASS: readField(block, 'INPUT_CLASS').trim(),
    INPUT_VALUE: readField(block, 'INPUT_VALUE'),
    INPUT_ATTRS: readField(block, 'INPUT_ATTRS'),
    HAS_INPUT2: readField(block, 'HAS_INPUT2', 'FALSE'),
    INPUT2_TD_CLASS: readField(block, 'INPUT2_TD_CLASS').trim(),
    INPUT2_TYPE: readField(block, 'INPUT2_TYPE', 'text').trim() || 'text',
    INPUT2_NAME: readField(block, 'INPUT2_NAME').trim(),
    INPUT2_CLASS: readField(block, 'INPUT2_CLASS').trim(),
    INPUT2_VALUE: readField(block, 'INPUT2_VALUE'),
    INPUT2_ATTRS: readField(block, 'INPUT2_ATTRS'),
    HAS_ROLL: readField(block, 'HAS_ROLL', 'FALSE'),
    ROLL_TD_CLASS: readField(block, 'ROLL_TD_CLASS').trim(),
    ROLL_NAME: readField(block, 'ROLL_NAME').trim(),
    ROLL_LABEL: readField(block, 'ROLL_LABEL'),
    ROLL_CLASS: readField(block, 'ROLL_CLASS').trim(),
    ROLL_EXPR: readField(block, 'ROLL_EXPR'),
    ROLL_ATTRS: readField(block, 'ROLL_ATTRS'),
    HAS_ROLL2: readField(block, 'HAS_ROLL2', 'FALSE'),
    ROLL2_TD_CLASS: readField(block, 'ROLL2_TD_CLASS').trim(),
    ROLL2_NAME: readField(block, 'ROLL2_NAME').trim(),
    ROLL2_LABEL: readField(block, 'ROLL2_LABEL'),
    ROLL2_CLASS: readField(block, 'ROLL2_CLASS').trim(),
    ROLL2_EXPR: readField(block, 'ROLL2_EXPR'),
    ROLL2_ATTRS: readField(block, 'ROLL2_ATTRS'),
    HAS_ROLL3: readField(block, 'HAS_ROLL3', 'FALSE'),
    ROLL3_TD_CLASS: readField(block, 'ROLL3_TD_CLASS').trim(),
    ROLL3_NAME: readField(block, 'ROLL3_NAME').trim(),
    ROLL3_LABEL: readField(block, 'ROLL3_LABEL'),
    ROLL3_CLASS: readField(block, 'ROLL3_CLASS').trim(),
    ROLL3_EXPR: readField(block, 'ROLL3_EXPR'),
    ROLL3_ATTRS: readField(block, 'ROLL3_ATTRS'),
  };
  return renderSkillRowHtml(f, (code, sev, msg) => {
    const b = block as Blockly.Block;
    ctx.warn(b.id, code, msg, sev);
  });
}

// ---------------------------------------------------------------------------
// BlockDef
// ---------------------------------------------------------------------------

export const COMPOSITE_SKILL_ROW: BlockDef = {
  type: 'r20_skill_row',
  shape: 'stack',
  category: COMPOSITE,
  label: '묶음: 스킬 행',
  tooltip:
    '한 줄 행 — (체크) + 이름(i18n) + 값 + 굴림 버튼. 표 안의 스킬 리스트 / 능력치 리스트 1 행을 1 블록으로.',
  init: mkInit((b) => {
    b.appendDummyInput().appendField('스킬 행');
    // 행 자체 ----------------------------------------------------------
    b.appendDummyInput()
      .appendField('행 class')
      .appendField(new Blockly.FieldTextInput(''), 'TR_CLASS');
    b.appendDummyInput()
      .appendField('행 style')
      .appendField(new Blockly.FieldTextInput(''), 'TR_STYLE');
    // 체크박스 ---------------------------------------------------------
    b.appendDummyInput()
      .appendField('체크박스 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['예', 'TRUE'],
          ['아니오', 'FALSE'],
        ]),
        'HAS_CHECKBOX',
      );
    b.appendDummyInput()
      .appendField('체크 NAME')
      .appendField(new Blockly.FieldTextInput(''), 'CHECKBOX_NAME');
    b.appendDummyInput()
      .appendField('체크 class')
      .appendField(new Blockly.FieldTextInput(''), 'CHECKBOX_CLASS');
    b.appendDummyInput()
      .appendField('체크 td class')
      .appendField(new Blockly.FieldTextInput(''), 'CHECKBOX_TD_CLASS');
    b.appendDummyInput()
      .appendField('체크 value')
      .appendField(new Blockly.FieldTextInput(''), 'CHECKBOX_VALUE');
    b.appendDummyInput()
      .appendField('체크 기본')
      .appendField(
        new Blockly.FieldDropdown([
          ['해제', 'FALSE'],
          ['선택', 'TRUE'],
        ]),
        'CHECKBOX_CHECKED',
      );
    // 라벨 -------------------------------------------------------------
    b.appendDummyInput()
      .appendField('라벨 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['예', 'TRUE'],
          ['아니오', 'FALSE'],
        ]),
        'HAS_LABEL',
      );
    b.appendDummyInput()
      .appendField('라벨 텍스트')
      .appendField(new Blockly.FieldTextInput(''), 'LABEL_TEXT');
    b.appendDummyInput()
      .appendField('i18n KEY')
      .appendField(new Blockly.FieldTextInput(''), 'I18N_KEY');
    b.appendDummyInput()
      .appendField('라벨 inline tag')
      .appendField(new Blockly.FieldTextInput(''), 'LABEL_TAG');
    b.appendDummyInput()
      .appendField('라벨 class')
      .appendField(new Blockly.FieldTextInput(''), 'LABEL_CLASS');
    b.appendDummyInput()
      .appendField('라벨 td class')
      .appendField(new Blockly.FieldTextInput(''), 'LABEL_TD_CLASS');
    // 값 input ---------------------------------------------------------
    b.appendDummyInput()
      .appendField('값 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['예', 'TRUE'],
          ['아니오', 'FALSE'],
        ]),
        'HAS_INPUT',
      );
    b.appendDummyInput()
      .appendField('값 NAME')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT_NAME');
    b.appendDummyInput()
      .appendField('값 type')
      .appendField(new Blockly.FieldTextInput('text'), 'INPUT_TYPE');
    b.appendDummyInput()
      .appendField('값 기본')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT_VALUE');
    b.appendDummyInput()
      .appendField('값 class')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT_CLASS');
    b.appendDummyInput()
      .appendField('값 td class')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT_TD_CLASS');
    // 굴림 -------------------------------------------------------------
    b.appendDummyInput()
      .appendField('굴림 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['예', 'TRUE'],
          ['아니오', 'FALSE'],
        ]),
        'HAS_ROLL',
      );
    b.appendDummyInput()
      .appendField('굴림 NAME')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL_NAME');
    b.appendDummyInput()
      .appendField('굴림 label')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL_LABEL');
    b.appendDummyInput()
      .appendField('굴림 EXPR')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL_EXPR');
    b.appendDummyInput()
      .appendField('굴림 class')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL_CLASS');
    b.appendDummyInput()
      .appendField('굴림 td class')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL_TD_CLASS');
    // ── 둘째 값 input (roll20-sheet-builder 커스텀 스킬 행: 이름 input + 값 input) ────
    // 주의: composite_matcher 가 이 필드들을 쓰는데 블록 정의에 없으면
    // Blockly 가 hydrate 때 "Ignoring non-existent field" 로 조용히 버려서
    // 스킬 % 입력칸/둘째 굴림 버튼이 통째로 소실된다 (fixtureC 49행 사고).
    b.appendDummyInput()
      .appendField('값2 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['아니오', 'FALSE'],
          ['예', 'TRUE'],
        ]),
        'HAS_INPUT2',
      );
    b.appendDummyInput()
      .appendField('값2 NAME')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT2_NAME');
    b.appendDummyInput()
      .appendField('값2 type')
      .appendField(new Blockly.FieldTextInput('text'), 'INPUT2_TYPE');
    b.appendDummyInput()
      .appendField('값2 기본')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT2_VALUE');
    b.appendDummyInput()
      .appendField('값2 class')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT2_CLASS');
    b.appendDummyInput()
      .appendField('값2 td class')
      .appendField(new Blockly.FieldTextInput(''), 'INPUT2_TD_CLASS');
    // ── 둘째/셋째 굴림 버튼 (dual-roll: old-roll + new-roll) ──────────
    b.appendDummyInput()
      .appendField('굴림2 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['아니오', 'FALSE'],
          ['예', 'TRUE'],
        ]),
        'HAS_ROLL2',
      );
    b.appendDummyInput()
      .appendField('굴림2 NAME')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL2_NAME');
    b.appendDummyInput()
      .appendField('굴림2 label')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL2_LABEL');
    b.appendDummyInput()
      .appendField('굴림2 EXPR')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL2_EXPR');
    b.appendDummyInput()
      .appendField('굴림2 class')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL2_CLASS');
    b.appendDummyInput()
      .appendField('굴림2 td class')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL2_TD_CLASS');
    b.appendDummyInput()
      .appendField('굴림3 사용')
      .appendField(
        new Blockly.FieldDropdown([
          ['아니오', 'FALSE'],
          ['예', 'TRUE'],
        ]),
        'HAS_ROLL3',
      );
    b.appendDummyInput()
      .appendField('굴림3 NAME')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL3_NAME');
    b.appendDummyInput()
      .appendField('굴림3 label')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL3_LABEL');
    b.appendDummyInput()
      .appendField('굴림3 EXPR')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL3_EXPR');
    b.appendDummyInput()
      .appendField('굴림3 class')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL3_CLASS');
    b.appendDummyInput()
      .appendField('굴림3 td class')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL3_TD_CLASS');
    // ── cell layout 직렬화 (round-trip 시 empty/spacer td 보존) ────────
    b.appendDummyInput()
      .appendField('칸 수')
      .appendField(new Blockly.FieldTextInput(''), 'CELL_COUNT');
    b.appendDummyInput()
      .appendField('칸 배치')
      .appendField(new Blockly.FieldTextInput(''), 'CELL_LAYOUT');
    b.appendDummyInput()
      .appendField('칸 td class 목록')
      .appendField(new Blockly.FieldTextInput(''), 'CELL_TD_CLASSES');
    const preserved = b.appendDummyInput('__r20_skill_row_preserved');
    for (const name of [
      'TR_ATTRS', 'CELL_TD_ATTRS', 'CELL_TD_TEXTS',
      'CHECKBOX_ATTRS', 'LABEL_ATTRS',
      'INPUT_ATTRS', 'INPUT2_ATTRS',
      'ROLL_ATTRS', 'ROLL2_ATTRS', 'ROLL3_ATTRS',
    ]) {
      preserved.appendField(new Blockly.FieldTextInput(''), name);
    }
    preserved.setVisible(false);
    setStatementHooks(b);
  }),
  generator: (block, ctx) => emitSkillRow(block, ctx),
  inspectorSchema: [
    { name: 'TR_CLASS', label: '행 class', kind: 'text' },
    { name: 'TR_STYLE', label: '행 style', kind: 'text' },
    {
      name: 'HAS_CHECKBOX',
      label: '체크박스 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'CHECKBOX_NAME', label: '체크 NAME', kind: 'text' },
    { name: 'CHECKBOX_CLASS', label: '체크 class', kind: 'text' },
    { name: 'CHECKBOX_TD_CLASS', label: '체크 td class', kind: 'text' },
    { name: 'CHECKBOX_VALUE', label: '체크 value', kind: 'text' },
    {
      name: 'CHECKBOX_CHECKED',
      label: '체크 기본',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '해제' },
        { value: 'TRUE', label: '선택' },
      ],
    },
    {
      name: 'HAS_LABEL',
      label: '라벨 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'LABEL_TEXT', label: '라벨 텍스트', kind: 'text' },
    { name: 'I18N_KEY', label: 'i18n KEY', kind: 'text', description: '비면 data-i18n 미emit.' },
    { name: 'LABEL_TAG', label: '라벨 inline tag', kind: 'text', description: '예: span / strong. 비면 td 자체에 data-i18n.' },
    { name: 'LABEL_CLASS', label: '라벨 class', kind: 'text' },
    { name: 'LABEL_TD_CLASS', label: '라벨 td class', kind: 'text' },
    {
      name: 'HAS_INPUT',
      label: '값 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'INPUT_NAME', label: '값 NAME', kind: 'text', description: '`attr_NAME` 으로 emit.' },
    { name: 'INPUT_TYPE', label: '값 type', kind: 'text', placeholder: 'text' },
    { name: 'INPUT_VALUE', label: '값 기본', kind: 'text' },
    { name: 'INPUT_CLASS', label: '값 class', kind: 'text' },
    { name: 'INPUT_TD_CLASS', label: '값 td class', kind: 'text' },
    {
      name: 'HAS_ROLL',
      label: '굴림 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'ROLL_NAME', label: '굴림 NAME', kind: 'text', description: '`roll_NAME` 으로 emit.' },
    { name: 'ROLL_LABEL', label: '굴림 label', kind: 'text' },
    { name: 'ROLL_EXPR', label: '굴림 식', kind: 'textarea' },
    { name: 'ROLL_CLASS', label: '굴림 class', kind: 'text' },
    { name: 'ROLL_TD_CLASS', label: '굴림 td class', kind: 'text' },
    {
      name: 'HAS_INPUT2',
      label: '값2 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'INPUT2_NAME', label: '값2 NAME', kind: 'text', description: '`attr_NAME` 으로 emit.' },
    { name: 'INPUT2_TYPE', label: '값2 type', kind: 'text', placeholder: 'text' },
    { name: 'INPUT2_VALUE', label: '값2 기본', kind: 'text' },
    { name: 'INPUT2_CLASS', label: '값2 class', kind: 'text' },
    { name: 'INPUT2_TD_CLASS', label: '값2 td class', kind: 'text' },
    {
      name: 'HAS_ROLL2',
      label: '굴림2 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'ROLL2_NAME', label: '굴림2 NAME', kind: 'text' },
    { name: 'ROLL2_LABEL', label: '굴림2 label', kind: 'text' },
    { name: 'ROLL2_EXPR', label: '굴림2 식', kind: 'textarea' },
    { name: 'ROLL2_CLASS', label: '굴림2 class', kind: 'text' },
    { name: 'ROLL2_TD_CLASS', label: '굴림2 td class', kind: 'text' },
    {
      name: 'HAS_ROLL3',
      label: '굴림3 사용',
      kind: 'select',
      options: [
        { value: 'FALSE', label: '아니오' },
        { value: 'TRUE', label: '예' },
      ],
    },
    { name: 'ROLL3_NAME', label: '굴림3 NAME', kind: 'text' },
    { name: 'ROLL3_LABEL', label: '굴림3 label', kind: 'text' },
    { name: 'ROLL3_EXPR', label: '굴림3 식', kind: 'textarea' },
    { name: 'ROLL3_CLASS', label: '굴림3 class', kind: 'text' },
    { name: 'ROLL3_TD_CLASS', label: '굴림3 td class', kind: 'text' },
    { name: 'CELL_COUNT', label: '칸 수', kind: 'text', description: 'import 가 기록한 td 칸 수 (비면 기본 배치).' },
    { name: 'CELL_LAYOUT', label: '칸 배치', kind: 'text', description: '예: checkbox,input,input2,roll,roll2 / spacer 포함.' },
    { name: 'CELL_TD_CLASSES', label: '칸 td class 목록', kind: 'text', description: '탭 구분 — 칸별 td class.' },
  ],
};

/**
 * Registry entry point — composite_attribute_card.ts 의
 * registerCompositeAttributeCardBlocks 와 같은 contract.
 */
export function registerCompositeSkillRowBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;
  target.push(COMPOSITE_SKILL_ROW);
  if (COMPOSITE_SKILL_ROW.init) {
    blocksMap[COMPOSITE_SKILL_ROW.type] = {
      init: COMPOSITE_SKILL_ROW.init as unknown as () => void,
    };
  }
}

/** Generator mapping — emit-worker lookup (composite.ts 와 동일 패턴). */
export const COMPOSITE_SKILL_ROW_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = {
  [COMPOSITE_SKILL_ROW.type]: emitSkillRow,
};

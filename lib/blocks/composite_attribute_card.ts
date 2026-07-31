/**
 * Composite block — `r20_attribute_card` (Phase 1).
 *
 * Anchor: docs/spec/26_composite_blocks.md §3.
 *
 * 본 파일은 Blockly BlockDef + init + generator wiring 만 담당. 실제 HTML
 * 렌더링 로직은 `composite_attribute_card_emit.ts` (pure module, Blockly
 * 의존 0) 에 분리.
 *
 * 일반화 — legacy-sheet-corpus / CoC / DnD 5e / PbtA 어떤 시트도 같은 schema:
 *   LABEL / I18N_KEY / ATTR_NAME / CURRENT_VALUE / MAX_VALUE
 *   / ROLL_BUTTON_NAME / ROLL_EXPR / LABEL_CLASS / INPUT_CLASS
 *
 * 시스템 specific 토큰 0. legacy-sheet-corpus hardcoding 0.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';
import {
  type AttributeCardFields,
  EMPTY_ATTRIBUTE_CARD_FIELDS,
  renderAttributeCardHtml,
} from './composite_attribute_card_emit';

export {
  renderAttributeCardHtml,
  type AttributeCardFields,
  EMPTY_ATTRIBUTE_CARD_FIELDS,
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

function readField(block: unknown, name: string): string {
  const b = block as Blockly.Block;
  return String(b.getFieldValue(name) ?? '').trim();
}

function emitAttributeCard(block: unknown, ctx: GeneratorContext): string {
  const f: AttributeCardFields = {
    ...EMPTY_ATTRIBUTE_CARD_FIELDS,
    LABEL: readField(block, 'LABEL'),
    I18N_KEY: readField(block, 'I18N_KEY'),
    ATTR_NAME: readField(block, 'ATTR_NAME'),
    CURRENT_VALUE: readField(block, 'CURRENT_VALUE'),
    MAX_VALUE: readField(block, 'MAX_VALUE'),
    ROLL_BUTTON_NAME: readField(block, 'ROLL_BUTTON_NAME'),
    ROLL_EXPR: readField(block, 'ROLL_EXPR'),
    LABEL_CLASS: readField(block, 'LABEL_CLASS'),
    INPUT_CLASS: readField(block, 'INPUT_CLASS'),
  };
  return renderAttributeCardHtml(f, (code, sev, msg) => {
    const b = block as Blockly.Block;
    ctx.warn(b.id, code, msg, sev);
  });
}

// ---------------------------------------------------------------------------
// BlockDef
// ---------------------------------------------------------------------------

export const COMPOSITE_ATTRIBUTE_CARD: BlockDef = {
  type: 'r20_attribute_card',
  shape: 'stack',
  category: COMPOSITE,
  label: '묶음: 능력치 카드',
  tooltip:
    '능력치 1 개 (label + 현재값 + 선택 max + 선택 굴림). 대형 시트 import 시 atomic 폭주를 줄임 — 펼친 결과는 동등.',
  init: mkInit((b) => {
    b.appendDummyInput().appendField('능력치 카드');
    b.appendDummyInput()
      .appendField('LABEL')
      .appendField(new Blockly.FieldTextInput(''), 'LABEL');
    b.appendDummyInput()
      .appendField('i18n KEY')
      .appendField(new Blockly.FieldTextInput(''), 'I18N_KEY');
    b.appendDummyInput()
      .appendField('NAME (attr_*)')
      .appendField(new Blockly.FieldTextInput(''), 'ATTR_NAME');
    b.appendDummyInput()
      .appendField('현재값')
      .appendField(new Blockly.FieldTextInput(''), 'CURRENT_VALUE');
    b.appendDummyInput()
      .appendField('최대값')
      .appendField(new Blockly.FieldTextInput(''), 'MAX_VALUE');
    b.appendDummyInput()
      .appendField('굴림 NAME')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL_BUTTON_NAME');
    b.appendDummyInput()
      .appendField('굴림 EXPR')
      .appendField(new Blockly.FieldTextInput(''), 'ROLL_EXPR');
    b.appendDummyInput()
      .appendField('LABEL class')
      .appendField(new Blockly.FieldTextInput('attr-label'), 'LABEL_CLASS');
    b.appendDummyInput()
      .appendField('INPUT class')
      .appendField(new Blockly.FieldTextInput('attr-input'), 'INPUT_CLASS');
    setStatementHooks(b);
  }),
  generator: (block, ctx) => emitAttributeCard(block, ctx),
  inspectorSchema: [
    { name: 'LABEL', label: '라벨', kind: 'text', placeholder: '근력' },
    {
      name: 'I18N_KEY',
      label: 'i18n 키',
      kind: 'text',
      placeholder: 'STR-u',
      description: '비면 data-i18n 미emit (다국어 안 씀).',
    },
    {
      name: 'ATTR_NAME',
      label: '속성 이름',
      kind: 'text',
      placeholder: 'str',
      description: '`attr_NAME` 으로 emit. attr_ prefix 자동 추가.',
    },
    { name: 'CURRENT_VALUE', label: '현재값', kind: 'text', placeholder: '50' },
    {
      name: 'MAX_VALUE',
      label: '최대값',
      kind: 'text',
      placeholder: '',
      description: '비면 max input 미emit (CoC 같이 max 없는 시스템 호환).',
    },
    {
      name: 'ROLL_BUTTON_NAME',
      label: '굴림 NAME',
      kind: 'text',
      placeholder: 'str_check',
      description: '비면 굴림 버튼 미emit. `roll_NAME` 으로 emit.',
    },
    {
      name: 'ROLL_EXPR',
      label: '굴림 식',
      kind: 'textarea',
      placeholder: '&{template:coc} {{name=@{str_txt}}} ...',
      description: 'roll button value. 원본 expression 그대로 보존.',
    },
    {
      name: 'LABEL_CLASS',
      label: 'LABEL class',
      kind: 'text',
      placeholder: 'attr-label',
    },
    {
      name: 'INPUT_CLASS',
      label: 'INPUT class',
      kind: 'text',
      placeholder: 'attr-input',
    },
  ],
};

/**
 * Registry entry point — composite.ts 의 registerCompositeBlocks 와
 * 같은 contract. Phase 1 commit 에서는 registry.ts 미수정 — composite.ts 와
 * 충돌 안 일으키게 registry 통합은 Phase 2 commit 으로 미룸 (다른 worker 가
 * registry.ts 만져도 안전).
 */
export function registerCompositeAttributeCardBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;
  target.push(COMPOSITE_ATTRIBUTE_CARD);
  if (COMPOSITE_ATTRIBUTE_CARD.init) {
    blocksMap[COMPOSITE_ATTRIBUTE_CARD.type] = {
      init: COMPOSITE_ATTRIBUTE_CARD.init as unknown as () => void,
    };
  }
}

/** Generator mapping — emit-worker lookup (composite.ts 와 동일 패턴). */
export const COMPOSITE_ATTRIBUTE_CARD_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = {
  [COMPOSITE_ATTRIBUTE_CARD.type]: emitAttributeCard,
};

/**
 * Dice 카테고리 — 13 블록 (Stage A-5).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 4 (굴림 / Dice, hue 40).
 *   - docs/spec/02_functional_spec.md §3.2 — stack + c + reporter 혼합.
 *   - docs/spec/04_block_taxonomy_v2.md (Dice 카탈로그).
 *   - docs/spec/12_roll20_output_spec.md §2 (HTML emit contract — sheet roll
 *     button + rolltemplate Mustache 문법).
 *
 * Roll20 시트의 굴림 진입점:
 *   - sheet roll/action button (<button type="roll|action">)
 *   - <rolltemplate class="sheet-rolltemplate-NAME"> + Mustache `{{...}}`
 *   - 채팅 `&{template:NAME}` 인보크 + key=value pair 슬롯
 *
 * 시스템 specific 토큰 0. template class 이름, rolltemplate name, field
 * 식별자는 사용자 데이터 (필드/슬롯) — hardcoding 아님.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext, ORDER } from './types';
import { styleAttr } from './style_field';
import { isInlineMarkup, startsInlineMarkup } from './inlineMarkup';

// ---------- 카테고리 / 상수 ----------

const DICE = 'dice' as const;
/** spec §3.1 — 굴림 카테고리 hue. */
const HUE = 40;

// ---------- dropdown 옵션 ----------

/**
 * Roll20 rolltemplate 표준 helper (spec §12 / Roll20 wiki rolltemplate).
 * 사용자 정의가 아닌 Roll20 가 제공하는 메타 헬퍼 집합.
 */
const ROLLTEMPLATE_HELPERS: Array<[string, string]> = [
  ['allprops()', 'allprops()'],
  ['rollWasCrit()', 'rollWasCrit()'],
  ['rollWasFumble()', 'rollWasFumble()'],
  ['rollTotal()', 'rollTotal()'],
  ['rollGreater()', 'rollGreater()'],
  ['rollLess()', 'rollLess()'],
  ['rollBetween()', 'rollBetween()'],
];

// ---------- init helper ----------

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

/** stack prev/next (untyped — 모든 컨테이너에 들어감). */
function setStatementHooks(b: Blockly.Block): void {
  b.setPreviousStatement(true, null);
  b.setNextStatement(true, null);
}

// ---------- HTML emit helper ----------

function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** ` attr="value"` 또는 빈 문자열 — value 비면 attr 자체 생략. */
function attr(name: string, value: string): string {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return ` ${name}="${escapeAttr(v)}"`;
}

/** ` class="sheet-foo sheet-bar"` — 토큰별 sheet- prefix. CLASS 비면 생략.
 * multi-class fix: 매처는 토큰별 prefix 를 떼므로 emit 도 토큰별로 부착해야
 * round-trip byte-identical 성립. */
function sheetClassAttr(cls: string): string {
  const v = String(cls ?? '').trim();
  if (!v) return '';
  const out = v
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.startsWith('sheet-') ? t : `sheet-${t}`))
    .join(' ');
  return ` class="${escapeAttr(out)}"`;
}

/** `<tag attrs>\n  content\n</tag>` 형태 wrap. content 비면 self-collapse. */
function wrapTag(
  ctx: GeneratorContext,
  tag: string,
  attrs: string,
  content: string,
): string {
  if (!content) return `<${tag}${attrs}></${tag}>`;
  if (isInlineMarkup(content) || startsInlineMarkup(content)) {
    return `<${tag}${attrs}>${content}</${tag}>`;
  }
  return `<${tag}${attrs}>\n${ctx.indent(content)}\n</${tag}>`;
}

/**
 * 자식 statement chain 을 한 줄 텍스트로 직렬화 (rolltemplate / 채팅 invoke
 * 등 줄바꿈 없는 컨텍스트용). 빈 줄/공백 누락 등 정리.
 */
function flattenInline(content: string): string {
  return content
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(' ');
}

// ---------- 13 블록 정의 ----------

export const DICE_BLOCKS: BlockDef[] = [
  // 1) roll button ----------------------------------------------------------
  //
  // 클릭 시 EXPR 표현식을 굴리는 sheet roll button.
  // <button type="roll" name="roll_${NAME}" value="${EXPR}" class="sheet-${CLASS}">LABEL</button>
  {
    type: 'r20_roll_button',
    shape: 'stack',
    category: DICE,
    label: '굴림 버튼',
    tooltip: '시트 굴림 버튼 — name="roll_NAME" + Expression 슬롯에 굴림식.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('굴림 버튼')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('attack'), 'NAME');
      b.appendDummyInput()
        .appendField('label')
        .appendField(new Blockly.FieldTextInput('Roll'), 'LABEL');
      b.appendValueInput('EXPR').setCheck(null).appendField('값');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim();
      const label = String(b.getFieldValue('LABEL') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const expr = ctx.valueToCode(block, 'EXPR', ORDER.NONE) || '';
      return (
        `<button type="roll"${attr('name', name ? `roll_${name}` : '')}` +
        `${attr('value', expr)}${sheetClassAttr(cls)}${styleAttr(style)}>${escapeText(label)}</button>`
      );
    },
  },

  // 1.5) friendly roll button ---------------------------------------------
  //
  // The canonical roll button above keeps its expression socket for block
  // authors. Direct visual editing needs one text field that can hold a full
  // Roll20 command without forcing the user into the expression workspace.
  {
    type: 'r20_roll_button_easy',
    shape: 'stack',
    category: DICE,
    label: '주사위 버튼',
    tooltip: '쉬운 주사위 버튼 — 굴림 명령을 한 칸에 입력합니다.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('주사위 버튼')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('check'), 'NAME');
      b.appendDummyInput()
        .appendField('표시 글자')
        .appendField(new Blockly.FieldTextInput('주사위 굴리기'), 'LABEL');
      b.appendDummyInput()
        .appendField('굴림 명령')
        .appendField(new Blockly.FieldTextInput('1d20'), 'FORMULA');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim();
      const label = String(b.getFieldValue('LABEL') ?? '');
      const formula = String(b.getFieldValue('FORMULA') ?? '').trim();
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return (
        `<button type="roll"${attr('name', name ? `roll_${name}` : '')}`
        + `${attr('value', formula)}${sheetClassAttr(cls)}${styleAttr(style)}>${escapeText(label)}</button>`
      );
    },
  },

  // 2) action button --------------------------------------------------------
  //
  // sheet action button — 클릭 시 sheet worker (clicked:act_NAME) 트리거.
  {
    type: 'r20_action_button',
    shape: 'stack',
    category: DICE,
    label: '동작 버튼',
    tooltip: '액션 버튼 — sheet worker 이벤트 (clicked:act_NAME) 트리거.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('액션 버튼')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('act'), 'NAME');
      b.appendDummyInput()
        .appendField('label')
        .appendField(new Blockly.FieldTextInput('Action'), 'LABEL');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim();
      const label = String(b.getFieldValue('LABEL') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return (
        `<button type="action"${attr('name', name ? `act_${name}` : '')}` +
        `${sheetClassAttr(cls)}${styleAttr(style)}>${escapeText(label)}</button>`
      );
    },
  },

  // 3) chat button ----------------------------------------------------------
  //
  // 채팅 메시지를 보내는 roll button — value 에 메시지 텍스트.
  // (굴림 표현식이 아닌 평문/매크로 채팅용.)
  {
    type: 'r20_chat_button',
    shape: 'stack',
    category: DICE,
    label: '채팅 보내기 버튼',
    tooltip: '채팅 메시지 발송 버튼 — value="MESSAGE" 그대로 채팅 송신.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('채팅 버튼')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('say'), 'NAME');
      b.appendDummyInput()
        .appendField('label')
        .appendField(new Blockly.FieldTextInput('Say'), 'LABEL');
      b.appendDummyInput()
        .appendField('message')
        .appendField(new Blockly.FieldTextInput('Hello'), 'MESSAGE');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim();
      const label = String(b.getFieldValue('LABEL') ?? '');
      const message = String(b.getFieldValue('MESSAGE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return (
        `<button type="roll"${attr('name', name ? `roll_${name}` : '')}` +
        `${attr('value', message)}${sheetClassAttr(cls)}${styleAttr(style)}>${escapeText(label)}</button>`
      );
    },
  },

  // 4) rolltemplate define --------------------------------------------------
  //
  // <rolltemplate class="sheet-rolltemplate-${NAME}"> wrapper.
  // ROWS slot 에 row / cond / each / field_ref(via stack wrappers) 자식.
  {
    type: 'r20_rolltemplate_define',
    shape: 'c',
    category: DICE,
    label: '주사위 결과 카드 만들기',
    tooltip:
      '<rolltemplate class="sheet-rolltemplate-NAME"> wrapper — NAME 은 호출 시 &{template:NAME}.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('주사위 결과 카드')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('default'), 'NAME');
      b.appendStatementInput('ROWS').setCheck(null);
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'default';
      const rows = ctx.statementToCode(block, 'ROWS');
      return wrapTag(
        ctx,
        'rolltemplate',
        ` class="sheet-rolltemplate-${escapeAttr(name)}"${styleAttr(style)}`,
        rows,
      );
    },
  },

  // 5) rolltemplate row -----------------------------------------------------
  //
  // rolltemplate body 안의 한 행 — <div class="sheet-row"(+CLASS)>.
  {
    type: 'r20_rolltemplate_row',
    shape: 'c',
    category: DICE,
    label: '결과 카드: 한 줄',
    tooltip: 'rolltemplate 내부 행 — <div class="sheet-row">.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('줄')
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendStatementInput('CHILDREN').setCheck(null);
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '').trim();
      const children = ctx.statementToCode(block, 'CHILDREN');
      const classValue = cls ? `sheet-row sheet-${cls}` : 'sheet-row';
      return wrapTag(ctx, 'div', ` class="${escapeAttr(classValue)}"${styleAttr(style)}`, children);
    },
  },

  // 6) rolltemplate cond if -------------------------------------------------
  //
  // Mustache section — {{#FIELD}} ... {{/FIELD}}. FIELD truthy 일 때 표시.
  {
    type: 'r20_rolltemplate_cond_if',
    shape: 'c',
    category: DICE,
    label: '결과 카드: 조건이 맞으면',
    tooltip: 'Mustache section — FIELD truthy 일 때만 표시 {{#FIELD}}…{{/FIELD}}.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('만약')
        .appendField('field')
        .appendField(new Blockly.FieldTextInput('hit'), 'FIELD');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const field = String(b.getFieldValue('FIELD') ?? '').trim() || 'field';
      const children = ctx.statementToCode(block, 'CHILDREN');
      const body = children && children.trim() ? `\n${ctx.indent(children)}\n` : '';
      return `{{#${field}}}${body}{{/${field}}}`;
    },
  },

  // 7) rolltemplate cond unless ---------------------------------------------
  //
  // Mustache inverted section — {{^FIELD}} ... {{/FIELD}}. FIELD falsy 일 때.
  {
    type: 'r20_rolltemplate_cond_unless',
    shape: 'c',
    category: DICE,
    label: '결과 카드: 조건이 아니면',
    tooltip: 'Mustache inverted section — FIELD 가 falsy 일 때만 표시.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('만약 아니라면')
        .appendField('field')
        .appendField(new Blockly.FieldTextInput('hit'), 'FIELD');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const field = String(b.getFieldValue('FIELD') ?? '').trim() || 'field';
      const children = ctx.statementToCode(block, 'CHILDREN');
      const body = children && children.trim() ? `\n${ctx.indent(children)}\n` : '';
      return `{{^${field}}}${body}{{/${field}}}`;
    },
  },

  // 8) rolltemplate each ----------------------------------------------------
  //
  // Mustache iteration — {{#FIELD}} ... {{/FIELD}} (배열/리스트 반복).
  // syntax 는 cond_if 와 동일하나 의미가 다름 — 별도 블록으로 분리해 UI 명료.
  {
    type: 'r20_rolltemplate_each',
    shape: 'c',
    category: DICE,
    label: '결과 카드: 목록 반복',
    tooltip:
      'Mustache iteration — FIELD 의 항목 수만큼 children 반복 {{#FIELD}}…{{/FIELD}}.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('각각')
        .appendField('field')
        .appendField(new Blockly.FieldTextInput('rolls'), 'FIELD');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const field = String(b.getFieldValue('FIELD') ?? '').trim() || 'field';
      const children = ctx.statementToCode(block, 'CHILDREN');
      const body = children && children.trim() ? `\n${ctx.indent(children)}\n` : '';
      return `{{#${field}}}${body}{{/${field}}}`;
    },
  },

  // 9) rolltemplate field ref -----------------------------------------------
  //
  // reporter — {{NAME}}. rolltemplate body 안에서 invoke 측 key=value 의 값
  // 을 출력.
  {
    type: 'r20_rolltemplate_field_ref',
    shape: 'reporter',
    category: DICE,
    label: '결과 카드: 값 표시',
    tooltip: 'rolltemplate 필드 참조 — invoke 측 key=value 의 value 출력.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('{{')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME')
        .appendField('}}');
      b.setOutput(true, 'String');
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'name';
      return [`{{${name}}}`, ORDER.ATOMIC];
    },
  },

  // 10) rolltemplate helper -------------------------------------------------
  //
  // Roll20 표준 헬퍼 토큰 — {{#allprops()}} 등. dropdown 으로 안전한 셋 한정.
  {
    type: 'r20_rolltemplate_helper',
    shape: 'reporter',
    category: DICE,
    label: '결과 카드: 고급 도우미',
    tooltip: 'Roll20 rolltemplate 표준 헬퍼 — allprops / rollWasCrit / etc.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('{{#')
        .appendField(new Blockly.FieldDropdown(ROLLTEMPLATE_HELPERS), 'NAME')
        .appendField('}}');
      b.setOutput(true, 'String');
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const raw = String(b.getFieldValue('NAME') ?? '');
      const allowed = new Set(ROLLTEMPLATE_HELPERS.map(([, v]) => v));
      const name = allowed.has(raw) ? raw : 'allprops()';
      return [`{{#${name}}}`, ORDER.ATOMIC];
    },
  },

  // 11) rolltemplate computed -----------------------------------------------
  //
  // {{computed::NAME}} — Roll20 의 computed-field 토큰.
  {
    type: 'r20_rolltemplate_computed',
    shape: 'reporter',
    category: DICE,
    label: '결과 카드: 자동 계산',
    tooltip: 'rolltemplate computed 필드 — {{computed::NAME}}.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('{{computed::')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME')
        .appendField('}}');
      b.setOutput(true, 'String');
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'name';
      return [`{{computed::${name}}}`, ORDER.ATOMIC];
    },
  },

  // 12) template invoke -----------------------------------------------------
  //
  // 채팅 rolltemplate 호출 — `&{template:NAME} {{k=v}} {{k=v}} ...`.
  // KEY_VALUE_PAIRS slot 에 자식 (field_ref / 임의 stack) 들어가면 그 emit
  // 결과를 공백으로 합쳐 호출 문자열로 만듬.
  {
    type: 'r20_template_invoke',
    shape: 'stack',
    category: DICE,
    label: '결과 카드 사용하기',
    tooltip: '채팅에 rolltemplate 호출 — &{template:NAME} {{key=value}} …',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('결과 카드 사용')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('default'), 'NAME');
      b.appendStatementInput('KEY_VALUE_PAIRS').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'default';
      const kv = ctx.statementToCode(block, 'KEY_VALUE_PAIRS');
      const keyvalues = flattenInline(kv);
      const prefix = `&{template:${name}}`;
      return keyvalues ? `${prefix} ${keyvalues}` : prefix;
    },
  },
];

/**
 * Stage A-5 — Dice 13 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerDiceBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of DICE_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-5 의 generator 매핑 — emit-worker lookup. */
export const DICE_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  DICE_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

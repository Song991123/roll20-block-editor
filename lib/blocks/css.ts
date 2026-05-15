/**
 * CSS 카테고리 — 19 블록 (Stage A-8).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 8 (디자인 / CSS, hue 120).
 *   - docs/spec/02_functional_spec.md §3.2 — c / stack / reporter.
 *   - docs/spec/12_roll20_output_spec.md §3 (CSS 워크스페이스 emit).
 *
 * Roll20 시트 sheet.css 작성 — 셀렉터 / 선언 / 색 / 변수 / @media / @keyframes.
 * autoPrefix (D4 ①) 가 selector_class 의 `.${NAME}` → `.sheet-${NAME}` 으로 부착.
 * 시스템 specific 토큰 0.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext, ORDER } from './types';

// ---------- 카테고리 / 상수 ----------

const CSS = 'css' as const;
/** spec §3.1 — CSS 카테고리 hue. */
const HUE = 120;

const T_STR = 'String';

// ---------- dropdown 옵션 ----------

/** 요소 셀렉터 — 시트에서 자주 쓰는 4 종. */
const ELEMENT_TAGS: Array<[string, string]> = [
  ['*', '*'],
  ['div', 'div'],
  ['span', 'span'],
  ['input', 'input'],
  ['button', 'button'],
  ['textarea', 'textarea'],
  ['select', 'select'],
  ['option', 'option'],
  ['table', 'table'],
  ['tr', 'tr'],
  ['td', 'td'],
  ['th', 'th'],
  ['caption', 'caption'],
  ['p', 'p'],
  ['hr', 'hr'],
  ['h1', 'h1'],
  ['h2', 'h2'],
  ['h3', 'h3'],
  ['h4', 'h4'],
  ['label', 'label'],
  ['fieldset', 'fieldset'],
  ['a', 'a'],
  ['img', 'img'],
];

/** 속성 셀렉터 연산자 — =, ^=, $=, *=. */
const ATTR_OPS: Array<[string, string]> = [
  ['=', '='],
  ['^=', '^='],
  ['$=', '$='],
  ['*=', '*='],
];

/** 의사 클래스 — hover/focus/checked/disabled + nth-child. */
const PSEUDOS: Array<[string, string]> = [
  ['hover', 'hover'],
  ['focus', 'focus'],
  ['checked', 'checked'],
  ['disabled', 'disabled'],
  ['nth-child', 'nth-child'],
];

/** 의사 요소 (::pseudo-element) — Roll20 시트에서 자주 쓰는 8 종. */
const PSEUDO_ELEMENTS: Array<[string, string]> = [
  ['before', 'before'],
  ['after', 'after'],
  ['placeholder', 'placeholder'],
  ['first-line', 'first-line'],
  ['first-letter', 'first-letter'],
  ['-webkit-inner-spin-button', '-webkit-inner-spin-button'],
  ['-webkit-outer-spin-button', '-webkit-outer-spin-button'],
  ['-webkit-input-placeholder', '-webkit-input-placeholder'],
];

/** 키프레임 정지점 — from/to + 5 단계 백분율. */
const KEYFRAME_STOPS: Array<[string, string]> = [
  ['from', 'from'],
  ['to', 'to'],
  ['0%', '0%'],
  ['25%', '25%'],
  ['50%', '50%'],
  ['75%', '75%'],
  ['100%', '100%'],
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

// ---------- CSS emit helper ----------

/** CSS 식별자(이름) sanitize — 영숫자 / `_` / `-` 만 허용. */
function sanitizeIdent(raw: string): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  return s.replace(/[^A-Za-z0-9_-]/g, '');
}

/** dropdown 값 화이트리스트 검증 — 미허용 시 fallback. */
function pickAllowed(raw: string, opts: Array<[string, string]>, fallback: string): string {
  const allowed = new Set(opts.map(([, v]) => v));
  const s = String(raw ?? '').trim();
  return allowed.has(s) ? s : fallback;
}

/** 속성 셀렉터 값의 `"`, `\` escape. */
function cssQuoteEscape(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/** 자유 입력 CSS fragment — 줄바꿈 / `{` / `}` 제거 (injection 방어). */
function safeCss(value: string): string {
  return String(value ?? '').replace(/[\r\n{}]/g, ' ').trim();
}

/** 선언 값 — `;` 까지 추가 제거 (선언 분리 깨짐 방지). */
function safeDeclValue(value: string): string {
  return String(value ?? '').replace(/[\r\n{};]/g, ' ').trim();
}

/** `head { content }` 형태 wrap. content 비면 `head {}`. */
function wrapBraces(ctx: GeneratorContext, head: string, content: string): string {
  if (!content || !content.trim()) return `${head} {}`;
  return `${head} {\n${ctx.indent(content)}\n}`;
}

// ---------- 19 블록 정의 ----------

export const CSS_BLOCKS: BlockDef[] = [
  // 1) css rule -------------------------------------------------------------
  {
    type: 'r20_css_rule',
    shape: 'c',
    category: CSS,
    label: '디자인 규칙',
    tooltip: '${selector} { ${decls} } — 셀렉터 + 선언 블록 묶음.',
    init: mkInit((b) => {
      b.appendValueInput('SELECTOR').setCheck(T_STR).appendField('디자인 규칙');
      b.appendStatementInput('DECLS').setCheck(null).appendField('선언');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const selector = (ctx.valueToCode(block, 'SELECTOR', ORDER.NONE) || '').trim() || '*';
      const decls = ctx.statementToCode(block, 'DECLS');
      return wrapBraces(ctx, selector, decls);
    },
  },

  // 2) selector class ------------------------------------------------------
  {
    type: 'r20_selector_class',
    shape: 'reporter',
    category: CSS,
    label: '클래스 고르기 (.이름)',
    tooltip: '.NAME — autoPrefix (D4 ①) 가 `.sheet-` 자동 부착.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('.')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = sanitizeIdent(String(b.getFieldValue('NAME') ?? ''));
      return [name ? `.${name}` : '', ORDER.ATOMIC];
    },
  },

  // 3) selector id ---------------------------------------------------------
  {
    type: 'r20_selector_id',
    shape: 'reporter',
    category: CSS,
    label: 'ID 고르기 (#이름)',
    tooltip: '#NAME — 단일 id 매칭.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('#')
        .appendField(new Blockly.FieldTextInput('id'), 'NAME');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = sanitizeIdent(String(b.getFieldValue('NAME') ?? ''));
      return [name ? `#${name}` : '', ORDER.ATOMIC];
    },
  },

  // 4) selector element ----------------------------------------------------
  {
    type: 'r20_selector_element',
    shape: 'reporter',
    category: CSS,
    label: '태그 고르기',
    tooltip: 'div / span / input / button.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('태그 이름')
        .appendField(new Blockly.FieldDropdown(ELEMENT_TAGS), 'TAG');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const tag = pickAllowed(String(b.getFieldValue('TAG') ?? ''), ELEMENT_TAGS, 'div');
      return [tag, ORDER.ATOMIC];
    },
  },

  // 5) selector attr -------------------------------------------------------
  {
    type: 'r20_selector_attr',
    shape: 'reporter',
    category: CSS,
    label: '속성으로 고르기',
    tooltip: '[ATTR OP "VALUE"] — 속성 매칭.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('[')
        .appendField(new Blockly.FieldTextInput('name'), 'ATTR')
        .appendField(new Blockly.FieldDropdown(ATTR_OPS), 'OP')
        .appendField(new Blockly.FieldTextInput(''), 'VALUE')
        .appendField(']');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const attr = sanitizeIdent(String(b.getFieldValue('ATTR') ?? ''));
      const op = pickAllowed(String(b.getFieldValue('OP') ?? ''), ATTR_OPS, '=');
      const value = cssQuoteEscape(safeCss(String(b.getFieldValue('VALUE') ?? '')));
      if (!attr) return ['', ORDER.ATOMIC];
      return [`[${attr}${op}"${value}"]`, ORDER.ATOMIC];
    },
  },

  // 6) descendant ----------------------------------------------------------
  {
    type: 'r20_selector_descendant',
    shape: 'reporter',
    category: CSS,
    label: '안쪽 모든 자손',
    tooltip: 'A B — A 내부 자손 B.',
    init: mkInit((b) => {
      b.appendValueInput('A').setCheck(T_STR).appendField('A');
      b.appendValueInput('B').setCheck(T_STR).appendField('B');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const lhs = (ctx.valueToCode(block, 'A', ORDER.NONE) || '').trim();
      const rhs = (ctx.valueToCode(block, 'B', ORDER.NONE) || '').trim();
      if (!lhs || !rhs) return [lhs || rhs, ORDER.ATOMIC];
      return [`${lhs} ${rhs}`, ORDER.ATOMIC];
    },
  },

  // 7) child > -------------------------------------------------------------
  {
    type: 'r20_selector_child',
    shape: 'reporter',
    category: CSS,
    label: '바로 안쪽 자식',
    tooltip: 'A > B — 직계 자식.',
    init: mkInit((b) => {
      b.appendValueInput('A').setCheck(T_STR).appendField('A');
      b.appendValueInput('B').setCheck(T_STR).appendField('>');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const lhs = (ctx.valueToCode(block, 'A', ORDER.NONE) || '').trim();
      const rhs = (ctx.valueToCode(block, 'B', ORDER.NONE) || '').trim();
      if (!lhs || !rhs) return [lhs || rhs, ORDER.ATOMIC];
      return [`${lhs} > ${rhs}`, ORDER.ATOMIC];
    },
  },

  // 8) adjacent sibling + --------------------------------------------------
  {
    type: 'r20_selector_sibling_adj',
    shape: 'reporter',
    category: CSS,
    label: '바로 다음 형제',
    tooltip: 'A + B — 바로 다음 형제.',
    init: mkInit((b) => {
      b.appendValueInput('A').setCheck(T_STR).appendField('A');
      b.appendValueInput('B').setCheck(T_STR).appendField('+');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const lhs = (ctx.valueToCode(block, 'A', ORDER.NONE) || '').trim();
      const rhs = (ctx.valueToCode(block, 'B', ORDER.NONE) || '').trim();
      if (!lhs || !rhs) return [lhs || rhs, ORDER.ATOMIC];
      return [`${lhs} + ${rhs}`, ORDER.ATOMIC];
    },
  },

  // 9) general sibling ~ ---------------------------------------------------
  {
    type: 'r20_selector_sibling_gen',
    shape: 'reporter',
    category: CSS,
    label: '뒤따르는 모든 형제',
    tooltip: 'A ~ B — 같은 부모의 뒤 형제.',
    init: mkInit((b) => {
      b.appendValueInput('A').setCheck(T_STR).appendField('A');
      b.appendValueInput('B').setCheck(T_STR).appendField('~');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const lhs = (ctx.valueToCode(block, 'A', ORDER.NONE) || '').trim();
      const rhs = (ctx.valueToCode(block, 'B', ORDER.NONE) || '').trim();
      if (!lhs || !rhs) return [lhs || rhs, ORDER.ATOMIC];
      return [`${lhs} ~ ${rhs}`, ORDER.ATOMIC];
    },
  },

  // 10) pseudo class -------------------------------------------------------
  {
    type: 'r20_selector_pseudo',
    shape: 'reporter',
    category: CSS,
    label: '상태로 고르기 ( :hover 등 )',
    tooltip: 'BASE:PSEUDO(ARG) — hover/focus/checked/disabled/nth-child. ARG 비면 괄호 생략.',
    init: mkInit((b) => {
      b.appendValueInput('BASE').setCheck(T_STR).appendField('BASE');
      b.appendDummyInput()
        .appendField(':')
        .appendField(new Blockly.FieldDropdown(PSEUDOS), 'PSEUDO')
        .appendField('(')
        .appendField(new Blockly.FieldTextInput(''), 'ARG')
        .appendField(')');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const base = (ctx.valueToCode(block, 'BASE', ORDER.NONE) || '').trim();
      const pseudo = pickAllowed(
        String(b.getFieldValue('PSEUDO') ?? ''),
        PSEUDOS,
        'hover',
      );
      const arg = safeCss(String(b.getFieldValue('ARG') ?? ''));
      const tail = arg ? `:${pseudo}(${arg})` : `:${pseudo}`;
      return [`${base}${tail}`, ORDER.ATOMIC];
    },
  },

  // 10.5) pseudo element (::after, ::-webkit-*) ----------------------------
  {
    type: 'r20_selector_pseudo_element',
    shape: 'reporter',
    category: CSS,
    label: '꾸미는 부분 ( ::after 등 )',
    tooltip: 'BASE::PSEUDO — ::before/::after/::placeholder/::-webkit-* 등 의사 요소.',
    init: mkInit((b) => {
      b.appendValueInput('BASE').setCheck(T_STR).appendField('BASE');
      b.appendDummyInput()
        .appendField('::')
        .appendField(new Blockly.FieldDropdown(PSEUDO_ELEMENTS), 'PSEUDO');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const bb = block as Blockly.Block;
      const base = (ctx.valueToCode(block, 'BASE', ORDER.NONE) || '').trim();
      const pseudo = pickAllowed(
        String(bb.getFieldValue('PSEUDO') ?? ''),
        PSEUDO_ELEMENTS,
        'after',
      );
      return [`${base}::${pseudo}`, ORDER.ATOMIC];
    },
  },

  // 10.55) compound selector — tag + .class / #id / [attr] chain --------------
  {
    type: 'r20_selector_compound',
    shape: 'reporter',
    category: CSS,
    label: '겹쳐서 고르기 (예: div.foo)',
    tooltip: 'BASE + TAIL — 공백 없이 접합 (`div.foo`, `input.bar[value=on]` 등).',
    init: mkInit((b) => {
      b.appendValueInput('BASE').setCheck(T_STR).appendField('BASE');
      b.appendDummyInput()
        .appendField('+')
        .appendField(new Blockly.FieldTextInput('.cls'), 'TAIL');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const bb = block as Blockly.Block;
      const base = (ctx.valueToCode(block, 'BASE', ORDER.NONE) || '').trim();
      const tail = String(bb.getFieldValue('TAIL') ?? '').replace(/[{}\r\n\s]/g, '').trim();
      if (!base) return [tail, ORDER.ATOMIC];
      if (!tail) return [base, ORDER.ATOMIC];
      return [`${base}${tail}`, ORDER.ATOMIC];
    },
  },

  // 10.6) complex selector — raw 입력 (parser 가 분해 못한 selector 보존) -----
  {
    type: 'r20_selector_complex',
    shape: 'reporter',
    category: CSS,
    label: '직접 셀렉터 입력',
    tooltip: '복잡한 셀렉터를 직접 입력 — 분해 못 한 selector 의 100% 보존용.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('직접 셀렉터')
        .appendField(new Blockly.FieldTextInput('div .foo'), 'TEXT');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const bb = block as Blockly.Block;
      // selector 안에서 `{`, `}` 만 차단 (rule 경계 안전), 나머지 그대로.
      const raw = String(bb.getFieldValue('TEXT') ?? '').replace(/[{}\r\n]/g, ' ').trim();
      return [raw, ORDER.ATOMIC];
    },
  },

  // 11) comma group --------------------------------------------------------
  {
    type: 'r20_selector_comma',
    shape: 'reporter',
    category: CSS,
    label: '여러 개 같이 고르기',
    tooltip: 'A, B — 두 셀렉터 묶음.',
    init: mkInit((b) => {
      b.appendValueInput('A').setCheck(T_STR).appendField('A');
      b.appendValueInput('B').setCheck(T_STR).appendField(',');
      b.setInputsInline(true);
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const lhs = (ctx.valueToCode(block, 'A', ORDER.NONE) || '').trim();
      const rhs = (ctx.valueToCode(block, 'B', ORDER.NONE) || '').trim();
      if (!lhs || !rhs) return [lhs || rhs, ORDER.ATOMIC];
      return [`${lhs}, ${rhs}`, ORDER.ATOMIC];
    },
  },

  // 12) css decl -----------------------------------------------------------
  {
    type: 'r20_css_decl',
    shape: 'stack',
    category: CSS,
    label: '스타일 한 줄',
    tooltip: 'PROPERTY: VALUE; — 예: color: red;.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField(new Blockly.FieldTextInput('color'), 'PROPERTY')
        .appendField(':')
        .appendField(new Blockly.FieldTextInput('red'), 'VALUE')
        .appendField(';');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const prop = sanitizeIdent(String(b.getFieldValue('PROPERTY') ?? ''));
      const value = safeDeclValue(String(b.getFieldValue('VALUE') ?? ''));
      if (!prop) return '';
      return `${prop}: ${value};`;
    },
  },

  // 13) color literal ------------------------------------------------------
  {
    type: 'r20_color_literal',
    shape: 'reporter',
    category: CSS,
    label: '색',
    tooltip: '#RRGGBB HEX 텍스트 입력 — 잘못된 입력은 검정으로 fallback.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('색')
        .appendField(new Blockly.FieldTextInput('#000000'), 'COLOR');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const raw = String(b.getFieldValue('COLOR') ?? '#000000');
      // #RRGGBB 정규화 — 잘못된 입력 fallback 검정.
      const valid = /^#[0-9a-fA-F]{6}$/.test(raw);
      return [valid ? raw : '#000000', ORDER.ATOMIC];
    },
  },

  // 14) color var ----------------------------------------------------------
  {
    type: 'r20_color_var',
    shape: 'reporter',
    category: CSS,
    label: '색 변수 가져오기',
    tooltip: 'var(--NAME) — CSS 커스텀 프로퍼티 참조.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('var(--')
        .appendField(new Blockly.FieldTextInput('accent'), 'NAME')
        .appendField(')');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = sanitizeIdent(String(b.getFieldValue('NAME') ?? ''));
      return [name ? `var(--${name})` : '', ORDER.ATOMIC];
    },
  },

  // 15) css var def --------------------------------------------------------
  {
    type: 'r20_css_var_def',
    shape: 'stack',
    category: CSS,
    label: '색 변수 만들기',
    tooltip: '--NAME: VALUE; — :root 규칙 안에 위치.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('--')
        .appendField(new Blockly.FieldTextInput('accent'), 'NAME')
        .appendField(':')
        .appendField(new Blockly.FieldTextInput('#3366ff'), 'VALUE')
        .appendField(';');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = sanitizeIdent(String(b.getFieldValue('NAME') ?? ''));
      const value = safeDeclValue(String(b.getFieldValue('VALUE') ?? ''));
      if (!name) return '';
      return `--${name}: ${value};`;
    },
  },

  // 16) media query --------------------------------------------------------
  {
    type: 'r20_media_query',
    shape: 'c',
    category: CSS,
    label: '화면 크기 조건',
    tooltip: '@media (CONDITION) { ... } — 반응형 묶음.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('@media (')
        .appendField(new Blockly.FieldTextInput('max-width: 640px'), 'CONDITION')
        .appendField(')');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cond = safeCss(String(b.getFieldValue('CONDITION') ?? ''));
      const children = ctx.statementToCode(block, 'CHILDREN');
      return wrapBraces(ctx, `@media (${cond})`, children);
    },
  },

  // 17) keyframes ----------------------------------------------------------
  {
    type: 'r20_keyframes',
    shape: 'c',
    category: CSS,
    label: '움직임 정의',
    tooltip: '@keyframes NAME { ... } — 애니메이션 시퀀스 정의.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('@keyframes')
        .appendField(new Blockly.FieldTextInput('fadeIn'), 'NAME');
      b.appendStatementInput('STOPS').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = sanitizeIdent(String(b.getFieldValue('NAME') ?? ''));
      const stops = ctx.statementToCode(block, 'STOPS');
      const head = name ? `@keyframes ${name}` : '@keyframes _unnamed';
      return wrapBraces(ctx, head, stops);
    },
  },

  // 18) keyframe stop ------------------------------------------------------
  {
    type: 'r20_keyframe_stop',
    shape: 'stack',
    category: CSS,
    label: '움직임 단계',
    tooltip: 'from / to / 0% / 25% / 50% / 75% / 100% — 안에 선언 블록.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('단계')
        .appendField(new Blockly.FieldDropdown(KEYFRAME_STOPS), 'PERCENT');
      b.appendStatementInput('DECLS').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const pct = pickAllowed(
        String(b.getFieldValue('PERCENT') ?? ''),
        KEYFRAME_STOPS,
        'from',
      );
      const decls = ctx.statementToCode(block, 'DECLS');
      return wrapBraces(ctx, pct, decls);
    },
  },

  // 18.5) css @font-face -------------------------------------------------
  {
    type: 'r20_css_font_face',
    shape: 'stack',
    category: CSS,
    label: '글꼴 추가하기 (@font-face)',
    tooltip: '@font-face { font-family: FAMILY; src: SRC; font-weight: WEIGHT; font-style: STYLE; } — 외부 글꼴 등록.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('@font-face')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('MyFont'), 'FAMILY');
      b.appendDummyInput()
        .appendField('src')
        .appendField(new Blockly.FieldTextInput("url('https://example.com/font.woff2') format('woff2')"), 'SRC');
      b.appendDummyInput()
        .appendField('굵기')
        .appendField(new Blockly.FieldTextInput('normal'), 'WEIGHT');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput('normal'), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const bb = block as Blockly.Block;
      const family = safeDeclValue(String(bb.getFieldValue('FAMILY') ?? '')).trim();
      const src = safeDeclValue(String(bb.getFieldValue('SRC') ?? '')).trim();
      const weight = safeDeclValue(String(bb.getFieldValue('WEIGHT') ?? '')).trim();
      const style = safeDeclValue(String(bb.getFieldValue('STYLE') ?? '')).trim();
      const decls: string[] = [];
      if (family) decls.push(`font-family: '${family.replace(/'/g, '')}';`);
      if (src) decls.push(`src: ${src};`);
      if (weight) decls.push(`font-weight: ${weight};`);
      if (style) decls.push(`font-style: ${style};`);
      return wrapBraces(ctx, '@font-face', decls.join('\n'));
    },
  },

  // 19) css rule chain -----------------------------------------------------
  {
    type: 'r20_css_rule_chain',
    shape: 'c',
    category: CSS,
    label: '규칙 묶음',
    tooltip: '여러 CSS 규칙 그룹화. emit 시 단순 연결 (wrapper 없음).',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('규칙 묶음');
      b.appendStatementInput('RULES').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      return ctx.statementToCode(block, 'RULES');
    },
  },
];

/**
 * Stage A-8 — CSS 19 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerCssBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of CSS_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-8 의 generator 매핑 — emit-worker lookup. */
export const CSS_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  CSS_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

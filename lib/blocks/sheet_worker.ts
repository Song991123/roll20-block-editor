/**
 * Sheet Worker 카테고리 — 25 블록 (Stage A-6).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 7 (시트 자동화 / Sheet Worker,
 *     hue 0).
 *   - docs/spec/02_functional_spec.md §3.2 — hat + c + stack + reporter +
 *     boolean 혼합.
 *   - docs/spec/04_block_taxonomy_v2.md (Sheet Worker 카탈로그).
 *   - docs/spec/12_roll20_output_spec.md §3 (sheet worker emit contract —
 *     `<script type="text/worker">` 안의 JS).
 *
 * Roll20 sheet worker JS API:
 *   - on('sheet:opened' | 'change:attr_NAME' | 'change:repeating_S:A'
 *       | 'remove:repeating_S' | 'clicked:NAME', handler)
 *   - getAttrs([...names], (v) => {...})
 *   - setAttrs({ name: value, ... })
 *   - getSectionIDs('repeating_S', (ids) => {...})
 *   - generateRowID(), removeRepeatingRow('repeating_S_id')
 *   - getTranslationByKey('key')
 *
 * 시스템 specific 토큰 0. 이벤트 이름 / 필드 이름 / 변수 이름은 모두 사용자
 * 데이터.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext, ORDER } from './types';

// ---------- 카테고리 / 타입 상수 ----------

const SHEET_WORKER = 'sheet_worker' as const;
/** spec §3.1 — 시트 자동화 카테고리 hue (events, red). */
const HUE = 0;

const T_NUM = 'Number';
const T_STR = 'String';
const T_BOOL = 'Boolean';

// ---------- dropdown 옵션 ----------

const ARITH_OPS: Array<[string, string]> = [
  ['+', '+'],
  ['−', '-'],
  ['×', '*'],
  ['÷', '/'],
  ['%', '%'],
];

const CMP_OPS: Array<[string, string]> = [
  ['=', '==='],
  ['≠', '!=='],
  ['<', '<'],
  ['≤', '<='],
  ['>', '>'],
  ['≥', '>='],
];

const LOGIC_OPS: Array<[string, string]> = [
  ['그리고', '&&'],
  ['또는', '||'],
];

// ---------- init helper ----------

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

/** stack prev/next (untyped). */
function setStackHooks(b: Blockly.Block): void {
  b.setPreviousStatement(true, null);
  b.setNextStatement(true, null);
}

/** hat: 위 결합 X, 아래 결합 O (이벤트 핸들러 chain). */
function setHatHooks(b: Blockly.Block): void {
  b.setPreviousStatement(false);
  b.setNextStatement(true, null);
}

/** cap: 위 결합 O, 아래 결합 X (return). */
function setCapHooks(b: Blockly.Block): void {
  b.setPreviousStatement(true, null);
  b.setNextStatement(false);
}

// ---------- JS emit helper ----------

/** JS 문자열 리터럴 안에 들어갈 식별자/키 escape. */
function escapeJSString(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** statementToCode 결과의 trailing newline 정리 + 빈 문자열 안전. */
function trimBody(code: string): string {
  if (!code) return '';
  return code.replace(/\s+$/u, '');
}

/**
 * 자식 statement 를 `() => { ${children} }` body 로 wrap (들여쓰기 포함).
 * children 비면 빈 본문 emit.
 */
function wrapArrowBody(ctx: GeneratorContext, children: string): string {
  const body = trimBody(children);
  if (!body) return `() => {}`;
  return `() => {\n${ctx.indent(body)}\n}`;
}

/**
 * `{` 블록 본문 ` }` wrap — children 들여쓰기 적용.
 */
function wrapBraceBody(ctx: GeneratorContext, children: string): string {
  const body = trimBody(children);
  if (!body) return `{}`;
  return `{\n${ctx.indent(body)}\n}`;
}

/** ARITH/CMP/LOGIC dropdown 의 op 화이트리스트 검증. */
function pickOp(raw: string, allowed: Array<[string, string]>, fallback: string): string {
  const ok = new Set(allowed.map(([, v]) => v));
  return ok.has(raw) ? raw : fallback;
}

/** comma-separated 필드 → JS array literal (`['a','b']`). */
function attrListLiteral(raw: string): string {
  const items = String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => `'${escapeJSString(s)}'`);
  return `[${items.join(', ')}]`;
}

// ---------- 25 블록 정의 ----------

export const SHEET_WORKER_BLOCKS: BlockDef[] = [
  // ========================================================================
  // Hat blocks ×5
  // ========================================================================

  // 1) on sheet:opened ------------------------------------------------------
  {
    type: 'r20_on_sheet_opened',
    shape: 'hat',
    category: SHEET_WORKER,
    label: '시트가 열렸을 때',
    tooltip: 'on("sheet:opened", ...) — 시트 처음 열릴 때 한 번 실행.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('시트가 열렸을 때');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setHatHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const body = ctx.statementToCode(block, 'CHILDREN');
      void b;
      return `on('sheet:opened', ${wrapArrowBody(ctx, body)});\n`;
    },
  },

  // 2) on change:attr_NAME --------------------------------------------------
  {
    type: 'r20_on_attr_change',
    shape: 'hat',
    category: SHEET_WORKER,
    label: '시트 값이 바뀌었을 때',
    tooltip: 'on("change:NAME", ...) — 속성값이 바뀔 때 실행.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('시트 값이 바뀌었을 때')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('hp'), 'NAME');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setHatHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'attr';
      const body = ctx.statementToCode(block, 'CHILDREN');
      return `on('change:${escapeJSString(name)}', ${wrapArrowBody(ctx, body)});\n`;
    },
  },

  // 3) on change:repeating_S:A ---------------------------------------------
  {
    type: 'r20_on_repeating_change',
    shape: 'hat',
    category: SHEET_WORKER,
    label: '반복 영역 값이 바뀌었을 때',
    tooltip: 'on("change:repeating_S:A", ...) — 반복 섹션의 항목 속성이 바뀔 때.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('반복 섹션')
        .appendField('section')
        .appendField(new Blockly.FieldTextInput('inventory'), 'SECTION')
        .appendField('attr')
        .appendField(new Blockly.FieldTextInput('qty'), 'ATTR');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setHatHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const section = String(b.getFieldValue('SECTION') ?? '').trim() || 'section';
      const attr = String(b.getFieldValue('ATTR') ?? '').trim() || 'attr';
      const body = ctx.statementToCode(block, 'CHILDREN');
      const evt = `change:repeating_${escapeJSString(section)}:${escapeJSString(attr)}`;
      return `on('${evt}', ${wrapArrowBody(ctx, body)});\n`;
    },
  },

  // 4) on remove:repeating_S -----------------------------------------------
  {
    type: 'r20_on_repeating_remove',
    shape: 'hat',
    category: SHEET_WORKER,
    label: '반복 영역의 한 줄이 지워졌을 때',
    tooltip: 'on("remove:repeating_S", ...) — 반복 섹션의 행이 삭제될 때.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('반복 영역의 한 줄이 지워졌을 때')
        .appendField('section')
        .appendField(new Blockly.FieldTextInput('inventory'), 'SECTION');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setHatHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const section = String(b.getFieldValue('SECTION') ?? '').trim() || 'section';
      const body = ctx.statementToCode(block, 'CHILDREN');
      const evt = `remove:repeating_${escapeJSString(section)}`;
      return `on('${evt}', ${wrapArrowBody(ctx, body)});\n`;
    },
  },

  // 5) on clicked:NAME ------------------------------------------------------
  {
    type: 'r20_on_button_click',
    shape: 'hat',
    category: SHEET_WORKER,
    label: '버튼을 눌렀을 때',
    tooltip: 'on("clicked:NAME", ...) — 액션 버튼 클릭 시.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('버튼을 눌렀을 때')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('act'), 'NAME');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setHatHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'act';
      const body = ctx.statementToCode(block, 'CHILDREN');
      return `on('clicked:${escapeJSString(name)}', ${wrapArrowBody(ctx, body)});\n`;
    },
  },

  // ========================================================================
  // C blocks ×5
  // ========================================================================

  // 6) if -------------------------------------------------------------------
  {
    type: 'r20_worker_if',
    shape: 'c',
    category: SHEET_WORKER,
    label: '만약 ... 이라면',
    tooltip: 'if (CONDITION) { ... } — sheet worker JS 안의 조건 분기.',
    init: mkInit((b) => {
      b.appendValueInput('CONDITION').setCheck(T_BOOL).appendField('만약');
      b.appendStatementInput('CHILDREN').setCheck(null).appendField('이면');
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const cond = ctx.valueToCode(block, 'CONDITION', ORDER.NONE) || 'false';
      const body = ctx.statementToCode(block, 'CHILDREN');
      return `if (${cond}) ${wrapBraceBody(ctx, body)}\n`;
    },
  },

  // 7) for count ------------------------------------------------------------
  {
    type: 'r20_worker_for_count',
    shape: 'c',
    category: SHEET_WORKER,
    label: '... 번 반복하기',
    tooltip: 'for (let i=0; i<COUNT; i++) { ... } — 횟수 반복 루프.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('변수')
        .appendField(new Blockly.FieldTextInput('i'), 'VAR');
      b.appendValueInput('COUNT').setCheck(T_NUM).appendField('을');
      b.appendStatementInput('CHILDREN').setCheck(null).appendField('번 반복');
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const varName = String(b.getFieldValue('VAR') ?? '').trim() || 'i';
      const count = ctx.valueToCode(block, 'COUNT', ORDER.NONE) || '0';
      const body = ctx.statementToCode(block, 'CHILDREN');
      return `for (let ${varName} = 0; ${varName} < ${count}; ${varName}++) ${wrapBraceBody(ctx, body)}\n`;
    },
  },

  // 8) getSectionIDs --------------------------------------------------------
  {
    type: 'r20_get_section_ids',
    shape: 'c',
    category: SHEET_WORKER,
    label: '반복 영역 줄 목록 가져오기',
    tooltip: 'getSectionIDs("repeating_S", (ids) => { const VAR = ids; ... })',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('반복 영역 줄 목록')
        .appendField('section')
        .appendField(new Blockly.FieldTextInput('inventory'), 'SECTION')
        .appendField('을')
        .appendField(new Blockly.FieldTextInput('ids'), 'VAR')
        .appendField('로');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const section = String(b.getFieldValue('SECTION') ?? '').trim() || 'section';
      const varName = String(b.getFieldValue('VAR') ?? '').trim() || 'ids';
      const body = ctx.statementToCode(block, 'CHILDREN');
      const inner = `const ${varName} = ids;\n${trimBody(body)}`;
      return `getSectionIDs('repeating_${escapeJSString(section)}', (ids) => {\n${ctx.indent(inner)}\n});\n`;
    },
  },

  // 9) forEach over ids -----------------------------------------------------
  {
    type: 'r20_for_each_id',
    shape: 'c',
    category: SHEET_WORKER,
    label: '각 줄마다 반복하기',
    tooltip: 'IDS.forEach((VAR) => { ... }) — 반복 섹션 ID 배열 순회.',
    init: mkInit((b) => {
      b.appendValueInput('IDS').setCheck(null).appendField('ids');
      b.appendDummyInput()
        .appendField('각각을')
        .appendField(new Blockly.FieldTextInput('id'), 'VAR')
        .appendField('로');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const ids = ctx.valueToCode(block, 'IDS', ORDER.NONE) || '[]';
      const varName = String(b.getFieldValue('VAR') ?? '').trim() || 'id';
      const body = ctx.statementToCode(block, 'CHILDREN');
      return `${ids}.forEach((${varName}) => ${wrapBraceBody(ctx, body)});\n`;
    },
  },

  // 10) getAttrs ------------------------------------------------------------
  {
    type: 'r20_get_attrs',
    shape: 'c',
    category: SHEET_WORKER,
    label: '시트 값들 가져오기',
    tooltip: 'getAttrs([...], (v) => { ... }) — 여러 속성 값을 콜백으로 읽음.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('hp, max_hp'), 'ATTRS')
        .appendField('가져오기');
      b.appendStatementInput('CHILDREN').setCheck(null);
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const list = attrListLiteral(String(b.getFieldValue('ATTRS') ?? ''));
      const body = ctx.statementToCode(block, 'CHILDREN');
      return `getAttrs(${list}, (v) => ${wrapBraceBody(ctx, body)});\n`;
    },
  },

  // ========================================================================
  // Stack blocks ×8
  // ========================================================================

  // 11) setAttrs single -----------------------------------------------------
  {
    type: 'r20_set_attrs',
    shape: 'stack',
    category: SHEET_WORKER,
    label: '시트 값 바꾸기',
    tooltip: 'setAttrs({ NAME: VALUE }) — 단일 속성 갱신.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('hp'), 'NAME')
        .appendField('을');
      b.appendValueInput('VALUE').setCheck(null).appendField('로 설정');
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'attr';
      const value = ctx.valueToCode(block, 'VALUE', ORDER.NONE) || '0';
      return `setAttrs({ '${escapeJSString(name)}': ${value} });\n`;
    },
  },

  // 12) setAttrs 3-pair -----------------------------------------------------
  {
    type: 'r20_set_attrs_pair',
    shape: 'stack',
    category: SHEET_WORKER,
    label: '시트 값 여러 개 바꾸기',
    tooltip: 'setAttrs({ k1: v1, k2: v2, k3: v3 }) — 최대 3개 동시 설정 (빈 키 생략).',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('시트 값 바꾸기')
        .appendField('key1')
        .appendField(new Blockly.FieldTextInput(''), 'KEY1');
      b.appendValueInput('VAL1').setCheck(null).appendField('val1');
      b.appendDummyInput()
        .appendField('key2')
        .appendField(new Blockly.FieldTextInput(''), 'KEY2');
      b.appendValueInput('VAL2').setCheck(null).appendField('val2');
      b.appendDummyInput()
        .appendField('key3')
        .appendField(new Blockly.FieldTextInput(''), 'KEY3');
      b.appendValueInput('VAL3').setCheck(null).appendField('val3');
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const pairs: string[] = [];
      for (const idx of ['1', '2', '3']) {
        const key = String(b.getFieldValue(`KEY${idx}`) ?? '').trim();
        if (!key) continue;
        const val = ctx.valueToCode(block, `VAL${idx}`, ORDER.NONE) || '0';
        pairs.push(`'${escapeJSString(key)}': ${val}`);
      }
      if (pairs.length === 0) return `setAttrs({});\n`;
      return `setAttrs({ ${pairs.join(', ')} });\n`;
    },
  },

  // 13) generateRowID -------------------------------------------------------
  {
    type: 'r20_generate_row_id',
    shape: 'stack',
    category: SHEET_WORKER,
    label: '새 줄 만들기 (ID)',
    tooltip: 'const VAR = generateRowID(); — 반복 섹션에 새 행 추가 시 사용.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('새 줄 ID 를')
        .appendField(new Blockly.FieldTextInput('newId'), 'VAR')
        .appendField('로 생성');
      setStackHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const varName = String(b.getFieldValue('VAR') ?? '').trim() || 'newId';
      return `const ${varName} = generateRowID();\n`;
    },
  },

  // 14) removeRepeatingRow --------------------------------------------------
  {
    type: 'r20_remove_repeating_row',
    shape: 'stack',
    category: SHEET_WORKER,
    label: '반복 영역의 줄 지우기',
    tooltip: 'removeRepeatingRow("repeating_S_id") — 반복 섹션의 행 1개 제거.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('반복 섹션')
        .appendField('section')
        .appendField(new Blockly.FieldTextInput('inventory'), 'SECTION')
        .appendField('의');
      b.appendValueInput('ROW_ID').setCheck(null).appendField('행 id');
      b.appendDummyInput().appendField('삭제');
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const section = String(b.getFieldValue('SECTION') ?? '').trim() || 'section';
      const id = ctx.valueToCode(block, 'ROW_ID', ORDER.NONE) || `''`;
      return `removeRepeatingRow('repeating_${escapeJSString(section)}_' + ${id});\n`;
    },
  },

  // 15) var assign (reassign) ----------------------------------------------
  {
    type: 'r20_worker_var_set',
    shape: 'stack',
    category: SHEET_WORKER,
    label: '변수 값 바꾸기',
    tooltip: 'NAME = VALUE; — 이미 선언된 변수에 새 값.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('변수')
        .appendField(new Blockly.FieldTextInput('x'), 'VAR')
        .appendField('=');
      b.appendValueInput('VALUE').setCheck(null);
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const varName = String(b.getFieldValue('VAR') ?? '').trim() || 'x';
      const value = ctx.valueToCode(block, 'VALUE', ORDER.NONE) || '0';
      return `${varName} = ${value};\n`;
    },
  },

  // 16) let declare ---------------------------------------------------------
  {
    type: 'r20_worker_var_let',
    shape: 'stack',
    category: SHEET_WORKER,
    label: '변수 만들기',
    tooltip: 'let NAME = VALUE; — 새 지역 변수 선언.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('변수 만들기')
        .appendField(new Blockly.FieldTextInput('x'), 'VAR')
        .appendField('=');
      b.appendValueInput('VALUE').setCheck(null);
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const varName = String(b.getFieldValue('VAR') ?? '').trim() || 'x';
      const value = ctx.valueToCode(block, 'VALUE', ORDER.NONE) || '0';
      return `let ${varName} = ${value};\n`;
    },
  },

  // 17) console.log ---------------------------------------------------------
  {
    type: 'r20_worker_console_log',
    shape: 'stack',
    category: SHEET_WORKER,
    label: '콘솔에 출력하기',
    tooltip: 'console.log(VALUE); — 디버그 출력.',
    init: mkInit((b) => {
      b.appendValueInput('VALUE').setCheck(null).appendField('콘솔에 출력');
      setStackHooks(b);
    }),
    generator: (block, ctx) => {
      const value = ctx.valueToCode(block, 'VALUE', ORDER.NONE) || `''`;
      return `console.log(${value});\n`;
    },
  },

  // 18) return (cap) --------------------------------------------------------
  {
    type: 'r20_worker_return',
    shape: 'cap',
    category: SHEET_WORKER,
    label: '값 돌려주기',
    tooltip: 'return VALUE; — 핸들러 조기 종료.',
    init: mkInit((b) => {
      b.appendValueInput('VALUE').setCheck(null).appendField('반환');
      setCapHooks(b);
    }),
    generator: (block, ctx) => {
      const value = ctx.valueToCode(block, 'VALUE', ORDER.NONE);
      if (!value) return `return;\n`;
      return `return ${value};\n`;
    },
  },

  // ========================================================================
  // Reporter blocks ×7
  // ========================================================================

  // 19) v.NAME reference ----------------------------------------------------
  {
    type: 'r20_worker_v_ref',
    shape: 'reporter',
    category: SHEET_WORKER,
    label: '시트 값',
    tooltip: 'v.NAME — getAttrs 콜백 안에서 받은 속성 값.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('v.')
        .appendField(new Blockly.FieldTextInput('hp'), 'NAME');
      b.setOutput(true, [T_NUM, T_STR]);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'attr';
      return [`v.${name}`, ORDER.ATOMIC];
    },
  },

  // 20) v.NAME_max reference ------------------------------------------------
  {
    type: 'r20_worker_v_max_ref',
    shape: 'reporter',
    category: SHEET_WORKER,
    label: '시트 값의 최댓값',
    tooltip: 'v.NAME_max — 속성의 최댓값 (auto-pair).',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('v.')
        .appendField(new Blockly.FieldTextInput('hp'), 'NAME')
        .appendField('_max');
      b.setOutput(true, [T_NUM, T_STR]);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'attr';
      return [`v.${name}_max`, ORDER.ATOMIC];
    },
  },

  // 21) let variable reference ---------------------------------------------
  {
    type: 'r20_worker_let_ref',
    shape: 'reporter',
    category: SHEET_WORKER,
    label: '변수 값',
    tooltip: 'NAME — 지역 변수 참조 (let/const 로 선언된 것).',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField(new Blockly.FieldTextInput('x'), 'NAME');
      b.setOutput(true, null);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'x';
      return [`${name}`, ORDER.ATOMIC];
    },
  },

  // 22) arithmetic (worker context) -----------------------------------------
  {
    type: 'r20_worker_arith',
    shape: 'reporter',
    category: SHEET_WORKER,
    label: '계산하기',
    tooltip: '(LHS OP RHS) — sheet worker JS 안의 산술 연산.',
    init: mkInit((b) => {
      b.appendValueInput('LHS').setCheck([T_NUM, T_STR]);
      b.appendDummyInput().appendField(new Blockly.FieldDropdown(ARITH_OPS), 'OP');
      b.appendValueInput('RHS').setCheck([T_NUM, T_STR]);
      b.setOutput(true, T_NUM);
      b.setInputsInline(true);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const lhs = ctx.valueToCode(block, 'LHS', ORDER.NONE) || '0';
      const rhs = ctx.valueToCode(block, 'RHS', ORDER.NONE) || '0';
      const op = pickOp(String(b.getFieldValue('OP') ?? ''), ARITH_OPS, '+');
      return [`(${lhs} ${op} ${rhs})`, ORDER.ATOMIC];
    },
  },

  // 23) comparison (worker context) -----------------------------------------
  {
    type: 'r20_worker_cmp',
    shape: 'boolean',
    category: SHEET_WORKER,
    label: '비교하기',
    tooltip: '(LHS OP RHS) — sheet worker JS 안의 비교 연산.',
    init: mkInit((b) => {
      b.appendValueInput('LHS').setCheck(null);
      b.appendDummyInput().appendField(new Blockly.FieldDropdown(CMP_OPS), 'OP');
      b.appendValueInput('RHS').setCheck(null);
      b.setOutput(true, T_BOOL);
      b.setInputsInline(true);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const lhs = ctx.valueToCode(block, 'LHS', ORDER.NONE) || '0';
      const rhs = ctx.valueToCode(block, 'RHS', ORDER.NONE) || '0';
      const op = pickOp(String(b.getFieldValue('OP') ?? ''), CMP_OPS, '===');
      return [`(${lhs} ${op} ${rhs})`, ORDER.ATOMIC];
    },
  },

  // 24) logical (worker context) --------------------------------------------
  {
    type: 'r20_worker_logic',
    shape: 'boolean',
    category: SHEET_WORKER,
    label: '그리고 / 또는',
    tooltip: '(LHS && RHS) 또는 (LHS || RHS) — sheet worker 의 논리 결합.',
    init: mkInit((b) => {
      b.appendValueInput('LHS').setCheck(T_BOOL);
      b.appendDummyInput().appendField(new Blockly.FieldDropdown(LOGIC_OPS), 'OP');
      b.appendValueInput('RHS').setCheck(T_BOOL);
      b.setOutput(true, T_BOOL);
      b.setInputsInline(true);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const lhs = ctx.valueToCode(block, 'LHS', ORDER.NONE) || 'false';
      const rhs = ctx.valueToCode(block, 'RHS', ORDER.NONE) || 'false';
      const op = pickOp(String(b.getFieldValue('OP') ?? ''), LOGIC_OPS, '&&');
      return [`(${lhs} ${op} ${rhs})`, ORDER.ATOMIC];
    },
  },

  // 25) getTranslationByKey -------------------------------------------------
  //
  // Stage 22 §2 — LANG 필드 추가 (optional).
  //   - LANG 비면 (`''`) `getTranslationByKey('KEY')` emit (현재 언어).
  //   - LANG 채우면 `getTranslationByLang('LANG', 'KEY')` emit.
  // roll20-sheet-builder 1부 등 LANG 비어 있는 케이스는 기존 출력 유지.
  {
    type: 'r20_get_translation',
    shape: 'reporter',
    category: SHEET_WORKER,
    label: '번역 가져오기',
    tooltip:
      "getTranslationByKey('KEY') — 다국어 키의 현재 언어 텍스트. LANG 채우면 getTranslationByLang(LANG, KEY).",
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역')
        .appendField(new Blockly.FieldTextInput('key'), 'KEY')
        .appendField('언어')
        .appendField(new Blockly.FieldTextInput(''), 'LANG');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = String(b.getFieldValue('KEY') ?? '').trim() || 'key';
      const lang = String(b.getFieldValue('LANG') ?? '').trim();
      if (lang) {
        return [
          `getTranslationByLang('${escapeJSString(lang)}', '${escapeJSString(key)}')`,
          ORDER.ATOMIC,
        ];
      }
      return [`getTranslationByKey('${escapeJSString(key)}')`, ORDER.ATOMIC];
    },
  },

  // 26) getCompendiumPage / getCompendiumEntries ----------------------------
  //
  // Stage 22 §1 — Roll20 compendium 조회 (PF2/DW/Mothership/SW 등 시스템).
  //   - SUBPATH 비면 `getCompendiumPage('PATH')` (page 전체 객체).
  //   - SUBPATH 채우면 `getCompendiumEntries('PATH', 'SUBPATH')` (특정 필드).
  // PATH / SUBPATH 모두 사용자 입력 (시스템 specific 토큰 0 — generic emit).
  {
    type: 'r20_get_compendium',
    shape: 'reporter',
    category: SHEET_WORKER,
    label: '컴펜디움 가져오기',
    tooltip:
      "getCompendiumPage('PATH') — compendium 페이지 객체. SUBPATH 채우면 getCompendiumEntries('PATH','SUBPATH').",
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('컴펜디움')
        .appendField(new Blockly.FieldTextInput('Spells/Fireball'), 'PATH')
        .appendField('하위')
        .appendField(new Blockly.FieldTextInput(''), 'SUBPATH');
      b.setOutput(true, null);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const path = String(b.getFieldValue('PATH') ?? '').trim();
      const subpath = String(b.getFieldValue('SUBPATH') ?? '').trim();
      if (!path) return [`getCompendiumPage('')`, ORDER.ATOMIC];
      if (subpath) {
        return [
          `getCompendiumEntries('${escapeJSString(path)}', '${escapeJSString(subpath)}')`,
          ORDER.ATOMIC,
        ];
      }
      return [`getCompendiumPage('${escapeJSString(path)}')`, ORDER.ATOMIC];
    },
    inspectorSchema: [
      {
        name: 'PATH',
        label: '컴펜디움 경로',
        kind: 'text',
        placeholder: 'Spells/Fireball',
        description: 'compendium 페이지 경로 (시스템 별 — PF2/DW/Mothership/SW 등).',
      },
      {
        name: 'SUBPATH',
        label: '하위 필드 (옵션)',
        kind: 'text',
        placeholder: 'description',
        description: '비면 page 객체 반환. 채우면 해당 필드만 entries 반환.',
      },
    ],
  },
];

/**
 * Stage A-6 — Sheet Worker 25 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerSheetWorkerBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of SHEET_WORKER_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-6 의 generator 매핑 — emit-worker lookup. */
export const SHEET_WORKER_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  SHEET_WORKER_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

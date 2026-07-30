/**
 * HIGH 우선순위 신규 블록 5종 단위 테스트 (Stage 22).
 *
 * Anchor: docs/spec/23_high_priority_blocks.md.
 *
 * 본 테스트는 Blockly 의 일부 API (FieldDropdown / FieldTextInput / FieldNumber
 * / Block) 만 mock 해서 block 정의 + generator 동작을 검증한다.
 *
 * 검증 대상 5 블록:
 *   1) r20_get_compendium (sheet_worker)
 *   2) r20_get_translation (sheet_worker) — LANG 옵션 추가
 *   3) r20_css_var_decl (css)
 *   4) r20_value_switch_panel + r20_value_case (composite)
 *   5) r20_attr_ref SCOPE 옵션 (expression)
 *
 * 시스템 specific 토큰 0.
 */

// ---------- Blockly mock --------------------------------------------------
//
// require('blockly') 가 resolve 되도록 가짜 모듈 등록. 본 테스트가 사용하는
// API:
//   - Blockly.FieldTextInput
//   - Blockly.FieldDropdown
//   - Blockly.FieldNumber
//   - Blockly.Blocks (object — registerXxxBlocks 가 채움)
//   - Blockly.Block (type 만 사용)
//
// 모든 init / generator 가 호출 시 의존하는 method 는 mock Block 인스턴스에서
// 제공.

import { Module, createRequire } from 'node:module';

type AnyFn = (...args: unknown[]) => unknown;

class MockField {
  value: unknown;
  constructor(value: unknown) {
    this.value = value;
  }
}

class MockFieldTextInput extends MockField {}
class MockFieldDropdown extends MockField {
  options: Array<[string, string]>;
  constructor(options: Array<[string, string]>) {
    super(options.length > 0 ? options[0][1] : '');
    this.options = options;
  }
}
class MockFieldNumber extends MockField {}
class MockFieldVariable extends MockField {}
class MockFieldCheckbox extends MockField {}
class MockFieldLabelSerializable extends MockField {}
class MockFieldImage extends MockField {}

const BlocklyMock = {
  Blocks: {} as Record<string, { init: () => void }>,
  FieldTextInput: MockFieldTextInput,
  FieldDropdown: MockFieldDropdown,
  FieldNumber: MockFieldNumber,
  FieldVariable: MockFieldVariable,
  FieldCheckbox: MockFieldCheckbox,
  FieldLabelSerializable: MockFieldLabelSerializable,
  FieldImage: MockFieldImage,
  // Block class — generator 에서는 instance 가 아니라 type-only 로 사용 →
  // Object placeholder OK.
  Block: function () {} as unknown as AnyFn,
};

const origResolve = Module._resolveFilename as AnyFn;
(Module as unknown as { _resolveFilename: AnyFn })._resolveFilename = function (
  request: string,
  ...rest: unknown[]
) {
  if (request === 'blockly') {
    return '/__mock_blockly__';
  }
  return origResolve.call(this as unknown as object, request, ...rest);
};

const origLoad = (Module as unknown as { _load: AnyFn })._load;
(Module as unknown as { _load: AnyFn })._load = function (
  request: string,
  ...rest: unknown[]
) {
  if (request === 'blockly') {
    return BlocklyMock;
  }
  return origLoad.call(this as unknown as object, request, ...rest);
};

// dynamic import 도 같은 resolve hook 사용 → import * as Blockly from 'blockly'
// 가 BlocklyMock 객체를 namespace 로 반환 (esm interop).
//
// Note: node --experimental-strip-types 는 esm 처리 — Blockly 의 default
// export 는 BlocklyMock 그 자체로 wrap.

// ---------- 테스트 helpers --------------------------------------------------

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectEq<T>(actual: T, expected: T, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function expectContains(s: string, needle: string, msg: string): void {
  assert(s.includes(needle), `${msg} — "${needle}" not in: ${s}`);
}

interface FakeBlockInit {
  type: string;
  fields?: Record<string, unknown>;
  children?: Record<string, FakeBlock[]>;
  parent?: FakeBlock | null;
}

class FakeBlock {
  type: string;
  id: string;
  fields: Record<string, unknown>;
  children: Record<string, FakeBlock[]>;
  parent: FakeBlock | null;

  constructor(init: FakeBlockInit) {
    this.type = init.type;
    this.id = `fake-${Math.random().toString(36).slice(2, 8)}`;
    this.fields = init.fields ?? {};
    this.children = init.children ?? {};
    this.parent = init.parent ?? null;
  }

  getFieldValue(name: string): unknown {
    return this.fields[name];
  }

  getInputTargetBlock(name: string): FakeBlock | null {
    const arr = this.children[name];
    if (!arr || arr.length === 0) return null;
    // statement 시퀀스는 chain — 각 child 의 parent 지정 + next chain.
    for (let i = 0; i < arr.length; i++) {
      arr[i].parent = this;
      arr[i]._nextChain = arr[i + 1] ?? null;
    }
    return arr[0];
  }

  // chain pointer (only used after getInputTargetBlock).
  _nextChain: FakeBlock | null = null;

  getNextBlock(): FakeBlock | null {
    return this._nextChain;
  }

  getParent(): FakeBlock | null {
    return this.parent;
  }
}

interface FakeCtx {
  valueToCode: (block: unknown, name: string, order: number) => string;
  statementToCode: (block: unknown, name: string) => string;
  indent: (code: string, level?: number) => string;
  warn: (id: string, code: string, msg: string, severity: 'error' | 'warning' | 'info') => void;
  _warnings: Array<{ id: string; code: string; msg: string }>;
}

function makeCtx(
  valueMap: Record<string, string> = {},
  statementMap: Record<string, string> = {},
): FakeCtx {
  const warnings: FakeCtx['_warnings'] = [];
  return {
    valueToCode: (_b, name) => valueMap[name] ?? '',
    statementToCode: (b, name) => {
      const bb = b as FakeBlock;
      // composite parent 가 자식 r20_value_case 의 PANEL 을 statementToCode 로
      // 가져갈 때 — bb.children[name] 의 panel 시퀀스를 join.
      const arr = (bb.children?.[name] ?? []) as FakeBlock[];
      if (arr.length === 0) return statementMap[name] ?? '';
      // 자식이 r20_value_case 의 PANEL 인 경우, panel 내용은 fields 의 _panel
      // 키로 흉내내거나 panel block 의 _emit 콜백 사용.
      return arr.map((c) => (c.fields._emit ?? '<p>panel</p>') as string).join('\n');
    },
    indent: (code, _level = 1) => {
      if (!code) return '';
      return code
        .split('\n')
        .map((l) => (l.length ? `  ${l}` : l))
        .join('\n');
    },
    warn: (id, code, msg, _severity) => {
      warnings.push({ id, code, msg });
    },
    _warnings: warnings,
  };
}

// ---------- 블록 로드 -------------------------------------------------------

import { EXPRESSION_BLOCKS } from '../expression.ts';
import { SHEET_WORKER_BLOCKS } from '../sheet_worker.ts';
import { CSS_BLOCKS } from '../css.ts';
import { COMPOSITE_BLOCKS } from '../composite.ts';

function findBlock(arr: Array<{ type: string }>, type: string): {
  type: string;
  generator?: (b: unknown, ctx: unknown) => string | [string, number];
  init?: (b: unknown) => void;
  inspectorSchema?: Array<{ name: string }>;
} {
  const found = arr.find((d) => d.type === type);
  if (!found) throw new Error(`block type ${type} not found in array`);
  return found as ReturnType<typeof findBlock>;
}

// ---------- 1) r20_get_compendium -----------------------------------------

function testCompendiumBasicPath(): void {
  const def = findBlock(SHEET_WORKER_BLOCKS as Array<{ type: string }>, 'r20_get_compendium');
  assert(def.generator, 'r20_get_compendium has generator');
  const b = new FakeBlock({
    type: 'r20_get_compendium',
    fields: { PATH: 'Spells/Fireball', SUBPATH: '' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, `getCompendiumPage('Spells/Fireball')`, 'page emit');
}

function testCompendiumWithSubpath(): void {
  const def = findBlock(SHEET_WORKER_BLOCKS as Array<{ type: string }>, 'r20_get_compendium');
  const b = new FakeBlock({
    type: 'r20_get_compendium',
    fields: { PATH: 'Spells/Fireball', SUBPATH: 'description' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(
    code,
    `getCompendiumEntries('Spells/Fireball', 'description')`,
    'entries emit',
  );
}

function testCompendiumEmptyPath(): void {
  const def = findBlock(SHEET_WORKER_BLOCKS as Array<{ type: string }>, 'r20_get_compendium');
  const b = new FakeBlock({
    type: 'r20_get_compendium',
    fields: { PATH: '', SUBPATH: '' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, `getCompendiumPage('')`, 'empty path emit safe');
}

// ---------- 2) r20_get_translation ----------------------------------------

function testTranslationDefault(): void {
  const def = findBlock(SHEET_WORKER_BLOCKS as Array<{ type: string }>, 'r20_get_translation');
  const b = new FakeBlock({
    type: 'r20_get_translation',
    fields: { KEY: 'strength', LANG: '' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, `getTranslationByKey('strength')`, 'default emit');
}

function testTranslationWithLang(): void {
  const def = findBlock(SHEET_WORKER_BLOCKS as Array<{ type: string }>, 'r20_get_translation');
  const b = new FakeBlock({
    type: 'r20_get_translation',
    fields: { KEY: 'strength', LANG: 'ko' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, `getTranslationByLang('ko', 'strength')`, 'lang emit');
}

function testTranslationEscapesQuote(): void {
  const def = findBlock(SHEET_WORKER_BLOCKS as Array<{ type: string }>, 'r20_get_translation');
  const b = new FakeBlock({
    type: 'r20_get_translation',
    fields: { KEY: "a'b", LANG: '' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectContains(code, `a\\'b`, 'quote escaped');
}

// ---------- 3) r20_css_var_decl -------------------------------------------

function testCssVarDeclWithSlot(): void {
  const def = findBlock(CSS_BLOCKS as Array<{ type: string }>, 'r20_css_var_decl');
  const b = new FakeBlock({
    type: 'r20_css_var_decl',
    fields: { VAR_NAME: 'accent', VALUE_TEXT: '' },
  });
  const ctx = makeCtx({ VALUE: 'var(--primary)' });
  const out = def.generator!(b, ctx);
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, `--accent: var(--primary);`, 'slot used when provided');
}

function testCssVarDeclWithTextFallback(): void {
  const def = findBlock(CSS_BLOCKS as Array<{ type: string }>, 'r20_css_var_decl');
  const b = new FakeBlock({
    type: 'r20_css_var_decl',
    fields: { VAR_NAME: 'accent', VALUE_TEXT: '#ff0000' },
  });
  const ctx = makeCtx();
  const out = def.generator!(b, ctx);
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, `--accent: #ff0000;`, 'text fallback used when slot empty');
}

function testCssVarDeclStripsDashPrefix(): void {
  const def = findBlock(CSS_BLOCKS as Array<{ type: string }>, 'r20_css_var_decl');
  const b = new FakeBlock({
    type: 'r20_css_var_decl',
    fields: { VAR_NAME: '--accent', VALUE_TEXT: 'red' },
  });
  const ctx = makeCtx();
  const out = def.generator!(b, ctx);
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, `--accent: red;`, 'auto-strips -- prefix');
}

function testCssClassSelectorRestoresRoll20SheetPrefix(): void {
  const def = findBlock(CSS_BLOCKS as Array<{ type: string }>, 'r20_selector_class');
  const b = new FakeBlock({
    type: 'r20_selector_class',
    fields: { NAME: 'rolltemplate-aw' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '.sheet-rolltemplate-aw', 'Roll20 export class selector restores sheet- prefix');
}

function testCssClassSelectorDoesNotDoublePrefix(): void {
  const def = findBlock(CSS_BLOCKS as Array<{ type: string }>, 'r20_selector_class');
  const b = new FakeBlock({
    type: 'r20_selector_class',
    fields: { NAME: 'sheet-header' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '.sheet-header', 'already-prefixed class selector stays stable');
}

function testCssClassSelectorPreservesRoll20RuntimeClass(): void {
  const def = findBlock(CSS_BLOCKS as Array<{ type: string }>, 'r20_selector_class');
  const b = new FakeBlock({
    type: 'r20_selector_class',
    fields: { NAME: 'inlinerollresult' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '.inlinerollresult', 'Roll20 inline-roll runtime class stays unprefixed');
}

// ---------- 4) r20_value_switch_panel -------------------------------------

function testValueSwitchEmptyAttr(): void {
  const def = findBlock(
    COMPOSITE_BLOCKS as Array<{ type: string }>,
    'r20_value_switch_panel',
  );
  const b = new FakeBlock({
    type: 'r20_value_switch_panel',
    fields: { ATTR_NAME: '' },
  });
  const ctx = makeCtx();
  const out = def.generator!(b, ctx);
  expectEq(out as string, '', 'empty attr → no emit');
  assert(ctx._warnings.length === 1, 'warning emitted');
}

function testValueSwitchTwoCases(): void {
  const def = findBlock(
    COMPOSITE_BLOCKS as Array<{ type: string }>,
    'r20_value_switch_panel',
  );
  const case1 = new FakeBlock({
    type: 'r20_value_case',
    fields: { VALUE: 'pulp', _emit: '<p>pulp panel</p>' },
    children: { PANEL: [] },
  });
  const case2 = new FakeBlock({
    type: 'r20_value_case',
    fields: { VALUE: 'modern', _emit: '<p>modern panel</p>' },
    children: { PANEL: [] },
  });
  const b = new FakeBlock({
    type: 'r20_value_switch_panel',
    fields: { ATTR_NAME: 'era' },
    children: { CASES: [case1, case2] },
  });
  const ctx = makeCtx();
  const out = def.generator!(b, ctx);
  const code = (Array.isArray(out) ? out[0] : out) as string;
  expectContains(code, `class="sheet-era-switch"`, 'wrapper class');
  expectContains(code, `name="attr_era"`, 'radio name');
  expectContains(code, `value="pulp"`, 'case 1 value');
  expectContains(code, `value="modern"`, 'case 2 value');
  expectContains(code, `.sheet-era-panel { display: none; }`, 'default hidden css');
  expectContains(
    code,
    `.sheet-era-input[value="pulp"]:checked ~ .sheet-era-panel-pulp { display: block; }`,
    'pulp sibling rule',
  );
  expectContains(
    code,
    `.sheet-era-input[value="modern"]:checked ~ .sheet-era-panel-modern { display: block; }`,
    'modern sibling rule',
  );
}

function testValueSwitchPreservesCustomClasses(): void {
  const def = findBlock(
    COMPOSITE_BLOCKS as Array<{ type: string }>,
    'r20_value_switch_panel',
  );
  const child = new FakeBlock({
    type: 'r20_value_case',
    fields: { VALUE: 'pulp', CLASS: 'panel-highlight', _emit: '<p>pulp</p>' },
    children: { PANEL: [] },
  });
  const b = new FakeBlock({
    type: 'r20_value_switch_panel',
    fields: { ATTR_NAME: 'era', CLASS: 'switch-shell' },
    children: { CASES: [child] },
  });
  const out = def.generator!(b, makeCtx());
  const code = (Array.isArray(out) ? out[0] : out) as string;
  expectContains(code, 'class="sheet-era-switch sheet-switch-shell"', 'wrapper custom class');
  expectContains(
    code,
    'class="sheet-era-panel sheet-era-panel-pulp sheet-panel-highlight"',
    'panel custom class',
  );
}

function testValueSwitchDedupesDuplicateValues(): void {
  const def = findBlock(
    COMPOSITE_BLOCKS as Array<{ type: string }>,
    'r20_value_switch_panel',
  );
  const dup1 = new FakeBlock({
    type: 'r20_value_case',
    fields: { VALUE: 'a', _emit: '<p>a1</p>' },
  });
  const dup2 = new FakeBlock({
    type: 'r20_value_case',
    fields: { VALUE: 'a', _emit: '<p>a2</p>' },
  });
  const b = new FakeBlock({
    type: 'r20_value_switch_panel',
    fields: { ATTR_NAME: 'x' },
    children: { CASES: [dup1, dup2] },
  });
  const ctx = makeCtx();
  const out = def.generator!(b, ctx);
  const code = (Array.isArray(out) ? out[0] : out) as string;
  // 두 번 등장한 'a' 가 한 번만 → radio input + CSS rule + panel-class
  // 각각 1번. radio 만 카운팅 (`name="attr_x" value="a"`).
  const radioMatches = code.match(/name="attr_x" value="a"/g);
  expectEq(radioMatches?.length ?? 0, 1, 'duplicate value deduped — single radio');
  const panelClassMatches = code.match(/sheet-x-panel-a/g);
  // panel-class 는 `<div>` 의 두 번째 class + sibling selector → 2 회 등장.
  expectEq(panelClassMatches?.length ?? 0, 2, 'panel class appears in div + rule');
}

// ---------- 5) r20_attr_ref SCOPE -----------------------------------------

function testAttrRefSelfScope(): void {
  const def = findBlock(EXPRESSION_BLOCKS as Array<{ type: string }>, 'r20_attr_ref');
  const b = new FakeBlock({
    type: 'r20_attr_ref',
    fields: { SCOPE: 'self', NAME: 'hp' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '@{hp}', 'self scope @{ATTR}');
}

function testAttrRefSelectedScope(): void {
  const def = findBlock(EXPRESSION_BLOCKS as Array<{ type: string }>, 'r20_attr_ref');
  const b = new FakeBlock({
    type: 'r20_attr_ref',
    fields: { SCOPE: 'selected', NAME: 'hp' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '@{selected|hp}', 'selected scope');
}

function testAttrRefTargetScope(): void {
  const def = findBlock(EXPRESSION_BLOCKS as Array<{ type: string }>, 'r20_attr_ref');
  const b = new FakeBlock({
    type: 'r20_attr_ref',
    fields: { SCOPE: 'target', NAME: 'ac' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '@{target|ac}', 'target scope');
}

function testAttrRefCharacterIdScope(): void {
  const def = findBlock(EXPRESSION_BLOCKS as Array<{ type: string }>, 'r20_attr_ref');
  const b = new FakeBlock({
    type: 'r20_attr_ref',
    fields: { SCOPE: 'character_id', NAME: 'ignored' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '@{character_id}', 'character_id ignores NAME');
}

function testAttrRefBogusScopeFallback(): void {
  const def = findBlock(EXPRESSION_BLOCKS as Array<{ type: string }>, 'r20_attr_ref');
  const b = new FakeBlock({
    type: 'r20_attr_ref',
    fields: { SCOPE: 'bogus_scope', NAME: 'hp' },
  });
  const out = def.generator!(b, makeCtx());
  const code = Array.isArray(out) ? out[0] : out;
  expectEq(code, '@{hp}', 'invalid scope falls back to self');
}

// ---------- runner ---------------------------------------------------------

const tests: Array<[string, () => void]> = [
  ['compendium basic path', testCompendiumBasicPath],
  ['compendium with subpath', testCompendiumWithSubpath],
  ['compendium empty path', testCompendiumEmptyPath],
  ['translation default', testTranslationDefault],
  ['translation with lang', testTranslationWithLang],
  ['translation escapes quote', testTranslationEscapesQuote],
  ['css var decl with slot', testCssVarDeclWithSlot],
  ['css var decl with text fallback', testCssVarDeclWithTextFallback],
  ['css var decl strips dash prefix', testCssVarDeclStripsDashPrefix],
  ['css class selector restores Roll20 sheet prefix', testCssClassSelectorRestoresRoll20SheetPrefix],
  ['css class selector does not double prefix', testCssClassSelectorDoesNotDoublePrefix],
  ['css class selector preserves Roll20 runtime class', testCssClassSelectorPreservesRoll20RuntimeClass],
  ['value switch empty attr', testValueSwitchEmptyAttr],
  ['value switch two cases', testValueSwitchTwoCases],
  ['value switch preserves custom classes', testValueSwitchPreservesCustomClasses],
  ['value switch dedupes duplicate values', testValueSwitchDedupesDuplicateValues],
  ['attr ref self scope', testAttrRefSelfScope],
  ['attr ref selected scope', testAttrRefSelectedScope],
  ['attr ref target scope', testAttrRefTargetScope],
  ['attr ref character_id scope', testAttrRefCharacterIdScope],
  ['attr ref bogus scope fallback', testAttrRefBogusScopeFallback],
];

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`  ok    ${name}`);
    passed++;
  } catch (e) {
    console.error(`  FAIL  ${name}: ${(e as Error).message}`);
  }
}
console.log(`\n${passed}/${tests.length} passed`);
if (passed !== tests.length) {
  throw new Error(`${tests.length - passed} test(s) failed`);
}

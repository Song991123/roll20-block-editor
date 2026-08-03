/**
 * Sheet worker JS 파서 (lib/import/script_parser.ts) 의 unit smoke.
 *
 * 외부 의존 0 — `node --loader ts-node/esm ...` 또는 vitest 로 실행 가능.
 * 본 파일은 `basic.test.ts` 와 같은 in-file runner (try/catch + console.log).
 *
 * 시스템 specific 토큰 0 — generic JS 패턴만 검증.
 */

import { parseSheetWorkerScript } from '../script_parser';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function testEmpty(): void {
  const r = parseSheetWorkerScript('');
  assert(r.blocks.length === 0, 'empty input → 0 blocks');
  assert(r.stats.matched === 0, 'matched 0');
  assert(r.stats.unparsed === 0, 'unparsed 0');
}

function testOnAttrChange(): void {
  const js = `on('change:hp', function() { setAttrs({ hp: 10 }); });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks.length === 1, 'one top-level block');
  assert(r.blocks[0].blockType === 'r20_on_attr_change', 'hat type');
  assert(r.blocks[0].fields.NAME === 'hp', `NAME=hp got ${r.blocks[0].fields.NAME}`);
  const children = r.blocks[0].children.CHILDREN || [];
  assert(children.length === 1, 'one inner child');
  assert(children[0].blockType === 'r20_set_attrs', 'set_attrs inner');
  assert(children[0].fields.NAME === 'hp', 'set_attrs NAME=hp');
}

function testOnSheetOpened(): void {
  const js = `on("sheet:opened", () => { setAttrs({ x: 1 }); });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_on_sheet_opened', 'sheet_opened hat');
}

function testOnRepeatingChange(): void {
  const js = `on("change:repeating_inv:qty", function() {});`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_on_repeating_change', 'repeating_change');
  assert(r.blocks[0].fields.SECTION === 'inv', 'SECTION=inv');
  assert(r.blocks[0].fields.ATTR === 'qty', 'ATTR=qty');
}

function testOnRepeatingSectionChange(): void {
  const js = `on("change:repeating_inv", function() {});`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_on_repeating_change', 'whole repeating section change');
  assert(r.blocks[0].fields.SECTION === 'inv', 'SECTION=inv');
  assert(r.blocks[0].fields.ATTR === '', 'blank ATTR means any field in the section');
}

function testOnRepeatingReorder(): void {
  const js = `on("change:_reporder:inv", function() {});`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_on_repeating_reorder', 'repeating reorder');
  assert(r.blocks[0].fields.SECTION === 'inv', 'SECTION=inv');
  assert(r.stats.unparsed === 0, 'repeating reorder stays structured');
}

function testOnRepeatingRemove(): void {
  const js = `on("remove:repeating_inv", () => {});`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_on_repeating_remove', 'repeating_remove');
  assert(r.blocks[0].fields.SECTION === 'inv', 'SECTION=inv');
}

function testOnClicked(): void {
  const js = `on('clicked:rollAttack', function() {});`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_on_button_click', 'button_click hat');
  assert(r.blocks[0].fields.NAME === 'rollAttack', 'NAME=rollAttack');
}

function testSetAttrsSingle(): void {
  const js = `setAttrs({ hp: 10 });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_set_attrs', 'set_attrs');
  assert(r.blocks[0].fields.NAME === 'hp', 'NAME');
}

function testSetAttrsMulti(): void {
  const js = `setAttrs({ hp: 10, mp: 5, ac: 12 });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_set_attrs_pair', 'set_attrs_pair');
  assert(r.blocks[0].fields.KEY1 === 'hp', 'KEY1');
  assert(r.blocks[0].fields.KEY2 === 'mp', 'KEY2');
  assert(r.blocks[0].fields.KEY3 === 'ac', 'KEY3');
}

function testSetAttrsOverflowPreservesRaw(): void {
  const js = `setAttrs({ hp: 10, mp: 5, ac: 12, init: 3 });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_raw_worker', 'overflow uses raw worker boundary');
  assert(r.blocks[0].fields.JS.includes('init: 3'), 'overflow property is preserved');
  assert(r.stats.unparsed === 1, 'overflow is counted as unparsed');
}

function testSetAttrsSilentOption(): void {
  const js = `setAttrs({ hp: 10 }, { silent: true });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_set_attrs', 'silent option stays structured');
  assert(r.blocks[0].fields.SILENT === 'TRUE', 'silent option is preserved');
  assert(r.stats.unparsed === 0, 'silent option is fully parsed');
}

function testSetAttrsCallback(): void {
  const js = `setAttrs({ hp: 10 }, { silent: true }, function() { console.log('done'); });`;
  const r = parseSheetWorkerScript(js);
  const setter = r.blocks[0];
  assert(setter.blockType === 'r20_set_attrs', 'setAttrs callback stays structured');
  assert(setter.fields.SILENT === 'TRUE', 'callback keeps silent option');
  assert(setter.children.CALLBACK?.[0]?.blockType === 'r20_worker_console_log', 'callback body is structured');
  assert(r.stats.unparsed === 0, 'callback body is fully parsed');
}

function testSetAttrsCallbackWithoutOptions(): void {
  const js = `setAttrs({ hp: 10 }, function() { console.log('done'); });`;
  const r = parseSheetWorkerScript(js);
  const setter = r.blocks[0];
  assert(setter.blockType === 'r20_set_attrs', 'two-argument callback stays structured');
  assert(setter.fields.SILENT === 'FALSE', 'callback without options is not silent');
  assert(setter.children.CALLBACK?.[0]?.blockType === 'r20_worker_console_log', 'two-argument callback body');
  assert(r.stats.unparsed === 0, 'two-argument callback is fully parsed');
}

function testGetAttrs(): void {
  const js = `getAttrs(['hp','max_hp'], function(v) { setAttrs({ hp: 5 }); });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_get_attrs', 'get_attrs');
  assert(r.blocks[0].fields.ATTRS === 'hp, max_hp', `ATTRS got "${r.blocks[0].fields.ATTRS}"`);
  const inner = r.blocks[0].children.CHILDREN || [];
  assert(inner[0].blockType === 'r20_set_attrs', 'inner set_attrs');
}

function testGetSectionIDs(): void {
  const js = `getSectionIDs('repeating_inv', function(ids) { setAttrs({ x: 1 }); });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_get_section_ids', 'get_section_ids');
  assert(r.blocks[0].fields.SECTION === 'inv', 'SECTION');
  assert(r.blocks[0].fields.VAR === 'ids', 'VAR=ids');
}

function testSetSectionOrder(): void {
  const js = `setSectionOrder('items', ids);`;
  const r = parseSheetWorkerScript(js);
  const block = r.blocks[0];
  assert(block.blockType === 'r20_set_section_order', 'set_section_order');
  assert(block.fields.SECTION === 'items', 'SECTION=items');
  assert(Boolean(block.valueInputs?.ORDER), 'ORDER expression');
  assert(r.stats.unparsed === 0, 'setSectionOrder is fully parsed');
}

function testSetSectionOrderCallback(): void {
  const js = `setSectionOrder("items", ids.slice().reverse(), function() { console.log('done'); });`;
  const r = parseSheetWorkerScript(js);
  const block = r.blocks[0];
  assert(block.blockType === 'r20_set_section_order', 'callback set_section_order');
  assert(block.fields.SECTION === 'items', 'callback SECTION=items');
  assert(block.children.CALLBACK?.[0]?.blockType === 'r20_worker_console_log', 'callback body');
  assert(r.stats.unparsed === 0, 'callback setSectionOrder is fully parsed');
}

function testTranslationLanguage(): void {
  const js = `setAttrs({ language: getTranslationLanguage() });`;
  const r = parseSheetWorkerScript(js);
  const setter = r.blocks[0];
  assert(setter.blockType === 'r20_set_attrs', 'translation language setter');
  assert(
    setter.valueInputs?.VALUE.blockType === 'r20_get_translation_language',
    'getTranslationLanguage reporter',
  );
  assert(r.stats.unparsed === 0, 'getTranslationLanguage is fully parsed');
}

function testForEach(): void {
  const js = `myIds.forEach((id) => { setAttrs({ hp: 0 }); });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_for_each_id', 'forEach');
  assert(r.blocks[0].fields.VAR === 'id', 'VAR=id');
}

function testIfStatement(): void {
  const js = `if (hp < 0) { setAttrs({ hp: 0 }); }`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_if', 'if block');
  const inner = r.blocks[0].children.CHILDREN || [];
  assert(inner.length === 1, 'one inner stmt');
  assert(inner[0].blockType === 'r20_set_attrs', 'inner set_attrs');
}

function testIfElseStatement(): void {
  const js = `if (hp < 0) { setAttrs({ hp: 0 }); } else { return; }`;
  const r = parseSheetWorkerScript(js);
  const root = r.blocks[0];
  assert(root.blockType === 'r20_worker_if', 'if/else block');
  const alternate = root.children.ELSE || [];
  assert(alternate.length === 1, 'one else statement');
  assert(alternate[0].blockType === 'r20_worker_return', 'else return');

  const chained = parseSheetWorkerScript(
    `if (hp < 0) { setAttrs({ hp: 0 }); } else if (hp === 0) { return; }`,
  ).blocks[0];
  const nested = chained.children.ELSE || [];
  assert(nested.length === 1, 'one else-if block');
  assert(nested[0].blockType === 'r20_worker_if', 'else-if stays structured');
}

function testForCount(): void {
  const js = `for (let i = 0; i < 10; i++) { setAttrs({ x: 1 }); }`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_for_count', 'for_count');
  assert(r.blocks[0].fields.VAR === 'i', 'VAR=i');
}

function testVarLet(): void {
  const js = `let x = 5;`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_var_let', 'var_let');
  assert(r.blocks[0].fields.VAR === 'x', 'VAR=x');
  assert(r.blocks[0].fields.KIND === 'let', 'KIND=let');
}

function testVarAlias(): void {
  // var 는 같은 UI 블록을 사용하되 선언 종류를 보존한다.
  const js = `var ids = ['a'];`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_var_let', 'var → var_let alias');
  assert(r.blocks[0].fields.KIND === 'var', 'KIND=var');
}

function testConstDeclaration(): void {
  const js = `const total = 5;`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_var_let', 'const uses declaration block');
  assert(r.blocks[0].fields.KIND === 'const', 'KIND=const');
}

function testReturn(): void {
  const js = `return;`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_return', 'return');
}

function testGenerateRowID(): void {
  const js = `const newId = generateRowID();`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_generate_row_id', 'generateRowID');
  assert(r.blocks[0].fields.VAR === 'newId', 'VAR=newId');
}

function testRemoveRepeatingRow(): void {
  const js = `removeRepeatingRow('repeating_inv_' + id);`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_remove_repeating_row', 'removeRepeatingRow');
  assert(r.blocks[0].fields.SECTION === 'inv', 'SECTION=inv');
}

function testConsoleLog(): void {
  const js = `console.log("debug msg");`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_console_log', 'console.log');
}

function testNestedComplex(): void {
  const js = `
    on('change:hp', function() {
      getAttrs(['hp','max_hp'], function(v) {
        if (v.hp > v.max_hp) {
          setAttrs({ hp: v.hp_max });
        }
      });
    });
  `;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks.length === 1, 'one top hat');
  assert(r.blocks[0].blockType === 'r20_on_attr_change', 'hat');
  const lvl1 = r.blocks[0].children.CHILDREN || [];
  assert(lvl1[0].blockType === 'r20_get_attrs', 'level1 get_attrs');
  const lvl2 = lvl1[0].children.CHILDREN || [];
  assert(lvl2[0].blockType === 'r20_worker_if', 'level2 if');
  const lvl3 = lvl2[0].children.CHILDREN || [];
  assert(lvl3[0].blockType === 'r20_set_attrs', 'level3 set_attrs');
  // v.NAME 인식.
  const setBlk = lvl3[0];
  assert(setBlk.valueInputs?.VALUE.blockType === 'r20_worker_v_max_ref', 'v.NAME_max recognized');
}

function testWorkerBinaryExpressions(): void {
  const js = `if (v.hp > 0 && v.mp > 0) {
    setAttrs({ total: v.hp + (v.mp * 2) });
  }`;
  const r = parseSheetWorkerScript(js);
  const root = r.blocks[0];
  assert(root.blockType === 'r20_worker_if', 'if root');

  const condition = root.valueInputs?.CONDITION;
  if (!condition) throw new Error('Assertion failed: missing condition');
  assert(condition?.blockType === 'r20_worker_logic', 'logic condition');
  assert(condition.fields.OP === '&&', 'logic operator');
  assert(condition.valueInputs?.LHS.blockType === 'r20_worker_cmp', 'left comparison');
  assert(condition.valueInputs?.RHS.blockType === 'r20_worker_cmp', 'right comparison');
  assert(condition.valueInputs?.LHS.fields.OP === '>', 'left comparison operator');

  const setAttrs = root.children.CHILDREN?.[0];
  const total = setAttrs?.valueInputs?.VALUE;
  if (!total) throw new Error('Assertion failed: missing arithmetic value');
  assert(total?.blockType === 'r20_worker_arith', 'arithmetic value');
  assert(total.fields.OP === '+', 'outer arithmetic operator');
  assert(total.valueInputs?.RHS.blockType === 'r20_worker_arith', 'nested arithmetic');
  assert(total.valueInputs?.RHS.fields.OP === '*', 'nested arithmetic operator');

  const alternate = parseSheetWorkerScript(
    `if (v.a === v.b || v.c !== v.d) { setAttrs({ result: a - b - c }); }`,
  ).blocks[0];
  const alternateCondition = alternate.valueInputs?.CONDITION;
  if (!alternateCondition) throw new Error('Assertion failed: missing alternate condition');
  assert(alternateCondition.blockType === 'r20_worker_logic', 'or condition');
  assert(alternateCondition.fields.OP === '||', 'or operator');
  assert(alternateCondition.valueInputs?.LHS.fields.OP === '===', 'strict equality operator');
  assert(alternateCondition.valueInputs?.RHS.fields.OP === '!==', 'strict inequality operator');

  const subtraction = alternate.children.CHILDREN?.[0]?.valueInputs?.VALUE;
  if (!subtraction) throw new Error('Assertion failed: missing subtraction');
  assert(subtraction.blockType === 'r20_worker_arith', 'subtraction arithmetic');
  assert(subtraction.fields.OP === '-', 'right-most subtraction operator');
  assert(subtraction.valueInputs?.LHS.blockType === 'r20_worker_arith', 'left-associative subtraction');
}

function testWorkerMathFunctions(): void {
  const r = parseSheetWorkerScript(
    `if (Math.floor(v.hp) > Math.max(v.minimum, v.maximum)) { setAttrs({ active: 1 }); }`,
  );
  const condition = r.blocks[0].valueInputs?.CONDITION;
  if (!condition) throw new Error('Assertion failed: missing math condition');
  assert(condition.blockType === 'r20_worker_cmp', 'math comparison');
  assert(condition.valueInputs?.LHS.blockType === 'r20_worker_math_unary', 'unary Math block');
  assert(condition.valueInputs?.LHS.fields.OP === 'floor', 'unary Math operator');
  assert(condition.valueInputs?.RHS.blockType === 'r20_worker_math_binary', 'binary Math block');
  assert(condition.valueInputs?.RHS.fields.OP === 'max', 'binary Math operator');
  assert(
    condition.valueInputs?.RHS.valueInputs?.LHS.blockType === 'r20_worker_v_ref',
    'binary Math left operand',
  );
}

function testWorkerParseInt(): void {
  const r = parseSheetWorkerScript(
    `setAttrs({ total: parseInt(values.strength || "10", 10) });`,
  );
  const value = r.blocks[0].valueInputs?.VALUE;
  if (!value) throw new Error('Assertion failed: missing parseInt value');
  assert(value.blockType === 'r20_worker_parse_int', 'parseInt block');
  assert(value.fields.RADIX === '10', 'parseInt radix');
  assert(value.valueInputs?.VALUE.blockType === 'r20_worker_logic', 'parseInt operand expression');
}

function testWorkerUnaryNot(): void {
  const r = parseSheetWorkerScript(
    `if (!v.disabled) { setAttrs({ active: 1 }); }`,
  );
  const condition = r.blocks[0].valueInputs?.CONDITION;
  if (!condition) throw new Error('Assertion failed: missing unary condition');
  assert(condition.blockType === 'r20_worker_not', 'unary not condition');
  assert(condition.valueInputs?.VALUE.blockType === 'r20_worker_v_ref', 'unary operand ref');
  assert(condition.valueInputs?.VALUE.fields.NAME === 'disabled', 'unary operand name');

  const nested = parseSheetWorkerScript(
    `if (!!v.enabled) { setAttrs({ active: 1 }); }`,
  ).blocks[0].valueInputs?.CONDITION;
  if (!nested) throw new Error('Assertion failed: missing nested unary condition');
  assert(nested.blockType === 'r20_worker_not', 'outer unary not');
  assert(nested.valueInputs?.VALUE.blockType === 'r20_worker_not', 'nested unary not');
}

function testRawFallback(): void {
  // switch/case 는 v1 에서 unrecognized — raw fallback.
  const js = `switch (x) { case 1: a(); break; }`;
  const r = parseSheetWorkerScript(js);
  assert(r.stats.unparsed >= 1, `unparsed expected >= 1, got ${r.stats.unparsed}`);
  assert(r.blocks[0].blockType === 'r20_raw_worker', 'raw fallback');
}

function testCommentsAndStrings(): void {
  const js = `
    // line comment
    /* block ; comment ; */
    on('change:hp', function() {
      var s = "string with ; semicolon";
      setAttrs({ msg: s });
    });
  `;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks.length === 1, 'one top hat (semicolons in string ignored)');
  assert(r.blocks[0].blockType === 'r20_on_attr_change', 'hat');
  const inner = r.blocks[0].children.CHILDREN || [];
  assert(inner.length === 2, `2 inner stmts got ${inner.length}`);
}

function testMultipleTopLevelHats(): void {
  const js = `
    on('change:str', function() { setAttrs({ a: 1 }); });
    on('change:dex', function() { setAttrs({ b: 2 }); });
    on('change:con', function() { setAttrs({ c: 3 }); });
  `;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks.length === 3, `3 top hats got ${r.blocks.length}`);
  for (const b of r.blocks) {
    assert(b.blockType === 'r20_on_attr_change', 'each hat is attr_change');
  }
}

function testMultiEventWithEventInfo(): void {
  const js = `on('change:a change:b', function(eventInfo) { setAttrs({source: eventInfo.sourceType}); });`;
  const r = parseSheetWorkerScript(js);
  const hat = r.blocks[0];
  assert(hat.blockType === 'r20_on_events', 'multi-event uses the generic event hat');
  assert(hat.fields.EVENTS === 'change:a change:b', 'all event tokens are preserved');
  assert(hat.fields.EVENT_VAR === 'eventInfo', 'callback parameter is preserved');
  const setter = hat.children.CHILDREN?.[0];
  assert(setter?.blockType === 'r20_set_attrs', 'event body remains structured');
  const reporter = setter?.valueInputs?.VALUE;
  assert(reporter?.blockType === 'r20_worker_event_info', 'eventInfo property uses a reporter block');
  assert(reporter?.fields.VAR === 'eventInfo', 'eventInfo variable name');
  assert(reporter?.fields.PROPERTY === 'sourceType', 'eventInfo property');
  assert(r.stats.unparsed === 0, `multi-event should not fall back: ${r.stats.unparsed}`);
}

const tests = [
  ['empty', testEmpty],
  ['on change:attr', testOnAttrChange],
  ['on sheet:opened', testOnSheetOpened],
  ['on change:repeating', testOnRepeatingChange],
  ['on whole repeating section change', testOnRepeatingSectionChange],
  ['on repeating section reorder', testOnRepeatingReorder],
  ['on remove:repeating', testOnRepeatingRemove],
  ['on clicked', testOnClicked],
  ['setAttrs single', testSetAttrsSingle],
  ['setAttrs multi', testSetAttrsMulti],
  ['setAttrs overflow raw fallback', testSetAttrsOverflowPreservesRaw],
  ['setAttrs silent option', testSetAttrsSilentOption],
  ['setAttrs callback', testSetAttrsCallback],
  ['setAttrs callback without options', testSetAttrsCallbackWithoutOptions],
  ['getAttrs', testGetAttrs],
  ['getSectionIDs', testGetSectionIDs],
  ['setSectionOrder', testSetSectionOrder],
  ['setSectionOrder callback', testSetSectionOrderCallback],
  ['getTranslationLanguage', testTranslationLanguage],
  ['forEach', testForEach],
  ['if statement', testIfStatement],
  ['if else statement', testIfElseStatement],
  ['for count', testForCount],
  ['let declare', testVarLet],
  ['var alias', testVarAlias],
  ['const declare', testConstDeclaration],
  ['return', testReturn],
  ['generateRowID', testGenerateRowID],
  ['removeRepeatingRow', testRemoveRepeatingRow],
  ['console.log', testConsoleLog],
  ['nested complex', testNestedComplex],
  ['worker binary expressions', testWorkerBinaryExpressions],
  ['worker Math helpers', testWorkerMathFunctions],
  ['worker parseInt', testWorkerParseInt],
  ['worker unary not', testWorkerUnaryNot],
  ['raw fallback (switch)', testRawFallback],
  ['comments & strings', testCommentsAndStrings],
  ['multiple top hats', testMultipleTopLevelHats],
  ['multi-event on with eventInfo', testMultiEventWithEventInfo],
] as const;

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
if (passed !== tests.length) throw new Error(`${tests.length - passed} test(s) failed`);

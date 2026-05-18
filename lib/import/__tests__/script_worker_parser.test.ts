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
}

function testVarAlias(): void {
  // var → 동일 블록 (alias).
  const js = `var ids = ['a'];`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_worker_var_let', 'var → var_let alias');
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

function testMultiEventOnFallback(): void {
  // v1 에서 다중 이벤트 on('a b', cb) 는 패턴 미지원 → raw fallback.
  const js = `on('change:a change:b', function() { setAttrs({x:1}); });`;
  const r = parseSheetWorkerScript(js);
  assert(r.blocks[0].blockType === 'r20_raw_worker', 'multi-event → raw fallback');
}

const tests = [
  ['empty', testEmpty],
  ['on change:attr', testOnAttrChange],
  ['on sheet:opened', testOnSheetOpened],
  ['on change:repeating', testOnRepeatingChange],
  ['on remove:repeating', testOnRepeatingRemove],
  ['on clicked', testOnClicked],
  ['setAttrs single', testSetAttrsSingle],
  ['setAttrs multi', testSetAttrsMulti],
  ['getAttrs', testGetAttrs],
  ['getSectionIDs', testGetSectionIDs],
  ['forEach', testForEach],
  ['if statement', testIfStatement],
  ['for count', testForCount],
  ['let declare', testVarLet],
  ['var alias', testVarAlias],
  ['return', testReturn],
  ['generateRowID', testGenerateRowID],
  ['removeRepeatingRow', testRemoveRepeatingRow],
  ['console.log', testConsoleLog],
  ['nested complex', testNestedComplex],
  ['raw fallback (switch)', testRawFallback],
  ['comments & strings', testCommentsAndStrings],
  ['multiple top hats', testMultipleTopLevelHats],
  ['multi-event on fallback', testMultiEventOnFallback],
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

/**
 * HIGH 우선순위 블록 5종 import 매처 단위 테스트 (Stage 22 §6 후속).
 *
 * Anchor: docs/spec/23_high_priority_blocks.md §6 (Import matcher 영향).
 *
 * 대상 매처:
 *   1) r20_get_compendium — script 본문 reporter call 매칭
 *   2) r20_get_translation LANG — script 본문 reporter call 매칭
 *   3) r20_css_var_decl — CSS rule 안 `--name: value;` 선언
 *   4) r20_value_switch_panel + r20_value_case — wrapper div 매칭
 *   5) r20_attr_ref SCOPE — roll button EXPR 안 단일 `@{...}` 토큰
 *
 * 시스템 specific 토큰 0 — generic HTML/CSS 만.
 */

import { importSheet } from '../index.ts';
import { parseAttrRefToken } from '../expression_parser.ts';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectContains(s: string, needle: string, msg: string): void {
  assert(s.includes(needle), `${msg} — "${needle}" not in: ${s.slice(0, 200)}`);
}

function expectNotContains(s: string, needle: string, msg: string): void {
  assert(
    !s.includes(needle),
    `${msg} — unexpected "${needle}" present in: ${s.slice(0, 200)}`,
  );
}

// --- 1) r20_get_compendium ------------------------------------------------

function testCompendiumPage(): void {
  const html = `<script type="text/worker">getCompendiumPage('Spells/Fireball')</script>`;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_get_compendium', 'compendium block');
  expectContains(r.html, '>Spells/Fireball<', 'PATH carried');
  expectNotContains(r.html, 'r20_raw_worker', 'no raw_worker fallback');
}

function testCompendiumEntries(): void {
  const html = `<script type="text/worker">getCompendiumEntries('Spells/Fireball', 'description');</script>`;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_get_compendium', 'compendium block');
  expectContains(r.html, '>Spells/Fireball<', 'PATH carried');
  expectContains(r.html, '>description<', 'SUBPATH carried');
}

function testCompendiumDoubleQuotes(): void {
  const html = `<script>getCompendiumPage("PF2/Feats")</script>`;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_get_compendium', 'double-quote compendium');
  expectContains(r.html, '>PF2/Feats<', 'PATH double-quotes');
}

function testCompendiumComplexWorkerStaysRaw(): void {
  // 복합 worker (assignment / multiple statements) 은 raw_worker fallback.
  const html =
    `<script type="text/worker">on('sheet:opened', () => { setAttrs({hp: 10}); });</script>`;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_raw_worker', 'complex worker stays raw');
  expectNotContains(r.html, 'r20_get_compendium', 'no false compendium match');
}

// --- 2) r20_get_translation -----------------------------------------------

function testTranslationByKey(): void {
  const html = `<script>getTranslationByKey('strength')</script>`;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_get_translation', 'translation block');
  expectContains(r.html, '>strength<', 'KEY carried');
}

function testTranslationByLang(): void {
  const html = `<script>getTranslationByLang('ko', 'strength');</script>`;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_get_translation', 'translation block');
  expectContains(r.html, '>ko<', 'LANG carried');
  expectContains(r.html, '>strength<', 'KEY carried');
}

function testTypedPageScriptStaysHtml(): void {
  const html = `<script type="text/javascript" src="sheet-runtime.js">window.sheetReady = true;</script>`;
  const r = importSheet({ html });
  expectContains(r.js, 'r20_raw_page_js', 'typed page script enters Page JS workspace');
  expectContains(r.html, 'r20_page_js_slot', 'typed page script keeps an HTML slot');
  expectNotContains(r.html, 'r20_raw_worker', 'typed page script is not a worker');
  expectNotContains(r.html, 'r20_get_translation', 'typed page script is not a worker reporter');
}

function testUntypedPageScriptStaysHtml(): void {
  const html = `<script>window.sheetReady = true;</script>`;
  const r = importSheet({ html });
  expectContains(r.js, 'r20_raw_page_js', 'untyped page script enters Page JS workspace');
  expectContains(r.html, 'r20_page_js_slot', 'untyped page script keeps an HTML slot');
  expectNotContains(r.html, 'r20_raw_worker', 'untyped page script is not a worker');
}

// --- 3) r20_css_var_decl --------------------------------------------------

function testCssVarDecl(): void {
  const css = `:root { --primary: #3366ff; }`;
  const r = importSheet({ css });
  expectContains(r.css, 'r20_css_var_decl', 'var_decl matched');
  expectContains(r.css, '>primary<', 'VAR_NAME carried');
  expectContains(r.css, '>#3366ff<', 'VALUE_TEXT carried');
}

function testCssVarDeclWithSpaces(): void {
  const css = `.theme {\n  --accent: rgb(51, 102, 255);\n  color: red;\n}`;
  const r = importSheet({ css });
  expectContains(r.css, 'r20_css_var_decl', 'var_decl');
  expectContains(r.css, '>accent<', 'VAR_NAME accent');
  // 일반 decl (color: red) 은 여전히 r20_css_decl.
  expectContains(r.css, 'r20_css_decl', 'normal decl stays');
}

function testCssRegularPropNotVarDecl(): void {
  const css = `.a { color: red; }`;
  const r = importSheet({ css });
  expectNotContains(r.css, 'r20_css_var_decl', 'no false var match');
  expectContains(r.css, 'r20_css_decl', 'plain decl');
}

// --- 4) r20_value_switch_panel + r20_value_case ----------------------------

function testValueSwitchPanelMinimal(): void {
  // composite emit 형식 (lib/blocks/composite.ts §4) 의 minimum:
  // wrapper div + inline style + radios + panel divs.
  const html = `
    <div class="sheet-era-switch">
      <style>
        .sheet-era-panel { display: none; }
        .sheet-era-input[value="pulp"]:checked ~ .sheet-era-panel-pulp { display: block; }
        .sheet-era-input[value="modern"]:checked ~ .sheet-era-panel-modern { display: block; }
      </style>
      <input type="radio" class="sheet-era-input" name="attr_era" value="pulp">
      <input type="radio" class="sheet-era-input" name="attr_era" value="modern">
      <div class="sheet-era-panel sheet-era-panel-pulp"><span>P</span></div>
      <div class="sheet-era-panel sheet-era-panel-modern"><span>M</span></div>
    </div>
  `;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_value_switch_panel', 'switch_panel matched');
  expectContains(r.html, '>era<', 'ATTR_NAME=era');
  expectContains(r.html, 'r20_value_case', 'case present');
  expectContains(r.html, '>pulp<', 'VALUE=pulp');
  expectContains(r.html, '>modern<', 'VALUE=modern');
  // panel 내부 <span> 들도 자식으로 박힘.
  expectContains(r.html, 'r20_static_text', 'panel child span matched');
}

function testValueSwitchPanelPreservesCustomClasses(): void {
  const html = `
    <div class="sheet-era-switch sheet-switch-shell">
      <input type="radio" class="sheet-era-input" name="attr_era" value="pulp">
      <div class="sheet-era-panel sheet-era-panel-pulp sheet-panel-highlight"><span>P</span></div>
    </div>
  `;
  const r = importSheet({ html });
  expectContains(r.html, '>switch-shell<', 'switch wrapper class preserved');
  expectContains(r.html, '>panel-highlight<', 'panel class preserved');
}

function testValueSwitchPanelNoMatch(): void {
  // sheet-X-switch 아닌 일반 div 는 매칭 안 됨.
  const html = `<div class="sheet-era-wrap"><span>x</span></div>`;
  const r = importSheet({ html });
  expectNotContains(r.html, 'r20_value_switch_panel', 'no false match');
}

function testValueSwitchPanelPanelOnly(): void {
  // panel-only (radio 없음) 도 매칭 — Roll20 정책에 따라 panel 보이는 케이스
  // 있음. 단 ATTR class match 가 핵심.
  const html = `
    <div class="sheet-mode-switch">
      <div class="sheet-mode-panel sheet-mode-panel-a"><span>A</span></div>
    </div>
  `;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_value_switch_panel', 'switch_panel (panel-only)');
  expectContains(r.html, '>mode<', 'ATTR_NAME=mode');
  expectContains(r.html, '>a<', 'VALUE=a');
}

// --- 5) r20_attr_ref SCOPE -------------------------------------------------

function testAttrRefSelfToken(): void {
  const b = parseAttrRefToken('@{strength}');
  assert(b !== null, 'self matched');
  if (b) {
    assert(b.blockType === 'r20_attr_ref', 'block type');
    assert(b.fields.SCOPE === 'self', 'SCOPE=self');
    assert(b.fields.NAME === 'strength', 'NAME=strength');
  }
}

function testAttrRefSelectedToken(): void {
  const b = parseAttrRefToken('@{selected|hp}');
  assert(b !== null, 'selected matched');
  if (b) {
    assert(b.fields.SCOPE === 'selected', 'SCOPE=selected');
    assert(b.fields.NAME === 'hp', 'NAME=hp');
  }
}

function testAttrRefTargetToken(): void {
  const b = parseAttrRefToken('@{target|ac}');
  assert(b !== null, 'target matched');
  if (b) {
    assert(b.fields.SCOPE === 'target', 'SCOPE=target');
    assert(b.fields.NAME === 'ac', 'NAME=ac');
  }
}

function testAttrRefCharacterIdToken(): void {
  const b = parseAttrRefToken('@{character_id}');
  assert(b !== null, 'character_id matched');
  if (b) {
    assert(b.fields.SCOPE === 'character_id', 'SCOPE=character_id');
    assert(b.fields.NAME === '', 'NAME blank for character_id');
  }
}

function testAttrRefMaxToken(): void {
  const b = parseAttrRefToken('@{hp|max}');
  assert(b !== null, 'max matched');
  if (b) {
    assert(b.blockType === 'r20_attr_ref_max', 'attr_ref_max block');
    assert(b.fields.NAME === 'hp', 'NAME=hp');
  }
}

function testAttrRefMixedTextNoMatch(): void {
  // 복합 표현식 — 단일 토큰이 아니므로 null.
  const b = parseAttrRefToken('@{x}+@{y}');
  assert(b === null, 'mixed expression not matched');
  const b2 = parseAttrRefToken('prefix @{x}');
  assert(b2 === null, 'prefixed not matched');
}

function testAttrRefInRollButton(): void {
  // roll button EXPR 안의 단일 attr_ref 는 r20_attr_ref 로 분해 (round-trip).
  const html = `<button type="roll" name="roll_atk" value="@{selected|attack}">A</button>`;
  const r = importSheet({ html });
  expectContains(r.html, 'r20_roll_button', 'roll button');
  expectContains(r.html, 'r20_attr_ref', 'EXPR decomposed to attr_ref');
  expectContains(r.html, '>selected<', 'SCOPE=selected');
  expectContains(r.html, '>attack<', 'NAME=attack');
  expectNotContains(r.html, 'r20_literal_string', 'no raw literal_string used');
}

// --- Round-trip sanity (raw fallback count 회귀 가드) ----------------------

function testRegressionNoNewFallback(): void {
  // 기존 basic 케이스 한 줄 — fallback 0 유지.
  const html = `<input type="text" name="attr_name">`;
  const r = importSheet({ html });
  assert(r.stats.htmlRawFallback === 0, 'no fallback for basic');
}

// ---------- runner ---------------------------------------------------------

const tests = [
  ['compendium page', testCompendiumPage],
  ['compendium entries', testCompendiumEntries],
  ['compendium double-quotes', testCompendiumDoubleQuotes],
  ['complex worker stays raw', testCompendiumComplexWorkerStaysRaw],
  ['translation by key', testTranslationByKey],
  ['translation by lang', testTranslationByLang],
  ['typed page script stays HTML', testTypedPageScriptStaysHtml],
  ['untyped page script stays HTML', testUntypedPageScriptStaysHtml],
  ['css var decl basic', testCssVarDecl],
  ['css var decl with spaces', testCssVarDeclWithSpaces],
  ['css regular prop not var decl', testCssRegularPropNotVarDecl],
  ['value switch panel minimal', testValueSwitchPanelMinimal],
  ['value switch panel custom classes', testValueSwitchPanelPreservesCustomClasses],
  ['value switch panel no false match', testValueSwitchPanelNoMatch],
  ['value switch panel only', testValueSwitchPanelPanelOnly],
  ['attr_ref self token', testAttrRefSelfToken],
  ['attr_ref selected token', testAttrRefSelectedToken],
  ['attr_ref target token', testAttrRefTargetToken],
  ['attr_ref character_id token', testAttrRefCharacterIdToken],
  ['attr_ref max token', testAttrRefMaxToken],
  ['attr_ref mixed text no match', testAttrRefMixedTextNoMatch],
  ['attr_ref in roll button', testAttrRefInRollButton],
  ['regression: no new fallback', testRegressionNoNewFallback],
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

/**
 * Basic import unit tests — TS 컴파일 + 런타임 smoke.
 *
 * 본 파일은 Node.js + ts-node 또는 vitest 로 실행 가능. import 의 외부 의존 0
 * (jsdom X) — 빠르게 결정적 테스트.
 *
 * roll20-sheet-builder specific content 0 — generic HTML 만.
 */

import { importSheet } from '../index';
import {
  classifyRoll20Script,
  extractRoll20ScriptSources,
  isOrdinaryPageScript,
} from '../worker_source';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function testBasicTextInput(): void {
  const html = `<input type="text" name="attr_character_name" value="Hero">`;
  const r = importSheet({ html });
  assert(r.stats.htmlMatched >= 1, 'text input should match');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback expected');
  assert(r.html.includes('r20_text_input'), 'r20_text_input in xml');
  assert(r.html.includes('character_name'), 'NAME field carried');
}

function testNumberInput(): void {
  const html = `<input type="number" name="attr_level" min="1" max="20" value="3">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_number_input'), 'number block');
  assert(r.html.includes('>level<'), 'name preserved');
}

function testNestedDiv(): void {
  const html = `<div class="sheet-header"><h1>Title</h1></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_div'), 'div block');
  assert(r.html.includes('r20_heading'), 'heading inside');
  assert(r.html.includes('>header<'), 'sheet- prefix stripped');
}

function testSemanticContainerTagsStayStructured(): void {
  const html = [
    '<main class="sheet-shell" data-layout="flow">',
    '  <header><h1>Title</h1></header>',
    '  <article><p>Body</p><figure><figcaption>Caption</figcaption></figure></article>',
    '</main>',
  ].join('');
  const r = importSheet({ html });
  assert(
    (r.html.match(/r20_semantic_container/g) || []).length === 6,
    'all semantic container tags should become editable structure blocks',
  );
  assert(r.html.includes('<field name="TAG">main</field>'), 'main tag preserved');
  assert(r.html.includes('<field name="TAG">article</field>'), 'article tag preserved');
  assert(r.html.includes('data-layout'), 'semantic container attributes are preserved');
  assert(r.html.includes('>shell<'), 'semantic container class is normalized');
  assert(r.stats.htmlRawFallback === 0, 'semantic container tree has no raw fallback');
}

function testUnknownSafeElementsStayEditable(): void {
  const html = '<custom-card data-kind="panel" aria-label="Card"><a href="/sheet">Open</a></custom-card>';
  const r = importSheet({ html });
  assert((r.html.match(/r20_element_container/g) || []).length === 2, 'safe unknown elements become generic blocks');
  assert(r.html.includes('<field name="TAG">custom-card</field>'), 'custom element tag is preserved');
  assert(r.html.includes('<field name="TAG">a</field>'), 'anchor tag is preserved');
  assert(r.html.includes('data-kind'), 'generic element attributes are preserved');
  assert(r.stats.htmlRawFallback === 0, 'safe unknown elements do not use raw fallback');
}

function testRepeatingSection(): void {
  const html = `<fieldset class="repeating_skills"><input type="text" name="attr_name"></fieldset>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_repeating_section'), 'repeating block');
  assert(r.html.includes('>skills<'), 'name preserved');
}

function testStructuralLabelContainer(): void {
  const html = `<label for="attr_name" class="sheet-improvement"><input type="text" name="attr_name"><span>Name</span></label>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_label_container'), 'nested label container block');
  assert(r.html.includes('r20_text_input'), 'label input child');
  assert(r.html.includes('>attr_name<'), 'label for preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for nested label');
}

function testListContainers(): void {
  const html = `<ul class="sheet-options"><li><hr></li><li><span>Second</span></li></ul>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_list'), 'list container block');
  assert(r.html.includes('r20_list_item'), 'list item blocks');
  assert(r.html.includes('r20_hr'), 'list child preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for list structure');
}

function testDirectTextNodePreserved(): void {
  const html = `<label>Name <input type="text" name="attr_name"> suffix</label>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_label_container'), 'label remains structural');
  assert((r.html.match(/r20_text_node/g) || []).length === 2, 'both direct text nodes preserved');
  assert(r.html.includes('>Name <'), 'leading text and its inline boundary space preserved');
  assert(r.html.includes('> suffix<'), 'trailing text and its inline boundary space preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for direct text');
}

function testWhitespaceOnlyTextDoesNotInflate(): void {
  const html = `<div>\n  <label> Name <input name="attr_name"> </label>\n</div>`;
  const r = importSheet({ html });
  assert((r.html.match(/r20_text_node/g) || []).length === 1, 'indentation whitespace is ignored');
  assert(r.html.includes('>Name <'), 'meaningful label text and inline boundary remain');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for formatted container');
}

function testInlineWhitespaceBetweenSiblingsPreserved(): void {
  const html = '<div><span>A</span> <span>B</span></div>';
  const r = importSheet({ html });
  assert(r.html.includes('<field name="TEXT"> </field>'), 'inline sibling space is preserved');
  assert((r.html.match(/r20_static_text/g) || []).length === 2, 'both inline text elements remain editable');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for inline whitespace');
}

function testFormattedDirectTextHasStableWhitespace(): void {
  const html = `<div><span>Name</span>\n          :\n        <input name="attr_name"></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('<field name="TEXT"> : </field>'), 'formatted inline punctuation keeps rendered spaces');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for formatted inline text');
}

function testRadioLabelDoesNotNestOnEmit(): void {
  const html = `<label><input type="radio" name="attr_mode" value="a">Alpha</label>`;
  const r = importSheet({ html });
  assert((r.html.match(/r20_radio/g) || []).length === 1, 'radio wrapper is one block');
  assert(!r.html.includes('r20_label_container'), 'radio does not become a nested label container');
  assert(r.html.includes('>Alpha<'), 'radio label text is preserved');
}

function testDefaultControlStateIsEditable(): void {
  const html = [
    '<label><input type="radio" name="attr_mode" value="a" checked="checked">Alpha</label>',
    '<select name="attr_style"><option value="dark" selected="selected">Dark</option></select>',
  ].join('');
  const r = importSheet({ html });
  assert(r.html.includes('<field name="CHECKED">TRUE</field>'), 'radio checked state becomes a block field');
  assert(r.html.includes('<field name="SELECTED">TRUE</field>'), 'option selected state becomes a block field');
  assert(r.stats.htmlRawFallback === 0, 'default state controls stay structured');
}

function testUnknownAttributesSurviveMatchedBlocks(): void {
  const html = `<div id="frame" data-layout="grid" aria-label="Frame"><input type="text" name="attr_name" title="Name" data-hook="field"></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('__R20_PRESERVED_ATTRS'), 'preserved attribute field exists');
  assert(r.html.includes('data-layout'), 'container data attribute is captured');
  assert(r.html.includes('aria-label'), 'ARIA attribute is captured');
  assert(r.html.includes('data-hook'), 'input data attribute is captured');
  assert(r.html.includes('title'), 'input title attribute is captured');
  assert(r.stats.htmlRawFallback === 0, 'matched nodes do not fall back to raw HTML');
}

function testCssRule(): void {
  const css = `.sheet-header { color: red; padding: 10px; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'one rule matched');
  assert(r.css.includes('r20_css_rule'), 'css_rule block');
  assert(r.css.includes('r20_selector_class'), 'selector_class block');
}

function testI18nJson(): void {
  const i18n = `{"hello":"안녕","goodbye":"잘 가"}`;
  const r = importSheet({ i18n });
  assert(r.stats.i18nKeys === 2, '2 keys parsed');
  assert(r.i18n.includes('r20_locale_value'), 'locale_value block');
}

function testI18nFlat(): void {
  const i18n = `# lang: en\nhello=Hello\nbye=Goodbye\n`;
  const r = importSheet({ i18n });
  assert(r.stats.i18nKeys === 2, '2 flat keys');
  assert(r.i18n.includes('>en<'), 'lang detected');
}

function testRawFallback(): void {
  const html = `<style>.sheet-x { display: none; }</style>`;
  const r = importSheet({ html });
  assert(r.stats.htmlRawFallback >= 1, 'opaque style tag → raw fallback');
  assert(r.html.includes('r20_raw_html'), 'raw_html block emitted');
}

function testCoverageStat(): void {
  const html = `
    <div class="sheet-x">
      <input type="text" name="attr_n">
      <h1>x</h1>
    </div>
  `;
  const r = importSheet({ html });
  assert(r.stats.coverage > 90, `coverage should be >90, got ${r.stats.coverage}`);
}


function testInlineBoldB(): void {
  const html = `<b>x</b>`;
  const r = importSheet({ html });
  assert(r.stats.htmlMatched >= 1, '<b> should match');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for <b>');
  assert(r.html.includes('r20_inline_bold'), 'r20_inline_bold block emitted');
  assert(r.html.includes('>x<'), 'TEXT carried');
}

function testInlineBoldStrong(): void {
  const html = `<strong>x</strong>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_bold'), '<strong> → r20_inline_bold');
  assert(r.html.includes('>x<'), 'TEXT carried');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

function testInlineItalicEm(): void {
  const html = `<em>x</em>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_italic'), '<em> → r20_inline_italic');
  assert(r.html.includes('>x<'), 'TEXT carried');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

function testInlineItalicI(): void {
  const html = `<i>x</i>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_italic'), '<i> (non-icon) → r20_inline_italic');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

function testSemanticInlineContainerKeepsNestedI18n(): void {
  const html = `<small class="sheet-help"><span data-i18n="help-key">Help</span></small>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_container'), 'semantic inline container block');
  assert(r.html.includes('r20_i18n_text'), 'nested translation block preserved');
  assert(r.html.includes('help-key'), 'translation key preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for nested inline translation');
}

function testTableCaption(): void {
  const html = `<caption>Title</caption>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_table_caption'), '<caption> → r20_table_caption');
  assert(r.html.includes('>Title<'), 'TEXT carried');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for caption');
}

function testInlineBreak(): void {
  const html = `<br>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_break'), '<br> → r20_inline_break');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for br');
}

function testCssFontFace(): void {
  const css = `@font-face { font-family: 'MyFont'; src: url('http://x/y.woff2') format('woff2'); font-weight: 700; font-style: normal; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@font-face matched 1');
  assert(r.stats.cssRawFallback === 0, 'no css raw fallback');
  assert(r.css.includes('r20_css_font_face'), 'font_face block emitted');
  assert(r.css.includes('>MyFont<'), 'FAMILY field carried');
}

function testTableColumnStructure(): void {
  const html = `<table><colgroup><col style="width: 50%;"><col style="width: 50%;"></colgroup><tr><td>A</td></tr></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_colgroup'), 'colgroup block');
  assert((r.html.match(/r20_table_col/g) || []).length === 2, 'col blocks');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for table columns');
}

function testGenericInputTableDoesNotCollapseToSkillRow(): void {
  const html = `<table><tbody><tr><td><input type="text" name="attr_left" value="A"></td><td><input type="text" name="attr_right" value="B"></td></tr></tbody></table>`;
  const r = importSheet({ html });
  assert(!r.html.includes('r20_skill_row'), 'generic input table stays atomic');
  assert((r.html.match(/r20_td/g) || []).length === 2, 'both table cells remain blocks');
  assert((r.html.match(/r20_text_input/g) || []).length === 2, 'both inputs remain blocks');
}

function testCssImport(): void {
  const css = `@import url('https://fonts.googleapis.com/css?family=Example&display=swap');`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@import matched');
  assert(r.stats.cssRawFallback === 0, 'no raw fallback for @import');
  assert(r.css.includes('r20_css_import'), 'css_import block');
  assert(r.css.includes('fonts.googleapis.com'), 'import source carried');
}

function testCssBareAtRulePreservation(): void {
  const css = '@charset "UTF-8"; @namespace svg url("http://www.w3.org/2000/svg"); @layer reset;';
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 0, 'bare unsupported at-rules are not typed rules');
  assert(r.stats.cssRawFallback === 3, 'each bare at-rule is retained as raw CSS');
  assert(r.css.includes('@charset'), 'charset at-rule is preserved');
  assert(r.css.includes('@namespace'), 'namespace at-rule is preserved');
  assert(r.css.includes('@layer reset;'), 'semicolon terminator is preserved');
  assert(!r.css.includes('@layer reset{}'), 'semicolon at-rule is not rewritten as a block');

  const incomplete = importSheet({ css: '@layer reset' });
  assert(incomplete.css.includes('@layer reset'), 'unterminated at-rule text is preserved');
  assert(!incomplete.css.includes('@layer reset;'), 'EOF at-rule is not given a new terminator');
}

function testCssMediaQueryStructure(): void {
  const css = '@media (max-width: 640px) { .sheet-header { color: red; } }';
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@media counts as one matched top-level rule');
  assert(r.stats.cssRawFallback === 0, 'simple @media has no raw fallback');
  assert(r.css.includes('r20_media_query'), '@media maps to a dedicated block');
  assert(r.css.includes('r20_css_rule'), 'nested media rule is represented');
  assert(r.css.includes('max-width: 640px'), 'media condition is preserved');

  const complex = importSheet({
    css: '@media screen and (max-width: 640px) { .sheet-header { color: red; } }',
  });
  assert(!complex.css.includes('r20_media_query'), 'complex media shape stays out of the typed block');
  assert(complex.css.includes('r20_raw_css'), 'complex media query remains lossless raw CSS');
}

function testCssKeyframesStructureAndFallback(): void {
  const css = '@keyframes pulse { from { opacity: 0; } 50% { opacity: 0.5; } 10% { opacity: 0.1; } to { opacity: 1; } }';
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, '@keyframes counts as one matched top-level rule');
  assert(r.css.includes('r20_keyframes'), '@keyframes maps to a dedicated block');
  assert((r.css.match(/r20_keyframe_stop/g) || []).length === 3, 'known keyframe stops become typed blocks');
  assert(r.css.includes('r20_raw_css'), 'unsupported keyframe stop stays lossless raw CSS');
  assert(r.css.includes('10%'), 'unsupported keyframe stop value is preserved');
}

function testCssSelectorComplexFallback(): void {
  // 매우 복잡한 selector (parser 가 분해 못함) — r20_selector_complex 로 100% 보존.
  const css = `body > .foo + .bar:not(:first-child) ~ [data-x="1"] { color: red; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'rule matched');
  // r20_selector_complex 또는 정상 분해 둘 다 OK (분해돼도 selector_complex 가 잔여로 박힘 가능)
  // 핵심: r20_literal_string 으로 박히지 않음 + warning 발생 1+
  const literalCount = (r.css.match(/r20_literal_string/g) || []).length;
  assert(literalCount === 0, 'no r20_literal_string fallback');
}

function testCssCompoundSelector(): void {
  // tag.class compound — `input.sheet-hide`.
  const css = `input.sheet-hide { display: none; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'rule matched');
  assert(r.css.includes('r20_selector_compound'), 'compound block emitted');
  assert(r.css.includes('r20_selector_element'), 'leading element preserved');
}

function testCssPseudoElementWebkit(): void {
  const css = `input[type=number]::-webkit-outer-spin-button { display: none; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 1, 'rule matched');
  assert(r.css.includes('r20_selector_pseudo_element'), 'pseudo-element block emitted');
}

function testCssExtendedElementTags(): void {
  // Roll20 시트에서 자주 쓰는 bare-tag — textarea / table / caption 등.
  const css = `textarea { background: #fff; } table { width: 100%; } caption { font-weight: bold; }`;
  const r = importSheet({ css });
  assert(r.stats.cssMatched === 3, '3 rules matched');
  // selector_element 가 textarea/table/caption 까지 핸들 — selector_complex fallback 0.
  const complexMatches = (r.css.match(/r20_selector_complex/g) || []).length;
  assert(complexMatches === 0, `no selector_complex fallback (got ${complexMatches})`);
}

function testCssCustomElementSelector(): void {
  const r = importSheet({
    css: 'li { list-style: none; } custom-card { display: block; }',
  });
  assert(r.stats.cssMatched === 2, 'custom tag rules matched');
  assert((r.css.match(/r20_selector_tag/g) || []).length === 2, 'simple unknown tags stay editable');
  assert(!r.css.includes('r20_selector_complex'), 'simple unknown tags avoid opaque selector fallback');
}

function testScriptSourceClassification(): void {
  const source = [
    '<script type="text/worker">on("sheet:opened", function () {});</script>',
    '<script>setAttrs({ hp: 10 });</script>',
    '<script type="text/javascript" src="page-runtime.js">window.ready = true;</script>',
    '<script data-role="page">window.pageOnly = true;</script>',
  ].join('');
  const scripts = extractRoll20ScriptSources(source);
  assert(scripts.length === 4, 'all authored script tags are extracted');
  assert(scripts[0].kind === 'worker', 'explicit text/worker is a worker');
  assert(scripts[1].kind === 'worker', 'untyped Roll20 API script is a worker');
  assert(scripts[2].kind === 'page', 'typed page script remains page JavaScript');
  assert(scripts[2].attrs.includes('src="page-runtime.js"'), 'page attributes are preserved');
  assert(scripts[3].body.includes('pageOnly'), 'page source body is preserved');
  assert(classifyRoll20Script('text/javascript', 'on("click", fn);') === 'page', 'typed page type wins');
  assert(isOrdinaryPageScript('', 'window.ready = true;'), 'ordinary untyped page script is page JavaScript');
  assert(!isOrdinaryPageScript('', 'getAttrs(["hp"], function () {});'), 'untyped worker API is not page JavaScript');
}

function testPageScriptMapsToEditableBlock(): void {
  const r = importSheet({
    html: '<script type="text/javascript" src="page-runtime.js" defer>window.ready = true;</script>',
  });
  assert(r.js.includes('r20_raw_page_js'), 'ordinary page script maps to an editable page-JS block');
  assert(r.js.includes('page-runtime.js'), 'page script attributes survive import');
  assert(r.js.includes('window.ready = true;'), 'page script body survives import');
  assert(r.html.includes('r20_page_js_slot'), 'HTML keeps a source-order anchor block');
  assert(!r.html.includes('window.ready = true;'), 'page script body leaves the HTML workspace');
  assert(r.stats.pageScriptBlocks === 1, 'page script count is reported');
}

const tests = [
  ['text input', testBasicTextInput],
  ['number input', testNumberInput],
  ['nested div', testNestedDiv],
  ['semantic container tags', testSemanticContainerTagsStayStructured],
  ['unknown safe elements', testUnknownSafeElementsStayEditable],
  ['repeating section', testRepeatingSection],
  ['structural label container', testStructuralLabelContainer],
  ['list containers', testListContainers],
  ['direct text node', testDirectTextNodePreserved],
  ['whitespace-only text', testWhitespaceOnlyTextDoesNotInflate],
  ['inline sibling whitespace', testInlineWhitespaceBetweenSiblingsPreserved],
  ['stable formatted text', testFormattedDirectTextHasStableWhitespace],
  ['radio label wrapper', testRadioLabelDoesNotNestOnEmit],
  ['default control state', testDefaultControlStateIsEditable],
  ['unknown attributes', testUnknownAttributesSurviveMatchedBlocks],
  ['css rule', testCssRule],
  ['i18n json', testI18nJson],
  ['i18n flat', testI18nFlat],
  ['raw fallback', testRawFallback],
  ['coverage', testCoverageStat],
  ['inline bold <b>', testInlineBoldB],
  ['inline bold <strong>', testInlineBoldStrong],
  ['inline italic <em>', testInlineItalicEm],
  ['inline italic <i>', testInlineItalicI],
  ['semantic inline container with nested i18n', testSemanticInlineContainerKeepsNestedI18n],
  ['table caption', testTableCaption],
  ['inline break <br>', testInlineBreak],
  ['css @font-face', testCssFontFace],
  ['table column structure', testTableColumnStructure],
  ['generic input table stays atomic', testGenericInputTableDoesNotCollapseToSkillRow],
  ['css @import', testCssImport],
  ['css bare at-rule preservation', testCssBareAtRulePreservation],
  ['css @media structure', testCssMediaQueryStructure],
  ['css @keyframes structure', testCssKeyframesStructureAndFallback],
  ['css selector_complex fallback', testCssSelectorComplexFallback],
  ['css compound selector', testCssCompoundSelector],
  ['css pseudo-element ::-webkit-*', testCssPseudoElementWebkit],
  ['css extended element tags', testCssExtendedElementTags],
  ['css custom element selector', testCssCustomElementSelector],
  ['script source classification', testScriptSourceClassification],
  ['page script editable block', testPageScriptMapsToEditableBlock],
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

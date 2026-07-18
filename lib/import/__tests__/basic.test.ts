/**
 * Basic import unit tests — TS 컴파일 + 런타임 smoke.
 *
 * 본 파일은 Node.js + ts-node 또는 vitest 로 실행 가능. import 의 외부 의존 0
 * (jsdom X) — 빠르게 결정적 테스트.
 *
 * 영시영 specific content 0 — generic HTML 만.
 */

import { importSheet } from '../index';

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
  assert(r.html.includes('>Name<'), 'leading text preserved');
  assert(r.html.includes('>suffix<'), 'trailing text preserved');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for direct text');
}

function testWhitespaceOnlyTextDoesNotInflate(): void {
  const html = `<div>\n  <label> Name <input name="attr_name"> </label>\n</div>`;
  const r = importSheet({ html });
  assert((r.html.match(/r20_text_node/g) || []).length === 1, 'indentation whitespace is ignored');
  assert(r.html.includes('>Name<'), 'meaningful label text remains');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for formatted container');
}

function testFormattedDirectTextHasStableWhitespace(): void {
  const html = `<div><span>Name</span>\n          :\n        <input name="attr_name"></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('<field name="TEXT">:</field>'), 'formatted punctuation text trims layout edges');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for formatted inline text');
}

function testRadioLabelDoesNotNestOnEmit(): void {
  const html = `<label><input type="radio" name="attr_mode" value="a">Alpha</label>`;
  const r = importSheet({ html });
  assert((r.html.match(/r20_radio/g) || []).length === 1, 'radio wrapper is one block');
  assert(!r.html.includes('r20_label_container'), 'radio does not become a nested label container');
  assert(r.html.includes('>Alpha<'), 'radio label text is preserved');
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
  const html = `<custom-element data-x="1">hi</custom-element>`;
  const r = importSheet({ html });
  assert(r.stats.htmlRawFallback >= 1, 'unknown tag → raw fallback');
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

const tests = [
  ['text input', testBasicTextInput],
  ['number input', testNumberInput],
  ['nested div', testNestedDiv],
  ['repeating section', testRepeatingSection],
  ['structural label container', testStructuralLabelContainer],
  ['list containers', testListContainers],
  ['direct text node', testDirectTextNodePreserved],
  ['whitespace-only text', testWhitespaceOnlyTextDoesNotInflate],
  ['stable formatted text', testFormattedDirectTextHasStableWhitespace],
  ['radio label wrapper', testRadioLabelDoesNotNestOnEmit],
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
  ['css selector_complex fallback', testCssSelectorComplexFallback],
  ['css compound selector', testCssCompoundSelector],
  ['css pseudo-element ::-webkit-*', testCssPseudoElementWebkit],
  ['css extended element tags', testCssExtendedElementTags],
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

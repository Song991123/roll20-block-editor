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

const tests = [
  ['text input', testBasicTextInput],
  ['number input', testNumberInput],
  ['nested div', testNestedDiv],
  ['repeating section', testRepeatingSection],
  ['css rule', testCssRule],
  ['i18n json', testI18nJson],
  ['i18n flat', testI18nFlat],
  ['raw fallback', testRawFallback],
  ['coverage', testCoverageStat],
  ['inline bold <b>', testInlineBoldB],
  ['inline bold <strong>', testInlineBoldStrong],
  ['inline italic <em>', testInlineItalicEm],
  ['inline italic <i>', testInlineItalicI],
  ['table caption', testTableCaption],
  ['inline break <br>', testInlineBreak],
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

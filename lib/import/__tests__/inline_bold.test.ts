/**
 * inline_bold / inline_italic 매칭 — nested inline 허용 회귀 test.
 *
 * 1부 검증 보고서 (2부_spec.md §5) 잔여 버그:
 *   - block_matcher.ts hasOnlyText 는 <b><i>x</i></b> 같은 nested element 거부 →
 *     inline_bold (r20_inline_bold) 매칭 실패 → raw_html fallback / 부모 흡수.
 *   - 1부 RAW 419 <b> 중 109 만 매칭, 310 가 흡수됨.
 *
 * 본 테스트는 fix 후 simple / nested / mix / span / label / br 케이스가
 * 모두 정상 매칭됨을 보장. anchor / icon / i18n-child 는 여전히 흡수 X (가드).
 *
 * 외부 의존 0 — Node + ts-node / tsx 로 실행.
 */

import { importSheet } from '../index';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function xmlContainsField(xml: string, key: string, value: string): boolean {
  const re = new RegExp(`<field[^>]*name="${key}"[^>]*>${value}</field>`);
  return re.test(xml);
}

function testSimpleBold(): void {
  // 회귀 — 기존 케이스가 여전히 매칭.
  const html = `<b>simple</b>`;
  const r = importSheet({ html });
  assert(r.stats.htmlMatched >= 1, 'simple <b> should match');
  assert(r.stats.htmlRawFallback === 0, `no raw fallback, got ${r.stats.htmlRawFallback}`);
  assert(r.html.includes('r20_inline_bold'), 'r20_inline_bold emitted');
  assert(xmlContainsField(r.html, 'TEXT', 'simple'), 'TEXT = simple');
}

function testNestedBoldItalic(): void {
  // 핵심 fix — <b> 안에 <i> 가 있어도 매칭.
  const html = `<b><i>italic in bold</i></b>`;
  const r = importSheet({ html });
  assert(r.stats.htmlMatched >= 1, 'nested <b><i>...</i></b> should match');
  assert(r.stats.htmlRawFallback === 0, `no raw fallback, got ${r.stats.htmlRawFallback}`);
  assert(r.html.includes('r20_inline_bold'), 'r20_inline_bold emitted');
  assert(
    xmlContainsField(r.html, 'TEXT', 'italic in bold'),
    `TEXT should be flat "italic in bold", xml=${r.html}`,
  );
}

function testMixedTextAndInline(): void {
  // <b>mix <i>i</i> text</b> — text + nested inline 혼합.
  const html = `<b>mix <i>i</i> text</b>`;
  const r = importSheet({ html });
  assert(r.stats.htmlMatched >= 1, 'mix <b>text <i>i</i> text</b> should match');
  assert(r.html.includes('r20_inline_bold'), 'r20_inline_bold emitted');
  assert(
    xmlContainsField(r.html, 'TEXT', 'mix i text'),
    `TEXT should be flat "mix i text", xml=${r.html}`,
  );
}

function testStrongNested(): void {
  // strong + nested em 동일 fix.
  const html = `<strong>a <em>b</em> c</strong>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_bold'), 'strong → r20_inline_bold');
  assert(xmlContainsField(r.html, 'TEXT', 'a b c'), 'TEXT = "a b c"');
}

function testItalicNested(): void {
  // <em><b>x</b></em> — em 도 nested 허용.
  const html = `<em><b>x</b> y</em>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_inline_italic'), 'em → r20_inline_italic');
  assert(xmlContainsField(r.html, 'TEXT', 'x y'), 'TEXT = "x y"');
}

function testSpanNested(): void {
  // span hasOnlyText fix 동일 적용.
  const html = `<span>x <b>bold</b> y</span>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_static_text'), 'span → r20_static_text');
  assert(xmlContainsField(r.html, 'TEXT', 'x bold y'), 'TEXT = "x bold y"');
}

function testLabelNested(): void {
  // label hasOnlyText fix.
  const html = `<label>HP <b>(max)</b></label>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_label'), 'r20_label emitted');
  assert(xmlContainsField(r.html, 'TEXT', 'HP \\(max\\)'), 'TEXT = "HP (max)"');
}

function testBrInBold(): void {
  // <b>foo<br>bar</b> — void <br> 도 inline 으로 허용.
  const html = `<b>foo<br>bar</b>`;
  const r = importSheet({ html });
  assert(r.stats.htmlRawFallback === 0, `no raw fallback, got ${r.stats.htmlRawFallback}`);
  assert(r.html.includes('r20_inline_bold'), 'r20_inline_bold emitted');
  assert(xmlContainsField(r.html, 'TEXT', 'foo bar'), 'TEXT = "foo bar"');
}

function testDeepNested(): void {
  // <b><strong><em>x</em></strong></b> — 재귀 inline.
  const html = `<b><strong><em>deep</em></strong></b>`;
  const r = importSheet({ html });
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
  assert(r.html.includes('r20_inline_bold'), 'r20_inline_bold emitted');
  assert(xmlContainsField(r.html, 'TEXT', 'deep'), 'TEXT = "deep"');
}

function testIconNotAbsorbed(): void {
  // <b><i class="sheet-icon-skull"></i></b> — sheet-icon 은 inline 흡수 X.
  // 결과: <b> 는 inline 매칭 실패 → raw_html fallback (icon 의미 보존).
  const html = `<b><i class="sheet-icon-skull"></i></b>`;
  const r = importSheet({ html });
  assert(
    r.stats.htmlRawFallback >= 1 || r.html.includes('r20_raw_html'),
    `icon-inside-bold should NOT be flattened, xml=${r.html}`,
  );
}

function testI18nChildNotAbsorbed(): void {
  // <b><span data-i18n="key">x</span></b> — i18n 자식 흡수 X.
  const html = `<b><span data-i18n="hello">x</span></b>`;
  const r = importSheet({ html });
  assert(
    r.stats.htmlRawFallback >= 1 || r.html.includes('r20_raw_html'),
    `i18n-inside-bold should NOT be flattened, xml=${r.html}`,
  );
}

function testAnchorInBoldStillRawFallback(): void {
  // <a> 같은 non-emphasis inline 은 흡수 X — 의미 손실 큼.
  const html = `<b>click <a href="x">here</a></b>`;
  const r = importSheet({ html });
  assert(
    r.stats.htmlRawFallback >= 1,
    `<a> in <b> should NOT be flattened, fallback=${r.stats.htmlRawFallback}`,
  );
}

function testNestedBoldInsideLabel(): void {
  // 실제 시트에서 흔한 패턴: <label>HP <b>현재/최대</b></label>.
  const html = `<label>HP <b><i>현재</i>/<i>최대</i></b></label>`;
  const r = importSheet({ html });
  // label 도 hasOnlyTextOrInline, b 도 nested OK → label 통째로 매칭.
  assert(r.html.includes('r20_label'), 'r20_label emitted');
  assert(
    xmlContainsField(r.html, 'TEXT', 'HP 현재 / 최대'),
    `TEXT carries flat nested text (whitespace-normalized), xml=${r.html}`,
  );
}

const tests = [
  ['simple bold (regression)', testSimpleBold],
  ['nested <b><i>...</i></b>', testNestedBoldItalic],
  ['mixed text + inline in <b>', testMixedTextAndInline],
  ['<strong>...<em>...</em>...</strong>', testStrongNested],
  ['<em><b>...</b>...</em>', testItalicNested],
  ['span with nested <b>', testSpanNested],
  ['label with nested <b>', testLabelNested],
  ['<b>foo<br>bar</b>', testBrInBold],
  ['deep nested inline', testDeepNested],
  ['icon NOT absorbed', testIconNotAbsorbed],
  ['i18n child NOT absorbed', testI18nChildNotAbsorbed],
  ['anchor in bold → raw fallback', testAnchorInBoldStillRawFallback],
  ['label with nested <b><i>x</i>/<i>y</i></b>', testNestedBoldInsideLabel],
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

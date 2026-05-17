/**
 * r20_i18n_text DEFAULT 추출 — nested inline (b/strong/em) 보존 회귀 test.
 *
 * 회귀 배경:
 *   - matchI18n 의 data-i18n DEFAULT 추출이 firstTextContent() 를 사용 →
 *     <td data-i18n="@x"><b>Bold</b></td> 같은 케이스에서 DEFAULT 빈 문자열.
 *   - 영시영 1부 측정에서 DEFAULT empty 17 건 → 1 건으로 떨어져야 함.
 *
 * Fix: matchI18n DEFAULT 추출 firstTextContent → allTextContent(...).trim()
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

function testEmptyI18nStaysEmpty(): void {
  // <td data-i18n="@x"></td> — DEFAULT 비어있어야 함 (정상 케이스).
  const html = `<td data-i18n="@empty"></td>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text emitted');
  assert(xmlContainsField(r.html, 'KEY', '@empty'), 'KEY carried');
  assert(xmlContainsField(r.html, 'DEFAULT', ''), 'DEFAULT empty stays empty');
}

function testPlainI18nText(): void {
  // <td data-i18n="@x">Plain</td> — 일반 텍스트 보존 (회귀).
  const html = `<td data-i18n="@plain">Plain</td>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text emitted');
  assert(
    xmlContainsField(r.html, 'DEFAULT', 'Plain'),
    `DEFAULT=Plain expected, xml=${r.html}`,
  );
}

function testNestedBoldInI18n(): void {
  // 핵심 fix — <td data-i18n="@x"><b>Bold</b></td> DEFAULT="Bold".
  const html = `<td data-i18n="@bold"><b>Bold</b></td>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text emitted');
  assert(
    xmlContainsField(r.html, 'DEFAULT', 'Bold'),
    `DEFAULT should be "Bold" (nested <b>), xml=${r.html}`,
  );
}

function testNestedStrongInI18n(): void {
  // <span data-i18n="@x"><strong>Important</strong></span>.
  const html = `<span data-i18n="@imp"><strong>Important</strong></span>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text emitted');
  assert(
    xmlContainsField(r.html, 'DEFAULT', 'Important'),
    `DEFAULT should be "Important" (nested <strong>), xml=${r.html}`,
  );
}

function testNestedEmInI18n(): void {
  // <div data-i18n="@x"><em>note</em></div>.
  const html = `<div data-i18n="@note"><em>note</em></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text emitted');
  assert(
    xmlContainsField(r.html, 'DEFAULT', 'note'),
    `DEFAULT should be "note" (nested <em>), xml=${r.html}`,
  );
}

function testMixedTextAndNested(): void {
  // <td data-i18n="@hp">HP <b>now</b>/<b>max</b></td> — text + nested.
  const html = `<td data-i18n="@hp">HP <b>now</b>/<b>max</b></td>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text emitted');
  // allTextContent 는 token 사이 space 정규화 — "HP now / max" 또는 유사.
  const m = r.html.match(/name="DEFAULT"[^>]*>([^<]*)</);
  assert(m !== null, `DEFAULT field present, xml=${r.html}`);
  const def = m![1];
  assert(def.includes('HP'), `DEFAULT contains HP, got "${def}"`);
  assert(def.includes('now'), `DEFAULT contains now, got "${def}"`);
  assert(def.includes('max'), `DEFAULT contains max, got "${def}"`);
}

function testWhitespaceTrimmed(): void {
  // <span data-i18n="@x">  spaced  </span> — 양끝 trim 적용.
  const html = `<span data-i18n="@s">   spaced   </span>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text emitted');
  // trim 적용 후 DEFAULT 가 leading/trailing space 없어야.
  const m = r.html.match(/name="DEFAULT"[^>]*>([^<]*)</);
  assert(m !== null, 'DEFAULT field present');
  assert(
    m![1] === 'spaced' || m![1] === 'spaced ',
    `DEFAULT trimmed, got "${m![1]}"`,
  );
}

const tests = [
  ['empty data-i18n stays empty', testEmptyI18nStaysEmpty],
  ['plain text data-i18n (regression)', testPlainI18nText],
  ['nested <b> in data-i18n', testNestedBoldInI18n],
  ['nested <strong> in data-i18n', testNestedStrongInI18n],
  ['nested <em> in data-i18n', testNestedEmInI18n],
  ['mixed text + nested inline', testMixedTextAndNested],
  ['whitespace trimmed', testWhitespaceTrimmed],
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

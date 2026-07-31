/**
 * wrapper_td_preserve — table wrapper td/th data-i18n 보존 회귀 테스트.
 *
 * 회귀 배경 (P0 #1 / fixtureC_1bu_structural §5):
 *   - legacy-sheet-corpus legacy corpus에서 593 `<td data-i18n>` + 7 `<th data-i18n>` = 600 wrapper.
 *   - matcher 가 TAG 필드 없이 r20_i18n_text 만 박으면 emit 가 `<span>` 으로
 *     평탄화 → `<tr>` 안 직속 span 은 브라우저 파서가 표 외부로 hoist →
 *     표 행 1122 element 시각 영향. 모든 표 사용 시트 (CoC / D&D / 인세인 /
 *     legacy-sheet-corpus 등) 공통 문제.
 *
 * Fix (already landed in 56bf050 — table_multiclass.test.ts 도 일부 커버):
 *   1. block_matcher.ts matchI18n: <td data-i18n> / <th data-i18n> 매칭 시
 *      TAG 필드에 원본 태그 저장 ('td' 또는 'th').
 *   2. lib/blocks/i18n.ts r20_i18n_text 정의: TAG 필드 + pickI18nTextTag —
 *      허용 태그 (span/div/label/strong/b/em/small/p/td/th) 만 통과,
 *      나머지는 'span' fallback (backwards-compat).
 *
 * 본 테스트는 import 차원에서 TAG 필드가 모든 wrapper 케이스에 박히는지 검증.
 * legacy-sheet-corpus hardcoding 0 — 모든 표 사용 시트 generic.
 *
 * 외부 의존 0 — Node + tsx 로 직접 실행 가능.
 */

import { importSheet } from '../index';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function fieldValue(xml: string, key: string): string | null {
  const re = new RegExp(`<field[^>]*name="${key}"[^>]*>([^<]*)</field>`);
  const m = xml.match(re);
  return m ? m[1] : null;
}

function allFieldValues(xml: string, key: string): string[] {
  const re = new RegExp(`<field[^>]*name="${key}"[^>]*>([^<]*)</field>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

function countBlock(xml: string, blockType: string): number {
  const re = new RegExp(`<block[^>]*type="${blockType}"`, 'g');
  return (xml.match(re) || []).length;
}

// --- 단일 wrapper TAG 보존 ------------------------------------------------

function testTdDataI18nTagField(): void {
  const html = `<table><tbody><tr><td data-i18n="char-name">이름</td></tr></tbody></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text matched');
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'td', `TAG should be 'td', got "${tag}"`);
  const key = fieldValue(r.html, 'KEY');
  assert(key === 'char-name', `KEY preserved, got "${key}"`);
  const def = fieldValue(r.html, 'DEFAULT');
  assert(def === '이름', `DEFAULT preserved, got "${def}"`);
}

function testThDataI18nTagField(): void {
  const html = `<table><thead><tr><th data-i18n="san">SAN</th></tr></thead></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text matched');
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'th', `TAG should be 'th', got "${tag}"`);
}

function testSpanDataI18nDefaultTag(): void {
  const html = `<span data-i18n="key">텍스트</span>`;
  const r = importSheet({ html });
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'span', `TAG should be 'span' for span wrapper, got "${tag}"`);
}

function testDivDataI18nTag(): void {
  const html = `<div data-i18n="lbl">x</div>`;
  const r = importSheet({ html });
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'div', `TAG should be 'div', got "${tag}"`);
}

function testLabelDataI18nTag(): void {
  const html = `<label data-i18n="lbl">x</label>`;
  const r = importSheet({ html });
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'label', `TAG should be 'label', got "${tag}"`);
}

// --- tr/td 표 구조 보존 ---------------------------------------------------

function testTrTdMixedRoundTrip(): void {
  const html = `<table><tbody><tr><td data-i18n="char-name">이름</td><td><input type="text" name="attr_name"></td></tr></tbody></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_table'), 'r20_table');
  assert(r.html.includes('r20_tbody'), 'r20_tbody');
  assert(r.html.includes('r20_tr'), 'r20_tr');
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text for td-wrapper');
  assert(r.html.includes('r20_td'), 'r20_td for input td');
  assert(r.html.includes('r20_text_input'), 'r20_text_input inside td');
  const tags = allFieldValues(r.html, 'TAG');
  assert(tags.includes('td'), `TAG=td present in fields: ${tags.join(',')}`);
}

function testNestedTheadTbodyTr(): void {
  const html = `<table><thead><tr><th data-i18n="hdr">제목</th></tr></thead><tbody><tr><td data-i18n="row">행</td></tr></tbody></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_thead'), 'r20_thead');
  assert(r.html.includes('r20_tbody'), 'r20_tbody');
  assert(countBlock(r.html, 'r20_i18n_text') >= 2, 'i18n_text x2');
  const tags = allFieldValues(r.html, 'TAG');
  assert(tags.includes('th') && tags.includes('td'), `both th + td present, got ${tags.join(',')}`);
}

// --- 능력치 표 (composite-ish) round-trip --------------------------------

function testAbilityStatTable(): void {
  const html = `<table>
    <thead><tr><th data-i18n="stat-name">능력</th><th data-i18n="stat-val">값</th></tr></thead>
    <tbody>
      <tr><td data-i18n="str">근력</td><td><input type="number" name="attr_str"></td></tr>
      <tr><td data-i18n="dex">민첩</td><td><input type="number" name="attr_dex"></td></tr>
      <tr><td data-i18n="con">건강</td><td><input type="number" name="attr_con"></td></tr>
    </tbody>
  </table>`;
  const r = importSheet({ html });
  assert(countBlock(r.html, 'r20_i18n_text') >= 2, `i18n_text >= 2, got ${countBlock(r.html, 'r20_i18n_text')}`);
  const tags = allFieldValues(r.html, 'TAG');
  assert(tags.filter((t) => t === 'th').length >= 2, `th>=2, got ${tags}`);
  assert(tags.includes('td') || r.html.includes('r20_attribute_card'), `td present or composite packing, tags=${tags}`);
}

// --- multi-class wrapper td -----------------------------------------------

function testTdMultiClassDataI18n(): void {
  const html = `<td class="sheet-bold sheet-cell" data-i18n="key">텍스트</td>`;
  const r = importSheet({ html });
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'td', `TAG=td, got "${tag}"`);
  const cls = fieldValue(r.html, 'CLASS');
  assert(cls === 'bold cell', `CLASS=bold cell, got "${cls}"`);
}

// --- style preservation in td wrapper -------------------------------------

function testTdDataI18nStylePreserved(): void {
  const html = `<td data-i18n="x" style="font-weight:bold">이름</td>`;
  const r = importSheet({ html });
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'td', `TAG=td, got "${tag}"`);
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'font-weight:bold', `STYLE preserved, got "${style}"`);
}

// --- repeating section 안 td data-i18n -----------------------------------

function testRepeatingSectionTdI18n(): void {
  const html = `<fieldset class="repeating_weapons"><table><tbody><tr><td data-i18n="w-name">이름</td><td><input type="text" name="attr_name"></td></tr></tbody></table></fieldset>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_repeating_section'), 'r20_repeating_section');
  assert(r.html.includes('r20_i18n_text'), 'i18n_text inside');
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'td', `TAG=td preserved in repeating, got "${tag}"`);
}

// --- runner ---------------------------------------------------------------

const tests: ReadonlyArray<readonly [string, () => void]> = [
  ['<td data-i18n> → TAG=td', testTdDataI18nTagField],
  ['<th data-i18n> → TAG=th', testThDataI18nTagField],
  ['<span data-i18n> → TAG=span (fallback)', testSpanDataI18nDefaultTag],
  ['<div data-i18n> → TAG=div', testDivDataI18nTag],
  ['<label data-i18n> → TAG=label', testLabelDataI18nTag],
  ['<tr><td data-i18n><td><input> mixed', testTrTdMixedRoundTrip],
  ['nested thead/tbody/tr with th+td data-i18n', testNestedTheadTbodyTr],
  ['능력치 표 (3 stat rows)', testAbilityStatTable],
  ['<td class="X Y" data-i18n> multi-class', testTdMultiClassDataI18n],
  ['<td data-i18n style="..."> STYLE 필드 보존', testTdDataI18nStylePreserved],
  ['repeating_section 안 <td data-i18n>', testRepeatingSectionTdI18n],
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

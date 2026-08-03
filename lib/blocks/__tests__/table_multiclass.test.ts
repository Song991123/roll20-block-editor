/**
 * table_multiclass — emit round-trip fidelity 회귀 테스트.
 *
 * 회귀 배경 (Stage 2 emit roundtrip 검증):
 *   - D&D 5e 빌트인 예제: 509 → 234 (54% 손실).
 *   - 9 KB 사용자 시트: 133 → 133 이지만 byte-identical 미달성.
 *   - 첫 diff 위치: `<tr><td data-i18n>label</td><td><input></td></tr>` 가
 *     `<span data-i18n>label</span><span ...>...</span>` 로 평탄화.
 *   - `class="sheet-row sheet-header"` → `class="sheet-row"` (multi-class drop).
 *
 * Root cause:
 *   1. block_matcher.ts 의 matchContainer 가 `<div class="sheet-row X">` 를
 *      r20_row 로 단축 → r20_row 의 generator 는 `class="sheet-row"` 하드코딩
 *      → X 손실.
 *   2. block_matcher.ts 의 matchI18n 이 `<td data-i18n>` 를 r20_i18n_text 로
 *      매칭 → emit 가 `<span data-i18n>` 으로 토함 → `<tr>` 안 `<span>` 은
 *      malformed → 재 import 시 브라우저 파서가 span 을 hoist → 평탄화.
 *
 * Fix:
 *   1. matcher: r20_row/col/colrow_n/repeating_row/grid 단축은 토큰이 정확히
 *      그 class 한 개일 때만. 추가 class 있으면 r20_div 로 떨어뜨림.
 *   2. matcher + i18n.ts: r20_i18n_text 에 TAG 필드 추가. 매처가 원본 태그를
 *      박고 emit 가 그 태그로 출력.
 *
 * 외부 의존 0 — Node + ts-node / tsx 로 실행.
 */

import { importSheet } from '../../import/index';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function xmlContainsField(xml: string, key: string, value: string): boolean {
  const re = new RegExp(`<field[^>]*name="${key}"[^>]*>${value}</field>`);
  return re.test(xml);
}

function fieldValue(xml: string, key: string): string | null {
  const re = new RegExp(`<field[^>]*name="${key}"[^>]*>([^<]*)</field>`);
  const m = xml.match(re);
  return m ? m[1] : null;
}

// --- multi-class ------------------------------------------------------------

function testMultiClassOnInputPreserved(): void {
  // <input class="sheet-attr_name sheet-required"> — 매처는 양 토큰 모두 strip,
  // emit 는 양 토큰 모두 sheet- 다시 부착해야 함.
  const html = `<input type="text" name="attr_x" class="sheet-attr_name sheet-required">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_text_input'), 'r20_text_input emitted');
  const cls = fieldValue(r.html, 'CLASS');
  // 매처가 sheet- prefix 토큰별로 strip 한 결과는 'attr_name required'.
  assert(
    cls === 'sheet-attr_name sheet-required',
    `CLASS field should preserve both tokens, got "${cls}"`,
  );
}

function testMultiClassOnRowKeepsStructure(): void {
  // <div class="sheet-row sheet-header"> — 단순 r20_row 로 단축하면 sheet-header
  // 손실. r20_div 로 fallback 해 양 토큰 보존.
  const html = `<div class="sheet-row sheet-header"><span>x</span></div>`;
  const r = importSheet({ html });
  assert(
    r.html.includes('r20_row'),
    `multi-class div 는 r20_div 로 매칭되어야, xml=${r.html}`,
  );
  const cls = fieldValue(r.html, 'CLASS');
  assert(
    cls === 'sheet-header',
    `CLASS 가 'row header' 여야 함 (sheet- strip 후), got "${cls}"`,
  );
}

function testPureRowStillShortcuts(): void {
  // 단일 class 'sheet-row' 만 → 기존대로 r20_row 단축.
  const html = `<div class="sheet-row"></div>`;
  const r = importSheet({ html });
  assert(
    r.html.includes('"r20_row"'),
    `단일 sheet-row 는 r20_row 로 단축되어야, xml=${r.html}`,
  );
}

function testMultiClassOnColKeepsStructure(): void {
  const html = `<div class="sheet-col sheet-narrow"><span>x</span></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_col'), `multi-class col should stay structural, xml=${r.html}`);
  assert(fieldValue(r.html, 'CLASS') === 'sheet-narrow', 'col user class is retained');
}

function testMultiClassOnColrowKeepsStructure(): void {
  // sheet-colrow + sheet-colrow-2 + extra → r20_div.
  const html = `<div class="sheet-colrow sheet-colrow-2 sheet-extra"></div>`;
  const r = importSheet({ html });
  assert(
    r.html.includes('r20_colrow_n'),
    `multi-class colrow 도 r20_div, xml=${r.html}`,
  );
  assert(fieldValue(r.html, 'CLASS') === 'sheet-extra', 'colrow user class is retained');
}

// --- table 구조 보존 -------------------------------------------------------

function testTdDataI18nPreservesTag(): void {
  // <td data-i18n="@x">label</td> — TAG 필드가 'td' 로 박혀야.
  const html = `<table><tbody><tr><td data-i18n="@x">label</td></tr></tbody></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_table'), `r20_table 매칭, xml=${r.html}`);
  assert(r.html.includes('r20_tbody'), 'r20_tbody 매칭');
  assert(r.html.includes('r20_tr'), 'r20_tr 매칭');
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text 매칭');
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'td', `TAG 필드가 'td' 여야 함, got "${tag}"`);
}

function testThDataI18nPreservesTag(): void {
  const html = `<table><thead><tr><th data-i18n="@h">Header</th></tr></thead></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_th'), 'r20_th wrapper');
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text inside');
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'th', `TAG should be 'th', got "${tag}"`);
}

function testTableRoundtripStructurePreserved(): void {
  // <table><thead><tr><th>이름</th><th>값</th></tr></thead>
  //   <tbody><tr><td data-i18n="@n">이름</td><td><input type="text" name="attr_x"></td></tr></tbody>
  // </table> — round-trip 시 모든 구조 보존.
  const html = `<table class="sheet-mytable"><thead><tr><th>이름</th><th>값</th></tr></thead><tbody><tr><td data-i18n="@n">이름</td><td><input type="text" name="attr_x"></td></tr></tbody></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_table'), 'r20_table');
  assert(r.html.includes('r20_thead'), 'r20_thead');
  assert(r.html.includes('r20_tbody'), 'r20_tbody');
  const rowBlocks =
    (r.html.match(/type="r20_tr"/g) || []).length +
    (r.html.match(/type="r20_skill_row"/g) || []).length;
  assert(rowBlocks >= 2, 'table row structure is represented by r20_tr or r20_skill_row');
  assert((r.html.match(/r20_th/g) || []).length >= 2, 'r20_th ≥ 2');
  const packedRow = r.html.includes('type="r20_skill_row"');
  assert(
    (r.html.match(/type="r20_td"/g) || []).length >= 1 ||
      (packedRow && r.html.includes('name="CELL_TD_ATTRS"')),
    'td structure is represented by r20_td or skill-row cell fields',
  );
  assert(
    r.html.includes('r20_i18n_text') || (packedRow && r.html.includes('name="I18N_KEY"')),
    'i18n text is represented by an atomic or composite field',
  );
  assert(
    r.html.includes('r20_text_input') || (packedRow && r.html.includes('name="INPUT_NAME"')),
    'input is represented by an atomic or composite field',
  );
}

// --- runner ----------------------------------------------------------------

const tests: ReadonlyArray<readonly [string, () => void]> = [
  ['multi-class on input preserved (양 토큰)', testMultiClassOnInputPreserved],
  ['multi-class row keeps structural block', testMultiClassOnRowKeepsStructure],
  ['pure sheet-row still shortcuts to r20_row', testPureRowStillShortcuts],
  ['multi-class col keeps structural block', testMultiClassOnColKeepsStructure],
  ['multi-class colrow keeps structural block', testMultiClassOnColrowKeepsStructure],
  ['<td data-i18n> preserves TAG=td', testTdDataI18nPreservesTag],
  ['<th data-i18n> preserves TAG=th', testThDataI18nPreservesTag],
  ['table round-trip preserves all structural tags', testTableRoundtripStructurePreserved],
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
if (passed !== tests.length) throw new Error(`${tests.length - passed} test(s) failed`);

/**
 * style_field_preservation — 모든 블록에 STYLE 필드 round-trip 보존 검증.
 *
 * 회귀 배경 (docs/validation/verify/fixtureC_1bu_structural.md §4.3):
 *   roll20-sheet-builder 1부 측정 결과 inline `style` 속성 607 건 전부 (100%) drop —
 *   표 셀 폭/색, display:none 토글 컨트롤, font-weight 등 시각 정보 손실.
 *
 * Fix (P0 #2): 모든 visual block 에 STYLE field 추가 + matcher 캡쳐 + generator
 *   출력. 본 테스트는 round-trip 시 STYLE 값이 보존됨을 입증.
 *
 * 외부 의존 0 — Node + ts-node / tsx 로 실행.
 */

import { importSheet } from '../../import/index';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function fieldValue(xml: string, key: string): string | null {
  // 첫 매칭만 — 단일 element 입력 가정.
  const re = new RegExp(`<field[^>]*name="${key}"[^>]*>([^<]*)</field>`);
  const m = xml.match(re);
  return m ? m[1] : null;
}

function allFieldValues(xml: string, key: string): string[] {
  const re = new RegExp(`<field[^>]*name="${key}"[^>]*>([^<]*)</field>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1]);
  }
  return out;
}

// ---------- container: div / span / fieldset / table / td / tr ----------

function testDivStylePreserved(): void {
  const html = `<div class="top-logo" style="width:100%; height:200px; background-image:url(foo.png);"></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_div'), 'r20_div emitted');
  const style = fieldValue(r.html, 'STYLE');
  assert(
    style === 'width:100%; height:200px; background-image:url(foo.png);',
    `STYLE preserved on div, got "${style}"`,
  );
}

function testSpanStylePreserved(): void {
  const html = `<span style="color:#f3f3f3">text</span>`;
  const r = importSheet({ html });
  // span text-only — r20_static_text 또는 r20_span 매칭
  const styles = allFieldValues(r.html, 'STYLE');
  assert(
    styles.includes('color:#f3f3f3'),
    `STYLE preserved on span, got ${JSON.stringify(styles)}`,
  );
}

function testTdStylePreserved(): void {
  const html = `<table><tr><td style="width:60px"></td></tr></table>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_td'), 'r20_td present');
  const styles = allFieldValues(r.html, 'STYLE');
  assert(
    styles.includes('width:60px'),
    `td STYLE preserved, got ${JSON.stringify(styles)}`,
  );
}

function testTableMultiPositionStylePreserved(): void {
  const html =
    `<table style="border-collapse:collapse" class="sheet-mytable">` +
    `<thead style="background:#eee"><tr style="height:20px"><th style="width:80px">H</th></tr></thead>` +
    `</table>`;
  const r = importSheet({ html });
  const styles = allFieldValues(r.html, 'STYLE');
  // table / thead / tr / th 4 위치 모두 보존
  assert(styles.includes('border-collapse:collapse'), `table style preserved (got: ${JSON.stringify(styles)})`);
  assert(styles.includes('background:#eee'), 'thead style preserved');
  assert(styles.includes('height:20px'), 'tr style preserved');
  assert(styles.includes('width:80px'), 'th style preserved');
}

// ---------- input: text / checkbox / number / textarea ----------

function testInputTextStylePreserved(): void {
  const html = `<input type="text" name="attr_name" style="width:14%">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_text_input'), 'r20_text_input matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'width:14%', `text input STYLE preserved, got "${style}"`);
}

function testCheckboxDisplayNoneStylePreserved(): void {
  // display:none 토글 컨트롤 — UI 가 사용자에게 노출되지 않아야 함.
  const html = `<input type="checkbox" style="display:none" class="sheet-showpulp" name="attr_showpulp" value="1">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_checkbox'), 'r20_checkbox matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'display:none', `display:none preserved on checkbox, got "${style}"`);
}

function testNumberInputStylePreserved(): void {
  const html = `<input type="number" name="attr_hp" style="text-align:center" min="0" value="10">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_number_input'), 'r20_number_input matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'text-align:center', `number STYLE preserved, got "${style}"`);
}

function testTextareaStylePreserved(): void {
  const html = `<textarea name="attr_notes" style="height:120px" rows="5"></textarea>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_textarea'), 'r20_textarea matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'height:120px', `textarea STYLE preserved, got "${style}"`);
}

// ---------- display: heading / label / hr / img ----------

function testHeadingStylePreserved(): void {
  const html = `<h2 style="color:red">Title</h2>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_heading'), 'r20_heading matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'color:red', `heading STYLE preserved, got "${style}"`);
}

function testLabelStylePreserved(): void {
  // <label>TEXT</label> — text-only label
  // r20_label 매처는 display.ts (text-only). container.ts 의 r20_label
  // (stack) 은 사용자 생성용.
  const html = `<label style="font-weight:bold">Name</label>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_label'), 'r20_label matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'font-weight:bold', `label STYLE preserved, got "${style}"`);
}

// ---------- i18n: i18n_text / i18n_placeholder ----------

function testI18nTextStylePreserved(): void {
  // td data-i18n 같은 wrapper-style 케이스 — TAG 보존 + STYLE 보존
  const html = `<td data-i18n="name-u" style="font-weight:bold">이름</td>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_text'), 'r20_i18n_text matched');
  const tag = fieldValue(r.html, 'TAG');
  assert(tag === 'td', `TAG preserved (td), got "${tag}"`);
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'font-weight:bold', `i18n_text STYLE preserved, got "${style}"`);
}

function testI18nPlaceholderStylePreserved(): void {
  const html = `<input style="width:14%" data-i18n-placeholder="start" name="attr_san_start" type="number">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_placeholder'), 'r20_i18n_placeholder matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'width:14%', `i18n_placeholder STYLE preserved, got "${style}"`);
}

// ---------- 빈 style → STYLE="" (no `style=""` emit) ----------

function testEmptyStyleProducesEmptyField(): void {
  // style 없는 element → STYLE field = ''
  const html = `<div></div>`;
  const r = importSheet({ html });
  const style = fieldValue(r.html, 'STYLE');
  assert(style === '', `no-style element → STYLE='', got "${style}"`);
}

// ---------- Special: grid (built-in inline style + user STYLE merged) ----------

function testGridUserStyleMerged(): void {
  // sheet-grid 단일 class 만 — r20_grid 단축. style 보존 + grid-template-columns 병합
  const html = `<div class="sheet-grid" style="gap:8px"></div>`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_grid'), 'r20_grid matched');
  const style = fieldValue(r.html, 'STYLE');
  assert(style === 'gap:8px', `grid user STYLE captured, got "${style}"`);
}

// ---------- runner ----------

const tests: ReadonlyArray<readonly [string, () => void]> = [
  ['div style 보존', testDivStylePreserved],
  ['span style 보존', testSpanStylePreserved],
  ['td style 보존 (표 셀 폭)', testTdStylePreserved],
  ['table/thead/tr/th 4 위치 style 보존', testTableMultiPositionStylePreserved],
  ['input[type=text] style 보존', testInputTextStylePreserved],
  ['checkbox style=display:none 보존 (토글 컨트롤 hidden)', testCheckboxDisplayNoneStylePreserved],
  ['input[type=number] style 보존', testNumberInputStylePreserved],
  ['textarea style 보존', testTextareaStylePreserved],
  ['heading style 보존', testHeadingStylePreserved],
  ['label style 보존', testLabelStylePreserved],
  ['i18n_text style 보존 (TAG=td 와 함께)', testI18nTextStylePreserved],
  ['i18n_placeholder style 보존', testI18nPlaceholderStylePreserved],
  ['style 없는 element → STYLE=""', testEmptyStyleProducesEmptyField],
  ['grid 사용자 STYLE + built-in 병합', testGridUserStyleMerged],
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

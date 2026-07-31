/**
 * r20_i18n_placeholder — name / class / type 보존 회귀 테스트.
 *
 * 배경:
 *   직전 검증 세션에서 legacy-sheet-corpus legacy corpus import 시 data-i18n-placeholder attribute 가진
 *   input 61 블록 모두 name + class 속성 손실 → Roll20 sheet attr 식별자
 *   (attr_minionhp, attr_current_mental_condition 등) 가 export 후 사라져 sandbox
 *   업로드 시 sheet 동작 깨질 위험.
 *
 * 본 테스트 — import 시 NAME / CLASS / TYPE 캡처되는지 + emit XML 안에 name=...
 * 박힘 확인 (basic.test.ts 와 동일 스타일 — Node 단독 실행, jsdom X).
 *
 * 시스템 specific 토큰 0 — 합성 sample HTML 만 사용.
 */

import { importSheet } from '../index';
import { parseHtml } from '../dom_walker';
import { matchTree, newMatchContext } from '../block_matcher';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

/** XML 안에서 `<field name="X">VALUE</field>` 의 VALUE 추출. */
function getField(xml: string, fieldName: string): string | null {
  const re = new RegExp(
    `<field name="${fieldName}">([^<]*)</field>`,
  );
  const m = re.exec(xml);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Spec 케이스: legacy-sheet-corpus legacy corpus sheet 의 표준 minion HP 패턴.
// ---------------------------------------------------------------------------

function testMatchCapturesAllAttrs(): void {
  // dom_walker → matcher 직접 호출로 매칭 결과 그대로 검사.
  const html =
    `<input type="number" name="attr_minionhp" class="sheet-attr_minionhp" ` +
    `data-i18n-placeholder="@minion_hp" value="10">`;
  const root = parseHtml(html);
  const ctx = newMatchContext();
  const blocks = matchTree(root, ctx);

  assert(blocks.length === 1, `1 block expected, got ${blocks.length}`);
  const b = blocks[0];
  assert(
    b.blockType === 'r20_i18n_placeholder',
    `blockType=r20_i18n_placeholder, got ${b.blockType}`,
  );
  assert(b.fields.KEY === '@minion_hp', `KEY=@minion_hp, got ${b.fields.KEY}`);
  assert(
    b.fields.NAME === 'attr_minionhp',
    `NAME=attr_minionhp (raw, prefix preserved), got ${b.fields.NAME}`,
  );
  assert(
    b.fields.CLASS === 'sheet-attr_minionhp',
    `CLASS=sheet-attr_minionhp (raw, prefix preserved), got ${b.fields.CLASS}`,
  );
  assert(b.fields.TYPE === 'number', `TYPE=number, got ${b.fields.TYPE}`);
  assert(
    b.fields.DEFAULT === '10',
    `DEFAULT=10 (from value attr), got ${b.fields.DEFAULT}`,
  );
}

function testEmitXmlContainsName(): void {
  const html =
    `<input type="number" name="attr_minionhp" class="sheet-attr_minionhp" ` +
    `data-i18n-placeholder="@minion_hp" value="10">`;
  const r = importSheet({ html });
  assert(
    r.html.includes('r20_i18n_placeholder'),
    'r20_i18n_placeholder block emitted',
  );
  // <field name="NAME">attr_minionhp</field>
  assert(
    getField(r.html, 'NAME') === 'attr_minionhp',
    `XML NAME field = attr_minionhp, got: ${getField(r.html, 'NAME')}`,
  );
  assert(
    getField(r.html, 'CLASS') === 'sheet-attr_minionhp',
    `XML CLASS field = sheet-attr_minionhp, got: ${getField(r.html, 'CLASS')}`,
  );
  assert(
    getField(r.html, 'TYPE') === 'number',
    `XML TYPE field = number, got: ${getField(r.html, 'TYPE')}`,
  );
  assert(
    getField(r.html, 'KEY') === '@minion_hp',
    `XML KEY field = @minion_hp, got: ${getField(r.html, 'KEY')}`,
  );
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

function testMatchTextInputPlaceholderOnly(): void {
  // placeholder 만 있는 경우 — value 없으면 DEFAULT 가 placeholder fall through.
  const html =
    `<input type="text" name="attr_alias" data-i18n-placeholder="hint.alias" placeholder="Alias">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_placeholder'), 'block emitted');
  assert(
    getField(r.html, 'NAME') === 'attr_alias',
    `NAME preserved (raw), got: ${getField(r.html, 'NAME')}`,
  );
  assert(
    getField(r.html, 'DEFAULT') === 'Alias',
    `DEFAULT falls back to placeholder, got: ${getField(r.html, 'DEFAULT')}`,
  );
}

function testMultipleInputsBatch(): void {
  // legacy-sheet-corpus legacy corpus 패턴: 여러 minion 슬롯이 같은 패턴으로 반복.
  const html = `
    <input type="number" name="attr_minionhp" class="sheet-attr_minionhp" data-i18n-placeholder="@minion_hp" value="10">
    <input type="number" name="attr_minionhpmax" class="sheet-attr_minionhpmax" data-i18n-placeholder="@minion_hp_max" value="10">
    <input type="text" name="attr_current_mental_condition" class="sheet-attr_current_mental_condition" data-i18n-placeholder="@mental_condition" value="">
    <input type="number" name="attr_minionac" class="sheet-attr_minionac" data-i18n-placeholder="@minion_ac" value="12">
    <input type="text" name="attr_minionspeed" class="sheet-attr_minionspeed" data-i18n-placeholder="@minion_speed" value="30">
  `;
  const r = importSheet({ html });
  const xml = r.html;
  // 5 개 placeholder block.
  const blockCount = (xml.match(/r20_i18n_placeholder/g) || []).length;
  assert(blockCount === 5, `expected 5 placeholder blocks, got ${blockCount}`);
  // 모든 attr_ name 보존.
  const nameRe = /<field name="NAME">attr_[a-z_]+<\/field>/g;
  const nameCount = (xml.match(nameRe) || []).length;
  assert(
    nameCount === 5,
    `expected 5 attr_* NAME fields preserved, got ${nameCount}`,
  );
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback for any');
}

function testEmptyAttrsStillMatch(): void {
  // 최소 케이스 — data-i18n-placeholder 만 있고 name/class 없음.
  // KEY 만 채워지고 NAME/CLASS 는 빈 문자열이어야 함 — 매칭 성공.
  const html = `<input data-i18n-placeholder="key.x">`;
  const r = importSheet({ html });
  assert(r.html.includes('r20_i18n_placeholder'), 'block emitted');
  assert(getField(r.html, 'KEY') === 'key.x', 'KEY preserved');
  assert(getField(r.html, 'NAME') === '', 'NAME empty when not in src');
  assert(r.stats.htmlRawFallback === 0, 'no raw fallback');
}

// ---------------------------------------------------------------------------
// Test runner — basic.test.ts 와 동일 패턴.
// ---------------------------------------------------------------------------

const tests = [
  ['match captures all attrs (NAME/CLASS/TYPE/KEY/DEFAULT)', testMatchCapturesAllAttrs],
  ['emit XML contains name="attr_minionhp"', testEmitXmlContainsName],
  ['placeholder fallback when value missing', testMatchTextInputPlaceholderOnly],
  ['5-input batch preserves all attr_* names', testMultipleInputsBatch],
  ['empty input attrs still match', testEmptyAttrsStillMatch],
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
if (passed !== tests.length) {
  throw new Error(`${tests.length - passed} test(s) failed`);
}

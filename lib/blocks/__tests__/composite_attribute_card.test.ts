/**
 * Composite attribute card emit tests — Phase 1.
 *
 * Anchor: docs/spec/26_composite_blocks.md §3.
 *
 * Pure `renderAttributeCardHtml` 함수만 test (Blockly 의존 0). `composite_attribute_card_emit.ts`
 * 의 self-contained 렌더링 검증.
 *
 * 검증:
 *   1) 표준 시나리오 — label/i18n/input/roll 모두 채움
 *   2) MAX_VALUE 빈 칸 → max td 미emit
 *   3) ROLL_BUTTON_NAME 빈 칸 → roll td 미emit
 *   4) I18N_KEY 빈 칸 → data-i18n 없는 strong
 *   5) ATTR_NAME 비었을 때 빈 문자열 반환 + warning
 *   6) atomic 펼침과 동등 — escape/whitespace 정확
 *
 * legacy-sheet-corpus hardcoding 0.
 */

import {
  renderAttributeCardHtml,
  EMPTY_ATTRIBUTE_CARD_FIELDS,
} from '../composite_attribute_card_emit';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectIncludes(s: string, needle: string, msg: string): void {
  assert(s.includes(needle), `${msg} — "${needle}" not in: ${s}`);
}

function expectNotIncludes(s: string, needle: string, msg: string): void {
  assert(!s.includes(needle), `${msg} — "${needle}" present in: ${s}`);
}

function testFullCard(): void {
  const html = renderAttributeCardHtml({
    ...EMPTY_ATTRIBUTE_CARD_FIELDS,
    LABEL: '근력',
    I18N_KEY: 'STR-u',
    ATTR_NAME: 'str',
    CURRENT_VALUE: '50',
    MAX_VALUE: '99',
    ROLL_BUTTON_NAME: 'str_check',
    ROLL_EXPR: '/r 1d100',
    LABEL_CLASS: 'attr-label',
    INPUT_CLASS: 'attr-input',
  });
  expectIncludes(html, '<td class="attr-label">', 'label td class');
  expectIncludes(html, '<strong data-i18n="STR-u">', 'i18n strong');
  expectIncludes(html, '근력', 'label text');
  expectIncludes(html, 'class="attr-input"', 'input class');
  expectIncludes(html, 'name="attr_str"', 'input name');
  expectIncludes(html, 'value="50"', 'input value');
  expectIncludes(html, 'name="attr_str_max"', 'max name');
  expectIncludes(html, 'value="99"', 'max value');
  expectIncludes(html, '<td class="attr-roll">', 'roll td');
  expectIncludes(html, 'type="roll"', 'roll button');
  expectIncludes(html, 'name="roll_str_check"', 'roll name');
  expectIncludes(html, 'value="/r 1d100"', 'roll expr');
}

function testNoMaxNoRoll(): void {
  const html = renderAttributeCardHtml({
    ...EMPTY_ATTRIBUTE_CARD_FIELDS,
    LABEL: 'HP',
    ATTR_NAME: 'hp',
    CURRENT_VALUE: '10',
  });
  expectIncludes(html, 'name="attr_hp"', 'hp input name');
  expectNotIncludes(html, '_max', 'no max input');
  expectNotIncludes(html, 'type="roll"', 'no roll button');
  expectNotIncludes(html, 'data-i18n', 'no i18n attr (KEY 비었음)');
  expectIncludes(html, '<strong>HP</strong>', 'plain strong with label');
}

function testNoI18nKey(): void {
  const html = renderAttributeCardHtml({
    ...EMPTY_ATTRIBUTE_CARD_FIELDS,
    LABEL: 'My Stat',
    ATTR_NAME: 'mystat',
    CURRENT_VALUE: '0',
  });
  expectNotIncludes(html, 'data-i18n', 'no data-i18n');
  expectIncludes(html, '<strong>My Stat</strong>', 'strong wrapper still present');
}

function testNoLabel(): void {
  const html = renderAttributeCardHtml({
    ...EMPTY_ATTRIBUTE_CARD_FIELDS,
    ATTR_NAME: 'foo',
    CURRENT_VALUE: '0',
  });
  expectNotIncludes(html, '<strong', 'no strong when label empty');
  expectIncludes(html, '<td>', 'empty label td still present');
  expectIncludes(html, 'name="attr_foo"', 'input emitted');
}

function testEmptyAttrName(): void {
  const warnings: Array<{ code: string; msg: string }> = [];
  const html = renderAttributeCardHtml(
    { ...EMPTY_ATTRIBUTE_CARD_FIELDS, LABEL: '근력' },
    (code, _sev, msg) => warnings.push({ code, msg }),
  );
  assert(html === '', `expected empty emit, got: ${html}`);
  assert(warnings.length === 1, `expected 1 warning, got ${warnings.length}`);
  assert(
    warnings[0].code === 'COMPOSITE_ATTR_CARD_NAME_MISSING',
    `warning code: ${warnings[0].code}`,
  );
}

function testEscape(): void {
  const html = renderAttributeCardHtml({
    ...EMPTY_ATTRIBUTE_CARD_FIELDS,
    LABEL: '<test> & "x"',
    I18N_KEY: 'a&b',
    ATTR_NAME: 'x',
    CURRENT_VALUE: '<>',
    ROLL_BUTTON_NAME: 'r',
    ROLL_EXPR: '@{x} & y',
  });
  expectIncludes(html, '&lt;test&gt; &amp; "x"', 'label text escape');
  expectIncludes(html, 'data-i18n="a&amp;b"', 'i18n KEY escape');
  expectIncludes(html, 'value="&lt;&gt;"', 'current value escape');
  expectIncludes(html, 'value="@{x} &amp; y"', 'roll expr escape');
}

function testInvalidAttrNameStripped(): void {
  const warnings: Array<{ code: string; msg: string }> = [];
  const html = renderAttributeCardHtml(
    { ...EMPTY_ATTRIBUTE_CARD_FIELDS, ATTR_NAME: '한글', LABEL: 'x' },
    (code, _sev, msg) => warnings.push({ code, msg }),
  );
  assert(html === '', `expected empty emit for invalid-only ATTR_NAME`);
  assert(
    warnings.some((w) => w.code === 'COMPOSITE_ATTR_CARD_NAME_INVALID'),
    `expected NAME_INVALID warning`,
  );
}

const tests = [
  ['full card', testFullCard],
  ['no max, no roll', testNoMaxNoRoll],
  ['no i18n key', testNoI18nKey],
  ['no label at all', testNoLabel],
  ['empty ATTR_NAME → warning + empty emit', testEmptyAttrName],
  ['HTML escape', testEscape],
  ['invalid ATTR_NAME stripped → empty', testInvalidAttrNameStripped],
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

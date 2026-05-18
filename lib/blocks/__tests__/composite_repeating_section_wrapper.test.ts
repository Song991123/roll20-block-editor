/**
 * Composite repeating section wrapper emit tests — Phase 2.
 *
 * Anchor: docs/spec/26_composite_blocks.md §6 (Phase 2).
 *
 * Pure `renderRepeatingSectionWrapperHtml` 만 test (Blockly 의존 0).
 *
 * 영시영 hardcoding 0 — 모든 fixture 는 generic Roll20 idiom.
 */

import {
  renderRepeatingSectionWrapperHtml,
  parseColumns,
  EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
} from '../composite_repeating_section_wrapper_emit.ts';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectIncludes(s: string, needle: string, msg: string): void {
  assert(s.includes(needle), `${msg} — "${needle}" not in: ${s}`);
}

function expectNotIncludes(s: string, needle: string, msg: string): void {
  assert(!s.includes(needle), `${msg} — "${needle}" present in: ${s}`);
}

function testStandardWrapper(): void {
  const html = renderRepeatingSectionWrapperHtml(
    {
      ...EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
      SECTION_NAME: 'skills',
    },
    '<tr>BODY</tr>',
  );
  expectIncludes(html, '<fieldset class="repeating_skills" name="repeating_skills">', 'open');
  expectIncludes(html, '<tr>BODY</tr>', 'body');
  expectIncludes(html, '</fieldset>', 'close');
  expectNotIncludes(html, '<thead', 'no thead by default');
}

function testHeaderWithI18n(): void {
  const html = renderRepeatingSectionWrapperHtml(
    {
      ...EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
      SECTION_NAME: 'inventory',
      HAS_HEADER: 'TRUE',
      COLUMNS: 'col_name|Name|name-col\ncol_qty|Qty|qty-col\n|Plain Header|',
    },
    '',
  );
  expectIncludes(html, '<thead>', 'thead open');
  expectIncludes(html, '<th class="name-col" data-i18n="col_name">Name</th>', 'i18n th 1');
  expectIncludes(html, '<th class="qty-col" data-i18n="col_qty">Qty</th>', 'i18n th 2');
  expectIncludes(html, '<th>Plain Header</th>', 'plain th');
}

function testExtraFieldsetClass(): void {
  const html = renderRepeatingSectionWrapperHtml(
    {
      ...EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
      SECTION_NAME: 'items',
      FIELDSET_CLASS: 'fancy-bg',
    },
    '',
  );
  expectIncludes(html, 'class="repeating_items fancy-bg"', 'merged class');
  expectIncludes(html, 'name="repeating_items"', 'name attr');
}

function testHeaderClassPreservation(): void {
  const html = renderRepeatingSectionWrapperHtml(
    {
      ...EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
      SECTION_NAME: 'x',
      HAS_HEADER: 'TRUE',
      HEADER_THEAD_CLASS: 'head-wrap',
      HEADER_TR_CLASS: 'head-row',
      COLUMNS: '|H|',
    },
    '',
  );
  expectIncludes(html, '<thead class="head-wrap"><tr class="head-row">', 'thead+tr class preserved');
}

function testEmptyNameSkipsEmit(): void {
  const warnings: Array<{ code: string }> = [];
  const html = renderRepeatingSectionWrapperHtml(
    { ...EMPTY_REPEATING_SECTION_WRAPPER_FIELDS },
    'body',
    (code) => warnings.push({ code }),
  );
  assert(html === '', `expected empty: ${html}`);
  assert(warnings.some((w) => w.code === 'COMPOSITE_REPEATING_WRAPPER_NAME_MISSING'), 'warn');
}

function testSectionNameSanitization(): void {
  // 영문/숫자/_ 외 문자 → 제거 (round-trip 안전).
  const html = renderRepeatingSectionWrapperHtml(
    {
      ...EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
      SECTION_NAME: 'foo-bar.baz',
    },
    '',
  );
  expectIncludes(html, 'class="repeating_foobarbaz"', 'sanitized to foobarbaz');
  expectIncludes(html, 'name="repeating_foobarbaz"', 'name same');
}

function testParseColumns(): void {
  const cols = parseColumns('a|Apple|cls1\n|Bare|\nx|Y');
  assert(cols.length === 3, `len ${cols.length}`);
  assert(cols[0].i18nKey === 'a', `0.key`);
  assert(cols[0].text === 'Apple', `0.text`);
  assert(cols[0].thClass === 'cls1', `0.cls`);
  assert(cols[1].i18nKey === '', `1.key empty`);
  assert(cols[1].text === 'Bare', `1.text`);
  assert(cols[2].thClass === '', `2.cls empty`);
}

function testStyleAttr(): void {
  const html = renderRepeatingSectionWrapperHtml(
    {
      ...EMPTY_REPEATING_SECTION_WRAPPER_FIELDS,
      SECTION_NAME: 'x',
      FIELDSET_STYLE: 'border:1px solid red',
    },
    '',
  );
  expectIncludes(html, 'style="border:1px solid red"', 'style preserved');
}

const tests = [
  ['standard wrapper', testStandardWrapper],
  ['header with i18n columns', testHeaderWithI18n],
  ['extra fieldset class', testExtraFieldsetClass],
  ['header thead/tr class preservation', testHeaderClassPreservation],
  ['empty SECTION_NAME → warn + empty', testEmptyNameSkipsEmit],
  ['SECTION_NAME sanitization', testSectionNameSanitization],
  ['parseColumns', testParseColumns],
  ['fieldset style attr', testStyleAttr],
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

/**
 * Composite skill row emit tests — Phase 2.
 *
 * Anchor: docs/spec/26_composite_blocks.md §6 (Phase 2).
 *
 * Pure `renderSkillRowHtml` 함수만 test (Blockly 의존 0).
 *
 * roll20-sheet-builder hardcoding 0 — 모든 fixture 는 generic Roll20 idiom.
 */

import {
  renderSkillRowHtml,
  EMPTY_SKILL_ROW_FIELDS,
} from '../composite_skill_row_emit.ts';
import { serializePreservedAttributes } from '../preservedAttributes.ts';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function expectIncludes(s: string, needle: string, msg: string): void {
  assert(s.includes(needle), `${msg} — "${needle}" not in: ${s}`);
}

function expectNotIncludes(s: string, needle: string, msg: string): void {
  assert(!s.includes(needle), `${msg} — "${needle}" present in: ${s}`);
}

function testStandardSkillRow(): void {
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    TR_CLASS: 'skill-row',
    HAS_CHECKBOX: 'TRUE',
    CHECKBOX_NAME: 'skill_athletics_check',
    HAS_LABEL: 'TRUE',
    I18N_KEY: 'skill-athletics',
    LABEL_TEXT: 'Athletics',
    LABEL_TAG: 'span',
    HAS_INPUT: 'TRUE',
    INPUT_NAME: 'skill_athletics',
    INPUT_VALUE: '50',
    INPUT_CLASS: 'skill-input',
    HAS_ROLL: 'TRUE',
    ROLL_NAME: 'skill_athletics_check',
    ROLL_EXPR: '/r 1d100',
  });
  expectIncludes(html, '<tr class="skill-row">', 'tr open with class');
  expectIncludes(html, 'type="checkbox"', 'checkbox input');
  expectIncludes(html, 'name="attr_skill_athletics_check"', 'checkbox name');
  expectIncludes(html, '<span data-i18n="skill-athletics">Athletics</span>', 'i18n label span');
  expectIncludes(html, 'name="attr_skill_athletics"', 'input attr name');
  expectIncludes(html, 'value="50"', 'input value');
  expectIncludes(html, 'class="skill-input"', 'input class');
  expectIncludes(html, 'type="roll"', 'roll button');
  expectIncludes(html, 'name="roll_skill_athletics_check"', 'roll name');
  expectIncludes(html, 'value="/r 1d100"', 'roll expr');
  expectIncludes(html, '</tr>', 'tr close');
}

function testInputOnlyMinimal(): void {
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    HAS_INPUT: 'TRUE',
    INPUT_NAME: 'foo',
    INPUT_VALUE: '0',
  });
  expectIncludes(html, '<tr>', 'tr open no class');
  expectIncludes(html, 'name="attr_foo"', 'input name');
  expectNotIncludes(html, 'type="checkbox"', 'no checkbox');
  expectNotIncludes(html, 'data-i18n', 'no i18n');
  expectNotIncludes(html, 'type="roll"', 'no roll');
}

function testNumberInput(): void {
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    HAS_INPUT: 'TRUE',
    INPUT_TYPE: 'number',
    INPUT_NAME: 'hp',
    INPUT_VALUE: '10',
  });
  expectIncludes(html, 'type="number"', 'number input type');
  expectIncludes(html, 'name="attr_hp"', 'input name');
}

function testCheckboxOnly(): void {
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    HAS_CHECKBOX: 'TRUE',
    CHECKBOX_NAME: 'x',
    CHECKBOX_CHECKED: 'TRUE',
    HAS_INPUT: 'TRUE',
    INPUT_NAME: 'x_val',
  });
  expectIncludes(html, 'checked="checked"', 'checked attribute');
  expectIncludes(html, 'name="attr_x"', 'checkbox attr name');
}

function testLabelTdDirect(): void {
  // LABEL_TAG 비어 있고 I18N_KEY 채워져 있으면 td 자체에 data-i18n.
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    HAS_LABEL: 'TRUE',
    I18N_KEY: 'foo',
    LABEL_TEXT: 'Foo',
    HAS_INPUT: 'TRUE',
    INPUT_NAME: 'foo',
  });
  expectIncludes(html, '<td data-i18n="foo">Foo</td>', 'td-direct i18n');
}

function testEmptySkipsEmit(): void {
  const warnings: Array<{ code: string }> = [];
  const html = renderSkillRowHtml(
    { ...EMPTY_SKILL_ROW_FIELDS },
    (code) => warnings.push({ code }),
  );
  assert(html === '', `expected empty emit, got: ${html}`);
  assert(warnings.some((w) => w.code === 'COMPOSITE_SKILL_ROW_EMPTY'), 'expected warning');
}

function testEscape(): void {
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    HAS_LABEL: 'TRUE',
    LABEL_TEXT: '<>&"',
    LABEL_TAG: 'span',
    I18N_KEY: 'a&b',
    HAS_INPUT: 'TRUE',
    INPUT_NAME: 'x',
    INPUT_VALUE: '<>',
    HAS_ROLL: 'TRUE',
    ROLL_NAME: 'r',
    ROLL_EXPR: '@{x} & y',
  });
  expectIncludes(html, 'data-i18n="a&amp;b"', 'i18n key escape');
  expectIncludes(html, '&lt;&gt;&amp;"', 'label text escape');
  expectIncludes(html, 'value="&lt;&gt;"', 'input value escape');
  expectIncludes(html, 'value="@{x} &amp; y"', 'roll expr escape');
}

function testInvalidNameDropsCheckbox(): void {
  const warnings: Array<{ code: string }> = [];
  const html = renderSkillRowHtml(
    {
      ...EMPTY_SKILL_ROW_FIELDS,
      HAS_CHECKBOX: 'TRUE',
      CHECKBOX_NAME: '@!#',
      HAS_INPUT: 'TRUE',
      INPUT_NAME: 'ok',
    },
    (code) => warnings.push({ code }),
  );
  expectNotIncludes(html, 'type="checkbox"', 'checkbox skipped');
  assert(
    warnings.some((w) => w.code === 'COMPOSITE_SKILL_ROW_CHECKBOX_NAME_MISSING'),
    'warning emitted',
  );
}

function testPreservedAttributesReenterEmittedElements(): void {
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    TR_ATTRS: serializePreservedAttributes({ 'data-row-kind': 'skill', 'aria-label': 'Skill row' }),
    CELL_LAYOUT: 'label,input,roll',
    CELL_TD_ATTRS: [
      serializePreservedAttributes({ colspan: '2' }),
      serializePreservedAttributes({ 'data-cell': 'value' }),
      serializePreservedAttributes({ 'data-cell': 'roll' }),
    ].join('\t'),
    HAS_LABEL: 'TRUE',
    I18N_KEY: 'skill-name',
    LABEL_TEXT: 'Name',
    LABEL_ATTRS: serializePreservedAttributes({ 'data-label-kind': 'translated' }),
    HAS_INPUT: 'TRUE',
    INPUT_NAME: 'skill_name',
    INPUT_ATTRS: serializePreservedAttributes({ style: 'width:90%', 'data-hook': 'value' }),
    HAS_ROLL: 'TRUE',
    ROLL_NAME: 'skill_name',
    ROLL_EXPR: '/r 1d100',
    ROLL_ATTRS: serializePreservedAttributes({ 'data-roll-kind': 'skill' }),
  });
  expectIncludes(html, 'data-row-kind="skill"', 'tr attrs emitted');
  expectIncludes(html, 'colspan="2"', 'label td attrs emitted');
  expectIncludes(html, 'data-label-kind="translated"', 'label attrs emitted');
  expectIncludes(html, 'style="width:90%"', 'input attrs emitted');
  expectIncludes(html, 'data-hook="value"', 'input data attr emitted');
  expectIncludes(html, 'data-roll-kind="skill"', 'roll attrs emitted');
}

function testStaticLabelElementSurvivesPacking(): void {
  const html = renderSkillRowHtml({
    ...EMPTY_SKILL_ROW_FIELDS,
    CELL_LAYOUT: 'label,input',
    CELL_TD_ATTRS: '\t',
    HAS_LABEL: 'TRUE',
    LABEL_TEXT: 'Static label',
    LABEL_ATTRS: serializePreservedAttributes({ style: 'font-weight:bold', 'data-label': 'static' }),
    HAS_INPUT: 'TRUE',
    INPUT_NAME: 'value',
  });
  expectIncludes(html, '<span', 'static label element restored');
  expectIncludes(html, 'style="font-weight:bold"', 'static label style preserved');
  expectIncludes(html, 'data-label="static"', 'static label data attr preserved');
}

const tests = [
  ['standard skill row', testStandardSkillRow],
  ['input-only minimal', testInputOnlyMinimal],
  ['number input', testNumberInput],
  ['checkbox + input', testCheckboxOnly],
  ['label td-direct i18n', testLabelTdDirect],
  ['empty fields → warning + empty', testEmptySkipsEmit],
  ['HTML escape', testEscape],
  ['invalid checkbox NAME stripped → skip + warn', testInvalidNameDropsCheckbox],
  ['preserved attrs reenter emitted elements', testPreservedAttributesReenterEmittedElements],
  ['static label element survives packing', testStaticLabelElementSurvivesPacking],
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

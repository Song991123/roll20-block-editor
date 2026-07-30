/**
 * Composite matcher tests — Phase 2 (skill_row + repeating_section_wrapper).
 *
 * Anchor: docs/spec/26_composite_blocks.md §6.
 *
 * 외부 의존 0 — Node + ts-node / tsx 로 실행.
 *
 * 검증:
 *   1) 표준 skill_row 패턴 (checkbox + label + input + roll) → r20_skill_row
 *   2) label + input + roll (체크 없음) → r20_skill_row
 *   3) input-only → r20_skill_row (HAS_INPUT 만 TRUE)
 *   4) td 안 자식 type 이 mixed → atomic 유지 (false-negative)
 *   5) repeating_section + thead 1 tr × th×N → r20_repeating_section_wrapper
 *   6) repeating_section 만 (thead 없음) → wrapper (HAS_HEADER=FALSE)
 *   7) 통계 (collapsed) 정확성
 *
 * roll20-sheet-builder hardcoding 0 — 모든 fixture 는 generic Roll20 idiom.
 */

import type { MatchedBlock } from '../block_matcher.ts';
import { packComposites, newPackStats } from '../composite_matcher.ts';
import { serializePreservedAttributes, PRESERVED_ATTRS_FIELD } from '../../blocks/preservedAttributes.ts';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

// ---------- Fixture builders ----------

function td(cls: string, kids: MatchedBlock[]): MatchedBlock {
  return {
    blockType: 'r20_td',
    fields: { CLASS: cls },
    children: { CONTENT: kids },
  };
}

function th(cls: string, kids: MatchedBlock[]): MatchedBlock {
  return {
    blockType: 'r20_th',
    fields: { CLASS: cls },
    children: { CONTENT: kids },
  };
}

function tr(cls: string, kids: MatchedBlock[]): MatchedBlock {
  return {
    blockType: 'r20_tr',
    fields: { CLASS: cls },
    children: { CONTENT: kids },
  };
}

function thead(cls: string, kids: MatchedBlock[]): MatchedBlock {
  return {
    blockType: 'r20_thead',
    fields: { CLASS: cls },
    children: { CONTENT: kids },
  };
}

function repeatingSection(name: string, kids: MatchedBlock[]): MatchedBlock {
  return {
    blockType: 'r20_repeating_section',
    fields: { NAME: name, STYLE: '' },
    children: { CONTENT: kids },
  };
}

function checkbox(name: string, cls = ''): MatchedBlock {
  return {
    blockType: 'r20_checkbox',
    fields: { NAME: name, CLASS: cls, VALUE: '', CHECKED: 'FALSE' },
    children: {},
  };
}

function i18nText(key: string, def: string, tag = 'span'): MatchedBlock {
  return {
    blockType: 'r20_i18n_text',
    fields: { KEY: key, DEFAULT: def, CLASS: '', TAG: tag },
    children: {},
  };
}

function textInput(name: string, cls = '', def = ''): MatchedBlock {
  return {
    blockType: 'r20_text_input',
    fields: { NAME: name, CLASS: cls, DEFAULT: def },
    children: {},
  };
}

function rollButton(name: string, expr: string): MatchedBlock {
  return {
    blockType: 'r20_roll_button',
    fields: { NAME: name, LABEL: '', CLASS: '' },
    children: {},
    valueInputs: expr
      ? {
          EXPR: {
            blockType: 'r20_literal_string',
            fields: { STR: expr },
            children: {},
          },
        }
      : undefined,
  };
}

function fieldOf(b: MatchedBlock, k: string): string {
  return b.fields?.[k] ?? '';
}

function withAttrs(block: MatchedBlock, attrs: Record<string, string>): MatchedBlock {
  return {
    ...block,
    fields: {
      ...block.fields,
      [PRESERVED_ATTRS_FIELD]: serializePreservedAttributes(attrs),
    },
  };
}

// ---------- Skill row tests ----------

function testStandardSkillRow(): void {
  const trBlock = tr('', [
    td('', [checkbox('skill_x_check')]),
    td('', [i18nText('skill-x', 'Skill X')]),
    td('', [textInput('skill_x', 'sk-input', '50')]),
    td('', [rollButton('skill_x_roll', '/r 1d100')]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed.length === 1, `expected 1, got ${packed.length}`);
  const sr = packed[0];
  assert(sr.blockType === 'r20_skill_row', `type: ${sr.blockType}`);
  assert(fieldOf(sr, 'HAS_CHECKBOX') === 'TRUE');
  assert(fieldOf(sr, 'CHECKBOX_NAME') === 'skill_x_check');
  assert(fieldOf(sr, 'HAS_LABEL') === 'TRUE');
  assert(fieldOf(sr, 'I18N_KEY') === 'skill-x');
  assert(fieldOf(sr, 'LABEL_TEXT') === 'Skill X');
  assert(fieldOf(sr, 'HAS_INPUT') === 'TRUE');
  assert(fieldOf(sr, 'INPUT_NAME') === 'skill_x');
  assert(fieldOf(sr, 'INPUT_VALUE') === '50');
  assert(fieldOf(sr, 'HAS_ROLL') === 'TRUE');
  assert(fieldOf(sr, 'ROLL_NAME') === 'skill_x_roll');
  assert(fieldOf(sr, 'ROLL_EXPR') === '/r 1d100');
}

function testSkillRowNoCheckbox(): void {
  const trBlock = tr('', [
    td('', [i18nText('s', 'S')]),
    td('', [textInput('s', '', '0')]),
    td('', [rollButton('s_r', '/r 1d20')]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed[0].blockType === 'r20_skill_row');
  assert(fieldOf(packed[0], 'HAS_CHECKBOX') === 'FALSE');
}

function testSkillRowLabelInputOnly(): void {
  const trBlock = tr('', [
    td('', [i18nText('s', 'S')]),
    td('', [textInput('s', '', '0')]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed[0].blockType === 'r20_skill_row', `got ${packed[0].blockType}`);
  assert(fieldOf(packed[0], 'HAS_LABEL') === 'TRUE');
  assert(fieldOf(packed[0], 'HAS_INPUT') === 'TRUE');
  assert(fieldOf(packed[0], 'HAS_ROLL') === 'FALSE');
}

function testSkillRowEmptyNameDoesNotPack(): void {
  const trBlock = tr('', [
    td('', [i18nText('s', 'S')]),
    td('', [textInput('', '', '')]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed[0].blockType === 'r20_tr', `should stay tr (input NAME empty)`);
}

function testMultipleSkillRows(): void {
  const make = (n: string) =>
    tr('', [
      td('', [i18nText(`skill-${n}`, `${n}`)]),
      td('', [textInput(`skill_${n}`, '', '0')]),
    ]);
  const packed = packComposites([make('a'), make('b'), make('c')]);
  assert(packed.length === 3);
  assert(packed.every((p) => p.blockType === 'r20_skill_row'));
}

function testUnknownChildDoesNotPack(): void {
  // td 안에 mystery 자식 type — atomic 유지.
  const trBlock = tr('', [
    td('', [i18nText('s', 'S')]),
    td('', [{ blockType: 'r20_select', fields: {}, children: {} }]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed[0].blockType === 'r20_tr', 'kept atomic');
}

function testNumberInput(): void {
  const trBlock = tr('', [
    td('', [i18nText('hp', 'HP')]),
    td('', [
      {
        blockType: 'r20_number_input',
        fields: { NAME: 'hp', CLASS: '', DEFAULT: '0' },
        children: {},
      },
    ]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed[0].blockType === 'r20_skill_row');
  assert(fieldOf(packed[0], 'INPUT_TYPE') === 'number');
}

function testSkillRowKeepsInputStyleAtomic(): void {
  const trBlock = tr('', [
    td('', [i18nText('hp', 'HP')]),
    td('', [withAttrs(textInput('hp', '', '0'), { type: 'text', name: 'attr_hp', style: 'width: 40px' })]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed[0].blockType === 'r20_tr', 'input style must block lossy skill-row packing');
}

function testSkillRowKeepsUnknownInputAttributeAtomic(): void {
  const trBlock = tr('', [
    td('', [i18nText('hp', 'HP')]),
    td('', [withAttrs(textInput('hp', '', '0'), { type: 'text', name: 'attr_hp', 'data-hook': 'field' })]),
  ]);
  const packed = packComposites([trBlock]);
  assert(packed[0].blockType === 'r20_tr', 'unknown input attributes must survive atomically');
}

// ---------- Repeating section wrapper tests ----------

function testRepeatingWrapperWithHeader(): void {
  const sec = repeatingSection('skills', [
    thead('', [
      tr('', [
        th('h', [i18nText('col_a', 'A', 'th')]),
        th('h', [i18nText('col_b', 'B', 'th')]),
      ]),
    ]),
    // body row.
    tr('', [
      td('', [i18nText('s', 'S')]),
      td('', [textInput('s', '', '0')]),
    ]),
  ]);
  const stats = newPackStats();
  const packed = packComposites([sec], stats);
  assert(packed.length === 1, `expected 1, got ${packed.length}`);
  const w = packed[0];
  assert(w.blockType === 'r20_repeating_section_wrapper', `type: ${w.blockType}`);
  assert(fieldOf(w, 'SECTION_NAME') === 'skills');
  assert(fieldOf(w, 'HAS_HEADER') === 'TRUE');
  assert(fieldOf(w, 'COLUMNS').includes('col_a|A|h'), `cols: ${fieldOf(w, 'COLUMNS')}`);
  // remaining CONTENT — body row 가 skill_row 로 packed.
  const content = w.children?.CONTENT ?? [];
  assert(content.length === 1, `body row count: ${content.length}`);
  assert(content[0].blockType === 'r20_skill_row', `body type: ${content[0].blockType}`);
  // packedByType
  assert(
    stats.packedByType['r20_repeating_section_wrapper'] === 1,
    `wrapper packed`,
  );
  assert(stats.packedByType['r20_skill_row'] === 1, `inner skill row packed`);
}

function testRepeatingWrapperNoHeader(): void {
  const sec = repeatingSection('items', [
    tr('', [
      td('', [i18nText('s', 'S')]),
      td('', [textInput('s', '', '0')]),
    ]),
  ]);
  const packed = packComposites([sec]);
  assert(packed[0].blockType === 'r20_repeating_section_wrapper');
  assert(fieldOf(packed[0], 'HAS_HEADER') === 'FALSE');
  assert(fieldOf(packed[0], 'COLUMNS') === '');
}

function testRepeatingWrapperInvalidName(): void {
  // 사용자가 dashed name 으로 변형한 경우 — atomic 유지.
  const sec = repeatingSection('items-new', [
    tr('', [td('', [textInput('x')])]),
  ]);
  const packed = packComposites([sec]);
  assert(
    packed[0].blockType === 'r20_repeating_section',
    `should keep atomic, got ${packed[0].blockType}`,
  );
}

function testStatsBasic(): void {
  const trBlock = tr('', [
    td('', [i18nText('s', 'S')]),
    td('', [textInput('s', '', '0')]),
  ]);
  const stats = newPackStats();
  packComposites([trBlock, trBlock], stats);
  assert(stats.packedByType['r20_skill_row'] === 2, `2 skill rows packed`);
  // 각 tr 의 td 2개 + tr 자체 (collapsed: 2 td per row × 2 rows = 4)
  assert(stats.collapsed >= 4, `collapsed >= 4, got ${stats.collapsed}`);
}

const tests = [
  ['skill_row standard', testStandardSkillRow],
  ['skill_row no checkbox', testSkillRowNoCheckbox],
  ['skill_row label+input only', testSkillRowLabelInputOnly],
  ['skill_row empty NAME → atomic', testSkillRowEmptyNameDoesNotPack],
  ['skill_row multiple', testMultipleSkillRows],
  ['skill_row unknown child → atomic', testUnknownChildDoesNotPack],
  ['skill_row number input', testNumberInput],
  ['skill_row input style stays atomic', testSkillRowKeepsInputStyleAtomic],
  ['skill_row unknown input attr stays atomic', testSkillRowKeepsUnknownInputAttributeAtomic],
  ['repeating wrapper with header', testRepeatingWrapperWithHeader],
  ['repeating wrapper no header', testRepeatingWrapperNoHeader],
  ['repeating wrapper invalid name → atomic', testRepeatingWrapperInvalidName],
  ['stats basic', testStatsBasic],
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

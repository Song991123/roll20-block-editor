/**
 * Composite matcher tests — Phase 1 (r20_attribute_card).
 *
 * Anchor: docs/spec/26_composite_blocks.md §4.
 *
 * 외부 의존 0 — Node + ts-node / tsx 로 실행. Blockly 미사용 (matcher 는
 * MatchedBlock 트리 조작만).
 *
 * 검증:
 *   1) 표준 영시영 능력치 카드 chain → r20_attribute_card 1 개로 packing
 *   2) max input 포함 케이스
 *   3) 인식 안 되는 케이스 (mismatched name prefix / 다른 자식 type) → atomic 유지
 *   4) packComposites 통계 정확성
 *   5) 재귀 — children chain (예: tr 안의 td chain) 도 packing
 *
 * 영시영 hardcoding 0 — 모든 fixture 는 generic Roll20 idiom 만.
 */

import type { MatchedBlock } from '../block_matcher';
import { packComposites, newPackStats } from '../composite_matcher';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

// ---------------------------------------------------------------------------
// Fixture builders — atomic chain 을 손으로 짜서 matcher 가 처리하게.
// ---------------------------------------------------------------------------

function td(cls: string, children: MatchedBlock[]): MatchedBlock {
  return {
    blockType: 'r20_td',
    fields: { CLASS: cls },
    children: { CONTENT: children },
  };
}

function i18nText(key: string, def: string): MatchedBlock {
  return {
    blockType: 'r20_i18n_text',
    fields: { KEY: key, DEFAULT: def, CLASS: '' },
    children: {},
  };
}

function inlineBold(text: string): MatchedBlock {
  return {
    blockType: 'r20_inline_bold',
    fields: { TEXT: text, CLASS: '' },
    children: {},
  };
}

function textInput(name: string, cls: string, def: string): MatchedBlock {
  return {
    blockType: 'r20_text_input',
    fields: { NAME: name, CLASS: cls, DEFAULT: def },
    children: {},
  };
}

function rollButton(name: string, label: string, expr: string): MatchedBlock {
  return {
    blockType: 'r20_roll_button',
    fields: { NAME: name, LABEL: label, CLASS: '' },
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

function fieldOf(b: MatchedBlock, name: string): string {
  return b.fields?.[name] ?? '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function testStandardI18nAttributeCard(): void {
  // <td class="attr-label"><strong data-i18n="STR-u">근력</strong></td>
  // <td><input class="attr-input" type="text" name="attr_str" value="50"/></td>
  // <td class="attr-roll"><button type="roll" name="roll_str_check" value="..."/></td>
  // → r20_attribute_card 1개 (3개 td 소비)
  const chain: MatchedBlock[] = [
    td('attr-label', [i18nText('STR-u', '근력')]),
    td('', [textInput('str', 'attr-input', '50')]),
    td('attr-roll', [rollButton('str_check', '', '/r 1d100')]),
  ];
  const stats = newPackStats();
  const packed = packComposites(chain, stats);
  assert(packed.length === 1, `expected 1 composite, got ${packed.length}`);
  const card = packed[0];
  assert(
    card.blockType === 'r20_attribute_card',
    `expected r20_attribute_card, got ${card.blockType}`,
  );
  assert(fieldOf(card, 'LABEL') === '근력', `LABEL mismatch: ${fieldOf(card, 'LABEL')}`);
  assert(fieldOf(card, 'I18N_KEY') === 'STR-u', `I18N_KEY mismatch`);
  assert(fieldOf(card, 'ATTR_NAME') === 'str', `ATTR_NAME mismatch`);
  assert(fieldOf(card, 'CURRENT_VALUE') === '50', `CURRENT_VALUE mismatch`);
  assert(fieldOf(card, 'MAX_VALUE') === '', `MAX_VALUE should be empty`);
  assert(
    fieldOf(card, 'ROLL_BUTTON_NAME') === 'str_check',
    `ROLL_BUTTON_NAME mismatch`,
  );
  assert(fieldOf(card, 'ROLL_EXPR') === '/r 1d100', `ROLL_EXPR mismatch`);
  assert(stats.collapsed === 2, `collapsed should be 2, got ${stats.collapsed}`);
  assert(
    stats.packedByType['r20_attribute_card'] === 1,
    `packedByType.r20_attribute_card should be 1`,
  );
}

function testLabelOnlyAttributeCard(): void {
  // label + input 만 (roll 없는 케이스)
  const chain: MatchedBlock[] = [
    td('attr-label', [inlineBold('HP')]),
    td('', [textInput('hp', 'attr-input', '10')]),
  ];
  const packed = packComposites(chain);
  assert(packed.length === 1, `expected 1, got ${packed.length}`);
  assert(packed[0].blockType === 'r20_attribute_card');
  assert(fieldOf(packed[0], 'LABEL') === 'HP');
  assert(fieldOf(packed[0], 'I18N_KEY') === '');
  assert(fieldOf(packed[0], 'ROLL_BUTTON_NAME') === '');
}

function testMaxValueAttributeCard(): void {
  // label + current + max (3 td) — roll 없음
  const chain: MatchedBlock[] = [
    td('attr-label', [i18nText('HP-u', 'HP')]),
    td('', [textInput('hp', 'attr-input', '10')]),
    td('', [textInput('hp_max', 'attr-max', '20')]),
  ];
  const packed = packComposites(chain);
  assert(packed.length === 1, `expected 1, got ${packed.length}`);
  assert(fieldOf(packed[0], 'CURRENT_VALUE') === '10');
  assert(fieldOf(packed[0], 'MAX_VALUE') === '20');
  assert(fieldOf(packed[0], 'ROLL_BUTTON_NAME') === '');
}

function testFullAttributeCardWithMaxAndRoll(): void {
  const chain: MatchedBlock[] = [
    td('attr-label', [i18nText('STR-u', 'Strength')]),
    td('', [textInput('str', 'attr-input', '50')]),
    td('', [textInput('str_max', 'attr-max', '99')]),
    td('attr-roll', [rollButton('str_check', '', '/r 1d100')]),
  ];
  const packed = packComposites(chain);
  assert(packed.length === 1, `expected 1, got ${packed.length}`);
  assert(fieldOf(packed[0], 'MAX_VALUE') === '99');
  assert(fieldOf(packed[0], 'ROLL_BUTTON_NAME') === 'str_check');
}

function testMismatchedPrefixDoesNotPack(): void {
  // i18n KEY prefix (DEX) ≠ input name prefix (str) → 우연 매칭 차단
  const chain: MatchedBlock[] = [
    td('attr-label', [i18nText('DEX-u', '민첩')]),
    td('', [textInput('str', 'attr-input', '50')]),
    td('attr-roll', [rollButton('str_check', '', '/r 1d100')]),
  ];
  const packed = packComposites(chain);
  assert(
    packed.length === 3,
    `expected 3 atomic (no pack), got ${packed.length} types=${packed.map((b) => b.blockType).join(',')}`,
  );
  assert(packed[0].blockType === 'r20_td');
  assert(packed[1].blockType === 'r20_td');
  assert(packed[2].blockType === 'r20_td');
}

function testEmptyNameDoesNotPack(): void {
  // input NAME 비면 packing 안 함 (확신 부족 — atomic 유지)
  const chain: MatchedBlock[] = [
    td('attr-label', [i18nText('STR-u', '근력')]),
    td('', [textInput('', 'attr-input', '50')]),
  ];
  const packed = packComposites(chain);
  assert(packed.length === 2, `expected 2 atomic, got ${packed.length}`);
  assert(packed.every((b) => b.blockType === 'r20_td'));
}

function testNonTdChainDoesNotPack(): void {
  // td 가 아닌 chain (예: div 안) — packing 안 함
  const chain: MatchedBlock[] = [
    {
      blockType: 'r20_div',
      fields: { CLASS: '' },
      children: { CONTENT: [i18nText('STR-u', '근력')] },
    },
    {
      blockType: 'r20_text_input',
      fields: { NAME: 'str', CLASS: '', DEFAULT: '50' },
      children: {},
    },
  ];
  const packed = packComposites(chain);
  assert(packed.length === 2, `expected 2 atomic, got ${packed.length}`);
}

function testMultipleSiblingCards(): void {
  // 2 개의 능력치 카드가 한 chain 에 연속
  const chain: MatchedBlock[] = [
    td('attr-label', [i18nText('STR-u', '근력')]),
    td('', [textInput('str', 'attr-input', '50')]),
    td('attr-roll', [rollButton('str_check', '', '/r 1d100')]),
    td('attr-label', [i18nText('DEX-u', '민첩')]),
    td('', [textInput('dex', 'attr-input', '60')]),
    td('attr-roll', [rollButton('dex_check', '', '/r 1d100')]),
  ];
  const packed = packComposites(chain);
  assert(packed.length === 2, `expected 2 composites, got ${packed.length}`);
  assert(packed.every((b) => b.blockType === 'r20_attribute_card'));
  assert(fieldOf(packed[0], 'ATTR_NAME') === 'str');
  assert(fieldOf(packed[1], 'ATTR_NAME') === 'dex');
}

function testNestedChainPackingViaTr(): void {
  // Phase 2: 단일 r20_tr 의 자식이 (label + input + roll) skill_row 패턴이면
  // 외부 layer 에서 r20_skill_row 로 packing (top-down). 그래서 본 tr 은
  // attribute_card 대신 skill_row 로 변환된다. attribute_card 가 nested
  // 으로 만들어지는 케이스는 div / 더 복잡한 wrapper / 한 row 안 다중 card
  // 같은 시나리오 (다른 테스트가 커버).
  const trBlock: MatchedBlock = {
    blockType: 'r20_tr',
    fields: { CLASS: '' },
    children: {
      CONTENT: [
        td('attr-label', [i18nText('STR-u', '근력')]),
        td('', [textInput('str', 'attr-input', '50')]),
        td('attr-roll', [rollButton('str_check', '', '/r 1d100')]),
      ],
    },
  };
  const packed = packComposites([trBlock]);
  assert(packed.length === 1, `outer chain unchanged`);
  assert(
    packed[0].blockType === 'r20_skill_row',
    `expected skill_row absorption (Phase 2), got ${packed[0].blockType}`,
  );
  assert(packed[0].fields?.INPUT_NAME === 'str');
  assert(packed[0].fields?.I18N_KEY === 'STR-u');
  assert(packed[0].fields?.ROLL_NAME === 'str_check');
}

function testMixedChainPartialPack(): void {
  // 카드 1개 + 다른 atomic — 카드만 packing, 나머지 유지
  const otherTd: MatchedBlock = {
    blockType: 'r20_td',
    fields: { CLASS: '' },
    children: {
      CONTENT: [
        {
          blockType: 'r20_checkbox',
          fields: { NAME: 'dummy', CLASS: '', VALUE: '', CHECKED: 'FALSE' },
          children: {},
        },
      ],
    },
  };
  const chain: MatchedBlock[] = [
    td('attr-label', [i18nText('STR-u', '근력')]),
    td('', [textInput('str', 'attr-input', '50')]),
    otherTd,
  ];
  const packed = packComposites(chain);
  // label + input 만 packing (otherTd 는 roll/max 패턴 아님 → 그대로)
  assert(packed.length === 2, `expected 2 (1 composite + 1 td), got ${packed.length}`);
  assert(packed[0].blockType === 'r20_attribute_card');
  assert(packed[1].blockType === 'r20_td');
}

function checkbox(name: string): MatchedBlock {
  return {
    blockType: 'r20_checkbox',
    fields: { NAME: name, CLASS: '', VALUE: '1', CHECKED: 'FALSE' },
    children: {},
  };
}

function wideRawRow(index: number): MatchedBlock {
  const cells = Array.from({ length: 6 }, (_, cell) => td(`cell-${cell}`, [checkbox(`flag_${index}_${cell}`)]));
  return {
    blockType: 'r20_tr',
    fields: { CLASS: 'wide-row' },
    children: { CONTENT: cells },
    sourceRaw: `<tr class="wide-row" data-row="${index}">${cells.map((_, cell) => `<td class="cell-${cell}"><input type="checkbox" name="attr_flag_${index}_${cell}" value="1"></td>`).join('')}</tr>`,
  };
}

function testWideRowCompactionIsOptInAndGlobal(): void {
  const chain: MatchedBlock[] = [0, 1, 2].map((index) => ({
    blockType: 'r20_div',
    fields: { CLASS: `group-${index}` },
    children: { CONTENT: [wideRawRow(index)] },
  }));

  const offStats = newPackStats();
  const off = packComposites(chain, offStats, {
    wideRowMinRepeats: 3,
    wideRowMinDescendants: 6,
  });
  assert(offStats.wideRowBundles === 0, `option off should not bundle rows`);
  assert(
    off.every((block) => block.children?.CONTENT?.[0]?.blockType === 'r20_tr'),
    `option off should keep nested tr blocks`,
  );

  const onStats = newPackStats();
  const on = packComposites(chain, onStats, {
    compactWideRows: true,
    wideRowMinRepeats: 3,
    wideRowMinDescendants: 6,
  });
  assert(onStats.wideRowBundles === 3, `expected 3 row bundles, got ${onStats.wideRowBundles}`);
  assert(onStats.wideRowCollapsed > 0, `expected collapsed row descendants`);
  assert(
    on.every((block) => block.children?.CONTENT?.[0]?.blockType === 'r20_raw_html'),
    `option on should bundle repeated rows even under different parents`,
  );
}

const tests = [
  ['standard i18n attribute card', testStandardI18nAttributeCard],
  ['label-only (no roll) attribute card', testLabelOnlyAttributeCard],
  ['max value attribute card', testMaxValueAttributeCard],
  ['full attribute card with max and roll', testFullAttributeCardWithMaxAndRoll],
  ['mismatched prefix does not pack', testMismatchedPrefixDoesNotPack],
  ['empty NAME does not pack', testEmptyNameDoesNotPack],
  ['non-td chain does not pack', testNonTdChainDoesNotPack],
  ['multiple sibling cards', testMultipleSiblingCards],
  ['nested chain packing via tr', testNestedChainPackingViaTr],
  ['mixed chain partial pack', testMixedChainPartialPack],
  ['wide row compaction is opt-in and global', testWideRowCompactionIsOptInAndGlobal],
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

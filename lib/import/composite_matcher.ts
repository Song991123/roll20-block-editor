/**
 * Composite matcher — atomic chain 의 후처리 packing layer.
 *
 * Anchor: docs/spec/26_composite_blocks.md §4 (Phase 1), §6 (Phase 2).
 *
 * `lib/import/block_matcher.ts` (atomic matcher) 는 무수정. 그 위에 한 layer
 * 를 얹어, 연속 atomic 패턴을 인식하면 composite block 1 개로 packing 한다.
 * 인식 실패 시 atomic 그대로 유지 (fail-safe).
 *
 * 일반화: HTML 구조 + 표준 Roll20 idiom (`attr_X` / `data-i18n="KEY"`
 * / `type="roll"` / `repeating_X`) 만 본다. 영시영 / DnD 5e / CoC / PbtA
 * 어떤 시트도 동일. 한글 라벨 / 시스템 specific class hardcoding 0.
 *
 * Phase 1: `r20_attribute_card`.
 * Phase 2 (본 commit): `r20_skill_row`, `r20_repeating_section_wrapper`.
 * Phase 3 (backlog): `r20_dot_tracker`, `r20_pbta_move`.
 */

import type { MatchedBlock } from './block_matcher';

/** packing 통계 — measurement 용. */
export interface CompositePackStats {
  /** atomic chain 의 원래 길이 합. */
  atomicTotal: number;
  /** packing 후 chain 의 길이 합. */
  afterPackTotal: number;
  /** packing 으로 사라진 atomic 수. */
  collapsed: number;
  /** packing 으로 새로 생긴 composite 수 (type 별). */
  packedByType: Record<string, number>;
}

export function newPackStats(): CompositePackStats {
  return {
    atomicTotal: 0,
    afterPackTotal: 0,
    collapsed: 0,
    packedByType: {},
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * MatchedBlock chain 을 받아 composite 패턴을 packing 한 새 chain 반환.
 *
 * 재귀: children chain + valueInputs 내부도 같은 packing. 본 함수는 chain 자체
 * 의 packing 전에 자식들을 먼저 packing 하므로, attribute_card → skill_row →
 * repeating_section_wrapper 의 layered 적용이 자연스럽게 작동한다.
 *
 * `stats` 미제공 시 통계 미수집 (production import 경로의 cost 0 보장).
 */
export function packComposites(
  chain: MatchedBlock[],
  stats?: CompositePackStats,
): MatchedBlock[] {
  if (!chain || chain.length === 0) return chain;

  if (stats) {
    stats.atomicTotal += chain.length;
  }

  // Top-down preprocessing — tr / repeating_section 처럼 자기 자신이
  // composite 후보면, 자식 recurse 전에 먼저 시도. 매칭되면 자식 recurse 생략
  // (자식들이 이미 composite 의 일부로 소화됨). 매칭 안 되면 자식 recurse 후
  // chain-level packing 단계로 진입.
  const preprocessed: MatchedBlock[] = chain.map((b) => {
    // r20_tr 자체가 skill_row 패턴이면 absorb.
    if (b.blockType === 'r20_tr') {
      const sr = tryMatchSkillRow(b);
      if (sr) return sr;
    }
    // r20_repeating_section 자체가 wrapper 패턴이면 absorb. 단, wrapper 의
    // 남은 children (HAS_HEADER absorb 후) 은 다시 packComposites 재귀.
    if (b.blockType === 'r20_repeating_section') {
      const rw = tryMatchRepeatingSectionWrapper(b);
      if (rw) {
        const innerContent = rw.pack.children?.CONTENT ?? [];
        const recursedInner = packComposites(innerContent, stats);
        return {
          ...rw.pack,
          children: { CONTENT: recursedInner },
        };
      }
    }
    // 그 외 — 자식 recurse only.
    return recursePack(b, stats);
  });

  // window-based packing — chain-level (attribute_card 등).
  const out: MatchedBlock[] = [];
  let i = 0;
  while (i < preprocessed.length) {
    const cur = preprocessed[i];
    // top-down 에서 이미 변환된 composite 는 건너뜀.
    if (
      cur.blockType === 'r20_skill_row' ||
      cur.blockType === 'r20_repeating_section_wrapper'
    ) {
      if (stats) {
        stats.packedByType[cur.blockType] =
          (stats.packedByType[cur.blockType] || 0) + 1;
        if (cur.blockType === 'r20_skill_row' && cur.hint === 'composite:skill_row') {
          // 원래 tr 의 td 자식 수만큼 추가 collapse 표시 (대략).
          const collapsedTds = (cur as { _collapsedTds?: number })._collapsedTds;
          if (typeof collapsedTds === 'number') stats.collapsed += collapsedTds;
        }
        if (
          cur.blockType === 'r20_repeating_section_wrapper' &&
          cur.hint === 'composite:repeating_section_wrapper'
        ) {
          const absorbed = (cur as { _absorbed?: number })._absorbed;
          if (typeof absorbed === 'number') stats.collapsed += absorbed - 1;
        }
      }
      out.push(cur);
      i += 1;
      continue;
    }
    // attribute_card (td 시퀀스 chain-level matching).
    const attrCard = tryMatchAttributeCard(preprocessed, i);
    if (attrCard) {
      out.push(attrCard.pack);
      if (stats) {
        stats.packedByType[attrCard.pack.blockType] =
          (stats.packedByType[attrCard.pack.blockType] || 0) + 1;
        stats.collapsed += attrCard.consumed - 1;
      }
      i += attrCard.consumed;
      continue;
    }
    out.push(cur);
    i += 1;
  }

  if (stats) {
    stats.afterPackTotal += out.length;
  }
  return out;
}

function recursePack(b: MatchedBlock, stats?: CompositePackStats): MatchedBlock {
  let newChildren: Record<string, MatchedBlock[]> | undefined;
  if (b.children) {
    const entries: Array<[string, MatchedBlock[]]> = [];
    for (const [k, v] of Object.entries(b.children)) {
      entries.push([k, packComposites(v, stats)]);
    }
    if (entries.length) newChildren = Object.fromEntries(entries);
  }
  let newValueInputs: Record<string, MatchedBlock> | undefined;
  if (b.valueInputs) {
    const entries: Array<[string, MatchedBlock]> = [];
    for (const [k, v] of Object.entries(b.valueInputs)) {
      entries.push([k, recursePack(v, stats)]);
    }
    if (entries.length) newValueInputs = Object.fromEntries(entries);
  }
  return {
    ...b,
    children: newChildren ?? b.children,
    valueInputs: newValueInputs ?? b.valueInputs,
  };
}

function countTrChildren(b: MatchedBlock): number {
  if (b.blockType !== 'r20_tr') return 0;
  return (b.children?.CONTENT ?? []).length;
}

// ---------------------------------------------------------------------------
// Attribute card pattern (Phase 1) — 변경 없음.
// ---------------------------------------------------------------------------

/**
 * Attribute card 인식 — window-based.
 *
 * 인식 조건 (보수적):
 *   - 연속된 r20_td 2~4 개의 window.
 *   - td #1: 단일 자식 = r20_i18n_text | r20_inline_bold | r20_static_text.
 *   - td #2: 단일 자식 = r20_text_input | r20_number_input. NAME 비어 있지 않음.
 *   - (선택) td #3: 같은 input 패턴, NAME 이 (td#2 NAME) + "_max".
 *   - (선택) td #끝: 단일 자식 = r20_roll_button.
 *
 * 위 조건 모두 부합하면 r20_attribute_card 1 개로 packing. 아니면 atomic 유지.
 */
function tryMatchAttributeCard(
  chain: MatchedBlock[],
  idx: number,
): { pack: MatchedBlock; consumed: number } | null {
  if (idx >= chain.length) return null;

  // 1. label td
  const labelTd = chain[idx];
  const labelInfo = readLabelTd(labelTd);
  if (!labelInfo) return null;

  // 2. current value td (필수)
  const inputTd = chain[idx + 1];
  if (!inputTd) return null;
  const inputInfo = readInputTd(inputTd);
  if (!inputInfo) return null;

  // 3. (선택) max value td
  let consumed = 2;
  let maxValue = '';
  const nextTd = chain[idx + consumed];
  if (nextTd) {
    const maxInfo = readInputTd(nextTd);
    if (
      maxInfo &&
      maxInfo.name === `${inputInfo.name}_max`
    ) {
      maxValue = maxInfo.value;
      consumed += 1;
    }
  }

  // 4. (선택) roll button td
  let rollName = '';
  let rollExpr = '';
  const rollTd = chain[idx + consumed];
  if (rollTd) {
    const rollInfo = readRollTd(rollTd);
    if (rollInfo) {
      rollName = rollInfo.name;
      rollExpr = rollInfo.expr;
      consumed += 1;
    }
  }

  // 보수적 sanity — label / input 의 의미적 매칭.
  if (labelInfo.i18nKey) {
    const keyPrefix = labelInfo.i18nKey
      .split(/[-_]/)[0]
      .toLowerCase();
    const namePrefix = inputInfo.name.split(/[-_]/)[0].toLowerCase();
    if (keyPrefix && namePrefix && keyPrefix !== namePrefix) {
      return null;
    }
  }

  const pack: MatchedBlock = {
    blockType: 'r20_attribute_card',
    fields: {
      LABEL: labelInfo.label,
      I18N_KEY: labelInfo.i18nKey,
      ATTR_NAME: inputInfo.name,
      CURRENT_VALUE: inputInfo.value,
      MAX_VALUE: maxValue,
      ROLL_BUTTON_NAME: rollName,
      ROLL_EXPR: rollExpr,
      LABEL_CLASS: labelInfo.tdClass,
      INPUT_CLASS: inputInfo.cls,
    },
    children: {},
    hint: 'composite:attribute_card',
  };
  return { pack, consumed };
}

// ---------------------------------------------------------------------------
// Skill row pattern (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Skill row 인식 — 단일 r20_tr 의 children 이 (체크박스? + label + input + roll?)
 * 의 td chain 인 경우 packing.
 *
 * 인식 조건 (보수적):
 *   - block 이 r20_tr.
 *   - children.CONTENT 의 각 항목이 모두 r20_td.
 *   - 각 td 가 정확히 1 개의 자식을 가짐 (text-only td 는 인식 안 함).
 *   - 자식 type 시퀀스가 다음 중 하나:
 *       checkbox + (label) + input + (roll)
 *       (label) + input + (roll)
 *       (label) + input (roll 없음)
 *     — checkbox 는 첫 td 에만, label 은 input 직전, roll 은 마지막에만 허용.
 *   - input 의 NAME 이 비어 있지 않음.
 *
 * 위 조건 부합하면 r20_skill_row 1 개로 packing. 아니면 null (atomic 유지).
 *
 * 사용자가 td 갯수 / class / name 패턴을 직접 변형했다면 false-negative — atomic
 * 유지가 안전.
 */
function tryMatchSkillRow(b: MatchedBlock): MatchedBlock | null {
  if (b.blockType !== 'r20_tr') return null;
  const tds = b.children?.CONTENT ?? [];
  // 일반 패턴 — 1~8 cell. (8 = 안전 상한, 한 row 너무 큰 건 일반 chain 으로 둠.)
  if (tds.length < 2 || tds.length > 8) return null;
  if (!tds.every((c) => c.blockType === 'r20_td')) return null;

  // 각 td 의 자식 — 0 (empty) 또는 1 만 허용.
  // empty td 는 LABEL 자리 또는 spacer 로 본다 (round-trip 시 empty <td></td>
  // emit). 2 개 이상 자식이면 패턴 안에 못 들어감 — atomic 유지.
  type Cell = { kind: 'empty' | 'inner'; inner: MatchedBlock | null; td: MatchedBlock };
  const cells: Cell[] = [];
  for (const td of tds) {
    const kids = (td.children?.CONTENT ?? []).filter((c) => !!c);
    if (kids.length === 0) {
      cells.push({ kind: 'empty', inner: null, td });
    } else if (kids.length === 1) {
      cells.push({ kind: 'inner', inner: kids[0], td });
    } else {
      return null;
    }
  }

  // 패턴 분석 — generic Roll20 skill/attribute row:
  //   (checkbox?) (label?|empty?) (input)+ (extra_input?)... (roll?)+
  //
  // Phase 2 본 구현은 다음만 capture:
  //   - 첫 셀에 한해 checkbox 1 개 허용
  //   - label-like 자식 (i18n_text / inline_bold / static_text) 또는 empty td
  //     로 0~2 개의 label 슬롯 허용 (empty 는 다음 input 직전에만)
  //   - 1~2 개의 input (text / number) — 첫 번째 input 의 NAME 이 필수
  //   - 마지막 0~3 개의 roll_button (영시영의 dual-roll, CoC 의 critical 등)
  //
  // 그 외 자식 type 이 섞이면 atomic 유지 (사용자 변형 - 안전).
  let checkboxIdx = -1;
  let inputIdxs: number[] = [];
  let rollIdxs: number[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell.kind === 'empty') {
      // empty cell — 어떤 위치든 허용 (간격용 td). 정보 없음.
      continue;
    }
    const c = cell.inner!;
    const t = c.blockType;
    if (t === 'r20_checkbox') {
      if (i !== 0) return null;
      if (checkboxIdx >= 0) return null;
      checkboxIdx = i;
    } else if (
      t === 'r20_i18n_text' ||
      t === 'r20_inline_bold' ||
      t === 'r20_static_text'
    ) {
      // label slot — input 보다 앞에 위치.
      if (inputIdxs.length > 0) return null;
      if (rollIdxs.length > 0) return null;
    } else if (t === 'r20_text_input' || t === 'r20_number_input') {
      if (rollIdxs.length > 0) return null;
      if (inputIdxs.length >= 2) return null;
      inputIdxs.push(i);
    } else if (t === 'r20_roll_button') {
      if (rollIdxs.length >= 3) return null;
      rollIdxs.push(i);
    } else {
      return null;
    }
  }

  if (inputIdxs.length === 0) return null;
  const firstInput = cells[inputIdxs[0]].inner!;
  if (!firstInput.fields?.NAME) return null;

  // label cell 찾기 — input 전 마지막 'inner label-like' cell.
  let labelIdx = -1;
  for (let i = inputIdxs[0] - 1; i >= 0; i--) {
    if (cells[i].kind !== 'inner') continue;
    const t = cells[i].inner!.blockType;
    if (
      t === 'r20_i18n_text' ||
      t === 'r20_inline_bold' ||
      t === 'r20_static_text'
    ) {
      labelIdx = i;
      break;
    }
    // empty cell skip (continue), 다른 type 은 위에서 이미 차단됨.
  }
  const inputIdx = inputIdxs[0];
  const inputIdx2 = inputIdxs[1] ?? -1;
  const rollIdx = rollIdxs[0] ?? -1;
  const rollIdx2 = rollIdxs[1] ?? -1;
  const rollIdx3 = rollIdxs[2] ?? -1;

  // ── fields 빌드 ──────────────────────────────────────────────────────
  const fields: Record<string, string> = { ...emptySkillRowFields() };
  fields.TR_CLASS = b.fields?.CLASS ?? '';
  fields.TR_STYLE = b.fields?.STYLE ?? '';

  // ── cells layout — 매처가 인식한 cell index 를 fields 에 직렬화 ──
  // (round-trip 시 empty td 도 보존하려면 layout 자체를 알아야 함.)
  fields.CELL_COUNT = String(cells.length);
  // 각 cell 의 종류 string ('checkbox' | 'label' | 'empty' | 'input' | 'input2'
  // | 'roll' | 'roll2' | 'roll3' | 'spacer').
  const slotByIdx: string[] = cells.map(() => 'spacer');
  if (checkboxIdx >= 0) slotByIdx[checkboxIdx] = 'checkbox';
  if (labelIdx >= 0) slotByIdx[labelIdx] = 'label';
  if (inputIdx >= 0) slotByIdx[inputIdx] = 'input';
  if (inputIdx2 >= 0) slotByIdx[inputIdx2] = 'input2';
  if (rollIdx >= 0) slotByIdx[rollIdx] = 'roll';
  if (rollIdx2 >= 0) slotByIdx[rollIdx2] = 'roll2';
  if (rollIdx3 >= 0) slotByIdx[rollIdx3] = 'roll3';
  // empty cells (kind === 'empty') 는 그대로 'spacer' (slot 미할당).
  fields.CELL_LAYOUT = slotByIdx.join(',');
  // 각 cell 의 td.CLASS 직렬화 (round-trip 시 빈 td 의 class 보존).
  fields.CELL_TD_CLASSES = cells.map((c) => c.td.fields?.CLASS ?? '').join('\u0001');

  if (checkboxIdx >= 0) {
    const cb = cells[checkboxIdx].inner!;
    fields.HAS_CHECKBOX = 'TRUE';
    fields.CHECKBOX_TD_CLASS = cells[checkboxIdx].td.fields?.CLASS ?? '';
    fields.CHECKBOX_NAME = cb.fields?.NAME ?? '';
    fields.CHECKBOX_CLASS = cb.fields?.CLASS ?? '';
    fields.CHECKBOX_VALUE = cb.fields?.VALUE ?? '';
    fields.CHECKBOX_CHECKED = cb.fields?.CHECKED === 'TRUE' ? 'TRUE' : 'FALSE';
  }
  if (labelIdx >= 0) {
    const lb = cells[labelIdx].inner!;
    fields.HAS_LABEL = 'TRUE';
    fields.LABEL_TD_CLASS = cells[labelIdx].td.fields?.CLASS ?? '';
    if (lb.blockType === 'r20_i18n_text') {
      fields.I18N_KEY = lb.fields?.KEY ?? '';
      fields.LABEL_TEXT = lb.fields?.DEFAULT ?? '';
      fields.LABEL_TAG = lb.fields?.TAG ?? '';
      fields.LABEL_CLASS = lb.fields?.CLASS ?? '';
    } else if (lb.blockType === 'r20_inline_bold') {
      fields.LABEL_TEXT = lb.fields?.TEXT ?? '';
      fields.LABEL_TAG = 'strong';
      fields.LABEL_CLASS = lb.fields?.CLASS ?? '';
    } else {
      fields.LABEL_TEXT = lb.fields?.TEXT ?? '';
      fields.LABEL_TAG = '';
      fields.LABEL_CLASS = '';
    }
  }
  if (inputIdx >= 0) {
    const ip = cells[inputIdx].inner!;
    fields.HAS_INPUT = 'TRUE';
    fields.INPUT_TD_CLASS = cells[inputIdx].td.fields?.CLASS ?? '';
    fields.INPUT_TYPE = ip.blockType === 'r20_number_input' ? 'number' : 'text';
    fields.INPUT_NAME = ip.fields?.NAME ?? '';
    fields.INPUT_CLASS = ip.fields?.CLASS ?? '';
    fields.INPUT_VALUE = ip.fields?.DEFAULT ?? '';
  }
  if (inputIdx2 >= 0) {
    const ip = cells[inputIdx2].inner!;
    fields.HAS_INPUT2 = 'TRUE';
    fields.INPUT2_TD_CLASS = cells[inputIdx2].td.fields?.CLASS ?? '';
    fields.INPUT2_TYPE = ip.blockType === 'r20_number_input' ? 'number' : 'text';
    fields.INPUT2_NAME = ip.fields?.NAME ?? '';
    fields.INPUT2_CLASS = ip.fields?.CLASS ?? '';
    fields.INPUT2_VALUE = ip.fields?.DEFAULT ?? '';
  }
  const rollIdxArr = [rollIdx, rollIdx2, rollIdx3];
  const rollPrefixes = ['ROLL', 'ROLL2', 'ROLL3'];
  for (let k = 0; k < 3; k++) {
    const rIdx = rollIdxArr[k];
    if (rIdx < 0) continue;
    const rb = cells[rIdx].inner!;
    const pfx = rollPrefixes[k];
    fields[`HAS_${pfx}`] = 'TRUE';
    fields[`${pfx}_TD_CLASS`] = cells[rIdx].td.fields?.CLASS ?? '';
    fields[`${pfx}_NAME`] = rb.fields?.NAME ?? '';
    fields[`${pfx}_LABEL`] = rb.fields?.LABEL ?? '';
    fields[`${pfx}_CLASS`] = rb.fields?.CLASS ?? '';
    const exprBlock = rb.valueInputs?.EXPR;
    if (exprBlock) {
      if (exprBlock.blockType === 'r20_literal_string') {
        fields[`${pfx}_EXPR`] = exprBlock.fields?.STR ?? '';
      } else {
        // 비-literal expression — composite 의 텍스트 필드로 보존 불가 → atomic 유지.
        return null;
      }
    }
  }

  return {
    blockType: 'r20_skill_row',
    fields,
    children: {},
    hint: 'composite:skill_row',
    // @ts-expect-error — internal stat hint, not part of MatchedBlock public API.
    _collapsedTds: tds.length,
  } as MatchedBlock;
}

function emptySkillRowFields(): Record<string, string> {
  return {
    TR_CLASS: '',
    TR_STYLE: '',
    CELL_COUNT: '0',
    CELL_LAYOUT: '',
    CELL_TD_CLASSES: '',
    HAS_CHECKBOX: 'FALSE',
    CHECKBOX_TD_CLASS: '',
    CHECKBOX_NAME: '',
    CHECKBOX_CLASS: '',
    CHECKBOX_VALUE: '',
    CHECKBOX_CHECKED: 'FALSE',
    HAS_LABEL: 'FALSE',
    LABEL_TD_CLASS: '',
    I18N_KEY: '',
    LABEL_TEXT: '',
    LABEL_TAG: '',
    LABEL_CLASS: '',
    HAS_INPUT: 'FALSE',
    INPUT_TD_CLASS: '',
    INPUT_TYPE: 'text',
    INPUT_NAME: '',
    INPUT_CLASS: '',
    INPUT_VALUE: '',
    HAS_INPUT2: 'FALSE',
    INPUT2_TD_CLASS: '',
    INPUT2_TYPE: 'text',
    INPUT2_NAME: '',
    INPUT2_CLASS: '',
    INPUT2_VALUE: '',
    HAS_ROLL: 'FALSE',
    ROLL_TD_CLASS: '',
    ROLL_NAME: '',
    ROLL_LABEL: '',
    ROLL_CLASS: '',
    ROLL_EXPR: '',
    HAS_ROLL2: 'FALSE',
    ROLL2_TD_CLASS: '',
    ROLL2_NAME: '',
    ROLL2_LABEL: '',
    ROLL2_CLASS: '',
    ROLL2_EXPR: '',
    HAS_ROLL3: 'FALSE',
    ROLL3_TD_CLASS: '',
    ROLL3_NAME: '',
    ROLL3_LABEL: '',
    ROLL3_CLASS: '',
    ROLL3_EXPR: '',
  };
}

// ---------------------------------------------------------------------------
// Repeating section wrapper pattern (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Repeating section wrapper 인식 — 단일 r20_repeating_section + 선택 thead 첫
 * 자식을 묶는다.
 *
 * 인식 조건 (보수적):
 *   - block 이 r20_repeating_section. NAME 비어 있지 않음.
 *   - children.CONTENT 의 첫 항목이 r20_thead (선택) — single tr → th×N 패턴.
 *     thead 가 그 패턴이면 absorb → COLUMNS 필드로 보존. 아니면 thead 유지 (
 *     children 그대로).
 *
 * thead 가 thead → tr → th 의 정확 1-1 패턴이 아니면 absorb 하지 않고 wrapper
 * 만 적용. 자식들은 그대로 CONTENT 로 전달.
 *
 * `absorbed` = 합쳐진 atomic 수 (thead absorb 시 1 + tr 1 + th×N).
 */
function tryMatchRepeatingSectionWrapper(
  b: MatchedBlock,
): { pack: MatchedBlock; absorbed: number } | null {
  if (b.blockType !== 'r20_repeating_section') return null;
  const sectionName = b.fields?.NAME ?? '';
  if (!sectionName) return null;
  // section name 위생 — Roll20 표준은 [A-Za-z0-9_]+ 만. 다른 문자가 섞인 이름은
  // packing 시 round-trip 무손실 보장 어려움 → atomic 유지.
  if (!/^[A-Za-z0-9_]+$/.test(sectionName)) return null;

  const content = b.children?.CONTENT ?? [];
  let absorbed = 1; // section 자체.
  let columnsField = '';
  let hasHeader = 'FALSE';
  let theadClass = '';
  let trClass = '';
  let remaining = content;

  // thead absorb 시도.
  if (content.length >= 1 && content[0].blockType === 'r20_thead') {
    const thead = content[0];
    const theadKids = thead.children?.CONTENT ?? [];
    if (theadKids.length === 1 && theadKids[0].blockType === 'r20_tr') {
      const tr = theadKids[0];
      const trKids = tr.children?.CONTENT ?? [];
      if (trKids.length > 0 && trKids.every((c) => c.blockType === 'r20_th')) {
        // 각 th 의 자식 텍스트 추출 — i18n_text 우선, 없으면 빈 텍스트.
        const cols: string[] = [];
        let allParseable = true;
        for (const th of trKids) {
          const thClass = th.fields?.CLASS ?? '';
          const kids = (th.children?.CONTENT ?? []).filter((c) => !!c);
          if (kids.length === 0) {
            // 빈 th — i18n_key 와 text 모두 비움.
            cols.push(`||${thClass}`);
            continue;
          }
          if (kids.length !== 1) {
            allParseable = false;
            break;
          }
          const k = kids[0];
          if (k.blockType === 'r20_i18n_text') {
            const key = k.fields?.KEY ?? '';
            const def = k.fields?.DEFAULT ?? '';
            // i18n_text 가 th 자체에 박힌 경우 (TAG='th') 만 absorb. 아니면
            // round-trip 보존 어려움 → atomic 유지.
            if ((k.fields?.TAG ?? 'th') !== 'th') {
              allParseable = false;
              break;
            }
            cols.push(`${key}|${def}|${thClass}`);
          } else if (k.blockType === 'r20_inline_bold' || k.blockType === 'r20_static_text') {
            const text = k.fields?.TEXT ?? '';
            cols.push(`|${text}|${thClass}`);
          } else {
            allParseable = false;
            break;
          }
        }
        if (allParseable) {
          // absorb!
          columnsField = cols.join('\n');
          hasHeader = 'TRUE';
          theadClass = thead.fields?.CLASS ?? '';
          trClass = tr.fields?.CLASS ?? '';
          absorbed += 1 + 1 + trKids.length; // thead + tr + th×N
          remaining = content.slice(1);
        }
      }
    }
  }

  const pack: MatchedBlock = {
    blockType: 'r20_repeating_section_wrapper',
    fields: {
      SECTION_NAME: sectionName,
      FIELDSET_CLASS: '',
      FIELDSET_STYLE: b.fields?.STYLE ?? '',
      HAS_HEADER: hasHeader,
      HEADER_THEAD_CLASS: theadClass,
      HEADER_TR_CLASS: trClass,
      COLUMNS: columnsField,
    },
    children: { CONTENT: remaining },
    hint: 'composite:repeating_section_wrapper',
    // @ts-expect-error — internal stat hint, not part of MatchedBlock public API.
    _absorbed: absorbed,
  } as MatchedBlock;
  return { pack, absorbed };
}

// ---------------------------------------------------------------------------
// Helpers — 단일 r20_td 의 자식 패턴 인식 (Phase 1 attribute card 용)
// ---------------------------------------------------------------------------

interface LabelInfo {
  label: string;
  i18nKey: string;
  tdClass: string;
}

function readLabelTd(b: MatchedBlock | undefined): LabelInfo | null {
  if (!b || b.blockType !== 'r20_td') return null;
  const tdClass = b.fields?.CLASS ?? '';
  const kids = (b.children?.CONTENT ?? []).filter((c) => !!c);
  if (kids.length !== 1) return null;
  const inner = kids[0];
  if (inner.blockType === 'r20_i18n_text') {
    return {
      label: inner.fields?.DEFAULT ?? '',
      i18nKey: inner.fields?.KEY ?? '',
      tdClass,
    };
  }
  if (inner.blockType === 'r20_inline_bold') {
    return {
      label: inner.fields?.TEXT ?? '',
      i18nKey: '',
      tdClass,
    };
  }
  if (inner.blockType === 'r20_static_text') {
    return {
      label: inner.fields?.TEXT ?? '',
      i18nKey: '',
      tdClass,
    };
  }
  return null;
}

interface InputInfo {
  name: string;
  value: string;
  cls: string;
}

function readInputTd(b: MatchedBlock | undefined): InputInfo | null {
  if (!b || b.blockType !== 'r20_td') return null;
  const kids = (b.children?.CONTENT ?? []).filter((c) => !!c);
  if (kids.length !== 1) return null;
  const inner = kids[0];
  if (inner.blockType === 'r20_text_input' || inner.blockType === 'r20_number_input') {
    const name = inner.fields?.NAME ?? '';
    if (!name) return null;
    return {
      name,
      value: inner.fields?.DEFAULT ?? '',
      cls: inner.fields?.CLASS ?? '',
    };
  }
  return null;
}

interface RollInfo {
  name: string;
  expr: string;
}

function readRollTd(b: MatchedBlock | undefined): RollInfo | null {
  if (!b || b.blockType !== 'r20_td') return null;
  const kids = (b.children?.CONTENT ?? []).filter((c) => !!c);
  if (kids.length !== 1) return null;
  const inner = kids[0];
  if (inner.blockType !== 'r20_roll_button') return null;
  const name = inner.fields?.NAME ?? '';
  if (!name) return null;
  const exprBlock = inner.valueInputs?.EXPR;
  let expr = '';
  if (exprBlock) {
    if (exprBlock.blockType === 'r20_literal_string') {
      expr = exprBlock.fields?.STR ?? '';
    } else {
      return null;
    }
  }
  return { name, expr };
}

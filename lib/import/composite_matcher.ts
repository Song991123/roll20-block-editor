/**
 * Composite matcher — atomic chain 의 후처리 packing layer.
 *
 * Anchor: docs/spec/26_composite_blocks.md §4.
 *
 * `lib/import/block_matcher.ts` (atomic matcher) 는 무수정. 그 위에 한 layer
 * 를 얹어, 연속 atomic 패턴을 인식하면 composite block 1 개로 packing 한다.
 * 인식 실패 시 atomic 그대로 유지 (fail-safe).
 *
 * 일반화: HTML 구조 + 표준 Roll20 idiom (`attr_X` / `data-i18n="KEY"`
 * / `type="roll"`) 만 본다. 영시영 / DnD 5e / CoC / PbtA 어떤 시트도 동일.
 * 한글 라벨 / 시스템 specific class hardcoding 0.
 *
 * Phase 1: `r20_attribute_card` 만. Phase 2~3 의 skill_row / repeating_section_wrapper /
 * dot_tracker / pbta_move 는 동일 dispatcher 에 후속 추가.
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
 * 재귀: children chain + valueInputs 내부도 같은 packing.
 *
 * `stats` 미제공 시 통계 미수집 (production import 경로의 cost 0 보장).
 */
export function packComposites(
  chain: MatchedBlock[],
  stats?: CompositePackStats,
): MatchedBlock[] {
  if (!chain || chain.length === 0) return chain;

  // 자식 chain / valueInputs 먼저 재귀 packing.
  const recursed: MatchedBlock[] = chain.map((b) => recursePack(b, stats));

  if (stats) {
    stats.atomicTotal += chain.length;
  }

  // window-based packing.
  const out: MatchedBlock[] = [];
  let i = 0;
  while (i < recursed.length) {
    const attempt = tryMatchAttributeCard(recursed, i);
    if (attempt) {
      out.push(attempt.pack);
      if (stats) {
        stats.packedByType[attempt.pack.blockType] =
          (stats.packedByType[attempt.pack.blockType] || 0) + 1;
        stats.collapsed += attempt.consumed - 1;
      }
      i += attempt.consumed;
      continue;
    }
    out.push(recursed[i]);
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

// ---------------------------------------------------------------------------
// Attribute card pattern
// ---------------------------------------------------------------------------

/**
 * Attribute card 인식 — window-based.
 *
 * 인식 조건 (보수적):
 *   - 연속된 r20_td 2~4 개의 window.
 *   - td #1: 단일 자식 = r20_i18n_text | r20_inline_bold | r20_static_text 중 하나.
 *           (CSS label-like td.)
 *   - td #2: 단일 자식 = r20_text_input | r20_number_input.
 *           NAME 이 비어 있지 않음.
 *   - (선택) td #3: 같은 input 패턴, NAME 이 (td#2 NAME) + "_max".
 *   - (선택) td #끝: 단일 자식 = r20_roll_button.
 *
 * 위 조건 모두 부합하면 r20_attribute_card 1 개로 packing.
 *
 * 의심 케이스 (사용자가 td 갯수 / class / name 패턴을 변형) — atomic 유지.
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

  // 보수적 sanity — label / input 의 의미적 매칭 (label key prefix 가 input name 와 일치)
  // 사용자가 label 만 우연히 i18n_text 라 다른 행이 잡히는 일 방지.
  // i18n KEY (예: "STR-u") 의 첫 token 의 lowercase 가 input name 의 prefix 인지
  // 약하게 확인. KEY 없을 때 (LABEL 만) 는 skip.
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
// Helpers — 단일 r20_td 의 자식 패턴 인식
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
  // i18n_text wrapped in <strong> — matchI18n 이 이미 r20_i18n_text 로 lift 했을
  // 것 (block_matcher §matchI18n). 별도 nested case 없음.
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
  // EXPR 은 valueInputs.EXPR 안의 r20_literal_string.STR (또는 r20_attr_ref).
  const exprBlock = inner.valueInputs?.EXPR;
  let expr = '';
  if (exprBlock) {
    if (exprBlock.blockType === 'r20_literal_string') {
      expr = exprBlock.fields?.STR ?? '';
    } else {
      // r20_attr_ref 등 expression block — composite 의 ROLL_EXPR 은 텍스트
      // 필드로만 보관. 본 phase 에서는 expr 매칭 skip (atomic 유지).
      return null;
    }
  }
  return { name, expr };
}

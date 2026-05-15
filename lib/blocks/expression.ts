/**
 * Expression 카테고리 — 21 블록 (Stage A-1).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 5 (표현식 / Expression, hue 200).
 *   - docs/spec/02_functional_spec.md §3.2 — reporter (둥근) + boolean (육각).
 *   - docs/spec/02_functional_spec.md §3.3 — typed slot 강제.
 *   - docs/spec/02_functional_spec.md §3.6 Roll20 expression syntax cover 항목.
 *
 * Roll20 expression syntax 출력 — 코드 emit 단계 generator 함수 동봉.
 * 시스템 specific 토큰 0. 9 카테고리 중 1개 (표현식) 만, 일반화.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext, ORDER } from './types';

// ---------- 카테고리 / 타입 상수 ----------

const EXPRESSION = 'expression' as const;
/** spec §3.1 — 표현식 카테고리 hue. */
const HUE = 200;

const T_NUM = 'Number';
const T_STR = 'String';
const T_BOOL = 'Boolean';
/** Roll20 expression 의 attr 값은 dice math 에서 자동 숫자 coerce → 두 타입 다 허용. */
const T_NUM_OR_STR: string[] = [T_NUM, T_STR];

// ---------- dropdown 옵션 ----------

const QUAL_OPS: Array<[string, string]> = [
  ['선택', 'selected'],
  ['대상', 'target'],
];

const DICE_MOD_OPS: Array<[string, string]> = [
  ['kh (높은 N 유지)', 'kh'],
  ['kl (낮은 N 유지)', 'kl'],
  ['dh (높은 N 버림)', 'dh'],
  ['dl (낮은 N 버림)', 'dl'],
  ['r (재굴림 ≤N)', 'r'],
  ['ro (1회만 재굴림)', 'ro'],
  ['! (폭발 N)', '!'],
  ['!! (혼란 폭발)', '!!'],
  ['cs (성공 기준)', 'cs'],
  ['cf (실패 기준)', 'cf'],
  ['f (실패 카운트)', 'f'],
];

const ARITH_OPS: Array<[string, string]> = [
  ['+', '+'],
  ['−', '-'],
  ['×', '*'],
  ['÷', '/'],
];

const UNARY_FNS: Array<[string, string]> = [
  ['floor', 'floor'],
  ['ceil', 'ceil'],
  ['round', 'round'],
  ['abs', 'abs'],
];

const BINARY_FNS: Array<[string, string]> = [
  ['min', 'min'],
  ['max', 'max'],
];

const CMP_OPS: Array<[string, string]> = [
  ['=', '=='],
  ['≠', '!='],
  ['<', '<'],
  ['≤', '<='],
  ['>', '>'],
  ['≥', '>='],
];

const LOGIC_OPS: Array<[string, string]> = [
  ['그리고', 'and'],
  ['또는', 'or'],
];

// ---------- init builder helper ----------
//
// BlockDef.init 시그니처는 (block: unknown) => void.
// Blockly 가 호출 시 this 가 Block 인스턴스로 bind 됨.
// builder 는 Block 인자 받아 field/input 구성.

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

// ---------- 21 블록 정의 ----------

export const EXPRESSION_BLOCKS: BlockDef[] = [
  // 1) 숫자 리터럴 ----------------------------------------------------------
  {
    type: 'r20_literal_number',
    shape: 'reporter',
    category: EXPRESSION,
    label: '숫자',
    tooltip: '숫자 리터럴. 예) 5, 1.5, −3',
    init: mkInit((b) => {
      b.appendDummyInput().appendField(new Blockly.FieldNumber(0), 'NUM');
      b.setOutput(true, T_NUM);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const num = Number(b.getFieldValue('NUM'));
      return [Number.isFinite(num) ? String(num) : '0', ORDER.ATOMIC];
    },
  },

  // 2) 문자열 리터럴 --------------------------------------------------------
  {
    type: 'r20_literal_string',
    shape: 'reporter',
    category: EXPRESSION,
    label: '글자',
    tooltip: '문자열 리터럴.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('"')
        .appendField(new Blockly.FieldTextInput(''), 'STR')
        .appendField('"');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const s = String(b.getFieldValue('STR') ?? '');
      return [s, ORDER.ATOMIC];
    },
  },

  // 3) 속성 참조  @{NAME} --------------------------------------------------
  {
    type: 'r20_attr_ref',
    shape: 'reporter',
    category: EXPRESSION,
    label: '시트 값 가져오기',
    tooltip: '캐릭터 속성 — @{이름}',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('@{')
        .appendField(new Blockly.FieldTextInput('attribute'), 'NAME')
        .appendField('}');
      b.setOutput(true, T_NUM_OR_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '');
      return [`@{${name}}`, ORDER.ATOMIC];
    },
  },

  // 4) 속성 max  @{NAME|max} -----------------------------------------------
  {
    type: 'r20_attr_ref_max',
    shape: 'reporter',
    category: EXPRESSION,
    label: '시트 값의 최댓값',
    tooltip: '속성의 최대값 — @{이름|max}',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('@{')
        .appendField(new Blockly.FieldTextInput('attribute'), 'NAME')
        .appendField('|max}');
      b.setOutput(true, T_NUM_OR_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '');
      return [`@{${name}|max}`, ORDER.ATOMIC];
    },
  },

  // 5) qualified  @{selected|NAME} / @{target|NAME} ------------------------
  {
    type: 'r20_attr_ref_qualified',
    shape: 'reporter',
    category: EXPRESSION,
    label: '다른 시트의 값',
    tooltip: '선택/타겟 캐릭터의 속성 — @{selected|이름} 또는 @{target|이름}',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('@{')
        .appendField(new Blockly.FieldDropdown(QUAL_OPS), 'QUAL')
        .appendField('|')
        .appendField(new Blockly.FieldTextInput('attribute'), 'NAME')
        .appendField('}');
      b.setOutput(true, T_NUM_OR_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const qual = String(b.getFieldValue('QUAL') ?? 'selected');
      const name = String(b.getFieldValue('NAME') ?? '');
      return [`@{${qual}|${name}}`, ORDER.ATOMIC];
    },
  },

  // 6) character_name -------------------------------------------------------
  {
    type: 'r20_character_name',
    shape: 'reporter',
    category: EXPRESSION,
    label: '캐릭터 이름',
    tooltip: '현재 캐릭터의 이름.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('@{character_name}');
      b.setOutput(true, T_STR);
    }),
    generator: () => ['@{character_name}', ORDER.ATOMIC],
  },

  // 7) character_id ---------------------------------------------------------
  {
    type: 'r20_character_id',
    shape: 'reporter',
    category: EXPRESSION,
    label: '캐릭터 ID',
    tooltip: '현재 캐릭터의 ID.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('@{character_id}');
      b.setOutput(true, T_STR);
    }),
    generator: () => ['@{character_id}', ORDER.ATOMIC],
  },

  // 8) ability ref  %{CHAR|NAME} -------------------------------------------
  {
    type: 'r20_ability_ref',
    shape: 'reporter',
    category: EXPRESSION,
    label: '능력 매크로',
    tooltip: '능력 (ability) 호출 — %{대상|이름}',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('%{')
        .appendField(new Blockly.FieldTextInput('selected'), 'CHAR')
        .appendField('|')
        .appendField(new Blockly.FieldTextInput('ability'), 'NAME')
        .appendField('}');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const ch = String(b.getFieldValue('CHAR') ?? 'selected');
      const nm = String(b.getFieldValue('NAME') ?? '');
      return [`%{${ch}|${nm}}`, ORDER.ATOMIC];
    },
  },

  // 9) inline roll  [[EXPR]] ------------------------------------------------
  {
    type: 'r20_inline_roll',
    shape: 'reporter',
    category: EXPRESSION,
    label: '즉시 굴림',
    tooltip: '인라인 굴림 — [[ 표현식 ]]. 채팅에서 결과 숫자 표시.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('[[');
      b.appendValueInput('EXPR').setCheck(null);
      b.appendDummyInput().appendField(']]');
      b.setInputsInline(true);
      b.setOutput(true, T_NUM_OR_STR);
    }),
    generator: (block, ctx) => {
      const expr = ctx.valueToCode(block, 'EXPR', ORDER.NONE) || '0';
      return [`[[${expr}]]`, ORDER.ATOMIC];
    },
  },

  // 10) dice expr  NdM(+MOD) -----------------------------------------------
  {
    type: 'r20_dice_expr',
    shape: 'reporter',
    category: EXPRESSION,
    label: '주사위 (예: 1d20)',
    tooltip: '주사위 표현식 — N개 M면체 (선택: 수정자).',
    init: mkInit((b) => {
      b.appendValueInput('COUNT').setCheck(T_NUM);
      b.appendDummyInput().appendField('d');
      b.appendValueInput('SIDES').setCheck(T_NUM);
      b.appendValueInput('MODIFIER').setCheck(null);
      b.setInputsInline(true);
      b.setOutput(true, T_NUM_OR_STR);
    }),
    generator: (block, ctx) => {
      const count = ctx.valueToCode(block, 'COUNT', ORDER.NONE) || '1';
      const sides = ctx.valueToCode(block, 'SIDES', ORDER.NONE) || '6';
      const mod = ctx.valueToCode(block, 'MODIFIER', ORDER.NONE) || '';
      return [`${count}d${sides}${mod}`, ORDER.ATOMIC];
    },
  },

  // 11) dice modifier  (kh / kl / r / ! ...) -------------------------------
  {
    type: 'r20_dice_modifier',
    shape: 'reporter',
    category: EXPRESSION,
    label: '주사위 옵션',
    tooltip: '주사위 수정자 — kh3, kl1, r1, !6 등.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(DICE_MOD_OPS), 'OP')
        .appendField(new Blockly.FieldNumber(1, 0), 'N');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const op = String(b.getFieldValue('OP') ?? 'kh');
      const n = String(b.getFieldValue('N') ?? '1');
      return [`${op}${n}`, ORDER.ATOMIC];
    },
  },

  // 12) dice label  EXPR[LABEL] --------------------------------------------
  {
    type: 'r20_dice_label',
    shape: 'reporter',
    category: EXPRESSION,
    label: '굴림에 이름 붙이기',
    tooltip: '굴림 결과에 라벨 — 1d20[STR].',
    init: mkInit((b) => {
      b.appendValueInput('EXPR').setCheck(T_NUM_OR_STR);
      b.appendDummyInput()
        .appendField('[')
        .appendField(new Blockly.FieldTextInput('label'), 'LABEL')
        .appendField(']');
      b.setInputsInline(true);
      b.setOutput(true, T_NUM_OR_STR);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const expr = ctx.valueToCode(block, 'EXPR', ORDER.NONE) || '0';
      const label = String(b.getFieldValue('LABEL') ?? '');
      return [`${expr}[${label}]`, ORDER.ATOMIC];
    },
  },

  // 13) query input  ?{PROMPT|DEFAULT|opt1|opt2...} ------------------------
  {
    type: 'r20_query_input',
    shape: 'reporter',
    category: EXPRESSION,
    label: '사용자에게 물어보기',
    tooltip: '사용자 입력 — ?{프롬프트|기본값|옵션…}',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('?{')
        .appendField(new Blockly.FieldTextInput('Prompt'), 'PROMPT');
      b.appendDummyInput()
        .appendField('기본:')
        .appendField(new Blockly.FieldTextInput(''), 'DEFAULT');
      b.appendStatementInput('OPTIONS').appendField('옵션:').setCheck('QueryOption');
      b.appendDummyInput().appendField('}');
      b.setOutput(true, T_STR);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const prompt = String(b.getFieldValue('PROMPT') ?? '');
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const raw = ctx.statementToCode(block, 'OPTIONS').trim();
      // statementToCode 가 line 별로 emit. 각 라인 = "label,value" 또는 "label".
      // pipe 로 join.
      const opts = raw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join('|');
      const head = def ? `${prompt}|${def}` : prompt;
      const optsPart = opts ? `|${opts}` : '';
      return [`?{${head}${optsPart}}`, ORDER.ATOMIC];
    },
  },

  // 14) query option  (LABEL, VALUE) ---------------------------------------
  //
  // spec 표 reporter 였으나 Blockly multi-value 슬롯은 mutator 가 필요 → OPTIONS
  // 슬롯을 statement chain 으로 구현. query_option = stack.
  // Phase 2 에서 mutator 도입 시 reporter 환원 가능.
  {
    type: 'r20_query_option',
    shape: 'stack',
    category: EXPRESSION,
    label: '사용자 선택지',
    tooltip: 'query 의 옵션 — "라벨,값" 으로 emit.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('라벨')
        .appendField(new Blockly.FieldTextInput('Option'), 'LABEL')
        .appendField('값')
        .appendField(new Blockly.FieldTextInput(''), 'VALUE');
      b.setPreviousStatement(true, 'QueryOption');
      b.setNextStatement(true, 'QueryOption');
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const label = String(b.getFieldValue('LABEL') ?? '');
      const val = String(b.getFieldValue('VALUE') ?? '');
      return val ? `${label},${val}` : label;
    },
  },

  // 15) arith op  LHS OP RHS -----------------------------------------------
  {
    type: 'r20_arith_op',
    shape: 'reporter',
    category: EXPRESSION,
    label: '계산하기 ( + − × ÷ )',
    tooltip: '산술 연산 — + − × ÷',
    init: mkInit((b) => {
      b.appendValueInput('LHS').setCheck(T_NUM);
      b.appendDummyInput().appendField(new Blockly.FieldDropdown(ARITH_OPS), 'OP');
      b.appendValueInput('RHS').setCheck(T_NUM);
      b.setInputsInline(true);
      b.setOutput(true, T_NUM);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const op = String(b.getFieldValue('OP') ?? '+');
      const order = op === '*' || op === '/' ? ORDER.MULTIPLICATION : ORDER.ADDITION;
      const lhs = ctx.valueToCode(block, 'LHS', order) || '0';
      const rhs = ctx.valueToCode(block, 'RHS', order) || '0';
      return [`${lhs}${op}${rhs}`, order];
    },
  },

  // 16) unary fn  FN(ARG) --------------------------------------------------
  {
    type: 'r20_unary_fn',
    shape: 'reporter',
    category: EXPRESSION,
    label: '한 값 함수 (반올림 등)',
    tooltip: '단항 함수 — floor / ceil / round / abs.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(UNARY_FNS), 'FN')
        .appendField('(');
      b.appendValueInput('ARG').setCheck(T_NUM);
      b.appendDummyInput().appendField(')');
      b.setInputsInline(true);
      b.setOutput(true, T_NUM);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const fn = String(b.getFieldValue('FN') ?? 'floor');
      const arg = ctx.valueToCode(block, 'ARG', ORDER.NONE) || '0';
      return [`${fn}(${arg})`, ORDER.ATOMIC];
    },
  },

  // 17) binary fn  FN(ARG1, ARG2) ------------------------------------------
  {
    type: 'r20_binary_fn',
    shape: 'reporter',
    category: EXPRESSION,
    label: '두 값 함수 (최댓값 등)',
    tooltip: '이항 함수 — min / max.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(BINARY_FNS), 'FN')
        .appendField('(');
      b.appendValueInput('ARG1').setCheck(T_NUM);
      b.appendDummyInput().appendField(',');
      b.appendValueInput('ARG2').setCheck(T_NUM);
      b.appendDummyInput().appendField(')');
      b.setInputsInline(true);
      b.setOutput(true, T_NUM);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const fn = String(b.getFieldValue('FN') ?? 'min');
      const a1 = ctx.valueToCode(block, 'ARG1', ORDER.NONE) || '0';
      const a2 = ctx.valueToCode(block, 'ARG2', ORDER.NONE) || '0';
      return [`${fn}(${a1}, ${a2})`, ORDER.ATOMIC];
    },
  },

  // 18) cmp op  (Boolean) --------------------------------------------------
  {
    type: 'r20_cmp_op',
    shape: 'boolean',
    category: EXPRESSION,
    label: '비교하기 ( = < > )',
    tooltip: '비교 연산 — = ≠ < ≤ > ≥',
    init: mkInit((b) => {
      b.appendValueInput('LHS').setCheck(T_NUM_OR_STR);
      b.appendDummyInput().appendField(new Blockly.FieldDropdown(CMP_OPS), 'OP');
      b.appendValueInput('RHS').setCheck(T_NUM_OR_STR);
      b.setInputsInline(true);
      b.setOutput(true, T_BOOL);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const op = String(b.getFieldValue('OP') ?? '==');
      const lhs = ctx.valueToCode(block, 'LHS', ORDER.RELATIONAL) || '0';
      const rhs = ctx.valueToCode(block, 'RHS', ORDER.RELATIONAL) || '0';
      return [`${lhs}${op}${rhs}`, ORDER.RELATIONAL];
    },
  },

  // 19) logic op  (Boolean) ------------------------------------------------
  {
    type: 'r20_logic_op',
    shape: 'boolean',
    category: EXPRESSION,
    label: '그리고 / 또는',
    tooltip: '논리 연산 — 그리고 / 또는.',
    init: mkInit((b) => {
      b.appendValueInput('LHS').setCheck(T_BOOL);
      b.appendDummyInput().appendField(new Blockly.FieldDropdown(LOGIC_OPS), 'OP');
      b.appendValueInput('RHS').setCheck(T_BOOL);
      b.setInputsInline(true);
      b.setOutput(true, T_BOOL);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const op = String(b.getFieldValue('OP') ?? 'and');
      const symbol = op === 'and' ? '&&' : '||';
      const order = op === 'and' ? ORDER.LOGICAL_AND : ORDER.LOGICAL_OR;
      const lhs = ctx.valueToCode(block, 'LHS', order) || 'false';
      const rhs = ctx.valueToCode(block, 'RHS', order) || 'false';
      return [`${lhs} ${symbol} ${rhs}`, order];
    },
  },

  // 20) logic not  (Boolean) -----------------------------------------------
  {
    type: 'r20_logic_not',
    shape: 'boolean',
    category: EXPRESSION,
    label: '... 이 아니다',
    tooltip: '논리 부정 — NOT.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('아니다');
      b.appendValueInput('ARG').setCheck(T_BOOL);
      b.setInputsInline(true);
      b.setOutput(true, T_BOOL);
    }),
    generator: (block, ctx) => {
      const arg = ctx.valueToCode(block, 'ARG', ORDER.UNARY) || 'false';
      return [`!(${arg})`, ORDER.UNARY];
    },
  },

  // 21) paren  (EXPR) — 우선순위 명시 --------------------------------------
  {
    type: 'r20_paren',
    shape: 'reporter',
    category: EXPRESSION,
    label: '( 묶기 )',
    tooltip: '괄호 — 우선순위 명시. 안의 타입 그대로 통과.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('(');
      b.appendValueInput('EXPR').setCheck(null);
      b.appendDummyInput().appendField(')');
      b.setInputsInline(true);
      // 임의 타입 통과 — null 출력으로 모든 슬롯에 끼움 가능.
      b.setOutput(true, null);
    }),
    generator: (block, ctx) => {
      const expr = ctx.valueToCode(block, 'EXPR', ORDER.NONE) || '';
      return [`(${expr})`, ORDER.ATOMIC];
    },
  },
];

/**
 * Stage A-1 — Expression 21 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerExpressionBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of EXPRESSION_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-1 의 generator 매핑 — 향후 emit-worker 가 lookup. */
export const EXPRESSION_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  EXPRESSION_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

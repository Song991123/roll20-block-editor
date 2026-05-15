/**
 * Composite 카테고리 — 4 블록 (Stage Option A-2).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3 (130 블록 카탈로그, Composite 4).
 *   - docs/spec/04_block_taxonomy_v2.md — composite 정의 4.
 *   - docs/spec/09_design_system.md §1.1 (composite hue 270, gray-purple).
 *
 * Composite = primitive 블록들의 자주 쓰이는 묶음 wrapper. emit 결과는
 * 동등한 primitive 시퀀스로 풀어쓴 HTML / worker JS 와 동일.
 * (era_switch 같은 시스템-specific 패턴 대신 generic 한 radio_group 사용.)
 *
 * 시스템 specific 토큰 0. 모든 블록은 NAME / LABEL / OPTIONS 등 일반 파라미터만.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';

// ---------- 카테고리 / 상수 ----------

const COMPOSITE = 'composite' as const;
/** spec §3.1 — Composite 카테고리 hue (gray-purple, advanced 와 동색계). */
const HUE = 270;

// ---------- helpers ----------

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

function setStatementHooks(b: Blockly.Block): void {
  b.setPreviousStatement(true, null);
  b.setNextStatement(true, null);
}

function escapeAttr(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 빈 토큰 제거 + 단일 공백 결합. */
function joinClass(...parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => String(p ?? '').trim())
    .filter((p) => p.length > 0)
    .join(' ');
}

/** OPTIONS 멀티라인 파싱 — "value|label" 또는 "value" 줄 단위. */
function parseOptions(raw: string): Array<{ value: string; label: string }> {
  return String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [value, label] = line.split('|').map((s) => s.trim());
      return { value: value || '', label: label || value || '' };
    })
    .filter((o) => o.value.length > 0);
}

/** worker JS 안의 `</script>` 무력화. */
function safeWorkerJs(value: string): string {
  return String(value ?? '').replace(/<\/script/gi, '<\\/script');
}

// ---------- 4 블록 정의 ----------

export const COMPOSITE_BLOCKS: BlockDef[] = [
  // 1) attr + text helper -----------------------------------------------
  {
    type: 'r20_attr_with_txt_helper',
    shape: 'c',
    category: COMPOSITE,
    label: '묶음: 입력칸 + 안내 글자',
    tooltip:
      '히든 attr_NAME 저장값 + 옆에 보이는 텍스트 입력 짝(자주 쓰는 Roll20 입력 패턴).',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('입력칸 + 안내 글자');
      b.appendDummyInput()
        .appendField('NAME')
        .appendField(new Blockly.FieldTextInput(''), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendStatementInput('CONTENT').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const rawName = String(b.getFieldValue('NAME') ?? '').trim();
      if (!rawName) {
        ctx.warn(
          b.id,
          'COMPOSITE_ATTR_NAME_MISSING',
          'r20_attr_with_txt_helper: NAME 비어 있음 — emit 생략.',
          'warning',
        );
        return '';
      }
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const inner = ctx.statementToCode(block, 'CONTENT');
      const hiddenName = escapeAttr(`attr_${rawName}`);
      const helperName = escapeAttr(`attr_${rawName}_helper`);
      const clsAttr = joinClass('sheet-attr-with-helper', cls);
      const open = `<div class="${escapeAttr(clsAttr)}">`;
      const hidden = `<input type="hidden" name="${hiddenName}" value="">`;
      const visible = `<input type="text" name="${helperName}" class="sheet-helper">`;
      const innerBlock = inner && inner.trim() ? `\n${ctx.indent(inner)}` : '';
      return `${open}\n${ctx.indent(`${hidden}\n${visible}`)}${innerBlock}\n</div>`;
    },
    inspectorSchema: [
      {
        name: 'NAME',
        label: '속성 이름',
        kind: 'text',
        placeholder: 'strength',
        description: '`attr_NAME` 으로 hidden, `attr_NAME_helper` 로 visible.',
      },
      {
        name: 'CLASS',
        label: '추가 class',
        kind: 'text',
        placeholder: 'sheet-stat',
      },
    ],
  },

  // 2) computed attr (hat + worker) -------------------------------------
  {
    type: 'r20_computed_attr',
    shape: 'c',
    category: COMPOSITE,
    label: '묶음: 자동 계산 칸',
    tooltip:
      '히든 attr + dep 변경 시 자동 setAttrs 하는 sheet worker 짝(반복되는 합계/모디 계산 패턴).',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('자동 계산 칸');
      b.appendDummyInput()
        .appendField('NAME')
        .appendField(new Blockly.FieldTextInput(''), 'NAME');
      b.appendDummyInput()
        .appendField('의존(콤마)')
        .appendField(new Blockly.FieldTextInput(''), 'DEPS');
      b.appendDummyInput()
        .appendField('식(JS)')
        .appendField(new Blockly.FieldTextInput(''), 'FORMULA');
      b.appendStatementInput('CONTENT').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const rawName = String(b.getFieldValue('NAME') ?? '').trim();
      const depsRaw = String(b.getFieldValue('DEPS') ?? '');
      const formula = String(b.getFieldValue('FORMULA') ?? '').trim();
      if (!rawName) {
        ctx.warn(
          b.id,
          'COMPOSITE_COMPUTED_NAME_MISSING',
          'r20_computed_attr: NAME 비어 있음 — emit 생략.',
          'warning',
        );
        return '';
      }
      const deps = depsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const inner = ctx.statementToCode(block, 'CONTENT');
      const hiddenName = escapeAttr(`attr_${rawName}`);
      const changeEvt = deps.length
        ? deps.map((d) => `change:${d}`).join(' ')
        : `change:${rawName}`;
      const getList = deps.length
        ? deps.map((d) => `'${d.replace(/'/g, "\\'")}'`).join(', ')
        : `'${rawName.replace(/'/g, "\\'")}'`;
      const setExpr = formula
        ? safeWorkerJs(formula)
        : `Number(v['${(deps[0] || rawName).replace(/'/g, "\\'")}']) || 0`;
      const setKey = rawName.replace(/'/g, "\\'");
      const hidden = `<input type="hidden" name="${hiddenName}" value="0">`;
      const worker =
        `<script type="text/worker">\n` +
        `  on('${changeEvt}', () => {\n` +
        `    getAttrs([${getList}], (v) => {\n` +
        `      setAttrs({ '${setKey}': ${setExpr} });\n` +
        `    });\n` +
        `  });\n` +
        `</script>`;
      const innerBlock = inner && inner.trim() ? `\n${inner}` : '';
      return `${hidden}\n${worker}${innerBlock}`;
    },
    inspectorSchema: [
      {
        name: 'NAME',
        label: '속성 이름',
        kind: 'text',
        placeholder: 'strength_mod',
      },
      {
        name: 'DEPS',
        label: '의존 속성(,)',
        kind: 'text',
        placeholder: 'strength,strength_misc',
      },
      {
        name: 'FORMULA',
        label: 'JS 식',
        kind: 'textarea',
        placeholder:
          "Math.floor((Number(v['strength']) - 10) / 2) + Number(v['strength_misc'])",
        description: 'getAttrs 콜백 안에서 평가 — v[\'dep\'] 사용.',
      },
    ],
  },

  // 3) dual roll button (one row, two roll buttons) ---------------------
  {
    type: 'r20_dual_roll_button',
    shape: 'stack',
    category: COMPOSITE,
    label: '묶음: 굴림 버튼 두 개 (한 줄)',
    tooltip:
      '한 row 안에 굴림 버튼 2개(예: 공격/피해 동시 노출).',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('굴림 버튼 두 개');
      b.appendDummyInput()
        .appendField('1 label')
        .appendField(new Blockly.FieldTextInput(''), 'LABEL_A');
      b.appendDummyInput()
        .appendField('1 roll')
        .appendField(new Blockly.FieldTextInput(''), 'ROLL_A');
      b.appendDummyInput()
        .appendField('2 label')
        .appendField(new Blockly.FieldTextInput(''), 'LABEL_B');
      b.appendDummyInput()
        .appendField('2 roll')
        .appendField(new Blockly.FieldTextInput(''), 'ROLL_B');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const labelA = escapeAttr(String(b.getFieldValue('LABEL_A') ?? '').trim() || '굴림 1');
      const labelB = escapeAttr(String(b.getFieldValue('LABEL_B') ?? '').trim() || '굴림 2');
      const rollA = escapeAttr(String(b.getFieldValue('ROLL_A') ?? '').trim() || '/r 1d20');
      const rollB = escapeAttr(String(b.getFieldValue('ROLL_B') ?? '').trim() || '/r 1d20');
      if (!String(b.getFieldValue('ROLL_A') ?? '').trim() ||
          !String(b.getFieldValue('ROLL_B') ?? '').trim()) {
        ctx.warn(
          b.id,
          'COMPOSITE_DUAL_ROLL_EMPTY',
          'r20_dual_roll_button: 굴림식 1/2 중 빈 칸 — 기본 1d20 으로 채움.',
          'info',
        );
      }
      const btnA = `<button type="roll" value="${rollA}">${labelA}</button>`;
      const btnB = `<button type="roll" value="${rollB}">${labelB}</button>`;
      return `<div class="sheet-row sheet-dual-roll">\n${ctx.indent(`${btnA}\n${btnB}`)}\n</div>`;
    },
    inspectorSchema: [
      { name: 'LABEL_A', label: '버튼 1 라벨', kind: 'text', placeholder: '공격' },
      { name: 'ROLL_A', label: '버튼 1 굴림', kind: 'text', placeholder: '/r 1d20+@{atk}' },
      { name: 'LABEL_B', label: '버튼 2 라벨', kind: 'text', placeholder: '피해' },
      { name: 'ROLL_B', label: '버튼 2 굴림', kind: 'text', placeholder: '/r 1d8+@{dmg}' },
    ],
  },

  // 4) radio group --------------------------------------------------------
  {
    type: 'r20_radio_group',
    shape: 'c',
    category: COMPOSITE,
    label: '묶음: 라디오 묶음',
    tooltip:
      '라디오 그룹(legend + 옵션 N개) — generic 한 라디오 선택지 묶음.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('라디오 묶음');
      b.appendDummyInput()
        .appendField('NAME')
        .appendField(new Blockly.FieldTextInput(''), 'NAME');
      b.appendDummyInput()
        .appendField('LEGEND')
        .appendField(new Blockly.FieldTextInput(''), 'LEGEND');
      b.appendDummyInput()
        .appendField('OPTIONS')
        .appendField(new Blockly.FieldTextInput(''), 'OPTIONS');
      b.appendStatementInput('CONTENT').setCheck(null);
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const rawName = String(b.getFieldValue('NAME') ?? '').trim();
      if (!rawName) {
        ctx.warn(
          b.id,
          'COMPOSITE_RADIO_NAME_MISSING',
          'r20_radio_group: NAME 비어 있음 — emit 생략.',
          'warning',
        );
        return '';
      }
      const opts = parseOptions(String(b.getFieldValue('OPTIONS') ?? ''));
      if (opts.length === 0) {
        ctx.warn(
          b.id,
          'COMPOSITE_RADIO_NO_OPTIONS',
          'r20_radio_group: OPTIONS 비어 있음 — fieldset 만 emit.',
          'warning',
        );
      }
      const legend = String(b.getFieldValue('LEGEND') ?? '').trim();
      const inner = ctx.statementToCode(block, 'CONTENT');
      const nameAttr = escapeAttr(`attr_${rawName}`);
      const legendHtml = legend ? `<legend>${escapeAttr(legend)}</legend>` : '';
      const radios = opts
        .map((o, i) => {
          const id = escapeAttr(`${rawName}_${i}`);
          const checked = i === 0 ? ' checked="checked"' : '';
          return (
            `<label for="${id}">` +
            `<input type="radio" id="${id}" name="${nameAttr}" value="${escapeAttr(o.value)}"${checked}>` +
            `${escapeAttr(o.label)}</label>`
          );
        })
        .join('\n');
      const body = [legendHtml, radios, inner].filter((s) => s && s.trim()).join('\n');
      const indented = body ? ctx.indent(body) : '';
      return `<fieldset class="sheet-radio-group">\n${indented}\n</fieldset>`;
    },
    inspectorSchema: [
      { name: 'NAME', label: '속성 이름', kind: 'text', placeholder: 'alignment' },
      { name: 'LEGEND', label: '제목', kind: 'text', placeholder: '성향' },
      {
        name: 'OPTIONS',
        label: '옵션(줄)',
        kind: 'textarea',
        placeholder: 'lg|선악\nln|중립\nch|혼돈',
        description: '한 줄에 `value|label` (label 생략 시 value 그대로 표시).',
      },
    ],
  },
];

/**
 * Stage Option A-2 — Composite 4 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerCompositeBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of COMPOSITE_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage Option A-2 의 generator 매핑 — emit-worker lookup. */
export const COMPOSITE_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  COMPOSITE_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

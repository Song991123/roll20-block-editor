/**
 * Default view — CSS sibling trick 블록 (3 블록).
 *
 * Anchor: docs/spec/19_sanitize_and_default_view.md §2.
 *
 * 패턴 (sandbox 동작):
 *   <input type="checkbox" id="ID" class="r20-toggle">
 *   <label for="ID">LABEL</label>
 *   <div class="r20-toggle-on r20-toggle-on--ID"> ... </div>     // ON 시
 *   <div class="r20-toggle-off r20-toggle-off--ID"> ... </div>   // OFF 시
 *
 *   .r20-toggle-on--ID  { display: none; }
 *   .r20-toggle-off--ID { display: block; }
 *   #ID:checked ~ .r20-toggle-on--ID  { display: block; }
 *   #ID:checked ~ .r20-toggle-off--ID { display: none; }
 *
 * 시스템 specific 식별자 0 — ID / LABEL / scope 다 사용자 입력 (블록 fields).
 * roll20-sheet-builder hardcoding 0.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';
import {
  emitToggleCss,
  escapeHtmlAttr,
  escapeHtmlText,
  sanitizeIdToken,
} from './conditional_view_emit';

const ADVANCED = 'advanced' as const;
/** spec §1.1 — advanced hue 270. */
const HUE = 270;

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

function joinClass(...parts: Array<string | undefined | null>): string {
  return parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

// ---------- 3 블록 정의 ----------

export const CONDITIONAL_VIEW_BLOCKS: BlockDef[] = [
  // 1) 토글 체크박스 -------------------------------------------------------
  {
    type: 'r20_toggle_checkbox',
    shape: 'stack',
    category: ADVANCED,
    label: '토글 체크박스',
    tooltip:
      '시트 안 영역을 켜고/끄는 체크박스. ID 를 같이 박은 "토글 켜졌을 때" / "토글 꺼졌을 때" 블록과 연결됨.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('토글 ID')
        .appendField(new Blockly.FieldTextInput('show-area'), 'ID');
      b.appendDummyInput()
        .appendField('라벨')
        .appendField(new Blockly.FieldTextInput('영역 표시'), 'LABEL');
      b.appendDummyInput()
        .appendField('기본 켜짐')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'DEFAULT');
      b.appendDummyInput()
        .appendField('입력 class')
        .appendField(new Blockly.FieldTextInput(''), 'INPUT_CLASS');
      b.appendDummyInput()
        .appendField('라벨 class')
        .appendField(new Blockly.FieldTextInput(''), 'LABEL_CLASS');
      b.setPreviousStatement(true);
      b.setNextStatement(true);
    }),
    generator: (block) => {
      const bb = block as Blockly.Block;
      const id = sanitizeIdToken(String(bb.getFieldValue('ID') ?? ''));
      const label = String(bb.getFieldValue('LABEL') ?? '');
      const def = bb.getFieldValue('DEFAULT');
      const checkedAttr =
        def === 'TRUE' || def === true || def === 'true' ? ' checked' : '';
      const inputClass = joinClass('r20-toggle', String(bb.getFieldValue('INPUT_CLASS') ?? ''));
      const labelClass = String(bb.getFieldValue('LABEL_CLASS') ?? '').trim();
      const labelClassAttr = labelClass ? ` class="${escapeHtmlAttr(labelClass)}"` : '';
      const out = `<input type="checkbox" id="${escapeHtmlAttr(id)}" class="${escapeHtmlAttr(inputClass)}"${checkedAttr}>
<label for="${escapeHtmlAttr(id)}"${labelClassAttr}>${escapeHtmlText(label)}</label>
`;
      return out;
    },
    inspectorSchema: [
      { name: 'ID', label: '토글 ID', kind: 'text', placeholder: 'show-area' },
      { name: 'LABEL', label: '라벨', kind: 'text', placeholder: '영역 표시' },
      { name: 'DEFAULT', label: '기본 켜짐', kind: 'boolean' },
      { name: 'INPUT_CLASS', label: '입력 class', kind: 'text', placeholder: 'toggle-input' },
      { name: 'LABEL_CLASS', label: '라벨 class', kind: 'text', placeholder: 'toggle-label' },
    ],
  },

  // 2) 토글 켜졌을 때 보이는 영역 -----------------------------------------
  {
    type: 'r20_toggle_on_area',
    shape: 'c',
    category: ADVANCED,
    label: '토글 켜졌을 때 보이는 영역',
    tooltip:
      '체크박스가 켜졌을 때만 표시되는 영역. 토글 ID 는 같은 시트 안의 "토글 체크박스" 와 일치해야 함.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('토글 ID')
        .appendField(new Blockly.FieldTextInput('show-area'), 'REF_ID');
      b.appendDummyInput()
        .appendField('영역 class')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendStatementInput('CONTENT').setCheck(null).appendField('내용');
      b.setPreviousStatement(true);
      b.setNextStatement(true);
    }),
    generator: (block, ctx) => {
      const bb = block as Blockly.Block;
      const id = sanitizeIdToken(String(bb.getFieldValue('REF_ID') ?? ''));
      const className = joinClass(
        'r20-toggle-on',
        `r20-toggle-on--${id}`,
        String(bb.getFieldValue('CLASS') ?? ''),
      );
      const content = ctx.statementToCode(block, 'CONTENT');
      const indented = content ? ctx.indent(content) : '';
      const html = `<div class="${escapeHtmlAttr(className)}">
${indented}</div>
`;
      return html;
    },
    inspectorSchema: [
      { name: 'REF_ID', label: '토글 ID', kind: 'text', placeholder: 'show-area' },
      { name: 'CLASS', label: '영역 class', kind: 'text', placeholder: 'area-on' },
    ],
  },

  // 3) 토글 꺼졌을 때 보이는 영역 (default state) -------------------------
  {
    type: 'r20_toggle_off_area',
    shape: 'c',
    category: ADVANCED,
    label: '토글 꺼졌을 때 보이는 영역',
    tooltip:
      '체크박스가 꺼졌을 때 (default) 표시되는 영역. 토글 ID 는 같은 시트 안의 "토글 체크박스" 와 일치해야 함.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('토글 ID')
        .appendField(new Blockly.FieldTextInput('show-area'), 'REF_ID');
      b.appendDummyInput()
        .appendField('영역 class')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendStatementInput('CONTENT').setCheck(null).appendField('내용');
      b.setPreviousStatement(true);
      b.setNextStatement(true);
    }),
    generator: (block, ctx) => {
      const bb = block as Blockly.Block;
      const id = sanitizeIdToken(String(bb.getFieldValue('REF_ID') ?? ''));
      const className = joinClass(
        'r20-toggle-off',
        `r20-toggle-off--${id}`,
        String(bb.getFieldValue('CLASS') ?? ''),
      );
      const content = ctx.statementToCode(block, 'CONTENT');
      const indented = content ? ctx.indent(content) : '';
      const html = `<div class="${escapeHtmlAttr(className)}">
${indented}</div>
`;
      return html;
    },
    inspectorSchema: [
      { name: 'REF_ID', label: '토글 ID', kind: 'text', placeholder: 'show-area' },
      { name: 'CLASS', label: '영역 class', kind: 'text', placeholder: 'area-off' },
    ],
  },
];

// ---------- re-exports (순수 helpers — emit pipeline 에서 사용) ----------

export { emitToggleCss, sanitizeIdToken, escapeHtmlAttr, escapeHtmlText };

/**
 * Stage 19 — conditional_view 3 블록 등록.
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자 보장.
 */
export function registerConditionalViewBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of CONDITIONAL_VIEW_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Generator map — emit-worker lookup. */
export const CONDITIONAL_VIEW_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  CONDITIONAL_VIEW_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

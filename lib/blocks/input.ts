/**
 * Input 카테고리 — 10 블록 (Stage A-3).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 2 (입력 / Input, hue 230).
 *   - docs/spec/02_functional_spec.md §3.2 — stack + c (select 의 옵션 슬롯).
 *   - docs/spec/04_block_taxonomy_v2.md (Input 카탈로그).
 *   - docs/spec/12_roll20_output_spec.md §2 (HTML emit contract — name="attr_*").
 *
 * Roll20 시트의 폼 인풋 — 모두 `name="attr_${NAME}"` 규약으로 emit.
 * 시스템 specific 토큰 0. 일반화된 입력 필드만.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';
import { PRESERVED_ATTRIBUTE_TARGET } from './preservedAttributes';
import { styleAttr } from './style_field';

// ---------- 카테고리 / 상수 ----------

const INPUT = 'input' as const;
/** spec §3.1 — 입력 카테고리 hue. */
const HUE = 230;

// ---------- init helper ----------

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

/** stack prev/next (untyped — 모든 컨테이너에 들어감). */
function setStatementHooks(b: Blockly.Block): void {
  b.setPreviousStatement(true, null);
  b.setNextStatement(true, null);
}

// ---------- HTML emit helper ----------

function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** ` attr="value"` 또는 빈 문자열 — value 비면 attr 자체 생략. */
function attr(name: string, value: string): string {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return ` ${name}="${escapeAttr(v)}"`;
}

/** ` class="sheet-foo sheet-bar"` — CLASS 비면 생략. 토큰별로 sheet- prefix 부착.
 *
 * multi-class fix: 이전엔 전체 문자열에 한 번만 sheet- 부착 → `class="sheet-row header"`
 * 같은 잘못된 출력. 매처가 import 시 토큰별로 sheet- 를 떼므로 emit 도 토큰별로
 * 다시 부착해야 round-trip byte-identical 성립.
 */
function sheetClassAttr(cls: string): string {
  const v = String(cls ?? '').trim();
  if (!v) return '';
  const out = v
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.startsWith('sheet-') ? t : `sheet-${t}`))
    .join(' ');
  return ` class="${escapeAttr(out)}"`;
}

/** Roll20 attribute name 규약 — ` name="attr_${NAME}"`. */
function nameAttr(name: string): string {
  const v = String(name ?? '').trim();
  if (!v) return '';
  return ` name="attr_${escapeAttr(v)}"`;
}

// ---------- 10 블록 정의 ----------

export const INPUT_BLOCKS: BlockDef[] = [
  // 1) text input -----------------------------------------------------------
  {
    type: 'r20_text_input',
    shape: 'stack',
    category: INPUT,
    label: '글자 입력칸',
    tooltip: '한 줄 텍스트 입력 — <input type="text">.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('글자')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('기본값')
        .appendField(new Blockly.FieldTextInput(''), 'DEFAULT');
      b.appendDummyInput()
        .appendField('안내문')
        .appendField(new Blockly.FieldTextInput(''), 'PLACEHOLDER');
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput(''), 'I18N');
      b.appendDummyInput()
        .appendField('잠금')
        .appendField(
          new Blockly.FieldDropdown([
            ['아니오', 'FALSE'],
            ['예', 'TRUE'],
          ]),
          'DISABLED',
        );
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const ph = String(b.getFieldValue('PLACEHOLDER') ?? '');
      const i18n = String(b.getFieldValue('I18N') ?? '');
      const disabled = String(b.getFieldValue('DISABLED') ?? 'FALSE') === 'TRUE';
      return (
        `<input type="text"${sheetClassAttr(cls)}${nameAttr(name)}${attr('value', def)}` +
        `${attr('placeholder', ph)}${attr('data-i18n', i18n)}` +
        `${disabled ? ' disabled="true"' : ''}${styleAttr(style)}>`
      );
    },
  },

  // 2) number input ---------------------------------------------------------
  {
    type: 'r20_number_input',
    shape: 'stack',
    category: INPUT,
    label: '숫자 입력칸',
    tooltip: '숫자 입력 — <input type="number"> (min/max 옵션).',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('숫자')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('min')
        .appendField(new Blockly.FieldTextInput(''), 'MIN')
        .appendField('max')
        .appendField(new Blockly.FieldTextInput(''), 'MAX');
      b.appendDummyInput()
        .appendField('기본값')
        .appendField(new Blockly.FieldTextInput('0'), 'DEFAULT');
      b.appendDummyInput()
        .appendField('안내문')
        .appendField(new Blockly.FieldTextInput(''), 'PLACEHOLDER');
      b.appendDummyInput()
        .appendField('잠금')
        .appendField(
          new Blockly.FieldDropdown([
            ['아니오', 'FALSE'],
            ['예', 'TRUE'],
          ]),
          'DISABLED',
        );
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const min = String(b.getFieldValue('MIN') ?? '');
      const max = String(b.getFieldValue('MAX') ?? '');
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const ph = String(b.getFieldValue('PLACEHOLDER') ?? '');
      const disabled = String(b.getFieldValue('DISABLED') ?? 'FALSE') === 'TRUE';
      return (
        `<input type="number"${sheetClassAttr(cls)}${nameAttr(name)}` +
        `${attr('min', min)}${attr('max', max)}${attr('value', def)}` +
        `${attr('placeholder', ph)}${disabled ? ' disabled="true"' : ''}${styleAttr(style)}>`
      );
    },
  },

  // 3) checkbox -------------------------------------------------------------
  {
    type: 'r20_checkbox',
    shape: 'stack',
    category: INPUT,
    label: '체크 상자',
    tooltip: '체크박스 — <input type="checkbox">.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('체크박스')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('값')
        .appendField(new Blockly.FieldTextInput(''), 'VALUE');
      b.appendDummyInput()
        .appendField('기본 체크')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'CHECKED');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const val = String(b.getFieldValue('VALUE') ?? '');
      const checked = String(b.getFieldValue('CHECKED') ?? 'FALSE') === 'TRUE';
      const checkedAttr = checked ? ' checked="checked"' : '';
      return `<input type="checkbox"${sheetClassAttr(cls)}${nameAttr(name)}${attr('value', val)}${checkedAttr}${styleAttr(style)}>`;
    },
  },

  // 4) select (c-shape, options statement slot) -----------------------------
  {
    type: 'r20_select',
    shape: 'c',
    category: INPUT,
    label: '선택 메뉴',
    tooltip: '드롭다운 — <select>. 안에 옵션 블록을 쌓는다.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('선택 메뉴')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME')
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendStatementInput('OPTIONS').setCheck('SelectOption').appendField('옵션:');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const options = ctx.statementToCode(block, 'OPTIONS');
      const head = `<select${sheetClassAttr(cls)}${nameAttr(name)}${styleAttr(style)}>`;
      if (!options || !options.trim()) return `${head}</select>`;
      return `${head}\n${ctx.indent(options)}\n</select>`;
    },
  },

  // 5) option group (c-shape — also fits SelectOption slot) -----------------
  {
    type: 'r20_optgroup',
    shape: 'c',
    category: INPUT,
    label: '선택 묶음',
    tooltip: '선택 항목을 이름 붙은 묶음으로 정리한다.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('선택 묶음')
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput('Group'), 'LABEL')
        .appendField('사용 안 함')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'DISABLED');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendStatementInput('OPTIONS').setCheck('SelectOption').appendField('선택 항목:');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      b.setPreviousStatement(true, 'SelectOption');
      b.setNextStatement(true, 'SelectOption');
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const label = String(b.getFieldValue('LABEL') ?? '');
      const disabled = String(b.getFieldValue('DISABLED') ?? 'FALSE') === 'TRUE';
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const style = String(b.getFieldValue('STYLE') ?? '');
      const options = ctx.statementToCode(block, 'OPTIONS');
      const head = `<optgroup${attr('label', label)}${disabled ? ' disabled="disabled"' : ''}` +
        `${sheetClassAttr(cls)}${styleAttr(style)}>`;
      if (!options || !options.trim()) return `${head}</optgroup>`;
      return `${head}\n${ctx.indent(options)}\n</optgroup>`;
    },
  },

  // 6) select option (stack — fits SelectOption slot) -----------------------
  {
    type: 'r20_select_option',
    shape: 'stack',
    category: INPUT,
    label: '선택 항목',
    tooltip: 'select 의 옵션 — <option value="VALUE">LABEL</option>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('선택 항목')
        .appendField('값')
        .appendField(new Blockly.FieldTextInput(''), 'VALUE')
        .appendField('라벨')
        .appendField(new Blockly.FieldTextInput('Option'), 'LABEL');
      b.appendDummyInput()
        .appendField('기본 선택')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'SELECTED');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      b.setPreviousStatement(true, 'SelectOption');
      b.setNextStatement(true, 'SelectOption');
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const value = String(b.getFieldValue('VALUE') ?? '');
      const label = String(b.getFieldValue('LABEL') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const selected = String(b.getFieldValue('SELECTED') ?? 'FALSE') === 'TRUE';
      return (
        `<option${attr('value', value)}${sheetClassAttr(cls)}${selected ? ' selected="selected"' : ''}` +
        `${styleAttr(style)}>${escapeAttr(label)}</option>`
      );
    },
  },

  // 7) textarea -------------------------------------------------------------
  {
    type: 'r20_textarea',
    shape: 'stack',
    category: INPUT,
    label: '여러 줄 입력칸',
    tooltip: '여러 줄 입력 — <textarea>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('여러 줄 입력칸')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS')
        .appendField('rows')
        .appendField(new Blockly.FieldNumber(3, 1, 50, 1), 'ROWS');
      b.appendDummyInput()
        .appendField('기본값')
        .appendField(new Blockly.FieldTextInput(''), 'DEFAULT');
      b.appendDummyInput()
        .appendField('안내문')
        .appendField(new Blockly.FieldTextInput(''), 'PLACEHOLDER');
      b.appendDummyInput()
        .appendField('안내문 번역 키')
        .appendField(new Blockly.FieldTextInput(''), 'I18N_PLACEHOLDER');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const rowsRaw = Number(b.getFieldValue('ROWS') ?? 3);
      const rows = Number.isFinite(rowsRaw) && rowsRaw >= 1 ? Math.floor(rowsRaw) : 3;
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const ph = String(b.getFieldValue('PLACEHOLDER') ?? '');
      const i18nPh = String(b.getFieldValue('I18N_PLACEHOLDER') ?? '');
      return (
        `<textarea${sheetClassAttr(cls)}${nameAttr(name)}` +
        ` rows="${rows}"${attr('placeholder', ph)}${attr('data-i18n-placeholder', i18nPh)}` +
        `${styleAttr(style)}>${escapeAttr(def)}</textarea>`
      );
    },
  },

  // 7) radio ----------------------------------------------------------------
  {
    type: 'r20_radio',
    shape: 'stack',
    category: INPUT,
    label: '라디오 버튼',
    tooltip: '라디오 — <label><input type="radio">LABEL</label>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('라디오 버튼')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.appendDummyInput()
        .appendField('값')
        .appendField(new Blockly.FieldTextInput(''), 'VALUE')
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('기본 선택')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'CHECKED');
      b.appendDummyInput()
        .appendField('라벨')
        .appendField(new Blockly.FieldTextInput('Option'), 'LABEL');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const value = String(b.getFieldValue('VALUE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const label = String(b.getFieldValue('LABEL') ?? '');
      const checked = String(b.getFieldValue('CHECKED') ?? 'FALSE') === 'TRUE';
      return (
        `<label><input ${PRESERVED_ATTRIBUTE_TARGET} type="radio"${sheetClassAttr(cls)}${nameAttr(name)}` +
        `${attr('value', value)}${checked ? ' checked="checked"' : ''}${styleAttr(style)}>` +
        `${escapeAttr(label)}</label>`
      );
    },
  },

  // 8) hidden input ---------------------------------------------------------
  {
    type: 'r20_hidden_input',
    shape: 'stack',
    category: INPUT,
    label: '숨김 값',
    tooltip: '숨겨진 값 — <input type="hidden">. 계산용 attr 저장.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('숨김 값')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.appendDummyInput()
        .appendField('기본값')
        .appendField(new Blockly.FieldTextInput('0'), 'DEFAULT');
      b.appendDummyInput()
        .appendField('Class')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<input type="hidden"${sheetClassAttr(cls)}${nameAttr(name)}${attr('value', def)}${styleAttr(style)}>`;
    },
  },

  // 9) file input -----------------------------------------------------------
  {
    type: 'r20_file_input',
    shape: 'stack',
    category: INPUT,
    label: '파일 선택',
    tooltip: '파일 업로드 — <input type="file">.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('파일 선택')
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('accept')
        .appendField(new Blockly.FieldTextInput(''), 'ACCEPT');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const accept = String(b.getFieldValue('ACCEPT') ?? '');
      return `<input type="file"${sheetClassAttr(cls)}${nameAttr(name)}${attr('accept', accept)}${styleAttr(style)}>`;
    },
  },

  // 10) other native input types -------------------------------------------
  // Roll20 sheets also use browser-native controls such as range, date,
  // color, email, and search. They are void controls, never containers. A
  // dedicated leaf block keeps them editable without pretending that a child
  // can be dropped inside an <input> and then silently discarded on emit.
  {
    type: 'r20_generic_input',
    shape: 'stack',
    category: INPUT,
    label: '기타 입력칸',
    tooltip: '범위, 날짜, 색상 등 브라우저 기본 입력칸을 그대로 보존합니다.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('기타 입력칸')
        .appendField('종류')
        .appendField(new Blockly.FieldTextInput('range'), 'TYPE');
      b.appendDummyInput()
        .appendField('속성')
        .appendField(new Blockly.FieldTextInput('name'), 'NAME')
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('기본값')
        .appendField(new Blockly.FieldTextInput(''), 'DEFAULT')
        .appendField('안내문')
        .appendField(new Blockly.FieldTextInput(''), 'PLACEHOLDER');
      b.appendDummyInput()
        .appendField('최소')
        .appendField(new Blockly.FieldTextInput(''), 'MIN')
        .appendField('최대')
        .appendField(new Blockly.FieldTextInput(''), 'MAX')
        .appendField('간격')
        .appendField(new Blockly.FieldTextInput(''), 'STEP');
      b.appendDummyInput()
        .appendField('사용 안 함')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'DISABLED')
        .appendField('읽기 전용')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'READONLY');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const type = String(b.getFieldValue('TYPE') ?? 'text').trim().toLowerCase() || 'text';
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const placeholder = String(b.getFieldValue('PLACEHOLDER') ?? '');
      const min = String(b.getFieldValue('MIN') ?? '');
      const max = String(b.getFieldValue('MAX') ?? '');
      const step = String(b.getFieldValue('STEP') ?? '');
      const disabled = String(b.getFieldValue('DISABLED') ?? 'FALSE') === 'TRUE';
      const readOnly = String(b.getFieldValue('READONLY') ?? 'FALSE') === 'TRUE';
      const style = String(b.getFieldValue('STYLE') ?? '');
      return (
        `<input type="${escapeAttr(type)}"${sheetClassAttr(cls)}${nameAttr(name)}` +
        `${attr('value', def)}${attr('placeholder', placeholder)}` +
        `${attr('min', min)}${attr('max', max)}${attr('step', step)}` +
        `${disabled ? ' disabled="disabled"' : ''}${readOnly ? ' readonly="readonly"' : ''}` +
        `${styleAttr(style)}>`
      );
    },
    inspectorSchema: [
      { name: 'TYPE', label: '종류', kind: 'text', placeholder: 'range' },
      { name: 'NAME', label: '속성', kind: 'text' },
      { name: 'CLASS', label: '클래스', kind: 'text' },
      { name: 'DEFAULT', label: '기본값', kind: 'text' },
      { name: 'PLACEHOLDER', label: '안내문', kind: 'text' },
      { name: 'MIN', label: '최소', kind: 'text' },
      { name: 'MAX', label: '최대', kind: 'text' },
      { name: 'STEP', label: '간격', kind: 'text' },
      { name: 'DISABLED', label: '사용 안 함', kind: 'boolean' },
      { name: 'READONLY', label: '읽기 전용', kind: 'boolean' },
      { name: 'STYLE', label: '스타일', kind: 'text' },
    ],
  },
];

/**
 * Stage A-3 — Input 10 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerInputBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of INPUT_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-3 의 generator 매핑 — emit-worker lookup. */
export const INPUT_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  INPUT_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

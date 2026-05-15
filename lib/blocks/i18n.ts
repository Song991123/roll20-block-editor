/**
 * i18n 카테고리 — 11 블록 (Stage A-7).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 5 (번역 / i18n, hue 330).
 *   - docs/spec/02_functional_spec.md §3.2 — stack (요소) + reporter (속성 fragment).
 *   - docs/spec/12_roll20_output_spec.md §2 (HTML emit — data-i18n* attrs).
 *
 * Roll20 의 translation.json + `data-i18n*` 속성 패밀리 매핑.
 * 시스템 specific 토큰 0. 다국어 키 / placeholder / aria-label / 옵션 / 버튼 / legend.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext, ORDER } from './types';

// ---------- 카테고리 / 상수 ----------

const I18N = 'i18n' as const;
/** spec §3.1 — i18n 카테고리 hue (Variables/My Blocks 근처). */
const HUE = 330;

const T_STR = 'String';

// ---------- dropdown 옵션 ----------

/** 지원 언어 — Roll20 표준 4 종 (ko/en/ja/zh). */
const LANG_CODES: Array<[string, string]> = [
  ['한국어 (ko)', 'ko'],
  ['English (en)', 'en'],
  ['日本語 (ja)', 'ja'],
  ['中文 (zh)', 'zh'],
];

/** 버튼 타입 — Roll20 시트 버튼 표준 3 종. */
const BUTTON_TYPES: Array<[string, string]> = [
  ['button', 'button'],
  ['roll', 'roll'],
  ['action', 'action'],
];

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

/** ` class="sheet-${CLASS}"` — CLASS 비면 생략. */
function sheetClassAttr(cls: string): string {
  const v = String(cls ?? '').trim();
  if (!v) return '';
  return ` class="sheet-${escapeAttr(v)}"`;
}

/** dropdown 값 화이트리스트 검증 — 미허용 시 fallback. */
function pickAllowed(raw: string, opts: Array<[string, string]>, fallback: string): string {
  const allowed = new Set(opts.map(([, v]) => v));
  const s = String(raw ?? '').trim();
  return allowed.has(s) ? s : fallback;
}

/**
 * i18n key sanitize — 영숫자 / `_` / `-` / `.` 만 허용.
 * Roll20 translation.json 키 컨벤션. 비면 빈 문자열.
 */
function sanitizeKey(raw: string): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  return s.replace(/[^A-Za-z0-9_.\-]/g, '');
}

/** JSON 문자열 escape — locale value emit 용. */
function jsonEscape(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// ---------- 11 블록 정의 ----------

export const I18N_BLOCKS: BlockDef[] = [
  // 1) i18n text -----------------------------------------------------------
  {
    type: 'r20_i18n_text',
    shape: 'stack',
    category: I18N,
    label: '번역 글자',
    tooltip: '<span data-i18n="KEY">DEFAULT</span> — class 옵션.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.name'), 'KEY');
      b.appendDummyInput()
        .appendField('기본')
        .appendField(new Blockly.FieldTextInput('Default text'), 'DEFAULT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<span${sheetClassAttr(cls)}${attr('data-i18n', key)}>${escapeAttr(def)}</span>`;
    },
  },

  // 2) i18n ref (reporter — attr fragment) ---------------------------------
  {
    type: 'r20_i18n_ref',
    shape: 'reporter',
    category: I18N,
    label: '번역 키 연결',
    tooltip: '`data-i18n="KEY"` 속성 조각. 다른 요소 속성으로 연결.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('data-i18n=')
        .appendField(new Blockly.FieldTextInput('key.name'), 'KEY');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const frag = key ? `data-i18n="${escapeAttr(key)}"` : '';
      return [frag, ORDER.ATOMIC];
    },
  },

  // 3) i18n title ----------------------------------------------------------
  {
    type: 'r20_i18n_title',
    shape: 'stack',
    category: I18N,
    label: '번역 (말풍선 도움말)',
    tooltip: '<span title="DEFAULT" data-i18n-title="KEY"> — 툴팁 번역.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.tooltip'), 'KEY');
      b.appendDummyInput()
        .appendField('기본 title')
        .appendField(new Blockly.FieldTextInput('Tooltip text'), 'DEFAULT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return (
        `<span${attr('title', def)}${attr('data-i18n-title', key)}` +
        `${sheetClassAttr(cls)}></span>`
      );
    },
  },

  // 4) i18n placeholder (self-closing input) -------------------------------
  {
    type: 'r20_i18n_placeholder',
    shape: 'stack',
    category: I18N,
    label: '번역 (입력칸 안내문)',
    tooltip: '<input data-i18n-placeholder="KEY" placeholder="DEFAULT">.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.placeholder'), 'KEY');
      b.appendDummyInput()
        .appendField('기본 placeholder')
        .appendField(new Blockly.FieldTextInput('Placeholder'), 'DEFAULT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      return `<input${attr('data-i18n-placeholder', key)}${attr('placeholder', def)}>`;
    },
  },

  // 5) i18n aria-label -----------------------------------------------------
  {
    type: 'r20_i18n_aria_label',
    shape: 'stack',
    category: I18N,
    label: '번역 (스크린리더 라벨)',
    tooltip: '<span data-i18n-aria-label="KEY" aria-label="DEFAULT"> — 접근성 라벨.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.aria'), 'KEY');
      b.appendDummyInput()
        .appendField('기본 aria-label')
        .appendField(new Blockly.FieldTextInput('Accessible label'), 'DEFAULT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      return (
        `<span${attr('data-i18n-aria-label', key)}${attr('aria-label', def)}></span>`
      );
    },
  },

  // 6) i18n var pair (reporter — attr fragment) ----------------------------
  {
    type: 'r20_i18n_var_pair',
    shape: 'reporter',
    category: I18N,
    label: '번역에 값 끼우기',
    tooltip:
      'i18n placeholder 변수 — `data-i18n-var-NAME="VALUE"`. ${NAME} 자리에 VALUE 가 들어감.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('변수 이름')
        .appendField(new Blockly.FieldTextInput('name'), 'KEY')
        .appendField('=')
        .appendField(new Blockly.FieldTextInput(''), 'VAR_VALUE');
      b.setOutput(true, T_STR);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const value = String(b.getFieldValue('VAR_VALUE') ?? '');
      const frag = key ? `data-i18n-var-${escapeAttr(key)}="${escapeAttr(value)}"` : '';
      return [frag, ORDER.ATOMIC];
    },
  },

  // 7) locale value (translation.json entry — HTML comment) ----------------
  {
    type: 'r20_locale_value',
    shape: 'stack',
    category: I18N,
    label: '번역 사전 항목',
    tooltip:
      'translation.json 에 들어가는 엔트리. emit 시 HTML 주석으로 표시 — 후처리 도구가 추출.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('언어 코드')
        .appendField(new Blockly.FieldDropdown(LANG_CODES), 'LANG');
      b.appendDummyInput()
        .appendField('키')
        .appendField(new Blockly.FieldTextInput('key.name'), 'KEY');
      b.appendDummyInput()
        .appendField('값')
        .appendField(new Blockly.FieldTextInput('Translated value'), 'VALUE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const lang = pickAllowed(String(b.getFieldValue('LANG') ?? ''), LANG_CODES, 'en');
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const value = String(b.getFieldValue('VALUE') ?? '');
      if (!key) return '<!-- i18n: empty key -->';
      return `<!-- i18n[${lang}] "${jsonEscape(key)}": "${jsonEscape(value)}" -->`;
    },
  },

  // 8) i18n html (data-i18n-html allow HTML) -------------------------------
  {
    type: 'r20_i18n_html',
    shape: 'stack',
    category: I18N,
    label: '번역 (HTML 허용)',
    tooltip:
      '<span data-i18n-html="KEY">DEFAULT</span> — DEFAULT 가 HTML 로 해석됨 (escape 안 함).',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.html'), 'KEY');
      b.appendDummyInput()
        .appendField('기본 HTML')
        .appendField(new Blockly.FieldTextInput('<b>Default</b>'), 'DEFAULT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      // DEFAULT 는 HTML 그대로 — escape 하지 않음 (data-i18n-html 의 의도).
      return `<span${attr('data-i18n-html', key)}>${def}</span>`;
    },
  },

  // 9) i18n select option --------------------------------------------------
  {
    type: 'r20_i18n_select_option',
    shape: 'stack',
    category: I18N,
    label: '번역 (선택 항목)',
    tooltip:
      '<option value="VALUE" data-i18n="KEY">DEFAULT</option> — <select> 안에 위치.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.option'), 'KEY');
      b.appendDummyInput()
        .appendField('기본 라벨')
        .appendField(new Blockly.FieldTextInput('Option'), 'DEFAULT');
      b.appendDummyInput()
        .appendField('값')
        .appendField(new Blockly.FieldTextInput('value'), 'VALUE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const value = String(b.getFieldValue('VALUE') ?? '');
      return (
        `<option${attr('value', value)}${attr('data-i18n', key)}>` +
        `${escapeAttr(def)}</option>`
      );
    },
  },

  // 10) i18n button --------------------------------------------------------
  {
    type: 'r20_i18n_button',
    shape: 'stack',
    category: I18N,
    label: '번역 버튼',
    tooltip: '<button type="TYPE" name="NAME" data-i18n="KEY">DEFAULT</button>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.button'), 'KEY');
      b.appendDummyInput()
        .appendField('기본 라벨')
        .appendField(new Blockly.FieldTextInput('Button'), 'DEFAULT');
      b.appendDummyInput()
        .appendField('타입')
        .appendField(new Blockly.FieldDropdown(BUTTON_TYPES), 'TYPE');
      b.appendDummyInput()
        .appendField('이름')
        .appendField(new Blockly.FieldTextInput(''), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      const type = pickAllowed(String(b.getFieldValue('TYPE') ?? ''), BUTTON_TYPES, 'button');
      const name = String(b.getFieldValue('NAME') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return (
        `<button${attr('type', type)}${attr('name', name)}` +
        `${sheetClassAttr(cls)}${attr('data-i18n', key)}>${escapeAttr(def)}</button>`
      );
    },
  },

  // 11) i18n legend (fieldset legend) --------------------------------------
  {
    type: 'r20_i18n_legend',
    shape: 'stack',
    category: I18N,
    label: '번역 (그룹 제목)',
    tooltip: '<legend data-i18n="KEY">DEFAULT</legend> — <fieldset> 제목.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('번역 키')
        .appendField(new Blockly.FieldTextInput('key.legend'), 'KEY');
      b.appendDummyInput()
        .appendField('기본 텍스트')
        .appendField(new Blockly.FieldTextInput('Section'), 'DEFAULT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const key = sanitizeKey(String(b.getFieldValue('KEY') ?? ''));
      const def = String(b.getFieldValue('DEFAULT') ?? '');
      return `<legend${attr('data-i18n', key)}>${escapeAttr(def)}</legend>`;
    },
  },
];

/**
 * Stage A-7 — i18n 11 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerI18nBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of I18N_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-7 의 generator 매핑 — emit-worker lookup. */
export const I18N_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  I18N_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

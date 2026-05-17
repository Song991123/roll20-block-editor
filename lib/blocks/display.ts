/**
 * Display 카테고리 — 7 블록 (Stage A-4).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 3 (표시 / Display, hue 290).
 *   - docs/spec/02_functional_spec.md §3.2 — stack 위주 (정적 가시 요소).
 *   - docs/spec/04_block_taxonomy_v2.md (Display 카탈로그).
 *   - docs/spec/12_roll20_output_spec.md §2 (HTML emit contract — sheet-* class).
 *
 * 화면에 보이는 정적 요소 — heading / hr / static text / image / icon / spacer / disabled text.
 * 시스템 specific 토큰 0. 일반화된 시각 요소만.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';

// ---------- 카테고리 / 상수 ----------

const DISPLAY = 'display' as const;
/** spec §3.1 — 표시 카테고리 hue. */
const HUE = 290;

// ---------- dropdown 옵션 ----------

/** <hN> 레벨 — 1~6 (HTML 표준). */
const HEADING_LEVELS: Array<[string, string]> = [
  ['h1', '1'],
  ['h2', '2'],
  ['h3', '3'],
  ['h4', '4'],
  ['h5', '5'],
  ['h6', '6'],
];

/**
 * 아이콘 이름 — 시스템 비종속 일반 UI 아이콘 셋.
 * sheet-icon-${NAME} 으로 emit. 실제 글리프는 시트 CSS 에서 정의.
 */
const ICON_NAMES: Array<[string, string]> = [
  ['별', 'star'],
  ['하트', 'heart'],
  ['방패', 'shield'],
  ['검', 'sword'],
  ['책', 'book'],
  ['가방', 'bag'],
  ['눈', 'eye'],
  ['편집', 'edit'],
  ['더하기', 'plus'],
  ['빼기', 'minus'],
  ['체크', 'check'],
  ['엑스', 'cross'],
  ['정보', 'info'],
  ['경고', 'warning'],
];

/** spacer 높이 토큰. */
const SPACER_SIZES: Array<[string, string]> = [
  ['작게', 'small'],
  ['중간', 'medium'],
  ['크게', 'large'],
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

/** ` class="sheet-foo sheet-bar"` — 토큰별 sheet- prefix. CLASS 비면 생략.
 * multi-class fix: 매처는 토큰별 prefix 를 떼므로 emit 도 토큰별로 부착해야
 * round-trip byte-identical 성립. */
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

/** ` class="${BASE} sheet-foo sheet-bar"` — BASE 는 무조건 포함, 사용자 CLASS
 * 토큰은 각각 sheet- prefix 부착 (multi-class fix). */
function sheetClassAttrWithBase(base: string, cls: string): string {
  const v = String(cls ?? '').trim();
  if (!v) return ` class="${escapeAttr(base)}"`;
  const out = v
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.startsWith('sheet-') ? t : `sheet-${t}`))
    .join(' ');
  return ` class="${escapeAttr(base)} ${escapeAttr(out)}"`;
}

/** 숫자 크기 → 양의 정수 문자열 또는 ''. */
function sanitizeSize(raw: string): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.floor(n));
}

// ---------- 7 블록 정의 ----------

export const DISPLAY_BLOCKS: BlockDef[] = [
  // 1) heading --------------------------------------------------------------
  {
    type: 'r20_heading',
    shape: 'stack',
    category: DISPLAY,
    label: '제목',
    tooltip: '제목 — <h1>~<h6>. 레벨 + 텍스트 + class.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('제목')
        .appendField(new Blockly.FieldDropdown(HEADING_LEVELS), 'LEVEL')
        .appendField(new Blockly.FieldTextInput('Heading'), 'TEXT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const levelRaw = String(b.getFieldValue('LEVEL') ?? '1');
      const levelNum = Number(levelRaw);
      const level =
        Number.isFinite(levelNum) && levelNum >= 1 && levelNum <= 6
          ? String(Math.floor(levelNum))
          : '1';
      const text = String(b.getFieldValue('TEXT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<h${level}${sheetClassAttr(cls)}>${escapeAttr(text)}</h${level}>`;
    },
  },

  // 2) hr -------------------------------------------------------------------
  {
    type: 'r20_hr',
    shape: 'stack',
    category: DISPLAY,
    label: '가로 구분선',
    tooltip: '구분선 — <hr>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('가로 구분선')
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<hr${sheetClassAttr(cls)}>`;
    },
  },

  // 3) static text ----------------------------------------------------------
  {
    type: 'r20_static_text',
    shape: 'stack',
    category: DISPLAY,
    label: '고정 글자',
    tooltip: '고정 라벨 — <span>TEXT</span>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('고정 글자')
        .appendField(new Blockly.FieldTextInput('Label'), 'TEXT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const text = String(b.getFieldValue('TEXT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<span${sheetClassAttr(cls)}>${escapeAttr(text)}</span>`;
    },
  },

  // 4) image ----------------------------------------------------------------
  {
    type: 'r20_image',
    shape: 'stack',
    category: DISPLAY,
    label: '이미지',
    tooltip: '이미지 — <img src=... alt=...>. width/height 비면 생략.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('이미지')
        .appendField('이미지 주소')
        .appendField(new Blockly.FieldTextInput(''), 'SRC');
      b.appendDummyInput()
        .appendField('대체 글자')
        .appendField(new Blockly.FieldTextInput(''), 'ALT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('width')
        .appendField(new Blockly.FieldTextInput(''), 'WIDTH')
        .appendField('height')
        .appendField(new Blockly.FieldTextInput(''), 'HEIGHT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const src = String(b.getFieldValue('SRC') ?? '');
      const alt = String(b.getFieldValue('ALT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const width = sanitizeSize(String(b.getFieldValue('WIDTH') ?? ''));
      const height = sanitizeSize(String(b.getFieldValue('HEIGHT') ?? ''));
      return (
        `<img${attr('src', src)}${attr('alt', alt)}${sheetClassAttr(cls)}` +
        `${attr('width', width)}${attr('height', height)}>`
      );
    },
  },

  // 5) icon -----------------------------------------------------------------
  {
    type: 'r20_icon',
    shape: 'stack',
    category: DISPLAY,
    label: '아이콘',
    tooltip: '아이콘 — <i class="sheet-icon sheet-icon-NAME">. 글리프는 시트 CSS.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('아이콘')
        .appendField(new Blockly.FieldDropdown(ICON_NAMES), 'NAME');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const nameRaw = String(b.getFieldValue('NAME') ?? '');
      // 허용된 값만 통과 (dropdown 값). 비면 fallback 'star'.
      const allowed = new Set(ICON_NAMES.map(([, v]) => v));
      const name = allowed.has(nameRaw) ? nameRaw : 'star';
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const base = `sheet-icon sheet-icon-${name}`;
      return `<i${sheetClassAttrWithBase(base, cls)}></i>`;
    },
  },

  // 6) spacer ---------------------------------------------------------------
  {
    type: 'r20_spacer',
    shape: 'stack',
    category: DISPLAY,
    label: '여백',
    tooltip: '수직 여백 — <div class="sheet-spacer sheet-spacer-SIZE">.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('여백')
        .appendField(new Blockly.FieldDropdown(SPACER_SIZES), 'SIZE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const sizeRaw = String(b.getFieldValue('SIZE') ?? 'medium');
      const allowed = new Set(SPACER_SIZES.map(([, v]) => v));
      const size = allowed.has(sizeRaw) ? sizeRaw : 'medium';
      return `<div class="sheet-spacer sheet-spacer-${size}"></div>`;
    },
  },

  // 7) disabled text --------------------------------------------------------
  {
    type: 'r20_disabled_text',
    shape: 'stack',
    category: DISPLAY,
    label: '흐린 안내 글자',
    tooltip: '비활성 표시 — <span aria-disabled="true">TEXT</span>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('비활성 텍스트')
        .appendField(new Blockly.FieldTextInput('Disabled'), 'TEXT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const text = String(b.getFieldValue('TEXT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const base = 'sheet-disabled-text';
      return `<span${sheetClassAttrWithBase(base, cls)} aria-disabled="true">${escapeAttr(text)}</span>`;
    },
  },

  // 8) inline bold ----------------------------------------------------------
  {
    type: 'r20_inline_bold',
    shape: 'stack',
    category: DISPLAY,
    label: '굵은 글자',
    tooltip: '굵은 글자 — <b>TEXT</b>. 굵게 강조.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('굵은 글자')
        .appendField(new Blockly.FieldTextInput('Bold'), 'TEXT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const text = String(b.getFieldValue('TEXT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<b${sheetClassAttr(cls)}>${escapeAttr(text)}</b>`;
    },
  },

  // 9) inline italic --------------------------------------------------------
  {
    type: 'r20_inline_italic',
    shape: 'stack',
    category: DISPLAY,
    label: '기울임 글자',
    tooltip: '기울임 글자 — <em>TEXT</em>. 기울여 강조.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('기울임 글자')
        .appendField(new Blockly.FieldTextInput('Italic'), 'TEXT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const text = String(b.getFieldValue('TEXT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<em${sheetClassAttr(cls)}>${escapeAttr(text)}</em>`;
    },
  },

  // 10) table caption -------------------------------------------------------
  {
    type: 'r20_table_caption',
    shape: 'stack',
    category: DISPLAY,
    label: '표 제목',
    tooltip: '표 제목 — <caption>TEXT</caption>. <table> 내부 첫 자식.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('표 제목')
        .appendField(new Blockly.FieldTextInput('Caption'), 'TEXT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const text = String(b.getFieldValue('TEXT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      return `<caption${sheetClassAttr(cls)}>${escapeAttr(text)}</caption>`;
    },
  },

  // 11) inline break --------------------------------------------------------
  {
    type: 'r20_inline_break',
    shape: 'stack',
    category: DISPLAY,
    label: '줄바꿈',
    tooltip: '줄바꿈 — <br>. void element.',
    init: mkInit((b) => {
      b.appendDummyInput().appendField('줄바꿈');
      setStatementHooks(b);
    }),
    generator: () => {
      return `<br>`;
    },
  },
];

/**
 * Stage A-4 — Display 7 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerDisplayBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of DISPLAY_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-4 의 generator 매핑 — emit-worker lookup. */
export const DISPLAY_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  DISPLAY_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

/**
 * Container 카테고리 (Stage A-2).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 1 (컨테이너 / Container, hue 180).
 *   - docs/spec/02_functional_spec.md §3.2 — c (statement slot) + stack.
 *   - docs/spec/04_block_taxonomy_v2.md (Container 카탈로그).
 *   - docs/spec/12_roll20_output_spec.md §2 (HTML emit contract).
 *
 * Roll20 시트 markup 의 뼈대 — div / span / fieldset / table 계열 + Roll20
 * 고유 repeating section. 각 블록 generator 는 자식 statement chain 을
 * 합쳐 완성된 HTML 태그 문자열을 반환.
 *
 * 시스템 specific 토큰 0. 일반화된 시트 컴포넌트만.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';
import { styleAttr, mergeStyle } from './style_field';
import { SEMANTIC_CONTAINER_TAGS } from './semanticTags';
import { isEditableElementTag, isVoidElementTag } from './elementTags';
import { isInlineMarkup, startsInlineMarkup } from './inlineMarkup';

// ---------- 카테고리 / 상수 ----------

const CONTAINER = 'container' as const;
/** spec §3.1 — 컨테이너 카테고리 hue. */
const HUE = 180;

// ---------- init helper ----------

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

/** 일반 컨테이너 / stack 의 prev/next 공통 (untyped — 모든 컨테이너 호환). */
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

/** `<tag attrs>\n  content\n</tag>` 형태 wrap. content 비면 self-collapse. */
function wrapTag(
  ctx: GeneratorContext,
  tag: string,
  attrs: string,
  content: string,
): string {
  // Preserve an intentional whitespace text block between inline children.
  // `statementToCode` returns an empty string only when there are no children.
  if (!content) return `<${tag}${attrs}></${tag}>`;
  if (isInlineMarkup(content) || startsInlineMarkup(content)) {
    return `<${tag}${attrs}>${content}</${tag}>`;
  }
  return `<${tag}${attrs}>\n${ctx.indent(content)}\n</${tag}>`;
}

/** ` class="..."` 또는 빈 문자열 — class 없을 때 attr 자체 생략. */
/** `class="BASE sheet-foo"` for structural blocks with a built-in class. */
function sheetClassAttrWithBase(base: string, value: string): string {
  const v = String(value ?? '').trim();
  if (!v) return ` class="${escapeAttr(base)}"`;
  const user = v
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.startsWith('sheet-') ? token : `sheet-${token}`))
    .join(' ');
  return ` class="${escapeAttr(base)} ${escapeAttr(user)}"`;
}

/**
 * 사용자 입력 class 토큰에 sheet- prefix 재부착 → emit.
 * 매처가 import 시 sheet- 접두를 떼서 CLASS 필드를 정규화한다 (input.ts 의
 * sheetClassAttr 와 동일 규약). 컨테이너 generator 도 이 규약을 따른다 — 안 그러면
 * `.sheet-foo[value="1"]:checked ~ .sheet-bar` 같은 CSS sibling-trick 셀렉터가
 * 라운드트립 후 매칭 실패 (era / pulp 영역 hidden).
 *
 * 빈 토큰은 결과에서 제거. 이미 sheet- 로 시작하는 토큰은 중복 방지로 그대로 둠
 * (특수 케이스: 일부 r20_row / r20_col 등이 리터럴로 'sheet-row' 를 넘긴다).
 */
function sheetUserClassAttr(value: string): string {
  const v = String(value ?? '').trim();
  if (!v) return '';
  const out = v
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.startsWith('sheet-') ? t : `sheet-${t}`))
    .join(' ');
  return ` class="${escapeAttr(out)}"`;
}

function generatedPositionClass(blockId: string): string {
  const safe = String(blockId || 'position')
    .replace(/[^a-zA-Z0-9_-]/g, (char) => `_${char.charCodeAt(0).toString(36)}_`)
    .slice(0, 80);
  return `sheet-r20-position-${safe || 'position'}`;
}

/** ` name="..."` (Roll20 attribute name 등). */
function nameAttr(attrName: string, value: string): string {
  const v = value.trim();
  if (!v) return '';
  return ` ${attrName}="${escapeAttr(v)}"`;
}

// ---------- 공통 init 헬퍼: 단일 CONTENT slot 컨테이너 ----------

/**
 * c-shape — 헤더 행에 부가 필드 0~N개 + CONTENT statement slot.
 * topFields 는 Blockly.Input 에 필드를 append 하는 콜백.
 */
function buildCBlock(
  b: Blockly.Block,
  topFields: (input: Blockly.Input) => void,
): void {
  topFields(b.appendDummyInput());
  // STYLE 필드 — inline `style="..."` 보존 (모든 c-shape 컨테이너 공통).
  // legacy-sheet-corpus legacy corpus 측정 결과 style 607 건 100% 손실 — 모든 시트 generic fix.
  // Anchor: docs/validation/verify/fixtureC_1bu_structural.md §4.3.
  b.appendDummyInput()
    .appendField('스타일')
    .appendField(new Blockly.FieldTextInput(''), 'STYLE');
  b.appendStatementInput('CONTENT').setCheck(null);
  setStatementHooks(b);
}

// ---------- 블록 정의 ----------

export const CONTAINER_BLOCKS: BlockDef[] = [
  // 1) div ------------------------------------------------------------------
  {
    type: 'r20_div',
    shape: 'c',
    category: CONTAINER,
    label: '박스 (그룹)',
    tooltip: '일반 div 컨테이너. class 지정 가능.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('박스 (그룹)')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 2) span -----------------------------------------------------------------
  {
    type: 'r20_span',
    shape: 'c',
    category: CONTAINER,
    label: '글자 묶음',
    tooltip: '인라인 span 컨테이너. class 지정 가능.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('글자 묶음')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'span', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 3) fieldset -------------------------------------------------------------
  {
    type: 'r20_fieldset',
    shape: 'c',
    category: CONTAINER,
    label: '둘러싸인 그룹',
    tooltip: 'fieldset — 폼 그룹화.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('둘러싸인 그룹')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'fieldset', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 4) semantic HTML container ---------------------------------------------
  // Keep standard semantic tags editable without forcing them into raw HTML.
  // The importer and generator share the same allow-list so an import -> emit
  // round-trip cannot silently change the element name.
  {
    type: 'r20_semantic_container',
    shape: 'c',
    category: CONTAINER,
    label: '의미 있는 묶음',
    tooltip: 'main, section, article, figure 같은 HTML 구조 태그를 보존합니다.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('의미 있는 묶음')
          .appendField(new Blockly.FieldDropdown(
            SEMANTIC_CONTAINER_TAGS.map((tag) => [tag, tag]),
          ), 'TAG')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const tagRaw = String(b.getFieldValue('TAG') ?? 'section');
      const tag = SEMANTIC_CONTAINER_TAGS.includes(
        tagRaw as (typeof SEMANTIC_CONTAINER_TAGS)[number],
      )
        ? tagRaw
        : 'section';
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const style = String(b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, tag, `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
    inspectorSchema: [
      {
        name: 'TAG',
        label: '태그',
        kind: 'select',
        options: SEMANTIC_CONTAINER_TAGS.map((tag) => ({ value: tag, label: tag })),
      },
      { name: 'CLASS', label: '클래스', kind: 'text' },
      { name: 'STYLE', label: '스타일', kind: 'text' },
    ],
  },

  // 5) generic editable element --------------------------------------------
  // Unknown but safe elements remain structural instead of becoming opaque
  // raw HTML. This is the universal escape route for custom sheet markup.
  {
    type: 'r20_element_container',
    shape: 'c',
    category: CONTAINER,
    label: 'HTML 요소 묶음',
    tooltip: '안전한 HTML 태그 이름을 보존하고 내부 요소를 편집합니다.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('HTML 요소 묶음')
          .appendField('태그')
          .appendField(new Blockly.FieldTextInput('section'), 'TAG')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const tagRaw = String(b.getFieldValue('TAG') ?? 'section').trim().toLowerCase();
      const tag = isEditableElementTag(tagRaw) && !isVoidElementTag(tagRaw)
        ? tagRaw
        : 'section';
      if (tag !== tagRaw) {
        ctx.warn(
          b.id,
          'INVALID_ELEMENT_TAG',
          '내용을 담을 수 없는 태그이거나 안전하지 않아 section으로 바꿨습니다.',
          'warning',
        );
      }
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const style = String(b.getFieldValue('STYLE') ?? '');
      const attrs = `${sheetUserClassAttr(cls)}${styleAttr(style)}`;
      return wrapTag(ctx, tag, attrs, ctx.statementToCode(block, 'CONTENT'));
    },
    inspectorSchema: [
      { name: 'TAG', label: '태그', kind: 'text', placeholder: 'article' },
      { name: 'CLASS', label: '클래스', kind: 'text' },
      { name: 'STYLE', label: '스타일', kind: 'text' },
    ],
  },

  // 6) generic editable void element ----------------------------------------
  // HTML void elements are always leaves. Keeping them out of the generic
  // container prevents impossible child slots and false inside-drop targets.
  {
    type: 'r20_element_atom',
    shape: 'stack',
    category: CONTAINER,
    label: 'HTML 단일 요소',
    tooltip: '줄바꿈처럼 내용을 담지 않는 HTML 요소를 그대로 보존합니다.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('HTML 단일 요소')
        .appendField('태그')
        .appendField(new Blockly.FieldTextInput('br'), 'TAG')
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const tagRaw = String(b.getFieldValue('TAG') ?? 'br').trim().toLowerCase();
      const tag = isEditableElementTag(tagRaw) && isVoidElementTag(tagRaw)
        ? tagRaw
        : 'br';
      if (tag !== tagRaw) {
        ctx.warn(
          b.id,
          'INVALID_VOID_ELEMENT_TAG',
          '내용을 담는 태그이거나 안전하지 않아 br로 바꿨습니다.',
          'warning',
        );
      }
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const style = String(b.getFieldValue('STYLE') ?? '');
      return `<${tag}${sheetUserClassAttr(cls)}${styleAttr(style)}>`;
    },
    inspectorSchema: [
      { name: 'TAG', label: '태그', kind: 'text', placeholder: 'br' },
      { name: 'CLASS', label: '클래스', kind: 'text' },
      { name: 'STYLE', label: '스타일', kind: 'text' },
    ],
  },

  // 7) row ------------------------------------------------------------------
  {
    type: 'r20_row',
    shape: 'c',
    category: CONTAINER,
    label: '가로 줄',
    tooltip: '가로 행 — sheet-row.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('가로 줄')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const _b = block as Blockly.Block;
      const style = String(_b.getFieldValue('STYLE') ?? '');
      const cls = String(_b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${sheetClassAttrWithBase('sheet-row', cls)}${styleAttr(style)}`, content);
    },
  },

  // 5) col ------------------------------------------------------------------
  {
    type: 'r20_col',
    shape: 'c',
    category: CONTAINER,
    label: '세로 줄',
    tooltip: '세로 열 — sheet-col.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('세로 줄')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const _b = block as Blockly.Block;
      const style = String(_b.getFieldValue('STYLE') ?? '');
      const cls = String(_b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${sheetClassAttrWithBase('sheet-col', cls)}${styleAttr(style)}`, content);
    },
  },

  // 6) colrow_n -------------------------------------------------------------
  {
    type: 'r20_colrow_n',
    shape: 'c',
    category: CONTAINER,
    label: '여러 칸 가로 줄',
    tooltip: 'N개 컬럼으로 분할되는 행 — sheet-colrow sheet-colrow-N.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('여러 칸 가로 줄 · 칸 수=')
          .appendField(new Blockly.FieldNumber(2, 1, 12, 1), 'N')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const n = Number(b.getFieldValue('N') ?? 2);
      const safe = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
      const content = ctx.statementToCode(block, 'CONTENT');
      if (ctx.addGeneratedCss) {
        ctx.addGeneratedCss(
          `:where(.sheet-colrow-${safe}) { display: grid; gap: 0.5rem; margin-bottom: 0.5rem; grid-template-columns: repeat(${safe}, 1fr); }`,
        );
      }
      return wrapTag(ctx, 'div', `${sheetClassAttrWithBase(`sheet-colrow sheet-colrow-${safe}`, cls)}${styleAttr(style)}`, content);
    },
  },

  // 7) table ----------------------------------------------------------------
  {
    type: 'r20_table',
    shape: 'c',
    category: CONTAINER,
    label: '표',
    tooltip: 'table — thead/tbody/tr/th/td 와 함께 사용.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('표')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'table', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 8) thead ----------------------------------------------------------------
  {
    type: 'r20_colgroup',
    shape: 'c',
    category: CONTAINER,
    label: '표 열 묶음',
    tooltip: 'table 안의 열 정의를 묶습니다.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('표 열 묶음')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS')
          .appendField('열 수')
          .appendField(new Blockly.FieldNumber(0, 0, 99999, 1), 'SPAN');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const span = Number(b.getFieldValue('SPAN') ?? 0);
      const spanAttr = Number.isFinite(span) && span > 0 ? ` span="${Math.floor(span)}"` : '';
      const style = String(b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'colgroup', `${sheetUserClassAttr(cls)}${spanAttr}${styleAttr(style)}`, content);
    },
  },

  // table col ---------------------------------------------------------------
  {
    type: 'r20_table_col',
    shape: 'stack',
    category: CONTAINER,
    label: '표 열',
    tooltip: 'table 열 하나의 크기와 클래스를 지정합니다.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('표 열')
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('열 수')
        .appendField(new Blockly.FieldNumber(0, 0, 99999, 1), 'SPAN')
        .appendField('너비')
        .appendField(new Blockly.FieldTextInput(''), 'WIDTH');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const span = Number(b.getFieldValue('SPAN') ?? 0);
      const spanAttr = Number.isFinite(span) && span > 0 ? ` span="${Math.floor(span)}"` : '';
      const width = String(b.getFieldValue('WIDTH') ?? '').trim();
      const widthAttr = width ? ` width="${escapeAttr(width)}"` : '';
      const style = String(b.getFieldValue('STYLE') ?? '');
      return `<col${sheetUserClassAttr(cls)}${spanAttr}${widthAttr}${styleAttr(style)}>`;
    },
  },

  // table head --------------------------------------------------------------
  {
    type: 'r20_thead',
    shape: 'c',
    category: CONTAINER,
    label: '표 머리',
    tooltip: 'table 헤더 묶음.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('표 머리')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'thead', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 9) tbody ----------------------------------------------------------------
  {
    type: 'r20_tbody',
    shape: 'c',
    category: CONTAINER,
    label: '표 몸통',
    tooltip: 'table 본문 묶음.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('표 몸통')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'tbody', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 10) tr ------------------------------------------------------------------
  {
    type: 'r20_tr',
    shape: 'c',
    category: CONTAINER,
    label: '표의 한 줄',
    tooltip: 'table 행. 내부에 th/td.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('표의 한 줄')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'tr', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 11) th ------------------------------------------------------------------
  {
    type: 'r20_th',
    shape: 'c',
    category: CONTAINER,
    label: '표의 머리 칸',
    tooltip: 'table 헤더 셀.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('표의 머리 칸')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'th', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 12) td ------------------------------------------------------------------
  {
    type: 'r20_td',
    shape: 'c',
    category: CONTAINER,
    label: '표의 칸',
    tooltip: 'table 데이터 셀.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('표의 칸')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'td', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 13) repeating_section ---------------------------------------------------
  //
  // Roll20 표준: <fieldset class="repeating_NAME"> ... </fieldset>.
  // NAME 은 영문 소문자 / 숫자 / 언더스코어. 사용자 입력 검증은 emit
  // 단계 / SheetWorker linter 가 별도 담당.
  {
    type: 'r20_repeating_section',
    shape: 'c',
    category: CONTAINER,
    label: '반복 영역',
    tooltip: 'Roll20 repeating section — 행 추가 / 삭제 가능한 섹션.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('반복 영역 이름')
          .appendField(new Blockly.FieldTextInput('items'), 'NAME')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'items';
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'fieldset', `${sheetClassAttrWithBase(`repeating_${name}`, cls)}${styleAttr(style)}`, content);
    },
  },

  // 14) repeating_row -------------------------------------------------------
  //
  // 반복 섹션 안의 단일 행 template. 시각적 그루핑용 wrapper div.
  {
    type: 'r20_repeating_row',
    shape: 'c',
    category: CONTAINER,
    label: '반복 영역의 한 줄',
    tooltip: '반복 섹션 안의 한 행 — sheet-repeating-row.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('반복 영역의 한 줄')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const _b = block as Blockly.Block;
      const style = String(_b.getFieldValue('STYLE') ?? '');
      const cls = String(_b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${sheetClassAttrWithBase('sheet-repeating-row', cls)}${styleAttr(style)}`, content);
    },
  },

  // 15) label ---------------------------------------------------------------
  //
  // 단순 텍스트 label. stack — 자식 슬롯 없음.
  {
    type: 'r20_label',
    shape: 'stack',
    category: CONTAINER,
    label: '이름표',
    tooltip: '단순 텍스트 라벨 — <label>텍스트</label>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('이름표')
        .appendField(new Blockly.FieldTextInput('이름'), 'TEXT');
      b.appendDummyInput()
        .appendField('클래스')
        .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      b.appendDummyInput()
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const text = String(b.getFieldValue('TEXT') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const safe = escapeAttr(text);
      return `<label${sheetUserClassAttr(cls)}${styleAttr(style)}>${safe}</label>`;
    },
  },

  // Structural label that contains controls or other child elements.
  {
    type: 'r20_label_container',
    shape: 'c',
    category: CONTAINER,
    label: '컨트롤 라벨 그룹',
    tooltip: '자식 입력 요소를 포함하는 label 컨테이너. for/class/style과 내부 순서를 보존합니다.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('컨트롤 라벨 그룹')
          .appendField('for')
          .appendField(new Blockly.FieldTextInput(''), 'FOR')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const forValue = String(b.getFieldValue('FOR') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const style = String(b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(
        ctx,
        'label',
        `${nameAttr('for', forValue)}${sheetUserClassAttr(cls)}${styleAttr(style)}`,
        content,
      );
    },
  },

  // Structural list container for both unordered and ordered lists.
  {
    type: 'r20_list',
    shape: 'c',
    category: CONTAINER,
    label: '목록',
    tooltip: 'ul/ol 목록 컨테이너. 내부 항목 순서를 보존합니다.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('목록')
          .appendField(new Blockly.FieldDropdown([
            ['순서 없음 (ul)', 'ul'],
            ['순서 있음 (ol)', 'ol'],
          ]), 'TAG')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const tag = String(b.getFieldValue('TAG') ?? 'ul') === 'ol' ? 'ol' : 'ul';
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const style = String(b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, tag, `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // Structural list item. Keeping this separate makes layer insertion inside
  // lists explicit instead of treating every item as an opaque HTML blob.
  {
    type: 'r20_list_item',
    shape: 'c',
    category: CONTAINER,
    label: '목록 항목',
    tooltip: 'ul/ol 내부의 li 항목. 내부 순서와 자식 구조를 보존합니다.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('목록 항목')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const style = String(b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'li', `${sheetUserClassAttr(cls)}${styleAttr(style)}`, content);
    },
  },

  // 19) section_wrap --------------------------------------------------------
  //
  // 시트의 논리적 섹션 — Roll20 의 sheet-* class 관례 따름.
  {
    type: 'r20_section_wrap',
    shape: 'c',
    category: CONTAINER,
    label: '섹션 묶음',
    tooltip: '시트 섹션 wrapper — sheet-section sheet-section-NAME.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('섹션 묶음 이름')
          .appendField(new Blockly.FieldTextInput('main'), 'NAME')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'main';
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(
        ctx,
        'div',
        `${sheetClassAttrWithBase(`sheet-section sheet-section-${name}`, cls)}${styleAttr(style)}`,
        content,
      );
    },
  },

  // 17) toggle_wrap ---------------------------------------------------------
  //
  // 조건부 표시 그룹. CSS `:checked ~ .sheet-toggle-NAME` 패턴과 함께 사용.
  {
    type: 'r20_toggle_wrap',
    shape: 'c',
    category: CONTAINER,
    label: '펼치기 / 접기 묶음',
    tooltip: '조건부 노출 그룹 — sheet-toggle sheet-toggle-NAME.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('펼치기/접기 묶음 이름')
          .appendField(new Blockly.FieldTextInput('panel'), 'NAME')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'panel';
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(
        ctx,
        'div',
        `${sheetClassAttrWithBase(`sheet-toggle sheet-toggle-${name}`, cls)}${nameAttr('data-toggle', name)}${styleAttr(style)}`,
        content,
      );
    },
  },

  // 18) grid ----------------------------------------------------------------
  //
  // CSS Grid 컨테이너. COLS 컬럼 수 → inline style 로 grid-template-columns.
  {
    type: 'r20_grid',
    shape: 'c',
    category: CONTAINER,
    label: '격자 배치',
    tooltip: 'CSS Grid 컨테이너 — COLS 컬럼.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('격자 배치 · 칸 수=')
          .appendField(new Blockly.FieldNumber(2, 1, 12, 1), 'COLS')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const userStyle = String(b.getFieldValue('STYLE') ?? '');
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const cols = Number(b.getFieldValue('COLS') ?? 2);
      const safe = Number.isFinite(cols) && cols >= 1 ? Math.floor(cols) : 2;
      const content = ctx.statementToCode(block, 'CONTENT');
      const builtinStyle = `grid-template-columns: repeat(${safe}, 1fr)`;
      const mergedStyle = mergeStyle(userStyle, builtinStyle);
      return wrapTag(ctx, 'div', `${sheetClassAttrWithBase('sheet-grid', cls)}${mergedStyle}`, content);
    },
  },

  // ──────────────────────────────────────────────────────────────────
  // Phase C WYSIWYG — 절대 위치 박스. LEFT_PX / TOP_PX 필드를 가져
  // shadow DOM drag-to-move 의 round-trip 시연용 + 시트 위에 자유 배치
  // 박스를 만들고 싶은 사용자 시나리오. position:absolute + left/top inline
  // style 로 emit (시스템 specific 0 — 일반 CSS).
  // Anchor: docs/spec/17_wysiwyg_mode.md §12 Phase C.
  // ──────────────────────────────────────────────────────────────────
  {
    type: 'r20_pos_div',
    shape: 'c',
    category: CONTAINER,
    label: '절대 위치 박스',
    tooltip: 'position:absolute 박스 — left/top px 지정. 미리보기에서 드래그로 이동 가능.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('절대 위치 박스')
          .appendField('왼쪽=')
          .appendField(new Blockly.FieldNumber(0, 0, 99999, 1), 'LEFT_PX')
          .appendField('위=')
          .appendField(new Blockly.FieldNumber(0, 0, 99999, 1), 'TOP_PX')
          .appendField('너비=')
          .appendField(new Blockly.FieldNumber(120, 1, 99999, 1), 'WIDTH_PX')
          .appendField('높이=')
          .appendField(new Blockly.FieldNumber(60, 1, 99999, 1), 'HEIGHT_PX')
          .appendField('클래스')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const userStyle = String(b.getFieldValue('STYLE') ?? '');
      const left = Number(b.getFieldValue('LEFT_PX') ?? 0);
      const top = Number(b.getFieldValue('TOP_PX') ?? 0);
      const w = Number(b.getFieldValue('WIDTH_PX') ?? 120);
      const h = Number(b.getFieldValue('HEIGHT_PX') ?? 60);
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      const positionClass = generatedPositionClass(b.id);
      const generatedRule = `.${positionClass} { position: absolute; left: ${left}px; top: ${top}px; width: ${w}px; height: ${h}px;${userStyle ? ` ${userStyle}` : ''} }`;
      if (ctx.addGeneratedCss) {
        ctx.addGeneratedCss(generatedRule);
        return wrapTag(ctx, 'div', sheetUserClassAttr(`${cls} ${positionClass}`), content);
      }
      // Keep direct generator consumers backwards-compatible. The production
      // emitter always provides addGeneratedCss, so normal output stays clean.
      const builtinStyle = `position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;`;
      const mergedStyle = mergeStyle(userStyle, builtinStyle);
      return wrapTag(ctx, 'div', `${sheetUserClassAttr(cls)}${mergedStyle}`, content);
    },
  },
];

/**
 * Stage A-2 — Container 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerContainerBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of CONTAINER_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-2 의 generator 매핑 — emit-worker lookup. */
export const CONTAINER_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  CONTAINER_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

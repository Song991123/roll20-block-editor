/**
 * Container 카테고리 — 18 블록 (Stage A-2).
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
  if (!content || !content.trim()) return `<${tag}${attrs}></${tag}>`;
  return `<${tag}${attrs}>\n${ctx.indent(content)}\n</${tag}>`;
}

/** ` class="..."` 또는 빈 문자열 — class 없을 때 attr 자체 생략. */
function classAttr(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return ` class="${escapeAttr(v)}"`;
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
  // 영시영 1부 측정 결과 style 607 건 100% 손실 — 모든 시트 generic fix.
  // Anchor: docs/validation/verify/yshy_1bu_structural.md §4.3.
  b.appendDummyInput()
    .appendField('스타일')
    .appendField(new Blockly.FieldTextInput(''), 'STYLE');
  b.appendStatementInput('CONTENT').setCheck(null);
  setStatementHooks(b);
}

// ---------- 18 블록 정의 ----------

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

  // 4) row ------------------------------------------------------------------
  {
    type: 'r20_row',
    shape: 'c',
    category: CONTAINER,
    label: '가로 줄',
    tooltip: '가로 행 — sheet-row.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('가로 줄');
      }),
    ),
    generator: (block, ctx) => {
      const _b = block as Blockly.Block;
      const style = String(_b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${classAttr('sheet-row')}${styleAttr(style)}`, content);
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
        top.appendField('세로 줄');
      }),
    ),
    generator: (block, ctx) => {
      const _b = block as Blockly.Block;
      const style = String(_b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${classAttr('sheet-col')}${styleAttr(style)}`, content);
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
          .appendField(new Blockly.FieldNumber(2, 1, 12, 1), 'N');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const n = Number(b.getFieldValue('N') ?? 2);
      const safe = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${classAttr(`sheet-colrow sheet-colrow-${safe}`)}${styleAttr(style)}`, content);
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
          .appendField(new Blockly.FieldTextInput('items'), 'NAME');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'items';
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'fieldset', `${classAttr(`repeating_${name}`)}${styleAttr(style)}`, content);
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
        top.appendField('반복 영역의 한 줄');
      }),
    ),
    generator: (block, ctx) => {
      const _b = block as Blockly.Block;
      const style = String(_b.getFieldValue('STYLE') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', `${classAttr('sheet-repeating-row')}${styleAttr(style)}`, content);
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
        .appendField('스타일')
        .appendField(new Blockly.FieldTextInput(''), 'STYLE');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const text = String(b.getFieldValue('TEXT') ?? '');
      const safe = escapeAttr(text);
      return `<label${styleAttr(style)}>${safe}</label>`;
    },
  },

  // 16) section_wrap --------------------------------------------------------
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
          .appendField(new Blockly.FieldTextInput('main'), 'NAME');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'main';
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(
        ctx,
        'div',
        `${classAttr(`sheet-section sheet-section-${name}`)}${styleAttr(style)}`,
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
          .appendField(new Blockly.FieldTextInput('panel'), 'NAME');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const style = String(b.getFieldValue('STYLE') ?? '');
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'panel';
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(
        ctx,
        'div',
        ` class="sheet-toggle sheet-toggle-${escapeAttr(name)}"${nameAttr('data-toggle', name)}${styleAttr(style)}`,
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
          .appendField(new Blockly.FieldNumber(2, 1, 12, 1), 'COLS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const userStyle = String(b.getFieldValue('STYLE') ?? '');
      const cols = Number(b.getFieldValue('COLS') ?? 2);
      const safe = Number.isFinite(cols) && cols >= 1 ? Math.floor(cols) : 2;
      const content = ctx.statementToCode(block, 'CONTENT');
      const builtinStyle = `grid-template-columns: repeat(${safe}, 1fr)`;
      const mergedStyle = mergeStyle(userStyle, builtinStyle);
      return wrapTag(ctx, 'div', ` class="sheet-grid"${mergedStyle}`, content);
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
      const builtinStyle = `position:absolute;left:${left}px;top:${top}px;width:${w}px;height:${h}px;`;
      const mergedStyle = mergeStyle(userStyle, builtinStyle);
      return wrapTag(ctx, 'div', `${sheetUserClassAttr(cls)}${mergedStyle}`, content);
    },
  },
];

/**
 * Stage A-2 — Container 18 블록 등록.
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

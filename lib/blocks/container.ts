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
    label: '박스 <div>',
    tooltip: '일반 div 컨테이너. class 지정 가능.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('div')
          .appendField('class')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', classAttr(cls), content);
    },
  },

  // 2) span -----------------------------------------------------------------
  {
    type: 'r20_span',
    shape: 'c',
    category: CONTAINER,
    label: '인라인 <span>',
    tooltip: '인라인 span 컨테이너. class 지정 가능.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('span')
          .appendField('class')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'span', classAttr(cls), content);
    },
  },

  // 3) fieldset -------------------------------------------------------------
  {
    type: 'r20_fieldset',
    shape: 'c',
    category: CONTAINER,
    label: '필드셋 <fieldset>',
    tooltip: 'fieldset — 폼 그룹화.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('fieldset')
          .appendField('class')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'fieldset', classAttr(cls), content);
    },
  },

  // 4) row ------------------------------------------------------------------
  {
    type: 'r20_row',
    shape: 'c',
    category: CONTAINER,
    label: '행 row',
    tooltip: '가로 행 — sheet-row.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('행 row');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', classAttr('sheet-row'), content);
    },
  },

  // 5) col ------------------------------------------------------------------
  {
    type: 'r20_col',
    shape: 'c',
    category: CONTAINER,
    label: '열 col',
    tooltip: '세로 열 — sheet-col.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('열 col');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', classAttr('sheet-col'), content);
    },
  },

  // 6) colrow_n -------------------------------------------------------------
  {
    type: 'r20_colrow_n',
    shape: 'c',
    category: CONTAINER,
    label: 'N칸 행',
    tooltip: 'N개 컬럼으로 분할되는 행 — sheet-colrow sheet-colrow-N.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('N칸 행 N=')
          .appendField(new Blockly.FieldNumber(2, 1, 12, 1), 'N');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const n = Number(b.getFieldValue('N') ?? 2);
      const safe = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 2;
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', classAttr(`sheet-colrow sheet-colrow-${safe}`), content);
    },
  },

  // 7) table ----------------------------------------------------------------
  {
    type: 'r20_table',
    shape: 'c',
    category: CONTAINER,
    label: '표 <table>',
    tooltip: 'table — thead/tbody/tr/th/td 와 함께 사용.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('table')
          .appendField('class')
          .appendField(new Blockly.FieldTextInput(''), 'CLASS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cls = String(b.getFieldValue('CLASS') ?? '');
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'table', classAttr(cls), content);
    },
  },

  // 8) thead ----------------------------------------------------------------
  {
    type: 'r20_thead',
    shape: 'c',
    category: CONTAINER,
    label: '<thead>',
    tooltip: 'table 헤더 묶음.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('thead');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'thead', '', content);
    },
  },

  // 9) tbody ----------------------------------------------------------------
  {
    type: 'r20_tbody',
    shape: 'c',
    category: CONTAINER,
    label: '<tbody>',
    tooltip: 'table 본문 묶음.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('tbody');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'tbody', '', content);
    },
  },

  // 10) tr ------------------------------------------------------------------
  {
    type: 'r20_tr',
    shape: 'c',
    category: CONTAINER,
    label: '<tr> 행',
    tooltip: 'table 행. 내부에 th/td.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('tr');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'tr', '', content);
    },
  },

  // 11) th ------------------------------------------------------------------
  {
    type: 'r20_th',
    shape: 'c',
    category: CONTAINER,
    label: '<th> 헤더',
    tooltip: 'table 헤더 셀.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('th');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'th', '', content);
    },
  },

  // 12) td ------------------------------------------------------------------
  {
    type: 'r20_td',
    shape: 'c',
    category: CONTAINER,
    label: '<td> 칸',
    tooltip: 'table 데이터 셀.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('td');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'td', '', content);
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
    label: '반복 섹션',
    tooltip: 'Roll20 repeating section — 행 추가 / 삭제 가능한 섹션.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('반복 섹션 이름')
          .appendField(new Blockly.FieldTextInput('items'), 'NAME');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'items';
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'fieldset', classAttr(`repeating_${name}`), content);
    },
  },

  // 14) repeating_row -------------------------------------------------------
  //
  // 반복 섹션 안의 단일 행 template. 시각적 그루핑용 wrapper div.
  {
    type: 'r20_repeating_row',
    shape: 'c',
    category: CONTAINER,
    label: '반복 행',
    tooltip: '반복 섹션 안의 한 행 — sheet-repeating-row.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top.appendField('반복 행');
      }),
    ),
    generator: (block, ctx) => {
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(ctx, 'div', classAttr('sheet-repeating-row'), content);
    },
  },

  // 15) label ---------------------------------------------------------------
  //
  // 단순 텍스트 label. stack — 자식 슬롯 없음.
  {
    type: 'r20_label',
    shape: 'stack',
    category: CONTAINER,
    label: '<label> 텍스트',
    tooltip: '단순 텍스트 라벨 — <label>텍스트</label>.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('label')
        .appendField(new Blockly.FieldTextInput('이름'), 'TEXT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const text = String(b.getFieldValue('TEXT') ?? '');
      const safe = escapeAttr(text);
      return `<label>${safe}</label>`;
    },
  },

  // 16) section_wrap --------------------------------------------------------
  //
  // 시트의 논리적 섹션 — Roll20 의 sheet-* class 관례 따름.
  {
    type: 'r20_section_wrap',
    shape: 'c',
    category: CONTAINER,
    label: '섹션 wrap',
    tooltip: '시트 섹션 wrapper — sheet-section sheet-section-NAME.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('섹션 이름')
          .appendField(new Blockly.FieldTextInput('main'), 'NAME');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'main';
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(
        ctx,
        'div',
        classAttr(`sheet-section sheet-section-${name}`),
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
    label: '토글 wrap',
    tooltip: '조건부 노출 그룹 — sheet-toggle sheet-toggle-NAME.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('토글 이름')
          .appendField(new Blockly.FieldTextInput('panel'), 'NAME');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const name = String(b.getFieldValue('NAME') ?? '').trim() || 'panel';
      const content = ctx.statementToCode(block, 'CONTENT');
      return wrapTag(
        ctx,
        'div',
        ` class="sheet-toggle sheet-toggle-${escapeAttr(name)}"${nameAttr('data-toggle', name)}`,
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
    label: '그리드 grid',
    tooltip: 'CSS Grid 컨테이너 — COLS 컬럼.',
    init: mkInit((b) =>
      buildCBlock(b, (top) => {
        top
          .appendField('그리드 cols=')
          .appendField(new Blockly.FieldNumber(2, 1, 12, 1), 'COLS');
      }),
    ),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const cols = Number(b.getFieldValue('COLS') ?? 2);
      const safe = Number.isFinite(cols) && cols >= 1 ? Math.floor(cols) : 2;
      const content = ctx.statementToCode(block, 'CONTENT');
      const style = ` style="grid-template-columns: repeat(${safe}, 1fr)"`;
      return wrapTag(ctx, 'div', ` class="sheet-grid"${style}`, content);
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

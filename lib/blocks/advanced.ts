/**
 * Advanced 카테고리 — 4 블록 (Stage A-9, raw escape-hatch).
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 9 (고급 / Advanced, hue 270).
 *   - docs/spec/02_functional_spec.md §3.2 — stack shape.
 *   - docs/spec/12_roll20_output_spec.md §6 (raw markup / sheet worker).
 *
 * 일반 블록으로 표현하기 어려운 경우 raw HTML / CSS / sheet worker JS / HTML 주석을
 * 그대로 박는 escape hatch. autoPrefix (D4 ①) 가 HTML / CSS 워크스페이스 출력에
 * 적용되므로 raw 블록 안의 클래스명 / id 도 동일 규칙으로 prefix 됨.
 *
 * 시스템 specific 토큰 0 — raw 안의 내용은 사용자가 직접 입력.
 */

import * as Blockly from 'blockly';
import { type BlockDef, type GeneratorContext } from './types';
import { makePageJsSlotComment } from '@/lib/import/pageJsWorkspace';

// ---------- 카테고리 / 상수 ----------

const ADVANCED = 'advanced' as const;
/** spec §3.1 — Advanced 카테고리 hue (gray-purple). */
const HUE = 270;

const WARN_RAW =
  '⚠ escape hatch — 일반 블록으로 표현 안 되는 경우에만 사용. autoPrefix 적용 됨.';

// ---------- init helper ----------

function mkInit(builder: (b: Blockly.Block) => void): (block: unknown) => void {
  return function (this: Blockly.Block) {
    this.setColour(HUE);
    builder(this);
  } as unknown as (block: unknown) => void;
}

/** stack prev/next (untyped). */
function setStatementHooks(b: Blockly.Block): void {
  b.setPreviousStatement(true, null);
  b.setNextStatement(true, null);
}

// ---------- 안전 처리 ----------

/** HTML 주석 안전 처리 — `-->` / 끝 `-` 무력화 (주석 깨짐 방지). */
function safeHtmlComment(value: string): string {
  let s = String(value ?? '');
  s = s.replace(/\r\n/g, '\n').replace(/-->/g, '--&gt;');
  s = s.trim();
  if (s.endsWith('-')) s += ' ';
  return s;
}

function safeScriptText(value: string): string {
  return String(value ?? '').replace(/<\/script/gi, '<\\/script');
}

function safeScriptAttrs(value: string): string {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .trim();
}

// ---------- 4 블록 정의 ----------

export const ADVANCED_BLOCKS: BlockDef[] = [
  // 1) raw HTML ----------------------------------------------------------
  {
    type: 'r20_raw_html',
    shape: 'stack',
    category: ADVANCED,
    label: '직접 HTML 작성 (고급)',
    tooltip: `HTML 워크스페이스에 입력 내용 그대로 출력. ${WARN_RAW}`,
    init: mkInit((b) => {
      b.appendDummyInput().appendField('직접 HTML');
      b.appendDummyInput()
        .appendField('내용')
        .appendField(new Blockly.FieldTextInput(''), 'HTML');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const html = String(b.getFieldValue('HTML') ?? '');
      return html;
    },
    inspectorSchema: [
      {
        name: 'HTML',
        label: 'HTML 내용',
        kind: 'textarea',
        placeholder: '<div class="my-block">...</div>',
        description: 'HTML 워크스페이스에 그대로 박힘. autoPrefix 가 sheet- 접두 부착.',
      },
    ],
  },

  // 2) raw CSS -----------------------------------------------------------
  {
    type: 'r20_raw_css',
    shape: 'stack',
    category: ADVANCED,
    label: '직접 CSS 작성 (고급)',
    tooltip: `CSS 워크스페이스에 입력 내용 그대로 출력. ${WARN_RAW}`,
    init: mkInit((b) => {
      b.appendDummyInput().appendField('직접 CSS');
      b.appendDummyInput()
        .appendField('내용')
        .appendField(new Blockly.FieldTextInput(''), 'CSS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const css = String(b.getFieldValue('CSS') ?? '');
      return css;
    },
    inspectorSchema: [
      {
        name: 'CSS',
        label: 'CSS 내용',
        kind: 'textarea',
        placeholder: '.my-class { color: red; }',
        description: 'CSS 워크스페이스에 그대로 박힘. autoPrefix 가 sheet- 접두 부착.',
      },
    ],
  },

  // 3) raw sheet worker JS ----------------------------------------------
  {
    type: 'r20_raw_worker',
    shape: 'stack',
    category: ADVANCED,
    label: '직접 JS 작성 (고급)',
    tooltip: `sheet worker JS 그대로 출력. ${WARN_RAW}`,
    init: mkInit((b) => {
      b.appendDummyInput().appendField('직접 JS');
      b.appendDummyInput()
        .appendField('JS')
        .appendField(new Blockly.FieldTextInput(''), 'JS');
      b.appendStatementInput('CHILDREN').setCheck(null).appendField('분해된 worker 블록');
      setStatementHooks(b);
    }),
    generator: (block, ctx) => {
      const b = block as Blockly.Block;
      const js = String(b.getFieldValue('JS') ?? '');
      const children = ctx.statementToCode(block, 'CHILDREN').trim();
      const body = js.trim() ? js : children;
      return `<script type="text/worker">\n${safeScriptText(body)}\n</script>`;
    },
    inspectorSchema: [
      {
        name: 'JS',
        label: 'sheet worker JS',
        kind: 'textarea',
        placeholder: 'on("change:foo", () => { ... });',
        description: 'sheet worker 영역에 그대로 박힘. <script type="text/worker"> 안.',
      },
    ],
  },

  // 4) editable page JavaScript -----------------------------------------
  {
    type: 'r20_raw_page_js',
    shape: 'stack',
    category: ADVANCED,
    label: '페이지 JavaScript (고급)',
    tooltip: `일반 페이지 JavaScript를 내보낼 때 보존해요. 로컬 미리보기에서는 실행하지 않아요. ${WARN_RAW}`,
    init: mkInit((b) => {
      b.appendDummyInput().appendField('Page JS');
      b.appendDummyInput()
        .appendField('slot')
        .appendField(new Blockly.FieldTextInput(''), 'SLOT');
      b.appendDummyInput()
        .appendField('attrs')
        .appendField(new Blockly.FieldTextInput(''), 'ATTRS');
      b.appendDummyInput()
        .appendField('code')
        .appendField(new Blockly.FieldTextInput(''), 'JS');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const slot = String(b.getFieldValue('SLOT') ?? '').trim();
      const attrs = safeScriptAttrs(String(b.getFieldValue('ATTRS') ?? ''));
      const js = safeScriptText(String(b.getFieldValue('JS') ?? ''));
      const script = `<script${attrs ? ` ${attrs}` : ''}>\n${js}\n</script>`;
      return `${slot ? `${makePageJsSlotComment(slot)}\n` : ''}${script}`;
    },
    inspectorSchema: [
      {
        name: 'SLOT',
        label: 'source slot',
        kind: 'text',
        placeholder: 'Imported scripts keep this automatically; leave blank for the end.',
        description: 'Internal source-order anchor. New scripts without a slot are appended after the HTML body.',
      },
      {
        name: 'ATTRS',
        label: 'script attributes',
        kind: 'text',
        placeholder: 'src="page-runtime.js" defer',
        description: 'Preserved script attributes. Inline event-handler attributes are removed.',
      },
      {
        name: 'JS',
        label: 'page JavaScript',
        kind: 'textarea',
        placeholder: 'window.sheetReady = true;',
        description: 'Runs only in the exported Roll20 page context, never in local preview.',
      },
    ],
  },

  // 5) HTML 주석 ---------------------------------------------------------
  {
    type: 'r20_page_js_slot',
    shape: 'stack',
    category: ADVANCED,
    label: 'Page JS source slot',
    tooltip: 'Internal source-order anchor for an imported page script.',
    internal: true,
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('Page JS source slot')
        .appendField(new Blockly.FieldTextInput(''), 'SLOT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      return makePageJsSlotComment(String(b.getFieldValue('SLOT') ?? ''));
    },
    inspectorSchema: [
      {
        name: 'SLOT',
        label: 'source slot',
        kind: 'text',
        description: 'Internal imported-script position marker.',
      },
    ],
  },

  {
    type: 'r20_html_comment',
    shape: 'stack',
    category: ADVANCED,
    label: '메모 (숨김)',
    tooltip: '<!-- TEXT --> — HTML 워크스페이스에 주석 박기.',
    init: mkInit((b) => {
      b.appendDummyInput()
        .appendField('메모')
        .appendField(new Blockly.FieldTextInput(''), 'TEXT');
      setStatementHooks(b);
    }),
    generator: (block) => {
      const b = block as Blockly.Block;
      const text = safeHtmlComment(String(b.getFieldValue('TEXT') ?? ''));
      return `<!-- ${text} -->`;
    },
    inspectorSchema: [
      {
        name: 'TEXT',
        label: '주석 내용',
        kind: 'textarea',
        placeholder: '예: 주사위 굴림 안내',
        description: 'HTML 주석. `-->` 닫힘 시퀀스는 자동 escape.',
      },
    ],
  },
];

/**
 * Stage A-9 — Advanced 4 블록 등록.
 *
 * 1) BlockDef 메타를 target 배열에 push (UI 카탈로그 표시용).
 * 2) Blockly.Blocks[type] = { init } 등록 (워크스페이스 instantiate 가능).
 *
 * registry.ts `registerAllBlocks()` 안에서 호출. 멱등성은 호출자가 보장.
 */
export function registerAdvancedBlocks(target: BlockDef[]): void {
  type BlocklyBlockMap = Record<string, { init: () => void }>;
  const blocksMap = Blockly.Blocks as unknown as BlocklyBlockMap;

  for (const def of ADVANCED_BLOCKS) {
    target.push(def);
    if (def.init) {
      blocksMap[def.type] = { init: def.init as unknown as () => void };
    }
  }
}

/** Stage A-9 의 generator 매핑 — emit-worker lookup. */
export const ADVANCED_GENERATORS: Record<
  string,
  (block: unknown, ctx: GeneratorContext) => string | [string, number]
> = Object.fromEntries(
  ADVANCED_BLOCKS.filter((d) => d.generator).map((d) => [d.type, d.generator!]),
);

/**
 * Emit pipeline — Blockly workspace → raw HTML/CSS/i18n 문자열.
 *
 * Anchor:
 *   - docs/spec/10_system_architecture.md §3.3 (adapter.emitAll)
 *   - docs/spec/12_roll20_output_spec.md §2~§4 (출력 contract)
 *   - docs/spec/16_redesign_decision_log.md D18 (EmitWarning)
 *
 * 본 모듈은 사용자가 만든 블록 트리를 순회하면서 각 블록 정의의
 * `generator` 함수를 호출, 결과 문자열을 합친다.
 *
 * Stage A-1.5 까지는 21 Expression 블록 (대부분 reporter / boolean) 뿐.
 * HTML 워크스페이스에 top-level 으로 reporter 가 박혀도 단독으로는 의미가
 * 없으므로 wrapper `<input readonly value="…">` 로 감싼다.
 * Phase 3 에서 container 블록 (r20_div, r20_repeating, r20_section 등) 추가 시
 * wrapper 불필요.
 *
 * 시스템 specific 0 — 모든 변환 규칙은 Roll20 표준 + 블록 정의.
 */

import type * as Blockly from 'blockly';
import { getBlockDef } from '@/lib/blocks/registry';
import type {
  BlockDef,
  BlockShape,
  GeneratorContext,
} from '@/lib/blocks/types';
import type {
  EmitWarning,
  WorkspaceKey,
} from '@/lib/stores/workspaceStore';
import { ORDER } from '@/lib/blocks/types';
import { injectPreservedAttributes, PRESERVED_ATTRS_FIELD } from '@/lib/blocks/preservedAttributes';
import { isRoll20WorkerScript } from '@/lib/import/worker_source';
import { mergePageJsSlots } from '@/lib/import/pageJsWorkspace';
import { isInlineMarkup } from '@/lib/blocks/inlineMarkup';

export interface EmitResult {
  code: string;
  warnings: EmitWarning[];
  generatedCss: string;
}

export interface EmitAllResult {
  html: string;
  css: string;
  i18n: string;
  js: string;
  worker: string;
  warnings: EmitWarning[];
}

/** generator 의 반환값 정규화. reporter = [code, order], stack = string. */
function normalizeGen(
  ret: string | [string, number] | undefined,
): { code: string; order: number } {
  if (Array.isArray(ret)) return { code: ret[0], order: ret[1] };
  if (typeof ret === 'string') return { code: ret, order: ORDER.NONE };
  return { code: '', order: ORDER.NONE };
}

class EmitEngine implements GeneratorContext {
  readonly warnings: EmitWarning[] = [];
  readonly generatedCss: string[] = [];

  constructor(private readonly kind: WorkspaceKey) {}

  // ---- GeneratorContext API ----

  valueToCode(block: unknown, name: string, order: number): string {
    // 우선순위 (order) — Phase 2 minimal: 그대로 통과. 향후 paren wrapping.
    void order;
    const b = block as Blockly.Block;
    const input = b.getInput(name);
    if (!input) return '';
    const target = input.connection?.targetBlock();
    if (!target) return '';
    return this.runGenerator(target).code;
  }

  statementToCode(block: unknown, name: string): string {
    const b = block as Blockly.Block;
    const input = b.getInput(name);
    if (!input) return '';
    const first = input.connection?.targetBlock();
    if (!first) return '';
    const lines: string[] = [];
    let cur: Blockly.Block | null = first;
    while (cur) {
      const out = this.runGenerator(cur);
      if (out.code) lines.push(out.code);
      cur = cur.getNextBlock();
    }
    if (this.kind !== 'html') return lines.join('\n');
    return lines.reduce((out, line, index) => {
      if (index === 0) return line;
      const previous = lines[index - 1];
      return out + (isInlineMarkup(previous) && isInlineMarkup(line) ? '' : '\n') + line;
    }, '');
  }

  indent(code: string, level = 1): string {
    if (!code) return code;
    const pad = '  '.repeat(level);
    return code
      .split('\n')
      .map((line) => (line ? pad + line : line))
      .join('\n');
  }

  addGeneratedCss(css: string): void {
    if (this.kind !== 'html') return;
    const value = String(css ?? '').trim();
    if (value) this.generatedCss.push(value);
  }

  warn(
    blockId: string,
    code: string,
    message: string,
    severity: EmitWarning['severity'],
  ): void {
    this.warnings.push({ blockId, code, message, severity });
  }

  // ---- 내부 ----

  runGenerator(
    block: Blockly.Block,
  ): { code: string; order: number; def: BlockDef | null } {
    const def = getBlockDef(block.type);
    if (!def || !def.generator) {
      this.warn(
        block.id,
        'NO_GENERATOR',
        `블록 '${block.type}' 의 generator 가 등록되지 않았습니다.`,
        'warning',
      );
      return { code: '', order: ORDER.NONE, def };
    }
    try {
      const raw = def.generator(block, this);
      const normalized = normalizeGen(raw);
      const preserved = String(block.getFieldValue(PRESERVED_ATTRS_FIELD) ?? '');
      normalized.code = injectPreservedAttributes(normalized.code, preserved);
      // Phase B coverage 확대 — element 를 emit 하는 모든 block (stack / c /
      //   cap / hat / e) 의 첫 opening tag 에 `data-r20-block-id` 주입.
      //   top-level 만이 아니라 statementToCode / valueToCode 경유 nested
      //   block 도 동일하게 박혀야 미리보기 안 모든 h1 / label / input /
      //   button 등이 click→select / hover / contextmenu 의 target 으로
      //   잡힌다. 이전 정책 (wrapTopLevel 에서만 주입) 은 D&D 5e 같은 flat
      //   top-level 시트에서 element 의 0.3% 만 id 부여 → Phase B WYSIWYG
      //   사실상 작동 X.
      //
      //   reporter / boolean 은 값 식 (`@{strength}` 등) — element 아님 →
      //   주입하면 attribute 안 깨짐. 건드리지 않는다 (top-level wrapper
      //   `<input>` 은 wrapTopLevel 이 별도 처리).
      const shape: BlockShape = def.shape ?? 'stack';
      if (
        normalized.code &&
        shape !== 'reporter' &&
        shape !== 'boolean'
      ) {
        const injected = injectBlockIdAttr(normalized.code, block.id);
        if (injected !== null) {
          return { code: injected, order: normalized.order, def };
        }
      }
      return { ...normalized, def };
    } catch (err) {
      this.warn(
        block.id,
        'GENERATOR_THROW',
        `블록 '${block.type}' generator 실행 중 오류: ${
          err instanceof Error ? err.message : String(err)
        }`,
        'error',
      );
      return { code: '', order: ORDER.NONE, def };
    }
  }

  /**
   * top-level 블록의 emit 결과를 워크스페이스 종류별 wrapper 로 감싼다.
   *
   * - HTML + reporter/boolean → `<input readonly value="{code}">`
   * - HTML + stack → 한 줄 그대로 (Phase 3 에서 container 블록 추가 시 의미 갖음)
   * - CSS / i18n → 그대로 dump (현 단계에서 21 Expression 블록은 의미 거의 없음)
   *
   * Phase 3 의 r20_div / r20_input_text / r20_repeating 등이 들어오면 본 함수
   * 의 default branch 가 그대로 사용된다 (block 의 generator 가 자체적으로
   * 완전한 HTML/CSS 를 emit 하므로 wrapping 불필요).
   */
  wrapTopLevel(block: Blockly.Block, code: string): string {
    if (!code) return '';
    if (this.kind === 'js' || block.type === 'r20_page_js_slot') return code;
    if (this.kind === 'html' && block.type === 'r20_text_node') {
      // A top-level text node needs an inline selectable surface. A div
      // wrapper changes Roll20 inline spacing and is not stable on reimport.
      return `<span data-r20-text-node="1" data-r20-block-id="${block.id}">${code}</span>`;
    }
    const def = getBlockDef(block.type);
    const shape: BlockShape = def?.shape ?? 'stack';

    if (this.kind === 'html') {
      if (shape === 'reporter' || shape === 'boolean') {
        const safe = escapeAttr(code);
        return `<input class="${shape === 'boolean' ? 'expr-bool' : 'expr-value'}" data-r20-block-id="${block.id}" type="text" readonly value="${safe}" />`;
      }
      // stack / cap / hat / c / e —
      //   원래: `<div data-r20-block-id=...>${code}</div>` 로 감쌌으나, legacy-sheet-corpus legacy corpus
      //   처럼 import 한 시트 (flat top-level 6K+) 에선 CSS sibling trick 룰
      //   (`.sheet-toggle[value="1"]:checked ~ div.sheet-X`) 이 wrapper 한
      //   레벨 깊어 매치 X → era 토글 영역 전체 hidden, 미리보기는 body
      //   배경 이미지만 보임. fix: wrapper 없이 첫 element 의 opening tag 에만
      //   `data-r20-block-id` 주입 → 형제 관계 보존, click→select 도 그대로
      //   (preview bridge 가 부모 walk 으로 id 탐색).
      //   pure text emit 또는 opening tag 검출 실패 시 안전망으로 div 래핑 유지.
      const injected = injectBlockIdAttr(code, block.id);
      return injected ?? `<div data-r20-block-id="${block.id}">${code}</div>`;
    }

    // CSS / i18n — top-level expression 은 아직 의미 X. raw dump (debugging).
    return code;
  }
}

/**
 * 워크스페이스 전체 emit. 모든 top-level 블록 순회 후 join.
 *
 * @param ws Blockly workspace (Svg 또는 model only — getTopBlocks 사용).
 * @param kind 'html' / 'css' / 'i18n' — wrapper 결정.
 * @returns 합쳐진 코드 문자열 + warning 배열.
 */
export function emitWorkspace(
  ws: Blockly.Workspace | null,
  kind: WorkspaceKey,
): EmitResult {
  if (!ws) return { code: '', warnings: [], generatedCss: '' };
  const engine = new EmitEngine(kind);
  const pieces: string[] = [];
  for (const block of ws.getTopBlocks(true)) {
    // Stage 2 fix — top-level stack chains: getTopBlocks 는 chain head 만
    //   반환. 이전 emit 은 head 의 code 만 emit, getNextBlock() 으로 이어진
    //   sibling block 들이 silently dropped 됐다. 영향 큰 케이스:
    //     i18n 워크스페이스 — r20_locale_value 만 24개 chain 했는데 head 1
    //     개만 emit 되어 23개 누락 (D&D 5e i18n 측정에서 lines 1, len 48
    //     byte 로 확인). 해결: 각 top block 의 next-chain 까지 순회.
    //   reporter/boolean 은 next 연결이 없으므로 getNextBlock() 자체가 null
    //   → 자연 no-op. statementToCode 와 동일한 패턴.
    let cur: Blockly.Block | null = block;
    while (cur) {
      const out = engine.runGenerator(cur);
      const wrapped = engine.wrapTopLevel(cur, out.code);
      if (wrapped) pieces.push(wrapped);
      cur = cur.getNextBlock();
    }
  }
  const code = kind === 'html'
    ? pieces.reduce((out, piece, index) => {
      if (index === 0) return piece;
      const previous = pieces[index - 1];
      return out + (isInlineMarkup(previous) && isInlineMarkup(piece) ? '' : '\n') + piece;
    }, '')
    : pieces.join('\n');
  return {
    code,
    warnings: engine.warnings,
    generatedCss: engine.generatedCss.join('\n'),
  };
}

/**
 * Already emitted workspace results into one Roll20 output bundle.
 *
 * Keeping this composition step separate lets the live pipeline reuse the
 * unchanged workspace results while a user is dragging one HTML layer. The
 * final HTML/CSS/worker contract remains identical to `emitAll`.
 */
export function composeEmittedWorkspaces(
  workspaces: Partial<Record<WorkspaceKey, EmitResult>>,
): EmitAllResult {
  const html = workspaces.html ?? { code: '', warnings: [], generatedCss: '' };
  const css = workspaces.css ?? { code: '', warnings: [], generatedCss: '' };
  const i18n = workspaces.i18n ?? { code: '', warnings: [], generatedCss: '' };
  const pageJs = workspaces.js ?? { code: '', warnings: [], generatedCss: '' };
  const worker = workspaces.worker ?? { code: '', warnings: [], generatedCss: '' };
  const workerBody = normalizeWorkerBody(worker.code);
  const htmlCode = stripWorkerScriptsFromHtml(html.code);
  const pageJsCode = pageJs.code.trim();
  const htmlWithPageJs = mergePageJsSlots(htmlCode, pageJsCode);
  const htmlWithScripts = [htmlWithPageJs, workerBody ? `<script type="text/worker">\n${workerBody}\n</script>` : '']
    .filter(Boolean)
    .join('\n');
  // Generated HTML layout rules are appended after user CSS to preserve the
  // old block's inline-style precedence while keeping the emitted HTML clean.
  const cssCode = [css.code, html.generatedCss].filter(Boolean).join('\n');
  const normalized = normalizeEmittedRoll20Pair(htmlWithScripts, cssCode);
  return {
    html: normalized.html,
    css: normalized.css,
    i18n: i18n.code,
    js: pageJsCode,
    worker: workerBody,
    warnings: [...html.warnings, ...css.warnings, ...i18n.warnings, ...pageJs.warnings, ...worker.warnings],
  };
}

/**
 * 모든 워크스페이스를 한 번에 emit. PreviewMain 이 호출.
 */
export function emitAll(
  workspaces: Partial<Record<WorkspaceKey, Blockly.Workspace | null>>,
): EmitAllResult {
  return composeEmittedWorkspaces({
    html: emitWorkspace(workspaces.html ?? null, 'html'),
    css: emitWorkspace(workspaces.css ?? null, 'css'),
    i18n: emitWorkspace(workspaces.i18n ?? null, 'i18n'),
    js: emitWorkspace(workspaces.js ?? null, 'js'),
    worker: emitWorkspace(workspaces.worker ?? null, 'worker'),
  });
}

/**
 * Keep the emitted HTML/CSS class contract coherent at the final boundary.
 *
 * Canonical workspace output preserves authored class and id tokens, so this
 * function intentionally returns the pair unchanged. Legacy prefixing belongs
 * to the destination render/export boundary, where HTML and CSS can be
 * transformed together without mutating modern source.
 */
export function normalizeEmittedRoll20Pair(
  html: string,
  css: string,
): { html: string; css: string } {
  return {
    html,
    css,
  };
}

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeWorkerBody(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return '';
  const pieces: string[] = [];
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(trimmed))) {
    const before = trimmed.slice(last, match.index).trim();
    if (before) pieces.push(before);
    pieces.push(match[1].trim());
    last = match.index + match[0].length;
  }
  const rest = trimmed.slice(last).trim();
  if (rest) pieces.push(rest);
  return pieces.filter(Boolean).join('\n');
}

function stripWorkerScriptsFromHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, rawAttrs: string, body: string) => {
    const type = getScriptType(rawAttrs);
    return isRoll20WorkerScript(type, body) ? '' : full;
  });
}

function getScriptType(rawAttrs: string): string {
  const typeMatch = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))/i.exec(rawAttrs ?? '');
  return String(typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '').trim().toLowerCase();
}

/**
 * 첫 opening element tag 에 `data-r20-block-id` 속성을 주입.
 *
 * 동기:
 *   - top-level 블록을 `<div data-r20-block-id>...</div>` 로 감싸면 CSS
 *     sibling 셀렉터 (`A:checked ~ B`) 가 wrapper 안 element 끼리만 동작 →
 *     서로 다른 top-level 블록이 형제일 때 매치 X → legacy-sheet-corpus legacy corpus 같은 era
 *     toggle 시트가 통째로 hidden.
 *   - wrapper 제거 + 첫 element tag 에 속성만 주입 → 형제 관계 그대로,
 *     preview bridge 의 click→select 도 부모 walk 으로 동일 동작.
 *
 * 입력 가정 0: emit 결과 string 의 선두에 (whitespace + HTML 주석 후) 일반
 *   element opening tag 가 있으면 거기에 주입, 아니면 null 반환 (fallback).
 *
 * 시스템 specific 0 — 모든 HTML 토큰은 사용자 입력 기반.
 */
function injectBlockIdAttr(html: string, id: string): string | null {
  // 선두 whitespace / HTML 주석 스킵.
  let i = 0;
  while (i < html.length) {
    const c = html[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      if (end < 0) return null;
      i = end + 3;
      continue;
    }
    break;
  }
  if (i >= html.length || html[i] !== '<') return null;
  // <tagname  — 일반 element 만. <!DOCTYPE / <?xml 등은 제외.
  // Match the complete opening-tag name, not a valid prefix of malformed
  // markup such as `<td<span ...>`. Injecting an attribute after the `td`
  // prefix would turn preserved raw HTML into a different invalid tag and
  // make the next browser import recover a different DOM tree.
  const m = /^<([a-zA-Z][a-zA-Z0-9-]*)(?=\s|\/?>)/.exec(html.slice(i));
  if (!m) return null;
  const tagNameEnd = i + m[0].length;
  // opening tag 의 `>` 위치 — 따옴표 안 `>` 는 무시.
  let end = tagNameEnd;
  let quote: string | null = null;
  while (end < html.length) {
    const c = html[end];
    if (quote) {
      if (c === quote) quote = null;
      end++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      end++;
      continue;
    }
    if (c === '>') break;
    end++;
  }
  if (end >= html.length) return null;
  const attrsRegion = html.slice(tagNameEnd, end);
  if (/\sdata-r20-block-id\s*=/.test(attrsRegion) || /^data-r20-block-id\s*=/.test(attrsRegion.trimStart())) {
    return html;
  }
  return html.slice(0, tagNameEnd) + ` data-r20-block-id="${id}"` + html.slice(tagNameEnd);
}

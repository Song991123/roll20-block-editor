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

import * as Blockly from 'blockly';
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

export interface EmitResult {
  code: string;
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
    return lines.join('\n');
  }

  indent(code: string, level = 1): string {
    if (!code) return code;
    const pad = '  '.repeat(level);
    return code
      .split('\n')
      .map((line) => (line ? pad + line : line))
      .join('\n');
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
    const def = getBlockDef(block.type);
    const shape: BlockShape = def?.shape ?? 'stack';

    if (this.kind === 'html') {
      if (shape === 'reporter' || shape === 'boolean') {
        const safe = escapeAttr(code);
        return `<input class="${shape === 'boolean' ? 'expr-bool' : 'expr-value'}" data-r20-block-id="${block.id}" type="text" readonly value="${safe}" />`;
      }
      // stack / cap / hat / c / e — Phase 3+ 의 container 블록이 본 분기.
      return `<div data-r20-block-id="${block.id}">${code}</div>`;
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
  if (!ws) return { code: '', warnings: [] };
  const engine = new EmitEngine(kind);
  const pieces: string[] = [];
  for (const block of ws.getTopBlocks(true)) {
    const out = engine.runGenerator(block);
    const wrapped = engine.wrapTopLevel(block, out.code);
    if (wrapped) pieces.push(wrapped);
  }
  return { code: pieces.join('\n'), warnings: engine.warnings };
}

/**
 * 모든 워크스페이스를 한 번에 emit. PreviewMain 이 호출.
 */
export function emitAll(
  workspaces: Partial<Record<WorkspaceKey, Blockly.Workspace | null>>,
): { html: string; css: string; i18n: string; warnings: EmitWarning[] } {
  const html = emitWorkspace(workspaces.html ?? null, 'html');
  const css = emitWorkspace(workspaces.css ?? null, 'css');
  const i18n = emitWorkspace(workspaces.i18n ?? null, 'i18n');
  return {
    html: html.code,
    css: css.code,
    i18n: i18n.code,
    warnings: [...html.warnings, ...css.warnings, ...i18n.warnings],
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

/**
 * CSS parser — 규칙 / 선언 트리 → MatchedBlock 트리.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 8 (CSS 카테고리)
 *   - lib/preview/prefix.ts (autoPrefix 의 selector parsing 재참고)
 *
 * 입력: 사용자의 sheet.css 문자열
 * 출력: { type: 'r20_css_rule', fields: { selector }, children: [decls] } 트리
 *
 * 시스템 specific 토큰 0 — 모든 클래스 / 속성 / 값은 사용자 입력.
 *
 * @media / @keyframes 등 at-rule 은 130 블록 카탈로그의 r20_at_media /
 * r20_at_keyframes 가 있으면 사용. 없으면 raw_css fallback.
 */

import type { MatchedBlock } from './block_matcher';

export interface CssMatchContext {
  matched: number;
  total: number;
  rawFallback: number;
  warnings: Array<{ code: string; message: string; hint?: string }>;
}

export function newCssCtx(): CssMatchContext {
  return { matched: 0, total: 0, rawFallback: 0, warnings: [] };
}

/**
 * 룰 트리 매처 — `selector { decl; decl; }` 단위 split 후 r20_css_rule 로 변환.
 *
 * 단순 규칙만:
 *   - top-level rule → r20_css_rule + selector reporter chain + decl stack
 *   - @media / @supports 등 → 일단 raw_css fallback (block 카탈로그에 정확한
 *     at-rule 블록이 있으면 매칭, 아니면 raw)
 */
export function parseCss(css: string, ctx: CssMatchContext): MatchedBlock[] {
  const out: MatchedBlock[] = [];
  const rules = splitRules(css);
  for (const r of rules) {
    ctx.total++;
    if (r.kind === 'rule') {
      const block = ruleToBlock(r.head, r.body, ctx);
      out.push(block);
      ctx.matched++;
    } else if (r.kind === 'at') {
      // 단순 처리 — raw_css fallback. 더 정확한 매칭은 후속 작업.
      out.push(rawCssBlock(`${r.head}{${r.body}}`));
      ctx.rawFallback++;
      ctx.warnings.push({
        code: 'css_at_rule_raw',
        message: `at-rule "${r.head.trim()}" 은 raw_css 로 박음`,
        hint: r.head.trim().slice(0, 60),
      });
    } else if (r.kind === 'decl_orphan') {
      // 잘림/비정상 — raw_css fallback.
      out.push(rawCssBlock(r.body));
      ctx.rawFallback++;
      ctx.warnings.push({
        code: 'css_orphan',
        message: 'CSS 끝 처리 못 한 fragment — raw_css 로 박음',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CSS top-level split — comment / string / brace 안전.
// ---------------------------------------------------------------------------

type CssRule =
  | { kind: 'rule'; head: string; body: string }
  | { kind: 'at'; head: string; body: string }
  | { kind: 'decl_orphan'; body: string };

function splitRules(css: string): CssRule[] {
  const out: CssRule[] = [];
  let i = 0;
  while (i < css.length) {
    // skip whitespace + comments
    while (i < css.length) {
      const c = css[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        i++;
        continue;
      }
      if (c === '/' && css[i + 1] === '*') {
        const end = css.indexOf('*/', i + 2);
        if (end < 0) return out;
        i = end + 2;
        continue;
      }
      break;
    }
    if (i >= css.length) break;

    if (css[i] === '@') {
      const head = readUntilEither(css, i, ['{', ';']);
      if (head.endChar === ';' || head.endChar === null) {
        // `@import url(...);` 같은 단독 at-rule. raw 로.
        out.push({ kind: 'at', head: head.text, body: '' });
        i = head.end + 1;
        continue;
      }
      const body = readBraceBlock(css, head.end);
      out.push({ kind: 'at', head: head.text, body: body.text });
      i = body.end + 1;
      continue;
    }

    // 일반 rule
    const head = readUntilEither(css, i, ['{']);
    if (head.endChar !== '{') {
      const remain = css.slice(i).trim();
      if (remain) out.push({ kind: 'decl_orphan', body: remain });
      break;
    }
    const body = readBraceBlock(css, head.end);
    out.push({ kind: 'rule', head: head.text, body: body.text });
    i = body.end + 1;
  }
  return out;
}

function readUntilEither(
  css: string,
  start: number,
  stops: string[],
): { text: string; end: number; endChar: string | null } {
  let i = start;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const e = css.indexOf('*/', i + 2);
      if (e < 0) return { text: css.slice(start), end: css.length, endChar: null };
      i = e + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < css.length && css[i] !== q) {
        if (css[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (stops.includes(c)) {
      return { text: css.slice(start, i), end: i, endChar: c };
    }
    i++;
  }
  return { text: css.slice(start), end: css.length, endChar: null };
}

function readBraceBlock(
  css: string,
  openIdx: number,
): { text: string; end: number } {
  // openIdx points to '{'
  let depth = 0;
  let i = openIdx;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const e = css.indexOf('*/', i + 2);
      if (e < 0) return { text: css.slice(openIdx + 1), end: css.length - 1 };
      i = e + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < css.length && css[i] !== q) {
        if (css[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return { text: css.slice(openIdx + 1, i), end: i };
    }
    i++;
  }
  return { text: css.slice(openIdx + 1), end: css.length - 1 };
}

// ---------------------------------------------------------------------------
// Rule → MatchedBlock.
// ---------------------------------------------------------------------------

function ruleToBlock(head: string, body: string, ctx: CssMatchContext): MatchedBlock {
  const selector = buildSelectorBlock(head.trim(), ctx);
  const decls = parseDecls(body);
  return {
    blockType: 'r20_css_rule',
    fields: {},
    valueInputs: { SELECTOR: selector },
    children: { DECLS: decls },
  };
}

/**
 * Selector 파싱 — 첫 토큰만 reporter 로 분해 (compound selector 는 일단 raw).
 *
 * 단순화: `.foo`, `#bar`, `div`, `[attr=val]` 의 단일 단순 토큰이면 매칭된 reporter.
 * 그 외 (descendant / child / compound) 는 `r20_literal_string` 으로 박는다.
 */
function buildSelectorBlock(sel: string, ctx: CssMatchContext): MatchedBlock {
  const trimmed = sel.trim();
  // 단순 단일 토큰?
  if (/^\.[\w-]+$/.test(trimmed)) {
    return {
      blockType: 'r20_selector_class',
      fields: { NAME: trimmed.slice(1).replace(/^sheet-/, '') },
      children: {},
    };
  }
  if (/^#[\w-]+$/.test(trimmed)) {
    return {
      blockType: 'r20_selector_id',
      fields: { NAME: trimmed.slice(1).replace(/^sheet-/, '') },
      children: {},
    };
  }
  if (/^(div|span|input|button)$/.test(trimmed)) {
    return {
      blockType: 'r20_selector_element',
      fields: { TAG: trimmed },
      children: {},
    };
  }
  // 그 외 — literal_string 으로 fallback (CSS workspace 안에서 raw selector).
  ctx.warnings.push({
    code: 'css_selector_compound',
    message: `복합 셀렉터 "${trimmed.slice(0, 40)}" 은 literal_string 으로 박음`,
  });
  return {
    blockType: 'r20_literal_string',
    fields: { STR: trimmed },
    children: {},
  };
}

function parseDecls(body: string): MatchedBlock[] {
  const out: MatchedBlock[] = [];
  // 간단한 split — `;` 로 자르되 string / paren 보호.
  const decls = splitDeclarations(body);
  for (const d of decls) {
    const idx = d.indexOf(':');
    if (idx < 0) continue;
    const prop = d.slice(0, idx).trim();
    const value = d.slice(idx + 1).trim();
    if (!prop) continue;
    out.push({
      blockType: 'r20_css_decl',
      fields: { PROPERTY: prop, VALUE: value },
      children: {},
    });
  }
  return out;
}

function splitDeclarations(body: string): string[] {
  const out: string[] = [];
  let buf = '';
  let depthParen = 0;
  let i = 0;
  while (i < body.length) {
    const c = body[i];
    if (c === '/' && body[i + 1] === '*') {
      const e = body.indexOf('*/', i + 2);
      if (e < 0) break;
      i = e + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      buf += c;
      i++;
      while (i < body.length && body[i] !== q) {
        if (body[i] === '\\') {
          buf += body[i];
          i++;
        }
        buf += body[i];
        i++;
      }
      if (i < body.length) {
        buf += body[i];
        i++;
      }
      continue;
    }
    if (c === '(') depthParen++;
    else if (c === ')') depthParen--;
    if (c === ';' && depthParen === 0) {
      const t = buf.trim();
      if (t) out.push(t);
      buf = '';
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  const t = buf.trim();
  if (t) out.push(t);
  return out;
}

function rawCssBlock(text: string): MatchedBlock {
  return {
    blockType: 'r20_raw_css',
    fields: { CSS: text.trim() },
    children: {},
  };
}

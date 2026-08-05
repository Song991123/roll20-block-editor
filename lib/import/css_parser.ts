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
 * @media / @keyframes 는 구조를 보존할 수 있는 경우 전용 블록으로
 * 매핑하고, 표현력이 부족한 복합 at-rule 은 raw_css fallback 으로 남긴다.
 */

import type { MatchedBlock } from './block_matcher';
import { CSS_PSEUDO_CLASS_SET } from '../utils/cssPseudoClasses';

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
 *   - 단일 괄호 조건의 @media → r20_media_query + nested rule children
 *   - 표준 @keyframes → r20_keyframes + typed/raw stop children
 *   - 표현력이 부족한 @supports / @container / 복합 media → raw_css fallback
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
      const headTrim = r.head.trim();
      // @font-face — 전용 r20_css_font_face 블록으로 매칭.
      if (/^@font-face\b/i.test(headTrim)) {
        out.push(fontFaceToBlock(r.body));
        ctx.matched++;
        // ctx.matched 증가했으므로 ctx.total 의 1 도 그대로 carry — coverage 100% 기여.
        continue;
      }
      // 그 외 at-rule — raw_css fallback.
      if (/^@import\b/i.test(headTrim)) {
        const source = headTrim.replace(/^@import\s+/i, '').trim();
        out.push({
          blockType: 'r20_css_import',
          fields: { SOURCE: source },
          children: {},
        });
        ctx.matched++;
        continue;
      }
      // A semicolon-terminated at-rule has no nested rule body. Do not let a
      // malformed `@media screen;` masquerade as an empty typed media block.
      const structured = r.terminator === 'block'
        ? structuredAtRuleToBlock(headTrim, r.body, ctx)
        : null;
      if (structured) {
        out.push(structured);
        ctx.matched++;
        continue;
      }
      out.push(rawCssBlock(renderAtRule(r)));
      ctx.rawFallback++;
      ctx.warnings.push({
        code: 'css_at_rule_raw',
        message: `at-rule "${headTrim}" 은 raw_css 로 박음`,
        hint: headTrim.slice(0, 60),
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
  | { kind: 'at'; head: string; body: string; terminator: 'block' | 'semicolon' | 'eof' }
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
        out.push({
          kind: 'at',
          head: head.text,
          body: '',
          terminator: head.endChar === ';' ? 'semicolon' : 'eof',
        });
        i = head.end + 1;
        continue;
      }
      const body = readBraceBlock(css, head.end);
      out.push({ kind: 'at', head: head.text, body: body.text, terminator: 'block' });
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
 * Map at-rules whose generator can preserve the source shape.
 *
 * The media block generator accepts both the historical shorthand
 * `max-width: 640px` and a complete media prelude such as
 * `screen and (max-width: 640px)`. Keep the full balanced prelude so import
 * does not silently change the meaning of a responsive rule. Keyframe stops
 * outside the catalog's dropdown are kept as raw child CSS inside a typed
 * keyframe container.
 */
function structuredAtRuleToBlock(
  head: string,
  body: string,
  ctx: CssMatchContext,
): MatchedBlock | null {
  const mediaCondition = balancedMediaCondition(head);
  if (mediaCondition) {
    const nestedCtx = newCssCtx();
    const children = parseCss(body, nestedCtx);
    mergeNestedDiagnostics(ctx, nestedCtx);
    return {
      blockType: 'r20_media_query',
      fields: { CONDITION: mediaCondition },
      children: { CHILDREN: children },
    };
  }

  const keyframesMatch = /^@keyframes\s+([A-Za-z_][\w-]*)$/i.exec(head);
  if (keyframesMatch) {
    return {
      blockType: 'r20_keyframes',
      fields: { NAME: keyframesMatch[1] },
      children: { STOPS: parseKeyframeStops(body, ctx) },
    };
  }

  const genericPrelude = balancedBlockAtRulePrelude(head);
  if (genericPrelude) {
    const nestedCtx = newCssCtx();
    const children = parseCss(body, nestedCtx);
    mergeNestedDiagnostics(ctx, nestedCtx);
    return {
      blockType: 'r20_css_at_rule',
      fields: { PRELUDE: genericPrelude },
      children: { BODY: children },
    };
  }

  return null;
}

function balancedMediaCondition(head: string): string | null {
  const match = /^@media\s+([\s\S]+)$/i.exec(head.trim());
  const condition = match?.[1]?.trim() ?? '';
  if (!condition || /[{};]/.test(condition)) return null;

  let depth = 0;
  let quote = '';
  for (let i = 0; i < condition.length; i += 1) {
    const char = condition[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth < 0) return null;
    }
  }
  if (depth !== 0 || quote) return null;
  return condition;
}

function balancedBlockAtRulePrelude(head: string): string | null {
  const prelude = head.trim();
  if (!/^@[A-Za-z][\w-]*(?:\s|$)/.test(prelude) || /[{};]/.test(prelude)) return null;

  let depth = 0;
  let quote = '';
  for (let i = 0; i < prelude.length; i += 1) {
    const char = prelude[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth < 0) return null;
    }
  }
  return depth === 0 && !quote ? prelude : null;
}

const KEYFRAME_STOP_VALUES = new Set(['from', 'to', '0%', '25%', '50%', '75%', '100%']);

function parseKeyframeStops(body: string, ctx: CssMatchContext): MatchedBlock[] {
  return splitRules(body).map((rule) => {
    if (rule.kind !== 'rule') {
      const raw = rule.kind === 'at' ? renderAtRule(rule) : rule.body;
      ctx.rawFallback++;
      ctx.warnings.push({
        code: 'css_keyframe_stop_raw',
        message: 'keyframes 내부의 비표준 항목은 raw_css 로 보존',
        hint: raw.trim().slice(0, 60),
      });
      return rawCssBlock(raw);
    }

    const percent = rule.head.trim();
    if (KEYFRAME_STOP_VALUES.has(percent.toLowerCase())) {
      return {
        blockType: 'r20_keyframe_stop',
        fields: { PERCENT: percent.toLowerCase() },
        children: { DECLS: parseDecls(rule.body) },
      };
    }

    ctx.rawFallback++;
    ctx.warnings.push({
      code: 'css_keyframe_stop_raw',
      message: 'keyframes 단계가 블록 선택지 밖이라 raw_css 로 보존',
      hint: percent.slice(0, 60),
    });
    return rawCssBlock(`${rule.head}{${rule.body}}`);
  });
}

function mergeNestedDiagnostics(parent: CssMatchContext, nested: CssMatchContext): void {
  parent.rawFallback += nested.rawFallback;
  parent.warnings.push(...nested.warnings.map((warning) => ({
    ...warning,
    code: `css_nested_${warning.code}`,
  })));
}

/**
 * Selector 파싱 — top-down recursive 분해.
 *
 * 우선순위:
 *   1. comma (`A, B`) → r20_selector_comma
 *   2. descendant / combinator (`A B`, `A > B`, `A + B`, `A ~ B`) → 해당 블록
 *   3. pseudo-element (`base::after`, `::-webkit-*`) → r20_selector_pseudo_element
 *   4. pseudo-class (`base:hover`, `:checked`) → r20_selector_pseudo
 *   5. compound (`tag.class`, `tag#id`, `tag[attr=val]`, `.class[attr=val]`) → 첫 토큰 + tail compound
 *   6. attribute (`[attr=val]`, `tag[attr=val]`) → r20_selector_attr
 *   7. simple class `.foo` / id `#foo` / element `div` → 해당 reporter
 *   8. 그 외 → r20_selector_complex (raw text 보존)
 *
 * 매칭 카운트: 모든 분기 reachable — `r20_literal_string` 사용 0 (selector_complex 가 대체).
 */
const ELEMENT_TAGS_ALLOWED = new Set([
  '*', 'div', 'span', 'input', 'button',
  'textarea', 'select', 'option',
  'table', 'tr', 'td', 'th', 'caption',
  'p', 'hr', 'h1', 'h2', 'h3', 'h4',
  'label', 'fieldset', 'a', 'img',
]);

const PSEUDO_ELEMENTS_ALLOWED = new Set([
  'before', 'after', 'placeholder',
  'first-line', 'first-letter',
  '-webkit-inner-spin-button',
  '-webkit-outer-spin-button',
  '-webkit-input-placeholder',
]);

const ROLL20_RUNTIME_CLASS_TOKENS = new Set([
  'inlinerollresult',
  'fullcrit',
  'fullfail',
  'importantroll',
]);

function buildSelectorBlock(sel: string, ctx: CssMatchContext): MatchedBlock {
  const trimmed = sel.trim();
  if (!trimmed) {
    return { blockType: 'r20_selector_complex', fields: { TEXT: '*' }, children: {} };
  }

  // 1. Comma group at top level — A, B → r20_selector_comma.
  const commaParts = splitTopLevel(trimmed, ',');
  if (commaParts.length > 1) {
    if (commaParts.some((part) => !part.trim())) {
      ctx.warnings.push({
        code: 'css_selector_complex',
        message: '빈 항목이 있는 셀렉터 목록을 원문 보존 블록으로 가져왔습니다.',
      });
      return {
        blockType: 'r20_selector_complex',
        fields: { TEXT: trimmed },
        children: {},
      };
    }
    const right = buildSelectorBlock(commaParts.slice(1).join(',').trim(), ctx);
    const left = buildSelectorBlock(commaParts[0].trim(), ctx);
    return {
      blockType: 'r20_selector_comma',
      fields: {},
      valueInputs: { A: left, B: right },
      children: {},
    };
  }

  // 2. Combinator scan — child > / adjacent + / sibling ~ / descendant.
  const combo = findCombinator(trimmed);
  if (combo) {
    const a = buildSelectorBlock(combo.left, ctx);
    const b = buildSelectorBlock(combo.right, ctx);
    const type = combo.op === '>'
      ? 'r20_selector_child'
      : combo.op === '+'
        ? 'r20_selector_sibling_adj'
        : combo.op === '~'
          ? 'r20_selector_sibling_gen'
          : 'r20_selector_descendant';
    return { blockType: type, fields: {}, valueInputs: { A: a, B: b }, children: {} };
  }

  // 3. Pseudo-element `::xxx` — split first (greedy `::` 우선).
  const pseudoElIdx = findTopLevelDoubleColon(trimmed);
  if (pseudoElIdx >= 0) {
    const base = trimmed.slice(0, pseudoElIdx);
    const pseudoRaw = trimmed.slice(pseudoElIdx + 2);
    const pseudoMatch = /^([\w-]+)/.exec(pseudoRaw);
    if (pseudoMatch && PSEUDO_ELEMENTS_ALLOWED.has(pseudoMatch[1])) {
      const baseBlock = base
        ? buildSelectorBlock(base, ctx)
        : ({ blockType: 'r20_selector_complex', fields: { TEXT: '' }, children: {} } as MatchedBlock);
      return {
        blockType: 'r20_selector_pseudo_element',
        fields: { PSEUDO: pseudoMatch[1] },
        valueInputs: { BASE: baseBlock },
        children: {},
      };
    }
  }

  // 4. Pseudo-class `:hover` 등 (단 `:` 가 attribute selector 안이면 안 됨).
  const pseudoClassMatch = findTopLevelPseudoClass(trimmed);
  if (pseudoClassMatch) {
    const { base, pseudo, arg } = pseudoClassMatch;
    // legacy CSS2 single-colon `:before` / `:after` / `:first-line` / `:first-letter`
    // → modern CSS3 ::pseudo-element 으로 normalize.
    if (PSEUDO_ELEMENTS_ALLOWED.has(pseudo)) {
      const baseBlock = base
        ? buildSelectorBlock(base, ctx)
        : ({ blockType: 'r20_selector_complex', fields: { TEXT: '' }, children: {} } as MatchedBlock);
      return {
        blockType: 'r20_selector_pseudo_element',
        fields: { PSEUDO: pseudo },
        valueInputs: { BASE: baseBlock },
        children: {},
      };
    }
    if (CSS_PSEUDO_CLASS_SET.has(pseudo)) {
      const baseBlock = base
        ? buildSelectorBlock(base, ctx)
        : ({ blockType: 'r20_selector_complex', fields: { TEXT: '' }, children: {} } as MatchedBlock);
      return {
        blockType: 'r20_selector_pseudo',
        fields: { PSEUDO: pseudo, ARG: arg || '' },
        valueInputs: { BASE: baseBlock },
        children: {},
      };
    }
  }

  // 5. Compound selector `tag.class`, `tag#id`, `.class[attr=val]`, `tag[attr=val]` etc.
  // — Split simple atoms: leading element tag, then chain of `.class` / `#id` / `[attr=...]`.
  const compoundTokens = tokenizeCompound(trimmed);
  if (compoundTokens && compoundTokens.length > 1) {
    // Reduce: combine via "concatenation" — Roll20 의 compound (no whitespace) selector.
    // 가장 자연스러운 표현: 첫 token 만 분해 + 나머지는 또 buildSelectorBlock 으로.
    // 단 부모-자식이 아니므로 descendant 가 아닌 compound 표현 — 여기서는
    // 첫 token 만 매칭하고 나머지를 attr 또는 추가 class 로 chain. 단순 접근:
    // 첫 token = base block, 나머지 join → r20_selector_complex (raw) 보존.
    const head = compoundTokens[0];
    const tail = compoundTokens.slice(1).join('');
    const headBlock = buildSelectorBlock(head, ctx);
    // tail 이 한 개의 단순 토큰이면 attr/class/id 분해
    if (compoundTokens.length === 2) {
      const second = compoundTokens[1];
      // .class
      if (/^\.[\w-]+$/.test(second)) {
        return {
          blockType: 'r20_selector_compound',
          fields: { TAIL: second },
          valueInputs: { BASE: headBlock },
          children: {},
        };
      }
      // #id
      if (/^#[\w-]+$/.test(second)) {
        return {
          blockType: 'r20_selector_compound',
          fields: { TAIL: second },
          valueInputs: { BASE: headBlock },
          children: {},
        };
      }
      // [attr=val]
      if (/^\[.*\]$/.test(second)) {
        return {
          blockType: 'r20_selector_compound',
          fields: { TAIL: second },
          valueInputs: { BASE: headBlock },
          children: {},
        };
      }
    }
    // 3+ tokens — keep first as head, concat rest raw.
    return {
      blockType: 'r20_selector_compound',
      fields: { TAIL: tail },
      valueInputs: { BASE: headBlock },
      children: {},
    };
  }

  // 6. Attribute selector `[attr=val]` (no leading tag — already filtered by tokenize).
  const attrMatch = /^\[([\w-]+)\s*([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]]*))\]$/.exec(trimmed);
  if (attrMatch) {
    const [, attr, op, v1, v2, v3] = attrMatch;
    return {
      blockType: 'r20_selector_attr',
      fields: { ATTR: attr, OP: op, VALUE: v1 ?? v2 ?? v3 ?? '' },
      children: {},
    };
  }

  // 7. Simple class / id / element.
  if (/^\.[\w-]+$/.test(trimmed)) {
    const className = trimmed.slice(1);
    if (ROLL20_RUNTIME_CLASS_TOKENS.has(className)) {
      return {
        blockType: 'r20_selector_complex',
        fields: { TEXT: trimmed },
        children: {},
      };
    }
    return {
      blockType: 'r20_selector_class',
      fields: { NAME: className },
      children: {},
    };
  }
  if (/^#[\w-]+$/.test(trimmed)) {
    return {
      blockType: 'r20_selector_id',
      fields: { NAME: trimmed.slice(1) },
      children: {},
    };
  }
  if (ELEMENT_TAGS_ALLOWED.has(trimmed)) {
    return { blockType: 'r20_selector_element', fields: { TAG: trimmed }, children: {} };
  }
  if (/^[A-Za-z][A-Za-z0-9:_-]*$/.test(trimmed)) {
    return { blockType: 'r20_selector_tag', fields: { TAG: trimmed }, children: {} };
  }

  // 8. fallback — r20_selector_complex (raw selector 100% 보존).
  ctx.warnings.push({
    code: 'css_selector_complex',
    message: `매칭 못 한 셀렉터 "${trimmed.slice(0, 60)}" — r20_selector_complex 로 박음`,
  });
  return {
    blockType: 'r20_selector_complex',
    fields: { TEXT: trimmed },
    children: {},
  };
}

/** Compound selector tokenize — `tag` + (`.class` | `#id` | `[attr=val]`)+ chain. */
function tokenizeCompound(sel: string): string[] | null {
  const tokens: string[] = [];
  let i = 0;

  // Leading element name (optional). `*` (universal) 도 허용.
  if (sel[0] === '*') {
    tokens.push('*');
    i = 1;
  } else if (/[a-zA-Z]/.test(sel[0])) {
    let j = i;
    while (j < sel.length && /[a-zA-Z0-9_-]/.test(sel[j])) j++;
    if (j > i) {
      tokens.push(sel.slice(i, j));
      i = j;
    }
  }

  while (i < sel.length) {
    const c = sel[i];
    if (c === '.' || c === '#') {
      let j = i + 1;
      while (j < sel.length && /[a-zA-Z0-9_-]/.test(sel[j])) j++;
      if (j === i + 1) return null;
      tokens.push(sel.slice(i, j));
      i = j;
    } else if (c === '[') {
      const end = sel.indexOf(']', i);
      if (end < 0) return null;
      tokens.push(sel.slice(i, end + 1));
      i = end + 1;
    } else {
      // 다른 char — compound 분해 실패.
      return null;
    }
  }
  return tokens.length > 0 ? tokens : null;
}

/** top-level `::` 위치 (괄호 / 따옴표 안은 무시). */
function findTopLevelDoubleColon(sel: string): number {
  let depthB = 0, depthP = 0;
  for (let i = 0; i < sel.length - 1; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < sel.length && sel[i] !== q) { if (sel[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '[') { depthB++; continue; }
    if (c === ']') { depthB--; continue; }
    if (c === '(') { depthP++; continue; }
    if (c === ')') { depthP--; continue; }
    if (depthB || depthP) continue;
    if (c === ':' && sel[i + 1] === ':') return i;
  }
  return -1;
}

/** top-level pseudo-class `:xxx(arg?)` 위치. base, pseudo name, arg 반환. */
function findTopLevelPseudoClass(
  sel: string,
): { base: string; pseudo: string; arg: string } | null {
  let depthB = 0, depthP = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < sel.length && sel[i] !== q) { if (sel[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '[') { depthB++; continue; }
    if (c === ']') { depthB--; continue; }
    if (c === '(') { depthP++; continue; }
    if (c === ')') { depthP--; continue; }
    if (depthB || depthP) continue;
    if (c === ':' && sel[i + 1] !== ':') {
      // pseudo-class — parse `:name(args)?`
      const m = /^:([\w-]+)(?:\(([^)]*)\))?/.exec(sel.slice(i));
      if (!m) continue;
      return {
        base: sel.slice(0, i),
        pseudo: m[1],
        arg: m[2] || '',
      };
    }
  }
  return null;
}

/** top-level (괄호/브래킷 보호) 단일 char 분리. */
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depthB = 0, depthP = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '[') depthB++;
    else if (c === ']') depthB--;
    else if (c === '(') depthP++;
    else if (c === ')') depthP--;
    else if (c === sep && depthB === 0 && depthP === 0) {
      out.push(s.slice(start, i)); start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

/**
 * 첫 top-level combinator (>, +, ~ or whitespace) 위치 검색.
 * descendant (공백) 는 다른 모든 가능성을 다 시도한 다음 마지막.
 */
function findCombinator(sel: string): { op: string; left: string; right: string } | null {
  let depthB = 0, depthP = 0;
  // Look for `>`, `+`, `~` first.
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < sel.length && sel[i] !== q) { if (sel[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '[') { depthB++; continue; }
    if (c === ']') { depthB--; continue; }
    if (c === '(') { depthP++; continue; }
    if (c === ')') { depthP--; continue; }
    if (depthB || depthP) continue;
    if (c === '>' || c === '+' || c === '~') {
      // 'a~b' 의 `~=` 는 attribute 안 (depthB), 여기 안 옴.
      // Skip if it's part of a pseudo or other; ensure space around eligible
      // We accept these only between identifiers (not at index 0).
      if (i === 0) continue;
      return {
        op: c,
        left: sel.slice(0, i).trim(),
        right: sel.slice(i + 1).trim(),
      };
    }
  }
  // descendant (공백) — 가장 오른쪽 분리점.
  depthB = 0; depthP = 0;
  let lastSpace = -1;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < sel.length && sel[i] !== q) { if (sel[i] === '\\') i++; i++; }
      continue;
    }
    if (c === '[') { depthB++; continue; }
    if (c === ']') { depthB--; continue; }
    if (c === '(') { depthP++; continue; }
    if (c === ')') { depthP--; continue; }
    if (depthB || depthP) continue;
    if (c === ' ' || c === '\t' || c === '\n') {
      lastSpace = i;
    }
  }
  if (lastSpace > 0) {
    const left = sel.slice(0, lastSpace).trim();
    const right = sel.slice(lastSpace + 1).trim();
    if (left && right) return { op: ' ', left, right };
  }
  return null;
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
    // Stage 22 §3 — `--name: value;` 변수 선언은 r20_css_var_decl 로.
    // VAR_NAME 슬롯 + VALUE_TEXT fallback. (slot 형태로 잘려 들어온 값은 raw 보존.)
    if (prop.startsWith('--')) {
      const name = prop.slice(2);
      if (/^[\w-]+$/.test(name)) {
        out.push({
          blockType: 'r20_css_var_decl',
          fields: { VAR_NAME: name, VALUE_TEXT: value },
          children: {},
        });
        continue;
      }
    }
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

function renderAtRule(rule: Extract<CssRule, { kind: 'at' }>): string {
  if (rule.terminator === 'semicolon') return `${rule.head.trim()};`;
  if (rule.terminator === 'eof') return rule.head.trim();
  return `${rule.head}{${rule.body}}`;
}

/**
 * @font-face body → r20_css_font_face block.
 * font-family / src / font-weight / font-style 4 declaration 은 구조 필드로
 * 매핑하고, 나머지 descriptor는 편집 가능한 fallback 필드에 그대로 둔다.
 */
interface FontFaceDescriptorSegment {
  declaration: string;
  raw: string;
}

/**
 * Split @font-face descriptors without treating semicolons inside strings or
 * functions as declaration boundaries. `raw` keeps the authored descriptor,
 * including its terminating semicolon, for the editable fallback field.
 */
function splitFontFaceDescriptorSegments(body: string): FontFaceDescriptorSegment[] {
  const out: FontFaceDescriptorSegment[] = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let parenDepth = 0;
  let inComment = false;

  const push = (end: number, terminated: boolean): void => {
    const declaration = body.slice(start, end).trim();
    const raw = body.slice(start, end + (terminated ? 1 : 0)).trim();
    if (declaration) out.push({ declaration, raw });
  };

  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    const next = body[i + 1];

    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '/' && next === '*') {
      inComment = true;
      i++;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(') {
      parenDepth++;
      continue;
    }
    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (char === ';' && parenDepth === 0) {
      push(i, true);
      start = i + 1;
    }
  }

  push(body.length, false);
  return out;
}

function stripCssComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/**
 * Map four common descriptors to structured fields. Preserve every other
 * descriptor, malformed fragment, and duplicate structured descriptor in an
 * explicit raw field instead of silently dropping it.
 */
function fontFaceToBlock(body: string): MatchedBlock {
  const fields: Record<string, string> = {
    FAMILY: '',
    SRC: '',
    WEIGHT: 'normal',
    STYLE: 'normal',
    EXTRA_DESCRIPTORS: '',
  };
  const structured = new Set<string>();
  const extras: string[] = [];
  const descriptors = splitFontFaceDescriptorSegments(body);
  for (const descriptor of descriptors) {
    const declaration = stripCssComments(descriptor.declaration).trim();
    const idx = declaration.indexOf(':');
    if (idx < 0) {
      extras.push(descriptor.raw);
      continue;
    }
    const prop = declaration.slice(0, idx).trim().toLowerCase();
    const value = declaration.slice(idx + 1).trim();
    if (structured.has(prop)) {
      extras.push(descriptor.raw);
      continue;
    }
    if (prop === 'font-family') {
      // strip surrounding quotes
      fields.FAMILY = value.replace(/^['"]|['"]$/g, '');
    } else if (prop === 'src') {
      fields.SRC = value;
    } else if (prop === 'font-weight') {
      fields.WEIGHT = value;
    } else if (prop === 'font-style') {
      fields.STYLE = value;
    } else {
      extras.push(descriptor.raw);
      continue;
    }
    structured.add(prop);
  }
  fields.EXTRA_DESCRIPTORS = extras.join('\n');
  return {
    blockType: 'r20_css_font_face',
    fields,
    children: {},
  };
}

/**
 * Sheet worker JS parser (Stage worker-1) — `<script type="text/worker">` body
 * 를 25 sheet_worker 블록 (lib/blocks/sheet_worker.ts) 패턴으로 분해.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 (sheet_worker 카탈로그, 25 블록)
 *   - docs/spec/12_roll20_output_spec.md §3 / §5.5 (worker emit contract)
 *   - lib/blocks/sheet_worker.ts (generator — 본 파서의 역방향)
 *
 * 입력:  raw JS 텍스트 (단일 `<script type="text/worker">` 의 body).
 * 출력:  ParsedBlock[] (top-level 문장 chain) + ParseStats.
 *
 * 정책:
 *   1) regex / hand-rolled tokenizer 기반 lightweight 매칭. AST 의존 0
 *      (acorn 도입은 후속 phase).
 *   2) 균형 잡힌 brace / paren / 문자열 / 주석 처리 — balanced bracket walker.
 *   3) 패턴 25 종 (5 hat + 5 c + 8 stack + 7 reporter/boolean) 중 statement-
 *      level 14 종을 인식. 표현식 우측 (RHS) 은 raw literal_string 으로 박음
 *      (v2 에서 reporter 분해).
 *   4) 매칭 안 되는 statement 는 r20_raw_worker 로 fallback (statement 단위) —
 *      `JS` 필드에 raw 텍스트 박힘. emit 시 그대로 합쳐짐.
 *   5) 시스템 specific 토큰 0. 사용자 식별자 / 이벤트 이름은 모두 데이터.
 *
 * 못 잡는 패턴 (Stage v1 — 솔직):
 *   - switch / case
 *   - try / catch
 *   - 복잡한 JSX-ish RHS (template literal 안 ${} 등)
 *   - 다중 이벤트 on('a b c', ...) (a/b/c 각각 별도 hat 으로 emit 가능하지만
 *     Stage v1 에서는 패턴 인식 후 첫 이벤트만 분해 + 나머지 raw)
 */

// ---------------------------------------------------------------------------
// 타입.
// ---------------------------------------------------------------------------

export interface ParsedBlock {
  blockType: string;
  fields: Record<string, string>;
  children: Record<string, ParsedBlock[]>;
  valueInputs?: Record<string, ParsedBlock>;
}

export interface ParseStats {
  /** 25 카탈로그 패턴으로 매칭된 statement-level 블록 수 (재귀 포함). */
  matched: number;
  /** 어느 패턴에도 매칭 못 한 statement 수 (r20_raw_worker fallback 으로 갔음). */
  unparsed: number;
}

export interface ParseResult {
  blocks: ParsedBlock[];
  stats: ParseStats;
}

// ---------------------------------------------------------------------------
// 토큰 / 균형 잡힌 walker.
// ---------------------------------------------------------------------------

/**
 * `text` 에서 `start` 위치의 여는 괄호 `(`/`{`/`[` 에 매칭되는 닫는 괄호의 다음
 * 인덱스를 반환. 문자열 리터럴 / 주석 안은 무시. 못 찾으면 -1.
 */
function findMatchingClose(text: string, start: number): number {
  const open = text[start];
  const close = open === '(' ? ')' : open === '{' ? '}' : open === '[' ? ']' : '';
  if (!close) return -1;
  let depth = 1;
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    // 문자열 리터럴.
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(text, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    // 주석.
    if (c === '/' && text[i + 1] === '/') {
      i = skipLineComment(text, i);
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i = skipBlockComment(text, i);
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return -1;
}

/** start 위치가 따옴표/백틱일 때 문자열 끝의 다음 인덱스를 반환 (불일치 시 -1). */
function skipString(text: string, start: number): number {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === quote) return i + 1;
    // 백틱의 ${...} 보간 처리 (단순화 — 균형 잡힌 brace skip).
    if (quote === '`' && c === '$' && text[i + 1] === '{') {
      const end = findMatchingClose(text, i + 1);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    i++;
  }
  return -1;
}

function skipLineComment(text: string, start: number): number {
  let i = start + 2;
  while (i < text.length && text[i] !== '\n') i++;
  return i; // newline 위치 또는 EOF.
}

function skipBlockComment(text: string, start: number): number {
  let i = start + 2;
  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '/') return i + 2;
    i++;
  }
  return text.length;
}

/**
 * `text` 에서 의미 있는 다음 토큰의 시작 인덱스 (whitespace / 주석 skip).
 * 끝에 도달하면 text.length.
 */
function skipTrivia(text: string, start: number): number {
  let i = start;
  while (i < text.length) {
    const c = text[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i = skipLineComment(text, i);
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i = skipBlockComment(text, i);
      continue;
    }
    break;
  }
  return i;
}

/**
 * `start` 부터 한 statement 의 끝 인덱스를 찾아 반환.
 *
 * 종료 조건:
 *   - top-level `;` (depth 0 에서)
 *   - top-level `}` 직후 (function/blockless statement) — 단, 본 함수 호출자가
 *     처리 (block 매처가 brace 안을 별도 다룸).
 *
 * 본 함수는 단일 simple statement (`getAttrs(...);` 같은 단순 expr-stmt) 또는
 * function-call body 가 끝나는 `);` 까지의 범위를 잡아낸다.
 *
 * 반환: [end_exclusive, terminator] — terminator 는 ';' 또는 '' (EOF / brace).
 */
function findStatementEnd(text: string, start: number): [number, string] {
  let i = start;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(text, i);
      if (end < 0) return [text.length, ''];
      i = end;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i = skipLineComment(text, i);
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i = skipBlockComment(text, i);
      continue;
    }
    if (c === '(' || c === '{' || c === '[') {
      const end = findMatchingClose(text, i);
      if (end < 0) return [text.length, ''];
      i = end;
      continue;
    }
    if (c === ';') return [i, ';'];
    // }, ) 가 top-level 에서 등장하면 statement 외부 — 호출자가 처리.
    if (c === ')' || c === '}' || c === ']') return [i, ''];
    i++;
  }
  return [text.length, ''];
}

// ---------------------------------------------------------------------------
// 패턴 매처 — 헬퍼.
// ---------------------------------------------------------------------------

/**
 * `text` 의 `start` 위치에서 `name(...)` 형태를 매칭. 일치 시
 * `{ args: <args text>, end: <closing ')' 다음 인덱스> }`. 아니면 null.
 */
function matchCall(
  text: string,
  start: number,
  name: string,
): { args: string; end: number } | null {
  if (!text.startsWith(name, start)) return null;
  const afterName = start + name.length;
  // 식별자 경계 — name 직후가 ( 또는 whitespace 후 ( 여야 함.
  const i = skipTrivia(text, afterName);
  if (text[i] !== '(') return null;
  // identifier 가 더 긴 이름의 prefix 면 안 됨 (e.g. `setAttrs` vs `setAttrsX`).
  // name 뒤가 식별자 문자면 다른 식별자 — 매칭 안 함.
  const charAfterName = text[afterName];
  if (charAfterName && /[A-Za-z0-9_$]/.test(charAfterName) && i === afterName) {
    return null;
  }
  // 추가 검증: name 앞이 식별자 문자도 아니어야 함 (`getAttrs` 안의 `setAttrs`
  // substring 같은 케이스 방지). 호출자가 보장 — `start` 가 이미 trivia skip 된
  // 곳이라면 prev char 는 안전.
  const end = findMatchingClose(text, i);
  if (end < 0) return null;
  return { args: text.slice(i + 1, end - 1), end };
}

/**
 * "callback" 인자 텍스트에서 `function(<params>) { <body> }` 또는
 * `(<params>) => { <body> }` / `<param> => { <body> }` 형태의 body 를 분해.
 *
 * 반환: `{ params: <params 텍스트, 공백/괄호 trimmed>, body: <{} 안 내용> }`
 * 아니면 null.
 */
function parseCallback(text: string): { params: string; body: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // `function(...) { ... }`
  let m: RegExpExecArray | null;
  m = /^function\s*\(([^)]*)\)\s*\{/.exec(trimmed);
  if (m) {
    const bodyOpen = trimmed.indexOf('{', m[0].length - 1);
    const bodyEnd = findMatchingClose(trimmed, bodyOpen);
    if (bodyEnd < 0) return null;
    return { params: m[1].trim(), body: trimmed.slice(bodyOpen + 1, bodyEnd - 1) };
  }

  // `(<params>) => { ... }` 또는 `(<params>) => <expr>` (expr 형태 미지원).
  m = /^\(([^)]*)\)\s*=>\s*\{/.exec(trimmed);
  if (m) {
    const bodyOpen = trimmed.indexOf('{', m[0].length - 1);
    const bodyEnd = findMatchingClose(trimmed, bodyOpen);
    if (bodyEnd < 0) return null;
    return { params: m[1].trim(), body: trimmed.slice(bodyOpen + 1, bodyEnd - 1) };
  }

  // `<param> => { ... }` (괄호 없는 단일 param)
  m = /^([A-Za-z_$][\w$]*)\s*=>\s*\{/.exec(trimmed);
  if (m) {
    const bodyOpen = trimmed.indexOf('{', m[0].length - 1);
    const bodyEnd = findMatchingClose(trimmed, bodyOpen);
    if (bodyEnd < 0) return null;
    return { params: m[1].trim(), body: trimmed.slice(bodyOpen + 1, bodyEnd - 1) };
  }

  return null;
}

/**
 * 문자열 리터럴 텍스트 (예: `'foo'` 또는 `"bar"`) 에서 raw 내용 추출. 아니면 null.
 */
function stripQuotes(s: string): string | null {
  const t = s.trim();
  if (t.length < 2) return null;
  const q = t[0];
  if ((q === '"' || q === "'") && t.endsWith(q)) {
    return t.slice(1, -1);
  }
  return null;
}

/**
 * comma-separated 인자 분할 — 균형 잡힌 paren/brace/string 처리.
 */
function splitArgs(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(text, i);
      if (end < 0) {
        buf += text.slice(i);
        break;
      }
      buf += text.slice(i, end);
      i = end;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') {
      const end = findMatchingClose(text, i);
      if (end < 0) {
        buf += text.slice(i);
        break;
      }
      buf += text.slice(i, end);
      i = end;
      continue;
    }
    if (c === ',') {
      out.push(buf.trim());
      buf = '';
      i++;
      continue;
    }
    buf += c;
    i++;
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out;
}

/**
 * `['a','b','c']` 형태의 array literal 텍스트를 element 문자열 배열로 분해.
 * 따옴표 안 raw 만 추출. 균형 잡힌 string 처리. 매칭 안 되면 null.
 */
function parseStringArray(text: string): string[] | null {
  const t = text.trim();
  if (!t.startsWith('[') || !t.endsWith(']')) return null;
  const inner = t.slice(1, -1);
  const parts = splitArgs(inner);
  const out: string[] = [];
  for (const p of parts) {
    const v = stripQuotes(p);
    if (v == null) return null;
    out.push(v);
  }
  return out;
}

/**
 * `{ k1: v1, k2: v2, ... }` 형태 object literal 의 (key, value-text) 페어 추출.
 * key 는 식별자 또는 따옴표 문자열. value 는 임의 expr text (raw).
 */
function parseObjectPairs(text: string): Array<[string, string]> | null {
  const t = text.trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return null;
  const inner = t.slice(1, -1);
  const parts = splitArgs(inner);
  const out: Array<[string, string]> = [];
  for (const p of parts) {
    // key 분리 — 첫 ':' 가 key/value 경계 (단, 따옴표/괄호 안 무시).
    const colon = findUnquotedColon(p);
    if (colon < 0) return null;
    const rawKey = p.slice(0, colon).trim();
    const valText = p.slice(colon + 1).trim();
    const stripped = stripQuotes(rawKey);
    const key = stripped !== null ? stripped : rawKey;
    if (!/^[\w$\-]+$/.test(key)) return null; // key 가 plain identifier 가 아니면 reject.
    out.push([key, valText]);
  }
  return out;
}

function findUnquotedColon(text: string): number {
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(text, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') {
      const end = findMatchingClose(text, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (c === ':') return i;
    i++;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Hat 이벤트 → 블록 매핑.
// ---------------------------------------------------------------------------

/**
 * 단일 이벤트 토큰 (`change:hp`, `clicked:foo`, `change:repeating_inv:qty`,
 * `sheet:opened`, `remove:repeating_inv`) 을 hat 블록으로 변환.
 * 매칭 안 되면 null — 호출자가 raw fallback.
 */
function eventToHatBlock(
  event: string,
  bodyChildren: ParsedBlock[],
): ParsedBlock | null {
  const t = event.trim();
  if (t === 'sheet:opened') {
    return {
      blockType: 'r20_on_sheet_opened',
      fields: {},
      children: { CHILDREN: bodyChildren },
    };
  }
  let m: RegExpExecArray | null;
  m = /^change:repeating_([\w-]+):([\w-]+)$/.exec(t);
  if (m) {
    return {
      blockType: 'r20_on_repeating_change',
      fields: { SECTION: m[1], ATTR: m[2] },
      children: { CHILDREN: bodyChildren },
    };
  }
  m = /^remove:repeating_([\w-]+)$/.exec(t);
  if (m) {
    return {
      blockType: 'r20_on_repeating_remove',
      fields: { SECTION: m[1] },
      children: { CHILDREN: bodyChildren },
    };
  }
  m = /^clicked:([\w-]+)$/.exec(t);
  if (m) {
    return {
      blockType: 'r20_on_button_click',
      fields: { NAME: m[1] },
      children: { CHILDREN: bodyChildren },
    };
  }
  m = /^change:([\w-]+)$/.exec(t);
  if (m) {
    return {
      blockType: 'r20_on_attr_change',
      fields: { NAME: m[1] },
      children: { CHILDREN: bodyChildren },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// RHS → value MatchedBlock.
//
// v1: literal_string fallback. 후속 phase 에서 v.NAME / 산술 / 비교 분해.
// ---------------------------------------------------------------------------

type WorkerBinaryGroup = {
  blockType: 'r20_worker_arith' | 'r20_worker_cmp' | 'r20_worker_logic';
  operators: readonly string[];
};

// Keep these groups ordered from lowest to highest precedence. The parser
// picks the right-most operator in a group so left-associative expressions
// such as `a - b - c` rebuild as `(a - b) - c`.
const WORKER_BINARY_GROUPS: readonly WorkerBinaryGroup[] = [
  { blockType: 'r20_worker_logic', operators: ['||'] },
  { blockType: 'r20_worker_logic', operators: ['&&'] },
  { blockType: 'r20_worker_cmp', operators: ['===', '!==', '<=', '>=', '<', '>'] },
  { blockType: 'r20_worker_arith', operators: ['+', '-'] },
  { blockType: 'r20_worker_arith', operators: ['*', '/', '%'] },
];

/** Remove only a pair of parentheses that wraps the complete expression. */
function stripWrappingParens(text: string): string {
  let value = text.trim();
  while (value.startsWith('(')) {
    const end = findMatchingClose(value, 0);
    if (end !== value.length) break;
    value = value.slice(1, -1).trim();
  }
  return value;
}

function isBinaryOperatorPosition(text: string, index: number, operator: string): boolean {
  if (operator !== '+' && operator !== '-') return true;
  const before = text.slice(0, index).trimEnd().slice(-1);
  if (!before || '([{,:;!?&|=<>+-*/%'.includes(before)) return false;
  // Do not split increment/decrement tokens into arithmetic operators.
  const after = text[index + operator.length] ?? '';
  if (after === operator || after === '=') return false;
  // A negative exponent is part of a numeric literal, not subtraction.
  if (operator === '-' && /[eE]/.test(before) && /\d/.test(text[index - 2] ?? '')) return false;
  return true;
}

/** Find the right-most operator at depth zero, ignoring strings/comments. */
function findTopLevelBinary(
  text: string,
  operators: readonly string[],
): { index: number; operator: string } | null {
  const ordered = [...operators].sort((a, b) => b.length - a.length);
  let depth = 0;
  let found: { index: number; operator: string } | null = null;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = skipString(text, i);
      if (end < 0) return found;
      i = end;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i = skipLineComment(text, i);
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i = skipBlockComment(text, i);
      continue;
    }
    if (c === '(' || c === '{' || c === '[') {
      depth++;
      i++;
      continue;
    }
    if (c === ')' || c === '}' || c === ']') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }
    if (depth === 0) {
      const match = ordered.find(
        (operator) =>
          text.startsWith(operator, i) && isBinaryOperatorPosition(text, i, operator),
      );
      if (match) {
        found = { index: i, operator: match };
        i += match.length;
        continue;
      }
    }
    i++;
  }
  return found;
}

function workerBinaryBlock(rawExpr: string): ParsedBlock | null {
  const expression = stripWrappingParens(rawExpr);
  if (!expression) return null;

  for (const group of WORKER_BINARY_GROUPS) {
    const match = findTopLevelBinary(expression, group.operators);
    if (!match) continue;
    const lhs = expression.slice(0, match.index).trim();
    const rhs = expression.slice(match.index + match.operator.length).trim();
    if (!lhs || !rhs) continue;
    return {
      blockType: group.blockType,
      fields: { OP: match.operator },
      children: {},
      valueInputs: { LHS: valueBlock(lhs), RHS: valueBlock(rhs) },
    };
  }
  return null;
}

function parseWorkerCall(
  expression: string,
  matcher: RegExp,
): { name: string; args: string[] } | null {
  const match = matcher.exec(expression);
  if (!match) return null;
  const open = expression.indexOf('(', Math.max(0, match[0].length - 1));
  if (open < 0 || findMatchingClose(expression, open) !== expression.length) return null;
  return { name: match[1], args: splitArgs(expression.slice(open + 1, -1)) };
}

function valueBlock(rawExpr: string): ParsedBlock {
  const e = rawExpr.trim().replace(/;$/, '').trim();
  const binary = workerBinaryBlock(e);
  if (binary) return binary;
  // Unary negation is checked after binary parsing so `!==` stays a
  // comparison. Recurse to preserve nested expressions such as `!!v.active`.
  if (e.length > 1 && e.startsWith('!') && e[1] !== '=') {
    const operand = e.slice(1).trim();
    if (operand) {
      return {
        blockType: 'r20_worker_not',
        fields: {},
        children: {},
        valueInputs: { VALUE: valueBlock(operand) },
      };
    }
  }
  // v.NAME / v.NAME_max — Stage worker-1 reporter.
  const unaryMath = parseWorkerCall(e, /^Math\.(floor|ceil|round|abs)\s*\(/);
  if (unaryMath && unaryMath.args.length === 1 && unaryMath.args[0]) {
    return {
      blockType: 'r20_worker_math_unary',
      fields: { OP: unaryMath.name },
      children: {},
      valueInputs: { VALUE: valueBlock(unaryMath.args[0]) },
    };
  }
  const binaryMath = parseWorkerCall(e, /^Math\.(min|max)\s*\(/);
  if (binaryMath && binaryMath.args.length === 2 && binaryMath.args.every(Boolean)) {
    return {
      blockType: 'r20_worker_math_binary',
      fields: { OP: binaryMath.name },
      children: {},
      valueInputs: {
        LHS: valueBlock(binaryMath.args[0]),
        RHS: valueBlock(binaryMath.args[1]),
      },
    };
  }
  let m = /^v\.([A-Za-z_$][\w$]*)_max$/.exec(e);
  if (m) {
    return {
      blockType: 'r20_worker_v_max_ref',
      fields: { NAME: m[1] },
      children: {},
    };
  }
  m = /^v\.([A-Za-z_$][\w$]*)$/.exec(e);
  if (m) {
    return {
      blockType: 'r20_worker_v_ref',
      fields: { NAME: m[1] },
      children: {},
    };
  }
  // 단순 식별자 (let/var ref).
  if (/^[A-Za-z_$][\w$]*$/.test(e)) {
    return {
      blockType: 'r20_worker_let_ref',
      fields: { NAME: e },
      children: {},
    };
  }
  // getTranslationByKey('K') / getTranslationByLang('L','K') — reporter.
  m = /^getTranslationByKey\(\s*(['"])([^'"]*)\1\s*\)$/.exec(e);
  if (m) {
    return {
      blockType: 'r20_get_translation',
      fields: { KEY: m[2], LANG: '' },
      children: {},
    };
  }
  m = /^getTranslationByLang\(\s*(['"])([^'"]*)\1\s*,\s*(['"])([^'"]*)\3\s*\)$/.exec(e);
  if (m) {
    return {
      blockType: 'r20_get_translation',
      fields: { LANG: m[2], KEY: m[4] },
      children: {},
    };
  }
  // getCompendiumPage('PATH') / getCompendiumEntries('PATH','SUB').
  m = /^getCompendiumPage\(\s*(['"])([^'"]*)\1\s*\)$/.exec(e);
  if (m) {
    return {
      blockType: 'r20_get_compendium',
      fields: { PATH: m[2], SUBPATH: '' },
      children: {},
    };
  }
  m = /^getCompendiumEntries\(\s*(['"])([^'"]*)\1\s*,\s*(['"])([^'"]*)\3\s*\)$/.exec(e);
  if (m) {
    return {
      blockType: 'r20_get_compendium',
      fields: { PATH: m[2], SUBPATH: m[4] },
      children: {},
    };
  }
  // fallback — raw expression as literal_string.
  return {
    blockType: 'r20_literal_string',
    fields: { STR: e },
    children: {},
  };
}

// ---------------------------------------------------------------------------
// Statement-level 매칭.
// ---------------------------------------------------------------------------

/**
 * `body` JS 텍스트를 statement chain 으로 파싱. 재귀 호출 가능.
 */
function parseStatements(body: string, stats: ParseStats): ParsedBlock[] {
  const out: ParsedBlock[] = [];
  let i = skipTrivia(body, 0);
  while (i < body.length) {
    // brace 블록 - 보통 함수 body 종료. 호출자에 위임.
    const c = body[i];
    if (c === '}' || c === ')' || c === ']') break;

    const matched = parseOneStatement(body, i, stats);
    if (!matched) break;
    out.push(matched.block);
    i = skipTrivia(body, matched.end);
    // ; 소비.
    if (body[i] === ';') i = skipTrivia(body, i + 1);
  }
  return out;
}

interface OneMatch {
  block: ParsedBlock;
  end: number; // statement (including trailing brace/paren) 의 끝 (exclusive)
}

/**
 * `body[i..]` 에서 한 statement 매칭. 끝 위치 + 매칭 block 반환.
 *
 * 매칭 시 `stats.matched` ++ (single-pattern recognition) 또는 재귀 누적.
 * 매칭 못 하면 raw fallback 블록 + `stats.unparsed` ++.
 */
function parseOneStatement(body: string, start: number, stats: ParseStats): OneMatch | null {
  const i = skipTrivia(body, start);
  if (i >= body.length) return null;

  // ---- on('EVENT', cb) ----
  const onMatch = matchCall(body, i, 'on');
  if (onMatch) {
    const block = tryParseOnCall(onMatch.args, stats);
    if (block) {
      stats.matched++;
      return { block, end: onMatch.end };
    }
    // 인식 가능한 on(...) 패턴이 아님 — 통째로 raw.
    return rawStatementFallback(body, start, stats);
  }

  // ---- getAttrs([...], cb) ----
  const getAttrsMatch = matchCall(body, i, 'getAttrs');
  if (getAttrsMatch) {
    const block = tryParseGetAttrs(getAttrsMatch.args, stats);
    if (block) {
      stats.matched++;
      return { block, end: getAttrsMatch.end };
    }
    return rawStatementFallback(body, start, stats);
  }

  // ---- setAttrs({...}) ----
  const setAttrsMatch = matchCall(body, i, 'setAttrs');
  if (setAttrsMatch) {
    const block = tryParseSetAttrs(setAttrsMatch.args);
    if (block) {
      stats.matched++;
      return { block, end: setAttrsMatch.end };
    }
    return rawStatementFallback(body, start, stats);
  }

  // ---- getSectionIDs('repeating_X', cb) ----
  const gsiMatch = matchCall(body, i, 'getSectionIDs');
  if (gsiMatch) {
    const block = tryParseGetSectionIDs(gsiMatch.args, stats);
    if (block) {
      stats.matched++;
      return { block, end: gsiMatch.end };
    }
    return rawStatementFallback(body, start, stats);
  }

  // ---- removeRepeatingRow('repeating_X_' + id) ----
  const rrMatch = matchCall(body, i, 'removeRepeatingRow');
  if (rrMatch) {
    const block = tryParseRemoveRepeatingRow(rrMatch.args);
    if (block) {
      stats.matched++;
      return { block, end: rrMatch.end };
    }
    return rawStatementFallback(body, start, stats);
  }

  // ---- console.log(...) ----
  const clMatch = matchCall(body, i, 'console.log');
  if (clMatch) {
    stats.matched++;
    return {
      block: {
        blockType: 'r20_worker_console_log',
        fields: {},
        children: {},
        valueInputs: { VALUE: valueBlock(clMatch.args) },
      },
      end: clMatch.end,
    };
  }

  // ---- if (COND) { BODY } ----
  if (body.startsWith('if', i)) {
    const afterIf = skipTrivia(body, i + 2);
    if (body[afterIf] === '(') {
      const condEnd = findMatchingClose(body, afterIf);
      if (condEnd > 0) {
        const cond = body.slice(afterIf + 1, condEnd - 1).trim();
        const braceStart = skipTrivia(body, condEnd);
        if (body[braceStart] === '{') {
          const braceEnd = findMatchingClose(body, braceStart);
          if (braceEnd > 0) {
            const inner = body.slice(braceStart + 1, braceEnd - 1);
            const innerBlocks = parseStatements(inner, stats);
            let end = braceEnd;
            let elseBlocks: ParsedBlock[] = [];
            const elseStart = skipTrivia(body, braceEnd);
            const hasElse = body.startsWith('else', elseStart)
              && !/[A-Za-z0-9_$]/.test(body[elseStart + 4] ?? '');
            if (hasElse) {
              const afterElse = skipTrivia(body, elseStart + 4);
              const hasElseIf = body.startsWith('if', afterElse)
                && !/[A-Za-z0-9_$]/.test(body[afterElse + 2] ?? '');
              if (hasElseIf) {
                const nested = parseOneStatement(body, afterElse, stats);
                if (nested) {
                  elseBlocks = [nested.block];
                  end = nested.end;
                }
              } else if (body[afterElse] === '{') {
                const elseEnd = findMatchingClose(body, afterElse);
                if (elseEnd > 0) {
                  elseBlocks = parseStatements(body.slice(afterElse + 1, elseEnd - 1), stats);
                  end = elseEnd;
                }
              }
            }
            stats.matched++;
            return {
              block: {
                blockType: 'r20_worker_if',
                fields: {},
                children: { CHILDREN: innerBlocks, ELSE: elseBlocks },
                valueInputs: { CONDITION: valueBlock(cond) },
              },
              end,
            };
          }
        }
      }
    }
  }

  // ---- for (let VAR = 0; VAR < N; VAR++) { BODY } ----
  if (body.startsWith('for', i)) {
    const afterFor = skipTrivia(body, i + 3);
    if (body[afterFor] === '(') {
      const headerEnd = findMatchingClose(body, afterFor);
      if (headerEnd > 0) {
        const header = body.slice(afterFor + 1, headerEnd - 1);
        const braceStart = skipTrivia(body, headerEnd);
        if (body[braceStart] === '{') {
          const braceEnd = findMatchingClose(body, braceStart);
          if (braceEnd > 0) {
            const m =
              /^\s*(?:let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*0\s*;\s*\1\s*<\s*([^;]+);\s*\1\s*\+\+\s*$/.exec(
                header,
              );
            if (m) {
              const inner = body.slice(braceStart + 1, braceEnd - 1);
              const innerBlocks = parseStatements(inner, stats);
              stats.matched++;
              return {
                block: {
                  blockType: 'r20_worker_for_count',
                  fields: { VAR: m[1] },
                  children: { CHILDREN: innerBlocks },
                  valueInputs: { COUNT: valueBlock(m[2].trim()) },
                },
                end: braceEnd,
              };
            }
          }
        }
      }
    }
  }

  // ---- IDS.forEach((VAR) => { BODY })  /  function(VAR) { BODY } ----
  const fe = tryParseForEach(body, i, stats);
  if (fe) {
    stats.matched++;
    return fe;
  }

  // ---- let VAR = generateRowID(); / var VAR = generateRowID(); / const VAR = ... ----
  {
    const m = /^(?:let|var|const)\s+([A-Za-z_$][\w$]*)\s*=\s*generateRowID\s*\(\s*\)/.exec(
      body.slice(i),
    );
    if (m) {
      stats.matched++;
      return {
        block: {
          blockType: 'r20_generate_row_id',
          fields: { VAR: m[1] },
          children: {},
        },
        end: i + m[0].length,
      };
    }
  }

  // ---- let / var / const VAR = EXPR; ----
  {
    const m = /^(let|var|const)\s+([A-Za-z_$][\w$]*)\s*=\s*/.exec(body.slice(i));
    if (m) {
      const exprStart = i + m[0].length;
      const [exprEnd] = findStatementEnd(body, exprStart);
      const expr = body.slice(exprStart, exprEnd).trim();
      stats.matched++;
      return {
        block: {
          blockType: 'r20_worker_var_let',
          fields: { KIND: m[1], VAR: m[2] },
          children: {},
          valueInputs: { VALUE: valueBlock(expr) },
        },
        end: exprEnd,
      };
    }
  }

  // ---- var VAR = EXPR;  (let 의 alias 로 처리) ----
  {
    const m = /^var\s+([A-Za-z_$][\w$]*)\s*=\s*/.exec(body.slice(i));
    if (m) {
      const exprStart = i + m[0].length;
      const [exprEnd] = findStatementEnd(body, exprStart);
      const expr = body.slice(exprStart, exprEnd).trim();
      stats.matched++;
      return {
        block: {
          blockType: 'r20_worker_var_let',
          fields: { VAR: m[1] },
          children: {},
          valueInputs: { VALUE: valueBlock(expr) },
        },
        end: exprEnd,
      };
    }
  }

  // ---- VAR = EXPR;  (재할당) ----
  {
    const m = /^([A-Za-z_$][\w$]*)\s*=\s*/.exec(body.slice(i));
    if (m && body[i + m[1].length] !== '=' /* not == */) {
      // 다음 char 가 '=' (즉, ==/===) 면 매칭 X.
      const peek = body[skipTrivia(body, i + m[0].length)];
      // 안전 — operator '=' 직후가 또 '=' 면 매칭 X (loose check).
      const afterEq = m[0].endsWith('= ') ? m[0].length - 1 : m[0].length - 1;
      void peek;
      void afterEq;
      const exprStart = i + m[0].length;
      const [exprEnd, term] = findStatementEnd(body, exprStart);
      const expr = body.slice(exprStart, exprEnd).trim();
      // 빈 expression 거부 (구문 깨짐).
      if (expr.length === 0) return rawStatementFallback(body, start, stats);
      void term;
      stats.matched++;
      return {
        block: {
          blockType: 'r20_worker_var_set',
          fields: { VAR: m[1] },
          children: {},
          valueInputs: { VALUE: valueBlock(expr) },
        },
        end: exprEnd,
      };
    }
  }

  // ---- return [EXPR]; ----
  {
    const m = /^return\b/.exec(body.slice(i));
    if (m) {
      const exprStart = i + m[0].length;
      const [exprEnd] = findStatementEnd(body, exprStart);
      const expr = body.slice(exprStart, exprEnd).trim();
      stats.matched++;
      return {
        block: {
          blockType: 'r20_worker_return',
          fields: {},
          children: {},
          valueInputs: expr ? { VALUE: valueBlock(expr) } : undefined,
        },
        end: exprEnd,
      };
    }
  }

  // ---- raw fallback ----
  return rawStatementFallback(body, start, stats);
}

/**
 * `body[start..]` 의 다음 statement 를 `r20_raw_worker` JS field 로 박는 fallback.
 * 끝 위치를 잘 잡아야 chain 진행 가능 — findStatementEnd 사용.
 */
function rawStatementFallback(
  body: string,
  start: number,
  stats: ParseStats,
): OneMatch | null {
  const i = skipTrivia(body, start);
  if (i >= body.length) return null;
  let [end] = findStatementEnd(body, i);
  // brace 한 덩어리 (block statement / function decl 등) 인 경우 전체를 raw.
  if (body[i] === '{') {
    const close = findMatchingClose(body, i);
    if (close > 0) end = close;
  }
  // 0-length 이면 무한 루프 방지.
  if (end <= i) end = i + 1;
  const raw = body.slice(i, end).trim();
  if (!raw) {
    return { block: { blockType: 'r20_raw_worker', fields: { JS: '' }, children: {} }, end };
  }
  stats.unparsed++;
  return {
    block: { blockType: 'r20_raw_worker', fields: { JS: raw }, children: {} },
    end,
  };
}

// ---------------------------------------------------------------------------
// Pattern parsers — on / getAttrs / setAttrs / getSectionIDs / etc.
// ---------------------------------------------------------------------------

function tryParseOnCall(args: string, stats: ParseStats): ParsedBlock | null {
  // splitArgs 로 (eventString, callback) 분리.
  const parts = splitArgs(args);
  if (parts.length !== 2) return null;
  const eventStr = stripQuotes(parts[0]);
  if (eventStr === null) return null;
  // 단일 이벤트만 v1 에서 지원 — 공백 split 후 1개여야 함.
  const events = eventStr.trim().split(/\s+/).filter(Boolean);
  if (events.length !== 1) return null;
  const cb = parseCallback(parts[1]);
  if (!cb) return null;
  const innerBlocks = parseStatements(cb.body, stats);
  return eventToHatBlock(events[0], innerBlocks);
}

function tryParseGetAttrs(args: string, stats: ParseStats): ParsedBlock | null {
  const parts = splitArgs(args);
  if (parts.length !== 2) return null;
  const names = parseStringArray(parts[0]);
  if (!names) return null;
  const cb = parseCallback(parts[1]);
  if (!cb) return null;
  const innerBlocks = parseStatements(cb.body, stats);
  return {
    blockType: 'r20_get_attrs',
    fields: { ATTRS: names.join(', ') },
    children: { CHILDREN: innerBlocks },
  };
}

function tryParseSetAttrs(args: string): ParsedBlock | null {
  // setAttrs 의 두 번째 options 객체는 현재 시각 블록이 표현할 수 없다.
  // 첫 번째 객체만 블록화하면 silent 등의 동작이 조용히 사라지므로
  // 지원하지 않는 호출은 전체 statement raw-worker 경계로 보존한다.
  const parts = splitArgs(args);
  if (parts.length !== 1) return null;
  const pairs = parseObjectPairs(parts[0]);
  if (!pairs) return null;

  if (pairs.length === 1) {
    return {
      blockType: 'r20_set_attrs',
      fields: { NAME: pairs[0][0] },
      children: {},
      valueInputs: { VALUE: valueBlock(pairs[0][1]) },
    };
  }
  // The visual block has three value slots. Never silently drop a fourth
  // property: return null so the caller preserves the complete statement in
  // the explicit raw-worker boundary.
  if (pairs.length > 3) return null;
  const slice = pairs.slice(0, 3);
  const fields: Record<string, string> = {};
  const valueInputs: Record<string, ParsedBlock> = {};
  for (let n = 0; n < slice.length; n++) {
    const [k, v] = slice[n];
    fields[`KEY${n + 1}`] = k;
    valueInputs[`VAL${n + 1}`] = valueBlock(v);
  }
  // 미사용 슬롯은 빈 KEY.
  for (let n = slice.length; n < 3; n++) {
    fields[`KEY${n + 1}`] = '';
  }
  return {
    blockType: 'r20_set_attrs_pair',
    fields,
    children: {},
    valueInputs,
  };
}

function tryParseGetSectionIDs(args: string, stats: ParseStats): ParsedBlock | null {
  const parts = splitArgs(args);
  if (parts.length !== 2) return null;
  const raw = stripQuotes(parts[0]);
  if (raw === null) return null;
  const m = /^repeating_([\w-]+)$/.exec(raw);
  if (!m) return null;
  const cb = parseCallback(parts[1]);
  if (!cb) return null;
  // 콜백 param 이 ids 의 변수명.
  const varName = cb.params.trim() || 'ids';
  const innerBlocks = parseStatements(cb.body, stats);
  return {
    blockType: 'r20_get_section_ids',
    fields: { SECTION: m[1], VAR: varName },
    children: { CHILDREN: innerBlocks },
  };
}

function tryParseRemoveRepeatingRow(args: string): ParsedBlock | null {
  // 형태: 'repeating_<section>_' + <id-expr>   또는   `repeating_<section>_${id}`
  const t = args.trim();
  let section: string | null = null;
  let idExpr: string | null = null;

  // 1) 'repeating_<S>_' + id-expr
  const m = /^(['"])repeating_([\w-]+)_\1\s*\+\s*(.+)$/.exec(t);
  if (m) {
    section = m[2];
    idExpr = m[3].trim();
  }
  // 2) `repeating_<S>_${id-expr}`
  if (section === null) {
    const m2 = /^`repeating_([\w-]+)_\$\{([^}]+)\}`$/.exec(t);
    if (m2) {
      section = m2[1];
      idExpr = m2[2].trim();
    }
  }
  if (section === null || idExpr === null) return null;
  return {
    blockType: 'r20_remove_repeating_row',
    fields: { SECTION: section },
    children: {},
    valueInputs: { ROW_ID: valueBlock(idExpr) },
  };
}

function tryParseForEach(body: string, start: number, stats: ParseStats): OneMatch | null {
  // `<expr>.forEach(<callback>)` — expr 는 식별자 단순 케이스 우선.
  // start 부터 `.forEach(` 위치를 찾는다. 식별자 매칭 안 되면 null.
  const idMatch = /^([A-Za-z_$][\w$]*)\s*\.\s*forEach\s*\(/.exec(body.slice(start));
  if (!idMatch) return null;
  const idsName = idMatch[1];
  const openParenIdx = start + idMatch[0].length - 1;
  const closeParenIdx = findMatchingClose(body, openParenIdx);
  if (closeParenIdx < 0) return null;
  const argText = body.slice(openParenIdx + 1, closeParenIdx - 1);
  const cb = parseCallback(argText);
  if (!cb) return null;
  const innerBlocks = parseStatements(cb.body, stats);
  return {
    block: {
      blockType: 'r20_for_each_id',
      fields: { VAR: cb.params.trim() || 'id' },
      children: { CHILDREN: innerBlocks },
      valueInputs: { IDS: valueBlock(idsName) },
    },
    end: closeParenIdx,
  };
}

// ---------------------------------------------------------------------------
// Public entry.
// ---------------------------------------------------------------------------

/**
 * `<script type="text/worker">` body 의 JS 텍스트를 25 sheet_worker 카탈로그
 * 블록으로 분해. 매칭 안 되는 statement 는 r20_raw_worker 단편으로 fallback.
 *
 * 반환 `blocks` 가 비면 호출자는 단일 r20_raw_worker (전체) 로 emit 가능.
 */
export function parseSheetWorkerScript(text: string): ParseResult {
  const stats: ParseStats = { matched: 0, unparsed: 0 };
  if (!text || !text.trim()) {
    return { blocks: [], stats };
  }
  const blocks = parseStatements(text, stats);
  return { blocks, stats };
}

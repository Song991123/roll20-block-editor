/**
 * autoPrefix — 사용자 시트의 class/id 에 `sheet-` 접두사 자동 부착.
 *
 * Anchor:
 *   - docs/spec/12_roll20_output_spec.md §3.1 / §3.2 — Roll20 community sheets
 *     convention 으로, generator emit 단계에서 `.foo` → `.sheet-foo` 변환.
 *   - docs/spec/16_redesign_decision_log.md D4 ① — default ON.
 *
 * 본 모듈은 워크스페이스의 raw HTML/CSS 문자열을 받아 prefix 부착된 문자열을
 * 반환하는 순수 함수만 제공. 부수효과 0, DOM 의존 0 (Web Worker 안전).
 *
 * 멱등성: 이미 `sheet-` / `charsheet` / `repeating_*` / `sheet-rolltemplate-*`
 * 박혀있는 식별자는 그대로 유지. 같은 입력 두 번 호출 = 같은 결과.
 *
 * 시스템 specific / 영시영 hardcoding 0 — 모든 class/id 토큰은 사용자 입력 텍스트.
 */

/** prefix 미부착 reserved 토큰 — 이미 Roll20 강제 패턴. */
const RESERVED_TOKEN_PATTERNS: RegExp[] = [
  /^sheet-/,
  /^charsheet$/,
  /^repeating_/,
];

/** Roll20 adds these classes to resolved inline rolls at runtime. */
const ROLL20_RUNTIME_CLASS_TOKENS = new Set([
  'inlinerollresult',
  'fullcrit',
  'fullfail',
  'importantroll',
]);

function isReservedClassToken(token: string): boolean {
  return (
    RESERVED_TOKEN_PATTERNS.some((re) => re.test(token)) ||
    ROLL20_RUNTIME_CLASS_TOKENS.has(token)
  );
}

function isReservedIdToken(token: string): boolean {
  return RESERVED_TOKEN_PATTERNS.some((re) => re.test(token));
}

/** `class="..."` / `class='...'` 매처. */
const CLASS_ATTR_RE = /(?<=\s)class\s*=\s*(["'])((?:(?!\1).)*)\1/g;

/** `id="..."` / `id='...'`. */
const ID_ATTR_RE = /(?<=\s)id\s*=\s*(["'])((?:(?!\1).)*)\1/g;

/** `<style>...</style>` 매처 — multiline. */
const STYLE_TAG_RE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
const SCRIPT_TAG_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function autoPrefixHtmlClasses(html: string): string {
  if (!html) return html;

  const scriptSlots: Array<{ marker: string; source: string }> = [];
  let markerIndex = 0;
  let out = html.replace(SCRIPT_TAG_RE, (source) => {
    let marker = '';
    do {
      marker = '__R20_SCRIPT_SLOT_' + markerIndex++ + '__';
    } while (html.includes(marker));
    scriptSlots.push({ marker, source });
    return marker;
  });

  out = out.replace(STYLE_TAG_RE, (full) => {
    const tagEnd = full.indexOf('>');
    const openTag = full.slice(0, tagEnd + 1);
    const innerContent = full.slice(tagEnd + 1, -'</style>'.length);
    return `${openTag}${autoPrefixCssClasses(innerContent)}</style>`;
  });

  out = out.replace(CLASS_ATTR_RE, (_full, quote: string, value: string) => {
    const tokens = value.split(/\s+/).filter(Boolean);
    const next = tokens
      .map((t) => (isReservedClassToken(t) ? t : `sheet-${t}`))
      .join(' ');
    return `class=${quote}${next}${quote}`;
  });

  out = out.replace(ID_ATTR_RE, (_full, quote: string, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return `id=${quote}${quote}`;
    const next = isReservedIdToken(trimmed) ? trimmed : `sheet-${trimmed}`;
    return `id=${quote}${next}${quote}`;
  });

  for (const slot of scriptSlots) {
    out = out.split(slot.marker).join(slot.source);
  }

  return out;
}

export function autoPrefixCssClasses(css: string): string {
  if (!css) return css;
  return processCss(css);
}

// ---------------------------------------------------------------------------
// CSS 처리 내부
// ---------------------------------------------------------------------------

function processCss(css: string): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) {
        out += css.slice(i);
        break;
      }
      out += css.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    if (css[i] === '@') {
      const blockStart = css.indexOf('{', i);
      const semi = css.indexOf(';', i);
      if (semi >= 0 && (blockStart < 0 || semi < blockStart)) {
        out += css.slice(i, semi + 1);
        i = semi + 1;
        continue;
      }
      if (blockStart < 0) {
        out += css.slice(i);
        break;
      }
      const head = css.slice(i, blockStart);
      const keyword = head.match(/^@(-\w+-)?[\w-]+/)?.[0] ?? '';
      const blockEnd = matchBrace(css, blockStart);
      if (blockEnd < 0) {
        out += css.slice(i);
        break;
      }
      const body = css.slice(blockStart + 1, blockEnd);
      if (isConditionalAtRule(keyword)) {
        out += `${head}{${processCss(body)}}`;
      } else {
        out += `${head}{${body}}`;
      }
      i = blockEnd + 1;
      continue;
    }

    const blockStart = css.indexOf('{', i);
    if (blockStart < 0) {
      out += css.slice(i);
      break;
    }
    const blockEnd = matchBrace(css, blockStart);
    if (blockEnd < 0) {
      out += css.slice(i);
      break;
    }
    const selector = css.slice(i, blockStart);
    const body = css.slice(blockStart + 1, blockEnd);
    out += `${prefixSelectorList(selector)}{${body}}`;
    i = blockEnd + 1;
  }
  return out;
}

function isConditionalAtRule(keyword: string): boolean {
  if (!keyword) return false;
  const stripped = keyword.replace(/^@(-\w+-)?/, '@');
  return (
    stripped === '@media' ||
    stripped === '@supports' ||
    stripped === '@layer' ||
    stripped === '@container' ||
    stripped === '@document' ||
    stripped === '@scope'
  );
}

function matchBrace(css: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) return -1;
      i = end + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function prefixSelectorList(selectorBlob: string): string {
  const parts = splitTopLevel(selectorBlob, ',');
  return parts.map(prefixSingleSelector).join(',');
}

function prefixSingleSelector(selector: string): string {
  let out = '';
  let i = 0;
  while (i < selector.length) {
    const c = selector[i];
    if (c === '[') {
      const end = findClosing(selector, i, '[', ']');
      if (end < 0) {
        out += selector.slice(i);
        break;
      }
      out += selector.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (c === '(') {
      const end = findClosing(selector, i, '(', ')');
      if (end < 0) {
        out += selector.slice(i);
        break;
      }
      out += '(' + prefixSelectorList(selector.slice(i + 1, end)) + ')';
      i = end + 1;
      continue;
    }
    if (c === '.' || c === '#') {
      let j = i + 1;
      while (j < selector.length && isIdentChar(selector[j])) j++;
      const ident = selector.slice(i + 1, j);
      if (!ident) {
        out += c;
        i = i + 1;
        continue;
      }
      const keepUnprefixed =
        c === '.' ? isReservedClassToken(ident) : isReservedIdToken(ident);
      out += c + (keepUnprefixed ? ident : `sheet-${ident}`);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function isIdentChar(ch: string): boolean {
  if (ch === '-' || ch === '_') return true;
  if (ch >= '0' && ch <= '9') return true;
  if (ch >= 'a' && ch <= 'z') return true;
  if (ch >= 'A' && ch <= 'Z') return true;
  return ch.charCodeAt(0) >= 0x80;
}

function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = [];
  let depthBracket = 0;
  let depthParen = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < s.length && s[i] !== quote) {
        if (s[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === '[') depthBracket++;
    else if (c === ']') depthBracket--;
    else if (c === '(') depthParen++;
    else if (c === ')') depthParen--;
    else if (c === sep && depthBracket === 0 && depthParen === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

function findClosing(
  s: string,
  openIdx: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (c === '"' || c === "'") {
      const quote = c;
      i++;
      while (i < s.length && s[i] !== quote) {
        if (s[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export const __internals = {
  isReservedClassToken,
  isReservedIdToken,
  prefixSelectorList,
  prefixSingleSelector,
  splitTopLevel,
};

/**
 * Minimal DOM walker — HTML 문자열 → 노드 트리.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3 (블록 카탈로그)
 *   - docs/spec/10_system_architecture.md §3.3 (브라우저 / Node 공통 코어)
 *
 * 브라우저에서는 `DOMParser` 가 native — 본 모듈은 그 결과를 `DomNode` 추상
 * 으로 wrap. Node.js 환경 (CI / 검증 스크립트) 에서는 inlined 경량 파서로
 * 동일 추상 노드를 만든다. 외부 의존 0 (jsdom 같은 무거운 패키지 사용 X).
 *
 * 단일 시스템 specific 토큰 0. 일반 HTML 만 다룸.
 */

export type DomNodeType = 'element' | 'text' | 'comment' | 'root';

export interface DomNode {
  type: DomNodeType;
  /** element 일 때 lowercased tag. */
  tag?: string;
  /** element attributes — lowercased key. */
  attrs?: Record<string, string>;
  /** text/comment payload. */
  text?: string;
  children: DomNode[];
  /** parent (root 의 부모 = null). */
  parent: DomNode | null;
}

/**
 * 환경 비종속 HTML 파서. 브라우저면 native DOMParser 를 우선.
 * 결과는 항상 `DomNode` 추상 트리 (root → children).
 */
export function parseHtml(html: string): DomNode {
  if (typeof DOMParser !== 'undefined') {
    return parseWithDomParser(html);
  }
  return parseWithFallback(html);
}

// ---------------------------------------------------------------------------
// 1) 브라우저 native — 가장 정확.
// ---------------------------------------------------------------------------

/**
 * 비-void 요소의 self-closing 표기 (`<button ... />`) 를 명시적 닫힘
 * (`<button ...></button>`) 으로 정규화한다.
 *
 * 이유: HTML5 native DOMParser 는 비-void 요소의 `/>` 를 무시하고 태그를
 * "연 채로" 둔다 → 뒤따르는 형제 input/button 들이 전부 그 요소의 자식으로
 * 삼켜진다. legacy-sheet-corpus legacy corpus처럼 `<button ... />` 표기를 쓰는 실전 시트에서
 * 브라우저 import 만 입력칸 57개 + roll 버튼 49개가 소실되는 원인이었다
 * (Node fallback 파서와 Roll20 은 self-close 를 닫힘으로 처리).
 * 따옴표 안의 `/>`, `<` 는 건드리지 않도록 quote-aware 스캐너로 처리.
 */
export function normalizeSelfClosingTags(html: string): string {
  let out = '';
  let i = 0;
  const n = html.length;
  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    // comment / doctype / closing tag / raw-text 시작은 그대로 통과.
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt);
      const stop = end < 0 ? n : end + 3;
      out += html.slice(lt, stop);
      i = stop;
      continue;
    }
    const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(lt));
    if (!m) {
      out += html[lt];
      i = lt + 1;
      continue;
    }
    const tag = m[1].toLowerCase();
    // quote-aware 로 태그 끝 '>' 탐색.
    let j = lt + 1;
    let quote: string | null = null;
    while (j < n) {
      const c = html[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j += 1;
    }
    if (j >= n) {
      out += html.slice(lt);
      break;
    }
    const rawTag = html.slice(lt, j + 1);
    if (rawTag.endsWith('/>') && !VOID_TAGS.has(tag)) {
      out += `${rawTag.slice(0, -2).replace(/\s+$/, '')}></${tag}>`;
    } else {
      out += rawTag;
    }
    i = j + 1;
    // raw-text 요소 내부는 스캔 없이 통과 (script 안의 '<' 보호).
    if (RAW_TEXT_TAGS.has(tag) && !rawTag.endsWith('/>')) {
      const close = html.toLowerCase().indexOf(`</${tag}`, i);
      const stop = close < 0 ? n : close;
      out += html.slice(i, stop);
      i = stop;
    }
  }
  return out;
}

function parseWithDomParser(html: string): DomNode {
  const wrap = `<!doctype html><html><head></head><body>${normalizeSelfClosingTags(html)}</body></html>`;
  const doc = new DOMParser().parseFromString(wrap, 'text/html');
  const root: DomNode = { type: 'root', children: [], parent: null };
  for (const child of Array.from(doc.body.childNodes)) {
    const dom = convertNative(child, root);
    if (dom) root.children.push(dom);
  }
  return root;
}

function convertNative(node: Node, parent: DomNode): DomNode | null {
  if (node.nodeType === 1) {
    const el = node as Element;
    const attrs: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) {
      attrs[a.name.toLowerCase()] = a.value;
    }
    const out: DomNode = {
      type: 'element',
      tag: el.tagName.toLowerCase(),
      attrs,
      children: [],
      parent,
    };
    for (const child of Array.from(el.childNodes)) {
      const dom = convertNative(child, out);
      if (dom) out.children.push(dom);
    }
    return out;
  }
  if (node.nodeType === 3) {
    const text = (node as Text).data;
    if (!text) return null;
    return { type: 'text', text, children: [], parent };
  }
  if (node.nodeType === 8) {
    return { type: 'comment', text: (node as Comment).data, children: [], parent };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2) Fallback parser — Node.js / 외부 의존 없이 동작.
// ---------------------------------------------------------------------------
//
// 매우 단순한 HTML5-ish 파서:
//  - tag / attribute / self-close / text / comment 만 인식
//  - void elements (br/hr/input/img/meta/link/etc.) self-close
//  - <script> / <style> 내부는 raw text 로 처리 (자식 X)
//  - 잘못된 nesting 은 best-effort (오픈된 tag 가 자식 inner 에서 닫히면 unwind)

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const RAW_TEXT_TAGS = new Set(['script', 'style']);

function parseWithFallback(html: string): DomNode {
  const root: DomNode = { type: 'root', children: [], parent: null };
  const stack: DomNode[] = [root];
  let i = 0;
  const len = html.length;

  while (i < len) {
    const c = html[i];

    // comment <!-- ... -->
    if (c === '<' && html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      if (end < 0) {
        appendText(stack, html.slice(i));
        break;
      }
      const text = html.slice(i + 4, end);
      const parent = stack[stack.length - 1];
      parent.children.push({
        type: 'comment', text, children: [], parent,
      });
      i = end + 3;
      continue;
    }

    // doctype <!DOCTYPE ...>
    if (c === '<' && /^<!/.test(html.slice(i, i + 2))) {
      const end = html.indexOf('>', i);
      if (end < 0) break;
      i = end + 1;
      continue;
    }

    // closing </tag>
    if (c === '<' && html[i + 1] === '/') {
      const end = html.indexOf('>', i);
      if (end < 0) {
        appendText(stack, html.slice(i));
        break;
      }
      const tag = html.slice(i + 2, end).split(/\s/)[0].toLowerCase();
      // unwind stack to matching open
      for (let j = stack.length - 1; j > 0; j--) {
        if (stack[j].tag === tag) {
          stack.length = j;
          break;
        }
      }
      i = end + 1;
      continue;
    }

    // opening <tag ...>
    if (c === '<' && /[a-zA-Z]/.test(html[i + 1] || '')) {
      const close = findTagClose(html, i);
      if (close < 0) {
        appendText(stack, html.slice(i));
        break;
      }
      const raw = html.slice(i + 1, close);
      const selfClose = raw.endsWith('/');
      const body = selfClose ? raw.slice(0, -1).trim() : raw.trim();
      const tag = body.split(/\s/)[0].toLowerCase();
      const attrs = parseAttrs(body.slice(tag.length));
      const parent = stack[stack.length - 1];
      const el: DomNode = { type: 'element', tag, attrs, children: [], parent };
      parent.children.push(el);
      i = close + 1;
      if (!selfClose && !VOID_TAGS.has(tag)) {
        if (RAW_TEXT_TAGS.has(tag)) {
          // raw text until </tag>
          const closeIdx = findClosingTag(html, i, tag);
          if (closeIdx < 0) {
            el.children.push({ type: 'text', text: html.slice(i), children: [], parent: el });
            i = len;
          } else {
            const raw = html.slice(i, closeIdx);
            if (raw) {
              el.children.push({ type: 'text', text: raw, children: [], parent: el });
            }
            i = closeIdx + `</${tag}>`.length;
          }
          continue;
        }
        stack.push(el);
      }
      continue;
    }

    // Malformed Roll20 roll templates often contain raw "<" text fragments
    // that are not real tags. Treat that single character as text so the
    // fallback parser keeps moving instead of looping on the same index.
    if (c === '<') {
      appendText(stack, '<');
      i++;
      continue;
    }

    // text
    const nextLt = html.indexOf('<', i);
    const stop = nextLt < 0 ? len : nextLt;
    const text = html.slice(i, stop);
    if (text) {
      appendText(stack, text);
    }
    i = stop;
  }

  return root;
}

function appendText(stack: DomNode[], text: string): void {
  const parent = stack[stack.length - 1];
  parent.children.push({ type: 'text', text, children: [], parent });
}

function findTagClose(html: string, start: number): number {
  let i = start + 1;
  while (i < html.length) {
    const c = html[i];
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < html.length && html[i] !== q) i++;
      i++;
      continue;
    }
    if (c === '>') return i;
    i++;
  }
  return -1;
}

function findClosingTag(html: string, start: number, tag: string): number {
  const needle = `</${tag}`;
  const lower = html.toLowerCase();
  let i = start;
  while (i < html.length) {
    const idx = lower.indexOf(needle, i);
    if (idx < 0) return -1;
    const after = lower.charCodeAt(idx + needle.length);
    if (after === 0x3e /* > */ || after === 0x20 /* sp */ || after === 0x09 /* tab */ || after === 0x0a /* nl */) {
      return idx;
    }
    i = idx + needle.length;
  }
  return -1;
}

function parseAttrs(blob: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`<>=]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blob)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    out[name] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Utility: 전체 element 수 (raw text/comment 제외).
// ---------------------------------------------------------------------------

export function countElements(node: DomNode): number {
  let n = 0;
  const walk = (x: DomNode) => {
    if (x.type === 'element') n++;
    for (const c of x.children) walk(c);
  };
  walk(node);
  return n;
}

/** root 의 element 자식들만 (편의) — text 노드 skip. */
export function elementChildren(node: DomNode): DomNode[] {
  return node.children.filter((c) => c.type === 'element');
}

/** element 의 첫 텍스트 자식 — 라벨/표시 텍스트 추출용. */
export function firstTextContent(node: DomNode): string {
  for (const c of node.children) {
    if (c.type === 'text' && c.text && c.text.trim()) return c.text.trim();
  }
  return '';
}

/** 깊이 우선 모든 텍스트 합치기 (concat trim). */
export function allTextContent(node: DomNode): string {
  const buf: string[] = [];
  const walk = (x: DomNode) => {
    if (x.type === 'text' && x.text) buf.push(x.text);
    for (const c of x.children) walk(c);
  };
  walk(node);
  return buf.join(' ').replace(/\s+/g, ' ').trim();
}

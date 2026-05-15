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

function parseWithDomParser(html: string): DomNode {
  const wrap = `<!doctype html><html><head></head><body>${html}</body></html>`;
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
    if (!text || !text.trim()) return null;
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

    // text
    const nextLt = html.indexOf('<', i);
    const stop = nextLt < 0 ? len : nextLt;
    const text = html.slice(i, stop);
    if (text.trim()) {
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

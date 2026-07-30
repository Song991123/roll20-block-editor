const SAFE_TAGS = new Set([
  'a', 'b', 'br', 'caption', 'col', 'colgroup', 'div', 'em', 'h1', 'h2', 'h3',
  'hr', 'i', 'img', 'li', 'ol', 'p', 'small', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
]);

const DROP_CONTENT_TAGS = new Set([
  'base', 'embed', 'form', 'iframe', 'link', 'meta', 'object', 'script', 'style',
  'svg', 'template', 'textarea',
]);

const SAFE_ATTRIBUTES = new Set([
  'alt', 'aria-label', 'colspan', 'height', 'href', 'rel', 'rowspan', 'src',
  'target', 'title', 'width',
]);

function isSafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return !/^(?:javascript|vbscript):/i.test(normalized)
    && !/^data:(?!image\/(?:gif|jpeg|jpg|png|webp);base64,)/i.test(normalized);
}

function sanitizeDomFragment(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div data-r20-sanitize-root="1">${html}</div>`,
    'text/html',
  );
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const elements = Array.from(root.querySelectorAll('*')).reverse();
  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    if (DROP_CONTENT_TAGS.has(tag)) {
      element.remove();
      continue;
    }
    if (!SAFE_TAGS.has(tag)) {
      const parent = element.parentNode;
      if (parent) {
        while (element.firstChild) parent.insertBefore(element.firstChild, element);
        element.remove();
      }
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const keepDataAttribute = name.startsWith('data-') && name !== 'data-r20-sanitize-root';
      const keepAriaAttribute = name.startsWith('aria-');
      if (
        name.startsWith('on')
        || name === 'style'
        || (!SAFE_ATTRIBUTES.has(name) && name !== 'class' && !keepDataAttribute && !keepAriaAttribute)
        || ((name === 'href' || name === 'src') && !isSafeUrl(attribute.value))
      ) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  root.removeAttribute('data-r20-sanitize-root');
  return root.innerHTML;
}

function sanitizeFallback(html: string): string {
  let sanitized = String(html ?? '');
  sanitized = sanitized.replace(
    /<\s*(?:base|embed|form|iframe|link|meta|object|script|style|svg|template|textarea)\b[^>]*>[\s\S]*?<\s*\/\s*(?:base|embed|form|iframe|link|meta|object|script|style|svg|template|textarea)\s*>/gi,
    '',
  );
  sanitized = sanitized.replace(
    /<\s*(?:base|embed|form|iframe|link|meta|object|script|style|svg|template|textarea)\b[^>]*>[\s\S]*$/gi,
    '',
  );
  sanitized = sanitized.replace(/\s+on[a-z0-9:_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  sanitized = sanitized.replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  sanitized = sanitized.replace(
    /\s+(href|src)\s*=\s*("|')\s*(?:javascript|vbscript):[\s\S]*?\2/gi,
    '',
  );
  sanitized = sanitized.replace(
    /\s+(href|src)\s*=\s*[^\s>]*(?:javascript|vbscript):[^\s>]*/gi,
    '',
  );
  return sanitized;
}

/**
 * Keep rolltemplate markup useful while preventing it from executing in the
 * editor's React document. The browser path uses DOMParser; the SSR/test path
 * uses a conservative fallback that still removes executable surfaces.
 */
export function sanitizeRolltemplateHtml(html: string): string {
  if (typeof DOMParser !== 'undefined') return sanitizeDomFragment(html);
  return sanitizeFallback(html);
}

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'br', 'button', 'code', 'data', 'del', 'em', 'i', 'img',
  'input', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'select',
  'small', 'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'u', 'var',
]);

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/** Return true when a generated fragment can stay in an inline flow. */
export function isInlineMarkup(code: string): boolean {
  const source = String(code ?? '').trim();
  if (!source) return true;
  const tags = source.matchAll(/<!--[^]*?-->|<(\/)?([A-Za-z][\w:-]*)\b[^>]*>/g);
  let depth = 0;
  for (const match of tags) {
    if (!match[2]) continue;
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (closing) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && !INLINE_TAGS.has(tag)) return false;
    const selfClosing = /\/\s*>$/.test(match[0]);
    if (!selfClosing && !VOID_TAGS.has(tag)) depth += 1;
  }
  return true;
}

/** Return true when a fragment begins with text or an inline element. */
export function startsInlineMarkup(code: string): boolean {
  const source = String(code ?? '').trimStart();
  if (!source) return false;
  const firstTag = /^<([A-Za-z][\w:-]*)\b[^>]*>/.exec(source);
  return !firstTag || INLINE_TAGS.has(firstTag[1].toLowerCase());
}

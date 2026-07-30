const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'br', 'button', 'code', 'data', 'del', 'em', 'i', 'img',
  'input', 'ins', 'kbd', 'label', 'mark', 'q', 's', 'samp', 'select',
  'small', 'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'u', 'var',
]);

/** Return true when a generated fragment can stay in an inline flow. */
export function isInlineMarkup(code: string): boolean {
  const source = String(code ?? '').trim();
  if (!source) return true;
  const tags = source.matchAll(/<\/?([A-Za-z][\w:-]*)\b[^>]*>/g);
  for (const match of tags) {
    if (!INLINE_TAGS.has(match[1].toLowerCase())) return false;
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

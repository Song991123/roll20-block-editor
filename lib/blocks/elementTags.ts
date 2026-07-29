/** HTML tag policy shared by import and emit. */

const VOID_ELEMENT_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// These elements need a dedicated runtime/style boundary. Keeping them raw
// prevents a visual HTML block from accidentally executing or relocating
// document-level content in the editor surface.
const OPAQUE_ELEMENT_TAGS = new Set([
  'iframe',
  'object',
  'portal',
  'script',
  'style',
  'template',
]);

const ELEMENT_TAG_PATTERN = /^[a-z][a-z0-9:-]*$/i;

export function isVoidElementTag(tag: string): boolean {
  return VOID_ELEMENT_TAGS.has(String(tag ?? '').toLowerCase());
}

export function isEditableElementTag(tag: string): boolean {
  const normalized = String(tag ?? '').toLowerCase();
  return Boolean(normalized) && ELEMENT_TAG_PATTERN.test(normalized) && !OPAQUE_ELEMENT_TAGS.has(normalized);
}

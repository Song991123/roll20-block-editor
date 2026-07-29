/**
 * Standard HTML semantic elements that can contain sheet content.
 *
 * This list is shared by the importer and block generator so a semantic
 * element never becomes an opaque raw-HTML island merely because its tag is
 * unfamiliar to the editor.
 */
export const SEMANTIC_CONTAINER_TAGS = [
  'main',
  'header',
  'footer',
  'nav',
  'section',
  'article',
  'aside',
  'figure',
  'figcaption',
  'details',
  'summary',
  'address',
  'blockquote',
  'dl',
  'dt',
  'dd',
  'form',
  'p',
  'pre',
  'mark',
  'time',
] as const;

export type SemanticContainerTag = (typeof SEMANTIC_CONTAINER_TAGS)[number];

export function isSemanticContainerTag(tag: string): tag is SemanticContainerTag {
  return (SEMANTIC_CONTAINER_TAGS as readonly string[]).includes(tag);
}

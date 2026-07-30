/**
 * Tags that can be emitted by the small i18n display blocks.
 *
 * Keep this policy shared by the Blockly generator and HTML matcher so an
 * import -> emit cycle cannot silently change a supported element name.
 */
export const I18N_DISPLAY_TAGS = [
  'span',
  'div',
  'label',
  'strong',
  'b',
  'em',
  'small',
  'p',
  'td',
  'th',
] as const;

export const I18N_DISPLAY_TAG_SET = new Set<string>(I18N_DISPLAY_TAGS);

export function pickI18nDisplayTag(raw: string, fallback = 'span'): string {
  const value = String(raw ?? '').trim().toLowerCase();
  return I18N_DISPLAY_TAG_SET.has(value) ? value : fallback;
}

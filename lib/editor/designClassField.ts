/**
 * Return the Blockly field that carries the class of a block's root DOM node.
 *
 * Most HTML blocks use CLASS. Composite blocks keep their root element's
 * semantic class in a more specific field so the emitted markup remains
 * readable. Position editing must use that root field rather than guessing
 * from the imported sheet or adding a wrapper that changes layout semantics.
 */
const ROOT_CLASS_FIELDS: Record<string, string> = {
  r20_dual_roll_button: 'ROW_CLASS',
  r20_skill_row: 'TR_CLASS',
  r20_repeating_section_wrapper: 'FIELDSET_CLASS',
};

const ROOT_STYLE_FIELDS: Record<string, string> = {
  r20_skill_row: 'TR_STYLE',
  r20_repeating_section_wrapper: 'FIELDSET_STYLE',
};

export function designClassFieldForBlockType(type: string): string {
  const normalized = String(type ?? '').trim().toLowerCase();
  return ROOT_CLASS_FIELDS[normalized] ?? 'CLASS';
}

export function designStyleFieldForBlockType(type: string): string {
  const normalized = String(type ?? '').trim().toLowerCase();
  return ROOT_STYLE_FIELDS[normalized] ?? 'STYLE';
}

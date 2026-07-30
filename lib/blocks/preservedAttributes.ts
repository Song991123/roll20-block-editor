/**
 * Imported HTML attributes that do not have a dedicated block field yet.
 *
 * The value lives in a hidden Blockly field so it survives XML hydration and
 * can be emitted again without making the visible block UI sheet-specific.
 */

export const PRESERVED_ATTRS_FIELD = '__R20_PRESERVED_ATTRS';

const EVENT_ATTRIBUTE = /^on[a-z0-9_-]+$/i;
const SAFE_ATTRIBUTE_NAME = /^[A-Za-z_:][A-Za-z0-9:._-]*$/;

function escapeAttribute(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isPreservableAttribute(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    SAFE_ATTRIBUTE_NAME.test(name) &&
    !EVENT_ATTRIBUTE.test(lower) &&
    lower !== 'srcdoc' &&
    lower !== 'data-r20-block-id' &&
    lower !== 'data-r20-text-node'
  );
}

export function serializePreservedAttributes(attrs: Record<string, string>): string {
  const entries = Object.entries(attrs)
    .filter(([name]) => isPreservableAttribute(name))
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.length ? JSON.stringify(entries) : '';
}

function parsePreservedAttributes(raw: string): Array<[string, string]> {
  if (!raw.trim()) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry): Array<[string, string]> => {
      if (!Array.isArray(entry) || entry.length < 2) return [];
      const name = String(entry[0] ?? '');
      const attributeValue = String(entry[1] ?? '');
      return isPreservableAttribute(name) ? [[name, attributeValue]] : [];
    });
  } catch {
    return [];
  }
}

/**
 * Return true when a generated block cannot represent one of the imported
 * attributes. Composite blocks use this as a fail-safe: if packing would
 * discard an attribute, the importer keeps the smaller atomic block tree.
 */
export function hasPreservedAttributeOutside(
  raw: string,
  supportedNames: ReadonlySet<string>,
): boolean {
  return parsePreservedAttributes(raw).some(([name]) => !supportedNames.has(name.toLowerCase()));
}

function existingAttributeNames(rawAttributes: string): Set<string> {
  const names = new Set<string>();
  const attrPattern = /(?:^|\s)([A-Za-z_:][A-Za-z0-9:._-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;
  for (const match of rawAttributes.matchAll(attrPattern)) {
    names.add(match[1].toLowerCase());
  }
  return names;
}

/** Add imported attributes to the first generated opening element. */
export function injectPreservedAttributes(code: string, raw: string): string {
  const entries = parsePreservedAttributes(raw);
  if (!entries.length) return code;

  return code.replace(
    /<([A-Za-z][A-Za-z0-9:.-]*)(\s[^<>]*?)?(\/?)>/,
    (full, _tag: string, rawAttributes = '', close = '') => {
      const existing = existingAttributeNames(rawAttributes);
      const additions = entries
        .filter(([name]) => !existing.has(name.toLowerCase()))
        .map(([name, value]) => (value ? ` ${name}="${escapeAttribute(value)}"` : ` ${name}`))
        .join('');
      return additions ? full.slice(0, full.length - close.length - 1) + additions + close + '>' : full;
    },
  );
}

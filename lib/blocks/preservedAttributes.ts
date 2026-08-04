/**
 * Imported HTML attributes that do not have a dedicated block field yet.
 *
 * The value lives in a hidden Blockly field so it survives XML hydration and
 * can be emitted again without making the visible block UI sheet-specific.
 */

export const PRESERVED_ATTRS_FIELD = '__R20_PRESERVED_ATTRS';
export const PRESERVED_ATTRIBUTE_TARGET = 'data-r20-preserved-target';

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
  // `[]` is intentionally distinct from the empty field used by a newly
  // created block. Generators can therefore preserve omitted browser-default
  // attributes on imported elements without changing gallery-created blocks.
  return JSON.stringify(entries);
}

export function hasImportedAttributeSnapshot(raw: string): boolean {
  if (!raw.trim()) return false;
  try {
    return Array.isArray(JSON.parse(raw));
  } catch {
    return false;
  }
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

export function readPreservedAttribute(raw: string, requestedName: string): string | null {
  const normalized = requestedName.toLowerCase();
  const entry = parsePreservedAttributes(raw).find(([name]) => name.toLowerCase() === normalized);
  return entry?.[1] ?? null;
}

/** Remove selected CSS properties from a preserved `style` attribute. */
export function removePreservedStyleDeclarations(
  raw: string,
  properties: readonly string[],
): string {
  const removed = new Set(properties.map((property) => property.toLowerCase()));
  let removedAny = false;
  const entries = parsePreservedAttributes(raw).flatMap(([name, value]): Array<[string, string]> => {
    if (name.toLowerCase() !== 'style') return [[name, value]];
    const declarations: string[] = [];
    for (const chunk of value.split(';')) {
      const separator = chunk.indexOf(':');
      if (separator <= 0) continue;
      const property = chunk.slice(0, separator).trim().toLowerCase();
      const declarationValue = chunk.slice(separator + 1).trim();
      if (!property || !declarationValue) continue;
      if (removed.has(property)) {
        removedAny = true;
      } else {
        declarations.push(`${property}:${declarationValue}`);
      }
    }
    return declarations.length ? [[name, declarations.join(';')]] : [];
  });
  if (!removedAny) return raw;
  return entries.length ? JSON.stringify(entries) : '';
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

function canonicalClassTokenMultiset(value: string): string {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function restoreEquivalentClassFormatting(
  rawAttributes: string,
  entries: Array<[string, string]>,
): string {
  const preservedClass = entries.find(([name]) => name.toLowerCase() === 'class')?.[1];
  if (preservedClass == null) return rawAttributes;
  return rawAttributes.replace(
    /(\sclass\s*=\s*)(["'])(.*?)\2/i,
    (full, prefix: string, quote: string, generatedClass: string) => {
      if (
        canonicalClassTokenMultiset(generatedClass)
        !== canonicalClassTokenMultiset(preservedClass)
      ) {
        return full;
      }
      return `${prefix}${quote}${escapeAttribute(preservedClass)}${quote}`;
    },
  );
}

function restoreEquivalentTypeFormatting(
  rawAttributes: string,
  entries: Array<[string, string]>,
): string {
  const preservedType = entries.find(([name]) => name.toLowerCase() === 'type')?.[1];
  if (preservedType == null) return rawAttributes;
  return rawAttributes.replace(
    /(\stype\s*=\s*)(["'])(.*?)\2/i,
    (full, prefix: string, quote: string, generatedType: string) => {
      const importedSemanticType = preservedType === '' ? 'text' : preservedType.toLowerCase();
      if (generatedType.toLowerCase() !== importedSemanticType) return full;
      return `${prefix}${quote}${escapeAttribute(preservedType)}${quote}`;
    },
  );
}

/** Add imported attributes to the first generated opening element. */
export function injectPreservedAttributes(code: string, raw: string): string {
  const entries = parsePreservedAttributes(raw);
  const targetMarker = ` ${PRESERVED_ATTRIBUTE_TARGET}`;
  const markerIndex = code.indexOf(targetMarker);
  if (markerIndex >= 0) {
    const start = code.lastIndexOf('<', markerIndex);
    const end = code.indexOf('>', markerIndex);
    if (start >= 0 && end > markerIndex) {
      const opening = code.slice(start, end + 1);
      const injected = injectIntoFirstOpeningTag(opening, entries).replace(targetMarker, '');
      return `${code.slice(0, start)}${injected}${code.slice(end + 1)}`;
    }
  }
  return injectIntoFirstOpeningTag(code, entries);
}

function injectIntoFirstOpeningTag(code: string, entries: Array<[string, string]>): string {
  if (!entries.length) return code;
  return code.replace(
    /<([A-Za-z][A-Za-z0-9:.-]*)(\s[^<>]*?)?(\/?)>/,
    (full, _tag: string, rawAttributes = '', close = '') => {
      const restoredAttributes = restoreEquivalentClassFormatting(
        restoreEquivalentTypeFormatting(rawAttributes, entries),
        entries,
      );
      const existing = existingAttributeNames(restoredAttributes);
      const additions = entries
        .filter(([name]) => !existing.has(name.toLowerCase()))
        .map(([name, value]) => (value ? ` ${name}="${escapeAttribute(value)}"` : ` ${name}`))
        .join('');
      if (restoredAttributes === rawAttributes && !additions) return full;
      return `<${_tag}${restoredAttributes}${additions}${close}>`;
    },
  );
}

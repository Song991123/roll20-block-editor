/**
 * Preserve a CSS declaration property only when it is safe to emit verbatim.
 *
 * This accepts standard identifiers, vendor prefixes, custom properties,
 * escaped/non-ASCII identifiers, and the legacy IE `*property` hack. It rejects
 * declaration boundaries instead of deleting characters and changing meaning.
 */
export function preserveCssDeclarationProperty(raw: string): string | null {
  const property = String(raw ?? '').trim();
  if (!property) return null;

  const start = property.startsWith('*') ? 1 : 0;
  if (start === property.length) return null;
  return consumeIdentifier(property, start) === property.length ? property : null;
}

function consumeIdentifier(value: string, start: number): number {
  let index = start;

  if (value.startsWith('--', index)) {
    index += 2;
    const first = consumeNameChar(value, index);
    if (first === index) return -1;
    index = first;
  } else {
    if (value[index] === '-') index += 1;
    const first = consumeNameStart(value, index);
    if (first === index) return -1;
    index = first;
  }

  while (index < value.length) {
    const next = consumeNameChar(value, index);
    if (next === index) return index;
    index = next;
  }
  return index;
}

function consumeNameStart(value: string, index: number): number {
  const char = value[index];
  if (!char) return index;
  if (char === '\\') return consumeEscape(value, index);
  if (char === '_' || /[A-Za-z]/.test(char) || char.charCodeAt(0) >= 0x80) {
    return index + 1;
  }
  return index;
}

function consumeNameChar(value: string, index: number): number {
  const char = value[index];
  if (!char) return index;
  if (char === '-' || /[0-9]/.test(char)) return index + 1;
  return consumeNameStart(value, index);
}

function consumeEscape(value: string, index: number): number {
  let cursor = index + 1;
  const first = value[cursor];
  if (!first || first === '\r' || first === '\n' || first === '\f') return index;

  if (/[0-9A-Fa-f]/.test(first)) {
    let digits = 0;
    while (cursor < value.length && digits < 6 && /[0-9A-Fa-f]/.test(value[cursor])) {
      cursor += 1;
      digits += 1;
    }
    if (value[cursor] === ' ' || value[cursor] === '\t') cursor += 1;
    return cursor;
  }

  return cursor + 1;
}

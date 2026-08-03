export type TargetedHtmlAttributePatch = {
  blockId: string;
  tagName: string;
  beforeClassName: string | null;
  beforeStyleText: string | null;
  className: string | null;
  styleText: string | null;
};

export type TargetedHtmlPatchPlan = {
  baseHtmlKey: string;
  nextHtmlKey: string;
  patches: TargetedHtmlAttributePatch[];
};

type BuildTargetedHtmlPatchPlanInput = {
  beforeHtml: string;
  afterHtml: string;
  blockIds: readonly string[];
  baseHtmlKey: string;
  nextHtmlKey: string;
};

type ParsedAttribute = {
  name: string;
  value: string | null;
  quote: '"' | "'" | null;
};

type TargetOpeningTag = {
  blockId: string;
  start: number;
  end: number;
  tagName: string;
  selfClosing: boolean;
  attributes: Map<string, ParsedAttribute>;
};

const HTML_KEY_PATTERN = /^[a-z0-9-]{1,128}$/;
const BLOCK_ID_ATTRIBUTE = /data-r20-block-id\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const UNQUOTED_BLOCK_ID_ATTRIBUTE = /data-r20-block-id\s*=\s*([^\s"'=<>`]+)/gi;

function decodeAttributeEntities(value: string): string {
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|quot|apos|lt|gt));/gi, (match, decimal, hex, named) => {
    if (decimal || hex) {
      const codePoint = Number.parseInt(decimal || hex, decimal ? 10 : 16);
      return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    switch (String(named).toLowerCase()) {
      case 'amp': return '&';
      case 'quot': return '"';
      case 'apos': return "'";
      case 'lt': return '<';
      case 'gt': return '>';
      default: return match;
    }
  });
}

function findTagEnd(html: string, start: number): number {
  let quote: '"' | "'" | null = null;
  for (let index = start + 1; index < html.length; index += 1) {
    const char = html[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === '>') return index + 1;
  }
  return -1;
}

function parseOpeningTag(html: string, start: number, end: number, blockId: string): TargetOpeningTag | null {
  const source = html.slice(start, end);
  const tagMatch = source.match(/^<([A-Za-z][A-Za-z0-9:_-]*)/);
  if (!tagMatch) return null;
  const tagName = tagMatch[1];
  const attributes = new Map<string, ParsedAttribute>();
  let index = tagMatch[0].length;
  const contentEnd = source.length - 1;
  let selfClosing = false;

  while (index < contentEnd) {
    while (/\s/.test(source[index] ?? '')) index += 1;
    if (index >= contentEnd) break;
    if (source[index] === '/') {
      selfClosing = true;
      index += 1;
      while (/\s/.test(source[index] ?? '')) index += 1;
      if (index !== contentEnd) return null;
      break;
    }

    const nameStart = index;
    while (index < contentEnd && !/[\s=/>]/.test(source[index] ?? '')) index += 1;
    if (index === nameStart) return null;
    const name = source.slice(nameStart, index);
    const normalizedName = name.toLowerCase();
    if (attributes.has(normalizedName)) return null;
    while (/\s/.test(source[index] ?? '')) index += 1;

    let value: string | null = null;
    let quote: ParsedAttribute['quote'] = null;
    if (source[index] === '=') {
      index += 1;
      while (/\s/.test(source[index] ?? '')) index += 1;
      if (index >= contentEnd) return null;
      if (source[index] === '"' || source[index] === "'") {
        quote = source[index] as '"' | "'";
        index += 1;
        const valueStart = index;
        while (index < contentEnd && source[index] !== quote) index += 1;
        if (index >= contentEnd) return null;
        value = source.slice(valueStart, index);
        index += 1;
      } else {
        const valueStart = index;
        while (index < contentEnd && !/[\s>]/.test(source[index] ?? '')) index += 1;
        if (index === valueStart) return null;
        value = source.slice(valueStart, index);
      }
    }
    attributes.set(normalizedName, { name, value, quote });
  }

  const idAttribute = attributes.get('data-r20-block-id');
  if (!idAttribute?.quote || idAttribute.value === null) return null;
  if (decodeAttributeEntities(idAttribute.value) !== blockId) return null;
  return { blockId, start, end, tagName, selfClosing, attributes };
}

function findTargetOpeningTags(html: string, allowedIds: ReadonlySet<string>): Map<string, TargetOpeningTag[]> | null {
  const found = new Map<string, TargetOpeningTag[]>();
  UNQUOTED_BLOCK_ID_ATTRIBUTE.lastIndex = 0;
  for (
    let match = UNQUOTED_BLOCK_ID_ATTRIBUTE.exec(html);
    match;
    match = UNQUOTED_BLOCK_ID_ATTRIBUTE.exec(html)
  ) {
    if (allowedIds.has(decodeAttributeEntities(match[1] ?? ''))) return null;
  }
  BLOCK_ID_ATTRIBUTE.lastIndex = 0;
  for (let match = BLOCK_ID_ATTRIBUTE.exec(html); match; match = BLOCK_ID_ATTRIBUTE.exec(html)) {
    const blockId = decodeAttributeEntities(match[1] ?? match[2] ?? '');
    if (!allowedIds.has(blockId)) continue;
    const start = html.lastIndexOf('<', match.index);
    if (start < 0 || html.lastIndexOf('>', match.index) > start) return null;
    const end = findTagEnd(html, start);
    if (end < 0 || match.index >= end) return null;
    const tag = parseOpeningTag(html, start, end, blockId);
    if (!tag) return null;
    const entries = found.get(blockId) ?? [];
    entries.push(tag);
    found.set(blockId, entries);
  }
  return found;
}

function canonicalNonDesignAttributes(tag: TargetOpeningTag): string {
  const attributes = Array.from(tag.attributes.entries())
    .filter(([name]) => name !== 'class' && name !== 'style')
    .map(([name, attribute]) => [name, attribute.value] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    tagName: tag.tagName.toLowerCase(),
    selfClosing: tag.selfClosing,
    attributes,
  });
}

function readDesignAttribute(tag: TargetOpeningTag, name: 'class' | 'style'): string | null | undefined {
  const attribute = tag.attributes.get(name);
  if (!attribute) return null;
  if (!attribute.quote || attribute.value === null) return undefined;
  return attribute.value;
}

function unchangedOutsideTargets(
  beforeHtml: string,
  afterHtml: string,
  beforeTags: TargetOpeningTag[],
  afterTags: TargetOpeningTag[],
): boolean {
  const beforeOrdered = [...beforeTags].sort((left, right) => left.start - right.start);
  const afterOrdered = [...afterTags].sort((left, right) => left.start - right.start);
  if (beforeOrdered.length !== afterOrdered.length) return false;
  let beforeCursor = 0;
  let afterCursor = 0;
  for (let index = 0; index < beforeOrdered.length; index += 1) {
    const before = beforeOrdered[index];
    const after = afterOrdered[index];
    if (before.blockId !== after.blockId) return false;
    if (beforeHtml.slice(beforeCursor, before.start) !== afterHtml.slice(afterCursor, after.start)) return false;
    if (canonicalNonDesignAttributes(before) !== canonicalNonDesignAttributes(after)) return false;
    beforeCursor = before.end;
    afterCursor = after.end;
  }
  return beforeHtml.slice(beforeCursor) === afterHtml.slice(afterCursor);
}

export function buildTargetedHtmlPatchPlan({
  beforeHtml,
  afterHtml,
  blockIds,
  baseHtmlKey,
  nextHtmlKey,
}: BuildTargetedHtmlPatchPlanInput): TargetedHtmlPatchPlan | null {
  if (
    typeof beforeHtml !== 'string'
    || typeof afterHtml !== 'string'
    || !Array.isArray(blockIds)
    || blockIds.length < 1
    || blockIds.length > 128
    || typeof baseHtmlKey !== 'string'
    || typeof nextHtmlKey !== 'string'
    || !HTML_KEY_PATTERN.test(baseHtmlKey)
    || !HTML_KEY_PATTERN.test(nextHtmlKey)
    || baseHtmlKey === nextHtmlKey
    || beforeHtml === afterHtml
  ) return null;

  const allowedIds = new Set<string>();
  for (const blockId of blockIds) {
    if (
      typeof blockId !== 'string'
      || blockId.length < 1
      || blockId.length > 256
      || allowedIds.has(blockId)
    ) return null;
    allowedIds.add(blockId);
  }

  const beforeFound = findTargetOpeningTags(beforeHtml, allowedIds);
  const afterFound = findTargetOpeningTags(afterHtml, allowedIds);
  if (!beforeFound || !afterFound) return null;
  const beforeTags: TargetOpeningTag[] = [];
  const afterTags: TargetOpeningTag[] = [];
  for (const blockId of blockIds) {
    const beforeEntries = beforeFound.get(blockId) ?? [];
    const afterEntries = afterFound.get(blockId) ?? [];
    if (beforeEntries.length !== 1 || afterEntries.length !== 1) return null;
    beforeTags.push(beforeEntries[0]);
    afterTags.push(afterEntries[0]);
  }
  if (!unchangedOutsideTargets(beforeHtml, afterHtml, beforeTags, afterTags)) return null;

  const patches: TargetedHtmlAttributePatch[] = [];
  for (let index = 0; index < blockIds.length; index += 1) {
    const before = beforeTags[index];
    const after = afterTags[index];
    const beforeClassName = readDesignAttribute(before, 'class');
    const beforeStyleText = readDesignAttribute(before, 'style');
    const className = readDesignAttribute(after, 'class');
    const styleText = readDesignAttribute(after, 'style');
    if (
      before.tagName.toLowerCase() !== after.tagName.toLowerCase()
      || beforeClassName === undefined
      || beforeStyleText === undefined
      || className === undefined
      || styleText === undefined
    ) return null;
    if (beforeClassName === className && beforeStyleText === styleText) continue;
    patches.push({
      blockId: blockIds[index],
      tagName: after.tagName.toLowerCase(),
      beforeClassName,
      beforeStyleText,
      className,
      styleText,
    });
  }
  return patches.length ? { baseHtmlKey, nextHtmlKey, patches } : null;
}

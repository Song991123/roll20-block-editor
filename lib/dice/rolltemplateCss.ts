import {
  autoPrefixCssClasses,
  splitCssSelectorList,
} from '@/lib/preview/prefix';

export type RolltemplateFontPolicy =
  | 'default'
  | 'roll20-chat-fallback'
  | 'roll20-sandbox-font-proxy';

interface CssStatement {
  prelude: string;
  body: string | null;
}

const ROLLTEMPLATE_SCOPE = /(?:sheet-rolltemplate-|sheet-r20-node-)/i;
const KEYFRAMES = /^@(?:-webkit-)?keyframes\s+([A-Za-z_][\w-]*)\s*$/i;

/**
 * Keep only authored CSS that can affect a Rolltemplate while preserving the
 * surrounding conditional at-rule structure. Ordinary sheet selectors are
 * removed and referenced keyframes are namespaced before mounting.
 */
export function extractRolltemplateCss(
  css: string,
  fontPolicy: RolltemplateFontPolicy = 'default',
): string {
  const statements = parseCssStatements(autoPrefixCssClasses(css));
  const keyframeNames = collectKeyframeNames(statements);
  const referencedKeyframes = collectReferencedKeyframes(statements, keyframeNames);
  const keyframeRenames = new Map(
    [...referencedKeyframes].map((name) => [name, `r20-chat-${name}`]),
  );
  const filtered = renderRelevantStatements(statements, {
    includeFontFaces: fontPolicy !== 'roll20-chat-fallback',
    referencedKeyframes,
    keyframeRenames,
  });

  return rewriteRoll20AssetUrls(filtered, {
    proxyFontUrls: fontPolicy === 'roll20-sandbox-font-proxy',
  }).trim();
}

function renderRelevantStatements(
  statements: CssStatement[],
  options: {
    includeFontFaces: boolean;
    referencedKeyframes: Set<string>;
    keyframeRenames: Map<string, string>;
  },
): string {
  const rendered: string[] = [];

  for (const statement of statements) {
    const prelude = statement.prelude.trim();
    if (!prelude || statement.body == null) continue;

    if (/^@font-face\b/i.test(prelude)) {
      if (options.includeFontFaces) rendered.push(`${prelude} {${statement.body}}`);
      continue;
    }

    const keyframes = KEYFRAMES.exec(prelude);
    if (keyframes) {
      const name = keyframes[1];
      if (!options.referencedKeyframes.has(name)) continue;
      const renamed = options.keyframeRenames.get(name) ?? name;
      rendered.push(`${prelude.replace(name, renamed)} {${statement.body}}`);
      continue;
    }

    if (prelude.startsWith('@')) {
      const nested = renderRelevantStatements(parseCssStatements(statement.body), options);
      if (nested) rendered.push(`${prelude} {${nested}}`);
      continue;
    }

    const scopedSelectors = scopeRolltemplateSelectors(prelude);
    if (!scopedSelectors) continue;
    rendered.push(
      `${scopedSelectors} {${rewriteAnimationReferences(statement.body, options.keyframeRenames)}}`,
    );
  }

  return rendered.join('\n');
}

function scopeRolltemplateSelectors(selectorList: string): string {
  return splitCssSelectorList(selectorList)
    .map((selector) => selector.trim())
    .filter((selector) => selector && ROLLTEMPLATE_SCOPE.test(selector))
    .map((selector) => `:where(.r20-chat-pane) ${selector}`)
    .join(', ');
}

function collectKeyframeNames(statements: CssStatement[], names = new Set<string>()): Set<string> {
  for (const statement of statements) {
    if (statement.body == null) continue;
    const match = KEYFRAMES.exec(statement.prelude.trim());
    if (match) {
      names.add(match[1]);
      continue;
    }
    if (statement.prelude.trim().startsWith('@')) {
      collectKeyframeNames(parseCssStatements(statement.body), names);
    }
  }
  return names;
}

function collectReferencedKeyframes(
  statements: CssStatement[],
  keyframeNames: Set<string>,
  referenced = new Set<string>(),
): Set<string> {
  for (const statement of statements) {
    if (statement.body == null) continue;
    const prelude = statement.prelude.trim();
    if (prelude.startsWith('@')) {
      if (!KEYFRAMES.test(prelude)) {
        collectReferencedKeyframes(parseCssStatements(statement.body), keyframeNames, referenced);
      }
      continue;
    }
    if (!ROLLTEMPLATE_SCOPE.test(prelude) || !/(?:^|;)\s*(?:-webkit-)?animation(?:-name)?\s*:/i.test(statement.body)) {
      continue;
    }
    for (const name of keyframeNames) {
      if (containsCssIdentifier(statement.body, name)) referenced.add(name);
    }
  }
  return referenced;
}

function rewriteAnimationReferences(body: string, renames: Map<string, string>): string {
  return body.replace(
    /((?:^|;)\s*(?:-webkit-)?animation(?:-name)?\s*:\s*)([^;}]+)/gi,
    (_full, prefix: string, value: string) => {
      let next = value;
      for (const [name, renamed] of renames) {
        next = replaceCssIdentifier(next, name, renamed);
      }
      return `${prefix}${next}`;
    },
  );
}

function containsCssIdentifier(value: string, identifier: string): boolean {
  return new RegExp(`(^|[^\\w-])${escapeRegExp(identifier)}(?=$|[^\\w-])`).test(value);
}

function replaceCssIdentifier(value: string, identifier: string, replacement: string): string {
  return value.replace(
    new RegExp(`(^|[^\\w-])${escapeRegExp(identifier)}(?=$|[^\\w-])`, 'g'),
    (_full, prefix: string) => `${prefix}${replacement}`,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewriteRoll20AssetUrls(
  css: string,
  options: { proxyFontUrls?: boolean } = {},
): string {
  return css.replace(/url\s*\(([^)]+)\)/gi, (_full, rawUrl: string) => {
    const normalized = String(rawUrl).trim().replace(/^["']|["']$/g, '');
    if (!/^https?:\/\//i.test(normalized)) return '';
    if (!options.proxyFontUrls && /\.(?:woff2?|ttf|otf|eot)(?:[?#].*)?$/i.test(normalized)) {
      return `url("${normalized}")`;
    }
    if (
      normalized.startsWith('https://imgsrv.roll20.net/') ||
      normalized.startsWith('https://s3.amazonaws.com/files.d20.io') ||
      normalized.startsWith('https://files.d20.io') ||
      normalized.startsWith('https://app.roll20.net/images/')
    ) {
      return `url("${normalized}")`;
    }
    return `url("https://imgsrv.roll20.net/?src=${encodeURIComponent(normalized)}")`;
  });
}

function parseCssStatements(css: string): CssStatement[] {
  const statements: CssStatement[] = [];
  let cursor = 0;

  while (cursor < css.length) {
    cursor = skipTrivia(css, cursor);
    if (cursor >= css.length) break;

    const preludeStart = cursor;
    const boundary = findStatementBoundary(css, cursor);
    const prelude = css.slice(preludeStart, boundary.index).trim();
    if (!prelude) {
      cursor = boundary.index + 1;
      continue;
    }

    if (boundary.kind !== 'block') {
      statements.push({ prelude, body: null });
      cursor = boundary.index + (boundary.kind === 'semicolon' ? 1 : 0);
      continue;
    }

    const block = readBlock(css, boundary.index);
    statements.push({ prelude, body: block.body });
    cursor = block.end;
  }

  return statements;
}

function skipTrivia(css: string, start: number): number {
  let cursor = start;
  while (cursor < css.length) {
    if (/\s/.test(css[cursor])) {
      cursor += 1;
      continue;
    }
    if (css[cursor] === '/' && css[cursor + 1] === '*') {
      const end = css.indexOf('*/', cursor + 2);
      return end < 0 ? css.length : skipTrivia(css, end + 2);
    }
    break;
  }
  return cursor;
}

function findStatementBoundary(
  css: string,
  start: number,
): { index: number; kind: 'block' | 'semicolon' | 'eof' } {
  let quote = '';
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let cursor = start; cursor < css.length; cursor += 1) {
    const char = css[cursor];
    if (quote) {
      if (char === '\\') cursor += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '/' && css[cursor + 1] === '*') {
      const end = css.indexOf('*/', cursor + 2);
      if (end < 0) return { index: css.length, kind: 'eof' };
      cursor = end + 1;
      continue;
    }
    if (char === '(') parenDepth += 1;
    else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (char === '[') bracketDepth += 1;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (parenDepth === 0 && bracketDepth === 0 && char === '{') {
      return { index: cursor, kind: 'block' };
    } else if (parenDepth === 0 && bracketDepth === 0 && char === ';') {
      return { index: cursor, kind: 'semicolon' };
    }
  }

  return { index: css.length, kind: 'eof' };
}

function readBlock(css: string, openBrace: number): { body: string; end: number } {
  let depth = 1;
  let quote = '';

  for (let cursor = openBrace + 1; cursor < css.length; cursor += 1) {
    const char = css[cursor];
    if (quote) {
      if (char === '\\') cursor += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '/' && css[cursor + 1] === '*') {
      const end = css.indexOf('*/', cursor + 2);
      if (end < 0) return { body: css.slice(openBrace + 1), end: css.length };
      cursor = end + 1;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { body: css.slice(openBrace + 1, cursor), end: cursor + 1 };
      }
    }
  }

  return { body: css.slice(openBrace + 1), end: css.length };
}

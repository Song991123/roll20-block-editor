export interface CssImportReference {
  ref: string;
  statement: string;
  legacyGoogleFont: boolean;
}

const CSS_IMPORT_RE = /@import\s+(?:url\(\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^)]*))\s*\)|"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)')([^;]*);?/gi;

/**
 * Roll20 legacy sanitization accepts the documented, old Google Fonts form.
 * Keep this deliberately narrower than modern CSS font loading.
 */
export function isLegacyGoogleFontImport(statement: string): boolean {
  return /^@import url\((['"])https:\/\/fonts\.googleapis\.com\/css\?family=[^'"]+\1\)/i
    .test(statement.trim());
}

export function analyzeCssImportReferences(css: string): CssImportReference[] {
  const references: CssImportReference[] = [];
  for (const match of css.matchAll(CSS_IMPORT_RE)) {
    const ref = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? '').trim();
    if (!ref) continue;
    references.push({
      ref,
      statement: match[0],
      legacyGoogleFont: isLegacyGoogleFontImport(match[0]),
    });
  }
  return references;
}

export function hasUnsupportedLegacyCssImport(css: string): boolean {
  const importCount = css.match(/@import\b/gi)?.length ?? 0;
  if (importCount === 0) return false;
  const references = analyzeCssImportReferences(css);
  return references.length !== importCount || references.some((item) => !item.legacyGoogleFont);
}

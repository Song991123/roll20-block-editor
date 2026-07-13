export interface AssetReplacementEntry {
  from: string;
  to: string;
}

export interface AssetReplacementWarning {
  line: number;
  message: string;
}

export interface ParsedAssetReplacementMap {
  entries: AssetReplacementEntry[];
  warnings: AssetReplacementWarning[];
}

export interface AssetReplacementResult {
  html: string;
  css: string;
  replacements: number;
  warnings: AssetReplacementWarning[];
}

export interface AssetReplacementReadiness {
  entries: number;
  roll20ReadyTargets: number;
  localOnlyTargets: number;
  placeholderTargets: number;
  hasLocalOnlyTargets: boolean;
  hasPlaceholderTargets: boolean;
}

const USER_OWNED_URL_PLACEHOLDER = '<paste-user-owned-https-url-here>';

export function parseAssetReplacementMap(text: string): ParsedAssetReplacementMap {
  const entries: AssetReplacementEntry[] = [];
  const warnings: AssetReplacementWarning[] = [];
  const seen = new Set<string>();
  const lines = String(text ?? '').split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const parts = splitReplacementLine(trimmed);
    if (!parts) {
      warnings.push({
        line: lineNumber,
        message: 'Use "old URL => new URL" for each asset replacement.',
      });
      return;
    }

    const from = cleanReplacementValue(parts[0]);
    const to = cleanReplacementValue(parts[1]);
    if (!from || !to) {
      warnings.push({ line: lineNumber, message: 'Both old and new URLs are required.' });
      return;
    }
    if (from === to) {
      warnings.push({ line: lineNumber, message: 'Old and new URLs are identical.' });
      return;
    }
    if (isPlaceholderReplacementTarget(to)) {
      warnings.push({
        line: lineNumber,
        message: 'Replace the placeholder target with a user-owned http(s) URL before applying this map.',
      });
      return;
    }
    if (!isAllowedReplacementTarget(to)) {
      warnings.push({
        line: lineNumber,
        message: 'Replacement target must be http(s), protocol-relative, data:, or a relative Roll20-safe path.',
      });
      return;
    }
    if (seen.has(from)) {
      warnings.push({ line: lineNumber, message: 'Duplicate source URL; first mapping is used.' });
      return;
    }
    seen.add(from);
    entries.push({ from, to });
  });

  return { entries, warnings };
}

export function applyAssetReplacements(
  input: { html: string; css: string },
  mapText: string,
): AssetReplacementResult {
  const parsed = parseAssetReplacementMap(mapText);
  let html = input.html;
  let css = input.css;
  let replacements = 0;

  for (const entry of parsed.entries) {
    const htmlNext = replaceAllLiteral(html, entry.from, entry.to);
    const cssNext = replaceAllLiteral(css, entry.from, entry.to);
    replacements += countChanged(html, entry.from) + countChanged(css, entry.from);
    html = htmlNext;
    css = cssNext;
  }

  return { html, css, replacements, warnings: parsed.warnings };
}

export function summarizeAssetReplacementReadiness(mapText: string): AssetReplacementReadiness {
  const parsed = parseAssetReplacementMap(mapText);
  const placeholderTargets = countPlaceholderReplacementTargets(mapText);
  let roll20ReadyTargets = 0;
  let localOnlyTargets = 0;

  for (const entry of parsed.entries) {
    if (isRoll20ReadyReplacementTarget(entry.to)) roll20ReadyTargets += 1;
    else localOnlyTargets += 1;
  }

  return {
    entries: parsed.entries.length,
    roll20ReadyTargets,
    localOnlyTargets,
    placeholderTargets,
    hasLocalOnlyTargets: localOnlyTargets > 0,
    hasPlaceholderTargets: placeholderTargets > 0,
  };
}

function isRoll20ReadyReplacementTarget(value: string): boolean {
  return /^(?:https?:)?\/\//i.test(value);
}

function countPlaceholderReplacementTargets(text: string): number {
  let count = 0;
  const lines = String(text ?? '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = splitReplacementLine(trimmed);
    if (!parts) continue;
    if (isPlaceholderReplacementTarget(cleanReplacementValue(parts[1]))) count += 1;
  }
  return count;
}

function isPlaceholderReplacementTarget(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === USER_OWNED_URL_PLACEHOLDER ||
    normalized.includes('paste-user-owned') ||
    normalized.includes('user-owned-https-url')
  );
}

function splitReplacementLine(line: string): [string, string] | null {
  const arrow = line.indexOf('=>');
  if (arrow >= 0) return [line.slice(0, arrow), line.slice(arrow + 2)];
  const tab = line.indexOf('\t');
  if (tab >= 0) return [line.slice(0, tab), line.slice(tab + 1)];
  return null;
}

function cleanReplacementValue(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, '').replaceAll('&amp;', '&');
}

function isAllowedReplacementTarget(value: string): boolean {
  if (/^(?:https?:)?\/\//i.test(value)) return true;
  if (/^data:/i.test(value)) return true;
  if (/^(?:javascript|mailto|tel|blob):/i.test(value)) return false;
  return !value.startsWith('#');
}

function replaceAllLiteral(text: string, from: string, to: string): string {
  if (!from) return text;
  return text.split(from).join(to);
}

function countChanged(before: string, from: string): number {
  return countOccurrences(before, from);
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(needle, index)) >= 0) {
    count += 1;
    index += needle.length;
  }
  return count;
}

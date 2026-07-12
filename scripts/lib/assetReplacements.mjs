export function parseAssetReplacementMap(text) {
  const entries = [];
  const warnings = [];
  const seen = new Set();
  const lines = String(text ?? '').split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const parts = splitReplacementLine(trimmed);
    if (!parts) {
      warnings.push({ line: lineNumber, message: 'expected old URL => new URL' });
      return;
    }

    const from = cleanReplacementValue(parts[0]);
    const to = cleanReplacementValue(parts[1]);
    if (!from || !to) {
      warnings.push({ line: lineNumber, message: 'both old and new URLs are required' });
      return;
    }
    if (from === to) {
      warnings.push({ line: lineNumber, message: 'old and new URLs are identical' });
      return;
    }
    if (!isAllowedReplacementTarget(to)) {
      warnings.push({ line: lineNumber, message: 'replacement target is not Roll20-safe' });
      return;
    }
    if (seen.has(from)) {
      warnings.push({ line: lineNumber, message: 'duplicate source URL; first mapping is used' });
      return;
    }
    seen.add(from);
    entries.push({ line: lineNumber, from, to });
  });

  return { entries, warnings };
}

export function applyAssetReplacements(input, mapText) {
  const parsed = parseAssetReplacementMap(mapText);
  let html = String(input?.html ?? '');
  let css = String(input?.css ?? '');
  let replacements = 0;

  for (const entry of parsed.entries) {
    replacements += countOccurrences(html, entry.from) + countOccurrences(css, entry.from);
    html = replaceAllLiteral(html, entry.from, entry.to);
    css = replaceAllLiteral(css, entry.from, entry.to);
  }

  return { html, css, replacements, entries: parsed.entries, warnings: parsed.warnings };
}

function splitReplacementLine(line) {
  const arrow = line.indexOf('=>');
  if (arrow >= 0) return [line.slice(0, arrow), line.slice(arrow + 2)];
  const tab = line.indexOf('\t');
  if (tab >= 0) return [line.slice(0, tab), line.slice(tab + 1)];
  return null;
}

function cleanReplacementValue(value) {
  return String(value ?? '').trim().replace(/^['"]|['"]$/g, '').replaceAll('&amp;', '&');
}

function isAllowedReplacementTarget(value) {
  if (/^(?:https?:)?\/\//i.test(value)) return true;
  if (/^data:/i.test(value)) return true;
  if (/^(?:javascript|mailto|tel|blob):/i.test(value)) return false;
  return !value.startsWith('#');
}

function replaceAllLiteral(text, from, to) {
  if (!from) return text;
  return text.split(from).join(to);
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(needle, index)) >= 0) {
    count += 1;
    index += needle.length;
  }
  return count;
}

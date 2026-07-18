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
    if (isPlaceholderReplacementTarget(to)) {
      warnings.push({ line: lineNumber, message: 'replace the placeholder target with a user-owned http(s) URL before applying this map' });
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

export function summarizeAssetReplacementReadiness(mapText) {
  const parsed = parseAssetReplacementMap(mapText);
  const placeholderTargets = countPlaceholderReplacementTargets(mapText);
  let roll20ReadyTargets = 0;
  let localOnlyTargets = 0;
  let riskyRoll20Targets = 0;

  for (const entry of parsed.entries) {
    if (isRoll20ReadyReplacementTarget(entry.to)) {
      roll20ReadyTargets += 1;
      if (isRiskyRoll20ReplacementTarget(entry.to)) riskyRoll20Targets += 1;
    } else {
      localOnlyTargets += 1;
    }
  }

  return {
    entries: parsed.entries.length,
    roll20ReadyTargets,
    localOnlyTargets,
    riskyRoll20Targets,
    placeholderTargets,
    hasLocalOnlyTargets: localOnlyTargets > 0,
    hasRiskyRoll20Targets: riskyRoll20Targets > 0,
    hasPlaceholderTargets: placeholderTargets > 0,
  };
}

function splitReplacementLine(line) {
  const arrow = line.indexOf('=>');
  if (arrow >= 0) return [line.slice(0, arrow), line.slice(arrow + 2)];
  const tab = line.indexOf('\t');
  if (tab >= 0) return [line.slice(0, tab), line.slice(tab + 1)];
  return null;
}

function cleanReplacementValue(value) {
  return stripInlineReplacementNote(
    String(value ?? '').trim().replace(/^['"]|['"]$/g, '').replaceAll('&amp;', '&'),
  );
}

function stripInlineReplacementNote(value) {
  return value.replace(/\s+#\s+.*$/, '').trim();
}

function isAllowedReplacementTarget(value) {
  if (/^(?:https?:)?\/\//i.test(value)) return true;
  if (/^data:/i.test(value)) return true;
  if (/^(?:javascript|mailto|tel|blob):/i.test(value)) return false;
  return !value.startsWith('#');
}

function isRoll20ReadyReplacementTarget(value) {
  return /^https?:\/\//i.test(value);
}

function isRiskyRoll20ReplacementTarget(value) {
  const url = parseHttpUrl(value);
  if (!url) return false;
  const host = url.hostname.toLowerCase();
  if (host === 'imgsrv.roll20.net') return true;
  if ((host === 'imgur.com' || host === 'www.imgur.com') && !isImagePath(url.pathname)) return true;
  return false;
}

function parseHttpUrl(value) {
  try {
    if (/^https?:\/\//i.test(value)) return new URL(value);
  } catch {}
  return null;
}

function isImagePath(pathname) {
  return /\.(?:png|jpe?g|gif|webp)(?:$|[?#])/i.test(pathname);
}

function countPlaceholderReplacementTargets(text) {
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

function isPlaceholderReplacementTarget(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return (
    normalized === '<paste-user-owned-https-url-here>' ||
    normalized.includes('paste-user-owned') ||
    normalized.includes('user-owned-https-url')
  );
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

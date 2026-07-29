import type { EmitOutput } from './types';

export interface PreparedPayload extends EmitOutput {
  removedInternalBlockIds: number;
}

/**
 * Export-only cleanup for files that will be uploaded to Roll20.
 *
 * Preview/edit still need `data-r20-block-id` for selection, dragging, and
 * sync. Roll20 itself does not need those internal editor ids, so remove them
 * only at the final export boundary.
 */
export function prepareRoll20Payload(emit: EmitOutput): PreparedPayload {
  const htmlClean = stripInternalBlockIds(emit.html);
  return {
    ...emit,
    html: htmlClean.html,
    translation: normalizeTranslationForRoll20(emit.translation),
    removedInternalBlockIds: htmlClean.removed,
  };
}

export function stripInternalBlockIds(html: string): { html: string; removed: number } {
  let removed = 0;
  const cleaned = String(html ?? '').replace(/\sdata-r20-block-id=(?:"[^"]*"|'[^']*')/g, () => {
    removed += 1;
    return '';
  });
  return { html: cleaned, removed };
}

export function normalizeTranslationForRoll20(translation: string): string {
  const text = String(translation ?? '').trim();
  if (!text) return '{}';
  try {
    const normalized = normalizeFlatJsonTranslation(JSON.parse(text));
    if (normalized !== null) return normalized;
  } catch {
    // Fall through to the internal comment format produced by r20_locale_value.
  }

  const entries: Record<string, string> = {};
  const re =
    /<!--\s*i18n(?:\[[^\]]+\])?\s+("(?:\\.|[^"\\])*")\s*:\s*("(?:\\.|[^"\\])*")\s*-->/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    try {
      entries[JSON.parse(match[1])] = JSON.parse(match[2]);
    } catch {
      // Keep scanning; malformed lines should not prevent valid entries from exporting.
    }
  }

  if (Object.keys(entries).length === 0) return '{}';
  return `${JSON.stringify(entries, null, 2)}\n`;
}

/**
 * Roll20's translation.json is a flat string map. JSON validity alone is not
 * enough: arrays, nested locale objects, and object-valued entries are valid
 * JSON but are not valid Roll20 translation payloads.
 */
function normalizeFlatJsonTranslation(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') entries[key] = entry;
    else if (typeof entry === 'number' || typeof entry === 'boolean') entries[key] = String(entry);
  }
  return `${JSON.stringify(entries, null, 2)}\n`;
}

/**
 * Read either Roll20 translation.json or the editor's locale-block comment
 * format. Preview, edit, workers, chat, and export must resolve the same map.
 */
export function parseTranslationMap(translation: string | undefined): Record<string, string> {
  const normalized = normalizeTranslationForRoll20(translation ?? '');
  try {
    const parsed: unknown = JSON.parse(normalized);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null) continue;
      entries[key] = String(value);
    }
    return entries;
  } catch {
    return {};
  }
}

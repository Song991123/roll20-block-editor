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
    JSON.parse(text);
    return text;
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

  if (Object.keys(entries).length === 0) return text;
  return `${JSON.stringify(entries, null, 2)}\n`;
}

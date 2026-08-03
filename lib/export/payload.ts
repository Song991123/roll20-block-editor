import type { EmitOutput } from './types';
import { ZIP_FILES } from './types';
import {
  sanitizeForRoll20Legacy,
  type SanitizeWarning,
} from '../emit/sanitize';
import { isRoll20WorkerScript, readScriptType } from '../import/worker_source';

export interface PreparedPayload extends EmitOutput {
  removedInternalBlockIds: number;
  removedUnsupportedScripts: number;
}

export interface Roll20UploadFile {
  name: string;
  content: string;
  mimeType: string;
}

export interface PreparedRoll20Upload extends PreparedPayload {
  legacyWarnings: SanitizeWarning[];
  files: Roll20UploadFile[];
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
  const scriptsClean = stripUnsupportedPageScripts(htmlClean.html);
  const extraFiles = { ...(emit.extraFiles ?? {}) };
  if (scriptsClean.removed > 0) {
    extraFiles[ZIP_FILES.UNSUPPORTED_SCRIPTS] = scriptsClean.source;
  }
  return {
    ...emit,
    html: scriptsClean.html,
    translation: normalizeTranslationForRoll20(emit.translation),
    extraFiles: Object.keys(extraFiles).length > 0 ? extraFiles : undefined,
    removedInternalBlockIds: htmlClean.removed,
    removedUnsupportedScripts: scriptsClean.removed,
  };
}

/**
 * Build the exact three text files that the Roll20 sheet settings form reads.
 * ZIP export and manual Sandbox upload must share this boundary so a user does
 * not validate one payload and upload a subtly different one.
 */
export function prepareRoll20UploadFiles(
  emit: EmitOutput,
  options: { legacy?: boolean } = {},
): PreparedRoll20Upload {
  const payload = prepareRoll20Payload(emit);
  const legacyResult = options.legacy && payload.css
    ? sanitizeForRoll20Legacy(payload.css)
    : { sanitized: payload.css, warnings: [] as SanitizeWarning[] };
  const prepared = {
    ...payload,
    css: legacyResult.sanitized,
    translation: payload.translation.trim() || '{}',
    legacyWarnings: legacyResult.warnings,
  };

  return {
    ...prepared,
    files: [
      {
        name: ZIP_FILES.HTML,
        content: prepared.html,
        mimeType: 'text/html;charset=utf-8',
      },
      {
        name: ZIP_FILES.CSS,
        content: prepared.css,
        mimeType: 'text/css;charset=utf-8',
      },
      {
        name: ZIP_FILES.TRANSLATION,
        content: prepared.translation,
        mimeType: 'application/json;charset=utf-8',
      },
    ],
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

/**
 * Roll20 removes every script tag except Sheet Workers. Keep authored source
 * in the editor, but exclude unsupported scripts from the upload payload and
 * return their exact tags for a non-executable ZIP backup.
 */
export function stripUnsupportedPageScripts(
  html: string,
): { html: string; removed: number; source: string } {
  let removed = 0;
  const sources: string[] = [];
  const cleaned = String(html ?? '').replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    (full, rawAttrs: string, body: string) => {
      if (isRoll20WorkerScript(readScriptType(rawAttrs), body)) return full;
      removed += 1;
      sources.push(full);
      return '';
    },
  );
  return {
    html: cleaned,
    removed,
    source: sources.join('\n\n'),
  };
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

  if (Object.keys(entries).length > 0) return `${JSON.stringify(entries, null, 2)}\n`;

  // Some older translation files contain unescaped quotes inside values.
  // Recover the flat key/value boundary without guessing sheet-specific keys,
  // then emit valid JSON for Roll20.
  const looseEntries = parseLooseFlatJsonTranslation(text);
  if (Object.keys(looseEntries).length === 0) return '{}';
  return `${JSON.stringify(looseEntries, null, 2)}\n`;
}

function parseLooseFlatJsonTranslation(text: string): Record<string, string> {
  const entries: Record<string, string> = {};
  let cursor = 0;

  while (cursor < text.length) {
    while (cursor < text.length && /[\s,{]/.test(text[cursor])) cursor++;
    if (text[cursor] !== '"') {
      cursor++;
      continue;
    }

    const key = readQuotedToken(text, cursor);
    if (!key) {
      cursor++;
      continue;
    }
    cursor = skipTranslationWhitespace(text, key.end);
    if (text[cursor] !== ':') {
      cursor++;
      continue;
    }
    cursor = skipTranslationWhitespace(text, cursor + 1);
    if (text[cursor] !== '"') {
      cursor++;
      continue;
    }

    const value = readLooseQuotedValue(text, cursor);
    if (!value) break;
    entries[key.value] = value.value;
    cursor = value.end;
  }

  return entries;
}

function skipTranslationWhitespace(text: string, start: number): number {
  let cursor = start;
  while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
  return cursor;
}

function readQuotedToken(
  text: string,
  start: number,
): { value: string; end: number } | null {
  let cursor = start + 1;
  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (text[cursor] === '"') {
      try {
        return { value: JSON.parse(text.slice(start, cursor + 1)), end: cursor + 1 };
      } catch {
        return null;
      }
    }
    cursor++;
  }
  return null;
}

function readLooseQuotedValue(
  text: string,
  start: number,
): { value: string; end: number } | null {
  let cursor = start + 1;
  while (cursor < text.length) {
    if (text[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (text[cursor] === '"') {
      const after = skipTranslationWhitespace(text, cursor + 1);
      if (after >= text.length || text[after] === ',' || text[after] === '}') {
        const raw = text.slice(start, cursor + 1);
        try {
          return { value: JSON.parse(raw), end: cursor + 1 };
        } catch {
          return { value: decodeLooseQuotedValue(raw), end: cursor + 1 };
        }
      }
    }
    cursor++;
  }
  return null;
}

function decodeLooseQuotedValue(raw: string): string {
  const inner = raw.slice(1, -1);
  let escaped = '';
  for (let index = 0; index < inner.length; index++) {
    const char = inner[index];
    if (char === '"') {
      let slashCount = 0;
      for (let previous = index - 1; previous >= 0 && inner[previous] === '\\'; previous--) {
        slashCount++;
      }
      if (slashCount % 2 === 0) escaped += '\\';
    }
    escaped += char;
  }
  try {
    return JSON.parse(`"${escaped}"`);
  } catch {
    return inner.replace(/\\"/g, '"');
  }
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

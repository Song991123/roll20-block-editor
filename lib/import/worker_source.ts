const ROLL20_WORKER_API =
  /\b(?:on|getAttrs|setAttrs|getSectionIDs|generateRowID|removeRepeatingRow|setDefaultToken|getTranslationByKey|getTranslationByLang|getTranslationLanguage|getCompendiumPage|getCompendiumEntries)\s*\(/;

/**
 * Decide whether an untyped script is plausibly a legacy Roll20 worker.
 *
 * Roll20 worker scripts should be marked `type="text/worker"`. Some older
 * sheets omit the type, so keep those that visibly use Roll20 worker APIs in
 * the worker workspace. Ordinary page JavaScript belongs in the separate,
 * inert source workspace and never runs in local preview or Roll20 output.
 */
export function isLikelyRoll20WorkerSource(body: string): boolean {
  return ROLL20_WORKER_API.test(stripNonCodeForWorkerDetection(String(body ?? '')));
}

/**
 * Remove strings and comments before the legacy worker heuristic runs.
 *
 * Some older sheets omit `type="text/worker"`, so we still need a small
 * source-based fallback. A raw regex over the original body, however, can
 * mistake documentation text such as `"getAttrs("` for a Roll20 API call and
 * move an ordinary page script into the worker workspace. Preserve newlines
 * and code characters while blanking literals/comments so the existing API
 * regex remains cheap and deterministic without executing JavaScript.
 */
function stripNonCodeForWorkerDetection(source: string): string {
  let out = '';
  let i = 0;
  let quote = '';

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1] ?? '';

    if (quote) {
      if (c === '\\') {
        out += '  ';
        i += 2;
        continue;
      }
      if (c === quote) quote = '';
      out += c === '\n' || c === '\r' ? c : ' ';
      i += 1;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += ' ';
      i += 1;
      continue;
    }

    if (c === '/' && next === '/') {
      out += '  ';
      i += 2;
      while (i < source.length && source[i] !== '\n' && source[i] !== '\r') {
        out += ' ';
        i += 1;
      }
      continue;
    }

    if (c === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          out += '  ';
          i += 2;
          break;
        }
        out += source[i] === '\n' || source[i] === '\r' ? source[i] : ' ';
        i += 1;
      }
      continue;
    }

    out += c;
    i += 1;
  }

  return out;
}

export function isExplicitRoll20WorkerType(type: string): boolean {
  return String(type ?? '').trim().toLowerCase() === 'text/worker';
}

export function isRoll20WorkerScript(type: string, body: string): boolean {
  const normalizedType = String(type ?? '').trim().toLowerCase();
  return isExplicitRoll20WorkerType(normalizedType)
    || (normalizedType === '' && isLikelyRoll20WorkerSource(body));
}

export type Roll20ScriptKind = 'worker' | 'page' | 'data';

export interface Roll20ScriptSource {
  attrs: string;
  type: string;
  body: string;
  kind: Roll20ScriptKind;
}

/**
 * Classify authored script tags once for import, preview, and JS workspace
 * work. Ordinary page scripts remain inert in the local preview;
 * this helper only describes the source and does not execute it.
 */
export function classifyRoll20Script(type: string, body: string): Roll20ScriptKind {
  if (isRoll20WorkerScript(type, body)) return 'worker';
  return isExecutablePageScript(type) ? 'page' : 'data';
}

export function isOrdinaryPageScript(type: string, body: string): boolean {
  return classifyRoll20Script(type, body) === 'page';
}

/**
 * HTML also uses script tags as inert data containers. They must stay in the
 * HTML workspace so their original position and MIME type survive import and
 * export; only executable page scripts belong in the JS workspace.
 */
export function isExecutablePageScript(type: string): boolean {
  const normalized = String(type ?? '')
    .trim()
    .toLowerCase()
    .split(';', 1)[0]
    .trim();
  if (!normalized) return true;
  if (normalized === 'module' || normalized === 'text/module') return true;
  if (normalized === 'text/javascript' || normalized === 'application/javascript') return true;
  if (normalized === 'text/ecmascript' || normalized === 'application/ecmascript') return true;
  return /(?:^|[+/])(?:java|ecma)script$/.test(normalized);
}

/** Extract script tags without discarding attributes needed by a future JS workspace. */
export function extractRoll20ScriptSources(html: string): Roll20ScriptSource[] {
  const sources: Roll20ScriptSource[] = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(String(html ?? '')))) {
    const attrs = match[1] ?? '';
    const type = readScriptType(attrs);
    const body = match[2] ?? '';
    sources.push({
      attrs,
      type,
      body,
      kind: classifyRoll20Script(type, body),
    });
  }
  return sources;
}

export function readScriptType(attrs: string): string {
  const match = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))/i.exec(attrs);
  return String(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim().toLowerCase();
}

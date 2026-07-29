const ROLL20_WORKER_API =
  /\b(?:on|getAttrs|setAttrs|getSectionIDs|generateRowID|removeRepeatingRow|setDefaultToken|getTranslationByKey|getTranslationByLang|getTranslationLanguage|getCompendiumPage|getCompendiumEntries)\s*\(/;

/**
 * Decide whether an untyped script is plausibly a legacy Roll20 worker.
 *
 * Roll20 worker scripts should be marked `type="text/worker"`. Some older
 * sheets omit the type, so keep those that visibly use Roll20 worker APIs in
 * the worker workspace. Ordinary page JavaScript remains an HTML raw block
 * until a dedicated JS workspace can represent it.
 */
export function isLikelyRoll20WorkerSource(body: string): boolean {
  const source = String(body ?? '');
  return ROLL20_WORKER_API.test(source);
}

export function isExplicitRoll20WorkerType(type: string): boolean {
  return String(type ?? '').trim().toLowerCase() === 'text/worker';
}

export function isRoll20WorkerScript(type: string, body: string): boolean {
  const normalizedType = String(type ?? '').trim().toLowerCase();
  return isExplicitRoll20WorkerType(normalizedType)
    || (normalizedType === '' && isLikelyRoll20WorkerSource(body));
}

export type Roll20ScriptKind = 'worker' | 'page';

export interface Roll20ScriptSource {
  attrs: string;
  type: string;
  body: string;
  kind: Roll20ScriptKind;
}

/**
 * Classify authored script tags once for import, preview, and future JS
 * workspace work. Ordinary page scripts remain inert in the local preview;
 * this helper only describes the source and does not execute it.
 */
export function classifyRoll20Script(type: string, body: string): Roll20ScriptKind {
  return isRoll20WorkerScript(type, body) ? 'worker' : 'page';
}

export function isOrdinaryPageScript(type: string, body: string): boolean {
  return classifyRoll20Script(type, body) === 'page';
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

function readScriptType(attrs: string): string {
  const match = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))/i.exec(attrs);
  return String(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim().toLowerCase();
}

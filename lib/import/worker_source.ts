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

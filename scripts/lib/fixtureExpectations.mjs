export function fixtureExpectationFailures(
  summary,
  expected,
  translations = summary,
  label = '',
) {
  if (!expected) return [];
  const failures = [];
  const prefix = label ? `${label} ` : '';
  const checked = new Set(summary?.checkedControlNames ?? []);
  for (const name of expected.checkedControlNames ?? []) {
    if (!checked.has(name)) failures.push(`${prefix}checked control missing: ${name}`);
  }
  for (const [name, value] of Object.entries(expected.selectedControlValues ?? {})) {
    if (summary?.selectedControlValues?.[name] !== value) {
      failures.push(
        `${prefix}selected value ${name}=${summary?.selectedControlValues?.[name] ?? ''} != ${value}`,
      );
    }
  }
  for (const [tag, minimum] of Object.entries(expected.minimumTagCounts ?? {})) {
    if ((summary?.tagCounts?.[tag] ?? 0) < minimum) {
      failures.push(`${prefix}tag ${tag} count ${summary?.tagCounts?.[tag] ?? 0} < ${minimum}`);
    }
  }
  for (const [tag, maximum] of Object.entries(expected.maximumTagCounts ?? {})) {
    if ((summary?.tagCounts?.[tag] ?? 0) > maximum) {
      failures.push(`${prefix}tag ${tag} count ${summary?.tagCounts?.[tag] ?? 0} > ${maximum}`);
    }
  }
  if (
    Number.isFinite(expected.ordinaryScriptCount)
    && summary?.ordinaryScriptCount !== expected.ordinaryScriptCount
  ) {
    failures.push(
      `${prefix}ordinary script count ${summary?.ordinaryScriptCount ?? 0} != ${expected.ordinaryScriptCount}`,
    );
  }
  const visibleKeys = new Set(translations?.visibleKeys ?? translations?.visibleI18nKeys ?? []);
  const hiddenKeys = new Set(translations?.hiddenKeys ?? translations?.hiddenI18nKeys ?? []);
  for (const key of expected.visibleI18nKeys ?? []) {
    if (!visibleKeys.has(key)) failures.push(`${prefix}visible translation missing: ${key}`);
  }
  for (const key of expected.hiddenI18nKeys ?? []) {
    if (!hiddenKeys.has(key)) failures.push(`${prefix}hidden translation missing: ${key}`);
  }
  for (const key of expected.absentI18nKeys ?? []) {
    if (visibleKeys.has(key) || hiddenKeys.has(key)) failures.push(`${prefix}translation still present: ${key}`);
  }
  for (const fragment of expected.visibleTextFragments ?? []) {
    if (!String(summary?.visibleText ?? '').includes(fragment)) {
      failures.push(`${prefix}visible text missing: ${fragment}`);
    }
  }
  return failures;
}

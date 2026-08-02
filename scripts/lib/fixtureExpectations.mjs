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
  for (const [name, values] of Object.entries(expected.checkedControlValues ?? {})) {
    const actual = summary?.checkedControlValues?.[name] ?? [];
    if (JSON.stringify(actual) !== JSON.stringify(values)) {
      failures.push(`${prefix}checked values ${name}=${JSON.stringify(actual)} != ${JSON.stringify(values)}`);
    }
  }
  for (const [name, value] of Object.entries(expected.selectedControlValues ?? {})) {
    if (summary?.selectedControlValues?.[name] !== value) {
      failures.push(
        `${prefix}selected value ${name}=${summary?.selectedControlValues?.[name] ?? ''} != ${value}`,
      );
    }
  }
  for (const [name, values] of Object.entries(expected.selectedOptionValues ?? {})) {
    const actual = summary?.selectedOptionValues?.[name] ?? [];
    if (JSON.stringify(actual) !== JSON.stringify(values)) {
      failures.push(`${prefix}selected options ${name}=${JSON.stringify(actual)} != ${JSON.stringify(values)}`);
    }
  }
  for (const key of ['optgroupLabels', 'disabledOptgroupLabels']) {
    if (!(key in expected)) continue;
    const actual = summary?.[key] ?? [];
    if (JSON.stringify(actual) !== JSON.stringify(expected[key])) {
      failures.push(`${prefix}${key}=${JSON.stringify(actual)} != ${JSON.stringify(expected[key])}`);
    }
  }
  for (const [name, values] of Object.entries(expected.dataAttributeValues ?? {})) {
    const actual = summary?.dataAttributeValues?.[name] ?? [];
    if (JSON.stringify(actual) !== JSON.stringify(values)) {
      failures.push(`${prefix}data attribute ${name}=${JSON.stringify(actual)} != ${JSON.stringify(values)}`);
    }
  }
  for (const [name, value] of Object.entries(expected.controlValues ?? {})) {
    if (summary?.controlValues?.[name] !== value) {
      failures.push(`${prefix}control value ${name}=${summary?.controlValues?.[name] ?? ''} != ${value}`);
    }
  }
  const disabled = new Set(summary?.disabledControlNames ?? []);
  for (const name of expected.disabledControlNames ?? []) {
    if (!disabled.has(name)) failures.push(`${prefix}disabled control missing: ${name}`);
  }
  const readOnly = new Set(summary?.readOnlyControlNames ?? []);
  for (const name of expected.readOnlyControlNames ?? []) {
    if (!readOnly.has(name)) failures.push(`${prefix}readonly control missing: ${name}`);
  }
  const multiple = new Set(summary?.multipleControlNames ?? []);
  for (const name of expected.multipleControlNames ?? []) {
    if (!multiple.has(name)) failures.push(`${prefix}multiple control missing: ${name}`);
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
  if (
    Number.isFinite(expected.nonControlAttrNameCount)
    && summary?.nonControlAttrNameCount !== expected.nonControlAttrNameCount
  ) {
    failures.push(
      `${prefix}non-control attr name count ${summary?.nonControlAttrNameCount ?? 0} != ${expected.nonControlAttrNameCount}`,
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

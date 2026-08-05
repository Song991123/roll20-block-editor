export const CSS_PSEUDO_CLASS_NAMES = Object.freeze([
  'hover',
  'focus',
  'active',
  'visited',
  'link',
  'checked',
  'disabled',
  'enabled',
  'required',
  'optional',
  'valid',
  'invalid',
  'first-child',
  'last-child',
  'only-child',
  'first-of-type',
  'last-of-type',
  'only-of-type',
  'nth-child',
  'nth-last-child',
  'nth-of-type',
  'nth-last-of-type',
  'not',
  'is',
  'where',
  'has',
  'empty',
  'root',
  'target',
] as const);

export const CSS_PSEUDO_CLASS_SET: ReadonlySet<string> = new Set(
  CSS_PSEUDO_CLASS_NAMES,
);

export const CSS_PSEUDO_CLASS_OPTIONS: Array<[string, string]> =
  CSS_PSEUDO_CLASS_NAMES.map((name): [string, string] => [name, name]);

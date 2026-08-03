export function normalizeAuthoredClassTokens(value: unknown): string {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

export function mergeAuthoredClassTokens(
  ...values: Array<unknown>
): string {
  return values
    .map(normalizeAuthoredClassTokens)
    .filter(Boolean)
    .join(' ');
}

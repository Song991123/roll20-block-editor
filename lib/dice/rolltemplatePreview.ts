import type { RolltemplateFieldResult, RolltemplateResult } from './executor';

const MUSTACHE_TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function collectRolltemplatePreviewFields(body: string): RolltemplateFieldResult[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = MUSTACHE_TOKEN.exec(String(body ?? '')))) {
    const token = String(match[1] ?? '').trim();
    if (!token || /^[#\/^]/.test(token) || token.endsWith(')')) continue;
    if (!/^(?:computed::)?[A-Za-z_][A-Za-z0-9_-]*$/.test(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    keys.push(token);
  }

  return keys.map((key) => {
    const text = previewValueFor(key);
    return { key, raw: text, detail: null, text };
  });
}

export function buildRolltemplatePreviewResult(
  body: string,
  templateName: string,
): RolltemplateResult {
  return {
    kind: 'rolltemplate',
    templateName: templateName || 'default',
    fields: collectRolltemplatePreviewFields(body),
    anyCrit: false,
    anyFumble: false,
  };
}

function previewValueFor(key: string): string {
  const normalized = key.replace(/^computed::/, '').toLowerCase();
  if (normalized === 'name' || normalized === 'character_name' || normalized === 'title') {
    return '예시 이름';
  }
  if (/(?:roll|result|total|value|damage|score|dice)/.test(normalized)) return '12';
  return `예시 ${key.replace(/^computed::/, '')}`;
}

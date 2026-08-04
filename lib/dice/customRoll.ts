import type {
  RollDetail,
  RollResult,
  RolltemplateFieldResult,
} from './executor';

export interface SheetWorkerRollEntry {
  result: number;
  dice: number[];
  expression: string;
  rolls: Array<{
    dice: number;
    sides: number;
    results: number[];
  }>;
}

export interface SheetWorkerRollResult {
  rollId: string;
  results: Record<string, SheetWorkerRollEntry>;
}

export const ROLL20_CHAT_ACTION_EVENT = 'r20:chat-action';

export interface Roll20ChatActionDetail {
  actionName: string;
  originalRollId?: string;
}

export type ComputedRollResults = Record<string, string | number>;

export function normalizeRoll20ActionName(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/^act_/, '');
  return /^[A-Za-z0-9_-]{1,256}$/.test(normalized) ? normalized : '';
}

function workerEntry(detail: RollDetail): SheetWorkerRollEntry {
  const expression = detail.expression.startsWith('[[') && detail.expression.endsWith(']]')
    ? detail.expression.slice(2, -2)
    : detail.expression;
  return {
    result: detail.total,
    dice: detail.dice.flatMap((group) => group.raw),
    expression,
    rolls: detail.dice.map((group) => ({
      dice: group.count,
      sides: group.sides,
      results: [...group.raw],
    })),
  };
}

export function toSheetWorkerRollResult(
  rollId: string,
  result: RollResult,
): SheetWorkerRollResult {
  const results: Record<string, SheetWorkerRollEntry> = {};
  if (result.kind === 'rolltemplate') {
    result.fields.forEach((field) => {
      if (field.detail) results[field.key] = workerEntry(field.detail);
    });
  } else if (result.kind === 'expr') {
    results.result = workerEntry(result);
  }
  return { rollId, results };
}

export function normalizeComputedRollResults(value: unknown): ComputedRollResults {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: ComputedRollResults = {};
  Object.entries(value as Record<string, unknown>)
    .slice(0, 128)
    .forEach(([rawKey, rawValue]) => {
      const key = rawKey.trim().slice(0, 128);
      if (!key) return;
      if (typeof rawValue === 'string') {
        out[key] = rawValue;
      } else if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
        out[key] = rawValue;
      }
    });
  return out;
}

export function withComputedRollResults(
  result: RollResult,
  computed: ComputedRollResults,
): RollResult {
  if (result.kind !== 'rolltemplate' || Object.keys(computed).length === 0) return result;
  const originals = new Map<string, RolltemplateFieldResult>();
  result.fields.forEach((field) => originals.set(field.key, field));
  const computedKeys = new Set(Object.keys(computed).map((key) => `computed::${key}`));
  const fields = result.fields.filter((field) => !computedKeys.has(field.key));
  Object.entries(computed).forEach(([key, value]) => {
    const source = originals.get(key);
    fields.push({
      key: `computed::${key}`,
      raw: String(value),
      detail: source?.detail ?? null,
      text: String(value),
    });
  });
  return {
    ...result,
    fields,
  };
}

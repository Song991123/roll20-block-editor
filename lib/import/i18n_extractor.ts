/**
 * i18n extractor — translation.json / flat key=value 텍스트 → r20_locale_value 블록.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3.1 ID 5 (i18n 카테고리)
 *   - lib/blocks/i18n.ts (r20_locale_value emit format)
 *
 * 두 형식 자동 감지:
 *   1) JSON — Roll20 표준 `translation.json` { "key": "value", ... }
 *   2) flat — `key=value` 또는 `key: value` 줄 텍스트
 *
 * 언어 코드 자동 감지: 입력 텍스트 첫줄에 `# lang: ko` 주석 또는 파일명 hint
 * 가 없으면 default `ko`. (Public 모듈이므로 사용자가 명시 옵션으로 override.)
 *
 * 시스템 specific 토큰 0.
 */

import type { MatchedBlock } from './block_matcher';

export interface I18nCtx {
  keys: number;
  warnings: Array<{ code: string; message: string }>;
}

export interface I18nOptions {
  /** 기본 언어 코드 — `ko` / `en` / `ja` / `zh`. */
  lang?: string;
}

export function newI18nCtx(): I18nCtx {
  return { keys: 0, warnings: [] };
}

const LANG_CODES = new Set(['ko', 'en', 'ja', 'zh']);

export function parseI18n(
  text: string,
  ctx: I18nCtx,
  opts: I18nOptions = {},
): MatchedBlock[] {
  const lang = (opts.lang && LANG_CODES.has(opts.lang)) ? opts.lang : detectLang(text) || 'ko';
  const parsed = tryJson(text) ?? parseFlat(text);
  if (!parsed) {
    if (text.trim()) {
      ctx.warnings.push({
        code: 'i18n_unparseable',
        message: '번역 데이터 형식 인식 실패 — 빈 워크스페이스로 둠',
      });
    }
    return [];
  }
  const out: MatchedBlock[] = [];
  for (const [key, value] of parsed) {
    out.push({
      blockType: 'r20_locale_value',
      fields: { LANG: lang, KEY: key, VALUE: value },
      children: {},
    });
    ctx.keys++;
  }
  return out;
}

// ---------------------------------------------------------------------------

function detectLang(text: string): string | null {
  const head = text.slice(0, 200);
  const m = /(?:#|\/\/)\s*lang\s*[:=]\s*([a-z]{2})/i.exec(head);
  if (m && LANG_CODES.has(m[1].toLowerCase())) return m[1].toLowerCase();
  return null;
}

function tryJson(text: string): Array<[string, string]> | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    const out: Array<[string, string]> = [];
    walkJson('', obj, out);
    return out;
  } catch {
    return null;
  }
}

function walkJson(
  prefix: string,
  obj: unknown,
  out: Array<[string, string]>,
): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    out.push([prefix, String(obj)]);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => walkJson(prefix ? `${prefix}.${i}` : String(i), v, out));
    return;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      walkJson(next, v, out);
    }
  }
  return;
}

function parseFlat(text: string): Array<[string, string]> | null {
  const out: Array<[string, string]> = [];
  const lines = text.split(/\r?\n/);
  let any = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('//')) continue;
    // `key=value` 또는 `key: value`
    const eqIdx = line.indexOf('=');
    const colIdx = line.indexOf(':');
    let sepIdx = -1;
    if (eqIdx >= 0 && (colIdx < 0 || eqIdx < colIdx)) sepIdx = eqIdx;
    else if (colIdx >= 0) sepIdx = colIdx;
    if (sepIdx < 0) continue;
    const key = line.slice(0, sepIdx).trim().replace(/^"(.*)"$/, '$1');
    let value = line.slice(sepIdx + 1).trim();
    // trailing comma + JSON-like quote 제거
    value = value.replace(/,$/, '').replace(/^"(.*)"$/, '$1');
    if (!key) continue;
    out.push([key, value]);
    any = true;
  }
  return any ? out : null;
}

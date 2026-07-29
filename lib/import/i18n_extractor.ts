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
  /** 기본 언어 코드 — BCP-47 형태의 locale (`ko`, `en`, `fr-FR` 등). */
  lang?: string;
}

export function newI18nCtx(): I18nCtx {
  return { keys: 0, warnings: [] };
}

/**
 * Custom Roll20 sheets are not limited to the four locales exposed by the
 * first editor prototype. Keep the internal comment format safe, but accept
 * any BCP-47-like tag so a locale is not silently dropped during import.
 */
const LANGUAGE_TAG_RE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;

function isLanguageTag(value: string): boolean {
  return LANGUAGE_TAG_RE.test(String(value ?? '').trim());
}

export function parseI18n(
  text: string,
  ctx: I18nCtx,
  opts: I18nOptions = {},
): MatchedBlock[] {
  const requestedLang = String(opts.lang ?? '').trim();
  const fallbackLang = isLanguageTag(requestedLang)
    ? requestedLang
    : detectLang(text) || 'ko';
  // Stage 2 fix — i18n format round-trip parity. Emit pipeline 의
  //   r20_locale_value generator 는 `<!-- i18n[lang] "key": "value" -->`
  //   주석 라인을 출력한다 (lib/blocks/i18n.ts §7). 이전 importer 는 이
  //   포맷을 인식 못 해 parseFlat 로 fall through → 키 = `<!-- i18n[ko] "k"`,
  //   값 = `\"v\" -->` 같은 garbage 가 박혔고 round-trip 시 escape 가
  //   한 단계씩 누적됐다 (D&D 5e 측정에서 second emit 의 key 가 `--i18nkotitle.sheet`
  //   로 변형된 원인). 해결: comment 포맷을 우선 시도, 각 항목 자체의 lang
  //   정보 보존.
  const parsedComments = parseComments(text);
  if (parsedComments) {
    const out: MatchedBlock[] = [];
    for (const [lang, key, value] of parsedComments) {
      out.push({
        blockType: 'r20_locale_value',
        fields: { LANG: lang, KEY: key, VALUE: value },
        children: {},
      });
      ctx.keys++;
    }
    return out;
  }
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
      fields: { LANG: fallbackLang, KEY: key, VALUE: value },
      children: {},
    });
    ctx.keys++;
  }
  return out;
}

/**
 * `<!-- i18n[lang] "key": "value" -->` 주석 라인 시퀀스 파서 —
 * lib/blocks/i18n.ts 의 r20_locale_value generator 가 출력하는 emit 포맷.
 *
 * 각 항목은 자체 lang 코드 보존. 매칭 실패 시 null (다른 파서 fallback).
 *
 * 형식 규약:
 *   - 시작/끝 토큰은 `<!--` / `-->`
 *   - lang 코드는 BCP-47-like ASCII tag (`fr`, `de-DE`, `zh-Hant` 등)
 *     이며, 유효하지 않은 항목만 skip
 *   - key / value 는 JSON 문자열 리터럴 (jsonEscape 의 역연산 — `\"`, `\\`,
 *     `\n`, `\r`, `\t`, `\uXXXX` 지원).
 *
 * 다른 형식 (JSON / flat) 라인이 섞여 있어도 본 함수가 매칭하는 라인이 1개
 * 이상이면 OK — 나머지는 무시 (사용자에게 명시적 경고 X, comments-mode 로
 * 단언했으므로). 0 매칭이면 null 반환 → 호출 측이 다른 파서 시도.
 */
function parseComments(text: string): Array<[string, string, string]> | null {
  const out: Array<[string, string, string]> = [];
  // /g 플래그로 멀티라인 / multi-entry 한 줄 모두 처리.
  const re = /<!--\s*i18n\[([A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*)\]\s*"((?:\\.|[^"\\])*)"\s*:\s*"((?:\\.|[^"\\])*)"\s*-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lang = m[1];
    out.push([lang, jsonUnescape(m[2]), jsonUnescape(m[3])]);
  }
  return out.length > 0 ? out : null;
}

/** JSON 문자열 리터럴 escape 의 역연산 — `\"` / `\\` / `\n` / `\uXXXX` 디코드. */
function jsonUnescape(s: string): string {
  return s.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_m, esc) => {
    if (esc[0] === 'u') return String.fromCharCode(parseInt(esc.slice(1), 16));
    switch (esc) {
      case 'n': return '\n';
      case 'r': return '\r';
      case 't': return '\t';
      case 'b': return '\b';
      case 'f': return '\f';
      case '"': return '"';
      case "\\": return '\\';
      case '/': return '/';
      default: return esc;
    }
  });
}

// ---------------------------------------------------------------------------

function detectLang(text: string): string | null {
  const head = text.slice(0, 200);
  const m = /(?:#|\/\/)\s*lang\s*[:=]\s*([A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*)/i.exec(head);
  if (m && isLanguageTag(m[1])) return m[1];
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

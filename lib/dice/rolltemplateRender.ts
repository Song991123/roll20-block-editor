/**
 * Rolltemplate field rendering helper.
 *
 * Anchor:
 *   - lib/dice/executor.ts (RolltemplateResult)
 *   - Roll20 wiki: rolltemplates Mustache syntax
 *
 * Roll20 rolltemplate 의 body 는 `<rolltemplate class="sheet-rolltemplate-NAME">`
 * 안에 Mustache 식별자 `{{key}}` 가 들어간 HTML.
 * 본 모듈은 그 body 의 `{{key}}` 를 fieldResults 의 text 로 치환한 안전한
 * HTML 을 반환한다.
 *
 * 실제 emit 된 HTML 안에서 rolltemplate 정의를 찾아 body 를 추출하는 헬퍼.
 */

import type { RolltemplateFieldResult, RolltemplateResult } from './executor';
import { sanitizeRolltemplateHtml } from './sanitizeRolltemplateHtml';

/** 안전한 HTML 이스케이프 — 사용자 입력 그대로 박지 않도록. */
export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 사용자가 만든 HTML 안에서 `<rolltemplate class="sheet-rolltemplate-NAME">...</rolltemplate>`
 * 블록의 body 를 추출. 없으면 null.
 */
export function extractRolltemplateBody(html: string, name: string): string | null {
  if (!name) return null;
  const safe = name.replace(/[^A-Za-z0-9_-]/g, '');
  const expectedClass = `sheet-rolltemplate-${safe}`;
  const re = /<rolltemplate\b([^>]*)>([\s\S]*?)<\/rolltemplate>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[1] ?? '';
    const cls = attrs.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2] ?? '';
    const classTokens = cls.split(/\s+/).filter(Boolean);
    if (classTokens.includes(expectedClass)) {
      return m[2] ?? null;
    }
  }
  return null;
}

/**
 * `{{key}}` 형태의 Mustache 토큰을 fieldResults 로 치환.
 * helper (`{{rollWasCrit()}}` 같은) 는 ChatPane 기본 동작에 맡김.
 */
export function renderTemplateBody(
  body: string,
  fields: RolltemplateFieldResult[],
  flags: { anyCrit: boolean; anyFumble: boolean },
  translations: Record<string, string> = {},
): string {
  const map = new Map<string, RolltemplateFieldResult>();
  for (const f of fields) map.set(f.key, f);
  const safeBody = sanitizeRolltemplateHtml(body);
  const sectionRendered = prefixRolltemplateClasses(renderRolltemplateSections(safeBody, map, flags));

  // Mustache `{{ key }}` 토큰 (식별자 only) 치환.
  const rendered = sectionRendered.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (full, raw) => {
    const expr = String(raw).trim();
    // helper: 무지원 ones — empty.
    if (expr.endsWith(')')) {
      // rollWasCrit() / rollWasFumble() 만 부분 지원
      if (/^rollWasCrit\s*\(\s*\)$/.test(expr)) return flags.anyCrit ? '1' : '';
      if (/^rollWasFumble\s*\(\s*\)$/.test(expr)) return flags.anyFumble ? '1' : '';
      return '';
    }
    const f = map.get(expr);
    if (!f) return '';
    if (f.detail) {
      const det = f.detail;
      const diceText = det.dice
        .map((d) => `[${d.raw.join(', ')}]`)
        .join(' + ');
      const trailing = diceText ? ` <span class="rt-dice">${escapeHtml(diceText)}</span>` : '';
      return `<span class="rt-total">${escapeHtml(String(det.total))}</span>${trailing}`;
    }
    return escapeHtml(translateText(f.text, translations));
  });
  return applyDataI18n(rendered, translations);
}

const ROLL20_UNPREFIXED_RUNTIME_CLASSES = new Set([
  'inlinerollresult',
  'fullcrit',
  'fullfail',
  'importantroll',
]);

function prefixRolltemplateClasses(html: string): string {
  return html.replace(/\bclass\s*=\s*(["'])(.*?)\1/gi, (full, quote, rawClass) => {
    const prefixed = String(rawClass)
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        if (token.startsWith('sheet-')) return token;
        if (ROLL20_UNPREFIXED_RUNTIME_CLASSES.has(token)) return token;
        return `sheet-${token}`;
      })
      .join(' ');
    return `class=${quote}${prefixed}${quote}`;
  });
}

function translateText(text: string, translations: Record<string, string>): string {
  return translations[text] ?? text;
}

function applyDataI18n(html: string, translations: Record<string, string>): string {
  if (!Object.keys(translations).length) return html;
  return html.replace(
    /(<([a-zA-Z][\w:-]*)(?=[^>]*\bdata-i18n=(["'])([^"']+)\3)[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (full, open, _tag, _quote, key, inner, close) => {
      const translated = translations[key];
      if (!translated || /<[^>]+>/.test(inner)) return full;
      return `${open}${escapeHtml(translated)}${close}`;
    },
  );
}

function renderRolltemplateSections(
  body: string,
  fields: Map<string, RolltemplateFieldResult>,
  flags: { anyCrit: boolean; anyFumble: boolean },
): string {
  const sectionTag = /\{\{\s*([#/])\s*([A-Za-z][A-Za-z0-9_]*)\s*\(\s*\)\s*([^{}]*?)\s*\}\}/g;

  function renderUntil(start: number, close?: { helper: string; args: string }): { text: string; pos: number } {
    let pos = start;
    let out = '';
    sectionTag.lastIndex = start;
    while (true) {
      const m = sectionTag.exec(body);
      if (!m) {
        out += body.slice(pos);
        return { text: out, pos: body.length };
      }
      const token = m[0];
      const marker = m[1] ?? '';
      const helper = m[2] ?? '';
      const args = normalizeSectionArgs(m[3] ?? '');
      const tokenStart = m.index;
      const tokenEnd = tokenStart + token.length;
      out += body.slice(pos, tokenStart);
      pos = tokenEnd;

      if (marker === '/') {
        if (!close || helper !== close.helper || args !== close.args) {
          out += token;
          continue;
        }
        return { text: out, pos: tokenEnd };
      }

      const inner = renderUntil(tokenEnd, { helper, args });
      pos = inner.pos;
      sectionTag.lastIndex = pos;
      if (evalRolltemplateSection(helper, args, fields, flags)) {
        out += inner.text;
      }
    }
  }

  return renderUntil(0).text;
}

function normalizeSectionArgs(args: string): string {
  return args.trim().replace(/\s+/g, ' ');
}

function evalRolltemplateSection(
  helper: string,
  args: string,
  fields: Map<string, RolltemplateFieldResult>,
  flags: { anyCrit: boolean; anyFumble: boolean },
): boolean {
  const parts = args ? args.split(/\s+/) : [];
  const value = (token: string): number => {
    const numeric = Number(token);
    if (Number.isFinite(numeric)) return numeric;
    const f = fields.get(token);
    if (f?.detail) return f.detail.total;
    const textNumber = Number(f?.text ?? '');
    return Number.isFinite(textNumber) ? textNumber : 0;
  };

  switch (helper) {
    case 'rollTotal':
      return parts.length >= 2 && value(parts[0]!) === value(parts[1]!);
    case 'rollLess':
      return parts.length >= 2 && value(parts[0]!) < value(parts[1]!);
    case 'rollGreater':
      return parts.length >= 2 && value(parts[0]!) > value(parts[1]!);
    case 'rollBetween':
      return parts.length >= 3 && value(parts[0]!) >= value(parts[1]!) && value(parts[0]!) <= value(parts[2]!);
    case 'rollWasCrit':
      return flags.anyCrit;
    case 'rollWasFumble':
      return flags.anyFumble;
    default:
      return false;
  }
}

/**
 * 기본 카드 body — 사용자가 rolltemplate 정의를 안 두었거나 매치 못 한 경우.
 * 모든 fields 를 key=value 표로.
 */
export function defaultRolltemplateBody(result: RolltemplateResult): string {
  const rows = result.fields
    .map((f) => {
      const right = f.detail
        ? `<strong>${escapeHtml(String(f.detail.total))}</strong> <span class="muted">[${escapeHtml(
            f.detail.dice.map((d) => d.raw.join(',')).join(' / '),
          )}]</span>`
        : escapeHtml(f.text);
      return `<tr><th>${escapeHtml(f.key)}</th><td>${right}</td></tr>`;
    })
    .join('');
  return `<table class="rt-default"><tbody>${rows}</tbody></table>`;
}

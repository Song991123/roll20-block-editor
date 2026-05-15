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
  const re = new RegExp(
    `<rolltemplate[^>]*class=["'][^"']*sheet-rolltemplate-${safe}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/rolltemplate>`,
    'i',
  );
  const m = html.match(re);
  if (!m) return null;
  return m[1] ?? null;
}

/**
 * `{{key}}` 형태의 Mustache 토큰을 fieldResults 로 치환.
 * helper (`{{rollWasCrit()}}` 같은) 는 ChatPane 기본 동작에 맡김.
 */
export function renderTemplateBody(
  body: string,
  fields: RolltemplateFieldResult[],
  flags: { anyCrit: boolean; anyFumble: boolean },
): string {
  const map = new Map<string, RolltemplateFieldResult>();
  for (const f of fields) map.set(f.key, f);

  // Mustache `{{ key }}` 토큰 (식별자 only) 치환.
  return body.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (full, raw) => {
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
    return escapeHtml(f.text);
  });
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

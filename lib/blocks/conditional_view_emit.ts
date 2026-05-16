/**
 * conditional_view 의 순수 emit 헬퍼 — Blockly 의존 0.
 *
 * Anchor: docs/spec/19_sanitize_and_default_view.md §2.
 *
 * 본 모듈은 다음을 제공:
 *  - `sanitizeIdToken(raw, fallback)` — HTML id 안전 token 으로 정화.
 *  - `escapeHtmlAttr` / `escapeHtmlText` — HTML escape.
 *  - `emitToggleCss(ids)` — toggle ID 목록 → CSS sibling trick rules.
 *
 * `conditional_view.ts` 에서 re-export 함. 본 파일은 Blockly init 등 런타임
 * 의존이 없어 Node.js 단위 테스트 가능 (외부 의존 0).
 *
 * 시스템 specific 식별자 0.
 */

/** HTML id 안전 token — `[A-Za-z][\w-]*`. 사용자 입력 정화. */
export function sanitizeIdToken(raw: string, fallback = 'toggle'): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return fallback;
  const safe = trimmed.replace(/[^A-Za-z0-9_-]/g, '-');
  if (/^[A-Za-z]/.test(safe)) return safe;
  return `t-${safe}`;
}

/** HTML attribute safe — `"` 만 escape. */
export function escapeHtmlAttr(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** HTML text content safe. */
export function escapeHtmlText(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 토글 ID 가 박힌 sheet 의 CSS sibling trick rules 자동 생성.
 *
 * sheet emit pipeline 이 워크스페이스 안의 모든 r20_toggle_* 블록의 ID 를 수집해
 * 본 함수로 CSS 룰 묶음을 받아 시트 CSS 끝에 append.
 *
 * 본 함수는 외부 의존 0, 순수.
 */
export function emitToggleCss(toggleIds: ReadonlyArray<string>): string {
  if (!toggleIds || toggleIds.length === 0) return '';
  const seen = new Set<string>();
  const out: string[] = ['/* r20-toggle — CSS sibling trick rules (auto-emitted) */'];
  for (const raw of toggleIds) {
    const id = sanitizeIdToken(raw);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(`.r20-toggle-on--${id}  { display: none; }`);
    out.push(`.r20-toggle-off--${id} { display: block; }`);
    out.push(`#${id}:checked ~ .r20-toggle-on--${id}  { display: block; }`);
    out.push(`#${id}:checked ~ .r20-toggle-off--${id} { display: none; }`);
  }
  return out.join('\n') + '\n';
}

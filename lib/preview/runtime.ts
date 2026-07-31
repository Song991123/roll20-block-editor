/**
 * Roll20 preview runtime CSS — overlay-only.
 *
 * Anchor: docs/spec/12_roll20_output_spec.md §6.1 / §6.2
 *       + docs/spec/10_system_architecture.md §3 PreviewMain
 *       + docs/spec/25_roll20_baseline.md  ← form/typography baseline 분리
 *
 * 본 모듈은 *overlay* (선택 outline, 빈-state placeholder, generic layout helper,
 * dark mode tokens) 만 담는다. Roll20 의 form / typography / table 기본은
 * `roll20_baseline.ts` 가 담당 — 그쪽이 baseline 으로 먼저 박히고, runtime 은
 * 그 위에 우리 overlay 만 박는다.
 *
 * 변경 이력 (spec 25):
 *   - .charsheet 의 form-control 룰 (input/select/textarea/button/label/heading/
 *     table/img/hr) 을 모두 baseline 으로 이주.
 *   - `.charsheet` root 의 font / padding / color 도 baseline 으로 이주.
 *   - 본 파일은 `html, body` (iframe-only), `.r20-empty`, `[data-r20-*]` 표시,
 *     `.sheet-colrow-N` 그리드, dark mode --r20-* 변수만 보유.
 *
 * Web Worker 호환 — `?raw` 같은 bundler 전용 import 사용 X.
 *
 * 시스템 specific 0.
 */

export const runtimeCss = String.raw`
/* iframe body — Shadow DOM 에선 body 가 없으므로 noop */
/* preview-only — fieldset[class*=repeating_] 시각 hint
   (Roll20 의 repcontainer 와 별개. 사용자가 fieldset 으로 repeating section 박은
   경우 미리보기에서 "여기 반복 섹션이다" 를 알려주는 우리 표시.) */
.charsheet fieldset[class^='repeating_'],
.charsheet fieldset[class*=' repeating_'] {
  border: 0;
  background: transparent;
}
.charsheet fieldset[class^='repeating_']::before,
.charsheet fieldset[class*=' repeating_']::before {
  content: '↻ 반복 섹션';
  display: none;
  font-size: 10px;
  color: #57606a;
  margin-bottom: 6px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* preview-only 선택 강조 (PreviewMain 이 postMessage 로 highlight) */
.charsheet [data-r20-preview-selected='1'] {
  outline: 2px solid #2f81f7;
  outline-offset: 1px;
}

/* ─── generic layout helpers (Roll20 표준 X — 우리 helper) ─────── */
/* colrow_n N-column grid */
/* fieldset basic — baseline 의 fieldset 룰보다 약한 specificity */

/* sheet-table — 우리 generic (Roll20 의 raw table 은 baseline 이 처리) */

/* generic repeating section (Roll20 fieldset.repeating_* 와 별도 helper) */

/* spacers */

/* ─── 다크 모드 토큰 ──────────────────────────────────────────── */
/* Shadow DOM 모드 — host 에 다크 모드 토큰. body 가 없으므로 :host */
`;

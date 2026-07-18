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
html, body {
  margin: 0;
  padding: 0;
  min-height: 0;
  overflow: visible;
  background: #ffffff;
}

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
  color: var(--r20-fg-muted, #57606a);
  margin-bottom: 6px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* preview-only 선택 강조 (PreviewMain 이 postMessage 로 highlight) */
.charsheet [data-r20-preview-selected='1'] {
  outline: 2px solid var(--r20-focus, #2f81f7);
  outline-offset: 1px;
  border-radius: 3px;
}

/* ─── generic layout helpers (Roll20 표준 X — 우리 helper) ─────── */
/* colrow_n N-column grid */
.sheet-colrow-2, .sheet-colrow-3, .sheet-colrow-4, .sheet-colrow-5, .sheet-colrow-6 {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.sheet-colrow-2 { grid-template-columns: repeat(2, 1fr); }
.sheet-colrow-3 { grid-template-columns: repeat(3, 1fr); }
.sheet-colrow-4 { grid-template-columns: repeat(4, 1fr); }
.sheet-colrow-5 { grid-template-columns: repeat(5, 1fr); }
.sheet-colrow-6 { grid-template-columns: repeat(6, 1fr); }

/* fieldset basic — baseline 의 fieldset 룰보다 약한 specificity */
.sheet-fieldset, fieldset.sheet-fieldset {
  padding: 0.5rem;
  border: 1px solid var(--r20-border, #d0d7de);
  border-radius: 0.25rem;
}

/* sheet-table — 우리 generic (Roll20 의 raw table 은 baseline 이 처리) */
.sheet-table { border-collapse: collapse; width: 100%; }
.sheet-table th, .sheet-table td { padding: 0.25rem 0.5rem; text-align: left; }

/* generic repeating section (Roll20 fieldset.repeating_* 와 별도 helper) */
.repeating_section {
  border: 1px solid var(--r20-border, #d0d7de);
  padding: 0.5rem;
  margin: 0.5rem 0;
}

/* spacers */
.sheet-spacer-small { height: 0.25rem; }
.sheet-spacer-medium { height: 0.5rem; }
.sheet-spacer-large { height: 1rem; }

/* ─── 다크 모드 토큰 ──────────────────────────────────────────── */
:root {
  --r20-bg: #ffffff;
  --r20-fg: #1f2328;
  --r20-fg-muted: #57606a;
  --r20-border: #d0d7de;
  --r20-input-bg: #ffffff;
  --r20-button-bg: #f6f8fa;
  --r20-roll-bg: #ddf4ff;
  --r20-roll-border: #54aeff;
  --r20-roll-fg: #0969da;
  --r20-action-bg: #fff8c5;
  --r20-action-border: #d4a72c;
  --r20-action-fg: #7d4e00;
  --r20-repeat-bg: rgba(208, 215, 222, 0.08);
  --r20-thead-bg: #f6f8fa;
  --r20-focus: #2f81f7;
}

body[data-theme='dark'] {
  --r20-bg: #0d1117;
  --r20-fg: #e6edf3;
  --r20-fg-muted: #8b949e;
  --r20-border: #30363d;
  --r20-input-bg: #161b22;
  --r20-button-bg: #21262d;
  --r20-roll-bg: #1b3148;
  --r20-roll-border: #316dca;
  --r20-roll-fg: #58a6ff;
  --r20-action-bg: #3a2e0c;
  --r20-action-border: #7d6219;
  --r20-action-fg: #f3d175;
  --r20-repeat-bg: rgba(110, 118, 129, 0.1);
  --r20-thead-bg: #161b22;
  --r20-focus: #58a6ff;
}

/* Shadow DOM 모드 — host 에 다크 모드 토큰. body 가 없으므로 :host */
:host([data-theme='dark']) {
  --r20-bg: #0d1117;
  --r20-fg: #e6edf3;
  --r20-fg-muted: #8b949e;
  --r20-border: #30363d;
  --r20-input-bg: #161b22;
  --r20-button-bg: #21262d;
  --r20-roll-bg: #1b3148;
  --r20-roll-border: #316dca;
  --r20-roll-fg: #58a6ff;
  --r20-action-bg: #3a2e0c;
  --r20-action-border: #7d6219;
  --r20-action-fg: #f3d175;
  --r20-repeat-bg: rgba(110, 118, 129, 0.1);
  --r20-thead-bg: #161b22;
  --r20-focus: #58a6ff;
}
`;

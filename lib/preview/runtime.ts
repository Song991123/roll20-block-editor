/**
 * Roll20 base runtime CSS — 미리보기 iframe 안에 inline.
 *
 * Anchor: docs/spec/12_roll20_output_spec.md §6.1 (CSS 제약) / §6.2 (HTML 제약)
 *       + docs/spec/10_system_architecture.md §3 PreviewMain.
 *
 * 본 모듈은 사용자 시트 CSS 가 비었을 때도 미리보기에서 시트가 "벌거벗은 HTML"
 * 으로 보이지 않게 default look 을 제공한다. 출력 sheet.css 에는 포함되지 않음
 * (Roll20 sandbox 가 자체 base 를 가짐). lib/preview/runtime.css 는 동일 내용의
 * reference 사본 — 편집 시 양쪽 sync 필요.
 *
 * Web Worker 호환 — `?raw` 같은 bundler 전용 import 사용 X. 일반 ts 모듈로
 * worker 안에서도 import 가능.
 *
 * 시스템 specific 0 — 모든 selector 는 Roll20 표준 element / class.
 */

export const runtimeCss = String.raw`
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background: var(--r20-bg, #ffffff);
  color: var(--r20-fg, #1f2328);
  font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', -apple-system,
    BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

.charsheet {
  display: block;
  box-sizing: border-box;
  padding: 16px 20px;
  background: var(--r20-bg, #ffffff);
  color: var(--r20-fg, #1f2328);
  min-height: 100%;
}

.charsheet *,
.charsheet *::before,
.charsheet *::after {
  box-sizing: border-box;
}

.charsheet input[type='text'],
.charsheet input[type='number'],
.charsheet input:not([type]),
.charsheet select,
.charsheet textarea {
  display: inline-block;
  padding: 4px 8px;
  margin: 0;
  border: 1px solid var(--r20-border, #d0d7de);
  border-radius: 3px;
  background: var(--r20-input-bg, #ffffff);
  color: inherit;
  font: inherit;
  line-height: 1.4;
  min-width: 60px;
}

.charsheet input[type='number'] {
  width: 64px;
  text-align: right;
}

.charsheet textarea {
  width: 100%;
  min-height: 60px;
  resize: vertical;
}

.charsheet input:focus,
.charsheet select:focus,
.charsheet textarea:focus {
  outline: 2px solid var(--r20-focus, #2f81f7);
  outline-offset: 1px;
  border-color: var(--r20-focus, #2f81f7);
}

.charsheet input[type='checkbox'],
.charsheet input[type='radio'] {
  width: 14px;
  height: 14px;
  margin: 0 4px 0 0;
  vertical-align: middle;
  accent-color: var(--r20-focus, #2f81f7);
}

.charsheet input[type='hidden'] {
  display: none;
}

.charsheet button,
.charsheet button[type='roll'],
.charsheet button[type='action'] {
  display: inline-block;
  padding: 4px 10px;
  margin: 2px;
  border: 1px solid var(--r20-border, #d0d7de);
  border-radius: 3px;
  background: var(--r20-button-bg, #f6f8fa);
  color: inherit;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  line-height: 1.4;
}

.charsheet button[type='roll'] {
  background: var(--r20-roll-bg, #ddf4ff);
  border-color: var(--r20-roll-border, #54aeff);
  color: var(--r20-roll-fg, #0969da);
}

.charsheet button[type='action'] {
  background: var(--r20-action-bg, #fff8c5);
  border-color: var(--r20-action-border, #d4a72c);
  color: var(--r20-action-fg, #7d4e00);
}

.charsheet button:hover {
  filter: brightness(0.96);
}

.charsheet button:active {
  filter: brightness(0.9);
}

.charsheet label {
  display: inline-block;
  margin: 2px 6px 2px 0;
  vertical-align: middle;
  color: inherit;
  font-weight: 500;
}

.charsheet h1, .charsheet h2, .charsheet h3,
.charsheet h4, .charsheet h5, .charsheet h6 {
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.3;
  color: inherit;
}

.charsheet h1 { font-size: 1.5em; }
.charsheet h2 { font-size: 1.3em; }
.charsheet h3 { font-size: 1.15em; }
.charsheet h4 { font-size: 1em; }
.charsheet h5 { font-size: 0.9em; }
.charsheet h6 { font-size: 0.85em; color: var(--r20-fg-muted, #57606a); }

.charsheet fieldset[class^='repeating_'],
.charsheet fieldset[class*=' repeating_'] {
  display: block;
  margin: 8px 0;
  padding: 8px 10px;
  border: 1px dashed var(--r20-border, #d0d7de);
  border-radius: 4px;
  background: var(--r20-repeat-bg, rgba(208, 215, 222, 0.08));
}

.charsheet fieldset[class^='repeating_']::before,
.charsheet fieldset[class*=' repeating_']::before {
  content: '↻ 반복 섹션';
  display: block;
  font-size: 10px;
  color: var(--r20-fg-muted, #57606a);
  margin-bottom: 6px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.charsheet rolltemplate,
.charsheet [class*='sheet-rolltemplate-'] {
  display: none;
}

.charsheet script,
script[type='text/worker'] {
  display: none;
}

.charsheet table {
  border-collapse: collapse;
  margin: 6px 0;
}

.charsheet th, .charsheet td {
  padding: 4px 8px;
  border: 1px solid var(--r20-border, #d0d7de);
  text-align: left;
}

.charsheet th {
  background: var(--r20-thead-bg, #f6f8fa);
  font-weight: 600;
}

.charsheet img {
  max-width: 100%;
  height: auto;
  vertical-align: middle;
}

.charsheet [data-r20-preview-selected='1'] {
  outline: 2px solid var(--r20-focus, #2f81f7);
  outline-offset: 1px;
  border-radius: 3px;
}

/* ───────────────────────────────────────────────────────────────────
 * colrow / row / col / fieldset / table / repeating / spacer defaults
 * 목적: 시스템에 무관한 generic layout primitive 의 default 동작 보장.
 * 추가 anchor: V2 검증 — ".sheet-colrow-N" 디폴트 grid 정의가 없어
 * 다수 능력치 row 가 vertical stack 으로 깨지는 갭 보강.
 * 시스템 specific 0. 모든 selector 는 Roll20/sheet 표준 class.
 * ─────────────────────────────────────────────────────────────────── */

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

/* row / col flex helpers */
.sheet-row { display: flex; flex-direction: row; gap: 0.5rem; flex-wrap: wrap; }
.sheet-col { display: flex; flex-direction: column; gap: 0.25rem; }

/* fieldset basic — ".charsheet fieldset[class*=repeating_]" 보다 낮은 specificity */
.sheet-fieldset, fieldset.sheet-fieldset {
  padding: 0.5rem;
  border: 1px solid var(--r20-border, #d0d7de);
  border-radius: 0.25rem;
}

/* table basic — 기존 ".charsheet table" 룰과 함께 width/100% 보강 */
.sheet-table, table { border-collapse: collapse; width: 100%; }
.sheet-table th, .sheet-table td { padding: 0.25rem 0.5rem; text-align: left; }

/* repeating section — generic class (Roll20 fieldset.repeating_* 와 별도) */
.repeating_section {
  border: 1px solid var(--r20-border, #d0d7de);
  padding: 0.5rem;
  margin: 0.5rem 0;
}

/* spacers */
.sheet-spacer-small { height: 0.25rem; }
.sheet-spacer-medium { height: 0.5rem; }
.sheet-spacer-large { height: 1rem; }

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
`;

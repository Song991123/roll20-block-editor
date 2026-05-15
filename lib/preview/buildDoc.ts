/**
 * buildSheetDoc — emit 결과 (raw HTML/CSS/i18n) 를 미리보기 iframe 의 srcdoc
 * 으로 변환하는 합성 함수.
 *
 * Anchor:
 *   - docs/spec/10_system_architecture.md §7 (emit-worker → srcdoc → iframe)
 *   - docs/spec/12_roll20_output_spec.md §2 / §3 (sheet.html / sheet.css 구조)
 *   - docs/spec/16_redesign_decision_log.md D4 ① (autoPrefix default ON)
 *
 * 단계:
 *   1) html / css 에 autoPrefix 적용 (sanitize=ON 일 때)
 *   2) runtimeCss + user css 합쳐 <head><style> 박음
 *   3) <body><div class="charsheet">{user html}</div></body>
 *   4) preview-only postMessage 스크립트 inline (클릭 시 부모에 r20:select 전송)
 *
 * Web Worker 안에서도 호출 가능 — DOM API 사용 X, 모두 string 가공.
 *
 * 시스템 specific 0 — 모든 변환은 일반 규칙.
 */

import { autoPrefixHtmlClasses, autoPrefixCssClasses } from './prefix';
import { runtimeCss } from './runtime';

export interface BuildDocOptions {
  html: string;
  css: string;
  /** translation.json — Phase 2 minimal 에선 미반영 (Phase 3+ data-i18n 치환). */
  i18n?: string;
  /** D4 ① — true 면 user html/css 에 autoPrefix 적용. */
  sanitize?: boolean;
  /** 다크 모드 토큰 부착 — body[data-theme=dark]. */
  darkMode?: boolean;
}

/** 미리보기 iframe 안에서 부모창에 클릭 이벤트 전달하는 ES2015 inline 스크립트. */
const PREVIEW_BRIDGE_SCRIPT = String.raw`
(function () {
  function postSelect(id) {
    try {
      parent.postMessage({ type: 'r20:select', blockId: id }, '*');
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var node = e.target;
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.r20BlockId) {
        postSelect(node.dataset.r20BlockId);
        return;
      }
      node = node.parentNode;
    }
  }, false);
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'r20:highlight') return;
    var prev = document.querySelector('[data-r20-preview-selected="1"]');
    if (prev) prev.removeAttribute('data-r20-preview-selected');
    var id = e.data.blockId;
    if (!id) return;
    var sel = document.querySelector('[data-r20-block-id="' + cssEscape(id) + '"]');
    if (sel) sel.setAttribute('data-r20-preview-selected', '1');
  }, false);
  function cssEscape(s) {
    return String(s).replace(/[^\w-]/g, '\\$&');
  }
})();
`;

/**
 * 빈 워크스페이스 사용자 안내 — empty state 카드.
 */
const EMPTY_PLACEHOLDER = `
<section class="r20-empty">
  <h1>시트 미리보기</h1>
  <p>왼쪽 <strong>블록 라이브러리</strong>에서 블록을 끌어 미리보기에 놓으세요. 박은 블록이 즉시 여기에 나타납니다.</p>
  <p class="muted">팁: 표현식 → 숫자 / @{속성} 블록부터 시도해 보세요.</p>
</section>
<style>
  .r20-empty { padding: 40px 24px; text-align: center; color: var(--r20-fg-muted, #57606a); font-size: 13px; }
  .r20-empty h1 { font-size: 18px; color: var(--r20-fg, #1f2328); margin: 0 0 12px; }
  .r20-empty p { margin: 6px 0; }
  .r20-empty .muted { opacity: 0.7; }
</style>
`;

/**
 * iframe srcdoc 합성. 결과는 그대로 `<iframe srcDoc>` 에 박는다.
 */
export function buildSheetDoc(opts: BuildDocOptions): string {
  const sanitize = opts.sanitize !== false; // default ON
  const darkMode = opts.darkMode === true;

  const userHtml = (opts.html ?? '').trim();
  const userCss = (opts.css ?? '').trim();

  const prefixedHtml = sanitize ? autoPrefixHtmlClasses(userHtml) : userHtml;
  const prefixedCss = sanitize ? autoPrefixCssClasses(userCss) : userCss;

  const bodyInner = prefixedHtml ? prefixedHtml : EMPTY_PLACEHOLDER;

  return `<!doctype html>
<html lang="ko"${darkMode ? ' data-theme="dark"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>시트 미리보기</title>
<style>${runtimeCss}</style>
<style>${prefixedCss}</style>
</head>
<body${darkMode ? ' data-theme="dark"' : ''}>
<div class="charsheet">
${bodyInner}
</div>
<script>${PREVIEW_BRIDGE_SCRIPT}</script>
</body>
</html>`;
}

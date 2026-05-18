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
import {
  roll20BaseIframeCss,
  roll20BaseShadowCss,
  roll20DarkmodeIframeCss,
  roll20DarkmodeShadowCss,
} from './roll20_base';
import { roll20BaselineCss } from './roll20_baseline';
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
  /** spec 17 §9 — 9 레이어 필터. 'all' 이면 dim 없음. */
  previewLayer?:
    | 'all'
    | 'structure'
    | 'input'
    | 'roll'
    | 'text'
    | 'image'
    | 'table'
    | 'repeating'
    | 'custom';
  /** spec 17 §8 — 캔버스에서 선택된 위젯 id 와 sync (강조 표시). */
  includeEditorOverlays?: boolean;
  selectedWidgetName?: string | null;
}

/** 미리보기 iframe 안에서 부모창에 클릭 이벤트 전달하는 ES2015 inline 스크립트. */
const PREVIEW_BRIDGE_SCRIPT = String.raw`
(function () {
  function postSelect(id) {
    try {
      parent.postMessage({ type: 'r20:select', blockId: id }, '*');
    } catch (e) {}
  }
  function collectAttrs() {
    var out = {};
    var nodes = document.querySelectorAll('input[name^="attr_"], select[name^="attr_"], textarea[name^="attr_"]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var nm = n.getAttribute('name') || '';
      if (nm.indexOf('attr_') !== 0) continue;
      var key = nm.substring(5);
      var val;
      if (n.tagName === 'INPUT' && (n.type === 'checkbox' || n.type === 'radio')) {
        val = n.checked ? (n.value || '1') : '';
      } else {
        val = n.value || '';
      }
      if (val !== '' || out[key] === undefined) out[key] = val;
    }
    return out;
  }
  function findRollButton(node) {
    while (node && node !== document.body) {
      if (node.tagName === 'BUTTON' && node.getAttribute('type') === 'roll') {
        return {
          name: node.getAttribute('name') || '',
          value: node.getAttribute('value') || '',
          label: (node.textContent || '').trim()
        };
      }
      node = node.parentNode;
    }
    return null;
  }
  document.addEventListener('click', function (e) {
    // spec 17 §8 — name 있는 element 클릭 시 부모에 widget-click 전송 (위젯 강조용)
    var widgetName = widgetNameOf(e.target);
    if (widgetName) {
      try {
        parent.postMessage({ type: 'r20:widget-click', widgetName: widgetName }, '*');
      } catch (err) {}
    }
    var rollInfo = findRollButton(e.target);
    if (rollInfo) {
      try { e.preventDefault(); } catch (_) {}
      try { e.stopPropagation(); } catch (_) {}
      try {
        parent.postMessage({
          type: 'r20:roll',
          name: rollInfo.name,
          value: rollInfo.value,
          label: rollInfo.label,
          attrs: collectAttrs()
        }, '*');
      } catch (err) {}
      return false;
    }
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
    if (!e.data) return;
    if (e.data.type === 'r20:highlight') {
      var prev = document.querySelector('[data-r20-preview-selected="1"]');
      if (prev) prev.removeAttribute('data-r20-preview-selected');
      var id = e.data.blockId;
      if (!id) return;
      var sel = document.querySelector('[data-r20-block-id="' + cssEscape(id) + '"]');
      if (sel) sel.setAttribute('data-r20-preview-selected', '1');
      return;
    }
    // spec 17 §8 — 캔버스에서 위젯 선택 → 미리보기 강조
    if (e.data.type === 'r20:widget-select') {
      var prevW = document.querySelector('[data-r20-selected="1"]');
      if (prevW) prevW.removeAttribute('data-r20-selected');
      var name = e.data.widgetName;
      if (!name) return;
      var nodes = document.querySelectorAll(
        '[data-widget-name="' + cssEscape(name) + '"],' +
        '[name="attr_' + cssEscape(name) + '"]'
      );
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].setAttribute('data-r20-selected', '1');
      }
      return;
    }
    // spec 17 §8 — 캔버스에서 위젯 hover → 미리보기 dim outline
    if (e.data.type === 'r20:widget-hover-in') {
      var prevH = document.querySelector('[data-r20-hovered="1"]');
      if (prevH) prevH.removeAttribute('data-r20-hovered');
      var nameH = e.data.widgetName;
      if (!nameH) return;
      var nodesH = document.querySelectorAll(
        '[data-widget-name="' + cssEscape(nameH) + '"],' +
        '[name="attr_' + cssEscape(nameH) + '"]'
      );
      for (var j = 0; j < nodesH.length; j++) {
        nodesH[j].setAttribute('data-r20-hovered', '1');
      }
      return;
    }
  }, false);
  function cssEscape(s) {
    return String(s).replace(/[^\w-]/g, '\\$&');
  }
  // spec 17 §8 / N3 — name 속성 있는 element hover / click 양방향 sync
  function widgetNameOf(node) {
    while (node && node !== document.body) {
      var dwn = node.getAttribute && node.getAttribute('data-widget-name');
      if (dwn) return dwn;
      var nm = node.getAttribute && node.getAttribute('name');
      if (nm && nm.indexOf('attr_') === 0) return nm.substring(5);
      node = node.parentNode;
    }
    return null;
  }
  document.addEventListener('mouseover', function (e) {
    var n = widgetNameOf(e.target);
    if (!n) return;
    try {
      parent.postMessage({ type: 'r20:widget-hover', widgetName: n }, '*');
    } catch (err) {}
    // N3 tooltip — title 으로 보여주기 (이미 widget 의 title 에 attr_ 있을 수도).
    var el = e.target;
    if (el && el.setAttribute && !el.getAttribute('title')) {
      el.setAttribute('title', 'attr_' + n);
    }
  }, false);
  document.addEventListener('mouseout', function (e) {
    var n = widgetNameOf(e.target);
    if (!n) return;
    try {
      parent.postMessage({ type: 'r20:widget-hover', widgetName: null }, '*');
    } catch (err) {}
  }, false);
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
 * spec 17 §9 — 9 레이어 CSS 필터.
 * 활성 레이어 element 만 정상 / 나머지는 opacity 0.3 + pointer-events none.
 *
 * `scope` — selector prefix. iframe 모드 = 'body'. Shadow DOM 모드에서는 layer 가
 * charsheet wrapper div 에 박혀 있어 '.charsheet' 사용. 호출자가 지정.
 */
export function layerFilterCss(scope: string = 'body'): string {
  return `
/* spec 17 §9 — 9 layer filter */
${scope}[data-layer="structure"] :not(fieldset):not(section):not(div):not(legend):not(.charsheet) {
  opacity: 0.3;
  pointer-events: none;
}
${scope}[data-layer="input"] *:not(input):not(select):not(textarea):not(label) {
  opacity: 0.3;
  pointer-events: none;
}
${scope}[data-layer="input"] input,
${scope}[data-layer="input"] select,
${scope}[data-layer="input"] textarea,
${scope}[data-layer="input"] label {
  opacity: 1;
  pointer-events: auto;
}
${scope}[data-layer="roll"] *:not(button[type="roll"]):not(button.roll) {
  opacity: 0.3;
  pointer-events: none;
}
${scope}[data-layer="roll"] button[type="roll"],
${scope}[data-layer="roll"] button.roll {
  opacity: 1;
  pointer-events: auto;
  outline: 2px solid #2563eb;
}
${scope}[data-layer="text"] :not(h1):not(h2):not(h3):not(h4):not(h5):not(h6):not(p):not(span):not(label) {
  opacity: 0.3;
  pointer-events: none;
}
${scope}[data-layer="image"] :not(img) {
  opacity: 0.3;
  pointer-events: none;
}
${scope}[data-layer="image"] img {
  outline: 2px solid #2563eb;
}
${scope}[data-layer="table"] :not(table):not(thead):not(tbody):not(tr):not(td):not(th) {
  opacity: 0.3;
  pointer-events: none;
}
${scope}[data-layer="repeating"] :not([data-rfh]):not([data-rfh] *) {
  opacity: 0.3;
  pointer-events: none;
}
${scope}[data-layer="custom"] :not([class]) {
  opacity: 0.3;
  pointer-events: none;
}

/* spec 17 §8 — 캔버스에서 선택된 위젯 강조 */
${scope} [data-r20-selected="1"] {
  outline: 2px solid #f59e0b;
  outline-offset: 1px;
}
${scope} [data-r20-hovered="1"] {
  outline: 2px dashed #93c5fd;
  outline-offset: 1px;
}
`;
}

/**
 * iframe srcdoc 합성. 결과는 그대로 `<iframe srcDoc>` 에 박는다.
 */
export function buildSheetDoc(opts: BuildDocOptions): string {
  const sanitize = opts.sanitize !== false; // default ON
  const darkMode = opts.darkMode === true;
  const layer = opts.previewLayer ?? 'all';
  const includeEditorOverlays = opts.includeEditorOverlays === true;

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
<!-- spec 25 + isolation fix: 실 Roll20 sandbox CSS (ground truth) → 우리 보조 baseline → runtime overlay → user CSS -->
<style id="roll20-base">${roll20BaseIframeCss}</style>${darkMode ? `
<style id="roll20-base-dark">${roll20DarkmodeIframeCss}</style>` : ''}
${includeEditorOverlays ? `<style id="r20-baseline-fallback">${roll20BaselineCss}</style>
<style id="r20-runtime">${runtimeCss}</style>
<style id="r20-layer-filter">${layerFilterCss()}</style>` : ''}
<style id="r20-user">${prefixedCss}</style>
</head>
<body${darkMode ? ' data-theme="dark"' : ''} data-layer="${layer}">
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all" id="dialog-window" style="position:relative;display:block;width:100%;height:auto;overflow:visible;padding:0;">
<div class="dialog largedialog characterviewer" style="display:block;visibility:visible;">
<div class="tab-content${darkMode ? ' sheet-darkmode' : ''}" id="tab-content" style="display:block;visibility:visible;">
<form class="sheetform">
<div class="charactersheet tab-pane charsheet lang-undefined${darkMode ? ' sheet-darkmode' : ''}" id="charsheet-root">
${bodyInner}
</div>
</form>
</div>
</div>
</div>
<script>${PREVIEW_BRIDGE_SCRIPT}</script>
</body>
</html>`;
}

/**
 * Shadow DOM 모드용 — emit 결과를 (html, css) 두 파츠로 반환.
 * 동일한 sanitize / autoPrefix / runtimeCss / layerFilterCss 합성을 거치되,
 * doctype / body wrapper / postMessage bridge script 는 빼고 순수 인젝션 가능
 * 형태로 만든다. shadowMount 가 :host reset + container 박아주는 것을 가정.
 *
 * iframe 모드의 buildSheetDoc 과 시각 동일성 보장 — 같은 CSS 토큰 사용.
 */
export function buildSheetParts(opts: BuildDocOptions): { html: string; css: string } {
  const sanitize = opts.sanitize !== false;
  const userHtml = (opts.html ?? '').trim();
  const userCss = (opts.css ?? '').trim();

  const prefixedHtml = sanitize ? autoPrefixHtmlClasses(userHtml) : userHtml;
  const prefixedCss = sanitize ? autoPrefixCssClasses(userCss) : userCss;

  const bodyInner = prefixedHtml ? prefixedHtml : EMPTY_PLACEHOLDER;

  // Shadow 안에서는 body 가 없음 → wrapper .charsheet 에 data-layer 박힘
  // layerFilterCss scope = '.charsheet' 로 selector 일관성 유지.
  // spec 25 + isolation fix — 실 Roll20 sandbox CSS (ground truth, :root→:host
  // rewrite) 먼저 → 우리 보조 baseline → runtime overlay → user CSS.
  // user CSS 가 마지막 source order 라 동일 specificity 셀렉터에선 사용자 우선.
  const darkMode = opts.darkMode === true;
  const includeEditorOverlays = opts.includeEditorOverlays !== false;
  const css = [
    roll20BaseShadowCss,
    darkMode ? roll20DarkmodeShadowCss : '',
    includeEditorOverlays ? roll20BaselineCss : '',
    includeEditorOverlays ? runtimeCss : '',
    includeEditorOverlays ? layerFilterCss('.charsheet') : '',
    prefixedCss,
  ].join('\n');

  return { html: bodyInner, css };
}

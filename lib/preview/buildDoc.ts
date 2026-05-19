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
  var resizeTimer = 0;
  function measureHeight() {
    var sheet = document.getElementById('charsheet-root') || document.getElementById('dialog-window');
    if (!sheet) return 480;
    var box = measureContentBox(sheet);
    return Math.max(120, Math.ceil(box.height + 24));
  }
  function measureWidth() {
    var sheet = document.getElementById('charsheet-root') || document.getElementById('dialog-window');
    if (!sheet) return null;
    var box = measureContentBox(sheet);
    if (!box.width || box.width < 120) return null;
    return Math.max(850, Math.min(2400, Math.ceil(box.width)));
  }
  function measureContentBox(root) {
    var rootRect = root.getBoundingClientRect();
    var maxRight = Math.max(root.scrollWidth || 0, root.offsetWidth || 0);
    var maxBottom = Math.max(root.scrollHeight || 0, root.offsetHeight || 0);
    var nodes = root.querySelectorAll('*:not(script):not(rolltemplate)');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) continue;
      maxRight = Math.max(maxRight, rect.right - rootRect.left + root.scrollLeft);
      maxBottom = Math.max(maxBottom, rect.bottom - rootRect.top + root.scrollTop);
    }
    return { width: maxRight, height: maxBottom };
  }
  function postResize() {
    try {
      var width = measureWidth();
      var msg = { type: 'r20:resize', height: measureHeight() };
      if (width != null) msg.width = width;
      parent.postMessage(msg, '*');
    } catch (e) {}
  }
  function scheduleResize() {
    if (resizeTimer) return;
    resizeTimer = window.requestAnimationFrame(function () {
      resizeTimer = 0;
      postResize();
    });
  }
  var sheetWorkerHandlers = {};
  var settingAttrs = false;
  var translations = loadTranslations();
  function sheetWorkerOn(events, fn) {
    if (typeof fn !== 'function') return;
    String(events || '').split(/\s+/).filter(Boolean).forEach(function (evt) {
      (sheetWorkerHandlers[evt] = sheetWorkerHandlers[evt] || []).push(fn);
    });
  }
  function readSheetAttr(name) {
    var el = document.querySelector('[name="attr_' + cssEscape(name) + '"]');
    if (!el) return '';
    if (el.type === 'checkbox') return el.checked ? (el.value || '1') : '0';
    if (el.type === 'radio') return el.checked ? (el.value || '') : '';
    return el.value == null ? '' : String(el.value);
  }
  function writeSheetAttr(name, value) {
    var nodes = document.querySelectorAll('[name="attr_' + cssEscape(name) + '"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.type === 'checkbox') {
        el.checked = String(value) === String(el.value || '1') || value === true || value === 1 || value === '1';
      } else if (el.type === 'radio') {
        el.checked = String(el.value) === String(value);
      } else {
        el.value = value == null ? '' : String(value);
      }
    }
  }
  function sheetWorkerGetAttrs(names, cb) {
    var out = {};
    (names || []).forEach(function (n) { out[n] = readSheetAttr(n); });
    if (typeof cb === 'function') cb(out);
  }
  function sheetWorkerSetAttrs(values, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = undefined; }
    settingAttrs = true;
    Object.keys(values || {}).forEach(function (k) { writeSheetAttr(k, values[k]); });
    settingAttrs = false;
    Object.keys(values || {}).forEach(function (k) { triggerSheetWorker('change:' + k, { sourceAttribute: k }); });
    if (typeof cb === 'function') cb();
    scheduleResize();
  }
  function triggerSheetWorker(evt, payload) {
    var list = sheetWorkerHandlers[evt] || [];
    for (var i = 0; i < list.length; i++) {
      try { list[i](payload || { sourceAttribute: evt.replace(/^change:/, '') }); } catch (e) { console.error('[sheet worker]', evt, e); }
    }
  }
  function loadTranslations() {
    var el = document.getElementById('__r20-i18n');
    if (!el) return {};
    try {
      var raw = JSON.parse(el.textContent || '""');
      if (typeof raw === 'string') return raw.trim() ? JSON.parse(raw) : {};
      return raw && typeof raw === 'object' ? raw : {};
    } catch (e) {
      return {};
    }
  }
  function getTranslationByKey(key) {
    var value = translations && translations[key];
    return value == null ? String(key || '') : String(value);
  }
  function getTranslationByLang(_lang, key) {
    return getTranslationByKey(key);
  }
  function getTranslationLanguage() {
    return (document.documentElement.getAttribute('lang') || 'ko').toLowerCase();
  }
  function applyTranslations() {
    if (!translations || typeof translations !== 'object') return;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key || translations[key] == null) return;
      el.textContent = String(translations[key]);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (!key || translations[key] == null) return;
      el.innerHTML = String(translations[key]);
    });
    [
      ['data-i18n-title', 'title'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-aria-label', 'aria-label']
    ].forEach(function (pair) {
      document.querySelectorAll('[' + pair[0] + ']').forEach(function (el) {
        var key = el.getAttribute(pair[0]);
        if (!key || translations[key] == null) return;
        el.setAttribute(pair[1], String(translations[key]));
      });
    });
  }
  function sheetWorkerGetSectionIDs(section, cb) {
    var safe = String(section || '').replace(/^repeating_/, '');
    var ids = {};
    var re = new RegExp('^repeating_' + regexEscape(safe) + '_([^_]+)_');
    document.querySelectorAll('[name^="repeating_' + cssEscape(safe) + '_"]').forEach(function (el) {
      var m = re.exec(el.getAttribute('name') || '');
      if (m && m[1]) ids[m[1]] = true;
    });
    if (typeof cb === 'function') cb(Object.keys(ids));
  }
  function installSheetWorkers() {
    var scripts = document.querySelectorAll('script[type="text/worker"]');
    scripts.forEach(function (script) {
      var code = script.textContent || '';
      if (!code.trim()) return;
      try {
        var fn = new Function(
          'on', 'getAttrs', 'setAttrs', 'getSectionIDs', 'generateRowID', 'removeRepeatingRow', 'setDefaultToken',
          'getTranslationByKey', 'getTranslationByLang', 'getTranslationLanguage',
          code
        );
        fn(
          sheetWorkerOn,
          sheetWorkerGetAttrs,
          sheetWorkerSetAttrs,
          sheetWorkerGetSectionIDs,
          function () { return 'row_' + Math.random().toString(36).slice(2, 18); },
          function () {},
          function () {},
          getTranslationByKey,
          getTranslationByLang,
          getTranslationLanguage
        );
      } catch (e) {
        console.error('[sheet worker install]', e);
      }
    });
    triggerSheetWorker('sheet:opened', {});
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
    var action = e.target && e.target.closest && e.target.closest('button[type="action"]');
    if (action) {
      var actionName = action.getAttribute('name') || '';
      actionName = actionName.replace(/^act_/, '');
      triggerSheetWorker('clicked:' + actionName, { triggerName: actionName });
      try { e.preventDefault(); } catch (_) {}
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
  function regexEscape(s) {
    return String(s).replace(/[.*+?^\x24{}()|[\]\\]/g, '\\$&');
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
  document.addEventListener('change', function (e) {
    if (settingAttrs) return;
    var name = e.target && e.target.getAttribute && e.target.getAttribute('name');
    if (!name || name.indexOf('attr_') !== 0) return;
    var attr = name.substring(5);
    triggerSheetWorker('change:' + attr, { sourceAttribute: attr });
    scheduleResize();
  }, true);
  window.addEventListener('load', scheduleResize);
  window.addEventListener('resize', scheduleResize);
  document.addEventListener('DOMContentLoaded', scheduleResize);
  try {
    var mo = new MutationObserver(scheduleResize);
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
  } catch (e) {}
  try {
    document.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('load', scheduleResize);
      img.addEventListener('error', scheduleResize);
    });
  } catch (e) {}
  applyTranslations();
  installSheetWorkers();
  scheduleResize();
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

const ROLL20_DIALOG_OPEN_CSS = `
#dialog-window,
.dialog.largedialog,
.characterviewer,
.tab-content,
.charactersheet.tab-pane.charsheet {
  display: block !important;
  visibility: visible !important;
}

#dialog-window,
#dialog-window .dialog.largedialog,
#dialog-window .characterviewer,
#dialog-window .tab-content,
#dialog-window .sheetform {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  margin: 0 !important;
  outline: 0 !important;
  padding: 0 !important;
}

#dialog-window::before,
#dialog-window::after,
#dialog-window .dialog.largedialog::before,
#dialog-window .dialog.largedialog::after,
#dialog-window .tab-content::before,
#dialog-window .tab-content::after,
#dialog-window .sheetform::before,
#dialog-window .sheetform::after,
#dialog-window > .ui-dialog-titlebar,
#dialog-window .ui-dialog-titlebar,
#dialog-window .ui-dialog-buttonpane {
  content: none !important;
  display: none !important;
}

.charsheet input[disabled],
.charsheet input[readonly],
.charsheet select[disabled] {
  background-color: rgba(255, 255, 255, 0) !important;
  color: inherit !important;
}

.charsheet {
  background-repeat: no-repeat !important;
  background-position: top center !important;
}

rolltemplate,
script {
  display: none !important;
}
`;

const ROLL20_PREVIEW_HIDDEN_CSS = `
rolltemplate,
script {
  display: none !important;
}
`;

function jsonScriptText(value: string | undefined): string {
  return JSON.stringify(value ?? '')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function parseTranslationMap(i18n: string | undefined): Record<string, string> {
  if (!i18n?.trim()) return {};
  try {
    const parsed = JSON.parse(i18n);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value == null) continue;
      out[key] = String(value);
    }
    return out;
  } catch {
    return {};
  }
}

function applyTranslationsToHtml(html: string, i18n: string | undefined): string {
  const translations = parseTranslationMap(i18n);
  if (Object.keys(translations).length === 0) return html;
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(`<template>${html}</template>`, 'text/html');
  const template = doc.querySelector('template');
  if (!template) return html;

  template.content.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && translations[key] != null) el.textContent = translations[key];
  });
  template.content.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key && translations[key] != null) el.innerHTML = translations[key];
  });
  const attrPairs = [
    ['data-i18n-title', 'title'],
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-aria-label', 'aria-label'],
  ] as const;
  for (const [source, target] of attrPairs) {
    template.content.querySelectorAll<HTMLElement>(`[${source}]`).forEach((el) => {
      const key = el.getAttribute(source);
      if (key && translations[key] != null) el.setAttribute(target, translations[key]);
    });
  }

  return template.innerHTML;
}


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

  const userHtml = (opts.html ?? '').trim();
  const userCss = (opts.css ?? '').trim();

  const prefixedHtml = sanitize ? autoPrefixHtmlClasses(userHtml) : userHtml;
  const prefixedCss = sanitize ? autoPrefixCssClasses(userCss) : userCss;

  const bodyInner = prefixedHtml ? applyTranslationsToHtml(prefixedHtml, opts.i18n) : EMPTY_PLACEHOLDER;

  return `<!doctype html>
<html lang="ko"${darkMode ? ' data-theme="dark"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>시트 미리보기</title>
<!-- spec 25 + isolation fix: 실 Roll20 sandbox CSS (ground truth) → 우리 보조 baseline → runtime overlay → user CSS -->
<style id="roll20-base">${roll20BaseIframeCss}</style>${darkMode ? `
<style id="roll20-base-dark">${roll20DarkmodeIframeCss}</style>` : ''}
<style id="roll20-dialog-open">${ROLL20_DIALOG_OPEN_CSS}</style>
<style id="r20-baseline-fallback">${roll20BaselineCss}</style>
<style id="r20-runtime">${runtimeCss}</style>
<style id="r20-layer-filter">${layerFilterCss()}</style>
<style id="r20-user">${prefixedCss}</style>
<style id="r20-preview-hidden">${ROLL20_PREVIEW_HIDDEN_CSS}</style>
</head>
<body${darkMode ? ' data-theme="dark"' : ''} data-layer="${layer}">
<div class="r20-preview-dialog" id="dialog-window" style="position:relative;display:block;width:100%;height:auto;overflow:visible;padding:0;">
<div class="dialog largedialog characterviewer" style="display:block;visibility:visible;">
<div class="tab-content${darkMode ? ' sheet-darkmode' : ''}" id="tab-content" style="display:block;visibility:visible;">
<form class="sheetform">
<div class="charactersheet tab-pane active charsheet lang-undefined${darkMode ? ' sheet-darkmode' : ''}" id="charsheet-root">
${bodyInner}
</div>
</form>
</div>
</div>
</div>
<script type="application/json" id="__r20-i18n">${jsonScriptText(opts.i18n)}</script>
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

  const bodyInner = prefixedHtml ? applyTranslationsToHtml(prefixedHtml, opts.i18n) : EMPTY_PLACEHOLDER;

  // Shadow 안에서는 body 가 없음 → wrapper .charsheet 에 data-layer 박힘
  // layerFilterCss scope = '.charsheet' 로 selector 일관성 유지.
  // spec 25 + isolation fix — 실 Roll20 sandbox CSS (ground truth, :root→:host
  // rewrite) 먼저 → 우리 보조 baseline → runtime overlay → user CSS.
  // user CSS 가 마지막 source order 라 동일 specificity 셀렉터에선 사용자 우선.
  const darkMode = opts.darkMode === true;
  const css = [
    roll20BaseShadowCss,
    darkMode ? roll20DarkmodeShadowCss : '',
    ROLL20_DIALOG_OPEN_CSS,
    roll20BaselineCss,
    runtimeCss,
    layerFilterCss('.charsheet'),
    prefixedCss,
    ROLL20_PREVIEW_HIDDEN_CSS,
  ].join('\n');

  const html = `
<div class="r20-preview-dialog" id="dialog-window" style="position:relative;display:block;width:100%;height:auto;overflow:visible;padding:0;">
<div class="dialog largedialog characterviewer" style="display:block;visibility:visible;">
<div class="tab-content${darkMode ? ' sheet-darkmode' : ''}" id="tab-content" style="display:block;visibility:visible;">
<form class="sheetform">
<div class="charactersheet tab-pane active charsheet lang-undefined${darkMode ? ' sheet-darkmode' : ''}" id="charsheet-root">
${bodyInner}
</div>
</form>
</div>
</div>
</div>`;

  return { html, css };
}

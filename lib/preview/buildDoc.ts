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

import { normalizeTranslationForRoll20 } from '../export/payload';
import {
  roll20BaseIframeCss,
  roll20BaseShadowCss,
  roll20DarkmodeIframeCss,
  roll20DarkmodeShadowCss,
} from './roll20_base';
import { runtimeCss } from './runtime';
import {
  prepareSheetRenderContract,
  type PreparedSheetRenderContract,
  type Roll20CompatibilityMode,
} from './renderContract';

export interface BuildDocOptions {
  html: string;
  css: string;
  /** Atomic product contract. Modern preserves authored classes; legacy prefixes and sanitizes together. */
  compatibilityMode?: Roll20CompatibilityMode;
  /** translation.json — Phase 2 minimal 에선 미반영 (Phase 3+ data-i18n 치환). */
  i18n?: string;
  /** D4 ① — true 면 user html/css 에 autoPrefix 적용. */
  sanitize?: boolean;
  /** 구버전 Roll20 CSS 무해화. Auto-prefix와 별개이며 기본값은 OFF. */
  legacyCssSanitize?: boolean;
  /** 실제 Roll20 Custom Sheet Sandbox sanitize/prefix 근사치. 진단용 preview 옵션. */
  roll20SandboxSanitize?: boolean;
  /** Diagnostic renderer model. Default must stay off until actual Roll20 gates prove it safe. */
  roll20RendererModel?: 'default' | 'input-flow-27' | 'input-flow-276';
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
  /** Roll20 page language used by :lang() selectors and browser fallback fonts. */
  documentLanguage?: string;
}

export interface SheetLivePatch {
  html: string;
  htmlKey: string;
  styles: Record<string, string>;
  i18n: string;
  darkMode: boolean;
  layer: NonNullable<BuildDocOptions['previewLayer']>;
  roll20SandboxSanitize: boolean;
  roll20RendererModel: NonNullable<BuildDocOptions['roll20RendererModel']>;
  documentLanguage: string;
}

export interface SheetRenderBundle {
  doc: string;
  livePatch: SheetLivePatch;
  parts?: SheetRenderParts;
}

export interface SheetRenderParts {
  html: string;
  css: string;
}

/** 미리보기 iframe 안에서 부모창에 클릭 이벤트 전달하는 ES2015 inline 스크립트. */
const PREVIEW_BRIDGE_SCRIPT = String.raw`
(function () {
  function postSelect(id) {
    try {
      parent.postMessage({ type: 'r20:select', blockId: id }, '*');
    } catch (e) {}
  }
  var editBridgeEnabled = false;
  var editBridgeId = (function () {
    try {
      var bytes = new Uint32Array(4);
      window.crypto.getRandomValues(bytes);
      return 'r20-' + Array.prototype.map.call(bytes, function (value) {
        return Number(value).toString(36);
      }).join('-');
    } catch (e) {
      return 'r20-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
    }
  })();
  var editMoveFrame = 0;
  var pendingEditMove = null;
  var activeEditPointer = null;
  var lastAppliedHtmlKey = document.body
    ? document.body.getAttribute('data-r20-html-key') || ''
    : '';
  var initialSheetRoot = document.getElementById('charsheet-root');
  var lastAppliedBlockCount = initialSheetRoot
    ? initialSheetRoot.querySelectorAll('[data-r20-block-id]').length
    : 0;
  var rootReplacementCount = 0;
  var structuralPatchCount = 0;
  var structuralPatchFallbackCount = 0;
  var styleOnlyApplyCount = 0;
  var optimisticFlowMoveCount = 0;
  var optimisticFlowRollbackCount = 0;
  var validatedFlowTarget = null;
  var optimisticFlowSnapshot = null;
  function blockNodeOf(node) {
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.r20BlockId) return node;
      node = node.parentNode;
    }
    return null;
  }
  function geometryOf(node) {
    if (!node || !node.dataset || !node.dataset.r20BlockId) return null;
    var rect = node.getBoundingClientRect();
    var offsetParent = node.offsetParent;
    var offsetParentBlock = blockNodeOf(offsetParent);
    var offsetParentPosition = '';
    var position = '';
    try {
      offsetParentPosition = offsetParent ? window.getComputedStyle(offsetParent).position : '';
      position = window.getComputedStyle(node).position;
    } catch (e) {}
    return {
      blockId: node.dataset.r20BlockId,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      offsetLeft: Number(node.offsetLeft) || 0,
      offsetTop: Number(node.offsetTop) || 0,
      scrollLeft: Number(node.scrollLeft) || 0,
      scrollTop: Number(node.scrollTop) || 0,
      clientLeft: Number(node.clientLeft) || 0,
      clientTop: Number(node.clientTop) || 0,
      position: position,
      offsetParentBlockId: offsetParentBlock && offsetParentBlock.dataset
        ? offsetParentBlock.dataset.r20BlockId || null
        : null,
      offsetParentPosition: offsetParentPosition
    };
  }
  function hitPathOf(node) {
    var path = [];
    var current = node;
    while (current && current !== document.body && path.length < 64) {
      if (current.dataset && current.dataset.r20BlockId) {
        var geometry = geometryOf(current);
        if (geometry) path.push(geometry);
      }
      current = current.parentNode;
    }
    return path;
  }
  function hitNodeAt(clientX, clientY, fallback) {
    try {
      return blockNodeOf(document.elementFromPoint(clientX, clientY)) || blockNodeOf(fallback);
    } catch (e) {
      return blockNodeOf(fallback);
    }
  }
  function postEditHit(phase, subjectNode, hitNode, pointer) {
    if (!editBridgeEnabled) return;
    var subject = geometryOf(subjectNode);
    if (!subject) return;
    try {
      parent.postMessage({
        type: 'r20:edit-hit',
        protocol: 1,
        bridgeId: editBridgeId,
        phase: phase,
        blockId: subject.blockId,
        rect: subject.rect,
        pointer: { x: Number(pointer.x) || 0, y: Number(pointer.y) || 0 },
        pointerId: Number.isInteger(pointer.pointerId) ? pointer.pointerId : -1,
        button: Number.isInteger(pointer.button) ? pointer.button : -1,
        buttons: Number.isInteger(pointer.buttons) ? pointer.buttons : 0,
        subject: subject,
        hitPath: hitPathOf(hitNode)
      }, '*');
    } catch (e) {}
  }
  function hasFriendlyWidgetPayload(dataTransfer) {
    if (!dataTransfer || !dataTransfer.types) return false;
    for (var i = 0; i < dataTransfer.types.length; i += 1) {
      if (dataTransfer.types[i] === 'application/x-r20-friendly-widget') return true;
    }
    return false;
  }
  function postWidgetDrag(phase, event, payload) {
    if (!editBridgeEnabled) return;
    var hitNode = hitNodeAt(event.clientX, event.clientY, event.target);
    try {
      parent.postMessage({
        type: 'r20:widget-drag',
        protocol: 1,
        bridgeId: editBridgeId,
        phase: phase,
        payload: payload || null,
        pointer: { x: Number(event.clientX) || 0, y: Number(event.clientY) || 0 },
        hitPath: hitPathOf(hitNode)
      }, '*');
    } catch (e) {}
  }
  function setEditBridgeEnabled(enabled, selectedBlockId) {
    editBridgeEnabled = enabled === true;
    document.body.setAttribute('data-r20-edit-mode', editBridgeEnabled ? '1' : '0');
    if (!editBridgeEnabled) {
      if (editMoveFrame) window.cancelAnimationFrame(editMoveFrame);
      editMoveFrame = 0;
      pendingEditMove = null;
      activeEditPointer = null;
      rollbackOptimisticFlowMove();
      clearValidatedFlowTarget();
    }
    if (!editBridgeEnabled || !selectedBlockId) return;
    var selected = document.querySelector('[data-r20-block-id="' + cssEscape(selectedBlockId) + '"]');
    if (selected) postEditHit('measure', selected, selected, {
      x: 0, y: 0, pointerId: -1, button: -1, buttons: 0
    });
  }
  function workerSourceText(root) {
    if (!root) return '';
    var scripts = root.querySelectorAll('script[type="text/worker"]');
    var out = [];
    for (var i = 0; i < scripts.length; i++) out.push(scripts[i].textContent || '');
    return out.join('\n/* r20-worker-boundary */\n');
  }
  function ensureStyle(id, css) {
    var style = document.getElementById(id);
    if (!css) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }
  function keyedBlockId(node) {
    if (!node || node.nodeType !== 1) return '';
    return node.getAttribute('data-r20-block-id') || '';
  }
  function sameShape(current, next) {
    if (!current || !next || current.nodeType !== next.nodeType) return false;
    if (current.nodeType !== 1) return true;
    var currentKey = keyedBlockId(current);
    var nextKey = keyedBlockId(next);
    if ((currentKey || nextKey) && currentKey !== nextKey) return false;
    return current.tagName === next.tagName;
  }
  function syncElementAttributes(current, next) {
    var currentAttrs = current.attributes;
    for (var i = currentAttrs.length - 1; i >= 0; i -= 1) {
      var name = currentAttrs[i].name;
      if (!next.hasAttribute(name)) current.removeAttribute(name);
    }
    var nextAttrs = next.attributes;
    for (var j = 0; j < nextAttrs.length; j += 1) {
      var attr = nextAttrs[j];
      if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
    }
  }
  function morphNode(current, next) {
    if (!sameShape(current, next)) return next.cloneNode(true);
    if (current.nodeType === 1) syncElementAttributes(current, next);
    reconcileChildren(current, next);
    return current;
  }
  function reconcileChildren(parent, nextParent) {
    var currentChildren = Array.prototype.slice.call(parent.childNodes);
    var used = [];
    var cursor = 0;
    var nextChildren = Array.prototype.slice.call(nextParent.childNodes);
    for (var i = 0; i < nextChildren.length; i += 1) {
      var nextChild = nextChildren[i];
      var nextKey = keyedBlockId(nextChild);
      var matchIndex = -1;
      if (nextKey) {
        for (var k = 0; k < currentChildren.length; k += 1) {
          if (used[k]) continue;
          if (keyedBlockId(currentChildren[k]) === nextKey) {
            matchIndex = k;
            break;
          }
        }
      } else {
        for (var p = cursor; p < currentChildren.length; p += 1) {
          if (used[p]) continue;
          if (sameShape(currentChildren[p], nextChild)) {
            matchIndex = p;
            break;
          }
          if (currentChildren[p].nodeType === nextChild.nodeType) break;
        }
      }
      var currentChild = matchIndex >= 0 ? currentChildren[matchIndex] : null;
      var nextNode = currentChild ? morphNode(currentChild, nextChild) : nextChild.cloneNode(true);
      if (matchIndex >= 0) used[matchIndex] = true;
      parent.insertBefore(nextNode, parent.childNodes[i] || null);
      cursor = i + 1;
    }
    for (var r = currentChildren.length - 1; r >= 0; r -= 1) {
      if (!used[r] && currentChildren[r].parentNode === parent) currentChildren[r].remove();
    }
  }
  function patchRootHtml(html) {
    try {
      var template = document.createElement('template');
      template.innerHTML = html;
      reconcileChildren(document.getElementById('charsheet-root'), template.content);
      return true;
    } catch (error) {
      return false;
    }
  }
  function clearValidatedFlowTarget() {
    validatedFlowTarget = null;
    document.body.removeAttribute('data-r20-flow-target-ready');
    document.body.removeAttribute('data-r20-flow-target-subject');
    document.body.removeAttribute('data-r20-flow-target-ready-at');
  }
  function rememberValidatedFlowTarget(data) {
    clearValidatedFlowTarget();
    if (!data || !Number.isInteger(data.pointerId)) return false;
    if (typeof data.subjectBlockId !== 'string') return false;
    if (data.subjectBlockId.length < 1 || data.subjectBlockId.length > 256) return false;
    if (data.placement !== 'inside' && data.placement !== 'before' && data.placement !== 'after') {
      return false;
    }
    validatedFlowTarget = {
      pointerId: data.pointerId,
      subjectBlockId: data.subjectBlockId,
      placement: data.placement,
      containerBlockId: typeof data.containerBlockId === 'string' ? data.containerBlockId : null,
      siblingBlockId: typeof data.siblingBlockId === 'string' ? data.siblingBlockId : null
    };
    document.body.setAttribute('data-r20-flow-target-ready', String(data.pointerId));
    document.body.setAttribute('data-r20-flow-target-subject', data.subjectBlockId);
    document.body.setAttribute(
      'data-r20-flow-target-ready-at',
      String(window.performance.timeOrigin + window.performance.now())
    );
    return true;
  }
  function rollbackOptimisticFlowMove() {
    var snapshot = optimisticFlowSnapshot;
    optimisticFlowSnapshot = null;
    if (!snapshot || !snapshot.subject || !snapshot.parent) return false;
    if (!snapshot.subject.isConnected || !snapshot.parent.isConnected) return false;
    try {
      var anchor = snapshot.nextSibling && snapshot.nextSibling.parentNode === snapshot.parent
        ? snapshot.nextSibling
        : null;
      snapshot.parent.insertBefore(snapshot.subject, anchor);
      optimisticFlowRollbackCount += 1;
      document.body.setAttribute(
        'data-r20-optimistic-flow-rollbacks',
        String(optimisticFlowRollbackCount)
      );
      scheduleResize();
      return true;
    } catch (error) {
      return false;
    }
  }
  function finalizeOptimisticFlowMove(data) {
    if (data && data.committed === true) {
      optimisticFlowSnapshot = null;
    } else {
      rollbackOptimisticFlowMove();
    }
    clearValidatedFlowTarget();
  }
  function optimisticFlowMove(data, captureSnapshot) {
    if (!data || typeof data.subjectBlockId !== 'string') return false;
    if (data.subjectBlockId.length < 1 || data.subjectBlockId.length > 256) return false;
    var subject = document.querySelector(
      '[data-r20-block-id="' + cssEscape(data.subjectBlockId) + '"]'
    );
    if (!subject) return false;
    var destinationParent = null;
    var beforeNode = null;
    var alreadyPlaced = false;
    try {
      if (data.placement === 'inside' && typeof data.containerBlockId === 'string') {
        var container = document.querySelector(
          '[data-r20-block-id="' + cssEscape(data.containerBlockId) + '"]'
        );
        if (!container || container === subject || subject.contains(container)) return false;
        destinationParent = container;
        alreadyPlaced = subject.parentNode === container && subject.nextSibling === null;
      } else if (
        (data.placement === 'before' || data.placement === 'after')
        && typeof data.siblingBlockId === 'string'
      ) {
        var sibling = document.querySelector(
          '[data-r20-block-id="' + cssEscape(data.siblingBlockId) + '"]'
        );
        if (!sibling || !sibling.parentNode || sibling === subject || subject.contains(sibling)) return false;
        destinationParent = sibling.parentNode;
        beforeNode = data.placement === 'before' ? sibling : sibling.nextSibling;
        alreadyPlaced = data.placement === 'before'
          ? subject.parentNode === destinationParent && subject.nextSibling === sibling
          : subject.parentNode === destinationParent && sibling.nextSibling === subject;
      } else {
        return false;
      }
      if (alreadyPlaced) return true;
      if (captureSnapshot === true && !optimisticFlowSnapshot) {
        optimisticFlowSnapshot = {
          subject: subject,
          parent: subject.parentNode,
          nextSibling: subject.nextSibling
        };
      }
      destinationParent.insertBefore(subject, beforeNode);
    } catch (error) {
      return false;
    }
    optimisticFlowMoveCount += 1;
    document.body.setAttribute('data-r20-optimistic-flow-moves', String(optimisticFlowMoveCount));
    document.body.setAttribute('data-r20-last-optimistic-at', window.performance.now().toFixed(3));
    document.body.setAttribute(
      'data-r20-last-optimistic-epoch',
      String(window.performance.timeOrigin + window.performance.now())
    );
    scheduleResize();
    return true;
  }
  function applyLivePatch(data) {
    if (!data || !Number.isInteger(data.revision) || data.revision < 1) return;
    if (typeof data.html !== 'string' || data.html.length > 15000000) return;
    if (typeof data.htmlKey !== 'string' || !/^[a-z0-9-]{1,128}$/.test(data.htmlKey)) return;
    if (!data.styles || typeof data.styles !== 'object') return;
    var allowedStyles = [
      'roll20-base-dark',
      'roll20-legacy-input-state',
      'r20-layer-filter',
      'r20-user',
      'r20-renderer-model'
    ];
    var totalCss = 0;
    for (var i = 0; i < allowedStyles.length; i++) {
      var css = data.styles[allowedStyles[i]];
      if (typeof css !== 'string') return;
      totalCss += css.length;
    }
    if (totalCss > 15000000 || typeof data.i18n !== 'string' || data.i18n.length > 5000000) return;
    var root = document.getElementById('charsheet-root');
    if (!root) return;
    var htmlChanged = data.htmlKey !== lastAppliedHtmlKey;
    var attrs = htmlChanged ? collectAttrs() : null;
    var previousWorkerSource = htmlChanged ? workerSourceText(root) : '';
    var usedStructuralPatch = false;
    if (htmlChanged) {
      usedStructuralPatch = patchRootHtml(data.html);
      if (usedStructuralPatch) {
        structuralPatchCount += 1;
      } else {
        root.innerHTML = data.html;
        structuralPatchFallbackCount += 1;
        rootReplacementCount += 1;
      }
      optimisticFlowSnapshot = null;
      clearValidatedFlowTarget();
      lastAppliedHtmlKey = data.htmlKey;
      document.body.setAttribute('data-r20-html-key', data.htmlKey);
    } else {
      styleOnlyApplyCount += 1;
    }
    for (var j = 0; j < allowedStyles.length; j++) {
      ensureStyle(allowedStyles[j], data.styles[allowedStyles[j]]);
    }
    if (data.darkMode === true) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.removeAttribute('data-theme');
    }
    document.documentElement.lang = typeof data.documentLanguage === 'string'
      ? data.documentLanguage
      : 'en';
    document.body.setAttribute('data-layer', typeof data.layer === 'string' ? data.layer : 'all');
    document.body.setAttribute('data-roll20-sandbox-sanitize', data.roll20SandboxSanitize === true ? '1' : '0');
    document.body.setAttribute('data-roll20-renderer-model', String(data.roll20RendererModel || 'default'));
    var tabContent = document.getElementById('tab-content');
    root.classList.toggle('sheet-darkmode', data.darkMode === true);
    if (tabContent) tabContent.classList.toggle('sheet-darkmode', data.darkMode === true);
    var i18nNode = document.getElementById('__r20-i18n');
    var nextI18n = JSON.stringify(data.i18n);
    var i18nChanged = Boolean(i18nNode && i18nNode.textContent !== nextI18n);
    if (i18nNode && i18nChanged) i18nNode.textContent = nextI18n;
    if (htmlChanged || i18nChanged) {
      translations = loadTranslations();
      applyTranslations();
    }
    if (htmlChanged) {
      emulateRoll20RepeatingSections();
      emulateRoll20ButtonClasses();
      applyRoll20Autocalc();
      Object.keys(attrs || {}).forEach(function (key) { writeSheetAttr(key, attrs[key]); });
      var nextWorkerSource = workerSourceText(root);
      if (nextWorkerSource !== previousWorkerSource) {
        sheetWorkerHandlers = {};
        installSheetWorkers();
      }
      lastAppliedBlockCount = root.querySelectorAll('[data-r20-block-id]').length;
    }
    document.body.setAttribute(
      'data-r20-last-apply-mode',
      htmlChanged ? (usedStructuralPatch ? 'patch' : 'replace') : 'styles'
    );
    document.body.setAttribute('data-r20-root-replacements', String(rootReplacementCount));
    document.body.setAttribute('data-r20-structural-patches', String(structuralPatchCount));
    document.body.setAttribute('data-r20-structural-patch-fallbacks', String(structuralPatchFallbackCount));
    document.body.setAttribute('data-r20-style-only-applies', String(styleOnlyApplyCount));
    document.body.setAttribute('data-r20-optimistic-flow-moves', String(optimisticFlowMoveCount));
    document.body.setAttribute('data-r20-optimistic-flow-rollbacks', String(optimisticFlowRollbackCount));
    document.body.setAttribute('data-r20-last-apply-at', window.performance.now().toFixed(3));
    document.body.setAttribute(
      'data-r20-last-apply-epoch',
      String(window.performance.timeOrigin + window.performance.now())
    );
    scheduleResize();
    try {
      parent.postMessage({
        type: 'r20:edit-applied',
        protocol: 1,
        bridgeId: editBridgeId,
        revision: data.revision,
        blockCount: lastAppliedBlockCount
      }, '*');
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
    return Math.max(320, Math.min(2400, Math.ceil(box.width)));
  }
  function measureContentBox(root) {
    var rootRect = root.getBoundingClientRect();
    // The generated Roll20 wrapper fills the iframe viewport. Start with
    // descendant paint bounds so an imported narrow sheet is not reported as
    // the default canvas width merely because the wrapper is full width.
    var maxRight = 0;
    var maxBottom = 0;
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
    if (maxRight <= 0 || maxBottom <= 0) {
      maxRight = Math.max(maxRight, root.scrollWidth || 0, root.offsetWidth || 0);
      maxBottom = Math.max(maxBottom, root.scrollHeight || 0, root.offsetHeight || 0);
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
        if (el.checked) el.setAttribute('checked', 'checked');
        else el.removeAttribute('checked');
      } else if (el.type === 'radio') {
        el.checked = String(el.value) === String(value);
        if (el.checked) el.setAttribute('checked', 'checked');
        else el.removeAttribute('checked');
      } else {
        var nextValue = value == null ? '' : String(value);
        el.value = nextValue;
        el.setAttribute('value', nextValue);
      }
    }
  }
  function mirrorChangedSheetAttr(el) {
    if (!el || !el.getAttribute) return;
    var rawName = el.getAttribute('name') || '';
    if (rawName.indexOf('attr_') !== 0) return;
    var key = rawName.substring(5);
    var value;
    if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
      value = el.checked ? (el.value || '1') : '';
    } else {
      value = el.value == null ? '' : String(el.value);
    }
    settingAttrs = true;
    writeSheetAttr(key, value);
    settingAttrs = false;
    triggerSheetWorker('change:' + key, { sourceAttribute: key });
    scheduleResize();
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
      ['data-i18n-alt', 'alt'],
      ['data-i18n-placeholder', 'placeholder'],
      ['data-i18n-aria-label', 'aria-label'],
      ['data-i18n-label', 'label']
    ].forEach(function (pair) {
      document.querySelectorAll('[' + pair[0] + ']').forEach(function (el) {
        var key = el.getAttribute(pair[0]);
        if (!key || translations[key] == null) return;
        el.setAttribute(pair[1], String(translations[key]));
      });
    });
  }
  function isRepeatingFieldset(el) {
    if (!el || el.tagName !== 'FIELDSET') return false;
    return /(?:^|\s)repeating_[^\\s]+/.test(el.getAttribute('class') || '');
  }
  function hasRoll20RepeatingRuntime(el) {
    var node = el.nextElementSibling;
    var sawContainer = false;
    var sawControl = false;
    while (node) {
      if (node.classList && node.classList.contains('repcontainer')) sawContainer = true;
      if (node.classList && node.classList.contains('repcontrol')) sawControl = true;
      if (sawContainer && sawControl) return true;
      if (node.tagName === 'FIELDSET' || !(node.classList && (node.classList.contains('repcontainer') || node.classList.contains('repcontrol')))) break;
      node = node.nextElementSibling;
    }
    return false;
  }
  function emulateRoll20RepeatingSections() {
    document.querySelectorAll('fieldset[class^="repeating_"], fieldset[class*=" repeating_"]').forEach(function (fieldset) {
      if (!isRepeatingFieldset(fieldset) || hasRoll20RepeatingRuntime(fieldset)) return;
      var container = document.createElement('div');
      container.className = 'repcontainer';
      var control = document.createElement('div');
      control.className = 'repcontrol';
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn repcontrol_edit';
      edit.textContent = 'Modify';
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn repcontrol_add';
      add.textContent = '+Add';
      control.append(edit, add);
      fieldset.after(container, control);
    });
  }
  function emulateRoll20ButtonClasses() {
    document.querySelectorAll('button[type="roll"], button[type="compendium"], .repcontrol button').forEach(function (button) {
      button.classList.add('btn');
      if (button.matches('button[type="roll"], button[type="compendium"]')) {
        button.classList.add('ui-draggable');
      }
    });
  }
  function applyRoll20Autocalc() {
    document.querySelectorAll('[data-r20-autocalc-value]').forEach(function (input) {
      input.value = input.getAttribute('data-r20-autocalc-value') || '';
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
    if (editBridgeEnabled) {
      try { e.preventDefault(); } catch (_) {}
      try { e.stopImmediatePropagation(); } catch (_) {}
      return false;
    }
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
  document.addEventListener('change', function (e) {
    if (settingAttrs) return;
    var target = e.target;
    if (!target || !target.matches || !target.matches('input[name^="attr_"], select[name^="attr_"], textarea[name^="attr_"]')) return;
    mirrorChangedSheetAttr(target);
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!editBridgeEnabled) return;
    if (!activeEditPointer || activeEditPointer.pointerId !== e.pointerId) return;
    pendingEditMove = {
      subjectNode: activeEditPointer.subjectNode,
      hitNode: hitNodeAt(e.clientX, e.clientY, e.target),
      pointer: {
        x: e.clientX,
        y: e.clientY,
        pointerId: e.pointerId,
        button: e.button,
        buttons: e.buttons
      }
    };
    if (editMoveFrame) return;
    editMoveFrame = window.requestAnimationFrame(function () {
      editMoveFrame = 0;
      var pending = pendingEditMove;
      pendingEditMove = null;
      if (pending) {
        postEditHit('pointermove', pending.subjectNode, pending.hitNode, pending.pointer);
      }
    });
  }, true);
  document.addEventListener('pointerdown', function (e) {
    if (!editBridgeEnabled) return;
    if (e.button !== 0) return;
    var subjectNode = blockNodeOf(e.target);
    if (!subjectNode) return;
    rollbackOptimisticFlowMove();
    clearValidatedFlowTarget();
    activeEditPointer = { pointerId: e.pointerId, subjectNode: subjectNode };
    try { subjectNode.setPointerCapture(e.pointerId); } catch (_) {}
    postEditHit('pointerdown', subjectNode, subjectNode, {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      button: e.button,
      buttons: e.buttons
    });
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
  }, true);
  document.addEventListener('pointerup', function (e) {
    if (!editBridgeEnabled) return;
    if (!activeEditPointer || activeEditPointer.pointerId !== e.pointerId) return;
    var subjectNode = activeEditPointer.subjectNode;
    if (editMoveFrame) window.cancelAnimationFrame(editMoveFrame);
    editMoveFrame = 0;
    pendingEditMove = null;
    var flowTarget = validatedFlowTarget;
    postEditHit('pointerup', subjectNode, hitNodeAt(e.clientX, e.clientY, e.target), {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      button: e.button,
      buttons: e.buttons
    });
    if (
      flowTarget
      && flowTarget.pointerId === e.pointerId
      && flowTarget.subjectBlockId === subjectNode.dataset.r20BlockId
    ) {
      // Capture the authored pointer-up geometry first. The visual move runs
      // immediately afterward, before the queued parent message is handled.
      optimisticFlowMove(flowTarget, true);
    }
    clearValidatedFlowTarget();
    try { subjectNode.releasePointerCapture(e.pointerId); } catch (_) {}
    activeEditPointer = null;
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
  }, true);
  document.addEventListener('pointercancel', function (e) {
    if (!editBridgeEnabled) return;
    if (!activeEditPointer || activeEditPointer.pointerId !== e.pointerId) return;
    var subjectNode = activeEditPointer.subjectNode;
    if (editMoveFrame) window.cancelAnimationFrame(editMoveFrame);
    editMoveFrame = 0;
    pendingEditMove = null;
    rollbackOptimisticFlowMove();
    clearValidatedFlowTarget();
    postEditHit('pointercancel', subjectNode, hitNodeAt(e.clientX, e.clientY, e.target), {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      button: e.button,
      buttons: e.buttons
    });
    try { subjectNode.releasePointerCapture(e.pointerId); } catch (_) {}
    activeEditPointer = null;
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
  }, true);
  document.addEventListener('dragover', function (e) {
    if (!editBridgeEnabled || !hasFriendlyWidgetPayload(e.dataTransfer)) return;
    try { e.preventDefault(); } catch (_) {}
    try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
    postWidgetDrag('dragover', e, null);
  }, true);
  document.addEventListener('dragleave', function (e) {
    if (!editBridgeEnabled || !hasFriendlyWidgetPayload(e.dataTransfer)) return;
    if (e.relatedTarget && document.documentElement.contains(e.relatedTarget)) return;
    postWidgetDrag('dragleave', e, null);
  }, true);
  document.addEventListener('drop', function (e) {
    if (!editBridgeEnabled || !hasFriendlyWidgetPayload(e.dataTransfer)) return;
    var payload = '';
    try { payload = e.dataTransfer.getData('application/x-r20-friendly-widget') || ''; } catch (_) {}
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
    postWidgetDrag('drop', e, payload);
  }, true);
  document.addEventListener('contextmenu', function (e) {
    if (!editBridgeEnabled) return;
    var node = blockNodeOf(e.target);
    if (!node || !node.dataset || !node.dataset.r20BlockId) return;
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
    try {
      parent.postMessage({
        type: 'r20:edit-context-menu',
        protocol: 1,
        bridgeId: editBridgeId,
        blockId: node.dataset.r20BlockId,
        pointer: { x: Number(e.clientX) || 0, y: Number(e.clientY) || 0 }
      }, '*');
    } catch (_) {}
  }, true);
  window.addEventListener('message', function (e) {
    if (e.source !== parent || !e.data) return;
    if (
      e.data.type === 'r20:edit-mode'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      setEditBridgeEnabled(e.data.enabled, e.data.selectedBlockId || null);
      return;
    }
    if (
      e.data.type === 'r20:edit-flow-target'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      rememberValidatedFlowTarget(e.data);
      return;
    }
    if (
      e.data.type === 'r20:edit-optimistic-flow'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      optimisticFlowMove(e.data, false);
      return;
    }
    if (
      e.data.type === 'r20:edit-optimistic-flow-finalize'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      finalizeOptimisticFlowMove(e.data);
      return;
    }
    if (
      e.data.type === 'r20:edit-apply'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      applyLivePatch(e.data);
      return;
    }
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
  emulateRoll20RepeatingSections();
  emulateRoll20ButtonClasses();
  applyRoll20Autocalc();
  installSheetWorkers();
  scheduleResize();
  try {
    parent.postMessage({ type: 'r20:edit-ready', protocol: 1, bridgeId: editBridgeId }, '*');
  } catch (e) {}
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

rolltemplate,
script {
  display: none !important;
  visibility: hidden !important;
  position: absolute !important;
  width: 0 !important;
  height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`;

const ROLL20_LEGACY_INPUT_STATE_CSS = `
.charsheet input[disabled],
.charsheet input[readonly],
.charsheet select[disabled] {
  background-color: rgba(255, 255, 255, 0);
  color: inherit;
}
`;

const ROLL20_PREVIEW_HIDDEN_CSS = `
rolltemplate,
script {
  display: none !important;
  visibility: hidden !important;
  position: absolute !important;
  width: 0 !important;
  height: 0 !important;
  min-width: 0 !important;
  min-height: 0 !important;
  max-width: 0 !important;
  max-height: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}
`;

function styleSourceChunk(source: string, css: string): string {
  return `\n/* r20-style-source:${source} */\n${css}\n`;
}

function roll20RendererModelCss(model: BuildDocOptions['roll20RendererModel']): string {
  if (model !== 'input-flow-27' && model !== 'input-flow-276') return '';
  const textInputHeight = model === 'input-flow-276' ? 27.6 : 27;
  return `
/* diagnostic Roll20 input/inline-flow renderer model; gated off by default */
.ui-dialog .charsheet .sheet-2colrow,
.ui-dialog .charsheet .sheet-3colrow {
  word-spacing: -0.75px;
}
.ui-dialog .charsheet .sheet-2colrow > .sheet-col,
.ui-dialog .charsheet .sheet-3colrow > .sheet-col {
  word-spacing: normal;
}
.ui-dialog .charsheet input[type="text"] {
  min-height: ${textInputHeight}px;
}
`;
}

function jsonScriptText(value: string | undefined): string {
  return JSON.stringify(value ?? '')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function sheetSourceKey(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `v1-${value.length.toString(36)}-${first.toString(36)}-${second.toString(36)}`;
}

function normalizeDocumentLanguage(value: string | undefined): string {
  const language = value?.trim() || 'en';
  return /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(language) ? language : 'en';
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
function buildSheetDocFromContract(
  opts: BuildDocOptions,
  contract: PreparedSheetRenderContract,
): string {
  const { legacyCssSanitize, roll20SandboxSanitize, previewCss } = contract;
  const roll20RendererModel = opts.roll20RendererModel ?? 'default';
  const darkMode = opts.darkMode === true;
  const layer = opts.previewLayer ?? 'all';
  const bodyInner = contract.bodyInner || (contract.hasAuthoredHtml ? '' : EMPTY_PLACEHOLDER);
  const htmlKey = sheetSourceKey(bodyInner);
  const documentLanguage = normalizeDocumentLanguage(opts.documentLanguage);

  return `<!doctype html>
<html lang="${documentLanguage}"${darkMode ? ' data-theme="dark"' : ''}>
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>시트 미리보기</title>
<!-- spec 25 + actual Roll20 probe: 실 Roll20 sandbox CSS (ground truth) → runtime overlay → user CSS -->
<style id="roll20-base">${roll20BaseIframeCss}</style>${darkMode ? `
<style id="roll20-base-dark">${roll20DarkmodeIframeCss}</style>` : ''}
<style id="roll20-dialog-open">${ROLL20_DIALOG_OPEN_CSS}</style>
${legacyCssSanitize ? `<style id="roll20-legacy-input-state">${ROLL20_LEGACY_INPUT_STATE_CSS}</style>` : ''}
<style id="r20-runtime">${runtimeCss}</style>
<style id="r20-layer-filter">${layerFilterCss()}</style>
<style id="r20-user">${previewCss}</style>
<style id="r20-renderer-model">${roll20RendererModelCss(roll20RendererModel)}</style>
<style id="r20-preview-hidden">${ROLL20_PREVIEW_HIDDEN_CSS}</style>
</head>
<body${darkMode ? ' data-theme="dark"' : ''} data-layer="${layer}" data-roll20-sandbox-sanitize="${roll20SandboxSanitize ? '1' : '0'}" data-roll20-renderer-model="${roll20RendererModel}" data-r20-html-key="${htmlKey}">
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all r20-preview-dialog" id="dialog-window" style="position:relative;display:block;width:100%;height:auto;overflow:visible;padding:0;">
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
<script type="application/json" id="__r20-i18n">${jsonScriptText(normalizeTranslationForRoll20(opts.i18n ?? ''))}</script>
<script>${PREVIEW_BRIDGE_SCRIPT}</script>
</body>
</html>`;
}

function buildSheetLivePatchFromContract(
  opts: BuildDocOptions,
  contract: PreparedSheetRenderContract,
): SheetLivePatch {
  const darkMode = opts.darkMode === true;
  const layer = opts.previewLayer ?? 'all';
  const roll20RendererModel = opts.roll20RendererModel ?? 'default';
  const html = contract.bodyInner || (contract.hasAuthoredHtml ? '' : EMPTY_PLACEHOLDER);
  return {
    html,
    htmlKey: sheetSourceKey(html),
    styles: {
      'roll20-base-dark': darkMode ? roll20DarkmodeIframeCss : '',
      'roll20-legacy-input-state': contract.legacyCssSanitize ? ROLL20_LEGACY_INPUT_STATE_CSS : '',
      'r20-layer-filter': layerFilterCss(),
      'r20-user': contract.previewCss,
      'r20-renderer-model': roll20RendererModelCss(roll20RendererModel),
    },
    i18n: normalizeTranslationForRoll20(opts.i18n ?? ''),
    darkMode,
    layer,
    roll20SandboxSanitize: contract.roll20SandboxSanitize,
    roll20RendererModel,
    documentLanguage: normalizeDocumentLanguage(opts.documentLanguage),
  };
}

/**
 * Build the persistent iframe document and its live-patch payload from one
 * prepared source contract. Large imported sheets otherwise repeat the same
 * prefix/sanitize/translation work for both outputs on every render toggle.
 */
export function buildSheetRenderBundle(
  opts: BuildDocOptions,
  config: { includeParts?: boolean } = {},
): SheetRenderBundle {
  const contract = prepareSheetRenderContract(opts);
  return {
    doc: buildSheetDocFromContract(opts, contract),
    livePatch: buildSheetLivePatchFromContract(opts, contract),
    parts: config.includeParts ? buildSheetPartsFromContract(opts, contract) : undefined,
  };
}

export function buildSheetDoc(opts: BuildDocOptions): string {
  return buildSheetDocFromContract(opts, prepareSheetRenderContract(opts));
}

export function buildSheetLivePatch(opts: BuildDocOptions): SheetLivePatch {
  return buildSheetLivePatchFromContract(opts, prepareSheetRenderContract(opts));
}

/**
 * Shadow DOM 모드용 — emit 결과를 (html, css) 두 파츠로 반환.
 * 동일한 sanitize / autoPrefix / runtimeCss / layerFilterCss 합성을 거치되,
 * doctype / body wrapper / postMessage bridge script 는 빼고 순수 인젝션 가능
 * 형태로 만든다. shadowMount 가 :host reset + container 박아주는 것을 가정.
 *
 * iframe 모드의 buildSheetDoc 과 시각 동일성 보장 — 같은 CSS 토큰 사용.
 */
function buildSheetPartsFromContract(
  opts: BuildDocOptions,
  contract: PreparedSheetRenderContract,
): SheetRenderParts {
  const { legacyCssSanitize, previewCss } = contract;
  const roll20RendererModel = opts.roll20RendererModel ?? 'default';
  const bodyInner = contract.bodyInner || (contract.hasAuthoredHtml ? '' : EMPTY_PLACEHOLDER);
  const documentLanguage = normalizeDocumentLanguage(opts.documentLanguage);

  // Shadow 안에서는 body 가 없음 → wrapper .charsheet 에 data-layer 박힘
  // layerFilterCss scope = '.charsheet' 로 selector 일관성 유지.
  // spec 25 + actual Roll20 probe: 실 Roll20 sandbox CSS (ground truth, :root→:host
  // rewrite) 먼저 → runtime overlay → user CSS.
  // user CSS 가 마지막 source order 라 동일 specificity 셀렉터에선 사용자 우선.
  const darkMode = opts.darkMode === true;
  const css = [
    styleSourceChunk('roll20-base', roll20BaseShadowCss),
    darkMode ? styleSourceChunk('roll20-darkmode', roll20DarkmodeShadowCss) : '',
    styleSourceChunk('roll20-dialog-context', ROLL20_DIALOG_OPEN_CSS),
    legacyCssSanitize ? styleSourceChunk('roll20-legacy-input-state', ROLL20_LEGACY_INPUT_STATE_CSS) : '',
    styleSourceChunk('app-preview-runtime', runtimeCss),
    styleSourceChunk('app-layer-filter', layerFilterCss('.charsheet')),
    styleSourceChunk('sheet-user-css', previewCss),
    styleSourceChunk('roll20-renderer-model', roll20RendererModelCss(roll20RendererModel)),
    styleSourceChunk('preview-hidden-runtime', ROLL20_PREVIEW_HIDDEN_CSS),
  ].join('\n');

  const html = `
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all r20-preview-dialog" id="dialog-window" lang="${documentLanguage}" style="position:relative;display:block;width:100%;height:auto;overflow:visible;padding:0;">
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

export function buildSheetParts(opts: BuildDocOptions): SheetRenderParts {
  return buildSheetPartsFromContract(opts, prepareSheetRenderContract(opts));
}

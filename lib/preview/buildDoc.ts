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
  roll20LegacySheetSurfaceCss,
} from './roll20_base';
import { isRoll20WorkerScript } from '../import/worker_source';
import { runtimeCss } from './runtime';
import {
  prepareSheetRenderContract,
  type PreparedSheetRenderContract,
  type Roll20CompatibilityMode,
} from './renderContract';
import {
  SHEET_CANVAS_MAX_WIDTH,
  SHEET_RENDER_MIN_HEIGHT,
} from './canvasDimensions';

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
  /** Content identity used by the parent bridge; never contains the payload itself. */
  sourceKey: string;
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

export interface SheetLiveBundle {
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
  var initialSheetRoot = document.querySelector('form.sheetform > .charactersheet.charsheet');
  var lastAppliedBlockCount = initialSheetRoot
    ? initialSheetRoot.querySelectorAll('[data-r20-block-id]').length
    : 0;
  var rootReplacementCount = 0;
  var structuralPatchCount = 0;
  var structuralPatchFallbackCount = 0;
  var initialPlaceholderReplacementCount = 0;
  var styleOnlyApplyCount = 0;
  var optimisticFlowMoveCount = 0;
  var optimisticFlowRollbackCount = 0;
  var optimisticFlowFastPatchCount = 0;
  var optimisticFlowCheck = '';
  var targetedHtmlPatchCount = 0;
  var targetedHtmlPatchCheck = '';
  var validatedFlowTarget = null;
  var optimisticFlowSnapshot = null;
  var optimisticFlowCommit = null;
  var optimisticEditMove = null;
  var optimisticEditResize = null;
  var optimisticEditNudge = null;
  var optimisticEditNudgeTimer = 0;
  var keyboardNudgeCount = 0;
  var selectedEditBlockIds = [];
  var pendingLivePatchChunks = null;
  // Parent retries an apply message for transport reliability. A delayed
  // retry or chunk from an older revision must never roll the iframe back to
  // stale HTML after a newer revision has already been accepted.
  var lastAppliedRevision = 0;
  var staleApplyDropCount = 0;
  var renderReadyGeneration = 0;
  var renderReadyTimer = 0;
  function blockNodeOf(node) {
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.r20BlockId) return node;
      node = node.parentNode;
    }
    return null;
  }
  function multiplyLinear(outer, inner) {
    return {
      a: outer.a * inner.a + outer.c * inner.b,
      b: outer.b * inner.a + outer.d * inner.b,
      c: outer.a * inner.c + outer.c * inner.d,
      d: outer.b * inner.c + outer.d * inner.d
    };
  }
  function individualLinearOf(style) {
    var rotation = { a: 1, b: 0, c: 0, d: 1 };
    var rotate = String(style.rotate || '').trim();
    if (rotate && rotate !== 'none') {
      var angleMatch = rotate.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)deg$/i);
      if (!angleMatch) return null;
      var radians = Number(angleMatch[1]) * Math.PI / 180;
      if (!Number.isFinite(radians)) return null;
      var cosine = Math.cos(radians);
      var sine = Math.sin(radians);
      rotation = { a: cosine, b: sine, c: -sine, d: cosine };
    }
    var scaling = { a: 1, b: 0, c: 0, d: 1 };
    var scale = String(style.scale || '').trim();
    if (scale && scale !== 'none') {
      var scaleParts = scale.split(/\s+/);
      if (scaleParts.length < 1 || scaleParts.length > 3) return null;
      var scaleX = Number(scaleParts[0]);
      var scaleY = scaleParts.length > 1 ? Number(scaleParts[1]) : scaleX;
      var scaleZ = scaleParts.length > 2 ? Number(scaleParts[2]) : 1;
      if (
        !Number.isFinite(scaleX)
        || !Number.isFinite(scaleY)
        || !Number.isFinite(scaleZ)
        || Math.abs(scaleZ - 1) > 0.000001
      ) return null;
      scaling = { a: scaleX, b: 0, c: 0, d: scaleY };
    }
    return multiplyLinear(rotation, scaling);
  }
  function ownLinearOf(style, includeTransform) {
    var zoom = parseFloat(style.zoom);
    if (!Number.isFinite(zoom) || zoom <= 0) zoom = 1;
    var own = { a: zoom, b: 0, c: 0, d: zoom };
    if (includeTransform && style.transform && style.transform !== 'none') {
      if (typeof DOMMatrixReadOnly !== 'function') return null;
      var matrix = new DOMMatrixReadOnly(style.transform);
      if (!matrix.is2D) return null;
      own = multiplyLinear({
        a: matrix.a,
        b: matrix.b,
        c: matrix.c,
        d: matrix.d
      }, own);
    }
    var individual = individualLinearOf(style);
    return individual ? multiplyLinear(individual, own) : null;
  }
  var linearTransformCache = new WeakMap();
  function resetLinearTransformCache() {
    linearTransformCache = new WeakMap();
  }
  function localToViewportOf(node) {
    if (!node || node.nodeType !== 1) return { a: 1, b: 0, c: 0, d: 1 };
    if (linearTransformCache.has(node)) return linearTransformCache.get(node);
    var parent = localToViewportOf(node.parentElement);
    if (!parent) {
      linearTransformCache.set(node, null);
      return null;
    }
    try {
      var style = window.getComputedStyle(node);
      var own = ownLinearOf(style, true);
      if (!own) return null;
      var result = multiplyLinear(parent, own);
      linearTransformCache.set(node, result);
      return result;
    } catch (e) {
      linearTransformCache.set(node, null);
      return null;
    }
  }
  function movementToViewportOf(node) {
    if (!node || node.nodeType !== 1) return { a: 1, b: 0, c: 0, d: 1 };
    var parent = localToViewportOf(node.parentElement);
    if (!parent) return null;
    try {
      var own = ownLinearOf(window.getComputedStyle(node), false);
      return own ? multiplyLinear(parent, own) : null;
    } catch (e) {
      return null;
    }
  }
  function invertViewportDelta(linear, x, y) {
    if (!linear) return { x: x, y: y };
    var determinant = linear.a * linear.d - linear.b * linear.c;
    if (!Number.isFinite(determinant) || Math.abs(determinant) <= 0.000001) {
      return { x: x, y: y };
    }
    return {
      x: (linear.d * x - linear.c * y) / determinant,
      y: (-linear.b * x + linear.a * y) / determinant
    };
  }
  function viewportOriginOf(node, rect, linear) {
    if (!linear) return { x: rect.left, y: rect.top };
    var width = Number(node.offsetWidth) || 0;
    var height = Number(node.offsetHeight) || 0;
    if (width <= 0 || height <= 0) return { x: rect.left, y: rect.top };
    var x1 = linear.a * width;
    var x2 = linear.c * height;
    var y1 = linear.b * width;
    var y2 = linear.d * height;
    return {
      x: rect.left - Math.min(0, x1, x2, x1 + x2),
      y: rect.top - Math.min(0, y1, y2, y1 + y2)
    };
  }
  function renderedTransformOf(node) {
    try {
      var transform = window.getComputedStyle(node).transform;
      return transform && transform !== 'none' ? transform : '';
    } catch (e) {
      return '';
    }
  }
  function parentFlowOf(node, nodeDisplay) {
    var parent = node ? node.parentElement : null;
    while (parent) {
      try {
        var style = window.getComputedStyle(parent);
        var display = String(style.display || '').toLowerCase();
        if (display === 'contents') {
          parent = parent.parentElement;
          continue;
        }
        var direction = String(style.direction || '').toLowerCase();
        var axis = 'y';
        var reverse = false;
        if (display.indexOf('flex') !== -1) {
          var flexDirection = String(style.flexDirection || 'row').toLowerCase();
          axis = flexDirection.indexOf('row') === 0 ? 'x' : 'y';
          reverse = flexDirection.indexOf('reverse') !== -1;
          if (axis === 'x' && direction === 'rtl') reverse = !reverse;
        } else if (display.indexOf('grid') !== -1) {
          var gridAutoFlow = String(style.gridAutoFlow || 'row').toLowerCase();
          axis = gridAutoFlow.indexOf('column') !== -1 ? 'y' : 'x';
          reverse = axis === 'x' && direction === 'rtl';
        } else if (display === 'table-row' || String(parent.tagName || '').toLowerCase() === 'tr') {
          axis = 'x';
          reverse = direction === 'rtl';
        } else if (String(nodeDisplay || '').toLowerCase().indexOf('inline') === 0) {
          axis = 'x';
          reverse = direction === 'rtl';
        }
        return { axis: axis, reverse: reverse };
      } catch (e) {
        return { axis: 'y', reverse: false };
      }
    }
    return { axis: 'y', reverse: false };
  }
  function geometryOf(node) {
    if (!node || !node.dataset || !node.dataset.r20BlockId) return null;
    var rect = node.getBoundingClientRect();
    var offsetParent = node.offsetParent;
    var offsetParentBlock = blockNodeOf(offsetParent);
    var offsetParentPosition = '';
    var position = '';
    var display = '';
    var computedWidth = NaN;
    var computedHeight = NaN;
    var scaleX = 1;
    var scaleY = 1;
    try {
      offsetParentPosition = offsetParent ? window.getComputedStyle(offsetParent).position : '';
      var computedStyle = window.getComputedStyle(node);
      position = computedStyle.position;
      display = computedStyle.display;
      computedWidth = parseFloat(computedStyle.width);
      computedHeight = parseFloat(computedStyle.height);
      var offsetWidth = Number(node.offsetWidth) || 0;
      var offsetHeight = Number(node.offsetHeight) || 0;
      if (offsetWidth > 0 && rect.width > 0) scaleX = rect.width / offsetWidth;
      if (offsetHeight > 0 && rect.height > 0) scaleY = rect.height / offsetHeight;
    } catch (e) {}
    var parentFlow = parentFlowOf(node, display);
    var linear = localToViewportOf(node);
    var geometry = {
      blockId: node.dataset.r20BlockId,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      offsetLeft: Number(node.offsetLeft) || 0,
      offsetTop: Number(node.offsetTop) || 0,
      scrollLeft: Number(node.scrollLeft) || 0,
      scrollTop: Number(node.scrollTop) || 0,
      clientLeft: Number(node.clientLeft) || 0,
      clientTop: Number(node.clientTop) || 0,
      position: position,
      tagName: String(node.tagName || '').toLowerCase(),
      display: display,
      parentFlowAxis: parentFlow.axis,
      parentFlowReverse: parentFlow.reverse,
      computedWidth: Number.isFinite(computedWidth) && computedWidth >= 0 ? computedWidth : undefined,
      computedHeight: Number.isFinite(computedHeight) && computedHeight >= 0 ? computedHeight : undefined,
      scaleX: Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1,
      scaleY: Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1,
      offsetParentBlockId: offsetParentBlock && offsetParentBlock.dataset
        ? offsetParentBlock.dataset.r20BlockId || null
        : null,
      offsetParentPosition: offsetParentPosition
    };
    if (linear) {
      geometry.localToViewport = linear;
      geometry.viewportOrigin = viewportOriginOf(node, rect, linear);
    }
    return geometry;
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
  function hitNodeAt(clientX, clientY, fallback, ignoredNode) {
    var previousPointerEvents = null;
    try {
      if (ignoredNode && ignoredNode.style) {
        previousPointerEvents = ignoredNode.style.pointerEvents;
        ignoredNode.style.pointerEvents = 'none';
      }
      return blockNodeOf(document.elementFromPoint(clientX, clientY)) || blockNodeOf(fallback);
    } catch (e) {
      return blockNodeOf(fallback);
    } finally {
      if (ignoredNode && ignoredNode.style && previousPointerEvents !== null) {
        ignoredNode.style.pointerEvents = previousPointerEvents;
      }
    }
  }
  function postEditHit(phase, subjectNode, hitNode, pointer) {
    if (!editBridgeEnabled) return;
    resetLinearTransformCache();
    var subject = geometryOf(subjectNode);
    if (!subject) return;
    var selectedNodes = activeEditPointer && activeEditPointer.selectedNodes
      ? activeEditPointer.selectedNodes
      : [];
    if (
      selectedEditBlockIds.length > 1
      && selectedEditBlockIds.indexOf(subject.blockId) >= 0
    ) {
      var stableSelectedNodes = activeDragSelectionNodes(selectedEditBlockIds);
      if (stableSelectedNodes.length > 1) selectedNodes = stableSelectedNodes;
    }
    var selection = selectedNodes.length
      ? selectedNodes.map(function (node) {
          var geometry = geometryOf(node);
          return geometry ? { geometry: geometry, hitPath: hitPathOf(node) } : null;
        }).filter(Boolean)
      : [];
    try {
      var message = {
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
        modifiers: {
          altKey: pointer.altKey === true,
          ctrlKey: pointer.ctrlKey === true,
          metaKey: pointer.metaKey === true,
          shiftKey: pointer.shiftKey === true,
        },
        subject: subject,
        hitPath: hitPathOf(hitNode),
        selection: selection.length > 1 ? selection : undefined
      };
      parent.postMessage(message, '*');
    } catch (e) {}
  }
  function hasFriendlyWidgetPayload(dataTransfer) {
    if (!dataTransfer || !dataTransfer.types) return false;
    for (var i = 0; i < dataTransfer.types.length; i += 1) {
      if (dataTransfer.types[i] === 'application/x-r20-friendly-widget') return true;
    }
    return false;
  }
  function hasBlockTypePayload(dataTransfer) {
    if (!dataTransfer || !dataTransfer.types) return false;
    for (var i = 0; i < dataTransfer.types.length; i += 1) {
      if (dataTransfer.types[i] === 'application/x-r20-block-type') return true;
    }
    return false;
  }
  function hasLayerPayload(dataTransfer) {
    if (!dataTransfer || !dataTransfer.types) return false;
    for (var i = 0; i < dataTransfer.types.length; i++) {
      if (dataTransfer.types[i] === 'application/x-r20-layer-block') return true;
    }
    return false;
  }
  function postWidgetDrag(phase, event, payload) {
    if (!editBridgeEnabled) return;
    resetLinearTransformCache();
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
  function postBlockTypeDrag(phase, event, blockType) {
    if (!editBridgeEnabled) return;
    resetLinearTransformCache();
    var hitNode = hitNodeAt(event.clientX, event.clientY, event.target);
    try {
      parent.postMessage({
        type: 'r20:block-type-drag',
        protocol: 1,
        bridgeId: editBridgeId,
        phase: phase,
        blockType: blockType || null,
        pointer: { x: Number(event.clientX) || 0, y: Number(event.clientY) || 0 },
        hitPath: hitPathOf(hitNode)
      }, '*');
    } catch (e) {}
  }
  function postLayerDrag(phase, event, blockId) {
    if (!editBridgeEnabled || !blockId) return;
    resetLinearTransformCache();
    var hitNode = hitNodeAt(event.clientX, event.clientY, event.target);
    var subject = document.querySelector('[data-r20-block-id="' + cssEscape(blockId) + '"]');
    try {
      parent.postMessage({
        type: 'r20:layer-drag',
        protocol: 1,
        bridgeId: editBridgeId,
        phase: phase,
        blockId: blockId,
        pointer: { x: Number(event.clientX) || 0, y: Number(event.clientY) || 0 },
        subject: geometryOf(subject),
        hitPath: hitPathOf(hitNode)
      }, '*');
    } catch (e) {}
  }
  function normalizeSelectedBlockIds(primary, selectedBlockIds) {
    var candidates = [];
    var out = [];
    if (typeof primary === 'string' && primary) candidates.push(primary);
    if (Array.isArray(selectedBlockIds)) {
      for (var i = 0; i < selectedBlockIds.length; i += 1) candidates.push(selectedBlockIds[i]);
    }
    for (var j = 0; j < candidates.length; j += 1) {
      var id = candidates[j];
      if (typeof id !== 'string' || !id || id.length > 256 || out.indexOf(id) >= 0) continue;
      out.push(id);
      if (out.length >= 128) break;
    }
    return out;
  }
  function setEditSelection(selectedBlockIds) {
    var previous = document.querySelectorAll('[data-r20-selected="1"]');
    for (var i = 0; i < previous.length; i += 1) previous[i].removeAttribute('data-r20-selected');
    var nextSelectedBlockIds = Array.isArray(selectedBlockIds) ? selectedBlockIds.slice(0, 128) : [];
    // React effects can deliver an older single-selection command after the
    // additive selection update. Keep a selected member's multi-selection
    // stable; a genuinely new block still resets it as expected.
    if (
      editBridgeEnabled
      && selectedEditBlockIds.length > 1
      && (
        nextSelectedBlockIds.length === 0
        || (
          nextSelectedBlockIds.length === 1
          && selectedEditBlockIds.indexOf(nextSelectedBlockIds[0]) >= 0
        )
      )
    ) {
      nextSelectedBlockIds = selectedEditBlockIds.slice(0, 128);
    }
    selectedEditBlockIds = nextSelectedBlockIds;
    if (
      optimisticEditNudge
      && optimisticEditNudge.selectionKey !== selectedEditBlockIds.slice().sort().join('\u0001')
    ) clearOptimisticEditNudge();
    if (activeEditPointer) {
      var nextSelectionKey = selectedEditBlockIds.join('\u0001');
      if (activeEditPointer.dragSelectionKey !== nextSelectionKey) {
        activeEditPointer.dragSelectionKey = '';
      }
    }
    if (activeEditPointer && selectedEditBlockIds.length > 1) {
      activeEditPointer.dragSelectionIds = selectedEditBlockIds.slice(0, 128);
    }
    for (var j = 0; j < selectedEditBlockIds.length; j += 1) {
      var selected = document.querySelector('[data-r20-block-id="' + cssEscape(selectedEditBlockIds[j]) + '"]');
      if (selected) selected.setAttribute('data-r20-selected', '1');
    }
    syncActiveEditSelection();
  }
  function selectedEditNodes(subjectNode) {
    var subjectId = subjectNode && subjectNode.dataset ? subjectNode.dataset.r20BlockId : '';
    var markedNodes = Array.prototype.slice.call(document.querySelectorAll('[data-r20-selected="1"]'));
    var markedIds = markedNodes.map(function (node) {
      return node.dataset && node.dataset.r20BlockId ? node.dataset.r20BlockId : '';
    }).filter(Boolean);
    var markedSelection = markedNodes.length > 1 && markedIds.indexOf(subjectId) >= 0;
    var isMulti = markedSelection || (selectedEditBlockIds.length > 1
      && subjectId
      && selectedEditBlockIds.indexOf(subjectId) >= 0);
    var selected = !isMulti
      ? (subjectNode ? [subjectNode] : [])
      : selectedNodesForIds(markedSelection ? markedIds : selectedEditBlockIds);
    return selected;
  }
  function selectedNodesForIds(sourceIds) {
    var selectedSet = {};
    var candidates = [];
    for (var i = 0; i < sourceIds.length; i += 1) {
      selectedSet[sourceIds[i]] = true;
    }
    // Block ids can contain punctuation that differs across browser CSS.escape
    // implementations. Read the already-rendered DOM attribute instead of
    // rebuilding a selector from an untrusted id.
    var renderedNodes = document.querySelectorAll('[data-r20-block-id]');
    for (var renderedIndex = 0; renderedIndex < renderedNodes.length; renderedIndex += 1) {
      var renderedNode = renderedNodes[renderedIndex];
      var renderedId = renderedNode.dataset && renderedNode.dataset.r20BlockId;
      if (renderedId && selectedSet[renderedId]) candidates.push(renderedNode);
    }
    var topLevel = candidates.filter(function (node) {
      var parent = node.parentNode;
      while (parent && parent !== document.body) {
        var parentId = parent.dataset && parent.dataset.r20BlockId;
        if (parentId && selectedSet[parentId]) return false;
        parent = parent.parentNode;
      }
      return true;
    });
    return topLevel;
  }
  function activeDragSelectionNodes(sourceIds) {
    var selectionKey = sourceIds.join('\u0001');
    var existing = activeEditPointer && activeEditPointer.selectedNodes
      ? activeEditPointer.selectedNodes
      : [];
    var reusable = activeEditPointer
      && activeEditPointer.dragSelectionKey === selectionKey
      && existing.length > 0
      && existing.every(function (selected) {
        return selected.node && selected.node.isConnected;
      });
    if (reusable) return existing.map(function (selected) { return selected.node; });
    var resolved = selectedNodesForIds(sourceIds);
    if (activeEditPointer) activeEditPointer.dragSelectionKey = selectionKey;
    return resolved;
  }
  function syncActiveEditSelection() {
    if (!activeEditPointer || !activeEditPointer.subjectNode) return;
    resetLinearTransformCache();
    var existing = activeEditPointer.selectedNodes || [];
    var dragSelectionIds = activeEditPointer.dragSelectionIds || [];
    var nodes;
    if (dragSelectionIds.length > 1) {
      nodes = activeDragSelectionNodes(dragSelectionIds);
    } else {
      nodes = selectedEditNodes(activeEditPointer.subjectNode);
    }
    if (!nodes.length) return;
    var orderedNodes = existing
      .filter(function (selected) { return selected.node && selected.node.isConnected; })
      .map(function (selected) { return selected.node; });
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      if (orderedNodes.indexOf(nodes[nodeIndex]) < 0) orderedNodes.push(nodes[nodeIndex]);
    }
    var next = orderedNodes.map(function (node) {
      var current = existing.find(function (selected) { return selected.node === node; });
      if (current) return current;
      var created = {
        node: node,
        originTransform: node.style.transform,
        originRenderedTransform: renderedTransformOf(node),
        movementTransform: movementToViewportOf(node),
        originTransition: node.style.transition,
        originWillChange: node.style.willChange,
      };
      node.style.transition = 'none';
      node.style.willChange = 'transform';
      return created;
    });
    activeEditPointer.selectedNodes = next;
    optimisticEditMove = activeEditPointer;
    if (Number.isFinite(activeEditPointer.lastX) && Number.isFinite(activeEditPointer.lastY)) {
      applyOptimisticEditMove({ x: activeEditPointer.lastX, y: activeEditPointer.lastY });
    }
  }
  function setEditBridgeEnabled(enabled, selectedBlockId, selectedBlockIds) {
    editBridgeEnabled = enabled === true;
    document.body.setAttribute('data-r20-edit-mode', editBridgeEnabled ? '1' : '0');
    var normalizedSelectedBlockIds = normalizeSelectedBlockIds(selectedBlockId, selectedBlockIds);
    setEditSelection(editBridgeEnabled ? normalizedSelectedBlockIds : []);
    if (!editBridgeEnabled) {
      if (editMoveFrame) window.cancelAnimationFrame(editMoveFrame);
      editMoveFrame = 0;
      pendingEditMove = null;
      activeEditPointer = null;
      clearOptimisticEditMove();
      clearOptimisticEditResize();
      clearOptimisticEditNudge();
      rollbackOptimisticFlowMove();
      clearValidatedFlowTarget();
    }
    if (!editBridgeEnabled || !normalizedSelectedBlockIds.length) return;
    var selected = document.querySelector('[data-r20-block-id="' + cssEscape(normalizedSelectedBlockIds[0]) + '"]');
    if (selected) postEditHit('measure', selected, selected, {
      x: 0, y: 0, pointerId: -1, button: -1, buttons: 0
    });
  }
  function workerSourceOf(script) {
    if (!script) return '';
    var encoded = script.getAttribute('data-r20-worker-source');
    return encoded === null ? (script.textContent || '') : encoded;
  }
  function workerSourceText(root) {
    if (!root) return '';
    var scripts = root.querySelectorAll('script[type="text/worker"]');
    var out = [];
    for (var i = 0; i < scripts.length; i++) out.push(workerSourceOf(scripts[i]));
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
    // Element identity is keyed so form/runtime state survives a structural
    // patch. Text and comment nodes have no children to reconcile, so update
    // their value explicitly or an inline text edit can leave stale pixels in
    // the persistent iframe until a full replacement occurs.
    if (current.nodeType === 3 || current.nodeType === 8) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return current;
    }
    if (current.nodeType === 1) syncElementAttributes(current, next);
    reconcileChildren(current, next);
    return current;
  }
  function reconcileChildren(parent, nextParent) {
    var currentChildren = Array.prototype.slice.call(parent.childNodes);
    var used = [];
    var cursor = 0;
    var nextChildren = Array.prototype.slice.call(nextParent.childNodes);
    // Keyed nodes are the normal path for imported sheet elements. Build the
    // lookup once so a large structural patch does not scan every current
    // sibling for every next sibling.
    var keyedIndexes = Object.create(null);
    var keyedCursors = Object.create(null);
    for (var keyedIndex = 0; keyedIndex < currentChildren.length; keyedIndex += 1) {
      var currentKey = keyedBlockId(currentChildren[keyedIndex]);
      if (!currentKey) continue;
      if (!keyedIndexes[currentKey]) keyedIndexes[currentKey] = [];
      keyedIndexes[currentKey].push(keyedIndex);
    }
    for (var i = 0; i < nextChildren.length; i += 1) {
      var nextChild = nextChildren[i];
      var nextKey = keyedBlockId(nextChild);
      var matchIndex = -1;
      if (nextKey) {
        var keyedCandidates = keyedIndexes[nextKey] || [];
        var keyedCursor = keyedCursors[nextKey] || 0;
        while (keyedCursor < keyedCandidates.length && used[keyedCandidates[keyedCursor]]) {
          keyedCursor += 1;
        }
        if (keyedCursor < keyedCandidates.length) {
          matchIndex = keyedCandidates[keyedCursor];
          keyedCursors[nextKey] = keyedCursor + 1;
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
      var currentAtIndex = parent.childNodes[i] || null;
      if (nextNode !== currentAtIndex) {
        parent.insertBefore(nextNode, currentAtIndex);
        // morphNode returns a clone when the tag/key shape changed. Remove the
        // old matched node after inserting the replacement; otherwise the old
        // node is marked used and would survive as a duplicate.
        if (currentChild && nextNode !== currentChild && currentChild.parentNode === parent) {
          currentChild.remove();
        }
      }
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
      reconcileChildren(document.querySelector('form.sheetform > .charactersheet.charsheet'), template.content);
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
  function normalizedFlowSubjectIds(data) {
    if (!data || typeof data !== 'object') return [];
    var source = Array.isArray(data.subjectBlockIds)
      ? data.subjectBlockIds
      : [data.subjectBlockId];
    var seen = Object.create(null);
    var ids = [];
    for (var index = 0; index < source.length && ids.length < 128; index += 1) {
      var blockId = source[index];
      if (typeof blockId !== 'string' || blockId.length < 1 || blockId.length > 256) return [];
      if (seen[blockId]) continue;
      seen[blockId] = true;
      ids.push(blockId);
    }
    return ids;
  }
  function sameFlowSubjectIds(leftData, rightData) {
    var left = normalizedFlowSubjectIds(leftData);
    var right = normalizedFlowSubjectIds(rightData);
    if (!left.length || left.length !== right.length) return false;
    for (var index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }
  function rememberValidatedFlowTarget(data) {
    clearValidatedFlowTarget();
    if (!data || !Number.isInteger(data.pointerId)) return false;
    if (typeof data.subjectBlockId !== 'string') return false;
    if (data.subjectBlockId.length < 1 || data.subjectBlockId.length > 256) return false;
    var subjectBlockIds = normalizedFlowSubjectIds(data);
    if (!subjectBlockIds.length || subjectBlockIds.indexOf(data.subjectBlockId) < 0) return false;
    if (data.placement !== 'inside' && data.placement !== 'before' && data.placement !== 'after') {
      return false;
    }
    validatedFlowTarget = {
      pointerId: data.pointerId,
      subjectBlockId: data.subjectBlockId,
      subjectBlockIds: subjectBlockIds,
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
    var snapshots = optimisticFlowSnapshot;
    optimisticFlowSnapshot = null;
    if (!Array.isArray(snapshots) || !snapshots.length) return false;
    var restored = false;
    try {
      for (var index = snapshots.length - 1; index >= 0; index -= 1) {
        var snapshot = snapshots[index];
        if (!snapshot || !snapshot.subject || !snapshot.parent) continue;
        if (!snapshot.subject.isConnected || !snapshot.parent.isConnected) continue;
        var anchor = snapshot.nextSibling && snapshot.nextSibling.parentNode === snapshot.parent
          ? snapshot.nextSibling
          : null;
        snapshot.parent.insertBefore(snapshot.subject, anchor);
        restored = true;
      }
      if (!restored) return false;
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
  function clearOptimisticEditMove(moveOverride) {
    var move = moveOverride || optimisticEditMove;
    if (move === optimisticEditMove) optimisticEditMove = null;
    if (!move || !move.selectedNodes || !move.selectedNodes.length) return false;
    for (var i = 0; i < move.selectedNodes.length; i += 1) {
      var selected = move.selectedNodes[i];
      if (!selected.node || !selected.node.isConnected) continue;
      selected.node.style.transform = selected.originTransform;
      selected.node.style.transition = selected.originTransition;
      selected.node.style.willChange = selected.originWillChange;
    }
    return true;
  }
  function inlinePropertySnapshot(node, property) {
    return {
      value: node.style.getPropertyValue(property),
      priority: node.style.getPropertyPriority(property)
    };
  }
  function restoreInlineProperty(node, property, snapshot) {
    if (!snapshot || !snapshot.value) {
      node.style.removeProperty(property);
      return;
    }
    node.style.setProperty(property, snapshot.value, snapshot.priority || '');
  }
  function clearOptimisticEditNudge() {
    if (optimisticEditNudgeTimer) window.clearTimeout(optimisticEditNudgeTimer);
    optimisticEditNudgeTimer = 0;
    var nudge = optimisticEditNudge;
    optimisticEditNudge = null;
    document.body.removeAttribute('data-r20-keyboard-nudge-active');
    if (!nudge || !nudge.selectedNodes) return false;
    for (var i = 0; i < nudge.selectedNodes.length; i += 1) {
      var selected = nudge.selectedNodes[i];
      if (!selected.node || !selected.node.isConnected) continue;
      Object.keys(selected.properties).forEach(function (property) {
        restoreInlineProperty(selected.node, property, selected.properties[property]);
      });
    }
    scheduleResize();
    return true;
  }
  function applyKeyboardNudge(deltaX, deltaY) {
    if (
      !editBridgeEnabled
      || activeEditPointer
      || optimisticEditResize
      || !Number.isFinite(deltaX)
      || !Number.isFinite(deltaY)
      || Math.abs(deltaX) > 10
      || Math.abs(deltaY) > 10
      || (deltaX === 0 && deltaY === 0)
    ) return false;
    resetLinearTransformCache();
    var nodes = selectedNodesForIds(selectedEditBlockIds);
    if (!nodes.length || nodes.length !== selectedEditBlockIds.length) return false;
    var selectionKey = nodes.map(function (node) {
      return node.dataset && node.dataset.r20BlockId ? node.dataset.r20BlockId : '';
    }).filter(Boolean).sort().join('\u0001');
    if (!selectionKey) return false;

    var selection = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var geometry = geometryOf(nodes[i]);
      if (!geometry || String(geometry.position).toLowerCase() !== 'absolute') return false;
      selection.push({ geometry: geometry, hitPath: hitPathOf(nodes[i]) });
    }
    if (!optimisticEditNudge || optimisticEditNudge.selectionKey !== selectionKey) {
      clearOptimisticEditNudge();
      optimisticEditNudge = {
        selectionKey: selectionKey,
        selectedNodes: nodes.map(function (node) {
          var properties = {};
          ['left', 'top', 'right', 'bottom', 'transition', 'will-change'].forEach(function (property) {
            properties[property] = inlinePropertySnapshot(node, property);
          });
          return { node: node, properties: properties };
        })
      };
    }

    var changed = false;
    for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      var current = selection[nodeIndex].geometry;
      var nextLeft = Math.max(0, Math.round(current.offsetLeft + deltaX));
      var nextTop = Math.max(0, Math.round(current.offsetTop + deltaY));
      if (nextLeft === current.offsetLeft && nextTop === current.offsetTop) continue;
      var node = nodes[nodeIndex];
      node.style.setProperty('left', nextLeft + 'px', 'important');
      node.style.setProperty('top', nextTop + 'px', 'important');
      node.style.setProperty('right', 'auto', 'important');
      node.style.setProperty('bottom', 'auto', 'important');
      node.style.setProperty('transition', 'none', 'important');
      node.style.setProperty('will-change', 'left, top', 'important');
      changed = true;
    }
    if (!changed) {
      clearOptimisticEditNudge();
      return false;
    }

    keyboardNudgeCount += 1;
    document.body.setAttribute('data-r20-keyboard-nudge-active', '1');
    document.body.setAttribute('data-r20-keyboard-nudge-count', String(keyboardNudgeCount));
    document.body.setAttribute(
      'data-r20-last-keyboard-nudge-epoch',
      String(window.performance.timeOrigin + window.performance.now())
    );
    if (optimisticEditNudgeTimer) window.clearTimeout(optimisticEditNudgeTimer);
    optimisticEditNudgeTimer = window.setTimeout(clearOptimisticEditNudge, 1500);
    scheduleResize();
    try {
      parent.postMessage({
        type: 'r20:edit-nudge',
        protocol: 1,
        bridgeId: editBridgeId,
        deltaX: deltaX,
        deltaY: deltaY,
        selection: selection
      }, '*');
    } catch (error) {
      clearOptimisticEditNudge();
      return false;
    }
    return true;
  }
  function clearOptimisticEditResize() {
    var resize = optimisticEditResize;
    optimisticEditResize = null;
    document.body.removeAttribute('data-r20-resize-active');
    document.body.removeAttribute('data-r20-resize-committed');
    if (!resize || !resize.node || !resize.node.isConnected) return false;
    Object.keys(resize.properties).forEach(function (property) {
      restoreInlineProperty(resize.node, property, resize.properties[property]);
    });
    scheduleResize();
    return true;
  }
  function validResizeCoordinate(value, allowNegative) {
    return typeof value === 'number'
      && Number.isFinite(value)
      && Math.abs(value) <= 10000000
      && (allowNegative || value >= 0);
  }
  function applyOptimisticEditResize(data) {
    if (!data || typeof data.blockId !== 'string') return false;
    if (data.blockId.length < 1 || data.blockId.length > 256) return false;
    var hasWidth = validResizeCoordinate(data.width, false);
    var hasHeight = validResizeCoordinate(data.height, false);
    var hasLeft = validResizeCoordinate(data.left, true);
    var hasTop = validResizeCoordinate(data.top, true);
    if (!hasWidth && !hasHeight && !hasLeft && !hasTop) return false;
    var node = document.querySelector('[data-r20-block-id="' + cssEscape(data.blockId) + '"]');
    if (!node || !node.style) return false;
    if (!optimisticEditResize || optimisticEditResize.node !== node) {
      clearOptimisticEditResize();
      var properties = {};
      ['width', 'height', 'left', 'top', 'right', 'bottom', 'transition', 'will-change'].forEach(function (property) {
        properties[property] = inlinePropertySnapshot(node, property);
      });
      optimisticEditResize = {
        node: node,
        blockId: data.blockId,
        properties: properties,
        committed: false
      };
    }
    if (hasWidth) node.style.setProperty('width', data.width + 'px', 'important');
    if (hasHeight) node.style.setProperty('height', data.height + 'px', 'important');
    if (hasLeft) {
      node.style.setProperty('left', data.left + 'px', 'important');
      node.style.setProperty('right', 'auto', 'important');
    }
    if (hasTop) {
      node.style.setProperty('top', data.top + 'px', 'important');
      node.style.setProperty('bottom', 'auto', 'important');
    }
    node.style.setProperty('transition', 'none', 'important');
    node.style.setProperty('will-change', 'width, height, left, top', 'important');
    document.body.setAttribute('data-r20-resize-active', data.blockId);
    document.body.removeAttribute('data-r20-resize-committed');
    scheduleResize();
    return true;
  }
  function finalizeOptimisticEditResize(data) {
    if (
      !optimisticEditResize
      || !data
      || data.blockId !== optimisticEditResize.blockId
      || data.committed !== true
    ) {
      clearOptimisticEditResize();
      return;
    }
    optimisticEditResize.committed = true;
    document.body.setAttribute('data-r20-resize-committed', '1');
  }
  function applyOptimisticEditMove(pointer) {
    var move = optimisticEditMove;
    if (!move || !move.selectedNodes || !move.selectedNodes.length || !pointer) return false;
    var dx = Number(pointer.x) - move.originX;
    var dy = Number(pointer.y) - move.originY;
    for (var i = 0; i < move.selectedNodes.length; i += 1) {
      var selected = move.selectedNodes[i];
      if (!selected.node || !selected.node.isConnected) continue;
      if (dx === 0 && dy === 0) {
        selected.node.style.transform = selected.originTransform;
        continue;
      }
      var localDelta = invertViewportDelta(selected.movementTransform, dx, dy);
      var base = selected.originRenderedTransform && selected.originRenderedTransform !== 'none'
        ? ' ' + selected.originRenderedTransform
        : '';
      selected.node.style.transform = 'translate3d(' + localDelta.x + 'px, ' + localDelta.y + 'px, 0)' + base;
    }
    return true;
  }
  function postLivePatchAck(revision) {
    try {
      parent.postMessage({
        type: 'r20:edit-applied',
        protocol: 1,
        bridgeId: editBridgeId,
        revision: revision,
        blockCount: lastAppliedBlockCount
      }, '*');
    } catch (e) {}
  }
  function finalizeOptimisticFlowMove(data) {
    if (data && data.committed === true) {
      optimisticFlowSnapshot = null;
      optimisticFlowCommit = validOptimisticFlowCommit(data) ? data : null;
      optimisticFlowCheck = optimisticFlowCommit ? 'commit-received' : 'commit-invalid';
    } else {
      rollbackOptimisticFlowMove();
      clearOptimisticEditMove();
      optimisticFlowCommit = null;
      optimisticFlowCheck = 'commit-rejected';
    }
    clearValidatedFlowTarget();
  }
  function validOptimisticFlowCommit(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.subjectBlockId !== 'string' || data.subjectBlockId.length < 1 || data.subjectBlockId.length > 256) return false;
    var subjectBlockIds = normalizedFlowSubjectIds(data);
    if (!subjectBlockIds.length || subjectBlockIds.indexOf(data.subjectBlockId) < 0) return false;
    if (data.placement !== 'inside' && data.placement !== 'before' && data.placement !== 'after') return false;
    if (data.placement === 'inside') {
      return typeof data.containerBlockId === 'string'
        && data.containerBlockId.length > 0
        && data.containerBlockId.length <= 256;
    }
    return typeof data.siblingBlockId === 'string'
      && data.siblingBlockId.length > 0
      && data.siblingBlockId.length <= 256;
  }
  function canApplyOptimisticFlowCommit(data) {
    if (!validOptimisticFlowCommit(data)) {
      optimisticFlowCheck = 'payload-invalid';
      return false;
    }
    if (!optimisticFlowCommit) {
      optimisticFlowCheck = 'commit-missing';
      return false;
    }
    if (
      data.subjectBlockId !== optimisticFlowCommit.subjectBlockId
      || !sameFlowSubjectIds(data, optimisticFlowCommit)
      || data.placement !== optimisticFlowCommit.placement
      || (data.containerBlockId || null) !== (optimisticFlowCommit.containerBlockId || null)
      || (data.siblingBlockId || null) !== (optimisticFlowCommit.siblingBlockId || null)
    ) {
      optimisticFlowCheck = 'commit-mismatch';
      return false;
    }
    var subjectBlockIds = normalizedFlowSubjectIds(data);
    var subjects = subjectBlockIds.map(function (blockId) {
      return document.querySelector('[data-r20-block-id="' + cssEscape(blockId) + '"]');
    });
    if (subjects.some(function (subject) { return !subject; })) {
      optimisticFlowCheck = 'subject-missing';
      return false;
    }
    if (data.placement === 'inside') {
      var container = document.querySelector('[data-r20-block-id="' + cssEscape(data.containerBlockId) + '"]');
      var nested = Boolean(container && subjects.every(function (subject) {
        return subject.parentElement === container;
      }));
      for (var insideIndex = 1; nested && insideIndex < subjects.length; insideIndex += 1) {
        nested = subjects[insideIndex - 1].nextElementSibling === subjects[insideIndex];
      }
      nested = nested && subjects[subjects.length - 1].nextElementSibling === null;
      optimisticFlowCheck = nested ? 'accepted' : 'inside-mismatch';
      return nested;
    }
    var sibling = document.querySelector('[data-r20-block-id="' + cssEscape(data.siblingBlockId) + '"]');
    if (!sibling || subjects.some(function (subject) {
      return subject.parentElement !== sibling.parentElement;
    })) {
      optimisticFlowCheck = 'sibling-mismatch';
      return false;
    }
    var contiguous = true;
    for (var siblingIndex = 1; siblingIndex < subjects.length; siblingIndex += 1) {
      if (subjects[siblingIndex - 1].nextElementSibling !== subjects[siblingIndex]) {
        contiguous = false;
        break;
      }
    }
    var ordered = data.placement === 'before'
      ? contiguous && subjects[subjects.length - 1].nextElementSibling === sibling
      : contiguous && sibling.nextElementSibling === subjects[0];
    optimisticFlowCheck = ordered ? 'accepted' : 'order-mismatch';
    return ordered;
  }
  function optimisticFlowMove(data, captureSnapshot) {
    if (!validOptimisticFlowCommit(data)) return false;
    var subjectBlockIds = normalizedFlowSubjectIds(data);
    var subjects = subjectBlockIds.map(function (blockId) {
      return document.querySelector('[data-r20-block-id="' + cssEscape(blockId) + '"]');
    });
    if (subjects.some(function (subject) { return !subject; })) return false;
    var destinationParent = null;
    var beforeNode = null;
    var alreadyPlaced = false;
    try {
      if (data.placement === 'inside' && typeof data.containerBlockId === 'string') {
        var container = document.querySelector(
          '[data-r20-block-id="' + cssEscape(data.containerBlockId) + '"]'
        );
        if (!container || subjects.some(function (subject) {
          return container === subject || subject.contains(container);
        })) return false;
        destinationParent = container;
        alreadyPlaced = subjects.every(function (subject) { return subject.parentNode === container; });
        for (var insideIndex = 1; alreadyPlaced && insideIndex < subjects.length; insideIndex += 1) {
          alreadyPlaced = subjects[insideIndex - 1].nextElementSibling === subjects[insideIndex];
        }
        alreadyPlaced = alreadyPlaced && subjects[subjects.length - 1].nextElementSibling === null;
      } else if (
        (data.placement === 'before' || data.placement === 'after')
        && typeof data.siblingBlockId === 'string'
      ) {
        var sibling = document.querySelector(
          '[data-r20-block-id="' + cssEscape(data.siblingBlockId) + '"]'
        );
        if (!sibling || !sibling.parentNode || subjects.some(function (subject) {
          return sibling === subject || subject.contains(sibling);
        })) return false;
        destinationParent = sibling.parentNode;
        beforeNode = data.placement === 'before' ? sibling : sibling.nextSibling;
        alreadyPlaced = subjects.every(function (subject) {
          return subject.parentNode === destinationParent;
        });
        for (var siblingIndex = 1; alreadyPlaced && siblingIndex < subjects.length; siblingIndex += 1) {
          alreadyPlaced = subjects[siblingIndex - 1].nextElementSibling === subjects[siblingIndex];
        }
        alreadyPlaced = alreadyPlaced && (data.placement === 'before'
          ? subjects[subjects.length - 1].nextElementSibling === sibling
          : sibling.nextElementSibling === subjects[0]);
      } else {
        return false;
      }
      if (alreadyPlaced) return true;
      if (captureSnapshot === true && !optimisticFlowSnapshot) {
        optimisticFlowSnapshot = subjects.map(function (subject) {
          return {
            subject: subject,
            parent: subject.parentNode,
            nextSibling: subject.nextSibling
          };
        });
      }
      for (var subjectIndex = 0; subjectIndex < subjects.length; subjectIndex += 1) {
        destinationParent.insertBefore(subjects[subjectIndex], beforeNode);
      }
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
  function decodeHtmlAttribute(value) {
    if (value === null) return null;
    var textarea = document.createElement('textarea');
    textarea.innerHTML = String(value);
    return textarea.value;
  }
  function stylePropertyNames(style) {
    var names = [];
    for (var index = 0; index < style.length; index += 1) {
      var name = style.item(index);
      if (name) names.push(name);
    }
    return names;
  }
  function styleHasProperty(style, property) {
    for (var index = 0; index < style.length; index += 1) {
      if (style.item(index) === property) return true;
    }
    return false;
  }
  function parsedInlineStyle(value) {
    var probe = document.createElement('div');
    var decoded = decodeHtmlAttribute(value);
    if (decoded !== null) probe.setAttribute('style', decoded);
    return probe.style;
  }
  function prepareRuntimeStyle(node, beforeStyleText, nextStyleText) {
    var beforeStyle = parsedInlineStyle(beforeStyleText);
    var nextStyle = parsedInlineStyle(nextStyleText);
    var beforeNames = stylePropertyNames(beforeStyle);
    var currentNames = stylePropertyNames(node.style);
    var transientProperties = {
      transform: true,
      transition: true,
      'will-change': true
    };
    var runtime = [];
    for (var index = 0; index < currentNames.length; index += 1) {
      var property = currentNames[index];
      var isTransient = transientProperties[property] === true;
      var existedBefore = beforeNames.indexOf(property) >= 0;
      if (
        existedBefore
        && !isTransient
        && (
          node.style.getPropertyValue(property) !== beforeStyle.getPropertyValue(property)
          || node.style.getPropertyPriority(property) !== beforeStyle.getPropertyPriority(property)
        )
      ) return null;
      if ((isTransient || !existedBefore) && !styleHasProperty(nextStyle, property)) {
        runtime.push({
          property: property,
          value: node.style.getPropertyValue(property),
          priority: node.style.getPropertyPriority(property)
        });
      }
    }
    for (var beforeIndex = 0; beforeIndex < beforeNames.length; beforeIndex += 1) {
      var beforeProperty = beforeNames[beforeIndex];
      if (transientProperties[beforeProperty] === true) continue;
      if (!styleHasProperty(node.style, beforeProperty)) return null;
    }
    return runtime;
  }
  function runtimeClassNames(node, beforeClassName) {
    var authored = beforeClassName ? beforeClassName.split(/\s+/).filter(Boolean) : [];
    var runtime = [];
    for (var index = 0; index < node.classList.length; index += 1) {
      var className = node.classList.item(index);
      if (className && authored.indexOf(className) < 0) runtime.push(className);
    }
    return runtime;
  }
  function validateTargetedHtmlPatch(plan, nextHtmlKey) {
    if (!plan || typeof plan !== 'object') {
      targetedHtmlPatchCheck = 'payload-missing';
      return null;
    }
    if (plan.baseHtmlKey !== lastAppliedHtmlKey || plan.nextHtmlKey !== nextHtmlKey) {
      targetedHtmlPatchCheck = 'html-key-mismatch';
      return null;
    }
    if (!Array.isArray(plan.patches) || plan.patches.length < 1 || plan.patches.length > 128) {
      targetedHtmlPatchCheck = 'patch-count-invalid';
      return null;
    }
    var seen = {};
    var prepared = [];
    for (var index = 0; index < plan.patches.length; index += 1) {
      var patch = plan.patches[index];
      if (!patch || typeof patch !== 'object') {
        targetedHtmlPatchCheck = 'patch-invalid';
        return null;
      }
      if (
        typeof patch.blockId !== 'string'
        || patch.blockId.length < 1
        || patch.blockId.length > 256
        || seen[patch.blockId]
        || typeof patch.tagName !== 'string'
        || !/^[a-z][a-z0-9-]{0,63}$/.test(patch.tagName)
      ) {
        targetedHtmlPatchCheck = 'identity-invalid';
        return null;
      }
      var fields = [
        patch.beforeClassName,
        patch.beforeStyleText,
        patch.className,
        patch.styleText
      ];
      for (var fieldIndex = 0; fieldIndex < fields.length; fieldIndex += 1) {
        if (fields[fieldIndex] !== null && typeof fields[fieldIndex] !== 'string') {
          targetedHtmlPatchCheck = 'attribute-invalid';
          return null;
        }
        if (typeof fields[fieldIndex] === 'string' && fields[fieldIndex].length > 1000000) {
          targetedHtmlPatchCheck = 'attribute-too-large';
          return null;
        }
      }
      var node = document.querySelector(
        '[data-r20-block-id="' + cssEscape(patch.blockId) + '"]'
      );
      if (!node || node.tagName.toLowerCase() !== patch.tagName) {
        targetedHtmlPatchCheck = 'node-mismatch';
        return null;
      }
      var beforeClassName = decodeHtmlAttribute(patch.beforeClassName);
      if (beforeClassName) {
        var beforeClasses = beforeClassName.split(/\s+/).filter(Boolean);
        for (var classIndex = 0; classIndex < beforeClasses.length; classIndex += 1) {
          if (!node.classList.contains(beforeClasses[classIndex])) {
            targetedHtmlPatchCheck = 'class-mismatch';
            return null;
          }
        }
      }
      var nextClassName = decodeHtmlAttribute(patch.className);
      var runtimeClasses = runtimeClassNames(node, beforeClassName);
      var runtimeStyle = prepareRuntimeStyle(node, patch.beforeStyleText, patch.styleText);
      if (!runtimeStyle) {
        targetedHtmlPatchCheck = 'style-mismatch';
        return null;
      }
      seen[patch.blockId] = true;
      prepared.push({
        node: node,
        className: nextClassName,
        runtimeClasses: runtimeClasses,
        styleText: decodeHtmlAttribute(patch.styleText),
        runtimeStyle: runtimeStyle
      });
    }
    targetedHtmlPatchCheck = 'accepted';
    return prepared;
  }
  function applyTargetedHtmlPatch(plan, nextHtmlKey) {
    var prepared = validateTargetedHtmlPatch(plan, nextHtmlKey);
    if (!prepared) return false;
    for (var index = 0; index < prepared.length; index += 1) {
      var patch = prepared[index];
      if (patch.className === null) patch.node.removeAttribute('class');
      else patch.node.setAttribute('class', patch.className);
      for (var classIndex = 0; classIndex < patch.runtimeClasses.length; classIndex += 1) {
        patch.node.classList.add(patch.runtimeClasses[classIndex]);
      }
      if (patch.styleText === null) patch.node.removeAttribute('style');
      else patch.node.setAttribute('style', patch.styleText);
      for (var styleIndex = 0; styleIndex < patch.runtimeStyle.length; styleIndex += 1) {
        var runtimeStyle = patch.runtimeStyle[styleIndex];
        patch.node.style.setProperty(runtimeStyle.property, runtimeStyle.value, runtimeStyle.priority);
      }
    }
    targetedHtmlPatchCount += 1;
    return true;
  }
  function applyLivePatch(data) {
    var applyStartedAt = window.performance.now();
    if (!data || !Number.isInteger(data.revision) || data.revision < 1) return;
    if (data.revision <= lastAppliedRevision) {
      staleApplyDropCount += 1;
      document.body.setAttribute('data-r20-stale-apply-drops', String(staleApplyDropCount));
      if (data.revision === lastAppliedRevision) postLivePatchAck(data.revision);
      return;
    }
    if (typeof data.html !== 'string' || data.html.length > 15000000) return;
    if (typeof data.htmlKey !== 'string' || !/^[a-z0-9-]{1,128}$/.test(data.htmlKey)) return;
    if (!data.styles || typeof data.styles !== 'object') return;
    var allowedStyles = [
      'roll20-legacy-sheet-surface',
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
    renderReadyGeneration += 1;
    document.body.setAttribute('data-r20-render-ready', '0');
    var root = document.querySelector('form.sheetform > .charactersheet.charsheet');
    if (!root) return;
    if (pendingLivePatchChunks && pendingLivePatchChunks.revision < data.revision) {
      pendingLivePatchChunks = null;
    }
    lastAppliedRevision = data.revision;
    // Restore temporary keyboard coordinates before applying authoritative
    // HTML/CSS in this same task, so no rollback frame is painted.
    clearOptimisticEditNudge();
    // Restore the pre-drag inline state before applying the authoritative HTML
    // and managed CSS. Both operations run in one task, so no rollback frame is
    // painted and an imported inline width cannot be reintroduced afterward.
    if (optimisticEditResize && optimisticEditResize.committed) {
      clearOptimisticEditResize();
    }
    var htmlChanged = data.htmlKey !== lastAppliedHtmlKey;
    var usedOptimisticFlowPatch = htmlChanged && canApplyOptimisticFlowCommit(data.optimisticFlow);
    var usedTargetedHtmlPatch = htmlChanged
      && !usedOptimisticFlowPatch
      && applyTargetedHtmlPatch(data.targetedHtmlPatch, data.htmlKey);
    var needsFullHtmlPatch = htmlChanged && !usedOptimisticFlowPatch && !usedTargetedHtmlPatch;
    var attrs = needsFullHtmlPatch ? collectAttrs() : null;
    var previousWorkerSource = needsFullHtmlPatch ? workerSourceText(root) : '';
    var usedStructuralPatch = false;
    if (htmlChanged) {
      if (usedOptimisticFlowPatch) {
        // The iframe already performed and validated this exact DOM move on
        // pointer-up. Skip reparsing/morphing the full sheet; the normal
        // branch below remains the correctness fallback.
        optimisticFlowFastPatchCount += 1;
        structuralPatchCount += 1;
        optimisticFlowCommit = null;
        optimisticFlowSnapshot = null;
        clearValidatedFlowTarget();
        lastAppliedHtmlKey = data.htmlKey;
        document.body.setAttribute('data-r20-html-key', data.htmlKey);
        lastAppliedBlockCount = root.querySelectorAll('[data-r20-block-id]').length;
      } else if (usedTargetedHtmlPatch) {
        structuralPatchCount += 1;
        optimisticFlowSnapshot = null;
        clearValidatedFlowTarget();
        lastAppliedHtmlKey = data.htmlKey;
        document.body.setAttribute('data-r20-html-key', data.htmlKey);
        lastAppliedBlockCount = root.querySelectorAll('[data-r20-block-id]').length;
      } else {
      // The initial iframe contains only the empty-state placeholder. A
      // keyed morph has no state to preserve there and needlessly walks the
      // imported tree before replacing it, which is especially costly for
      // large sheets. Keep morphing for subsequent edits where form/runtime
      // state preservation matters.
      var hasEmptyPlaceholder = Boolean(root.querySelector('.r20-empty'));
      usedStructuralPatch = !hasEmptyPlaceholder && patchRootHtml(data.html);
      if (usedStructuralPatch) {
        structuralPatchCount += 1;
      } else {
        root.innerHTML = data.html;
        if (hasEmptyPlaceholder) {
          initialPlaceholderReplacementCount += 1;
        } else {
          structuralPatchFallbackCount += 1;
        }
        rootReplacementCount += 1;
      }
      optimisticFlowSnapshot = null;
      clearValidatedFlowTarget();
      lastAppliedHtmlKey = data.htmlKey;
      document.body.setAttribute('data-r20-html-key', data.htmlKey);
      }
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
    if (needsFullHtmlPatch || i18nChanged) {
      translations = loadTranslations();
      applyTranslations();
    }
    if (needsFullHtmlPatch) {
      emulateRoll20RepeatingSections();
      emulateRoll20ButtonClasses();
      applyRoll20Autocalc();
      restoreRepeatingRows(attrs || {});
      Object.keys(attrs || {}).forEach(function (key) { writeSheetAttr(key, attrs[key]); });
      var nextWorkerSource = workerSourceText(root);
      if (nextWorkerSource !== previousWorkerSource) {
        sheetWorkerHandlers = {};
        installSheetWorkers();
      }
      lastAppliedBlockCount = root.querySelectorAll('[data-r20-block-id]').length;
    } else if (usedTargetedHtmlPatch) {
      // Roll20 runtime classes are not part of emitted HTML. Restore them
      // after replacing the authored class attribute on only the changed node.
      emulateRoll20ButtonClasses();
    }
    // Keep the pointer transform in place while the authoritative HTML and
    // styles are being applied. Clearing it before the patch paints the old
    // position for one frame, which looks like a rollback during a drag. A
    // style-only patch must leave it alone while the pointer is still down,
    // but it must be cleared after pointer-up so the committed CSS left/top
    // becomes the only source of geometry.
    if (htmlChanged || !activeEditPointer || activeEditPointer.ending) {
      clearOptimisticEditMove();
    }
    document.body.setAttribute(
      'data-r20-last-apply-mode',
      htmlChanged
        ? (usedOptimisticFlowPatch || usedTargetedHtmlPatch || usedStructuralPatch ? 'patch' : 'replace')
        : 'styles'
    );
    document.body.setAttribute('data-r20-root-replacements', String(rootReplacementCount));
    document.body.setAttribute('data-r20-structural-patches', String(structuralPatchCount));
    document.body.setAttribute('data-r20-structural-patch-fallbacks', String(structuralPatchFallbackCount));
    document.body.setAttribute('data-r20-initial-placeholder-replacements', String(initialPlaceholderReplacementCount));
    document.body.setAttribute('data-r20-style-only-applies', String(styleOnlyApplyCount));
    document.body.setAttribute('data-r20-optimistic-flow-moves', String(optimisticFlowMoveCount));
    document.body.setAttribute('data-r20-optimistic-flow-rollbacks', String(optimisticFlowRollbackCount));
    document.body.setAttribute('data-r20-optimistic-flow-fast-patches', String(optimisticFlowFastPatchCount));
    document.body.setAttribute('data-r20-optimistic-flow-check', optimisticFlowCheck);
    document.body.setAttribute('data-r20-targeted-html-patches', String(targetedHtmlPatchCount));
    document.body.setAttribute('data-r20-targeted-html-patch-check', targetedHtmlPatchCheck);
    document.body.setAttribute('data-r20-last-applied-revision', String(lastAppliedRevision));
    document.body.setAttribute('data-r20-stale-apply-drops', String(staleApplyDropCount));
    document.body.setAttribute('data-r20-last-apply-at', window.performance.now().toFixed(3));
    document.body.setAttribute(
      'data-r20-last-apply-cost-ms',
      (window.performance.now() - applyStartedAt).toFixed(3)
    );
    document.body.setAttribute(
      'data-r20-last-apply-epoch',
      String(window.performance.timeOrigin + window.performance.now())
    );
    scheduleResize();
    scheduleRenderReady();
    postLivePatchAck(data.revision);
  }
  function beginLivePatchChunks(data) {
    if (!data || !Number.isInteger(data.revision) || data.revision < 1) return;
    if (data.revision <= lastAppliedRevision) {
      staleApplyDropCount += 1;
      document.body.setAttribute('data-r20-stale-apply-drops', String(staleApplyDropCount));
      if (data.revision === lastAppliedRevision) postLivePatchAck(data.revision);
      return;
    }
    if (!Number.isInteger(data.totalChunks) || data.totalChunks < 1 || data.totalChunks > 256) return;
    if (!Number.isInteger(data.htmlLength) || data.htmlLength < 0 || data.htmlLength > 15000000) return;
    if (typeof data.htmlKey !== 'string' || !/^[a-z0-9-]{1,128}$/.test(data.htmlKey)) return;
    if (!data.styles || typeof data.styles !== 'object' || typeof data.i18n !== 'string') return;
    pendingLivePatchChunks = {
      revision: data.revision,
      htmlKey: data.htmlKey,
      htmlLength: data.htmlLength,
      totalChunks: data.totalChunks,
      styles: data.styles,
      i18n: data.i18n,
      darkMode: data.darkMode === true,
      layer: data.layer,
      roll20SandboxSanitize: data.roll20SandboxSanitize === true,
      roll20RendererModel: data.roll20RendererModel,
      documentLanguage: data.documentLanguage,
      optimisticFlow: data.optimisticFlow,
      targetedHtmlPatch: data.targetedHtmlPatch,
      parts: [],
      received: 0,
    };
  }
  function receiveLivePatchChunk(data) {
    var pending = pendingLivePatchChunks;
    if (!pending || !data || data.revision !== pending.revision) return;
    if (data.revision <= lastAppliedRevision) {
      pendingLivePatchChunks = null;
      staleApplyDropCount += 1;
      document.body.setAttribute('data-r20-stale-apply-drops', String(staleApplyDropCount));
      if (data.revision === lastAppliedRevision) postLivePatchAck(data.revision);
      return;
    }
    if (!Number.isInteger(data.index) || data.index < 0 || data.index >= pending.totalChunks) return;
    if (typeof data.text !== 'string' || pending.parts[data.index] !== undefined) return;
    pending.parts[data.index] = data.text;
    pending.received += 1;
    if (pending.received !== pending.totalChunks) return;
    var html = pending.parts.join('');
    var patch = pending;
    pendingLivePatchChunks = null;
    if (html.length !== patch.htmlLength) return;
    applyLivePatch({
      revision: patch.revision,
      html: html,
      htmlKey: patch.htmlKey,
      styles: patch.styles,
      i18n: patch.i18n,
      optimisticFlow: patch.optimisticFlow,
      targetedHtmlPatch: patch.targetedHtmlPatch,
      darkMode: patch.darkMode,
      layer: patch.layer,
      roll20SandboxSanitize: patch.roll20SandboxSanitize,
      roll20RendererModel: patch.roll20RendererModel,
      documentLanguage: patch.documentLanguage,
    });
  }
  function collectAttrs() {
    var out = {};
    var nodes = document.querySelectorAll('input[name^="attr_"], select[name^="attr_"], textarea[name^="attr_"]');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (isRepeatingTemplateElement(n)) continue;
      var nm = n.getAttribute('name') || '';
      if (nm.indexOf('attr_') !== 0) continue;
      var key = nm.substring(5);
      var val;
      if (n.tagName === 'SELECT' && n.multiple) {
        val = Array.prototype.filter.call(n.options, function (option) { return option.selected; })
          .map(function (option) { return option.value; });
      } else if (n.tagName === 'INPUT' && (n.type === 'checkbox' || n.type === 'radio')) {
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
    var sheet = document.querySelector('form.sheetform > .charactersheet.charsheet') || document.getElementById('dialog-window');
    if (!sheet) return 480;
    var box = measureContentBox(sheet);
    // Use the authored root height when normal flow already accounts for its
    // padding/content. Keep the descendant bound as a floor for absolutely
    // positioned or transformed children that extend beyond that root. The
    // previous unconditional +24px made every sheet surface taller than the
    // Roll20 root and accumulated as visible blank space below short sheets.
    var rootHeight = Number(sheet.getBoundingClientRect().height) || 0;
    return Math.max(${SHEET_RENDER_MIN_HEIGHT}, Math.ceil(Math.max(rootHeight, box.height)));
  }
  function measureWidth() {
    var sheet = document.querySelector('form.sheetform > .charactersheet.charsheet') || document.getElementById('dialog-window');
    if (!sheet) return null;
    var box = measureContentBox(sheet);
    if (!box.width || box.width < 120) return null;
    return Math.max(320, Math.min(${SHEET_CANVAS_MAX_WIDTH}, Math.ceil(box.width)));
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
      // Fixed/sticky controls belong to the surrounding Roll20 dialog, not to
      // the sheet's intrinsic content box. Counting them can create a height
      // feedback loop where the iframe grows after every resize notification.
      if (style.position === 'fixed' || style.position === 'sticky') continue;
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) continue;
      if (!isFinite(rect.right) || !isFinite(rect.bottom)) continue;
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
  function renderAssetUrls(sheet) {
    var urls = [];
    var seen = {};
    if (!sheet) return urls;
    var nodes = [sheet].concat(Array.prototype.slice.call(sheet.querySelectorAll('[data-r20-block-id]')));
    var cssImagePattern = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
    for (var i = 0; i < nodes.length; i += 1) {
      var style;
      try { style = window.getComputedStyle(nodes[i]); } catch (e) { style = null; }
      if (!style) continue;
      var values = [style.backgroundImage, style.maskImage, style.listStyleImage];
      for (var valueIndex = 0; valueIndex < values.length; valueIndex += 1) {
        var value = values[valueIndex];
        if (!value || value === 'none') continue;
        cssImagePattern.lastIndex = 0;
        var match;
        while ((match = cssImagePattern.exec(value))) {
          var source = String(match[2] || '').trim();
          if (!source || source.indexOf('data:') === 0 || source.indexOf('gradient(') >= 0) continue;
          var absolute;
          try { absolute = new URL(source, document.baseURI).href; } catch (e) { absolute = source; }
          if (!seen[absolute]) {
            seen[absolute] = true;
            urls.push(absolute);
          }
        }
      }
    }
    return urls;
  }
  function renderAssetPromise(source) {
    return new Promise(function (resolve) {
      var image = new Image();
      var settled = false;
      var timer = window.setTimeout(finish, 6000);
      function finish() {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve();
      }
      image.onload = finish;
      image.onerror = finish;
      image.src = source;
      if (image.complete) finish();
    });
  }
  function scheduleRenderReady() {
    var generation = renderReadyGeneration;
    if (renderReadyTimer) window.clearTimeout(renderReadyTimer);
    renderReadyTimer = window.setTimeout(function () {
      renderReadyTimer = 0;
      var sheet = document.querySelector('form.sheetform > .charactersheet.charsheet');
      if (!sheet || generation !== renderReadyGeneration) return;
      var imagePromises = Array.prototype.map.call(sheet.querySelectorAll('img'), function (image) {
        if (image.complete) {
          return image.decode ? image.decode().catch(function () {}) : Promise.resolve();
        }
        return new Promise(function (resolve) {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });
      });
      var cssPromises = renderAssetUrls(sheet).map(renderAssetPromise);
      var fontPromise = document.fonts && document.fonts.ready
        ? document.fonts.ready.catch(function () {})
        : Promise.resolve();
      Promise.all([fontPromise].concat(imagePromises, cssPromises)).then(function () {
        if (generation !== renderReadyGeneration) return;
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            if (generation !== renderReadyGeneration) return;
            document.body.setAttribute('data-r20-render-ready', '1');
            try {
              parent.postMessage({
                type: 'r20:render-ready',
                protocol: 1,
                bridgeId: editBridgeId,
                htmlKey: document.body.getAttribute('data-r20-html-key') || '',
              }, '*');
            } catch (e) {}
          });
        });
      });
    }, 0);
  }
  var sheetWorkerHandlers = {};
  var sheetWorkerEventQueue = [];
  var sheetWorkerDispatching = false;
  var sheetWorkerQueueOverflowCount = 0;
  var sheetWorkerAsyncTasks = [];
  var sheetWorkerAsyncScheduled = false;
  var sheetWorkerRuntimeGeneration = 0;
  var settingAttrs = false;
  var sheetWorkerAttrValues = {};
  var sheetWorkerRowSequence = 0;
  var sheetWorkerEventContext = null;
  var activeRepeatingMove = null;
  var translations = loadTranslations();
  function sheetWorkerOn(events, fn) {
    if (typeof fn !== 'function') return;
    String(events || '').split(/\s+/).filter(Boolean).forEach(function (evt) {
      (sheetWorkerHandlers[evt] = sheetWorkerHandlers[evt] || []).push(fn);
    });
  }
  function scheduleSheetWorkerTask(task) {
    if (typeof task !== 'function') return;
    sheetWorkerAsyncTasks.push({
      generation: sheetWorkerRuntimeGeneration,
      context: sheetWorkerEventContext,
      task: task
    });
    if (sheetWorkerAsyncScheduled) return;
    sheetWorkerAsyncScheduled = true;
    Promise.resolve().then(function () {
      sheetWorkerAsyncScheduled = false;
      var pending = sheetWorkerAsyncTasks.splice(0);
      for (var index = 0; index < pending.length; index += 1) {
        if (pending[index].generation !== sheetWorkerRuntimeGeneration) continue;
        var previousContext = sheetWorkerEventContext;
        sheetWorkerEventContext = pending[index].context;
        try { pending[index].task(); } catch (error) { console.error('[sheet worker async]', error); }
        finally { sheetWorkerEventContext = previousContext; }
      }
    });
  }
  function sheetAttrSelector(name) {
    var attrName = 'attr_' + cssEscape(name);
    return 'input[name="' + attrName + '"],select[name="' + attrName + '"],textarea[name="' + attrName + '"]';
  }
  function readSheetAttr(name) {
    var resolvedName = resolveSheetWorkerAttrName(name);
    var selector = sheetAttrSelector(resolvedName);
    var nodes = liveSheetAttrNodes(selector);
    if (!nodes.length) {
      return Object.prototype.hasOwnProperty.call(sheetWorkerAttrValues, resolvedName)
        ? sheetWorkerAttrValues[resolvedName]
        : '';
    }
    var el = nodes[0];
    if (el.type === 'checkbox') return el.checked ? (el.value || '1') : '0';
    if (el.type === 'radio') {
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].type === 'radio' && nodes[i].checked) return nodes[i].value || '';
      }
      return '';
    }
    return el.value == null ? '' : String(el.value);
  }
  function snapshotSheetAttrs() {
    sheetWorkerAttrValues = {};
    document.querySelectorAll('input[name^="attr_"],select[name^="attr_"],textarea[name^="attr_"]').forEach(function (el) {
      if (isRepeatingTemplateElement(el)) return;
      var rawName = el.getAttribute('name') || '';
      var key = rawName.substring(5);
      if (key && !Object.prototype.hasOwnProperty.call(sheetWorkerAttrValues, key)) {
        sheetWorkerAttrValues[key] = readSheetAttr(key);
      }
    });
  }
  function writeSheetAttr(name, value) {
    var resolvedName = resolveSheetWorkerAttrName(name);
    var orderGroup = parseRepeatingOrderAttrName(resolvedName);
    if (orderGroup) {
      var previousOrder = Object.prototype.hasOwnProperty.call(sheetWorkerAttrValues, resolvedName)
        ? String(sheetWorkerAttrValues[resolvedName] || '')
        : '';
      var requestedOrder = String(value == null ? '' : value)
        .split(',')
        .map(function (rowId) { return rowId.trim(); })
        .filter(Boolean);
      var appliedOrder = applyRepeatingOrder(orderGroup, requestedOrder).join(',');
      sheetWorkerAttrValues[resolvedName] = appliedOrder;
      return previousOrder !== appliedOrder;
    }
    var repeatingRow = ensureRepeatingRowForAttr(resolvedName);
    var nodes = liveSheetAttrNodes(sheetAttrSelector(resolvedName));
    var changed = Boolean(repeatingRow && repeatingRow.created);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.tagName === 'SELECT' && el.multiple && Array.isArray(value)) {
        for (var optionIndex = 0; optionIndex < el.options.length; optionIndex += 1) {
          var nextSelected = value.indexOf(el.options[optionIndex].value) >= 0;
          if (el.options[optionIndex].selected !== nextSelected) changed = true;
          el.options[optionIndex].selected = nextSelected;
        }
      } else if (el.type === 'checkbox') {
        var nextChecked = String(value) === String(el.value || '1') || value === true || value === 1 || value === '1';
        if (el.checked !== nextChecked || (nextChecked && el.getAttribute('checked') !== 'checked') || (!nextChecked && el.hasAttribute('checked'))) changed = true;
        el.checked = nextChecked;
        if (el.checked) el.setAttribute('checked', 'checked');
        else el.removeAttribute('checked');
      } else if (el.type === 'radio') {
        var nextRadioChecked = String(el.value) === String(value);
        if (el.checked !== nextRadioChecked || (nextRadioChecked && el.getAttribute('checked') !== 'checked') || (!nextRadioChecked && el.hasAttribute('checked'))) changed = true;
        el.checked = nextRadioChecked;
        if (el.checked) el.setAttribute('checked', 'checked');
        else el.removeAttribute('checked');
      } else {
        var nextValue = value == null ? '' : String(value);
        if (el.type === 'number' && nextValue.trim() !== '') {
          var isAutocalcExpression = el.getAttribute('data-r20-autocalc-expression') === nextValue;
          if (isAutocalcExpression || !isFinite(Number(nextValue))) continue;
        }
        if (el.value !== nextValue || el.getAttribute('value') !== nextValue) changed = true;
        el.value = nextValue;
        el.setAttribute('value', nextValue);
      }
    }
    return changed;
  }
  function mirrorChangedSheetAttr(el) {
    if (!el || !el.getAttribute) return;
    var rawName = el.getAttribute('name') || '';
    if (rawName.indexOf('attr_') !== 0) return;
    var key = rawName.substring(5);
    var previousValue = Object.prototype.hasOwnProperty.call(sheetWorkerAttrValues, key)
      ? sheetWorkerAttrValues[key]
      : readSheetAttr(key);
    var value;
    if (el.tagName === 'SELECT' && el.multiple) {
      value = Array.prototype.filter.call(el.options, function (option) { return option.selected; })
        .map(function (option) { return option.value; });
    } else if (el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
      value = el.checked ? (el.value || '1') : '';
    } else {
      value = el.value == null ? '' : String(el.value);
    }
    settingAttrs = true;
    var changed = writeSheetAttr(key, value);
    settingAttrs = false;
    var newValue = readSheetAttr(key);
    sheetWorkerAttrValues[key] = newValue;
    if (changed || String(previousValue) !== String(newValue)) {
      triggerSheetWorkerChange(key, {
        sourceAttribute: key.toLowerCase(),
        sourceType: 'player',
        previousValue: previousValue,
        newValue: newValue
      });
    }
    scheduleResize();
  }
  function sheetWorkerGetAttrs(names, cb) {
    var out = {};
    (names || []).forEach(function (n) { out[n] = readSheetAttr(n); });
    if (typeof cb === 'function') scheduleSheetWorkerTask(function () { cb(out); });
  }
  function sheetWorkerSetAttrs(values, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = undefined; }
    var silent = Boolean(opts && opts.silent === true);
    var changedAttrs = [];
    settingAttrs = true;
    Object.keys(values || {}).forEach(function (k) {
      var resolvedKey = resolveSheetWorkerAttrName(k);
      var previousValue = Object.prototype.hasOwnProperty.call(sheetWorkerAttrValues, resolvedKey)
        ? sheetWorkerAttrValues[resolvedKey]
        : readSheetAttr(resolvedKey);
      if (writeSheetAttr(resolvedKey, values[k])) {
        var newValue = readSheetAttr(resolvedKey);
        sheetWorkerAttrValues[resolvedKey] = newValue;
        changedAttrs.push({ key: resolvedKey, previousValue: previousValue, newValue: newValue });
      }
    });
    settingAttrs = false;
    if (!silent || typeof cb === 'function') {
      scheduleSheetWorkerTask(function () {
        if (!silent) {
          changedAttrs.forEach(function (change) {
            triggerSheetWorkerChange(change.key, {
              sourceAttribute: change.key.toLowerCase(),
              sourceType: 'sheetworker',
              previousValue: change.previousValue,
              newValue: change.newValue
            });
          });
        }
        if (typeof cb === 'function') cb();
        scheduleResize();
      });
    } else {
      scheduleResize();
    }
  }
  function triggerSheetWorker(evt, payload) {
    if (!evt) return;
    sheetWorkerEventQueue.push({ evt: evt, payload: payload || { sourceAttribute: evt.replace(/^change:/, '') } });
    if (sheetWorkerDispatching) return;
    sheetWorkerDispatching = true;
    var processed = 0;
    try {
      while (sheetWorkerEventQueue.length && processed < 512) {
        var queued = sheetWorkerEventQueue.shift();
        processed += 1;
        var list = (sheetWorkerHandlers[queued.evt] || []).slice();
        for (var i = 0; i < list.length; i++) {
          var previousContext = sheetWorkerEventContext;
          sheetWorkerEventContext = repeatingEventContext(queued.payload);
          try { list[i](queued.payload); } catch (e) { console.error('[sheet worker]', queued.evt, e); }
          finally { sheetWorkerEventContext = previousContext; }
        }
      }
      if (sheetWorkerEventQueue.length) {
        sheetWorkerEventQueue = [];
        sheetWorkerQueueOverflowCount += 1;
        document.body.setAttribute('data-r20-worker-queue-overflows', String(sheetWorkerQueueOverflowCount));
        console.error('[sheet worker] event queue overflow');
      }
    } finally {
      sheetWorkerDispatching = false;
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
    return /(?:^|\s)repeating_[^\s]+/.test(el.getAttribute('class') || '');
  }
  function repeatingGroupNameOf(fieldset) {
    if (!isRepeatingFieldset(fieldset)) return '';
    var tokens = String(fieldset.getAttribute('class') || '').split(/\s+/);
    for (var i = 0; i < tokens.length; i += 1) {
      if (/^repeating_[\w-]+$/i.test(tokens[i])) return tokens[i];
    }
    return '';
  }
  function isRepeatingTemplateElement(el) {
    var fieldset = el && el.closest ? el.closest('fieldset') : null;
    return isRepeatingFieldset(fieldset);
  }
  function liveSheetAttrNodes(selector) {
    return Array.prototype.filter.call(document.querySelectorAll(selector), function (el) {
      return !isRepeatingTemplateElement(el);
    });
  }
  function repeatingRuntimeSibling(fieldset, className) {
    var node = fieldset.nextElementSibling;
    while (node) {
      if (node.classList && node.classList.contains(className)) return node;
      if (node.tagName === 'FIELDSET' || !(node.classList && (node.classList.contains('repcontainer') || node.classList.contains('repcontrol')))) break;
      node = node.nextElementSibling;
    }
    return null;
  }
  function ensureRepeatingRuntime(fieldset) {
    var groupName = repeatingGroupNameOf(fieldset);
    if (!groupName) return null;
    fieldset.style.display = 'none';
    var container = repeatingRuntimeSibling(fieldset, 'repcontainer');
    var control = repeatingRuntimeSibling(fieldset, 'repcontrol');
    if (!container) {
      container = document.createElement('div');
      container.className = 'repcontainer ui-sortable';
      if (control) fieldset.parentNode.insertBefore(container, control);
      else fieldset.after(container);
    }
    if (!control) {
      control = document.createElement('div');
      control.className = 'repcontrol';
      container.after(control);
    }
    container.classList.add('ui-sortable');
    container.setAttribute('data-groupname', groupName);
    control.setAttribute('data-groupname', groupName);
    var edit = control.querySelector('button.repcontrol_edit');
    if (!edit) {
      edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn repcontrol_edit';
      edit.textContent = 'Modify';
      control.appendChild(edit);
    }
    var add = control.querySelector('button.repcontrol_add');
    if (!add) {
      add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn repcontrol_add';
      add.textContent = '+Add';
      control.appendChild(add);
    }
    return { fieldset: fieldset, container: container, control: control, groupName: groupName };
  }
  function repeatingFieldsets() {
    return document.querySelectorAll('fieldset[class^="repeating_"], fieldset[class*=" repeating_"]');
  }
  function repeatingRuntimesForGroup(groupName) {
    var fieldsets = repeatingFieldsets();
    var runtimes = [];
    for (var i = 0; i < fieldsets.length; i += 1) {
      var candidate = repeatingGroupNameOf(fieldsets[i]);
      if (candidate && candidate.toLowerCase() === String(groupName || '').toLowerCase()) {
        var runtime = ensureRepeatingRuntime(fieldsets[i]);
        if (runtime) runtimes.push(runtime);
      }
    }
    return runtimes;
  }
  function repeatingRuntimeForGroup(groupName) {
    return repeatingRuntimesForGroup(groupName)[0] || null;
  }
  function repeatingRuntimeForControl(control) {
    var groupName = control ? control.getAttribute('data-groupname') || '' : '';
    var runtimes = repeatingRuntimesForGroup(groupName);
    for (var i = 0; i < runtimes.length; i += 1) {
      if (runtimes[i].control === control) return runtimes[i];
    }
    return null;
  }
  function matchingRepeatingGroupName(name) {
    var normalizedLower = String(name || '').toLowerCase();
    var fieldsets = repeatingFieldsets();
    var bestGroup = '';
    for (var i = 0; i < fieldsets.length; i += 1) {
      var groupName = repeatingGroupNameOf(fieldsets[i]);
      var prefix = groupName.toLowerCase() + '_';
      if (groupName && normalizedLower.indexOf(prefix) === 0 && groupName.length > bestGroup.length) {
        bestGroup = groupName;
      }
    }
    return bestGroup;
  }
  function parseRepeatingAttrName(name) {
    var normalized = String(name || '').replace(/^attr_/, '');
    var bestGroup = matchingRepeatingGroupName(normalized);
    if (!bestGroup) return null;
    var rest = normalized.substring(bestGroup.length + 1);
    var separator = rest.indexOf('_');
    if (separator <= 0 || separator >= rest.length - 1) return null;
    return {
      groupName: bestGroup,
      rowId: rest.substring(0, separator),
      attrName: rest.substring(separator + 1)
    };
  }
  function parseRepeatingRowName(name) {
    var normalized = String(name || '').replace(/^attr_/, '');
    var bestGroup = matchingRepeatingGroupName(normalized);
    if (!bestGroup) return null;
    var rowId = normalized.substring(bestGroup.length + 1);
    return rowId ? { groupName: bestGroup, rowId: rowId } : null;
  }
  function parseRepeatingOrderAttrName(name) {
    var normalized = String(name || '').replace(/^attr_/, '');
    if (normalized.toLowerCase().indexOf('_reporder_repeating_') !== 0) return '';
    var candidate = normalized.substring('_reporder_'.length);
    var runtimes = repeatingRuntimesForGroup(candidate);
    return runtimes.length ? runtimes[0].groupName : '';
  }
  function resolveSheetWorkerAttrName(name) {
    var normalized = String(name || '').replace(/^attr_/, '');
    if (!sheetWorkerEventContext) return normalized;
    var groupName = sheetWorkerEventContext.groupName;
    var rowId = sheetWorkerEventContext.rowId;
    var fullPrefix = groupName + '_' + rowId + '_';
    if (normalized.toLowerCase().indexOf(fullPrefix.toLowerCase()) === 0) return normalized;
    var shorthandPrefix = groupName + '_';
    if (normalized.toLowerCase().indexOf(shorthandPrefix.toLowerCase()) !== 0) return normalized;
    return groupName + '_' + rowId + '_' + normalized.substring(shorthandPrefix.length);
  }
  function repeatingEventContext(payload) {
    var sourceAttribute = payload && payload.sourceAttribute ? String(payload.sourceAttribute) : '';
    var parsed = parseRepeatingAttrName(sourceAttribute);
    if (parsed) return { groupName: parsed.groupName, rowId: parsed.rowId };
    var row = parseRepeatingRowName(sourceAttribute);
    return row ? { groupName: row.groupName, rowId: row.rowId } : null;
  }
  function rewriteRepeatingRowNames(row, groupName, rowId) {
    row.querySelectorAll('[name]').forEach(function (el) {
      var rawName = el.getAttribute('name') || '';
      var prefix = '';
      if (rawName.indexOf('attr_') === 0) prefix = 'attr_';
      else if (rawName.indexOf('roll_') === 0) prefix = 'roll_';
      else if (rawName.indexOf('act_') === 0) prefix = 'act_';
      if (!prefix) return;
      var localName = rawName.substring(prefix.length);
      if (!localName || /^repeating_/i.test(localName)) return;
      el.setAttribute('name', prefix + groupName + '_' + rowId + '_' + localName);
    });
  }
  function cacheRepeatingRowAttrs(row) {
    row.querySelectorAll('input[name^="attr_"],select[name^="attr_"],textarea[name^="attr_"]').forEach(function (el) {
      var key = String(el.getAttribute('name') || '').substring(5);
      if (key) sheetWorkerAttrValues[key] = readSheetAttr(key);
    });
  }
  function repeatingRowInRuntime(runtime, rowId) {
    var rows = runtime.container.querySelectorAll('.repitem[data-reprowid]');
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].getAttribute('data-reprowid') === rowId) return rows[i];
    }
    return null;
  }
  function createRepeatingRowInRuntime(runtime, rowId) {
    var existing = repeatingRowInRuntime(runtime, rowId);
    if (existing) return { row: existing, created: false };
    var row = document.createElement('div');
    row.className = 'repitem';
    row.setAttribute('data-reprowid', rowId);
    var itemControl = document.createElement('div');
    itemControl.className = 'itemcontrol';
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger pictos repcontrol_del';
    remove.textContent = '#';
    var move = document.createElement('a');
    move.className = 'btn repcontrol_move';
    move.textContent = '\u2261';
    itemControl.append(remove, move);
    row.appendChild(itemControl);
    Array.prototype.forEach.call(runtime.fieldset.childNodes, function (child) {
      row.appendChild(child.cloneNode(true));
    });
    rewriteRepeatingRowNames(row, runtime.groupName, rowId);
    runtime.container.appendChild(row);
    cacheRepeatingRowAttrs(row);
    return { row: row, created: true };
  }
  function syncRepeatingRowValues(groupName, rowId) {
    var keys = [];
    repeatingRuntimesForGroup(groupName).forEach(function (runtime) {
      var row = repeatingRowInRuntime(runtime, rowId);
      if (!row) return;
      row.querySelectorAll('input[name^="attr_"],select[name^="attr_"],textarea[name^="attr_"]').forEach(function (el) {
        var key = String(el.getAttribute('name') || '').substring(5);
        if (key && keys.indexOf(key) < 0) keys.push(key);
      });
    });
    keys.forEach(function (key) {
      var value = readSheetAttr(key);
      writeSheetAttr(key, value);
      sheetWorkerAttrValues[key] = readSheetAttr(key);
    });
  }
  function createRepeatingRow(groupName, rowId) {
    if (!rowId) return { row: null, created: false };
    var runtimes = repeatingRuntimesForGroup(groupName);
    var firstRow = null;
    var created = false;
    for (var i = 0; i < runtimes.length; i += 1) {
      var result = createRepeatingRowInRuntime(runtimes[i], rowId);
      if (!firstRow) firstRow = result.row;
      if (result.created) created = true;
    }
    if (created) syncRepeatingRowValues(groupName, rowId);
    return { row: firstRow, created: created };
  }
  function ensureRepeatingRowForAttr(name) {
    var parsed = parseRepeatingAttrName(name);
    return parsed ? createRepeatingRow(parsed.groupName, parsed.rowId) : null;
  }
  function restoreRepeatingRows(attrs) {
    Object.keys(attrs || {}).forEach(function (name) {
      ensureRepeatingRowForAttr(name);
    });
  }
  function repeatingRowIds(runtime) {
    var ids = [];
    if (!runtime) return ids;
    runtime.container.querySelectorAll('.repitem[data-reprowid]').forEach(function (row) {
      var rowId = row.getAttribute('data-reprowid') || '';
      if (rowId && ids.indexOf(rowId) < 0) ids.push(rowId);
    });
    return ids;
  }
  function allRepeatingRowIds(groupName) {
    var ids = [];
    repeatingRuntimesForGroup(groupName).forEach(function (runtime) {
      repeatingRowIds(runtime).forEach(function (rowId) {
        if (ids.indexOf(rowId) < 0) ids.push(rowId);
      });
    });
    return ids.sort();
  }
  function repeatingDisplayOrder(groupName) {
    return repeatingRowIds(repeatingRuntimeForGroup(groupName));
  }
  function applyRepeatingOrder(groupName, requestedOrder) {
    var available = allRepeatingRowIds(groupName);
    var ordered = [];
    (requestedOrder || []).forEach(function (rowId) {
      if (available.indexOf(rowId) >= 0 && ordered.indexOf(rowId) < 0) ordered.push(rowId);
    });
    available.forEach(function (rowId) {
      if (ordered.indexOf(rowId) < 0) ordered.push(rowId);
    });
    repeatingRuntimesForGroup(groupName).forEach(function (runtime) {
      ordered.forEach(function (rowId) {
        var row = repeatingRowInRuntime(runtime, rowId);
        if (row) runtime.container.appendChild(row);
      });
    });
    return ordered;
  }
  function commitRepeatingOrder(groupName, requestedOrder, sourceType) {
    var key = '_reporder_' + String(groupName || '').toLowerCase();
    var previousValue = Object.prototype.hasOwnProperty.call(sheetWorkerAttrValues, key)
      ? String(sheetWorkerAttrValues[key] || '')
      : '';
    var newValue = applyRepeatingOrder(groupName, requestedOrder).join(',');
    sheetWorkerAttrValues[key] = newValue;
    if (previousValue === newValue) return false;
    triggerSheetWorkerChange(key, {
      sourceAttribute: key,
      sourceType: sourceType,
      previousValue: previousValue,
      newValue: newValue
    });
    return true;
  }
  function repeatingChangeEvents(name) {
    var key = String(name || '').toLowerCase();
    var events = ['change:' + key];
    var orderGroup = parseRepeatingOrderAttrName(key);
    if (orderGroup) {
      events.push('change:_reporder:' + orderGroup.toLowerCase().replace(/^repeating_/, ''));
    }
    var parsed = parseRepeatingAttrName(key);
    if (parsed) {
      var fieldName = parsed.attrName.toLowerCase();
      var baseFieldName = fieldName.replace(/_max$/, '');
      events.push('change:' + parsed.groupName.toLowerCase() + ':' + fieldName);
      events.push('change:' + parsed.groupName.toLowerCase());
      events.push('change:' + baseFieldName);
      events.push('change:' + baseFieldName + '_max');
    }
    return events.filter(function (eventName, index, all) { return all.indexOf(eventName) === index; });
  }
  function triggerSheetWorkerChange(name, payload) {
    var sourceAttribute = String(name || '').toLowerCase();
    var eventPayload = Object.assign({ triggerName: sourceAttribute }, payload || {});
    repeatingChangeEvents(sourceAttribute).forEach(function (eventName) {
      triggerSheetWorker(eventName, eventPayload);
    });
  }
  function collectRepeatingRowInfo(groupName, rowId) {
    var out = {};
    repeatingRuntimesForGroup(groupName).forEach(function (runtime) {
      var row = repeatingRowInRuntime(runtime, rowId);
      if (!row) return;
      row.querySelectorAll('input[name^="attr_"],select[name^="attr_"],textarea[name^="attr_"]').forEach(function (el) {
        var key = String(el.getAttribute('name') || '').substring(5);
        if (key && !Object.prototype.hasOwnProperty.call(out, key)) out[key] = readSheetAttr(key);
      });
    });
    return out;
  }
  function removeRepeatingRowById(groupName, rowId, sourceType) {
    if (!groupName || !rowId) return false;
    var removedInfo = collectRepeatingRowInfo(groupName, rowId);
    var removedKeys = Object.keys(removedInfo);
    var sourceAttribute = String(removedKeys[0] || (groupName + '_' + rowId)).toLowerCase();
    var removed = false;
    repeatingRuntimesForGroup(groupName).forEach(function (runtime) {
      var row = repeatingRowInRuntime(runtime, rowId);
      if (row) {
        row.remove();
        removed = true;
      }
    });
    if (!removed) return false;
    removedKeys.forEach(function (key) { delete sheetWorkerAttrValues[key]; });
    var orderKey = '_reporder_' + groupName.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(sheetWorkerAttrValues, orderKey)) {
      sheetWorkerAttrValues[orderKey] = String(sheetWorkerAttrValues[orderKey] || '')
        .split(',')
        .filter(function (id) { return id && id !== rowId; })
        .join(',');
    }
    var baseEvent = 'remove:' + groupName.toLowerCase();
    var rowEvent = baseEvent + ':' + rowId.toLowerCase();
    [baseEvent, rowEvent].forEach(function (eventName) {
      triggerSheetWorker(eventName, {
        sourceAttribute: sourceAttribute,
        sourceType: sourceType,
        triggerName: eventName,
        removedInfo: removedInfo
      });
    });
    scheduleResize();
    return true;
  }
  function removeRepeatingRowElement(row, sourceType) {
    if (!row || !row.parentElement) return false;
    var groupName = row.parentElement.getAttribute('data-groupname') || '';
    var rowId = row.getAttribute('data-reprowid') || '';
    return removeRepeatingRowById(groupName, rowId, sourceType);
  }
  function sheetWorkerRemoveRepeatingRow(rowName) {
    var parsed = parseRepeatingRowName(rowName);
    if (parsed) removeRepeatingRowById(parsed.groupName, parsed.rowId, 'sheetworker');
  }
  function sheetWorkerGenerateRowID() {
    sheetWorkerRowSequence += 1;
    return '-' + Date.now().toString(36) + sheetWorkerRowSequence.toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function setRepeatingEditMode(control) {
    var runtime = repeatingRuntimeForControl(control);
    if (!runtime) return;
    var editing = !runtime.container.classList.contains('editmode');
    runtime.container.classList.toggle('editmode', editing);
    var edit = runtime.control.querySelector('button.repcontrol_edit');
    var add = runtime.control.querySelector('button.repcontrol_add');
    if (edit) edit.textContent = editing ? 'Done' : 'Modify';
    if (add) add.style.display = editing ? 'none' : '';
  }
  function sameRepeatingOrder(a, b) {
    return a.length === b.length && a.every(function (rowId, index) { return rowId === b[index]; });
  }
  function beginRepeatingMove(handle, event) {
    var row = handle && handle.closest ? handle.closest('.repitem') : null;
    var container = row ? row.parentElement : null;
    if (!row || !container || !container.classList.contains('editmode')) return false;
    var groupName = container.getAttribute('data-groupname') || '';
    var rowId = row.getAttribute('data-reprowid') || '';
    if (!groupName || !rowId) return false;
    activeRepeatingMove = {
      pointerId: event.pointerId,
      captureNode: container,
      container: container,
      groupName: groupName,
      rowId: rowId,
      originOrder: repeatingDisplayOrder(groupName),
      moved: false
    };
    try { container.setPointerCapture(event.pointerId); } catch (_) {}
    return true;
  }
  function moveRepeatingRow(event) {
    if (!activeRepeatingMove || activeRepeatingMove.pointerId !== event.pointerId) return false;
    var hit = document.elementFromPoint(event.clientX, event.clientY);
    var targetRow = hit && hit.closest ? hit.closest('.repitem[data-reprowid]') : null;
    if (!targetRow || targetRow.parentElement !== activeRepeatingMove.container) return true;
    var targetId = targetRow.getAttribute('data-reprowid') || '';
    if (!targetId || targetId === activeRepeatingMove.rowId) return true;
    var nextOrder = repeatingDisplayOrder(activeRepeatingMove.groupName);
    var fromIndex = nextOrder.indexOf(activeRepeatingMove.rowId);
    if (fromIndex < 0) return true;
    nextOrder.splice(fromIndex, 1);
    var targetIndex = nextOrder.indexOf(targetId);
    if (targetIndex < 0) return true;
    if (event.clientY >= targetRow.getBoundingClientRect().top + targetRow.getBoundingClientRect().height / 2) {
      targetIndex += 1;
    }
    nextOrder.splice(targetIndex, 0, activeRepeatingMove.rowId);
    applyRepeatingOrder(activeRepeatingMove.groupName, nextOrder);
    activeRepeatingMove.moved = !sameRepeatingOrder(activeRepeatingMove.originOrder, nextOrder);
    return true;
  }
  function endRepeatingMove(event) {
    if (!activeRepeatingMove || activeRepeatingMove.pointerId !== event.pointerId) return false;
    var move = activeRepeatingMove;
    activeRepeatingMove = null;
    try { move.captureNode.releasePointerCapture(event.pointerId); } catch (_) {}
    if (move.moved) commitRepeatingOrder(move.groupName, repeatingDisplayOrder(move.groupName), 'player');
    scheduleResize();
    return true;
  }
  function cancelRepeatingMove(event) {
    if (!activeRepeatingMove || activeRepeatingMove.pointerId !== event.pointerId) return false;
    var move = activeRepeatingMove;
    activeRepeatingMove = null;
    applyRepeatingOrder(move.groupName, move.originOrder);
    try { move.captureNode.releasePointerCapture(event.pointerId); } catch (_) {}
    return true;
  }
  function emulateRoll20RepeatingSections() {
    repeatingFieldsets().forEach(function (fieldset) {
      ensureRepeatingRuntime(fieldset);
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
    var groupName = String(section || '');
    if (groupName.indexOf('repeating_') !== 0) groupName = 'repeating_' + groupName;
    var rowIds = allRepeatingRowIds(groupName);
    if (typeof cb === 'function') scheduleSheetWorkerTask(function () { cb(rowIds); });
  }
  function sheetWorkerSetSectionOrder(section, rowIds, cb) {
    var groupName = String(section || '');
    if (groupName.indexOf('repeating_') !== 0) groupName = 'repeating_' + groupName;
    var requestedOrder = Array.isArray(rowIds)
      ? rowIds.map(function (rowId) { return String(rowId || ''); }).filter(Boolean)
      : [];
    commitRepeatingOrder(groupName, requestedOrder, 'sheetworker');
    scheduleSheetWorkerTask(function () {
      if (typeof cb === 'function') cb();
      scheduleResize();
    });
  }
  function installSheetWorkers() {
    sheetWorkerRuntimeGeneration += 1;
    sheetWorkerAsyncTasks = [];
    snapshotSheetAttrs();
    var scripts = document.querySelectorAll('script[type="text/worker"]');
    scripts.forEach(function (script) {
      var code = workerSourceOf(script);
      if (!code.trim()) return;
      try {
        var fn = new Function(
          'on', 'getAttrs', 'setAttrs', 'getSectionIDs', 'setSectionOrder', 'generateRowID', 'removeRepeatingRow', 'setDefaultToken',
          'getTranslationByKey', 'getTranslationByLang', 'getTranslationLanguage',
          code
        );
        fn(
          sheetWorkerOn,
          sheetWorkerGetAttrs,
          sheetWorkerSetAttrs,
          sheetWorkerGetSectionIDs,
          sheetWorkerSetSectionOrder,
          sheetWorkerGenerateRowID,
          sheetWorkerRemoveRepeatingRow,
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
    var repeatingAdd = e.target && e.target.closest && e.target.closest('button.repcontrol_add');
    if (repeatingAdd) {
      var addControl = repeatingAdd.closest('.repcontrol');
      var addGroup = addControl ? addControl.getAttribute('data-groupname') || '' : '';
      if (addGroup) createRepeatingRow(addGroup, sheetWorkerGenerateRowID());
      scheduleResize();
      try { e.preventDefault(); } catch (_) {}
      return false;
    }
    var repeatingEdit = e.target && e.target.closest && e.target.closest('button.repcontrol_edit');
    if (repeatingEdit) {
      var editControl = repeatingEdit.closest('.repcontrol');
      if (editControl) setRepeatingEditMode(editControl);
      try { e.preventDefault(); } catch (_) {}
      return false;
    }
    var repeatingDelete = e.target && e.target.closest && e.target.closest('button.repcontrol_del');
    if (repeatingDelete) {
      var deleteRow = repeatingDelete.closest('.repitem');
      if (deleteRow) removeRepeatingRowElement(deleteRow, 'player');
      try { e.preventDefault(); } catch (_) {}
      return false;
    }
    var repeatingMove = e.target && e.target.closest && e.target.closest('.repcontrol_move');
    if (repeatingMove) {
      try { e.preventDefault(); } catch (_) {}
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
      triggerSheetWorker('clicked:' + actionName, { triggerName: actionName, sourceType: 'player' });
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
    if (!editBridgeEnabled) {
      if (moveRepeatingRow(e)) {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopImmediatePropagation(); } catch (_) {}
      }
      return;
    }
    if (!activeEditPointer || activeEditPointer.pointerId !== e.pointerId) return;
    activeEditPointer.lastX = e.clientX;
    activeEditPointer.lastY = e.clientY;
    syncActiveEditSelection();
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
        applyOptimisticEditMove(pending.pointer);
        postEditHit(
          'pointermove',
          pending.subjectNode,
          hitNodeAt(pending.pointer.x, pending.pointer.y, pending.hitNode, pending.subjectNode),
          pending.pointer,
        );
      }
    });
  }, true);
  document.addEventListener('pointerdown', function (e) {
    if (!editBridgeEnabled) {
      var repeatingMoveHandle = e.target && e.target.closest && e.target.closest('.repcontrol_move');
      if (e.button === 0 && repeatingMoveHandle && beginRepeatingMove(repeatingMoveHandle, e)) {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopImmediatePropagation(); } catch (_) {}
      }
      return;
    }
    if (e.button !== 0) return;
    if (e.isPrimary === false) return;
    var subjectNode = blockNodeOf(e.target);
    if (!subjectNode) return;
    if (activeEditPointer) {
      cancelActiveEditPointer(activeEditPointer.lastX, activeEditPointer.lastY, activeEditPointer.subjectNode);
    } else if (optimisticEditMove) {
      clearOptimisticEditMove();
    }
    rollbackOptimisticFlowMove();
    clearValidatedFlowTarget();
    resetLinearTransformCache();
    var selectedNodes = selectedEditNodes(subjectNode).map(function (node) {
      return {
        node: node,
        originTransform: node.style.transform,
        originRenderedTransform: renderedTransformOf(node),
        movementTransform: movementToViewportOf(node),
        originTransition: node.style.transition,
        originWillChange: node.style.willChange,
      };
    });
    activeEditPointer = {
      pointerId: e.pointerId,
      subjectNode: subjectNode,
      selectedNodes: selectedNodes,
      dragSelectionIds: selectedEditBlockIds.slice(0, 128),
      originX: e.clientX,
      originY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      originTransform: subjectNode.style.transform,
      originTransition: subjectNode.style.transition,
      originWillChange: subjectNode.style.willChange
    };
    optimisticEditMove = activeEditPointer;
    for (var i = 0; i < selectedNodes.length; i += 1) {
      selectedNodes[i].node.style.transition = 'none';
      selectedNodes[i].node.style.willChange = 'transform';
    }
    try { subjectNode.setPointerCapture(e.pointerId); } catch (_) {}
    postEditHit('pointerdown', subjectNode, subjectNode, {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      button: e.button,
      buttons: e.buttons,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
    });
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
  }, true);
  document.addEventListener('pointerup', function (e) {
    if (!editBridgeEnabled) {
      if (endRepeatingMove(e)) {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopImmediatePropagation(); } catch (_) {}
      }
      return;
    }
    if (!activeEditPointer || activeEditPointer.pointerId !== e.pointerId) return;
    var subjectNode = activeEditPointer.subjectNode;
    activeEditPointer.ending = true;
    syncActiveEditSelection();
    if (editMoveFrame) window.cancelAnimationFrame(editMoveFrame);
    editMoveFrame = 0;
    pendingEditMove = null;
    var flowTarget = validatedFlowTarget;
    postEditHit('pointerup', subjectNode, hitNodeAt(e.clientX, e.clientY, e.target, subjectNode), {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      button: e.button,
      buttons: e.buttons,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
    });
    if (
      flowTarget
      && flowTarget.pointerId === e.pointerId
      && flowTarget.subjectBlockId === subjectNode.dataset.r20BlockId
      && normalizedFlowSubjectIds(flowTarget).indexOf(subjectNode.dataset.r20BlockId) >= 0
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
  function cancelActiveEditPointer(x, y, hitNode) {
    if (!editBridgeEnabled || !activeEditPointer) return false;
    var interrupted = activeEditPointer;
    if (editMoveFrame) window.cancelAnimationFrame(editMoveFrame);
    editMoveFrame = 0;
    pendingEditMove = null;
    rollbackOptimisticFlowMove();
    clearOptimisticEditMove(interrupted);
    clearValidatedFlowTarget();
    var nextX = Number.isFinite(x) ? x : interrupted.lastX;
    var nextY = Number.isFinite(y) ? y : interrupted.lastY;
    postEditHit('pointercancel', interrupted.subjectNode, hitNode || interrupted.subjectNode, {
      x: Number.isFinite(nextX) ? nextX : interrupted.originX,
      y: Number.isFinite(nextY) ? nextY : interrupted.originY,
      pointerId: interrupted.pointerId,
      button: 0,
      buttons: 0,
    });
    try { interrupted.subjectNode.releasePointerCapture(interrupted.pointerId); } catch (_) {}
    activeEditPointer = null;
    return true;
  }
  document.addEventListener('lostpointercapture', function (e) {
    if (!editBridgeEnabled && activeRepeatingMove && e.target === activeRepeatingMove.captureNode) {
      cancelRepeatingMove({ pointerId: activeRepeatingMove.pointerId });
      return;
    }
    if (!editBridgeEnabled || !activeEditPointer) return;
    if (activeEditPointer.ending || e.target !== activeEditPointer.subjectNode) return;
    cancelActiveEditPointer(activeEditPointer.lastX, activeEditPointer.lastY, e.target);
  }, true);
  document.addEventListener('pointercancel', function (e) {
    if (!editBridgeEnabled) {
      if (cancelRepeatingMove(e)) {
        try { e.preventDefault(); } catch (_) {}
        try { e.stopImmediatePropagation(); } catch (_) {}
      }
      return;
    }
    if (!activeEditPointer || activeEditPointer.pointerId !== e.pointerId) return;
    cancelActiveEditPointer(e.clientX, e.clientY, hitNodeAt(e.clientX, e.clientY, e.target));
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
  document.addEventListener('dragover', function (e) {
    if (
      !editBridgeEnabled
      || hasFriendlyWidgetPayload(e.dataTransfer)
      || !hasBlockTypePayload(e.dataTransfer)
    ) return;
    var blockType = '';
    try { blockType = e.dataTransfer.getData('application/x-r20-block-type') || ''; } catch (_) {}
    try { e.preventDefault(); } catch (_) {}
    try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
    postBlockTypeDrag('dragover', e, blockType);
  }, true);
  document.addEventListener('dragleave', function (e) {
    if (
      !editBridgeEnabled
      || hasFriendlyWidgetPayload(e.dataTransfer)
      || !hasBlockTypePayload(e.dataTransfer)
    ) return;
    if (e.relatedTarget && document.documentElement.contains(e.relatedTarget)) return;
    postBlockTypeDrag('dragleave', e, null);
  }, true);
  document.addEventListener('drop', function (e) {
    if (
      !editBridgeEnabled
      || hasFriendlyWidgetPayload(e.dataTransfer)
      || !hasBlockTypePayload(e.dataTransfer)
    ) return;
    var blockType = '';
    try { blockType = e.dataTransfer.getData('application/x-r20-block-type') || ''; } catch (_) {}
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
    postBlockTypeDrag('drop', e, blockType);
  }, true);
  document.addEventListener('dragover', function (e) {
    if (
      !editBridgeEnabled
      || hasFriendlyWidgetPayload(e.dataTransfer)
      || hasBlockTypePayload(e.dataTransfer)
      || !hasLayerPayload(e.dataTransfer)
    ) return;
    var blockId = '';
    try { blockId = e.dataTransfer.getData('application/x-r20-layer-block') || ''; } catch (_) {}
    if (!blockId) return;
    try { e.preventDefault(); } catch (_) {}
    try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
    postLayerDrag('dragover', e, blockId);
  }, true);
  document.addEventListener('dragleave', function (e) {
    if (
      !editBridgeEnabled
      || hasFriendlyWidgetPayload(e.dataTransfer)
      || hasBlockTypePayload(e.dataTransfer)
      || !hasLayerPayload(e.dataTransfer)
    ) return;
    if (e.relatedTarget && document.documentElement.contains(e.relatedTarget)) return;
    var blockId = '';
    try { blockId = e.dataTransfer.getData('application/x-r20-layer-block') || ''; } catch (_) {}
    postLayerDrag('dragleave', e, blockId);
  }, true);
  document.addEventListener('drop', function (e) {
    if (
      !editBridgeEnabled
      || hasFriendlyWidgetPayload(e.dataTransfer)
      || hasBlockTypePayload(e.dataTransfer)
      || !hasLayerPayload(e.dataTransfer)
    ) return;
    var blockId = '';
    try { blockId = e.dataTransfer.getData('application/x-r20-layer-block') || ''; } catch (_) {}
    if (!blockId) return;
    try { e.preventDefault(); } catch (_) {}
    try { e.stopImmediatePropagation(); } catch (_) {}
    postLayerDrag('drop', e, blockId);
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
  document.addEventListener('keydown', function (e) {
    if (!editBridgeEnabled || e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    var target = e.target;
    if (target && target.isContentEditable) return;
    var step = e.shiftKey ? 10 : 1;
    var deltaX = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    var deltaY = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    if (!deltaX && !deltaY) return;
    if (!applyKeyboardNudge(deltaX, deltaY)) return;
    try { e.preventDefault(); } catch (_) {}
    try { e.stopPropagation(); } catch (_) {}
  }, true);
  window.addEventListener('message', function (e) {
    if (e.source !== parent || !e.data) return;
    if (
      e.data.type === 'r20:external-pointer-drag'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      if (!editBridgeEnabled) return;
      var externalPhase = e.data.phase;
      if (externalPhase !== 'dragover' && externalPhase !== 'dragleave' && externalPhase !== 'drop') return;
      var externalX = Number(e.data.pointer && e.data.pointer.x);
      var externalY = Number(e.data.pointer && e.data.pointer.y);
      if (!Number.isFinite(externalX) || !Number.isFinite(externalY)) return;
      var externalTarget = hitNodeAt(externalX, externalY, document.body);
      var externalEvent = { clientX: externalX, clientY: externalY, target: externalTarget };
      if (e.data.kind === 'widget') {
        var externalPayload = typeof e.data.payload === 'string' && e.data.payload.length <= 1024
          ? e.data.payload
          : '';
        postWidgetDrag(externalPhase, externalEvent, externalPayload);
      } else if (e.data.kind === 'layer') {
        var externalBlockId = typeof e.data.blockId === 'string' && e.data.blockId.length <= 256
          ? e.data.blockId
          : '';
        postLayerDrag(externalPhase, externalEvent, externalBlockId);
      }
      return;
    }
    if (
      e.data.type === 'r20:edit-nudge-command'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      applyKeyboardNudge(Number(e.data.deltaX), Number(e.data.deltaY));
      return;
    }
    if (
      e.data.type === 'r20:edit-resize-preview'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      applyOptimisticEditResize(e.data);
      return;
    }
    if (
      e.data.type === 'r20:edit-resize-finalize'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      finalizeOptimisticEditResize(e.data);
      return;
    }
    if (
      e.data.type === 'r20:edit-drag-selection'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      var dragSelection = normalizeSelectedBlockIds(
        e.data.selectedBlockId || null,
        e.data.selectedBlockIds,
      );
      if (activeEditPointer && dragSelection.length > 1) {
        activeEditPointer.dragSelectionIds = dragSelection.slice(0, 128);
      }
      setEditSelection(dragSelection);
      return;
    }
    if (
      e.data.type === 'r20:edit-mode'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      setEditBridgeEnabled(
        e.data.enabled,
        e.data.selectedBlockId || null,
        e.data.selectedBlockIds,
      );
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
      e.data.type === 'r20:edit-abort'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      var abortPointerId = Number(e.data.pointerId);
      if (activeEditPointer && abortPointerId === activeEditPointer.pointerId) {
        cancelActiveEditPointer(
          activeEditPointer.lastX,
          activeEditPointer.lastY,
          activeEditPointer.subjectNode,
        );
      }
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
    if (
      e.data.type === 'r20:edit-apply-chunk-start'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      beginLivePatchChunks(e.data);
      return;
    }
    if (
      e.data.type === 'r20:edit-apply-chunk'
      && e.data.protocol === 1
      && e.data.bridgeId === editBridgeId
    ) {
      receiveLivePatchChunk(e.data);
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
      var previousWidgets = document.querySelectorAll('[data-r20-widget-selected="1"]');
      for (var previousWidgetIndex = 0; previousWidgetIndex < previousWidgets.length; previousWidgetIndex += 1) {
        previousWidgets[previousWidgetIndex].removeAttribute('data-r20-widget-selected');
      }
      var name = e.data.widgetName;
      if (!name) return;
      var nodes = document.querySelectorAll(
        '[data-widget-name="' + cssEscape(name) + '"],' +
        '[name="attr_' + cssEscape(name) + '"]'
      );
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].setAttribute('data-r20-widget-selected', '1');
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
  document.body.setAttribute('data-r20-worker-queue-overflows', String(sheetWorkerQueueOverflowCount));
  installSheetWorkers();
  scheduleResize();
  scheduleRenderReady();
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

#dialog-window.r20-preview-dialog {
  position: relative !important;
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  max-width: none !important;
  overflow: visible !important;
}

#dialog-window.r20-preview-dialog > .dialog,
#dialog-window.r20-preview-dialog > .dialog > .tab-content,
#dialog-window.r20-preview-dialog > .dialog > .tab-content > .sheetform {
  width: 100% !important;
  min-width: 0 !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
}

/* Roll20 keeps the iframe/form at its dialog width but lets the authored
 * .charactersheet root choose its own intrinsic width (for example 850px in
 * the modern live sheet and 860px in the legacy live sheet). Do not turn that
 * root into a viewport-sized app panel. These declarations deliberately stay
 * non-important: the imported sheet's own class/style must be able to set its
 * real width, height, min-size, or overflow just as it can in Roll20. */
#dialog-window.r20-preview-dialog > .dialog > .tab-content > .sheetform > .charactersheet.charsheet {
  width: auto;
  min-width: 0;
  max-width: none;
  height: auto;
  min-height: 0;
  overflow: visible;
  color: #333;
}

#dialog-window,
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

/* Roll20's visible sheet dialog keeps the 20px horizontal content inset even
 * when its title bar and button pane are not part of the sheet surface. */
#dialog-window .dialog.largedialog {
  padding: 0 20px !important;
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
body[data-r20-edit-mode="1"] [data-r20-block-id] {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
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
${scope} [data-r20-selected="1"],
${scope} [data-r20-widget-selected="1"] {
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
  const bodyInner = stripExecutablePageScripts(
    contract.bodyInner || (contract.hasAuthoredHtml ? '' : EMPTY_PLACEHOLDER),
  );
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
<style id="roll20-base">${roll20BaseIframeCss}</style>
<style id="roll20-legacy-sheet-surface">${legacyCssSanitize ? roll20LegacySheetSurfaceCss : ''}</style>${darkMode ? `
<style id="roll20-base-dark">${roll20DarkmodeIframeCss}</style>` : ''}
<style id="roll20-dialog-open">${ROLL20_DIALOG_OPEN_CSS}</style>
${legacyCssSanitize ? `<style id="roll20-legacy-input-state">${ROLL20_LEGACY_INPUT_STATE_CSS}</style>` : ''}
<style id="r20-runtime">${runtimeCss}</style>
<style id="r20-layer-filter">${layerFilterCss()}</style>
<style id="r20-renderer-model">${roll20RendererModelCss(roll20RendererModel)}</style>
<style id="r20-user">${previewCss}</style>
<style id="r20-preview-hidden">${ROLL20_PREVIEW_HIDDEN_CSS}</style>
</head>
<body${darkMode ? ' data-theme="dark"' : ''} data-layer="${layer}" data-roll20-sandbox-sanitize="${roll20SandboxSanitize ? '1' : '0'}" data-roll20-renderer-model="${roll20RendererModel}" data-r20-html-key="${htmlKey}" data-r20-render-ready="0">
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all r20-preview-dialog" id="dialog-window" style="position:relative;display:block;width:100%;height:auto;overflow:visible;padding:0;">
<div class="dialog largedialog characterviewer" style="display:block;visibility:visible;">
<div class="tab-content${darkMode ? ' sheet-darkmode' : ''}" id="tab-content" style="display:block;visibility:visible;">
<form class="sheetform">
<div class="charactersheet tab-pane active charsheet lang-undefined${darkMode ? ' sheet-darkmode' : ''}">
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
  const html = stripExecutablePageScripts(
    contract.bodyInner || (contract.hasAuthoredHtml ? '' : EMPTY_PLACEHOLDER),
  );
  const htmlKey = sheetSourceKey(html);
  const styles = {
    'roll20-legacy-sheet-surface': contract.legacyCssSanitize ? roll20LegacySheetSurfaceCss : '',
    'roll20-base-dark': darkMode ? roll20DarkmodeIframeCss : '',
    'roll20-legacy-input-state': contract.legacyCssSanitize ? ROLL20_LEGACY_INPUT_STATE_CSS : '',
    'r20-layer-filter': layerFilterCss(),
    'r20-user': contract.previewCss,
    'r20-renderer-model': roll20RendererModelCss(roll20RendererModel),
  };
  const i18n = normalizeTranslationForRoll20(opts.i18n ?? '');
  return {
    html,
    htmlKey,
    sourceKey: [
      'r20-source-v2',
      htmlKey,
      ...Object.entries(styles).map(([name, value]) => `${name}:${sheetSourceKey(value)}`),
      `i18n:${sheetSourceKey(i18n)}`,
      darkMode ? 'dark' : 'light',
      layer,
      contract.roll20SandboxSanitize ? 'sandbox' : 'local',
      roll20RendererModel,
      normalizeDocumentLanguage(opts.documentLanguage),
    ].join('|'),
    styles,
    i18n,
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

/**
 * Build the persistent live-patch payload and optional Shadow parts from one
 * prepared contract without rebuilding the unused iframe document string.
 */
export function buildSheetLiveBundle(
  opts: BuildDocOptions,
  config: { includeParts?: boolean } = {},
): SheetLiveBundle {
  const contract = prepareSheetRenderContract(opts);
  return {
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
  const bodyInner = stripExecutablePageScripts(
    contract.bodyInner || (contract.hasAuthoredHtml ? '' : EMPTY_PLACEHOLDER),
  );
  const documentLanguage = normalizeDocumentLanguage(opts.documentLanguage);

  // Shadow 안에서는 body 가 없음 → wrapper .charsheet 에 data-layer 박힘
  // layerFilterCss scope = '.charsheet' 로 selector 일관성 유지.
  // spec 25 + actual Roll20 probe: 실 Roll20 sandbox CSS (ground truth, :root→:host
  // rewrite) 먼저 → runtime overlay → user CSS.
  // user CSS 가 마지막 source order 라 동일 specificity 셀렉터에선 사용자 우선.
  const darkMode = opts.darkMode === true;
  const css = [
    styleSourceChunk('roll20-base', roll20BaseShadowCss),
    styleSourceChunk(
      'roll20-legacy-sheet-surface',
      legacyCssSanitize ? roll20LegacySheetSurfaceCss : '',
    ),
    darkMode ? styleSourceChunk('roll20-darkmode', roll20DarkmodeShadowCss) : '',
    styleSourceChunk('roll20-dialog-context', ROLL20_DIALOG_OPEN_CSS),
    legacyCssSanitize ? styleSourceChunk('roll20-legacy-input-state', ROLL20_LEGACY_INPUT_STATE_CSS) : '',
    styleSourceChunk('app-preview-runtime', runtimeCss),
    styleSourceChunk('app-layer-filter', layerFilterCss('.charsheet')),
    styleSourceChunk('roll20-renderer-model', roll20RendererModelCss(roll20RendererModel)),
    styleSourceChunk('sheet-user-css', previewCss),
    styleSourceChunk('preview-hidden-runtime', ROLL20_PREVIEW_HIDDEN_CSS),
  ].join('\n');

  const html = `
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all r20-preview-dialog" id="dialog-window" lang="${documentLanguage}" style="position:relative;display:block;width:100%;height:auto;overflow:visible;padding:0;">
<div class="dialog largedialog characterviewer" style="display:block;visibility:visible;">
<div class="tab-content${darkMode ? ' sheet-darkmode' : ''}" id="tab-content" style="display:block;visibility:visible;">
<form class="sheetform">
<div class="charactersheet tab-pane active charsheet lang-undefined${darkMode ? ' sheet-darkmode' : ''}">
${bodyInner}
</div>
</form>
</div>
</div>
</div>`;

  return { html, css };
}

/**
 * Keep the preview runtime limited to Roll20 worker source.
 *
 * Ordinary page scripts remain in the authored workspace and source emission,
 * but they must not execute inside the editor iframe. The final Roll20 payload
 * excludes them and preserves a non-executable ZIP backup. Worker scripts are
 * the only authored script boundary that the local preview runtime emulates.
 * Removing the other script elements here also prevents external `src` files
 * from loading during import/preview while leaving the user's source intact.
 */
function stripExecutablePageScripts(html: string): string {
  if (!html) return '';
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, rawAttrs: string, body: string) => {
    const type = getScriptType(rawAttrs);
    return isRoll20WorkerScript(type, body) ? full : '';
  });
}

function getScriptType(rawAttrs: string): string {
  const typeMatch = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))/i.exec(rawAttrs ?? '');
  return String(typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '').trim().toLowerCase();
}

export function buildSheetParts(opts: BuildDocOptions): SheetRenderParts {
  return buildSheetPartsFromContract(opts, prepareSheetRenderContract(opts));
}

'use client';

/**
 * EditCanvas — edit-mode orchestrator.
 *
 * Owns the canonical preview render mount (mountSheetShadow) plus the editor
 * interaction state, and composes the modular editor surfaces:
 *
 *   - tools/EditToolbar        top strip (snap, placement, width, zoom, status)
 *   - layers/EditLayerPanel    virtualized layer tree with drop modes
 *   - canvas/EditCanvasStage   scroll/zoom stage + shadow host + selection overlay
 *   - canvas/SelectionOverlay  bounding box, resize handles, metadata chip
 *   - lib/editor/geometry      measurement service
 *   - lib/editor/dropOverlay   drop targeting + editor-only drop indicators
 *   - lib/editor/editorCommands  move/resize/field commits and emit-cache patches
 *
 * Edit mode stays "canonical preview-rendered sheet + editor-only overlays":
 * nothing in this tree writes editor chrome into emitted sheet HTML/CSS.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { getLayerRole } from '@/lib/editor/layerRoles';
import {
  findCanvasDropTarget,
  formatCanvasDropLabel,
  formatDropModeLabel,
  hasFriendlyWidgetPayload,
  markDropContainer,
} from '@/lib/editor/dropOverlay';
import {
  applyOptimisticPositions,
  commitMove,
  htmlOrCssHasPosition,
  patchEmitCacheAfterMove,
  WORKSPACE_ORDER,
  type OptimisticMove,
  type PendingMove,
} from '@/lib/editor/editorCommands';
import {
  getHostScale,
  getShadowBlockElement,
  hasPositionDeclaration,
  measureDropPosition,
  measureDropPositionInBlock,
  measureShadowSheetBox,
  parseCssPx,
  parsePx,
} from '@/lib/editor/geometry';
import { applyAssetReplacements } from '@/lib/export/asset_replacements';
import { buildSheetParts } from '@/lib/preview/buildDoc';
import { mountSheetShadow } from '@/lib/preview/shadowMount';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import {
  FRIENDLY_WIDGET_MIME,
  appendFriendlyWidgetPreset,
  decodeFriendlyWidgetDrag,
} from '@/lib/widgets/presets';
import EditCanvasStage from './canvas/EditCanvasStage';
import EditLayerPanel from './layers/EditLayerPanel';
import EditToolbar from './tools/EditToolbar';

type DragOrigin = {
  blockId: string;
  ws: WorkspaceKey;
  kind: 'position-fields' | 'style-field';
  origLeft: number;
  origTop: number;
  origStyle: string;
  containingBlockEl: HTMLElement | null;
  containingBlockId: string | null;
  containingBlockStyle: string;
  containingBlockNeedsRelative: boolean;
  scale: number;
  el: HTMLElement;
  origTransform: string;
  origTransition: string;
  origWillChange: string;
  origPosition: string;
  origStyleLeft: string;
  origStyleTop: string;
  origContainingBlockPosition: string;
};

export default function EditCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const setShadowSelectedRef = useRef<((id: string | null, opts?: { scrollIntoView?: boolean }) => void) | null>(null);
  const dragOriginRef = useRef<DragOrigin | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const visualRafRef = useRef<number | null>(null);
  const commitTimerRef = useRef<number | null>(null);

  const emitHtml = useWorkspaceStore((s) => s.emitCache.html);
  const emitCss = useWorkspaceStore((s) => s.emitCache.css);
  const emitI18n = useWorkspaceStore((s) => s.emitCache.i18n);
  const htmlCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const cssCount = useWorkspaceStore((s) => s.workspaces.css.blockCount);
  const i18nCount = useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const selectedBlockId = useWorkspaceStore((s) => s.selectedBlockId);
  const selectionOrigin = useWorkspaceStore((s) => s.selectionOrigin);
  const setSelectedBlockId = useWorkspaceStore((s) => s.setSelectedBlockId);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const previewLayer = useUiStore((s) => s.previewLayer);
  const zoom = useUiStore((s) => s.previewZoom);
  const setPreviewZoom = useUiStore((s) => s.setPreviewZoom);
  const sheetCanvasWidth = useUiStore((s) => s.sheetCanvasWidth);
  const setSheetCanvasWidth = useUiStore((s) => s.setSheetCanvasWidth);
  const rolltemplateCanvasWidth = useUiStore((s) => s.rolltemplateCanvasWidth);
  const setRolltemplateCanvasWidth = useUiStore((s) => s.setRolltemplateCanvasWidth);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleSnap = useUiStore((s) => s.toggleSnapEnabled);
  const editPlacementMode = useUiStore((s) => s.editPlacementMode);
  const setEditPlacementMode = useUiStore((s) => s.setEditPlacementMode);
  const sanitize = usePreviewStore((s) => s.sanitize);
  const legacyCssSanitize = usePreviewStore((s) => s.legacyCssSanitize);
  const roll20SandboxSanitize = usePreviewStore((s) => s.roll20SandboxSanitize);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const assetReplacementMap = usePreviewStore((s) => s.assetReplacementMap);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [editCanvasHeight, setEditCanvasHeight] = useState(900);
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, OptimisticMove>>({});
  const [layerSearch, setLayerSearch] = useState('');

  const effectiveLayer = editSubmode === 'rolltemplate' ? 'roll' : previewLayer;
  const effectiveCanvasWidth =
    editSubmode === 'rolltemplate' ? rolltemplateCanvasWidth : sheetCanvasWidth;
  const setEffectiveCanvasWidth =
    editSubmode === 'rolltemplate' ? setRolltemplateCanvasWidth : setSheetCanvasWidth;
  const isEmpty = htmlCount + cssCount + i18nCount === 0;
  const fitScale =
    zoom === 'fit' && viewportWidth > 0
      ? Math.min(1, Math.max(0.25, (viewportWidth - 48) / effectiveCanvasWidth))
      : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;
  const optimisticHtml = useMemo(
    () => applyOptimisticPositions(emitHtml, optimisticMoves),
    [emitHtml, optimisticMoves],
  );
  const editAssetText = useMemo(
    () => applyAssetReplacements({ html: optimisticHtml, css: emitCss }, assetReplacementMap),
    [optimisticHtml, emitCss, assetReplacementMap],
  );

  const parts = useMemo(
    () =>
      buildSheetParts({
        html: editAssetText.html,
        css: editAssetText.css,
        i18n: emitI18n,
        sanitize,
        legacyCssSanitize,
        roll20SandboxSanitize,
        darkMode,
        previewLayer: effectiveLayer,
        includeEditorOverlays: false,
      }),
    [editAssetText.html, editAssetText.css, emitI18n, sanitize, legacyCssSanitize, roll20SandboxSanitize, darkMode, effectiveLayer],
  );

  const snap = useCallback(
    (value: number) => {
      const px = Math.max(0, Math.round(value));
      return snapEnabled ? Math.round(px / 8) * 8 : px;
    },
    [snapEnabled],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const update = () => setViewportWidth(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (commitTimerRef.current != null) {
        window.clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    };
  }, []);

  const cleanupDragVisual = useCallback(() => {
    const origin = dragOriginRef.current;
    if (!origin) return;
    origin.el.style.transform = origin.origTransform;
    origin.el.style.transition = origin.origTransition;
    origin.el.style.willChange = origin.origWillChange;
    origin.el.style.position = origin.origPosition;
    origin.el.style.left = origin.origStyleLeft;
    origin.el.style.top = origin.origStyleTop;
    if (origin.containingBlockEl) {
      origin.containingBlockEl.style.position = origin.origContainingBlockPosition;
    }
  }, []);

  const lockVisualAtDrop = useCallback((origin: DragOrigin, pending: PendingMove) => {
    if (origin.containingBlockEl && origin.containingBlockNeedsRelative) {
      origin.containingBlockEl.style.position = 'relative';
    }
    origin.el.style.transition = origin.origTransition;
    origin.el.style.willChange = origin.origWillChange;
    origin.el.style.transform = origin.origTransform;
    origin.el.style.position = 'absolute';
    origin.el.style.left = `${pending.left}px`;
    origin.el.style.top = `${pending.top}px`;
  }, []);

  const commitMoveLater = useCallback((pending: PendingMove) => {
    pendingMoveRef.current = null;
    if (commitTimerRef.current != null) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      commitMove(pending);
    }, 0);
  }, []);

  const handleWidgetDrop = useCallback(
    (clientX: number, clientY: number, payload: string): void => {
      const preset = decodeFriendlyWidgetDrag(payload);
      if (!preset) return;
      const target = findCanvasDropTarget(hostRef.current, clientX, clientY);
      const freeInside = editPlacementMode === 'free' && target?.mode === 'inside';
      const pos = freeInside && target?.containerBlockId
        ? measureDropPositionInBlock(hostRef.current, target.containerBlockId, clientX, clientY)
        : measureDropPosition(hostRef.current, scrollRef.current, clientX, clientY);
      markDropContainer(hostRef.current, null);
      const id = appendFriendlyWidgetPreset(preset, pos, {
        mode: freeInside ? 'absolute-in-container' : target ? 'flow' : 'absolute',
        placement: target?.mode,
        containerBlockId: target?.containerBlockId ?? target?.blockId ?? null,
        siblingBlockId: target?.siblingBlockId ?? null,
      });
      if (id) {
        setLastMove(
          freeInside && target
            ? `${preset.label} 자유 배치: ${target.label}`
            : target
              ? `${preset.label} ${formatDropModeLabel(target.mode)}: ${target.label}`
              : `${preset.label} 추가: ${Math.round(pos.left)}px, ${Math.round(pos.top)}px`,
        );
      }
    },
    [editPlacementMode],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(FRIENDLY_WIDGET_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const target = findCanvasDropTarget(hostRef.current, e.clientX, e.clientY);
      markDropContainer(hostRef.current, target, formatCanvasDropLabel(target, editPlacementMode));
    }
  }, [editPlacementMode]);

  const onDrop = useCallback((e: React.DragEvent) => {
    const payload = e.dataTransfer.getData(FRIENDLY_WIDGET_MIME);
    if (!payload) return;
    e.preventDefault();
    e.stopPropagation();
    handleWidgetDrop(e.clientX, e.clientY, payload);
  }, [handleWidgetDrop]);

  const handleNativeDragLeave = useCallback((event: Event) => {
    const e = event as DragEvent;
    const host = hostRef.current;
    if (!host) return;
    const related = e.relatedTarget as Node | null;
    if (related && (host === related || host.contains(related))) return;
    markDropContainer(host, null);
  }, []);

  const handleNativeDragOver = useCallback((event: Event) => {
    const e = event as DragEvent;
    if (!hasFriendlyWidgetPayload(e.dataTransfer, FRIENDLY_WIDGET_MIME)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    const target = findCanvasDropTarget(hostRef.current, e.clientX, e.clientY);
    markDropContainer(hostRef.current, target, formatCanvasDropLabel(target, editPlacementMode));
  }, [editPlacementMode]);

  const handleNativeDrop = useCallback((event: Event) => {
    const e = event as DragEvent;
    const payload = e.dataTransfer?.getData(FRIENDLY_WIDGET_MIME) ?? '';
    if (!payload) return;
    e.preventDefault();
    e.stopPropagation();
    handleWidgetDrop(e.clientX, e.clientY, payload);
  }, [handleWidgetDrop]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const mounted = mountSheetShadow(host, {
      html: parts.html,
      css: parts.css,
      i18n: emitI18n,
      layer: effectiveLayer,
      darkMode,
      disableNativeControls: true,
      disableInlineTextEdit: true,
      disableContextMenu: true,
      getLayerRoleForBlock: (blockId) => {
        const adapter = getBlocklyAdapter();
        const block = adapter.getBlock('html', blockId);
        if (!block) return null;
        const role = getLayerRole(block.type);
        return {
          ...role,
          canReceiveChildren: role.canReceiveChildren && adapter.canNestInContainer('html', blockId),
        };
      },
      onSelect: (blockId) => setSelectedBlockId(blockId, 'preview'),
      onDragStart: (blockId) => {
        const origin = resolveDragOrigin(host, blockId);
        dragOriginRef.current = origin;
        pendingMoveRef.current = null;
        if (!origin) {
          setLastMove('이 블록은 위치 값을 저장할 필드가 없어 이동할 수 없습니다.');
          return;
        }
        origin.el.style.transition = 'none';
        origin.el.style.willChange = 'transform';
      },
      onDragMove: (blockId, dx, dy) => {
        const origin = dragOriginRef.current;
        if (!origin || origin.blockId !== blockId) return;
        const scale = origin.scale || 1;
        pendingMoveRef.current = {
          ws: origin.ws,
          blockId,
          kind: origin.kind,
          left: snap(origin.origLeft + dx / scale),
          top: snap(origin.origTop + dy / scale),
          origStyle: origin.origStyle,
          containingBlockId: origin.containingBlockId,
          containingBlockStyle: origin.containingBlockStyle,
          containingBlockNeedsRelative: origin.containingBlockNeedsRelative,
        };
        if (visualRafRef.current == null) {
          visualRafRef.current = window.requestAnimationFrame(() => {
            visualRafRef.current = null;
            const current = dragOriginRef.current;
            const pending = pendingMoveRef.current;
            if (!current || !pending || current.blockId !== pending.blockId) return;
            const tx = pending.left - current.origLeft;
            const ty = pending.top - current.origTop;
            current.el.style.transform = `${current.origTransform ? `${current.origTransform} ` : ''}translate3d(${tx}px, ${ty}px, 0)`;
          });
        }
      },
      onDragEnd: () => {
        if (visualRafRef.current != null) {
          window.cancelAnimationFrame(visualRafRef.current);
          visualRafRef.current = null;
        }
        const origin = dragOriginRef.current;
        const pending = pendingMoveRef.current;
        if (origin && pending) {
          lockVisualAtDrop(origin, pending);
          patchEmitCacheAfterMove(pending);
          setOptimisticMoves((moves) => ({
            ...moves,
            [pending.blockId]: {
              left: pending.left,
              top: pending.top,
              containingBlockId: pending.containingBlockId,
              containingBlockStyle: pending.containingBlockStyle,
              containingBlockNeedsRelative: pending.containingBlockNeedsRelative,
            },
          }));
          setLastMove(`${pending.left}px, ${pending.top}px`);
          commitMoveLater(pending);
        } else {
          cleanupDragVisual();
          pendingMoveRef.current = null;
        }
        dragOriginRef.current = null;
      },
    });

    setShadowSelectedRef.current = mounted.setSelected;
    const currentSelected = useWorkspaceStore.getState().selectedBlockId;
    if (currentSelected) mounted.setSelected(currentSelected, { scrollIntoView: false });
    const shadowBody = mounted.shadow.querySelector<HTMLElement>('body[data-r20-shadow-body], body.charsheet');
    const shadowRootEl = mounted.shadow.querySelector<HTMLElement>('#charsheet-root');
    const updateCanvasMetrics = () => {
      const nextBox = measureShadowSheetBox(mounted.shadow);
      const nextHeight = nextBox.height;
      setEditCanvasHeight((prev) => (Math.abs(prev - nextHeight) > 8 ? nextHeight : prev));
      if (editSubmode === 'rolltemplate') return;
      const ui = useUiStore.getState();
      const currentWidth = ui.sheetCanvasWidth;
      if (nextBox.width > currentWidth + 8) {
        ui.setSheetCanvasWidth(nextBox.width);
      }
    };
    updateCanvasMetrics();
    const resizeObserver = new ResizeObserver(updateCanvasMetrics);
    if (shadowRootEl) resizeObserver.observe(shadowRootEl);
    const mutationObserver = new MutationObserver(updateCanvasMetrics);
    if (shadowRootEl) {
      mutationObserver.observe(shadowRootEl, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style', 'hidden', 'value', 'checked'],
      });
    }
    host.addEventListener('dragover', handleNativeDragOver);
    host.addEventListener('drop', handleNativeDrop);
    host.addEventListener('dragleave', handleNativeDragLeave);
    mounted.shadow.addEventListener('dragover', handleNativeDragOver);
    mounted.shadow.addEventListener('drop', handleNativeDrop);
    mounted.shadow.addEventListener('dragleave', handleNativeDragLeave);
    shadowBody?.addEventListener('dragover', handleNativeDragOver);
    shadowBody?.addEventListener('drop', handleNativeDrop);
    shadowBody?.addEventListener('dragleave', handleNativeDragLeave);
    return () => {
      if (visualRafRef.current != null) window.cancelAnimationFrame(visualRafRef.current);
      cleanupDragVisual();
      pendingMoveRef.current = null;
      dragOriginRef.current = null;
      setShadowSelectedRef.current = null;
      host.removeEventListener('dragover', handleNativeDragOver);
      host.removeEventListener('drop', handleNativeDrop);
      host.removeEventListener('dragleave', handleNativeDragLeave);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      mounted.shadow.removeEventListener('dragover', handleNativeDragOver);
      mounted.shadow.removeEventListener('drop', handleNativeDrop);
      mounted.shadow.removeEventListener('dragleave', handleNativeDragLeave);
      shadowBody?.removeEventListener('dragover', handleNativeDragOver);
      shadowBody?.removeEventListener('drop', handleNativeDrop);
      shadowBody?.removeEventListener('dragleave', handleNativeDragLeave);
      mounted.cleanup();
    };
  }, [
    parts,
    emitI18n,
    effectiveLayer,
    darkMode,
    snap,
    handleNativeDragOver,
    handleNativeDrop,
    handleNativeDragLeave,
    cleanupDragVisual,
    lockVisualAtDrop,
    commitMoveLater,
    editSubmode,
    setSelectedBlockId,
  ]);

  useEffect(() => {
    setShadowSelectedRef.current?.(selectedBlockId, {
      scrollIntoView: selectionOrigin === 'tree',
    });
  }, [selectedBlockId, selectionOrigin]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setOptimisticMoves((moves) => {
        let changed = false;
        const next = { ...moves };
        for (const [blockId, move] of Object.entries(moves)) {
          if (htmlOrCssHasPosition(emitHtml, emitCss, blockId, move.left, move.top)) {
            delete next[blockId];
            changed = true;
          }
        }
        return changed ? next : moves;
      });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [emitHtml, emitCss]);

  return (
    <div
      className="flex flex-1 min-h-0 flex-col bg-[var(--bg-canvas)]"
      data-testid="edit-canvas-root"
      data-edit-submode={editSubmode}
    >
      <EditToolbar
        title={editSubmode === 'rolltemplate' ? '굴림 결과 편집' : '시트 편집'}
        snapEnabled={snapEnabled}
        onToggleSnap={toggleSnap}
        placementMode={editPlacementMode}
        onPlacementModeChange={setEditPlacementMode}
        canvasWidth={effectiveCanvasWidth}
        minWidth={editSubmode === 'rolltemplate' ? 200 : 320}
        maxWidth={editSubmode === 'rolltemplate' ? 600 : 2000}
        widthAriaLabel={editSubmode === 'rolltemplate' ? '굴림 결과 캔버스 폭' : '시트 캔버스 폭'}
        onCanvasWidthChange={setEffectiveCanvasWidth}
        zoom={zoom}
        onZoomChange={setPreviewZoom}
        statusText={
          lastMove ??
          (editPlacementMode === 'free'
            ? '자유 배치: 틀 안에 놓으면 그 틀 기준 left/top으로 반영됩니다.'
            : '흐름 배치: 틀 안에 놓으면 순서가 바뀌고 주변 요소가 밀립니다.')
        }
      />

      <div
        className="grid flex-1 min-h-0"
        style={{ gridTemplateColumns: '248px minmax(0, 1fr)' }}
      >
        <EditLayerPanel search={layerSearch} onSearchChange={setLayerSearch} />
        <EditCanvasStage
          scrollRef={scrollRef}
          hostRef={hostRef}
          isEmpty={isEmpty}
          canvasWidth={effectiveCanvasWidth}
          canvasHeight={editCanvasHeight}
          scale={scale}
          selectedBlockId={selectedBlockId}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onStatus={setLastMove}
        />
      </div>
    </div>
  );
}

function resolveDragOrigin(host: HTMLElement, blockId: string): DragOrigin | null {
  const adapter = getBlocklyAdapter();
  const el = getShadowBlockElement(host, blockId);
  if (!el) return null;
  const active = useWorkspaceStore.getState().activeWorkspace;
  const order = [active, ...WORKSPACE_ORDER].filter(
    (ws, idx, arr): ws is WorkspaceKey => !!ws && arr.indexOf(ws) === idx,
  );

  for (const ws of order) {
    if (!adapter.getBlock(ws, blockId)) continue;
    const hasLeft = adapter.hasBlockField(ws, blockId, 'LEFT_PX');
    const hasTop = adapter.hasBlockField(ws, blockId, 'TOP_PX');
    const style = adapter.getBlockField(ws, blockId, 'STYLE') ?? '';
    const scale = getHostScale(host);
    const common = {
      el,
      origTransform: el.style.transform,
      origTransition: el.style.transition,
      origWillChange: el.style.willChange,
      origPosition: el.style.position,
      origStyleLeft: el.style.left,
      origStyleTop: el.style.top,
      origContainingBlockPosition: '',
    };

    if (hasLeft && hasTop) {
      return {
        blockId,
        ws,
        kind: 'position-fields',
        origLeft: parsePx(adapter.getBlockField(ws, blockId, 'LEFT_PX')),
        origTop: parsePx(adapter.getBlockField(ws, blockId, 'TOP_PX')),
        origStyle: style,
        containingBlockEl: null,
        containingBlockId: null,
        containingBlockStyle: '',
        containingBlockNeedsRelative: false,
        scale,
        ...common,
      };
    }

    if (adapter.hasBlockField(ws, blockId, 'STYLE')) {
      const measured = measureBlockPosition(host, blockId, ws);
      return {
        blockId,
        ws,
        kind: 'style-field',
        origLeft: measured.containingBlockId ? measured.left : parseCssPx(style, 'left') ?? measured.left,
        origTop: measured.containingBlockId ? measured.top : parseCssPx(style, 'top') ?? measured.top,
        origStyle: style,
        containingBlockEl: measured.containingBlockEl,
        containingBlockId: measured.containingBlockId,
        containingBlockStyle: measured.containingBlockStyle,
        containingBlockNeedsRelative: measured.containingBlockNeedsRelative,
        scale,
        ...common,
        origContainingBlockPosition: measured.containingBlockEl?.style.position ?? '',
      };
    }
  }

  return null;
}

function measureBlockPosition(
  host: HTMLElement,
  blockId: string,
  ws: WorkspaceKey,
): {
  left: number;
  top: number;
  containingBlockEl: HTMLElement | null;
  containingBlockId: string | null;
  containingBlockStyle: string;
  containingBlockNeedsRelative: boolean;
} {
  const el = getShadowBlockElement(host, blockId);
  const root =
    host.shadowRoot?.querySelector<HTMLElement>('body.charsheet') ??
    host.shadowRoot?.querySelector<HTMLElement>('.charsheet');
  if (!el || !root) {
    return {
      left: 0,
      top: 0,
      containingBlockEl: null,
      containingBlockId: null,
      containingBlockStyle: '',
      containingBlockNeedsRelative: false,
    };
  }
  const adapter = getBlocklyAdapter();
  const container = findEditableContainingBlock(el, blockId, ws);
  const frame = container?.el ?? root;
  const elRect = el.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return {
    left: Math.max(0, Math.round(elRect.left - frameRect.left + frame.scrollLeft)),
    top: Math.max(0, Math.round(elRect.top - frameRect.top + frame.scrollTop)),
    containingBlockEl: container?.el ?? null,
    containingBlockId: container?.blockId ?? null,
    containingBlockStyle: container?.style ?? '',
    containingBlockNeedsRelative: container
      ? !hasPositionDeclaration(container.style) &&
        getComputedStyle(container.el).position === 'static' &&
        adapter.hasBlockField(ws, container.blockId, 'STYLE')
      : false,
  };
}

function findEditableContainingBlock(
  el: HTMLElement,
  blockId: string,
  ws: WorkspaceKey,
): { el: HTMLElement; blockId: string; style: string } | null {
  const adapter = getBlocklyAdapter();
  let cur = el.parentElement;
  while (cur) {
    const id = cur.dataset.r20BlockId;
    if (id && id !== blockId && adapter.getBlock(ws, id) && adapter.hasBlockField(ws, id, 'STYLE')) {
      return {
        el: cur,
        blockId: id,
        style: adapter.getBlockField(ws, id, 'STYLE') ?? '',
      };
    }
    cur = cur.parentElement;
  }
  return null;
}

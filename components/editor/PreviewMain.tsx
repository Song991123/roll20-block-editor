'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { useChatStore } from '@/lib/stores/chatStore';
import { parseRoot } from '@/lib/dice/parser';
import {
  executeRoot,
  type AttrResolver,
  type QueryResolver,
  type RollResult,
} from '@/lib/dice/executor';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { getBlockDef } from '@/lib/blocks/registry';
import {
  buildSheetDoc,
  buildSheetLiveBundle,
  type BuildDocOptions,
} from '@/lib/preview/buildDoc';
import { flushEmitPipeline } from '@/lib/preview/useEmitPipeline';
import { applyAssetReplacements } from '@/lib/export/asset_replacements';
import { mountSheetShadow } from '@/lib/preview/shadowMount';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { markEditorTiming, markEditorTimingOnce } from '@/lib/perf/editorTiming';
import ShadowContextMenu, { type ShadowContextMenuAction } from './ShadowContextMenu';
import { playSfx } from '@/lib/sfx';
import PreviewEmptyState from './PreviewEmptyState';
import {
  R20_IFRAME_EDIT_PROTOCOL,
  isTrustedIframeMessage,
  parseIframeEditBridgeMessage,
  type IframeEditHitMessage,
  type IframeEditRect,
  type IframeEditSelectionNode,
} from '@/lib/preview/iframeEditBridge';
import {
  commitIframeFlowDrop,
  filterDropTargetForPlacement,
  resolveIframeEditDropTarget,
  resolveIframeContainerPoint,
  resolveIframeFreePlacement,
  resolveIframeMultiFreePlacement,
  resolveIframeLayerDropTarget,
  resolveIframeLayerFreePlacement,
  resolveIframeWidgetDropTarget,
  type IframeEditDropTarget,
} from '@/lib/editor/iframeDropTarget';
import {
  canManageDesignStyle,
  commitManagedDesignPosition,
  commitManagedDesignStyle,
} from '@/lib/editor/designPosition';
import {
  managedResizeDeclarations,
  resizeHandlesForGeometry,
  resolveDesignResizeRect,
  type DesignResizeHandle,
} from '@/lib/editor/designResize';
import {
  designSelectionBounds,
  resolveDesignAlignment,
  resolveDesignDistribution,
  type DesignAlignmentMode,
  type DesignDistributionMode,
} from '@/lib/editor/designAlignment';
import { getLayerRole } from '@/lib/editor/layerRoles';
import { dropIndicatorLabel, getDropIndicatorRect } from '@/lib/editor/dropIndicator';
import {
  appendFriendlyWidgetPreset,
  decodeFriendlyWidgetDrag,
  FRIENDLY_WIDGET_MIME,
} from '@/lib/widgets/presets';
import {
  clampCanvasWidth,
  clampSheetRenderHeight,
  resolveEmptyCanvasDropPoint,
  SHEET_RENDER_MIN_HEIGHT,
} from '@/lib/preview/canvasDimensions';
import { buildTargetedHtmlPatchPlan } from '@/lib/preview/targetedHtmlPatch';

type OptimisticFlowCommit = {
  subjectBlockId: string;
  placement: 'inside' | 'before' | 'after';
  containerBlockId: string | null;
  siblingBlockId: string | null;
};

type AppliedSource = {
  sourceKey: string;
  htmlKey: string;
  html: string;
};

type PendingTargetedHtmlPatch = {
  blockIds: string[];
};

type IframeResizeSession = {
  pointerId: number;
  blockId: string;
  handle: DesignResizeHandle;
  startClientX: number;
  startClientY: number;
  origin: IframeEditHitMessage;
  currentRect: IframeEditRect;
};

type IframeResizePreview = {
  blockId: string;
  rect: IframeEditRect;
};

const RESIZE_HANDLE_STYLE: Record<DesignResizeHandle, {
  left: string;
  top: string;
  transform: string;
  cursor: CSSProperties['cursor'];
  label: string;
}> = {
  nw: { left: '0%', top: '0%', transform: 'translate(-50%, -50%)', cursor: 'nwse-resize', label: '왼쪽 위' },
  n: { left: '50%', top: '0%', transform: 'translate(-50%, -50%)', cursor: 'ns-resize', label: '위' },
  ne: { left: '100%', top: '0%', transform: 'translate(-50%, -50%)', cursor: 'nesw-resize', label: '오른쪽 위' },
  e: { left: '100%', top: '50%', transform: 'translate(-50%, -50%)', cursor: 'ew-resize', label: '오른쪽' },
  se: { left: '100%', top: '100%', transform: 'translate(-50%, -50%)', cursor: 'nwse-resize', label: '오른쪽 아래' },
  s: { left: '50%', top: '100%', transform: 'translate(-50%, -50%)', cursor: 'ns-resize', label: '아래' },
  sw: { left: '0%', top: '100%', transform: 'translate(-50%, -50%)', cursor: 'nesw-resize', label: '왼쪽 아래' },
  w: { left: '0%', top: '50%', transform: 'translate(-50%, -50%)', cursor: 'ew-resize', label: '왼쪽' },
};

const ALIGNMENT_CONTROLS: readonly {
  mode: DesignAlignmentMode;
  label: string;
  Icon: LucideIcon;
}[] = [
  { mode: 'left', label: '왼쪽 맞춤', Icon: AlignStartVertical },
  { mode: 'horizontal-center', label: '가로 가운데 맞춤', Icon: AlignCenterVertical },
  { mode: 'right', label: '오른쪽 맞춤', Icon: AlignEndVertical },
  { mode: 'top', label: '위쪽 맞춤', Icon: AlignStartHorizontal },
  { mode: 'vertical-center', label: '세로 가운데 맞춤', Icon: AlignCenterHorizontal },
  { mode: 'bottom', label: '아래쪽 맞춤', Icon: AlignEndHorizontal },
];

const DISTRIBUTION_CONTROLS: readonly {
  mode: DesignDistributionMode;
  label: string;
  Icon: LucideIcon;
}[] = [
  { mode: 'horizontal', label: '가로 간격 맞춤', Icon: AlignHorizontalDistributeCenter },
  { mode: 'vertical', label: '세로 간격 맞춤', Icon: AlignVerticalDistributeCenter },
];

function paintOverlayRect(node: HTMLDivElement | null, rect: IframeEditRect): void {
  if (!node) return;
  node.style.left = `${rect.left}px`;
  node.style.top = `${rect.top}px`;
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;
}

function shiftedRect(rect: IframeEditRect, deltaX: number, deltaY: number): IframeEditRect {
  return {
    ...rect,
    left: rect.left + deltaX,
    top: rect.top + deltaY,
  };
}

function inferMultiDragOrigin(
  origin: IframeEditHitMessage,
  end: IframeEditHitMessage,
): IframeEditHitMessage {
  if ((origin.selection?.length ?? 0) > 1 || (end.selection?.length ?? 0) <= 1) {
    return origin;
  }
  const deltaX = end.pointer.x - origin.pointer.x;
  const deltaY = end.pointer.y - origin.pointer.y;
  const selection = end.selection?.map((selected): IframeEditSelectionNode => ({
    geometry: {
      ...selected.geometry,
      rect: {
        ...selected.geometry.rect,
        left: selected.geometry.rect.left - deltaX,
        top: selected.geometry.rect.top - deltaY,
      },
    },
    hitPath: selected.hitPath.map((geometry, index) => index === 0
      ? {
          ...geometry,
          rect: {
            ...geometry.rect,
            left: geometry.rect.left - deltaX,
            top: geometry.rect.top - deltaY,
          },
        }
      : geometry),
  }));
  return selection?.length
    ? { ...origin, selection }
    : origin;
}

/**
 * 미리보기 메인 — iframe srcdoc, sandbox.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + 10_system_architecture §3 + D52 / D50.
 *
 * Phase 2:
 *   - workspace 의 모든 블록을 emit (lib/preview/emit) → autoPrefix → runtimeCss 합성
 *     (lib/preview/buildDoc) → iframe srcdoc 으로 박음.
 *   - structureVersion / sanitize / darkMode 변경 → 500ms 디바운스 후 재emit.
 *   - 미리보기 → 우측 인스펙터 sync 는 postMessage(r20:select) 유지.
 *   - 선택된 블록 → iframe 안 highlight 는 postMessage(r20:highlight) 송신.
 *   - 좌측 사이드 카드 drag → 본 영역 drop → appendBlockToActive.
 *
 * Phase 5+ 에서 emit-worker 로 이동 (현재는 main thread).
 */
export default function PreviewMain() {
  markEditorTimingOnce('preview-render-start');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // emit 결과는 useEmitPipeline (EditorShell 에서 항상 mount) 가 store 에 박는다.
  // PreviewMain 은 본 결과를 읽어 buildSheetDoc → srcdoc 만 생성.
  const emitHtml = useWorkspaceStore((s) => s.emitCache.html);
  const emitCss = useWorkspaceStore((s) => s.emitCache.css);
  const emitI18n = useWorkspaceStore((s) => s.emitCache.i18n);
  const htmlCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const cssCount = useWorkspaceStore((s) => s.workspaces.css.blockCount);
  const i18nCount = useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const htmlStructureVersion = useWorkspaceStore((s) => s.workspaces.html.structureVersion);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspace);
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const selectedIds = useWorkspaceStore((s) => s.selectedBlockIds);
  // Phase F (spec 17 §13) — origin === 'tree' 면 preview 안 element 가
  // viewport 밖일 때 scrollIntoView. preview origin (이미 클릭한 element 가
  // viewport 안) 이나 inspector / init 는 scroll 안 함 (UX: 갑작스러운 점프 방지).
  const selectionOrigin = useWorkspaceStore((s) => s.selectionOrigin);
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const legacyCssSanitize = usePreviewStore((s) => s.legacyCssSanitize);
  const roll20SandboxSanitize = usePreviewStore((s) => s.roll20SandboxSanitize);
  const assetReplacementMap = usePreviewStore((s) => s.assetReplacementMap);
  const sandbox = usePreviewStore((s) => s.iframeSandbox);
  const renderMode = usePreviewStore((s) => s.renderMode);
  const documentLanguage = usePreviewStore((s) => s.documentLanguage);
  const setRenderMode = usePreviewStore((s) => s.setRenderMode);
  const zoom = useUiStore((s) => s.previewZoom);
  const sheetCanvasWidth = useUiStore((s) => s.sheetCanvasWidth);
  const sheetCanvasWidthAuto = useUiStore((s) => s.sheetCanvasWidthAuto);
  const setAutoSheetCanvasWidth = useUiStore((s) => s.setAutoSheetCanvasWidth);
  const previewLayer = useUiStore((s) => s.previewLayer);
  const setHoveredWidgetId = useUiStore((s) => s.setHoveredWidgetId);
  const setSelectedWidgetId = useUiStore((s) => s.setSelectedWidgetId);
  const selectedWidgetId = useUiStore((s) => s.selectedWidgetId);
  const hoveredWidgetId = useUiStore((s) => s.hoveredWidgetId);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const mainMode = useUiStore((s) => s.mainMode);
  const sheetWidgetsList = useWorkspaceStore((s) => s.sheetWidgets);
  const rolltemplateWidgetsList = useWorkspaceStore((s) => s.rolltemplateWidgets);
  const [dragOver, setDragOver] = useState(false);
  // Phase E — 우클릭 컨텍스트 메뉴 state. Shadow onContextMenu 가 (blockId, x, y) 채움.
  // null 이면 안 그림. 액션 dispatch / 외부 클릭 / Escape 시 null 로 리셋.
  const [contextMenuState, setContextMenuState] = useState<{
    blockId: string;
    x: number;
    y: number;
  } | null>(null);
  const [iframeHeight, setIframeHeight] = useState(SHEET_RENDER_MIN_HEIGHT);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [iframeEditBridgeId, setIframeEditBridgeId] = useState<string | null>(null);
  const [iframeReadySourceKey, setIframeReadySourceKey] = useState<string | null>(null);
  const [iframeAppliedHtmlKey, setIframeAppliedHtmlKey] = useState<string | null>(null);
  const [iframeLoadRevision, setIframeLoadRevision] = useState(0);
  const iframeEditBridgeIdRef = useRef<string | null>(null);
  const lastAppliedAckRevisionRef = useRef(0);
  const [iframeEditOverlay, setIframeEditOverlay] = useState<IframeEditHitMessage | null>(null);
  const [iframeEditDropTarget, setIframeEditDropTarget] = useState<IframeEditDropTarget | null>(null);
  const iframeEditOverlayFrameRef = useRef<number | null>(null);
  const pendingIframeEditStateRef = useRef<{
    overlay: IframeEditHitMessage;
    dropTarget: IframeEditDropTarget | null;
  } | null>(null);
  const iframeEditDropTargetRef = useRef<IframeEditDropTarget | null>(null);
  const [iframeEditDragOrigin, setIframeEditDragOrigin] = useState<IframeEditHitMessage | null>(null);
  const iframeEditDragOriginRef = useRef<IframeEditHitMessage | null>(null);
  const iframeEditOverlayRef = useRef<HTMLDivElement>(null);
  const [iframeResizePreview, setIframeResizePreview] = useState<IframeResizePreview | null>(null);
  const iframeResizeSessionRef = useRef<IframeResizeSession | null>(null);
  const iframeResizeFrameRef = useRef<number | null>(null);
  const pendingIframeResizePointerRef = useRef<{ x: number; y: number } | null>(null);
  const pendingIframeResizeBlockRef = useRef<string | null>(null);
  const parentIframePointerIdRef = useRef<number | null>(null);
  const applyRevisionRef = useRef(0);
  const applySourcesRef = useRef(new Map<number, AppliedSource>());
  const lastAppliedSourceRef = useRef<string | null>(null);
  const lastAppliedHtmlRef = useRef<string | null>(null);
  const lastAppliedHtmlKeyRef = useRef<string | null>(null);
  const pendingApplySourceRef = useRef<string | null>(null);
  const pendingOptimisticFlowCommitRef = useRef<OptimisticFlowCommit | null>(null);
  const pendingTargetedHtmlPatchRef = useRef<PendingTargetedHtmlPatch | null>(null);
  const [lastApplyAck, setLastApplyAck] = useState(0);
  const [pendingApplyRevision, setPendingApplyRevision] = useState(0);
  const autoWidthSizedRef = useRef(false);
  // Phase E — Inspector 활성화에 쓰일 sidebarRightTab/collapse setter.
  // 'attrs' 가 Inspector 패널 (D49).
  const setSidebarRightTab = useUiStore((s) => s.setSidebarRightTab);
  const sidebarRightCollapsed = useUiStore((s) => s.sidebarRightCollapsed);
  const toggleSidebarRight = useUiStore((s) => s.toggleSidebarRight);

  // Pointer events inside the iframe are already coalesced there. Coalesce the
  // matching parent overlay state too, so a large sheet does not re-render the
  // whole editor shell once per pointermove. Commit-like phases still flush
  // immediately so pointerup/cancel cannot display stale drop geometry.
  const flushIframeEditState = useCallback(
    (overlay: IframeEditHitMessage | null, dropTarget: IframeEditDropTarget | null) => {
      if (iframeEditOverlayFrameRef.current != null) {
        window.cancelAnimationFrame(iframeEditOverlayFrameRef.current);
        iframeEditOverlayFrameRef.current = null;
      }
      pendingIframeEditStateRef.current = null;
      setIframeEditOverlay(overlay);
      setIframeEditDropTarget(dropTarget);
    },
    [],
  );

  const queueIframeEditState = useCallback(
    (overlay: IframeEditHitMessage, dropTarget: IframeEditDropTarget | null) => {
      pendingIframeEditStateRef.current = { overlay, dropTarget };
      if (iframeEditOverlayFrameRef.current != null) return;
      iframeEditOverlayFrameRef.current = window.requestAnimationFrame(() => {
        iframeEditOverlayFrameRef.current = null;
        const pending = pendingIframeEditStateRef.current;
        pendingIframeEditStateRef.current = null;
        if (!pending) return;
        setIframeEditOverlay(pending.overlay);
        setIframeEditDropTarget(pending.dropTarget);
      });
    },
    [],
  );

  useEffect(() => () => {
    if (iframeEditOverlayFrameRef.current != null) {
      window.cancelAnimationFrame(iframeEditOverlayFrameRef.current);
      iframeEditOverlayFrameRef.current = null;
    }
    pendingIframeEditStateRef.current = null;
    if (iframeResizeFrameRef.current != null) {
      window.cancelAnimationFrame(iframeResizeFrameRef.current);
      iframeResizeFrameRef.current = null;
    }
    pendingIframeResizePointerRef.current = null;
    iframeResizeSessionRef.current = null;
  }, []);

  // Pointer capture belongs to the iframe document. When the pointer is
  // released outside the iframe, some browsers deliver the final event only
  // to the parent document, leaving the iframe's optimistic transform alive.
  // Forward that outside release so the canonical render surface can cancel
  // and restore its temporary drag state.
  useEffect(() => {
    if (mainMode !== 'edit' || !iframeEditBridgeId) return undefined;
    const isInsideIframe = (event: MouseEvent) => {
      const rect = iframeRef.current?.getBoundingClientRect();
      return Boolean(rect
        && event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom);
    };
    const rememberParentPointer = (event: PointerEvent) => {
      if (isInsideIframe(event)) parentIframePointerIdRef.current = event.pointerId;
    };
    const sendAbort = (pointerId: number) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'r20:edit-abort',
        protocol: R20_IFRAME_EDIT_PROTOCOL,
        bridgeId: iframeEditBridgeId,
        pointerId,
      }, '*');
    };
    const forwardOutsideRelease = (event: MouseEvent) => {
      const origin = iframeEditDragOriginRef.current;
      const eventPointerId = 'pointerId' in event
        ? Number((event as PointerEvent).pointerId)
        : parentIframePointerIdRef.current ?? origin?.pointerId;
      const activePointerId = origin?.pointerId ?? parentIframePointerIdRef.current;
      if (activePointerId == null || activePointerId !== eventPointerId) return;
      if (isInsideIframe(event)) {
        parentIframePointerIdRef.current = null;
        return;
      }
      sendAbort(activePointerId);
      parentIframePointerIdRef.current = null;
    };
    const cancelOnWindowBlur = () => {
      const origin = iframeEditDragOriginRef.current;
      const pointerId = origin?.pointerId ?? parentIframePointerIdRef.current;
      if (pointerId != null) sendAbort(pointerId);
      parentIframePointerIdRef.current = null;
    };
    window.addEventListener('pointerdown', rememberParentPointer, true);
    window.addEventListener('pointerup', forwardOutsideRelease, true);
    window.addEventListener('pointercancel', forwardOutsideRelease, true);
    window.addEventListener('mouseup', forwardOutsideRelease, true);
    window.addEventListener('blur', cancelOnWindowBlur, true);
    return () => {
      window.removeEventListener('pointerdown', rememberParentPointer, true);
      window.removeEventListener('pointerup', forwardOutsideRelease, true);
      window.removeEventListener('pointercancel', forwardOutsideRelease, true);
      window.removeEventListener('mouseup', forwardOutsideRelease, true);
      window.removeEventListener('blur', cancelOnWindowBlur, true);
      parentIframePointerIdRef.current = null;
    };
  }, [iframeEditBridgeId, mainMode]);

  const total = htmlCount + cssCount + i18nCount;
  const isEmpty = total === 0;
  // The persistent iframe always owns the character sheet. Rolltemplate edit
  // mode has its own ChatPane-backed surface, so changing card width must not
  // resize or reflow the hidden sheet iframe.
  const canvasWidth = sheetCanvasWidth;
  const setAutoCanvasWidth = setAutoSheetCanvasWidth;
  const canvasWidthAuto = sheetCanvasWidthAuto;
  const compatibilityMode = legacyCssSanitize ? 'legacy' : 'modern';
  // Resolve iframe hit paths against one layer snapshot per structural change.
  // Rebuilding Blockly snapshots for every pointermove was a major source of
  // drag lag, especially on imported sheets with many blocks.
  const htmlLayerMap = useMemo(() => {
    void htmlStructureVersion;
    return new Map(
      getBlocklyAdapter().listAllBlocks('html').map((block) => [block.id, block]),
    );
  }, [htmlStructureVersion]);
  const previewAssetText = useMemo(
    () => applyAssetReplacements({ html: emitHtml, css: emitCss }, assetReplacementMap),
    [emitHtml, emitCss, assetReplacementMap],
  );
  const fitScale =
    zoom === 'fit' && viewportWidth > 0
      ? Math.min(1, Math.max(0.25, (viewportWidth - 48) / canvasWidth))
      : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;
  const iframeEditDragDelta = iframeEditDragOrigin && iframeEditOverlay
    && (iframeEditOverlay.phase === 'pointermove' || iframeEditOverlay.phase === 'pointerup')
    ? {
        x: iframeEditOverlay.pointer.x - iframeEditDragOrigin.pointer.x,
        y: iframeEditOverlay.pointer.y - iframeEditDragOrigin.pointer.y,
      }
    : { x: 0, y: 0 };
  const iframeEditVisibleRect = useMemo(() => (
    iframeResizePreview && iframeResizePreview.blockId === iframeEditOverlay?.blockId
      ? iframeResizePreview.rect
      : iframeEditOverlay
        ? {
            left: iframeEditOverlay.rect.left + iframeEditDragDelta.x,
            top: iframeEditOverlay.rect.top + iframeEditDragDelta.y,
            width: iframeEditOverlay.rect.width,
            height: iframeEditOverlay.rect.height,
          }
        : null
  ), [
    iframeEditDragDelta.x,
    iframeEditDragDelta.y,
    iframeEditOverlay,
    iframeResizePreview,
  ]);
  const iframeResizeHandles = useMemo(() => {
    if (
      mainMode !== 'edit'
      || renderMode !== 'iframe'
      || iframeEditOverlay?.phase !== 'measure'
      || iframeEditOverlay.blockId !== selectedId
      || selectedIds.length !== 1
    ) return [] as readonly DesignResizeHandle[];
    const block = htmlLayerMap.get(iframeEditOverlay.blockId);
    if (!block || getLayerRole(block.type).kind === 'runtime') return [];
    if (!canManageDesignStyle(getBlocklyAdapter(), 'html', block.id)) return [];
    return resizeHandlesForGeometry(iframeEditOverlay.subject);
  }, [
    htmlLayerMap,
    iframeEditOverlay,
    mainMode,
    renderMode,
    selectedId,
    selectedIds.length,
  ]);
  const iframeKeyboardNudgeSelection = useMemo(() => {
    const renderedSelection = iframeEditOverlay?.selection?.length
      ? iframeEditOverlay.selection
      : iframeEditOverlay
        ? [{ geometry: iframeEditOverlay.subject, hitPath: iframeEditOverlay.hitPath }]
        : null;
    if (
      mainMode !== 'edit'
      || editSubmode !== 'sheet'
      || renderMode !== 'iframe'
      || iframeEditOverlay?.phase !== 'measure'
      || !renderedSelection
      || renderedSelection.length !== selectedIds.length
    ) return null;

    const selectedSet = new Set(selectedIds);
    if (!renderedSelection.every((item) => selectedSet.has(item.geometry.blockId))) return null;
    const blocks = renderedSelection.map((item) => htmlLayerMap.get(item.geometry.blockId) ?? null);
    if (blocks.some((block) => !block || getLayerRole(block.type).kind === 'runtime')) return null;
    const adapter = getBlocklyAdapter();
    const canCommit = renderedSelection.every((item, index) => {
      const block = blocks[index];
      if (!block) return false;
      if (item.geometry.position.trim().toLowerCase() !== 'absolute') return false;
      if (item.geometry.offsetParentBlockId !== block.layerParentId) return false;
      return (
        adapter.hasBlockField('html', block.id, 'LEFT_PX')
        && adapter.hasBlockField('html', block.id, 'TOP_PX')
      ) || canManageDesignStyle(adapter, 'html', block.id);
    });
    return canCommit ? renderedSelection : null;
  }, [
    editSubmode,
    htmlLayerMap,
    iframeEditOverlay,
    mainMode,
    renderMode,
    selectedIds,
  ]);
  const iframeAlignmentSelection = useMemo(() => {
    const selection = iframeKeyboardNudgeSelection;
    if (!selection || selection.length < 2) return null;
    const parentId = htmlLayerMap.get(selection[0].geometry.blockId)?.layerParentId ?? null;
    return selection.every((item) => (
      htmlLayerMap.get(item.geometry.blockId)?.layerParentId === parentId
    )) ? selection : null;
  }, [htmlLayerMap, iframeKeyboardNudgeSelection]);
  const iframeAlignmentBounds = useMemo(() => (
    iframeAlignmentSelection
      ? designSelectionBounds(iframeAlignmentSelection.map((item) => ({
          blockId: item.geometry.blockId,
          rect: item.geometry.rect,
        })))
      : null
  ), [iframeAlignmentSelection]);

  const commitIframeSelectionDeltas = useCallback((
    selection: readonly IframeEditSelectionNode[],
    deltas: ReturnType<typeof resolveDesignAlignment>,
  ) => {
    if (
      selection.length < 1
      || deltas.length !== selection.length
      || deltas.every((item) => Math.abs(item.deltaX) < 0.001 && Math.abs(item.deltaY) < 0.001)
    ) return;

    const adapter = getBlocklyAdapter();
    if (selection.some((item) => {
      const block = htmlLayerMap.get(item.geometry.blockId);
      if (!block || getLayerRole(block.type).kind === 'runtime') return true;
      if (item.geometry.position.trim().toLowerCase() !== 'absolute') return true;
      if (item.geometry.offsetParentBlockId !== block.layerParentId) return true;
      if (!item.hitPath.every((geometry) => htmlLayerMap.has(geometry.blockId))) return true;
      return !(
        adapter.hasBlockField('html', block.id, 'LEFT_PX')
        && adapter.hasBlockField('html', block.id, 'TOP_PX')
      ) && !canManageDesignStyle(adapter, 'html', block.id);
    })) return;
    const lookup = {
      getBlock: (blockId: string) => htmlLayerMap.get(blockId) ?? null,
      canNestInContainer: (blockId: string) => adapter.canNestInContainer('html', blockId),
      canNestBlockInContainer: (movingBlockId: string, targetBlockId: string) => (
        adapter.canNestBlockInContainer('html', movingBlockId, targetBlockId)
      ),
    };
    const placements = selection.map((item, index) => resolveIframeMultiFreePlacement(
      item,
      item,
      { x: 0, y: 0 },
      { x: deltas[index].deltaX, y: deltas[index].deltaY },
      lookup,
      1,
    ));
    if (placements.some((placement) => placement === null)) return;

    let moved = false;
    let managedCssChanged = false;
    adapter.runInEventGroup(() => {
      placements.forEach((placement, index) => {
        if (!placement) return;
        const committed = commitManagedDesignPosition(adapter, {
          workspace: 'html',
          blockId: selection[index].geometry.blockId,
          left: placement.left,
          top: placement.top,
          containingBlockId: placement.containingBlockId,
          containingBlockNeedsRelative: placement.containingBlockNeedsRelative,
        });
        moved = committed.moved || moved;
        managedCssChanged = committed.reason === 'managed-css' || managedCssChanged;
      });
    });
    if (!moved) return;

    const deltaById = new Map(deltas.map((item) => [item.blockId, item]));
    const shiftedSelection = selection.map((item) => {
      const shiftGeometry = (geometry: typeof item.geometry) => {
        const delta = deltaById.get(geometry.blockId);
        return delta
          ? { ...geometry, rect: shiftedRect(geometry.rect, delta.deltaX, delta.deltaY) }
          : geometry;
      };
      return {
        geometry: shiftGeometry(item.geometry),
        hitPath: item.hitPath.map(shiftGeometry),
      };
    });
    const shiftedById = new Map(shiftedSelection.map((item) => [item.geometry.blockId, item]));
    setIframeEditOverlay((current) => {
      if (!current || current.phase !== 'measure') return current;
      const primary = shiftedById.get(current.blockId);
      if (!primary) return current;
      const subject = primary.geometry;
      return {
        ...current,
        rect: subject.rect,
        subject,
        hitPath: primary.hitPath,
        selection: shiftedSelection.length > 1 ? shiftedSelection : undefined,
      };
    });
    const store = useWorkspaceStore.getState();
    store.bumpStructure('html', adapter.countBlocks('html'));
    if (managedCssChanged) store.bumpStructure('css', adapter.countBlocks('css'));
    queueMicrotask(() => flushEmitPipeline());
  }, [htmlLayerMap]);
  const alignIframeSelection = useCallback((mode: DesignAlignmentMode) => {
    const selection = iframeAlignmentSelection;
    if (!selection) return;
    commitIframeSelectionDeltas(selection, resolveDesignAlignment(selection.map((item) => ({
      blockId: item.geometry.blockId,
      rect: item.geometry.rect,
    })), mode));
  }, [commitIframeSelectionDeltas, iframeAlignmentSelection]);
  const distributeIframeSelection = useCallback((mode: DesignDistributionMode) => {
    const selection = iframeAlignmentSelection;
    if (!selection || selection.length < 3) return;
    commitIframeSelectionDeltas(selection, resolveDesignDistribution(selection.map((item) => ({
      blockId: item.geometry.blockId,
      rect: item.geometry.rect,
    })), mode));
  }, [commitIframeSelectionDeltas, iframeAlignmentSelection]);
  const nudgeIframeSelection = useCallback((
    selection: readonly IframeEditSelectionNode[],
    deltaX: number,
    deltaY: number,
  ) => {
    commitIframeSelectionDeltas(selection, selection.map((item) => ({
      blockId: item.geometry.blockId,
      deltaX,
      deltaY,
    })));
  }, [commitIframeSelectionDeltas]);
  const iframeDistributionEnabled = (iframeAlignmentSelection?.length ?? 0) >= 3;
  const iframeArrangementToolbarWidth = iframeDistributionEnabled ? 254 : 188;

  const applyIframeResizePointer = useCallback((clientX: number, clientY: number) => {
    const session = iframeResizeSessionRef.current;
    if (!session) return null;
    const viewportScale = Math.max(0.01, scale);
    const nextRect = resolveDesignResizeRect(
      session.origin.rect,
      session.handle,
      (clientX - session.startClientX) / viewportScale,
      (clientY - session.startClientY) / viewportScale,
      useUiStore.getState().snapEnabled ? 8 : 1,
    );
    session.currentRect = nextRect;
    paintOverlayRect(iframeEditOverlayRef.current, nextRect);
    const declarations = managedResizeDeclarations(
      session.origin.subject,
      session.origin.rect,
      nextRect,
      session.handle,
    );
    const previewMessage: Record<string, unknown> = {
      type: 'r20:edit-resize-preview',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: iframeEditBridgeId,
      blockId: session.blockId,
    };
    for (const property of ['width', 'height', 'left', 'top'] as const) {
      const value = declarations[property];
      if (typeof value !== 'string') continue;
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) previewMessage[property] = parsed;
    }
    iframeRef.current?.contentWindow?.postMessage(previewMessage, '*');
    return nextRect;
  }, [iframeEditBridgeId, scale]);

  const queueIframeResizePointer = useCallback((clientX: number, clientY: number) => {
    pendingIframeResizePointerRef.current = { x: clientX, y: clientY };
    if (iframeResizeFrameRef.current != null) return;
    iframeResizeFrameRef.current = window.requestAnimationFrame(() => {
      iframeResizeFrameRef.current = null;
      const pending = pendingIframeResizePointerRef.current;
      pendingIframeResizePointerRef.current = null;
      if (pending) applyIframeResizePointer(pending.x, pending.y);
    });
  }, [applyIframeResizePointer]);

  const finishIframeResize = useCallback((
    clientX: number,
    clientY: number,
    shouldCommit: boolean,
  ) => {
    if (iframeResizeFrameRef.current != null) {
      window.cancelAnimationFrame(iframeResizeFrameRef.current);
      iframeResizeFrameRef.current = null;
    }
    pendingIframeResizePointerRef.current = null;
    const session = iframeResizeSessionRef.current;
    if (!session) return;
    if (shouldCommit) applyIframeResizePointer(clientX, clientY);
    const finalRect = session.currentRect;
    iframeResizeSessionRef.current = null;
    let committed = false;
    if (shouldCommit) {
      const adapter = getBlocklyAdapter();
      const result = commitManagedDesignStyle(adapter, {
        workspace: 'html',
        blockId: session.blockId,
        declarations: managedResizeDeclarations(
          session.origin.subject,
          session.origin.rect,
          finalRect,
          session.handle,
        ),
      });
      committed = result.changed;
      if (committed) {
        pendingIframeResizeBlockRef.current = session.blockId;
        setIframeResizePreview({ blockId: session.blockId, rect: finalRect });
        const store = useWorkspaceStore.getState();
        if (result.htmlChanged) store.bumpStructure('html', adapter.countBlocks('html'));
        if (result.cssChanged || result.cssBlockCreated) {
          store.bumpStructure('css', adapter.countBlocks('css'));
        }
        queueMicrotask(() => flushEmitPipeline());
      }
    }
    iframeRef.current?.contentWindow?.postMessage({
      type: 'r20:edit-resize-finalize',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: iframeEditBridgeId,
      blockId: session.blockId,
      committed,
    }, '*');
    if (!committed) {
      pendingIframeResizeBlockRef.current = null;
      setIframeResizePreview(null);
      paintOverlayRect(iframeEditOverlayRef.current, session.origin.rect);
    }
  }, [applyIframeResizePointer, iframeEditBridgeId]);

  const startIframeResize = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    handle: DesignResizeHandle,
  ) => {
    if (
      event.button !== 0
      || !iframeEditOverlay
      || !iframeResizeHandles.includes(handle)
    ) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const originRect = iframeEditVisibleRect ?? iframeEditOverlay.rect;
    iframeResizeSessionRef.current = {
      pointerId: event.pointerId,
      blockId: iframeEditOverlay.blockId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: { ...iframeEditOverlay, rect: originRect },
      currentRect: originRect,
    };
    setIframeResizePreview({ blockId: iframeEditOverlay.blockId, rect: originRect });
    applyIframeResizePointer(event.clientX, event.clientY);
  }, [
    applyIframeResizePointer,
    iframeEditOverlay,
    iframeEditVisibleRect,
    iframeResizeHandles,
  ]);

  const moveIframeResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = iframeResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    queueIframeResizePointer(event.clientX, event.clientY);
  }, [queueIframeResizePointer]);

  const endIframeResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = iframeResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    finishIframeResize(event.clientX, event.clientY, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [finishIframeResize]);

  const cancelIframeResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = iframeResizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    finishIframeResize(event.clientX, event.clientY, false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [finishIframeResize]);

  useEffect(() => {
    const session = iframeResizeSessionRef.current;
    if (
      !session
      || (
        mainMode === 'edit'
        && renderMode === 'iframe'
        && selectedId === session.blockId
      )
    ) return;
    finishIframeResize(session.startClientX, session.startClientY, false);
  }, [finishIframeResize, iframeLoadRevision, mainMode, renderMode, selectedId]);

  useEffect(() => {
    setRenderMode('iframe');
  }, [setRenderMode]);

  // srcdoc — emitCache + 미리보기 토글 (sanitize/darkMode/previewLayer) 의 순수 derive.
  // useState + useEffect 였을 때: 마운트 시 초기값 = 빈 placeholder → useEffect 가 다음
  // tick 에 setSrcdoc → React 가 srcDoc prop 갱신, 하지만 iframe 이 reload 안 함 (Chrome
  // 의 srcdoc 속성 변경 quirk). useMemo 로 바꿔 첫 렌더부터 올바른 값으로 렌더 →
  // 모드 전환 후에도 즉시 컨텐츠 표시.
  const renderOptions = useMemo<BuildDocOptions>(
    () => ({
      html: previewAssetText.html,
      css: previewAssetText.css,
      i18n: emitI18n,
      compatibilityMode,
      roll20SandboxSanitize,
      darkMode,
      previewLayer,
      includeEditorOverlays: renderMode === 'shadow',
      documentLanguage,
    }),
    [renderMode, previewAssetText.html, previewAssetText.css, emitI18n, compatibilityMode, roll20SandboxSanitize, darkMode, previewLayer, documentLanguage],
  );
  const liveBundle = useMemo(
    () => {
      markEditorTiming('live-bundle-start');
      const bundle = buildSheetLiveBundle(renderOptions, { includeParts: renderMode === 'shadow' });
      markEditorTiming('live-bundle-end');
      return bundle;
    },
    [renderMode, renderOptions],
  );
  const livePatch = liveBundle.livePatch;
  const parts = liveBundle.parts ?? null;
  const [iframeDocumentSrcdoc] = useState(() => buildSheetDoc(renderOptions));
  // The bridge only needs a content identity to suppress duplicate applies;
  // keep the large full-document string out of this dependency path.
  const renderSourceKey = livePatch.sourceKey;
  const liveHtmlKey = livePatch.htmlKey;
  const iframeRenderReady = renderMode !== 'iframe'
    || isEmpty
    || iframeReadySourceKey === liveHtmlKey;
  // CSS-only patches do not invalidate the rendered DOM. Keep keyboard
  // editing available while fonts/assets finish their broader paint-ready
  // cycle, but pause it while a new HTML tree is still unapplied.
  const iframeStructureReady = renderMode !== 'iframe'
    || isEmpty
    || iframeAppliedHtmlKey === liveHtmlKey;

  // spec 21 Phase A — Shadow DOM 모드 mount.
  // host element 에 Shadow Root attach → buildSheetParts(html, css) 인젝션.
  // 시각 동일성 보장 — buildSheetParts 는 buildSheetDoc 과 같은 runtime/layer/prefix CSS 사용.
  // Phase A 범위 = 시각만 동일. Phase B+ 의 인터랙션 (select / drag / inline edit) 은 미구현.
  useEffect(() => {
    autoWidthSizedRef.current = false;
    iframeEditBridgeIdRef.current = null;
    queueMicrotask(() => setIframeHeight(SHEET_RENDER_MIN_HEIGHT));
  }, [iframeDocumentSrcdoc]);

  const previewAreaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = previewAreaRef.current;
    if (!node) return;
    const update = () => setViewportWidth(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const hostRef = useRef<HTMLDivElement>(null);
  // spec 17 §12 Phase B — Shadow mount 가 반환하는 setSelected 를 ref 로 잡아
  // selectedBlockId 변경 effect 에서 호출. mount 사이클 (parts 변경) 마다 새 ref
  // 발급 — cleanup 단계에서 null 로 비워 stale 호출 방지.
  const shadowSetSelectedRef = useRef<((id: string | null, opts?: { scrollIntoView?: boolean }) => void) | null>(null);
  useEffect(() => {
    if (renderMode !== 'shadow') return;
    if (!parts) return;
    const host = hostRef.current;
    if (!host) return;
    // Phase C drag — 시작 시점의 LEFT_PX/TOP_PX 를 origin 으로 저장.
    // pointermove 마다 (origLeft+dx/scale, origTop+dy/scale) 로 갱신.
    // scale = host.getBoundingClientRect().width / host.offsetWidth — zoom 보정.
    // 호스트가 zoom 적용 안 됐으면 1.
    let dragOrigin: {
      blockId: string;
      origLeft: number;
      origTop: number;
      ws: WorkspaceKey;
      scale: number;
      hasPos: boolean;
      element: HTMLElement | null;
      baseTransform: string;
      containingBlockId: string | null;
      containingBlockNeedsRelative: boolean;
      lastDx: number;
      lastDy: number;
    } | null = null;
    // Phase C — pending setFieldValue (rAF 합치기). pointermove 가 frame 보다
    // 빠를 때 (touch 일부 환경) 마지막 값만 commit.
    let dragVisualPending: { element: HTMLElement; transform: string } | null = null;
    let dragVisualRaf: number | null = null;

    const findShadowBlockElement = (blockId: string): HTMLElement | null => {
      const root = host.shadowRoot;
      if (!root) return null;
      for (const element of Array.from(root.querySelectorAll<HTMLElement>('[data-r20-block-id]'))) {
        if (element.dataset.r20BlockId === blockId) return element;
      }
      return null;
    };

    const queueDragVisual = (element: HTMLElement, transform: string) => {
      dragVisualPending = { element, transform };
      if (dragVisualRaf != null) return;
      dragVisualRaf = window.requestAnimationFrame(() => {
        dragVisualRaf = null;
        const pending = dragVisualPending;
        dragVisualPending = null;
        if (!pending || !pending.element.isConnected) return;
        pending.element.style.transform = pending.transform;
      });
    };

    const { cleanup, setSelected: setShadowSelected } = mountSheetShadow(host, {
      html: parts.html,
      css: parts.css,
      i18n: emitI18n,
      includeEditorOverlays: true,
      layer: previewLayer,
      darkMode,
      // Keep Shadow edit affordances on the same DOM block model as the
      // layer panel. The callback was previously left unwired, so the sheet
      // could be selected but never showed frame/drop-role state in-canvas.
      getLayerRoleForBlock: (blockId) => {
        const block = htmlLayerMap.get(blockId);
        return block ? getLayerRole(block.type) : null;
      },
      // Phase B — Shadow 안 element 클릭 → workspaceStore.selectedBlockId 갱신.
      // origin 'preview' — 양방향 sync 시 src 구분.
      onSelect: (blockId) => setSelected(blockId, 'preview'),
      // Phase C — drag 시작. 모든 워크스페이스 (html / css / i18n) 에서 LEFT_PX/TOP_PX
      // 가진 block 검색. 없으면 hasPos=false → 이후 move 호출은 noop (안전 무시).
      onDragStart: (blockId) => {
        const adapter = getBlocklyAdapter();
        // active 우선, 없으면 html 워크스페이스에서 찾기.
        const cand: WorkspaceKey[] = [
          useWorkspaceStore.getState().activeWorkspace as WorkspaceKey,
          'html', 'css', 'i18n',
        ];
        let foundWs: WorkspaceKey | null = null;
        for (const k of cand) {
          if (adapter.hasBlockField(k, blockId, 'LEFT_PX') ||
              adapter.hasBlockField(k, blockId, 'TOP_PX')) {
            foundWs = k;
            break;
          }
          // block 이 해당 ws 에 있지만 pos field 없으면 — 다음 ws 도 검색 안 됨.
          if (adapter.getBlock(k, blockId)) {
            foundWs = k;
            break;
          }
        }
        const ws = foundWs ?? 'html';
        const hasL = adapter.hasBlockField(ws, blockId, 'LEFT_PX');
        const hasT = adapter.hasBlockField(ws, blockId, 'TOP_PX');
        const hasPos = hasL && hasT;
        const origLeft = hasL
          ? Number(adapter.getBlockField(ws, blockId, 'LEFT_PX') ?? '0')
          : 0;
        const origTop = hasT
          ? Number(adapter.getBlockField(ws, blockId, 'TOP_PX') ?? '0')
          : 0;
        // zoom 보정 — host CSS scale 이 있으면 (transform: scale()) viewport px
        // → sheet px 변환 필요. 현재 시트 wrapper 는 width 조정으로 zoom 처리하므로
        // scale 은 (rendered width / intrinsic width).
        const element = findShadowBlockElement(blockId);
        const offsetParent = element?.offsetParent instanceof HTMLElement
          ? element.offsetParent
          : null;
        const containingBlockId = offsetParent?.dataset.r20BlockId ?? null;
        const containingBlockNeedsRelative = Boolean(
          containingBlockId
          && offsetParent
          && window.getComputedStyle(offsetParent).position === 'static',
        );
        const measuredLeft = element ? Math.round(element.offsetLeft) : 0;
        const measuredTop = element ? Math.round(element.offsetTop) : 0;
        const rect = host.getBoundingClientRect();
        const scale = host.offsetWidth > 0 ? rect.width / host.offsetWidth : 1;
        dragOrigin = {
          blockId,
          origLeft: hasPos ? origLeft : measuredLeft,
          origTop: hasPos ? origTop : measuredTop,
          ws,
          scale,
          hasPos,
          element,
          baseTransform: element?.style.transform ?? '',
          containingBlockId,
          containingBlockNeedsRelative,
          lastDx: 0,
          lastDy: 0,
        };
      },
      onDragMove: (blockId, dx, dy) => {
        if (!dragOrigin || dragOrigin.blockId !== blockId) return;
        dragOrigin.lastDx = dx;
        dragOrigin.lastDy = dy;
        // rAF coalesce — pointermove 는 60-120Hz, setFieldValue 는 BLOCK_CHANGE
        // event + bumpStructure 트리거. 60Hz 면 충분, 더 빠르면 emit 디바운스가
        // 흡수 못 함. rAF 안에서만 호출.
        const s = dragOrigin.scale || 1;
        if (dragOrigin.element) {
          const base = dragOrigin.baseTransform && dragOrigin.baseTransform !== 'none'
            ? `${dragOrigin.baseTransform} `
            : '';
          queueDragVisual(
            dragOrigin.element,
            `${base}translate(${dx / s}px, ${dy / s}px)`,
          );
        }
      },
      onDragEnd: () => {
        // pending flush — rAF 한 프레임 남은 갱신 commit.
        const origin = dragOrigin;
        if (!origin) return;
        if (dragVisualRaf != null) {
          window.cancelAnimationFrame(dragVisualRaf);
          dragVisualRaf = null;
        }
        dragVisualPending = null;
        const scale = origin.scale || 1;
        const adapter = getBlocklyAdapter();
        const committed = commitManagedDesignPosition(adapter, {
          workspace: origin.ws,
          blockId: origin.blockId,
          left: Math.max(0, Math.round(origin.origLeft + origin.lastDx / scale)),
          top: Math.max(0, Math.round(origin.origTop + origin.lastDy / scale)),
          containingBlockId: origin.containingBlockId,
          containingBlockNeedsRelative: origin.containingBlockNeedsRelative,
        });
        if (committed.moved) {
          const store = useWorkspaceStore.getState();
          store.bumpStructure(origin.ws, adapter.countBlocks(origin.ws));
          if (committed.reason === 'managed-css') {
            store.bumpStructure('css', adapter.countBlocks('css'));
          }
          // Blockly's mutation listener may publish one coalesced bump in a
          // microtask. Flush after that queue drains so the final structure is
          // emitted without applying a stale pre-listener snapshot.
          markEditorTiming('flush-scheduled');
          queueMicrotask(() => {
            markEditorTiming('flush-callback');
            flushEmitPipeline();
          });
          store.setSelectedBlockId(origin.blockId, 'preview');
        } else if (origin.element) {
          origin.element.style.transform = origin.baseTransform;
        }
        dragOrigin = null;
      },
      // Phase D — inline text 편집 commit.
      // dblclick → contentEditable → blur 시 호출.
      // 블록 종류별 텍스트 필드 이름이 달라 (TEXT / LABEL / VALUE) — 우선순위 순으로
      // 첫 매치되는 필드에 setBlockField. 셋 다 없으면 noop + 디버그 로그.
      // 워크스페이스도 active 기준 + html/css/i18n 순회로 탐색 (drag 와 동일 전략).
      onEditText: (blockId, newText) => {
        const adapter = getBlocklyAdapter();
        const cand: WorkspaceKey[] = [
          useWorkspaceStore.getState().activeWorkspace as WorkspaceKey,
          'html', 'css', 'i18n',
        ];
        // 중복 제거.
        const order: WorkspaceKey[] = [];
        for (const k of cand) if (!order.includes(k)) order.push(k);
        const FIELD_PREFS = ['TEXT', 'LABEL', 'VALUE', 'CONTENT'] as const;
        for (const ws of order) {
          if (!adapter.getBlock(ws, blockId)) continue;
          for (const fname of FIELD_PREFS) {
            if (adapter.hasBlockField(ws, blockId, fname)) {
              const ok = adapter.setBlockField(ws, blockId, fname, newText);
              // Phase D fix (local_86b826b4 검증) — emit pipeline 강제 트리거.
              // 정상 경로에선 setFieldValue → BLOCK_CHANGE → BlocklyModelHost
              // changeListener → bumpStructure 가 자동으로 돌지만, 라이브 verify
              // 에서 시각 편집은 OK 인데 emit raw HTML 에 변화가 안 박히는 케이스가
              // 발견됨 (Blockly v12 의 외부 setFieldValue 이벤트 전파 누락 또는
              // perfHook hydrate 의 Events.disable 카운터 미해소). bumpStructure
              // 를 명시적으로 호출해 useEmitPipeline 의 500ms 디바운스가 확실히
              // 트리거되도록. 정상 경로에선 동일 frame 내 중복 bump (counter+2)
              // 이지만 emit 은 1회만 실행되어 무해.
              if (ok) {
                const count = adapter.listAllBlocks(ws).length;
                useWorkspaceStore.getState().bumpStructure(ws, count);
              }
              return;
            }
          }
          // 블록 존재 but 텍스트 필드 없음 — 더 찾지 말고 종료.
           
          console.debug('[wysiwyg] block has no TEXT/LABEL/VALUE/CONTENT field — edit ignored:', blockId);
          return;
        }
         
        console.debug('[wysiwyg] block not found in any workspace — edit ignored:', blockId);
      },
      // Phase E — 우클릭 → state 갱신 → ShadowContextMenu 렌더.
      // (x, y) 는 viewport 좌표. ShadowContextMenu 가 position:fixed 으로 사용.
      // 같은 element 연속 우클릭은 기존 메뉴 close 후 새 위치로 재오픈.
      onContextMenu: (blockId, x, y) => {
        setContextMenuState({ blockId, x, y });
      },
    });
    shadowSetSelectedRef.current = setShadowSelected;
    // mount 직후 한번 — 현재 selectedBlockId 가 있으면 outline 복원.
    // mount 시점엔 scroll 안 함 (init 직후 갑작스러운 점프 방지).
    const currentSelected = useWorkspaceStore.getState().selectedBlockId;
    if (currentSelected) setShadowSelected(currentSelected, { scrollIntoView: false });
    return () => {
      shadowSetSelectedRef.current = null;
      dragOrigin = null;
      dragVisualPending = null;
      if (dragVisualRaf != null) {
        window.cancelAnimationFrame(dragVisualRaf);
        dragVisualRaf = null;
      }
      cleanup();
    };
  }, [renderMode, parts, emitI18n, previewLayer, darkMode, htmlLayerMap, setSelected]);

  // Phase B — selectedBlockId 변경 → Shadow 안 outline 동기화.
  // iframe 모드 or 미마운트 시 ref.current === null → noop.
  // Phase F (spec 17 §13) — selectionOrigin === 'tree' 시 element 가 viewport
  // 밖이면 부드럽게 가운데로 스크롤. tree row 클릭 후 preview 영역에서 시각적
  // 페어링이 즉시 보이도록.
  useEffect(() => {
    if (renderMode !== 'shadow') return;
    shadowSetSelectedRef.current?.(selectedId, {
      scrollIntoView: selectionOrigin === 'tree',
    });
  }, [selectedId, selectionOrigin, renderMode]);


  // spec 17 §8 — 캔버스 widget 선택/hover → preview iframe 강조
  useEffect(() => {
    const list = editSubmode === 'sheet' ? sheetWidgetsList : rolltemplateWidgetsList;
    const selected = list.find((w) => w.id === selectedWidgetId);
    const hovered = list.find((w) => w.id === hoveredWidgetId);
    const selectedName = (selected?.attrs.name as string | undefined) ?? null;
    const hoveredName = (hovered?.attrs.name as string | undefined) ?? null;
    const cw = iframeRef.current?.contentWindow;
    if (!cw) return;
    try {
      cw.postMessage({ type: 'r20:widget-select', widgetName: selectedName }, '*');
      cw.postMessage({ type: 'r20:widget-hover-in', widgetName: hoveredName }, '*');
    } catch {
      /* iframe not ready */
    }
  }, [
    selectedWidgetId,
    hoveredWidgetId,
    editSubmode,
    sheetWidgetsList,
    rolltemplateWidgetsList,
    renderSourceKey,
    setHoveredWidgetId,
    setSelectedWidgetId,
  ]);

  // 미리보기 → 우측 인스펙터 sync + 굴림 결과 채팅 박음 (postMessage).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!isTrustedIframeMessage(e, iframeRef.current)) return;
      const rawData = e.data as Record<string, unknown> | null;
      if (rawData?.type === 'r20:render-ready') {
        if (
          rawData.protocol !== 1
          || typeof rawData.bridgeId !== 'string'
            || rawData.bridgeId !== iframeEditBridgeIdRef.current
            || (typeof rawData.htmlKey === 'string'
              && rawData.htmlKey !== ''
              && rawData.htmlKey !== liveHtmlKey)
        ) return;
        const readyHtmlKey = typeof rawData.htmlKey === 'string' && rawData.htmlKey !== ''
          ? rawData.htmlKey
          : liveHtmlKey;
        setIframeReadySourceKey(readyHtmlKey);
        setIframeAppliedHtmlKey(readyHtmlKey);
        return;
      }
      const editMessage = parseIframeEditBridgeMessage(e.data);
      if (editMessage?.type === 'r20:edit-ready') {
        if (iframeEditBridgeIdRef.current !== editMessage.bridgeId) {
          flushIframeEditState(null, null);
          setIframeEditDragOrigin(null);
          iframeEditDragOriginRef.current = null;
          setIframeResizePreview(null);
          iframeResizeSessionRef.current = null;
          pendingIframeResizeBlockRef.current = null;
          lastAppliedAckRevisionRef.current = 0;
          setIframeAppliedHtmlKey(null);
          applySourcesRef.current.clear();
          lastAppliedHtmlRef.current = null;
          lastAppliedHtmlKeyRef.current = null;
          pendingTargetedHtmlPatchRef.current = null;
        }
        iframeEditBridgeIdRef.current = editMessage.bridgeId;
        setIframeReadySourceKey(null);
        if (lastAppliedSourceRef.current == null) {
          lastAppliedSourceRef.current = iframeDocumentSrcdoc;
        }
        setIframeEditBridgeId(editMessage.bridgeId);
        return;
      }
      if (editMessage?.type === 'r20:edit-applied') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        const applied = applySourcesRef.current.get(editMessage.revision);
        if (!applied) return;
        // A delayed ACK from an older source must not invalidate the current
        // render-ready state or clear the newer pending source.
        if (editMessage.revision < lastAppliedAckRevisionRef.current) {
          applySourcesRef.current.delete(editMessage.revision);
          return;
        }
        setIframeReadySourceKey(null);
        setIframeAppliedHtmlKey(applied.htmlKey);
        markEditorTiming('apply-acked-parent');
        lastAppliedSourceRef.current = applied.sourceKey;
        lastAppliedHtmlRef.current = applied.html;
        lastAppliedHtmlKeyRef.current = applied.htmlKey;
        applySourcesRef.current.delete(editMessage.revision);
        if (pendingApplySourceRef.current === applied.sourceKey) {
          pendingApplySourceRef.current = null;
          setPendingApplyRevision(0);
        }
        // applyLivePatch schedules its resize for the next animation frame.
        // Reset here as well so a stale pre-apply resize cannot consume the
        // one-shot intrinsic-width measurement for the newly applied sheet.
        autoWidthSizedRef.current = false;
        setIframeEditDragOrigin(null);
        iframeEditDragOriginRef.current = null;
        setIframeEditDropTarget(null);
        lastAppliedAckRevisionRef.current = editMessage.revision;
        setLastApplyAck(editMessage.revision);
        const target = iframeRef.current?.contentWindow;
        target?.postMessage({
          type: 'r20:edit-mode',
          protocol: R20_IFRAME_EDIT_PROTOCOL,
          bridgeId: editMessage.bridgeId,
          enabled: useUiStore.getState().mainMode === 'edit',
          selectedBlockId: useWorkspaceStore.getState().selectedBlockId,
          selectedBlockIds: useWorkspaceStore.getState().selectedBlockIds,
        }, '*');
        return;
      }
      if (editMessage?.type === 'r20:edit-nudge') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        const ui = useUiStore.getState();
        if (ui.mainMode !== 'edit' || ui.editSubmode !== 'sheet' || !iframeStructureReady) return;
        const selectedBlockIds = useWorkspaceStore.getState().selectedBlockIds;
        if (editMessage.selection.length !== selectedBlockIds.length) return;
        const selectedSet = new Set(selectedBlockIds);
        if (!editMessage.selection.every((item) => selectedSet.has(item.geometry.blockId))) return;
        nudgeIframeSelection(editMessage.selection, editMessage.deltaX, editMessage.deltaY);
        return;
      }
      if (editMessage?.type === 'r20:edit-hit') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        if (!iframeRenderReady) return;
        const adapter = getBlocklyAdapter();
        if (!htmlLayerMap.has(editMessage.blockId)) return;
        if (!editMessage.hitPath.every((item) => htmlLayerMap.has(item.blockId))) return;
        if (
          editMessage.subject.offsetParentBlockId
          && !htmlLayerMap.has(editMessage.subject.offsetParentBlockId)
        ) return;
        if (
          editMessage.phase === 'measure'
          && pendingIframeResizeBlockRef.current === editMessage.blockId
        ) {
          pendingIframeResizeBlockRef.current = null;
          setIframeResizePreview(null);
        }
        const nextDropTarget = resolveIframeEditDropTarget(editMessage, {
          getBlock: (blockId) => htmlLayerMap.get(blockId) ?? null,
          canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
          canNestBlockInContainer: (movingBlockId, targetBlockId) => adapter.canNestBlockInContainer(
            'html',
            movingBlockId,
            targetBlockId,
          ),
        });
        const placement = useUiStore.getState().editPlacementMode;
        const visibleDropTarget = filterDropTargetForPlacement(nextDropTarget, placement);
        if (editMessage.phase === 'pointermove') {
          queueIframeEditState(editMessage, visibleDropTarget);
        } else if (editMessage.phase === 'pointerup') {
          // The pointer-up geometry is consumed synchronously below. Publishing
          // it into the large parent overlay state first forces a React render
          // before the immediate emit microtask can run. Clear the transient
          // overlay on the next frame instead; the iframe remains the source of
          // truth for the committed visual position.
          if (iframeEditOverlayFrameRef.current != null) {
            window.cancelAnimationFrame(iframeEditOverlayFrameRef.current);
            iframeEditOverlayFrameRef.current = null;
          }
          pendingIframeEditStateRef.current = null;
          window.requestAnimationFrame(() => {
            setIframeEditOverlay(null);
            setIframeEditDropTarget(null);
          });
        } else {
          flushIframeEditState(editMessage, visibleDropTarget);
        }
        if (editMessage.phase === 'pointermove') {
          const ui = useUiStore.getState();
          const flowTarget = ui.editPlacementMode === 'flow' ? visibleDropTarget : null;
          iframeEditDropTargetRef.current = flowTarget;
          iframeRef.current?.contentWindow?.postMessage({
            type: 'r20:edit-flow-target',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            pointerId: editMessage.pointerId,
            subjectBlockId: editMessage.subject.blockId,
            placement: flowTarget?.mode ?? null,
            containerBlockId: flowTarget?.containerBlockId ?? null,
            siblingBlockId: flowTarget?.siblingBlockId ?? null,
          }, '*');
        }
        if (editMessage.phase === 'pointerdown') {
          iframeEditDropTargetRef.current = null;
          pendingTargetedHtmlPatchRef.current = null;
          iframeEditDragOriginRef.current = editMessage;
          setIframeEditDragOrigin(editMessage);
          const store = useWorkspaceStore.getState();
          const additiveSelection = Boolean(
            editMessage.modifiers?.ctrlKey || editMessage.modifiers?.metaKey,
          );
          if (additiveSelection) {
            store.setSelectedBlockIds([
              editMessage.blockId,
              ...store.selectedBlockIds.filter((id) => id !== editMessage.blockId),
            ], 'preview');
          } else if (
            store.selectedBlockIds.length <= 1
            || !store.selectedBlockIds.includes(editMessage.blockId)
          ) {
            setSelected(editMessage.blockId, 'preview');
          }
          const currentSelection = useWorkspaceStore.getState();
          iframeRef.current?.contentWindow?.postMessage({
            type: 'r20:edit-mode',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            enabled: true,
            selectedBlockId: currentSelection.selectedBlockId,
            selectedBlockIds: currentSelection.selectedBlockIds,
          }, '*');
          iframeRef.current?.contentWindow?.postMessage({
            type: 'r20:edit-drag-selection',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            selectedBlockId: currentSelection.selectedBlockId,
            selectedBlockIds: currentSelection.selectedBlockIds,
          }, '*');
        } else if (editMessage.phase === 'pointercancel') {
          iframeEditDropTargetRef.current = null;
          iframeEditDragOriginRef.current = null;
          setIframeEditDragOrigin(null);
        } else if (editMessage.phase === 'pointerup') {
          markEditorTiming('pointerup-parent');
          const ui = useUiStore.getState();
          const committedDropTarget = nextDropTarget ?? iframeEditDropTargetRef.current;
          let moved = false;
          let targetedHtmlBlockIds: string[] | null = null;
          adapter.runInEventGroup(() => {
            if (ui.editPlacementMode === 'flow') {
              markEditorTiming('commit-start');
              moved = commitIframeFlowDrop(editMessage.subject.blockId, committedDropTarget, adapter);
            } else {
              markEditorTiming('commit-start');
              const dragOrigin = iframeEditDragOriginRef.current;
              const origin = dragOrigin ? inferMultiDragOrigin(dragOrigin, editMessage) : null;
              const lookup = {
                getBlock: (blockId: string) => htmlLayerMap.get(blockId) ?? null,
                canNestInContainer: (blockId: string) => adapter.canNestInContainer('html', blockId),
                canNestBlockInContainer: (movingBlockId: string, targetBlockId: string) => adapter.canNestBlockInContainer(
                  'html',
                  movingBlockId,
                  targetBlockId,
                ),
              };
              const originSelection = origin?.selection ?? [];
              const endSelection = editMessage.selection ?? [];
              const originBlockId = origin?.subject.blockId ?? null;
              const canMoveAsGroup = originSelection.length > 1
                && endSelection.length === originSelection.length
                && originBlockId !== null
                && originSelection.some((selected) => selected.geometry.blockId === originBlockId)
                && originSelection.every((selected) => endSelection.some(
                  (endSelected) => endSelected.geometry.blockId === selected.geometry.blockId,
                ));
              if (canMoveAsGroup && origin) {
                let managedCssChanged = false;
                const placements = originSelection.map((selected) => {
                  const endSelected = endSelection.find(
                    (candidate) => candidate.geometry.blockId === selected.geometry.blockId,
                  );
                  return endSelected
                    ? resolveIframeMultiFreePlacement(
                        selected,
                        endSelected,
                        origin.pointer,
                        editMessage.pointer,
                        lookup,
                        ui.snapEnabled ? 8 : 1,
                      )
                    : null;
                });
                if (placements.every((placement) => placement !== null)) {
                  placements.forEach((placement, index) => {
                    if (!placement) return;
                    const blockId = originSelection[index].geometry.blockId;
                    const committed = commitManagedDesignPosition(adapter, {
                      workspace: 'html',
                      blockId,
                      left: placement.left,
                      top: placement.top,
                      containingBlockId: placement.containingBlockId,
                      containingBlockNeedsRelative: placement.containingBlockNeedsRelative,
                    });
                    moved = committed.moved || moved;
                    managedCssChanged = committed.reason === 'managed-css' || managedCssChanged;
                  });
                }
                if (managedCssChanged) {
                  useWorkspaceStore.getState().bumpStructure('css', adapter.countBlocks('css'));
                }
              } else {
                const placement = origin
                  ? resolveIframeFreePlacement(origin, editMessage, lookup, ui.snapEnabled ? 8 : 1)
                  : null;
                if (placement) {
                  const subject = htmlLayerMap.get(editMessage.subject.blockId) ?? null;
                  const currentParentId = subject?.layerParentId ?? null;
                  const structureChanged = currentParentId !== (placement.containingBlockId ?? null);
                  let structureMoved = true;
                  if (placement.containingBlockId && currentParentId !== placement.containingBlockId) {
                    structureMoved = adapter.nestBlockInContainer(
                      'html',
                      editMessage.subject.blockId,
                      placement.containingBlockId,
                    );
                  } else if (!placement.containingBlockId && currentParentId) {
                    structureMoved = adapter.moveBlockToRoot('html', editMessage.subject.blockId);
                  }
                  if (structureMoved) {
                    const committed = commitManagedDesignPosition(adapter, {
                      workspace: 'html',
                      blockId: editMessage.subject.blockId,
                      left: placement.left,
                      top: placement.top,
                      containingBlockId: placement.containingBlockId,
                      containingBlockNeedsRelative: placement.containingBlockNeedsRelative,
                    });
                    moved = committed.moved;
                    if (committed.reason === 'managed-css') {
                      useWorkspaceStore.getState().bumpStructure('css', adapter.countBlocks('css'));
                      if (!structureChanged) {
                        targetedHtmlBlockIds = [
                          editMessage.subject.blockId,
                          ...(
                            committed.containingClass && placement.containingBlockId
                              ? [placement.containingBlockId]
                              : []
                          ),
                        ];
                      }
                    }
                  }
                }
              }
            }
          });
          markEditorTiming('commit-end');
          const optimisticFlowCommit: OptimisticFlowCommit | null =
            moved && ui.editPlacementMode === 'flow' && committedDropTarget
              ? {
                  subjectBlockId: editMessage.subject.blockId,
                  placement: committedDropTarget.mode,
                  containerBlockId: committedDropTarget.containerBlockId,
                  siblingBlockId: committedDropTarget.siblingBlockId,
                }
              : null;
          pendingOptimisticFlowCommitRef.current = optimisticFlowCommit;
          pendingTargetedHtmlPatchRef.current =
            moved && ui.editPlacementMode === 'free' && targetedHtmlBlockIds
              ? { blockIds: Array.from(new Set(targetedHtmlBlockIds)) }
              : null;
          if (moved) {
            if (ui.editPlacementMode === 'flow' && committedDropTarget) {
              iframeRef.current?.contentWindow?.postMessage({
                type: 'r20:edit-optimistic-flow',
                protocol: R20_IFRAME_EDIT_PROTOCOL,
                bridgeId: editMessage.bridgeId,
                subjectBlockId: editMessage.subject.blockId,
                placement: committedDropTarget.mode,
                containerBlockId: committedDropTarget.containerBlockId,
                siblingBlockId: committedDropTarget.siblingBlockId,
              }, '*');
            }
            const store = useWorkspaceStore.getState();
            markEditorTiming('count-start');
            const htmlBlockCount = adapter.countBlocks('html');
            markEditorTiming('count-end');
            store.bumpStructure('html', htmlBlockCount);
            // The adapter event group is already closed, so the workspace is
            // final here. Emit before BlocklyModelHost's queued layer bump can
            // make a large sheet rebuild its snapshot ahead of code/preview.
            markEditorTiming('flush-scheduled');
            markEditorTiming('flush-callback');
            flushEmitPipeline();
          } else {
            iframeEditDragOriginRef.current = null;
            setIframeEditDragOrigin(null);
          }
          iframeRef.current?.contentWindow?.postMessage({
            type: 'r20:edit-optimistic-flow-finalize',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            committed: moved,
            ...(optimisticFlowCommit ?? {}),
          }, '*');
          iframeEditDropTargetRef.current = null;
        }
        return;
      }
      if (editMessage?.type === 'r20:widget-drag') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        if (!iframeRenderReady) return;
        if (editMessage.phase === 'dragleave') {
          setIframeEditDropTarget(null);
          return;
        }
        const adapter = getBlocklyAdapter();
        if (!editMessage.hitPath.every((item) => htmlLayerMap.has(item.blockId))) return;
        const preset = editMessage.payload ? decodeFriendlyWidgetDrag(editMessage.payload) : null;
        const placement = useUiStore.getState().editPlacementMode;
        const nextDropTarget = resolveIframeWidgetDropTarget(editMessage, {
          getBlock: (blockId) => htmlLayerMap.get(blockId) ?? null,
          canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
          canNestTypeInContainer: (movingType, targetBlockId) => adapter.canNestTypeInContainer(
            'html',
            movingType,
            targetBlockId,
          ),
          canNestBlockInContainer: (movingBlockId, targetBlockId) => adapter.canNestBlockInContainer(
            'html',
            movingBlockId,
            targetBlockId,
          ),
        }, preset?.blockType ?? '', placement);
        const visibleDropTarget = filterDropTargetForPlacement(nextDropTarget, placement);
        setIframeEditDropTarget(visibleDropTarget);
        if (editMessage.phase !== 'drop' || !editMessage.payload) return;
        if (!preset) {
          setIframeEditDropTarget(null);
          return;
        }
        const ui = useUiStore.getState();
        // The visible target is also the authoritative commit target. In free
        // placement, before/after targets are intentionally filtered out; do
        // not let the hidden structural target turn a drop back into flow.
        const committedWidgetTarget = visibleDropTarget;
        const freeInside = ui.editPlacementMode === 'free'
          && committedWidgetTarget?.mode === 'inside'
          && Boolean(committedWidgetTarget.containerBlockId);
        const position = resolveIframeContainerPoint(
          editMessage.pointer,
          freeInside && committedWidgetTarget ? committedWidgetTarget.geometry : null,
          ui.snapEnabled ? 8 : 1,
        );
        const id = appendFriendlyWidgetPreset(preset, position, {
          mode: freeInside ? 'absolute-in-container' : committedWidgetTarget ? 'flow' : 'absolute',
          placement: committedWidgetTarget?.mode,
          containerBlockId: committedWidgetTarget?.containerBlockId ?? committedWidgetTarget?.blockId ?? null,
          siblingBlockId: committedWidgetTarget?.siblingBlockId ?? null,
        });
        setIframeEditDropTarget(null);
        if (id) setSelected(id, 'preview');
        return;
      }
      if (editMessage?.type === 'r20:block-type-drag') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        if (!iframeRenderReady) return;
        const blockType = editMessage.blockType;
        const def = blockType ? getBlockDef(blockType) : null;
        if (editMessage.phase === 'dragleave' || !blockType || !def) {
          setDragOver(false);
          setIframeEditDropTarget(null);
          return;
        }
        setDragOver(editMessage.phase === 'dragover');
        const adapter = getBlocklyAdapter();
        if (!editMessage.hitPath.every((item) => htmlLayerMap.has(item.blockId))) return;
        const placement = useUiStore.getState().editPlacementMode;
        const nextDropTarget = resolveIframeWidgetDropTarget(editMessage, {
          getBlock: (blockId) => htmlLayerMap.get(blockId) ?? null,
          canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
          canNestTypeInContainer: (movingType, targetBlockId) => adapter.canNestTypeInContainer(
            'html',
            movingType,
            targetBlockId,
          ),
          canNestBlockInContainer: (movingBlockId, targetBlockId) => adapter.canNestBlockInContainer(
            'html',
            movingBlockId,
            targetBlockId,
          ),
        }, blockType, placement);
        const visibleDropTarget = filterDropTargetForPlacement(nextDropTarget, placement);
        setIframeEditDropTarget(visibleDropTarget);
        if (editMessage.phase !== 'drop') return;

        const id = appendBlock(blockType, 'html');
        if (!id) {
          setDragOver(false);
          setIframeEditDropTarget(null);
          toast.error('블록을 시트에 놓지 못했어요', { duration: 2200 });
          return;
        }
        let moved = false;
        const target = visibleDropTarget;
        if (placement === 'flow' && target) {
          moved = commitIframeFlowDrop(id, target, adapter);
        } else {
          const freeInside = placement === 'free'
            && target?.mode === 'inside'
            && Boolean(target.containerBlockId);
          const position = resolveIframeContainerPoint(
            editMessage.pointer,
            freeInside && target ? target.geometry : null,
            useUiStore.getState().snapEnabled ? 8 : 1,
          );
          let structureReady = true;
          if (freeInside && target?.containerBlockId) {
            structureReady = adapter.nestBlockInContainer('html', id, target.containerBlockId);
          }
          if (structureReady) {
            const committed = commitManagedDesignPosition(adapter, {
              workspace: 'html',
              blockId: id,
              left: position.left,
              top: position.top,
              containingBlockId: freeInside ? target?.containerBlockId ?? null : null,
              containingBlockNeedsRelative: freeInside
                ? target?.geometry.position === 'static'
                : false,
            });
            moved = committed.moved;
            if (committed.reason === 'managed-css') {
              useWorkspaceStore.getState().bumpStructure('css', adapter.countBlocks('css'));
            }
          }
        }
        if (!moved) {
          adapter.deleteBlock('html', id);
          setDragOver(false);
          setIframeEditDropTarget(null);
          toast.error('이 위치에는 해당 블록을 놓을 수 없어요', { duration: 2200 });
          return;
        }
        const store = useWorkspaceStore.getState();
        store.bumpStructure('html', adapter.countBlocks('html'));
        setSelected(id, 'preview');
        setDragOver(false);
        setIframeEditDropTarget(null);
        queueMicrotask(() => flushEmitPipeline());
        playSfx('block.add');
        return;
      }
      if (editMessage?.type === 'r20:layer-drag') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        if (!iframeRenderReady) return;
        if (!htmlLayerMap.has(editMessage.blockId)) return;
        if (
          editMessage.subject
          && (!htmlLayerMap.has(editMessage.subject.blockId)
            || editMessage.subject.blockId !== editMessage.blockId)
        ) return;
        if (!editMessage.hitPath.every((item) => htmlLayerMap.has(item.blockId))) return;
        if (editMessage.phase === 'dragleave') {
          setIframeEditDropTarget(null);
          return;
        }

        const adapter = getBlocklyAdapter();
        const placement = useUiStore.getState().editPlacementMode;
        const nextDropTarget = resolveIframeLayerDropTarget(editMessage, {
          getBlock: (blockId) => htmlLayerMap.get(blockId) ?? null,
          canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
          canNestBlockInContainer: (movingBlockId, targetBlockId) => adapter.canNestBlockInContainer(
            'html',
            movingBlockId,
            targetBlockId,
          ),
        }, placement);
        const visibleDropTarget = filterDropTargetForPlacement(nextDropTarget, placement);
        setIframeEditDropTarget(visibleDropTarget);
        if (editMessage.phase !== 'drop') return;

        let moved = false;
        if (placement === 'flow') {
          moved = visibleDropTarget
            ? commitIframeFlowDrop(editMessage.blockId, visibleDropTarget, adapter)
            : Boolean(
                htmlLayerMap.get(editMessage.blockId)?.layerParentId
                && adapter.moveBlockToRoot('html', editMessage.blockId),
              );
        } else {
          const freePlacement = resolveIframeLayerFreePlacement(editMessage, visibleDropTarget, {
            getBlock: (blockId) => htmlLayerMap.get(blockId) ?? null,
            canNestInContainer: (blockId) => adapter.canNestInContainer('html', blockId),
            canNestBlockInContainer: (movingBlockId, targetBlockId) => adapter.canNestBlockInContainer(
              'html',
              movingBlockId,
              targetBlockId,
            ),
          }, useUiStore.getState().snapEnabled ? 8 : 1);
          if (freePlacement) {
            const currentParentId = htmlLayerMap.get(editMessage.blockId)?.layerParentId ?? null;
            let structureReady = true;
            if (freePlacement.containingBlockId && currentParentId !== freePlacement.containingBlockId) {
              structureReady = adapter.nestBlockInContainer(
                'html',
                editMessage.blockId,
                freePlacement.containingBlockId,
              );
            } else if (!freePlacement.containingBlockId && currentParentId) {
              structureReady = adapter.moveBlockToRoot('html', editMessage.blockId);
            }
            if (structureReady) {
              const committed = commitManagedDesignPosition(adapter, {
                workspace: 'html',
                blockId: editMessage.blockId,
                left: freePlacement.left,
                top: freePlacement.top,
                containingBlockId: freePlacement.containingBlockId,
                containingBlockNeedsRelative: freePlacement.containingBlockNeedsRelative,
              });
              moved = committed.moved;
              if (committed.reason === 'managed-css') {
                useWorkspaceStore.getState().bumpStructure('css', adapter.countBlocks('css'));
              }
            }
          }
        }

        setIframeEditDropTarget(null);
        if (!moved) {
          toast.error('이 위치에는 레이어를 놓을 수 없어요', { duration: 2200 });
          return;
        }
        if (placement === 'flow' && visibleDropTarget) {
          pendingOptimisticFlowCommitRef.current = {
            subjectBlockId: editMessage.blockId,
            placement: visibleDropTarget.mode,
            containerBlockId: visibleDropTarget.containerBlockId,
            siblingBlockId: visibleDropTarget.siblingBlockId,
          };
          const target = iframeRef.current?.contentWindow;
          const optimistic = {
            type: 'r20:edit-optimistic-flow',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            subjectBlockId: editMessage.blockId,
            placement: visibleDropTarget.mode,
            containerBlockId: visibleDropTarget.containerBlockId,
            siblingBlockId: visibleDropTarget.siblingBlockId,
          };
          target?.postMessage(optimistic, '*');
          target?.postMessage({
            type: 'r20:edit-optimistic-flow-finalize',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: editMessage.bridgeId,
            committed: true,
            subjectBlockId: editMessage.blockId,
            placement: visibleDropTarget.mode,
            containerBlockId: visibleDropTarget.containerBlockId,
            siblingBlockId: visibleDropTarget.siblingBlockId,
          }, '*');
        }
        const store = useWorkspaceStore.getState();
        store.bumpStructure('html', adapter.countBlocks('html'));
        setSelected(editMessage.blockId, 'preview');
        queueMicrotask(() => flushEmitPipeline());
        return;
      }
      if (editMessage?.type === 'r20:edit-context-menu') {
        if (editMessage.bridgeId !== iframeEditBridgeIdRef.current) return;
        if (useUiStore.getState().mainMode !== 'edit') return;
        if (!iframeRenderReady) return;
        const adapter = getBlocklyAdapter();
        if (!adapter.getBlock('html', editMessage.blockId)) return;
        const iframe = iframeRef.current;
        if (!iframe) return;
        const rect = iframe.getBoundingClientRect();
        const scaleX = iframe.offsetWidth > 0 ? rect.width / iframe.offsetWidth : 1;
        const scaleY = iframe.offsetHeight > 0 ? rect.height / iframe.offsetHeight : scaleX;
        setSelected(editMessage.blockId, 'preview');
        setContextMenuState({
          blockId: editMessage.blockId,
          x: rect.left + editMessage.pointer.x * scaleX,
          y: rect.top + editMessage.pointer.y * scaleY,
        });
        return;
      }
      const data = e.data;
      if (data?.type === 'r20:select' && typeof data.blockId === 'string') {
        setSelected(data.blockId, 'preview');
        return;
      }
      if (data?.type === 'r20:resize' && typeof data.height === 'number') {
        const nextHeight = clampSheetRenderHeight(data.height);
        // Keep the iframe host at least as tall as the sheet. A wide threshold
        // hides small but real content growth and can clip the final rows.
        setIframeHeight((prev) => (Math.abs(prev - nextHeight) >= 1 ? nextHeight : prev));
        if (
          !autoWidthSizedRef.current
          && canvasWidthAuto
          && typeof data.width === 'number'
        ) {
          autoWidthSizedRef.current = true;
          const nextWidth = clampCanvasWidth('sheet', data.width);
          const currentWidth = useUiStore.getState().sheetCanvasWidth;
          if (Math.abs(nextWidth - currentWidth) > 8) {
            setAutoCanvasWidth(nextWidth);
          }
        }
        return;
      }
      // spec 17 §8 + N3 — widget hover/click (양방향 sync 간단)
      if (data?.type === 'r20:widget-hover') {
        const widgetName: string | null = data.widgetName ?? null;
        if (widgetName == null) {
          setHoveredWidgetId(null);
          return;
        }
        // 현 캔버스에서 같은 name 의 위젯 찾아 hover 표시
        const ws = useWorkspaceStore.getState();
        const tgt = useUiStore.getState().editSubmode === 'sheet' ? 'sheet' : 'rolltemplate';
        const list = tgt === 'sheet' ? ws.sheetWidgets : ws.rolltemplateWidgets;
        const w = list.find((x) => (x.attrs.name as string | undefined) === widgetName);
        setHoveredWidgetId(w?.id ?? null);
        return;
      }
      if (data?.type === 'r20:widget-click') {
        const widgetName: string | undefined = data.widgetName;
        if (!widgetName) return;
        const ws = useWorkspaceStore.getState();
        const tgt = useUiStore.getState().editSubmode === 'sheet' ? 'sheet' : 'rolltemplate';
        const list = tgt === 'sheet' ? ws.sheetWidgets : ws.rolltemplateWidgets;
        const w = list.find((x) => (x.attrs.name as string | undefined) === widgetName);
        if (w) setSelectedWidgetId(w.id);
        return;
      }
      if (data?.type === 'r20:roll') {
        const attrsMap: Record<string, string> = (data.attrs ?? {}) as Record<string, string>;
        const resolver: AttrResolver = (name) => {
          if (Object.prototype.hasOwnProperty.call(attrsMap, name)) return attrsMap[name];
          return undefined;
        };
        const query: QueryResolver = (prompt, fallback) => {
          if (typeof window === 'undefined') return fallback;
          const ans = window.prompt(prompt, fallback);
          return ans === null ? fallback : ans;
        };
        const expression = String(data.value ?? '').trim();
        const label = String(data.label ?? '').trim();
        const senderRaw = String(data.name ?? '').trim();
        const sender = label || (senderRaw ? senderRaw.replace(/^roll_/, '') : 'Sheet');
        let result: RollResult;
        try {
          const root = parseRoot(expression);
          result = executeRoot(root, { attr: resolver, query });
        } catch (err) {
          result = {
            kind: 'error',
            message: err instanceof Error ? err.message : String(err),
            raw: expression,
          };
        }
        useChatStore.getState().pushRoll({
          sender,
          expression,
          result,
        });
        // SFX — 결과별 분기.
        //   error  → toast.error 사운드
        //   crit   → 상승 fanfare
        //   fumble → 하강 sad horn
        //   else   → dice tumble + pop
        if (result.kind === 'error') {
          playSfx('toast.error');
        } else if (result.kind === 'expr' && result.isCrit) {
          playSfx('roll.crit');
        } else if (result.kind === 'expr' && result.isFumble) {
          playSfx('roll.fumble');
        } else if (result.kind === 'rolltemplate' && result.anyCrit) {
          playSfx('roll.crit');
        } else if (result.kind === 'rolltemplate' && result.anyFumble) {
          playSfx('roll.fumble');
        } else {
          playSfx('roll.click');
        }
        // 굴림 발생 시 [채팅] 탭으로 자동 전환 + 우측 사이드 펼침.
        const ui = useUiStore.getState();
        if (ui.sidebarRightCollapsed) ui.toggleSidebarRight();
        if (ui.sidebarRightTab !== 'chat') ui.setSidebarRightTab('chat');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [appendBlock, canvasWidthAuto, editSubmode, flushIframeEditState, htmlLayerMap, iframeDocumentSrcdoc, iframeRenderReady, iframeStructureReady, liveHtmlKey, nudgeIframeSelection, queueIframeEditState, renderSourceKey, setAutoCanvasWidth, setHoveredWidgetId, setSelected, setSelectedWidgetId]);

  useEffect(() => {
    if (!iframeEditBridgeId || !iframeKeyboardNudgeSelection || !iframeStructureReady) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || event.isComposing
        || event.altKey
        || event.ctrlKey
        || event.metaKey
      ) return;
      const target = event.target;
      if (
        target instanceof HTMLElement
        && target.closest('input, textarea, select, [contenteditable="true"]')
      ) return;
      const step = event.shiftKey ? 10 : 1;
      const deltaX = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const deltaY = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      if (!deltaX && !deltaY) return;
      const targetWindow = iframeRef.current?.contentWindow;
      if (!targetWindow) return;
      event.preventDefault();
      targetWindow.postMessage({
        type: 'r20:edit-nudge-command',
        protocol: R20_IFRAME_EDIT_PROTOCOL,
        bridgeId: iframeEditBridgeId,
        deltaX,
        deltaY,
      }, '*');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [iframeEditBridgeId, iframeKeyboardNudgeSelection, iframeStructureReady]);

  useEffect(() => {
    if (!iframeEditBridgeId) return;
    if (lastAppliedSourceRef.current === renderSourceKey) return;
    if (!iframeRef.current?.contentWindow) return;
    const revision = applyRevisionRef.current + 1;
    applyRevisionRef.current = revision;
    // Only the newest source can still be pending. Drop superseded entries so
    // delayed stale ACKs cannot accumulate or affect later readiness state.
    applySourcesRef.current.forEach((_source, sourceRevision) => {
      if (sourceRevision < revision) applySourcesRef.current.delete(sourceRevision);
    });
    applySourcesRef.current.set(revision, {
      sourceKey: renderSourceKey,
      htmlKey: liveHtmlKey,
      html: livePatch.html,
    });
    pendingApplySourceRef.current = renderSourceKey;
    // A persistent iframe first reports the empty/default document width. Let
    // each applied sheet source report its own intrinsic width while manual
    // width input remains authoritative until the user resets automatic sizing.
    autoWidthSizedRef.current = false;
    setPendingApplyRevision(revision);
    const optimisticFlowCommit = pendingOptimisticFlowCommitRef.current;
    const pendingTargetedHtmlPatch = pendingTargetedHtmlPatchRef.current;
    if (pendingTargetedHtmlPatch) markEditorTiming('target-plan-start');
    const targetedHtmlPatch =
      pendingTargetedHtmlPatch
      && lastAppliedHtmlRef.current
      && lastAppliedHtmlKeyRef.current
        ? buildTargetedHtmlPatchPlan({
            beforeHtml: lastAppliedHtmlRef.current,
            afterHtml: livePatch.html,
            blockIds: pendingTargetedHtmlPatch.blockIds,
            baseHtmlKey: lastAppliedHtmlKeyRef.current,
            nextHtmlKey: liveHtmlKey,
          })
        : null;
    if (pendingTargetedHtmlPatch) markEditorTiming('target-plan-end');
    // A proven attribute-only patch can travel as one message even when the
    // full fallback HTML is large. The iframe still receives that fallback,
    // but avoids dozens of chunk tasks and a whole-root DOM morph.
    const chunked = livePatch.html.length > 300000 && !targetedHtmlPatch;
    const flowMetadata = optimisticFlowCommit ? { optimisticFlow: optimisticFlowCommit } : {};
    const targetedMetadata = targetedHtmlPatch ? { targetedHtmlPatch } : {};
    const messages: Array<Record<string, unknown>> = chunked
      ? (() => {
          const chunkSize = 32000;
          const totalChunks = Math.ceil(livePatch.html.length / chunkSize);
          const { html, ...metadata } = livePatch;
          const start = {
            type: 'r20:edit-apply-chunk-start',
            protocol: R20_IFRAME_EDIT_PROTOCOL,
            bridgeId: iframeEditBridgeId,
            revision,
            htmlLength: html.length,
            totalChunks,
            ...metadata,
            ...flowMetadata,
            ...targetedMetadata,
          };
          const chunks = [];
          for (let index = 0; index < totalChunks; index += 1) {
            chunks.push({
              type: 'r20:edit-apply-chunk',
              protocol: R20_IFRAME_EDIT_PROTOCOL,
              bridgeId: iframeEditBridgeId,
              revision,
              index,
              text: html.slice(index * chunkSize, (index + 1) * chunkSize),
            });
          }
          return [start, ...chunks];
        })()
      : [{
          type: 'r20:edit-apply',
          protocol: R20_IFRAME_EDIT_PROTOCOL,
          bridgeId: iframeEditBridgeId,
          revision,
          ...livePatch,
          ...flowMetadata,
          ...targetedMetadata,
        }];
    let retryTimer: number | null = null;
    let attempts = 0;
    const send = () => {
      const currentFrame = iframeRef.current;
      const currentTarget = currentFrame?.contentWindow;
      if (
        iframeEditBridgeIdRef.current !== iframeEditBridgeId
        || pendingApplySourceRef.current !== renderSourceKey
      ) return;
      if (!currentTarget) return;
      try {
        if (attempts === 0) markEditorTiming('apply-post-start');
        messages.forEach((message) => currentTarget.postMessage(message, '*'));
        if (attempts === 0) {
          markEditorTiming('apply-post-end');
          markEditorTiming('apply-sent');
          if (optimisticFlowCommit && pendingOptimisticFlowCommitRef.current === optimisticFlowCommit) {
            pendingOptimisticFlowCommitRef.current = null;
          }
          if (
            pendingTargetedHtmlPatch
            && pendingTargetedHtmlPatchRef.current === pendingTargetedHtmlPatch
          ) {
            pendingTargetedHtmlPatchRef.current = null;
          }
        }
      } catch {
        setPendingApplyRevision(0);
        pendingApplySourceRef.current = null;
        applySourcesRef.current.delete(revision);
        return;
      }
      attempts += 1;
      if (attempts < (chunked ? 10 : 60)) retryTimer = window.setTimeout(send, 50);
    };
    send();
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [iframeEditBridgeId, iframeLoadRevision, lastApplyAck, liveHtmlKey, livePatch, renderSourceKey]);

  useEffect(() => {
    if (!iframeEditBridgeId) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage({
      type: 'r20:edit-mode',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: iframeEditBridgeId,
      enabled: mainMode === 'edit',
      selectedBlockId: selectedId,
      selectedBlockIds: selectedIds,
    }, '*');
  }, [iframeEditBridgeId, iframeRenderReady, mainMode, selectedId, selectedIds, lastApplyAck]);

  useEffect(() => {
    if (mainMode === 'edit') return;
    const frame = window.requestAnimationFrame(() => setContextMenuState(null));
    return () => window.cancelAnimationFrame(frame);
  }, [mainMode]);

  // 선택된 블록 → iframe 안 highlight.
  useEffect(() => {
    if (!selectedId) return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage({ type: 'r20:highlight', blockId: selectedId }, '*');
  }, [selectedId, lastApplyAck]);

  // Phase E — 컨텍스트 메뉴 액션 디스패치.
  // - inspect: selectedBlockId 갱신 + sidebar right 펼침 + 'attrs' (Inspector) 탭 활성.
  // - delete/duplicate/move: adapter mutation → explicit structure bump →
  //   immediate emit → the persistent preview stays current.
  // 워크스페이스 키는 active 우선, 없으면 html/css/i18n 순회 — drag/edit 와 동일 전략.
  const dispatchContextAction = (
    action: ShadowContextMenuAction,
    blockId: string,
  ) => {
    const adapter = getBlocklyAdapter();
    const cand: WorkspaceKey[] = [
      useWorkspaceStore.getState().activeWorkspace as WorkspaceKey,
      'html', 'css', 'i18n',
    ];
    const order: WorkspaceKey[] = [];
    for (const k of cand) if (!order.includes(k)) order.push(k);
    let ws: WorkspaceKey | null = null;
    for (const k of order) {
      if (adapter.getBlock(k, blockId)) { ws = k; break; }
    }
    if (!ws) {
      toast.error('블록을 찾을 수 없습니다', { duration: 1800 });
      return;
    }
    const commitContextMutation = () => {
      const store = useWorkspaceStore.getState();
      store.bumpStructure(ws, adapter.countBlocks(ws));
      // Blockly usually emits its own change event, but an explicit commit
      // keeps the persistent preview from waiting on that event or a later
      // unrelated edit.
      queueMicrotask(() => flushEmitPipeline());
    };
    switch (action) {
      case 'inspect': {
        setSelected(blockId, 'inspector');
        if (sidebarRightCollapsed) toggleSidebarRight();
        setSidebarRightTab('attrs');
        return;
      }
      case 'delete': {
        const ok = adapter.deleteBlock(ws, blockId);
        if (!ok) {
          toast.error('이 요소는 지금 삭제할 수 없어요', { duration: 1800 });
          return;
        }
        commitContextMutation();
        if (useWorkspaceStore.getState().selectedBlockId === blockId) {
          setSelected(null, 'preview');
        }
        toast.success('요소를 삭제했어요', { duration: 1400 });
        return;
      }
      case 'duplicate': {
        const newId = adapter.duplicateBlock(ws, blockId);
        if (!newId) {
          toast('이 요소는 복제할 수 없어요', { duration: 2000 });
          return;
        }
        commitContextMutation();
        setSelected(newId, 'preview');
        toast.success('요소를 복제했어요', { duration: 1400 });
        return;
      }
      case 'moveUp': {
        const ok = adapter.moveBlockUp(ws, blockId);
        if (!ok) {
          toast('이 위치에서는 더 위로 옮길 수 없어요', { duration: 2000 });
          return;
        }
        commitContextMutation();
        setSelected(blockId, 'preview');
        toast.success('요소를 한 칸 위로 옮겼어요', { duration: 1400 });
        return;
      }
      case 'moveDown': {
        const ok = adapter.moveBlockDown(ws, blockId);
        if (!ok) {
          toast('이 위치에서는 더 아래로 옮길 수 없어요', { duration: 2000 });
          return;
        }
        commitContextMutation();
        setSelected(blockId, 'preview');
        toast.success('요소를 한 칸 아래로 옮겼어요', { duration: 1400 });
        return;
      }
      default: return;
    }
  };

  useLayoutEffect(() => {
    markEditorTimingOnce('preview-layout-effect');
  });
  markEditorTimingOnce('preview-render-end');

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      data-r20-edit-bridge-ready={iframeEditBridgeId ? '1' : '0'}
      data-r20-render-ready={renderMode !== 'iframe' || isEmpty || iframeRenderReady ? '1' : '0'}
      data-r20-structure-ready={iframeStructureReady ? '1' : '0'}
      data-r20-apply-pending={pendingApplyRevision || ''}
      data-r20-apply-acked={lastApplyAck || ''}
      aria-busy={renderMode === 'iframe' && !isEmpty && !iframeRenderReady ? true : undefined}
    >
      <div
        ref={previewAreaRef}
        data-testid="preview-drop-surface"
        className={`relative flex-1 min-h-0 overflow-auto p-6 ${
          dragOver ? 'ring-2 ring-primary ring-inset' : ''
        }`}
        onDragOver={(e) => {
          if (
            e.dataTransfer.types.includes(FRIENDLY_WIDGET_MIME)
            || e.dataTransfer.types.includes('application/x-r20-block-type')
          ) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!dragOver) setDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={(e) => {
          const preset = decodeFriendlyWidgetDrag(e.dataTransfer.getData(FRIENDLY_WIDGET_MIME));
          const type = preset?.blockType
            ?? e.dataTransfer.getData('application/x-r20-block-type');
          setDragOver(false);
          if (!type) return;
          e.preventDefault();
          if (e.target === iframeRef.current) return;
          const iframe = iframeRef.current;
          let position: { left: number; top: number };
          if (iframe) {
            const rect = iframe.getBoundingClientRect();
            const scaleX = iframe.offsetWidth > 0 ? rect.width / iframe.offsetWidth : 1;
            const scaleY = iframe.offsetHeight > 0 ? rect.height / iframe.offsetHeight : scaleX;
            position = {
              left: Math.max(0, Math.round((e.clientX - rect.left) / scaleX)),
              top: Math.max(0, Math.round((e.clientY - rect.top) / scaleY)),
            };
          } else {
            const surfaceRect = e.currentTarget.getBoundingClientRect();
            const surfaceStyle = window.getComputedStyle(e.currentTarget);
            position = resolveEmptyCanvasDropPoint({
              pointer: { x: e.clientX, y: e.clientY },
              surface: {
                left: surfaceRect.left,
                top: surfaceRect.top,
                width: surfaceRect.width,
                paddingLeft: Number.parseFloat(surfaceStyle.paddingLeft) || 0,
                paddingRight: Number.parseFloat(surfaceStyle.paddingRight) || 0,
                paddingTop: Number.parseFloat(surfaceStyle.paddingTop) || 0,
              },
              canvasWidth,
              scale,
              snapSize: useUiStore.getState().snapEnabled ? 8 : 1,
            });
          }
          if (preset) {
            const id = appendFriendlyWidgetPreset(preset, position, { mode: 'absolute' });
            if (id) {
              setSelected(id, 'preview');
              playSfx('block.add');
              toast(`'${preset.label}' 추가 완료`, { duration: 1600 });
            } else {
              playSfx('toast.error');
              toast.error('조각을 추가하지 못했어요. 잠시 뒤 다시 시도해 주세요.', { duration: 2200 });
            }
            return;
          }
          const id = appendBlock(type);
          const def = getBlockDef(type);
          if (id) {
            if (activeWs === 'html' && mainMode === 'edit') {
              const adapter = getBlocklyAdapter();
              const committed = commitManagedDesignPosition(adapter, {
                workspace: 'html',
                blockId: id,
                left: position.left,
                top: position.top,
                containingBlockId: null,
                containingBlockNeedsRelative: false,
              });
              if (!committed.moved) {
                adapter.deleteBlock('html', id);
                toast.error('이 위치에는 해당 블록을 놓을 수 없어요', { duration: 2200 });
                return;
              }
              if (committed.reason === 'managed-css') {
                useWorkspaceStore.getState().bumpStructure('css', adapter.countBlocks('css'));
              }
              useWorkspaceStore.getState().bumpStructure('html', adapter.countBlocks('html'));
              queueMicrotask(() => flushEmitPipeline());
            }
            playSfx('block.add');
            toast(`'${def?.label ?? type}' 추가 완료`, { duration: 1600 });
          } else {
            playSfx('toast.error');
            toast.error('추가하지 못했어요. 잠시 후 다시 시도해 주세요.', { duration: 2200 });
          }
        }}
      >
        {isEmpty ? (
          <PreviewEmptyState canvasWidth={canvasWidth} scale={scale} />
        ) : (
          <div
            className="mx-auto"
            style={{
              width: `${canvasWidth * scale}px`,
              height: `${iframeHeight * scale}px`,
              maxWidth: 'none',
            }}
          >
            <div
              className={`relative origin-top ${
              renderMode === 'iframe' ? 'bg-transparent' : 'bg-white shadow-lg ring-1 ring-border'
            }`}
            style={{
              width: `${canvasWidth}px`,
              height: `${iframeHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {renderMode === 'iframe' ? (
              <iframe
                ref={iframeRef}
                data-testid="preview-iframe"
                title="시트 미리보기"
                sandbox={sandbox}
                srcDoc={iframeDocumentSrcdoc}
                onLoad={() => {
                  setIframeReadySourceKey(null);
                  setIframeAppliedHtmlKey(null);
                  setIframeLoadRevision((value) => value + 1);
                }}
                className="block w-full border-0"
                style={{ width: `${canvasWidth}px`, height: `${iframeHeight}px` }}
              />
            ) : (
              <div
                ref={hostRef}
                data-testid="preview-shadow-host"
                className="block h-[calc(100vh-220px)] w-full overflow-auto"
              />
            )}
            {renderMode === 'iframe' && mainMode === 'edit' && !isEmpty && !iframeRenderReady && (
              <div
                aria-live="polite"
                data-testid="iframe-render-loading"
                data-r20-render-loading="1"
                role="status"
                className="pointer-events-auto absolute inset-0 z-40 flex items-start justify-center bg-white/25 pt-4"
              >
                <span className="rounded-full border border-rose-200 bg-white/90 px-3 py-1 text-xs font-medium text-rose-800 shadow-sm">
                  시트 불러오는 중...
                </span>
              </div>
            )}
            {renderMode === 'iframe' && mainMode === 'edit' && iframeAlignmentBounds && (
              <>
                <div
                  aria-hidden="true"
                  data-testid="iframe-multi-selection-overlay"
                  className="pointer-events-none absolute z-20 box-border border border-dashed border-rose-500 bg-rose-300/5"
                  style={{
                    left: `${iframeAlignmentBounds.left}px`,
                    top: `${iframeAlignmentBounds.top}px`,
                    width: `${iframeAlignmentBounds.width}px`,
                    height: `${iframeAlignmentBounds.height}px`,
                    borderWidth: `${1.5 / Math.max(scale, 0.01)}px`,
                  }}
                />
                <div
                  role="toolbar"
                  aria-label="선택한 요소 정렬"
                  data-testid="iframe-alignment-toolbar"
                  data-r20-alignment-count={iframeAlignmentSelection?.length ?? 0}
                  className="pointer-events-auto absolute z-30 flex items-center border border-rose-200 bg-white/95 shadow-md backdrop-blur-sm"
                  style={{
                    left: `${Math.max(
                      4 / Math.max(scale, 0.01),
                      Math.min(
                        Math.max(
                          4 / Math.max(scale, 0.01),
                          canvasWidth - iframeArrangementToolbarWidth / Math.max(scale, 0.01),
                        ),
                        iframeAlignmentBounds.left
                          + iframeAlignmentBounds.width / 2
                          - iframeArrangementToolbarWidth / 2 / Math.max(scale, 0.01),
                      ),
                    )}px`,
                    top: `${Math.max(
                      4 / Math.max(scale, 0.01),
                      iframeAlignmentBounds.top - 36 / Math.max(scale, 0.01),
                    )}px`,
                    gap: `${2 / Math.max(scale, 0.01)}px`,
                    padding: `${3 / Math.max(scale, 0.01)}px`,
                    borderWidth: `${1 / Math.max(scale, 0.01)}px`,
                    borderRadius: `${6 / Math.max(scale, 0.01)}px`,
                  }}
                >
                  {ALIGNMENT_CONTROLS.map(({ mode, label, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      aria-label={label}
                      title={label}
                      data-testid={`iframe-align-${mode}`}
                      data-r20-alignment-mode={mode}
                      className="grid place-items-center text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500"
                      style={{
                        width: `${28 / Math.max(scale, 0.01)}px`,
                        height: `${28 / Math.max(scale, 0.01)}px`,
                        minWidth: 0,
                        minHeight: 0,
                        padding: 0,
                        border: 0,
                        borderRadius: `${4 / Math.max(scale, 0.01)}px`,
                        backgroundColor: 'transparent',
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={() => alignIframeSelection(mode)}
                    >
                      <Icon
                        aria-hidden="true"
                        style={{
                          width: `${16 / Math.max(scale, 0.01)}px`,
                          height: `${16 / Math.max(scale, 0.01)}px`,
                        }}
                      />
                    </button>
                  ))}
                  {iframeDistributionEnabled && (
                    <span
                      aria-hidden="true"
                      className="bg-rose-200"
                      style={{
                        width: `${1 / Math.max(scale, 0.01)}px`,
                        height: `${18 / Math.max(scale, 0.01)}px`,
                        margin: `0 ${2 / Math.max(scale, 0.01)}px`,
                      }}
                    />
                  )}
                  {iframeDistributionEnabled && DISTRIBUTION_CONTROLS.map(({ mode, label, Icon }) => (
                    <button
                      key={mode}
                      type="button"
                      aria-label={label}
                      title={label}
                      data-testid={`iframe-distribute-${mode}`}
                      data-r20-distribution-mode={mode}
                      className="grid place-items-center text-teal-700 transition-colors hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600"
                      style={{
                        width: `${28 / Math.max(scale, 0.01)}px`,
                        height: `${28 / Math.max(scale, 0.01)}px`,
                        minWidth: 0,
                        minHeight: 0,
                        padding: 0,
                        border: 0,
                        borderRadius: `${4 / Math.max(scale, 0.01)}px`,
                        backgroundColor: 'transparent',
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={() => distributeIframeSelection(mode)}
                    >
                      <Icon
                        aria-hidden="true"
                        style={{
                          width: `${16 / Math.max(scale, 0.01)}px`,
                          height: `${16 / Math.max(scale, 0.01)}px`,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
            {renderMode === 'iframe' && mainMode === 'edit' && iframeEditOverlay && (
              <div
                ref={iframeEditOverlayRef}
                role={iframeResizeHandles.length > 0 ? 'group' : undefined}
                aria-label={iframeResizeHandles.length > 0 ? '선택한 요소 크기 조절' : undefined}
                data-testid="iframe-edit-overlay"
                data-r20-block-id={iframeEditOverlay.blockId}
                data-r20-edit-phase={iframeEditOverlay.phase}
                data-r20-pointer-id={iframeEditOverlay.pointerId}
                data-r20-hit-path-length={iframeEditOverlay.hitPath.length}
                data-r20-offset-parent-block-id={iframeEditOverlay.subject.offsetParentBlockId ?? ''}
                className="pointer-events-none absolute z-20 border-2 border-amber-500 bg-amber-400/10"
                style={{
                  left: `${iframeEditVisibleRect?.left ?? iframeEditOverlay.rect.left}px`,
                  top: `${iframeEditVisibleRect?.top ?? iframeEditOverlay.rect.top}px`,
                  width: `${iframeEditVisibleRect?.width ?? iframeEditOverlay.rect.width}px`,
                  height: `${iframeEditVisibleRect?.height ?? iframeEditOverlay.rect.height}px`,
                  boxSizing: 'border-box',
                  borderWidth: `${2 / Math.max(scale, 0.01)}px`,
                }}
              >
                {iframeResizeHandles.map((handle) => {
                  const handleStyle = RESIZE_HANDLE_STYLE[handle];
                  const handleSize = 12 / Math.max(scale, 0.01);
                  return (
                    <button
                      key={handle}
                      type="button"
                      data-testid={`iframe-resize-handle-${handle}`}
                      data-r20-resize-handle={handle}
                      aria-label={`${handleStyle.label}에서 크기 조절`}
                      title={`${handleStyle.label}에서 크기 조절`}
                      className="pointer-events-auto absolute m-0 box-border block p-0 shadow-sm"
                      style={{
                        left: handleStyle.left,
                        top: handleStyle.top,
                        transform: handleStyle.transform,
                        cursor: handleStyle.cursor,
                        width: `${handleSize}px`,
                        height: `${handleSize}px`,
                        minWidth: 0,
                        minHeight: 0,
                        touchAction: 'none',
                        appearance: 'none',
                        borderStyle: 'solid',
                        borderWidth: `${1.5 / Math.max(scale, 0.01)}px`,
                        borderColor: '#d45d84',
                        borderRadius: `${2 / Math.max(scale, 0.01)}px`,
                        background: '#fffafb',
                      }}
                      onPointerDown={(event) => startIframeResize(event, handle)}
                      onPointerMove={moveIframeResize}
                      onPointerUp={endIframeResize}
                      onPointerCancel={cancelIframeResize}
                      onLostPointerCapture={cancelIframeResize}
                    />
                  );
                })}
              </div>
            )}
            {renderMode === 'iframe' && mainMode === 'edit' && iframeEditDropTarget && (
              (() => {
                const indicator = getDropIndicatorRect(
                  iframeEditDropTarget.mode,
                  iframeEditDropTarget.geometry.rect,
                );
                const inside = iframeEditDropTarget.mode === 'inside';
                return (
                  <div
                    aria-hidden="true"
                    data-testid="iframe-edit-drop-overlay"
                    data-r20-drop-target-id={iframeEditDropTarget.blockId}
                    data-r20-drop-mode={iframeEditDropTarget.mode}
                    data-r20-drop-indicator="exact"
                    className={`pointer-events-none absolute z-30 box-border ${
                      inside
                        ? 'rounded-sm border-2 border-rose-500 bg-rose-400/10'
                        : 'rounded-full border-2 border-teal-600 bg-teal-400/30 shadow-[0_0_0_2px_rgba(20,184,166,0.18)]'
                    }`}
                    style={{
                      left: `${indicator.left}px`,
                      top: `${indicator.top}px`,
                      width: `${indicator.width}px`,
                      height: `${indicator.height}px`,
                    }}
                  >
                    <span
                      data-testid="iframe-edit-drop-label"
                      className={`absolute left-1 z-10 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 text-white shadow-sm ${
                        inside ? 'bg-rose-600' : 'bg-teal-700'
                      }`}
                      style={{ top: inside || iframeEditDropTarget.mode === 'before' ? '4px' : '-24px' }}
                    >
                      {dropIndicatorLabel(iframeEditDropTarget.mode)}
                    </span>
                  </div>
                );
              })()
            )}
            </div>
          </div>
        )}
      </div>
      {contextMenuState && mainMode === 'edit' && (
        <ShadowContextMenu
          blockId={contextMenuState.blockId}
          x={contextMenuState.x}
          y={contextMenuState.y}
          onAction={(action) =>
            dispatchContextAction(action, contextMenuState.blockId)
          }
          onClose={() => setContextMenuState(null)}
        />
      )}
    </div>
  );
}


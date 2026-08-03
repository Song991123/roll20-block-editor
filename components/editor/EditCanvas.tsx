'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from 'react';
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Grid3X3,
  GripVertical,
  Layers,
  Maximize2,
  Move,
  Redo2,
  Ruler,
  Rows3,
  Search,
  Undo2,
  Ungroup,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import type { BlockSnapshot } from '@/lib/blockly/adapter';
import { canMoveLayerDrop, getLayerRole, type LayerDropMode } from '@/lib/editor/layerRoles';
import { getLayerPanelAutoScrollDelta } from '@/lib/editor/dropIndicator';
import {
  listRolltemplateRoots,
  listRolltemplateScope,
  listSheetVisualScope,
  resolveActiveRolltemplateId,
} from '@/lib/editor/rolltemplateScope';
import {
  clampEditLayerPanelWidth,
  EDIT_SURFACE_LAYER_PANEL_DEFAULT_WIDTH_PX,
  EDIT_SURFACE_LAYER_PANEL_KEYBOARD_STEP_PX,
  EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX,
  EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX,
  getEditLayerPanelTrack,
} from '@/lib/editor/editSurfaceLayout';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils/cn';
import { flushEmitPipeline } from '@/lib/preview/useEmitPipeline';
import {
  clampCanvasWidth,
  ROLLTEMPLATE_CANVAS_MAX_WIDTH,
  ROLLTEMPLATE_CANVAS_MIN_WIDTH,
  SHEET_CANVAS_MAX_WIDTH,
  SHEET_CANVAS_MIN_WIDTH,
} from '@/lib/preview/canvasDimensions';

function formatDropModeLabel(mode: LayerDropMode): string {
  if (mode === 'inside') return '안에 넣기';
  if (mode === 'before') return '앞에 넣기';
  return '뒤에 넣기';
}

function matchesLayerSearch(node: BlockSnapshot, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    node.id.toLowerCase().includes(q) ||
    node.type.toLowerCase().includes(q) ||
    node.label.toLowerCase().includes(q) ||
    node.preview.toLowerCase().includes(q)
  );
}

function filterLayersWithAncestors(
  nodes: BlockSnapshot[],
  query: string,
): Array<{ node: BlockSnapshot; searchMatch: boolean; contextOnly: boolean }> {
  const q = query.trim().toLowerCase();
  if (!q) return nodes.map((node) => ({ node, searchMatch: true, contextOnly: false }));

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const matched = new Set<string>();
  const visible = new Set<string>();

  for (const node of nodes) {
    if (!matchesLayerSearch(node, q)) continue;
    matched.add(node.id);
    visible.add(node.id);
    let parentId = node.layerParentId;
    const seen = new Set<string>([node.id]);
    while (parentId && !seen.has(parentId)) {
      seen.add(parentId);
      visible.add(parentId);
      parentId = byId.get(parentId)?.layerParentId ?? null;
    }
  }

  return nodes
    .filter((node) => visible.has(node.id))
    .map((node) => ({
      node,
      searchMatch: matched.has(node.id),
      contextOnly: !matched.has(node.id),
    }));
}

function buildLayerPath(nodes: BlockSnapshot[], selectedId: string | null): BlockSnapshot[] {
  if (!selectedId) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const selected = byId.get(selectedId);
  if (!selected) return [];

  const path: BlockSnapshot[] = [];
  const seen = new Set<string>();
  let current: BlockSnapshot | undefined = selected;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.push(current);
    current = current.layerParentId ? byId.get(current.layerParentId) : undefined;
  }
  return path.reverse();
}

const LAYER_MINI_CHILD_SLOTS = 4;
const EDIT_HISTORY_WORKSPACES = [
  'html',
  'css',
  'i18n',
  'js',
  'worker',
] as const satisfies readonly WorkspaceKey[];

export default function EditCanvas() {
  const editSubmode = useUiStore((s) => s.editSubmode);
  const editLayerPanelWidth = useUiStore((s) => s.editLayerPanelWidth);
  const setEditLayerPanelWidth = useUiStore((s) => s.setEditLayerPanelWidth);
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
  const selectedBlockId = useWorkspaceStore((s) => s.selectedBlockId);
  const setSelectedBlockId = useWorkspaceStore((s) => s.setSelectedBlockId);
  const [layerSearch, setLayerSearch] = useState('');
  const layerPanelRef = useRef<HTMLElement | null>(null);
  const editLayerPanelTrack = getEditLayerPanelTrack(editLayerPanelWidth);
  const canvasWidth = editSubmode === 'rolltemplate' ? rolltemplateCanvasWidth : sheetCanvasWidth;
  const setCanvasWidth = editSubmode === 'rolltemplate'
    ? setRolltemplateCanvasWidth
    : setSheetCanvasWidth;
  const minWidth = editSubmode === 'rolltemplate'
    ? ROLLTEMPLATE_CANVAS_MIN_WIDTH
    : SHEET_CANVAS_MIN_WIDTH;
  const maxWidth = editSubmode === 'rolltemplate'
    ? ROLLTEMPLATE_CANVAS_MAX_WIDTH
    : SHEET_CANVAS_MAX_WIDTH;
  const [canvasWidthDraft, setCanvasWidthDraft] = useState(() => String(canvasWidth));
  const canvasWidthInputRef = useRef<HTMLInputElement>(null);
  const canvasWidthDraftDirtyRef = useRef(false);
  useEffect(() => {
    // Keep an untouched field in sync with auto-measured sheet width, while
    // preserving a value the user is actively typing.
    if (!canvasWidthDraftDirtyRef.current || document.activeElement !== canvasWidthInputRef.current) {
      canvasWidthDraftDirtyRef.current = false;
      setCanvasWidthDraft(String(canvasWidth));
    }
  }, [canvasWidth, editSubmode]);
  const commitCanvasWidth = useCallback((rawValue: string) => {
    const next = Number(rawValue);
    if (!Number.isFinite(next)) {
      canvasWidthDraftDirtyRef.current = false;
      setCanvasWidthDraft(String(canvasWidth));
      return;
    }
    const clamped = clampCanvasWidth(editSubmode, next);
    canvasWidthDraftDirtyRef.current = false;
    setCanvasWidth(clamped);
    setCanvasWidthDraft(String(clamped));
  }, [canvasWidth, editSubmode, setCanvasWidth]);
  const structureVersion = useWorkspaceStore((s) => s.workspaces.html.structureVersion);
  const historyVersion = useWorkspaceStore((s) => EDIT_HISTORY_WORKSPACES
    .map((key) => s.workspaces[key].structureVersion)
    .join(':'));
  const adapter = getBlocklyAdapter();
  const htmlNodes = useMemo(() => {
    void structureVersion;
    return adapter.listAllBlocks('html');
  }, [adapter, structureVersion]);
  const rolltemplateRoots = useMemo(() => listRolltemplateRoots(htmlNodes), [htmlNodes]);
  const activeRolltemplateId = useMemo(
    () => resolveActiveRolltemplateId(htmlNodes, selectedBlockId),
    [htmlNodes, selectedBlockId],
  );

  useEffect(() => {
    if (editSubmode !== 'rolltemplate' || !activeRolltemplateId) return;
    const selectedInsideActive = selectedBlockId
      && listRolltemplateScope(htmlNodes, activeRolltemplateId)
        .some((node) => node.id === selectedBlockId);
    if (!selectedInsideActive) setSelectedBlockId(activeRolltemplateId, 'tree');
  }, [activeRolltemplateId, editSubmode, htmlNodes, selectedBlockId, setSelectedBlockId]);
  const canUndo = useMemo(() => {
    void historyVersion;
    return adapter.canUndoLatest(EDIT_HISTORY_WORKSPACES);
  }, [adapter, historyVersion]);
  const canRedo = useMemo(() => {
    void historyVersion;
    return adapter.canRedoLatest(EDIT_HISTORY_WORKSPACES);
  }, [adapter, historyVersion]);
  const runHistoryAction = useCallback((action: 'undo' | 'redo') => {
    const changedKeys = action === 'undo'
      ? adapter.undoLatest(EDIT_HISTORY_WORKSPACES)
      : adapter.redoLatest(EDIT_HISTORY_WORKSPACES);
    if (changedKeys.length === 0) return;
    const store = useWorkspaceStore.getState();
    for (const key of changedKeys) {
      store.bumpStructure(key, adapter.countBlocks(key));
    }
    // History actions are commit points, just like a completed pointer drop.
    // Publish the same render surface immediately instead of waiting for the
    // debounce window or a later unrelated edit.
    queueMicrotask(() => flushEmitPipeline());
    const selectedId = useWorkspaceStore.getState().selectedBlockId;
    if (selectedId && !adapter.getBlock('html', selectedId)) {
      store.setSelectedBlockId(null, 'tree');
    }
  }, [adapter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
      if (event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        runHistoryAction('redo');
      } else if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        runHistoryAction('undo');
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        runHistoryAction('redo');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [runHistoryAction]);

  return (
    <div
      className="relative flex flex-1 min-h-0 flex-col bg-[var(--bg-canvas)]"
      data-testid="edit-canvas-root"
      data-edit-submode={editSubmode}
      data-edit-render-owner={editSubmode === 'rolltemplate' ? 'chat-renderer' : 'persistent-iframe'}
      data-r20-layer-panel-width={editLayerPanelWidth}
    >
      <div
        className="r20-strip flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--border-subtle)] px-3 text-xs whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="edit-surface-toolbar"
      >
        <span className="shrink-0 font-semibold text-foreground">
          {editSubmode === 'rolltemplate' ? '주사위 결과 카드 편집' : '시트 편집'}
        </span>
        {editSubmode === 'rolltemplate' && rolltemplateRoots.length > 0 && (
          <label className="flex min-w-0 shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span>결과 카드</span>
            <select
              value={activeRolltemplateId ?? ''}
              onChange={(event) => setSelectedBlockId(event.target.value, 'tree')}
              className="h-7 max-w-48 rounded-full border border-border bg-[var(--bg-elevated-2)] px-2.5 text-xs font-semibold text-foreground outline-none focus:border-[var(--primary)]"
              data-testid="rolltemplate-picker"
              aria-label="편집할 결과 카드"
            >
              {rolltemplateRoots.map((root, index) => {
                const name = adapter.getBlockField('html', root.id, 'NAME')?.trim() || `결과 카드 ${index + 1}`;
                return <option key={root.id} value={root.id}>{name}</option>;
              })}
            </select>
          </label>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1" role="group" aria-label="편집 기록">
          <button
            type="button"
            onClick={() => runHistoryAction('undo')}
            disabled={!canUndo}
            className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            title="되돌리기 (Ctrl/Cmd+Z)"
            aria-label="되돌리기"
            data-testid="edit-history-undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => runHistoryAction('redo')}
            disabled={!canRedo}
            className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            title="다시 실행 (Ctrl/Cmd+Shift+Z)"
            aria-label="다시 실행"
            data-testid="edit-history-redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        {editSubmode === 'sheet' && (
          <>
            <button
              type="button"
              onClick={toggleSnap}
              className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors active:scale-95',
                snapEnabled
                  ? 'border-[var(--primary-strong)] bg-[var(--primary-strong)] text-white'
                  : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)]',
              )}
              title={`격자 맞춤 ${snapEnabled ? '끄기' : '켜기'} — 움직일 때 8px 단위로 맞춰요`}
              aria-label={`격자 맞춤 ${snapEnabled ? '끄기' : '켜기'}`}
              aria-pressed={snapEnabled}
              data-testid="edit-canvas-snap-toggle"
            >
              <Grid3X3 className="h-4 w-4" aria-hidden="true" />
            </button>
            <div
              className="flex h-7 shrink-0 items-center overflow-hidden rounded-full border border-border bg-[var(--bg-elevated-2)]"
              role="group"
              aria-label="요소 배치 방식"
              data-testid="edit-placement-mode"
            >
              <button
                type="button"
                onClick={() => setEditPlacementMode('flow')}
                className={cn(
                  'grid h-7 w-7 place-items-center transition-colors',
                  editPlacementMode === 'flow'
                    ? 'bg-[var(--primary-strong)] text-white'
                    : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                )}
                title="흐름에 맞춰 놓기 — 주변 요소와 순서대로 배치해요"
                aria-label="흐름에 맞춰 놓기"
                aria-pressed={editPlacementMode === 'flow'}
                data-testid="edit-placement-flow"
              >
                <Rows3 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setEditPlacementMode('free')}
                className={cn(
                  'grid h-7 w-7 place-items-center transition-colors',
                  editPlacementMode === 'free'
                    ? 'bg-[var(--primary-strong)] text-white'
                    : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                )}
                title="자유롭게 놓기 — 원하는 자리에 그대로 배치해요"
                aria-label="자유롭게 놓기"
                aria-pressed={editPlacementMode === 'free'}
                data-testid="edit-placement-free"
              >
                <Move className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
        <label
          className="flex h-7 shrink-0 items-center gap-1 text-xs text-muted-foreground"
          title={editSubmode === 'rolltemplate' ? '결과 카드 너비' : '시트 너비'}
        >
          <Ruler className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{editSubmode === 'rolltemplate' ? '카드 너비' : '시트 너비'}</span>
          <input
            ref={canvasWidthInputRef}
            type="number"
            min={minWidth}
            max={maxWidth}
            step={10}
            value={canvasWidthDraft}
            onChange={(event) => {
              canvasWidthDraftDirtyRef.current = true;
              setCanvasWidthDraft(event.currentTarget.value);
            }}
            onBlur={(event) => commitCanvasWidth(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                canvasWidthDraftDirtyRef.current = false;
                setCanvasWidthDraft(String(canvasWidth));
                event.currentTarget.blur();
              }
            }}
            className="h-7 w-[72px] rounded-full border border-border bg-[var(--bg-elevated-2)] px-2 text-right text-xs text-foreground outline-none tabular-nums focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            aria-label={editSubmode === 'rolltemplate' ? '주사위 결과 카드 폭' : '시트 캔버스 폭'}
            data-testid="edit-canvas-width-input"
          />
          px
        </label>
        <div
          className="flex h-7 shrink-0 items-center overflow-hidden rounded-full border border-border bg-[var(--bg-elevated-2)]"
          role="group"
          aria-label="시트 확대"
          data-testid="edit-zoom-control"
        >
          <button
            type="button"
            onClick={() => setPreviewZoom('fit')}
            className={cn(
              'grid h-7 w-7 place-items-center transition-colors',
              zoom === 'fit'
                ? 'bg-[var(--primary-strong)] text-white'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            title="시트 전체가 한눈에 들어오게 맞춰요."
            aria-label="화면에 맞추기"
            aria-pressed={zoom === 'fit'}
            data-testid="edit-zoom-fit"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPreviewZoom(1)}
            className={cn(
              'h-7 min-w-12 px-2 text-xs font-semibold transition-colors',
              zoom === 1
                ? 'bg-[var(--primary-strong)] text-white'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            title="실제 Roll20 크기 그대로 봐요."
            aria-label="실제 크기 100%"
            aria-pressed={zoom === 1}
            data-testid="edit-zoom-100"
          >
            100%
          </button>
        </div>
      </div>
      <div
        className="relative grid flex-1 min-h-0"
        style={{ gridTemplateColumns: `${editLayerPanelTrack} minmax(0, 1fr)` }}
      >
        <EditLayerPanel
          search={layerSearch}
          onSearchChange={setLayerSearch}
          panelRef={layerPanelRef}
        />
        <EditLayerPanelResizeHandle
          width={editLayerPanelWidth}
          track={editLayerPanelTrack}
          panelRef={layerPanelRef}
          onResize={setEditLayerPanelWidth}
        />
        <div
          className="min-h-0 bg-[var(--bg-canvas)]"
          data-testid="edit-canvas-iframe-slot"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function EditLayerPanelResizeHandle({
  width,
  track,
  panelRef,
  onResize,
}: {
  width: number;
  track: string;
  panelRef: RefObject<HTMLElement | null>;
  onResize: (width: number) => void;
}) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    availableWidth: number;
  } | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingWidthRef = useRef<number | null>(null);

  const clearDraggingStyles = useCallback(() => {
    if (document.body.dataset.r20LayerPanelResizing !== '1') return;
    delete document.body.dataset.r20LayerPanelResizing;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const flushPendingWidth = useCallback(() => {
    frameRef.current = null;
    const nextWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;
    if (nextWidth !== null) onResize(nextWidth);
  }, [onResize]);

  const scheduleWidth = useCallback((nextWidth: number) => {
    pendingWidthRef.current = nextWidth;
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(flushPendingWidth);
    }
  }, [flushPendingWidth]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    clearDraggingStyles();
  }, [clearDraggingStyles]);

  const finishResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const pendingWidth = pendingWidthRef.current;
    pendingWidthRef.current = null;
    if (pendingWidth !== null) onResize(pendingWidth);
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    clearDraggingStyles();
  }, [clearDraggingStyles, onResize]);

  const resizeFromHandle = useCallback((handle: HTMLDivElement, nextWidth: number) => {
    const availableWidth = handle.parentElement?.getBoundingClientRect().width;
    onResize(clampEditLayerPanelWidth(nextWidth, availableWidth));
  }, [onResize]);

  return (
    <div
      role="separator"
      aria-label="레이어 패널 너비 조절"
      aria-orientation="vertical"
      aria-valuemin={EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX}
      aria-valuemax={EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX}
      aria-valuenow={width}
      aria-valuetext={`${width}px`}
      tabIndex={0}
      title="레이어 패널 너비 조절 · 두 번 눌러 기본 너비로"
      data-testid="edit-layer-panel-resizer"
      className="group absolute inset-y-0 z-30 flex w-3 -translate-x-1/2 touch-none cursor-col-resize items-center justify-center outline-none"
      style={{ left: track }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const availableWidth = event.currentTarget.parentElement?.getBoundingClientRect().width
          ?? EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX;
        const startWidth = panelRef.current?.getBoundingClientRect().width ?? width;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startWidth,
          availableWidth,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        document.body.dataset.r20LayerPanelResizing = '1';
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        scheduleWidth(clampEditLayerPanelWidth(
          drag.startWidth + event.clientX - drag.startX,
          drag.availableWidth,
        ));
      }}
      onPointerUp={finishResize}
      onPointerCancel={finishResize}
      onLostPointerCapture={finishResize}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        resizeFromHandle(event.currentTarget, EDIT_SURFACE_LAYER_PANEL_DEFAULT_WIDTH_PX);
      }}
      onKeyDown={(event) => {
        const currentWidth = panelRef.current?.getBoundingClientRect().width ?? width;
        const step = EDIT_SURFACE_LAYER_PANEL_KEYBOARD_STEP_PX * (event.shiftKey ? 3 : 1);
        let nextWidth: number | null = null;
        if (event.key === 'ArrowLeft') nextWidth = currentWidth - step;
        else if (event.key === 'ArrowRight') nextWidth = currentWidth + step;
        else if (event.key === 'Home') nextWidth = EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX;
        else if (event.key === 'End') nextWidth = EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX;
        if (nextWidth === null) return;
        event.preventDefault();
        event.stopPropagation();
        resizeFromHandle(event.currentTarget, nextWidth);
      }}
    >
      <GripVertical
        className="h-5 w-3 rounded-sm border border-transparent bg-[var(--bg-elevated)] text-muted-foreground shadow-sm transition-colors group-hover:border-[var(--primary-soft-border)] group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary-active)] group-focus-visible:border-[var(--primary)] group-focus-visible:bg-[var(--primary-soft)] group-focus-visible:text-[var(--primary-active)]"
        aria-hidden="true"
      />
    </div>
  );
}


function EditLayerPanel({
  search,
  onSearchChange,
  panelRef,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  panelRef: RefObject<HTMLElement | null>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const autoScrollDeltaRef = useRef(0);
  // The Figma-style layer tree represents rendered HTML objects. CSS and
  // translation remain editable in their dedicated code/block workspaces;
  // mixing them into this tree made drop targets look like visual layers when
  // they could never appear on the sheet canvas.
  const tab: WorkspaceKey = 'html';
  const editSubmode = useUiStore((s) => s.editSubmode);
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const selectedIds = useWorkspaceStore((s) => s.selectedBlockIds);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const toggleSelected = useWorkspaceStore((s) => s.toggleSelectedBlockId);
  const bumpStructure = useWorkspaceStore((s) => s.bumpStructure);
  const structureVersion = useWorkspaceStore((s) => s.workspaces[tab].structureVersion);
  const [collapsedLayerIds, setCollapsedLayerIds] = useState<Set<string>>(() => new Set());

  const stopAutoScroll = useCallback(() => {
    autoScrollDeltaRef.current = 0;
    if (autoScrollFrameRef.current !== null) cancelAnimationFrame(autoScrollFrameRef.current);
    autoScrollFrameRef.current = null;
  }, []);

  const runAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null || autoScrollDeltaRef.current === 0) return;
    const tick = () => {
      const scroll = scrollRef.current;
      const delta = autoScrollDeltaRef.current;
      if (!scroll || delta === 0) {
        autoScrollFrameRef.current = null;
        return;
      }
      const previous = scroll.scrollTop;
      scroll.scrollTop += delta;
      if (scroll.scrollTop === previous) {
        autoScrollFrameRef.current = null;
        return;
      }
      autoScrollFrameRef.current = requestAnimationFrame(tick);
    };
    autoScrollFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const updateAutoScroll = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('application/x-r20-layer-block')) {
      stopAutoScroll();
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    autoScrollDeltaRef.current = getLayerPanelAutoScrollDelta(event.clientY, bounds);
    if (autoScrollDeltaRef.current === 0) stopAutoScroll();
    else runAutoScroll();
  }, [runAutoScroll, stopAutoScroll]);

  const finishLayerDrag = useCallback(() => {
    stopAutoScroll();
    delete document.body.dataset.r20LayerDraggingBlock;
  }, [stopAutoScroll]);

  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const allNodes = useMemo(() => {
    void structureVersion;
    return getBlocklyAdapter().listAllBlocks(tab);
  }, [tab, structureVersion]);
  const nodes = useMemo(() => {
    if (editSubmode === 'rolltemplate') {
      const rootId = resolveActiveRolltemplateId(allNodes, selectedId);
      return listRolltemplateScope(allNodes, rootId);
    }
    return listSheetVisualScope(allNodes)
      .filter((node) => getLayerRole(node.type).kind !== 'runtime');
  }, [allNodes, editSubmode, selectedId]);

  const filtered = useMemo(() => filterLayersWithAncestors(nodes, search), [nodes, search]);
  const selectedPath = useMemo(() => buildLayerPath(nodes, selectedId), [nodes, selectedId]);
  const visibleNodes = useMemo(() => {
    if (search.trim()) return filtered;
    const nodeById = new Map(nodes.map((item) => [item.id, item]));
    return filtered.filter(({ node }) => {
      let parentId = node.layerParentId;
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId)) {
        if (collapsedLayerIds.has(parentId)) return false;
        seen.add(parentId);
        parentId = nodeById.get(parentId)?.layerParentId ?? null;
      }
      return true;
    });
  }, [collapsedLayerIds, filtered, nodes, search]);

  useEffect(() => {
    const validIds = new Set(nodes.filter((node) => node.childCount > 0).map((node) => node.id));
    setCollapsedLayerIds((current) => {
      const next = new Set(Array.from(current).filter((id) => validIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [nodes]);

  useEffect(() => {
    if (!selectedId) return;
    const parentIds = selectedPath.slice(0, -1).map((node) => node.id);
    if (parentIds.length === 0) return;
    setCollapsedLayerIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const parentId of parentIds) {
        if (next.delete(parentId)) changed = true;
      }
      return changed ? next : current;
    });
  }, [selectedId, selectedPath]);

  const virtualizer = useVirtualizer({
    count: visibleNodes.length,
    getScrollElement: () => scrollRef.current,
    // design-reset: 글자 확대(14px 바닥)에 맞춘 행 높이. 행 내용은 라벨 1줄 +
    // 미리보기 1줄(truncate)로 고정되므로 52px 안에 항상 들어온다.
    estimateSize: () => 52,
    overscan: 10,
  });

  useEffect(() => {
    if (!selectedId) return;
    const index = visibleNodes.findIndex((item) => item.node.id === selectedId);
    if (index < 0) return;
    virtualizer.scrollToIndex(index, { align: 'center' });
  }, [selectedId, visibleNodes, virtualizer]);

  const toggleLayer = useCallback((blockId: string) => {
    setCollapsedLayerIds((current) => {
      const next = new Set(current);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  const canMoveLayer = useCallback(
    (draggedId: string, targetId: string, mode: LayerDropMode) => {
      const adapter = getBlocklyAdapter();
      return canMoveLayerDrop(
        nodes,
        draggedId,
        targetId,
        mode,
        (movingId, containerId) => adapter.canNestBlockInContainer(tab, movingId, containerId),
      );
    },
    [nodes, tab],
  );

  const moveLayer = useCallback(
    (draggedId: string, targetId: string, mode: LayerDropMode) => {
      if (!canMoveLayer(draggedId, targetId, mode)) return;
      const adapter = getBlocklyAdapter();
      const moved =
        mode === 'inside'
          ? adapter.nestBlockInContainer(tab, draggedId, targetId)
          : mode === 'after'
            ? adapter.moveBlockAfter(tab, draggedId, targetId)
            : adapter.moveBlockBefore(tab, draggedId, targetId);
      if (!moved) return;
      bumpStructure(tab, adapter.countBlocks(tab));
      flushEmitPipeline();
      setSelected(draggedId, 'tree');
    },
    [bumpStructure, canMoveLayer, setSelected, tab],
  );

  const ejectLayer = useCallback(
    (blockId: string) => {
      const adapter = getBlocklyAdapter();
      if (!adapter.moveBlockOutOfContainer(tab, blockId)) return;
      bumpStructure(tab, adapter.countBlocks(tab));
      flushEmitPipeline();
      setSelected(blockId, 'tree');
    },
    [bumpStructure, setSelected, tab],
  );

  const selectLayer = useCallback((blockId: string, additive: boolean) => {
    if (additive) toggleSelected(blockId, 'tree');
    else setSelected(blockId, 'tree');
  }, [setSelected, toggleSelected]);

  const groupSelection = useCallback(() => {
    if (selectedIds.length < 2) return;
    const adapter = getBlocklyAdapter();
    const groupId = adapter.groupBlocksInContainer(tab, selectedIds);
    if (!groupId) {
      toast('같은 틀 안에서 이어진 레이어만 묶을 수 있어요.', { duration: 2400 });
      return;
    }
    bumpStructure(tab, adapter.countBlocks(tab));
    flushEmitPipeline();
    setSelected(groupId, 'tree');
    toast.success('레이어를 하나의 틀로 묶었어요.', { duration: 1600 });
  }, [bumpStructure, selectedIds, setSelected, tab]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'g') return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
      if (selectedIds.length < 2) return;
      event.preventDefault();
      groupSelection();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [groupSelection, selectedIds.length]);

  return (
    <aside
      ref={panelRef}
      className="flex min-h-0 flex-col border-r border-border bg-[var(--bg-elevated)]"
      data-testid="edit-layer-panel"
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3 text-sm font-semibold text-foreground">
        <Layers className="h-[17px] w-[17px] text-[var(--primary)]" />
        <span>{editSubmode === 'rolltemplate' ? '결과 카드 레이어' : '레이어'}</span>
        {selectedIds.length > 1 && (
          <button
            type="button"
            onClick={groupSelection}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-active)] transition-colors hover:bg-[var(--primary-soft-strong)] active:scale-95"
            title="고른 레이어를 하나의 HTML 틀로 묶어요"
            aria-label={`고른 레이어 ${selectedIds.length}개 묶기`}
            data-testid="edit-layer-group-selection"
          >
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            묶기 {selectedIds.length}
          </button>
        )}
        <span className="ml-auto rounded-full border border-border bg-[var(--bg-elevated-2)] px-2 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">
          {search.trim() ? `${visibleNodes.filter((item) => item.searchMatch).length}+맥락 ${visibleNodes.length}/${nodes.length}` : `${visibleNodes.length}/${nodes.length}`}
        </span>
        <span
          className="r20-help-dot"
          role="img"
          aria-label="레이어 색 띠 설명"
            title={'왼쪽 세로 색 띠의 뜻\n· 분홍: 다른 요소를 담을 수 있는 틀\n· 초록: 틀 안에 들어있는 요소\n· 회색: 낱개 요소\n행을 끌어 순서를 바꾸거나 틀 안에 넣을 수 있어요.'}
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div
        className="flex items-center justify-between gap-1.5 border-b border-border px-3 py-1.5"
        data-testid="edit-layer-workspace"
      >
        <span className="text-xs font-semibold text-muted-foreground">
          {editSubmode === 'rolltemplate' ? '결과 카드 짜임새' : '시트 짜임새'}
        </span>
        <span className="rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-0.5 text-xs text-[var(--primary-active)]">
          화면에 보이는 것
        </span>
      </div>
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="레이어 찾기"
            aria-label="레이어 검색"
            className="h-9 w-full rounded-lg border-[1.5px] border-border bg-[var(--bg-elevated)] pl-8 pr-2 text-sm outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]"
            data-testid="edit-layer-search"
          />
        </div>
      </div>
      {selectedPath.length > 0 && (
        <div
          className="border-b border-border px-2 py-2"
          data-testid="edit-layer-selection-path"
          data-r20-layer-path-depth={selectedPath.length}
        >
          <div className="text-xs font-semibold text-muted-foreground">지금 고른 자리</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {selectedPath.map((node, index) => {
              const role = getLayerRole(node.type);
              const isCurrent = index === selectedPath.length - 1;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelected(node.id, 'tree')}
                  data-testid="edit-layer-path-item"
                  data-r20-block-id={node.id}
                  data-r20-layer-role-kind={role.kind}
                  data-r20-layer-path-current={isCurrent ? '1' : '0'}
                  className={cn(
                    'max-w-full truncate rounded-full border px-2 py-0.5 text-xs transition-colors',
                    isCurrent
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] font-semibold text-[var(--primary-active)]'
                      : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                  )}
                  title={`${node.label}${node.preview ? ` - ${node.preview}` : ''}`}
                >
                  {node.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        data-testid="edit-layer-scroll"
        onDragOverCapture={updateAutoScroll}
        onDragLeave={(event) => {
          const relatedTarget = event.relatedTarget;
          if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
          stopAutoScroll();
        }}
        onDropCapture={finishLayerDrag}
        onDragEndCapture={finishLayerDrag}
      >
        {visibleNodes.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm leading-relaxed text-muted-foreground">
            {editSubmode === 'rolltemplate' ? '결과 카드에 아직 내용이 없어요.' : '아직 보여줄 레이어가 없어요.'}
            <br />
            {editSubmode === 'rolltemplate' ? '왼쪽 조각을 추가해 주세요.' : '시트에 요소를 올리면 여기에 차곡차곡 쌓여요.'}
          </div>
        ) : (
          <div
            className="relative p-1"
            style={{ height: `${virtualizer.getTotalSize() + 8}px` }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const item = visibleNodes[row.index];
              if (!item) return null;
              const { node } = item;
              return (
                <div
                  key={node.id}
                  className="absolute left-1 right-1 top-0"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <EditLayerRow
                    node={node}
                    workspace={tab}
                    selected={selectedIds.includes(node.id)}
                    searchMatch={item.searchMatch}
                    contextOnly={item.contextOnly}
                    onSelect={(additive) => selectLayer(node.id, additive)}
                    onMove={moveLayer}
                    canDrop={canMoveLayer}
                    onEject={ejectLayer}
                    collapsed={collapsedLayerIds.has(node.id)}
                    onToggleCollapse={toggleLayer}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

const EditLayerRow = memo(function EditLayerRow({
  node,
  workspace,
  selected,
  searchMatch,
  contextOnly,
  onSelect,
  onMove,
  canDrop,
  onEject,
  collapsed,
  onToggleCollapse,
}: {
  node: BlockSnapshot;
  workspace: WorkspaceKey;
  selected: boolean;
  searchMatch: boolean;
  contextOnly: boolean;
  onSelect: (additive: boolean) => void;
  onMove: (draggedId: string, targetId: string, mode: LayerDropMode) => void;
  canDrop: (draggedId: string, targetId: string, mode: LayerDropMode) => boolean;
  onEject: (blockId: string) => void;
  collapsed: boolean;
  onToggleCollapse: (blockId: string) => void;
}) {
  const [dropMode, setDropMode] = useState<LayerDropMode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const role = useMemo(() => {
    const base = getLayerRole(node.type);
    return {
      ...base,
      canReceiveChildren:
        base.canReceiveChildren && getBlocklyAdapter().canNestInContainer(workspace, node.id),
    };
  }, [node.id, node.type, workspace]);
  const pickMode = useCallback(
    (e: ReactDragEvent<HTMLElement>): LayerDropMode => {
      const rect = e.currentTarget.getBoundingClientRect();
      const y = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
      if (y < 0.28) return 'before';
      if (y > 0.72) return 'after';
      return role.canReceiveChildren ? 'inside' : y < 0.5 ? 'before' : 'after';
    },
    [role.canReceiveChildren],
  );
  const cancelAutoExpand = useCallback(() => {
    if (autoExpandTimerRef.current !== null) clearTimeout(autoExpandTimerRef.current);
    autoExpandTimerRef.current = null;
  }, []);
  const queueAutoExpand = useCallback(() => {
    if (!collapsed || node.childCount === 0 || autoExpandTimerRef.current !== null) return;
    autoExpandTimerRef.current = setTimeout(() => {
      autoExpandTimerRef.current = null;
      onToggleCollapse(node.id);
    }, 450);
  }, [collapsed, node.childCount, node.id, onToggleCollapse]);
  useEffect(() => cancelAutoExpand, [cancelAutoExpand]);
  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      data-testid="edit-layer-row"
      data-r20-block-id={node.id}
      data-r20-layer-role-kind={role.kind}
      data-r20-can-drop={role.canReceiveChildren ? '1' : '0'}
      data-r20-default-drop-mode={role.defaultDropMode}
      data-r20-layer-drop-mode={dropMode ?? ''}
      data-r20-layer-parent-id={node.layerParentId ?? ''}
      data-r20-layer-previous-id={node.layerPreviousId ?? ''}
      data-r20-layer-relation={node.layerRelation}
      data-r20-layer-child-count={node.childCount}
      data-r20-layer-search-match={searchMatch ? '1' : '0'}
      data-r20-layer-context-only={contextOnly ? '1' : '0'}
      data-r20-layer-selected={selected ? '1' : '0'}
      data-r20-layer-dragging={isDragging ? '1' : '0'}
      aria-grabbed={isDragging}
      aria-pressed={selected}
      aria-label={`${node.label} ${role.label}${role.canReceiveChildren ? ' 컨테이너' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(false);
        }
      }}
      onClick={(e) => onSelect(e.metaKey || e.ctrlKey)}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-r20-layer-block', node.id);
        e.dataTransfer.effectAllowed = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        e.dataTransfer.setDragImage(e.currentTarget, Math.min(28, rect.width / 2), rect.height / 2);
        setIsDragging(true);
        document.body.dataset.r20LayerDraggingBlock = node.id;
      }}
      onDragLeave={(e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget instanceof Node && e.currentTarget.contains(relatedTarget)) return;
        cancelAutoExpand();
        setDropMode(null);
      }}
      onDragEnd={() => {
        cancelAutoExpand();
        setDropMode(null);
        setIsDragging(false);
        delete document.body.dataset.r20LayerDraggingBlock;
      }}
      onDragOver={(e) => {
        e.currentTarget.setAttribute('data-r20-layer-drop-mode', '');
        setDropMode(null);
        if (!e.dataTransfer.types.includes('application/x-r20-layer-block')) return;
        const draggedId =
          document.body.dataset.r20LayerDraggingBlock ||
          e.dataTransfer.getData('application/x-r20-layer-block');
        if (draggedId === node.id) {
          e.dataTransfer.dropEffect = 'none';
          return;
        }
        const mode = pickMode(e);
        if (!canDrop(draggedId, node.id, mode)) {
          e.dataTransfer.dropEffect = 'none';
          return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (mode === 'inside') queueAutoExpand();
        else cancelAutoExpand();
        setDropMode(mode);
      }}
      onDrop={(e) => {
        cancelAutoExpand();
        const draggedId =
          document.body.dataset.r20LayerDraggingBlock ||
          e.dataTransfer.getData('application/x-r20-layer-block');
        if (!draggedId) return;
        const mode = pickMode(e);
        const accepted = canDrop(draggedId, node.id, mode);
        if (!accepted) {
          e.stopPropagation();
          setDropMode(null);
          setIsDragging(false);
          delete document.body.dataset.r20LayerDraggingBlock;
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setDropMode(null);
        setIsDragging(false);
        delete document.body.dataset.r20LayerDraggingBlock;
        onMove(draggedId, node.id, mode);
      }}
      className={`relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
        selected
          ? 'bg-[var(--primary-soft)] text-foreground ring-[1.5px] ring-[var(--primary)]'
          : contextOnly
            ? 'text-muted-foreground/70 hover:bg-[var(--bg-hover)] hover:text-muted-foreground'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-foreground'
      } ${
        dropMode === 'inside'
          ? 'ring-[1.5px] ring-rose-500'
          : dropMode === 'before'
            ? 'shadow-[inset_0_3px_0_var(--info)]'
            : dropMode === 'after'
              ? 'shadow-[inset_0_-3px_0_var(--info)]'
              : ''
      } ${isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`}
      style={{ paddingLeft: `${8 + node.depth * 12}px` }}
    >
      {node.depth > 0 && (
        <span
          aria-hidden
          data-testid="edit-layer-depth-guide"
          className="pointer-events-none absolute bottom-1 top-1 border-l border-border/70"
          style={{ left: `${8 + (node.depth - 1) * 12}px` }}
        />
      )}
      <span
        aria-hidden
        data-testid="edit-layer-role-rail"
        className={cn(
          'pointer-events-none absolute bottom-1 left-0 top-1 w-1 rounded-r',
          role.canReceiveChildren ? 'bg-rose-400' : 'bg-zinc-400',
          node.layerRelation === 'child' && 'bg-emerald-500',
          selected && 'bg-[var(--primary)]',
        )}
      />
      {dropMode && (
        <span
          aria-hidden="true"
          data-testid="edit-layer-drop-marker"
          className={cn(
            'pointer-events-none absolute z-[2] rounded-full',
            dropMode === 'inside'
              ? 'inset-0 rounded-lg border-2 border-rose-500 bg-rose-400/10'
              : dropMode === 'before'
                ? 'left-0 right-0 top-0 h-1 bg-teal-600 shadow-[0_0_0_2px_rgba(20,184,166,0.18)]'
                : 'bottom-0 left-0 right-0 h-1 bg-teal-600 shadow-[0_0_0_2px_rgba(20,184,166,0.18)]',
          )}
        >
          <span
            className={cn(
              'absolute left-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 text-white shadow-sm',
              dropMode === 'inside' ? 'top-1 bg-rose-600' : dropMode === 'before' ? 'top-1 bg-teal-700' : '-top-6 bg-teal-700',
            )}
          >
            {formatDropModeLabel(dropMode)}
          </span>
        </span>
      )}
      <span
        aria-hidden
        title={role.canReceiveChildren ? `${role.label} — 다른 요소를 담을 수 있어요` : role.label}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[10px] font-bold ${role.className}`}
      >
        {role.icon}
      </span>
      {node.childCount > 0 ? (
        <button
          type="button"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground"
          aria-label={collapsed ? '안에 든 것 펼치기' : '안에 든 것 접기'}
          title={collapsed ? '안에 든 것 펼치기' : '안에 든 것 접기'}
          data-testid="edit-layer-collapse-toggle"
          data-r20-block-id={node.id}
          data-r20-layer-collapsed={collapsed ? '1' : '0'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleCollapse(node.id);
          }}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      ) : (
        <span aria-hidden className="h-6 w-6 shrink-0" />
      )}
      <LayerMiniMap
        roleKind={role.kind}
        canReceiveChildren={role.canReceiveChildren}
        childCount={node.childCount}
        relation={node.layerRelation}
        selected={selected}
        defaultDropMode={role.defaultDropMode}
      />
      <span className="min-w-0 flex-1" title={node.preview ? `${node.label} — ${node.preview}` : node.label}>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={cn('truncate text-sm leading-tight', selected ? 'font-semibold text-foreground' : 'font-medium')}>
            {node.label}
          </span>
          {node.childCount > 0 && (
            <span
              data-testid="edit-layer-child-count"
              title={`안에 ${node.childCount}개가 들어있어요`}
              className="shrink-0 rounded-full border border-emerald-600/40 bg-emerald-50 px-1.5 py-px text-xs font-medium tabular-nums text-emerald-700"
            >
              {node.childCount}
            </span>
          )}
          {role.canReceiveChildren && (
            <span
              title="이 안에 다른 요소를 끌어다 담을 수 있어요"
              className="shrink-0 rounded-full border border-rose-400/50 bg-rose-50 px-1.5 py-px text-xs font-medium text-rose-700"
            >
              담는 틀
            </span>
          )}
          {contextOnly && (
            <span
              data-testid="edit-layer-context-badge"
              title="검색어와 직접 맞지는 않지만, 맞는 요소를 담고 있어요"
              className="shrink-0 rounded-full border border-border bg-[var(--bg-elevated-2)] px-1.5 py-px text-xs text-muted-foreground"
            >
              상위
            </span>
          )}
        </span>
        {node.preview && (
          <span className="block truncate text-xs leading-tight opacity-75">{node.preview}</span>
        )}
      </span>
      {node.layerParentId && (
        <button
          type="button"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground active:scale-95"
          title="틀 밖으로 한 단계 꺼내요"
          aria-label="한 단계 바깥으로 꺼내기"
          data-testid="edit-layer-eject"
          data-r20-block-id={node.id}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEject(node.id);
          }}
        >
          <Ungroup className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});

function LayerMiniMap({
  roleKind,
  canReceiveChildren,
  childCount,
  relation,
  selected,
  defaultDropMode,
}: {
  roleKind: ReturnType<typeof getLayerRole>['kind'];
  canReceiveChildren: boolean;
  childCount: number;
  relation: BlockSnapshot['layerRelation'];
  selected: boolean;
  defaultDropMode: ReturnType<typeof getLayerRole>['defaultDropMode'];
}) {
  const visibleSlots = Math.min(LAYER_MINI_CHILD_SLOTS, Math.max(0, childCount));
  // Role color communicates structure; the mini-map container shape must
  // communicate the actionable drop contract, not merely the broad role.
  const isContainer = canReceiveChildren;
  return (
    <span
      aria-hidden
      data-testid="edit-layer-mini-map"
      data-r20-layer-mini-role={roleKind}
      data-r20-layer-mini-can-drop={canReceiveChildren ? '1' : '0'}
      data-r20-layer-mini-container={isContainer ? '1' : '0'}
      data-r20-layer-mini-child-count={childCount}
      data-r20-layer-mini-relation={relation}
      data-r20-layer-mini-drop-mode={defaultDropMode}
      className={cn(
        'grid h-5 w-9 shrink-0 items-center rounded border px-1',
        selected
          ? 'border-orange-400/80 bg-orange-400/15'
          : canReceiveChildren
          ? 'border-rose-400/60 bg-rose-400/10'
            : 'border-border/70 bg-[var(--bg-elevated-2)]',
      )}
    >
      <span
        className={cn(
          'relative block h-3 rounded-[3px] border',
          isContainer
            ? 'border-rose-300/70 bg-rose-400/10'
            : 'border-zinc-500/50 bg-zinc-500/15',
          roleKind === 'table' && 'border-amber-300/80 bg-amber-400/10',
          roleKind === 'flow' && 'border-teal-300/80 bg-teal-400/10',
        )}
      >
        <span
          className={cn(
            'absolute bottom-[2px] top-[2px] w-[2px] rounded-full',
            relation === 'child' ? 'left-[2px] bg-emerald-300/90' : 'left-1/2 bg-zinc-400/70',
          )}
        />
        {Array.from({ length: visibleSlots }).map((_, idx) => (
          <span
            key={idx}
            className={cn(
              'absolute bottom-[2px] top-[2px] rounded-[1px]',
              canReceiveChildren ? 'bg-rose-200/85' : 'bg-zinc-300/55',
            )}
            style={{
              left: `${9 + idx * 5}px`,
              width: childCount > LAYER_MINI_CHILD_SLOTS && idx === LAYER_MINI_CHILD_SLOTS - 1 ? '5px' : '3px',
            }}
          />
        ))}
        {childCount > LAYER_MINI_CHILD_SLOTS && (
          <span className="absolute right-[2px] top-[1px] h-[2px] w-[2px] rounded-full bg-rose-100/90" />
        )}
      </span>
    </span>
  );
}

'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import type { BlockSnapshot } from '@/lib/blockly/adapter';
import { buildSheetParts } from '@/lib/preview/buildDoc';
import { mountSheetShadow } from '@/lib/preview/shadowMount';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils/cn';
import {
  FRIENDLY_WIDGET_MIME,
  appendFriendlyWidgetPreset,
  decodeFriendlyWidgetDrag,
} from '@/lib/widgets/presets';
import PreviewToolbar from './PreviewToolbar';

const WORKSPACE_ORDER: WorkspaceKey[] = ['html', 'css', 'i18n'];

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

type PendingMove = {
  ws: WorkspaceKey;
  blockId: string;
  kind: DragOrigin['kind'];
  left: number;
  top: number;
  origStyle: string;
  containingBlockId: string | null;
  containingBlockStyle: string;
  containingBlockNeedsRelative: boolean;
};

type OptimisticMove = {
  left: number;
  top: number;
  containingBlockId: string | null;
  containingBlockStyle: string;
  containingBlockNeedsRelative: boolean;
};

const DESIGN_CSS_MARKER = 'r20-design-css:managed';

export default function EditCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const setShadowSelectedRef = useRef<((id: string | null) => void) | null>(null);
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
  const editSubmode = useUiStore((s) => s.editSubmode);
  const previewLayer = useUiStore((s) => s.previewLayer);
  const zoom = useUiStore((s) => s.previewZoom);
  const sheetCanvasWidth = useUiStore((s) => s.sheetCanvasWidth);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleSnap = useUiStore((s) => s.toggleSnapEnabled);
  const sanitize = usePreviewStore((s) => s.sanitize);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [optimisticMoves, setOptimisticMoves] = useState<Record<string, OptimisticMove>>({});
  const [layerSearch, setLayerSearch] = useState('');

  const effectiveLayer = editSubmode === 'rolltemplate' ? 'roll' : previewLayer;
  const isEmpty = htmlCount + cssCount + i18nCount === 0;
  const fitScale =
    zoom === 'fit' && viewportWidth > 0
      ? Math.min(1, Math.max(0.25, (viewportWidth - 48) / sheetCanvasWidth))
      : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;
  const optimisticHtml = useMemo(
    () => applyOptimisticPositions(emitHtml, optimisticMoves),
    [emitHtml, optimisticMoves],
  );

  const parts = useMemo(
    () =>
      buildSheetParts({
        html: optimisticHtml,
        css: emitCss,
        i18n: emitI18n,
        sanitize,
        darkMode,
        previewLayer: effectiveLayer,
        includeEditorOverlays: false,
      }),
    [optimisticHtml, emitCss, emitI18n, sanitize, darkMode, effectiveLayer],
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

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(FRIENDLY_WIDGET_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    const payload = e.dataTransfer.getData(FRIENDLY_WIDGET_MIME);
    if (!payload) return;
    const preset = decodeFriendlyWidgetDrag(payload);
    if (!preset) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = measureDropPosition(hostRef.current, scrollRef.current, e.clientX, e.clientY);
    const id = appendFriendlyWidgetPreset(preset, pos);
    if (id) setLastMove(`${preset.label} 추가됨: ${Math.round(pos.left)}px, ${Math.round(pos.top)}px`);
  }, []);

  const handleNativeDragOver = useCallback((event: Event) => {
    const e = event as DragEvent;
    if (!hasFriendlyWidgetPayload(e.dataTransfer)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleNativeDrop = useCallback((event: Event) => {
    const e = event as DragEvent;
    const payload = e.dataTransfer?.getData(FRIENDLY_WIDGET_MIME) ?? '';
    if (!payload) return;
    const preset = decodeFriendlyWidgetDrag(payload);
    if (!preset) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = measureDropPosition(hostRef.current, scrollRef.current, e.clientX, e.clientY);
    const id = appendFriendlyWidgetPreset(preset, pos);
    if (id) setLastMove(`${preset.label} 추가됨: ${Math.round(pos.left)}px, ${Math.round(pos.top)}px`);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const mounted = mountSheetShadow(host, {
      html: parts.html,
      css: parts.css,
      layer: effectiveLayer,
      darkMode,
      disableNativeControls: true,
      disableInlineTextEdit: true,
      disableContextMenu: true,
      onSelect: (blockId) => setShadowSelectedRef.current?.(blockId),
      onDragStart: (blockId) => {
        const origin = resolveDragOrigin(host, blockId);
        dragOriginRef.current = origin;
        pendingMoveRef.current = null;
        if (!origin) {
          setLastMove('이 블록은 위치 값을 저장할 필드가 없어 움직일 수 없어요.');
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
    const shadowBody = mounted.shadow.querySelector<HTMLElement>('body.charsheet');
    host.addEventListener('dragover', handleNativeDragOver);
    host.addEventListener('drop', handleNativeDrop);
    mounted.shadow.addEventListener('dragover', handleNativeDragOver);
    mounted.shadow.addEventListener('drop', handleNativeDrop);
    shadowBody?.addEventListener('dragover', handleNativeDragOver);
    shadowBody?.addEventListener('drop', handleNativeDrop);
    return () => {
      if (visualRafRef.current != null) window.cancelAnimationFrame(visualRafRef.current);
      if (commitTimerRef.current != null) window.clearTimeout(commitTimerRef.current);
      cleanupDragVisual();
      pendingMoveRef.current = null;
      dragOriginRef.current = null;
      setShadowSelectedRef.current = null;
      host.removeEventListener('dragover', handleNativeDragOver);
      host.removeEventListener('drop', handleNativeDrop);
      mounted.shadow.removeEventListener('dragover', handleNativeDragOver);
      mounted.shadow.removeEventListener('drop', handleNativeDrop);
      shadowBody?.removeEventListener('dragover', handleNativeDragOver);
      shadowBody?.removeEventListener('drop', handleNativeDrop);
      mounted.cleanup();
    };
  }, [
    parts,
    effectiveLayer,
    darkMode,
    snap,
    handleNativeDragOver,
    handleNativeDrop,
    cleanupDragVisual,
    lockVisualAtDrop,
    commitMoveLater,
  ]);

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
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs">
        <span className="font-medium text-foreground">
          {editSubmode === 'rolltemplate' ? '굴림 결과 편집' : '시트 편집'}
        </span>
        <button
          type="button"
          onClick={toggleSnap}
          className={cn(
            'rounded border px-2 py-0.5 text-xs',
            snapEnabled
              ? 'border-[var(--color-primary,#2563eb)] bg-[var(--color-primary,#2563eb)] text-white'
              : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)]',
          )}
          title="8px 단위로 맞추기"
          data-testid="edit-canvas-snap-toggle"
        >
          snap {snapEnabled ? '8px' : 'off'}
        </button>
        <div className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {lastMove ?? '요소를 끌어 옮기면 HTML/CSS 위치 값에 반영돼요.'}
        </div>
      </div>

      <div
        className="grid flex-1 min-h-0"
        style={{ gridTemplateColumns: '248px minmax(0, 1fr)' }}
      >
        <EditLayerPanel search={layerSearch} onSearchChange={setLayerSearch} />
        <div
          ref={scrollRef}
          className="min-h-0 overflow-auto p-5"
          data-testid="edit-canvas-scroll"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {isEmpty ? (
            <div
              className="flex min-h-[420px] items-center justify-center rounded border border-dashed border-border bg-[var(--bg-elevated)] text-sm text-muted-foreground"
              data-testid="edit-canvas-empty"
            >
              HTML/CSS를 불러오거나 요소를 놓으면 여기에서 바로 편집할 수 있어요.
            </div>
          ) : (
            <div
              className="mx-auto"
              style={{
                width: `${sheetCanvasWidth * scale}px`,
                minHeight: `${Math.max(600, 900 * scale)}px`,
                maxWidth: 'none',
              }}
            >
              <div
                style={{
                  width: `${sheetCanvasWidth}px`,
                  minHeight: '900px',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <div
                  ref={hostRef}
                  data-testid="edit-canvas-shadow-host"
                  className="block min-h-[900px] overflow-visible bg-white"
                  style={{ width: `${sheetCanvasWidth}px` }}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <PreviewToolbar />
    </div>
  );
}

function EditLayerPanel({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tab = useUiStore((s) => s.treeWorkspaceTab);
  const setTab = useUiStore((s) => s.setTreeWorkspaceTab);
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const bumpStructure = useWorkspaceStore((s) => s.bumpStructure);
  const structureVersion = useWorkspaceStore((s) => s.workspaces[tab].structureVersion);

  const nodes = useMemo(() => {
    void structureVersion;
    return getBlocklyAdapter().listAllBlocks(tab);
  }, [tab, structureVersion]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter(
      (node) =>
        node.type.toLowerCase().includes(q) ||
        node.label.toLowerCase().includes(q) ||
        node.preview.toLowerCase().includes(q),
    );
  }, [nodes, search]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 30,
    overscan: 10,
  });

  const moveLayer = useCallback(
    (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;
      const adapter = getBlocklyAdapter();
      const nested = adapter.nestBlockInContainer(tab, draggedId, targetId);
      const moved = nested || adapter.moveBlockBefore(tab, draggedId, targetId);
      if (!moved) return;
      bumpStructure(tab, adapter.countBlocks(tab));
      setSelected(draggedId, 'tree');
    },
    [bumpStructure, setSelected, tab],
  );

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-[var(--bg-elevated)]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-medium text-foreground">
        <Layers className="h-3.5 w-3.5" />
        레이어
      </div>
      <div className="grid grid-cols-3 gap-1 border-b border-border p-2">
        {(['html', 'css', 'i18n'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded px-2 py-1 text-[11px] ${
              tab === key
                ? 'bg-[var(--bg-active)] text-foreground'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground'
            }`}
          >
            {key === 'i18n' ? '번역' : key.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="레이어 검색"
            className="h-7 w-full rounded border border-border bg-[var(--bg-elevated-2)] pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            표시할 레이어가 없습니다.
          </div>
        ) : (
          <div
            className="relative p-1"
            style={{ height: `${virtualizer.getTotalSize() + 8}px` }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const node = filtered[row.index];
              if (!node) return null;
              return (
                <div
                  key={node.id}
                  className="absolute left-1 right-1 top-0"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <EditLayerRow
                    node={node}
                    selected={node.id === selectedId}
                    onSelect={() => setSelected(node.id, 'tree')}
                    onMove={moveLayer}
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
  selected,
  onSelect,
  onMove,
}: {
  node: BlockSnapshot;
  selected: boolean;
  onSelect: () => void;
  onMove: (draggedId: string, targetId: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onSelect}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-r20-layer-block', node.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('application/x-r20-layer-block')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        const draggedId = e.dataTransfer.getData('application/x-r20-layer-block');
        if (!draggedId) return;
        e.preventDefault();
        e.stopPropagation();
        onMove(draggedId, node.id);
      }}
      className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs ${
        selected
          ? 'bg-orange-500/20 text-foreground ring-1 ring-orange-500/60'
          : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground'
      }`}
      style={{ paddingLeft: `${8 + node.depth * 12}px` }}
    >
      <span
        aria-hidden
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${layerIconClass(node.type)}`}
      >
        {layerIconText(node.type)}
      </span>
      <span className="truncate font-mono text-[10.5px]">{node.type}</span>
      {node.preview && <span className="truncate text-[10px] opacity-70">· {node.preview}</span>}
    </button>
  );
});

function layerIconClass(type: string): string {
  if (isFrameLikeBlock(type)) return 'border-sky-500/60 bg-sky-500/15 text-sky-200';
  if (type.includes('input') || type.includes('select') || type.includes('checkbox')) {
    return 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200';
  }
  if (type.includes('button') || type.includes('roll')) {
    return 'border-amber-500/60 bg-amber-500/15 text-amber-200';
  }
  if (type.includes('text') || type.includes('label') || type.includes('heading')) {
    return 'border-violet-500/60 bg-violet-500/15 text-violet-200';
  }
  return 'border-zinc-500/60 bg-zinc-500/15 text-zinc-200';
}

function layerIconText(type: string): string {
  if (isFrameLikeBlock(type)) return '□';
  if (type.includes('input') || type.includes('select') || type.includes('checkbox')) return 'I';
  if (type.includes('button') || type.includes('roll')) return 'B';
  if (type.includes('text') || type.includes('label') || type.includes('heading')) return 'T';
  return '·';
}

function isFrameLikeBlock(type: string): boolean {
  return (
    type.includes('div') ||
    type.includes('row') ||
    type.includes('col') ||
    type.includes('section') ||
    type.includes('fieldset') ||
    type.includes('table') ||
    type.includes('grid')
  );
}

function commitMove(pending: PendingMove): void {
  const adapter = getBlocklyAdapter();
  let parentClass: string | null = null;
  if (
    pending.containingBlockId &&
    pending.containingBlockNeedsRelative &&
    adapter.hasBlockField(pending.ws, pending.containingBlockId, 'STYLE')
  ) {
    parentClass = ensureDesignClass(adapter, pending.ws, pending.containingBlockId);
    if (parentClass) {
      adapter.setBlockField(
        pending.ws,
        pending.containingBlockId,
        'STYLE',
        removeCssDeclarations(pending.containingBlockStyle, ['position']),
      );
      upsertDesignCssRule(parentClass, { position: 'relative' });
    } else {
      adapter.setBlockField(
        pending.ws,
        pending.containingBlockId,
        'STYLE',
        upsertCssDeclarations(pending.containingBlockStyle, { position: 'relative' }),
      );
    }
  }
  if (pending.kind === 'position-fields') {
    adapter.setBlockField(pending.ws, pending.blockId, 'LEFT_PX', String(pending.left));
    adapter.setBlockField(pending.ws, pending.blockId, 'TOP_PX', String(pending.top));
    patchEmitCacheAfterMove(pending);
    return;
  }
  const designClass = ensureDesignClass(adapter, pending.ws, pending.blockId);
  if (designClass) {
    adapter.setBlockField(
      pending.ws,
      pending.blockId,
      'STYLE',
      removeCssDeclarations(pending.origStyle, ['position', 'left', 'top']),
    );
    upsertDesignCssRule(designClass, {
      position: 'absolute',
      left: `${pending.left}px`,
      top: `${pending.top}px`,
    });
    patchEmitCacheAfterCssMove(pending, designClass, parentClass);
    return;
  }
  adapter.setBlockField(
    pending.ws,
    pending.blockId,
    'STYLE',
    upsertCssDeclarations(pending.origStyle, {
      position: 'absolute',
      left: `${pending.left}px`,
      top: `${pending.top}px`,
    }),
  );
  patchEmitCacheAfterMove(pending);
}

function ensureDesignClass(
  adapter: ReturnType<typeof getBlocklyAdapter>,
  ws: WorkspaceKey,
  blockId: string,
): string | null {
  if (!adapter.hasBlockField(ws, blockId, 'CLASS')) return null;
  const token = designClassForBlock(blockId);
  const current = adapter.getBlockField(ws, blockId, 'CLASS') ?? '';
  const parts = current.split(/\s+/).filter(Boolean);
  if (!parts.includes(token)) {
    adapter.setBlockField(ws, blockId, 'CLASS', [...parts, token].join(' '));
  }
  return token;
}

function upsertDesignCssRule(className: string, declarations: Record<string, string>): void {
  const adapter = getBlocklyAdapter();
  const rawBlockId = findOrCreateDesignCssBlock(adapter);
  if (!rawBlockId) return;
  const current = adapter.getBlockField('css', rawBlockId, 'CSS') ?? '';
  adapter.setBlockField('css', rawBlockId, 'CSS', upsertCssRule(current, className, declarations));
}

function findOrCreateDesignCssBlock(adapter: ReturnType<typeof getBlocklyAdapter>): string | null {
  const existing = adapter
    .listAllBlocks('css')
    .find((block) => block.type === 'r20_raw_css' && (adapter.getBlockField('css', block.id, 'CSS') ?? '').includes(DESIGN_CSS_MARKER));
  if (existing) return existing.id;
  const id = adapter.appendBlockToWorkspace('css', 'r20_raw_css');
  if (!id) return null;
  adapter.setBlockField('css', id, 'CSS', `/* ${DESIGN_CSS_MARKER} */`);
  return id;
}

function upsertCssRule(
  css: string,
  className: string,
  declarations: Record<string, string>,
): string {
  const selector = `.${className}`;
  const rule = `${selector} { ${formatCssDeclarations(declarations)} }`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 'm');
  const base = css.trim() || `/* ${DESIGN_CSS_MARKER} */`;
  if (re.test(base)) return base.replace(re, rule);
  return `${base}\n${rule}`;
}

function formatCssDeclarations(declarations: Record<string, string>): string {
  return Object.entries(declarations)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}

function patchEmitCacheAfterCssMove(
  pending: PendingMove,
  designClass: string,
  parentClass: string | null,
): void {
  if (pending.ws !== 'html') return;
  const store = useWorkspaceStore.getState();
  let html = store.emitCache.html;
  let css = store.emitCache.css;
  if (!html) return;
  if (pending.containingBlockId && pending.containingBlockNeedsRelative && parentClass) {
    html = addClassToBlockTag(html, pending.containingBlockId, parentClass);
    html = removeStyleDeclarationsFromBlockTag(html, pending.containingBlockId, ['position']);
    css = upsertCssRule(css, parentClass, { position: 'relative' });
  }
  html = addClassToBlockTag(html, pending.blockId, designClass);
  html = removeStyleDeclarationsFromBlockTag(html, pending.blockId, ['position', 'left', 'top']);
  css = upsertCssRule(css, designClass, {
    position: 'absolute',
    left: `${pending.left}px`,
    top: `${pending.top}px`,
  });
  store.setEmitCache({ html, css });
}

function patchEmitCacheAfterMove(pending: PendingMove): void {
  if (pending.ws !== 'html') return;
  const store = useWorkspaceStore.getState();
  let html = store.emitCache.html;
  if (!html) return;
  if (pending.containingBlockId && pending.containingBlockNeedsRelative) {
    html = applyOptimisticPositionDeclaration(
      html,
      pending.containingBlockId,
      pending.containingBlockStyle,
    );
  }
  html = applyOptimisticPosition(html, pending.blockId, pending.left, pending.top);
  store.setEmitCache({ html });
}

function applyOptimisticPositions(
  html: string,
  moves: Record<string, OptimisticMove>,
): string {
  if (!html || Object.keys(moves).length === 0) return html;
  let out = html;
  for (const [blockId, move] of Object.entries(moves)) {
    if (move.containingBlockId && move.containingBlockNeedsRelative) {
      out = applyOptimisticPositionDeclaration(
        out,
        move.containingBlockId,
        move.containingBlockStyle,
      );
    }
    out = applyOptimisticPosition(out, blockId, move.left, move.top);
  }
  return out;
}

function applyOptimisticPositionDeclaration(
  html: string,
  blockId: string,
  fallbackStyle: string,
): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return html;
  const styleMatch = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i);
  const nextStyle = upsertCssDeclarations(styleMatch?.[2] ?? fallbackStyle, {
    position: 'relative',
  });
  const nextTag = styleMatch
    ? tag.text.replace(styleMatch[0], ` style=${styleMatch[1]}${escapeHtmlAttr(nextStyle)}${styleMatch[1]}`)
    : tag.text.replace(/>$/, ` style="${escapeHtmlAttr(nextStyle)}">`);
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

function applyOptimisticPosition(
  html: string,
  blockId: string,
  left: number,
  top: number,
): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return html;
  const styleMatch = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i);
  const nextStyle = upsertCssDeclarations(styleMatch?.[2] ?? '', {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
  });
  const nextTag = styleMatch
    ? tag.text.replace(styleMatch[0], ` style=${styleMatch[1]}${escapeHtmlAttr(nextStyle)}${styleMatch[1]}`)
    : tag.text.replace(/>$/, ` style="${escapeHtmlAttr(nextStyle)}">`);
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

function htmlOrCssHasPosition(
  html: string,
  css: string,
  blockId: string,
  left: number,
  top: number,
): boolean {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return false;
  const style = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
  if (parseCssPx(style, 'left') === left && parseCssPx(style, 'top') === top) return true;
  const className = designClassForBlock(blockId);
  if (!tagHasClass(tag.text, className)) return false;
  const declarations = readCssRuleDeclarations(css, className);
  return parseCssPx(declarations, 'left') === left && parseCssPx(declarations, 'top') === top;
}

function findBlockOpeningTag(html: string, blockId: string): { start: number; end: number; text: string } | null {
  const marker = `data-r20-block-id="${blockId}"`;
  let markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    markerIndex = html.indexOf(`data-r20-block-id='${blockId}'`);
  }
  if (markerIndex < 0) return null;
  const start = html.lastIndexOf('<', markerIndex);
  const end = html.indexOf('>', markerIndex);
  if (start < 0 || end < 0 || start > markerIndex) return null;
  return { start, end: end + 1, text: html.slice(start, end + 1) };
}

function addClassToBlockTag(html: string, blockId: string, className: string): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag || tagHasClass(tag.text, className)) return html;
  const classMatch = tag.text.match(/\sclass=(["'])([\s\S]*?)\1/i);
  const nextTag = classMatch
    ? tag.text.replace(
        classMatch[0],
        ` class=${classMatch[1]}${escapeHtmlAttr(`${classMatch[2]} ${className}`.trim())}${classMatch[1]}`,
      )
    : tag.text.replace(/>$/, ` class="${escapeHtmlAttr(className)}">`);
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

function removeStyleDeclarationsFromBlockTag(html: string, blockId: string, props: string[]): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return html;
  const styleMatch = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i);
  if (!styleMatch) return html;
  const nextStyle = removeCssDeclarations(styleMatch[2], props);
  const nextTag = nextStyle
    ? tag.text.replace(styleMatch[0], ` style=${styleMatch[1]}${escapeHtmlAttr(nextStyle)}${styleMatch[1]}`)
    : tag.text.replace(styleMatch[0], '');
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

function tagHasClass(tag: string, className: string): boolean {
  const cls = tag.match(/\sclass=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
  return cls.split(/\s+/).includes(className);
}

function designClassForBlock(blockId: string): string {
  const safe = blockId.replace(/[^a-zA-Z0-9_-]/g, (ch) => ch.charCodeAt(0).toString(36));
  return `r20-node-${safe.slice(0, 32)}`;
}

function readCssRuleDeclarations(css: string, className: string): string {
  const selector = `.${className}`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  return match?.[1] ?? '';
}

function measureDropPosition(
  host: HTMLElement | null,
  fallback: HTMLElement | null,
  clientX: number,
  clientY: number,
): { left: number; top: number } {
  const shadow = host?.shadowRoot;
  const root =
    shadow?.querySelector<HTMLElement>('body.charsheet') ??
    shadow?.querySelector<HTMLElement>('.charsheet');
  const target = root ?? host ?? fallback;
  if (!target) return { left: 24, top: 24 };
  const rect = target.getBoundingClientRect();
  return {
    left: Math.max(0, Math.round(clientX - rect.left + target.scrollLeft)),
    top: Math.max(0, Math.round(clientY - rect.top + target.scrollTop)),
  };
}

function hasFriendlyWidgetPayload(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  for (let i = 0; i < dataTransfer.types.length; i += 1) {
    if (dataTransfer.types[i] === FRIENDLY_WIDGET_MIME) return true;
  }
  return false;
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

function getShadowBlockElement(host: HTMLElement, blockId: string): HTMLElement | null {
  const shadow = host.shadowRoot;
  if (!shadow) return null;
  const escaped = escapeAttr(blockId);
  return shadow.querySelector<HTMLElement>(`[data-r20-block-id="${escaped}"]`);
}

function getHostScale(host: HTMLElement): number {
  const rect = host.getBoundingClientRect();
  return host.offsetWidth > 0 ? rect.width / host.offsetWidth : 1;
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

function hasPositionDeclaration(style: string): boolean {
  return /(?:^|;)\s*position\s*:/i.test(style);
}

function parsePx(value: string | null): number {
  const n = Number.parseFloat(value ?? '0');
  return Number.isFinite(n) ? n : 0;
}

function parseCssPx(style: string, prop: 'left' | 'top'): number | null {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px\\s*(?:;|$)`, 'i');
  const match = style.match(re);
  if (!match) return null;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function upsertCssDeclarations(style: string, declarations: Record<string, string>): string {
  const map = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (key && value) map.set(key, value);
  }
  for (const [key, value] of Object.entries(declarations)) {
    map.set(key.toLowerCase(), value);
  }
  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function removeCssDeclarations(style: string, props: string[]): string {
  const remove = new Set(props.map((prop) => prop.toLowerCase()));
  const map = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (key && value && !remove.has(key)) map.set(key, value);
  }
  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function escapeAttr(raw: string): string {
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(raw)
    : raw.replace(/(["\\])/g, '\\$1');
}

function escapeHtmlAttr(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

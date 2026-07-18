'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { Layers, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import type { BlockSnapshot } from '@/lib/blockly/adapter';
import { getLayerRole, wouldCreateLayerCycle } from '@/lib/editor/layerRoles';
import { EDIT_SURFACE_LAYER_PANEL_WIDTH_PX } from '@/lib/editor/editSurfaceLayout';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils/cn';

type LayerDropMode = 'before' | 'inside' | 'after';

function formatDropModeLabel(mode: LayerDropMode): string {
  if (mode === 'inside') return '안에 넣기';
  if (mode === 'before') return '앞에 넣기';
  return '뒤에 넣기';
}

function formatLayerRelationLabel(relation: BlockSnapshot['layerRelation']): string {
  if (relation === 'child') return '하위';
  if (relation === 'sibling') return '흐름 형제';
  return '루트';
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

export default function EditCanvas() {
  const editSubmode = useUiStore((s) => s.editSubmode);
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
  const [layerSearch, setLayerSearch] = useState('');
  const canvasWidth = editSubmode === 'rolltemplate' ? rolltemplateCanvasWidth : sheetCanvasWidth;
  const setCanvasWidth = editSubmode === 'rolltemplate'
    ? setRolltemplateCanvasWidth
    : setSheetCanvasWidth;
  const minWidth = editSubmode === 'rolltemplate' ? 200 : 320;
  const maxWidth = editSubmode === 'rolltemplate' ? 600 : 2000;

  return (
    <div
      className="flex flex-1 min-h-0 flex-col bg-[var(--bg-canvas)]"
      data-testid="edit-canvas-root"
      data-edit-submode={editSubmode}
      data-edit-render-owner="persistent-iframe"
    >
      <div
        className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs"
        data-testid="edit-surface-toolbar"
      >
        <span className="font-medium text-foreground">
          {editSubmode === 'rolltemplate' ? '굴림 결과 편집' : '시트 편집'}
        </span>
        <button
          type="button"
          onClick={toggleSnap}
          className={cn(
            'rounded border px-2 py-0.5 text-xs',
            snapEnabled
              ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
              : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)]',
          )}
          title="8px 격자에 맞추기"
          data-testid="edit-canvas-snap-toggle"
        >
          격자 {snapEnabled ? '8px' : '끔'}
        </button>
        <div
          className="flex items-center overflow-hidden rounded border border-border bg-[var(--bg-elevated-2)]"
          data-testid="edit-placement-mode"
        >
          <button
            type="button"
            onClick={() => setEditPlacementMode('flow')}
            className={cn(
              'px-2 py-0.5 text-xs',
              editPlacementMode === 'flow'
                ? 'bg-[var(--primary)] text-white'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            title="틀의 배치 규칙에 따라 주변 요소와 함께 정렬합니다."
            data-testid="edit-placement-flow"
          >
            흐름
          </button>
          <button
            type="button"
            onClick={() => setEditPlacementMode('free')}
            className={cn(
              'px-2 py-0.5 text-xs',
              editPlacementMode === 'free'
                ? 'bg-[var(--primary)] text-white'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            title="선택한 틀을 기준으로 원하는 위치에 배치합니다."
            data-testid="edit-placement-free"
          >
            자유
          </button>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          너비
          <input
            key={`${editSubmode}-${canvasWidth}`}
            type="number"
            min={minWidth}
            max={maxWidth}
            step={10}
            defaultValue={canvasWidth}
            onBlur={(event) => {
              const next = Number(event.currentTarget.value);
              if (Number.isFinite(next)) setCanvasWidth(next);
              else event.currentTarget.value = String(canvasWidth);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="h-6 w-[76px] rounded border border-border bg-[var(--bg-elevated-2)] px-2 text-right text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            aria-label={editSubmode === 'rolltemplate' ? '굴림 결과 캔버스 폭' : '시트 캔버스 폭'}
            data-testid="edit-canvas-width-input"
          />
          px
        </label>
        <div
          className="flex items-center overflow-hidden rounded border border-border bg-[var(--bg-elevated-2)]"
          data-testid="edit-zoom-control"
        >
          <button
            type="button"
            onClick={() => setPreviewZoom('fit')}
            className={cn(
              'px-2 py-0.5 text-xs',
              zoom === 'fit'
                ? 'bg-[var(--primary)] text-white'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            title="전체 시트를 작업 영역에 맞춥니다."
            data-testid="edit-zoom-fit"
          >
            맞춤
          </button>
          <button
            type="button"
            onClick={() => setPreviewZoom(1)}
            className={cn(
              'px-2 py-0.5 text-xs',
              zoom === 1
                ? 'bg-[var(--primary)] text-white'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            title="Roll20 시트 크기 그대로 봅니다."
            data-testid="edit-zoom-100"
          >
            100%
          </button>
        </div>
      </div>
      <div
        className="grid flex-1 min-h-0"
        style={{ gridTemplateColumns: `${EDIT_SURFACE_LAYER_PANEL_WIDTH_PX}px minmax(0, 1fr)` }}
      >
        <EditLayerPanel search={layerSearch} onSearchChange={setLayerSearch} />
        <div
          className="min-h-0 bg-[var(--bg-canvas)]"
          data-testid="edit-canvas-iframe-slot"
          aria-hidden="true"
        />
      </div>
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
  // The Figma-style layer tree represents rendered HTML objects. CSS and
  // translation remain editable in their dedicated code/block workspaces;
  // mixing them into this tree made drop targets look like visual layers when
  // they could never appear on the sheet canvas.
  const tab: WorkspaceKey = 'html';
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const bumpStructure = useWorkspaceStore((s) => s.bumpStructure);
  const structureVersion = useWorkspaceStore((s) => s.workspaces[tab].structureVersion);

  const nodes = useMemo(() => {
    void structureVersion;
    return getBlocklyAdapter().listAllBlocks(tab);
  }, [tab, structureVersion]);

  const filtered = useMemo(() => filterLayersWithAncestors(nodes, search), [nodes, search]);
  const selectedPath = useMemo(() => buildLayerPath(nodes, selectedId), [nodes, selectedId]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 42,
    overscan: 10,
  });

  useEffect(() => {
    if (!selectedId) return;
    const index = filtered.findIndex((item) => item.node.id === selectedId);
    if (index < 0) return;
    virtualizer.scrollToIndex(index, { align: 'center' });
  }, [filtered, selectedId, virtualizer]);

  const moveLayer = useCallback(
    (draggedId: string, targetId: string, mode: LayerDropMode) => {
      if (draggedId === targetId) return;
      if (wouldCreateLayerCycle(nodes, draggedId, targetId)) return;
      const adapter = getBlocklyAdapter();
      const moved =
        mode === 'inside'
          ? adapter.nestBlockInContainer(tab, draggedId, targetId)
          : mode === 'after'
            ? adapter.moveBlockAfter(tab, draggedId, targetId)
            : adapter.moveBlockBefore(tab, draggedId, targetId);
      if (!moved) return;
      bumpStructure(tab, adapter.countBlocks(tab));
      setSelected(draggedId, 'tree');
    },
    [bumpStructure, nodes, setSelected, tab],
  );

  return (
    <aside
      className="flex min-h-0 flex-col border-r border-border bg-[var(--bg-elevated)]"
      data-testid="edit-layer-panel"
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-medium text-foreground">
        <Layers className="h-3.5 w-3.5" />
        <span>레이어</span>
        <span className="ml-auto rounded border border-border bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          {search.trim() ? `${filtered.filter((item) => item.searchMatch).length}+맥락 ${filtered.length}/${nodes.length}` : `${filtered.length}/${nodes.length}`}
        </span>
      </div>
      <div
        className="flex items-center justify-between border-b border-border px-3 py-2"
        data-testid="edit-layer-workspace"
      >
        <span className="text-[10px] font-medium text-muted-foreground">HTML 구조</span>
        <span className="rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-200">
          시트에 표시되는 레이어
        </span>
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
            data-testid="edit-layer-search"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-rose-400/80" />
            담기 가능
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-400/80" />
            하위 요소
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-zinc-500/70" />
            단일 요소
          </span>
        </div>
      </div>
      {selectedPath.length > 0 && (
        <div
          className="border-b border-border px-2 py-2"
          data-testid="edit-layer-selection-path"
          data-r20-layer-path-depth={selectedPath.length}
        >
          <div className="text-[10px] font-medium text-muted-foreground">선택 위치</div>
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
                    'max-w-full truncate rounded border px-1.5 py-0.5 text-[10px]',
                    isCurrent
                      ? 'border-orange-400/70 bg-orange-500/15 text-orange-100'
                      : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                  )}
                  title={`${node.label} (${node.type})${node.preview ? ` - ${node.preview}` : ''}`}
                >
                  {node.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto" data-testid="edit-layer-scroll">
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
              const item = filtered[row.index];
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
                    selected={node.id === selectedId}
                    searchMatch={item.searchMatch}
                    contextOnly={item.contextOnly}
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
  workspace,
  selected,
  searchMatch,
  contextOnly,
  onSelect,
  onMove,
}: {
  node: BlockSnapshot;
  workspace: WorkspaceKey;
  selected: boolean;
  searchMatch: boolean;
  contextOnly: boolean;
  onSelect: () => void;
  onMove: (draggedId: string, targetId: string, mode: LayerDropMode) => void;
}) {
  const [dropMode, setDropMode] = useState<LayerDropMode | null>(null);
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
  return (
    <button
      type="button"
      draggable
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
      aria-label={`${node.label} ${role.label}${role.canReceiveChildren ? ' 컨테이너' : ''}`}
      onClick={onSelect}
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-r20-layer-block', node.id);
        e.dataTransfer.effectAllowed = 'move';
        document.body.dataset.r20LayerDraggingBlock = node.id;
      }}
      onDragLeave={() => setDropMode(null)}
      onDragEnd={() => {
        setDropMode(null);
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
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropMode(pickMode(e));
      }}
      onDrop={(e) => {
        const draggedId =
          document.body.dataset.r20LayerDraggingBlock ||
          e.dataTransfer.getData('application/x-r20-layer-block');
        if (!draggedId) return;
        e.preventDefault();
        e.stopPropagation();
        const mode = pickMode(e);
        setDropMode(null);
        delete document.body.dataset.r20LayerDraggingBlock;
        onMove(draggedId, node.id, mode);
      }}
      className={`relative flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
        selected
          ? 'bg-orange-500/20 text-foreground ring-1 ring-orange-500/60'
          : contextOnly
            ? 'text-muted-foreground/70 hover:bg-[var(--bg-hover)] hover:text-muted-foreground'
            : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground'
      } ${
        dropMode === 'inside'
          ? 'ring-1 ring-rose-400/80'
          : dropMode === 'before'
            ? 'shadow-[inset_0_2px_0_rgba(96,165,250,0.95)]'
            : dropMode === 'after'
              ? 'shadow-[inset_0_-2px_0_rgba(96,165,250,0.95)]'
              : ''
      }`}
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
          role.canReceiveChildren ? 'bg-rose-400/70' : 'bg-zinc-500/45',
          node.layerRelation === 'child' && 'bg-emerald-400/70',
          selected && 'bg-orange-400',
        )}
      />
      {dropMode && (
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {formatDropModeLabel(dropMode)}
        </span>
      )}
      <span
        aria-hidden
        title={role.canReceiveChildren ? `${role.label} 컨테이너` : role.label}
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] ${role.className}`}
      >
        {role.icon}
      </span>
      <LayerMiniMap
        roleKind={role.kind}
        canReceiveChildren={role.canReceiveChildren}
        childCount={node.childCount}
        relation={node.layerRelation}
        selected={selected}
        defaultDropMode={role.defaultDropMode}
      />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-mono text-[10.5px]">{node.type}</span>
          <span className="shrink-0 rounded border border-border/80 bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[9px] text-muted-foreground">
            {formatLayerRelationLabel(node.layerRelation)}
          </span>
          <span className="shrink-0 rounded border border-border bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[9px] text-muted-foreground">
            {role.label}
          </span>
          {node.childCount > 0 && (
            <span
              data-testid="edit-layer-child-count"
              title={`하위 요소 ${node.childCount}개`}
              className="shrink-0 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-200"
            >
              {node.childCount}
            </span>
          )}
          {role.canReceiveChildren && (
            <span className="shrink-0 rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-200">
              담기 가능
            </span>
          )}
          {contextOnly && (
            <span
              data-testid="edit-layer-context-badge"
              className="shrink-0 rounded border border-border/80 bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[9px] text-muted-foreground"
            >
              상위 맥락
            </span>
          )}
          {role.defaultDropMode !== 'none' && (
            <span className="shrink-0 rounded border border-border/80 bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {role.defaultDropMode === 'flow' ? '흐름' : '자유'}
            </span>
          )}
        </span>
        {node.preview && (
          <span className="block truncate text-[10px] opacity-70">- {node.preview}</span>
        )}
      </span>
    </button>
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
  const isContainer = canReceiveChildren || roleKind === 'frame' || roleKind === 'flow' || roleKind === 'table';
  return (
    <span
      aria-hidden
      data-testid="edit-layer-mini-map"
      data-r20-layer-mini-role={roleKind}
      data-r20-layer-mini-can-drop={canReceiveChildren ? '1' : '0'}
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

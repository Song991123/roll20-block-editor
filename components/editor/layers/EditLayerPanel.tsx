'use client';

/**
 * EditLayerPanel — virtualized layer tree for the edit canvas: workspace tabs,
 * search with ancestor context, selection path breadcrumb, and drag/drop
 * reorder rows (before / inside / after).
 *
 * Shares the container classification (lib/editor/layerRoles) with the canvas
 * so both surfaces mark the same nodes as droppable.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Layers, Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getBlocklyAdapter, type BlockSnapshot } from '@/lib/blockly/adapter';
import { getLayerRole } from '@/lib/editor/layerRoles';
import type { LayerDropMode } from '@/lib/editor/dropOverlay';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils/cn';
import EditLayerRow from './EditLayerRow';

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

export default function EditLayerPanel({
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
    [bumpStructure, setSelected, tab],
  );

  return (
    <aside className="flex min-h-0 flex-col border-r border-border bg-[var(--bg-elevated)]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3 text-xs font-medium text-foreground">
        <Layers className="h-3.5 w-3.5" />
        <span>레이어</span>
        <span className="ml-auto rounded border border-border bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
          {search.trim() ? `${filtered.filter((item) => item.searchMatch).length}+맥락 ${filtered.length}/${nodes.length}` : `${filtered.length}/${nodes.length}`}
        </span>
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
            data-testid="edit-layer-search"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-sky-400/80" />
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

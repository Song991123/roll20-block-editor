'use client';

import { memo, useCallback, useMemo, useRef } from 'react';
import { Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { getBlocklyAdapter, type BlockSnapshot } from '@/lib/blockly/adapter';
import { cn } from '@/lib/utils/cn';

const SUB_TABS = [
  { id: 'html', label: 'HTML' },
  { id: 'css', label: 'CSS' },
  { id: 'i18n', label: '번역' },
] as const;

export default function WorkspaceTree() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tab = useUiStore((s) => s.treeWorkspaceTab);
  const setTab = useUiStore((s) => s.setTreeWorkspaceTab);
  const treeSearch = useUiStore((s) => s.treeSearch);
  const setTreeSearch = useUiStore((s) => s.setTreeSearch);
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const bumpStructure = useWorkspaceStore((s) => s.bumpStructure);
  const structureVersion = useWorkspaceStore((s) => s.workspaces[tab].structureVersion);

  const snapshot: BlockSnapshot[] = useMemo(() => {
    void structureVersion;
    const adapter = getBlocklyAdapter();
    return adapter.listAllBlocks(tab);
  }, [tab, structureVersion]);

  const filtered = useMemo(() => {
    const q = treeSearch.trim().toLowerCase();
    if (!q) return snapshot;
    return snapshot.filter(
      (node) =>
        node.label.toLowerCase().includes(q) ||
        node.type.toLowerCase().includes(q) ||
        node.preview.toLowerCase().includes(q),
    );
  }, [snapshot, treeSearch]);

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 30,
    overscan: 12,
  });

  const handleMove = useCallback(
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
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border px-3 pt-2.5 pb-2">
        <ToggleGroup
          type="single"
          value={tab}
          onValueChange={(v) => v && setTab(v as 'html' | 'css' | 'i18n')}
          size="sm"
          className="w-full"
        >
          {SUB_TABS.map((item) => (
            <ToggleGroupItem
              key={item.id}
              value={item.id}
              aria-label={`${item.label} 작업공간`}
              className="flex-1 text-[11px]"
            >
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="shrink-0 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={treeSearch}
            onChange={(e) => setTreeSearch(e.target.value)}
            placeholder="레이어 검색"
            className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        {filtered.length === 0 ? (
          <EmptyTreeHint workspace={tab} />
        ) : (
          <div
            className="relative p-1"
            style={{ height: `${rowVirtualizer.getTotalSize() + 8}px` }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const node = filtered[virtualRow.index];
              if (!node) return null;
              return (
                <div
                  key={node.id}
                  className="absolute left-1 right-1 top-0"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <TreeRow
                    node={node}
                    selected={node.id === selectedId}
                    onSelect={() => setSelected(node.id, 'tree')}
                    onMove={handleMove}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const TreeRow = memo(function TreeRow({
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
        e.dataTransfer.setData('application/x-r20-tree-block', node.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('application/x-r20-tree-block')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        const draggedId = e.dataTransfer.getData('application/x-r20-tree-block');
        if (!draggedId) return;
        e.preventDefault();
        e.stopPropagation();
        onMove(draggedId, node.id);
      }}
      data-selected={selected || undefined}
      data-block-id={node.id}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors',
        selected
          ? 'bg-orange-500/20 text-foreground ring-1 ring-orange-500/60'
          : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
      )}
      style={{ paddingLeft: `${8 + node.depth * 12}px` }}
    >
      <span className="font-mono text-[10.5px] opacity-70 truncate">{node.type}</span>
      {node.preview && (
        <span className="truncate text-[10.5px] text-muted-foreground">· {node.preview}</span>
      )}
    </button>
  );
});

function EmptyTreeHint({ workspace }: { workspace: string }) {
  const labels = { html: 'HTML', css: 'CSS', i18n: '번역' } as const;
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center">
      <div className="text-[11px] text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">아직 비어 있어요</p>
        <p className="leading-relaxed">
          {labels[workspace as keyof typeof labels]} 작업공간에 블록이 없습니다.
          <br />
          블록이나 위젯을 추가하면 여기에서 레이어처럼 볼 수 있어요.
        </p>
      </div>
    </div>
  );
}

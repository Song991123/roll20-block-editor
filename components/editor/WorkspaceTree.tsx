'use client';

import { useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
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

/**
 * 좌측 [트리] 모드 — 현재 워크스페이스의 블록 계층.
 *
 * Anchor: docs/spec/08_wireframes.md W2-B + 10_system_architecture §3.
 * D53 — 25K 노드 60fps 가상 리스트 (react-window). Stage S = 단순 리스트.
 * Stage A 이후 노드가 채워지면 react-window 도입.
 */
export default function WorkspaceTree() {
  const tab = useUiStore((s) => s.treeWorkspaceTab);
  const setTab = useUiStore((s) => s.setTreeWorkspaceTab);
  const treeSearch = useUiStore((s) => s.treeSearch);
  const setTreeSearch = useUiStore((s) => s.setTreeSearch);
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const bumpStructure = useWorkspaceStore((s) => s.bumpStructure);
  // Perf hot path #3: structureVersion (cheap counter bump) replaces xmlCache
  // string. Same re-render frequency — but the upstream BlocklyModelHost no
  // longer pays 50-200ms/event to produce the unused XML text.
  const structureVersion = useWorkspaceStore((s) => s.workspaces[tab].structureVersion);

  const snapshot: BlockSnapshot[] = useMemo(() => {
    const adapter = getBlocklyAdapter();
    return adapter.listAllBlocks(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, structureVersion]);

  const filtered = useMemo(() => {
    if (!treeSearch.trim()) return snapshot;
    const q = treeSearch.toLowerCase();
    return snapshot.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.preview.toLowerCase().includes(q),
    );
  }, [snapshot, treeSearch]);

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
          {SUB_TABS.map((t) => (
            <ToggleGroupItem
              key={t.id}
              value={t.id}
              aria-label={`${t.label} 워크스페이스`}
              className="flex-1 text-[11px]"
            >
              {t.label}
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
            placeholder="트리 검색…"
            className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {filtered.length === 0 ? (
          <EmptyTreeHint workspace={tab} />
        ) : (
          <div className="p-1">
            {filtered.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                selected={node.id === selectedId}
                onSelect={() => setSelected(node.id, 'tree')}
                onMove={(draggedId, targetId) => {
                  if (draggedId === targetId) return;
                  const adapter = getBlocklyAdapter();
                  const nested = adapter.nestBlockInContainer(tab, draggedId, targetId);
                  const moved = nested || adapter.moveBlockBefore(tab, draggedId, targetId);
                  if (!moved) return;
                  bumpStructure(tab, adapter.countBlocks(tab));
                  setSelected(draggedId, 'tree');
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" disabled>
          <Plus className="h-3.5 w-3.5" />
          블록 추가 (Cmd+/)
        </Button>
      </div>
    </div>
  );
}

function TreeRow({
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
        // spec 17 §12 Phase B — Shadow 안 outline 색 (#f60) 과 시각적 페어링.
        // ring 으로 Shadow outline 과 같은 톤 박음 → 좌측 트리만 봐도 동일 행 식별.
        selected
          ? 'bg-orange-500/20 text-foreground ring-1 ring-orange-500/60'
          : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
      )}
      style={{ paddingLeft: `${8 + node.depth * 12}px` }}
    >
      <span className="font-mono text-[10.5px] opacity-70 truncate">{node.type}</span>
      {node.preview && (
        <span className="truncate text-[10.5px] text-muted-foreground">— {node.preview}</span>
      )}
    </button>
  );
}

function EmptyTreeHint({ workspace }: { workspace: string }) {
  const labels = { html: 'HTML', css: 'CSS', i18n: '번역' } as const;
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center">
      <div className="text-[11px] text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">아직 비어있어요</p>
        <p className="leading-relaxed">
          {labels[workspace as keyof typeof labels]} 워크스페이스에 블록이 없어요.
          <br />
          왼쪽 [블록] 모드에서 블록을 끌어다 놓아보세요.
        </p>
      </div>
    </div>
  );
}

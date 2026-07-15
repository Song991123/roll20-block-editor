'use client';

/**
 * EditLayerRow — one row of the edit layer tree.
 *
 * Data-attribute contract (data-r20-layer-*, data-testid) is asserted by
 * scripts/edit_flow_browser_smoke.mjs; keep attributes and badge texts stable
 * when restyling.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { getBlocklyAdapter, type BlockSnapshot } from '@/lib/blockly/adapter';
import { getLayerRole } from '@/lib/editor/layerRoles';
import { formatDropModeLabel, type LayerDropMode } from '@/lib/editor/dropOverlay';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils/cn';

const LAYER_MINI_CHILD_SLOTS = 4;

export function formatLayerRelationLabel(relation: BlockSnapshot['layerRelation']): string {
  if (relation === 'child') return '하위';
  if (relation === 'sibling') return '흐름 형제';
  return '루트';
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
  const isRuntime = role.kind === 'runtime';
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
        const mode = pickMode(e);
        // Write the attribute synchronously: dragover fires continuously and
        // the React commit can lag a frame behind the pointer.
        e.currentTarget.setAttribute('data-r20-layer-drop-mode', mode);
        setDropMode(mode);
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
          ? 'ring-1 ring-sky-400/80'
          : dropMode === 'before'
            ? 'shadow-[inset_0_2px_0_rgba(96,165,250,0.95)]'
            : dropMode === 'after'
              ? 'shadow-[inset_0_-2px_0_rgba(96,165,250,0.95)]'
              : ''
      } ${isRuntime ? 'opacity-70' : ''}`}
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
          role.canReceiveChildren ? 'bg-sky-400/70' : 'bg-zinc-500/45',
          node.layerRelation === 'child' && 'bg-emerald-400/70',
          selected && 'bg-orange-400',
        )}
      />
      {dropMode && (
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 rounded bg-sky-500 px-1.5 py-0.5 text-[9px] font-medium text-white">
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
            <span className="shrink-0 rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-200">
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
          {isRuntime && (
            <span
              data-testid="edit-layer-runtime-badge"
              title="실행 전용 노드는 시트 화면에 보이지 않습니다."
              className="shrink-0 rounded border border-zinc-500/50 bg-zinc-500/10 px-1.5 py-0.5 text-[9px] text-zinc-300"
            >
              화면 밖
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

export default EditLayerRow;

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
            ? 'border-sky-400/60 bg-sky-400/10'
            : 'border-border/70 bg-[var(--bg-elevated-2)]',
      )}
    >
      <span
        className={cn(
          'relative block h-3 rounded-[3px] border',
          isContainer
            ? 'border-sky-300/70 bg-sky-400/10'
            : 'border-zinc-500/50 bg-zinc-500/15',
          roleKind === 'table' && 'border-indigo-300/80 bg-indigo-400/10',
          roleKind === 'flow' && 'border-cyan-300/80 bg-cyan-400/10',
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
              canReceiveChildren ? 'bg-sky-200/85' : 'bg-zinc-300/55',
            )}
            style={{
              left: `${9 + idx * 5}px`,
              width: childCount > LAYER_MINI_CHILD_SLOTS && idx === LAYER_MINI_CHILD_SLOTS - 1 ? '5px' : '3px',
            }}
          />
        ))}
        {childCount > LAYER_MINI_CHILD_SLOTS && (
          <span className="absolute right-[2px] top-[1px] h-[2px] w-[2px] rounded-full bg-sky-100/90" />
        )}
      </span>
    </span>
  );
}

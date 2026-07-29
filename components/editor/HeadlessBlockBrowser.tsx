'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import {
  getBlocklyAdapter,
  type BlockSnapshot,
} from '@/lib/blockly/adapter';
import { CATEGORIES } from '@/lib/blocks/types';
import {
  useWorkspaceStore,
  type WorkspaceKey,
} from '@/lib/stores/workspaceStore';

const ROW_HEIGHT = 44;
const OVERSCAN_ROWS = 8;
const VIEWPORT_HEIGHT = 360;

interface Props {
  workspace: WorkspaceKey;
  mountState: 'pending' | 'ready' | 'error';
}

/**
 * Large workspaces stay headless because one SVG node per block can freeze the
 * browser. This list keeps the same model editable through the inspector while
 * rendering only the rows currently near the viewport.
 */
export default function HeadlessBlockBrowser({ workspace, mountState }: Props) {
  const structureVersion = useWorkspaceStore(
    (state) => state.workspaces[workspace].structureVersion,
  );
  const selectedBlockId = useWorkspaceStore((state) => state.selectedBlockId);
  const setSelectedBlockId = useWorkspaceStore((state) => state.setSelectedBlockId);
  const [query, setQuery] = useState('');
  const [scrollState, setScrollState] = useState({ key: '', top: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => {
    if (mountState !== 'ready') return [];
    // The version is a cheap external change signal for the headless model.
    void structureVersion;
    return getBlocklyAdapter().listAllBlocks(workspace);
  }, [mountState, structureVersion, workspace]);

  const filteredBlocks = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return blocks;
    return blocks.filter((block) =>
      [block.label, block.type, block.preview]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(needle)),
    );
  }, [blocks, query]);

  const scrollKey = `${workspace}:${query}`;
  const scrollTop = scrollState.key === scrollKey ? scrollState.top : 0;

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [query, workspace]);

  const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const lastRow = Math.min(
    filteredBlocks.length,
    Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN_ROWS,
  );
  const visibleBlocks = filteredBlocks.slice(firstRow, lastRow);

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col bg-[var(--bg-canvas)]/96 p-4"
      data-testid="large-workspace-browser"
      data-r20-large-workspace-notice="true"
      data-r20-headless-browser="true"
    >
      <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-sm">
        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">큰 시트 구조</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              블록 모양을 전부 그리지 않고 목록으로 보여줘서, 큰 시트도 멈추지 않고 선택할 수 있어요.
              항목을 고르면 오른쪽 속성 패널에서 내용을 바꿀 수 있습니다.
            </p>
          </div>
          <span
            className="shrink-0 rounded-full bg-[var(--bg-elevated-2)] px-2.5 py-1 text-xs font-medium text-muted-foreground"
            data-testid="large-workspace-count"
          >
            {blocks.length.toLocaleString()}개
          </span>
        </div>

        <label className="relative mx-4 mt-3 shrink-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="sr-only">구조 검색</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="이름, 블록 종류, 미리보기로 찾기"
            className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            data-testid="large-workspace-search"
          />
        </label>

        <div className="mx-4 my-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2 text-xs text-muted-foreground">
            <span>{filteredBlocks.length.toLocaleString()}개 표시</span>
            <span>선택한 항목은 속성 패널에서 편집</span>
          </div>
          <div
            ref={viewportRef}
            className="relative overflow-y-auto overscroll-contain"
            style={{ height: VIEWPORT_HEIGHT }}
            onScroll={(event) =>
              setScrollState({ key: scrollKey, top: event.currentTarget.scrollTop })
            }
            data-testid="large-workspace-list"
          >
            {filteredBlocks.length > 0 ? (
              <div style={{ height: filteredBlocks.length * ROW_HEIGHT, position: 'relative' }}>
                {visibleBlocks.map((block, offset) => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    selected={block.id === selectedBlockId}
                    top={(firstRow + offset) * ROW_HEIGHT}
                    onSelect={() => setSelectedBlockId(block.id, 'tree')}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-center text-sm text-muted-foreground">
                {mountState === 'ready' ? '조건에 맞는 항목이 없어요.' : '구조를 불러오는 중이에요.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlockRow({
  block,
  selected,
  top,
  onSelect,
}: {
  block: BlockSnapshot;
  selected: boolean;
  top: number;
  onSelect: () => void;
}) {
  const category = block.category ? CATEGORIES[block.category] : null;
  return (
    <button
      type="button"
      className={`absolute left-0 right-0 flex h-[44px] items-center gap-2 border-b border-[var(--border-subtle)] px-3 text-left transition ${
        selected
          ? 'bg-[var(--primary)]/10 text-foreground'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated-2)]'
      }`}
      style={{ top }}
      onClick={onSelect}
      data-testid="large-workspace-row"
      data-block-id={block.id}
      data-selected={selected ? 'true' : 'false'}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
        style={{
          marginLeft: Math.min(block.depth, 10) * 14,
          backgroundColor: category?.swatchVar ?? 'var(--border-strong)',
        }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{block.label}</span>
      {block.preview && (
        <span className="max-w-[32%] truncate text-xs text-muted-foreground">{block.preview}</span>
      )}
      <span className="shrink-0 text-[11px] text-muted-foreground">{category?.label ?? '기타'}</span>
    </button>
  );
}

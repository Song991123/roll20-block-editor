'use client';

import { useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/lib/stores/uiStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import {
  CATEGORIES,
  CATEGORY_ORDER,
  type BlockCategory,
} from '@/lib/blocks/types';
import { blocksByCategory, searchBlocks } from '@/lib/blocks/registry';
import { cn } from '@/lib/utils/cn';

/**
 * 좌측 [블록] 모드 — 카테고리 9개 + 검색 + drag source.
 *
 * Anchor: docs/spec/08_wireframes.md W2-A + 04_block_taxonomy_v2.md §3.
 *
 * default 5 카테고리 노출 + "고급" 토글로 4 더 노출.
 * 블록 카탈로그 비어있을 때 = 친화 placeholder ("Stage A 에서 130 블록 추가 예정").
 */
export default function BlocksLibrary() {
  const search = useUiStore((s) => s.blocksSearch);
  const setSearch = useUiStore((s) => s.setBlocksSearch);
  const expanded = useUiStore((s) => s.blocksExpandedCategories);
  const toggleCat = useUiStore((s) => s.toggleBlocksCategory);
  const advShown = useUiStore((s) => s.blocksAdvancedShown);
  const setAdvShown = useUiStore((s) => s.setBlocksAdvancedShown);
  const showAdvSetting = useSettingsStore((s) => s.showAdvancedCategories);

  const showAdvanced = advShown || showAdvSetting;

  const visibleCategories = useMemo<BlockCategory[]>(
    () => CATEGORY_ORDER.filter((id) => showAdvanced || !CATEGORIES[id].advanced),
    [showAdvanced],
  );

  const searchResults = useMemo(() => (search.trim() ? searchBlocks(search) : []), [search]);

  return (
    <div className="flex h-full flex-col">
      {/* 검색 */}
      <div className="shrink-0 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="블록 검색…"
            className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {/* 검색 결과 */}
          {search.trim() && (
            <div className="space-y-1 pb-2">
              <div className="px-2 py-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                검색 결과 ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  매칭되는 블록이 없어요.
                </div>
              ) : (
                searchResults.map((b) => (
                  <BlockTile key={b.type} type={b.type} label={b.label} category={b.category} />
                ))
              )}
            </div>
          )}

          {/* 카테고리 트리 */}
          {!search.trim() && (
            <div className="space-y-1">
              {visibleCategories.map((catId) => {
                const meta = CATEGORIES[catId];
                const isOpen = expanded.includes(catId);
                const blocks = blocksByCategory(catId);
                return (
                  <div key={catId}>
                    <button
                      type="button"
                      onClick={() => toggleCat(catId)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-[var(--bg-hover)]"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: meta.swatchVar }}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{meta.label}</span>
                      <Badge variant="secondary" className="font-mono">
                        {blocks.length}
                      </Badge>
                    </button>

                    {isOpen && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                        {blocks.length === 0 ? (
                          <div className="py-1.5 pl-2 text-[10.5px] italic text-muted-foreground">
                            카탈로그 작성 중…
                          </div>
                        ) : (
                          blocks.map((b) => (
                            <BlockTile
                              key={b.type}
                              type={b.type}
                              label={b.label}
                              category={b.category}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 고급 토글 */}
              {!showAdvanced && (
                <button
                  type="button"
                  onClick={() => setAdvShown(true)}
                  className="mt-2 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground"
                >
                  <Sparkles className="h-3 w-3" />▾ 고급 카테고리 (4) 펼치기
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function BlockTile({
  type,
  label,
  category,
}: {
  type: string;
  label: string;
  category: BlockCategory;
}) {
  const meta = CATEGORIES[category];
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-r20-block-type', type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-foreground transition-colors',
        'hover:bg-[var(--bg-hover)] active:bg-[var(--bg-active)]',
        'cursor-grab focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.swatchVar }}
        aria-hidden
      />
      <span className="truncate">{label}</span>
      <span className="ml-auto truncate text-[9.5px] font-mono text-muted-foreground/70">{type}</span>
    </button>
  );
}

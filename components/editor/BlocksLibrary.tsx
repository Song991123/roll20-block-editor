'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Search, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import * as Blockly from 'blockly';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/lib/stores/uiStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import {
  CATEGORIES,
  CATEGORY_ORDER,
  type BlockCategory,
  type BlockDef,
} from '@/lib/blocks/types';
import {
  blocksByCategory,
  searchBlocks,
  subscribeBlocksRegistry,
  getRegistryVersion,
} from '@/lib/blocks/registry';
import { cn } from '@/lib/utils/cn';

/**
 * 좌측 [블록] 모드. Anchor: 08 W2-A + 02 §3 + D26 ②.
 *
 * Stage A-1.5:
 *   - 각 BlockDef 를 Blockly 의 진짜 SVG 블록으로 렌더 (read-only mini workspace).
 *   - 블록 클릭 / 드래그 → 활성 워크스페이스 (BlocklyModelHost 안) 에 추가.
 *   - 추가 후 워크스페이스 changeListener → store xmlCache → 미리보기 갱신.
 *
 * BlocklyModelHost 의 useEffect 가 registerAllBlocks → registry 가 본 컴포넌트에 통지.
 */
export default function BlocksLibrary() {
  const search = useUiStore((s) => s.blocksSearch);
  const setSearch = useUiStore((s) => s.setBlocksSearch);
  const expanded = useUiStore((s) => s.blocksExpandedCategories);
  const toggleCat = useUiStore((s) => s.toggleBlocksCategory);
  const advShown = useUiStore((s) => s.blocksAdvancedShown);
  const setAdvShown = useUiStore((s) => s.setBlocksAdvancedShown);
  const showAdvSetting = useSettingsStore((s) => s.showAdvancedCategories);

  useSyncExternalStore(subscribeBlocksRegistry, getRegistryVersion, () => 0);

  const showAdvanced = advShown || showAdvSetting;

  const visibleCategories = useMemo<BlockCategory[]>(
    () => CATEGORY_ORDER.filter((id) => showAdvanced || !CATEGORIES[id].advanced),
    [showAdvanced],
  );

  const searchResults = useMemo(() => (search.trim() ? searchBlocks(search) : []), [search]);

  return (
    <div className="flex h-full flex-col">
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
          {search.trim() && (
            <div className="space-y-1 pb-2">
              <div className="px-2 py-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                검색 결과 ({searchResults.length})
              </div>
              {searchResults.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">매칭되는 블록이 없어요.</div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((b) => (
                    <BlockTile key={b.type} def={b} />
                  ))}
                </div>
              )}
            </div>
          )}

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
                        className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-white/5"
                        style={{ backgroundColor: meta.swatchVar }}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{meta.label}</span>
                      <Badge variant="secondary" className="font-mono">{blocks.length}</Badge>
                    </button>

                    {isOpen && (
                      <div
                        className="mt-1 space-y-1 border-l border-l-[1.5px] pl-2 ml-[7px]"
                        style={{ borderColor: `color-mix(in srgb, ${meta.swatchVar} 60%, transparent)` }}
                      >
                        {blocks.length === 0 ? (
                          <div className="py-1.5 pl-2 text-[10.5px] italic text-muted-foreground">카탈로그 작성 중…</div>
                        ) : (
                          blocks.map((b) => <BlockTile key={b.type} def={b} />)
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

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

/**
 * 단일 BlockDef 를 카드로 렌더 — 진짜 Blockly SVG 블록 미리보기 + 라벨 + 클릭/드래그.
 *
 * Blockly inject 로 read-only mini workspace 를 만들고, 그 안에 BlockDef.type 의
 * 블록 인스턴스 1개를 배치 → SVG 그대로 사용자에게 보임. shape (둥근/육각/스택) 과
 * 카테고리 hue 가 Blockly Zelos renderer 에 의해 자동 처리.
 */
function BlockTile({ def }: { def: BlockDef }) {
  const meta = CATEGORIES[def.category];
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspace);
  const renderer = useSettingsStore((s) => s.blocklyRenderer);

  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const blocklyWsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [previewHeight, setPreviewHeight] = useState<number>(36);

  // mini workspace + 단일 블록 inject.
  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;
    if (blocklyWsRef.current) {
      try { blocklyWsRef.current.dispose(); } catch { /* noop */ }
      blocklyWsRef.current = null;
    }
    host.innerHTML = '';
    try {
      const ws = Blockly.inject(host, {
        readOnly: true,
        renderer,
        toolbox: null as unknown as undefined,
        trashcan: false,
        scrollbars: false,
        sounds: false,
        move: { scrollbars: false, drag: false, wheel: false },
        zoom: { controls: false, wheel: false, startScale: 0.8 },
      }) as Blockly.WorkspaceSvg;
      const block = ws.newBlock(def.type);
      block.initSvg();
      block.render();
      block.moveBy(6, 4);
      const heightWidth = block.getHeightWidth();
      const h = Math.max(36, Math.ceil(heightWidth.height * 0.8) + 12);
      setPreviewHeight(h);
      blocklyWsRef.current = ws;
    } catch (err) {
      console.warn('[BlocksLibrary] mini preview inject failed', def.type, err);
    }
    return () => {
      if (blocklyWsRef.current) {
        try { blocklyWsRef.current.dispose(); } catch { /* noop */ }
        blocklyWsRef.current = null;
      }
    };
  }, [def.type, renderer]);

  const handleAdd = useCallback(() => {
    const id = appendBlock(def.type);
    if (id) {
      toast(`'${def.label}' 블록 추가됨 — ${activeWs.toUpperCase()} 워크스페이스`, { duration: 1600 });
    } else {
      toast.error('블록 추가 실패 (워크스페이스 미연결?)', { duration: 2200 });
    }
  }, [appendBlock, def.label, def.type, activeWs]);

  return (
    <div
      className={cn(
        'group relative rounded-md border border-transparent bg-[var(--bg-elevated)]/40 px-1 py-0.5 transition-colors',
        'hover:border-border hover:bg-[var(--bg-hover)]',
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-r20-block-type', def.type);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      title={def.tooltip}
    >
      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full items-stretch gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-grab active:cursor-grabbing"
        aria-label={`${def.label} 블록 추가`}
      >
        <div
          ref={previewHostRef}
          className="blocks-library-preview relative shrink-0 overflow-hidden rounded-sm"
          style={{
            width: 138,
            height: previewHeight,
            background: 'transparent',
          }}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
          <span className="truncate text-xs text-foreground">{def.label}</span>
          <span className="truncate font-mono text-[9.5px] text-muted-foreground/70">{def.type}</span>
          <span className="mt-0.5 inline-flex items-center gap-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: meta.swatchVar }}
              aria-hidden
            />
            <span className="text-[9.5px] text-muted-foreground/70">
              {def.shape === 'reporter' ? '값 (둥근)' : def.shape === 'boolean' ? '참/거짓 (육각)' : def.shape}
            </span>
          </span>
        </div>
      </button>
    </div>
  );
}

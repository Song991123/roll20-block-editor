'use client';

import * as React from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Search, ChevronDown, ChevronRight, Sparkles, X, Star } from 'lucide-react';
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
  getAllBlocks,
} from '@/lib/blocks/registry';
import { cn } from '@/lib/utils/cn';
import { playSfx } from '@/lib/sfx';

/**
 * 좌측 [블록] 모드. Anchor: 08 W2-A + 02 §3 + D26 ②.
 *
 * Stage A-1.5:
 *   - 각 BlockDef 를 Blockly 의 진짜 SVG 블록으로 렌더 (read-only mini workspace).
 *   - 블록 클릭 / 드래그 → 활성 워크스페이스 (BlocklyModelHost 안) 에 추가.
 *   - 추가 후 워크스페이스 changeListener → store structureVersion bump → 미리보기 갱신.
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
  const blockFavorites = useSettingsStore((s) => s.blockFavorites);
  const isFavoritesOpen = useUiStore((s) => s.blocksExpandedCategories.includes('__favorites__'));
  // 즐겨찾기 BlockDef 배열 — 등록 안 된 type 은 자동 제외 (registry 변경 안전).
  const favoriteBlocks = useMemo(() => {
    if (blockFavorites.length === 0) return [] as BlockDef[];
    const all = getAllBlocks();
    const byType = new Map(all.map((b) => [b.type, b]));
    return blockFavorites.map((t) => byType.get(t)).filter((b): b is BlockDef => Boolean(b));
  }, [blockFavorites]);


  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useSyncExternalStore(subscribeBlocksRegistry, getRegistryVersion, () => 0);

  const showAdvanced = advShown || showAdvSetting;

  const visibleCategories = useMemo<BlockCategory[]>(
    () => CATEGORY_ORDER.filter((id) => showAdvanced || !CATEGORIES[id].advanced),
    [showAdvanced],
  );

  // 고급 카테고리 개수 — "고급 블록 더 보기 (N종)" 의 N. CATEGORIES advanced 플래그가
  // 진실의 원천이므로 카테고리 추가/삭제 시 자동 반영. 시스템 specific 토큰 0.
  const advancedCategoryCount = useMemo(
    () => CATEGORY_ORDER.filter((id) => CATEGORIES[id].advanced).length,
    [],
  );

  const searchResults = useMemo(() => (search.trim() ? searchBlocks(search) : []), [search]);

  // 검색 결과를 카테고리별로 그룹화 — CATEGORY_ORDER 순서 유지, 빈 그룹은 생략.
  // useMemo deps 가 searchResults 면 flat array 새로 만들 때마다 재계산 — 의도된 동작.
  const searchResultsByCategory = useMemo(() => {
    if (searchResults.length === 0) return [] as { catId: BlockCategory; blocks: BlockDef[] }[];
    const map = new Map<BlockCategory, BlockDef[]>();
    for (const b of searchResults) {
      const arr = map.get(b.category);
      if (arr) arr.push(b);
      else map.set(b.category, [b]);
    }
    return CATEGORY_ORDER
      .filter((id) => map.has(id))
      .map((id) => ({ catId: id, blocks: map.get(id)! }));
  }, [searchResults]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="블록 검색 — 예: 텍스트, 굴림, 자동합"
            className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] pl-8 pr-7 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                // focus input 후 → 다음 검색어 즉시 입력 가능
                requestAnimationFrame(() => searchInputRef.current?.focus());
              }}
              aria-label="검색어 지우기"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
                <div className="space-y-2">
                  {searchResultsByCategory.map(({ catId, blocks }) => {
                    const meta = CATEGORIES[catId];
                    return (
                      <div key={catId} className="relative">
                        {/* 검색 결과 안 카테고리 헤더 — 본 카테고리 헤더와 동일 sticky/색 스킴 + 펼침 토글 없음 (항상 열림). */}
                        <div
                          className="blocks-cat-header sticky top-0 z-[5] flex w-full items-center gap-2 rounded-md px-2 py-1.5 pl-3 text-left text-xs font-medium text-foreground backdrop-blur-sm"
                          style={{
                            borderLeft: `4px solid ${meta.swatchVar}`,
                            background: `color-mix(in srgb, ${meta.swatchVar} 12%, var(--bg-elevated))`,
                          }}
                        >
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-white/10 shadow-[0_0_0_2px_rgba(0,0,0,0.15)]"
                            style={{ backgroundColor: meta.swatchVar }}
                            aria-hidden
                          />
                          <span className="flex-1 truncate">{meta.label}</span>
                          <Badge variant="secondary" className="font-mono">{blocks.length}</Badge>
                        </div>
                        <div
                          className="mt-1 space-y-1 border-l border-l-[1.5px] pl-2 ml-[7px]"
                          style={{ borderColor: `color-mix(in srgb, ${meta.swatchVar} 60%, transparent)` }}
                        >
                          {blocks.map((b) => <BlockTile key={b.type} def={b} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!search.trim() && (
            <div className="space-y-1">
              {/* ⭐ 즐겨찾기 가상 카테고리 — favoriteBlocks 0 일 때 헤더 자체 숨김. */}
              {favoriteBlocks.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleCat('__favorites__')}
                    aria-expanded={isFavoritesOpen}
                    aria-controls="block-category-__favorites__"
                    className="blocks-cat-header sticky top-0 z-[5] flex w-full items-center gap-2 rounded-md px-2 py-1.5 pl-3 text-left text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-[color-mix(in_srgb,var(--bg-hover)_70%,transparent)]"
                    style={{
                      borderLeft: `4px solid #FFC857`,
                      background: isFavoritesOpen
                        ? `color-mix(in srgb, #FFC857 14%, var(--bg-elevated))`
                        : `color-mix(in srgb, #FFC857 6%, var(--bg-elevated))`,
                    }}
                  >
                    {isFavoritesOpen ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <Star className="h-3 w-3 shrink-0 fill-[#FFC857] text-[#FFC857]" />
                    <span className="flex-1 truncate">즐겨찾기</span>
                    <Badge variant="secondary" className="font-mono">{favoriteBlocks.length}</Badge>
                  </button>
                  <div
                    id="block-category-__favorites__"
                    className={cn(
                      'blocks-cat-body grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                      isFavoritesOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                    style={{ willChange: isFavoritesOpen ? 'grid-template-rows' : 'auto' }}
                    aria-hidden={!isFavoritesOpen}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div
                        className="mt-1 space-y-1 border-l border-l-[1.5px] pl-2 ml-[7px]"
                        style={{ borderColor: 'color-mix(in srgb, #FFC857 60%, transparent)' }}
                      >
                        {favoriteBlocks.map((b) => <BlockTile key={b.type} def={b} />)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {visibleCategories.map((catId) => {
                const meta = CATEGORIES[catId];
                const isOpen = expanded.includes(catId);
                const blocks = blocksByCategory(catId);
                return (
                  <div key={catId} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleCat(catId)}
                      aria-expanded={isOpen}
                      aria-controls={`block-category-${catId}`}
                      className="blocks-cat-header sticky top-0 z-[5] flex w-full items-center gap-2 rounded-md px-2 py-1.5 pl-3 text-left text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-[color-mix(in_srgb,var(--bg-hover)_70%,transparent)]"
                      style={{
                        borderLeft: `4px solid ${meta.swatchVar}`,
                        background: isOpen
                          ? `color-mix(in srgb, ${meta.swatchVar} 14%, var(--bg-elevated))`
                          : `color-mix(in srgb, ${meta.swatchVar} 6%, var(--bg-elevated))`,
                      }}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-white/10 shadow-[0_0_0_2px_rgba(0,0,0,0.15)]"
                        style={{ backgroundColor: meta.swatchVar }}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{meta.label}</span>
                      <Badge variant="secondary" className="font-mono">{blocks.length}</Badge>
                    </button>

                    {/*
                      collapse 애니메이션: grid-template-rows 0fr ↔ 1fr trick.
                      - 항상 DOM 렌더 → 닫혀도 IntersectionObserver 가 BlockTile inject 못 막음 (lazy 유지).
                      - 닫힌 상태에서는 inner overflow hidden + max-height 0 → 시각적으로 깔끔히 접힘.
                      - 200ms ease-out + will-change 는 열림 transition 동안만 (perf 영향 최소).
                    */}
                    <div
                      id={`block-category-${catId}`}
                      className={cn(
                        'blocks-cat-body grid transition-[grid-template-rows,opacity] duration-200 ease-out',
                        isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                      )}
                      style={{ willChange: isOpen ? 'grid-template-rows' : 'auto' }}
                      aria-hidden={!isOpen}
                    >
                      <div className="min-h-0 overflow-hidden">
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
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 고급 카테고리 토글 — settings 로 강제 노출시엔 숨김. */}
              {!showAdvSetting && (
                <>
                  <div className="my-2 h-px bg-[var(--border-subtle)]" aria-hidden />
                  <button
                    type="button"
                    onClick={() => setAdvShown(!advShown)}
                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground"
                    aria-expanded={advShown}
                  >
                    <Sparkles className="h-3 w-3 shrink-0" />
                    {advShown ? (
                      <>
                        <ChevronDown className="h-3 w-3 shrink-0" />
                        <span>고급 블록 접기</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <span>고급 블록 더 보기 ({advancedCategoryCount}종)</span>
                      </>
                    )}
                  </button>
                </>
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
  const blockFavorites = useSettingsStore((s) => s.blockFavorites);
  const toggleBlockFavorite = useSettingsStore((s) => s.toggleBlockFavorite);
  const isFavorite = blockFavorites.includes(def.type);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspace);
  const renderer = useSettingsStore((s) => s.blocklyRenderer);

  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const blocklyWsRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number }>({ w: 144, h: 36 });
  // Hot path #2: IntersectionObserver lazy mount — viewport 밖 tile 은 inject 안 함.
  // baseline 00 §1.4: 138 tile × ~120ms inject = ~16s worst-case main-thread block.
  // 처음엔 visible=false → skeleton 만 render → IO 가 onScreen 알려주면 그때 mount.
  const [isOnScreen, setIsOnScreen] = useState(false);

  useEffect(() => {
    const host = previewHostRef.current;
    if (!host) return;
    // IO unsupported (Safari < 12.1, jsdom) → 즉시 mount (회귀 방지).
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setIsOnScreen(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsOnScreen(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: '500px' }, // Phase 5: hidden-tab 환경 + 빠른 스크롤 시 BlockTile 시각 깨짐 줄이려 120→500 (5x). pre-mount cost 는 isOnScreen gate + Blockly inject 자체의 lazy 로 흡수.
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // mini workspace + 단일 블록 inject — isOnScreen 일 때만.
  useEffect(() => {
    if (!isOnScreen) return;
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
      const hw = block.getHeightWidth();
      // 블록 자연 폭 측정 후 144px 컨테이너에 맞도록 scale 재조정 (PADDING 14 = left 6 + right margin 8).
      const TARGET_W = 144;
      const TARGET_PAD = 14;
      const usableW = TARGET_W - TARGET_PAD;
      const fitScale = Math.min(0.85, usableW / Math.max(1, hw.width));
      const safeScale = Math.max(0.35, fitScale);
      ws.setScale(safeScale);
      const h = Math.max(36, Math.ceil(hw.height * safeScale) + 12);
      // 컨테이너 dim 을 DOM 에 즉시 반영 (React reconciliation 전).
      // SVG width/height attr 는 Blockly.svgResize() 명시 호출돼야 갱신 — 안 하면 SVG 가 36px 에 고정돼 c-shape 블록이 세로 잘림.
      host.style.width = `${TARGET_W}px`;
      host.style.height = `${h}px`;
      try { Blockly.svgResize(ws); } catch { /* noop */ }
      setPreviewSize({ w: TARGET_W, h });
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
  }, [def.type, renderer, isOnScreen]);

  const handleAdd = useCallback(() => {
    const id = appendBlock(def.type);
    if (id) {
      playSfx('block.add');
      toast(`'${def.label}' 블록 추가됨 — ${activeWs.toUpperCase()} 워크스페이스`, { duration: 1600 });
    } else {
      playSfx('toast.error');
      toast.error('블록 추가 실패 (워크스페이스 미연결?)', { duration: 2200 });
    }
  }, [appendBlock, def.label, def.type, activeWs]);

  return (
    <div
      className={cn(
        'group relative rounded-md border border-transparent bg-[var(--bg-elevated)]/40 pl-2 pr-1 py-0',
        'transition-all duration-150 ease-out',
        'hover:bg-[color-mix(in_srgb,var(--swatch)_10%,var(--bg-hover))]',
        'hover:ring-1 hover:ring-inset hover:ring-[color-mix(in_srgb,var(--swatch)_35%,transparent)]',
        'active:translate-y-px active:bg-[color-mix(in_srgb,var(--swatch)_18%,var(--bg-hover))]',
        'focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--swatch)]/60',
      )}
      style={{
        boxShadow: `inset 3px 0 0 ${meta.swatchVar}`,
        ['--swatch' as string]: meta.swatchVar,
      } as React.CSSProperties}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-r20-block-type', def.type);
        e.dataTransfer.effectAllowed = 'copy';
        // 네이티브 drag image 가 Blockly SVG 를 캡처하면 ghost trail (residual frame) 이 남음.
        // → label 만 들어간 lightweight ghost 로 치환.
        try {
          const ghost = document.createElement('div');
          ghost.textContent = def.label;
          ghost.style.cssText =
            'position:fixed;top:-9999px;left:-9999px;padding:4px 10px;border-radius:6px;' +
            'background:#262626;color:#ECECEC;font:12px/1.2 Pretendard,system-ui,sans-serif;' +
            'border:1px solid #404040;white-space:nowrap;pointer-events:none;';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 8, 12);
          setTimeout(() => ghost.remove(), 0);
        } catch { /* setDragImage 미지원 환경 — fallback to default */ }
      }}
      title={`${def.label}\n${def.tooltip}\n[${def.type}]`}
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
            width: previewSize.w,
            height: previewSize.h,
            background: 'transparent',
          }}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-white/10"
            style={{ backgroundColor: meta.swatchVar }}
            aria-hidden
          />
          <span className="truncate text-[12px] leading-tight text-foreground">{def.label}</span>
        </div>
      </button>
      {/* 별 아이콘 — 우상단 overlay. 클릭 시 즐겨찾기 토글. 외부 <button> 안에 nested 하지 않으려 sibling 으로. */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleBlockFavorite(def.type);
        }}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? `${def.label} 즐겨찾기 해제` : `${def.label} 즐겨찾기 추가`}
        title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        className={cn(
          'absolute right-1 top-1 z-[1] flex h-5 w-5 items-center justify-center rounded-sm',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100',
          'hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          isFavorite && 'opacity-100',
        )}
      >
        <Star
          className={cn(
            'h-3 w-3',
            isFavorite ? 'fill-[#FFC857] text-[#FFC857]' : 'text-muted-foreground',
          )}
        />
      </button>
    </div>
  );
}

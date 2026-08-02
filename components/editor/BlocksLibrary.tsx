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
import {
  Search, ChevronDown, ChevronRight, Sparkles, X, Star,
  Boxes, TextCursorInput, Type, Dices, Languages, Calculator, Zap, Palette, Wrench, Package,
  type LucideIcon,
} from 'lucide-react';
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
import { categoryDisplayLabel } from './fieldLabels';

const BLOCKLY_MEDIA_PATH = 'blockly-media/';

/** 카테고리 아이콘 (표시 전용) — 색과 함께 종류를 이중으로 알려줘 색약에도 안전. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  container: Boxes,
  input: TextCursorInput,
  display: Type,
  dice: Dices,
  i18n: Languages,
  expression: Calculator,
  sheet_worker: Zap,
  css: Palette,
  advanced: Wrench,
  composite: Package,
};

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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="블록 찾기 — 예: 글자, 굴림"
            aria-label="블록 검색"
            className="r20-input pl-9 pr-9"
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
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {search.trim() && (
            <div className="space-y-1 pb-2">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                검색 결과 {searchResults.length}개
              </div>
              {searchResults.length === 0 ? (
                <div className="px-2 py-3 text-sm leading-relaxed text-muted-foreground">맞는 블록이 없어요. 다른 말로 찾아보세요.</div>
              ) : (
                <div className="space-y-2">
                  {searchResultsByCategory.map(({ catId, blocks }) => {
                    const meta = CATEGORIES[catId];
                    const CatIcon = CATEGORY_ICONS[catId] ?? Package;
                    return (
                      <div key={catId} className="relative">
                        {/* 검색 결과 안 카테고리 헤더 — 본 카테고리 헤더와 동일 sticky/색 스킴 + 펼침 토글 없음 (항상 열림). */}
                        <div
                          className="blocks-cat-header sticky top-0 z-[5] flex w-full items-center gap-2 rounded-lg px-2 py-2 pl-3 text-left text-sm font-semibold text-foreground backdrop-blur-sm"
                          style={{
                            borderLeft: `4px solid ${meta.swatchVar}`,
                            background: `color-mix(in srgb, ${meta.swatchVar} 12%, var(--bg-elevated))`,
                          }}
                        >
                          <CatIcon
                            className="h-[17px] w-[17px] shrink-0"
                            style={{ color: `color-mix(in srgb, ${meta.swatchVar} 72%, var(--text-primary))` }}
                            aria-hidden
                          />
                          <span className="flex-1 truncate">{categoryDisplayLabel(catId, meta.label)}</span>
                          <Badge variant="secondary" className="tabular-nums">{blocks.length}</Badge>
                        </div>
                        <div
                          className="mt-1.5 space-y-1.5 border-l border-l-[1.5px] pl-2 ml-[7px]"
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
                    className="blocks-cat-header sticky top-0 z-[5] flex w-full items-center gap-2 rounded-lg px-2 py-2 pl-3 text-left text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-[color-mix(in_srgb,var(--bg-hover)_70%,transparent)]"
                    style={{
                      borderLeft: `4px solid #FFC857`,
                      background: isFavoritesOpen
                        ? `color-mix(in srgb, #FFC857 14%, var(--bg-elevated))`
                        : `color-mix(in srgb, #FFC857 6%, var(--bg-elevated))`,
                    }}
                  >
                    {isFavoritesOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Star className="h-4 w-4 shrink-0 fill-[#FFC857] text-[#FFC857]" />
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
                const CatIcon = CATEGORY_ICONS[catId] ?? Package;
                const isOpen = expanded.includes(catId);
                const blocks = blocksByCategory(catId);
                return (
                  <div key={catId} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleCat(catId)}
                      aria-expanded={isOpen}
                      aria-controls={`block-category-${catId}`}
                      className="blocks-cat-header sticky top-0 z-[5] flex w-full items-center gap-2 rounded-lg px-2 py-2 pl-3 text-left text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-[color-mix(in_srgb,var(--bg-hover)_70%,transparent)]"
                      style={{
                        borderLeft: `4px solid ${meta.swatchVar}`,
                        background: isOpen
                          ? `color-mix(in srgb, ${meta.swatchVar} 14%, var(--bg-elevated))`
                          : `color-mix(in srgb, ${meta.swatchVar} 6%, var(--bg-elevated))`,
                      }}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <CatIcon
                        className="h-[17px] w-[17px] shrink-0"
                        style={{ color: `color-mix(in srgb, ${meta.swatchVar} 72%, var(--text-primary))` }}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{categoryDisplayLabel(catId, meta.label)}</span>
                      <Badge variant="secondary" className="tabular-nums">{blocks.length}</Badge>
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
                          className="mt-1.5 space-y-1.5 border-l border-l-[1.5px] pl-2 ml-[7px]"
                          style={{ borderColor: `color-mix(in srgb, ${meta.swatchVar} 60%, transparent)` }}
                        >
                          {blocks.length === 0 ? (
                            <div className="py-1.5 pl-2 text-xs italic text-muted-foreground">블록 준비 중이에요…</div>
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
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground"
                    aria-expanded={advShown}
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    {advShown ? (
                      <>
                        <ChevronDown className="h-4 w-4 shrink-0" />
                        <span>능숙한 사람용 블록 접기</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                        <span>능숙한 사람용 블록 더 보기 ({advancedCategoryCount}종)</span>
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
        media: BLOCKLY_MEDIA_PATH,
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
      toast(`'${def.label}' 추가 완료`, { duration: 1600 });
    } else {
      playSfx('toast.error');
      toast.error('추가하지 못했어요. 잠시 후 다시 시도해 주세요.', { duration: 2200 });
    }
  }, [appendBlock, def.label, def.type]);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-[var(--border-subtle)] border-l-4 bg-[var(--bg-elevated)]',
        'shadow-[0_1px_2px_rgba(var(--shadow-tint),0.05)] transition-all duration-150 ease-out',
        'hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--swatch)_40%,var(--border-subtle))] hover:bg-[color-mix(in_srgb,var(--swatch)_6%,var(--bg-elevated))] hover:shadow-[0_2px_6px_rgba(var(--shadow-tint),0.1),0_10px_24px_rgba(var(--shadow-tint),0.14)]',
        'active:translate-y-0 active:scale-[0.99]',
        'focus-within:ring-2 focus-within:ring-inset focus-within:ring-[var(--swatch)]/60',
      )}
      style={{
        borderLeftColor: meta.swatchVar,
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
            'position:fixed;top:-9999px;left:-9999px;padding:6px 14px;border-radius:999px;' +
            'background:#ffffff;color:#3b222c;font:600 14px/1.2 Pretendard,system-ui,sans-serif;' +
            'border:1.5px solid #f1b7cd;box-shadow:0 8px 20px rgba(178,84,122,0.25);' +
            'white-space:nowrap;pointer-events:none;';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 8, 12);
          setTimeout(() => ghost.remove(), 0);
        } catch { /* setDragImage 미지원 환경 — fallback to default */ }
      }}
      title={`${def.label}\n${def.tooltip}`}
    >
      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full flex-col items-start gap-1 rounded-xl px-3 pb-2 pt-2.5 text-left focus-visible:outline-none cursor-grab active:cursor-grabbing"
        aria-label={`${def.label} 블록 추가`}
      >
        <span className="flex w-full min-w-0 items-center gap-1.5 pr-7">
          <span className="truncate text-sm font-semibold leading-tight text-foreground">{def.label}</span>
        </span>
        <div
          ref={previewHostRef}
          className="blocks-library-preview relative mt-0.5 shrink-0 overflow-hidden rounded-md"
          style={{
            width: previewSize.w,
            height: previewSize.h,
            background: 'transparent',
          }}
          aria-hidden
        />
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
          'absolute right-1.5 top-1.5 z-[1] flex h-7 w-7 items-center justify-center rounded-full',
          'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100',
          'hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isFavorite && 'opacity-100',
        )}
      >
        <Star
          className={cn(
            'h-4 w-4',
            isFavorite ? 'fill-[#FFC857] text-[#B8860B]' : 'text-muted-foreground',
          )}
        />
      </button>
    </div>
  );
}

'use client';

import { useState, useMemo, type CSSProperties } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIES, type WidgetCategory } from '@/lib/widgets/types';
import { WIDGETS, widgetsForTarget } from '@/lib/widgets/registry';
import { WidgetRender } from '@/lib/widgets/previews';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WidgetType, type WidgetTarget } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils/cn';

/**
 * WidgetGallery — WYSIWYG 위젯 갤러리 (spec 17 §5).
 *
 * 좌측 사이드바 (편집 모드일 때 BlocksLibrary 대신 표시).
 *
 * 6 카테고리 (기본/입력/표시/굴림/컨테이너/굴림 결과 틀) × 12 위젯.
 * 카드 = 실 위젯 모양 mini-render (pointer-events 차단).
 * 클릭 또는 드래그 가능 — A-4 에서 dnd-kit Draggable wrap.
 * 클릭 시 캔버스 (20, 20) 에 즉시 추가 (편의).
 */
export default function WidgetGallery() {
  const editSubmode = useUiStore((s) => s.editSubmode);
  const target: WidgetTarget = editSubmode === 'sheet' ? 'sheet' : 'rolltemplate';
  const addWidget = useWorkspaceStore((s) => s.addWidget);
  const setSelectedWidgetId = useUiStore((s) => s.setSelectedWidgetId);

  const [search, setSearch] = useState('');

  const visibleWidgets = useMemo(() => widgetsForTarget(target), [target]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CATEGORIES.map((cat) => {
      const items = visibleWidgets
        .filter((w) => w.category === cat.id)
        .filter((w) => (q ? w.label.toLowerCase().includes(q) || w.type.includes(q) : true));
      return { cat, items };
    }).filter((g) => g.items.length > 0);
  }, [visibleWidgets, search]);

  const onClickWidget = (type: WidgetType) => {
    const id = addWidget(target, type, 20, 20);
    setSelectedWidgetId(id);
  };

  return (
    <>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3 text-xs">
        <span className="font-semibold">위젯 갤러리</span>
        <span className="ml-auto rounded bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {target === 'sheet' ? '시트' : '굴림틀'}
        </span>
      </div>
      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="위젯 검색…"
            className="w-full rounded-md border border-border bg-[var(--bg-elevated-2)] py-1.5 pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-[var(--color-primary,#2563eb)]"
            data-testid="widget-gallery-search"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2" data-testid="widget-gallery-scroll">
        {grouped.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            일치하는 위젯이 없습니다.
          </div>
        ) : (
          grouped.map(({ cat, items }) => (
            <CategoryGroup
              key={cat.id}
              category={cat.id}
              label={cat.label}
              items={items}
              onClickWidget={onClickWidget}
            />
          ))
        )}
      </div>
    </>
  );
}

function CategoryGroup({
  category,
  label,
  items,
  onClickWidget,
}: {
  category: WidgetCategory;
  label: string;
  items: typeof WIDGETS;
  onClickWidget: (type: WidgetType) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section
      className="mb-2"
      data-testid={`widget-cat-${category}`}
      data-cat-open={open ? 'true' : 'false'}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:bg-[var(--bg-hover)]"
      >
        <span aria-hidden>{open ? '▾' : '▸'}</span>
        {label}
        <span className="ml-auto font-normal text-[10px]">{items.length}</span>
      </button>
      {open && (
        <div className="mt-1 grid grid-cols-2 gap-1.5 px-1">
          {items.map((w) => (
            <WidgetCard
              key={w.type}
              type={w.type}
              label={w.label}
              cardWidth={w.cardWidth}
              cardHeight={w.cardHeight}
              onClick={() => onClickWidget(w.type)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WidgetCard({
  type,
  label,
  cardHeight,
  onClick,
}: {
  type: WidgetType;
  label: string;
  cardWidth: number;
  cardHeight: number;
  onClick: () => void;
}) {
  const style: CSSProperties = {
    minHeight: cardHeight,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col items-stretch gap-1 rounded border border-border bg-[var(--bg-elevated-2)] p-2 text-left transition-colors hover:border-[var(--color-primary,#2563eb)] hover:bg-[var(--bg-hover)]',
      )}
      style={style}
      data-widget-type={type}
      data-testid={`widget-card-${type}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-widget-type', type);
        e.dataTransfer.setData('text/plain', type);
      }}
      title={label}
    >
      <div
        className="flex items-center justify-center overflow-hidden rounded bg-[var(--bg-app,white)] p-1"
        style={{ height: Math.max(24, cardHeight - 28), minHeight: 24 }}
      >
        <div className="pointer-events-none w-full max-h-full overflow-hidden" style={{ minHeight: 20 }}>
          <WidgetRender type={type} mini />
        </div>
      </div>
      <div className="truncate text-[10px] text-foreground">{label}</div>
    </button>
  );
}

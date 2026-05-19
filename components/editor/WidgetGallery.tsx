'use client';

import { useMemo, useState } from 'react';
import {
  AlignLeft,
  Box,
  CheckSquare,
  Hash,
  Heading1,
  Image as ImageIcon,
  MessageSquare,
  MousePointerClick,
  Search,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FRIENDLY_WIDGET_GROUPS,
  FRIENDLY_WIDGET_MIME,
  FRIENDLY_WIDGET_PRESETS,
  appendFriendlyWidgetPreset,
  encodeFriendlyWidgetDrag,
  type FriendlyWidgetGroup,
  type FriendlyWidgetPreset,
} from '@/lib/widgets/presets';
import { cn } from '@/lib/utils/cn';

const GROUP_ORDER: FriendlyWidgetGroup[] = ['layout', 'text', 'input', 'action', 'media'];

export default function WidgetGallery() {
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GROUP_ORDER.map((group) => {
      const items = FRIENDLY_WIDGET_PRESETS.filter((preset) => preset.group === group).filter((preset) => {
        if (!q) return true;
        return (
          preset.label.toLowerCase().includes(q) ||
          preset.description.toLowerCase().includes(q) ||
          preset.blockType.toLowerCase().includes(q)
        );
      });
      return { group, items };
    }).filter((entry) => entry.items.length > 0);
  }, [search]);

  const addPreset = (preset: FriendlyWidgetPreset) => {
    const id = appendFriendlyWidgetPreset(preset, { left: 24, top: 24 });
    if (id) {
      toast(`${preset.label} 추가됨`, { duration: 1400 });
    } else {
      toast.error('블록 워크스페이스가 아직 준비되지 않았어요.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3 text-xs">
        <span className="font-semibold">부품 갤러리</span>
        <span className="ml-auto rounded bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
          HTML에 추가
        </span>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="부품 검색"
            className="h-8 w-full rounded-md border border-border bg-[var(--bg-elevated-2)] py-1.5 pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-[var(--color-primary,#2563eb)]"
            data-testid="widget-gallery-search"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2" data-testid="widget-gallery-scroll">
        {grouped.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            맞는 부품이 없습니다.
          </div>
        ) : (
          grouped.map(({ group, items }) => (
            <section key={group} className="mb-3" data-testid={`widget-cat-${group}`}>
              <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-muted-foreground">
                {FRIENDLY_WIDGET_GROUPS[group]}
                <span className="ml-auto text-[10px] font-normal">{items.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {items.map((preset) => (
                  <WidgetPresetCard
                    key={preset.id}
                    preset={preset}
                    onClick={() => addPreset(preset)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function WidgetPresetCard({
  preset,
  onClick,
}: {
  preset: FriendlyWidgetPreset;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md border border-border bg-[var(--bg-elevated-2)] p-2 text-left',
        'transition-colors hover:border-[var(--color-primary,#2563eb)] hover:bg-[var(--bg-hover)]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
      data-widget-type={preset.id}
      data-block-type={preset.blockType}
      data-testid={`widget-card-${preset.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData(FRIENDLY_WIDGET_MIME, encodeFriendlyWidgetDrag(preset.id));
        e.dataTransfer.setData('application/x-r20-block-type', preset.blockType);
        e.dataTransfer.setData('text/plain', preset.blockType);
        try {
          const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
          ghost.style.position = 'fixed';
          ghost.style.left = '-1000px';
          ghost.style.top = '-1000px';
          ghost.style.width = `${e.currentTarget.getBoundingClientRect().width}px`;
          ghost.style.pointerEvents = 'none';
          ghost.style.opacity = '0.92';
          ghost.style.transform = 'scale(0.98)';
          ghost.style.boxShadow = '0 14px 32px rgba(0,0,0,0.28)';
          ghost.style.background = '#ffffff';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 34, 24);
          window.setTimeout(() => ghost.remove(), 0);
        } catch {
          /* default drag image is fine if the browser blocks custom images. */
        }
      }}
      title={`${preset.label}\n${preset.description}`}
    >
      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded border border-border bg-white">
        <PreviewShape preset={preset} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {renderPresetIcon(preset)}
          <span className="truncate text-xs font-medium text-foreground">{preset.label}</span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
          {preset.description}
        </div>
      </div>
    </button>
  );
}

function PreviewShape({ preset }: { preset: FriendlyWidgetPreset }) {
  switch (preset.preview) {
    case 'box':
      return <div className="h-8 w-12 rounded-sm border border-[#9ca3af] bg-[#f8fafc]" />;
    case 'heading':
      return <div className="h-4 w-12 rounded-sm bg-[#111827]" />;
    case 'label':
      return <div className="h-2 w-10 rounded-sm bg-[#4b5563]" />;
    case 'text':
      return <div className="h-6 w-12 rounded border border-[#9ca3af] bg-white" />;
    case 'number':
      return <div className="h-6 w-9 rounded border border-[#9ca3af] bg-white text-center text-[10px] leading-6 text-[#4b5563]">0</div>;
    case 'textarea':
      return <div className="h-8 w-12 rounded border border-[#9ca3af] bg-white" />;
    case 'checkbox':
      return <div className="h-4 w-4 rounded border border-[#6b7280] bg-white" />;
    case 'image':
      return <ImageIcon className="h-7 w-7 text-[#6b7280]" />;
    case 'button':
      return <div className="h-6 w-12 rounded bg-[#2563eb]" />;
    default:
      return null;
  }
}

function renderPresetIcon(preset: FriendlyWidgetPreset) {
  const className = 'h-3.5 w-3.5 shrink-0 text-muted-foreground';
  switch (preset.preview) {
    case 'heading':
      return <Heading1 className={className} />;
    case 'label':
      return <Type className={className} />;
    case 'text':
      return <Type className={className} />;
    case 'number':
      return <Hash className={className} />;
    case 'textarea':
      return <AlignLeft className={className} />;
    case 'checkbox':
      return <CheckSquare className={className} />;
    case 'image':
      return <ImageIcon className={className} />;
    case 'button':
      return preset.blockType === 'r20_chat_button'
        ? <MessageSquare className={className} />
        : <MousePointerClick className={className} />;
    case 'box':
    default:
      return <Box className={className} />;
  }
}

'use client';

import { useMemo, useState } from 'react';
import {
  AlignLeft,
  Box,
  CheckSquare,
  Hash,
  Heading1,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  MousePointerClick,
  Search,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
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
import HelpTip from './HelpTip';
import { WIDGET_DISPLAY, WIDGET_GROUP_DISPLAY } from './fieldLabels';

const GROUP_ORDER: FriendlyWidgetGroup[] = ['layout', 'text', 'input', 'action', 'media'];

/** 표시 전용 이름/설명 — 데이터(presets)는 그대로 두고 화면 글자만 쉬운 말로. */
function displayName(preset: FriendlyWidgetPreset): string {
  return WIDGET_DISPLAY[preset.id]?.name ?? preset.label;
}
function displayDesc(preset: FriendlyWidgetPreset): string {
  return WIDGET_DISPLAY[preset.id]?.desc ?? preset.description;
}

export default function WidgetGallery() {
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return GROUP_ORDER.map((group) => {
      const items = FRIENDLY_WIDGET_PRESETS.filter((preset) => preset.group === group).filter((preset) => {
        if (!q) return true;
        return (
          displayName(preset).toLowerCase().includes(q) ||
          displayDesc(preset).toLowerCase().includes(q) ||
          preset.label.toLowerCase().includes(q) ||
          preset.description.toLowerCase().includes(q) ||
          preset.blockType.toLowerCase().includes(q)
        );
      });
      return { group, items };
    }).filter((entry) => entry.items.length > 0);
  }, [search]);

  const addPreset = (preset: FriendlyWidgetPreset) => {
    const id = appendFriendlyWidgetPreset(preset);
    if (id) {
      toast(`'${displayName(preset)}'을(를) 시트에 올렸어요.`, { duration: 1400 });
    } else {
      toast.error('시트 작업 공간이 아직 준비되지 않았어요. 잠시 뒤 다시 시도해 주세요.');
    }
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex h-full flex-col">
        <div className="r20-panel-head">
          <LayoutGrid className="h-[18px] w-[18px] text-[var(--primary)]" aria-hidden="true" />
          <span>자주 쓰는 조각</span>
          <span className="flex-1" />
          <HelpTip label="자주 쓰는 조각 도움말" side="right">
            시트에 자주 올리는 조각들이에요. 눌러서 추가하거나,
            시트 화면 위로 끌어다 놓으면 그 자리에 들어가요.
          </HelpTip>
        </div>

        <div className="border-b border-border px-3 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="조각 찾기 — 예: 글자, 버튼"
              aria-label="조각 검색"
              className="r20-input pl-9"
              data-testid="widget-gallery-search"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-2.5 py-2.5" data-testid="widget-gallery-scroll">
          {grouped.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm leading-relaxed text-muted-foreground">
              {`'${search}'에 맞는 조각이 없어요.`}
              <br />
              다른 말로 찾아보세요.
            </div>
          ) : (
            grouped.map(({ group, items }) => (
              <section key={group} className="mb-4" data-testid={`widget-cat-${group}`}>
                <div className="mb-1.5 flex items-center gap-1.5 px-1 text-sm font-semibold text-[var(--text-secondary)]">
                  {WIDGET_GROUP_DISPLAY[group] ?? FRIENDLY_WIDGET_GROUPS[group]}
                  <span className="ml-auto text-xs font-medium text-muted-foreground">{items.length}개</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
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
    </TooltipProvider>
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
        'r20-lift group flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 text-left shadow-[0_1px_2px_rgba(var(--shadow-tint),0.05)]',
        'hover:border-[var(--primary-soft-border)] hover:bg-[var(--primary-soft)]/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'cursor-grab active:cursor-grabbing',
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
          ghost.style.opacity = '0.94';
          ghost.style.transform = 'scale(0.98)';
          ghost.style.boxShadow = '0 14px 32px rgba(178, 84, 122, 0.28)';
          ghost.style.background = '#ffffff';
          ghost.style.borderRadius = '12px';
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 34, 24);
          window.setTimeout(() => ghost.remove(), 0);
        } catch {
          /* default drag image is fine if the browser blocks custom images. */
        }
      }}
      title={`${displayName(preset)}\n${displayDesc(preset)}`}
    >
      <div className="flex h-14 w-[72px] shrink-0 items-center justify-center rounded-lg border border-[var(--primary-soft-border)]/60 bg-[var(--primary-soft)]/35">
        <PreviewShape preset={preset} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {renderPresetIcon(preset)}
          <span className="truncate text-sm font-semibold text-foreground">{displayName(preset)}</span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--text-secondary)]">
          {displayDesc(preset)}
        </div>
      </div>
    </button>
  );
}

function PreviewShape({ preset }: { preset: FriendlyWidgetPreset }) {
  switch (preset.preview) {
    case 'box':
      return <div className="h-9 w-14 rounded-md border-[1.5px] border-dashed border-[var(--border-strong)] bg-white/80" />;
    case 'heading':
      return <div className="h-4 w-14 rounded-sm bg-[var(--text-primary)]" />;
    case 'label':
      return <div className="h-2.5 w-11 rounded-sm bg-[var(--text-muted)]" />;
    case 'text':
      return <div className="h-7 w-14 rounded-md border-[1.5px] border-[var(--border-strong)] bg-white" />;
    case 'number':
      return <div className="h-7 w-10 rounded-md border-[1.5px] border-[var(--border-strong)] bg-white text-center text-xs leading-6 text-[var(--text-secondary)]">0</div>;
    case 'textarea':
      return <div className="h-9 w-14 rounded-md border-[1.5px] border-[var(--border-strong)] bg-white" />;
    case 'checkbox':
      return <div className="grid h-5 w-5 place-items-center rounded-md border-2 border-[var(--primary)] bg-white text-xs font-bold text-[var(--primary-active)]">✓</div>;
    case 'image':
      return <ImageIcon className="h-8 w-8 text-[var(--text-muted)]" />;
    case 'button':
      return <div className="h-7 w-14 rounded-full bg-[var(--primary)] shadow-[0_2px_4px_rgba(var(--shadow-tint),0.3)]" />;
    default:
      return null;
  }
}

function renderPresetIcon(preset: FriendlyWidgetPreset) {
  const className = 'h-4 w-4 shrink-0 text-muted-foreground';
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

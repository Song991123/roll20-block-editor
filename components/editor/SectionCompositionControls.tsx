'use client';

import type { CSSProperties } from 'react';
import {
  SECTION_COMPOSITIONS,
  type SectionComposition,
} from '@/lib/editor/sectionCompositions';
import { getSectionLayout } from '@/lib/editor/sectionLayouts';
import { getSectionTheme } from '@/lib/editor/sectionThemes';
import { cn } from '@/lib/utils/cn';

type SectionCompositionControlsProps = {
  activeCompositionId: SectionComposition['id'] | null;
  onApply: (compositionId: SectionComposition['id']) => void;
};

export default function SectionCompositionControls({
  activeCompositionId,
  onApply,
}: SectionCompositionControlsProps) {
  return (
    <section data-testid="design-section-compositions">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">구역 완성 디자인</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          선택한 구역의 색과 안쪽 배치를 한 번에 바꿔요.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SECTION_COMPOSITIONS.map((compositionValue) => {
          const active = activeCompositionId === compositionValue.id;
          return (
            <button
              key={compositionValue.id}
              type="button"
              aria-pressed={active}
              aria-label={`${compositionValue.label} 구역 완성 디자인`}
              title={compositionValue.description}
              className={cn(
                'grid min-h-[126px] grid-rows-[88px_auto] gap-2 rounded-lg border p-2 text-left transition-colors',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary-soft-border)] hover:bg-[var(--bg-hover)]',
              )}
              onClick={() => onApply(compositionValue.id)}
              data-testid={`design-section-composition-${compositionValue.id}`}
            >
              <CompositionPreview compositionValue={compositionValue} />
              <span className="truncate px-0.5 text-xs font-semibold">{compositionValue.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CompositionPreview({ compositionValue }: { compositionValue: SectionComposition }) {
  const theme = getSectionTheme(compositionValue.themeId);
  const layout = getSectionLayout(compositionValue.layoutId);
  const root = layout.parts.root;
  const title = { ...theme.parts.title, ...layout.parts.header };
  const rowItemStyle: CSSProperties = layout.id === 'row'
    ? { flex: '1 1 24%', minWidth: 0 }
    : {};
  const rootStyle: CSSProperties = {
    display: root.display ?? undefined,
    flexDirection: root['flex-direction'] as CSSProperties['flexDirection'] ?? undefined,
    flexWrap: root['flex-wrap'] as CSSProperties['flexWrap'] ?? undefined,
    gridTemplateColumns: root['grid-template-columns'] ?? undefined,
    gridAutoFlow: root['grid-auto-flow'] as CSSProperties['gridAutoFlow'] ?? undefined,
    gap: '4px',
    alignItems: root['align-items'] ?? undefined,
    justifyContent: root['justify-content'] ?? undefined,
    backgroundColor: theme.preview.surface,
    borderColor: theme.preview.border,
    borderStyle: theme.parts.root['border-style'] ?? 'solid',
    borderWidth: theme.parts.root['border-width'] ?? '1px',
    borderRadius: theme.parts.root['border-radius'] ?? '4px',
    boxShadow: theme.parts.root['box-shadow'] ?? undefined,
    color: theme.preview.text,
  };
  const titleStyle: CSSProperties = {
    gridColumn: title['grid-column'] ?? undefined,
    flexBasis: title['flex-basis'] ?? undefined,
    maxWidth: title['max-width'] ?? undefined,
    alignSelf: title['align-self'] ?? undefined,
    backgroundColor: title['background-color'] ?? undefined,
    color: title.color ?? undefined,
    borderColor: title['border-color'] ?? undefined,
    borderStyle: title['border-style'] ?? undefined,
    borderWidth: title['border-width'] ?? undefined,
    borderRadius: title['border-radius'] ?? undefined,
  };

  return (
    <span className="h-[88px] w-full overflow-hidden rounded-[5px] bg-[var(--bg-elevated-2)] p-1.5" aria-hidden="true">
      <span className="h-full w-full overflow-hidden p-1.5" style={rootStyle}>
        <span className="min-h-[19px] px-1 py-0.5 text-[8px] font-bold leading-[14px]" style={titleStyle}>
          구역 제목
        </span>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="flex min-h-[15px] flex-col justify-center gap-1 rounded-[2px] border bg-white/80 px-1"
            style={{ ...rowItemStyle, borderColor: theme.preview.border }}
          >
            <span className="block h-1 w-3/4 rounded-full bg-current opacity-25" />
            <span className="block h-1 w-1/2 rounded-full bg-current opacity-15" />
          </span>
        ))}
      </span>
    </span>
  );
}

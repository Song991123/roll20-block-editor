'use client';

import type { CSSProperties } from 'react';
import {
  SECTION_LAYOUTS,
  type SectionLayout,
} from '@/lib/editor/sectionLayouts';
import { cn } from '@/lib/utils/cn';

type SectionLayoutControlsProps = {
  activeLayoutId: SectionLayout['id'] | null;
  onApply: (layoutId: SectionLayout['id']) => void;
};

export default function SectionLayoutControls({
  activeLayoutId,
  onApply,
}: SectionLayoutControlsProps) {
  return (
    <section data-testid="design-section-layouts">
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
        안쪽 배치 디자인
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {SECTION_LAYOUTS.map((layout) => {
          const active = activeLayoutId === layout.id;
          return (
            <button
              key={layout.id}
              type="button"
              aria-pressed={active}
              aria-label={`${layout.label} 안쪽 배치`}
              title={layout.description}
              className={cn(
                'grid min-h-[112px] grid-rows-[76px_auto] gap-2 rounded-lg border p-2 text-left transition-colors',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary-soft-border)] hover:bg-[var(--bg-hover)]',
              )}
              onClick={() => onApply(layout.id)}
              data-testid={`design-section-layout-${layout.id}`}
            >
              <LayoutPreview layout={layout} />
              <span className="truncate px-0.5 text-xs font-semibold">{layout.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LayoutPreview({ layout }: { layout: SectionLayout }) {
  const root = layout.parts.root;
  const header = layout.parts.header;
  const rootStyle: CSSProperties = {
    display: root.display ?? undefined,
    flexDirection: root['flex-direction'] as CSSProperties['flexDirection'] ?? undefined,
    flexWrap: root['flex-wrap'] as CSSProperties['flexWrap'] ?? undefined,
    gridTemplateColumns: root['grid-template-columns'] ?? undefined,
    gridAutoFlow: root['grid-auto-flow'] as CSSProperties['gridAutoFlow'] ?? undefined,
    gap: '5px',
    alignItems: root['align-items'] ?? undefined,
    justifyContent: root['justify-content'] ?? undefined,
  };
  const headerStyle: CSSProperties = {
    gridColumn: header['grid-column'] ?? undefined,
    flexBasis: header['flex-basis'] ?? undefined,
    maxWidth: header['max-width'] ?? undefined,
    alignSelf: header['align-self'] ?? undefined,
  };
  return (
    <span className="h-[76px] w-full overflow-hidden rounded-[5px] bg-[var(--bg-elevated-2)] p-2" aria-hidden="true">
      <span className="h-full w-full" style={rootStyle}>
        <span className="min-h-2.5 rounded-[2px] bg-[#d96b91]" style={headerStyle} />
        <span className="min-h-4 rounded-[2px] border border-[#e7afc3] bg-[#fff2f6]" />
        <span className="min-h-4 rounded-[2px] border border-[#9bd3c0] bg-[#f2fbf7]" />
        <span className="min-h-4 rounded-[2px] border border-[#d8c8cf] bg-white" />
      </span>
    </span>
  );
}

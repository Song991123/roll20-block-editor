'use client';

import {
  SECTION_THEMES,
  type SectionTheme,
} from '@/lib/editor/sectionThemes';
import { cn } from '@/lib/utils/cn';

type SectionThemeControlsProps = {
  activeThemeId: SectionTheme['id'] | null;
  onApply: (themeId: SectionTheme['id']) => void;
};

export default function SectionThemeControls({
  activeThemeId,
  onApply,
}: SectionThemeControlsProps) {
  return (
    <section data-testid="design-section-themes">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">구역 전체 모양</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          틀과 제목을 한 번에 맞추고 본문과 입력칸은 그대로 둡니다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SECTION_THEMES.map((theme) => {
          const active = activeThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={active}
              aria-label={`${theme.label} 구역 전체 모양`}
              title={theme.description}
              className={cn(
                'grid min-h-[112px] grid-rows-[76px_auto] gap-2 rounded-lg border p-2 text-left transition-colors',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary-soft-border)] hover:bg-[var(--bg-hover)]',
              )}
              onClick={() => onApply(theme.id)}
              data-testid={`design-preset-section-${theme.id}`}
            >
              <ThemePreview theme={theme} />
              <span className="truncate px-0.5 text-xs font-semibold">{theme.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ThemePreview({ theme }: { theme: SectionTheme }) {
  const colors = theme.preview;
  return (
    <span
      className="flex h-[76px] w-full flex-col overflow-hidden rounded-[5px] border p-2"
      style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
      aria-hidden="true"
    >
      <span
        className="mb-2 block min-h-6 px-1.5 py-1 text-[9px] font-bold"
        style={{
          backgroundColor: colors.title,
          color: colors.titleText,
          borderColor: theme.parts.title['border-color'] ?? 'transparent',
          borderStyle: theme.parts.title['border-style'] ?? 'solid',
          borderWidth: theme.parts.title['border-width'] ?? '0',
          borderRadius: theme.parts.title['border-radius'] ?? '0',
        }}
      >
        구역 제목
      </span>
      <span className="h-1.5 w-4/5 rounded-full bg-current opacity-25" />
      <span className="mt-1.5 h-1.5 w-2/3 rounded-full bg-current opacity-15" />
    </span>
  );
}

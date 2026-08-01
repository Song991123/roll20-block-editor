'use client';

import { Dice5 } from 'lucide-react';
import {
  RESULT_CARD_THEMES,
  type ResultCardTheme,
} from '@/lib/editor/resultCardThemes';
import { cn } from '@/lib/utils/cn';

type ResultCardThemeControlsProps = {
  activeThemeId: ResultCardTheme['id'] | null;
  onApply: (themeId: ResultCardTheme['id']) => void;
};

export default function ResultCardThemeControls({
  activeThemeId,
  onApply,
}: ResultCardThemeControlsProps) {
  return (
    <section data-testid="design-result-card-themes">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">카드 전체 테마</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          바깥 틀과 제목·행·결과값을 한번에 맞춰요.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {RESULT_CARD_THEMES.map((theme) => {
          const active = activeThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={active}
              aria-label={`${theme.label} 결과 카드 테마`}
              title={theme.description}
              className={cn(
                'grid min-h-[112px] grid-rows-[76px_auto] gap-2 rounded-lg border p-2 text-left transition-colors',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary-soft-border)] hover:bg-[var(--bg-hover)]',
              )}
              onClick={() => onApply(theme.id)}
              data-testid={`design-preset-result-card-${theme.id}`}
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

function ThemePreview({ theme }: { theme: ResultCardTheme }) {
  const colors = theme.preview;
  return (
    <span
      className="flex h-[76px] w-full flex-col overflow-hidden rounded-[5px] border"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      aria-hidden="true"
    >
      <span
        className="flex min-h-7 items-center justify-between px-2 text-[9px] font-bold"
        style={{ backgroundColor: colors.header, color: colors.headerText }}
      >
        <span>판정</span>
        <Dice5 className="h-3 w-3" />
      </span>
      <span
        className="flex flex-1 items-center justify-between border-t px-2 text-[9px]"
        style={{ backgroundColor: colors.row, borderColor: colors.border }}
      >
        <span style={{ color: colors.label }}>결과</span>
        <strong className="text-xs" style={{ color: colors.value }}>12</strong>
      </span>
    </span>
  );
}

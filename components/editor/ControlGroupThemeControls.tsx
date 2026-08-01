'use client';

import { Dice5 } from 'lucide-react';
import {
  CONTROL_GROUP_THEMES,
  type ControlGroupTheme,
} from '@/lib/editor/controlGroupThemes';
import { cn } from '@/lib/utils/cn';

type ControlGroupThemeControlsProps = {
  activeThemeId: ControlGroupTheme['id'] | null;
  onApply: (themeId: ControlGroupTheme['id']) => void;
};

export default function ControlGroupThemeControls({
  activeThemeId,
  onApply,
}: ControlGroupThemeControlsProps) {
  return (
    <section data-testid="design-control-group-themes">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">한 줄 전체 모양</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          이 줄의 이름표, 입력칸, 버튼을 한 번에 맞춥니다.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CONTROL_GROUP_THEMES.map((theme) => {
          const active = activeThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={active}
              aria-label={`${theme.label} 한 줄 전체 모양`}
              title={theme.description}
              className={cn(
                'grid min-h-[112px] grid-rows-[76px_auto] gap-2 rounded-lg border p-2 text-left transition-colors',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary-soft-border)] hover:bg-[var(--bg-hover)]',
              )}
              onClick={() => onApply(theme.id)}
              data-testid={`design-preset-control-group-${theme.id}`}
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

function ThemePreview({ theme }: { theme: ControlGroupTheme }) {
  const colors = theme.preview;
  return (
    <span
      className="flex h-[76px] w-full items-center gap-1.5 overflow-hidden rounded-[5px] border px-2 py-2"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        color: colors.text,
      }}
      aria-hidden="true"
    >
      <span className="shrink-0 text-[9px] font-bold" style={{ color: colors.label }}>
        이름
      </span>
      <span
        className="h-6 min-w-0 flex-1 rounded-[4px] border"
        style={{ backgroundColor: colors.control, borderColor: colors.controlBorder }}
      />
      <span
        className="flex h-6 w-7 shrink-0 items-center justify-center rounded-[4px] border"
        style={{
          backgroundColor: colors.action,
          borderColor: colors.action,
          color: colors.actionText,
        }}
      >
        <Dice5 className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </span>
  );
}

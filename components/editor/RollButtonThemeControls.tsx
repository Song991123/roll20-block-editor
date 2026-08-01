'use client';

import type { CSSProperties } from 'react';
import { Dice5 } from 'lucide-react';
import {
  ROLL_BUTTON_THEMES,
  type RollButtonTheme,
} from '@/lib/editor/rollButtonThemes';
import { cn } from '@/lib/utils/cn';

type RollButtonThemeControlsProps = {
  activeThemeId: RollButtonTheme['id'] | null;
  onApply: (themeId: RollButtonTheme['id']) => void;
};

export default function RollButtonThemeControls({
  activeThemeId,
  onApply,
}: RollButtonThemeControlsProps) {
  return (
    <section data-testid="design-roll-button-themes">
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
        주사위 버튼 디자인
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {ROLL_BUTTON_THEMES.map((theme) => {
          const active = activeThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={active}
              aria-label={`${theme.label} 주사위 버튼 디자인`}
              title={theme.description}
              className={cn(
                'group grid min-h-[112px] grid-rows-[76px_auto] gap-2 rounded-lg border p-2 text-left transition-colors',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--primary-soft-border)] hover:bg-[var(--bg-hover)]',
              )}
              onClick={() => onApply(theme.id)}
              data-testid={`design-roll-button-theme-${theme.id}`}
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

type PreviewVars = CSSProperties & Record<`--roll-${string}`, string>;

function ThemePreview({ theme }: { theme: RollButtonTheme }) {
  const base = theme.states.base;
  const hover = theme.states.hover;
  const active = theme.states.active;
  const focus = theme.states.focus;
  const vars: PreviewVars = {
    '--roll-base-bg': base['background-color'] ?? 'transparent',
    '--roll-base-color': base.color ?? 'currentColor',
    '--roll-base-border': base['border-color'] ?? 'currentColor',
    '--roll-base-shadow': base['box-shadow'] ?? 'none',
    '--roll-hover-bg': hover['background-color'] ?? base['background-color'] ?? 'transparent',
    '--roll-hover-border': hover['border-color'] ?? base['border-color'] ?? 'currentColor',
    '--roll-hover-shadow': hover['box-shadow'] ?? base['box-shadow'] ?? 'none',
    '--roll-active-bg': active['background-color'] ?? base['background-color'] ?? 'transparent',
    '--roll-active-border': active['border-color'] ?? base['border-color'] ?? 'currentColor',
    '--roll-active-shadow': active['box-shadow'] ?? base['box-shadow'] ?? 'none',
    '--roll-focus': focus.outline?.match(/#[0-9a-f]{6}/i)?.[0] ?? '#d96b91',
  };
  return (
    <span
      className="grid h-[76px] w-full place-items-center overflow-hidden rounded-[5px] bg-[var(--bg-elevated-2)] px-2"
      aria-hidden="true"
    >
      <span
        className={cn(
          'flex min-h-9 min-w-[94px] items-center justify-center gap-1.5 px-3 text-[11px] font-bold',
          'bg-[var(--roll-base-bg)] text-[var(--roll-base-color)] border-[var(--roll-base-border)] [box-shadow:var(--roll-base-shadow)]',
          'group-hover:bg-[var(--roll-hover-bg)] group-hover:border-[var(--roll-hover-border)] group-hover:[box-shadow:var(--roll-hover-shadow)]',
          'group-active:bg-[var(--roll-active-bg)] group-active:border-[var(--roll-active-border)] group-active:[box-shadow:var(--roll-active-shadow)]',
          'group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[var(--roll-focus)]',
        )}
        style={{
          ...vars,
          borderWidth: base['border-width'] ?? undefined,
          borderStyle: base['border-style'] ?? undefined,
          borderRadius: base['border-radius'] ?? undefined,
        }}
      >
        <Dice5 className="h-3.5 w-3.5" style={{ color: theme.before.color ?? undefined }} />
        <span>굴림</span>
      </span>
    </span>
  );
}

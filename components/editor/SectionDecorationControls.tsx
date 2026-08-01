'use client';

import type { CSSProperties } from 'react';
import { Ban, RotateCcw } from 'lucide-react';
import type { ManagedDesignDeclarations } from '@/lib/editor/designPosition';
import {
  DEFAULT_SECTION_ACCENT_COLOR,
  readSectionAccent,
  SECTION_ACCENT_POSITIONS,
  SECTION_ACCENT_WIDTHS,
  sectionAccentColorPatch,
  sectionAccentPatch,
  sectionAccentWidthPatch,
  type SectionAccentPosition,
} from '@/lib/editor/sectionDecorationStyle';
import { cn } from '@/lib/utils/cn';

type SectionDecorationControlsProps = {
  values: Record<string, string>;
  onPatch: (declarations: ManagedDesignDeclarations) => void;
};

const ACCENT_COLORS = [
  ['rose', '장미', '#d96b91'],
  ['mint', '민트', '#4ea88b'],
  ['gold', '금빛', '#c9943e'],
  ['ink', '먹색', '#595057'],
] as const;

const SHADOWS = [
  ['none', '없음', 'none'],
  ['soft', '은은하게', '0 2px 8px rgba(73, 45, 57, 0.10)'],
  ['lifted', '띄우기', '0 8px 20px rgba(73, 45, 57, 0.16)'],
  ['inside', '안쪽', 'inset 0 2px 6px rgba(73, 45, 57, 0.12)'],
] as const;

const CORNERS = [
  ['0px', '각지게'],
  ['4px', '살짝'],
  ['8px', '둥글게'],
] as const;

const PADDINGS = [
  ['8px', '촘촘'],
  ['16px', '보통'],
  ['24px', '넉넉'],
] as const;

const ACCENT_LABELS: Record<SectionAccentPosition, string> = {
  none: '없음',
  left: '왼쪽',
  top: '위',
  right: '오른쪽',
  bottom: '아래',
};

const RESET_PROPERTIES = [
  'box-shadow',
  'border-radius',
  'padding',
] as const;

export default function SectionDecorationControls({
  values,
  onPatch,
}: SectionDecorationControlsProps) {
  const accent = readSectionAccent(values);
  const accentColor = normalizeHex(accent.color) ?? DEFAULT_SECTION_ACCENT_COLOR;
  const reset = () => onPatch({
    ...sectionAccentPatch('none'),
    ...Object.fromEntries(RESET_PROPERTIES.map((property) => [property, null])),
  });

  return (
    <section data-testid="design-section-decoration">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">빠른 꾸미기</h3>
        <button
          type="button"
          onClick={reset}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground"
          title="빠른 꾸미기 지우기"
          aria-label="빠른 꾸미기 지우기"
          data-testid="design-section-decoration-reset"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p className="r20-field-label">강조선</p>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="강조선 위치">
        {SECTION_ACCENT_POSITIONS.map((position) => (
          <button
            key={position}
            type="button"
            aria-pressed={accent.position === position}
            title={`${ACCENT_LABELS[position]} 강조선`}
            className={cn(
              'grid h-[58px] grid-rows-[30px_auto] place-items-center rounded-lg border px-1 py-1.5 text-[11px] font-semibold',
              accent.position === position
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
            onClick={() => onPatch(sectionAccentPatch(position, accentColor, normalizeAccentWidth(accent.width)))}
            data-testid={`design-section-accent-${position}`}
          >
            {position === 'none' ? (
              <Ban className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <span
                className="h-6 w-8 bg-white"
                style={accentPreviewStyle(position, accentColor)}
                aria-hidden="true"
              />
            )}
            <span>{ACCENT_LABELS[position]}</span>
          </button>
        ))}
      </div>

      {accent.position !== 'none' && (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className="r20-field-label">선 색</p>
            <div className="flex items-center gap-1.5">
              {ACCENT_COLORS.map(([id, label, color]) => (
                <button
                  key={color}
                  type="button"
                  aria-pressed={accentColor.toLowerCase() === color}
                  aria-label={`${label} 강조선`}
                  title={`${label} 강조선`}
                  className={cn(
                    'h-8 w-8 rounded-lg border p-0.5',
                    accentColor.toLowerCase() === color
                      ? 'border-[var(--primary-active)] ring-2 ring-[var(--primary-soft)]'
                      : 'border-[var(--border-subtle)]',
                  )}
                  onClick={() => onPatch(sectionAccentColorPatch(values, color))}
                  data-testid={`design-section-accent-color-${id}`}
                >
                  <span className="block h-full w-full rounded-[5px]" style={{ backgroundColor: color }} />
                </button>
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(event) => onPatch(sectionAccentColorPatch(values, event.target.value))}
                className="h-8 w-8 cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5"
                aria-label="강조선 색 직접 고르기"
                data-testid="design-section-accent-color-custom"
              />
            </div>
          </div>
          <div>
            <p className="r20-field-label">굵기</p>
            <div className="flex overflow-hidden rounded-lg border border-[var(--border-subtle)]">
              {SECTION_ACCENT_WIDTHS.map((width) => (
                <button
                  key={width}
                  type="button"
                  aria-pressed={accent.width === width}
                  title={`강조선 ${width}`}
                  className={cn(
                    'grid h-8 w-8 place-items-center border-r border-[var(--border-subtle)] last:border-r-0',
                    accent.width === width
                      ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                      : 'bg-[var(--bg-elevated)] text-muted-foreground hover:bg-[var(--bg-hover)]',
                  )}
                  onClick={() => onPatch(sectionAccentWidthPatch(values, width))}
                  data-testid={`design-section-accent-width-${width.replace('px', '')}`}
                >
                  <span className="w-4 rounded-full bg-current" style={{ height: width }} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="r20-field-label mt-3">그림자</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="섹션 그림자">
        {SHADOWS.map(([id, label, shadow]) => (
          <button
            key={id}
            type="button"
            aria-pressed={values['box-shadow'] === shadow}
            title={`${label} 그림자`}
            className={cn(
              'grid h-[58px] grid-cols-[38px_1fr] items-center gap-2 rounded-lg border px-2 text-xs font-semibold',
              values['box-shadow'] === shadow
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
            onClick={() => onPatch({ 'box-shadow': shadow })}
            data-testid={`design-section-shadow-${id}`}
          >
            <span className="h-7 w-8 rounded bg-white" style={{ boxShadow: shadow }} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <DecorationChoice
          label="모서리"
          value={values['border-radius']}
          choices={CORNERS}
          onChange={(value) => onPatch({ 'border-radius': value })}
          testid="design-section-corner"
        />
        <DecorationChoice
          label="안쪽 여백"
          value={values.padding}
          choices={PADDINGS}
          onChange={(value) => onPatch({ padding: value })}
          testid="design-section-padding"
        />
      </div>
    </section>
  );
}

function DecorationChoice({
  label,
  value,
  choices,
  onChange,
  testid,
}: {
  label: string;
  value?: string;
  choices: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
  testid: string;
}) {
  return (
    <div>
      <p className="r20-field-label">{label}</p>
      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
        {choices.map(([option, text]) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            title={`${label} ${text}`}
            className={cn(
              'h-9 border-r border-[var(--border-subtle)] px-1 text-[11px] font-semibold last:border-r-0',
              value === option
                ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
            onClick={() => onChange(option)}
            data-testid={`${testid}-${option.replace('px', '')}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function accentPreviewStyle(
  position: Exclude<SectionAccentPosition, 'none'>,
  color: string,
): CSSProperties {
  return {
    border: '1px solid #ead8df',
    [`border${capitalize(position)}Width`]: '4px',
    [`border${capitalize(position)}Color`]: color,
  };
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function normalizeAccentWidth(value: string): (typeof SECTION_ACCENT_WIDTHS)[number] {
  return SECTION_ACCENT_WIDTHS.includes(value as (typeof SECTION_ACCENT_WIDTHS)[number])
    ? value as (typeof SECTION_ACCENT_WIDTHS)[number]
    : '4px';
}

function normalizeHex(value?: string): string | null {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  const short = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}

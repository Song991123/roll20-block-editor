'use client';

import type { CSSProperties } from 'react';
import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from 'lucide-react';
import type { ManagedDesignDeclarations } from '@/lib/editor/designPosition';
import {
  customTextDecorationPalette,
  readTextDecorationMode,
  readTextDecorationPalette,
  TEXT_DECORATION_MODES,
  TEXT_DECORATION_PALETTES,
  textDecorationModePatch,
  type TextDecorationMode,
  type TextDecorationPalette,
} from '@/lib/editor/textDecorationStyle';
import { cn } from '@/lib/utils/cn';

type TextDecorationControlsProps = {
  values: Record<string, string>;
  blockType: string;
  onPatch: (declarations: ManagedDesignDeclarations) => void;
};

const MODE_LABELS: Record<TextDecorationMode, string> = {
  plain: '기본',
  underline: '밑줄',
  side: '옆선',
  band: '띠',
  tag: '표시',
};

const ALIGNMENTS = [
  ['left', '왼쪽', AlignLeft],
  ['center', '가운데', AlignCenter],
  ['right', '오른쪽', AlignRight],
] as const;

const FONT_SIZES = [
  ['13px', '작게'],
  ['16px', '보통'],
  ['22px', '크게'],
] as const;

const FONT_WEIGHTS = [
  ['400', '보통'],
  ['600', '도톰'],
  ['700', '굵게'],
  ['900', '아주 굵게'],
] as const;

export default function TextDecorationControls({
  values,
  blockType,
  onPatch,
}: TextDecorationControlsProps) {
  const mode = readTextDecorationMode(values);
  const palette = readTextDecorationPalette(values);
  const title = blockType.toLowerCase() === 'r20_heading' ? '제목 꾸미기' : '이름표 꾸미기';
  const reset = () => onPatch({
    ...textDecorationModePatch('plain', TEXT_DECORATION_PALETTES[0]),
    'text-align': null,
    'font-size': null,
    'font-weight': null,
  });

  return (
    <section data-testid="design-text-decoration">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{title}</h3>
        <button
          type="button"
          onClick={reset}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground"
          title={`${title} 지우기`}
          aria-label={`${title} 지우기`}
          data-testid="design-text-decoration-reset"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p className="r20-field-label">강조 모양</p>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="글자 강조 모양">
        {TEXT_DECORATION_MODES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            title={`${MODE_LABELS[option]} 모양`}
            className={cn(
              'grid h-[62px] grid-rows-[32px_auto] place-items-center rounded-lg border px-1 py-1.5 text-[11px] font-semibold',
              mode === option
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
            onClick={() => onPatch(textDecorationModePatch(option, palette))}
            data-testid={`design-text-decoration-${option}`}
          >
            <span className="grid h-7 w-9 place-items-center text-[10px] font-bold" style={modePreviewStyle(option, palette)} aria-hidden="true">
              Aa
            </span>
            <span>{MODE_LABELS[option]}</span>
          </button>
        ))}
      </div>

      {mode !== 'plain' && (
        <>
          <p className="r20-field-label mt-3">강조 색</p>
          <div className="flex items-center gap-2">
            {TEXT_DECORATION_PALETTES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={palette.id === option.id}
                aria-label={`${option.label} 강조 색`}
                title={`${option.label} 강조 색`}
                className={cn(
                  'h-8 w-8 rounded-lg border p-0.5',
                  palette.id === option.id
                    ? 'border-[var(--primary-active)] ring-2 ring-[var(--primary-soft)]'
                    : 'border-[var(--border-subtle)]',
                )}
                onClick={() => onPatch(textDecorationModePatch(mode, option))}
                data-testid={`design-text-decoration-color-${option.id}`}
              >
                <span className="block h-full w-full rounded-[5px]" style={{ backgroundColor: option.accent }} />
              </button>
            ))}
            <input
              type="color"
              value={palette.accent}
              onChange={(event) => onPatch(textDecorationModePatch(mode, customTextDecorationPalette(event.target.value)))}
              className="h-8 w-8 cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-0.5"
              aria-label="강조 색 직접 고르기"
              data-testid="design-text-decoration-color-custom"
            />
          </div>
        </>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="r20-field-label">정렬</p>
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-[var(--border-subtle)]" role="group" aria-label="글자 정렬">
            {ALIGNMENTS.map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={values['text-align'] === value}
                aria-label={label}
                title={`${label} 정렬`}
                className={cn(
                  'grid h-9 place-items-center border-r border-[var(--border-subtle)] last:border-r-0',
                  values['text-align'] === value
                    ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                    : 'bg-[var(--bg-elevated)] text-muted-foreground hover:bg-[var(--bg-hover)]',
                )}
                onClick={() => onPatch({ 'text-align': value })}
                data-testid={`design-text-decoration-align-${value}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <SegmentedTextChoice
          label="크기"
          value={values['font-size']}
          choices={FONT_SIZES}
          onChange={(value) => onPatch({ 'font-size': value })}
          testid="design-text-decoration-size"
        />
      </div>

      <div className="mt-3">
        <p className="r20-field-label">굵기</p>
        <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
          {FONT_WEIGHTS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={values['font-weight'] === value}
              title={`글자 ${label}`}
              className={cn(
                'h-9 border-r border-[var(--border-subtle)] px-1 text-[11px] last:border-r-0',
                values['font-weight'] === value
                  ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
              )}
              style={{ fontWeight: value }}
              onClick={() => onPatch({ 'font-weight': value })}
              data-testid={`design-text-decoration-weight-${value}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function SegmentedTextChoice({
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

function modePreviewStyle(mode: TextDecorationMode, palette: TextDecorationPalette): CSSProperties {
  const declarations = textDecorationModePatch(mode, palette);
  return {
    backgroundColor: declarations['background-color'] ?? undefined,
    borderWidth: declarations['border-width'] ?? undefined,
    borderStyle: declarations['border-style'] ?? undefined,
    borderColor: declarations['border-color'] ?? undefined,
    borderRadius: declarations['border-radius'] ?? undefined,
    padding: declarations.padding ?? undefined,
    color: declarations.color ?? undefined,
  };
}

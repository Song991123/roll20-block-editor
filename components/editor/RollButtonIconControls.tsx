'use client';

import { Dice5, Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { ManagedDesignDeclarations } from '@/lib/editor/designPosition';
import { cn } from '@/lib/utils/cn';

type RollButtonIconControlsProps = {
  values: Record<string, string>;
  onPatch: (declarations: ManagedDesignDeclarations) => void;
};

const ICON_PROPERTIES = [
  'display',
  'font-size',
  'margin-right',
  'opacity',
  'color',
  'text-shadow',
] as const;

const ICON_PRESETS: Array<{
  id: string;
  label: string;
  declarations: ManagedDesignDeclarations;
  previewClass: string;
}> = [
  {
    id: 'balanced',
    label: '또렷하게',
    declarations: {
      display: 'inline-block',
      'font-size': '1em',
      'margin-right': '4px',
      opacity: '1',
      color: 'currentColor',
      'text-shadow': 'none',
    },
    previewClass: 'text-[18px]',
  },
  {
    id: 'large',
    label: '크게',
    declarations: {
      display: 'inline-block',
      'font-size': '1.3em',
      'margin-right': '6px',
      opacity: '1',
      color: 'currentColor',
      'text-shadow': '0 1px 1px rgba(80, 30, 50, 0.22)',
    },
    previewClass: 'text-[24px]',
  },
  {
    id: 'soft',
    label: '은은하게',
    declarations: {
      display: 'inline-block',
      'font-size': '0.95em',
      'margin-right': '4px',
      opacity: '0.6',
      color: 'currentColor',
      'text-shadow': 'none',
    },
    previewClass: 'text-[17px] opacity-60',
  },
  {
    id: 'hidden',
    label: '숨기기',
    declarations: { display: 'none' },
    previewClass: 'hidden',
  },
];

export default function RollButtonIconControls({
  values,
  onPatch,
}: RollButtonIconControlsProps) {
  const hidden = values.display === 'none';
  const colorValue = /^currentcolor$/i.test(values.color ?? '') ? '' : values.color ?? '';
  const clear = () => onPatch(Object.fromEntries(
    ICON_PROPERTIES.map((property) => [property, null]),
  ));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">주사위 아이콘</h3>
        <button
          type="button"
          onClick={clear}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground"
          title="Roll20 기본 아이콘으로 되돌리기"
          aria-label="Roll20 기본 아이콘으로 되돌리기"
          data-testid="design-roll-icon-reset"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2" data-testid="design-roll-icon-presets">
        {ICON_PRESETS.map((preset) => {
          const active = Object.entries(preset.declarations).every(
            ([property, value]) => values[property] === value,
          );
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              title={`${preset.label} 주사위 아이콘`}
              className={cn(
                'grid h-[72px] grid-rows-[42px_auto] place-items-center rounded-lg border px-2 py-1.5 text-xs font-semibold',
                active
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
              )}
              onClick={() => onPatch(preset.declarations)}
              data-testid={`design-roll-icon-preset-${preset.id}`}
            >
              {preset.id === 'hidden' ? (
                <EyeOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              ) : (
                <Dice5 className={cn('text-[var(--primary-active)]', preset.previewClass)} aria-hidden="true" />
              )}
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-2">
          {hidden ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          아이콘 표시
        </span>
        <input
          type="checkbox"
          checked={!hidden}
          onChange={(event) => onPatch({ display: event.target.checked ? null : 'none' })}
          className="h-[18px] w-[18px] accent-[var(--primary)]"
          data-testid="design-roll-icon-visible"
        />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <IconSelect
          label="크기"
          value={values['font-size']}
          options={[
            ['', '기본'],
            ['0.85em', '작게'],
            ['1em', '보통'],
            ['1.2em', '크게'],
            ['1.45em', '아주 크게'],
          ]}
          onChange={(value) => onPatch({ 'font-size': value })}
          testid="design-roll-icon-size"
        />
        <IconSelect
          label="글자 사이"
          value={values['margin-right']}
          options={[
            ['', '기본'],
            ['2px', '좁게'],
            ['4px', '보통'],
            ['6px', '넓게'],
            ['10px', '아주 넓게'],
          ]}
          onChange={(value) => onPatch({ 'margin-right': value })}
          testid="design-roll-icon-gap"
        />
        <IconSelect
          label="선명도"
          value={values.opacity}
          options={[
            ['', '기본'],
            ['1', '선명'],
            ['0.75', '조금 연하게'],
            ['0.5', '연하게'],
          ]}
          onChange={(value) => onPatch({ opacity: value })}
          testid="design-roll-icon-opacity"
        />
        <label className="col-span-2 block">
          <span className="r20-field-label">색</span>
          <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-2">
            <input
              type="color"
              value={normalizeHex(values.color) ?? '#d96b91'}
              onChange={(event) => onPatch({ color: event.target.value })}
              className="h-9 w-9 cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1"
              aria-label="주사위 아이콘 색상표"
              data-testid="design-roll-icon-color-swatch"
            />
            <input
              type="text"
              value={colorValue}
              onChange={(event) => onPatch({ color: event.target.value || null })}
              placeholder="버튼 글자색 사용 중"
              spellCheck={false}
              className="r20-input min-w-0 font-mono"
              aria-label="주사위 아이콘 색상 값"
              data-testid="design-roll-icon-color-text"
            />
          </div>
        </label>
      </div>
    </section>
  );
}

function IconSelect({
  label,
  value,
  options,
  onChange,
  testid,
}: {
  label: string;
  value?: string;
  options: Array<readonly [string, string]>;
  onChange: (value: string | null) => void;
  testid: string;
}) {
  const known = options.some(([option]) => option === (value ?? ''));
  return (
    <label className="block">
      <span className="r20-field-label">{label}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        className="r20-input"
        data-testid={testid}
      >
        {!known && value && <option value={value}>사용자 지정</option>}
        {options.map(([option, text]) => <option key={option || 'default'} value={option}>{text}</option>)}
      </select>
    </label>
  );
}

function normalizeHex(value?: string): string | null {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  const short = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}

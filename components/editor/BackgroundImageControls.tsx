'use client';

import type { CSSProperties } from 'react';
import { AlertTriangle, ImageIcon, ImageOff } from 'lucide-react';
import type { ManagedDesignDeclarations } from '@/lib/editor/designPosition';
import {
  BACKGROUND_IMAGE_POSITIONS,
  BACKGROUND_IMAGE_REPEATS,
  BACKGROUND_IMAGE_SIZES,
  backgroundImageUrlPatch,
  readBackgroundImageSource,
  type BackgroundImagePosition,
} from '@/lib/editor/backgroundImageStyle';
import { cn } from '@/lib/utils/cn';

type BackgroundImageControlsProps = {
  values: Record<string, string>;
  onPatch: (declarations: ManagedDesignDeclarations) => void;
};

export default function BackgroundImageControls({
  values,
  onPatch,
}: BackgroundImageControlsProps) {
  const source = readBackgroundImageSource(values['background-image']);
  const previewStyle: CSSProperties = {
    backgroundImage: source.kind === 'remote' ? `url("${source.url}")` : undefined,
    backgroundSize: values['background-size'] ?? 'cover',
    backgroundPosition: values['background-position'] ?? 'center center',
    backgroundRepeat: values['background-repeat'] ?? 'no-repeat',
  };

  const commitUrl = (input: HTMLInputElement) => {
    const next = backgroundImageUrlPatch(input.value, values);
    input.setCustomValidity(next.result.error ?? '');
    if (next.result.error || !next.declarations) {
      input.reportValidity();
      input.value = source.url;
      return;
    }
    input.value = next.result.url ?? '';
    onPatch(next.declarations);
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">배경 이미지</h3>
      <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div
          className="grid h-24 place-items-center border-b border-[var(--border-subtle)] bg-[var(--bg-elevated-2)]"
          style={previewStyle}
          data-testid="design-background-preview"
          aria-hidden="true"
        >
          {source.kind !== 'remote' && <ImageIcon className="h-6 w-6 text-muted-foreground" />}
        </div>
        <div className="space-y-3 p-3">
          <label className="block">
            <span className="r20-field-label">이미지 주소</span>
            <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
              <input
                key={values['background-image'] ?? ''}
                type="url"
                defaultValue={source.url}
                onBlur={(event) => commitUrl(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    event.currentTarget.value = source.url;
                    event.currentTarget.setCustomValidity('');
                  }
                }}
                placeholder="https://..."
                spellCheck={false}
                className="r20-input min-w-0"
                data-testid="design-background-url"
              />
              <button
                type="button"
                onClick={() => onPatch({
                  'background-image': null,
                  'background-size': null,
                  'background-position': null,
                  'background-repeat': null,
                })}
                className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground"
                title="배경 이미지 지우기"
                aria-label="배경 이미지 지우기"
                data-testid="design-background-clear"
              >
                <ImageOff className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </label>

          {source.kind === 'complex' && (
            <p className="text-xs leading-relaxed text-muted-foreground" data-testid="design-background-complex">
              기존 복합 배경은 CSS에서 유지 중이에요.
            </p>
          )}
          {source.insecureHttp && (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-amber-700" data-testid="design-background-http-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              HTTP 이미지는 Roll20에서 차단될 수 있어요.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <BackgroundSelect
              label="맞춤"
              value={values['background-size']}
              options={BACKGROUND_IMAGE_SIZES}
              labels={{ auto: '원본', cover: '채우기', contain: '맞추기', '100% 100%': '늘이기' }}
              onChange={(value) => onPatch({ 'background-size': value })}
              testid="design-background-size"
            />
            <BackgroundSelect
              label="반복"
              value={values['background-repeat']}
              options={BACKGROUND_IMAGE_REPEATS}
              labels={{ 'no-repeat': '반복 안 함', repeat: '전체', 'repeat-x': '가로', 'repeat-y': '세로' }}
              onChange={(value) => onPatch({ 'background-repeat': value })}
              testid="design-background-repeat"
            />
          </div>

          <div>
            <span className="r20-field-label">위치</span>
            <div
              className="grid w-[108px] grid-cols-3 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)]"
              role="group"
              aria-label="배경 이미지 위치"
              data-testid="design-background-position"
            >
              {BACKGROUND_IMAGE_POSITIONS.map((position) => (
                <BackgroundPositionButton
                  key={position}
                  position={position}
                  active={normalizeBackgroundPosition(values['background-position']) === position}
                  onClick={() => onPatch({ 'background-position': position })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BackgroundSelect<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
  testid,
}: {
  label: string;
  value?: string;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: string | null) => void;
  testid: string;
}) {
  const known = options.includes(value as T);
  return (
    <label className="block">
      <span className="r20-field-label">{label}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        className="r20-input"
        data-testid={testid}
      >
        <option value="">기본</option>
        {!known && value && <option value={value}>사용자 지정</option>}
        {options.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
      </select>
    </label>
  );
}

function BackgroundPositionButton({
  position,
  active,
  onClick,
}: {
  position: BackgroundImagePosition;
  active: boolean;
  onClick: () => void;
}) {
  const [horizontal, vertical] = position.split(' ') as ['left' | 'center' | 'right', 'top' | 'center' | 'bottom'];
  const label = position === 'center center'
    ? '가운데'
    : `${horizontal === 'left' ? '왼쪽' : horizontal === 'right' ? '오른쪽' : '가운데'} ${vertical === 'top' ? '위' : vertical === 'bottom' ? '아래' : '가운데'}`;
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 border-b border-r border-[var(--border-subtle)] p-1 last:border-r-0 [&:nth-child(3n)]:border-r-0 [&:nth-child(n+7)]:border-b-0',
        horizontal === 'left' ? 'justify-start' : horizontal === 'right' ? 'justify-end' : 'justify-center',
        vertical === 'top' ? 'items-start' : vertical === 'bottom' ? 'items-end' : 'items-center',
        active ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]' : 'text-muted-foreground hover:bg-[var(--bg-hover)]',
      )}
      onClick={onClick}
      data-testid={`design-background-position-${position.replace(' ', '-')}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </button>
  );
}

function normalizeBackgroundPosition(value?: string): BackgroundImagePosition | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'center') return 'center center';
  return BACKGROUND_IMAGE_POSITIONS.includes(normalized as BackgroundImagePosition)
    ? normalized as BackgroundImagePosition
    : null;
}

'use client';

import { Crop, Expand, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import type { ManagedDesignDeclarations } from '@/lib/editor/designPosition';
import {
  IMAGE_CORNERS,
  IMAGE_OBJECT_POSITIONS,
  IMAGE_OPACITIES,
  imageStyleResetPatch,
  normalizeImageObjectPosition,
  type ImageObjectFit,
  type ImageObjectPosition,
} from '@/lib/editor/imageStyle';
import { cn } from '@/lib/utils/cn';

type ImageStyleControlsProps = {
  values: Record<string, string>;
  onPatch: (declarations: ManagedDesignDeclarations) => void;
};

const FIT_OPTIONS = [
  ['none', '원본', Minimize2],
  ['cover', '채우기', Crop],
  ['contain', '맞추기', Maximize2],
  ['fill', '늘이기', Expand],
] as const satisfies ReadonlyArray<readonly [ImageObjectFit, string, typeof Crop]>;

const OPACITY_LABELS: Record<(typeof IMAGE_OPACITIES)[number], string> = {
  '1': '100%',
  '0.75': '75%',
  '0.5': '50%',
  '0.25': '25%',
};

const CORNER_LABELS: Record<(typeof IMAGE_CORNERS)[number], string> = {
  '0px': '각지게',
  '4px': '살짝',
  '8px': '둥글게',
  '999px': '많이',
};

export default function ImageStyleControls({ values, onPatch }: ImageStyleControlsProps) {
  const position = normalizeImageObjectPosition(values['object-position']);

  return (
    <section data-testid="design-image-style">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)]">이미지 모양</h3>
        <button
          type="button"
          onClick={() => onPatch(imageStyleResetPatch())}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground"
          title="이미지 모양 지우기"
          aria-label="이미지 모양 지우기"
          data-testid="design-image-style-reset"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p className="r20-field-label">맞춤</p>
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="이미지 맞춤">
        {FIT_OPTIONS.map(([fit, label, Icon]) => (
          <button
            key={fit}
            type="button"
            aria-pressed={values['object-fit'] === fit}
            title={`이미지 ${label}`}
            className={cn(
              'grid h-[58px] grid-rows-[28px_auto] place-items-center rounded-lg border px-1 py-1.5 text-[11px] font-semibold',
              values['object-fit'] === fit
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
            onClick={() => onPatch({ 'object-fit': fit })}
            data-testid={`design-image-fit-${fit}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-[108px_minmax(0,1fr)] gap-3">
        <div>
          <p className="r20-field-label">초점</p>
          <div
            className="grid w-[108px] grid-cols-3 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)]"
            role="group"
            aria-label="이미지 초점"
            data-testid="design-image-position"
          >
            {IMAGE_OBJECT_POSITIONS.map((option) => (
              <ImagePositionButton
                key={option}
                position={option}
                active={position === option}
                onClick={() => onPatch({ 'object-position': option })}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="r20-field-label">투명도</p>
          <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
            {IMAGE_OPACITIES.map((opacity) => (
              <button
                key={opacity}
                type="button"
                aria-pressed={values.opacity === opacity}
                title={`투명도 ${OPACITY_LABELS[opacity]}`}
                className={cn(
                  'h-9 border-b border-r border-[var(--border-subtle)] text-[11px] font-semibold even:border-r-0 [&:nth-child(n+3)]:border-b-0',
                  values.opacity === opacity
                    ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )}
                onClick={() => onPatch({ opacity })}
                data-testid={`design-image-opacity-${opacity.replace('.', '-')}`}
              >
                {OPACITY_LABELS[opacity]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="r20-field-label mt-3">모서리</p>
      <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
        {IMAGE_CORNERS.map((corner) => (
          <button
            key={corner}
            type="button"
            aria-pressed={values['border-radius'] === corner}
            title={`모서리 ${CORNER_LABELS[corner]}`}
            className={cn(
              'h-9 border-r border-[var(--border-subtle)] px-1 text-[11px] font-semibold last:border-r-0',
              values['border-radius'] === corner
                ? 'bg-[var(--primary-soft)] text-[var(--primary-active)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
            onClick={() => onPatch({ 'border-radius': corner })}
            data-testid={`design-image-corner-${corner.replace('px', '')}`}
          >
            {CORNER_LABELS[corner]}
          </button>
        ))}
      </div>
    </section>
  );
}

function ImagePositionButton({
  position,
  active,
  onClick,
}: {
  position: ImageObjectPosition;
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
      data-testid={`design-image-position-${position.replace(' ', '-')}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </button>
  );
}

'use client';

/**
 * EditToolbar — compact tool strip for the edit canvas: snap, placement mode,
 * canvas width, zoom, and the live status readout.
 *
 * Layout contract: the snap toggle and the `.ml-auto` status element must stay
 * direct children of the same row (edit_flow_browser_smoke reads the status
 * text through the snap toggle's parent).
 */

import { Magnet, MoveDiagonal, Rows3 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type EditToolbarProps = {
  title: string;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  placementMode: 'flow' | 'free';
  onPlacementModeChange: (mode: 'flow' | 'free') => void;
  canvasWidth: number;
  minWidth: number;
  maxWidth: number;
  widthAriaLabel: string;
  onCanvasWidthChange: (width: number) => void;
  zoom: 'fit' | number;
  onZoomChange: (zoom: 'fit' | number) => void;
  statusText: string;
};

export default function EditToolbar({
  title,
  snapEnabled,
  onToggleSnap,
  placementMode,
  onPlacementModeChange,
  canvasWidth,
  minWidth,
  maxWidth,
  widthAriaLabel,
  onCanvasWidthChange,
  zoom,
  onZoomChange,
  statusText,
}: EditToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2.5 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs">
      <span className="font-medium text-foreground">{title}</span>
      <button
        type="button"
        onClick={onToggleSnap}
        className={cn(
          'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors',
          snapEnabled
            ? 'border-[var(--color-primary,#2563eb)] bg-[var(--color-primary,#2563eb)] text-white'
            : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)]',
        )}
        title="8px 격자에 맞추기"
        data-testid="edit-canvas-snap-toggle"
      >
        <Magnet aria-hidden="true" className="h-3 w-3" />
        snap {snapEnabled ? '8px' : 'off'}
      </button>
      <div
        className="flex items-center overflow-hidden rounded border border-border bg-[var(--bg-elevated-2)]"
        data-testid="edit-placement-mode"
        role="radiogroup"
        aria-label="배치 방식"
      >
        <button
          type="button"
          role="radio"
          aria-checked={placementMode === 'flow'}
          onClick={() => onPlacementModeChange('flow')}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 text-xs transition-colors',
            placementMode === 'flow'
              ? 'bg-[var(--color-primary,#2563eb)] text-white'
              : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
          )}
          title="틀 안에 놓으면 주변 요소와 함께 흐름 배치합니다."
          data-testid="edit-placement-flow"
        >
          <Rows3 aria-hidden="true" className="h-3 w-3" />
          흐름
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={placementMode === 'free'}
          onClick={() => onPlacementModeChange('free')}
          className={cn(
            'inline-flex items-center gap-1 border-l border-border px-2 py-0.5 text-xs transition-colors',
            placementMode === 'free'
              ? 'bg-[var(--color-primary,#2563eb)] text-white'
              : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
          )}
          title="틀 안에 놓되 해당 틀 기준으로 자유 배치합니다."
          data-testid="edit-placement-free"
        >
          <MoveDiagonal aria-hidden="true" className="h-3 w-3" />
          자유
        </button>
      </div>
      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        폭
        <input
          type="number"
          min={minWidth}
          max={maxWidth}
          step={10}
          value={canvasWidth}
          onChange={(e) => onCanvasWidthChange(Number(e.target.value))}
          className="h-6 w-[76px] rounded border border-border bg-[var(--bg-elevated-2)] px-2 text-right text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          aria-label={widthAriaLabel}
          data-testid="edit-canvas-width-input"
        />
        px
      </label>
      <div
        className="flex items-center overflow-hidden rounded border border-border bg-[var(--bg-elevated-2)]"
        data-testid="edit-zoom-control"
        role="radiogroup"
        aria-label="확대 비율"
      >
        <button
          type="button"
          role="radio"
          aria-checked={zoom === 'fit'}
          onClick={() => onZoomChange('fit')}
          className={cn(
            'px-2 py-0.5 text-xs transition-colors',
            zoom === 'fit'
              ? 'bg-[var(--color-primary,#2563eb)] text-white'
              : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
          )}
          title="시트 전체를 현재 화면에 맞춥니다."
          data-testid="edit-zoom-fit"
        >
          맞춤
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={zoom === 1}
          onClick={() => onZoomChange(1)}
          className={cn(
            'border-l border-border px-2 py-0.5 text-xs transition-colors',
            zoom === 1
              ? 'bg-[var(--color-primary,#2563eb)] text-white'
              : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
          )}
          title="Roll20 시트 크기 그대로 봅니다."
          data-testid="edit-zoom-100"
        >
          100%
        </button>
      </div>
      <div className="ml-auto truncate text-[10px] text-muted-foreground tabular-nums" data-testid="edit-canvas-status">
        {statusText}
      </div>
    </div>
  );
}

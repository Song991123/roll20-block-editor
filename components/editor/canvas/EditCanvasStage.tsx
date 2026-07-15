'use client';

/**
 * EditCanvasStage — the scrollable, zoomable stage that holds the canonical
 * preview-rendered sheet (shadow host) plus editor-only overlays.
 *
 * The sheet itself is mounted into `hostRef` by EditCanvas via mountSheetShadow;
 * this component owns only stage chrome: scroll area, zoom scaling wrapper,
 * empty state, and the selection overlay layer.
 */

import type { RefObject } from 'react';
import SelectionOverlay from './SelectionOverlay';

export default function EditCanvasStage({
  scrollRef,
  hostRef,
  isEmpty,
  canvasWidth,
  canvasHeight,
  scale,
  selectedBlockId,
  onDragOver,
  onDrop,
  onStatus,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
  hostRef: RefObject<HTMLDivElement | null>;
  isEmpty: boolean;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  selectedBlockId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onStatus: (message: string) => void;
}) {
  return (
    <div
      ref={scrollRef}
      className="min-h-0 overflow-auto p-5"
      data-testid="edit-canvas-scroll"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {isEmpty ? (
        <div
          className="flex min-h-[420px] items-center justify-center rounded border border-dashed border-border bg-[var(--bg-elevated)] text-sm text-muted-foreground"
          data-testid="edit-canvas-empty"
        >
          HTML/CSS를 불러오거나 요소를 놓으면 여기에서 바로 편집할 수 있습니다.
        </div>
      ) : (
        <div
          className="mx-auto"
          style={{
            width: `${canvasWidth * scale}px`,
            height: `${canvasHeight * scale}px`,
            maxWidth: 'none',
          }}
        >
          <div
            className="relative"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <div
              ref={hostRef}
              data-testid="edit-canvas-shadow-host"
              className="block overflow-visible bg-white"
              style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
            <SelectionOverlay
              hostRef={hostRef}
              blockId={selectedBlockId}
              scale={scale}
              onStatus={onStatus}
            />
          </div>
        </div>
      )}
    </div>
  );
}

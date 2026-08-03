/**
 * Shared canvas-width policy for the visual editor and the iframe bridge.
 *
 * Roll20 sheets commonly start around 850px, but a custom sheet is allowed to
 * choose a wider authored surface. Keep one safety ceiling for pathological
 * measurements without silently reducing ordinary custom-sheet widths.
 */
export const SHEET_CANVAS_MIN_WIDTH = 320;
export const SHEET_CANVAS_DEFAULT_WIDTH = 850;
export const SHEET_CANVAS_MAX_WIDTH = 10000;

export const ROLLTEMPLATE_CANVAS_MIN_WIDTH = 200;
export const ROLLTEMPLATE_CANVAS_DEFAULT_WIDTH = 280;
export const ROLLTEMPLATE_CANVAS_MAX_WIDTH = 600;

// The render surface follows the authored sheet height. Keep only a one-pixel
// floor for a temporarily empty document and a ceiling for broken measurements.
export const SHEET_RENDER_MIN_HEIGHT = 1;
export const SHEET_RENDER_MAX_HEIGHT = 60000;

export type CanvasDimensionKind = 'sheet' | 'rolltemplate';

export type EmptyCanvasDropGeometry = {
  pointer: { x: number; y: number };
  surface: {
    left: number;
    top: number;
    width: number;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
  };
  canvasWidth: number;
  scale: number;
  snapSize?: number;
};

export function clampCanvasWidth(kind: CanvasDimensionKind, value: number): number {
  const bounds = kind === 'sheet'
    ? {
        min: SHEET_CANVAS_MIN_WIDTH,
        max: SHEET_CANVAS_MAX_WIDTH,
        fallback: SHEET_CANVAS_DEFAULT_WIDTH,
      }
    : {
        min: ROLLTEMPLATE_CANVAS_MIN_WIDTH,
        max: ROLLTEMPLATE_CANVAS_MAX_WIDTH,
        fallback: ROLLTEMPLATE_CANVAS_DEFAULT_WIDTH,
      };
  const numeric = Number.isFinite(value) ? Math.round(value) : bounds.fallback;
  return Math.max(bounds.min, Math.min(bounds.max, numeric));
}

export function clampSheetRenderHeight(value: number): number {
  const numeric = Number.isFinite(value) ? Math.ceil(value) : SHEET_RENDER_MIN_HEIGHT;
  return Math.max(SHEET_RENDER_MIN_HEIGHT, Math.min(SHEET_RENDER_MAX_HEIGHT, numeric));
}

/** Map an empty editor surface drop to the centered sheet canvas it will create. */
export function resolveEmptyCanvasDropPoint({
  pointer,
  surface,
  canvasWidth,
  scale,
  snapSize = 1,
}: EmptyCanvasDropGeometry): { left: number; top: number } {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const safeCanvasWidth = clampCanvasWidth('sheet', canvasWidth);
  const contentWidth = Math.max(0, surface.width - surface.paddingLeft - surface.paddingRight);
  const canvasLeft = surface.left
    + surface.paddingLeft
    + Math.max(0, (contentWidth - safeCanvasWidth * safeScale) / 2);
  const canvasTop = surface.top + surface.paddingTop;
  const step = Number.isFinite(snapSize)
    ? Math.max(1, Math.min(128, Math.round(snapSize)))
    : 1;
  const snap = (value: number) => Math.max(0, Math.round(value / step) * step);

  return {
    left: Math.min(safeCanvasWidth, snap((pointer.x - canvasLeft) / safeScale)),
    top: snap((pointer.y - canvasTop) / safeScale),
  };
}

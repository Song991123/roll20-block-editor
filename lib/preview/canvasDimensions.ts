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

export type CanvasDimensionKind = 'sheet' | 'rolltemplate';

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

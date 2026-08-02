export type DropIndicatorMode = 'before' | 'inside' | 'after';

export type DropIndicatorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const MIN_INDICATOR_THICKNESS = 2;
const MAX_INDICATOR_THICKNESS = 12;
const DEFAULT_AUTO_SCROLL_EDGE = 48;
const DEFAULT_AUTO_SCROLL_STEP = 18;

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/**
 * Turn a target element's rect into the paint rect for an exact insertion
 * marker. Before/after use a thin line at the relevant edge; inside keeps the
 * target bounds so the container affordance can be painted as a frame.
 */
export function getDropIndicatorRect(
  mode: DropIndicatorMode,
  target: DropIndicatorRect,
  requestedThickness = 4,
): DropIndicatorRect {
  const left = finiteOrZero(target.left);
  const top = finiteOrZero(target.top);
  const width = Math.max(1, finiteOrZero(target.width));
  const height = Math.max(1, finiteOrZero(target.height));
  if (mode === 'inside') return { left, top, width, height };

  const thickness = Math.min(
    Math.max(MIN_INDICATOR_THICKNESS, Math.round(finiteOrZero(requestedThickness))),
    Math.min(MAX_INDICATOR_THICKNESS, height),
  );
  return {
    left,
    top: mode === 'before' ? top : top + height - thickness,
    width,
    height: thickness,
  };
}

export function dropIndicatorLabel(mode: DropIndicatorMode): string {
  if (mode === 'inside') return '안에 넣기';
  if (mode === 'before') return '앞에 놓기';
  return '뒤에 놓기';
}

/**
 * Scroll a long virtualized layer list while a dragged row stays near an edge.
 * The closer the pointer gets to the edge, the faster the list advances.
 */
export function getLayerPanelAutoScrollDelta(
  pointerY: number,
  bounds: { top: number; bottom: number },
  edgeSize = DEFAULT_AUTO_SCROLL_EDGE,
  maxStep = DEFAULT_AUTO_SCROLL_STEP,
): number {
  const top = finiteOrZero(bounds.top);
  const bottom = finiteOrZero(bounds.bottom);
  const height = Math.max(0, bottom - top);
  if (height === 0 || !Number.isFinite(pointerY)) return 0;

  const edge = Math.max(1, Math.min(Math.abs(finiteOrZero(edgeSize)), height / 2));
  const step = Math.max(1, Math.round(Math.abs(finiteOrZero(maxStep))));
  const topDistance = pointerY - top;
  if (topDistance < edge) {
    const strength = Math.min(1, Math.max(0, (edge - topDistance) / edge));
    return -Math.max(1, Math.round(step * strength));
  }

  const bottomDistance = bottom - pointerY;
  if (bottomDistance < edge) {
    const strength = Math.min(1, Math.max(0, (edge - bottomDistance) / edge));
    return Math.max(1, Math.round(step * strength));
  }
  return 0;
}

import type { ManagedDesignDeclarations } from './designPosition';
import type {
  IframeEditNodeGeometry,
  IframeEditRect,
} from '@/lib/preview/iframeEditBridge';

export const DESIGN_RESIZE_HANDLES = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
] as const;

export type DesignResizeHandle = (typeof DESIGN_RESIZE_HANDLES)[number];

const FLOW_RESIZE_HANDLES: readonly DesignResizeHandle[] = ['e', 'se', 's'];
const MIN_RENDERED_SIZE = 8;
const MAX_RENDERED_SIZE = 100_000;

const NON_RESIZABLE_DISPLAYS = new Set([
  'none',
  'contents',
  'inline',
  'table-row',
  'table-row-group',
  'table-header-group',
  'table-footer-group',
  'table-column',
  'table-column-group',
]);

export function resizeHandlesForGeometry(
  geometry: IframeEditNodeGeometry,
): readonly DesignResizeHandle[] {
  if (!isDirectResizeGeometry(geometry)) return [];
  return geometry.position === 'absolute'
    ? DESIGN_RESIZE_HANDLES
    : FLOW_RESIZE_HANDLES;
}

export function isDirectResizeGeometry(geometry: IframeEditNodeGeometry): boolean {
  if (geometry.rect.width <= 0 || geometry.rect.height <= 0) return false;
  const display = (geometry.display ?? '').trim().toLowerCase();
  if (display === 'inline' && geometry.tagName === 'img') return true;
  return !NON_RESIZABLE_DISPLAYS.has(display);
}

export function resolveDesignResizeRect(
  origin: IframeEditRect,
  handle: DesignResizeHandle,
  deltaX: number,
  deltaY: number,
  snapSize = 1,
): IframeEditRect {
  const step = normalizeStep(snapSize);
  const horizontal = resizeAxis(
    origin.left,
    origin.width,
    handle.includes('w') ? 'leading' : handle.includes('e') ? 'trailing' : 'none',
    finiteOrZero(deltaX),
    step,
  );
  const vertical = resizeAxis(
    origin.top,
    origin.height,
    handle.includes('n') ? 'leading' : handle.includes('s') ? 'trailing' : 'none',
    finiteOrZero(deltaY),
    step,
  );
  return {
    left: horizontal.start,
    top: vertical.start,
    width: horizontal.size,
    height: vertical.size,
  };
}

export function managedResizeDeclarations(
  geometry: IframeEditNodeGeometry,
  origin: IframeEditRect,
  next: IframeEditRect,
  handle: DesignResizeHandle,
): ManagedDesignDeclarations {
  const declarations: ManagedDesignDeclarations = {};
  if (handle.includes('w') || handle.includes('e')) {
    const cssWidth = sourceCssSize(geometry.computedWidth, origin.width)
      + (next.width - origin.width);
    declarations.width = formatPixels(cssWidth);
  }
  if (handle.includes('n') || handle.includes('s')) {
    const cssHeight = sourceCssSize(geometry.computedHeight, origin.height)
      + (next.height - origin.height);
    declarations.height = formatPixels(cssHeight);
  }
  if (geometry.position === 'absolute' && handle.includes('w')) {
    declarations.left = formatPixels(geometry.offsetLeft + next.left - origin.left);
    declarations.right = null;
  }
  if (geometry.position === 'absolute' && handle.includes('n')) {
    declarations.top = formatPixels(geometry.offsetTop + next.top - origin.top);
    declarations.bottom = null;
  }
  return declarations;
}

function resizeAxis(
  start: number,
  size: number,
  edge: 'leading' | 'trailing' | 'none',
  delta: number,
  step: number,
): { start: number; size: number } {
  if (edge === 'none') return { start, size };
  const rawSize = edge === 'leading' ? size - delta : size + delta;
  const nextSize = clamp(snap(rawSize, step), MIN_RENDERED_SIZE, MAX_RENDERED_SIZE);
  return {
    start: edge === 'leading' ? start + size - nextSize : start,
    size: nextSize,
  };
}

function sourceCssSize(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && Number(value) >= 0 ? Number(value) : fallback;
}

function formatPixels(value: number): string {
  const rounded = Math.max(0, Math.round(finiteOrZero(value) * 1000) / 1000);
  return `${Object.is(rounded, -0) ? 0 : rounded}px`;
}

function normalizeStep(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(128, Math.round(value)));
}

function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

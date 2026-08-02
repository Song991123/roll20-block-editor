import type { IframeEditRect } from '@/lib/preview/iframeEditBridge';

export const DESIGN_ALIGNMENT_MODES = [
  'left',
  'horizontal-center',
  'right',
  'top',
  'vertical-center',
  'bottom',
] as const;

export type DesignAlignmentMode = (typeof DESIGN_ALIGNMENT_MODES)[number];

export const DESIGN_DISTRIBUTION_MODES = ['horizontal', 'vertical'] as const;

export type DesignDistributionMode = (typeof DESIGN_DISTRIBUTION_MODES)[number];

export type DesignAlignmentItem = {
  blockId: string;
  rect: IframeEditRect;
};

export type DesignAlignmentDelta = {
  blockId: string;
  deltaX: number;
  deltaY: number;
};

export function designSelectionBounds(
  items: readonly DesignAlignmentItem[],
): IframeEditRect | null {
  if (items.length < 2 || items.some((item) => !validRect(item.rect))) return null;
  const left = Math.min(...items.map((item) => item.rect.left));
  const top = Math.min(...items.map((item) => item.rect.top));
  const right = Math.max(...items.map((item) => item.rect.left + item.rect.width));
  const bottom = Math.max(...items.map((item) => item.rect.top + item.rect.height));
  return { left, top, width: right - left, height: bottom - top };
}

export function resolveDesignAlignment(
  items: readonly DesignAlignmentItem[],
  mode: DesignAlignmentMode,
): DesignAlignmentDelta[] {
  const bounds = designSelectionBounds(items);
  if (!bounds) return [];
  const right = bounds.left + bounds.width;
  const bottom = bounds.top + bounds.height;
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;

  return items.map((item) => {
    let deltaX = 0;
    let deltaY = 0;
    if (mode === 'left') deltaX = bounds.left - item.rect.left;
    if (mode === 'horizontal-center') {
      deltaX = centerX - (item.rect.left + item.rect.width / 2);
    }
    if (mode === 'right') deltaX = right - (item.rect.left + item.rect.width);
    if (mode === 'top') deltaY = bounds.top - item.rect.top;
    if (mode === 'vertical-center') {
      deltaY = centerY - (item.rect.top + item.rect.height / 2);
    }
    if (mode === 'bottom') deltaY = bottom - (item.rect.top + item.rect.height);
    return {
      blockId: item.blockId,
      deltaX: roundPixels(deltaX),
      deltaY: roundPixels(deltaY),
    };
  });
}

export function resolveDesignDistribution(
  items: readonly DesignAlignmentItem[],
  mode: DesignDistributionMode,
): DesignAlignmentDelta[] {
  const bounds = designSelectionBounds(items);
  if (!bounds || items.length < 3) return [];
  const horizontal = mode === 'horizontal';
  const sorted = [...items].sort((a, b) => {
    const delta = (horizontal ? a.rect.left : a.rect.top)
      - (horizontal ? b.rect.left : b.rect.top);
    return delta || a.blockId.localeCompare(b.blockId);
  });
  const totalSize = sorted.reduce(
    (sum, item) => sum + (horizontal ? item.rect.width : item.rect.height),
    0,
  );
  const span = horizontal ? bounds.width : bounds.height;
  const gap = (span - totalSize) / (sorted.length - 1);
  const targetStart = new Map<string, number>();
  let cursor = horizontal ? bounds.left : bounds.top;
  sorted.forEach((item) => {
    targetStart.set(item.blockId, cursor);
    cursor += (horizontal ? item.rect.width : item.rect.height) + gap;
  });

  return items.map((item) => {
    const start = horizontal ? item.rect.left : item.rect.top;
    const delta = roundPixels((targetStart.get(item.blockId) ?? start) - start);
    return {
      blockId: item.blockId,
      deltaX: horizontal ? delta : 0,
      deltaY: horizontal ? 0 : delta,
    };
  });
}

function validRect(rect: IframeEditRect): boolean {
  return [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
    && rect.width >= 0
    && rect.height >= 0;
}

function roundPixels(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

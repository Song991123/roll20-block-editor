import type { ManagedDesignDeclarations } from './designPosition';

export const IMAGE_OBJECT_FITS = ['none', 'cover', 'contain', 'fill'] as const;
export const IMAGE_OBJECT_POSITIONS = [
  'left top',
  'center top',
  'right top',
  'left center',
  'center center',
  'right center',
  'left bottom',
  'center bottom',
  'right bottom',
] as const;
export const IMAGE_OPACITIES = ['1', '0.75', '0.5', '0.25'] as const;
export const IMAGE_CORNERS = ['0px', '4px', '8px', '999px'] as const;

export type ImageObjectFit = (typeof IMAGE_OBJECT_FITS)[number];
export type ImageObjectPosition = (typeof IMAGE_OBJECT_POSITIONS)[number];
export type ImageOpacity = (typeof IMAGE_OPACITIES)[number];
export type ImageCorner = (typeof IMAGE_CORNERS)[number];

const IMAGE_STYLE_BLOCK_TYPES = new Set(['r20_image']);

export function hasImageStyleControls(blockType: string): boolean {
  return IMAGE_STYLE_BLOCK_TYPES.has(blockType.toLowerCase());
}

export function normalizeImageObjectPosition(value?: string): ImageObjectPosition | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'center') return 'center center';
  return IMAGE_OBJECT_POSITIONS.includes(normalized as ImageObjectPosition)
    ? normalized as ImageObjectPosition
    : null;
}

export function imageStyleResetPatch(): ManagedDesignDeclarations {
  return {
    'object-fit': null,
    'object-position': null,
    opacity: null,
    'border-radius': null,
  };
}

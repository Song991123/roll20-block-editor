import type { ManagedDesignDeclarations } from './designPosition';

export const SECTION_ACCENT_POSITIONS = ['none', 'left', 'top', 'right', 'bottom'] as const;
export type SectionAccentPosition = (typeof SECTION_ACCENT_POSITIONS)[number];

export const SECTION_ACCENT_WIDTHS = ['2px', '4px', '6px'] as const;
export type SectionAccentWidth = (typeof SECTION_ACCENT_WIDTHS)[number];

export const DEFAULT_SECTION_ACCENT_COLOR = '#d96b91';

const BORDER_SIDES = ['left', 'top', 'right', 'bottom'] as const;

export type SectionAccentState = {
  position: SectionAccentPosition;
  width: string;
  color: string;
};

export function readSectionAccent(values: Record<string, string>): SectionAccentState {
  for (const side of BORDER_SIDES) {
    const width = values[`border-${side}-width`] ?? '';
    const style = String(values[`border-${side}-style`] ?? '').trim().toLowerCase();
    if (!hasVisibleBorderWidth(width) || style === 'none' || style === 'hidden') continue;
    return {
      position: side,
      width,
      color: values[`border-${side}-color`]
        ?? values['border-color']
        ?? DEFAULT_SECTION_ACCENT_COLOR,
    };
  }
  return {
    position: 'none',
    width: '4px',
    color: values['border-color'] ?? DEFAULT_SECTION_ACCENT_COLOR,
  };
}

export function sectionAccentPatch(
  position: SectionAccentPosition,
  color = DEFAULT_SECTION_ACCENT_COLOR,
  width: SectionAccentWidth = '4px',
): ManagedDesignDeclarations {
  const declarations: ManagedDesignDeclarations = {};
  for (const side of BORDER_SIDES) {
    declarations[`border-${side}`] = null;
    declarations[`border-${side}-width`] = null;
    declarations[`border-${side}-style`] = null;
    declarations[`border-${side}-color`] = null;
  }
  if (position === 'none') return declarations;
  declarations[`border-${position}-width`] = width;
  declarations[`border-${position}-style`] = 'solid';
  declarations[`border-${position}-color`] = color;
  return declarations;
}

export function sectionAccentColorPatch(
  values: Record<string, string>,
  color: string,
): ManagedDesignDeclarations {
  const accent = readSectionAccent(values);
  return accent.position === 'none'
    ? {}
    : { [`border-${accent.position}-color`]: color };
}

export function sectionAccentWidthPatch(
  values: Record<string, string>,
  width: SectionAccentWidth,
): ManagedDesignDeclarations {
  const accent = readSectionAccent(values);
  return accent.position === 'none'
    ? {}
    : { [`border-${accent.position}-width`]: width };
}

function hasVisibleBorderWidth(value: string): boolean {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'initial' || raw === 'unset') return false;
  const numeric = raw.match(/^(-?\d+(?:\.\d+)?)(?:[a-z%]+)?$/);
  return numeric ? Number(numeric[1]) > 0 : true;
}

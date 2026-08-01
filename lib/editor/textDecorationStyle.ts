import type { ManagedDesignDeclarations } from './designPosition';

export const TEXT_DECORATION_MODES = ['plain', 'underline', 'side', 'band', 'tag'] as const;
export type TextDecorationMode = (typeof TEXT_DECORATION_MODES)[number];

export type TextDecorationPalette = {
  id: string;
  label: string;
  accent: string;
  surface: string;
  foreground: string;
};

export const TEXT_DECORATION_PALETTES: readonly TextDecorationPalette[] = [
  { id: 'rose', label: '장미', accent: '#d96b91', surface: '#fff2f6', foreground: '#8f3154' },
  { id: 'mint', label: '민트', accent: '#4ea88b', surface: '#e8f7f1', foreground: '#285c4c' },
  { id: 'gold', label: '금빛', accent: '#c9943e', surface: '#fff6df', foreground: '#6d4b15' },
  { id: 'ink', label: '먹색', accent: '#595057', surface: '#f0edef', foreground: '#403940' },
];

const TEXT_DECORATION_BLOCK_TYPES = new Set([
  'r20_heading',
  'r20_label',
  'r20_static_text',
  'r20_i18n_text',
]);

export function hasTextDecorationControls(blockType: string): boolean {
  return TEXT_DECORATION_BLOCK_TYPES.has(blockType.toLowerCase());
}

export function readTextDecorationMode(values: Record<string, string>): TextDecorationMode {
  const widths = readBorderWidths(values);
  const borderStyle = String(values['border-style'] ?? '').trim().toLowerCase();
  const hasStyledBorder = Boolean(borderStyle && borderStyle !== 'none' && borderStyle !== 'hidden');
  const radius = Number.parseFloat(values['border-radius'] ?? '0');
  const background = String(values['background-color'] ?? '').trim().toLowerCase();
  const hasBackground = Boolean(background && background !== 'transparent' && background !== 'none');
  if (hasBackground && Number.isFinite(radius) && radius >= 100) return 'tag';
  if (hasStyledBorder
    && hasVisibleWidth(widths.left)
    && !hasVisibleWidth(widths.top)
    && !hasVisibleWidth(widths.right)
    && !hasVisibleWidth(widths.bottom)) {
    return 'side';
  }
  if (hasStyledBorder
    && hasVisibleWidth(widths.bottom)
    && !hasVisibleWidth(widths.top)
    && !hasVisibleWidth(widths.right)
    && !hasVisibleWidth(widths.left)) {
    return 'underline';
  }
  if (hasBackground) return 'band';
  return 'plain';
}

export function readTextDecorationPalette(values: Record<string, string>): TextDecorationPalette {
  const color = normalizeHex(values['border-color'])
    ?? normalizeHex(values.color)
    ?? TEXT_DECORATION_PALETTES[0].accent;
  return TEXT_DECORATION_PALETTES.find((palette) => (
    palette.accent.toLowerCase() === color.toLowerCase()
      || palette.foreground.toLowerCase() === color.toLowerCase()
  )) ?? customTextDecorationPalette(color);
}

export function textDecorationModePatch(
  mode: TextDecorationMode,
  palette: TextDecorationPalette,
): ManagedDesignDeclarations {
  const base: ManagedDesignDeclarations = {
    'background-color': 'transparent',
    'background-image': 'none',
    'border-width': '0',
    'border-style': 'none',
    'border-color': palette.accent,
    'border-radius': '0',
    padding: '0',
    'box-shadow': 'none',
    color: palette.foreground,
  };
  if (mode === 'underline') {
    return {
      ...base,
      'border-width': '0 0 2px 0',
      'border-style': 'solid',
      padding: '6px 2px',
    };
  }
  if (mode === 'side') {
    return {
      ...base,
      'border-width': '0 0 0 4px',
      'border-style': 'solid',
      padding: '4px 8px',
    };
  }
  if (mode === 'band') {
    return {
      ...base,
      'background-color': palette.surface,
      'border-width': '1px',
      'border-style': 'solid',
      'border-radius': '4px',
      padding: '6px 10px',
    };
  }
  if (mode === 'tag') {
    return {
      ...base,
      'background-color': palette.surface,
      'border-width': '1px',
      'border-style': 'solid',
      'border-radius': '999px',
      padding: '4px 10px',
    };
  }
  return {
    ...base,
    'border-color': null,
    color: null,
  };
}

export function customTextDecorationPalette(color: string): TextDecorationPalette {
  const normalized = normalizeHex(color) ?? TEXT_DECORATION_PALETTES[0].accent;
  const rgb = hexToRgb(normalized);
  return {
    id: 'custom',
    label: '직접 선택',
    accent: normalized,
    surface: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`,
    foreground: mixHex(normalized, '#1f1720', 0.5),
  };
}

function readBorderWidths(values: Record<string, string>): Record<'top' | 'right' | 'bottom' | 'left', string> {
  const shorthand = String(values['border-width'] ?? '').trim().split(/\s+/).filter(Boolean);
  const expanded = expandFour(shorthand);
  return {
    top: values['border-top-width'] ?? expanded[0],
    right: values['border-right-width'] ?? expanded[1],
    bottom: values['border-bottom-width'] ?? expanded[2],
    left: values['border-left-width'] ?? expanded[3],
  };
}

function expandFour(values: string[]): [string, string, string, string] {
  if (values.length === 1) return [values[0], values[0], values[0], values[0]];
  if (values.length === 2) return [values[0], values[1], values[0], values[1]];
  if (values.length === 3) return [values[0], values[1], values[2], values[1]];
  if (values.length >= 4) return [values[0], values[1], values[2], values[3]];
  return ['', '', '', ''];
}

function hasVisibleWidth(value: string): boolean {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'initial' || raw === 'unset') return false;
  const numeric = raw.match(/^(-?\d+(?:\.\d+)?)(?:[a-z%]+)?$/);
  return numeric ? Number(numeric[1]) > 0 : true;
}

function normalizeHex(value?: string): string | null {
  const raw = String(value ?? '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  const short = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  return short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : null;
}

function hexToRgb(value: string): { r: number; g: number; b: number } {
  const hex = value.slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function mixHex(first: string, second: string, secondWeight: number): string {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const channel = (left: number, right: number) => Math.round(left * (1 - secondWeight) + right * secondWeight);
  return `#${[channel(a.r, b.r), channel(a.g, b.g), channel(a.b, b.b)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

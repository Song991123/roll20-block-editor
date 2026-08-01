import {
  MANAGED_DESIGN_STATES,
  type ManagedDesignDeclarations,
  type ManagedDesignState,
} from './designPosition';

export type RollButtonTheme = {
  id: 'ribbon' | 'ticket' | 'mint-tab' | 'ink-stamp';
  label: string;
  description: string;
  states: Record<ManagedDesignState, ManagedDesignDeclarations>;
  before: ManagedDesignDeclarations;
};

const sharedBase: ManagedDesignDeclarations = {
  'background-image': 'none',
  padding: '7px 14px',
  'font-size': '14px',
  'font-weight': '700',
  'line-height': '1.25',
  'letter-spacing': '0',
  'text-shadow': 'none',
};

const sharedBefore: ManagedDesignDeclarations = {
  display: 'inline-block',
  'font-size': '1.15em',
  'margin-right': '6px',
  opacity: '1',
  'text-shadow': 'none',
};

const clearInheritedStateOverrides: ManagedDesignDeclarations = {
  'background-image': null,
  'border-width': null,
  'border-style': null,
  'border-radius': null,
  padding: null,
  'font-size': null,
  'font-weight': null,
  'line-height': null,
  'letter-spacing': null,
  'text-shadow': null,
  outline: null,
  'outline-offset': null,
};

export const ROLL_BUTTON_THEMES: readonly RollButtonTheme[] = [
  theme(
    'ribbon',
    '장미 리본',
    '주요 판정을 또렷하게 보여주는 도톰한 버튼',
    {
      background: '#f6bfd2',
      foreground: '#542537',
      border: '#c9567f',
      borderWidth: '1px',
      borderStyle: 'solid',
      radius: '5px',
      shadow: '0 3px 0 #b94f75, 0 5px 10px rgba(95, 34, 57, 0.16)',
      hoverBackground: '#f9d0de',
      hoverBorder: '#b94f75',
      hoverShadow: '0 3px 0 #b94f75, 0 6px 12px rgba(95, 34, 57, 0.18)',
      activeBackground: '#eca4bc',
      activeBorder: '#a84164',
      activeShadow: 'inset 0 2px 0 rgba(95, 34, 57, 0.22)',
      focus: '#d96b91',
      icon: 'currentColor',
    },
  ),
  theme(
    'ticket',
    '종이 티켓',
    '조사와 보조 판정에 어울리는 점선 티켓 버튼',
    {
      background: '#fff9e6',
      foreground: '#574522',
      border: '#d1a64d',
      borderWidth: '2px',
      borderStyle: 'dashed',
      radius: '2px',
      shadow: '2px 2px 0 #ead7a4',
      hoverBackground: '#fff3c5',
      hoverBorder: '#bc8c2d',
      hoverShadow: '3px 3px 0 #e2cc91',
      activeBackground: '#f7e4ab',
      activeBorder: '#a87724',
      activeShadow: 'inset 0 2px 2px rgba(87, 69, 34, 0.16)',
      focus: '#d1a64d',
      icon: '#a87724',
    },
  ),
  theme(
    'mint-tab',
    '민트 탭',
    '자주 쓰는 보조 굴림을 단정하게 구분하는 버튼',
    {
      background: '#e8f7f1',
      foreground: '#245648',
      border: '#69b99f #69b99f #398d72',
      borderWidth: '1px 1px 3px',
      borderStyle: 'solid',
      radius: '6px 6px 3px 3px',
      shadow: 'none',
      hoverBackground: '#d9f2e8',
      hoverBorder: '#4ea88b #4ea88b #24715b',
      hoverShadow: '0 2px 6px rgba(36, 113, 91, 0.14)',
      activeBackground: '#c5e8dc',
      activeBorder: '#398d72',
      activeShadow: 'inset 0 2px 2px rgba(36, 86, 72, 0.14)',
      focus: '#69b99f',
      icon: '#24715b',
    },
  ),
  theme(
    'ink-stamp',
    '잉크 도장',
    '흑백 시트와 작은 판정 버튼에 어울리는 각진 모양',
    {
      background: '#ffffff',
      foreground: '#302a2e',
      border: '#403940',
      borderWidth: '3px',
      borderStyle: 'double',
      radius: '0',
      shadow: '2px 2px 0 #cfc8cc',
      hoverBackground: '#f7f5f6',
      hoverBorder: '#302a2e',
      hoverShadow: '3px 3px 0 #bdb5ba',
      activeBackground: '#ebe7e9',
      activeBorder: '#302a2e',
      activeShadow: 'inset 0 2px 0 #cfc8cc',
      focus: '#a74d6e',
      icon: '#a74d6e',
    },
  ),
];

export function getRollButtonTheme(id: RollButtonTheme['id']): RollButtonTheme {
  return ROLL_BUTTON_THEMES.find((item) => item.id === id) ?? ROLL_BUTTON_THEMES[0];
}

export function rollButtonThemeMatches(
  valuesByState: Record<ManagedDesignState, Record<string, string>>,
  beforeValues: Record<string, string>,
  candidate: RollButtonTheme,
): boolean {
  return MANAGED_DESIGN_STATES.every((state) => (
    declarationsMatch(valuesByState[state] ?? {}, candidate.states[state])
  )) && declarationsMatch(beforeValues, candidate.before);
}

type ThemePalette = {
  background: string;
  foreground: string;
  border: string;
  borderWidth: string;
  borderStyle: string;
  radius: string;
  shadow: string;
  hoverBackground: string;
  hoverBorder: string;
  hoverShadow: string;
  activeBackground: string;
  activeBorder: string;
  activeShadow: string;
  focus: string;
  icon: string;
};

function theme(
  id: RollButtonTheme['id'],
  label: string,
  description: string,
  palette: ThemePalette,
): RollButtonTheme {
  return {
    id,
    label,
    description,
    states: {
      base: {
        ...sharedBase,
        'background-color': palette.background,
        color: palette.foreground,
        'border-color': palette.border,
        'border-width': palette.borderWidth,
        'border-style': palette.borderStyle,
        'border-radius': palette.radius,
        'box-shadow': palette.shadow,
        outline: 'none',
      },
      hover: {
        ...clearInheritedStateOverrides,
        'background-color': palette.hoverBackground,
        color: palette.foreground,
        'border-color': palette.hoverBorder,
        'box-shadow': palette.hoverShadow,
      },
      active: {
        ...clearInheritedStateOverrides,
        'background-color': palette.activeBackground,
        color: palette.foreground,
        'border-color': palette.activeBorder,
        'box-shadow': palette.activeShadow,
      },
      focus: {
        ...clearInheritedStateOverrides,
        'background-color': null,
        color: null,
        'border-color': null,
        outline: `2px solid ${palette.focus}`,
        'outline-offset': '2px',
        'box-shadow': `0 0 0 3px ${withAlpha(palette.focus, 0.2)}`,
      },
    },
    before: {
      ...sharedBefore,
      color: palette.icon,
    },
  };
}

function declarationsMatch(
  current: Record<string, string>,
  expected: ManagedDesignDeclarations,
): boolean {
  return Object.entries(expected).every(([property, value]) => (
    value == null ? current[property] == null : current[property] === value
  ));
}

function withAlpha(color: string, alpha: number): string {
  const match = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return color;
  const channels = match.slice(1).map((channel) => Number.parseInt(channel, 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

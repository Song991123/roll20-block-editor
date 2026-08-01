import type { BlockSnapshot } from '@/lib/blockly/adapter';
import type { ManagedDesignDeclarations } from './designPosition';
import { getLayerRole } from './layerRoles';

export type ControlGroupThemePart = 'root' | 'label' | 'control' | 'action';

export type ControlGroupTheme = {
  id: 'paper' | 'rose' | 'mint' | 'ink';
  label: string;
  description: string;
  preview: {
    surface: string;
    text: string;
    label: string;
    control: string;
    controlBorder: string;
    action: string;
    actionText: string;
    border: string;
  };
  parts: Record<ControlGroupThemePart, ManagedDesignDeclarations>;
};

type Palette = ControlGroupTheme['preview'];

const sharedRoot: ManagedDesignDeclarations = {
  display: 'flex',
  'flex-wrap': 'wrap',
  'align-items': 'center',
  gap: '8px',
  padding: '10px',
  'border-width': '1px',
  'border-style': 'solid',
  'border-radius': '6px',
  'background-image': 'none',
};

const sharedLabel: ManagedDesignDeclarations = {
  display: 'inline-block',
  'background-color': 'transparent',
  'background-image': 'none',
  'border-width': '0',
  'border-radius': '0',
  padding: '2px 0',
  'font-size': '13px',
  'font-weight': '700',
  'line-height': '1.3',
  'box-shadow': 'none',
};

const sharedControl: ManagedDesignDeclarations = {
  'background-image': 'none',
  'border-width': '1px',
  'border-style': 'solid',
  'border-radius': '5px',
  padding: '7px 10px',
  'font-size': '14px',
  'font-weight': '500',
  'line-height': '1.25',
  'box-shadow': 'none',
};

const sharedAction: ManagedDesignDeclarations = {
  'background-image': 'none',
  'border-width': '1px',
  'border-style': 'solid',
  'border-radius': '5px',
  padding: '7px 12px',
  'font-size': '14px',
  'font-weight': '700',
  'line-height': '1.25',
  'box-shadow': 'none',
  'text-shadow': 'none',
};

export const CONTROL_GROUP_THEMES: readonly ControlGroupTheme[] = [
  controlGroupTheme('paper', '종이', '밝은 기록지 모양의 입력 한 줄', {
    surface: '#fffdfd',
    text: '#3f3439',
    label: '#6d5560',
    control: '#ffffff',
    controlBorder: '#d8c8cf',
    action: '#6d5560',
    actionText: '#ffffff',
    border: '#ead8df',
  }),
  controlGroupTheme('rose', '장미', '주요 입력과 굴림을 분홍으로 표시', {
    surface: '#fff2f6',
    text: '#5d2f40',
    label: '#8f3154',
    control: '#ffffff',
    controlBorder: '#d96b91',
    action: '#d96b91',
    actionText: '#ffffff',
    border: '#e7afc3',
  }),
  controlGroupTheme('mint', '민트', '보조 수치와 상태를 차분하게 정리', {
    surface: '#f2fbf7',
    text: '#245648',
    label: '#24715b',
    control: '#ffffff',
    controlBorder: '#69b99f',
    action: '#4ea88b',
    actionText: '#ffffff',
    border: '#9bd3c0',
  }),
  controlGroupTheme('ink', '잉크', '좁은 줄에서 값과 버튼을 또렷하게 표시', {
    surface: '#f7f5f6',
    text: '#302a2e',
    label: '#403940',
    control: '#ffffff',
    controlBorder: '#595057',
    action: '#403940',
    actionText: '#ffffff',
    border: '#cfc8cc',
  }),
];

export function getControlGroupTheme(id: ControlGroupTheme['id']): ControlGroupTheme {
  return CONTROL_GROUP_THEMES.find((theme) => theme.id === id) ?? CONTROL_GROUP_THEMES[0];
}

export function classifyControlGroupThemePart(
  blockType: string,
  className = '',
): Exclude<ControlGroupThemePart, 'root'> | null {
  const type = blockType.trim().toLowerCase();
  const role = getLayerRole(type);
  if (role.kind === 'control') {
    if (/(?:^|_)(?:hidden|checkbox|radio|toggle|file)(?:_|$)/.test(type)) return null;
    return 'control';
  }
  if (role.kind === 'action') return 'action';
  if (role.kind !== 'text') return null;
  if (/(?:^|_)(?:label|legend)(?:_|$)/.test(type)) return 'label';
  const tokens = classTokens(className);
  if (tokens.some((token) => semanticToken(token, 'label', 'caption', 'legend'))) return 'label';
  if (tokens.some((token) => /(?:^|[-_])(?:field|input|control)[-_]name(?:$|[-_])/.test(token))) {
    return 'label';
  }
  return null;
}

export function isControlGroupThemeRoot(blockType: string, className = ''): boolean {
  const type = blockType.trim().toLowerCase();
  if (type === 'r20_row' || type === 'r20_label_container') return true;
  const tokens = classTokens(className);
  return tokens.some((token) => (
    semanticToken(token, 'row')
    || /(?:^|[-_])(?:field|input|control|form)[-_](?:group|wrap|wrapper)(?:$|[-_])/.test(token)
    || /(?:^|[-_])form[-_]field(?:$|[-_])/.test(token)
  ));
}

export function collectControlGroupThemeTargets(
  nodes: readonly BlockSnapshot[],
  rootId: string,
  readClassName: (blockId: string) => string,
): Array<{ blockId: string; part: ControlGroupThemePart }> {
  const byParent = new Map<string, BlockSnapshot[]>();
  for (const node of nodes) {
    if (!node.layerParentId) continue;
    const children = byParent.get(node.layerParentId) ?? [];
    children.push(node);
    byParent.set(node.layerParentId, children);
  }

  const targets: Array<{ blockId: string; part: ControlGroupThemePart }> = [
    { blockId: rootId, part: 'root' },
  ];
  const directChildren = byParent.get(rootId) ?? [];
  for (const child of directChildren) {
    const className = readClassName(child.id);
    const part = classifyControlGroupThemePart(child.type, className);
    if (part) {
      targets.push({ blockId: child.id, part });
      continue;
    }
    if (!isShallowControlWrapper(child.type, className)) continue;
    for (const grandchild of byParent.get(child.id) ?? []) {
      const nestedPart = classifyControlGroupThemePart(
        grandchild.type,
        readClassName(grandchild.id),
      );
      if (nestedPart) targets.push({ blockId: grandchild.id, part: nestedPart });
    }
  }
  return targets;
}

export function hasControlGroupThemeContent(
  targets: readonly { part: ControlGroupThemePart }[],
): boolean {
  return targets.some((target) => target.part === 'control' || target.part === 'action');
}

function controlGroupTheme(
  id: ControlGroupTheme['id'],
  label: string,
  description: string,
  palette: Palette,
): ControlGroupTheme {
  return {
    id,
    label,
    description,
    preview: palette,
    parts: {
      root: {
        ...sharedRoot,
        'background-color': palette.surface,
        color: palette.text,
        'border-color': palette.border,
      },
      label: {
        ...sharedLabel,
        color: palette.label,
      },
      control: {
        ...sharedControl,
        'background-color': palette.control,
        color: palette.text,
        'border-color': palette.controlBorder,
      },
      action: {
        ...sharedAction,
        'background-color': palette.action,
        color: palette.actionText,
        'border-color': palette.action,
      },
    },
  };
}

function isShallowControlWrapper(blockType: string, className: string): boolean {
  const type = blockType.trim().toLowerCase();
  if (type === 'r20_label_container') return true;
  const tokens = classTokens(className);
  return tokens.some((token) => (
    /(?:^|[-_])(?:field|input|control)[-_](?:wrap|wrapper)(?:$|[-_])/.test(token)
  ));
}

function classTokens(className: string): string[] {
  return className.toLowerCase().split(/\s+/).filter(Boolean);
}

function semanticToken(token: string, ...parts: string[]): boolean {
  return parts.some((part) => new RegExp(`(?:^|[-_])${part}(?:$|[-_])`).test(token));
}

import type { BlockSnapshot } from '@/lib/blockly/adapter';
import type { ManagedDesignDeclarations } from './designPosition';
import { getLayerRole } from './layerRoles';

export type SectionThemePart = 'root' | 'title' | 'eyebrow';

export type SectionTheme = {
  id: 'paper' | 'rose' | 'mint' | 'ink';
  label: string;
  description: string;
  preview: {
    surface: string;
    text: string;
    title: string;
    titleText: string;
    border: string;
  };
  parts: Record<SectionThemePart, ManagedDesignDeclarations>;
};

const sharedRoot: ManagedDesignDeclarations = {
  'background-image': 'none',
  'border-style': 'solid',
  padding: '16px',
};

const sharedTitle: ManagedDesignDeclarations = {
  display: 'block',
  'font-weight': '700',
  'line-height': '1.3',
  margin: '0 0 12px 0',
};

const sharedEyebrow: ManagedDesignDeclarations = {
  display: 'block',
  'font-weight': '600',
  'line-height': '1.35',
  margin: '0 0 6px 0',
};

export const SECTION_THEMES: readonly SectionTheme[] = [
  sectionTheme('paper', '종이', '밝은 종이 틀과 얇은 밑줄 제목', {
    surface: '#fffdfd',
    text: '#3f3439',
    title: 'transparent',
    titleText: '#6d5560',
    border: '#ead8df',
  }, {
    borderWidth: '1px',
    radius: '6px',
    shadow: '0 2px 8px rgba(73, 45, 57, 0.08)',
    titleBorder: '#d9bdc8',
    titlePadding: '0 0 6px 0',
  }),
  sectionTheme('rose', '장미', '제목과 중요 구역을 분홍으로 묶어 표시', {
    surface: '#fff2f6',
    text: '#5d2f40',
    title: '#d96b91',
    titleText: '#ffffff',
    border: '#d96b91',
  }, {
    borderWidth: '2px',
    radius: '6px',
    shadow: 'none',
    titleBorder: '#d96b91',
    titlePadding: '8px 10px',
  }),
  sectionTheme('mint', '민트', '보조 정보와 반복 구역에 어울리는 옆선 제목', {
    surface: '#f2fbf7',
    text: '#245648',
    title: 'transparent',
    titleText: '#24715b',
    border: '#86c9b3',
  }, {
    borderWidth: '1px',
    radius: '4px',
    shadow: 'inset 4px 0 0 #4ea88b',
    titleBorder: '#4ea88b',
    titlePadding: '4px 8px',
  }),
  sectionTheme('ink', '잉크', '진한 제목 띠와 선명한 정보 틀', {
    surface: '#f7f5f6',
    text: '#352f33',
    title: '#403940',
    titleText: '#ffffff',
    border: '#595057',
  }, {
    borderWidth: '1px',
    radius: '2px',
    shadow: 'none',
    titleBorder: '#403940',
    titlePadding: '7px 10px',
  }),
];

export function getSectionTheme(id: SectionTheme['id']): SectionTheme {
  return SECTION_THEMES.find((item) => item.id === id) ?? SECTION_THEMES[0];
}

export function classifySectionThemePart(
  blockType: string,
  className = '',
): Exclude<SectionThemePart, 'root'> | null {
  const type = blockType.trim().toLowerCase();
  const role = getLayerRole(type);
  const tokens = className.toLowerCase().split(/\s+/).filter(Boolean);
  if (
    type === 'r20_heading'
    || (role.kind === 'text' && tokens.some((token) => semanticToken(token, 'title', 'heading', 'header')))
  ) return 'title';
  if (
    role.kind === 'text'
    && tokens.some((token) => (
      semanticToken(token, 'subtitle', 'eyebrow', 'kicker')
      || /(?:^|[-_])section[-_](?:label|caption)(?:$|[-_])/.test(token)
    ))
  ) return 'eyebrow';
  return null;
}

export function collectSectionThemeTargets(
  nodes: readonly BlockSnapshot[],
  rootId: string,
  readClassName: (blockId: string) => string,
): Array<{ blockId: string; part: SectionThemePart }> {
  const byParent = new Map<string, BlockSnapshot[]>();
  for (const node of nodes) {
    if (!node.layerParentId) continue;
    const children = byParent.get(node.layerParentId) ?? [];
    children.push(node);
    byParent.set(node.layerParentId, children);
  }

  const targets: Array<{ blockId: string; part: SectionThemePart }> = [
    { blockId: rootId, part: 'root' },
  ];
  const queue = (byParent.get(rootId) ?? []).map((node) => ({ node, depth: 1 }));
  const seen = new Set([rootId]);
  while (queue.length) {
    const entry = queue.shift();
    if (!entry || seen.has(entry.node.id)) continue;
    const { node, depth } = entry;
    seen.add(node.id);
    const className = readClassName(node.id);
    const part = classifySectionThemePart(node.type, className);
    if (part) targets.push({ blockId: node.id, part });
    if (depth >= 2 || isNestedSectionBoundary(className)) continue;
    const role = getLayerRole(node.type);
    if (role.kind !== 'frame' && role.kind !== 'flow') continue;
    queue.push(...(byParent.get(node.id) ?? []).map((child) => ({ node: child, depth: depth + 1 })));
  }
  return targets;
}

function sectionTheme(
  id: SectionTheme['id'],
  label: string,
  description: string,
  colors: SectionTheme['preview'],
  frame: {
    borderWidth: string;
    radius: string;
    shadow: string;
    titleBorder: string;
    titlePadding: string;
  },
): SectionTheme {
  const titleUsesBand = colors.title !== 'transparent';
  return {
    id,
    label,
    description,
    preview: colors,
    parts: {
      root: {
        ...sharedRoot,
        'background-color': colors.surface,
        color: colors.text,
        'border-width': frame.borderWidth,
        'border-color': colors.border,
        'border-radius': frame.radius,
        'box-shadow': frame.shadow,
      },
      title: {
        ...sharedTitle,
        'background-color': colors.title,
        color: colors.titleText,
        'border-width': titleUsesBand ? '0' : id === 'mint' ? '0 0 0 4px' : '0 0 2px 0',
        'border-style': 'solid',
        'border-color': frame.titleBorder,
        'border-radius': titleUsesBand ? '2px' : '0',
        padding: frame.titlePadding,
      },
      eyebrow: {
        ...sharedEyebrow,
        color: colors.titleText === '#ffffff' ? colors.text : colors.titleText,
      },
    },
  };
}

function isNestedSectionBoundary(className: string): boolean {
  return className
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((token) => semanticToken(token, 'section', 'panel', 'card', 'box', 'group', 'frame'));
}

function semanticToken(token: string, ...parts: string[]): boolean {
  return parts.some((part) => new RegExp(`(?:^|[-_])${part}(?:$|[-_])`).test(token));
}

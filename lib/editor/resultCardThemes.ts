import type { BlockSnapshot } from '@/lib/blockly/adapter';
import type { ManagedDesignDeclarations } from './designPosition';

export type ResultCardThemePart = 'root' | 'title' | 'row' | 'label' | 'value';

export type ResultCardTheme = {
  id: 'paper' | 'rose' | 'mint' | 'ink';
  label: string;
  description: string;
  preview: {
    surface: string;
    header: string;
    headerText: string;
    row: string;
    label: string;
    value: string;
    border: string;
  };
  parts: Record<ResultCardThemePart, ManagedDesignDeclarations>;
};

const sharedRoot: ManagedDesignDeclarations = {
  display: 'block',
  width: '100%',
  'max-width': '100%',
  'box-sizing': 'border-box',
  overflow: 'hidden',
  padding: '0',
};

const sharedTitle: ManagedDesignDeclarations = {
  padding: '10px 12px',
  'font-size': '18px',
  'font-weight': '700',
  'line-height': '1.3',
  margin: '0',
};

const sharedRow: ManagedDesignDeclarations = {
  display: 'flex',
  gap: '8px',
  padding: '10px 12px',
  'align-items': 'center',
  'border-width': '0 0 1px 0',
  'border-style': 'solid',
};

const sharedLabel: ManagedDesignDeclarations = {
  'font-weight': '600',
};

const sharedValue: ManagedDesignDeclarations = {
  'margin-left': 'auto',
  'font-size': '20px',
  'font-weight': '700',
  'text-align': 'right',
};

export const RESULT_CARD_THEMES: readonly ResultCardTheme[] = [
  theme('paper', '종이', '차분한 종이 바탕과 잉크색 제목', {
    surface: '#fffdfd',
    header: '#6d5560',
    headerText: '#ffffff',
    row: '#fffdfd',
    label: '#3f3439',
    value: '#8c3f5e',
    border: '#d9c5cd',
  }, {
    borderWidth: '1px',
    radius: '6px',
    shadow: '0 2px 8px rgba(73, 45, 57, 0.12)',
  }),
  theme('rose', '장미', '주요 판정을 분홍으로 또렷하게 강조', {
    surface: '#fff6f9',
    header: '#d96b91',
    headerText: '#ffffff',
    row: '#fff2f6',
    label: '#5d2f40',
    value: '#9f3158',
    border: '#d96b91',
  }, {
    borderWidth: '2px',
    radius: '6px',
    shadow: '0 3px 10px rgba(169, 70, 107, 0.18)',
  }),
  theme('mint', '민트', '회복과 보조 판정에 어울리는 민트 강조', {
    surface: '#f6fcf9',
    header: '#4ea88b',
    headerText: '#ffffff',
    row: '#f2fbf7',
    label: '#245648',
    value: '#24715b',
    border: '#75bca4',
  }, {
    borderWidth: '1px',
    radius: '6px',
    shadow: 'inset 5px 0 0 #4ea88b, 0 2px 7px rgba(36, 86, 72, 0.12)',
  }),
  theme('ink', '잉크', '강한 판정을 어두운 카드로 표시', {
    surface: '#403940',
    header: '#292429',
    headerText: '#ffffff',
    row: '#403940',
    label: '#ffffff',
    value: '#ffffff',
    border: '#595057',
  }, {
    borderWidth: '1px',
    radius: '4px',
    shadow: '0 3px 10px rgba(32, 25, 29, 0.22)',
  }),
];

export function getResultCardTheme(id: ResultCardTheme['id']): ResultCardTheme {
  return RESULT_CARD_THEMES.find((item) => item.id === id) ?? RESULT_CARD_THEMES[0];
}

export function classifyResultCardThemePart(
  blockType: string,
  className = '',
): Exclude<ResultCardThemePart, 'root'> | null {
  const type = blockType.trim().toLowerCase();
  const tokens = className.toLowerCase().split(/\s+/).filter(Boolean);
  if (type === 'r20_heading' || tokens.some((token) => semanticToken(token, 'title', 'header'))) {
    return 'title';
  }
  if (type === 'r20_rolltemplate_row' || tokens.some((token) => semanticToken(token, 'row'))) {
    return 'row';
  }
  if (type === 'r20_label' || tokens.some((token) => semanticToken(token, 'label', 'caption', 'key'))) {
    return 'label';
  }
  if (tokens.some((token) => semanticToken(token, 'value', 'result', 'total', 'score'))) {
    return 'value';
  }
  return null;
}

export function collectResultCardThemeTargets(
  nodes: readonly BlockSnapshot[],
  rootId: string,
  readClassName: (blockId: string) => string,
): Array<{ blockId: string; part: ResultCardThemePart }> {
  const byParent = new Map<string, BlockSnapshot[]>();
  for (const node of nodes) {
    if (!node.layerParentId) continue;
    const children = byParent.get(node.layerParentId) ?? [];
    children.push(node);
    byParent.set(node.layerParentId, children);
  }

  const targets: Array<{ blockId: string; part: ResultCardThemePart }> = [
    { blockId: rootId, part: 'root' },
  ];
  const partById = new Map<string, ResultCardThemePart>([[rootId, 'root']]);
  const rowFallbackLabelClaimed = new Set<string>();
  const queue = [...(byParent.get(rootId) ?? [])];
  const seen = new Set([rootId]);
  while (queue.length) {
    const node = queue.shift();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    const parentPart = node.layerParentId ? partById.get(node.layerParentId) : null;
    let part = classifyResultCardThemePart(node.type, readClassName(node.id));
    if (!part && parentPart === 'row' && /^r20_(?:strong|b|inline_bold)$/.test(node.type)) {
      part = 'value';
    }
    if (
      !part
      && parentPart === 'row'
      && node.layerParentId
      && !rowFallbackLabelClaimed.has(node.layerParentId)
      && /^r20_(?:span|static_text|i18n_text)$/.test(node.type)
    ) {
      part = 'label';
      rowFallbackLabelClaimed.add(node.layerParentId);
    }
    if (part === 'label' && parentPart === 'row' && node.layerParentId) {
      rowFallbackLabelClaimed.add(node.layerParentId);
    }
    if (part) {
      targets.push({ blockId: node.id, part });
      partById.set(node.id, part);
    }
    queue.push(...(byParent.get(node.id) ?? []));
  }
  return targets;
}

function theme(
  id: ResultCardTheme['id'],
  label: string,
  description: string,
  colors: ResultCardTheme['preview'],
  frame: { borderWidth: string; radius: string; shadow: string },
): ResultCardTheme {
  return {
    id,
    label,
    description,
    preview: colors,
    parts: {
      root: {
        ...sharedRoot,
        'background-color': colors.surface,
        'background-image': 'none',
        color: colors.label,
        'border-width': frame.borderWidth,
        'border-style': 'solid',
        'border-color': colors.border,
        'border-radius': frame.radius,
        'box-shadow': frame.shadow,
      },
      title: {
        ...sharedTitle,
        'background-color': colors.header,
        color: colors.headerText,
      },
      row: {
        ...sharedRow,
        'background-color': colors.row,
        color: colors.label,
        'border-color': colors.border,
      },
      label: {
        ...sharedLabel,
        color: colors.label,
      },
      value: {
        ...sharedValue,
        color: colors.value,
      },
    },
  };
}

function semanticToken(token: string, ...parts: string[]): boolean {
  return parts.some((part) => new RegExp(`(?:^|[-_])${part}(?:$|[-_])`).test(token));
}

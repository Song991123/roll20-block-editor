import type { BlockSnapshot } from '@/lib/blockly/adapter';
import type { ManagedDesignDeclarations } from './designPosition';
import { classifySectionThemePart } from './sectionThemes';

export type SectionLayoutPart = 'root' | 'header';

export type SectionLayout = {
  id: 'stack' | 'row' | 'columns' | 'sidebar';
  label: string;
  description: string;
  parts: Record<SectionLayoutPart, ManagedDesignDeclarations>;
};

const clearRootLayout: ManagedDesignDeclarations = {
  display: null,
  'flex-direction': null,
  'flex-wrap': null,
  'grid-template-columns': null,
  'grid-auto-flow': null,
  gap: null,
  'align-items': null,
  'justify-content': null,
};

const clearHeaderLayout: ManagedDesignDeclarations = {
  'grid-column': null,
  'flex-basis': null,
  'max-width': null,
  'align-self': null,
};

export const SECTION_LAYOUTS: readonly SectionLayout[] = [
  layout('stack', '세로 쌓기', '제목 아래로 내용을 차례대로 쌓습니다', {
    display: 'flex',
    'flex-direction': 'column',
    'flex-wrap': 'nowrap',
    gap: '12px',
    'align-items': 'stretch',
    'justify-content': 'flex-start',
  }, {
    'align-self': 'stretch',
    'max-width': '100%',
  }),
  layout('row', '가로 흐름', '한 줄에 놓고 공간이 부족하면 다음 줄로 넘깁니다', {
    display: 'flex',
    'flex-direction': 'row',
    'flex-wrap': 'wrap',
    gap: '12px',
    'align-items': 'flex-start',
    'justify-content': 'flex-start',
  }, {
    'flex-basis': '100%',
    'max-width': '100%',
    'align-self': 'stretch',
  }),
  layout('columns', '같은 두 칸', '내용을 같은 너비의 두 칸으로 나눕니다', {
    display: 'grid',
    'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
    'grid-auto-flow': 'row',
    gap: '12px',
    'align-items': 'stretch',
    'justify-content': 'stretch',
  }, {
    'grid-column': '1 / -1',
    'max-width': '100%',
    'align-self': 'stretch',
  }),
  layout('sidebar', '넓게 + 좁게', '주요 내용은 넓게, 보조 내용은 좁게 놓습니다', {
    display: 'grid',
    'grid-template-columns': 'minmax(0, 2fr) minmax(0, 1fr)',
    'grid-auto-flow': 'row',
    gap: '12px',
    'align-items': 'stretch',
    'justify-content': 'stretch',
  }, {
    'grid-column': '1 / -1',
    'max-width': '100%',
    'align-self': 'stretch',
  }),
];

export function getSectionLayout(id: SectionLayout['id']): SectionLayout {
  return SECTION_LAYOUTS.find((item) => item.id === id) ?? SECTION_LAYOUTS[0];
}

export function sectionLayoutMatches(
  values: Record<string, string>,
  candidate: SectionLayout,
): boolean {
  return declarationsMatch(values, candidate.parts.root);
}

export function collectSectionLayoutTargets(
  nodes: readonly BlockSnapshot[],
  rootId: string,
  readClassName: (blockId: string) => string,
): Array<{ blockId: string; part: SectionLayoutPart }> {
  const targets: Array<{ blockId: string; part: SectionLayoutPart }> = [
    { blockId: rootId, part: 'root' },
  ];
  for (const node of nodes) {
    if (node.layerParentId !== rootId) continue;
    const part = classifySectionThemePart(node.type, readClassName(node.id));
    if (part === 'title' || part === 'eyebrow') {
      targets.push({ blockId: node.id, part: 'header' });
    }
  }
  return targets;
}

function layout(
  id: SectionLayout['id'],
  label: string,
  description: string,
  root: ManagedDesignDeclarations,
  header: ManagedDesignDeclarations,
): SectionLayout {
  return {
    id,
    label,
    description,
    parts: {
      root: { ...clearRootLayout, ...root },
      header: { ...clearHeaderLayout, ...header },
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

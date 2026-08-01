import type { BlockSnapshot } from '@/lib/blockly/adapter';
import type { ManagedDesignDeclarations } from './designPosition';
import {
  collectSectionLayoutTargets,
  getSectionLayout,
  type SectionLayout,
} from './sectionLayouts';
import {
  collectSectionThemeTargets,
  getSectionTheme,
  type SectionTheme,
} from './sectionThemes';

export type SectionComposition = {
  id: 'paper-stack' | 'rose-columns' | 'mint-sidebar' | 'ink-row';
  label: string;
  description: string;
  themeId: SectionTheme['id'];
  layoutId: SectionLayout['id'];
};

export type SectionCompositionTarget = {
  blockId: string;
  declarations: ManagedDesignDeclarations;
};

export const SECTION_COMPOSITIONS: readonly SectionComposition[] = [
  composition(
    'paper-stack',
    '종이 세로',
    '차분한 종이 구역에 내용을 위에서 아래로 정리해요',
    'paper',
    'stack',
  ),
  composition(
    'rose-columns',
    '장미 두 칸',
    '분홍 제목 아래 내용을 같은 너비의 두 칸으로 나눠요',
    'rose',
    'columns',
  ),
  composition(
    'mint-sidebar',
    '민트 넓고 좁게',
    '넓은 내용과 좁은 보조 영역을 민트 구역으로 묶어요',
    'mint',
    'sidebar',
  ),
  composition(
    'ink-row',
    '잉크 가로',
    '선명한 잉크 제목 아래 내용을 옆으로 이어 놓아요',
    'ink',
    'row',
  ),
];

export function getSectionComposition(id: SectionComposition['id']): SectionComposition {
  return SECTION_COMPOSITIONS.find((item) => item.id === id) ?? SECTION_COMPOSITIONS[0];
}

export function sectionCompositionMatches(
  values: Record<string, string>,
  compositionValue: SectionComposition,
): boolean {
  const theme = getSectionTheme(compositionValue.themeId);
  const layout = getSectionLayout(compositionValue.layoutId);
  return declarationsMatch(values, {
    ...theme.parts.root,
    ...layout.parts.root,
  });
}

export function collectSectionCompositionTargets(
  nodes: readonly BlockSnapshot[],
  rootId: string,
  readClassName: (blockId: string) => string,
  compositionValue: SectionComposition,
): SectionCompositionTarget[] {
  const theme = getSectionTheme(compositionValue.themeId);
  const layout = getSectionLayout(compositionValue.layoutId);
  const byBlockId = new Map<string, ManagedDesignDeclarations>();

  for (const target of collectSectionThemeTargets(nodes, rootId, readClassName)) {
    byBlockId.set(target.blockId, {
      ...(byBlockId.get(target.blockId) ?? {}),
      ...theme.parts[target.part],
    });
  }
  for (const target of collectSectionLayoutTargets(nodes, rootId, readClassName)) {
    byBlockId.set(target.blockId, {
      ...(byBlockId.get(target.blockId) ?? {}),
      ...layout.parts[target.part],
    });
  }

  return Array.from(byBlockId, ([blockId, declarations]) => ({ blockId, declarations }));
}

function composition(
  id: SectionComposition['id'],
  label: string,
  description: string,
  themeId: SectionTheme['id'],
  layoutId: SectionLayout['id'],
): SectionComposition {
  return { id, label, description, themeId, layoutId };
}

function declarationsMatch(
  current: Record<string, string>,
  expected: ManagedDesignDeclarations,
): boolean {
  return Object.entries(expected).every(([property, value]) => (
    value == null ? current[property] == null : current[property] === value
  ));
}

import { parseHtml, type DomNode } from '../import/dom_walker';

export type RepeatingSectionIssueCode = 'duplicate-name' | 'underscore-in-name';

export interface RepeatingSectionIssue {
  code: RepeatingSectionIssueCode;
  sectionName: string;
  occurrences: number;
}

export function analyzeRepeatingSections(source: string | DomNode): RepeatingSectionIssue[] {
  const counts = new Map<string, { sectionName: string; occurrences: number }>();
  const underscored = new Map<string, string>();
  const root = typeof source === 'string' ? parseHtml(source) : source;
  const stack: DomNode[] = [root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    stack.push(...node.children);
    if (node.type !== 'element' || node.tag !== 'fieldset') continue;

    const sectionClasses = new Set(
      String(node.attrs?.class ?? '')
        .split(/\s+/)
        .filter((token) => /^repeating_.+/i.test(token)),
    );
    for (const token of sectionClasses) {
      const sectionName = token.slice('repeating_'.length);
      const key = sectionName.toLowerCase();
      const current = counts.get(key);
      counts.set(key, {
        sectionName: current?.sectionName ?? sectionName,
        occurrences: (current?.occurrences ?? 0) + 1,
      });
      if (sectionName.includes('_')) underscored.set(key, sectionName);
    }
  }

  return [
    ...Array.from(counts.values())
      .filter(({ occurrences }) => occurrences > 1)
      .map(({ sectionName, occurrences }) => ({
        code: 'duplicate-name' as const,
        sectionName,
        occurrences,
      })),
    ...Array.from(underscored.values()).map((sectionName) => ({
      code: 'underscore-in-name' as const,
      sectionName,
      occurrences: counts.get(sectionName.toLowerCase())?.occurrences ?? 1,
    })),
  ];
}

export function describeRepeatingSectionIssue(issue: RepeatingSectionIssue): string {
  if (issue.code === 'duplicate-name') {
    return `같은 반복 목록 이름(repeating_${issue.sectionName})을 ${issue.occurrences}곳에서 사용했습니다. Roll20은 같은 이름을 한 번만 허용합니다. 목록마다 다른 이름을 지정하고 연결된 스타일과 자동 동작도 함께 수정하세요.`;
  }
  return `반복 목록 이름(repeating_${issue.sectionName})에는 repeating_ 뒤에 밑줄(_)을 사용할 수 없습니다. 밑줄을 빼고 연결된 스타일과 자동 동작도 함께 수정하세요.`;
}

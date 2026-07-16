export type LayerRoleKind =
  | 'frame'
  | 'flow'
  | 'table'
  | 'control'
  | 'action'
  | 'text'
  | 'media'
  | 'runtime'
  | 'other';

export type LayerRole = {
  kind: LayerRoleKind;
  label: string;
  icon: string;
  className: string;
  canReceiveChildren: boolean;
  defaultDropMode: 'flow' | 'absolute' | 'none';
};

const ROLE_STYLES: Record<LayerRoleKind, Omit<LayerRole, 'kind'>> = {
  frame: {
    label: '프레임',
    icon: 'F',
    className: 'border-sky-500/60 bg-sky-500/15 text-sky-200',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  flow: {
    label: '흐름',
    icon: 'FL',
    className: 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  table: {
    label: '표',
    icon: 'T',
    className: 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  control: {
    label: '입력',
    icon: 'I',
    className: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  action: {
    label: '버튼',
    icon: 'B',
    className: 'border-amber-500/60 bg-amber-500/15 text-amber-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  text: {
    label: '텍스트',
    icon: 'A',
    className: 'border-violet-500/60 bg-violet-500/15 text-violet-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  media: {
    label: '이미지',
    icon: 'M',
    className: 'border-rose-500/60 bg-rose-500/15 text-rose-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  runtime: {
    label: '스크립트',
    icon: 'JS',
    className: 'border-zinc-500/60 bg-zinc-500/10 text-zinc-300',
    canReceiveChildren: false,
    defaultDropMode: 'none',
  },
  other: {
    label: '노드',
    icon: 'N',
    className: 'border-zinc-500/60 bg-zinc-500/15 text-zinc-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
};

export function getLayerRole(type: string): LayerRole {
  const kind = classifyLayerRole(type);
  return { kind, ...ROLE_STYLES[kind] };
}

export function canReceiveChildren(type: string): boolean {
  return getLayerRole(type).canReceiveChildren;
}

export function classifyLayerRole(type: string): LayerRoleKind {
  const t = type.toLowerCase();
  const tokens = blockTypeTokens(t);
  if (hasAnyToken(tokens, ['script', 'worker', 'rolltemplate'])) return 'runtime';
  if (hasAnyToken(tokens, ['table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'])) return 'table';
  if (hasAnyToken(tokens, ['row', 'col', 'colrow', 'grid', 'flex'])) return 'flow';
  if (
    hasAnyToken(tokens, ['div', 'span', 'section', 'fieldset', 'form', 'group', 'container', 'wrapper'])
  ) {
    return 'frame';
  }
  if (hasAnyToken(tokens, ['input', 'select', 'checkbox', 'textarea', 'attr', 'attribute'])) return 'control';
  if (hasAnyToken(tokens, ['button', 'roll', 'action'])) return 'action';
  if (hasAnyToken(tokens, ['image', 'img', 'media'])) return 'media';
  if (hasAnyToken(tokens, ['text', 'label', 'heading', 'i18n'])) return 'text';
  return 'other';
}

function blockTypeTokens(type: string): Set<string> {
  return new Set(type.split(/[^a-z0-9]+/).filter(Boolean));
}

function hasAnyToken(tokens: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => tokens.has(candidate));
}

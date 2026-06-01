export type LayerRoleKind = 'frame' | 'flow' | 'table' | 'control' | 'action' | 'text' | 'media' | 'runtime' | 'other';

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
    label: 'Frame',
    icon: 'F',
    className: 'border-sky-500/60 bg-sky-500/15 text-sky-200',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  flow: {
    label: 'Flow',
    icon: 'FL',
    className: 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  table: {
    label: 'Table',
    icon: 'T',
    className: 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  control: {
    label: 'Input',
    icon: 'I',
    className: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  action: {
    label: 'Action',
    icon: 'B',
    className: 'border-amber-500/60 bg-amber-500/15 text-amber-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  text: {
    label: 'Text',
    icon: 'A',
    className: 'border-violet-500/60 bg-violet-500/15 text-violet-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  media: {
    label: 'Media',
    icon: 'M',
    className: 'border-rose-500/60 bg-rose-500/15 text-rose-200',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  runtime: {
    label: 'Runtime',
    icon: 'JS',
    className: 'border-zinc-500/60 bg-zinc-500/10 text-zinc-300',
    canReceiveChildren: false,
    defaultDropMode: 'none',
  },
  other: {
    label: 'Node',
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
  if (t.includes('script') || t.includes('worker') || t.includes('rolltemplate')) return 'runtime';
  if (t.includes('table') || t.includes('tbody') || t.includes('thead') || t.includes('tr') || t.includes('td') || t.includes('th')) {
    return 'table';
  }
  if (t.includes('row') || t.includes('col') || t.includes('grid') || t.includes('flex')) return 'flow';
  if (t.includes('div') || t.includes('span') || t.includes('section') || t.includes('fieldset') || t.includes('form') || t.includes('group')) return 'frame';
  if (t.includes('input') || t.includes('select') || t.includes('checkbox') || t.includes('textarea')) return 'control';
  if (t.includes('button') || t.includes('roll')) return 'action';
  if (t.includes('image') || t.includes('img') || t.includes('media')) return 'media';
  if (t.includes('text') || t.includes('label') || t.includes('heading')) return 'text';
  return 'other';
}

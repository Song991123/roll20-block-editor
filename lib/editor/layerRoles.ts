import type { BlockSnapshot } from '../blockly/adapter';

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

export type LayerDropMode = 'before' | 'inside' | 'after';

const ROLE_STYLES: Record<LayerRoleKind, Omit<LayerRole, 'kind'>> = {
  frame: {
    label: '프레임',
    icon: 'F',
    className: 'border-rose-300/90 bg-rose-100/80 text-rose-800',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  flow: {
    label: '흐름',
    icon: 'FL',
    className: 'border-teal-300/90 bg-teal-100/80 text-teal-800',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  table: {
    label: '표',
    icon: 'T',
    className: 'border-amber-300/90 bg-amber-100/80 text-amber-800',
    canReceiveChildren: true,
    defaultDropMode: 'flow',
  },
  control: {
    label: '입력',
    icon: 'I',
    className: 'border-emerald-300/90 bg-emerald-100/80 text-emerald-800',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  action: {
    label: '버튼',
    icon: 'B',
    className: 'border-amber-300/90 bg-amber-100/80 text-amber-800',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  text: {
    label: '텍스트',
    icon: 'A',
    className: 'border-pink-300/90 bg-pink-100/80 text-pink-800',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  media: {
    label: '이미지',
    icon: 'M',
    className: 'border-fuchsia-300/90 bg-fuchsia-100/80 text-fuchsia-800',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
  runtime: {
    label: '시트 동작',
    icon: 'JS',
    className: 'border-slate-300/90 bg-slate-100/80 text-slate-700',
    canReceiveChildren: false,
    defaultDropMode: 'none',
  },
  other: {
    label: '기타',
    icon: 'N',
    className: 'border-slate-300/90 bg-slate-100/80 text-slate-700',
    canReceiveChildren: false,
    defaultDropMode: 'absolute',
  },
};

// A few composite blocks emit a real DOM container without a type token that
// the generic classifier can infer. Keep these contracts explicit so the
// layer panel and the Shadow edit surface agree about where children belong.
const ROLE_KIND_OVERRIDES: Record<string, LayerRoleKind> = {
  // The generic element block is the structured escape route for safe custom
  // tags. It has a CONTENT statement slot, so it must remain a visible frame
  // in the layer editor instead of becoming an opaque "other" leaf.
  r20_element_container: 'frame',
  r20_element_atom: 'other',
  // This composite emits a <div> wrapper plus user-editable CONTENT. Keep the
  // wrapper visible as a frame even though its generated helper inputs are
  // atomic children in the emitted HTML.
  r20_attr_with_txt_helper: 'frame',
  // Both composites emit a table row as one movable unit. They participate in
  // table/flow ordering but do not accept arbitrary children directly.
  r20_attribute_card: 'flow',
  r20_list: 'frame',
  r20_list_item: 'flow',
  r20_toggle_wrap: 'frame',
  r20_toggle_on_area: 'frame',
  r20_toggle_off_area: 'frame',
  r20_inline_bold: 'text',
  r20_inline_italic: 'text',
  // These display blocks are visible in the sheet but are atomic: they
  // participate in authored flow and must not advertise an inside drop.
  r20_hr: 'flow',
  r20_spacer: 'flow',
  r20_inline_break: 'flow',
  r20_icon: 'media',
  r20_radio: 'control',
  // A rolltemplate is hidden on the sheet, but its authored body becomes a
  // normal visual tree inside the dedicated chat-card editor. Keep the root
  // and section blocks nestable there instead of classifying every type that
  // contains the token "rolltemplate" as runtime code.
  r20_rolltemplate_define: 'frame',
  r20_rolltemplate_row: 'flow',
  r20_rolltemplate_cond_if: 'flow',
  r20_rolltemplate_cond_unless: 'flow',
  r20_rolltemplate_each: 'flow',
  r20_rolltemplate_field_ref: 'text',
  r20_rolltemplate_helper: 'text',
  r20_rolltemplate_computed: 'text',
  // Template invocation emits a chat command string, not a visible sheet
  // element. Keep it out of the selectable visual layer tree.
  r20_template_invoke: 'runtime',
  r20_computed_attr: 'runtime',
  r20_raw_page_js: 'runtime',
  r20_page_js_slot: 'runtime',
  r20_value_switch_panel: 'frame',
  r20_value_case: 'frame',
};

const CAN_RECEIVE_CHILDREN_OVERRIDES: Record<string, boolean> = {
  // The generic container owns CONTENT. The generic void-element block is a
  // leaf and must never advertise an inside drop target.
  r20_element_container: true,
  r20_element_atom: false,
  r20_attr_with_txt_helper: true,
  // Attribute cards are atomic composite rows; reorder the row, do not insert
  // an unrelated block into its generated <tr> internals.
  r20_attribute_card: false,
  // `<col>` and `<caption>` are atomic emitters. They can be reordered in
  // their valid table position but cannot receive a child.
  r20_table_col: false,
  r20_table_caption: false,
  // This composite emits one complete <tr>; it is reorderable in table flow,
  // but arbitrary blocks cannot be inserted into the atomic row itself.
  r20_skill_row: false,
  r20_hr: false,
  r20_spacer: false,
  r20_inline_break: false,
  r20_icon: false,
  r20_rolltemplate_define: true,
  r20_rolltemplate_row: true,
  r20_rolltemplate_cond_if: true,
  r20_rolltemplate_cond_unless: true,
  r20_rolltemplate_each: true,
};

const RUNTIME_BLOCK_TYPES = new Set([
  'r20_get_section_ids',
  'r20_for_each_id',
  'r20_get_attrs',
  'r20_set_attrs',
  'r20_set_attrs_pair',
  'r20_generate_row_id',
  'r20_remove_repeating_row',
  'r20_get_translation',
  'r20_get_compendium',
]);

export function getLayerRole(type: string): LayerRole {
  const normalized = type.toLowerCase();
  const kind = ROLE_KIND_OVERRIDES[normalized] ?? classifyLayerRole(normalized);
  const role = { kind, ...ROLE_STYLES[kind] };
  const canReceiveChildren = CAN_RECEIVE_CHILDREN_OVERRIDES[normalized];
  return canReceiveChildren === undefined ? role : { ...role, canReceiveChildren };
}

export function canReceiveChildren(type: string): boolean {
  return getLayerRole(type).canReceiveChildren;
}

type StructuralNodeKind =
  | 'table'
  | 'colgroup'
  | 'col'
  | 'section'
  | 'row'
  | 'cell'
  | 'cell_group'
  | 'caption'
  | 'list'
  | 'list_item';

/**
 * HTML table/list nodes have stricter parent/child rules than ordinary frames.
 * Keep this separate from the visual role so a generic drop cannot produce
 * invalid markup such as a button directly under <tr> or a div directly under
 * ul/ol.
 */
function structuralNodeKind(type: string, tag?: string): StructuralNodeKind | null {
  const normalizedTag = String(tag ?? '').trim().toLowerCase();
  if (normalizedTag === 'td' || normalizedTag === 'th') return 'cell';
  if (normalizedTag === 'tr') return 'row';
  if (normalizedTag === 'thead' || normalizedTag === 'tbody' || normalizedTag === 'tfoot') return 'section';
  const normalized = type.toLowerCase().replace(/^r20[-_]?/, '').replace(/[^a-z0-9]+/g, '_');
  if (normalized === 'table') return 'table';
  if (normalized === 'table_col' || normalized === 'col') return 'col';
  if (normalized === 'colgroup') return 'colgroup';
  if (normalized === 'thead' || normalized === 'tbody' || normalized === 'tfoot') return 'section';
  if (normalized === 'tr') return 'row';
  // The packed skill-row composite emits a complete <tr>. Keep table
  // insertion valid after an imported row has been collapsed.
  if (normalized === 'skill_row') return 'row';
  // The attribute-card composite emits sibling <td> cells without a wrapper.
  // It is valid inside a row, but never as a direct table child.
  if (normalized === 'attribute_card') return 'cell_group';
  if (normalized === 'td' || normalized === 'th') return 'cell';
  if (normalized === 'table_caption' || normalized === 'caption') return 'caption';
  if (normalized === 'list') return 'list';
  if (normalized === 'list_item') return 'list_item';
  return null;
}

/** Return whether a moving layer can be a direct child of a target layer. */
export function canNestLayerChild(
  movingType: string,
  targetType: string,
  movingTag?: string,
  targetTag?: string,
): boolean {
  const target = structuralNodeKind(targetType, targetTag);
  if (!target) return true;
  const moving = structuralNodeKind(movingType, movingTag);
  switch (target) {
    case 'table':
      return moving === 'caption'
        || moving === 'colgroup'
        || moving === 'section'
        || moving === 'row';
    case 'colgroup':
      return moving === 'col';
    case 'section':
      return moving === 'row';
    case 'row':
      return moving === 'cell' || moving === 'cell_group';
    case 'cell':
      return true;
    case 'list':
      return moving === 'list_item';
    case 'list_item':
      return moving !== 'list_item';
    case 'col':
    case 'caption':
    case 'cell_group':
      return false;
    default:
      return true;
  }
}

/** Reject ancestor -> descendant layer drops before they reach Blockly. */
export function wouldCreateLayerCycle(
  nodes: Pick<BlockSnapshot, 'id' | 'layerParentId'>[],
  draggedId: string,
  targetId: string,
): boolean {
  if (!draggedId || !targetId || draggedId === targetId) return true;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let current = byId.get(targetId);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    if (current.id === draggedId) return true;
    seen.add(current.id);
    current = current.layerParentId ? byId.get(current.layerParentId) : undefined;
  }
  return false;
}

/**
 * Check the final insertion parent for a layer-panel drop before Blockly is
 * mutated. For before/after, the target's parent is the actual insertion
 * container; checking only the target made table rows appear droppable even
 * when the moving block was not a valid child of that row's parent.
 */
export function canMoveLayerDrop(
  nodes: Pick<BlockSnapshot, 'id' | 'type' | 'layerParentId'>[],
  draggedId: string,
  targetId: string,
  mode: LayerDropMode,
  canNestBlockInContainer: (movingId: string, targetId: string) => boolean,
): boolean {
  if (wouldCreateLayerCycle(nodes, draggedId, targetId)) return false;
  const target = nodes.find((node) => node.id === targetId);
  if (!target) return false;
  if (mode === 'inside') return canNestBlockInContainer(draggedId, targetId);
  if (!target.layerParentId) return true;
  return canNestBlockInContainer(draggedId, target.layerParentId);
}

export function classifyLayerRole(type: string): LayerRoleKind {
  const t = type.toLowerCase();
  const override = ROLE_KIND_OVERRIDES[t];
  if (override) return override;
  if (t.startsWith('r20_worker_') || t.startsWith('r20_on_')) return 'runtime';
  if (RUNTIME_BLOCK_TYPES.has(t)) return 'runtime';
  const tokens = blockTypeTokens(t);
  if (hasAnyToken(tokens, ['script', 'worker', 'rolltemplate'])) return 'runtime';
  if (hasAnyToken(tokens, ['table', 'colgroup', 'col', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'])) return 'table';
  if (hasAnyToken(tokens, ['row', 'col', 'colrow', 'grid', 'flex'])) return 'flow';
  if (hasAnyToken(tokens, ['div', 'span', 'section', 'fieldset', 'form', 'group', 'container', 'wrapper'])) {
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

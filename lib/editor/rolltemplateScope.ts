import type { BlockSnapshot } from '@/lib/blockly/adapter';

export const ROLLTEMPLATE_ROOT_TYPE = 'r20_rolltemplate_define';

export function normalizeRolltemplateName(name: string | null | undefined): string {
  const safe = String(name ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  return safe || 'default';
}

export function rolltemplateSelectorForName(name: string | null | undefined): string {
  return `.sheet-rolltemplate-${normalizeRolltemplateName(name)}`;
}

type LayerNode = Pick<BlockSnapshot, 'id' | 'type' | 'layerParentId'>;

export function listRolltemplateRoots<T extends LayerNode>(nodes: T[]): T[] {
  return nodes.filter((node) => node.type === ROLLTEMPLATE_ROOT_TYPE);
}

export function findOwningRolltemplateId(
  nodes: LayerNode[],
  blockId: string | null,
): string | null {
  if (!blockId) return null;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return findOwnerFromMap(byId, blockId);
}

function findOwnerFromMap(
  byId: Map<string, LayerNode>,
  blockId: string,
): string | null {
  const seen = new Set<string>();
  let current = byId.get(blockId);
  while (current && !seen.has(current.id)) {
    if (current.type === ROLLTEMPLATE_ROOT_TYPE) return current.id;
    seen.add(current.id);
    current = current.layerParentId ? byId.get(current.layerParentId) : undefined;
  }
  return null;
}

export function resolveActiveRolltemplateId(
  nodes: LayerNode[],
  selectedBlockId: string | null,
): string | null {
  return findOwningRolltemplateId(nodes, selectedBlockId)
    ?? listRolltemplateRoots(nodes)[0]?.id
    ?? null;
}

export function listRolltemplateScope<T extends LayerNode>(
  nodes: T[],
  rootId: string | null,
): T[] {
  if (!rootId) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.filter((node) => findOwnerFromMap(byId, node.id) === rootId);
}

export function listSheetVisualScope<T extends LayerNode>(nodes: T[]): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return nodes.filter((node) => findOwnerFromMap(byId, node.id) === null);
}

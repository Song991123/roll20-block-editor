import type { BlockFieldInfo } from '@/lib/blockly/adapter';

export interface CanonicalGraphInputLink {
  name: string;
  ordinal: number;
  targetId: string | null;
}

export interface CanonicalGraphSourceNode {
  id: string;
  type: string;
  fields: BlockFieldInfo[];
  inputs: CanonicalGraphInputLink[];
  nextId: string | null;
}

export interface CanonicalGraphInput {
  name: string;
  ordinal: number;
  target: number | null;
}

export interface CanonicalGraphNode {
  type: string;
  fields: BlockFieldInfo[];
  inputs: CanonicalGraphInput[];
  next: number | null;
}

export interface CanonicalBlockGraph {
  roots: number[];
  nodes: CanonicalGraphNode[];
  cycleEdges: number;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

export function normalizeCssDeclarationValueWhitespace(value: string): string {
  const source = String(value ?? '');
  let output = '';
  let quote = '';
  let escaped = false;
  let pendingWhitespace = false;
  const flushWhitespace = () => {
    if (pendingWhitespace && output) output += ' ';
    pendingWhitespace = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '\\') {
      flushWhitespace();
      output += char;
      if (index + 1 < source.length) {
        output += source[index + 1];
        index += 1;
        if (source[index] === '\r' && source[index + 1] === '\n') {
          output += source[index + 1];
          index += 1;
        }
      }
      continue;
    }
    if (char === '"' || char === "'") {
      flushWhitespace();
      quote = char;
      output += char;
      continue;
    }
    if (/\s/.test(char)) {
      pendingWhitespace = true;
      continue;
    }
    flushWhitespace();
    output += char;
  }
  return output.trim();
}

function canonicalField(nodeType: string, field: BlockFieldInfo): BlockFieldInfo {
  if (nodeType !== 'r20_css_decl' || field.name !== 'VALUE') return { ...field };
  return {
    ...field,
    value: normalizeCssDeclarationValueWhitespace(String(field.value ?? '')),
  };
}

function normalizedFieldValue(field: BlockFieldInfo): string {
  const normalized = String(field.value ?? '').replace(/\r\n?/g, '\n').trim();
  if (field.name !== '__R20_PRESERVED_ATTRS') return normalized;
  try {
    const parsed = JSON.parse(normalized);
    if (!Array.isArray(parsed)) return normalized;
    return JSON.stringify(
      parsed
        .map((entry) => [String(entry?.[0] ?? ''), String(entry?.[1] ?? '')])
        .sort(([left], [right]) => left.localeCompare(right)),
    );
  } catch {
    return normalized;
  }
}

function localSignature(node: CanonicalGraphSourceNode): string {
  const fields = [...node.fields]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((field) => ({
      name: field.name,
      kind: field.kind,
      value: normalizedFieldValue(field),
      options: stableValue(field.options ?? null),
    }));
  const inputs = [...node.inputs]
    .sort((left, right) => left.ordinal - right.ordinal || left.name.localeCompare(right.name))
    .map((input) => ({ name: input.name, ordinal: input.ordinal, connected: input.targetId !== null }));
  return JSON.stringify({ type: node.type, fields, inputs, hasNext: node.nextId !== null });
}

/**
 * Convert a Blockly graph into an ID- and creation-order-independent forest.
 * Independent roots are unordered. Input slot order and each next chain remain
 * ordered because both affect generated sheet source.
 */
export function canonicalizeBlockGraph(source: CanonicalGraphSourceNode[]): CanonicalBlockGraph {
  const byId = new Map<string, CanonicalGraphSourceNode>();
  for (const node of source) {
    if (!node.id || byId.has(node.id)) continue;
    byId.set(node.id, {
      ...node,
      fields: node.fields
        .map((field) => canonicalField(node.type, field))
        .sort((left, right) => left.name.localeCompare(right.name)),
      inputs: [...node.inputs].sort(
        (left, right) => left.ordinal - right.ordinal || left.name.localeCompare(right.name),
      ),
    });
  }

  const childIds = (node: CanonicalGraphSourceNode): string[] => [
    ...node.inputs.map((input) => input.targetId).filter((id): id is string => Boolean(id && byId.has(id))),
    ...(node.nextId && byId.has(node.nextId) ? [node.nextId] : []),
  ];

  const referenced = new Set<string>();
  const reverseParents = new Map<string, string[]>();
  const unresolvedChildren = new Map<string, number>();
  for (const node of byId.values()) {
    const children = childIds(node);
    unresolvedChildren.set(node.id, children.length);
    for (const childId of children) {
      referenced.add(childId);
      const parents = reverseParents.get(childId) ?? [];
      parents.push(node.id);
      reverseParents.set(childId, parents);
    }
  }

  const heights = new Map<string, number>();
  const queue = [...byId.values()]
    .filter((node) => (unresolvedChildren.get(node.id) ?? 0) === 0)
    .map((node) => node.id)
    .sort();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    const node = byId.get(id);
    if (!node) continue;
    const height = childIds(node).reduce(
      (max, childId) => Math.max(max, (heights.get(childId) ?? -1) + 1),
      0,
    );
    heights.set(id, height);
    for (const parentId of reverseParents.get(id) ?? []) {
      const remaining = (unresolvedChildren.get(parentId) ?? 1) - 1;
      unresolvedChildren.set(parentId, remaining);
      if (remaining === 0) queue.push(parentId);
    }
  }

  const cyclicIds = [...byId.keys()].filter((id) => !heights.has(id));
  for (const id of cyclicIds) heights.set(id, 0);

  const ranks = new Map<string, string>();
  const nodesByHeight = new Map<number, CanonicalGraphSourceNode[]>();
  for (const node of byId.values()) {
    const height = heights.get(node.id) ?? 0;
    const nodes = nodesByHeight.get(height) ?? [];
    nodes.push(node);
    nodesByHeight.set(height, nodes);
  }
  for (const height of [...nodesByHeight.keys()].sort((left, right) => left - right)) {
    const nodes = nodesByHeight.get(height) ?? [];
    const signatures = new Map<string, string>();
    for (const node of nodes) {
      const inputs = node.inputs.map((input) => ({
        name: input.name,
        ordinal: input.ordinal,
        child: input.targetId ? ranks.get(input.targetId) ?? 'cycle' : null,
      }));
      signatures.set(
        node.id,
        JSON.stringify({
          local: localSignature(node),
          inputs,
          next: node.nextId ? ranks.get(node.nextId) ?? 'cycle' : null,
        }),
      );
    }
    const unique = [...new Set(signatures.values())].sort();
    const rankBySignature = new Map(unique.map((signature, index) => [signature, `${height}:${index}`]));
    for (const node of nodes) {
      ranks.set(node.id, rankBySignature.get(signatures.get(node.id) ?? '') ?? `${height}:-1`);
    }
  }

  const compareIds = (leftId: string, rightId: string): number => {
    const rank = (ranks.get(leftId) ?? '').localeCompare(ranks.get(rightId) ?? '');
    if (rank !== 0) return rank;
    const left = byId.get(leftId);
    const right = byId.get(rightId);
    const local = (left ? localSignature(left) : '').localeCompare(right ? localSignature(right) : '');
    if (local !== 0) return local;
    return leftId.localeCompare(rightId);
  };

  const roots = [...byId.keys()].filter((id) => !referenced.has(id)).sort(compareIds);
  const orderedIds: string[] = [];
  const visited = new Set<string>();
  const visitFrom = (rootId: string) => {
    const stack = [rootId];
    while (stack.length > 0) {
      const id = stack.pop();
      if (!id || visited.has(id)) continue;
      const node = byId.get(id);
      if (!node) continue;
      visited.add(id);
      orderedIds.push(id);
      const children = childIds(node);
      for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
    }
  };
  for (const rootId of roots) visitFrom(rootId);
  for (const orphanId of [...byId.keys()].filter((id) => !visited.has(id)).sort(compareIds)) {
    roots.push(orphanId);
    visitFrom(orphanId);
  }

  const indexById = new Map(orderedIds.map((id, index) => [id, index]));
  const nodes = orderedIds.map((id): CanonicalGraphNode => {
    const node = byId.get(id)!;
    return {
      type: node.type,
      fields: node.fields.map((field) => ({ ...field })),
      inputs: node.inputs.map((input) => ({
        name: input.name,
        ordinal: input.ordinal,
        target: input.targetId ? indexById.get(input.targetId) ?? null : null,
      })),
      next: node.nextId ? indexById.get(node.nextId) ?? null : null,
    };
  });

  const cyclicSet = new Set(cyclicIds);
  let cycleEdges = 0;
  for (const id of cyclicIds) {
    const node = byId.get(id);
    if (!node) continue;
    cycleEdges += childIds(node).filter((childId) => cyclicSet.has(childId)).length;
  }

  return {
    roots: roots.map((id) => indexById.get(id)).filter((index): index is number => index !== undefined),
    nodes,
    cycleEdges,
  };
}

import assert from 'node:assert/strict';
import {
  canonicalizeBlockGraph,
  type CanonicalGraphSourceNode,
} from '../canonicalBlockGraph';

function node(
  id: string,
  type: string,
  options: Partial<CanonicalGraphSourceNode> = {},
): CanonicalGraphSourceNode {
  return {
    id,
    type,
    fields: [],
    inputs: [],
    nextId: null,
    ...options,
  };
}

const first = canonicalizeBlockGraph([
  node('child-a', 'text', {
    fields: [{ name: 'TEXT', kind: 'text', value: 'Alpha' }],
    nextId: 'child-b',
  }),
  node('root-a', 'frame', {
    inputs: [{ name: 'CONTENT', ordinal: 1, targetId: 'child-a' }],
  }),
  node('child-b', 'input', {
    fields: [{ name: 'NAME', kind: 'text', value: 'attr_value' }],
  }),
]);
const hydratedInDifferentOrder = canonicalizeBlockGraph([
  node('new-root', 'frame', {
    inputs: [{ name: 'CONTENT', ordinal: 1, targetId: 'new-child-a' }],
  }),
  node('new-child-b', 'input', {
    fields: [{ name: 'NAME', kind: 'text', value: 'attr_value' }],
  }),
  node('new-child-a', 'text', {
    fields: [{ name: 'TEXT', kind: 'text', value: 'Alpha' }],
    nextId: 'new-child-b',
  }),
]);
assert.deepEqual(hydratedInDifferentOrder, first, 'creation order and random block IDs are ignored');
assert(!JSON.stringify(first).includes('child-a'), 'canonical graph contains no source block IDs');

const reorderedSiblings = canonicalizeBlockGraph([
  node('root', 'frame', { inputs: [{ name: 'CONTENT', ordinal: 1, targetId: 'second' }] }),
  node('first', 'text', { fields: [{ name: 'TEXT', kind: 'text', value: 'Alpha' }] }),
  node('second', 'input', {
    fields: [{ name: 'NAME', kind: 'text', value: 'attr_value' }],
    nextId: 'first',
  }),
]);
assert.notDeepEqual(reorderedSiblings, first, 'next-chain sibling order remains semantic');

const independentRootsA = canonicalizeBlockGraph([
  node('z', 'input', { fields: [{ name: 'NAME', kind: 'text', value: 'attr_z' }] }),
  node('a', 'text', { fields: [{ name: 'TEXT', kind: 'text', value: 'A' }] }),
]);
const independentRootsB = canonicalizeBlockGraph([
  node('different-a', 'text', { fields: [{ name: 'TEXT', kind: 'text', value: 'A' }] }),
  node('different-z', 'input', { fields: [{ name: 'NAME', kind: 'text', value: 'attr_z' }] }),
]);
assert.deepEqual(independentRootsB, independentRootsA, 'independent root creation order is ignored');

const longChain: CanonicalGraphSourceNode[] = [];
for (let index = 0; index < 5_000; index += 1) {
  longChain.push(node(`block-${index}`, 'text', {
    fields: [{ name: 'TEXT', kind: 'text', value: String(index) }],
    nextId: index + 1 < 5_000 ? `block-${index + 1}` : null,
  }));
}
assert.equal(canonicalizeBlockGraph(longChain).nodes.length, 5_000, 'large chains avoid recursive stack overflow');

console.log('CANONICAL BLOCK GRAPH TEST PASS');

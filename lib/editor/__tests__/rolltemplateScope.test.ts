import assert from 'node:assert/strict';
import {
  findOwningRolltemplateId,
  listRolltemplateRoots,
  listRolltemplateScope,
  listSheetVisualScope,
  resolveActiveRolltemplateId,
} from '../rolltemplateScope';

const nodes = [
  { id: 'sheet', type: 'r20_div', layerParentId: null },
  { id: 'template-a', type: 'r20_rolltemplate_define', layerParentId: null },
  { id: 'row-a', type: 'r20_rolltemplate_row', layerParentId: 'template-a' },
  { id: 'value-a', type: 'r20_static_text', layerParentId: 'row-a' },
  { id: 'template-b', type: 'r20_rolltemplate_define', layerParentId: null },
  { id: 'row-b', type: 'r20_rolltemplate_row', layerParentId: 'template-b' },
];

assert.deepEqual(listRolltemplateRoots(nodes).map((node) => node.id), ['template-a', 'template-b']);
assert.equal(findOwningRolltemplateId(nodes, 'value-a'), 'template-a');
assert.equal(findOwningRolltemplateId(nodes, 'sheet'), null);
assert.equal(findOwningRolltemplateId(nodes, 'missing'), null);
assert.equal(resolveActiveRolltemplateId(nodes, 'row-b'), 'template-b');
assert.equal(resolveActiveRolltemplateId(nodes, 'sheet'), 'template-a');
assert.deepEqual(
  listRolltemplateScope(nodes, 'template-a').map((node) => node.id),
  ['template-a', 'row-a', 'value-a'],
);
assert.deepEqual(listSheetVisualScope(nodes).map((node) => node.id), ['sheet']);

console.log('rolltemplate scope test PASS');

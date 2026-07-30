import { strict as assert } from 'node:assert';
import { getAllBlocks, registerAllBlocks } from '@/lib/blocks/registry';
import { getLayerRole } from '../layerRoles';

registerAllBlocks();

const displayBlocks = getAllBlocks().filter(
  (block) => !block.internal && block.category === 'display',
);
const unclassifiedDisplay = displayBlocks.filter(
  (block) => getLayerRole(block.type).kind === 'other',
);

assert.equal(unclassifiedDisplay.length, 0, `display blocks without a layer role: ${unclassifiedDisplay.map((block) => block.type).join(', ')}`);
assert.equal(getLayerRole('r20_locale_value').kind, 'other', 'translation dictionary entries stay source-only');
assert.equal(getLayerRole('r20_locale_value').canReceiveChildren, false, 'source-only translation entries are not drop targets');

console.log(`layerRoleCatalog.test PASS display=${displayBlocks.length} unclassified=0`);

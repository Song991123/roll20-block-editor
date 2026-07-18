import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';

Blockly.Blocks.r20_test_container = {
  init() {
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.appendStatementInput('BODY');
  },
} as Blockly.Block.BlockDef;
Blockly.Blocks.r20_test_leaf = {
  init() {
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  },
} as Blockly.Block.BlockDef;

const workspace = new Blockly.Workspace();
const container = workspace.newBlock('r20_test_container');
const first = workspace.newBlock('r20_test_leaf');
const following = workspace.newBlock('r20_test_leaf');
container.getInput('BODY')!.connection!.connect(first.previousConnection!);
first.nextConnection!.connect(following.previousConnection!);

const adapter = getBlocklyAdapter();
adapter.registerWorkspace('html', workspace as unknown as Blockly.WorkspaceSvg);
try {
  assert.equal(adapter.moveBlockOutOfContainer('html', first.id), true);
  const layers = adapter.listAllBlocks('html');
  assert.deepEqual(
    layers.map((layer) => [layer.id, layer.layerParentId, layer.layerRelation]),
    [
      [container.id, null, 'root'],
      [following.id, container.id, 'child'],
      [first.id, null, 'sibling'],
    ],
  );
  assert.equal(container.nextConnection!.targetBlock()?.id, first.id);
  assert.equal(container.getInput('BODY')!.connection!.targetBlock()?.id, following.id);
  assert.equal(first.nextConnection!.targetBlock(), null);
} finally {
  adapter.unregisterWorkspace('html');
  workspace.dispose();
}

console.log('blockly layer operations test PASS');

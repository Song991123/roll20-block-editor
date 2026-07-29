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
  assert.equal(adapter.getBlock('html', following.id)?.layerParentId, container.id);
  assert.equal(adapter.getBlock('html', following.id)?.layerRelation, 'child');
  assert.equal(adapter.getBlock('html', first.id)?.layerParentId, null);
  assert.equal(container.nextConnection!.targetBlock()?.id, first.id);
  assert.equal(container.getInput('BODY')!.connection!.targetBlock()?.id, following.id);
  assert.equal(first.nextConnection!.targetBlock(), null);
} finally {
  adapter.unregisterWorkspace('html');
  workspace.dispose();
}

const beforeWorkspace = new Blockly.Workspace();
const beforeContainer = beforeWorkspace.newBlock('r20_test_container');
const nested = beforeWorkspace.newBlock('r20_test_leaf');
const rootTarget = beforeWorkspace.newBlock('r20_test_leaf');
beforeContainer.getInput('BODY')!.connection!.connect(nested.previousConnection!);

adapter.registerWorkspace('html', beforeWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  assert.equal(adapter.moveBlockBefore('html', nested.id, rootTarget.id), true);
  assert.equal(rootTarget.previousConnection!.targetBlock()?.id, nested.id);
  assert.equal(nested.getSurroundParent(), null);
  assert.equal(beforeContainer.getInput('BODY')!.connection!.targetBlock(), null);
} finally {
  adapter.unregisterWorkspace('html');
  beforeWorkspace.dispose();
}

const afterWorkspace = new Blockly.Workspace();
const afterContainer = afterWorkspace.newBlock('r20_test_container');
const afterNested = afterWorkspace.newBlock('r20_test_leaf');
const afterTarget = afterWorkspace.newBlock('r20_test_leaf');
afterContainer.getInput('BODY')!.connection!.connect(afterNested.previousConnection!);

adapter.registerWorkspace('html', afterWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  assert.equal(adapter.moveBlockAfter('html', afterNested.id, afterTarget.id), true);
  assert.equal(afterTarget.nextConnection!.targetBlock()?.id, afterNested.id);
  assert.equal(afterNested.getSurroundParent(), null);
  assert.equal(afterContainer.getInput('BODY')!.connection!.targetBlock(), null);
} finally {
  adapter.unregisterWorkspace('html');
  afterWorkspace.dispose();
}

const nestWorkspace = new Blockly.Workspace();
const nestContainer = nestWorkspace.newBlock('r20_test_container');
const nestMoving = nestWorkspace.newBlock('r20_test_leaf');
const nestInner = nestWorkspace.newBlock('r20_test_container');
nestContainer.getInput('BODY')!.connection!.connect(nestInner.previousConnection!);

adapter.registerWorkspace('html', nestWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  assert.equal(adapter.nestBlockInContainer('html', nestMoving.id, nestInner.id), true);
  assert.equal(nestInner.getInput('BODY')!.connection!.targetBlock()?.id, nestMoving.id);
  assert.equal(nestMoving.getSurroundParent()?.id, nestInner.id);
  assert.equal(adapter.nestBlockInContainer('html', nestInner.id, nestMoving.id), false);
  assert.equal(nestInner.getInput('BODY')!.connection!.targetBlock()?.id, nestMoving.id);
} finally {
  adapter.unregisterWorkspace('html');
  nestWorkspace.dispose();
}

console.log('blockly layer operations test PASS');

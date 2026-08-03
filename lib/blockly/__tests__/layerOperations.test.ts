import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { registerAllBlocks } from '@/lib/blocks/registry';

registerAllBlocks();

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
  const beforeMoveLayers = adapter.listAllBlocks('html');
  assert.equal(adapter.moveBlockOutOfContainer('html', first.id), true);
  const layers = adapter.listAllBlocks('html');
  assert.notStrictEqual(
    layers,
    beforeMoveLayers,
    'structural adapter mutations must invalidate the shared layer snapshot',
  );
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

const tableWorkspace = new Blockly.Workspace();
const tableRow = tableWorkspace.newBlock('r20_tr');
const tableHead = tableWorkspace.newBlock('r20_i18n_text');
const tableState = tableWorkspace.newBlock('r20_i18n_text');
tableHead.setFieldValue('th', 'TAG');
tableState.setFieldValue('th', 'TAG');
tableRow.getInput('CONTENT')!.connection!.connect(tableHead.previousConnection!);
tableHead.nextConnection!.connect(tableState.previousConnection!);

adapter.registerWorkspace('html', tableWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  assert.equal(adapter.canNestBlockInContainer('html', tableState.id, tableRow.id), true);
  assert.equal(adapter.moveBlockBefore('html', tableState.id, tableHead.id), true);
  assert.equal(tableRow.getInput('CONTENT')!.connection!.targetBlock()?.id, tableState.id);
  assert.equal(tableState.nextConnection!.targetBlock()?.id, tableHead.id);
} finally {
  adapter.unregisterWorkspace('html');
  tableWorkspace.dispose();
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

const nonLeafWorkspace = new Blockly.Workspace();
const nonLeafRoot = nonLeafWorkspace.newBlock('r20_test_container');
const nonLeafGroupA = nonLeafWorkspace.newBlock('r20_test_container');
const nonLeafChildA = nonLeafWorkspace.newBlock('r20_test_leaf');
const nonLeafGroupB = nonLeafWorkspace.newBlock('r20_test_container');
const nonLeafChildB = nonLeafWorkspace.newBlock('r20_test_leaf');
nonLeafRoot.getInput('BODY')!.connection!.connect(nonLeafGroupA.previousConnection!);
nonLeafGroupA.nextConnection!.connect(nonLeafGroupB.previousConnection!);
nonLeafGroupA.getInput('BODY')!.connection!.connect(nonLeafChildA.previousConnection!);
nonLeafGroupB.getInput('BODY')!.connection!.connect(nonLeafChildB.previousConnection!);

adapter.registerWorkspace('html', nonLeafWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  // Moving a visible group must move its complete subtree, not promote or
  // detach the group's children from their original container.
  assert.equal(adapter.moveBlockAfter('html', nonLeafGroupA.id, nonLeafGroupB.id), true);
  assert.equal(nonLeafRoot.getInput('BODY')!.connection!.targetBlock()?.id, nonLeafGroupB.id);
  assert.equal(nonLeafGroupB.nextConnection!.targetBlock()?.id, nonLeafGroupA.id);
  assert.equal(nonLeafChildA.getSurroundParent()?.id, nonLeafGroupA.id);
  assert.equal(nonLeafChildB.getSurroundParent()?.id, nonLeafGroupB.id);
  assert.equal(nonLeafGroupA.getInput('BODY')!.connection!.targetBlock()?.id, nonLeafChildA.id);
  assert.equal(nonLeafGroupB.getInput('BODY')!.connection!.targetBlock()?.id, nonLeafChildB.id);
} finally {
  adapter.unregisterWorkspace('html');
  nonLeafWorkspace.dispose();
}

const deleteWorkspace = new Blockly.Workspace();
const deleteRoot = deleteWorkspace.newBlock('r20_test_container');
const deleteFrame = deleteWorkspace.newBlock('r20_test_container');
const deleteChild = deleteWorkspace.newBlock('r20_test_leaf');
const deleteFollowing = deleteWorkspace.newBlock('r20_test_leaf');
deleteRoot.getInput('BODY')!.connection!.connect(deleteFrame.previousConnection!);
deleteFrame.getInput('BODY')!.connection!.connect(deleteChild.previousConnection!);
deleteChild.nextConnection!.connect(deleteFollowing.previousConnection!);

adapter.registerWorkspace('html', deleteWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  // Layer deletion removes the selected frame and its complete nested
  // subtree; it must not promote the frame's descendants to new root layers.
  assert.equal(adapter.deleteBlock('html', deleteFrame.id), true);
  assert.equal(deleteWorkspace.getBlockById(deleteFrame.id), null);
  assert.equal(deleteWorkspace.getBlockById(deleteChild.id), null);
  assert.equal(deleteWorkspace.getBlockById(deleteFollowing.id), null);
  assert.equal(deleteRoot.getInput('BODY')!.connection!.targetBlock(), null);
  assert.deepEqual(adapter.listAllBlocks('html').map((layer) => layer.id), [deleteRoot.id]);
} finally {
  adapter.unregisterWorkspace('html');
  deleteWorkspace.dispose();
}

const siblingDeleteWorkspace = new Blockly.Workspace();
const siblingDeleteRoot = siblingDeleteWorkspace.newBlock('r20_test_container');
const siblingDeleteFirst = siblingDeleteWorkspace.newBlock('r20_test_leaf');
const siblingDeleteMiddle = siblingDeleteWorkspace.newBlock('r20_test_leaf');
const siblingDeleteLast = siblingDeleteWorkspace.newBlock('r20_test_leaf');
siblingDeleteRoot.getInput('BODY')!.connection!.connect(siblingDeleteFirst.previousConnection!);
siblingDeleteFirst.nextConnection!.connect(siblingDeleteMiddle.previousConnection!);
siblingDeleteMiddle.nextConnection!.connect(siblingDeleteLast.previousConnection!);

adapter.registerWorkspace('html', siblingDeleteWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  assert.equal(adapter.deleteBlock('html', siblingDeleteMiddle.id), true);
  assert.equal(siblingDeleteWorkspace.getBlockById(siblingDeleteMiddle.id), null);
  assert.equal(siblingDeleteRoot.getInput('BODY')!.connection!.targetBlock()?.id, siblingDeleteFirst.id);
  assert.equal(siblingDeleteFirst.nextConnection!.targetBlock()?.id, siblingDeleteLast.id);
  assert.equal(siblingDeleteLast.getPreviousBlock()?.id, siblingDeleteFirst.id);
} finally {
  adapter.unregisterWorkspace('html');
  siblingDeleteWorkspace.dispose();
}

const duplicateWorkspace = new Blockly.Workspace();
const duplicateSource = duplicateWorkspace.newBlock('r20_test_leaf');
const duplicateFollowing = duplicateWorkspace.newBlock('r20_test_leaf');
duplicateSource.nextConnection!.connect(duplicateFollowing.previousConnection!);

adapter.registerWorkspace('html', duplicateWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  const duplicateId = adapter.duplicateBlock('html', duplicateSource.id);
  assert.ok(duplicateId);
  const duplicate = duplicateWorkspace.getBlockById(duplicateId!);
  assert.ok(duplicate);
  assert.equal(duplicate!.getNextBlock(), null);
  assert.equal(duplicateSource.getNextBlock()?.id, duplicateFollowing.id);
  assert.equal(duplicateWorkspace.getAllBlocks(false).length, 3);
} finally {
  adapter.unregisterWorkspace('html');
  duplicateWorkspace.dispose();
}

const groupWorkspace = new Blockly.Workspace();
const groupFirst = groupWorkspace.newBlock('r20_i18n_text');
const groupSecond = groupWorkspace.newBlock('r20_i18n_text');
groupFirst.nextConnection!.connect(groupSecond.previousConnection!);

adapter.registerWorkspace('html', groupWorkspace as unknown as Blockly.WorkspaceSvg);
try {
  const groupId = adapter.groupBlocksInContainer('html', [groupFirst.id, groupSecond.id]);
  assert.ok(groupId);
  const group = groupWorkspace.getBlockById(groupId!);
  assert.ok(group);
  assert.equal(group!.type, 'r20_element_container');
  assert.equal(group!.getFieldValue('TAG'), 'div');
  const content = group!.getInput('CONTENT')!.connection!.targetBlock();
  assert.equal(content?.id, groupFirst.id);
  assert.equal(content?.nextConnection?.targetBlock()?.id, groupSecond.id);
  assert.equal(groupFirst.getSurroundParent()?.id, groupId);
  assert.equal(groupSecond.getSurroundParent()?.id, groupId);
  assert.equal(groupWorkspace.getTopBlocks(true).length, 1);
  assert.equal(adapter.groupBlocksInContainer('html', [groupFirst.id, groupId!]), null);
} finally {
  adapter.unregisterWorkspace('html');
  groupWorkspace.dispose();
}

console.log('blockly layer operations test PASS');

import assert from 'node:assert/strict';
import type * as Blockly from 'blockly';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';

const adapter = getBlocklyAdapter();
let undoStack: unknown[] = [{}];
let redoStack: unknown[] = [];
const calls: boolean[] = [];
const workspace = {
  getUndoStack: () => undoStack,
  getRedoStack: () => redoStack,
  undo: (redo: boolean) => {
    calls.push(redo);
    if (redo) {
      redoStack.pop();
      undoStack.push({});
    } else {
      undoStack.pop();
      redoStack.push({});
    }
  },
} as unknown as Blockly.WorkspaceSvg;

adapter.registerWorkspace('html', workspace);
try {
  assert.equal(adapter.canUndo('html'), true);
  assert.equal(adapter.canRedo('html'), false);
  assert.equal(adapter.undo('html'), true);
  assert.deepEqual(calls, [false]);
  assert.equal(adapter.canUndo('html'), false);
  assert.equal(adapter.canRedo('html'), true);
  assert.equal(adapter.redo('html'), true);
  assert.deepEqual(calls, [false, true]);
  assert.equal(adapter.canRedo('html'), false);
  assert.equal(adapter.canUndo('html'), true);
} finally {
  adapter.unregisterWorkspace('html');
}

console.log('blockly history adapter test PASS');

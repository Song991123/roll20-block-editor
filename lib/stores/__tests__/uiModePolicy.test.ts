import assert from 'node:assert/strict';
import {
  availableMainModes,
  nextMainMode,
  restoreMainMode,
  useUiStore,
} from '../uiStore';

assert.deepEqual(availableMainModes(false), ['preview', 'assemble', 'split']);
assert.deepEqual(availableMainModes(true), ['preview', 'edit', 'assemble', 'split']);

assert.equal(nextMainMode('preview', false), 'assemble');
assert.equal(nextMainMode('assemble', false), 'split');
assert.equal(nextMainMode('split', false), 'preview');
assert.equal(nextMainMode('preview', true), 'edit');
assert.equal(nextMainMode('edit', true), 'assemble');

assert.equal(restoreMainMode('edit', false), 'preview');
assert.equal(restoreMainMode('edit', true), 'edit');
assert.equal(restoreMainMode('assemble', false), 'assemble');
assert.equal(restoreMainMode('unknown', true), 'preview');

const initial = useUiStore.getState();
assert.equal(initial.mainMode, 'preview');
assert.equal(initial.directEditExperimentalEnabled, false);

initial.setDirectEditExperimentalEnabled(true);
useUiStore.getState().setMainMode('edit');
assert.equal(useUiStore.getState().mainMode, 'edit');
useUiStore.getState().setDirectEditExperimentalEnabled(false);
assert.equal(useUiStore.getState().mainMode, 'preview');

console.log('ui mode policy tests passed');
process.exit(0);

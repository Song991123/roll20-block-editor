import { strict as assert } from 'node:assert';
import {
  designSelectionBounds,
  resolveDesignAlignment,
  type DesignAlignmentItem,
} from '../designAlignment.ts';

const items: DesignAlignmentItem[] = [
  { blockId: 'a', rect: { left: 10, top: 20, width: 40, height: 30 } },
  { blockId: 'b', rect: { left: 90, top: 80, width: 20, height: 10 } },
];

assert.deepEqual(designSelectionBounds(items), {
  left: 10,
  top: 20,
  width: 100,
  height: 70,
});
assert.deepEqual(resolveDesignAlignment(items, 'left'), [
  { blockId: 'a', deltaX: 0, deltaY: 0 },
  { blockId: 'b', deltaX: -80, deltaY: 0 },
]);
assert.deepEqual(resolveDesignAlignment(items, 'horizontal-center'), [
  { blockId: 'a', deltaX: 30, deltaY: 0 },
  { blockId: 'b', deltaX: -40, deltaY: 0 },
]);
assert.deepEqual(resolveDesignAlignment(items, 'right'), [
  { blockId: 'a', deltaX: 60, deltaY: 0 },
  { blockId: 'b', deltaX: 0, deltaY: 0 },
]);
assert.deepEqual(resolveDesignAlignment(items, 'top'), [
  { blockId: 'a', deltaX: 0, deltaY: 0 },
  { blockId: 'b', deltaX: 0, deltaY: -60 },
]);
assert.deepEqual(resolveDesignAlignment(items, 'vertical-center'), [
  { blockId: 'a', deltaX: 0, deltaY: 20 },
  { blockId: 'b', deltaX: 0, deltaY: -30 },
]);
assert.deepEqual(resolveDesignAlignment(items, 'bottom'), [
  { blockId: 'a', deltaX: 0, deltaY: 40 },
  { blockId: 'b', deltaX: 0, deltaY: 0 },
]);
assert.equal(designSelectionBounds([items[0]]), null);
assert.deepEqual(resolveDesignAlignment([items[0]], 'left'), []);

console.log('designAlignment.test PASS');

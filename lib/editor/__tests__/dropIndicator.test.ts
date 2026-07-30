import { strict as assert } from 'node:assert';
import { dropIndicatorLabel, getDropIndicatorRect } from '../dropIndicator';

const target = { left: 12, top: 30, width: 140, height: 80 };

assert.deepEqual(getDropIndicatorRect('before', target), {
  left: 12,
  top: 30,
  width: 140,
  height: 4,
});
assert.deepEqual(getDropIndicatorRect('after', target), {
  left: 12,
  top: 106,
  width: 140,
  height: 4,
});
assert.deepEqual(getDropIndicatorRect('inside', target), target);
assert.equal(getDropIndicatorRect('before', { ...target, height: 1 }, 8).height, 1);
assert.equal(getDropIndicatorRect('after', target, 100).height, 12);
assert.equal(dropIndicatorLabel('before'), '앞에 놓기');
assert.equal(dropIndicatorLabel('inside'), '안에 넣기');
assert.equal(dropIndicatorLabel('after'), '뒤에 놓기');

console.log('dropIndicator.test PASS');

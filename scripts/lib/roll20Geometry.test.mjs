import assert from 'node:assert/strict';
import { compareRoll20Geometry, normalizeRoll20Geometry } from './roll20Geometry.mjs';

const actual = normalizeRoll20Geometry({
  viewport: { width: 900, height: 366 },
  iframe: { x: 0, y: 0, width: 900, height: 366 },
  dialog: { x: 0, y: 0, width: 900, height: 366 },
  form: { x: 20, y: 61.4, width: 860, height: 200 },
  root: { x: 20, y: 61.4, width: 860, height: 200 },
  content: { x: 30, y: 71.4, width: 840, height: 180 },
});

const localWithDifferentWrapper = normalizeRoll20Geometry({
  viewport: { width: 900, height: 366 },
  iframe: { x: 0, y: 0, width: 900, height: 366 },
  dialog: { x: 0, y: 0, width: 900, height: 366 },
  form: { x: 0, y: 0, width: 850, height: 200 },
  root: { x: 0, y: 0, width: 850, height: 200 },
  content: { x: 10, y: 10, width: 840, height: 180 },
});

const contextDelta = compareRoll20Geometry(localWithDifferentWrapper, actual);
assert.equal(contextDelta.authoredCanvas.status, 'PASS');
assert.equal(contextDelta.outerRoot.status, 'FAIL');
assert.equal(contextDelta.status, 'PASS_WITH_CONTEXT_DELTA');
assert.equal(contextDelta.promotable, false);
assert.match(contextDelta.notes.join(' '), /wrapper\/context/);

const exact = compareRoll20Geometry(actual, actual);
assert.equal(exact.status, 'PASS');
assert.equal(exact.promotable, true);
assert.equal(exact.chain.root.status, 'PASS');

const missingParent = compareRoll20Geometry(
  { root: { width: 850, height: 200 }, content: { width: 840, height: 180 } },
  { sheetRoot: { width: 860, height: 200 }, sheetCanvas: { width: 840, height: 180 } },
);
assert.equal(missingParent.authoredCanvas.status, 'PASS');
assert.equal(missingParent.status, 'PASS_WITH_CONTEXT_DELTA');
assert.equal(missingParent.promotable, false);

const styleSummary = normalizeRoll20Geometry({
  root: { width: '830px', height: '180px', rectWidth: 850, rectHeight: 200 },
  contentBox: { width: '830px', height: '180px', rectWidth: 830, rectHeight: 180 },
});
assert.deepEqual(styleSummary.outerRoot, { width: 850, height: 200 });
assert.deepEqual(styleSummary.authoredCanvas, { width: 830, height: 180 });

console.log('roll20Geometry self-test PASS');

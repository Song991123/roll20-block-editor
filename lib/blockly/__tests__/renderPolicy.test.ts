import assert from 'node:assert/strict';
import { MAX_SVG_BLOCKS, shouldRenderWorkspaceSvg } from '@/lib/blockly/renderPolicy';

assert.equal(shouldRenderWorkspaceSvg(MAX_SVG_BLOCKS), true);
assert.equal(shouldRenderWorkspaceSvg(MAX_SVG_BLOCKS + 1), false);
assert.equal(shouldRenderWorkspaceSvg(0), true);
assert.equal(shouldRenderWorkspaceSvg(Number.NaN), false);
assert.equal(shouldRenderWorkspaceSvg(Number.POSITIVE_INFINITY), false);

console.log('render policy test PASS');

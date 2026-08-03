import { strict as assert } from 'node:assert';
import {
  clampCanvasWidth,
  clampSheetRenderHeight,
  ROLLTEMPLATE_CANVAS_MAX_WIDTH,
  ROLLTEMPLATE_CANVAS_MIN_WIDTH,
  SHEET_CANVAS_DEFAULT_WIDTH,
  SHEET_CANVAS_MAX_WIDTH,
  SHEET_CANVAS_MIN_WIDTH,
  SHEET_RENDER_MAX_HEIGHT,
  SHEET_RENDER_MIN_HEIGHT,
} from '../canvasDimensions.ts';

assert.equal(clampCanvasWidth('sheet', Number.NaN), SHEET_CANVAS_DEFAULT_WIDTH);
assert.equal(clampCanvasWidth('sheet', SHEET_CANVAS_MIN_WIDTH - 1), SHEET_CANVAS_MIN_WIDTH);
assert.equal(clampCanvasWidth('sheet', 850.4), 850);
assert.equal(clampCanvasWidth('sheet', SHEET_CANVAS_MAX_WIDTH + 1), SHEET_CANVAS_MAX_WIDTH);
assert.equal(clampCanvasWidth('rolltemplate', ROLLTEMPLATE_CANVAS_MIN_WIDTH - 1), ROLLTEMPLATE_CANVAS_MIN_WIDTH);
assert.equal(clampCanvasWidth('rolltemplate', ROLLTEMPLATE_CANVAS_MAX_WIDTH + 1), ROLLTEMPLATE_CANVAS_MAX_WIDTH);

assert.equal(clampSheetRenderHeight(72), 72, 'short authored sheets keep their exact height');
assert.equal(clampSheetRenderHeight(0), SHEET_RENDER_MIN_HEIGHT, 'empty measurements keep a minimal host');
assert.equal(clampSheetRenderHeight(Number.NaN), SHEET_RENDER_MIN_HEIGHT, 'invalid measurements are bounded');
assert.equal(clampSheetRenderHeight(60001), SHEET_RENDER_MAX_HEIGHT, 'pathological measurements are capped');

console.log('canvasDimensions.test PASS');

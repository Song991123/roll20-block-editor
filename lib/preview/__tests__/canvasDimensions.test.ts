import { strict as assert } from 'node:assert';
import {
  clampCanvasWidth,
  ROLLTEMPLATE_CANVAS_MAX_WIDTH,
  ROLLTEMPLATE_CANVAS_MIN_WIDTH,
  SHEET_CANVAS_DEFAULT_WIDTH,
  SHEET_CANVAS_MAX_WIDTH,
  SHEET_CANVAS_MIN_WIDTH,
} from '../canvasDimensions.ts';

assert.equal(clampCanvasWidth('sheet', Number.NaN), SHEET_CANVAS_DEFAULT_WIDTH);
assert.equal(clampCanvasWidth('sheet', SHEET_CANVAS_MIN_WIDTH - 1), SHEET_CANVAS_MIN_WIDTH);
assert.equal(clampCanvasWidth('sheet', 850.4), 850);
assert.equal(clampCanvasWidth('sheet', SHEET_CANVAS_MAX_WIDTH + 1), SHEET_CANVAS_MAX_WIDTH);
assert.equal(clampCanvasWidth('rolltemplate', ROLLTEMPLATE_CANVAS_MIN_WIDTH - 1), ROLLTEMPLATE_CANVAS_MIN_WIDTH);
assert.equal(clampCanvasWidth('rolltemplate', ROLLTEMPLATE_CANVAS_MAX_WIDTH + 1), ROLLTEMPLATE_CANVAS_MAX_WIDTH);

console.log('canvasDimensions.test PASS');

import assert from 'node:assert/strict';
import { normalizeRect, selectRolltemplateCaptureRect } from './roll20ChatCaptureRects.mjs';

const clip = { x: 100, y: 200, width: 284, height: 79 };
const layoutRect = { x: 100, y: 200.125, width: 279, height: 78.125 };
const paintRect = { x: 100, y: 200.125, width: 283.2, height: 78.125 };

assert.deepEqual(
  selectRolltemplateCaptureRect({
    template: { rect: layoutRect, templatePaintBounds: paintRect },
    sidecar: {},
    clip,
  }),
  {
    rect: normalizeRect(paintRect),
    layoutRect: normalizeRect(layoutRect),
    rectSource: 'template.templatePaintBounds',
  },
);

assert.equal(
  selectRolltemplateCaptureRect({ template: { rect: layoutRect }, sidecar: {}, clip }).rectSource,
  'template.rect',
);

assert.equal(
  selectRolltemplateCaptureRect({
    template: { rect: layoutRect },
    sidecar: { templatePaintBounds: paintRect },
    clip,
  }).rectSource,
  'sidecar.templatePaintBounds',
);

assert.equal(
  selectRolltemplateCaptureRect({
    template: {
      rect: layoutRect,
      templatePaintBounds: { x: 900, y: 900, width: 20, height: 20 },
    },
    sidecar: {},
    clip,
  }).rectSource,
  'template.rect',
);

assert.equal(
  selectRolltemplateCaptureRect({
    template: { rect: { x: 900, y: 900, width: 20, height: 20 } },
    sidecar: {},
    clip,
  }),
  null,
);

console.log('roll20 chat capture rects test PASS');

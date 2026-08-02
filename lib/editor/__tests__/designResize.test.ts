import { strict as assert } from 'node:assert';
import type { IframeEditNodeGeometry } from '@/lib/preview/iframeEditBridge';
import {
  DESIGN_RESIZE_HANDLES,
  managedResizeDeclarations,
  resizeHandlesForGeometry,
  resolveDesignResizeRect,
} from '../designResize.ts';

const absolute = geometry({
  position: 'absolute',
  display: 'block',
  computedWidth: 80,
  computedHeight: 30,
});

assert.deepEqual(resizeHandlesForGeometry(absolute), DESIGN_RESIZE_HANDLES);
assert.deepEqual(
  resolveDesignResizeRect(absolute.rect, 'se', 23, 13),
  { left: 10, top: 20, width: 123, height: 53 },
);
assert.deepEqual(
  resolveDesignResizeRect(absolute.rect, 'nw', 96, 36),
  { left: 102, top: 52, width: 8, height: 8 },
);
assert.deepEqual(
  resolveDesignResizeRect(absolute.rect, 'e', 11, 99, 8),
  { left: 10, top: 20, width: 112, height: 40 },
);

const resized = resolveDesignResizeRect(absolute.rect, 'nw', -20, -10);
assert.deepEqual(managedResizeDeclarations(absolute, absolute.rect, resized, 'nw'), {
  width: '100px',
  height: '40px',
  left: '24px',
  right: null,
  top: '38px',
  bottom: null,
});

const flow = geometry({ position: 'static', display: 'flex' });
assert.deepEqual(resizeHandlesForGeometry(flow), ['e', 'se', 's']);
assert.deepEqual(
  managedResizeDeclarations(
    flow,
    flow.rect,
    resolveDesignResizeRect(flow.rect, 'e', 24, 0),
    'e',
  ),
  { width: '124px' },
);

assert.deepEqual(resizeHandlesForGeometry(geometry({ display: 'inline' })), []);
assert.deepEqual(
  resizeHandlesForGeometry(geometry({ display: 'inline', tagName: 'img' })),
  ['e', 'se', 's'],
);
assert.deepEqual(resizeHandlesForGeometry(geometry({ display: 'table-row' })), []);
assert.deepEqual(resizeHandlesForGeometry(geometry({ width: 0 })), []);

console.log('designResize.test PASS');

function geometry(
  overrides: Partial<IframeEditNodeGeometry> & { width?: number } = {},
): IframeEditNodeGeometry {
  const { width, ...geometryOverrides } = overrides;
  return {
    blockId: 'subject',
    rect: {
      left: 10,
      top: 20,
      width: width ?? 100,
      height: 40,
    },
    offsetLeft: 44,
    offsetTop: 48,
    scrollLeft: 0,
    scrollTop: 0,
    clientLeft: 0,
    clientTop: 0,
    position: 'static',
    tagName: 'div',
    offsetParentBlockId: 'frame',
    offsetParentPosition: 'relative',
    display: 'block',
    computedWidth: 100,
    computedHeight: 40,
    ...geometryOverrides,
  };
}

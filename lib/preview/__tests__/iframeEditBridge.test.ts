import { strict as assert } from 'node:assert';
import {
  R20_IFRAME_EDIT_PROTOCOL,
  isTrustedIframeMessage,
  parseIframeEditBridgeMessage,
} from '../iframeEditBridge.ts';

const bridgeId = 'r20-test-bridge-123';
const subject = {
  blockId: 'block-1',
  rect: { left: 10, top: 20, width: 100, height: 40 },
  offsetLeft: 6,
  offsetTop: 8,
  scrollLeft: 0,
  scrollTop: 0,
  clientLeft: 1,
  clientTop: 1,
  position: 'absolute',
  tagName: 'div',
  display: 'block',
  computedWidth: 98,
  computedHeight: 38,
  offsetParentBlockId: 'frame-1',
  offsetParentPosition: 'relative',
};
const hit = {
  type: 'r20:edit-hit',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  phase: 'pointerdown',
  blockId: 'block-1',
  rect: subject.rect,
  pointer: { x: 12, y: 24 },
  pointerId: 7,
  button: 0,
  buttons: 1,
  modifiers: { altKey: false, ctrlKey: true, metaKey: false, shiftKey: false },
  subject,
  hitPath: [subject, {
    blockId: 'frame-1',
    rect: { left: 4, top: 6, width: 140, height: 90 },
    offsetLeft: 0,
    offsetTop: 0,
    scrollLeft: 0,
    scrollTop: 0,
    clientLeft: 1,
    clientTop: 1,
    position: 'relative',
    offsetParentBlockId: null,
    offsetParentPosition: 'static',
  }],
};

assert.deepEqual(parseIframeEditBridgeMessage(hit), hit);
const multiHit = {
  ...hit,
  selection: [
    { geometry: subject, hitPath: hit.hitPath },
    {
      geometry: {
        ...subject,
        blockId: 'block-2',
        rect: { left: 120, top: 20, width: 80, height: 40 },
        offsetLeft: 116,
      },
      hitPath: [{
        ...subject,
        blockId: 'block-2',
        rect: { left: 120, top: 20, width: 80, height: 40 },
        offsetLeft: 116,
      }],
    },
  ],
};
assert.deepEqual(parseIframeEditBridgeMessage(multiHit), multiHit);
assert.deepEqual(parseIframeEditBridgeMessage({
  type: 'r20:edit-applied',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  revision: 3,
  blockCount: 12,
}), {
  type: 'r20:edit-applied',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  revision: 3,
  blockCount: 12,
});
assert.deepEqual(parseIframeEditBridgeMessage({
  type: 'r20:edit-ready',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
}), {
  type: 'r20:edit-ready',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
});
const nudge = {
  type: 'r20:edit-nudge',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  deltaX: 1,
  deltaY: -10,
  selection: [{ geometry: subject, hitPath: hit.hitPath }],
};
assert.deepEqual(parseIframeEditBridgeMessage(nudge), nudge);
const widgetDrag = {
  type: 'r20:widget-drag',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  phase: 'drop',
  payload: JSON.stringify({ id: 'number-input' }),
  pointer: { x: 44, y: 55 },
  hitPath: hit.hitPath,
};
assert.deepEqual(parseIframeEditBridgeMessage(widgetDrag), widgetDrag);
const blockTypeDrag = {
  type: 'r20:block-type-drag',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  phase: 'drop',
  blockType: 'r20_div',
  pointer: { x: 144, y: 155 },
  hitPath: hit.hitPath,
};
assert.deepEqual(parseIframeEditBridgeMessage(blockTypeDrag), blockTypeDrag);
const layerDrag = {
  type: 'r20:layer-drag',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  phase: 'drop',
  blockId: 'block-1',
  pointer: { x: 144, y: 155 },
  subject,
  hitPath: hit.hitPath,
};
assert.deepEqual(parseIframeEditBridgeMessage(layerDrag), layerDrag);
const contextMenu = {
  type: 'r20:edit-context-menu',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
  blockId: 'block-1',
  pointer: { x: 33, y: 44 },
};
assert.deepEqual(parseIframeEditBridgeMessage(contextMenu), contextMenu);

assert.equal(parseIframeEditBridgeMessage({ ...hit, protocol: 2 }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, bridgeId: 'short' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, blockId: '' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, phase: 'drag' }), null);
assert.equal(parseIframeEditBridgeMessage({
  type: 'r20:edit-applied', protocol: 1, bridgeId, revision: 0, blockCount: 1,
}), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, pointerId: 1.5 }), null);
assert.equal(parseIframeEditBridgeMessage({
  ...hit,
  subject: { ...subject, computedWidth: Number.NaN },
}), null);
assert.equal(parseIframeEditBridgeMessage({
  ...hit,
  subject: { ...subject, display: 'x'.repeat(65) },
}), null);
assert.equal(parseIframeEditBridgeMessage({
  ...hit,
  subject: { ...subject, tagName: 'x'.repeat(65) },
}), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, modifiers: { ctrlKey: 'yes' } }), null);
assert.equal(parseIframeEditBridgeMessage({ ...nudge, deltaX: 11 }), null);
assert.equal(parseIframeEditBridgeMessage({ ...nudge, deltaX: 0, deltaY: 0 }), null);
assert.equal(parseIframeEditBridgeMessage({ ...nudge, selection: [] }), null);
assert.equal(parseIframeEditBridgeMessage({ ...nudge, selection: [nudge.selection[0], nudge.selection[0]] }), null);
assert.equal(parseIframeEditBridgeMessage({ ...multiHit, selection: [multiHit.selection[0], multiHit.selection[0]] }), null);
assert.equal(parseIframeEditBridgeMessage({ ...multiHit, selection: [] }), null);
assert.equal(parseIframeEditBridgeMessage({ ...multiHit, selection: [{ geometry: subject, hitPath: new Array(65).fill(subject) }] }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, hitPath: new Array(65).fill(subject) }), null);
assert.equal(parseIframeEditBridgeMessage({
  ...hit,
  subject: { ...subject, blockId: 'different-block' },
}), null);
assert.equal(parseIframeEditBridgeMessage({
  ...hit,
  rect: { ...hit.rect, width: Number.POSITIVE_INFINITY },
}), null);
assert.equal(parseIframeEditBridgeMessage({
  ...hit,
  pointer: { x: 20_000_000, y: 0 },
}), null);
assert.equal(parseIframeEditBridgeMessage({ ...widgetDrag, phase: 'dragstart' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...widgetDrag, payload: 'x'.repeat(1025) }), null);
assert.equal(parseIframeEditBridgeMessage({ ...blockTypeDrag, blockType: 'x'.repeat(257) }), null);
assert.equal(parseIframeEditBridgeMessage({ ...blockTypeDrag, phase: 'dragstart' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...layerDrag, blockId: '' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...layerDrag, subject: { ...subject, blockId: 'other' } }), null);
assert.equal(parseIframeEditBridgeMessage({ ...contextMenu, blockId: '' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...contextMenu, pointer: { x: Number.NaN, y: 0 } }), null);

const frameWindow = {};
const iframe = { contentWindow: frameWindow } as unknown as HTMLIFrameElement;
assert.equal(isTrustedIframeMessage({
  source: frameWindow,
  origin: 'null',
} as unknown as MessageEvent, iframe), true);
assert.equal(isTrustedIframeMessage({
  source: {},
  origin: 'null',
} as unknown as MessageEvent, iframe), false);
assert.equal(isTrustedIframeMessage({
  source: frameWindow,
  origin: 'https://example.test',
} as unknown as MessageEvent, iframe), false);

console.log('iframeEditBridge.test PASS');

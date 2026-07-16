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
  subject,
  hitPath: [subject, {
    blockId: 'frame-1',
    rect: { left: 4, top: 6, width: 140, height: 90 },
    offsetLeft: 0,
    offsetTop: 0,
    offsetParentBlockId: null,
    offsetParentPosition: 'static',
  }],
};

assert.deepEqual(parseIframeEditBridgeMessage(hit), hit);
assert.deepEqual(parseIframeEditBridgeMessage({
  type: 'r20:edit-ready',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
}), {
  type: 'r20:edit-ready',
  protocol: R20_IFRAME_EDIT_PROTOCOL,
  bridgeId,
});

assert.equal(parseIframeEditBridgeMessage({ ...hit, protocol: 2 }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, bridgeId: 'short' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, blockId: '' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, phase: 'drag' }), null);
assert.equal(parseIframeEditBridgeMessage({ ...hit, pointerId: 1.5 }), null);
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

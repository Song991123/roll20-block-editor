import { strict as assert } from 'node:assert';
import type { BlockSnapshot } from '@/lib/blockly/adapter';
import { resolveIframeEditDropTarget } from '../iframeDropTarget.ts';
import type { IframeEditHitMessage, IframeEditNodeGeometry } from '@/lib/preview/iframeEditBridge';

const geometry = (
  blockId: string,
  top: number,
  height: number,
): IframeEditNodeGeometry => ({
  blockId,
  rect: { left: 0, top, width: 200, height },
  offsetLeft: 0,
  offsetTop: top,
  offsetParentBlockId: null,
  offsetParentPosition: 'static',
});

const blocks = new Map<string, BlockSnapshot>([
  ['frame', {
    id: 'frame', type: 'r20_div', depth: 0, childCount: 2,
    layerParentId: null, layerPreviousId: null, layerRelation: 'root',
    label: 'Frame', preview: '', category: 'container',
  }],
  ['subject', {
    id: 'subject', type: 'r20_text_input', depth: 1, childCount: 0,
    layerParentId: 'frame', layerPreviousId: null, layerRelation: 'child',
    label: 'Subject', preview: '', category: 'input',
  }],
  ['subject-child', {
    id: 'subject-child', type: 'r20_span', depth: 2, childCount: 0,
    layerParentId: 'subject', layerPreviousId: null, layerRelation: 'child',
    label: 'Subject child', preview: '', category: 'container',
  }],
  ['sibling', {
    id: 'sibling', type: 'r20_text_input', depth: 1, childCount: 0,
    layerParentId: 'frame', layerPreviousId: 'subject', layerRelation: 'sibling',
    label: 'Sibling', preview: '', category: 'input',
  }],
]);

const lookup = {
  getBlock: (id: string) => blocks.get(id) ?? null,
  canNestInContainer: (id: string) => id === 'frame',
};

const subject = geometry('subject', 20, 40);
const message = (
  hitPath: IframeEditNodeGeometry[],
  y: number,
  phase: IframeEditHitMessage['phase'] = 'pointermove',
): IframeEditHitMessage => ({
  type: 'r20:edit-hit', protocol: 1, bridgeId: 'r20-drop-target-test',
  phase, blockId: 'subject', rect: subject.rect, pointer: { x: 20, y },
  pointerId: 4, button: 0, buttons: phase === 'pointerup' ? 0 : 1,
  subject, hitPath,
});

assert.deepEqual(resolveIframeEditDropTarget(
  message([geometry('sibling', 100, 40), geometry('frame', 0, 200)], 105),
  lookup,
), {
  blockId: 'sibling', label: 'Sibling', mode: 'before',
  containerBlockId: null, siblingBlockId: 'sibling', geometry: geometry('sibling', 100, 40),
});

assert.equal(resolveIframeEditDropTarget(
  message([geometry('sibling', 100, 40)], 135),
  lookup,
)?.mode, 'after');

assert.deepEqual(resolveIframeEditDropTarget(
  message([geometry('frame', 0, 200)], 100),
  lookup,
)?.mode, 'inside');

assert.equal(resolveIframeEditDropTarget(
  message([geometry('subject-child', 30, 10), subject, geometry('frame', 0, 200)], 100),
  lookup,
)?.blockId, 'frame');

assert.equal(resolveIframeEditDropTarget(message([geometry('sibling', 100, 40)], 120, 'pointercancel'), lookup), null);
assert.equal(resolveIframeEditDropTarget(message([], 0), lookup), null);

console.log('iframeDropTarget.test PASS');

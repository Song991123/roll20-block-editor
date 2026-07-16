import { strict as assert } from 'node:assert';
import type { BlockSnapshot } from '@/lib/blockly/adapter';
import {
  commitIframeFlowDrop,
  resolveIframeEditDropTarget,
  resolveIframeFreePlacement,
  resolveIframeWidgetDropTarget,
} from '../iframeDropTarget.ts';
import type { IframeEditHitMessage, IframeEditNodeGeometry } from '@/lib/preview/iframeEditBridge';

const geometry = (
  blockId: string,
  top: number,
  height: number,
  overrides: Partial<IframeEditNodeGeometry> = {},
): IframeEditNodeGeometry => ({
  blockId,
  rect: { left: 0, top, width: 200, height },
  offsetLeft: 0,
  offsetTop: top,
  scrollLeft: 0,
  scrollTop: 0,
  clientLeft: 0,
  clientTop: 0,
  position: 'static',
  offsetParentBlockId: null,
  offsetParentPosition: 'static',
  ...overrides,
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
  activeSubject: IframeEditNodeGeometry = subject,
): IframeEditHitMessage => ({
  type: 'r20:edit-hit', protocol: 1, bridgeId: 'r20-drop-target-test',
  phase, blockId: activeSubject.blockId, rect: activeSubject.rect, pointer: { x: 20, y },
  pointerId: 4, button: 0, buttons: phase === 'pointerup' ? 0 : 1,
  subject: activeSubject, hitPath,
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

const widgetTarget = resolveIframeWidgetDropTarget({
  type: 'r20:widget-drag',
  protocol: 1,
  bridgeId: 'r20-drop-target-test',
  phase: 'drop',
  payload: '{"id":"number-input"}',
  pointer: { x: 40, y: 100 },
  hitPath: [geometry('frame', 0, 200)],
}, lookup);
assert.equal(widgetTarget?.blockId, 'frame');
assert.equal(widgetTarget?.mode, 'inside');

const calls: string[] = [];
const commitAdapter = {
  moveBlockBefore: (_workspace: 'html', blockId: string, targetId: string) => {
    calls.push(`before:${blockId}:${targetId}`);
    return true;
  },
  moveBlockAfter: (_workspace: 'html', blockId: string, targetId: string) => {
    calls.push(`after:${blockId}:${targetId}`);
    return true;
  },
  nestBlockInContainer: (_workspace: 'html', blockId: string, targetId: string) => {
    calls.push(`inside:${blockId}:${targetId}`);
    return true;
  },
};
assert.equal(commitIframeFlowDrop('subject', {
  blockId: 'frame', label: 'Frame', mode: 'inside',
  containerBlockId: 'frame', siblingBlockId: null, geometry: geometry('frame', 0, 200),
}, commitAdapter), true);
assert.equal(commitIframeFlowDrop('subject', {
  blockId: 'sibling', label: 'Sibling', mode: 'before',
  containerBlockId: null, siblingBlockId: 'sibling', geometry: geometry('sibling', 100, 40),
}, commitAdapter), true);
assert.deepEqual(calls, ['inside:subject:frame', 'before:subject:sibling']);
assert.equal(commitIframeFlowDrop('subject', null, commitAdapter), false);

const freeSubject = geometry('subject', 60, 40, {
  rect: { left: 40, top: 60, width: 100, height: 40 },
  offsetLeft: 30,
  offsetTop: 40,
  offsetParentBlockId: 'frame',
  offsetParentPosition: 'relative',
  position: 'static',
});
const freeOrigin = message([
  freeSubject,
  geometry('frame', 20, 200, {
    rect: { left: 10, top: 20, width: 240, height: 200 },
    clientLeft: 2,
    clientTop: 2,
    scrollLeft: 3,
    scrollTop: 5,
    position: 'static',
  }),
], 64, 'pointerdown', freeSubject);
const freeEnd = {
  ...freeOrigin,
  phase: 'pointerup' as const,
  pointer: { x: freeOrigin.pointer.x + 17, y: freeOrigin.pointer.y + 9 },
  buttons: 0,
};
assert.deepEqual(resolveIframeFreePlacement(freeOrigin, freeEnd, lookup, 8), {
  left: 48,
  top: 48,
  containingBlockId: 'frame',
  containingBlockNeedsRelative: true,
});
assert.equal(resolveIframeFreePlacement(freeEnd, freeEnd, lookup, 8), null);

console.log('iframeDropTarget.test PASS');

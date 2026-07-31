import { strict as assert } from 'node:assert';
import type { BlockSnapshot } from '@/lib/blockly/adapter';
import {
  commitIframeFlowDrop,
  filterDropTargetForPlacement,
  resolveIframeEditDropTarget,
  resolveIframeFreePlacement,
  resolveIframeLayerDropTarget,
  resolveIframeLayerFreePlacement,
  resolveIframeWidgetDropTarget,
} from '../iframeDropTarget.ts';
import type {
  IframeEditHitMessage,
  IframeEditNodeGeometry,
  IframeLayerDragMessage,
} from '@/lib/preview/iframeEditBridge';
import { canNestLayerChild } from '../layerRoles.ts';

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

const siblingTarget = {
  blockId: 'sibling', label: 'Sibling', mode: 'after' as const,
  containerBlockId: null, siblingBlockId: 'sibling', geometry: geometry('sibling', 100, 40),
};
const insideTarget = {
  blockId: 'frame', label: 'Frame', mode: 'inside' as const,
  containerBlockId: 'frame', siblingBlockId: null, geometry: geometry('frame', 0, 200),
};
assert.equal(filterDropTargetForPlacement(siblingTarget, 'flow'), siblingTarget);
assert.equal(filterDropTargetForPlacement(siblingTarget, 'free'), null);
assert.equal(filterDropTargetForPlacement(insideTarget, 'free'), insideTarget);

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

const freeNestedWidgetTarget = resolveIframeWidgetDropTarget({
  type: 'r20:widget-drag',
  protocol: 1,
  bridgeId: 'r20-drop-target-test',
  phase: 'dragover',
  payload: '{"id":"number-input"}',
  pointer: { x: 40, y: 100 },
  hitPath: [geometry('subject', 20, 40), geometry('frame', 0, 200)],
}, lookup, 'r20_text_input', 'free');
assert.equal(freeNestedWidgetTarget?.blockId, 'frame');
assert.equal(freeNestedWidgetTarget?.mode, 'inside');

const widgetTableBlocks = new Map<string, BlockSnapshot>([
  ['table', {
    id: 'table', type: 'r20_table', depth: 0, childCount: 1,
    layerParentId: null, layerPreviousId: null, layerRelation: 'root',
    label: 'Table', preview: '', category: 'container',
  }],
  ['row', {
    id: 'row', type: 'r20_tr', depth: 1, childCount: 0,
    layerParentId: 'table', layerPreviousId: null, layerRelation: 'child',
    label: 'Row', preview: '', category: 'container',
  }],
]);
const widgetTableLookup = {
  getBlock: (id: string) => widgetTableBlocks.get(id) ?? null,
  canNestInContainer: (id: string) => id === 'table',
  canNestTypeInContainer: (movingType: string, targetId: string) => {
    const target = widgetTableBlocks.get(targetId);
    return Boolean(target && canNestLayerChild(movingType, target.type));
  },
};
const invalidTableWidgetTarget = resolveIframeWidgetDropTarget({
  type: 'r20:block-type-drag',
  protocol: 1,
  bridgeId: 'r20-drop-target-test',
  phase: 'dragover',
  blockType: 'r20_text_input',
  pointer: { x: 40, y: 10 },
  hitPath: [geometry('row', 0, 40)],
}, widgetTableLookup, 'r20_text_input');
assert.equal(invalidTableWidgetTarget, null, 'invalid widget cannot target table row sibling slot');
const validTableRowTarget = resolveIframeWidgetDropTarget({
  type: 'r20:block-type-drag',
  protocol: 1,
  bridgeId: 'r20-drop-target-test',
  phase: 'dragover',
  blockType: 'r20_tr',
  pointer: { x: 40, y: 10 },
  hitPath: [geometry('row', 0, 40)],
}, widgetTableLookup, 'r20_tr');
assert.equal(validTableRowTarget?.mode, 'before', 'table row can target table sibling slot');

const layerDrag: IframeLayerDragMessage = {
  type: 'r20:layer-drag',
  protocol: 1,
  bridgeId: 'r20-drop-target-test',
  phase: 'drop',
  blockId: 'subject',
  pointer: { x: 40, y: 100 },
  subject,
  hitPath: [geometry('frame', 0, 200)],
};
const layerTarget = resolveIframeLayerDropTarget(layerDrag, lookup);
assert.equal(layerTarget?.blockId, 'frame');
assert.equal(layerTarget?.mode, 'inside');
assert.deepEqual(resolveIframeLayerFreePlacement(layerDrag, layerTarget, lookup, 8), {
  left: 40,
  top: 104,
  containingBlockId: 'frame',
  containingBlockNeedsRelative: true,
});
assert.equal(resolveIframeLayerDropTarget({
  ...layerDrag,
  hitPath: [geometry('subject-child', 30, 10), geometry('subject', 20, 40)],
}, lookup), null);

const freeLayerFrame = new Map<string, BlockSnapshot>([
  ['free-layer', {
    id: 'free-layer', type: 'r20_text_input', depth: 1, childCount: 0,
    layerParentId: 'free-frame', layerPreviousId: null, layerRelation: 'child',
    label: 'Free layer', preview: '', category: 'input',
  }],
  ['free-frame', {
    id: 'free-frame', type: 'r20_div', depth: 0, childCount: 1,
    layerParentId: null, layerPreviousId: null, layerRelation: 'root',
    label: 'Free frame', preview: '', category: 'container',
  }],
  ['free-child', {
    id: 'free-child', type: 'r20_text', depth: 1, childCount: 0,
    layerParentId: 'free-frame', layerPreviousId: 'free-layer', layerRelation: 'child',
    label: 'Existing child', preview: '', category: 'text',
  }],
]);
const freeLayerLookup = {
  getBlock: (id: string) => freeLayerFrame.get(id) ?? null,
  canNestInContainer: (id: string) => id === 'free-frame',
  canNestBlockInContainer: (movingId: string, targetId: string) => {
    return movingId === 'free-layer' && targetId === 'free-frame';
  },
};
const freeLayerDrag: IframeLayerDragMessage = {
  ...layerDrag,
  blockId: 'free-layer',
  pointer: { x: 120, y: 80 },
  hitPath: [
    geometry('free-child', 0, 24, {
      rect: { left: 40, top: 40, width: 120, height: 24 },
    }),
    geometry('free-frame', 0, 160, {
      rect: { left: 20, top: 20, width: 200, height: 160 },
    }),
  ],
};
assert.equal(
  resolveIframeLayerDropTarget(freeLayerDrag, freeLayerLookup, 'free')?.containerBlockId,
  'free-frame',
  'free placement skips child before/after and resolves the containing frame',
);
assert.deepEqual(
  resolveIframeLayerFreePlacement(
    freeLayerDrag,
    resolveIframeLayerDropTarget(freeLayerDrag, freeLayerLookup, 'free'),
    freeLayerLookup,
    1,
  ),
  {
    left: 100,
    top: 60,
    containingBlockId: 'free-frame',
    containingBlockNeedsRelative: true,
  },
);

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
assert.equal(resolveIframeFreePlacement(freeOrigin, {
  ...freeOrigin,
  phase: 'pointerup' as const,
  pointer: { x: freeOrigin.pointer.x + 1, y: freeOrigin.pointer.y + 1 },
  buttons: 0,
}, lookup, 8), null);
assert.equal(resolveIframeFreePlacement(freeOrigin, {
  ...freeEnd,
  pointer: { x: 300, y: 80 },
}, lookup, 8)?.containingBlockId, null);
assert.equal(resolveIframeFreePlacement(freeEnd, freeEnd, lookup, 8), null);

const nestedBlocks = new Map<string, BlockSnapshot>([
  ['outer', {
    id: 'outer', type: 'r20_div', depth: 0, childCount: 1,
    layerParentId: null, layerPreviousId: null, layerRelation: 'root',
    label: 'Outer', preview: '', category: 'container',
  }],
  ['inner', {
    id: 'inner', type: 'r20_div', depth: 1, childCount: 1,
    layerParentId: 'outer', layerPreviousId: null, layerRelation: 'child',
    label: 'Inner', preview: '', category: 'container',
  }],
  ['nested-subject', {
    id: 'nested-subject', type: 'r20_text_input', depth: 2, childCount: 0,
    layerParentId: 'inner', layerPreviousId: null, layerRelation: 'child',
    label: 'Nested subject', preview: '', category: 'input',
  }],
]);
const nestedLookup = {
  getBlock: (id: string) => nestedBlocks.get(id) ?? null,
  canNestInContainer: (id: string) => id === 'outer' || id === 'inner',
};
const nestedSubject = geometry('nested-subject', 40, 20, {
  rect: { left: 40, top: 40, width: 80, height: 20 },
  offsetParentBlockId: 'inner',
});
const nestedOrigin = message([
  nestedSubject,
  geometry('inner', 20, 80, { rect: { left: 20, top: 20, width: 140, height: 80 } }),
  geometry('outer', 0, 180, { rect: { left: 0, top: 0, width: 240, height: 180 } }),
], 45, 'pointerdown', nestedSubject);
assert.equal(resolveIframeFreePlacement(nestedOrigin, {
  ...nestedOrigin,
  phase: 'pointerup' as const,
  pointer: { x: 210, y: 100 },
  hitPath: [geometry('outer', 0, 180, { rect: { left: 0, top: 0, width: 240, height: 180 } })],
  buttons: 0,
}, nestedLookup)?.containingBlockId, 'inner');

const tableBlocks = new Map<string, BlockSnapshot>([
  ['frame', {
    id: 'frame', type: 'r20_div', depth: 0, childCount: 1,
    layerParentId: null, layerPreviousId: null, layerRelation: 'root',
    label: 'Frame', preview: '', category: 'container',
  }],
  ['table-subject', {
    id: 'table-subject', type: 'r20_roll_button', depth: 3, childCount: 0,
    layerParentId: 'table-cell', layerPreviousId: null, layerRelation: 'child',
    label: 'Button', preview: '', category: 'dice',
  }],
  ['table-cell', {
    id: 'table-cell', type: 'r20_td', depth: 2, childCount: 1,
    layerParentId: 'table-row', layerPreviousId: null, layerRelation: 'child',
    label: 'Cell', preview: '', category: 'container',
  }],
  ['table-row', {
    id: 'table-row', type: 'r20_tr', depth: 1, childCount: 1,
    layerParentId: 'table-section', layerPreviousId: null, layerRelation: 'child',
    label: 'Row', preview: '', category: 'container',
  }],
  ['table-section', {
    id: 'table-section', type: 'r20_tbody', depth: 0, childCount: 1,
    layerParentId: 'frame', layerPreviousId: null, layerRelation: 'child',
    label: 'Body', preview: '', category: 'container',
  }],
]);
const tableLookup = {
  getBlock: (id: string) => tableBlocks.get(id) ?? null,
  canNestInContainer: (id: string) => id === 'table-row',
  canNestBlockInContainer: (movingId: string, targetId: string) => {
    const moving = tableBlocks.get(movingId);
    const target = tableBlocks.get(targetId);
    return Boolean(moving && target && canNestLayerChild(moving.type, target.type));
  },
};
const tableSubject = geometry('table-subject', 100, 20, {
  rect: { left: 100, top: 100, width: 20, height: 20 },
});
const tableOrigin = message([
  tableSubject,
  geometry('table-cell', 100, 20, { rect: { left: 100, top: 100, width: 20, height: 20 } }),
  geometry('table-row', 80, 60, { rect: { left: 0, top: 80, width: 240, height: 60 } }),
], 110, 'pointerdown', tableSubject);
const tableEnd = {
  ...tableOrigin,
  phase: 'pointerup' as const,
  pointer: { x: 140, y: 115 },
  hitPath: [geometry('table-row', 80, 60, { rect: { left: 0, top: 80, width: 240, height: 60 } })],
  buttons: 0,
};
assert.equal(resolveIframeEditDropTarget(tableEnd, tableLookup), null);
assert.equal(
  resolveIframeFreePlacement(tableOrigin, tableEnd, tableLookup, 1)?.containingBlockId,
  'table-cell',
);

console.log('iframeDropTarget.test PASS');

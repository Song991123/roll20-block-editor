import type { BlockSnapshot } from '@/lib/blockly/adapter';
import { canReceiveChildren } from '@/lib/editor/layerRoles';
import type {
  IframeEditHitMessage,
  IframeEditNodeGeometry,
  IframeWidgetDragMessage,
} from '@/lib/preview/iframeEditBridge';

export type IframeDropMode = 'before' | 'inside' | 'after';

export type IframeEditDropTarget = {
  blockId: string;
  label: string;
  mode: IframeDropMode;
  containerBlockId: string | null;
  siblingBlockId: string | null;
  geometry: IframeEditNodeGeometry;
};

export type IframeDropTargetLookup = {
  getBlock: (blockId: string) => BlockSnapshot | null;
  canNestInContainer: (blockId: string) => boolean;
};

export type IframeDropCommitAdapter = {
  moveBlockBefore: (workspace: 'html', blockId: string, targetId: string) => boolean;
  moveBlockAfter: (workspace: 'html', blockId: string, targetId: string) => boolean;
  nestBlockInContainer: (workspace: 'html', blockId: string, targetId: string) => boolean;
};

export type IframeFreePlacement = {
  left: number;
  top: number;
  containingBlockId: string | null;
  containingBlockNeedsRelative: boolean;
};

// A click in edit mode selects an object; only a real pointer movement should
// convert a flow node into an explicitly positioned design node.
const MIN_FREE_DRAG_DISTANCE = 3;

function pickDropMode(
  geometry: IframeEditNodeGeometry,
  pointerY: number,
  canDropInside: boolean,
): IframeDropMode {
  const { rect } = geometry;
  const y = rect.height > 0 ? (pointerY - rect.top) / rect.height : 0.5;
  if (y < 0.24) return 'before';
  if (y > 0.76) return 'after';
  return canDropInside ? 'inside' : y < 0.5 ? 'before' : 'after';
}

function isSubjectDescendant(
  candidate: BlockSnapshot,
  subjectId: string,
  lookup: IframeDropTargetLookup,
): boolean {
  let parentId = candidate.layerParentId;
  const seen = new Set<string>([candidate.id]);
  while (parentId && !seen.has(parentId)) {
    if (parentId === subjectId) return true;
    seen.add(parentId);
    parentId = lookup.getBlock(parentId)?.layerParentId ?? null;
  }
  return false;
}

export function resolveIframeEditDropTarget(
  message: IframeEditHitMessage,
  lookup: IframeDropTargetLookup,
): IframeEditDropTarget | null {
  if (message.phase !== 'pointermove' && message.phase !== 'pointerup') return null;

  for (const geometry of message.hitPath) {
    const block = lookup.getBlock(geometry.blockId);
    if (!block || block.id === message.subject.blockId) continue;
    if (isSubjectDescendant(block, message.subject.blockId, lookup)) continue;

    const canDropInside = canReceiveChildren(block.type)
      && lookup.canNestInContainer(block.id);
    const mode = pickDropMode(geometry, message.pointer.y, canDropInside);
    return {
      blockId: block.id,
      label: block.label || block.type,
      mode,
      containerBlockId: mode === 'inside' ? block.id : null,
      siblingBlockId: mode === 'inside' ? null : block.id,
      geometry,
    };
  }
  return null;
}

export function resolveIframeWidgetDropTarget(
  message: IframeWidgetDragMessage,
  lookup: IframeDropTargetLookup,
): IframeEditDropTarget | null {
  if (message.phase !== 'dragover' && message.phase !== 'drop') return null;
  for (const geometry of message.hitPath) {
    const block = lookup.getBlock(geometry.blockId);
    if (!block) continue;
    const canDropInside = canReceiveChildren(block.type)
      && lookup.canNestInContainer(block.id);
    const mode = pickDropMode(geometry, message.pointer.y, canDropInside);
    return {
      blockId: block.id,
      label: block.label || block.type,
      mode,
      containerBlockId: mode === 'inside' ? block.id : null,
      siblingBlockId: mode === 'inside' ? null : block.id,
      geometry,
    };
  }
  return null;
}

export function commitIframeFlowDrop(
  subjectBlockId: string,
  target: IframeEditDropTarget | null,
  adapter: IframeDropCommitAdapter,
): boolean {
  if (!target || !subjectBlockId || subjectBlockId === target.blockId) return false;
  if (target.mode === 'inside' && target.containerBlockId) {
    return adapter.nestBlockInContainer('html', subjectBlockId, target.containerBlockId);
  }
  if (target.mode === 'after' && target.siblingBlockId) {
    return adapter.moveBlockAfter('html', subjectBlockId, target.siblingBlockId);
  }
  if (target.mode === 'before' && target.siblingBlockId) {
    return adapter.moveBlockBefore('html', subjectBlockId, target.siblingBlockId);
  }
  return false;
}

export function resolveIframeFreePlacement(
  origin: IframeEditHitMessage,
  end: IframeEditHitMessage,
  lookup: IframeDropTargetLookup,
  snapSize = 1,
): IframeFreePlacement | null {
  if (origin.phase !== 'pointerdown' || end.phase !== 'pointerup') return null;
  if (origin.subject.blockId !== end.subject.blockId) return null;
  if (!lookup.getBlock(origin.subject.blockId)) return null;

  const currentParentGeometry = origin.hitPath.slice(1).find((geometry) => {
    const block = lookup.getBlock(geometry.blockId);
    return Boolean(block && canReceiveChildren(block.type) && lookup.canNestInContainer(block.id));
  }) ?? null;
  const pointerInsideOriginSubject = end.pointer.x >= origin.subject.rect.left
    && end.pointer.x <= origin.subject.rect.left + origin.subject.rect.width
    && end.pointer.y >= origin.subject.rect.top
    && end.pointer.y <= origin.subject.rect.top + origin.subject.rect.height;
  const containingGeometry = pointerInsideOriginSubject && currentParentGeometry
    ? currentParentGeometry
    : end.hitPath.find((geometry) => {
    if (geometry.blockId === origin.subject.blockId) return false;
    const block = lookup.getBlock(geometry.blockId);
    return Boolean(
      block
      && canReceiveChildren(block.type)
      && lookup.canNestInContainer(block.id)
      && end.pointer.x >= geometry.rect.left
      && end.pointer.x <= geometry.rect.left + geometry.rect.width
      && end.pointer.y >= geometry.rect.top
      && end.pointer.y <= geometry.rect.top + geometry.rect.height,
    );
    }) ?? null;
  const deltaX = end.pointer.x - origin.pointer.x;
  const deltaY = end.pointer.y - origin.pointer.y;
  if (Math.hypot(deltaX, deltaY) < MIN_FREE_DRAG_DISTANCE) return null;
  let baseLeft = origin.subject.offsetLeft;
  let baseTop = origin.subject.offsetTop;

  if (
    containingGeometry
    && (
      origin.subject.offsetParentBlockId !== containingGeometry.blockId
      || origin.subject.position === 'absolute'
    )
  ) {
    baseLeft = origin.subject.rect.left
      - containingGeometry.rect.left
      - containingGeometry.clientLeft
      + containingGeometry.scrollLeft;
    baseTop = origin.subject.rect.top
      - containingGeometry.rect.top
      - containingGeometry.clientTop
      + containingGeometry.scrollTop;
  }

  const step = Number.isFinite(snapSize)
    ? Math.max(1, Math.min(128, Math.round(snapSize)))
    : 1;
  const snap = (value: number) => Math.max(0, Math.round(value / step) * step);
  return {
    left: snap(baseLeft + deltaX),
    top: snap(baseTop + deltaY),
    containingBlockId: containingGeometry?.blockId ?? null,
    containingBlockNeedsRelative: containingGeometry?.position === 'static',
  };
}

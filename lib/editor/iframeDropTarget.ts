import type { BlockSnapshot } from '@/lib/blockly/adapter';
import { canReceiveChildren } from '@/lib/editor/layerRoles';
import type {
  IframeBlockTypeDragMessage,
  IframeEditHitMessage,
  IframeEditNodeGeometry,
  IframeEditSelectionNode,
  IframeLayerDragMessage,
  IframeWidgetDragMessage,
} from '@/lib/preview/iframeEditBridge';

export type IframeDropMode = 'before' | 'inside' | 'after';
export type IframePlacementMode = 'flow' | 'free';

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
  canNestTypeInContainer?: (movingType: string, targetBlockId: string) => boolean;
  canNestBlockInContainer?: (movingBlockId: string, targetBlockId: string) => boolean;
};

/**
 * Flow mode exposes before/inside/after insertion targets. Free mode only
 * exposes an inside container target so the overlay matches absolute
 * placement instead of promising a sibling reorder.
 */
export function filterDropTargetForPlacement(
  target: IframeEditDropTarget | null,
  placement: IframePlacementMode,
): IframeEditDropTarget | null {
  if (!target) return null;
  if (placement === 'flow' || target.mode === 'inside') return target;
  return null;
}

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

export type IframeLocalPoint = {
  left: number;
  top: number;
};

// A click in edit mode selects an object; only a real pointer movement should
// convert a flow node into an explicitly positioned design node.
const MIN_FREE_DRAG_DISTANCE = 3;

function geometryScale(value: number | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 1;
}

function resolveLocalDelta(
  delta: { x: number; y: number },
  geometry: IframeEditNodeGeometry | null,
): { x: number; y: number } {
  const matrix = geometry?.localToViewport;
  if (matrix) {
    const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
    if (Number.isFinite(determinant) && Math.abs(determinant) > 0.000001) {
      return {
        x: (matrix.d * delta.x - matrix.c * delta.y) / determinant,
        y: (-matrix.b * delta.x + matrix.a * delta.y) / determinant,
      };
    }
  }
  return {
    x: delta.x / geometryScale(geometry?.scaleX),
    y: delta.y / geometryScale(geometry?.scaleY),
  };
}

function snapCoordinate(value: number, snapSize: number): number {
  const step = Number.isFinite(snapSize)
    ? Math.max(1, Math.min(128, Math.round(snapSize)))
    : 1;
  return Math.max(0, Math.round(value / step) * step);
}

function resolveContainerLocalPoint(
  pointer: { x: number; y: number },
  geometry: IframeEditNodeGeometry | null,
): IframeLocalPoint {
  const origin = geometry?.viewportOrigin ?? (geometry
    ? { x: geometry.rect.left, y: geometry.rect.top }
    : { x: 0, y: 0 });
  const local = resolveLocalDelta({
    x: pointer.x - origin.x,
    y: pointer.y - origin.y,
  }, geometry);
  return {
    left: local.x - (geometry?.clientLeft ?? 0) + (geometry?.scrollLeft ?? 0),
    top: local.y - (geometry?.clientTop ?? 0) + (geometry?.scrollTop ?? 0),
  };
}

/** Convert iframe viewport coordinates into one container's local CSS pixels. */
export function resolveIframeContainerPoint(
  pointer: { x: number; y: number },
  geometry: IframeEditNodeGeometry | null,
  snapSize = 1,
): IframeLocalPoint {
  const local = resolveContainerLocalPoint(pointer, geometry);
  return {
    left: snapCoordinate(local.left, snapSize),
    top: snapCoordinate(local.top, snapSize),
  };
}

function pickDropMode(
  geometry: IframeEditNodeGeometry,
  pointer: { x: number; y: number },
  canDropInside: boolean,
): IframeDropMode {
  const { rect } = geometry;
  const horizontal = geometry.parentFlowAxis === 'x';
  const size = horizontal ? rect.width : rect.height;
  const start = horizontal ? rect.left : rect.top;
  const coordinate = horizontal ? pointer.x : pointer.y;
  const physicalRatio = size > 0 ? (coordinate - start) / size : 0.5;
  const ratio = geometry.parentFlowReverse === true ? 1 - physicalRatio : physicalRatio;
  if (ratio < 0.24) return 'before';
  if (ratio > 0.76) return 'after';
  return canDropInside ? 'inside' : ratio < 0.5 ? 'before' : 'after';
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

function canPlaceInside(
  movingBlockId: string,
  targetBlockId: string,
  lookup: IframeDropTargetLookup,
  movingType = '',
): boolean {
  const block = lookup.getBlock(targetBlockId);
  if (!block || !canReceiveChildren(block.type) || !lookup.canNestInContainer(block.id)) return false;
  if (movingType && lookup.canNestTypeInContainer && !lookup.canNestTypeInContainer(movingType, targetBlockId)) {
    return false;
  }
  if (!movingBlockId || !lookup.canNestBlockInContainer) return true;
  return lookup.canNestBlockInContainer(movingBlockId, targetBlockId);
}

function canPlaceAdjacent(
  movingBlockId: string,
  targetBlockId: string,
  lookup: IframeDropTargetLookup,
  movingType = '',
): boolean {
  const target = lookup.getBlock(targetBlockId);
  if (!target?.layerParentId) return true;
  if (movingType && lookup.canNestTypeInContainer) {
    return lookup.canNestTypeInContainer(movingType, target.layerParentId);
  }
  if (!movingBlockId || !lookup.canNestBlockInContainer) return true;
  return lookup.canNestBlockInContainer(movingBlockId, target.layerParentId);
}

function isLayerAncestor(
  candidateId: string,
  descendantId: string,
  lookup: IframeDropTargetLookup,
): boolean {
  let parentId = lookup.getBlock(descendantId)?.layerParentId ?? null;
  const seen = new Set<string>([descendantId]);
  while (parentId && !seen.has(parentId)) {
    if (parentId === candidateId) return true;
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

    const canDropInside = canPlaceInside(message.subject.blockId, block.id, lookup);
    const mode = pickDropMode(geometry, message.pointer, canDropInside);
    if (mode !== 'inside' && !canPlaceAdjacent(message.subject.blockId, block.id, lookup)) continue;
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
  message: IframeWidgetDragMessage | IframeBlockTypeDragMessage,
  lookup: IframeDropTargetLookup,
  movingType = '',
  placement: IframePlacementMode = 'flow',
): IframeEditDropTarget | null {
  if (message.phase !== 'dragover' && message.phase !== 'drop') return null;
  for (const geometry of message.hitPath) {
    const block = lookup.getBlock(geometry.blockId);
    if (!block) continue;
    const canDropInside = canPlaceInside('', block.id, lookup, movingType);
    const mode = pickDropMode(geometry, message.pointer, canDropInside);
    if (mode !== 'inside' && !canPlaceAdjacent('', block.id, lookup, movingType)) continue;
    // Free placement must prefer a containing frame. If the pointer is over
    // an existing child, its before/after slot is a flow target and would
    // otherwise make the new absolute widget escape the intended frame.
    if (placement === 'free' && mode !== 'inside') continue;
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

/**
 * Resolve a drag that starts in the layer panel and ends on the real iframe.
 * The dragged layer is already in the document, so unlike a gallery widget it
 * must participate in cycle and parent-compatibility checks.
 */
export function resolveIframeLayerDropTarget(
  message: IframeLayerDragMessage,
  lookup: IframeDropTargetLookup,
  placement: IframePlacementMode = 'flow',
): IframeEditDropTarget | null {
  if (message.phase !== 'dragover' && message.phase !== 'drop') return null;
  for (const geometry of message.hitPath) {
    const block = lookup.getBlock(geometry.blockId);
    if (!block || block.id === message.blockId) continue;
    if (isSubjectDescendant(block, message.blockId, lookup)) continue;
    const canDropInside = canPlaceInside(message.blockId, block.id, lookup);
    const mode = pickDropMode(geometry, message.pointer, canDropInside);
    if (mode !== 'inside' && !canPlaceAdjacent(message.blockId, block.id, lookup)) continue;
    // In free placement, hovering an existing child should still resolve to
    // the nearest eligible containing frame. A before/after target would
    // silently turn a Figma-like drop into a root-level absolute layer.
    if (placement === 'free' && mode !== 'inside') continue;
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

/** Calculate a free-placement coordinate for a layer-panel drop. */
export function resolveIframeLayerFreePlacement(
  message: IframeLayerDragMessage,
  target: IframeEditDropTarget | null,
  lookup: IframeDropTargetLookup,
  snapSize = 1,
): IframeFreePlacement | null {
  if (message.phase !== 'dragover' && message.phase !== 'drop') return null;
  if (target && target.mode !== 'inside') return null;

  const containingBlockId = target?.containerBlockId ?? null;
  const containingBlock = containingBlockId ? lookup.getBlock(containingBlockId) : null;
  if (containingBlockId && !containingBlock) return null;
  const geometry = target?.geometry ?? null;
  const point = resolveIframeContainerPoint(message.pointer, geometry, snapSize);
  return {
    left: point.left,
    top: point.top,
    containingBlockId,
    containingBlockNeedsRelative: geometry?.position === 'static',
  };
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

  const currentParentId = lookup.getBlock(origin.subject.blockId)?.layerParentId ?? null;
  const currentParentGeometry = origin.hitPath.slice(1).find((geometry) => {
    // The current DOM parent must be preserved even when it is not a valid
    // destination for a new child. Table cells can already contain imported
    // children without exposing a Blockly statement input of their own.
    return geometry.blockId === currentParentId;
  }) ?? origin.hitPath.slice(1).find((geometry) => {
    return canPlaceInside(origin.subject.blockId, geometry.blockId, lookup);
  }) ?? null;
  const pointerInsideOriginSubject = end.pointer.x >= origin.subject.rect.left
    && end.pointer.x <= origin.subject.rect.left + origin.subject.rect.width
    && end.pointer.y >= origin.subject.rect.top
    && end.pointer.y <= origin.subject.rect.top + origin.subject.rect.height;
  const explicitContainingGeometry = end.hitPath.find((geometry) => {
    if (geometry.blockId === origin.subject.blockId) return false;
    return canPlaceInside(origin.subject.blockId, geometry.blockId, lookup)
      && end.pointer.x >= geometry.rect.left
      && end.pointer.x <= geometry.rect.left + geometry.rect.width
      && end.pointer.y >= geometry.rect.top
      && end.pointer.y <= geometry.rect.top + geometry.rect.height;
  }) ?? null;
  const currentParentIsTableCell = currentParentGeometry
    ? ['r20_td', 'r20_th'].includes(lookup.getBlock(currentParentGeometry.blockId)?.type ?? '')
    : false;
  const explicitTargetIsOuterAncestor = Boolean(
    explicitContainingGeometry
    && currentParentGeometry
    && explicitContainingGeometry.blockId !== currentParentGeometry.blockId
    && isLayerAncestor(explicitContainingGeometry.blockId, currentParentGeometry.blockId, lookup),
  );
  const containingGeometry = explicitTargetIsOuterAncestor
    ? currentParentGeometry
    : explicitContainingGeometry
      ?? (pointerInsideOriginSubject || currentParentIsTableCell ? currentParentGeometry : null);
  const deltaX = end.pointer.x - origin.pointer.x;
  const deltaY = end.pointer.y - origin.pointer.y;
  if (Math.hypot(deltaX, deltaY) < MIN_FREE_DRAG_DISTANCE) return null;
  let baseLeft = origin.subject.offsetLeft;
  let baseTop = origin.subject.offsetTop;
  const localDelta = resolveLocalDelta({ x: deltaX, y: deltaY }, containingGeometry);

  if (
    containingGeometry
    && origin.subject.offsetParentBlockId !== containingGeometry.blockId
  ) {
    const subjectOrigin = origin.subject.viewportOrigin ?? {
      x: origin.subject.rect.left,
      y: origin.subject.rect.top,
    };
    const localOrigin = resolveContainerLocalPoint(subjectOrigin, containingGeometry);
    baseLeft = localOrigin.left;
    baseTop = localOrigin.top;
  }

  return {
    left: snapCoordinate(baseLeft + localDelta.x, snapSize),
    top: snapCoordinate(baseTop + localDelta.y, snapSize),
    containingBlockId: containingGeometry?.blockId ?? null,
    containingBlockNeedsRelative: containingGeometry?.position === 'static',
  };
}

/**
 * Resolve one member of a free-placement multi-selection without changing its
 * layer parent. A group drag is a visual transform first; reparenting the
 * whole selection remains an explicit layer/container operation so nested
 * frames and table semantics cannot be changed accidentally.
 */
export function resolveIframeMultiFreePlacement(
  origin: IframeEditSelectionNode,
  end: IframeEditSelectionNode,
  originPointer: { x: number; y: number },
  endPointer: { x: number; y: number },
  lookup: IframeDropTargetLookup,
  snapSize = 1,
): IframeFreePlacement | null {
  if (origin.geometry.blockId !== end.geometry.blockId) return null;
  if (!lookup.getBlock(origin.geometry.blockId)) return null;

  const currentParentId = lookup.getBlock(origin.geometry.blockId)?.layerParentId ?? null;
  const currentParentGeometry = currentParentId
    ? origin.hitPath.find((geometry) => geometry.blockId === currentParentId) ?? null
    : null;
  const deltaX = endPointer.x - originPointer.x;
  const deltaY = endPointer.y - originPointer.y;
  let baseLeft = origin.geometry.offsetLeft;
  let baseTop = origin.geometry.offsetTop;
  const localDelta = resolveLocalDelta({ x: deltaX, y: deltaY }, currentParentGeometry);

  if (
    currentParentGeometry
    && origin.geometry.offsetParentBlockId !== currentParentId
  ) {
    const subjectOrigin = origin.geometry.viewportOrigin ?? {
      x: origin.geometry.rect.left,
      y: origin.geometry.rect.top,
    };
    const localOrigin = resolveContainerLocalPoint(subjectOrigin, currentParentGeometry);
    baseLeft = localOrigin.left;
    baseTop = localOrigin.top;
  }

  return {
    left: snapCoordinate(baseLeft + localDelta.x, snapSize),
    top: snapCoordinate(baseTop + localDelta.y, snapSize),
    containingBlockId: currentParentId,
    containingBlockNeedsRelative: currentParentGeometry?.position === 'static',
  };
}

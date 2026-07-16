import type { BlockSnapshot } from '@/lib/blockly/adapter';
import { canReceiveChildren } from '@/lib/editor/layerRoles';
import type {
  IframeEditHitMessage,
  IframeEditNodeGeometry,
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

export const R20_IFRAME_EDIT_PROTOCOL = 1 as const;

export type IframeEditPhase = 'pointermove' | 'pointerdown' | 'pointerup' | 'pointercancel' | 'measure';

export type IframeEditRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type IframeEditModifiers = {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type IframeEditNodeGeometry = {
  blockId: string;
  rect: IframeEditRect;
  offsetLeft: number;
  offsetTop: number;
  scrollLeft: number;
  scrollTop: number;
  clientLeft: number;
  clientTop: number;
  position: string;
  offsetParentBlockId: string | null;
  offsetParentPosition: string;
};

export type IframeEditSelectionNode = {
  geometry: IframeEditNodeGeometry;
  hitPath: IframeEditNodeGeometry[];
};

export type IframeEditReadyMessage = {
  type: 'r20:edit-ready';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
};

export type IframeEditHitMessage = {
  type: 'r20:edit-hit';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  phase: IframeEditPhase;
  blockId: string;
  rect: IframeEditRect;
  pointer: { x: number; y: number };
  pointerId: number;
  button: number;
  buttons: number;
  modifiers?: IframeEditModifiers;
  subject: IframeEditNodeGeometry;
  hitPath: IframeEditNodeGeometry[];
  /** Top-level selected layers captured on the same iframe render surface. */
  selection?: IframeEditSelectionNode[];
};

export type IframeEditAppliedMessage = {
  type: 'r20:edit-applied';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  revision: number;
  blockCount: number;
};

export type IframeWidgetDragMessage = {
  type: 'r20:widget-drag';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  phase: 'dragover' | 'dragleave' | 'drop';
  payload: string | null;
  pointer: { x: number; y: number };
  hitPath: IframeEditNodeGeometry[];
};

export type IframeBlockTypeDragMessage = {
  type: 'r20:block-type-drag';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  phase: 'dragover' | 'dragleave' | 'drop';
  blockType: string | null;
  pointer: { x: number; y: number };
  hitPath: IframeEditNodeGeometry[];
};

export type IframeLayerDragMessage = {
  type: 'r20:layer-drag';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  phase: 'dragover' | 'dragleave' | 'drop';
  blockId: string;
  pointer: { x: number; y: number };
  subject: IframeEditNodeGeometry | null;
  hitPath: IframeEditNodeGeometry[];
};

export type IframeEditContextMenuMessage = {
  type: 'r20:edit-context-menu';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  blockId: string;
  pointer: { x: number; y: number };
};

export type IframeEditBridgeMessage =
  | IframeEditReadyMessage
  | IframeEditHitMessage
  | IframeEditAppliedMessage
  | IframeWidgetDragMessage
  | IframeBlockTypeDragMessage
  | IframeLayerDragMessage
  | IframeEditContextMenuMessage;

export type IframeEditModeCommand = {
  type: 'r20:edit-mode';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  enabled: boolean;
  selectedBlockId: string | null;
  /** All selected layers; selectedBlockId remains the primary layer for compatibility. */
  selectedBlockIds?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10_000_000;
}

function isBridgeId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

function isRect(value: unknown): value is IframeEditRect {
  if (!isRecord(value)) return false;
  return isFiniteCoordinate(value.left)
    && isFiniteCoordinate(value.top)
    && isFiniteCoordinate(value.width)
    && isFiniteCoordinate(value.height)
    && value.width >= 0
    && value.height >= 0;
}

function isNodeGeometry(value: unknown): value is IframeEditNodeGeometry {
  if (!isRecord(value)) return false;
  return typeof value.blockId === 'string'
    && value.blockId.length > 0
    && value.blockId.length <= 256
    && isRect(value.rect)
    && isFiniteCoordinate(value.offsetLeft)
    && isFiniteCoordinate(value.offsetTop)
    && isFiniteCoordinate(value.scrollLeft)
    && isFiniteCoordinate(value.scrollTop)
    && isFiniteCoordinate(value.clientLeft)
    && isFiniteCoordinate(value.clientTop)
    && typeof value.position === 'string'
    && value.position.length <= 64
    && (value.offsetParentBlockId === null
      || (typeof value.offsetParentBlockId === 'string' && value.offsetParentBlockId.length <= 256))
    && typeof value.offsetParentPosition === 'string'
    && value.offsetParentPosition.length <= 64;
}

function isModifiers(value: unknown): value is IframeEditModifiers {
  if (!isRecord(value)) return false;
  return typeof value.altKey === 'boolean'
    && typeof value.ctrlKey === 'boolean'
    && typeof value.metaKey === 'boolean'
    && typeof value.shiftKey === 'boolean';
}

function isSelectionNode(value: unknown): value is IframeEditSelectionNode {
  if (!isRecord(value)) return false;
  return isNodeGeometry(value.geometry)
    && Array.isArray(value.hitPath)
    && value.hitPath.length <= 64
    && value.hitPath.every(isNodeGeometry);
}

export function parseIframeEditBridgeMessage(value: unknown): IframeEditBridgeMessage | null {
  if (
    !isRecord(value)
    || value.protocol !== R20_IFRAME_EDIT_PROTOCOL
    || !isBridgeId(value.bridgeId)
  ) return null;
  if (value.type === 'r20:edit-ready') {
    return {
      type: 'r20:edit-ready',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: value.bridgeId,
    };
  }
  if (value.type === 'r20:edit-applied') {
    if (
      typeof value.revision !== 'number'
      || !Number.isInteger(value.revision)
      || value.revision < 1
      || value.revision > 1_000_000_000
    ) {
      return null;
    }
    if (
      typeof value.blockCount !== 'number'
      || !Number.isInteger(value.blockCount)
      || value.blockCount < 0
      || value.blockCount > 1_000_000
    ) {
      return null;
    }
    return {
      type: 'r20:edit-applied',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: value.bridgeId,
      revision: value.revision,
      blockCount: value.blockCount,
    };
  }
  if (value.type === 'r20:widget-drag') {
    if (
      value.phase !== 'dragover'
      && value.phase !== 'dragleave'
      && value.phase !== 'drop'
    ) return null;
    if (value.payload !== null && (typeof value.payload !== 'string' || value.payload.length > 1024)) {
      return null;
    }
    if (!isRecord(value.pointer)) return null;
    if (!isFiniteCoordinate(value.pointer.x) || !isFiniteCoordinate(value.pointer.y)) return null;
    if (!Array.isArray(value.hitPath) || value.hitPath.length > 64 || !value.hitPath.every(isNodeGeometry)) {
      return null;
    }
    return {
      type: 'r20:widget-drag',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: value.bridgeId,
      phase: value.phase,
      payload: value.payload,
      pointer: { x: value.pointer.x, y: value.pointer.y },
      hitPath: value.hitPath,
    };
  }
  if (value.type === 'r20:block-type-drag') {
    if (
      value.phase !== 'dragover'
      && value.phase !== 'dragleave'
      && value.phase !== 'drop'
    ) return null;
    if (
      value.blockType !== null
      && (typeof value.blockType !== 'string' || value.blockType.length > 256)
    ) return null;
    if (!isRecord(value.pointer)) return null;
    if (!isFiniteCoordinate(value.pointer.x) || !isFiniteCoordinate(value.pointer.y)) return null;
    if (!Array.isArray(value.hitPath) || value.hitPath.length > 64 || !value.hitPath.every(isNodeGeometry)) {
      return null;
    }
    return {
      type: 'r20:block-type-drag',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: value.bridgeId,
      phase: value.phase,
      blockType: value.blockType,
      pointer: { x: value.pointer.x, y: value.pointer.y },
      hitPath: value.hitPath,
    };
  }
  if (value.type === 'r20:layer-drag') {
    if (
      value.phase !== 'dragover'
      && value.phase !== 'dragleave'
      && value.phase !== 'drop'
    ) return null;
    if (typeof value.blockId !== 'string' || value.blockId.length === 0 || value.blockId.length > 256) {
      return null;
    }
    if (!isRecord(value.pointer)) return null;
    if (!isFiniteCoordinate(value.pointer.x) || !isFiniteCoordinate(value.pointer.y)) return null;
    if (value.subject !== null && (!isNodeGeometry(value.subject) || value.subject.blockId !== value.blockId)) {
      return null;
    }
    if (!Array.isArray(value.hitPath) || value.hitPath.length > 64 || !value.hitPath.every(isNodeGeometry)) {
      return null;
    }
    return {
      type: 'r20:layer-drag',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: value.bridgeId,
      phase: value.phase,
      blockId: value.blockId,
      pointer: { x: value.pointer.x, y: value.pointer.y },
      subject: value.subject,
      hitPath: value.hitPath,
    };
  }
  if (value.type === 'r20:edit-context-menu') {
    if (typeof value.blockId !== 'string' || value.blockId.length === 0 || value.blockId.length > 256) {
      return null;
    }
    if (!isRecord(value.pointer)) return null;
    if (!isFiniteCoordinate(value.pointer.x) || !isFiniteCoordinate(value.pointer.y)) return null;
    return {
      type: 'r20:edit-context-menu',
      protocol: R20_IFRAME_EDIT_PROTOCOL,
      bridgeId: value.bridgeId,
      blockId: value.blockId,
      pointer: { x: value.pointer.x, y: value.pointer.y },
    };
  }
  if (value.type !== 'r20:edit-hit') return null;
  if (
    value.phase !== 'pointermove'
    && value.phase !== 'pointerdown'
    && value.phase !== 'pointerup'
    && value.phase !== 'pointercancel'
    && value.phase !== 'measure'
  ) return null;
  if (typeof value.blockId !== 'string' || value.blockId.length === 0 || value.blockId.length > 256) {
    return null;
  }
  if (!isRect(value.rect) || !isRecord(value.pointer)) return null;
  if (!isFiniteCoordinate(value.pointer.x) || !isFiniteCoordinate(value.pointer.y)) return null;
  if (!Number.isInteger(value.pointerId) || !isFiniteCoordinate(value.pointerId)) return null;
  if (!Number.isInteger(value.button) || !isFiniteCoordinate(value.button)) return null;
  if (!Number.isInteger(value.buttons) || !isFiniteCoordinate(value.buttons)) return null;
  if (value.modifiers !== undefined && !isModifiers(value.modifiers)) return null;
  if (!isNodeGeometry(value.subject) || value.subject.blockId !== value.blockId) return null;
  if (!Array.isArray(value.hitPath) || value.hitPath.length > 64 || !value.hitPath.every(isNodeGeometry)) {
    return null;
  }
  const parsed: IframeEditHitMessage = {
    type: 'r20:edit-hit',
    protocol: R20_IFRAME_EDIT_PROTOCOL,
    bridgeId: value.bridgeId,
    phase: value.phase,
    blockId: value.blockId,
    rect: value.rect,
    pointer: { x: value.pointer.x, y: value.pointer.y },
    pointerId: value.pointerId,
    button: value.button,
    buttons: value.buttons,
    subject: value.subject,
    hitPath: value.hitPath,
  };
  if (value.modifiers !== undefined) parsed.modifiers = value.modifiers;
  if (value.selection !== undefined) {
    if (
      !Array.isArray(value.selection)
      || value.selection.length < 1
      || value.selection.length > 128
      || !value.selection.every(isSelectionNode)
    ) return null;
    const unique = new Set<string>();
    for (const selected of value.selection) {
      if (unique.has(selected.geometry.blockId)) return null;
      unique.add(selected.geometry.blockId);
    }
    parsed.selection = value.selection;
  }
  return parsed;
}

export function isTrustedIframeMessage(
  event: MessageEvent,
  iframe: HTMLIFrameElement | null,
): boolean {
  if (!iframe?.contentWindow || event.source !== iframe.contentWindow) return false;
  // The product iframe is sandboxed with allow-scripts and without
  // allow-same-origin, so srcdoc messages must have an opaque origin.
  return event.origin === 'null';
}

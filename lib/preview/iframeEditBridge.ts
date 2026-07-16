export const R20_IFRAME_EDIT_PROTOCOL = 1 as const;

export type IframeEditPhase = 'pointermove' | 'pointerdown' | 'pointerup' | 'pointercancel' | 'measure';

export type IframeEditRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type IframeEditNodeGeometry = {
  blockId: string;
  rect: IframeEditRect;
  offsetLeft: number;
  offsetTop: number;
  offsetParentBlockId: string | null;
  offsetParentPosition: string;
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
  subject: IframeEditNodeGeometry;
  hitPath: IframeEditNodeGeometry[];
};

export type IframeEditBridgeMessage = IframeEditReadyMessage | IframeEditHitMessage;

export type IframeEditModeCommand = {
  type: 'r20:edit-mode';
  protocol: typeof R20_IFRAME_EDIT_PROTOCOL;
  bridgeId: string;
  enabled: boolean;
  selectedBlockId: string | null;
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
    && (value.offsetParentBlockId === null
      || (typeof value.offsetParentBlockId === 'string' && value.offsetParentBlockId.length <= 256))
    && typeof value.offsetParentPosition === 'string'
    && value.offsetParentPosition.length <= 64;
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
  if (!isNodeGeometry(value.subject) || value.subject.blockId !== value.blockId) return null;
  if (!Array.isArray(value.hitPath) || value.hitPath.length > 64 || !value.hitPath.every(isNodeGeometry)) {
    return null;
  }
  return {
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

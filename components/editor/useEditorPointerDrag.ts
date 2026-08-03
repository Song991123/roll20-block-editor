'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEventHandler, PointerEventHandler } from 'react';

export const EDITOR_POINTER_DRAG_EVENT = 'r20:editor-pointer-drag';

export type EditorPointerDragSource =
  | { kind: 'widget'; payload: string; label: string }
  | { kind: 'layer'; blockId: string; label: string };

export type EditorPointerDragDetail = EditorPointerDragSource & {
  phase: 'dragover' | 'dragleave' | 'drop';
  clientX: number;
  clientY: number;
};

type PointerDragOptions = {
  ignoreTarget?: (target: EventTarget | null) => boolean;
  getGhostSource?: (captureElement: HTMLElement) => HTMLElement | null;
};

type PointerSession = {
  pointerId: number;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  started: boolean;
  source: EditorPointerDragSource;
  captureElement: HTMLElement;
  ghostSource: HTMLElement;
  ghost: HTMLElement | null;
};

const START_DISTANCE_PX = 8;

function dispatchPointerDrag(detail: EditorPointerDragDetail): void {
  window.dispatchEvent(new CustomEvent<EditorPointerDragDetail>(EDITOR_POINTER_DRAG_EVENT, { detail }));
}

function createGhost(source: HTMLElement, clientX: number, clientY: number): HTMLElement {
  const rect = source.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.removeAttribute('data-testid');
  ghost.querySelectorAll('[id], [data-testid]').forEach((node) => {
    node.removeAttribute('id');
    node.removeAttribute('data-testid');
  });
  ghost.setAttribute('aria-hidden', 'true');
  ghost.tabIndex = -1;
  Object.assign(ghost.style, {
    position: 'fixed',
    inset: '0 auto auto 0',
    zIndex: '2147483647',
    width: `${Math.min(280, rect.width)}px`,
    maxHeight: '96px',
    margin: '0',
    overflow: 'hidden',
    opacity: '0.94',
    pointerEvents: 'none',
    boxShadow: '0 14px 32px rgba(117, 54, 79, 0.28)',
    transform: `translate3d(${clientX + 14}px, ${clientY + 14}px, 0) scale(0.96)`,
    transformOrigin: 'top left',
  });
  ghost.dataset.r20PointerDragGhost = '1';
  document.body.appendChild(ghost);
  return ghost;
}

function moveGhost(ghost: HTMLElement | null, clientX: number, clientY: number): void {
  if (!ghost) return;
  ghost.style.transform = `translate3d(${clientX + 14}px, ${clientY + 14}px, 0) scale(0.96)`;
}

export function useEditorPointerDrag(
  source: EditorPointerDragSource,
  options: PointerDragOptions = {},
): {
  dragging: boolean;
  consumeClick: MouseEventHandler<HTMLElement>;
  pointerHandlers: {
    onPointerDown: PointerEventHandler<HTMLElement>;
    onPointerMove: PointerEventHandler<HTMLElement>;
    onPointerUp: PointerEventHandler<HTMLElement>;
    onPointerCancel: PointerEventHandler<HTMLElement>;
    onLostPointerCapture: PointerEventHandler<HTMLElement>;
  };
} {
  const sessionRef = useRef<PointerSession | null>(null);
  const suppressClickRef = useRef(false);
  const clearClickTimerRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const clearSession = useCallback((phase: 'dragleave' | 'drop', clientX: number, clientY: number) => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    if (session.started) {
      dispatchPointerDrag({ ...session.source, phase, clientX, clientY });
      suppressClickRef.current = true;
      if (clearClickTimerRef.current !== null) window.clearTimeout(clearClickTimerRef.current);
      clearClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        clearClickTimerRef.current = null;
      }, 0);
    }
    session.ghost?.remove();
    if (session.captureElement.hasPointerCapture(session.pointerId)) {
      session.captureElement.releasePointerCapture(session.pointerId);
    }
    delete document.body.dataset.r20EditorPointerDragging;
    setDragging(false);
  }, []);

  useEffect(() => () => {
    const session = sessionRef.current;
    if (session) {
      if (session.started) {
        dispatchPointerDrag({
          ...session.source,
          phase: 'dragleave',
          clientX: session.clientX,
          clientY: session.clientY,
        });
      }
      session.ghost?.remove();
      sessionRef.current = null;
      delete document.body.dataset.r20EditorPointerDragging;
    }
    if (clearClickTimerRef.current !== null) window.clearTimeout(clearClickTimerRef.current);
  }, []);

  const onPointerDown = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (event.pointerType === 'mouse' || event.button !== 0 || !event.isPrimary) return;
    if (options.ignoreTarget?.(event.target)) return;
    const captureElement = event.currentTarget;
    sessionRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      started: false,
      source,
      captureElement,
      ghostSource: options.getGhostSource?.(captureElement) ?? captureElement,
      ghost: null,
    };
    captureElement.setPointerCapture(event.pointerId);
  }, [options, source]);

  const onPointerMove = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    session.clientX = event.clientX;
    session.clientY = event.clientY;
    if (!session.started) {
      const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
      if (distance < START_DISTANCE_PX) return;
      session.started = true;
      session.ghost = createGhost(session.ghostSource, event.clientX, event.clientY);
      document.body.dataset.r20EditorPointerDragging = session.source.kind;
      setDragging(true);
    }
    event.preventDefault();
    moveGhost(session.ghost, event.clientX, event.clientY);
    dispatchPointerDrag({
      ...session.source,
      phase: 'dragover',
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const onPointerUp = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (sessionRef.current?.pointerId !== event.pointerId) return;
    clearSession('drop', event.clientX, event.clientY);
  }, [clearSession]);

  const onPointerCancel = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (sessionRef.current?.pointerId !== event.pointerId) return;
    clearSession('dragleave', event.clientX, event.clientY);
  }, [clearSession]);

  const onLostPointerCapture = useCallback<PointerEventHandler<HTMLElement>>((event) => {
    if (sessionRef.current?.pointerId !== event.pointerId) return;
    clearSession('dragleave', event.clientX, event.clientY);
  }, [clearSession]);

  const consumeClick = useCallback<MouseEventHandler<HTMLElement>>((event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    dragging,
    consumeClick,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture,
    },
  };
}

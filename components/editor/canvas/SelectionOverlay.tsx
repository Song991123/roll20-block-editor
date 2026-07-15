'use client';

/**
 * SelectionOverlay — editor-only selection chrome over the shadow-rendered
 * sheet: bounding box, 8 resize handles, and a metadata chip (label, role,
 * size). Rendered in the app DOM above the shadow host, never inside the
 * emitted sheet HTML/CSS.
 *
 * Geometry sync runs on a requestAnimationFrame loop while a block is
 * selected, so the box follows live drags (translate3d), optimistic commits,
 * and shadow remounts without extra wiring.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { getLayerRole } from '@/lib/editor/layerRoles';
import {
  getShadowBlockElement,
  measureBlockRectInHost,
  type SheetRect,
} from '@/lib/editor/geometry';
import { commitResize } from '@/lib/editor/editorCommands';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: Array<{ dir: HandleDir; cursor: string }> = [
  { dir: 'nw', cursor: 'nwse-resize' },
  { dir: 'n', cursor: 'ns-resize' },
  { dir: 'ne', cursor: 'nesw-resize' },
  { dir: 'e', cursor: 'ew-resize' },
  { dir: 'se', cursor: 'nwse-resize' },
  { dir: 's', cursor: 'ns-resize' },
  { dir: 'sw', cursor: 'nesw-resize' },
  { dir: 'w', cursor: 'ew-resize' },
];

const MIN_SIZE_PX = 8;

type ResizeState = {
  dir: HandleDir;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startRect: SheetRect;
  el: HTMLElement;
  origInlineWidth: string;
  origInlineHeight: string;
  origInlineLeft: string;
  origInlineTop: string;
  hadAbsolutePosition: boolean;
  origLeftPx: number;
  origTopPx: number;
  scale: number;
  lastRect: SheetRect;
};

export default function SelectionOverlay({
  hostRef,
  blockId,
  scale,
  onStatus,
}: {
  hostRef: RefObject<HTMLDivElement | null>;
  blockId: string | null;
  scale: number;
  onStatus?: (message: string) => void;
}) {
  // rect is tagged with the block id it was measured for, so a selection
  // change never shows a one-frame stale box while the rAF loop catches up.
  const [measuredRect, setMeasuredRect] = useState<{ id: string; rect: SheetRect } | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const rafRef = useRef<number | null>(null);

  const meta = useMemo(() => {
    if (!blockId) return null;
    const adapter = getBlocklyAdapter();
    const active = useWorkspaceStore.getState().activeWorkspace;
    const block =
      adapter.getBlock('html', blockId) ??
      (active && active !== 'html' ? adapter.getBlock(active, blockId) : null);
    if (!block) return null;
    const role = getLayerRole(block.type);
    return { label: block.label || block.type, roleLabel: role.label, roleKind: role.kind };
  }, [blockId]);

  useEffect(() => {
    if (!blockId) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const host = hostRef.current;
      const measured = host ? measureBlockRectInHost(host, blockId) : null;
      setMeasuredRect((prev) => {
        if (!measured) return prev == null ? prev : null;
        if (
          prev &&
          prev.id === blockId &&
          Math.abs(prev.rect.left - measured.left) < 0.5 &&
          Math.abs(prev.rect.top - measured.top) < 0.5 &&
          Math.abs(prev.rect.width - measured.width) < 0.5 &&
          Math.abs(prev.rect.height - measured.height) < 0.5
        ) {
          return prev;
        }
        return { id: blockId, rect: measured };
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [blockId, hostRef]);

  const rect = blockId && measuredRect?.id === blockId ? measuredRect.rect : null;

  const onHandlePointerDown = useCallback(
    (dir: HandleDir) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!blockId || !rect) return;
      const host = hostRef.current;
      if (!host) return;
      const el = getShadowBlockElement(host, blockId);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const computed = getComputedStyle(el);
      resizeRef.current = {
        dir,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startRect: rect,
        el,
        origInlineWidth: el.style.width,
        origInlineHeight: el.style.height,
        origInlineLeft: el.style.left,
        origInlineTop: el.style.top,
        hadAbsolutePosition: computed.position === 'absolute',
        origLeftPx: Number.parseFloat(computed.left) || 0,
        origTopPx: Number.parseFloat(computed.top) || 0,
        scale: scale || 1,
        lastRect: rect,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [blockId, rect, hostRef, scale],
  );

  const onHandlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeRef.current;
    if (!state || e.pointerId !== state.pointerId) return;
    e.preventDefault();
    const dx = (e.clientX - state.startClientX) / state.scale;
    const dy = (e.clientY - state.startClientY) / state.scale;
    const next = applyHandleDelta(state.startRect, state.dir, dx, dy, state.hadAbsolutePosition);
    state.lastRect = next;
    state.el.style.width = `${Math.round(next.width)}px`;
    state.el.style.height = `${Math.round(next.height)}px`;
    if (state.hadAbsolutePosition) {
      state.el.style.left = `${Math.round(state.origLeftPx + (next.left - state.startRect.left))}px`;
      state.el.style.top = `${Math.round(state.origTopPx + (next.top - state.startRect.top))}px`;
    }
  }, []);

  const onHandlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const state = resizeRef.current;
      if (!state || e.pointerId !== state.pointerId) return;
      resizeRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      const { lastRect, startRect } = state;
      const movedEdge =
        Math.abs(lastRect.left - startRect.left) >= 1 || Math.abs(lastRect.top - startRect.top) >= 1;
      const changedSize =
        Math.abs(lastRect.width - startRect.width) >= 1 ||
        Math.abs(lastRect.height - startRect.height) >= 1;
      if (!changedSize && !movedEdge) {
        revertInlinePreview(state);
        return;
      }
      const ok = commitResize({
        blockId: state.el.dataset.r20BlockId ?? '',
        width: lastRect.width,
        height: lastRect.height,
        left: state.hadAbsolutePosition && movedEdge
          ? state.origLeftPx + (lastRect.left - startRect.left)
          : undefined,
        top: state.hadAbsolutePosition && movedEdge
          ? state.origTopPx + (lastRect.top - startRect.top)
          : undefined,
      });
      if (ok) {
        onStatus?.(`크기 ${Math.round(lastRect.width)} x ${Math.round(lastRect.height)}px 적용`);
      } else {
        revertInlinePreview(state);
        onStatus?.('이 요소는 크기 값을 저장할 필드가 없어 크기를 되돌렸습니다.');
      }
    },
    [onStatus],
  );

  if (!blockId || !rect) return null;

  const inv = 1 / (scale || 1);
  const handleSize = Math.max(6, 8 * inv);
  const half = handleSize / 2;
  const handlePos = (dir: HandleDir): React.CSSProperties => {
    const cx = dir.includes('w') ? -half : dir.includes('e') ? rect.width - half : rect.width / 2 - half;
    const cy = dir.includes('n') ? -half : dir.includes('s') ? rect.height - half : rect.height / 2 - half;
    return { left: cx, top: cy, width: handleSize, height: handleSize };
  };

  return (
    <div
      data-testid="edit-selection-overlay"
      data-r20-selection-block-id={blockId}
      data-r20-selection-role={meta?.roleKind ?? ''}
      className="pointer-events-none absolute z-30"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-[2px]"
        style={{
          boxShadow: `0 0 0 ${Math.max(1, 1.5 * inv)}px rgba(37, 99, 235, 0.95), 0 0 0 ${Math.max(2, 3 * inv)}px rgba(255, 255, 255, 0.65)`,
        }}
      />
      {HANDLES.map(({ dir, cursor }) => (
        <div
          key={dir}
          role="presentation"
          data-testid={`edit-resize-handle-${dir}`}
          className="pointer-events-auto absolute rounded-[2px] border bg-white"
          style={{
            ...handlePos(dir),
            cursor,
            borderColor: 'rgba(37, 99, 235, 0.95)',
            borderWidth: Math.max(1, 1.2 * inv),
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.28)',
            touchAction: 'none',
          }}
          onPointerDown={onHandlePointerDown(dir)}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        />
      ))}
      <div
        data-testid="edit-selection-meta"
        className="pointer-events-none absolute flex items-center gap-1 whitespace-nowrap rounded bg-[#2563eb] px-1.5 py-0.5 text-white"
        style={{
          left: 0,
          top: -6 * inv,
          transform: `translateY(-100%) scale(${inv})`,
          transformOrigin: 'left bottom',
          font: '600 11px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)',
        }}
      >
        <span className="max-w-[180px] overflow-hidden text-ellipsis">{meta?.label ?? blockId}</span>
        {meta && <span className="rounded bg-white/20 px-1 text-[10px]">{meta.roleLabel}</span>}
        <span className="tabular-nums text-[10px] opacity-90">
          {Math.round(rect.width)} x {Math.round(rect.height)}
        </span>
      </div>
    </div>
  );
}

function applyHandleDelta(
  start: SheetRect,
  dir: HandleDir,
  dx: number,
  dy: number,
  allowEdgeMove: boolean,
): SheetRect {
  let { left, top, width, height } = start;
  if (dir.includes('e')) width = Math.max(MIN_SIZE_PX, start.width + dx);
  if (dir.includes('s')) height = Math.max(MIN_SIZE_PX, start.height + dy);
  if (dir.includes('w')) {
    const clamped = Math.min(dx, start.width - MIN_SIZE_PX);
    width = Math.max(MIN_SIZE_PX, start.width - clamped);
    if (allowEdgeMove) left = start.left + clamped;
  }
  if (dir.includes('n')) {
    const clamped = Math.min(dy, start.height - MIN_SIZE_PX);
    height = Math.max(MIN_SIZE_PX, start.height - clamped);
    if (allowEdgeMove) top = start.top + clamped;
  }
  return { left, top, width, height };
}

function revertInlinePreview(state: ResizeState): void {
  state.el.style.width = state.origInlineWidth;
  state.el.style.height = state.origInlineHeight;
  state.el.style.left = state.origInlineLeft;
  state.el.style.top = state.origInlineTop;
}

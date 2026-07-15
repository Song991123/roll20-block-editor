/**
 * dropOverlay — canvas drop targeting + editor-only drop indicator rendering.
 *
 * Drop indicators (target highlight, before/after insertion bar, mode badge)
 * are injected into the shadow root as transient marker nodes and removed on
 * drop/cancel. They never touch the block model or the emit cache, so emitted
 * sheet HTML/CSS stays free of editor chrome.
 */

import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { canReceiveChildren } from '@/lib/editor/layerRoles';
import { escapeAttr } from '@/lib/editor/geometry';

export type LayerDropMode = 'before' | 'inside' | 'after';

export type CanvasDropTarget = {
  blockId: string;
  label: string;
  mode: LayerDropMode;
  containerBlockId: string | null;
  siblingBlockId: string | null;
};

export function formatDropModeLabel(mode: LayerDropMode): string {
  if (mode === 'inside') return '안에 넣기';
  if (mode === 'before') return '앞에 넣기';
  return '뒤에 넣기';
}

export function formatCanvasDropLabel(
  dropTarget: CanvasDropTarget | null,
  placementMode: 'flow' | 'free',
): string | null {
  if (!dropTarget) return null;
  if (placementMode === 'free' && dropTarget.mode === 'inside') return '자유 배치';
  return formatDropModeLabel(dropTarget.mode);
}

export function findCanvasDropTarget(
  host: HTMLElement | null,
  clientX: number,
  clientY: number,
): CanvasDropTarget | null {
  const shadow = host?.shadowRoot;
  if (!shadow) return null;
  // Editor chrome (selection handles, overlays) can sit above the sheet and
  // make elementFromPoint retarget to the bare shadow host. Use the full hit
  // stack and start from the first element that actually lives in the sheet.
  const stack =
    typeof shadow.elementsFromPoint === 'function'
      ? (shadow.elementsFromPoint(clientX, clientY) as HTMLElement[])
      : [];
  const start =
    stack.find((el) => el.getRootNode() === shadow) ??
    (shadow.elementFromPoint(clientX, clientY) as HTMLElement | null);
  if (!start) return null;

  const adapter = getBlocklyAdapter();
  let cur: HTMLElement | null = start;
  while (cur) {
    const blockId = cur.dataset.r20BlockId;
    if (blockId) {
      const block = adapter.getBlock('html', blockId);
      if (block && canReceiveChildren(block.type) && adapter.canNestInContainer('html', blockId)) {
        const mode = pickCanvasDropMode(cur, clientY, true);
        return {
          blockId,
          label: block.label || block.type,
          mode,
          containerBlockId: mode === 'inside' ? blockId : null,
          siblingBlockId: mode === 'inside' ? null : blockId,
        };
      }
      if (block) {
        const mode = pickCanvasDropMode(cur, clientY, false);
        return {
          blockId,
          label: block.label || block.type,
          mode,
          containerBlockId: null,
          siblingBlockId: blockId,
        };
      }
    }
    cur = cur.parentElement;
  }
  return null;
}

function pickCanvasDropMode(
  el: HTMLElement,
  clientY: number,
  canDropInside: boolean,
): LayerDropMode {
  const rect = el.getBoundingClientRect();
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
  if (y < 0.24) return 'before';
  if (y > 0.76) return 'after';
  return canDropInside ? 'inside' : y < 0.5 ? 'before' : 'after';
}

export function markDropContainer(
  host: HTMLElement | null,
  dropTarget: CanvasDropTarget | null,
  label: string | null = null,
): void {
  const shadow = host?.shadowRoot;
  if (!host || !shadow) return;
  shadow.querySelectorAll<HTMLElement>('.r20-drop-target').forEach((el) => {
    el.classList.remove('r20-drop-target');
    el.removeAttribute('data-r20-drop-mode');
  });
  shadow.querySelectorAll<HTMLElement>('[data-r20-drop-position-marker="1"]').forEach((el) => el.remove());
  shadow.querySelectorAll<HTMLElement>('[data-r20-drop-label-marker="1"]').forEach((el) => el.remove());
  if (!dropTarget) {
    host.removeAttribute('data-r20-widget-dragging');
    host.removeAttribute('data-r20-drop-target');
    host.removeAttribute('data-r20-drop-mode');
    return;
  }
  host.setAttribute('data-r20-widget-dragging', '1');
  host.setAttribute('data-r20-drop-target', dropTarget.blockId);
  host.setAttribute('data-r20-drop-mode', dropTarget.mode);
  const targetEl = shadow.querySelector<HTMLElement>(
    `[data-r20-block-id="${escapeAttr(dropTarget.blockId)}"]`,
  );
  targetEl?.classList.add('r20-drop-target');
  targetEl?.setAttribute('data-r20-drop-mode', dropTarget.mode);
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const badge = document.createElement('div');
    badge.setAttribute('data-r20-drop-label-marker', '1');
    badge.setAttribute('data-r20-drop-mode', dropTarget.mode);
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = label ?? formatDropModeLabel(dropTarget.mode);
    Object.assign(badge.style, {
      position: 'fixed',
      left: `${Math.round(Math.max(8, rect.left + 8))}px`,
      top: `${Math.round(Math.max(8, rect.top + 8))}px`,
      maxWidth: `${Math.round(Math.max(80, rect.width - 16))}px`,
      padding: '3px 7px',
      borderRadius: '999px',
      background: dropTarget.mode === 'inside' ? 'rgba(22, 163, 74, 0.94)' : 'rgba(37, 99, 235, 0.95)',
      boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.86), 0 8px 22px rgba(15, 23, 42, 0.2)',
      color: '#fff',
      font: '600 11px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });
    shadow.appendChild(badge);
    if (dropTarget.mode !== 'inside') {
      const marker = document.createElement('div');
      const top = dropTarget.mode === 'before' ? rect.top - 5 : rect.bottom + 2;
      marker.setAttribute('data-r20-drop-position-marker', '1');
      marker.setAttribute('data-r20-drop-mode', dropTarget.mode);
      marker.setAttribute('aria-hidden', 'true');
      Object.assign(marker.style, {
        position: 'fixed',
        left: `${Math.round(Math.max(0, rect.left - 8))}px`,
        top: `${Math.round(top)}px`,
        width: `${Math.round(Math.max(24, rect.width + 16))}px`,
        height: '3px',
        borderRadius: '999px',
        background: 'rgba(59, 130, 246, 0.95)',
        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.9), 0 0 10px rgba(59, 130, 246, 0.45)',
        pointerEvents: 'none',
        zIndex: '2147483647',
      });
      shadow.appendChild(marker);
    }
  }
}

export function hasFriendlyWidgetPayload(dataTransfer: DataTransfer | null, mime: string): boolean {
  if (!dataTransfer) return false;
  for (let i = 0; i < dataTransfer.types.length; i += 1) {
    if (dataTransfer.types[i] === mime) return true;
  }
  return false;
}

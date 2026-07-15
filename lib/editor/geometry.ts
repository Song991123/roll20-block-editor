/**
 * geometry — edit-canvas geometry measurement service.
 *
 * Pure DOM measurement helpers shared by the edit canvas stage, the selection
 * overlay, the drop overlay, and the edit inspector. No store writes here:
 * commit logic lives in lib/editor/editorCommands.ts.
 *
 * All rect helpers return coordinates in the unscaled sheet coordinate space
 * (the same px values that end up in emitted left/top/width/height), so the
 * caller can render overlays inside the scaled canvas wrapper without extra
 * conversion.
 */

export type SheetRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function escapeAttr(raw: string): string {
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(raw)
    : raw.replace(/(["\\])/g, '\\$1');
}

export function getShadowBlockElement(host: HTMLElement, blockId: string): HTMLElement | null {
  const shadow = host.shadowRoot;
  if (!shadow) return null;
  return shadow.querySelector<HTMLElement>(`[data-r20-block-id="${escapeAttr(blockId)}"]`);
}

/** Visual scale applied to the host by the zoom wrapper (transform: scale). */
export function getHostScale(host: HTMLElement): number {
  const rect = host.getBoundingClientRect();
  return host.offsetWidth > 0 ? rect.width / host.offsetWidth : 1;
}

/** Rect of a shadow block relative to the host, in unscaled sheet px. */
export function measureBlockRectInHost(host: HTMLElement, blockId: string): SheetRect | null {
  const el = getShadowBlockElement(host, blockId);
  if (!el) return null;
  const scale = getHostScale(host) || 1;
  const hostRect = host.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    left: (rect.left - hostRect.left) / scale,
    top: (rect.top - hostRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

export function measureShadowSheetBox(shadow: ShadowRoot): { width: number; height: number } {
  const root =
    shadow.querySelector<HTMLElement>('#charsheet-root') ??
    shadow.querySelector<HTMLElement>('body.charsheet') ??
    shadow.querySelector<HTMLElement>('.charsheet');
  if (!root) return { width: 850, height: 900 };

  const rootRect = root.getBoundingClientRect();
  let maxRight = Math.max(root.scrollWidth, root.offsetWidth, Math.ceil(rootRect.width));
  let maxBottom = Math.max(root.scrollHeight, root.offsetHeight, Math.ceil(rootRect.height));
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) return;
    maxRight = Math.max(maxRight, Math.ceil(rect.right - rootRect.left + root.scrollLeft));
    maxBottom = Math.max(maxBottom, Math.ceil(rect.bottom - rootRect.top + root.scrollTop));
  });
  return {
    width: Math.max(850, Math.min(2400, maxRight)),
    height: Math.max(120, Math.min(60000, maxBottom)),
  };
}

export function measureDropPosition(
  host: HTMLElement | null,
  fallback: HTMLElement | null,
  clientX: number,
  clientY: number,
): { left: number; top: number } {
  const shadow = host?.shadowRoot;
  const root =
    shadow?.querySelector<HTMLElement>('body.charsheet') ??
    shadow?.querySelector<HTMLElement>('.charsheet');
  const target = root ?? host ?? fallback;
  if (!target) return { left: 24, top: 24 };
  const rect = target.getBoundingClientRect();
  return {
    left: Math.max(0, Math.round(clientX - rect.left + target.scrollLeft)),
    top: Math.max(0, Math.round(clientY - rect.top + target.scrollTop)),
  };
}

export function measureDropPositionInBlock(
  host: HTMLElement | null,
  blockId: string,
  clientX: number,
  clientY: number,
): { left: number; top: number } {
  const shadow = host?.shadowRoot;
  const target = shadow?.querySelector<HTMLElement>(
    `[data-r20-block-id="${escapeAttr(blockId)}"]`,
  );
  if (!host || !target) return { left: 24, top: 24 };
  const scale = getHostScale(host) || 1;
  const rect = target.getBoundingClientRect();
  return {
    left: Math.max(0, Math.round((clientX - rect.left) / scale + target.scrollLeft)),
    top: Math.max(0, Math.round((clientY - rect.top) / scale + target.scrollTop)),
  };
}

export function parsePx(value: string | null): number {
  const n = Number.parseFloat(value ?? '0');
  return Number.isFinite(n) ? n : 0;
}

export function parseCssPx(style: string, prop: 'left' | 'top' | 'width' | 'height'): number | null {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px\\s*(?:;|$)`, 'i');
  const match = style.match(re);
  if (!match) return null;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

export function hasPositionDeclaration(style: string): boolean {
  return /(?:^|;)\s*position\s*:/i.test(style);
}

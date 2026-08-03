export const EDIT_SURFACE_TOOLBAR_HEIGHT_PX = 36;
export const EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX = 220;
export const EDIT_SURFACE_LAYER_PANEL_DEFAULT_WIDTH_PX = 248;
export const EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX = 440;
export const EDIT_SURFACE_LAYER_PANEL_KEYBOARD_STEP_PX = 16;
export const EDIT_SURFACE_CANVAS_MIN_VISIBLE_WIDTH_PX = 280;
export const EDIT_SURFACE_CANVAS_COMFORTABLE_WIDTH_PX = 850;
export const EDIT_SURFACE_LAYER_PANEL_OVERLAY_WIDTH_PX =
  EDIT_SURFACE_LAYER_PANEL_DEFAULT_WIDTH_PX + EDIT_SURFACE_CANVAS_COMFORTABLE_WIDTH_PX;

export function shouldOverlayEditLayerPanel(availableWidth: number): boolean {
  return Number.isFinite(availableWidth)
    && availableWidth < EDIT_SURFACE_LAYER_PANEL_OVERLAY_WIDTH_PX;
}

export function clampEditLayerPanelWidth(width: number, availableWidth?: number): number {
  const safeWidth = Number.isFinite(width)
    ? width
    : EDIT_SURFACE_LAYER_PANEL_DEFAULT_WIDTH_PX;
  const availableMax = Number.isFinite(availableWidth)
    ? Math.max(
      EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX,
      Number(availableWidth) - EDIT_SURFACE_CANVAS_MIN_VISIBLE_WIDTH_PX,
    )
    : EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX;
  const maxWidth = Math.min(EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX, availableMax);
  return Math.round(Math.min(maxWidth, Math.max(EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX, safeWidth)));
}

/**
 * Use the same responsive track expression for the layer grid and the
 * persistent iframe overlay. This keeps Edit and Preview on one pixel origin
 * even when a narrow viewport temporarily constrains the saved preference.
 */
export function getEditLayerPanelTrack(width: number): string {
  const safeWidth = clampEditLayerPanelWidth(width);
  return `min(${safeWidth}px, max(${EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX}px, calc(100% - ${EDIT_SURFACE_CANVAS_MIN_VISIBLE_WIDTH_PX}px)))`;
}

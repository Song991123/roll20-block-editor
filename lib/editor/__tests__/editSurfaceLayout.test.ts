import { strict as assert } from 'node:assert';
import {
  clampEditLayerPanelWidth,
  EDIT_SURFACE_LAYER_PANEL_DEFAULT_WIDTH_PX,
  EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX,
  EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX,
  EDIT_SURFACE_LAYER_PANEL_OVERLAY_WIDTH_PX,
  getEditLayerPanelTrack,
  shouldOverlayEditLayerPanel,
} from '../editSurfaceLayout';

assert.equal(clampEditLayerPanelWidth(Number.NaN), EDIT_SURFACE_LAYER_PANEL_DEFAULT_WIDTH_PX);
assert.equal(clampEditLayerPanelWidth(120), EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX);
assert.equal(clampEditLayerPanelWidth(900), EDIT_SURFACE_LAYER_PANEL_MAX_WIDTH_PX);
assert.equal(clampEditLayerPanelWidth(319.6), 320);
assert.equal(clampEditLayerPanelWidth(420, 600), 320);
assert.equal(clampEditLayerPanelWidth(420, 450), EDIT_SURFACE_LAYER_PANEL_MIN_WIDTH_PX);
assert.equal(
  getEditLayerPanelTrack(360),
  'min(360px, max(220px, calc(100% - 280px)))',
);
assert.equal(shouldOverlayEditLayerPanel(EDIT_SURFACE_LAYER_PANEL_OVERLAY_WIDTH_PX - 1), true);
assert.equal(shouldOverlayEditLayerPanel(EDIT_SURFACE_LAYER_PANEL_OVERLAY_WIDTH_PX), false);
assert.equal(shouldOverlayEditLayerPanel(Number.NaN), false);

console.log('editSurfaceLayout.test PASS');

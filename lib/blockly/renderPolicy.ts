/**
 * SVG rendering guard for large imported workspaces.
 *
 * Blockly creates one SVG view per block. Above this limit the model remains
 * fully available to preview/edit, but the block canvas stays headless
 * instead of freezing the browser during assemble entry.
 */
export const MAX_SVG_BLOCKS = 5000;

export function shouldRenderWorkspaceSvg(blockCount: number): boolean {
  return Number.isFinite(blockCount) && blockCount <= MAX_SVG_BLOCKS;
}

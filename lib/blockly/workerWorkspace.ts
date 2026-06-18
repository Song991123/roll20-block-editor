import * as Blockly from 'blockly';
import { getBlocklyAdapter } from './adapter';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';

const WORKER_BLOCK_TYPES = new Set([
  'r20_raw_worker',
  'r20_on_sheet_opened',
  'r20_on_attr_change',
  'r20_on_repeating_change',
  'r20_on_repeating_remove',
  'r20_on_button_click',
  'r20_worker_if',
  'r20_worker_for_count',
  'r20_get_section_ids',
  'r20_for_each_id',
  'r20_get_attrs',
  'r20_set_attrs',
  'r20_set_attrs_pair',
  'r20_generate_row_id',
  'r20_remove_repeating_row',
  'r20_worker_var_set',
  'r20_worker_var_let',
  'r20_worker_console_log',
  'r20_worker_return',
  'r20_worker_v_ref',
  'r20_worker_v_max_ref',
  'r20_worker_let_ref',
  'r20_worker_arith',
  'r20_worker_cmp',
  'r20_worker_logic',
  'r20_get_translation',
  'r20_get_compendium',
]);

export function isWorkerBlockType(type: string): boolean {
  return WORKER_BLOCK_TYPES.has(type);
}

export function moveImportedWorkerBlocksToWorkspace(
  sourceKey: WorkspaceKey = 'html',
  targetKey: WorkspaceKey = 'worker',
): { moved: number; sourceCount: number; targetCount: number } {
  const adapter = getBlocklyAdapter();
  const source = adapter.getWorkspace(sourceKey);
  const target = adapter.getWorkspace(targetKey);
  if (!source || !target || source === target) {
    return {
      moved: 0,
      sourceCount: adapter.countBlocks(sourceKey),
      targetCount: adapter.countBlocks(targetKey),
    };
  }

  const candidates = source.getTopBlocks(false).filter((block) => isWorkerBlockType(block.type));
  if (candidates.length === 0) {
    return {
      moved: 0,
      sourceCount: adapter.countBlocks(sourceKey),
      targetCount: adapter.countBlocks(targetKey),
    };
  }

  let moved = 0;
  Blockly.Events.disable();
  try {
    for (const block of candidates) {
      const dom = Blockly.Xml.blockToDom(block, true) as Element;
      block.dispose(true);
      const inserted = Blockly.Xml.domToBlock(dom, target);
      const xy = inserted.getRelativeToSurfaceXY();
      inserted.moveBy(24 - xy.x, 24 + moved * 96 - xy.y);
      moved += 1;
    }
  } finally {
    Blockly.Events.enable();
  }

  source.resizeContents?.();
  target.resizeContents?.();
  return {
    moved,
    sourceCount: adapter.countBlocks(sourceKey),
    targetCount: adapter.countBlocks(targetKey),
  };
}

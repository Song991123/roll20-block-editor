import * as Blockly from 'blockly';
import { getBlocklyAdapter } from './adapter';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';
import { emitWorkspace } from '@/lib/preview/emit';
import { parseSheetWorkerScript, type ParsedBlock } from '@/lib/import/script_parser';

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

  const candidates = source
    .getAllBlocks(false)
    .filter(
      (block) =>
        (isWorkerBlockType(block.type) && !hasWorkerAncestor(block)) ||
        isRawHtmlWorkerScriptBlock(block),
    )
    .sort((a, b) => getBlockDepth(b) - getBlockDepth(a));
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
      if (isRawHtmlWorkerScriptBlock(block)) {
        const html = String(block.getFieldValue('HTML') ?? '');
        const stripped = stripWorkerScriptsFromRawHtml(html);
        if (stripped.trim()) {
          block.setFieldValue(stripped, 'HTML');
          continue;
        }
        disposeBlockAndHealStack(block);
        moved += 1;
        continue;
      }
      const previousConnection = block.previousConnection?.targetConnection ?? null;
      const nextConnection = block.nextConnection?.targetConnection ?? null;
      if (nextConnection && block.nextConnection?.isConnected()) {
        block.nextConnection.disconnect();
      }
      const dom = Blockly.Xml.blockToDom(block, true) as Element;
      block.dispose(true);
      if (previousConnection && nextConnection && !previousConnection.isConnected()) {
        try {
          previousConnection.connect(nextConnection);
        } catch {
          // Keep the worker split best-effort; Blockly may reject incompatible legacy stacks.
        }
      }
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

function disposeBlockAndHealStack(block: Blockly.Block): void {
  const previousConnection = block.previousConnection?.targetConnection ?? null;
  const nextConnection = block.nextConnection?.targetConnection ?? null;
  if (nextConnection && block.nextConnection?.isConnected()) {
    block.nextConnection.disconnect();
  }
  block.dispose(true);
  if (previousConnection && nextConnection && !previousConnection.isConnected()) {
    try {
      previousConnection.connect(nextConnection);
    } catch {
      // Best-effort cleanup for malformed imported chains.
    }
  }
}

export function replaceWorkerWorkspaceFromSourceHtml(html: string): {
  replaced: boolean;
  scriptCount: number;
  targetCount: number;
} {
  const scripts = extractRoll20WorkerScripts(html);
  if (scripts.length === 0) {
    return {
      replaced: false,
      scriptCount: 0,
      targetCount: getBlocklyAdapter().countBlocks('worker'),
    };
  }
  const adapter = getBlocklyAdapter();
  const sourceBodies = scripts.map((script) => script.body);
  const parsed = scripts.map((script) => parseSheetWorkerScript(script.body));
  const parsedXml =
    parsed.length > 0 && parsed.every((result) => result.blocks.length > 0 && result.stats.unparsed === 0)
      ? buildParsedWorkerXml(parsed.flatMap((result) => result.blocks))
      : null;

  // Use parsed worker blocks only when their generated source is byte-stable
  // after the same whitespace normalization used by the preview emitter.
  // Otherwise keep the original source as a raw block: visual/import fidelity
  // is more important than pretending an incomplete JS mapping is editable.
  if (parsedXml) {
    adapter.hydrateFromXml('worker', parsedXml);
    const emitted = emitWorkspace(adapter.getWorkspace('worker'), 'worker').code;
    if (canonicalWorkerBody(emitted) !== canonicalWorkerBody(sourceBodies.join('\n'))) {
      adapter.hydrateFromXml('worker', buildRawWorkerXml(sourceBodies));
    }
  } else {
    adapter.hydrateFromXml('worker', buildRawWorkerXml(sourceBodies));
  }
  return {
    replaced: true,
    scriptCount: scripts.length,
    targetCount: adapter.countBlocks('worker'),
  };
}

function buildParsedWorkerXml(blocks: ParsedBlock[]): string {
  const ids = { next: 0 };
  const body = serializeBlockChain(blocks, ids);
  return `<xml xmlns="https://developers.google.com/blockly/xml">${body}</xml>`;
}

function serializeBlockChain(blocks: ParsedBlock[], ids: { next: number }): string {
  return blocks
    .map((block, index) => {
      const current = serializeParsedBlock(block, ids);
      if (index === blocks.length - 1) return current;
      const next = serializeBlockChain(blocks.slice(index + 1), ids);
      return current.replace(/<\/block>$/, `<next>${next}</next></block>`);
    })
    .join('');
}

function serializeParsedBlock(block: ParsedBlock, ids: { next: number }): string {
  const id = `imported_worker_${ids.next++}`;
  const fields = Object.entries(block.fields ?? {})
    .map(([name, value]) => `<field name="${escapeXml(name)}">${escapeXml(value)}</field>`)
    .join('');
  const values = Object.entries(block.valueInputs ?? {})
    .map(([name, value]) => `<value name="${escapeXml(name)}">${serializeParsedBlock(value, ids)}</value>`)
    .join('');
  const statements = Object.entries(block.children ?? {})
    .map(([name, children]) => `<statement name="${escapeXml(name)}">${serializeBlockChain(children, ids)}</statement>`)
    .join('');
  return `<block type="${escapeXml(block.blockType)}" id="${id}">${fields}${values}${statements}</block>`;
}

export function extractRoll20WorkerScripts(html: string): Array<{ type: string; body: string }> {
  const scripts: Array<{ type: string; body: string }> = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html))) {
    const attrs = parseAttrs(match[1] ?? '');
    const type = String(attrs.type ?? '').trim().toLowerCase();
    if (type === 'text/worker' || type === '') {
      scripts.push({ type: type || '(empty)', body: normalizeSourceWorkerBody(match[2] ?? '') });
    }
  }
  return scripts;
}

function getBlockDepth(block: Blockly.Block): number {
  let depth = 0;
  let cur = block.getParent();
  while (cur) {
    depth += 1;
    cur = cur.getParent();
  }
  return depth;
}

function hasWorkerAncestor(block: Blockly.Block): boolean {
  let cur = block.getParent();
  while (cur) {
    if (isWorkerBlockType(cur.type)) return true;
    cur = cur.getParent();
  }
  return false;
}

function isRawHtmlWorkerScriptBlock(block: Blockly.Block): boolean {
  if (block.type !== 'r20_raw_html') return false;
  return stripWorkerScriptsFromRawHtml(String(block.getFieldValue('HTML') ?? '')) !== String(block.getFieldValue('HTML') ?? '');
}

function stripWorkerScriptsFromRawHtml(html: string): string {
  return String(html ?? '')
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (full, rawAttrs: string) => {
      const type = getScriptType(rawAttrs);
      return type === 'text/worker' || type === '' ? '' : full;
    })
    .replace(/^[ \t]+$/gm, '');
}

function buildRawWorkerXml(bodies: string[]): string {
  const blocks = bodies.map((body, index) => {
    const id = `src_worker_${index}_${Math.random().toString(36).slice(2, 8)}`;
    return `<block type="r20_raw_worker" id="${id}" x="24" y="${24 + index * 120}"><field name="JS">${escapeXml(body)}</field></block>`;
  });
  return `<xml xmlns="https://developers.google.com/blockly/xml">${blocks.join('')}</xml>`;
}

function canonicalWorkerBody(text: string): string {
  return dedentCommonIndent(
    String(text ?? '')
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '$1')
      .replace(/\r\n?/g, '\n')
      .replace(/^\n+/, '')
      .replace(/\n+[ \t]*$/g, ''),
  ).trim();
}

function normalizeSourceWorkerBody(body: string): string {
  return dedentCommonIndent(
    String(body ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/^\n+/, '')
      .replace(/\n+[ \t]*$/g, ''),
  );
}

function dedentCommonIndent(text: string): string {
  const lines = text.split('\n');
  let min = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = /^[ \t]*/.exec(line);
    min = Math.min(min, m?.[0].length ?? 0);
  }
  if (!Number.isFinite(min) || min <= 0) return text;
  return lines.map((line) => (line.trim() ? line.slice(min) : line)).join('\n');
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function getScriptType(rawAttrs: string): string {
  const attrs = parseAttrs(rawAttrs);
  return String(attrs.type ?? '').trim().toLowerCase();
}

function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

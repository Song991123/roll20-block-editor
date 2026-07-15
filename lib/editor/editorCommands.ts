/**
 * editorCommands — edit-canvas command/action layer.
 *
 * Every mutation the edit UI performs on the block model or the emit cache
 * goes through this module: move commits, resize commits, optimistic emit
 * patches, and inspector actions (delete/duplicate/field updates).
 *
 * The overlay/interaction components stay presentation-only and call these
 * commands, so preview render policy and importer/emitter behavior are never
 * touched from UI code paths.
 */

import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { parseCssPx } from '@/lib/editor/geometry';

export const WORKSPACE_ORDER: WorkspaceKey[] = ['html', 'css', 'i18n'];
const DESIGN_CSS_MARKER = 'r20-design-css:managed';

export type PendingMove = {
  ws: WorkspaceKey;
  blockId: string;
  kind: 'position-fields' | 'style-field';
  left: number;
  top: number;
  origStyle: string;
  containingBlockId: string | null;
  containingBlockStyle: string;
  containingBlockNeedsRelative: boolean;
};

export type OptimisticMove = {
  left: number;
  top: number;
  containingBlockId: string | null;
  containingBlockStyle: string;
  containingBlockNeedsRelative: boolean;
};

/** Find which workspace a block lives in (active workspace first). */
export function resolveBlockWorkspace(blockId: string): WorkspaceKey | null {
  const adapter = getBlocklyAdapter();
  const active = useWorkspaceStore.getState().activeWorkspace;
  const order = [active, ...WORKSPACE_ORDER].filter(
    (ws, idx, arr): ws is WorkspaceKey => !!ws && arr.indexOf(ws) === idx,
  );
  for (const ws of order) {
    if (adapter.getBlock(ws, blockId)) return ws;
  }
  return null;
}

export function commitMove(pending: PendingMove): void {
  const adapter = getBlocklyAdapter();
  let parentClass: string | null = null;
  if (
    pending.containingBlockId &&
    pending.containingBlockNeedsRelative &&
    adapter.hasBlockField(pending.ws, pending.containingBlockId, 'STYLE')
  ) {
    parentClass = ensureDesignClass(adapter, pending.ws, pending.containingBlockId);
    if (parentClass) {
      adapter.setBlockField(
        pending.ws,
        pending.containingBlockId,
        'STYLE',
        removeCssDeclarations(pending.containingBlockStyle, ['position']),
      );
      upsertDesignCssRule(parentClass, { position: 'relative' });
    } else {
      adapter.setBlockField(
        pending.ws,
        pending.containingBlockId,
        'STYLE',
        upsertCssDeclarations(pending.containingBlockStyle, { position: 'relative' }),
      );
    }
  }
  if (pending.kind === 'position-fields') {
    adapter.setBlockField(pending.ws, pending.blockId, 'LEFT_PX', String(pending.left));
    adapter.setBlockField(pending.ws, pending.blockId, 'TOP_PX', String(pending.top));
    patchEmitCacheAfterMove(pending);
    return;
  }
  const designClass = ensureDesignClass(adapter, pending.ws, pending.blockId);
  if (designClass) {
    adapter.setBlockField(
      pending.ws,
      pending.blockId,
      'STYLE',
      removeCssDeclarations(pending.origStyle, ['position', 'left', 'top']),
    );
    upsertDesignCssRule(designClass, {
      position: 'absolute',
      left: `${pending.left}px`,
      top: `${pending.top}px`,
    });
    patchEmitCacheAfterCssMove(pending, designClass, parentClass);
    return;
  }
  adapter.setBlockField(
    pending.ws,
    pending.blockId,
    'STYLE',
    upsertCssDeclarations(pending.origStyle, {
      position: 'absolute',
      left: `${pending.left}px`,
      top: `${pending.top}px`,
    }),
  );
  patchEmitCacheAfterMove(pending);
}

export type ResizeCommit = {
  blockId: string;
  width: number;
  height: number;
  /** New left/top when a left/top edge handle moved an absolutely placed block. */
  left?: number;
  top?: number;
};

/**
 * Commit a resize from the selection overlay handles.
 *
 * - Blocks with WIDTH_PX/HEIGHT_PX fields commit through those fields.
 * - Blocks with a STYLE field commit width/height declarations there.
 * - left/top are committed only when the block already has a position surface
 *   (LEFT_PX/TOP_PX fields, or an existing left/top style declaration), so a
 *   resize never silently converts a flow element into an absolute one.
 * - Returns false when the block has no editable size surface; the caller
 *   shows the "size not saved" hint and reverts the visual preview.
 */
export function commitResize(commit: ResizeCommit): boolean {
  const adapter = getBlocklyAdapter();
  const ws = resolveBlockWorkspace(commit.blockId);
  if (!ws) return false;
  const width = Math.max(1, Math.round(commit.width));
  const height = Math.max(1, Math.round(commit.height));
  const left = commit.left != null ? Math.max(0, Math.round(commit.left)) : null;
  const top = commit.top != null ? Math.max(0, Math.round(commit.top)) : null;

  if (
    left != null &&
    top != null &&
    adapter.hasBlockField(ws, commit.blockId, 'LEFT_PX') &&
    adapter.hasBlockField(ws, commit.blockId, 'TOP_PX')
  ) {
    adapter.setBlockField(ws, commit.blockId, 'LEFT_PX', String(left));
    adapter.setBlockField(ws, commit.blockId, 'TOP_PX', String(top));
  }

  if (
    adapter.hasBlockField(ws, commit.blockId, 'WIDTH_PX') &&
    adapter.hasBlockField(ws, commit.blockId, 'HEIGHT_PX')
  ) {
    adapter.setBlockField(ws, commit.blockId, 'WIDTH_PX', String(width));
    adapter.setBlockField(ws, commit.blockId, 'HEIGHT_PX', String(height));
    bumpWorkspace(ws);
    return true;
  }
  if (adapter.hasBlockField(ws, commit.blockId, 'STYLE')) {
    const style = adapter.getBlockField(ws, commit.blockId, 'STYLE') ?? '';
    const declarations: Record<string, string> = {
      width: `${width}px`,
      height: `${height}px`,
    };
    if (left != null && top != null && parseCssPx(style, 'left') != null) {
      declarations.left = `${left}px`;
      declarations.top = `${top}px`;
    }
    adapter.setBlockField(ws, commit.blockId, 'STYLE', upsertCssDeclarations(style, declarations));
    patchEmitCacheStyleDeclarations(commit.blockId, declarations);
    bumpWorkspace(ws);
    return true;
  }
  return false;
}

export function deleteBlockCommand(blockId: string): boolean {
  const adapter = getBlocklyAdapter();
  const ws = resolveBlockWorkspace(blockId);
  if (!ws) return false;
  const ok = adapter.deleteBlock(ws, blockId);
  if (ok) bumpWorkspace(ws);
  return ok;
}

export function duplicateBlockCommand(blockId: string): string | null {
  const adapter = getBlocklyAdapter();
  const ws = resolveBlockWorkspace(blockId);
  if (!ws) return null;
  const newId = adapter.duplicateBlock(ws, blockId);
  if (newId) bumpWorkspace(ws);
  return newId;
}

export function setBlockFieldCommand(blockId: string, field: string, value: string): boolean {
  const adapter = getBlocklyAdapter();
  const ws = resolveBlockWorkspace(blockId);
  if (!ws) return false;
  const ok = adapter.setBlockField(ws, blockId, field, value);
  if (ok) bumpWorkspace(ws);
  return ok;
}

function bumpWorkspace(ws: WorkspaceKey): void {
  const adapter = getBlocklyAdapter();
  useWorkspaceStore.getState().bumpStructure(ws, adapter.countBlocks(ws));
}

export function ensureDesignClass(
  adapter: ReturnType<typeof getBlocklyAdapter>,
  ws: WorkspaceKey,
  blockId: string,
): string | null {
  if (!adapter.hasBlockField(ws, blockId, 'CLASS')) return null;
  const token = designClassForBlock(blockId);
  const current = adapter.getBlockField(ws, blockId, 'CLASS') ?? '';
  const parts = current.split(/\s+/).filter(Boolean);
  if (!parts.includes(token)) {
    adapter.setBlockField(ws, blockId, 'CLASS', [...parts, token].join(' '));
  }
  return token;
}

export function upsertDesignCssRule(className: string, declarations: Record<string, string>): void {
  const adapter = getBlocklyAdapter();
  const rawBlockId = findOrCreateDesignCssBlock(adapter);
  if (!rawBlockId) return;
  const current = adapter.getBlockField('css', rawBlockId, 'CSS') ?? '';
  adapter.setBlockField('css', rawBlockId, 'CSS', upsertCssRule(current, className, declarations));
}

function findOrCreateDesignCssBlock(adapter: ReturnType<typeof getBlocklyAdapter>): string | null {
  const existing = adapter
    .listAllBlocks('css')
    .find((block) => block.type === 'r20_raw_css' && (adapter.getBlockField('css', block.id, 'CSS') ?? '').includes(DESIGN_CSS_MARKER));
  if (existing) return existing.id;
  const id = adapter.appendBlockToWorkspace('css', 'r20_raw_css');
  if (!id) return null;
  adapter.setBlockField('css', id, 'CSS', `/* ${DESIGN_CSS_MARKER} */`);
  return id;
}

export function upsertCssRule(
  css: string,
  className: string,
  declarations: Record<string, string>,
): string {
  const selector = `.${className}`;
  const rule = `${selector} { ${formatCssDeclarations(declarations)} }`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 'm');
  const base = css.trim() || `/* ${DESIGN_CSS_MARKER} */`;
  if (re.test(base)) return base.replace(re, rule);
  return `${base}\n${rule}`;
}

function formatCssDeclarations(declarations: Record<string, string>): string {
  return Object.entries(declarations)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}

function patchEmitCacheAfterCssMove(
  pending: PendingMove,
  designClass: string,
  parentClass: string | null,
): void {
  if (pending.ws !== 'html') return;
  const store = useWorkspaceStore.getState();
  let html = store.emitCache.html;
  let css = store.emitCache.css;
  if (!html) return;
  if (pending.containingBlockId && pending.containingBlockNeedsRelative && parentClass) {
    html = addClassToBlockTag(html, pending.containingBlockId, parentClass);
    html = removeStyleDeclarationsFromBlockTag(html, pending.containingBlockId, ['position']);
    css = upsertCssRule(css, parentClass, { position: 'relative' });
  }
  html = addClassToBlockTag(html, pending.blockId, designClass);
  html = removeStyleDeclarationsFromBlockTag(html, pending.blockId, ['position', 'left', 'top']);
  css = upsertCssRule(css, designClass, {
    position: 'absolute',
    left: `${pending.left}px`,
    top: `${pending.top}px`,
  });
  store.setEmitCache({ html, css });
}

export function patchEmitCacheAfterMove(pending: PendingMove): void {
  if (pending.ws !== 'html') return;
  const store = useWorkspaceStore.getState();
  let html = store.emitCache.html;
  if (!html) return;
  if (pending.containingBlockId && pending.containingBlockNeedsRelative) {
    html = applyOptimisticPositionDeclaration(
      html,
      pending.containingBlockId,
      pending.containingBlockStyle,
    );
  }
  html = applyOptimisticPosition(html, pending.blockId, pending.left, pending.top);
  store.setEmitCache({ html });
}

function patchEmitCacheStyleDeclarations(
  blockId: string,
  declarations: Record<string, string>,
): void {
  const store = useWorkspaceStore.getState();
  const html = store.emitCache.html;
  if (!html) return;
  const next = applyStyleDeclarationsToBlockTag(html, blockId, declarations);
  if (next !== html) store.setEmitCache({ html: next });
}

export function applyOptimisticPositions(
  html: string,
  moves: Record<string, OptimisticMove>,
): string {
  if (!html || Object.keys(moves).length === 0) return html;
  let out = html;
  for (const [blockId, move] of Object.entries(moves)) {
    if (move.containingBlockId && move.containingBlockNeedsRelative) {
      out = applyOptimisticPositionDeclaration(
        out,
        move.containingBlockId,
        move.containingBlockStyle,
      );
    }
    out = applyOptimisticPosition(out, blockId, move.left, move.top);
  }
  return out;
}

function applyOptimisticPositionDeclaration(
  html: string,
  blockId: string,
  fallbackStyle: string,
): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return html;
  const styleMatch = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i);
  const nextStyle = upsertCssDeclarations(styleMatch?.[2] ?? fallbackStyle, {
    position: 'relative',
  });
  const nextTag = styleMatch
    ? tag.text.replace(styleMatch[0], ` style=${styleMatch[1]}${escapeHtmlAttr(nextStyle)}${styleMatch[1]}`)
    : tag.text.replace(/>$/, ` style="${escapeHtmlAttr(nextStyle)}">`);
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

function applyOptimisticPosition(
  html: string,
  blockId: string,
  left: number,
  top: number,
): string {
  return applyStyleDeclarationsToBlockTag(html, blockId, {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
  });
}

function applyStyleDeclarationsToBlockTag(
  html: string,
  blockId: string,
  declarations: Record<string, string>,
): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return html;
  const styleMatch = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i);
  const nextStyle = upsertCssDeclarations(styleMatch?.[2] ?? '', declarations);
  const nextTag = styleMatch
    ? tag.text.replace(styleMatch[0], ` style=${styleMatch[1]}${escapeHtmlAttr(nextStyle)}${styleMatch[1]}`)
    : tag.text.replace(/>$/, ` style="${escapeHtmlAttr(nextStyle)}">`);
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

export function htmlOrCssHasPosition(
  html: string,
  css: string,
  blockId: string,
  left: number,
  top: number,
): boolean {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return false;
  const style = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
  if (parseCssPx(style, 'left') === left && parseCssPx(style, 'top') === top) return true;
  const className = designClassForBlock(blockId);
  const aliases = designClassAliases(className);
  if (!aliases.some((alias) => tagHasClass(tag.text, alias))) return false;
  const declarations =
    aliases.map((alias) => readCssRuleDeclarations(css, alias)).find(Boolean) ?? '';
  return parseCssPx(declarations, 'left') === left && parseCssPx(declarations, 'top') === top;
}

export function findBlockOpeningTag(html: string, blockId: string): { start: number; end: number; text: string } | null {
  const marker = `data-r20-block-id="${blockId}"`;
  let markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    markerIndex = html.indexOf(`data-r20-block-id='${blockId}'`);
  }
  if (markerIndex < 0) return null;
  const start = html.lastIndexOf('<', markerIndex);
  const end = html.indexOf('>', markerIndex);
  if (start < 0 || end < 0 || start > markerIndex) return null;
  return { start, end: end + 1, text: html.slice(start, end + 1) };
}

function addClassToBlockTag(html: string, blockId: string, className: string): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag || tagHasClass(tag.text, className)) return html;
  const classMatch = tag.text.match(/\sclass=(["'])([\s\S]*?)\1/i);
  const nextTag = classMatch
    ? tag.text.replace(
        classMatch[0],
        ` class=${classMatch[1]}${escapeHtmlAttr(`${classMatch[2]} ${className}`.trim())}${classMatch[1]}`,
      )
    : tag.text.replace(/>$/, ` class="${escapeHtmlAttr(className)}">`);
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

function removeStyleDeclarationsFromBlockTag(html: string, blockId: string, props: string[]): string {
  const tag = findBlockOpeningTag(html, blockId);
  if (!tag) return html;
  const styleMatch = tag.text.match(/\sstyle=(["'])([\s\S]*?)\1/i);
  if (!styleMatch) return html;
  const nextStyle = removeCssDeclarations(styleMatch[2], props);
  const nextTag = nextStyle
    ? tag.text.replace(styleMatch[0], ` style=${styleMatch[1]}${escapeHtmlAttr(nextStyle)}${styleMatch[1]}`)
    : tag.text.replace(styleMatch[0], '');
  return html.slice(0, tag.start) + nextTag + html.slice(tag.end);
}

function tagHasClass(tag: string, className: string): boolean {
  const cls = tag.match(/\sclass=(["'])([\s\S]*?)\1/i)?.[2] ?? '';
  return cls.split(/\s+/).includes(className);
}

export function designClassForBlock(blockId: string): string {
  const safe = blockId.replace(/[^a-zA-Z0-9_-]/g, (ch) => ch.charCodeAt(0).toString(36));
  return `sheet-r20-node-${safe.slice(0, 32)}`;
}

function designClassAliases(className: string): string[] {
  const aliases = [className];
  if (className.startsWith('sheet-')) aliases.push(className.slice('sheet-'.length));
  else aliases.push(`sheet-${className}`);
  return Array.from(new Set(aliases));
}

function readCssRuleDeclarations(css: string, className: string): string {
  const selector = `.${className}`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  return match?.[1] ?? '';
}

export function upsertCssDeclarations(style: string, declarations: Record<string, string>): string {
  const map = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (key && value) map.set(key, value);
  }
  for (const [key, value] of Object.entries(declarations)) {
    map.set(key.toLowerCase(), value);
  }
  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

export function removeCssDeclarations(style: string, props: string[]): string {
  const remove = new Set(props.map((prop) => prop.toLowerCase()));
  const map = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (key && value && !remove.has(key)) map.set(key, value);
  }
  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function escapeHtmlAttr(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

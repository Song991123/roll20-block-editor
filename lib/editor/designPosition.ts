import type { BlocklyAdapter } from '@/lib/blockly/adapter';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';
import {
  designClassFieldForBlockType,
  designStyleFieldForBlockType,
} from './designClassField';

export const DESIGN_CSS_MARKER = 'r20-design-css:managed';

export type DesignPositionRequest = {
  workspace: WorkspaceKey;
  blockId: string;
  left: number;
  top: number;
  containingBlockId: string | null;
  containingBlockNeedsRelative: boolean;
};

export type DesignPositionResult = {
  moved: boolean;
  reason: 'position-fields' | 'managed-css' | 'missing-block' | 'missing-style-or-class' | 'css-workspace-unavailable';
  designClass: string | null;
  containingClass: string | null;
  cssBlockCreated: boolean;
};

type DesignPositionAdapter = Pick<
  BlocklyAdapter,
  | 'appendBlockToWorkspace'
  | 'getBlock'
  | 'getBlockField'
  | 'hasBlockField'
  | 'listAllBlocks'
  | 'setBlockField'
>;

export function commitManagedDesignPosition(
  adapter: DesignPositionAdapter,
  request: DesignPositionRequest,
): DesignPositionResult {
  const { workspace, blockId } = request;
  if (!adapter.getBlock(workspace, blockId)) return failure('missing-block');

  const hasPositionFields = adapter.hasBlockField(workspace, blockId, 'LEFT_PX')
    && adapter.hasBlockField(workspace, blockId, 'TOP_PX');
  if (hasPositionFields) {
    adapter.setBlockField(workspace, blockId, 'LEFT_PX', String(request.left));
    adapter.setBlockField(workspace, blockId, 'TOP_PX', String(request.top));
    return {
      moved: true,
      reason: 'position-fields',
      designClass: null,
      containingClass: null,
      cssBlockCreated: false,
    };
  }

  if (
    !resolveDesignClassField(adapter, workspace, blockId)
  ) {
    return failure('missing-style-or-class');
  }
  if (
    request.containingBlockId
    && request.containingBlockNeedsRelative
    && (
      !resolveDesignClassField(adapter, workspace, request.containingBlockId)
    )
  ) {
    return failure('missing-style-or-class');
  }

  const managedCss = findOrCreateDesignCssBlock(adapter);
  if (!managedCss) return failure('css-workspace-unavailable');

  let css = adapter.getBlockField('css', managedCss.id, 'CSS') ?? `/* ${DESIGN_CSS_MARKER} */`;
  let containingClass: string | null = null;
  if (request.containingBlockId && request.containingBlockNeedsRelative) {
    containingClass = ensureDesignClass(adapter, workspace, request.containingBlockId);
    if (!containingClass) return failure('missing-style-or-class');
    const parentStyleField = resolveDesignStyleField(adapter, workspace, request.containingBlockId);
    if (parentStyleField) {
      const parentStyle = adapter.getBlockField(workspace, request.containingBlockId, parentStyleField) ?? '';
      adapter.setBlockField(
        workspace,
        request.containingBlockId,
        parentStyleField,
        removeCssDeclarations(parentStyle, ['position']),
      );
    }
    css = upsertCssRule(css, containingClass, { position: 'relative' });
  }

  const designClass = ensureDesignClass(adapter, workspace, blockId);
  if (!designClass) return failure('missing-style-or-class');
  const styleField = resolveDesignStyleField(adapter, workspace, blockId);
  if (styleField) {
    const style = adapter.getBlockField(workspace, blockId, styleField) ?? '';
    adapter.setBlockField(
      workspace,
      blockId,
      styleField,
      removeCssDeclarations(style, ['position', 'left', 'top']),
    );
  }
  css = upsertCssRule(css, designClass, {
    position: 'absolute',
    left: `${request.left}px`,
    top: `${request.top}px`,
  });
  adapter.setBlockField('css', managedCss.id, 'CSS', css);

  return {
    moved: true,
    reason: 'managed-css',
    designClass,
    containingClass,
    cssBlockCreated: managedCss.created,
  };
}

export function designClassForBlock(blockId: string): string {
  const safe = blockId.replace(/[^a-zA-Z0-9_-]/g, (char) => char.charCodeAt(0).toString(36));
  return `sheet-r20-node-${safe.slice(0, 32)}`;
}

export function upsertManagedCssRule(
  css: string,
  className: string,
  declarations: Record<string, string>,
): string {
  return upsertCssRule(css, className, declarations);
}

function failure(reason: DesignPositionResult['reason']): DesignPositionResult {
  return {
    moved: false,
    reason,
    designClass: null,
    containingClass: null,
    cssBlockCreated: false,
  };
}

function ensureDesignClass(
  adapter: DesignPositionAdapter,
  workspace: WorkspaceKey,
  blockId: string,
): string | null {
  const classField = resolveDesignClassField(adapter, workspace, blockId);
  if (!classField) return null;
  const token = designClassForBlock(blockId);
  const current = adapter.getBlockField(workspace, blockId, classField) ?? '';
  const classes = current.split(/\s+/).filter(Boolean);
  if (!classes.includes(token)) {
    adapter.setBlockField(workspace, blockId, classField, [...classes, token].join(' '));
  }
  return token;
}

function resolveDesignClassField(
  adapter: DesignPositionAdapter,
  workspace: WorkspaceKey,
  blockId: string,
): string | null {
  const block = adapter.getBlock(workspace, blockId);
  if (!block) return null;
  const preferred = designClassFieldForBlockType(block.type);
  if (adapter.hasBlockField(workspace, blockId, preferred)) return preferred;
  // Keep compatibility with older serialized composite blocks that may have
  // been upgraded to the generic CLASS field.
  if (preferred !== 'CLASS' && adapter.hasBlockField(workspace, blockId, 'CLASS')) {
    return 'CLASS';
  }
  return null;
}

function resolveDesignStyleField(
  adapter: DesignPositionAdapter,
  workspace: WorkspaceKey,
  blockId: string,
): string | null {
  const block = adapter.getBlock(workspace, blockId);
  if (!block) return null;
  const preferred = designStyleFieldForBlockType(block.type);
  return adapter.hasBlockField(workspace, blockId, preferred) ? preferred : null;
}

function findOrCreateDesignCssBlock(
  adapter: DesignPositionAdapter,
): { id: string; created: boolean } | null {
  const existing = adapter.listAllBlocks('css').find(
    (block) => block.type === 'r20_raw_css'
      && (adapter.getBlockField('css', block.id, 'CSS') ?? '').includes(DESIGN_CSS_MARKER),
  );
  if (existing) return { id: existing.id, created: false };
  const id = adapter.appendBlockToWorkspace('css', 'r20_raw_css');
  if (!id) return null;
  adapter.setBlockField('css', id, 'CSS', `/* ${DESIGN_CSS_MARKER} */`);
  return { id, created: true };
}

function upsertCssRule(
  css: string,
  className: string,
  declarations: Record<string, string>,
): string {
  const selector = `.${className}`;
  const rule = `${selector} { ${formatCssDeclarations(declarations)} }`;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 'm');
  const base = css.trim() || `/* ${DESIGN_CSS_MARKER} */`;
  if (matcher.test(base)) return base.replace(matcher, rule);
  return `${base}\n${rule}`;
}

function formatCssDeclarations(declarations: Record<string, string>): string {
  return Object.entries(declarations)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ');
}

function removeCssDeclarations(style: string, properties: string[]): string {
  const removed = new Set(properties.map((property) => property.toLowerCase()));
  const kept = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const separator = chunk.indexOf(':');
    if (separator <= 0) continue;
    const property = chunk.slice(0, separator).trim().toLowerCase();
    const value = chunk.slice(separator + 1).trim();
    if (property && value && !removed.has(property)) kept.set(property, value);
  }
  return Array.from(kept.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

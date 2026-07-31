import type { BlocklyAdapter } from '@/lib/blockly/adapter';
import { removePreservedStyleDeclarations } from '@/lib/blocks/preservedAttributes';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';
import {
  designClassFieldForBlockType,
  designPreservedAttrsFieldForBlockType,
  designStyleFieldForBlockType,
} from './designClassField';
import {
  findOwningRolltemplateId,
  ROLLTEMPLATE_ROOT_TYPE,
  rolltemplateSelectorForName,
} from './rolltemplateScope';

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

export type ManagedDesignDeclarations = Record<string, string | null>;

export const MANAGED_DESIGN_STATES = ['base', 'hover', 'active', 'focus'] as const;
export type ManagedDesignState = (typeof MANAGED_DESIGN_STATES)[number];
export const MANAGED_DESIGN_PARTS = ['self', 'before', 'after'] as const;
export type ManagedDesignPart = (typeof MANAGED_DESIGN_PARTS)[number];

export type DesignStyleRequest = {
  workspace: WorkspaceKey;
  blockId: string;
  declarations: ManagedDesignDeclarations;
  state?: ManagedDesignState;
  part?: ManagedDesignPart;
};

export type DesignStyleResult = {
  changed: boolean;
  reason: 'managed-css' | 'missing-block' | 'missing-style-or-class' | 'css-workspace-unavailable';
  designClass: string | null;
  cssBlockCreated: boolean;
  htmlChanged: boolean;
  cssChanged: boolean;
};

export type RolltemplateStyleScopeMigrationResult = {
  changed: boolean;
  migratedRules: number;
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

type ManagedStyleTarget = {
  className: string;
  scopeSelector: string | null;
  attachStableClass: boolean;
};

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
    stripInlineDesignDeclarations(
      adapter,
      workspace,
      request.containingBlockId,
      ['position'],
    );
    css = patchCssRule(css, containingClass, { position: 'relative' });
  }

  const designClass = ensureDesignClass(adapter, workspace, blockId);
  if (!designClass) return failure('missing-style-or-class');
  stripInlineDesignDeclarations(
    adapter,
    workspace,
    blockId,
    ['position', 'left', 'top'],
  );
  css = patchCssRule(css, designClass, {
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
  scopeSelector: string | null = null,
): string {
  return upsertCssRule(css, className, declarations, scopeSelector);
}

/**
 * Read the declarations currently controlled by the visual editor.
 *
 * Inline declarations are included as the starting value so imported sheets
 * do not show an empty inspector. Managed CSS wins because it is the value the
 * editor most recently wrote for the element.
 */
export function readManagedDesignStyle(
  adapter: DesignPositionAdapter,
  workspace: WorkspaceKey,
  blockId: string,
  state: ManagedDesignState = 'base',
  part: ManagedDesignPart = 'self',
): Record<string, string> {
  const block = adapter.getBlock(workspace, blockId);
  if (!block) return {};

  const target = resolveManagedStyleTarget(adapter, workspace, blockId);
  if (!target) return {};

  const styleField = resolveDesignStyleField(adapter, workspace, blockId);
  const inline = state === 'base' && part === 'self' && styleField
    ? parseCssDeclarations(adapter.getBlockField(workspace, blockId, styleField) ?? '')
    : {};
  const managedCss = findDesignCssBlock(adapter);
  if (!managedCss) return inline;
  const css = adapter.getBlockField('css', managedCss.id, 'CSS') ?? '';
  return {
    ...inline,
    ...readCssRule(css, target.className, target.scopeSelector, state, part),
  };
}

export function canManageDesignStyle(
  adapter: DesignPositionAdapter,
  workspace: WorkspaceKey,
  blockId: string,
): boolean {
  return Boolean(resolveManagedStyleTarget(adapter, workspace, blockId));
}

/**
 * Persist visual-editor declarations in the CSS workspace while keeping the
 * emitted HTML limited to a stable class hook. Properties touched by the
 * visual editor are removed from the source block's inline style so they
 * cannot outrank the generated class rule.
 */
export function commitManagedDesignStyle(
  adapter: DesignPositionAdapter,
  request: DesignStyleRequest,
): DesignStyleResult {
  const { workspace, blockId, state = 'base', part = 'self' } = request;
  if (!adapter.getBlock(workspace, blockId)) return styleFailure('missing-block');
  const target = resolveManagedStyleTarget(adapter, workspace, blockId);
  if (!target) {
    return styleFailure('missing-style-or-class');
  }

  const normalized = normalizeDesignDeclarations(request.declarations);
  if (Object.keys(normalized).length === 0) {
    return {
      changed: false,
      reason: 'managed-css',
      designClass: target.className,
      cssBlockCreated: false,
      htmlChanged: false,
      cssChanged: false,
    };
  }

  const managedCss = findOrCreateDesignCssBlock(adapter);
  if (!managedCss) return styleFailure('css-workspace-unavailable');

  const classFieldBefore = target.attachStableClass
    ? resolveDesignClassField(adapter, workspace, blockId)
    : null;
  const classValueBefore = classFieldBefore
    ? adapter.getBlockField(workspace, blockId, classFieldBefore) ?? ''
    : '';
  const designClass = target.attachStableClass
    ? ensureDesignClass(adapter, workspace, blockId)
    : target.className;
  if (!designClass) return styleFailure('missing-style-or-class');

  const beforeCss = adapter.getBlockField('css', managedCss.id, 'CSS')
    ?? `/* ${DESIGN_CSS_MARKER} */`;
  let afterCss = beforeCss;

  // A pseudo-state cannot beat an imported inline declaration without
  // `!important`. Preserve the current base value in managed CSS before the
  // touched inline property is removed, then write the state rule separately.
  if (state !== 'base') {
    const currentBase = readManagedDesignStyle(adapter, workspace, blockId, 'base', part);
    const preservedBase: ManagedDesignDeclarations = {};
    for (const property of Object.keys(normalized)) {
      if (currentBase[property]) preservedBase[property] = currentBase[property];
    }
    if (Object.keys(preservedBase).length > 0) {
      afterCss = patchCssRule(
        afterCss,
        designClass,
        preservedBase,
        target.scopeSelector,
        'base',
        part,
      );
    }
  }

  let htmlChanged = part === 'self'
    ? stripInlineDesignDeclarations(
      adapter,
      workspace,
      blockId,
      Object.keys(normalized),
    )
    : false;

  afterCss = patchCssRule(
    afterCss,
    designClass,
    normalized,
    target.scopeSelector,
    state,
    part,
  );
  const cssChanged = beforeCss !== afterCss;
  if (cssChanged) adapter.setBlockField('css', managedCss.id, 'CSS', afterCss);

  // ensureDesignClass may have attached the class even when no inline style
  // needed migration.
  htmlChanged = htmlChanged || (
    target.attachStableClass
    && !classValueBefore.split(/\s+/).includes(designClass)
  );

  return {
    changed: htmlChanged || cssChanged || managedCss.created,
    reason: 'managed-css',
    designClass,
    cssBlockCreated: managedCss.created,
    htmlChanged,
    cssChanged,
  };
}

export function migrateManagedRolltemplateStyleScope(
  adapter: DesignPositionAdapter,
  rootId: string,
  previousName: string | null | undefined,
  nextName: string | null | undefined,
): RolltemplateStyleScopeMigrationResult {
  const root = adapter.getBlock('html', rootId);
  if (!root || root.type !== ROLLTEMPLATE_ROOT_TYPE) {
    return { changed: false, migratedRules: 0 };
  }
  const previousScope = rolltemplateSelectorForName(previousName);
  const nextScope = rolltemplateSelectorForName(nextName);
  if (previousScope === nextScope) return { changed: false, migratedRules: 0 };

  const managedCss = findDesignCssBlock(adapter);
  if (!managedCss) return { changed: false, migratedRules: 0 };
  const nodes = adapter.listAllBlocks('html');
  let css = adapter.getBlockField('css', managedCss.id, 'CSS') ?? '';
  let migratedRules = 0;

  const previousRootClass = previousScope.slice(1);
  const nextRootClass = nextScope.slice(1);
  for (const state of MANAGED_DESIGN_STATES) {
    for (const part of MANAGED_DESIGN_PARTS) {
      const previousRootMatcher = managedRuleMatcher(previousRootClass, '[^}]*', null, state, part);
      if (previousRootMatcher.test(css)) {
        const previous = readExactCssRule(css, previousRootClass, null, state, part);
        const next = readExactCssRule(css, nextRootClass, null, state, part);
        css = css.replace(previousRootMatcher, '').trim();
        css = upsertCssRule(css, nextRootClass, { ...previous, ...next }, null, state, part);
        migratedRules += 1;
      }
    }
  }

  for (const node of nodes) {
    if (node.id === rootId || findOwningRolltemplateId(nodes, node.id) !== rootId) continue;
    const className = designClassForBlock(node.id);
    for (const state of MANAGED_DESIGN_STATES) {
      for (const part of MANAGED_DESIGN_PARTS) {
        const previousMatcher = managedRuleMatcher(className, '[^}]*', previousScope, state, part);
        if (!previousMatcher.test(css)) continue;
        const previous = readExactCssRule(css, className, previousScope, state, part);
        const next = readExactCssRule(css, className, nextScope, state, part);
        css = css.replace(previousMatcher, '').trim();
        css = upsertCssRule(css, className, { ...previous, ...next }, nextScope, state, part);
        migratedRules += 1;
      }
    }
  }

  if (migratedRules > 0) adapter.setBlockField('css', managedCss.id, 'CSS', css);
  return { changed: migratedRules > 0, migratedRules };
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

function styleFailure(reason: DesignStyleResult['reason']): DesignStyleResult {
  return {
    changed: false,
    reason,
    designClass: null,
    cssBlockCreated: false,
    htmlChanged: false,
    cssChanged: false,
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

function resolveManagedStyleTarget(
  adapter: DesignPositionAdapter,
  workspace: WorkspaceKey,
  blockId: string,
): ManagedStyleTarget | null {
  const block = adapter.getBlock(workspace, blockId);
  if (!block) return null;
  if (workspace === 'html' && block.type === ROLLTEMPLATE_ROOT_TYPE) {
    return {
      className: rolltemplateSelectorForName(
        adapter.getBlockField('html', blockId, 'NAME'),
      ).slice(1),
      scopeSelector: null,
      attachStableClass: false,
    };
  }
  if (!resolveDesignClassField(adapter, workspace, blockId)) return null;
  return {
    className: designClassForBlock(blockId),
    scopeSelector: resolveManagedStyleScope(adapter, workspace, blockId),
    attachStableClass: true,
  };
}

function stripInlineDesignDeclarations(
  adapter: DesignPositionAdapter,
  workspace: WorkspaceKey,
  blockId: string,
  properties: string[],
): boolean {
  let changed = false;
  const styleField = resolveDesignStyleField(adapter, workspace, blockId);
  if (styleField) {
    const before = adapter.getBlockField(workspace, blockId, styleField) ?? '';
    const after = removeCssDeclarations(before, properties);
    if (after !== before && adapter.setBlockField(workspace, blockId, styleField, after)) {
      changed = true;
    }
  }

  const block = adapter.getBlock(workspace, blockId);
  if (!block) return changed;
  const preservedField = designPreservedAttrsFieldForBlockType(block.type);
  if (!adapter.hasBlockField(workspace, blockId, preservedField)) return changed;
  const beforePreserved = adapter.getBlockField(workspace, blockId, preservedField) ?? '';
  const afterPreserved = removePreservedStyleDeclarations(beforePreserved, properties);
  if (
    afterPreserved !== beforePreserved
    && adapter.setBlockField(workspace, blockId, preservedField, afterPreserved)
  ) {
    changed = true;
  }
  return changed;
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

function findDesignCssBlock(
  adapter: Pick<DesignPositionAdapter, 'listAllBlocks' | 'getBlockField'>,
): { id: string } | null {
  const existing = adapter.listAllBlocks('css').find(
    (block) => block.type === 'r20_raw_css'
      && (adapter.getBlockField('css', block.id, 'CSS') ?? '').includes(DESIGN_CSS_MARKER),
  );
  return existing ? { id: existing.id } : null;
}

function resolveManagedStyleScope(
  adapter: Pick<DesignPositionAdapter, 'listAllBlocks' | 'getBlockField'>,
  workspace: WorkspaceKey,
  blockId: string,
): string | null {
  if (workspace !== 'html') return null;
  const nodes = adapter.listAllBlocks('html');
  const rootId = findOwningRolltemplateId(nodes, blockId);
  if (!rootId || rootId === blockId) return null;
  return rolltemplateSelectorForName(adapter.getBlockField('html', rootId, 'NAME'));
}

function upsertCssRule(
  css: string,
  className: string,
  declarations: Record<string, string>,
  scopeSelector: string | null = null,
  state: ManagedDesignState = 'base',
  part: ManagedDesignPart = 'self',
): string {
  const selectors = managedSelectorParts(className, scopeSelector, state, part);
  const rule = `${selectors.strong}, ${selectors.base} { ${formatCssDeclarations(declarations)} }`;
  const matcher = managedRuleMatcher(className, '[^}]*', scopeSelector, state, part);
  const base = css.trim() || `/* ${DESIGN_CSS_MARKER} */`;
  if (matcher.test(base)) return base.replace(matcher, rule);
  return `${base}\n${rule}`;
}

function formatCssDeclarations(declarations: Record<string, string>): string {
  return Object.entries(declarations)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ');
}

function patchCssRule(
  css: string,
  className: string,
  patch: ManagedDesignDeclarations,
  scopeSelector: string | null = null,
  state: ManagedDesignState = 'base',
  part: ManagedDesignPart = 'self',
): string {
  const scopedCurrent = readExactCssRule(css, className, scopeSelector, state, part);
  const legacyCurrent = scopeSelector
    ? readExactCssRule(css, className, null, state, part)
    : {};
  const current = { ...legacyCurrent, ...scopedCurrent };
  for (const [property, value] of Object.entries(patch)) {
    if (value == null || value === '') delete current[property];
    else current[property] = value;
  }
  const withoutLegacy = scopeSelector
    ? css.replace(managedRuleMatcher(className, '[^}]*', null, state, part), '').trim()
    : css;
  if (Object.keys(current).length === 0) {
    return withoutLegacy
      .replace(managedRuleMatcher(className, '[^}]*', scopeSelector, state, part), '')
      .trim();
  }
  return upsertCssRule(withoutLegacy, className, current, scopeSelector, state, part);
}

function readCssRule(
  css: string,
  className: string,
  scopeSelector: string | null = null,
  state: ManagedDesignState = 'base',
  part: ManagedDesignPart = 'self',
): Record<string, string> {
  const scoped = readExactCssRule(css, className, scopeSelector, state, part);
  if (Object.keys(scoped).length > 0 || !scopeSelector) return scoped;
  return readExactCssRule(css, className, null, state, part);
}

function readExactCssRule(
  css: string,
  className: string,
  scopeSelector: string | null,
  state: ManagedDesignState = 'base',
  part: ManagedDesignPart = 'self',
): Record<string, string> {
  const match = css.match(managedRuleMatcher(className, '([^}]*)', scopeSelector, state, part));
  return match ? parseCssDeclarations(match[1]) : {};
}

function managedSelectorParts(
  className: string,
  scopeSelector: string | null,
  state: ManagedDesignState = 'base',
  part: ManagedDesignPart = 'self',
): { base: string; strong: string } {
  const node = `.${className}`;
  const scope = scopeSelector ? `${scopeSelector} ` : '';
  const suffix = `${managedStateSuffix(state)}${managedPartSuffix(part)}`;
  return {
    base: `${scope}${node}${suffix}`,
    strong: `${scope}${node}${node}${node}${node}${suffix}`,
  };
}

function managedRuleMatcher(
  className: string,
  bodyPattern: string,
  scopeSelector: string | null,
  state: ManagedDesignState = 'base',
  part: ManagedDesignPart = 'self',
): RegExp {
  const { base, strong } = managedSelectorParts(className, scopeSelector, state, part);
  const escapedBase = escapeRegExp(base);
  const escapedStrong = escapeRegExp(strong);
  return new RegExp(
    `^[\\t ]*(?:${escapedStrong}\\s*,\\s*${escapedBase}|${escapedBase})\\s*\\{${bodyPattern}\\}[\\t ]*$`,
    'm',
  );
}

function managedStateSuffix(state: ManagedDesignState): string {
  if (state === 'hover') return ':hover';
  if (state === 'active') return ':active';
  if (state === 'focus') return ':focus';
  return '';
}

function managedPartSuffix(part: ManagedDesignPart): string {
  if (part === 'before') return '::before';
  if (part === 'after') return '::after';
  return '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDesignDeclarations(
  declarations: ManagedDesignDeclarations,
): ManagedDesignDeclarations {
  const out: ManagedDesignDeclarations = {};
  for (const [rawProperty, rawValue] of Object.entries(declarations)) {
    const property = rawProperty.trim().toLowerCase();
    if (!/^--[a-z0-9_-]+$/.test(property) && !/^[a-z][a-z0-9-]*$/.test(property)) continue;
    const value = rawValue == null ? null : rawValue.trim();
    if (value != null && /[{}]/.test(value)) continue;
    out[property] = value || null;
  }
  return out;
}

function parseCssDeclarations(style: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const chunk of style.split(';')) {
    const separator = chunk.indexOf(':');
    if (separator <= 0) continue;
    const property = chunk.slice(0, separator).trim().toLowerCase();
    const value = chunk.slice(separator + 1).trim();
    if (property && value) declarations[property] = value;
  }
  return declarations;
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

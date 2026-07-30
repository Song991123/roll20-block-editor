import { strict as assert } from 'node:assert';
import type { BlockSnapshot, BlocklyAdapter } from '@/lib/blockly/adapter';
import { commitManagedDesignPosition, designClassForBlock } from '../designPosition.ts';

type TestBlock = BlockSnapshot & { fields: Record<string, string> };

const blocks = new Map<string, Map<string, TestBlock>>([
  ['html', new Map([
    ['frame', block('frame', 'r20_div', { CLASS: 'sheet-frame', STYLE: 'padding: 8px' })],
    ['subject', block('subject', 'r20_text_input', { CLASS: 'sheet-input', STYLE: 'left: 1px; color: red' })],
    ['positioned', block('positioned', 'r20_positioned', { LEFT_PX: '2', TOP_PX: '3' })],
    ['unsupported', block('unsupported', 'r20_raw_html', { HTML: '<hr>' })],
    ['dual', block('dual', 'r20_dual_roll_button', { ROW_CLASS: 'dual-row' })],
    ['row', block('row', 'r20_skill_row', { TR_CLASS: 'skill-row', TR_STYLE: 'display: table-row' })],
    ['wrapper', block('wrapper', 'r20_repeating_section_wrapper', { FIELDSET_CLASS: 'inventory', FIELDSET_STYLE: 'padding: 4px' })],
  ])],
  ['css', new Map()],
  ['i18n', new Map()],
]);

const adapter = {
  getBlock: (workspace: string, id: string) => blocks.get(workspace)?.get(id) ?? null,
  getBlockField: (workspace: string, id: string, field: string) => (
    blocks.get(workspace)?.get(id)?.fields[field] ?? null
  ),
  hasBlockField: (workspace: string, id: string, field: string) => (
    Object.prototype.hasOwnProperty.call(blocks.get(workspace)?.get(id)?.fields ?? {}, field)
  ),
  setBlockField: (workspace: string, id: string, field: string, value: string) => {
    const target = blocks.get(workspace)?.get(id);
    if (!target || !Object.prototype.hasOwnProperty.call(target.fields, field)) return false;
    target.fields[field] = value;
    return true;
  },
  listAllBlocks: (workspace: string) => Array.from(blocks.get(workspace)?.values() ?? []),
  appendBlockToWorkspace: (workspace: string, type: string) => {
    if (workspace !== 'css' || type !== 'r20_raw_css') return null;
    const created = block('managed-css', type, { CSS: '' });
    blocks.get('css')?.set(created.id, created);
    return created.id;
  },
} as unknown as BlocklyAdapter;

const managed = commitManagedDesignPosition(adapter, {
  workspace: 'html',
  blockId: 'subject',
  left: 48,
  top: 64,
  containingBlockId: 'frame',
  containingBlockNeedsRelative: true,
});
assert.equal(managed.moved, true);
assert.equal(managed.reason, 'managed-css');
assert.equal(managed.cssBlockCreated, true);
assert.equal(managed.designClass, designClassForBlock('subject'));
assert.equal(managed.containingClass, designClassForBlock('frame'));
assert.equal(adapter.getBlockField('html', 'subject', 'STYLE'), 'color: red');
assert.equal(adapter.getBlockField('html', 'frame', 'STYLE'), 'padding: 8px');
assert.match(adapter.getBlockField('html', 'subject', 'CLASS') ?? '', /sheet-r20-node-subject/);
assert.match(adapter.getBlockField('html', 'frame', 'CLASS') ?? '', /sheet-r20-node-frame/);
const css = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.match(css, /\.sheet-r20-node-frame \{ position: relative; \}/);
assert.match(css, /\.sheet-r20-node-subject \{ position: absolute; left: 48px; top: 64px; \}/);

const positioned = commitManagedDesignPosition(adapter, {
  workspace: 'html',
  blockId: 'positioned',
  left: 80,
  top: 96,
  containingBlockId: null,
  containingBlockNeedsRelative: false,
});
assert.equal(positioned.reason, 'position-fields');
assert.equal(adapter.getBlockField('html', 'positioned', 'LEFT_PX'), '80');
assert.equal(adapter.getBlockField('html', 'positioned', 'TOP_PX'), '96');

const cssCountBeforeFailure = adapter.listAllBlocks('css').length;
const unsupported = commitManagedDesignPosition(adapter, {
  workspace: 'html',
  blockId: 'unsupported',
  left: 10,
  top: 10,
  containingBlockId: null,
  containingBlockNeedsRelative: false,
});
assert.equal(unsupported.moved, false);
assert.equal(unsupported.reason, 'missing-style-or-class');
assert.equal(adapter.listAllBlocks('css').length, cssCountBeforeFailure);

const stylelessComposite = commitManagedDesignPosition(adapter, {
  workspace: 'html',
  blockId: 'dual',
  left: 20,
  top: 24,
  containingBlockId: null,
  containingBlockNeedsRelative: false,
});
assert.equal(stylelessComposite.moved, true);
assert.equal(stylelessComposite.reason, 'managed-css');
assert.match(adapter.getBlockField('html', 'dual', 'ROW_CLASS') ?? '', /sheet-r20-node-dual/);

const semanticRoot = commitManagedDesignPosition(adapter, {
  workspace: 'html',
  blockId: 'row',
  left: 12,
  top: 18,
  containingBlockId: 'wrapper',
  containingBlockNeedsRelative: true,
});
assert.equal(semanticRoot.moved, true);
assert.equal(semanticRoot.reason, 'managed-css');
assert.match(adapter.getBlockField('html', 'row', 'TR_CLASS') ?? '', /sheet-r20-node-row/);
assert.match(adapter.getBlockField('html', 'wrapper', 'FIELDSET_CLASS') ?? '', /sheet-r20-node-wrapper/);
assert.equal(adapter.getBlockField('html', 'row', 'TR_STYLE'), 'display: table-row');
assert.equal(adapter.getBlockField('html', 'wrapper', 'FIELDSET_STYLE'), 'padding: 4px');

console.log('designPosition.test PASS');

function block(id: string, type: string, fields: Record<string, string>): TestBlock {
  return {
    id,
    type,
    fields,
    depth: 0,
    childCount: 0,
    layerParentId: null,
    layerPreviousId: null,
    layerRelation: 'root',
    label: id,
    preview: '',
    category: null,
  };
}

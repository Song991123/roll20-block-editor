import { strict as assert } from 'node:assert';
import type { BlockSnapshot, BlocklyAdapter } from '@/lib/blockly/adapter';
import {
  canManageDesignStyle,
  commitManagedDesignPosition,
  commitManagedDesignStyle,
  designClassForBlock,
  migrateManagedRolltemplateStyleScope,
  readManagedDesignStyle,
} from '../designPosition.ts';

type TestBlock = BlockSnapshot & { fields: Record<string, string> };

const blocks = new Map<string, Map<string, TestBlock>>([
  ['html', new Map([
    ['frame', block('frame', 'r20_div', { CLASS: 'sheet-frame', STYLE: 'padding: 8px' })],
    ['subject', block('subject', 'r20_text_input', {
      CLASS: 'sheet-input',
      STYLE: 'left: 1px; color: red',
      __R20_PRESERVED_ATTRS: '[["data-hook","subject"],["style","left:1px;color:red"]]',
    })],
    ['stateful', block('stateful', 'r20_roll_button', {
      CLASS: 'sheet-stateful',
      STYLE: 'background-color: #334455; color: #ffffff',
      __R20_PRESERVED_ATTRS: '[["style","background-color:#334455;color:#ffffff"]]',
    })],
    ['positioned', block('positioned', 'r20_positioned', { LEFT_PX: '2', TOP_PX: '3' })],
    ['unsupported', block('unsupported', 'r20_raw_html', { HTML: '<hr>' })],
    ['dual', block('dual', 'r20_dual_roll_button', { ROW_CLASS: 'dual-row' })],
    ['row', block('row', 'r20_skill_row', { TR_CLASS: 'skill-row', TR_STYLE: 'display: table-row' })],
    ['wrapper', block('wrapper', 'r20_repeating_section_wrapper', { FIELDSET_CLASS: 'inventory', FIELDSET_STYLE: 'padding: 4px' })],
    ['template', block('template', 'r20_rolltemplate_define', { NAME: 'proof', STYLE: 'padding: 3px; color: red' })],
    ['template-row', {
      ...block('template-row', 'r20_rolltemplate_row', { CLASS: 'result-row', STYLE: '' }),
      layerParentId: 'template',
      layerRelation: 'child',
    }],
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
assert.equal(
  adapter.getBlockField('html', 'subject', '__R20_PRESERVED_ATTRS'),
  '[["data-hook","subject"],["style","color:red"]]',
);
assert.equal(adapter.getBlockField('html', 'frame', 'STYLE'), 'padding: 8px');
assert.match(adapter.getBlockField('html', 'subject', 'CLASS') ?? '', /sheet-r20-node-subject/);
assert.match(adapter.getBlockField('html', 'frame', 'CLASS') ?? '', /sheet-r20-node-frame/);
const css = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.match(css, /\.sheet-r20-node-subject\.sheet-r20-node-subject\.sheet-r20-node-subject\.sheet-r20-node-subject, \.sheet-r20-node-subject \{/);
assert.match(css, /\.sheet-r20-node-frame \{ position: relative; \}/);
assert.match(css, /\.sheet-r20-node-subject \{ position: absolute; left: 48px; top: 64px; \}/);

const styled = commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'subject',
  declarations: {
    'background-color': '#f7c6d9',
    color: '#432033',
    padding: '10px',
  },
});
assert.equal(styled.changed, true);
assert.equal(styled.reason, 'managed-css');
assert.equal(adapter.getBlockField('html', 'subject', 'STYLE'), '');
assert.equal(
  adapter.getBlockField('html', 'subject', '__R20_PRESERVED_ATTRS'),
  '[["data-hook","subject"]]',
);
const styledCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.match(styledCss, /\.sheet-r20-node-subject \{[^}]*position: absolute;/);
assert.match(styledCss, /\.sheet-r20-node-subject \{[^}]*background-color: #f7c6d9;/);
assert.match(styledCss, /\.sheet-r20-node-subject \{[^}]*color: #432033;/);
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'subject'), {
  position: 'absolute',
  left: '48px',
  top: '64px',
  'background-color': '#f7c6d9',
  color: '#432033',
  padding: '10px',
});

const movedAfterStyle = commitManagedDesignPosition(adapter, {
  workspace: 'html',
  blockId: 'subject',
  left: 96,
  top: 112,
  containingBlockId: 'frame',
  containingBlockNeedsRelative: false,
});
assert.equal(movedAfterStyle.moved, true);
const movedStyledCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.equal(
  movedStyledCss.match(/\.sheet-r20-node-subject\.sheet-r20-node-subject\.sheet-r20-node-subject\.sheet-r20-node-subject/g)?.length,
  1,
);
assert.match(movedStyledCss, /\.sheet-r20-node-subject \{[^}]*left: 96px;[^}]*top: 112px;/);
assert.match(movedStyledCss, /\.sheet-r20-node-subject \{[^}]*background-color: #f7c6d9;/);

const clearedStyle = commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'subject',
  declarations: { 'background-color': null },
});
assert.equal(clearedStyle.changed, true);
const clearedCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.doesNotMatch(clearedCss, /background-color: #f7c6d9/);
assert.match(clearedCss, /color: #432033/);

const hoverStyled = commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'stateful',
  state: 'hover',
  declarations: {
    'background-color': '#d96b91',
    color: '#ffffff',
  },
});
assert.equal(hoverStyled.changed, true);
assert.equal(adapter.getBlockField('html', 'stateful', 'STYLE'), '');
assert.equal(adapter.getBlockField('html', 'stateful', '__R20_PRESERVED_ATTRS'), '');
const hoverCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.match(hoverCss, /\.sheet-r20-node-stateful \{[^}]*background-color: #334455;[^}]*color: #ffffff;/);
assert.match(hoverCss, /\.sheet-r20-node-stateful:hover \{[^}]*background-color: #d96b91;[^}]*color: #ffffff;/);
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'stateful', 'base'), {
  'background-color': '#334455',
  color: '#ffffff',
});
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'stateful', 'hover'), {
  'background-color': '#d96b91',
  color: '#ffffff',
});

commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'stateful',
  state: 'active',
  declarations: { 'box-shadow': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' },
});
commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'stateful',
  state: 'focus',
  declarations: { 'outline-color': '#d96b91', 'outline-width': '2px' },
});
const interactiveStateCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.match(interactiveStateCss, /\.sheet-r20-node-stateful:active \{[^}]*box-shadow: inset 0 2px 4px rgba\(0, 0, 0, 0\.2\);/);
assert.match(interactiveStateCss, /\.sheet-r20-node-stateful:focus \{[^}]*outline-color: #d96b91;[^}]*outline-width: 2px;/);
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'stateful', 'active'), {
  'box-shadow': 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
});
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'stateful', 'focus'), {
  'outline-color': '#d96b91',
  'outline-width': '2px',
});

const hoverCleared = commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'stateful',
  state: 'hover',
  declarations: {
    'background-color': null,
    color: null,
  },
});
assert.equal(hoverCleared.changed, true);
const hoverClearedCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.doesNotMatch(hoverClearedCss, /\.sheet-r20-node-stateful:hover/);
assert.match(hoverClearedCss, /\.sheet-r20-node-stateful \{[^}]*background-color: #334455;/);

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

const templateStyled = commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'template-row',
  declarations: {
    'background-color': '#f8d7e3',
    padding: '8px 10px',
  },
});
assert.equal(templateStyled.changed, true);
const templateCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.match(
  templateCss,
  /\.sheet-rolltemplate-proof \.sheet-r20-node-template-row\.sheet-r20-node-template-row\.sheet-r20-node-template-row\.sheet-r20-node-template-row, \.sheet-rolltemplate-proof \.sheet-r20-node-template-row \{/,
);
assert.doesNotMatch(templateCss, /^\.sheet-r20-node-template-row/m);
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'template-row'), {
  'background-color': '#f8d7e3',
  padding: '8px 10px',
});

assert.equal(canManageDesignStyle(adapter, 'html', 'template'), true);
const templateCardStyled = commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'template',
  declarations: {
    'background-color': '#fff6f9',
    color: '#5d2f40',
    padding: '0',
    'border-radius': '6px',
  },
});
assert.equal(templateCardStyled.changed, true);
assert.equal(templateCardStyled.designClass, 'sheet-rolltemplate-proof');
assert.equal(adapter.getBlockField('html', 'template', 'STYLE'), '');
const templateCardCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.match(
  templateCardCss,
  /\.sheet-rolltemplate-proof\.sheet-rolltemplate-proof\.sheet-rolltemplate-proof\.sheet-rolltemplate-proof, \.sheet-rolltemplate-proof \{[^}]*background-color: #fff6f9;/,
);
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'template'), {
  'background-color': '#fff6f9',
  color: '#5d2f40',
  padding: '0',
  'border-radius': '6px',
});

const templateRowHover = commitManagedDesignStyle(adapter, {
  workspace: 'html',
  blockId: 'template-row',
  state: 'hover',
  declarations: { 'background-color': '#f2fbf7' },
});
assert.equal(templateRowHover.changed, true);
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'template-row', 'hover'), {
  'background-color': '#f2fbf7',
});

adapter.setBlockField('html', 'template', 'NAME', 'renamed');
const migratedTemplate = migrateManagedRolltemplateStyleScope(
  adapter,
  'template',
  'proof',
  'renamed',
);
assert.deepEqual(migratedTemplate, { changed: true, migratedRules: 3 });
const renamedTemplateCss = adapter.getBlockField('css', 'managed-css', 'CSS') ?? '';
assert.doesNotMatch(renamedTemplateCss, /\.sheet-rolltemplate-proof \.sheet-r20-node-template-row/);
assert.match(renamedTemplateCss, /\.sheet-rolltemplate-renamed \.sheet-r20-node-template-row/);
assert.match(renamedTemplateCss, /\.sheet-rolltemplate-renamed \.sheet-r20-node-template-row:hover/);
assert.doesNotMatch(renamedTemplateCss, /^\.sheet-rolltemplate-proof(?:\.|\s|,)/m);
assert.match(renamedTemplateCss, /^\.sheet-rolltemplate-renamed\.sheet-rolltemplate-renamed/m);
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'template-row'), {
  'background-color': '#f8d7e3',
  padding: '8px 10px',
});
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'template-row', 'hover'), {
  'background-color': '#f2fbf7',
});
assert.deepEqual(readManagedDesignStyle(adapter, 'html', 'template'), {
  'background-color': '#fff6f9',
  color: '#5d2f40',
  padding: '0',
  'border-radius': '6px',
});

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

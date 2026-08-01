import assert from 'node:assert/strict';
import type { BlockSnapshot } from '../../blockly/adapter';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize';
import {
  collectSectionLayoutTargets,
  getSectionLayout,
  SECTION_LAYOUTS,
  sectionLayoutMatches,
} from '../sectionLayouts';

assert.deepEqual(SECTION_LAYOUTS.map((layout) => layout.id), [
  'stack',
  'row',
  'columns',
  'sidebar',
]);

const sidebar = getSectionLayout('sidebar');
assert.equal(sidebar.parts.root.display, 'grid');
assert.equal(sidebar.parts.root['flex-direction'], null);
assert.equal(sidebar.parts.root['grid-template-columns'], 'minmax(0, 2fr) minmax(0, 1fr)');
assert.equal(sidebar.parts.header['grid-column'], '1 / -1');
assert.equal(sectionLayoutMatches({
  display: 'grid',
  'grid-template-columns': 'minmax(0, 2fr) minmax(0, 1fr)',
  'grid-auto-flow': 'row',
  gap: '12px',
  'align-items': 'stretch',
  'justify-content': 'stretch',
}, sidebar), true);
assert.equal(sectionLayoutMatches({
  display: 'grid',
  'flex-direction': 'column',
  'grid-template-columns': 'minmax(0, 2fr) minmax(0, 1fr)',
  'grid-auto-flow': 'row',
  gap: '12px',
  'align-items': 'stretch',
  'justify-content': 'stretch',
}, sidebar), false);

const nodes = [
  node('root', 'r20_section', null),
  node('title', 'r20_heading', 'root'),
  node('eyebrow', 'r20_static_text', 'root'),
  node('body', 'r20_static_text', 'root'),
  node('nested', 'r20_section', 'root'),
  node('nested-title', 'r20_heading', 'nested'),
];
const classes = new Map([
  ['eyebrow', 'section-eyebrow'],
  ['body', 'body-copy'],
]);
assert.deepEqual(
  collectSectionLayoutTargets(nodes, 'root', (id) => classes.get(id) ?? ''),
  [
    { blockId: 'root', part: 'root' },
    { blockId: 'title', part: 'header' },
    { blockId: 'eyebrow', part: 'header' },
  ],
);

const css = [
  `.sheet-r20-node-root { display: ${sidebar.parts.root.display}; grid-template-columns: ${sidebar.parts.root['grid-template-columns']}; gap: 12px; }`,
  `.sheet-r20-node-title { grid-column: ${sidebar.parts.header['grid-column']}; }`,
].join('\n');
const modern = sanitizeRoll20SandboxCss(css);
const legacy = sanitizeForRoll20Legacy(css);
for (const token of ['display: grid', 'grid-template-columns', 'minmax(0, 2fr)', 'grid-column: 1 / -1']) {
  assert(modern.css.includes(token), `modern sanitize dropped ${token}`);
  assert(legacy.sanitized.includes(token), `legacy sanitize dropped ${token}`);
}

console.log('sectionLayouts.test PASS');

function node(id: string, type: string, layerParentId: string | null): BlockSnapshot {
  return {
    id,
    type,
    depth: layerParentId ? 1 : 0,
    childCount: 0,
    layerParentId,
    layerPreviousId: null,
    layerRelation: layerParentId ? 'child' : 'root',
    label: type,
    preview: '',
    category: null,
  };
}

import assert from 'node:assert/strict';
import type { BlockSnapshot } from '../../blockly/adapter';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize';
import {
  collectSectionCompositionTargets,
  getSectionComposition,
  SECTION_COMPOSITIONS,
  sectionCompositionMatches,
} from '../sectionCompositions';

assert.deepEqual(SECTION_COMPOSITIONS.map((compositionValue) => compositionValue.id), [
  'paper-stack',
  'rose-columns',
  'mint-sidebar',
  'ink-row',
]);

const mintSidebar = getSectionComposition('mint-sidebar');
assert.equal(mintSidebar.themeId, 'mint');
assert.equal(mintSidebar.layoutId, 'sidebar');

const nodes = [
  node('root', 'r20_section', null, 4),
  node('title', 'r20_heading', 'root'),
  node('body', 'r20_static_text', 'root'),
  node('helper', 'r20_element_container', 'root', 1),
  node('helper-title', 'r20_heading', 'helper'),
  node('nested-panel', 'r20_section', 'root', 1),
  node('nested-title', 'r20_heading', 'nested-panel'),
];
const classes = new Map([
  ['body', 'body-copy'],
  ['helper', 'helper-wrap'],
  ['nested-panel', 'profile-panel'],
]);
const targets = collectSectionCompositionTargets(
  nodes,
  'root',
  (id) => classes.get(id) ?? '',
  mintSidebar,
);
const byId = new Map(targets.map((target) => [target.blockId, target.declarations]));

assert.deepEqual(targets.map((target) => target.blockId), ['root', 'title', 'helper-title']);
assert.equal(byId.get('root')?.['background-color'], '#f2fbf7');
assert.equal(byId.get('root')?.display, 'grid');
assert.equal(byId.get('root')?.['grid-template-columns'], 'minmax(0, 2fr) minmax(0, 1fr)');
assert.equal(byId.get('title')?.color, '#24715b');
assert.equal(byId.get('title')?.['grid-column'], '1 / -1');
assert.equal(byId.get('helper-title')?.color, '#24715b');
assert.equal(byId.get('helper-title')?.['grid-column'], undefined);
assert.equal(byId.has('body'), false);
assert.equal(byId.has('nested-title'), false);

assert.equal(sectionCompositionMatches({
  'background-image': 'none',
  'border-style': 'solid',
  padding: '16px',
  'background-color': '#f2fbf7',
  color: '#245648',
  'border-width': '1px',
  'border-color': '#86c9b3',
  'border-radius': '4px',
  'box-shadow': 'inset 4px 0 0 #4ea88b',
  display: 'grid',
  'grid-template-columns': 'minmax(0, 2fr) minmax(0, 1fr)',
  'grid-auto-flow': 'row',
  gap: '12px',
  'align-items': 'stretch',
  'justify-content': 'stretch',
}, mintSidebar), true);
assert.equal(sectionCompositionMatches({
  'background-color': '#f2fbf7',
  display: 'grid',
}, mintSidebar), false);

const css = targets.map((target) => (
  `.sheet-r20-node-${target.blockId} { ${Object.entries(target.declarations)
    .filter(([, value]) => value != null)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ')} }`
)).join('\n');
const modern = sanitizeRoll20SandboxCss(css);
const legacy = sanitizeForRoll20Legacy(css);
for (const token of [
  'background-color: #f2fbf7',
  'display: grid',
  'minmax(0, 2fr)',
  'grid-column: 1 / -1',
]) {
  assert(modern.css.includes(token), `modern sanitize dropped ${token}`);
  assert(legacy.sanitized.includes(token), `legacy sanitize dropped ${token}`);
}

console.log('sectionCompositions.test PASS');

function node(
  id: string,
  type: string,
  layerParentId: string | null,
  childCount = 0,
): BlockSnapshot {
  return {
    id,
    type,
    depth: layerParentId ? 1 : 0,
    childCount,
    layerParentId,
    layerPreviousId: null,
    layerRelation: layerParentId ? 'child' : 'root',
    label: type,
    preview: '',
    category: null,
  };
}

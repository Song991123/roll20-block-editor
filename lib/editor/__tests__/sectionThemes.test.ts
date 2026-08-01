import assert from 'node:assert/strict';
import type { BlockSnapshot } from '../../blockly/adapter';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize';
import {
  classifySectionThemePart,
  collectSectionThemeTargets,
  getSectionTheme,
} from '../sectionThemes';

assert.equal(classifySectionThemePart('r20_heading', ''), 'title');
assert.equal(classifySectionThemePart('r20_static_text', 'section-title'), 'title');
assert.equal(classifySectionThemePart('r20_static_text', 'section-eyebrow'), 'eyebrow');
assert.equal(classifySectionThemePart('r20_static_text', 'field-label'), null);

const nodes = [
  node('root', 'r20_div', null),
  node('title', 'r20_heading', 'root'),
  node('row', 'r20_row', 'root'),
  node('eyebrow', 'r20_static_text', 'row'),
  node('field-label', 'r20_static_text', 'row'),
  node('nested', 'r20_div', 'root'),
  node('nested-title', 'r20_heading', 'nested'),
];
const classes = new Map([
  ['title', 'section-title'],
  ['eyebrow', 'section-eyebrow'],
  ['field-label', 'field-label'],
  ['nested', 'nested-panel'],
  ['nested-title', 'section-title'],
]);
assert.deepEqual(
  collectSectionThemeTargets(nodes, 'root', (id) => classes.get(id) ?? ''),
  [
    { blockId: 'root', part: 'root' },
    { blockId: 'title', part: 'title' },
    { blockId: 'eyebrow', part: 'eyebrow' },
  ],
);

const rose = getSectionTheme('rose');
assert.equal(rose.parts.root['background-color'], '#fff2f6');
assert.equal(rose.parts.title['background-color'], '#d96b91');
assert.equal(rose.parts.title.color, '#ffffff');

const themeCss = [
  `.sheet-r20-node-root { background-color: ${rose.parts.root['background-color']}; border-color: ${rose.parts.root['border-color']}; }`,
  `.sheet-r20-node-title { background-color: ${rose.parts.title['background-color']}; color: ${rose.parts.title.color}; }`,
].join('\n');
const modern = sanitizeRoll20SandboxCss(themeCss);
const legacy = sanitizeForRoll20Legacy(themeCss);
for (const color of ['#fff2f6', '#d96b91', '#ffffff']) {
  assert(modern.css.includes(color), `modern sanitize dropped section theme color ${color}`);
  assert(legacy.sanitized.includes(color), `legacy sanitize dropped section theme color ${color}`);
}

console.log('sectionThemes.test PASS');

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

import assert from 'node:assert/strict';
import type { BlockSnapshot } from '../../blockly/adapter';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize';
import {
  classifyResultCardThemePart,
  collectResultCardThemeTargets,
  getResultCardTheme,
} from '../resultCardThemes';

assert.equal(classifyResultCardThemePart('r20_heading', ''), 'title');
assert.equal(classifyResultCardThemePart('r20_rolltemplate_row', 'result-row'), 'row');
assert.equal(classifyResultCardThemePart('r20_static_text', 'result-label'), 'label');
assert.equal(classifyResultCardThemePart('r20_static_text', 'result-value'), 'value');
assert.equal(classifyResultCardThemePart('r20_inline_bold', ''), null);
assert.equal(classifyResultCardThemePart('r20_static_text', 'ordinary-copy'), null);

const nodes = [
  node('root', 'r20_rolltemplate_define', null),
  node('title', 'r20_heading', 'root'),
  node('row', 'r20_rolltemplate_row', 'root'),
  node('label', 'r20_span', 'row'),
  node('value', 'r20_inline_bold', 'row'),
  node('copy', 'r20_static_text', 'row'),
  node('bold-copy', 'r20_inline_bold', 'root'),
];
const classes = new Map([
  ['title', 'result-title'],
  ['row', 'result-row'],
]);
assert.deepEqual(
  collectResultCardThemeTargets(nodes, 'root', (id) => classes.get(id) ?? ''),
  [
    { blockId: 'root', part: 'root' },
    { blockId: 'title', part: 'title' },
    { blockId: 'row', part: 'row' },
    { blockId: 'label', part: 'label' },
    { blockId: 'value', part: 'value' },
  ],
);

const mint = getResultCardTheme('mint');
assert.equal(mint.parts.root['background-color'], '#f6fcf9');
assert.equal(mint.parts.title['background-color'], '#4ea88b');
assert.equal(mint.parts.row['background-color'], '#f2fbf7');
assert.equal(mint.parts.value.color, '#24715b');

const rose = getResultCardTheme('rose');
const themeCss = [
  `.sheet-rolltemplate-proof { background-color: ${rose.parts.root['background-color']}; border-color: ${rose.parts.root['border-color']}; }`,
  `.sheet-rolltemplate-proof .sheet-result-title { background-color: ${rose.parts.title['background-color']}; color: ${rose.parts.title.color}; }`,
  `.sheet-rolltemplate-proof .sheet-result-row { background-color: ${rose.parts.row['background-color']}; border-color: ${rose.parts.row['border-color']}; }`,
  `.sheet-rolltemplate-proof .sheet-result-value { color: ${rose.parts.value.color}; }`,
].join('\n');
const modern = sanitizeRoll20SandboxCss(themeCss);
const legacy = sanitizeForRoll20Legacy(themeCss);
for (const color of ['#fff6f9', '#d96b91', '#fff2f6', '#9f3158']) {
  assert(modern.css.includes(color), `modern sanitize dropped theme color ${color}`);
  assert(legacy.sanitized.includes(color), `legacy sanitize dropped theme color ${color}`);
}
assert(modern.css.includes('.sheet-rolltemplate-proof'), 'modern sanitize lost the result-card scope');
assert(legacy.sanitized.includes('.sheet-rolltemplate-proof'), 'legacy sanitize lost the result-card scope');

console.log('resultCardThemes.test PASS');

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

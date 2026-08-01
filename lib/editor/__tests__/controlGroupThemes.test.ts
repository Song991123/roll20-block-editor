import assert from 'node:assert/strict';
import type { BlockSnapshot } from '../../blockly/adapter';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize';
import {
  classifyControlGroupThemePart,
  collectControlGroupThemeTargets,
  getControlGroupTheme,
  hasControlGroupThemeContent,
  isControlGroupThemeRoot,
} from '../controlGroupThemes';

assert.equal(classifyControlGroupThemePart('r20_label', ''), 'label');
assert.equal(classifyControlGroupThemePart('r20_static_text', 'field-label'), 'label');
assert.equal(classifyControlGroupThemePart('r20_text_input', ''), 'control');
assert.equal(classifyControlGroupThemePart('r20_select', ''), 'control');
assert.equal(classifyControlGroupThemePart('r20_checkbox', ''), null);
assert.equal(classifyControlGroupThemePart('r20_hidden_input', ''), null);
assert.equal(classifyControlGroupThemePart('r20_roll_button_easy', ''), 'action');
assert.equal(classifyControlGroupThemePart('r20_static_text', 'body-copy'), null);
assert.equal(isControlGroupThemeRoot('r20_row', ''), true);
assert.equal(isControlGroupThemeRoot('r20_div', 'field-row'), true);
assert.equal(isControlGroupThemeRoot('r20_div', 'form-field'), true);
assert.equal(isControlGroupThemeRoot('r20_div', 'sheet-frame'), false);

const nodes = [
  node('root', 'r20_row', null),
  node('label', 'r20_static_text', 'root'),
  node('input', 'r20_text_input', 'root'),
  node('checkbox', 'r20_checkbox', 'root'),
  node('button', 'r20_roll_button_easy', 'root'),
  node('nested-row', 'r20_row', 'root'),
  node('nested-input', 'r20_text_input', 'nested-row'),
  node('wrapper', 'r20_label_container', 'root'),
  node('wrapped-label', 'r20_label', 'wrapper'),
  node('wrapped-control', 'r20_textarea', 'wrapper'),
];
const classes = new Map([
  ['label', 'field-label'],
  ['nested-row', 'nested-row'],
  ['wrapper', 'field-wrapper'],
]);
const targets = collectControlGroupThemeTargets(
  nodes,
  'root',
  (id) => classes.get(id) ?? '',
);
assert.deepEqual(targets, [
  { blockId: 'root', part: 'root' },
  { blockId: 'label', part: 'label' },
  { blockId: 'input', part: 'control' },
  { blockId: 'button', part: 'action' },
  { blockId: 'wrapped-label', part: 'label' },
  { blockId: 'wrapped-control', part: 'control' },
]);
assert.equal(hasControlGroupThemeContent(targets), true);
assert.equal(
  hasControlGroupThemeContent([{ blockId: 'root', part: 'root' }]),
  false,
);

const rose = getControlGroupTheme('rose');
assert.equal(rose.parts.root['background-color'], '#fff2f6');
assert.equal(rose.parts.control['border-color'], '#d96b91');
assert.equal(rose.parts.action['background-color'], '#d96b91');

const css = [
  `.sheet-r20-node-root { background-color: ${rose.parts.root['background-color']}; }`,
  `.sheet-r20-node-input { border-color: ${rose.parts.control['border-color']}; }`,
  `.sheet-r20-node-button { background-color: ${rose.parts.action['background-color']}; color: ${rose.parts.action.color}; }`,
].join('\n');
const modern = sanitizeRoll20SandboxCss(css);
const legacy = sanitizeForRoll20Legacy(css);
for (const color of ['#fff2f6', '#d96b91', '#ffffff']) {
  assert(modern.css.includes(color), `modern sanitize dropped control-group color ${color}`);
  assert(legacy.sanitized.includes(color), `legacy sanitize dropped control-group color ${color}`);
}

console.log('controlGroupThemes.test PASS');

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

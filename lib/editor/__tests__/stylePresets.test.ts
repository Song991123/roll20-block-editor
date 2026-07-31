import assert from 'node:assert/strict';
import { getLayerRole } from '../layerRoles';
import { getVisualStylePresetGroup, presetMatches } from '../stylePresets';

const section = getVisualStylePresetGroup(getLayerRole('r20_div'), 'r20_div');
assert.equal(section?.family, 'section');
assert.equal(section?.presets.length, 4);
assert.equal(section?.presets.find((item) => item.id === 'mint')?.declarations['box-shadow'], 'inset 4px 0 0 #4ea88b');

const rollButton = getVisualStylePresetGroup(
  getLayerRole('r20_roll_button'),
  'r20_roll_button',
);
assert.equal(rollButton?.family, 'button');
assert.equal(rollButton?.title, '주사위 버튼 모양');
assert.equal(rollButton?.presets.length, 4);
assert.equal(rollButton?.presets[0].declarations['background-image'], 'none');

const actionButton = getVisualStylePresetGroup(
  getLayerRole('r20_action_button'),
  'r20_action_button',
);
assert.equal(actionButton?.title, '버튼 모양');

const text = getVisualStylePresetGroup(getLayerRole('r20_heading'), 'r20_heading');
assert.equal(text?.family, 'text');
assert.equal(text?.presets.length, 3);

assert.equal(getVisualStylePresetGroup(getLayerRole('r20_text_input'), 'r20_text_input'), null);

const rose = rollButton?.presets.find((item) => item.id === 'rose');
assert(rose);
assert.equal(presetMatches({
  'background-color': '#d96b91',
  'background-image': 'none',
  color: '#ffffff',
  'border-width': '1px',
  'border-style': 'solid',
  'border-color': '#b94f75',
  'border-radius': '6px',
  padding: '7px 14px',
  'font-size': '14px',
  'font-weight': '700',
  'line-height': '1.25',
  'box-shadow': '0 2px 0 #963653',
  'text-shadow': 'none',
}, rose), true);
assert.equal(presetMatches({ 'background-color': '#ffffff' }, rose), false);

console.log('stylePresets.test PASS');

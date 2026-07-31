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

const control = getVisualStylePresetGroup(getLayerRole('r20_text_input'), 'r20_text_input');
assert.equal(control?.family, 'control');
assert.equal(control?.title, '입력 칸 모양');
assert.equal(control?.presets.length, 4);
assert.equal(control?.presets.find((item) => item.id === 'soft')?.declarations['background-color'], '#fff2f6');

const numberControl = getVisualStylePresetGroup(getLayerRole('r20_number_input'), 'r20_number_input');
assert.equal(numberControl?.title, '숫자 칸 모양');
assert.equal(getVisualStylePresetGroup(getLayerRole('r20_checkbox'), 'r20_checkbox'), null);
assert.equal(getVisualStylePresetGroup(getLayerRole('r20_radio'), 'r20_radio'), null);

const result = getVisualStylePresetGroup(
  getLayerRole('r20_rolltemplate_row'),
  'r20_rolltemplate_row',
  'rolltemplate',
);
assert.equal(result?.family, 'result');
assert.equal(result?.title, '결과 행 모양');
assert.equal(result?.presets.length, 4);
assert.equal(result?.presets.find((item) => item.id === 'rose')?.declarations['box-shadow'], 'inset 3px 0 0 #d96b91');

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

import { strict as assert } from 'node:assert';
import {
  canMoveLayerDrop,
  canNestLayerChild,
  classifyLayerRole,
  getLayerRole,
  wouldCreateLayerCycle,
} from '../layerRoles.ts';

assert.equal(classifyLayerRole('r20_table'), 'table');
assert.equal(classifyLayerRole('r20_colgroup'), 'table');
assert.equal(classifyLayerRole('r20_table_col'), 'table');
assert.equal(getLayerRole('r20_table_col').canReceiveChildren, false);
assert.equal(getLayerRole('r20_table_caption').canReceiveChildren, false);
assert.equal(classifyLayerRole('r20_thead'), 'table');
assert.equal(classifyLayerRole('r20_tr'), 'table');
assert.equal(classifyLayerRole('r20_td'), 'table');
assert.equal(classifyLayerRole('r20_th'), 'table');

assert.equal(classifyLayerRole('r20_row'), 'flow');
assert.equal(classifyLayerRole('r20_col'), 'table');
assert.equal(classifyLayerRole('r20_colrow_n'), 'flow');

assert.equal(classifyLayerRole('r20_div'), 'frame');
assert.equal(classifyLayerRole('r20_element_container'), 'frame');
assert.equal(getLayerRole('r20_element_container').canReceiveChildren, true);
assert.equal(classifyLayerRole('r20_attr_with_txt_helper'), 'frame');
assert.equal(getLayerRole('r20_attr_with_txt_helper').canReceiveChildren, true);
assert.equal(classifyLayerRole('r20_repeating_section_wrapper'), 'frame');
assert.equal(classifyLayerRole('r20_value_switch_panel'), 'frame');
assert.equal(classifyLayerRole('r20_value_case'), 'frame');
assert.equal(classifyLayerRole('r20_list'), 'frame');
assert.equal(getLayerRole('r20_list').canReceiveChildren, true);
assert.equal(classifyLayerRole('r20_list_item'), 'flow');
assert.equal(getLayerRole('r20_list_item').canReceiveChildren, true);
assert.equal(classifyLayerRole('r20_toggle_on_area'), 'frame');
assert.equal(getLayerRole('r20_toggle_off_area').canReceiveChildren, true);
assert.equal(classifyLayerRole('r20_inline_bold'), 'text');
assert.equal(classifyLayerRole('r20_inline_italic'), 'text');
assert.equal(classifyLayerRole('r20_radio'), 'control');
assert.equal(classifyLayerRole('r20_template_invoke'), 'action');
assert.equal(classifyLayerRole('r20_on_sheet_opened'), 'runtime');
assert.equal(classifyLayerRole('r20_worker_if'), 'runtime');
assert.equal(classifyLayerRole('r20_get_attrs'), 'runtime');

assert.equal(classifyLayerRole('r20_text_input'), 'control');
assert.equal(classifyLayerRole('r20_attr_ref'), 'control');
assert.equal(classifyLayerRole('r20_attr_ref_max'), 'control');
assert.equal(classifyLayerRole('r20_attribute_card'), 'flow');
assert.equal(getLayerRole('r20_attribute_card').canReceiveChildren, false);
assert.equal(classifyLayerRole('r20_skill_row'), 'flow');
assert.equal(getLayerRole('r20_skill_row').canReceiveChildren, false);
assert.equal(getLayerRole('r20_value_switch_panel').canReceiveChildren, true);
assert.equal(getLayerRole('r20_value_case').canReceiveChildren, true);

assert.equal(classifyLayerRole('r20_roll_button'), 'action');
assert.equal(classifyLayerRole('r20_image'), 'media');
assert.equal(classifyLayerRole('r20_i18n_text'), 'text');
assert.equal(classifyLayerRole('r20_worker_script'), 'runtime');

assert.equal(getLayerRole('r20_div').label, '프레임');
assert.equal(getLayerRole('r20_row').label, '흐름');
assert.equal(getLayerRole('r20_table').label, '표');
assert.equal(getLayerRole('r20_text_input').label, '입력');
assert.equal(getLayerRole('r20_roll_button').label, '버튼');
assert.equal(getLayerRole('r20_i18n_text').label, '텍스트');
assert.equal(getLayerRole('r20_image').label, '이미지');
assert.equal(getLayerRole('r20_worker_script').label, '시트 동작');
assert.equal(getLayerRole('unknown_block').label, '기타');

assert.equal(canNestLayerChild('r20_roll_button', 'r20_td'), true);
assert.equal(canNestLayerChild('r20_td', 'r20_tr'), true);
assert.equal(canNestLayerChild('r20_roll_button', 'r20_tr'), false);
assert.equal(canNestLayerChild('r20_tr', 'r20_tbody'), true);
assert.equal(canNestLayerChild('r20_tbody', 'r20_table'), true);
assert.equal(canNestLayerChild('r20_div', 'r20_table'), false);
assert.equal(canNestLayerChild('r20_skill_row', 'r20_tbody'), true);
assert.equal(canNestLayerChild('r20_skill_row', 'r20_table'), true);
assert.equal(canNestLayerChild('r20_skill_row', 'r20_tr'), false);
assert.equal(canNestLayerChild('r20_attribute_card', 'r20_tr'), true);
assert.equal(canNestLayerChild('r20_attribute_card', 'r20_tbody'), false);
assert.equal(canNestLayerChild('r20_attribute_card', 'r20_table'), false);
assert.equal(canNestLayerChild('r20_list_item', 'r20_list'), true);
assert.equal(canNestLayerChild('r20_div', 'r20_list'), false);
assert.equal(canNestLayerChild('r20_list', 'r20_list_item'), true);
assert.equal(canNestLayerChild('r20_list_item', 'r20_list_item'), false);

const layerTree = [
  { id: 'root', layerParentId: null },
  { id: 'child', layerParentId: 'root' },
  { id: 'leaf', layerParentId: 'child' },
];
assert.equal(wouldCreateLayerCycle(layerTree, 'root', 'leaf'), true);
assert.equal(wouldCreateLayerCycle(layerTree, 'leaf', 'root'), false);
assert.equal(wouldCreateLayerCycle(layerTree, 'root', 'root'), true);

const structuredTree = [
  { id: 'table', type: 'r20_table', layerParentId: null },
  { id: 'body', type: 'r20_tbody', layerParentId: 'table' },
  { id: 'row-a', type: 'r20_tr', layerParentId: 'body' },
  { id: 'cell-a', type: 'r20_td', layerParentId: 'row-a' },
  { id: 'cell-b', type: 'r20_td', layerParentId: 'row-a' },
];
const tableNest = (movingId: string, targetId: string) => {
  const moving = structuredTree.find((node) => node.id === movingId);
  const target = structuredTree.find((node) => node.id === targetId);
  return Boolean(moving && target && canNestLayerChild(moving.type, target.type));
};
assert.equal(canMoveLayerDrop(structuredTree, 'cell-a', 'row-a', 'inside', tableNest), true);
assert.equal(canMoveLayerDrop(structuredTree, 'row-a', 'cell-a', 'inside', tableNest), false);
assert.equal(canMoveLayerDrop(structuredTree, 'cell-a', 'row-a', 'before', tableNest), false);
assert.equal(canMoveLayerDrop(structuredTree, 'cell-b', 'cell-a', 'after', tableNest), true);

console.log('layerRoles.test PASS');

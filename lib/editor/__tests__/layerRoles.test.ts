import { strict as assert } from 'node:assert';
import { classifyLayerRole, getLayerRole } from '../layerRoles.ts';

assert.equal(classifyLayerRole('r20_table'), 'table');
assert.equal(classifyLayerRole('r20_thead'), 'table');
assert.equal(classifyLayerRole('r20_tr'), 'table');
assert.equal(classifyLayerRole('r20_td'), 'table');
assert.equal(classifyLayerRole('r20_th'), 'table');

assert.equal(classifyLayerRole('r20_row'), 'flow');
assert.equal(classifyLayerRole('r20_col'), 'flow');
assert.equal(classifyLayerRole('r20_colrow_n'), 'flow');

assert.equal(classifyLayerRole('r20_div'), 'frame');
assert.equal(classifyLayerRole('r20_repeating_section_wrapper'), 'frame');

assert.equal(classifyLayerRole('r20_text_input'), 'control');
assert.equal(classifyLayerRole('r20_attr_ref'), 'control');
assert.equal(classifyLayerRole('r20_attr_ref_max'), 'control');
assert.equal(classifyLayerRole('r20_attribute_card'), 'control');
assert.equal(getLayerRole('r20_attribute_card').canReceiveChildren, false);

assert.equal(classifyLayerRole('r20_roll_button'), 'action');
assert.equal(classifyLayerRole('r20_image'), 'media');
assert.equal(classifyLayerRole('r20_i18n_text'), 'text');
assert.equal(classifyLayerRole('r20_worker_script'), 'runtime');

console.log('layerRoles.test PASS');

import assert from 'node:assert/strict';
import {
  customTextDecorationPalette,
  hasTextDecorationControls,
  readTextDecorationMode,
  readTextDecorationPalette,
  TEXT_DECORATION_PALETTES,
  textDecorationModePatch,
} from '../textDecorationStyle';

assert.equal(hasTextDecorationControls('r20_heading'), true);
assert.equal(hasTextDecorationControls('r20_label'), true);
assert.equal(hasTextDecorationControls('r20_static_text'), true);
assert.equal(hasTextDecorationControls('r20_i18n_text'), true);
assert.equal(hasTextDecorationControls('r20_text_node'), false);
assert.equal(hasTextDecorationControls('r20_rolltemplate_field_ref'), false);

assert.equal(readTextDecorationMode({}), 'plain');
assert.equal(readTextDecorationMode({
  'border-width': '0 0 2px 0',
  'border-style': 'solid',
}), 'underline');
assert.equal(readTextDecorationMode({
  'border-width': '0 0 0 4px',
  'border-style': 'solid',
}), 'side');
assert.equal(readTextDecorationMode({
  'background-color': '#fff2f6',
  'border-radius': '4px',
}), 'band');
assert.equal(readTextDecorationMode({
  'background-color': '#e8f7f1',
  'border-radius': '999px',
}), 'tag');

const mint = TEXT_DECORATION_PALETTES.find((palette) => palette.id === 'mint');
assert(mint);
assert.deepEqual(readTextDecorationPalette({ 'border-color': '#4ea88b' }), mint);
const side = textDecorationModePatch('side', mint);
assert.equal(side['border-width'], '0 0 0 4px');
assert.equal(side['border-style'], 'solid');
assert.equal(side['border-color'], '#4ea88b');
assert.equal(side['background-color'], 'transparent');
assert.equal(side.padding, '4px 8px');
const plain = textDecorationModePatch('plain', mint);
assert.equal(plain['border-color'], null);
assert.equal(plain.color, null);

const custom = customTextDecorationPalette('#336699');
assert.equal(custom.accent, '#336699');
assert.equal(custom.surface, 'rgba(51, 102, 153, 0.14)');
assert.match(custom.foreground, /^#[0-9a-f]{6}$/);
assert.equal(textDecorationModePatch('tag', custom)['border-radius'], '999px');

console.log('textDecorationStyle.test PASS');

import assert from 'node:assert/strict';
import {
  readSectionAccent,
  sectionAccentColorPatch,
  sectionAccentPatch,
  sectionAccentWidthPatch,
} from '../sectionDecorationStyle';

assert.deepEqual(readSectionAccent({}), {
  position: 'none',
  width: '4px',
  color: '#d96b91',
});

const left = sectionAccentPatch('left', '#4ea88b', '6px');
assert.equal(left['border-left-width'], '6px');
assert.equal(left['border-left-style'], 'solid');
assert.equal(left['border-left-color'], '#4ea88b');
assert.equal(left['border-top-width'], null);
assert.equal(left['border-right'], null);
assert.equal(left['border-bottom-color'], null);

assert.deepEqual(readSectionAccent({
  'border-left-width': '6px',
  'border-left-style': 'solid',
  'border-left-color': '#4ea88b',
}), {
  position: 'left',
  width: '6px',
  color: '#4ea88b',
});

assert.deepEqual(readSectionAccent({
  'border-left-width': '0',
  'border-left-style': 'solid',
  'border-bottom-width': 'thin',
  'border-bottom-color': '#595057',
}), {
  position: 'bottom',
  width: 'thin',
  color: '#595057',
});

assert.deepEqual(sectionAccentColorPatch({
  'border-top-width': '4px',
  'border-top-style': 'solid',
}, '#c9943e'), {
  'border-top-color': '#c9943e',
});
assert.deepEqual(sectionAccentColorPatch({}, '#c9943e'), {});

assert.deepEqual(sectionAccentWidthPatch({
  'border-right-width': '4px',
  'border-right-style': 'solid',
}, '2px'), {
  'border-right-width': '2px',
});
assert.deepEqual(sectionAccentWidthPatch({}, '2px'), {});

console.log('sectionDecorationStyle.test PASS');

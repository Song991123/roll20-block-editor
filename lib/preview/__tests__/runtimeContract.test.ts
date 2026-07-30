import { strict as assert } from 'node:assert';
import { runtimeCss } from '../runtime.ts';

assert.equal(
  runtimeCss.includes("display: none;\n  border: 0;\n  background: transparent;"),
  false,
  'runtime CSS must not hide repeating sections',
);
assert.match(runtimeCss, /\.charsheet\s+\[data-r20-preview-selected=/, 'selection overlay remains available');
assert.doesNotMatch(runtimeCss, /\.sheet-colrow-\d+/, 'builder column helpers are not global render CSS');
assert.doesNotMatch(runtimeCss, /\.sheet-spacer-(?:small|medium|large)/, 'builder spacer helpers are not global render CSS');
assert.doesNotMatch(runtimeCss, /\.sheet-(?:table|fieldset)/, 'builder table/fieldset helpers are not global render CSS');
assert.doesNotMatch(runtimeCss, /html\s*,\s*body|--r20-/, 'app document reset and tokens are not global render CSS');

console.log('Runtime contract test passed.');

import { strict as assert } from 'node:assert';
import { runtimeCss } from '../runtime.ts';

assert.equal(
  runtimeCss.includes("display: none;\n  border: 0;\n  background: transparent;"),
  false,
  'runtime CSS must not hide repeating sections',
);
assert.match(runtimeCss, /\.charsheet\s+\[data-r20-preview-selected=/, 'selection overlay remains available');

console.log('Runtime contract test passed.');

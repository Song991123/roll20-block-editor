import { strict as assert } from 'node:assert';
import { sanitizeRoll20SandboxCss } from '../../emit/roll20SandboxSanitize.ts';
import { sanitizeForRoll20Legacy } from '../../emit/sanitize.ts';
import {
  hasImageStyleControls,
  imageStyleResetPatch,
  normalizeImageObjectPosition,
} from '../imageStyle.ts';

assert.equal(hasImageStyleControls('r20_image'), true);
assert.equal(hasImageStyleControls('R20_IMAGE'), true);
assert.equal(hasImageStyleControls('r20_icon'), false);
assert.equal(hasImageStyleControls('r20_roll_button'), false);

assert.equal(normalizeImageObjectPosition('center'), 'center center');
assert.equal(normalizeImageObjectPosition('RIGHT BOTTOM'), 'right bottom');
assert.equal(normalizeImageObjectPosition('42% 12%'), null);

assert.deepEqual(imageStyleResetPatch(), {
  'object-fit': null,
  'object-position': null,
  opacity: null,
  'border-radius': null,
});

const managedCss = `.sheet-r20-node-image {
  object-fit: contain;
  object-position: right bottom;
  opacity: 0.5;
  border-radius: 8px;
}`;
const modern = sanitizeRoll20SandboxCss(managedCss);
assert.match(modern.css, /\.charsheet \.sheet-r20-node-image/);
assert.match(modern.css, /object-fit: contain/);
assert.match(modern.css, /object-position: right bottom/);
assert.match(modern.css, /opacity: 0\.5/);
assert.match(modern.css, /border-radius: 8px/);

const legacy = sanitizeForRoll20Legacy(managedCss);
assert.match(legacy.sanitized, /object-fit: contain/);
assert.match(legacy.sanitized, /object-position: right bottom/);
assert.match(legacy.sanitized, /opacity: 0\.5/);
assert.match(legacy.sanitized, /border-radius: 8px/);

console.log('imageStyle.test PASS');

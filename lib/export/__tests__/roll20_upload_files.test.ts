import assert from 'node:assert/strict';

import { prepareRoll20UploadFiles } from '../payload.ts';

const source = {
  html: '<div data-r20-block-id="internal"><input name="attr_name"></div>',
  css: '.sheet { position: fixed; transform: scale(1.1); }',
  translation: '{"name": "Name"}',
  warnings: [],
};

const modern = prepareRoll20UploadFiles(source);
assert.equal(modern.files.map((file) => file.name).join(','), 'sheet.html,sheet.css,translation.json');
assert.equal(modern.html.includes('data-r20-block-id'), false);
assert.equal(modern.files[0].content, modern.html);
assert.equal(modern.files[1].content, modern.css);
assert.equal(modern.files[2].content, modern.translation);
assert.equal(modern.legacyWarnings.length, 0);

const legacy = prepareRoll20UploadFiles(source, { legacy: true });
assert.ok(legacy.legacyWarnings.length > 0, 'legacy mode reports rewritten CSS');
assert.equal(legacy.files[1].content, legacy.css);
assert.equal(legacy.files[2].content, '{\n  "name": "Name"\n}');

console.log('roll20 upload file payload test PASS');

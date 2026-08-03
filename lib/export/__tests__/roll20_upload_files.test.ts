import assert from 'node:assert/strict';

import { prepareRoll20UploadFiles, stripUnsupportedPageScripts } from '../payload.ts';
import { ZIP_FILES } from '../types.ts';

const source = {
  html: [
    '<div data-r20-block-id="internal"><input name="attr_name"></div>',
    '<script>window.ordinaryProbe = true;</script>',
    '<script type="application/json">{"probe":true}</script>',
    '<script type="text/worker">on("sheet:opened", () => setAttrs({ ready: "1" }));</script>',
  ].join('\n'),
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
assert.equal(modern.removedUnsupportedScripts, 2);
assert.equal(modern.html.includes('ordinaryProbe'), false);
assert.equal(modern.html.includes('{"probe":true}'), false);
assert.match(modern.html, /<script type="text\/worker">/);
assert.match(modern.extraFiles?.[ZIP_FILES.UNSUPPORTED_SCRIPTS] ?? '', /ordinaryProbe/);
assert.match(modern.extraFiles?.[ZIP_FILES.UNSUPPORTED_SCRIPTS] ?? '', /application\/json/);

const stripped = stripUnsupportedPageScripts(source.html);
assert.equal(stripped.removed, 2);
assert.ok(
  stripped.source.indexOf('ordinaryProbe') < stripped.source.indexOf('application/json'),
  'unsupported script backup keeps source order',
);
assert.match(stripped.html, /text\/worker/);

const legacy = prepareRoll20UploadFiles(source, { legacy: true });
assert.ok(legacy.legacyWarnings.length > 0, 'legacy mode reports rewritten CSS');
assert.equal(legacy.files[1].content, legacy.css);
assert.equal(legacy.files[2].content, '{\n  "name": "Name"\n}');
assert.equal(legacy.removedUnsupportedScripts, 2);

console.log('roll20 upload file payload test PASS');

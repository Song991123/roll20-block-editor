import { strict as assert } from 'node:assert';
import {
  applyAssetReplacements,
  parseAssetReplacementMap,
} from './assetReplacements.mjs';

function testValidAndInvalidLines() {
  const parsed = parseAssetReplacementMap([
    '# local-only relink map',
    'https://imgur.com/dead => https://assets.example.com/live.png',
    'bad line without arrow',
  ].join('\n'));

  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].from, 'https://imgur.com/dead');
  assert.equal(parsed.entries[0].to, 'https://assets.example.com/live.png');
  assert.equal(parsed.warnings.length, 1);
}

function testHtmlAndCssReplacement() {
  const result = applyAssetReplacements(
    {
      html: '<img src="https://imgur.com/dead">',
      css: '.sheet-bg { background-image: url("https://imgsrv.roll20.net/?src=https://imgur.com/dead"); }',
    },
    'https://imgur.com/dead => https://assets.example.com/live.png',
  );

  assert.equal(result.replacements, 2);
  assert.match(result.html, /https:\/\/assets\.example\.com\/live\.png/);
  assert.match(result.css, /https:\/\/assets\.example\.com\/live\.png/);
}

function testInlineDraftNoteIsNotPartOfTarget() {
  const map = 'https://imgur.com/dead.png => https://i.imgur.com/dead.png # imgur-direct-image:verify-permission';
  const parsed = parseAssetReplacementMap(map);

  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].to, 'https://i.imgur.com/dead.png');

  const result = applyAssetReplacements(
    { html: '<img src="https://imgur.com/dead.png">', css: '' },
    map,
  );
  assert.equal(result.html, '<img src="https://i.imgur.com/dead.png">');
}

function testPlaceholderTargetWarning() {
  const map = 'https://old.example/a.png => <paste-user-owned-https-url-here>';
  const parsed = parseAssetReplacementMap(map);
  const result = applyAssetReplacements(
    { html: '<img src="https://old.example/a.png">', css: '' },
    map,
  );

  assert.equal(parsed.entries.length, 0);
  assert.equal(parsed.warnings.length, 1);
  assert.match(parsed.warnings[0].message, /placeholder target/);
  assert.equal(result.replacements, 0);
  assert.match(result.html, /https:\/\/old\.example\/a\.png/);
}

function testUnsafeAndDuplicateTargets() {
  const parsed = parseAssetReplacementMap([
    'https://old.example/a.png => javascript:alert(1)',
    'https://old.example/b.png => https://assets.example.com/b.png',
    'https://old.example/b.png => https://assets.example.com/b2.png',
  ].join('\n'));

  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].from, 'https://old.example/b.png');
  assert.equal(parsed.warnings.length, 2);
}

testValidAndInvalidLines();
testHtmlAndCssReplacement();
testInlineDraftNoteIsNotPartOfTarget();
testPlaceholderTargetWarning();
testUnsafeAndDuplicateTargets();
console.log('scripts/lib/assetReplacements.test PASS');

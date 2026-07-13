import { strict as assert } from 'node:assert';
import {
  applyAssetReplacements,
  parseAssetReplacementMap,
  summarizeAssetReplacementReadiness,
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

function testRoll20ReadinessSummary() {
  const summary = summarizeAssetReplacementReadiness([
    'https://old.example/a.png => https://assets.example.com/a.png',
    'https://old.example/b.png => //assets.example.com/b.png',
    'https://old.example/c.png => data:image/png;base64,aaa',
    'https://old.example/d.png => local/d.png',
    'https://old.example/e.png => <paste-user-owned-https-url-here>',
  ].join('\n'));

  assert.equal(summary.entries, 4);
  assert.equal(summary.roll20ReadyTargets, 2);
  assert.equal(summary.localOnlyTargets, 2);
  assert.equal(summary.placeholderTargets, 1);
  assert.equal(summary.hasLocalOnlyTargets, true);
  assert.equal(summary.hasPlaceholderTargets, true);
}

testValidAndInvalidLines();
testHtmlAndCssReplacement();
testInlineDraftNoteIsNotPartOfTarget();
testPlaceholderTargetWarning();
testUnsafeAndDuplicateTargets();
testRoll20ReadinessSummary();
console.log('scripts/lib/assetReplacements.test PASS');

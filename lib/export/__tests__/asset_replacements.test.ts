import { strict as assert } from 'node:assert';
import {
  applyAssetReplacements,
  parseAssetReplacementMap,
  summarizeAssetReplacementReadiness,
} from '../asset_replacements.ts';

function testValidAndInvalidLines(): void {
  const map = [
    '# user local-only replacements',
    'https://imgur.com/dead => https://assets.example.com/live.png',
    'bad line without arrow',
  ].join('\n');
  const parsed = parseAssetReplacementMap(map);
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].from, 'https://imgur.com/dead');
  assert.equal(parsed.entries[0].to, 'https://assets.example.com/live.png');
  assert.equal(parsed.warnings.length, 1);
}

function testHtmlAndCssReplacement(): void {
  const html = `<img src="https://imgur.com/dead">`;
  const css = `.sheet-bg { background-image: url("https://imgsrv.roll20.net/?src=https://imgur.com/dead"); }`;
  const result = applyAssetReplacements(
    { html, css },
    'https://imgur.com/dead => https://assets.example.com/live.png',
  );
  assert.equal(result.replacements, 2);
  assert.match(result.html, /https:\/\/assets\.example\.com\/live\.png/);
  assert.match(result.css, /https:\/\/assets\.example\.com\/live\.png/);
}

function testInlineDraftNoteIsNotPartOfTarget(): void {
  const parsed = parseAssetReplacementMap(
    'https://imgur.com/dead.png => https://i.imgur.com/dead.png # imgur-direct-image:verify-permission',
  );
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.entries[0].to, 'https://i.imgur.com/dead.png');

  const result = applyAssetReplacements(
    { html: '<img src="https://imgur.com/dead.png">', css: '' },
    'https://imgur.com/dead.png => https://i.imgur.com/dead.png # imgur-direct-image:verify-permission',
  );
  assert.equal(result.html, '<img src="https://i.imgur.com/dead.png">');
}

function testUnsafeTargetWarning(): void {
  const parsed = parseAssetReplacementMap('https://old.example/a.png => javascript:alert(1)');
  assert.equal(parsed.entries.length, 0);
  assert.equal(parsed.warnings.length, 1);
}

function testPlaceholderTargetWarning(): void {
  for (const placeholder of [
    '<paste-user-owned-https-url-here>',
    '<여기에-사용자-소유-HTTPS-주소-입력>',
  ]) {
    const map = `https://old.example/a.png => ${placeholder}`;
    const parsed = parseAssetReplacementMap(map);
    assert.equal(parsed.entries.length, 0);
    assert.equal(parsed.warnings.length, 1);
    assert.match(parsed.warnings[0].message, /미입력 주소/);

    const result = applyAssetReplacements({ html: '<img src="https://old.example/a.png">', css: '' }, map);
    assert.equal(result.replacements, 0);
    assert.match(result.html, /https:\/\/old\.example\/a\.png/);

    const summary = summarizeAssetReplacementReadiness(map);
    assert.equal(summary.entries, 0);
    assert.equal(summary.placeholderTargets, 1);
    assert.equal(summary.hasPlaceholderTargets, true);
  }
}

function testRoll20ReadinessSummary(): void {
  const summary = summarizeAssetReplacementReadiness([
    'https://old.example/a.png => https://assets.example.com/a.png',
    'https://old.example/b.png => //assets.example.com/b.png',
    'https://old.example/c.png => data:image/png;base64,aaa',
    'https://old.example/d.png => local/d.png',
  ].join('\n'));
  assert.equal(summary.entries, 4);
  assert.equal(summary.roll20ReadyTargets, 1);
  assert.equal(summary.localOnlyTargets, 3);
  assert.equal(summary.riskyRoll20Targets, 0);
  assert.equal(summary.placeholderTargets, 0);
  assert.equal(summary.hasLocalOnlyTargets, true);
  assert.equal(summary.hasRiskyRoll20Targets, false);
  assert.equal(summary.hasPlaceholderTargets, false);
}

function testRiskyRoll20TargetSummary(): void {
  const summary = summarizeAssetReplacementReadiness([
    'https://old.example/a.png => https://imgur.com/dead',
    'https://old.example/b.png => https://imgsrv.roll20.net/?src=https://imgur.com/dead',
    'https://old.example/c.png => https://i.imgur.com/live.png',
  ].join('\n'));
  assert.equal(summary.entries, 3);
  assert.equal(summary.roll20ReadyTargets, 3);
  assert.equal(summary.localOnlyTargets, 0);
  assert.equal(summary.riskyRoll20Targets, 2);
  assert.equal(summary.hasRiskyRoll20Targets, true);
}

testValidAndInvalidLines();
testHtmlAndCssReplacement();
testInlineDraftNoteIsNotPartOfTarget();
testUnsafeTargetWarning();
testPlaceholderTargetWarning();
testRoll20ReadinessSummary();
testRiskyRoll20TargetSummary();
console.log('asset_replacements.test PASS');

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

function testUnsafeTargetWarning(): void {
  const parsed = parseAssetReplacementMap('https://old.example/a.png => javascript:alert(1)');
  assert.equal(parsed.entries.length, 0);
  assert.equal(parsed.warnings.length, 1);
}

function testRoll20ReadinessSummary(): void {
  const summary = summarizeAssetReplacementReadiness([
    'https://old.example/a.png => https://assets.example.com/a.png',
    'https://old.example/b.png => //assets.example.com/b.png',
    'https://old.example/c.png => data:image/png;base64,aaa',
    'https://old.example/d.png => local/d.png',
  ].join('\n'));
  assert.equal(summary.entries, 4);
  assert.equal(summary.roll20ReadyTargets, 2);
  assert.equal(summary.localOnlyTargets, 2);
  assert.equal(summary.hasLocalOnlyTargets, true);
}

testValidAndInvalidLines();
testHtmlAndCssReplacement();
testUnsafeTargetWarning();
testRoll20ReadinessSummary();
console.log('asset_replacements.test PASS');

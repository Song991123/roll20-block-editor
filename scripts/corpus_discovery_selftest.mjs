#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import {
  createAnonymousCaseId,
  discoverCorpusCases,
  extractGenericFeatures,
  resolveCompatibilityMode,
  sanitizeCorpusCase,
  sanitizeDiscoveryResult,
  validateCorpusRoots,
} from './lib/corpus_discovery.mjs';

const rootPath = await mkdtemp(join(tmpdir(), 'r20-corpus-discovery-'));

try {
  assert.throws(() => validateCorpusRoots([]), /non-empty array/);
  assert.throws(
    () =>
      validateCorpusRoots([
        { id: 'corpus-01', path: rootPath, mode: 'auto' },
        { id: 'corpus-01', path: rootPath, mode: 'modern' },
      ]),
    /repeats an id/,
  );
  assert.equal(resolveCompatibilityMode('auto'), 'both');
  assert.equal(resolveCompatibilityMode('auto', ['modern']), 'modern');
  assert.equal(resolveCompatibilityMode('auto', ['modern', 'legacy']), 'both');
  assert.equal(resolveCompatibilityMode('legacy'), 'legacy');

  const broadCasePath = join(rootPath, 'synthetic-broad-case');
  const broadAssetPath = join(broadCasePath, 'assets');
  await mkdir(broadAssetPath, { recursive: true });
  await writeFile(
    join(broadCasePath, 'sheet.html'),
    [
      '<main><form><fieldset class="repeating_items">',
      '<table><tr><td><input type="checkbox" name="attr_flag"></td></tr></table>',
      '<button type="roll" value="&{template:test}">Roll</button>',
      '<span data-i18n="label_key"></span>',
      '<img src="./assets/paper.png"><img src=./screenshot.png>',
      '</fieldset></form></main>',
      '<rolltemplate class="sheet-rolltemplate-test">{{value}}</rolltemplate>',
      '<script type="text/worker">on("change:flag", () => getAttrs(["flag"], () => {}));</script>',
    ].join(''),
    'utf8',
  );
  await writeFile(
    join(broadCasePath, 'sheet.css'),
    [
      ':root { --accent: #f08; background-image: url("./assets/paper.png"); }',
      '.icon { background: url("data:image/png;base64,AAAA"); }',
      '@media (min-width: 1px) { .sheet { display: block; } }',
      '@supports (display: grid) { .sheet { display: grid; } }',
      '@container sheet (min-width: 1px) { .sheet { display: block; } }',
      '@layer base { .sheet { color: black; } }',
      '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
      '@font-face { font-family: Local; src: url("./font.woff2"); }',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(broadCasePath, 'translation.json'),
    JSON.stringify({ label_key: 'Synthetic label' }),
    'utf8',
  );
  await writeFile(
    join(broadCasePath, 'worker.js'),
    [
      'on("sheet:opened", () => {',
      '  getAttrs(["flag"], (values) => setAttrs(values));',
      '  startRoll("[[1d20]]").then((result) => finishRoll(result.rollId));',
      '});',
    ].join('\n'),
    'utf8',
  );
  await writeFile(join(broadAssetPath, 'paper.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(join(broadCasePath, 'screenshot.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(join(broadCasePath, 'preview.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const legacyCasePath = join(rootPath, 'synthetic-legacy-case');
  await mkdir(legacyCasePath, { recursive: true });
  await writeFile(join(legacyCasePath, 'index.html'), '<section><input type="text"></section>', 'utf8');
  await writeFile(join(legacyCasePath, 'sheet.json'), JSON.stringify({ legacy: true }), 'utf8');

  const modernCasePath = join(rootPath, 'synthetic-modern-case');
  await mkdir(modernCasePath, { recursive: true });
  await writeFile(join(modernCasePath, 'index.htm'), '<div></div>', 'utf8');
  await writeFile(
    join(modernCasePath, 'compatibility.json'),
    JSON.stringify({ roll20Compatibility: 'modern' }),
    'utf8',
  );

  const manifestCasePath = join(rootPath, 'synthetic-manifest-case');
  await mkdir(manifestCasePath, { recursive: true });
  await writeFile(join(manifestCasePath, 'chosen.html'), '<main><input type="text"></main>', 'utf8');
  await writeFile(join(manifestCasePath, 'extra.html'), '<article>Not selected</article>', 'utf8');
  await writeFile(join(manifestCasePath, 'chosen.css'), 'main { color: black; }', 'utf8');
  await writeFile(join(manifestCasePath, 'extra.css'), 'article { color: red; }', 'utf8');
  await writeFile(join(manifestCasePath, 'capture.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await writeFile(
    join(manifestCasePath, 'sheet.json'),
    JSON.stringify({ html: 'chosen.html', css: 'chosen.css', preview: 'capture.png', legacy: 'false' }),
    'utf8',
  );

  const textCasePath = join(rootPath, 'synthetic-text-case');
  await mkdir(textCasePath, { recursive: true });
  await writeFile(
    join(textCasePath, 'layout.txt'),
    '<main><section><input name="attr_value"></section></main>',
    'utf8',
  );
  await writeFile(
    join(textCasePath, 'style.txt'),
    'main { color: black; }\nsection { display: block; }',
    'utf8',
  );

  const root = { id: 'corpus-01', path: rootPath, mode: 'auto' };
  const first = await discoverCorpusCases([root]);
  const second = await discoverCorpusCases([root]);
  assert.equal(first.cases.length, 5);
  assert.deepEqual(sanitizeDiscoveryResult(first), sanitizeDiscoveryResult(second));

  const broad = first.cases.find((entry) => entry.casePath === broadCasePath);
  const legacy = first.cases.find((entry) => entry.casePath === legacyCasePath);
  const modern = first.cases.find((entry) => entry.casePath === modernCasePath);
  const manifest = first.cases.find((entry) => entry.casePath === manifestCasePath);
  const textSource = first.cases.find((entry) => entry.casePath === textCasePath);
  assert.ok(broad);
  assert.ok(legacy);
  assert.ok(modern);
  assert.ok(manifest);
  assert.ok(textSource);

  assert.equal(broad.compatibility, 'both');
  assert.equal(legacy.compatibility, 'legacy');
  assert.equal(modern.compatibility, 'modern');
  assert.equal(manifest.compatibility, 'modern');
  assert.deepEqual(manifest.htmlPaths.map((filePath) => basename(filePath)), ['chosen.html']);
  assert.deepEqual(manifest.cssPaths.map((filePath) => basename(filePath)), ['chosen.css']);
  assert.deepEqual(manifest.referenceImagePaths.map((filePath) => basename(filePath)), ['capture.png']);
  assert.deepEqual(textSource.htmlPaths.map((filePath) => basename(filePath)), ['layout.txt']);
  assert.deepEqual(textSource.cssPaths.map((filePath) => basename(filePath)), ['style.txt']);
  assert.deepEqual(broad.referenceImagePaths.map((filePath) => basename(filePath)), ['preview.png']);
  assert.deepEqual(
    broad.assetImagePaths.map((filePath) => basename(filePath)).sort(),
    ['paper.png', 'screenshot.png'],
  );
  assert.equal(broad.translationPaths.length, 1);
  assert.equal(broad.workerPaths.length, 1);

  for (const feature of [
    'html:table',
    'html:form',
    'html:input-controls',
    'html:repeating-section',
    'html:rolltemplate',
    'translation:html-token',
    'translation:flat-map',
    'worker:inline-source',
    'worker:api-source',
    'worker:api:get-attrs',
    'worker:api:set-attrs',
    'worker:api:custom-roll',
    'asset:local-reference',
    'asset:data-url',
    'css:at-rule:media',
    'css:at-rule:supports',
    'css:at-rule:container',
    'css:at-rule:layer',
    'css:at-rule:keyframes',
    'css:at-rule:font-face',
    'css:custom-properties',
    'css:data-url',
    'reference:raster-image',
  ]) {
    assert.ok(broad.features.includes(feature), `missing feature ${feature}`);
  }

  const anonymousId = createAnonymousCaseId(broad, 'selftest-namespace');
  const sanitized = sanitizeCorpusCase(broad, { anonymousId });
  assert.match(anonymousId, /^case-[a-f0-9]{20}$/);
  assert.equal('relativeKey' in sanitized, false);
  assert.equal('rootId' in sanitized, false);
  assert.equal('casePath' in sanitized, false);
  assert.equal('htmlPaths' in sanitized, false);
  assert.equal(typeof sanitized.artifacts.referenceImage, 'boolean');

  const serialized = JSON.stringify(sanitized);
  for (const privateValue of [
    rootPath,
    'synthetic-broad-case',
    'sheet.html',
    'preview.png',
    'label_key',
    'attr_flag',
    'screenshot.png',
  ]) {
    assert.equal(serialized.includes(privateValue), false, `sanitized output leaked ${privateValue}`);
  }

  const directFeatures = extractGenericFeatures({
    html: '<table><tr><td><input type="text"></td></tr></table>',
    css: '@media (min-width: 1px) { :root { --size: 1px; } }',
    javascript: 'getSectionIDs("repeating_rows", () => {});',
  });
  assert.deepEqual([...directFeatures].sort(), directFeatures);
  assert.ok(directFeatures.includes('html:table'));
  assert.ok(directFeatures.includes('worker:api:get-section-ids'));

  console.log('corpus discovery self-test PASS');
} finally {
  await rm(rootPath, { recursive: true, force: true });
}

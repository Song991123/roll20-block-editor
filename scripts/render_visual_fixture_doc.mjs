#!/usr/bin/env node
/**
 * Render prepared visual fixtures through the same preview document builder used
 * by the app. This is the bridge between corpus reference images and later
 * browser screenshot / pixel-diff verification.
 *
 * Usage:
 *   node scripts/render_visual_fixture_doc.mjs [fixture_root] [out_dir] [fixture_id...]
 *
 * Defaults:
 *   fixture_root = test-fixtures/visual
 *   out_dir      = reports/visual-fixture-render
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_WEB = resolve(HERE, '..');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const fixtureRoot = resolve(args[0] ?? join(REPO_WEB, 'test-fixtures/visual'));
const outDir = resolve(args[1] ?? join(REPO_WEB, 'reports/visual-fixture-render'));
const requestedIds = new Set(args.slice(2));

if (!existsSync(fixtureRoot)) {
  console.error(`fixture root not found: ${fixtureRoot}`);
  process.exit(2);
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function readMaybe(path) {
  return existsSync(path) ? readText(path) : '';
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function resolveBuildDocModule() {
  const outRoot = join(REPO_WEB, '.tmp/visual-fixture-build');
  const compiled = join(outRoot, 'lib/preview/buildDoc.js');
  const tsPath = join(REPO_WEB, 'lib/preview/buildDoc.ts');
  const tscJs = join(REPO_WEB, 'node_modules/typescript/lib/tsc.js');

  if (!existsSync(tsPath)) throw new Error(`preview builder not found: ${tsPath}`);
  if (!existsSync(tscJs)) throw new Error(`TypeScript compiler not found: ${tscJs}`);

  execFileSync(process.execPath, [
    tscJs,
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'ES2020',
    '--outDir', outRoot,
    '--rootDir', REPO_WEB,
    'lib/preview/buildDoc.ts',
    '--esModuleInterop',
    '--skipLibCheck',
    '--noEmit', 'false',
    '--declaration', 'false',
  ], { cwd: REPO_WEB, stdio: 'pipe' });

  if (!existsSync(compiled)) {
    throw new Error(`preview builder compile did not produce ${compiled}`);
  }
  return compiled;
}

function listFixtures(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter((dir) => existsSync(join(dir, 'manifest.json')))
    .filter((dir) => requestedIds.size === 0 || requestedIds.has(basename(dir)))
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

function boolFromLegacyMode(value) {
  if (typeof value === 'boolean') return value;
  return true;
}

function countPattern(text, re) {
  let count = 0;
  while (re.exec(text)) count += 1;
  return count;
}

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'html'), { recursive: true });

const { buildSheetDoc } = require(resolveBuildDocModule());
if (typeof buildSheetDoc !== 'function') {
  throw new Error('compiled preview builder did not export buildSheetDoc');
}

const fixtures = listFixtures(fixtureRoot);
if (fixtures.length === 0) {
  console.error(`no prepared fixtures found in ${fixtureRoot}`);
  process.exit(2);
}

const results = [];
for (const fixtureDir of fixtures) {
  const fixtureId = basename(fixtureDir);
  const manifest = JSON.parse(readText(join(fixtureDir, 'manifest.json')));
  const html = readText(join(fixtureDir, 'source.html'));
  const css = readMaybe(join(fixtureDir, 'source.css'));
  const i18n = readMaybe(join(fixtureDir, 'source.i18n'));
  const legacyMode = boolFromLegacyMode(manifest.legacyMode);
  const rendered = buildSheetDoc({
    html,
    css,
    i18n,
    sanitize: legacyMode,
    darkMode: false,
    previewLayer: 'all',
  });
  const outHtml = join(outDir, 'html', `${fixtureId}.html`);
  writeFileSync(outHtml, rendered, 'utf8');

  results.push({
    fixtureId,
    corpus: manifest.corpus,
    relDir: manifest.relDir,
    legacyMode,
    htmlBytes: Buffer.byteLength(html),
    cssBytes: Buffer.byteLength(css),
    i18nBytes: Buffer.byteLength(i18n),
    renderedBytes: Buffer.byteLength(rendered),
    renderedSha256: sha256(rendered),
    reference: manifest.referenceRelativeToSheet ?? null,
    outputHtml: outHtml,
    staticHiddenTags: {
      sourceScriptTags: countPattern(html, /<script\b/gi),
      sourceRolltemplates: countPattern(html, /<rolltemplate\b/gi),
      outputHasPreviewHiddenCss: rendered.includes('id="r20-preview-hidden"'),
    },
  });
}

const summary = {
  generatedAt: new Date().toISOString(),
  fixtureRoot,
  outDir,
  count: results.length,
  results,
};

writeFileSync(join(outDir, 'visual-fixture-render.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

const lines = [
  '# Visual Fixture Render',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  'This report proves prepared visual fixtures can be rendered through `lib/preview/buildDoc.ts` into standalone preview HTML. It does not prove visual parity yet; screenshot capture and pixel comparison are the next step.',
  '',
  `Fixture count: ${results.length}`,
  '',
  '| Fixture | Corpus | Legacy sanitize | Source HTML | Source CSS | Rendered HTML | Reference | Hidden-layer static check |',
  '| --- | --- | ---: | ---: | ---: | ---: | --- | --- |',
];

for (const item of results) {
  const hidden = item.staticHiddenTags.outputHasPreviewHiddenCss
    ? `hidden css present; source script ${item.staticHiddenTags.sourceScriptTags}, rolltemplate ${item.staticHiddenTags.sourceRolltemplates}`
    : 'missing hidden css';
  lines.push(`| \`${item.fixtureId}\` | ${item.corpus} | ${item.legacyMode ? 'on' : 'off'} | ${item.htmlBytes} | ${item.cssBytes} | ${item.renderedBytes} | ${item.reference ?? ''} | ${hidden} |`);
}

lines.push('');
lines.push('Next check: open each generated HTML in a browser viewport, capture PNG, then compare against the reference image with a thresholded pixel-diff report.');

writeFileSync(join(outDir, 'visual-fixture-render.md'), `${lines.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({ count: results.length, report: join(outDir, 'visual-fixture-render.md') }));

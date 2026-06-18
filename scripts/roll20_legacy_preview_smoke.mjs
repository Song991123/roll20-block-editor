#!/usr/bin/env node
/**
 * Local smoke for the preview/edit legacy CSS toggle.
 *
 * It exercises buildSheetDoc (iframe preview) and buildSheetParts (Shadow/edit
 * preview) with copyright-safe synthetic input. This is not actual Roll20
 * visual parity; it proves the two local render paths consume the same
 * legacyCssSanitize option.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2).filter((arg) => arg !== '--');
const reportDir = resolve(argOf('--report-dir', 'reports/legacy-preview-smoke'));

function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const HTML = `
<div class="sheet-modern-card">
  <button type="roll" name="roll_test" value="/roll 1d20">Roll</button>
  <span data-i18n="hello">hello</span>
</div>
`.trim();

const CSS = `
:root { --accent: #c02030; }
.sheet-modern-card {
  position: sticky;
  transform: scale(0.92);
  animation: r20-fade 200ms ease-in-out;
  color: var(--accent);
}
.sheet-stable { padding: 8px; color: red; }
@keyframes r20-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
`.trim();

const I18N = JSON.stringify({ hello: 'translated' });

function compilePreviewModule() {
  const outRoot = join(REPO_ROOT, '.tmp/legacy-preview-smoke-build');
  const compiled = join(outRoot, 'lib/preview/buildDoc.js');
  const tsPath = join(REPO_ROOT, 'lib/preview/buildDoc.ts');
  const tscJs = join(REPO_ROOT, 'node_modules/typescript/lib/tsc.js');

  if (!existsSync(tsPath)) throw new Error(`preview builder not found: ${tsPath}`);
  if (!existsSync(tscJs)) throw new Error(`TypeScript compiler not found: ${tscJs}`);

  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });
  execFileSync(process.execPath, [
    tscJs,
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'ES2020',
    '--outDir', outRoot,
    '--rootDir', REPO_ROOT,
    'lib/preview/buildDoc.ts',
    '--esModuleInterop',
    '--skipLibCheck',
    '--noEmit', 'false',
    '--declaration', 'false',
  ], { cwd: REPO_ROOT, stdio: 'pipe' });

  if (!existsSync(compiled)) {
    throw new Error(`preview builder compile did not produce ${compiled}`);
  }
  return compiled;
}

function extractStyle(html, id) {
  const re = new RegExp(`<style id="${id}">([\\s\\S]*?)<\\/style>`);
  const match = re.exec(html);
  return match ? match[1] : '';
}

function extractStyleSourceChunk(css, source) {
  const marker = `/* r20-style-source:${source} */`;
  const start = css.indexOf(marker);
  if (start < 0) return '';
  const rest = css.slice(start + marker.length);
  const next = rest.indexOf('/* r20-style-source:');
  return next >= 0 ? rest.slice(0, next) : rest;
}

function assertCheck(checks, name, pass, details = {}) {
  checks.push({ name, pass: Boolean(pass), details });
}

function includesText(text, value) {
  return text.toLowerCase().includes(value.toLowerCase());
}

const { buildSheetDoc, buildSheetParts } = require(compilePreviewModule());
if (typeof buildSheetDoc !== 'function') throw new Error('buildSheetDoc missing');
if (typeof buildSheetParts !== 'function') throw new Error('buildSheetParts missing');

const modernDoc = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, sanitize: true, legacyCssSanitize: false });
const legacyDoc = buildSheetDoc({ html: HTML, css: CSS, i18n: I18N, sanitize: true, legacyCssSanitize: true });
const modernParts = buildSheetParts({ html: HTML, css: CSS, i18n: I18N, sanitize: true, legacyCssSanitize: false });
const legacyParts = buildSheetParts({ html: HTML, css: CSS, i18n: I18N, sanitize: true, legacyCssSanitize: true });

const modernUserCss = extractStyle(modernDoc, 'r20-user');
const legacyUserCss = extractStyle(legacyDoc, 'r20-user');
const modernShadowUserCss = extractStyleSourceChunk(modernParts.css, 'sheet-user-css');
const legacyShadowUserCss = extractStyleSourceChunk(legacyParts.css, 'sheet-user-css');
const checks = [];

assertCheck(checks, 'iframe modern keeps transform', includesText(modernUserCss, 'transform: scale(0.92)'));
assertCheck(checks, 'iframe modern keeps animation', includesText(modernUserCss, 'animation: r20-fade'));
assertCheck(checks, 'iframe legacy converts scale to zoom', includesText(legacyUserCss, 'zoom: 0.92'));
assertCheck(checks, 'iframe legacy removes transform declarations', !/transform\s*:/i.test(legacyUserCss));
assertCheck(checks, 'iframe legacy removes animation declarations', !/animation(?:-[a-z-]+)?\s*:/i.test(legacyUserCss));
assertCheck(checks, 'iframe legacy removes keyframes', !/@(?:-[a-z]+-)?keyframes\b/i.test(legacyUserCss));
assertCheck(checks, 'iframe legacy inlines CSS var', includesText(legacyUserCss, 'color: #c02030'));
assertCheck(checks, 'iframe legacy preserves stable CSS', includesText(legacyUserCss, 'padding: 8px') && includesText(legacyUserCss, 'color: red'));
assertCheck(checks, 'iframe runtime still hides scripts and rolltemplates after user CSS', modernDoc.indexOf('id="r20-preview-hidden"') > modernDoc.indexOf('id="r20-user"'));

assertCheck(checks, 'shadow modern keeps transform', includesText(modernShadowUserCss, 'transform: scale(0.92)'));
assertCheck(checks, 'shadow modern keeps animation', includesText(modernShadowUserCss, 'animation: r20-fade'));
assertCheck(checks, 'shadow legacy converts scale to zoom', includesText(legacyShadowUserCss, 'zoom: 0.92'));
assertCheck(checks, 'shadow legacy removes transform declarations', !/transform\s*:/i.test(legacyShadowUserCss));
assertCheck(checks, 'shadow legacy removes animation declarations', !/animation(?:-[a-z-]+)?\s*:/i.test(legacyShadowUserCss));
assertCheck(checks, 'shadow legacy removes keyframes', !/@(?:-[a-z]+-)?keyframes\b/i.test(legacyShadowUserCss));
assertCheck(checks, 'shadow legacy inlines CSS var', includesText(legacyShadowUserCss, 'color: #c02030'));
assertCheck(checks, 'shadow legacy preserves stable CSS', includesText(legacyShadowUserCss, 'padding: 8px') && includesText(legacyShadowUserCss, 'color: red'));

const previewToolbar = readFileSync(join(REPO_ROOT, 'components/editor/PreviewToolbar.tsx'), 'utf8');
const previewStore = readFileSync(join(REPO_ROOT, 'lib/stores/previewStore.ts'), 'utf8');
assertCheck(checks, 'toolbar exposes legacy preview toggle', previewToolbar.includes('data-testid="preview-legacy-css-toggle"'));
assertCheck(checks, 'preview store defaults legacy sanitize off', /legacyCssSanitize:\s*false/.test(previewStore));

const report = {
  generatedAt: new Date().toISOString(),
  scope: 'local iframe/shadow preview legacy CSS toggle smoke; not actual Roll20 visual parity',
  pass: checks.every((check) => check.pass),
  checks,
  bytes: {
    modernDoc: Buffer.byteLength(modernDoc),
    legacyDoc: Buffer.byteLength(legacyDoc),
    modernPartsCss: Buffer.byteLength(modernParts.css),
    legacyPartsCss: Buffer.byteLength(legacyParts.css),
  },
};

function renderMarkdown(data) {
  const lines = [
    '# Roll20 Legacy Preview Smoke',
    '',
    `Generated: ${data.generatedAt}`,
    '',
    'Scope: local iframe/shadow preview toggle smoke. This does not prove actual Roll20 visual parity.',
    '',
    `Status: ${data.pass ? 'PASS' : 'FAIL'}`,
    '',
    '| Check | Status |',
    '| --- | --- |',
  ];
  for (const check of data.checks) {
    lines.push(`| ${check.name} | ${check.pass ? 'PASS' : 'FAIL'} |`);
  }
  lines.push('');
  lines.push('Next check: run the same mode against imported fixture screenshots, then compare a legacy payload in Roll20 Custom Sheet Sandbox when Chrome file upload is enabled.');
  return `${lines.join('\n')}\n`;
}

mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'legacy-preview-smoke-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(join(reportDir, 'legacy-preview-smoke-results.md'), renderMarkdown(report), 'utf8');
console.log(JSON.stringify({ pass: report.pass, report: join(reportDir, 'legacy-preview-smoke-results.md') }));
if (!report.pass) process.exitCode = 1;

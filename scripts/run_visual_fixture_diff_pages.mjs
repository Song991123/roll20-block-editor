#!/usr/bin/env node
/**
 * Run generated visual-fixture diff pages in Chromium and collect their JSON
 * results into ignored local reports.
 *
 * Usage:
 *   node scripts/make_visual_diff_pages.mjs
 *   node scripts/run_visual_fixture_diff_pages.mjs reports/visual-fixture-diff
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const REPORT_DIR = path.resolve(args[0] ?? 'reports/visual-fixture-diff');
const PAGES_JSON = path.join(REPORT_DIR, 'visual-fixture-diff-pages.json');

function fileUrl(filePath) {
  return pathToFileURL(path.resolve(filePath)).href;
}

function pct(value) {
  return typeof value === 'number' ? `${Math.round(value * 10000) / 100}%` : '';
}

function fmtSize(size) {
  return Array.isArray(size) ? `${size[0]}x${size[1]}` : '';
}

function fmtCrop(crop) {
  return Array.isArray(crop) ? crop.join(',') : '';
}

async function main() {
  if (!existsSync(PAGES_JSON)) {
    throw new Error(`missing ${PAGES_JSON}; run scripts/make_visual_diff_pages.mjs first`);
  }
  const pages = JSON.parse(await fs.readFile(PAGES_JSON, 'utf8'));
  const browser = await chromium.launch();
  const report = {
    generatedAt: new Date().toISOString(),
    pageManifest: PAGES_JSON,
    entries: [],
  };

  for (const entry of pages.entries ?? []) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
    const consoleMessages = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) consoleMessages.push(`${msg.type()}: ${msg.text()}`.slice(0, 500));
    });
    page.on('pageerror', (err) => pageErrors.push(String(err).slice(0, 500)));

    const item = {
      fixtureId: entry.fixtureId,
      pagePath: entry.pagePath,
      status: 'error',
      consoleMessages,
      pageErrors,
    };
    try {
      await page.goto(fileUrl(entry.pagePath), { waitUntil: 'domcontentloaded', timeout: 60000 });
      const resultLocator = page.locator('[data-testid="result"]');
      await resultLocator.waitFor({ state: 'visible', timeout: 30000 });
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="result"]');
        return el && !/^pending\b/.test(el.textContent || '');
      }, null, { timeout: 60000 });
      const raw = await resultLocator.textContent();
      item.raw = raw;
      item.result = JSON.parse(raw || '{}');
      item.status = item.result.status === 'diffed' ? 'diffed' : 'error';
    } catch (error) {
      item.error = String(error?.stack || error).slice(0, 1200);
    }
    item.pass = item.status === 'diffed' && consoleMessages.length === 0 && pageErrors.length === 0;
    report.entries.push(item);
    console.log(`${item.pass ? 'PASS' : 'FAIL'} ${entry.fixtureId} best=${pct(item.result?.best?.mismatchRatio) || 'n/a'}`);
    await page.close();
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.entries.every((entry) => entry.pass);
  await fs.writeFile(path.join(REPORT_DIR, 'visual-fixture-diff-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'visual-fixture-diff-results.md'), renderMarkdown(report), 'utf8');
  await browser.close();
  console.log(report.pass ? 'VISUAL FIXTURE DIFF RUNNER PASS' : 'VISUAL FIXTURE DIFF RUNNER FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

function renderMarkdown(report) {
  const lines = [
    '# Visual Fixture Diff Results',
    '',
    `Generated: ${report.finishedAt ?? report.generatedAt}`,
    '',
    'Scope: automated browser-canvas diagnostic diff between copied reference images and captured local preview renders. This is not a Roll20 visual parity pass/fail gate.',
    '',
    '| Fixture | Reference size | Capture size | Best mode | Best crop | Best mismatch | Native top-left | Scale/crop search | Console | Status |',
    '| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- | --- |',
  ];
  for (const item of report.entries) {
    const result = item.result ?? {};
    lines.push(
      `| \`${item.fixtureId}\` | ${fmtSize(result.referenceSize)} | ${fmtSize(result.captureSize)} | ${result.bestMode ?? ''} | ${fmtCrop(result.best?.captureCrop)} | ${pct(result.best?.mismatchRatio)} | ${pct(result.nativeTopLeft?.mismatchRatio)} | ${pct(result.bestScaleSearch?.mismatchRatio)} | ${item.consoleMessages?.length ?? 0} warnings/errors | ${item.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  lines.push('Interpretation:');
  lines.push('- PASS means the diff pages loaded and produced JSON without browser console/page errors.');
  lines.push('- `Best mismatch` is diagnostic after 2D crop/scale search; it is not visual parity.');
  lines.push('- High mismatch still needs classification by viewport, default tab/state, asset loading, wrapper/context, or CSS differences.');
  lines.push('- Generated pages and screenshots are local-only and ignored by Git.');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

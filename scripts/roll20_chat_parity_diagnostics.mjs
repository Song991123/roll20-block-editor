#!/usr/bin/env node
/**
 * Compare local ChatPane rolltemplate screenshots against actual Roll20 chat.
 *
 * Scope: diagnostic only. This is intentionally separate from
 * roll20_actual_screenshot_diff.mjs because chat screenshots must be compared
 * against local chat screenshots, not against the sheet preview root.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const localChatDir = path.resolve(args[1] ?? 'reports/rolltemplate-chat-smoke/screenshots');
const onlyFixture = args[2] ?? '';

if (!args[0]) {
  console.error('Usage: node scripts/roll20_chat_parity_diagnostics.mjs reports/roll20-actual-compare/<label> [local-chat-screenshot-dir] [fixture-id]');
  process.exit(2);
}

const outDir = path.join(runDir, 'chat-parity-diagnostics');

async function main() {
  const baselineDir = path.join(runDir, 'local-baseline');
  if (!existsSync(baselineDir)) throw new Error(`missing local baseline folder: ${baselineDir}`);
  if (!existsSync(localChatDir)) throw new Error(`missing local chat screenshot folder: ${localChatDir}`);

  const fixtureIds = (await readFixtureIds(baselineDir)).filter((id) => !onlyFixture || id === onlyFixture);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fixtures = [];
  try {
    for (const fixtureId of fixtureIds) {
      fixtures.push(await compareFixture(page, fixtureId));
    }
  } finally {
    await browser.close();
  }

  const compared = fixtures.filter((fixture) => fixture.status === 'DIFFED');
  const highMismatch = compared.filter((fixture) => fixture.mismatchRatio !== null && fixture.mismatchRatio > 0.1);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    localChatDir,
    scope: 'Local ChatPane screenshot vs actual Roll20 chat screenshot diagnostic; not visual parity by itself',
    summary: {
      fixtures: fixtures.length,
      compared: compared.length,
      missing: fixtures.filter((fixture) => fixture.status === 'MISSING').length,
      highMismatch: highMismatch.length,
      maxMismatchRatio: compared.reduce((max, fixture) => Math.max(max, fixture.mismatchRatio ?? 0), 0),
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-parity-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-parity-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  const status = highMismatch.length ? 'HIGH_MISMATCH' : compared.length === fixtures.length ? 'COMPARED' : 'PARTIAL';
  console.log(`ROLL20 CHAT PARITY DIAGNOSTIC ${status}`);
  console.log(`fixtures=${fixtures.length}`);
  console.log(`compared=${compared.length}`);
  console.log(`highMismatch=${highMismatch.length}`);
  for (const fixture of fixtures) {
    if (fixture.status === 'DIFFED') {
      console.log(`DIFFED ${fixture.fixtureId} mismatch=${pct(fixture.mismatchRatio)} local=${fixture.localSize.join('x')} actual=${fixture.actualSize.join('x')}`);
    } else {
      console.log(`${fixture.status} ${fixture.fixtureId} ${fixture.note}`);
    }
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function readFixtureIds(baselineDir) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(baselineDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function compareFixture(page, fixtureId) {
  const local = path.join(localChatDir, `${fixtureId}-chat.png`);
  const actual = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat.png');
  const sidecar = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  if (!existsSync(local) || !existsSync(actual)) {
    return {
      fixtureId,
      status: 'MISSING',
      local: rel(local),
      actual: rel(actual),
      sidecar: rel(sidecar),
      note: !existsSync(local) ? 'missing local ChatPane screenshot' : 'missing actual Roll20 chat screenshot',
    };
  }

  const sidecarJson = await readJsonIfExists(sidecar);
  const diff = await compareImages(page, { local, actual });
  return {
    fixtureId,
    status: 'DIFFED',
    local: rel(local),
    actual: rel(actual),
    sidecar: rel(sidecar),
    sidecarRolltemplateCount: Number(sidecarJson?.rolltemplateCount ?? sidecarJson?.rolltemplates?.length ?? 0),
    localSize: diff.localSize,
    actualSize: diff.actualSize,
    comparedSize: diff.comparedSize,
    mismatchRatio: diff.mismatchRatio,
    mismatchPct: pct(diff.mismatchRatio),
    rmsRgb: diff.rmsRgb,
    bounds: diff.bounds,
    note: 'Diagnostic local ChatPane vs actual Roll20 chat comparison. Requires human classification before a parity claim.',
  };
}

async function compareImages(page, { local, actual }) {
  const [localUrl, actualUrl] = await Promise.all([imageDataUrl(local), imageDataUrl(actual)]);
  return page.evaluate(
    async ({ localUrl, actualUrl }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`failed to load ${src.slice(0, 80)}`));
          image.src = src;
        });
      }
      const [localImage, actualImage] = await Promise.all([loadImage(localUrl), loadImage(actualUrl)]);
      const width = Math.min(localImage.naturalWidth, actualImage.naturalWidth);
      const height = Math.min(localImage.naturalHeight, actualImage.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const draw = (image) => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height);
      };
      const localData = draw(localImage);
      const actualData = draw(actualImage);
      let mismatchPixels = 0;
      let sumSq = 0;
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      const threshold = 60;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4;
          const dr = Math.abs(localData.data[i] - actualData.data[i]);
          const dg = Math.abs(localData.data[i + 1] - actualData.data[i + 1]);
          const db = Math.abs(localData.data[i + 2] - actualData.data[i + 2]);
          sumSq += dr * dr + dg * dg + db * db;
          if (dr + dg + db > threshold) {
            mismatchPixels += 1;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }
      const totalPixels = width * height;
      return {
        localSize: [localImage.naturalWidth, localImage.naturalHeight],
        actualSize: [actualImage.naturalWidth, actualImage.naturalHeight],
        comparedSize: [width, height],
        mismatchRatio: totalPixels ? mismatchPixels / totalPixels : 1,
        rmsRgb: totalPixels ? Number(Math.sqrt(sumSq / (totalPixels * 3)).toFixed(3)) : null,
        bounds: mismatchPixels ? [minX, minY, maxX - minX + 1, maxY - minY + 1] : null,
      };
    },
    { localUrl, actualUrl },
  );
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Chat Parity Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push(report.scope);
  lines.push('');
  lines.push(`Compared: ${report.summary.compared}/${report.summary.fixtures}`);
  lines.push(`High mismatch: ${report.summary.highMismatch}`);
  lines.push(`Max mismatch: ${pct(report.summary.maxMismatchRatio)}`);
  lines.push('');
  lines.push('| Fixture | Status | Local | Actual | Rolltemplates | Local size | Actual size | Mismatch | RMS | Note |');
  lines.push('| --- | --- | --- | --- | ---: | --- | --- | ---: | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | \`${fixture.local}\` | \`${fixture.actual}\` | ${fixture.sidecarRolltemplateCount ?? ''} | ${fixture.localSize?.join('x') ?? ''} | ${fixture.actualSize?.join('x') ?? ''} | ${fixture.mismatchPct ?? ''} | ${fixture.rmsRgb ?? ''} | ${fixture.note} |`);
  }
  lines.push('');
  lines.push('This report does not replace actual Roll20 sheet-root evidence or human visual classification.');
  return `${lines.join('\n')}\n`;
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number((value * 100).toFixed(2))}%` : '';
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

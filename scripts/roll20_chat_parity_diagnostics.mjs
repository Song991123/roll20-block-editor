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
  const normalizedCompared = compared.filter((fixture) => fixture.compareMode === 'rolltemplate-crop');
  const highMismatch = compared.filter((fixture) => fixture.mismatchRatio !== null && fixture.mismatchRatio > 0.1);
  const normalizedHighMismatch = normalizedCompared.filter((fixture) => fixture.mismatchRatio !== null && fixture.mismatchRatio > 0.1);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    localChatDir,
    scope: 'Local ChatPane screenshot vs actual Roll20 chat screenshot diagnostic; not visual parity by itself',
    summary: {
      fixtures: fixtures.length,
      compared: compared.length,
      normalizedCompared: normalizedCompared.length,
      missing: fixtures.filter((fixture) => fixture.status === 'MISSING').length,
      needsNormalizedCapture: fixtures.filter((fixture) => fixture.status === 'NEEDS_NORMALIZED_CAPTURE').length,
      highMismatch: highMismatch.length,
      normalizedHighMismatch: normalizedHighMismatch.length,
      maxMismatchRatio: compared.reduce((max, fixture) => Math.max(max, fixture.mismatchRatio ?? 0), 0),
      maxNormalizedMismatchRatio: normalizedCompared.reduce((max, fixture) => Math.max(max, fixture.mismatchRatio ?? 0), 0),
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-parity-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-parity-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  const needsNormalized = fixtures.some((fixture) => fixture.status === 'NEEDS_NORMALIZED_CAPTURE');
  const status = normalizedHighMismatch.length
    ? 'HIGH_MISMATCH'
    : needsNormalized
      ? 'NEEDS_NORMALIZED_CAPTURE'
      : compared.length === fixtures.length
        ? 'COMPARED'
        : 'PARTIAL';
  console.log(`ROLL20 CHAT PARITY DIAGNOSTIC ${status}`);
  console.log(`fixtures=${fixtures.length}`);
  console.log(`compared=${compared.length}`);
  console.log(`normalizedCompared=${normalizedCompared.length}`);
  console.log(`highMismatch=${highMismatch.length}`);
  console.log(`normalizedHighMismatch=${normalizedHighMismatch.length}`);
  for (const fixture of fixtures) {
    if (fixture.status === 'DIFFED') {
      console.log(`DIFFED ${fixture.fixtureId} mode=${fixture.compareMode} mismatch=${pct(fixture.mismatchRatio)} local=${fixture.localSize.join('x')} actual=${fixture.actualSize.join('x')}`);
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
  const localTemplate = path.join(localChatDir, `${fixtureId}-chat-template.png`);
  const local = existsSync(localTemplate)
    ? localTemplate
    : path.join(localChatDir, `${fixtureId}-chat.png`);
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
  const actualCrop = buildActualTemplateCrop(sidecarJson);
  if (!actualCrop && existsSync(localTemplate)) {
    return {
      fixtureId,
      status: 'NEEDS_NORMALIZED_CAPTURE',
      local: rel(local),
      actual: rel(actual),
      sidecar: rel(sidecar),
      sidecarRolltemplateCount: Number(sidecarJson?.rolltemplateCount ?? sidecarJson?.rolltemplates?.length ?? 0),
      note: 'actual Roll20 chat sidecar lacks rolltemplate rect/clip metadata for element-level comparison',
    };
  }
  const diff = await compareImages(page, { local, actual, actualCrop });
  return {
    fixtureId,
    status: 'DIFFED',
    local: rel(local),
    actual: rel(actual),
    sidecar: rel(sidecar),
    sidecarRolltemplateCount: Number(sidecarJson?.rolltemplateCount ?? sidecarJson?.rolltemplates?.length ?? 0),
    compareMode: actualCrop ? 'rolltemplate-crop' : 'full-chat-fallback',
    actualCrop,
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

function buildActualTemplateCrop(sidecar) {
  const template = (sidecar?.rolltemplates ?? []).find((item) => item?.rect?.width && item?.rect?.height);
  const clip = sidecar?.clip ?? sidecar?.screenshotClipApplied ?? null;
  if (!template?.rect || !clip?.width || !clip?.height) return null;
  return {
    rect: template.rect,
    clip,
  };
}

async function compareImages(page, { local, actual, actualCrop = null }) {
  const [localUrl, actualUrl] = await Promise.all([imageDataUrl(local), imageDataUrl(actual)]);
  return page.evaluate(
    async ({ localUrl, actualUrl, actualCrop }) => {
      function loadImage(src) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`failed to load ${src.slice(0, 80)}`));
          image.src = src;
        });
      }
      const [localImage, actualImage] = await Promise.all([loadImage(localUrl), loadImage(actualUrl)]);
      const actualSource = (() => {
        if (!actualCrop?.rect || !actualCrop?.clip) {
          return { x: 0, y: 0, width: actualImage.naturalWidth, height: actualImage.naturalHeight };
        }
        const scaleX = actualImage.naturalWidth / actualCrop.clip.width;
        const scaleY = actualImage.naturalHeight / actualCrop.clip.height;
        return {
          x: Math.max(0, Math.round((actualCrop.rect.x - actualCrop.clip.x) * scaleX)),
          y: Math.max(0, Math.round((actualCrop.rect.y - actualCrop.clip.y) * scaleY)),
          width: Math.max(1, Math.round(actualCrop.rect.width * scaleX)),
          height: Math.max(1, Math.round(actualCrop.rect.height * scaleY)),
        };
      })();
      const width = Math.min(localImage.naturalWidth, actualSource.width);
      const height = Math.min(localImage.naturalHeight, actualSource.height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const draw = (image, source = null) => {
        ctx.clearRect(0, 0, width, height);
        const src = source ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
        ctx.drawImage(image, src.x, src.y, src.width, src.height, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height);
      };
      const localData = draw(localImage);
      const actualData = draw(actualImage, actualSource);
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
        actualSource: [actualSource.x, actualSource.y, actualSource.width, actualSource.height],
        comparedSize: [width, height],
        mismatchRatio: totalPixels ? mismatchPixels / totalPixels : 1,
        rmsRgb: totalPixels ? Number(Math.sqrt(sumSq / (totalPixels * 3)).toFixed(3)) : null,
        bounds: mismatchPixels ? [minX, minY, maxX - minX + 1, maxY - minY + 1] : null,
      };
    },
    { localUrl, actualUrl, actualCrop },
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
  lines.push(`Normalized compared: ${report.summary.normalizedCompared}/${report.summary.fixtures}`);
  lines.push(`Needs normalized capture: ${report.summary.needsNormalizedCapture}`);
  lines.push(`High mismatch: ${report.summary.highMismatch}`);
  lines.push(`Normalized high mismatch: ${report.summary.normalizedHighMismatch}`);
  lines.push(`Max mismatch: ${pct(report.summary.maxMismatchRatio)}`);
  lines.push(`Max normalized mismatch: ${pct(report.summary.maxNormalizedMismatchRatio)}`);
  lines.push('');
  lines.push('| Fixture | Status | Mode | Local | Actual | Rolltemplates | Local size | Actual size | Mismatch | RMS | Note |');
  lines.push('| --- | --- | --- | --- | --- | ---: | --- | --- | ---: | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.compareMode ?? ''} | \`${fixture.local}\` | \`${fixture.actual}\` | ${fixture.sidecarRolltemplateCount ?? ''} | ${fixture.localSize?.join('x') ?? ''} | ${fixture.actualSize?.join('x') ?? ''} | ${fixture.mismatchPct ?? ''} | ${fixture.rmsRgb ?? ''} | ${fixture.note} |`);
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

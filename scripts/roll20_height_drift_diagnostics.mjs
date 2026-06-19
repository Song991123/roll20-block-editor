#!/usr/bin/env node
/**
 * Image-based full-root height drift diagnostics.
 *
 * This is a fallback for cases where the actual Roll20 iframe DOM geometry is
 * unavailable. It compares stitched actual root PNGs with the best local
 * full-root candidate and reports where vertical ink/content diverges.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const fixtureFilter = args[1] && !args[1].startsWith('--') ? args[1] : null;

if (!args[0]) {
  console.error('Usage: node scripts/roll20_height_drift_diagnostics.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

const fullRootFile = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');
const outDir = path.join(runDir, 'height-drift-diagnostics');

async function main() {
  if (!existsSync(fullRootFile)) throw new Error(`Missing full-root candidate report: ${fullRootFile}`);
  const fullRoot = JSON.parse(await readFile(fullRootFile, 'utf8'));
  const sourceFixtures = (fullRoot.fixtures ?? [])
    .filter((fixture) => fixture.status === 'COMPARED' && fixture.bestCandidate && fixture.actual?.screenshot)
    .filter((fixture) => !fixtureFilter || fixture.fixtureId === fixtureFilter);
  if (!sourceFixtures.length) throw new Error(`No compared fixtures found${fixtureFilter ? ` for ${fixtureFilter}` : ''}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  try {
    const fixtures = [];
    for (const fixture of sourceFixtures) fixtures.push(await analyzeFixture(page, fixture));
    const report = {
      generatedAt: new Date().toISOString(),
      runDir,
      source: path.relative(runDir, fullRootFile),
      scope: 'image-based height drift diagnostics; not Roll20 visual parity',
      fixtures,
      summary: {
        compared: fixtures.length,
        suspectLocalExtraContent: fixtures.filter((fixture) => fixture.classification === 'local-extra-visible-content').length,
        suspectLocalOverhiddenContent: fixtures.filter((fixture) => fixture.classification === 'local-content-overhidden-or-state-too-narrow').length,
        suspectActualTruncation: fixtures.filter((fixture) => fixture.classification === 'actual-capture-may-be-truncated').length,
      },
    };
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'height-drift-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(path.join(outDir, 'height-drift-diagnostics-results.md'), renderMarkdown(report), 'utf8');
    for (const fixture of fixtures) {
      console.log(`${fixture.status} ${fixture.fixtureId} ${fixture.classification} rootDelta=${fixture.rootHeightDelta}px localTailInk=${fixture.localExtraTail.inkRatio}%`);
    }
    console.log(`ROLL20 HEIGHT DRIFT DIAGNOSTICS OK ${path.relative(process.cwd(), outDir)}`);
  } finally {
    await browser.close();
  }
}

async function analyzeFixture(page, fixture) {
  const actualPath = fixture.actual.screenshot;
  const localPath = fixture.bestCandidate.screenshot;
  if (!existsSync(actualPath)) throw new Error(`Missing actual screenshot for ${fixture.fixtureId}: ${actualPath}`);
  if (!existsSync(localPath)) throw new Error(`Missing local candidate screenshot for ${fixture.fixtureId}: ${localPath}`);
  const actualUrl = await imageDataUrl(actualPath);
  const localUrl = await imageDataUrl(localPath);
  const result = await page.evaluate(async ({ actualUrl, localUrl }) => {
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('image load failed'));
        image.src = src;
      });
    }
    function imageToStats(image) {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const rows = [];
      for (let y = 0; y < canvas.height; y += 1) {
        let ink = 0;
        let dark = 0;
        let alpha = 0;
        for (let x = 0; x < canvas.width; x += 1) {
          const i = (y * canvas.width + x) * 4;
          const a = data[i + 3];
          if (a < 16) continue;
          alpha += 1;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const distFromWhite = Math.abs(255 - r) + Math.abs(255 - g) + Math.abs(255 - b);
          if (distFromWhite > 42) ink += 1;
          if (r + g + b < 560) dark += 1;
        }
        rows.push({
          y,
          inkRatio: ink / Math.max(1, canvas.width),
          darkRatio: dark / Math.max(1, canvas.width),
          alphaRatio: alpha / Math.max(1, canvas.width),
        });
      }
      const bins = [];
      const binSize = 250;
      for (let y = 0; y < canvas.height; y += binSize) {
        const slice = rows.slice(y, Math.min(canvas.height, y + binSize));
        bins.push({
          y0: y,
          y1: Math.min(canvas.height, y + binSize),
          inkRatio: avg(slice.map((row) => row.inkRatio)),
          darkRatio: avg(slice.map((row) => row.darkRatio)),
        });
      }
      const inkRows = rows.filter((row) => row.inkRatio > 0.004 || row.darkRatio > 0.0015);
      return {
        size: { w: canvas.width, h: canvas.height },
        firstInkY: inkRows[0]?.y ?? null,
        lastInkY: inkRows.at(-1)?.y ?? null,
        inkHeight: inkRows.length ? inkRows.at(-1).y - inkRows[0].y + 1 : 0,
        totalInkRatio: avg(rows.map((row) => row.inkRatio)),
        bins,
      };
    }
    function avg(values) {
      if (!values.length) return 0;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    }
    return {
      actual: imageToStats(await loadImage(actualUrl)),
      local: imageToStats(await loadImage(localUrl)),
    };
  }, { actualUrl, localUrl });

  const rootHeightDelta = round((fixture.bestCandidate.localSize?.h ?? result.local.size.h) - result.actual.size.h);
  const commonHeight = Math.min(result.actual.size.h, result.local.size.h);
  const binComparison = compareBins(result.actual.bins, result.local.bins, commonHeight);
  const localExtraTail = summarizeTail(result.local.bins, result.actual.size.h, result.local.size.h);
  const actualBottomInk = summarizeTail(result.actual.bins, Math.max(0, result.actual.size.h - 750), result.actual.size.h);
  const classification = classify({ rootHeightDelta, localExtraTail, actualBottomInk, result });
  return {
    fixtureId: fixture.fixtureId,
    status: 'COMPARED',
    bestCandidate: fixture.bestCandidate.id,
    actualScreenshot: path.relative(process.cwd(), fixture.actual.screenshot),
    localScreenshot: path.relative(process.cwd(), fixture.bestCandidate.screenshot),
    actualSize: result.actual.size,
    localSize: result.local.size,
    rootHeightDelta,
    actualInk: {
      firstY: result.actual.firstInkY,
      lastY: result.actual.lastInkY,
      inkHeight: result.actual.inkHeight,
      totalInkRatio: pct(result.actual.totalInkRatio),
      bottomInkRatio: actualBottomInk.inkRatio,
    },
    localInk: {
      firstY: result.local.firstInkY,
      lastY: result.local.lastInkY,
      inkHeight: result.local.inkHeight,
      totalInkRatio: pct(result.local.totalInkRatio),
    },
    localExtraTail,
    actualBottomInk,
    strongestCommonBandDeltas: binComparison.slice(0, 12),
    classification,
    nextAction: nextAction(classification),
  };
}

function compareBins(actualBins, localBins, commonHeight) {
  const rows = [];
  const count = Math.min(actualBins.length, localBins.length);
  for (let i = 0; i < count; i += 1) {
    const actual = actualBins[i];
    const local = localBins[i];
    if (actual.y0 >= commonHeight) break;
    rows.push({
      y0: actual.y0,
      y1: Math.min(actual.y1, commonHeight),
      actualInkRatio: pct(actual.inkRatio),
      localInkRatio: pct(local.inkRatio),
      inkDeltaPct: pct(local.inkRatio - actual.inkRatio),
      actualDarkRatio: pct(actual.darkRatio),
      localDarkRatio: pct(local.darkRatio),
      darkDeltaPct: pct(local.darkRatio - actual.darkRatio),
      score: round(Math.abs(local.inkRatio - actual.inkRatio) * 100 + Math.abs(local.darkRatio - actual.darkRatio) * 120),
    });
  }
  return rows.sort((a, b) => b.score - a.score);
}

function summarizeTail(bins, y0, y1) {
  const selected = bins.filter((bin) => bin.y1 > y0 && bin.y0 < y1);
  const weighted = selected.map((bin) => {
    const overlap = Math.max(0, Math.min(y1, bin.y1) - Math.max(y0, bin.y0));
    return { bin, overlap };
  }).filter((item) => item.overlap > 0);
  const total = weighted.reduce((sum, item) => sum + item.overlap, 0);
  const ink = total ? weighted.reduce((sum, item) => sum + item.bin.inkRatio * item.overlap, 0) / total : 0;
  const dark = total ? weighted.reduce((sum, item) => sum + item.bin.darkRatio * item.overlap, 0) / total : 0;
  return {
    y0,
    y1,
    height: Math.max(0, y1 - y0),
    inkRatio: pct(ink),
    darkRatio: pct(dark),
  };
}

function classify({ rootHeightDelta, localExtraTail, actualBottomInk }) {
  if (rootHeightDelta > 500 && localExtraTail.inkRatio > 0.35 && actualBottomInk.inkRatio > 0.35) {
    return 'bottom-content-mismatch-needs-recapture-or-state-probe';
  }
  if (rootHeightDelta > 500 && localExtraTail.inkRatio > 0.35) return 'local-extra-visible-content';
  if (rootHeightDelta > 500 && actualBottomInk.inkRatio > 0.35) return 'actual-capture-may-be-truncated';
  if (rootHeightDelta < -500) return 'local-content-overhidden-or-state-too-narrow';
  if (Math.abs(rootHeightDelta) <= 20) return 'height-close';
  return 'height-drift-unclassified';
}

function nextAction(classification) {
  if (classification === 'local-extra-visible-content') {
    return 'Inspect local default-state/visibility for panels that Roll20 hides in the actual state; do not tune generic spacing CSS yet.';
  }
  if (classification === 'bottom-content-mismatch-needs-recapture-or-state-probe') {
    return 'Both actual bottom and local extra tail contain visible content; verify actual bottom coverage and inspect playbook/default-state visibility before renderer CSS.';
  }
  if (classification === 'actual-capture-may-be-truncated') {
    return 'Recapture actual Roll20 full-root evidence with more bottom coverage before renderer conclusions.';
  }
  if (classification === 'local-content-overhidden-or-state-too-narrow') {
    return 'The best local candidate is much shorter than actual; inspect whether the diagnostic visibility/state patch hides too much before promoting it.';
  }
  if (classification === 'height-close') {
    return 'Use geometry/control CSS diagnostics rather than root-height drift.';
  }
  return 'Add a targeted DOM/state probe or source-level visibility audit for this fixture.';
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Height Drift Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: image-based full-root height diagnostics. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Classification | Actual | Local | Root delta | Actual ink | Local tail ink | Best candidate |');
  lines.push('| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.classification} | ${sizeLabel(fixture.actualSize)} | ${sizeLabel(fixture.localSize)} | ${fixture.rootHeightDelta}px | ${fixture.actualInk.totalInkRatio}% | ${fixture.localExtraTail.inkRatio}% | ${fixture.bestCandidate} |`);
  }
  for (const fixture of report.fixtures) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Next action: ${fixture.nextAction}`);
    lines.push('');
    lines.push(`- Actual ink rows: ${fixture.actualInk.firstY}..${fixture.actualInk.lastY}, bottom ink ${fixture.actualInk.bottomInkRatio}%`);
    lines.push(`- Local ink rows: ${fixture.localInk.firstY}..${fixture.localInk.lastY}`);
    lines.push(`- Local extra tail: y ${fixture.localExtraTail.y0}..${fixture.localExtraTail.y1}, ink ${fixture.localExtraTail.inkRatio}%, dark ${fixture.localExtraTail.darkRatio}%`);
    lines.push('');
    lines.push('| Band | Actual ink | Local ink | Ink delta | Actual dark | Local dark | Score |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const band of fixture.strongestCommonBandDeltas.slice(0, 8)) {
      lines.push(`| ${band.y0}-${band.y1} | ${band.actualInkRatio}% | ${band.localInkRatio}% | ${band.inkDeltaPct}% | ${band.actualDarkRatio}% | ${band.localDarkRatio}% | ${band.score} |`);
    }
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This compares pixels in existing local-only evidence only.');
  lines.push('- It can classify likely local extra content versus likely actual truncation, but it cannot prove visual parity.');
  lines.push('- Any renderer CSS change still needs full-root candidate smoke, renderer action gate, preview/edit regression smoke, lint, and build.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:${mimeTypeForBytes(bytes, file)};base64,${bytes.toString('base64')}`;
}

function mimeTypeForBytes(bytes, file = '') {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  const ext = path.extname(file).toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
}

function pct(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? round(numeric * 100) : null;
}

function round(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 1000) / 1000 : null;
}

function sizeLabel(size) {
  if (!size) return '';
  return `${size.w ?? size.width}x${size.h ?? size.height}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

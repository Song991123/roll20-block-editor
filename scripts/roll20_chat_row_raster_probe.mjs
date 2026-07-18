#!/usr/bin/env node
/**
 * Compare local vs actual Roll20 chat rolltemplate pixels by DOM row.
 *
 * Diagnostic only. This script reads existing local-only screenshots and DOM
 * sidecars, then quantifies row-band raster differences without adding CSS
 * filters or product renderer behavior.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
function argOf(name, fallback) {
  const index = rawArgs.indexOf(name);
  return index >= 0 && rawArgs[index + 1] ? rawArgs[index + 1] : fallback;
}
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !rawArgs[index - 1]?.startsWith('--'));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localChatDirArg = args[2] ?? 'reports/rolltemplate-chat-smoke/screenshots';
const runDir = path.resolve(runDirArg);
const localSmokeFile = path.resolve(localSmokeArg);
const localChatDir = path.resolve(localChatDirArg);
const outDir = path.resolve(argOf('--report-dir', path.join(runDir, 'chat-row-raster-probe')));

async function main() {
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const rowPaintSource = await readOptionalJson(path.join(runDir, 'chat-row-paint-source-probe', 'chat-row-paint-source-probe-results.json'));
  const localSmoke = await readRequiredJson(localSmokeFile);
  const fixtureIds = collectFixtureIds(parity, rowPaintSource, localSmoke);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fixtures = [];
  try {
    for (const fixtureId of fixtureIds) {
      fixtures.push(await summarizeFixture(page, fixtureId, { parity, rowPaintSource, localSmoke }));
    }
  } finally {
    await browser.close();
  }

  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'RASTER_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    localChatDir: localChatDirArg,
    scope: 'diagnostic-only row raster comparison; no production CSS and no visual parity claim',
    summary: {
      status: actionable.length ? 'ROW_RASTER_ACTIONABLE' : 'ROW_RASTER_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-row-raster-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-row-raster-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT ROW RASTER PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} mismatch=${fixture.alignedMismatchPct} rows=${fixture.comparedRows ?? 0} worst=${fixture.worstRows?.[0]?.index ?? 'n/a'} rowMismatch=${fixture.worstRows?.[0]?.mismatchPct ?? 'n/a'} lumaDelta=${fmt(fixture.worstRows?.[0]?.avgSignedLumaDelta)} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function summarizeFixture(page, fixtureId, reports) {
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const rowPaintSource = findFixture(reports.rowPaintSource?.fixtures, fixtureId);
  const localFixture = findFixture(reports.localSmoke?.fixtures, fixtureId);
  const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
  const localRows = localTemplate?.rowMetrics ?? [];
  const sidecarFile = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const sidecar = await readOptionalJson(sidecarFile);
  const actualTemplate = sidecar?.latestTemplate ?? null;
  const actualRows = actualTemplate?.rowMetrics ?? [];
  const localImage = path.join(localChatDir, `${fixtureId}-chat-template.png`);
  const actualImage = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat.png');
  const priority = priorityFor(numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio));

  if (!existsSync(localImage) || !existsSync(actualImage)) {
    return {
      fixtureId,
      priority,
      decision: 'MISSING_SCREENSHOT',
      nextAction: 'capture local and actual chat template screenshots before row raster comparison',
      alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
      localImage: rel(localImage),
      actualImage: rel(actualImage),
    };
  }
  if (!localTemplate?.rect || !actualTemplate?.rect || !localRows.length || !actualRows.length) {
    return {
      fixtureId,
      priority,
      decision: 'MISSING_ROW_DOM_EVIDENCE',
      nextAction: 'recapture local smoke and actual Roll20 chat DOM sidecars with rowMetrics before row raster comparison',
      alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
      localRowCount: localRows.length,
      actualRowCount: actualRows.length,
    };
  }

  const actualCrop = buildActualTemplateCrop(sidecar);
  const raster = await compareRowRaster(page, {
    localImage,
    actualImage,
    actualCrop,
    localTemplateRect: localTemplate.rect,
    actualTemplateRect: actualTemplate.rect,
    localRows,
    actualRows,
    offset: parity?.bestAlignedOffset ?? [0, 0],
  });
  const decision = decide({ priority, rowPaintSource, raster });
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    alignedMismatchRatio: numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio),
    rowPaintSourceDecision: rowPaintSource?.decision ?? '',
    localImage: rel(localImage),
    actualImage: rel(actualImage),
    localRowCount: localRows.length,
    actualRowCount: actualRows.length,
    comparedRows: raster.rows.length,
    source: raster.source,
    summary: raster.summary,
    worstRows: raster.rows.slice().sort((a, b) => b.mismatchRatio - a.mismatchRatio).slice(0, 3),
    rows: raster.rows,
    evidence: evidenceNotes({ rowPaintSource, raster }),
  };
}

async function compareRowRaster(page, payload) {
  const [localUrl, actualUrl] = await Promise.all([imageDataUrl(payload.localImage), imageDataUrl(payload.actualImage)]);
  return page.evaluate(async ({ localUrl, actualUrl, actualCrop, localTemplateRect, actualTemplateRect, localRows, actualRows, offset }) => {
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`failed to load ${src.slice(0, 80)}`));
        image.src = src;
      });
    }
    function normalizeRect(rect) {
      const x = Number(rect.x ?? rect.left ?? 0);
      const y = Number(rect.y ?? rect.top ?? 0);
      const width = Number(rect.width ?? 0);
      const height = Number(rect.height ?? 0);
      return { x, y, left: Number(rect.left ?? x), top: Number(rect.top ?? y), width, height };
    }
    function rowRelativeRect(row, templateRect) {
      const rowRect = normalizeRect(row.rect ?? {});
      const template = normalizeRect(templateRect ?? {});
      return {
        x: Math.max(0, Math.round(rowRect.left - template.left)),
        y: Math.max(0, Math.round(rowRect.top - template.top)),
        width: Math.max(1, Math.round(rowRect.width)),
        height: Math.max(1, Math.round(rowRect.height)),
      };
    }
    function lumaAt(data, index) {
      return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    }
    function sampleRow(localData, actualData, width, height, rowRect, offsetX, offsetY) {
      const x0 = Math.max(0, rowRect.x);
      const y0 = Math.max(0, rowRect.y);
      const x1 = Math.min(width, rowRect.x + rowRect.width);
      const y1 = Math.min(height, rowRect.y + rowRect.height);
      let pixels = 0;
      let mismatchPixels = 0;
      let localLumaSum = 0;
      let actualLumaSum = 0;
      let signedLumaDeltaOnMismatch = 0;
      let brightMismatchPixels = 0;
      let darkMismatchPixels = 0;
      let localDarkPixels = 0;
      let actualDarkPixels = 0;
      let localBrightPixels = 0;
      let actualBrightPixels = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const lx = x + Math.max(0, offsetX);
          const ly = y + Math.max(0, offsetY);
          const ax = x + Math.max(0, -offsetX);
          const ay = y + Math.max(0, -offsetY);
          if (lx < 0 || ly < 0 || ax < 0 || ay < 0 || lx >= width || ax >= width || ly >= height || ay >= height) continue;
          const li = (ly * width + lx) * 4;
          const ai = (ay * width + ax) * 4;
          const localLuma = lumaAt(localData.data, li);
          const actualLuma = lumaAt(actualData.data, ai);
          const dr = Math.abs(localData.data[li] - actualData.data[ai]);
          const dg = Math.abs(localData.data[li + 1] - actualData.data[ai + 1]);
          const db = Math.abs(localData.data[li + 2] - actualData.data[ai + 2]);
          pixels += 1;
          localLumaSum += localLuma;
          actualLumaSum += actualLuma;
          if (localLuma < 70) localDarkPixels += 1;
          if (actualLuma < 70) actualDarkPixels += 1;
          if (localLuma > 190) localBrightPixels += 1;
          if (actualLuma > 190) actualBrightPixels += 1;
          if (dr + dg + db > 60) {
            mismatchPixels += 1;
            signedLumaDeltaOnMismatch += localLuma - actualLuma;
            if (localLuma > 160 || actualLuma > 160) brightMismatchPixels += 1;
            if (localLuma < 85 || actualLuma < 85) darkMismatchPixels += 1;
          }
        }
      }
      return {
        pixels,
        mismatchPixels,
        mismatchRatio: pixels ? mismatchPixels / pixels : 0,
        mismatchPct: pixels ? `${Number(((mismatchPixels / pixels) * 100).toFixed(2))}%` : '',
        avgLocalLuma: pixels ? Number((localLumaSum / pixels).toFixed(3)) : null,
        avgActualLuma: pixels ? Number((actualLumaSum / pixels).toFixed(3)) : null,
        avgSignedLumaDelta: mismatchPixels ? Number((signedLumaDeltaOnMismatch / mismatchPixels).toFixed(3)) : 0,
        brightMismatchShare: mismatchPixels ? brightMismatchPixels / mismatchPixels : 0,
        darkMismatchShare: mismatchPixels ? darkMismatchPixels / mismatchPixels : 0,
        localDarkRatio: pixels ? localDarkPixels / pixels : 0,
        actualDarkRatio: pixels ? actualDarkPixels / pixels : 0,
        localBrightRatio: pixels ? localBrightPixels / pixels : 0,
        actualBrightRatio: pixels ? actualBrightPixels / pixels : 0,
      };
    }

    const [localImage, actualImage] = await Promise.all([loadImage(localUrl), loadImage(actualUrl)]);
    const actualSource = (() => {
      if (!actualCrop?.rect || !actualCrop?.clip) return { x: 0, y: 0, width: actualImage.naturalWidth, height: actualImage.naturalHeight };
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
    ctx.drawImage(localImage, 0, 0, localImage.naturalWidth, localImage.naturalHeight, 0, 0, width, height);
    const localData = ctx.getImageData(0, 0, width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(actualImage, actualSource.x, actualSource.y, actualSource.width, actualSource.height, 0, 0, width, height);
    const actualData = ctx.getImageData(0, 0, width, height);
    const rows = [];
    const rowCount = Math.min(localRows.length, actualRows.length);
    const offsetX = Number(offset?.[0] ?? 0);
    const offsetY = Number(offset?.[1] ?? 0);
    for (let index = 0; index < rowCount; index += 1) {
      const localRect = rowRelativeRect(localRows[index], localTemplateRect);
      const actualRect = rowRelativeRect(actualRows[index], actualTemplateRect);
      const sampleRect = {
        x: Math.max(0, Math.min(localRect.x, actualRect.x)),
        y: Math.max(0, Math.min(localRect.y, actualRect.y)),
        width: Math.max(1, Math.min(width, Math.max(localRect.x + localRect.width, actualRect.x + actualRect.width)) - Math.max(0, Math.min(localRect.x, actualRect.x))),
        height: Math.max(1, Math.min(height, Math.max(localRect.y + localRect.height, actualRect.y + actualRect.height)) - Math.max(0, Math.min(localRect.y, actualRect.y))),
      };
      const sample = sampleRow(localData, actualData, width, height, sampleRect, offsetX, offsetY);
      rows.push({
        index,
        localText: String(localRows[index]?.text ?? '').slice(0, 80),
        actualText: String(actualRows[index]?.text ?? '').slice(0, 80),
        localRect,
        actualRect,
        sampleRect,
        yDelta: Number((localRect.y - actualRect.y).toFixed(3)),
        widthDelta: Number((localRect.width - actualRect.width).toFixed(3)),
        ...sample,
        brightMismatchSharePct: `${Number((sample.brightMismatchShare * 100).toFixed(2))}%`,
        darkMismatchSharePct: `${Number((sample.darkMismatchShare * 100).toFixed(2))}%`,
      });
    }
    const mismatchWeighted = rows.reduce((sum, row) => sum + row.mismatchPixels, 0);
    const pixelTotal = rows.reduce((sum, row) => sum + row.pixels, 0);
    return {
      source: {
        localSize: [localImage.naturalWidth, localImage.naturalHeight],
        actualSize: [actualImage.naturalWidth, actualImage.naturalHeight],
        normalizedSize: [width, height],
        actualSource,
        offset: [offsetX, offsetY],
      },
      summary: {
        rows: rows.length,
        rowWeightedMismatchRatio: pixelTotal ? mismatchWeighted / pixelTotal : 0,
        rowWeightedMismatchPct: pixelTotal ? `${Number(((mismatchWeighted / pixelTotal) * 100).toFixed(2))}%` : '',
        maxRowMismatchRatio: rows.reduce((max, row) => Math.max(max, row.mismatchRatio), 0),
        maxRowMismatchPct: `${Number((rows.reduce((max, row) => Math.max(max, row.mismatchRatio), 0) * 100).toFixed(2))}%`,
        meanSignedLumaDelta: rows.length ? Number((rows.reduce((sum, row) => sum + row.avgSignedLumaDelta, 0) / rows.length).toFixed(3)) : 0,
      },
      rows,
    };
  }, {
    localUrl,
    actualUrl,
    actualCrop: payload.actualCrop,
    localTemplateRect: payload.localTemplateRect,
    actualTemplateRect: payload.actualTemplateRect,
    localRows: payload.localRows,
    actualRows: payload.actualRows,
    offset: payload.offset,
  });
}

function decide({ priority, rowPaintSource, raster }) {
  if (priority === 'P2') return 'RASTER_SECONDARY';
  if (rowPaintSource?.decision === 'ROW_BAND_RASTER_CONTEXT_REQUIRED') return 'COC_ROW_RASTER_MODEL_REQUIRED';
  if (Number(raster.summary?.maxRowMismatchRatio ?? 0) > 0.18 && Math.abs(Number(raster.summary?.meanSignedLumaDelta ?? 0)) > 12) {
    return 'ROW_LUMA_RASTER_MODEL_REQUIRED';
  }
  if (Number(raster.summary?.maxRowMismatchRatio ?? 0) > 0.18) return 'ROW_MASK_RASTER_MODEL_REQUIRED';
  return 'RASTER_SECONDARY';
}

function nextAction(decision) {
  switch (decision) {
    case 'COC_ROW_RASTER_MODEL_REQUIRED':
      return 'build the next YSHY/CoC experiment from row-level background/text raster evidence, not a CSS filter';
    case 'ROW_LUMA_RASTER_MODEL_REQUIRED':
      return 'inspect row-level luma/background/text antialiasing before another renderer CSS candidate';
    case 'ROW_MASK_RASTER_MODEL_REQUIRED':
      return 'inspect row masks and crop/source context before another renderer CSS candidate';
    case 'MISSING_SCREENSHOT':
    case 'MISSING_ROW_DOM_EVIDENCE':
      return 'recapture missing row screenshots or DOM sidecars';
    default:
      return 'keep row raster secondary for this fixture';
  }
}

function evidenceNotes({ rowPaintSource, raster }) {
  const notes = [];
  if (rowPaintSource?.decision) notes.push(`row/paint/source decision ${rowPaintSource.decision}`);
  notes.push(`row-weighted mismatch ${raster.summary.rowWeightedMismatchPct}`);
  notes.push(`max row mismatch ${raster.summary.maxRowMismatchPct}`);
  notes.push(`mean signed luma delta ${fmt(raster.summary.meanSignedLumaDelta)}`);
  const worst = raster.rows.slice().sort((a, b) => b.mismatchRatio - a.mismatchRatio)[0];
  if (worst) {
    notes.push(`worst row ${worst.index}: mismatch ${worst.mismatchPct}, luma delta ${fmt(worst.avgSignedLumaDelta)}, bright share ${worst.brightMismatchSharePct}, dark share ${worst.darkMismatchSharePct}`);
  }
  return notes;
}

function buildActualTemplateCrop(sidecar) {
  const dprCorrection = sidecar?.captureDprCorrection?.applied ? sidecar.captureDprCorrection : null;
  const correctedClip = dprCorrection?.cssClip?.width && dprCorrection?.cssClip?.height ? normalizeRect(dprCorrection.cssClip) : null;
  const clip = correctedClip ?? sidecar?.clip ?? sidecar?.screenshotClipApplied ?? null;
  const template = sidecar?.latestTemplate?.rect?.width ? sidecar.latestTemplate : null;
  if (!template?.rect || !clip?.width || !clip?.height) return null;
  return {
    rect: template.rect,
    clip,
    clipSource: correctedClip ? 'captureDprCorrection.cssClip' : 'sidecar.clip',
  };
}

function normalizeRect(rect) {
  const x = Number(rect.x ?? rect.left ?? 0);
  const y = Number(rect.y ?? rect.top ?? 0);
  const width = Number(rect.width ?? 0);
  const height = Number(rect.height ?? 0);
  return {
    ...rect,
    x,
    y,
    left: Number(rect.left ?? x),
    top: Number(rect.top ?? y),
    width,
    height,
    right: Number(rect.right ?? x + width),
    bottom: Number(rect.bottom ?? y + height),
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Row Raster Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only row-level PNG comparison. This does not prove visual parity and does not enable production CSS.',
    '',
    '| Fixture | Priority | Decision | Mismatch | Compared rows | Row weighted mismatch | Worst row | Worst mismatch | Worst luma delta | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    const worst = fixture.worstRows?.[0];
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.alignedMismatchPct ?? ''} | ${fixture.comparedRows ?? ''} | ${fixture.summary?.rowWeightedMismatchPct ?? ''} | ${worst?.index ?? ''} | ${worst?.mismatchPct ?? ''} | ${fmt(worst?.avgSignedLumaDelta)} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Worst Rows', '');
  for (const fixture of report.fixtures) {
    if (!fixture.worstRows?.length) continue;
    lines.push(`### ${fixture.fixtureId}`);
    for (const row of fixture.worstRows) {
      lines.push(`- row ${row.index}: mismatch ${row.mismatchPct}, local luma ${fmt(row.avgLocalLuma)}, actual luma ${fmt(row.avgActualLuma)}, signed mismatch luma delta ${fmt(row.avgSignedLumaDelta)}, bright mismatch ${row.brightMismatchSharePct}, dark mismatch ${row.darkMismatchSharePct}`);
    }
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- This report identifies the next renderer experiment axis only.');
  lines.push('- Keep generated reports and actual Roll20 screenshots local-only.');
  return `${lines.join('\n')}\n`;
}

async function imageDataUrl(file) {
  const bytes = await readFile(file);
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

async function readRequiredJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`Missing or invalid required JSON: ${path.relative(process.cwd(), file)}`);
    console.error(String(error?.message || error));
    process.exit(2);
  }
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      const id = fixture.fixtureId ?? fixture.id;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
}

function priorityFor(mismatch) {
  if (mismatch > 0.1) return 'P0';
  if (mismatch > 0.06) return 'P1';
  return 'P2';
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function fmt(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : 'n/a';
}

await main();

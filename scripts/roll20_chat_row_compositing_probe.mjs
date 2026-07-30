#!/usr/bin/env node
/**
 * Decompose stubborn Roll20 chat row raster mismatch into compositing buckets.
 *
 * Diagnostic only. This script reads existing local-only screenshots and DOM
 * sidecars. It does not add renderer CSS and does not prove visual parity.
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
const optionNamesWithValues = new Set(['--out-dir', '--report-dir', '--parity-dir', '--row-raster-dir', '--row-paint-source-dir']);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localChatDirArg = args[2] ?? 'reports/rolltemplate-chat-smoke/screenshots';
const runDir = path.resolve(runDirArg);
const localSmokeFile = path.resolve(localSmokeArg);
const localChatDir = path.resolve(localChatDirArg);
const outDir = path.resolve(argOf('--out-dir', argOf('--report-dir', path.join(runDir, 'chat-row-compositing-probe'))));
const parityDir = path.resolve(argOf('--parity-dir', path.join(runDir, 'chat-parity-diagnostics')));
const rowRasterDir = path.resolve(argOf('--row-raster-dir', path.join(runDir, 'chat-row-raster-probe')));
const rowPaintSourceDir = path.resolve(argOf('--row-paint-source-dir', path.join(runDir, 'chat-row-paint-source-probe')));

async function main() {
  const parity = await readOptionalJson(path.join(parityDir, 'chat-parity-diagnostics-results.json'));
  const rowRaster = await readOptionalJson(path.join(rowRasterDir, 'chat-row-raster-probe-results.json'));
  const rowPaintSource = await readOptionalJson(path.join(rowPaintSourceDir, 'chat-row-paint-source-probe-results.json'));
  const localSmoke = await readRequiredJson(localSmokeFile);
  const fixtureIds = collectFixtureIds(parity, rowRaster, rowPaintSource, localSmoke);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fixtures = [];
  try {
    for (const fixtureId of fixtureIds) {
      fixtures.push(await summarizeFixture(page, fixtureId, { parity, rowRaster, rowPaintSource, localSmoke }));
    }
  } finally {
    await browser.close();
  }

  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && !['COMPOSITING_SECONDARY', 'MISSING_EVIDENCE'].includes(fixture.decision));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    localChatDir: localChatDirArg,
    reportOverrides: {
      outDir: rel(outDir),
      parityDir: rel(parityDir),
      rowRasterDir: rel(rowRasterDir),
      rowPaintSourceDir: rel(rowPaintSourceDir),
    },
    scope: 'diagnostic-only chat row compositing decomposition; no production CSS and no visual parity claim',
    summary: {
      status: actionable.length ? 'ROW_COMPOSITING_ACTIONABLE' : 'ROW_COMPOSITING_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-row-compositing-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-row-compositing-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT ROW COMPOSITING PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    const worst = fixture.worstRows?.[0];
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} mismatch=${fixture.alignedMismatchPct} weighted=${fixture.summary?.rowWeightedMismatchPct ?? 'n/a'} lumaCorrected=${fixture.summary?.lumaCorrectedMismatchPct ?? 'n/a'} gain=${signedPct(fixture.summary?.lumaCorrectionGainPct)} worst=${worst?.index ?? 'n/a'} edge=${worst?.edgeMismatchSharePct ?? 'n/a'} flat=${worst?.flatPaintMismatchSharePct ?? 'n/a'} localDarker=${worst?.localDarkerMismatchSharePct ?? 'n/a'} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function summarizeFixture(page, fixtureId, reports) {
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const raster = findFixture(reports.rowRaster?.fixtures, fixtureId);
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

  if (!existsSync(localImage) || !existsSync(actualImage) || !localTemplate?.rect || !actualTemplate?.rect || !localRows.length || !actualRows.length) {
    return {
      fixtureId,
      priority,
      decision: 'MISSING_EVIDENCE',
      alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
      nextAction: 'recapture local/actual chat screenshots and row DOM sidecars before compositing decomposition',
      localImage: rel(localImage),
      actualImage: rel(actualImage),
      localRows: localRows.length,
      actualRows: actualRows.length,
    };
  }

  const decomposition = await decomposeRows(page, {
    localImage,
    actualImage,
    actualCrop: buildActualTemplateCrop(sidecar),
    localTemplateRect: localTemplate.rect,
    actualTemplateRect: actualTemplate.rect,
    localRows,
    actualRows,
    offset: parity?.bestAlignedOffset ?? [0, 0],
  });
  const decision = decide({ priority, decomposition, rowPaintSource, raster });
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    alignedMismatchRatio: numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio),
    rowRasterDecision: raster?.decision ?? '',
    rowPaintSourceDecision: rowPaintSource?.decision ?? '',
    localImage: rel(localImage),
    actualImage: rel(actualImage),
    comparedRows: decomposition.rows.length,
    source: decomposition.source,
    summary: decomposition.summary,
    worstRows: decomposition.rows.slice().sort((a, b) => b.mismatchRatio - a.mismatchRatio).slice(0, 4),
    rows: decomposition.rows,
    evidence: evidenceNotes({ decomposition, rowPaintSource, raster }),
  };
}

async function decomposeRows(page, payload) {
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
    function gradientAt(data, width, height, x, y) {
      const left = Math.max(0, x - 1);
      const right = Math.min(width - 1, x + 1);
      const top = Math.max(0, y - 1);
      const bottom = Math.min(height - 1, y + 1);
      const center = (yy, xx) => (yy * width + xx) * 4;
      const dx = Math.abs(lumaAt(data, center(y, right)) - lumaAt(data, center(y, left)));
      const dy = Math.abs(lumaAt(data, center(bottom, x)) - lumaAt(data, center(top, x)));
      return Math.max(dx, dy);
    }
    function pct(value) {
      return `${Number((value * 100).toFixed(2))}%`;
    }
    function sampleRow(localData, actualData, width, height, rowRect, offsetX, offsetY) {
      const x0 = Math.max(0, rowRect.x);
      const y0 = Math.max(0, rowRect.y);
      const x1 = Math.min(width, rowRect.x + rowRect.width);
      const y1 = Math.min(height, rowRect.y + rowRect.height);
      const samples = [];
      const buckets = {
        mismatchPixels: 0,
        lumaCorrectedMismatchPixels: 0,
        edgeMismatchPixels: 0,
        flatPaintMismatchPixels: 0,
        localDarkerMismatchPixels: 0,
        localBrighterMismatchPixels: 0,
        chromaMismatchPixels: 0,
        darkPairMismatchPixels: 0,
        brightPairMismatchPixels: 0,
      };
      let pixels = 0;
      let localLumaSum = 0;
      let actualLumaSum = 0;
      let signedLumaDeltaOnMismatch = 0;
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
          samples.push({
            li,
            ai,
            lx,
            ly,
            ax,
            ay,
            localLuma,
            actualLuma,
            dr,
            dg,
            db,
          });
        }
      }
      const lumaShift = pixels ? (actualLumaSum - localLumaSum) / pixels : 0;
      for (const sample of samples) {
        const { li, ai, lx, ly, ax, ay, localLuma, actualLuma, dr, dg, db } = sample;
        const corrected = [
          Math.max(0, Math.min(255, localData.data[li] + lumaShift)),
          Math.max(0, Math.min(255, localData.data[li + 1] + lumaShift)),
          Math.max(0, Math.min(255, localData.data[li + 2] + lumaShift)),
        ];
        const cdr = Math.abs(corrected[0] - actualData.data[ai]);
        const cdg = Math.abs(corrected[1] - actualData.data[ai + 1]);
        const cdb = Math.abs(corrected[2] - actualData.data[ai + 2]);
        if (cdr + cdg + cdb > 60) buckets.lumaCorrectedMismatchPixels += 1;
        const chromaDelta = Math.max(dr, dg, db) - Math.min(dr, dg, db);
          if (dr + dg + db <= 60) continue;
          buckets.mismatchPixels += 1;
          signedLumaDeltaOnMismatch += localLuma - actualLuma;
          const localEdge = gradientAt(localData, width, height, lx, ly);
          const actualEdge = gradientAt(actualData, width, height, ax, ay);
          const edgeLike = localEdge > 38 || actualEdge > 38;
          if (edgeLike) buckets.edgeMismatchPixels += 1;
          else buckets.flatPaintMismatchPixels += 1;
          if (localLuma + 10 < actualLuma) buckets.localDarkerMismatchPixels += 1;
          if (localLuma > actualLuma + 10) buckets.localBrighterMismatchPixels += 1;
          if (chromaDelta > 18) buckets.chromaMismatchPixels += 1;
          if (localLuma < 90 || actualLuma < 90) buckets.darkPairMismatchPixels += 1;
          if (localLuma > 175 || actualLuma > 175) buckets.brightPairMismatchPixels += 1;
      }
      const mismatch = buckets.mismatchPixels || 1;
      const mismatchRatio = pixels ? buckets.mismatchPixels / pixels : 0;
      const lumaCorrectedMismatchRatio = pixels ? buckets.lumaCorrectedMismatchPixels / pixels : 0;
      return {
        pixels,
        ...buckets,
        mismatchRatio,
        mismatchPct: pixels ? pct(mismatchRatio) : '',
        lumaShift: Number(lumaShift.toFixed(3)),
        lumaCorrectedMismatchRatio,
        lumaCorrectedMismatchPct: pixels ? pct(lumaCorrectedMismatchRatio) : '',
        lumaCorrectionGainPct: pixels ? Number(((lumaCorrectedMismatchRatio - mismatchRatio) * 100).toFixed(2)) : null,
        avgLocalLuma: pixels ? Number((localLumaSum / pixels).toFixed(3)) : null,
        avgActualLuma: pixels ? Number((actualLumaSum / pixels).toFixed(3)) : null,
        avgSignedLumaDelta: buckets.mismatchPixels ? Number((signedLumaDeltaOnMismatch / buckets.mismatchPixels).toFixed(3)) : 0,
        edgeMismatchShare: buckets.edgeMismatchPixels / mismatch,
        flatPaintMismatchShare: buckets.flatPaintMismatchPixels / mismatch,
        localDarkerMismatchShare: buckets.localDarkerMismatchPixels / mismatch,
        localBrighterMismatchShare: buckets.localBrighterMismatchPixels / mismatch,
        chromaMismatchShare: buckets.chromaMismatchPixels / mismatch,
        darkPairMismatchShare: buckets.darkPairMismatchPixels / mismatch,
        brightPairMismatchShare: buckets.brightPairMismatchPixels / mismatch,
      };
    }
    function rowDecision(row) {
      if (row.lumaCorrectionGainPct <= -5 && row.flatPaintMismatchShare >= 0.45) return 'LUMA_BACKGROUND_COMPOSITING';
      if (row.edgeMismatchShare >= 0.45 && row.flatPaintMismatchShare < 0.45) return 'TEXT_EDGE_OR_ANTIALIASING';
      if (row.flatPaintMismatchShare >= 0.45 && row.localDarkerMismatchShare >= 0.45) return 'LOCAL_BACKGROUND_TOO_DARK';
      if (row.flatPaintMismatchShare >= 0.45 && row.localBrighterMismatchShare >= 0.45) return 'LOCAL_BACKGROUND_TOO_BRIGHT';
      if (row.flatPaintMismatchShare >= 0.35 && row.edgeMismatchShare >= 0.35) return 'MIXED_TEXT_BACKGROUND_COMPOSITING';
      if (row.chromaMismatchShare >= 0.35) return 'COLOR_OR_ASSET_RASTER';
      return 'MIXED_OR_SECONDARY';
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
    const offsetX = Number(offset?.[0] ?? 0);
    const offsetY = Number(offset?.[1] ?? 0);
    const rows = [];
    for (let index = 0; index < Math.min(localRows.length, actualRows.length); index += 1) {
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
        decision: rowDecision(sample),
        edgeMismatchSharePct: pct(sample.edgeMismatchShare),
        flatPaintMismatchSharePct: pct(sample.flatPaintMismatchShare),
        localDarkerMismatchSharePct: pct(sample.localDarkerMismatchShare),
        localBrighterMismatchSharePct: pct(sample.localBrighterMismatchShare),
        chromaMismatchSharePct: pct(sample.chromaMismatchShare),
        darkPairMismatchSharePct: pct(sample.darkPairMismatchShare),
        brightPairMismatchSharePct: pct(sample.brightPairMismatchShare),
      });
    }
    const mismatchPixels = rows.reduce((sum, row) => sum + row.mismatchPixels, 0);
    const lumaCorrectedMismatchPixels = rows.reduce((sum, row) => sum + row.lumaCorrectedMismatchPixels, 0);
    const pixels = rows.reduce((sum, row) => sum + row.pixels, 0);
    const share = (key) => mismatchPixels ? rows.reduce((sum, row) => sum + row[key], 0) / mismatchPixels : 0;
    const decisions = rows.reduce((acc, row) => {
      acc[row.decision] = (acc[row.decision] ?? 0) + 1;
      return acc;
    }, {});
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
        rowWeightedMismatchRatio: pixels ? mismatchPixels / pixels : 0,
        rowWeightedMismatchPct: pixels ? pct(mismatchPixels / pixels) : '',
        lumaCorrectedMismatchRatio: pixels ? lumaCorrectedMismatchPixels / pixels : 0,
        lumaCorrectedMismatchPct: pixels ? pct(lumaCorrectedMismatchPixels / pixels) : '',
        lumaCorrectionGainPct: pixels ? Number((((lumaCorrectedMismatchPixels - mismatchPixels) / pixels) * 100).toFixed(2)) : null,
        edgeMismatchShare: share('edgeMismatchPixels'),
        flatPaintMismatchShare: share('flatPaintMismatchPixels'),
        localDarkerMismatchShare: share('localDarkerMismatchPixels'),
        localBrighterMismatchShare: share('localBrighterMismatchPixels'),
        chromaMismatchShare: share('chromaMismatchPixels'),
        edgeMismatchSharePct: pct(share('edgeMismatchPixels')),
        flatPaintMismatchSharePct: pct(share('flatPaintMismatchPixels')),
        localDarkerMismatchSharePct: pct(share('localDarkerMismatchPixels')),
        localBrighterMismatchSharePct: pct(share('localBrighterMismatchPixels')),
        chromaMismatchSharePct: pct(share('chromaMismatchPixels')),
        decisions,
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

function decide({ priority, decomposition, rowPaintSource, raster }) {
  if (priority === 'P2') return 'COMPOSITING_SECONDARY';
  if (!decomposition?.rows?.length) return 'MISSING_EVIDENCE';
  const summary = decomposition.summary;
  const worst = decomposition.rows.slice().sort((a, b) => b.mismatchRatio - a.mismatchRatio)[0];
  if (summary.lumaCorrectionGainPct <= -5 && summary.flatPaintMismatchShare >= 0.45) {
    return 'LUMA_BACKGROUND_COMPOSITING_MODEL_REQUIRED';
  }
  if (rowPaintSource?.decision === 'ROW_BAND_RASTER_CONTEXT_REQUIRED' && summary.flatPaintMismatchShare >= 0.42) {
    return 'BACKGROUND_COMPOSITING_MODEL_REQUIRED';
  }
  if (worst?.decision === 'LOCAL_BACKGROUND_TOO_DARK' || (summary.flatPaintMismatchShare >= 0.42 && summary.localDarkerMismatchShare >= 0.38)) {
    return 'LOCAL_BACKGROUND_TOO_DARK';
  }
  if (summary.edgeMismatchShare >= 0.45) return 'TEXT_EDGE_RASTER_MODEL_REQUIRED';
  if (summary.chromaMismatchShare >= 0.35) return 'COLOR_ASSET_RASTER_MODEL_REQUIRED';
  if (raster?.decision?.includes('RASTER_MODEL_REQUIRED')) return 'MIXED_ROW_COMPOSITING_MODEL_REQUIRED';
  return 'COMPOSITING_SECONDARY';
}

function nextAction(decision) {
  switch (decision) {
    case 'BACKGROUND_COMPOSITING_MODEL_REQUIRED':
      return 'build the next fixtureC/CoC candidate around row background compositing/source context; do not use CSS filter';
    case 'LUMA_BACKGROUND_COMPOSITING_MODEL_REQUIRED':
      return 'model the Roll20 row background/luma compositing path before writing CSS; virtual luma correction explains a meaningful slice of the mismatch';
    case 'LOCAL_BACKGROUND_TOO_DARK':
      return 'inspect why local row background raster is darker than actual Roll20, focusing on background layer/source/capture context rather than table width';
    case 'TEXT_EDGE_RASTER_MODEL_REQUIRED':
      return 'build a text edge/antialiasing probe before another background or width candidate';
    case 'COLOR_ASSET_RASTER_MODEL_REQUIRED':
      return 'compare actual/local color asset loading and sanitized background CSS before another renderer candidate';
    case 'MIXED_ROW_COMPOSITING_MODEL_REQUIRED':
      return 'split the next probe between text edge and background layers; current evidence is mixed';
    case 'MISSING_EVIDENCE':
      return 'recapture screenshots and DOM row sidecars before compositing decisions';
    default:
      return 'keep compositing secondary for this fixture';
  }
}

function evidenceNotes({ decomposition, rowPaintSource, raster }) {
  const notes = [];
  if (rowPaintSource?.decision) notes.push(`row/paint/source decision ${rowPaintSource.decision}`);
  if (raster?.decision) notes.push(`row raster decision ${raster.decision}`);
  notes.push(`row-weighted mismatch ${decomposition.summary.rowWeightedMismatchPct}`);
  notes.push(`virtual luma-corrected mismatch ${decomposition.summary.lumaCorrectedMismatchPct} (${signedPct(decomposition.summary.lumaCorrectionGainPct)})`);
  notes.push(`edge mismatch share ${decomposition.summary.edgeMismatchSharePct}`);
  notes.push(`flat paint mismatch share ${decomposition.summary.flatPaintMismatchSharePct}`);
  notes.push(`local darker share ${decomposition.summary.localDarkerMismatchSharePct}`);
  notes.push(`local brighter share ${decomposition.summary.localBrighterMismatchSharePct}`);
  notes.push(`chroma mismatch share ${decomposition.summary.chromaMismatchSharePct}`);
  const worst = decomposition.rows.slice().sort((a, b) => b.mismatchRatio - a.mismatchRatio)[0];
  if (worst) {
    notes.push(`worst row ${worst.index}: ${worst.decision}, mismatch ${worst.mismatchPct}, luma-corrected ${worst.lumaCorrectedMismatchPct} (${signedPct(worst.lumaCorrectionGainPct)}), edge ${worst.edgeMismatchSharePct}, flat ${worst.flatPaintMismatchSharePct}, darker ${worst.localDarkerMismatchSharePct}`);
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
    '# Roll20 Chat Row Compositing Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only row mismatch decomposition. This routes the next renderer experiment and does not enable production CSS.',
    '',
    '| Fixture | Priority | Decision | Mismatch | Rows | Weighted | Luma-corrected | Gain | Edge | Flat paint | Local darker | Chroma | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.alignedMismatchPct ?? ''} | ${fixture.comparedRows ?? ''} | ${fixture.summary?.rowWeightedMismatchPct ?? ''} | ${fixture.summary?.lumaCorrectedMismatchPct ?? ''} | ${signedPct(fixture.summary?.lumaCorrectionGainPct)} | ${fixture.summary?.edgeMismatchSharePct ?? ''} | ${fixture.summary?.flatPaintMismatchSharePct ?? ''} | ${fixture.summary?.localDarkerMismatchSharePct ?? ''} | ${fixture.summary?.chromaMismatchSharePct ?? ''} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Worst Rows', '');
  for (const fixture of report.fixtures) {
    if (!fixture.worstRows?.length) continue;
    lines.push(`### ${fixture.fixtureId}`);
    for (const row of fixture.worstRows) {
      lines.push(`- row ${row.index}: ${row.decision}, mismatch ${row.mismatchPct}, luma-corrected ${row.lumaCorrectedMismatchPct} (${signedPct(row.lumaCorrectionGainPct)}), luma shift ${row.lumaShift}, edge ${row.edgeMismatchSharePct}, flat ${row.flatPaintMismatchSharePct}, local darker ${row.localDarkerMismatchSharePct}, local brighter ${row.localBrighterMismatchSharePct}, chroma ${row.chromaMismatchSharePct}`);
    }
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- This report identifies a renderer experiment axis only.');
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

function signedPct(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

await main();

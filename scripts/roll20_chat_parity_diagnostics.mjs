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
  const actualChatCssInactive = fixtures.filter((fixture) => fixture.actualChatCss?.classification === 'CSS_RULE_MISSING_IN_PAGE_STYLES');
  const actualChatCssScopedMismatch = fixtures.filter((fixture) => fixture.actualChatCss?.classification === 'ROLLTEMPLATE_CSS_SCOPED_OR_PREFIX_MISMATCH');
  const actualChatCssUnknown = fixtures.filter((fixture) => fixture.actualChatCss?.classification === 'UNKNOWN');
  const actualCaptureScaleSuspect = fixtures.filter((fixture) => fixture.status === 'DIFFED' && isActualCaptureScaleSuspect(fixture));
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
      actualChatCssInactive: actualChatCssInactive.length,
      actualChatCssScopedMismatch: actualChatCssScopedMismatch.length,
      actualChatCssUnknown: actualChatCssUnknown.length,
      actualCaptureScaleSuspect: actualCaptureScaleSuspect.length,
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

function isActualCaptureScaleSuspect(fixture) {
  if (fixture.actualImageFormat && fixture.actualImageFormat !== 'png') return true;
  const [scaleX, scaleY] = fixture.actualScreenshotScale ?? [];
  return Math.abs(Number(scaleX ?? 1) - 1) > 0.01 || Math.abs(Number(scaleY ?? 1) - 1) > 0.01;
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
  const sidecarJson = await readJsonIfExists(sidecar);
  if (!existsSync(local) || !existsSync(actual)) {
    return {
      fixtureId,
      status: 'MISSING',
      local: rel(local),
      actual: rel(actual),
      sidecar: rel(sidecar),
      actualChatCss: summarizeActualChatCss(sidecarJson),
      note: !existsSync(local) ? 'missing local ChatPane screenshot' : 'missing actual Roll20 chat screenshot',
    };
  }

  const actualCrop = buildActualTemplateCrop(sidecarJson);
  if (!actualCrop && existsSync(localTemplate)) {
    return {
      fixtureId,
      status: 'NEEDS_NORMALIZED_CAPTURE',
      local: rel(local),
      actual: rel(actual),
      sidecar: rel(sidecar),
      sidecarRolltemplateCount: Number(sidecarJson?.rolltemplateCount ?? sidecarJson?.rolltemplates?.length ?? 0),
      actualChatCss: summarizeActualChatCss(sidecarJson),
      note: 'actual Roll20 chat sidecar lacks rolltemplate rect/clip metadata for element-level comparison',
    };
  }
  const diff = await compareImages(page, { local, actual, actualCrop });
  const localImageFormat = await sniffImageFormat(local);
  const actualImageFormat = await sniffImageFormat(actual);
  return {
    fixtureId,
    status: 'DIFFED',
    local: rel(local),
    actual: rel(actual),
    sidecar: rel(sidecar),
    sidecarRolltemplateCount: Number(sidecarJson?.rolltemplateCount ?? sidecarJson?.rolltemplates?.length ?? 0),
    actualChatCss: summarizeActualChatCss(sidecarJson),
    compareMode: actualCrop ? 'rolltemplate-crop' : 'full-chat-fallback',
    actualCrop,
    localSize: diff.localSize,
    localImageFormat,
    actualSize: diff.actualSize,
    actualImageFormat,
    actualSource: diff.actualSource,
    actualScreenshotScale: actualCrop?.clip
      ? [
          Number((diff.actualSize[0] / actualCrop.clip.width).toFixed(4)),
          Number((diff.actualSize[1] / actualCrop.clip.height).toFixed(4)),
        ]
      : null,
    comparedSize: diff.comparedSize,
    mismatchRatio: diff.mismatchRatio,
    mismatchPct: pct(diff.mismatchRatio),
    rmsRgb: diff.rmsRgb,
    bounds: diff.bounds,
    note: 'Diagnostic local ChatPane vs actual Roll20 chat comparison. Requires human classification before a parity claim.',
  };
}

async function sniffImageFormat(file) {
  const bytes = await readFile(file);
  if (bytes.length >= 8 && bytes.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return 'unknown';
}

function summarizeActualChatCss(sidecar) {
  const evidence = sidecar?.chatCssEvidence;
  if (!evidence) {
    return {
      classification: 'UNKNOWN',
      note: 'actual Roll20 chat sidecar has no chatCssEvidence field',
    };
  }
  const scopedUnprefixedRules = evidence.scopedUnprefixedRules ?? evidence.scopedUnprefixedRolltemplateRules ?? [];
  const unprefixedRules = evidence.unprefixedRules ?? evidence.unprefixedRolltemplateRules ?? [];
  const hasScopedOrUnprefixedMismatch =
    Boolean(evidence.scopedUnprefixedRulePresent) ||
    Boolean(evidence.unprefixedRulePresent) ||
    (Array.isArray(scopedUnprefixedRules) && scopedUnprefixedRules.length > 0) ||
    (Array.isArray(unprefixedRules) && unprefixedRules.length > 0);
  const classification =
    evidence.classification === 'CSS_RULE_MISSING_IN_PAGE_STYLES' && hasScopedOrUnprefixedMismatch
      ? 'ROLLTEMPLATE_CSS_SCOPED_OR_PREFIX_MISMATCH'
      : evidence.classification ?? 'UNKNOWN';
  return {
    classification,
    anyExpectedRulePresent: Boolean(evidence.anyExpectedRulePresent),
    expectedRules: evidence.expectedRules ?? {},
    scopedUnprefixedRules,
    unprefixedRules,
    styleTextLength: Number(evidence.styleTextLength ?? 0),
    templateCount: Number(evidence.templateCount ?? 0),
    capturedAt: evidence.capturedAt ?? null,
    note: evidence.note ?? '',
  };
}

function buildActualTemplateCrop(sidecar) {
  const clip = sidecar?.clip ?? sidecar?.screenshotClipApplied ?? null;
  const templates = Array.isArray(sidecar?.rolltemplates) ? sidecar.rolltemplates : [];
  const latest = sidecar?.latestTemplate?.rect?.width && sidecar?.latestTemplate?.rect?.height
    ? sidecar.latestTemplate
    : null;
  const template =
    (latest && rectIntersectsClip(latest.rect, clip) ? latest : null) ??
    [...templates].reverse().find((item) => item?.rect?.width && item?.rect?.height && rectIntersectsClip(item.rect, clip)) ??
    [...templates].reverse().find((item) => item?.rect?.width && item?.rect?.height);
  if (!template?.rect || !clip?.width || !clip?.height) return null;
  return {
    rect: template.rect,
    clip,
    templateIndex: template.index ?? null,
    templateClassName: template.className ?? '',
    templateSelection: latest === template ? 'latestTemplate' : 'rolltemplates-reverse',
    intersectsClip: rectIntersectsClip(template.rect, clip),
  };
}

function rectIntersectsClip(rect, clip) {
  if (!rect?.width || !rect?.height || !clip?.width || !clip?.height) return false;
  const rectLeft = Number(rect.left ?? rect.x ?? 0);
  const rectTop = Number(rect.top ?? rect.y ?? 0);
  const rectRight = Number(rect.right ?? rectLeft + rect.width);
  const rectBottom = Number(rect.bottom ?? rectTop + rect.height);
  const clipLeft = Number(clip.left ?? clip.x ?? 0);
  const clipTop = Number(clip.top ?? clip.y ?? 0);
  const clipRight = Number(clip.right ?? clipLeft + clip.width);
  const clipBottom = Number(clip.bottom ?? clipTop + clip.height);
  return rectRight > clipLeft && rectLeft < clipRight && rectBottom > clipTop && rectTop < clipBottom;
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
  lines.push(`Actual chat CSS inactive: ${report.summary.actualChatCssInactive}`);
  lines.push(`Actual chat CSS scoped/prefix mismatch: ${report.summary.actualChatCssScopedMismatch}`);
  lines.push(`Actual chat CSS unknown: ${report.summary.actualChatCssUnknown}`);
  lines.push(`Actual capture scale/format suspect: ${report.summary.actualCaptureScaleSuspect}`);
  lines.push(`Max mismatch: ${pct(report.summary.maxMismatchRatio)}`);
  lines.push(`Max normalized mismatch: ${pct(report.summary.maxNormalizedMismatchRatio)}`);
  lines.push('');
  lines.push('| Fixture | Status | Mode | Actual CSS | Local | Actual | Rolltemplates | Local size | Actual image | Actual scale | Actual source | Compared | Mismatch | RMS | Note |');
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | ---: | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.compareMode ?? ''} | ${fixture.actualChatCss?.classification ?? ''} | \`${fixture.local}\` | \`${fixture.actual}\` | ${fixture.sidecarRolltemplateCount ?? ''} | ${fixture.localSize?.join('x') ?? ''} ${fixture.localImageFormat ? `(${fixture.localImageFormat})` : ''} | ${fixture.actualSize?.join('x') ?? ''} ${fixture.actualImageFormat ? `(${fixture.actualImageFormat})` : ''} | ${fixture.actualScreenshotScale?.join('x') ?? ''} | ${fixture.actualSource?.join(',') ?? ''} | ${fixture.comparedSize?.join('x') ?? ''} | ${fixture.mismatchPct ?? ''} | ${fixture.rmsRgb ?? ''} | ${fixture.note} |`);
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

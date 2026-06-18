#!/usr/bin/env node
/**
 * Classify visual fixture diff causes from local-only fixture/report evidence.
 *
 * This script reads ignored fixture source copies and ignored browser diff
 * results, then writes an ignored diagnostic report. It does not prove visual
 * parity and must not be used as a pass/fail gate for Roll20 parity.
 *
 * Usage:
 *   node scripts/classify_visual_fixture_diffs.mjs \
 *     [reports/visual-fixture-diff] [test-fixtures/visual]
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const REPORT_DIR = path.resolve(args[0] ?? 'reports/visual-fixture-diff');
const FIXTURE_ROOT = path.resolve(args[1] ?? 'test-fixtures/visual');
const RESULT_JSON = path.join(REPORT_DIR, 'visual-fixture-diff-results.json');
const OUT_JSON = path.join(REPORT_DIR, 'visual-fixture-diff-classification.json');
const OUT_MD = path.join(REPORT_DIR, 'visual-fixture-diff-classification.md');

const HTML_PATTERNS = {
  inputs: /<input\b/gi,
  hiddenInputs: /<input\b(?=[^>]*\btype\s*=\s*["']?hidden\b)/gi,
  checkboxes: /<input\b(?=[^>]*\btype\s*=\s*["']?checkbox\b)/gi,
  radios: /<input\b(?=[^>]*\btype\s*=\s*["']?radio\b)/gi,
  checkedAttrs: /\bchecked(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi,
  selectedAttrs: /\bselected(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi,
  valueAttrs: /\bvalue\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
  dataI18n: /\bdata-i18n(?:-[a-z0-9_-]+)?\s*=/gi,
  workerScripts: /<script\b(?=[^>]*\btype\s*=\s*["']?text\/worker\b)/gi,
  scriptTags: /<script\b/gi,
  rolltemplates: /<rolltemplate\b/gi,
};

const CSS_PATTERNS = {
  checkedSelectors: /:checked\b/gi,
  notCheckedSelectors: /:not\(\s*:checked\s*\)/gi,
  valueSelectors: /\[[^\]]*\bvalue\s*=/gi,
  siblingSelectors: /(?:~|\+)\s*(?:\.|#|\w|\[)/g,
  mediaQueries: /@media\b/gi,
  backgroundUrls: /background(?:-image)?\s*:[^;}]*url\(/gi,
  urlRefs: /url\(/gi,
  importRules: /@import\b/gi,
  fontFaces: /@font-face\b/gi,
  absolutePositions: /position\s*:\s*absolute\b/gi,
  fixedPositions: /position\s*:\s*fixed\b/gi,
  displayNone: /display\s*:\s*none\b/gi,
  visibilityHidden: /visibility\s*:\s*hidden\b/gi,
};

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function pct(value) {
  return typeof value === 'number' ? `${Math.round(value * 10000) / 100}%` : 'n/a';
}

function fmtSize(size) {
  return Array.isArray(size) ? `${size[0]}x${size[1]}` : 'n/a';
}

function fmtCrop(crop) {
  return Array.isArray(crop) ? crop.join(',') : 'n/a';
}

async function readText(file) {
  if (!existsSync(file)) return '';
  return fs.readFile(file, 'utf8');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function main() {
  if (!existsSync(RESULT_JSON)) {
    throw new Error(`missing ${RESULT_JSON}; run corepack pnpm run diff:visual-fixtures first`);
  }

  const diffReport = await readJson(RESULT_JSON);
  const entries = [];
  for (const diffEntry of diffReport.entries ?? []) {
    entries.push(await classifyEntry(diffEntry));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDiffReport: RESULT_JSON,
    fixtureRoot: FIXTURE_ROOT,
    scope: 'heuristic local-only diagnosis; not a Roll20 parity gate',
    pass: entries.every((entry) => entry.status !== 'error'),
    entries,
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUT_MD, renderMarkdown(report), 'utf8');

  for (const entry of entries) {
    console.log(`${entry.status.toUpperCase()} ${entry.fixtureId} cause=${entry.likelyCause}`);
  }
  console.log(report.pass ? 'VISUAL FIXTURE CLASSIFICATION PASS' : 'VISUAL FIXTURE CLASSIFICATION FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

async function classifyEntry(diffEntry) {
  const fixtureId = diffEntry.fixtureId ?? diffEntry.result?.fixtureId ?? 'unknown-fixture';
  const fixtureDir = path.join(FIXTURE_ROOT, fixtureId);
  const manifestPath = path.join(fixtureDir, 'manifest.json');
  const manifest = existsSync(manifestPath) ? await readJson(manifestPath) : null;
  const html = await readText(path.join(fixtureDir, 'source.html'));
  const css = await readText(path.join(fixtureDir, 'source.css'));
  const i18nPath = ['source.i18n', 'translation.json', 'translation.txt']
    .map((name) => path.join(fixtureDir, name))
    .find((file) => existsSync(file));
  const i18n = i18nPath ? await readText(i18nPath) : '';
  const result = diffEntry.result ?? {};
  const best = result.best ?? {};
  const topLeft = result.nativeTopLeft ?? {};

  const htmlStats = Object.fromEntries(
    Object.entries(HTML_PATTERNS).map(([key, pattern]) => [key, countMatches(html, pattern)]),
  );
  const cssStats = Object.fromEntries(
    Object.entries(CSS_PATTERNS).map(([key, pattern]) => [key, countMatches(css, pattern)]),
  );
  const i18nStats = {
    bytes: Buffer.byteLength(i18n),
    looksJson: /^\s*[{[]/.test(i18n),
    keyLikePairs: countMatches(i18n, /"[^"]+"\s*:/g),
  };

  const stateRisk = scoreStateRisk(htmlStats, cssStats);
  const assetRisk = scoreAssetRisk(cssStats, html);
  const cropGain = Number(result.cropImprovementRatio ?? 0);
  const bestMismatch = Number(best.mismatchRatio ?? 1);
  const topLeftMismatch = Number(topLeft.mismatchRatio ?? bestMismatch);
  const captureCrop = Array.isArray(best.captureCrop) ? best.captureCrop : [0, 0, 0, 0];
  const sizeRisk = scoreSizeRisk(result.referenceSize, result.captureSize);
  const categories = classifyCategories({
    cropGain,
    bestMismatch,
    topLeftMismatch,
    captureCrop,
    stateRisk,
    assetRisk,
    sizeRisk,
    cssStats,
    htmlStats,
    diffEntry,
  });

  return {
    fixtureId,
    status: diffEntry.pass === false || diffEntry.status === 'error' ? 'error' : 'classified',
    manifest: {
      corpus: manifest?.corpus ?? null,
      legacyMode: manifest?.legacyMode ?? null,
      visualStatus: manifest?.visualStatus ?? null,
      hasReference: Boolean(manifest?.referenceRelativeToSheet),
      hasI18n: Boolean(i18nPath),
    },
    diff: {
      bestMismatchRatio: bestMismatch,
      topLeftMismatchRatio: topLeftMismatch,
      cropImprovementRatio: cropGain,
      bestMode: result.bestMode ?? best.mode ?? null,
      referenceSize: result.referenceSize ?? null,
      captureSize: result.captureSize ?? null,
      bestCaptureCrop: best.captureCrop ?? null,
      dominantQuadrant: best.dominantQuadrant ?? null,
      dominantBand: best.dominantBand ?? null,
      consoleMessageCount: diffEntry.consoleMessages?.length ?? 0,
      pageErrorCount: diffEntry.pageErrors?.length ?? 0,
    },
    sourceSignals: {
      html: htmlStats,
      css: cssStats,
      i18n: i18nStats,
      stateRisk,
      assetRisk,
      sizeRisk,
    },
    categories,
    likelyCause: summarizeCause(categories, bestMismatch),
    nextAction: nextAction(categories),
  };
}

function scoreStateRisk(htmlStats, cssStats) {
  return (
    htmlStats.hiddenInputs * 0.1 +
    htmlStats.checkboxes * 1.5 +
    htmlStats.radios * 1.5 +
    htmlStats.checkedAttrs * 2 +
    htmlStats.selectedAttrs +
    cssStats.checkedSelectors * 2 +
    cssStats.notCheckedSelectors * 2 +
    cssStats.valueSelectors * 1.5 +
    cssStats.siblingSelectors * 0.5 +
    cssStats.displayNone * 0.25 +
    cssStats.visibilityHidden * 0.25
  );
}

function scoreAssetRisk(cssStats, html) {
  const htmlImg = countMatches(html, /<img\b/gi);
  const htmlInlineBackground = countMatches(html, /background(?:-image)?\s*:/gi);
  return cssStats.urlRefs + cssStats.backgroundUrls + htmlImg + htmlInlineBackground;
}

function scoreSizeRisk(referenceSize, captureSize) {
  if (!Array.isArray(referenceSize) || !Array.isArray(captureSize)) return 0;
  const [rw, rh] = referenceSize;
  const [cw, ch] = captureSize;
  if (!rw || !rh || !cw || !ch) return 0;
  return Math.abs(cw - rw) / rw + Math.abs(ch - rh) / rh;
}

function classifyCategories(input) {
  const categories = [];
  const {
    cropGain,
    bestMismatch,
    topLeftMismatch,
    captureCrop,
    stateRisk,
    assetRisk,
    sizeRisk,
    cssStats,
    htmlStats,
    diffEntry,
  } = input;

  if (cropGain >= 0.05 || (cropGain >= 0.02 && captureCrop[1] >= 120)) {
    categories.push('viewport/crop/default-state offset');
  } else if (cropGain <= 0.01 && bestMismatch >= 0.1) {
    categories.push('non-crop visual delta');
  }

  if (stateRisk >= 20) categories.push('default attr/state');
  else if (stateRisk >= 8) categories.push('possible default attr/state');

  if (assetRisk >= 10) categories.push('asset loading or background alignment');
  else if (assetRisk > 0) categories.push('possible asset/background contribution');

  if (cssStats.mediaQueries > 0 || sizeRisk >= 0.5) categories.push('viewport/sheet size');
  if (cssStats.absolutePositions + cssStats.fixedPositions >= 10) categories.push('positioning/layout CSS');
  if (htmlStats.dataI18n > 0) categories.push('translation/i18n');
  if ((diffEntry.consoleMessages?.length ?? 0) > 0 || (diffEntry.pageErrors?.length ?? 0) > 0) {
    categories.push('browser console/page error');
  }
  if (bestMismatch >= 0.15 && topLeftMismatch - bestMismatch < 0.03) {
    categories.push('Roll20 base/user CSS/rendering delta');
  }
  return [...new Set(categories)];
}

function summarizeCause(categories, bestMismatch) {
  if (categories.length === 0) return bestMismatch < 0.05 ? 'low diagnostic delta' : 'unclassified visual delta';
  const priority = [
    'viewport/crop/default-state offset',
    'default attr/state',
    'Roll20 base/user CSS/rendering delta',
    'asset loading or background alignment',
    'positioning/layout CSS',
    'viewport/sheet size',
    'translation/i18n',
    'non-crop visual delta',
  ];
  return priority.filter((category) => categories.includes(category)).slice(0, 3).join('; ') || categories.slice(0, 3).join('; ');
}

function nextAction(categories) {
  if (categories.includes('viewport/crop/default-state offset')) {
    return 'Normalize initial tab/default state and crop before changing renderer CSS.';
  }
  if (categories.includes('default attr/state')) {
    return 'Inspect hidden/radio/checkbox defaults and CSS state selectors against Roll20 actual view.';
  }
  if (categories.includes('asset loading or background alignment')) {
    return 'Check whether referenced images load in local preview and Roll20; cache/rewrite only for local verification if needed.';
  }
  if (categories.includes('Roll20 base/user CSS/rendering delta')) {
    return 'Compare computed CSS in local preview against Roll20 sandbox once actual screenshot/style evidence exists.';
  }
  if (categories.includes('translation/i18n')) {
    return 'Confirm translation payload is applied before screenshot comparison.';
  }
  return 'Review reference image crop/state and collect actual Roll20 sandbox screenshot.';
}

function renderMarkdown(report) {
  const lines = [
    '# Visual Fixture Diff Classification',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: heuristic local-only diagnosis. This is not a Roll20 visual parity gate.',
    '',
    '| Fixture | Best mismatch | Crop gain | Ref | Capture | Best crop | State risk | Asset risk | Likely cause | Next action |',
    '| --- | ---: | ---: | --- | --- | --- | ---: | ---: | --- | --- |',
  ];

  for (const entry of report.entries) {
    lines.push([
      entry.fixtureId,
      pct(entry.diff.bestMismatchRatio),
      pct(entry.diff.cropImprovementRatio),
      fmtSize(entry.diff.referenceSize),
      fmtSize(entry.diff.captureSize),
      fmtCrop(entry.diff.bestCaptureCrop),
      Math.round(entry.sourceSignals.stateRisk * 10) / 10,
      entry.sourceSignals.assetRisk,
      entry.likelyCause,
      entry.nextAction,
    ].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push(
    '',
    '## Source Signals',
    '',
  );
  for (const entry of report.entries) {
    lines.push(
      `### ${entry.fixtureId}`,
      '',
      `- Categories: ${entry.categories.join(', ') || 'none'}`,
      `- HTML controls: inputs=${entry.sourceSignals.html.inputs}, hidden=${entry.sourceSignals.html.hiddenInputs}, checkbox=${entry.sourceSignals.html.checkboxes}, radio=${entry.sourceSignals.html.radios}, checked=${entry.sourceSignals.html.checkedAttrs}`,
      `- CSS state selectors: :checked=${entry.sourceSignals.css.checkedSelectors}, :not(:checked)=${entry.sourceSignals.css.notCheckedSelectors}, [value]=${entry.sourceSignals.css.valueSelectors}, sibling=${entry.sourceSignals.css.siblingSelectors}`,
      `- CSS/resource hints: urls=${entry.sourceSignals.css.urlRefs}, backgrounds=${entry.sourceSignals.css.backgroundUrls}, media=${entry.sourceSignals.css.mediaQueries}, absolute=${entry.sourceSignals.css.absolutePositions}`,
      `- I18n: has=${entry.manifest.hasI18n}, bytes=${entry.sourceSignals.i18n.bytes}, keyLikePairs=${entry.sourceSignals.i18n.keyLikePairs}`,
      '',
    );
  }
  return `${lines.join('\n')}\n`;
}

function mdCell(value) {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

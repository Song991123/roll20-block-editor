#!/usr/bin/env node
/**
 * Route the next Roll20 chat browser-paint/decode investigation.
 *
 * Diagnostic only. This does not fetch, store, or publish sheet assets and does
 * not change renderer CSS. It decides whether browser paint work is currently
 * blocked by missing/relinked assets, ready to probe, or secondary.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const selfTest = args.includes('--self-test');
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-browser-paint-plan');

if (selfTest) selfTestPlan();
else await main();

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function firstPositionalArg() {
  return args.find((arg, index) => !arg.startsWith('--') && arg !== '--self-test' && args[index - 1] !== '--out-dir');
}

async function main() {
  const assetProbe = await readOptionalJson(path.join(runDir, 'chat-background-asset-probe', 'chat-background-asset-probe-results.json'));
  const assetPlan = await readOptionalJson(path.join(runDir, 'chat-asset-preservation-plan', 'chat-asset-preservation-plan-results.json'));
  const backgroundRaster = await readOptionalJson(path.join(runDir, 'chat-background-raster-model-probe', 'chat-background-raster-model-probe-results.json'));
  const backgroundSource = await readOptionalJson(path.join(runDir, 'chat-background-source-probe', 'chat-background-source-probe-results.json'));
  const rowCompositing = await readOptionalJson(path.join(runDir, 'chat-row-compositing-probe', 'chat-row-compositing-probe-results.json'));
  const fixtureIds = collectFixtureIds(assetProbe, assetPlan, backgroundRaster, backgroundSource, rowCompositing);
  const fixtures = fixtureIds.map((fixtureId) => classifyFixture(fixtureId, {
    assetProbe: findFixture(assetProbe?.fixtures, fixtureId),
    assetPlan: findFixture(assetPlan?.fixtures, fixtureId),
    backgroundRaster: findFixture(backgroundRaster?.fixtures, fixtureId),
    backgroundSource: findFixture(backgroundSource?.fixtures, fixtureId),
    rowCompositing: findFixture(rowCompositing?.fixtures, fixtureId),
  }));
  const ready = fixtures.filter((fixture) => fixture.decision === 'READY_FOR_BROWSER_PAINT_CONTEXT_PROBE');
  const blocked = fixtures.filter((fixture) => fixture.decision === 'BLOCKED_BY_ASSET_RELINK');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only browser paint/decode routing; no asset storage and no production CSS',
    summary: {
      status: blocked.length ? 'BROWSER_PAINT_BLOCKED_BY_RELINK' : ready.length ? 'BROWSER_PAINT_PROBE_READY' : 'BROWSER_PAINT_SECONDARY',
      fixtures: fixtures.length,
      ready: ready.length,
      blocked: blocked.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-browser-paint-plan-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-browser-paint-plan-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT BROWSER PAINT PLAN ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} asset=${fixture.assetDecision || 'n/a'} raster=${fixture.rasterDecision || 'n/a'} flat=${fixture.flatPaintMismatchSharePct || 'n/a'} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function classifyFixture(fixtureId, reports) {
  const asset = reports.assetProbe ?? {};
  const assetPlan = reports.assetPlan ?? {};
  const raster = reports.backgroundRaster ?? {};
  const source = reports.backgroundSource ?? {};
  const compositing = reports.rowCompositing ?? {};
  const priority = assetPlan.priority ?? raster.priority ?? asset.priority ?? source.priority ?? 'P2';
  const decision = decide({ asset, assetPlan, raster, source, compositing, priority });
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    assetDecision: asset.decision ?? '',
    assetPlanDecision: assetPlan.decision ?? '',
    rasterDecision: raster.decision ?? '',
    backgroundSourceDecision: source.decision ?? '',
    backgroundStyleDecision: source.backgroundStyleDecision ?? '',
    cssDeclarationsMatch: source.backgroundStyleDecision === 'DECLARATIONS_MATCH',
    rowWeightedMismatchPct: raster.rowWeightedMismatchPct ?? compositing.summary?.rowWeightedMismatchPct ?? '',
    lumaCorrectionGainPct: numberOrNull(raster.lumaCorrectionGainPct ?? compositing.summary?.lumaCorrectionGainPct),
    edgeMismatchSharePct: raster.edgeMismatchSharePct ?? compositing.summary?.edgeMismatchSharePct ?? '',
    flatPaintMismatchSharePct: raster.flatPaintMismatchSharePct ?? compositing.summary?.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: raster.localDarkerMismatchSharePct ?? compositing.summary?.localDarkerMismatchSharePct ?? '',
    chromaMismatchSharePct: raster.chromaMismatchSharePct ?? compositing.summary?.chromaMismatchSharePct ?? '',
    worstRow: raster.worstRow ?? summarizeWorstRow(compositing),
    asset: {
      localSummary: asset.localAsset?.summary ?? assetPlan.asset?.localSummary ?? '',
      actualSummary: asset.actualAsset?.summary ?? assetPlan.asset?.actualSummary ?? '',
      sourceSummary: asset.sourceAsset?.summary ?? assetPlan.asset?.sourceSummary ?? '',
      hashesMatch: Boolean(asset.hashesMatch ?? assetPlan.asset?.hashesMatch),
      sourceMatchesProxy: Boolean(asset.sourceMatchesProxy ?? assetPlan.asset?.sourceMatchesProxy),
      placeholder: Boolean(asset.localAsset?.placeholder || asset.actualAsset?.placeholder || asset.sourceAsset?.placeholder || assetPlan.asset?.localPlaceholder || assetPlan.asset?.actualPlaceholder || assetPlan.asset?.sourcePlaceholder),
    },
    requiredEvidence: requiredEvidence(decision),
  };
}

function decide({ asset, assetPlan, raster, source, compositing, priority }) {
  if (assetPlan.decision === 'SOURCE_ASSET_LOST_RELINK_REQUIRED' || asset.decision === 'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER') {
    return 'BLOCKED_BY_ASSET_RELINK';
  }
  if (assetPlan.decision === 'ROLL20_PROXY_OR_CACHE_BYTES_DIFFER' || asset.decision === 'LOCAL_ACTUAL_ASSET_BYTES_DIFFER') {
    return 'PROXY_OR_CACHE_BYTES_FIRST';
  }
  if (assetPlan.decision === 'RECAPTURE_ASSET_BYTES' || asset.decision === 'ASSET_FETCH_INCOMPLETE') {
    return 'RECAPTURE_ASSET_BYTES_FIRST';
  }
  if (asset.decision === 'NO_BACKGROUND_IMAGE') return 'PAINT_SECONDARY_NO_BACKGROUND_IMAGE';
  if (
    (assetPlan.decision === 'BROWSER_PAINT_CONTEXT_REQUIRED' || asset.decision === 'ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT' || isPaintRasterDecision(raster.decision)) &&
    source.backgroundStyleDecision === 'DECLARATIONS_MATCH' &&
    pctNumber(raster.flatPaintMismatchSharePct ?? compositing.summary?.flatPaintMismatchSharePct) >= 80
  ) {
    return 'READY_FOR_BROWSER_PAINT_CONTEXT_PROBE';
  }
  if (isPaintRasterDecision(raster.decision)) return 'PAINT_CONTEXT_NEEDS_ASSET_PROBE';
  if (priority === 'P2') return 'PAINT_SECONDARY';
  return 'PAINT_SECONDARY';
}

function isPaintRasterDecision(decision) {
  return [
    'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED',
    'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED',
  ].includes(decision);
}

function nextAction(decision) {
  switch (decision) {
    case 'BLOCKED_BY_ASSET_RELINK':
      return 'fill the local-only asset replacement map with user-owned HTTP(S) URLs, rerun preupload/Sandbox comparison, then rerun this browser-paint plan';
    case 'READY_FOR_BROWSER_PAINT_CONTEXT_PROBE':
      return 'compare decoded image paint boxes, background-size/repeat/position, template crop, and row flat-paint pixels before any ChatPane CSS candidate';
    case 'PROXY_OR_CACHE_BYTES_FIRST':
      return 'resolve Roll20 proxy/cache byte differences before browser paint or renderer CSS work';
    case 'RECAPTURE_ASSET_BYTES_FIRST':
      return 'rerun background asset probe with reachable source/proxy URLs before paint conclusions';
    case 'PAINT_CONTEXT_NEEDS_ASSET_PROBE':
      return 'run diagnose:roll20-chat-background-assets and plan:roll20-chat-assets before browser paint work';
    case 'PAINT_SECONDARY_NO_BACKGROUND_IMAGE':
      return 'no background image in current chat evidence; keep this fixture on non-image cascade/geometry diagnostics';
    default:
      return 'keep browser paint secondary for this fixture';
  }
}

function requiredEvidence(decision) {
  switch (decision) {
    case 'BLOCKED_BY_ASSET_RELINK':
      return [
        'plan:roll20-asset-relink reports\\roll20-actual-compare\\<label> --map-file <local-map.txt> reports COVERED_ROLL20_READY',
        'verify:roll20-preupload uses the same asset map',
        'fresh Roll20 Sandbox screenshots/chat evidence after relink',
      ];
    case 'READY_FOR_BROWSER_PAINT_CONTEXT_PROBE':
      return [
        'decoded source/proxy bytes are non-placeholder and local/actual hashes match',
        'local and actual background declarations match',
        'row-compositing says flat-paint mismatch dominates while edge mismatch is low',
        'browser-painted background test preserves the same CSS background-size/repeat/position and crop context',
      ];
    default:
      return [];
  }
}

function summarizeWorstRow(compositing) {
  const row = compositing?.worstRows?.[0];
  if (!row) return null;
  return {
    index: row.index,
    mismatchPct: row.mismatchPct ?? '',
    decision: row.decision ?? '',
    flatPaintMismatchSharePct: row.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: row.localDarkerMismatchSharePct ?? '',
    chromaMismatchSharePct: row.chromaMismatchSharePct ?? '',
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Browser Paint Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This routes browser paint/decode work after asset preservation checks and does not change renderer CSS.',
    '',
    '| Fixture | Priority | Decision | Asset | Raster | Flat | Chroma | Next |',
    '| --- | --- | --- | --- | --- | ---: | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.assetDecision || 'n/a'} | ${fixture.rasterDecision || 'n/a'} | ${fixture.flatPaintMismatchSharePct || 'n/a'} | ${fixture.chromaMismatchSharePct || 'n/a'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Required Evidence', '');
  for (const fixture of report.fixtures) {
    if (!fixture.requiredEvidence.length) continue;
    lines.push(`### ${fixture.fixtureId}`);
    for (const item of fixture.requiredEvidence) lines.push(`- ${item}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- This plan does not prove Roll20 visual parity.');
  lines.push('- Generated reports and Roll20 evidence remain local-only.');
  return `${lines.join('\n')}\n`;
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

async function readOptionalJson(file) {
  try {
    return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function pctNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value <= 1 ? value * 100 : value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace('%', '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function selfTestPlan() {
  const blocked = classifyFixture('blocked', {
    assetProbe: { decision: 'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER' },
    assetPlan: { decision: 'SOURCE_ASSET_LOST_RELINK_REQUIRED' },
    backgroundRaster: { decision: 'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED', flatPaintMismatchSharePct: '100%' },
    backgroundSource: { backgroundStyleDecision: 'DECLARATIONS_MATCH' },
  });
  assert.equal(blocked.decision, 'BLOCKED_BY_ASSET_RELINK');
  assert.match(blocked.nextAction, /asset replacement map/);

  const ready = classifyFixture('ready', {
    assetProbe: {
      decision: 'ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT',
      localAsset: { summary: '200 image/png 12345b png 800x600', placeholder: false },
      actualAsset: { summary: '200 image/png 12345b png 800x600', placeholder: false },
      sourceAsset: { summary: '200 image/png 12345b png 800x600', placeholder: false },
      hashesMatch: true,
      sourceMatchesProxy: true,
    },
    assetPlan: { decision: 'BROWSER_PAINT_CONTEXT_REQUIRED' },
    backgroundRaster: {
      decision: 'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED',
      flatPaintMismatchSharePct: '100%',
      chromaMismatchSharePct: '48%',
    },
    backgroundSource: { backgroundStyleDecision: 'DECLARATIONS_MATCH' },
  });
  assert.equal(ready.decision, 'READY_FOR_BROWSER_PAINT_CONTEXT_PROBE');
  assert.equal(ready.requiredEvidence.length, 4);

  const noImage = classifyFixture('none', {
    assetProbe: { decision: 'NO_BACKGROUND_IMAGE' },
  });
  assert.equal(noImage.decision, 'PAINT_SECONDARY_NO_BACKGROUND_IMAGE');
  console.log('roll20_chat_browser_paint_plan self-test PASS');
}

#!/usr/bin/env node
/**
 * Convert Roll20 chat background asset evidence into an action plan.
 *
 * Diagnostic only. It never downloads or stores sheet assets. The goal is to
 * decide whether the next work belongs to renderer CSS, Roll20 proxy behavior,
 * or user-facing asset preservation/relinking.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set(['--out-dir', '--asset-probe-dir', '--background-raster-dir', '--target-plan-dir']);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const SELF_TEST = rawArgs.includes('--self-test');
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-asset-preservation-plan');
const assetProbeDir = path.resolve(readOption('--asset-probe-dir', path.join(runDir, 'chat-background-asset-probe')));
const backgroundRasterDir = path.resolve(readOption('--background-raster-dir', path.join(runDir, 'chat-background-raster-model-probe')));
const targetPlanDir = path.resolve(readOption('--target-plan-dir', path.join(runDir, 'chat-targeted-renderer-plan')));

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function firstPositionalArg() {
  return args.find((arg) => !arg.startsWith('--') && arg !== '--self-test');
}

async function main() {
  const assetProbe = await readOptionalJson(path.join(assetProbeDir, 'chat-background-asset-probe-results.json'));
  const backgroundRaster = await readOptionalJson(path.join(backgroundRasterDir, 'chat-background-raster-model-probe-results.json'));
  const targetPlan = await readOptionalJson(path.join(targetPlanDir, 'chat-targeted-renderer-plan-results.json'));
  const fixtureIds = collectFixtureIds(assetProbe, backgroundRaster, targetPlan);
  const fixtures = fixtureIds.map((fixtureId) => classifyFixture(fixtureId, {
    assetProbe: findFixture(assetProbe?.fixtures, fixtureId),
    backgroundRaster: findFixture(backgroundRaster?.fixtures, fixtureId),
    targetPlan: findFixture(targetPlan?.fixtures, fixtureId),
  }));
  const blockers = fixtures.flatMap((fixture) => fixture.blockers.map((blocker) => `${fixture.fixtureId}: ${blocker}`));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    reportOverrides: {
      outDir: rel(outDir),
      assetProbeDir: rel(assetProbeDir),
      backgroundRasterDir: rel(backgroundRasterDir),
      targetPlanDir: rel(targetPlanDir),
    },
    scope: 'diagnostic-only asset preservation/proxy/browser-paint plan; no asset redistribution',
    rendererAction: blockers.length ? 'HOLD_RENDERER_FOR_ASSET_POLICY' : 'ASSET_POLICY_SECONDARY',
    summary: {
      fixtures: fixtures.length,
      actionable: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'NO_BACKGROUND_IMAGE').length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      blockers: blockers.length,
      productionSafe: false,
    },
    fixtures,
    blockers,
    productRequirements: buildProductRequirements(fixtures),
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-asset-preservation-plan-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-asset-preservation-plan-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT ASSET PRESERVATION PLAN action=${report.rendererAction} blockers=${blockers.length}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function classifyFixture(fixtureId, reports) {
  const asset = reports.assetProbe ?? {};
  const raster = reports.backgroundRaster ?? {};
  const target = reports.targetPlan ?? {};
  const priority = target.priority ?? raster.priority ?? asset.priority ?? 'P2';
  const decision = decide(asset, raster);
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    rendererPolicy: rendererPolicy(decision),
    blockers: blockers(decision),
    evidence: evidence(asset, raster, target),
    asset: {
      localCssUrl: asset.localCssUrl || '',
      actualCssUrl: asset.actualCssUrl || '',
      sourceUrl: asset.sourceUrl || '',
      hashesMatch: Boolean(asset.hashesMatch),
      sourceMatchesProxy: Boolean(asset.sourceMatchesProxy),
      localSummary: asset.localAsset?.summary || '',
      actualSummary: asset.actualAsset?.summary || '',
      sourceSummary: asset.sourceAsset?.summary || '',
      sourcePlaceholder: Boolean(asset.sourceAsset?.placeholder),
      localPlaceholder: Boolean(asset.localAsset?.placeholder),
      actualPlaceholder: Boolean(asset.actualAsset?.placeholder),
    },
  };
}

function decide(asset, raster) {
  if (!asset?.decision || asset.decision === 'NO_BACKGROUND_IMAGE') return 'NO_BACKGROUND_IMAGE';
  if (asset.decision === 'LOCAL_ACTUAL_ASSET_BYTES_DIFFER') return 'ROLL20_PROXY_OR_CACHE_BYTES_DIFFER';
  if (asset.decision === 'ASSET_FETCH_INCOMPLETE') return 'RECAPTURE_ASSET_BYTES';
  if (asset.decision === 'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER') return 'SOURCE_ASSET_LOST_RELINK_REQUIRED';
  if (asset.decision === 'ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT' || isBrowserPaintRasterDecision(raster?.decision)) {
    return 'BROWSER_PAINT_CONTEXT_REQUIRED';
  }
  return 'ASSET_BYTES_SECONDARY';
}

function isBrowserPaintRasterDecision(decision) {
  return [
    'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED',
    'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED',
  ].includes(decision);
}

function nextAction(decision) {
  switch (decision) {
    case 'SOURCE_ASSET_LOST_RELINK_REQUIRED':
      return 'use the local-only asset replacement map with a user-owned hosted URL, then rerun local preview/edit/export and Roll20 Sandbox comparison before judging visual parity';
    case 'ROLL20_PROXY_OR_CACHE_BYTES_DIFFER':
      return 'compare Roll20 proxy cache behavior and URL normalization before any renderer CSS patch';
    case 'RECAPTURE_ASSET_BYTES':
      return 'rerun background asset probe with reachable URLs before making paint or CSS conclusions';
    case 'BROWSER_PAINT_CONTEXT_REQUIRED':
      return 'compare browser decoded image paint boxes and CSS background paint context before changing ChatPane CSS';
    case 'ASSET_BYTES_SECONDARY':
      return 'keep asset bytes as secondary evidence and continue renderer-specific diagnostics';
    default:
      return 'no background image in this chat evidence; keep non-image cascade/raster diagnostics';
  }
}

function rendererPolicy(decision) {
  if (decision === 'SOURCE_ASSET_LOST_RELINK_REQUIRED' || decision === 'ROLL20_PROXY_OR_CACHE_BYTES_DIFFER') {
    return 'DO_NOT_PROMOTE_CSS';
  }
  if (decision === 'BROWSER_PAINT_CONTEXT_REQUIRED') return 'CSS_HELD_UNTIL_PAINT_PROVEN';
  return 'SECONDARY';
}

function blockers(decision) {
  switch (decision) {
    case 'SOURCE_ASSET_LOST_RELINK_REQUIRED':
      return [
        'external source/proxy currently resolves to a placeholder image',
        'visual parity cannot be judged against the intended original asset until the user relinks or rehosts it',
      ];
    case 'ROLL20_PROXY_OR_CACHE_BYTES_DIFFER':
      return ['local and actual Roll20 asset bytes differ'];
    case 'RECAPTURE_ASSET_BYTES':
      return ['asset byte evidence is incomplete'];
    case 'BROWSER_PAINT_CONTEXT_REQUIRED':
      return ['asset bytes match, but browser paint/raster context still differs'];
    default:
      return [];
  }
}

function evidence(asset, raster, target) {
  const out = [];
  if (target?.strategy) out.push(`target strategy ${target.strategy}`);
  if (asset?.decision) out.push(`asset probe ${asset.decision}`);
  if (raster?.decision) out.push(`background raster ${raster.decision}`);
  if (asset?.localAsset?.summary) out.push(`local ${asset.localAsset.summary}`);
  if (asset?.actualAsset?.summary) out.push(`actual ${asset.actualAsset.summary}`);
  if (asset?.sourceAsset?.summary) out.push(`source ${asset.sourceAsset.summary}`);
  if (asset?.hashesMatch) out.push('local/actual asset hashes match');
  if (asset?.sourceMatchesProxy) out.push('proxy/source asset hashes match');
  return out;
}

function buildProductRequirements(fixtures) {
  const needsRelink = fixtures.some((fixture) => fixture.decision === 'SOURCE_ASSET_LOST_RELINK_REQUIRED');
  const needsPaint = fixtures.some((fixture) => fixture.decision === 'BROWSER_PAINT_CONTEXT_REQUIRED');
  const requirements = [];
  if (needsRelink) {
    requirements.push({
      id: 'asset-relink-warning',
      priority: 'P0',
      requirement: 'Export/import UI must preserve a local-only asset replacement map and explain that dead Imgur/Roll20 proxy sources must be relinked or rehosted by the user before visual parity can be judged.',
      implementationStatus: 'implemented-local-map-autosave-restore',
      publicSafety: 'Do not store or commit third-party sheet assets; use user-provided replacement URLs and keep verification evidence local.',
    });
  }
  if (needsPaint) {
    requirements.push({
      id: 'browser-paint-probe',
      priority: 'P1',
      requirement: 'Add a browser paint-box diagnostic before another ChatPane CSS candidate when asset bytes match but raster differs.',
      publicSafety: 'Generated screenshots and decoded asset evidence remain ignored local reports.',
    });
  }
  requirements.push({
    id: 'renderer-hold',
    priority: 'P0',
    requirement: 'Keep production ChatPane renderer CSS held until asset/proxy/browser-paint blockers are classified.',
    publicSafety: 'No public sample sheet assets or screenshots.',
  });
  return requirements;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Asset Preservation Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Renderer action: **${report.rendererAction}**`,
    '',
    'Scope: diagnostic-only. This does not download, store, publish, or redistribute sheet assets.',
    '',
    '| Fixture | Priority | Decision | Renderer policy | Local/Actual | Source | Next |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.rendererPolicy} | ${fixture.asset.localSummary || 'n/a'} / ${fixture.asset.actualSummary || 'n/a'} | ${fixture.asset.sourceSummary || 'n/a'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Product Requirements', '');
  for (const req of report.productRequirements) {
    const status = req.implementationStatus ? ` Status: ${req.implementationStatus}.` : '';
    lines.push(`- ${req.priority} \`${req.id}\`: ${req.requirement}${status} ${req.publicSafety}`);
  }
  lines.push('', '## Blockers', '');
  if (report.blockers.length) {
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- No asset-preservation blocker found in this report.');
  }
  lines.push('', '## Evidence', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const item of fixture.evidence) lines.push(`- ${item}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      if (fixture.fixtureId) ids.add(fixture.fixtureId);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function selfTest() {
  const lost = classifyFixture('sample', {
    assetProbe: {
      decision: 'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER',
      localAsset: { summary: '200 image/png 503b png 161x81', placeholder: true },
      actualAsset: { summary: '200 image/png 503b png 161x81', placeholder: true },
      sourceAsset: { summary: '200 image/png 503b png 161x81 removed.png', placeholder: true },
      hashesMatch: true,
      sourceMatchesProxy: true,
    },
    backgroundRaster: { decision: 'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED' },
    targetPlan: { priority: 'P0', strategy: 'COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL' },
  });
  assert.equal(lost.decision, 'SOURCE_ASSET_LOST_RELINK_REQUIRED');
  assert.equal(lost.rendererPolicy, 'DO_NOT_PROMOTE_CSS');
  assert.match(lost.nextAction, /asset replacement map/);
  const requirements = buildProductRequirements([lost]);
  assert.equal(requirements[0].implementationStatus, 'implemented-local-map-autosave-restore');
  const paint = classifyFixture('paint', {
    assetProbe: {
      decision: 'ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT',
      localAsset: { summary: '200 image/png 12345b png 800x600', placeholder: false },
      actualAsset: { summary: '200 image/png 12345b png 800x600', placeholder: false },
      sourceAsset: { summary: '200 image/png 12345b png 800x600', placeholder: false },
      hashesMatch: true,
      sourceMatchesProxy: true,
    },
    backgroundRaster: { decision: 'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED' },
    targetPlan: { priority: 'P0', strategy: 'fixtureA_TEMPLATE_SCOPED_TEXT_METRICS' },
  });
  assert.equal(paint.decision, 'BROWSER_PAINT_CONTEXT_REQUIRED');
  assert.equal(paint.rendererPolicy, 'CSS_HELD_UNTIL_PAINT_PROVEN');
  const none = classifyFixture('sample2', { assetProbe: { decision: 'NO_BACKGROUND_IMAGE' } });
  assert.equal(none.decision, 'NO_BACKGROUND_IMAGE');
  console.log('roll20_chat_asset_preservation_plan self-test PASS');
}

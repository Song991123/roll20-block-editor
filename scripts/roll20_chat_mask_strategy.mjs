#!/usr/bin/env node
/**
 * Convert chat pixel mask/band evidence into the next renderer strategy.
 *
 * This is diagnostic-only. It reads local-only reports and prevents broad
 * ChatPane CSS candidates from being mistaken for a verified Roll20 fix.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-mask-strategy');

const HIGH_MISMATCH_RATIO = 0.1;
const MEANINGFUL_DELTA_PCT = 0.5;

async function main() {
  const parity = await readJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const residual = await readOptionalJson(path.join(runDir, 'chat-residual-diagnostics', 'chat-residual-diagnostics-results.json'));
  const fixtures = (parity.fixtures ?? []).map((fixture) => analyzeFixture(fixture, candidates, residual));
  const highMismatch = fixtures.filter((fixture) => fixture.highMismatch);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only chat mask strategy; not Roll20 parity and not production CSS',
    summary: {
      status: highMismatch.length ? 'STRATEGY_NEEDED' : 'NO_HIGH_CHAT_MASK_RESIDUALS',
      fixtures: fixtures.length,
      highMismatch: highMismatch.length,
      decisions: countBy(fixtures.map((fixture) => fixture.strategyDecision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-mask-strategy-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-mask-strategy-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT MASK STRATEGY ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} decision=${fixture.strategyDecision} mismatch=${fixture.bestAlignedMismatchPct} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function analyzeFixture(fixture, candidates, residual) {
  const breakdown = fixture.bestAlignedDiffBreakdown ?? fixture.diffBreakdown ?? {};
  const comparedSize = fixture.bestAlignedComparedSize ?? fixture.comparedSize ?? [];
  const totalPixels = Number(comparedSize[0] ?? 0) * Number(comparedSize[1] ?? 0);
  const bandStats = summarizeBands(breakdown, totalPixels);
  const luma = breakdown.lumaBuckets ?? {};
  const masks = breakdown.masks ?? {};
  const maskGeometry = breakdown.maskGeometry ?? {};
  const fixtureKey = fixtureKeyForId(fixture.fixtureId);
  const candidateEvidence = summarizeCandidates(candidates?.candidates ?? [], fixtureKey);
  const residualFixture = (residual?.fixtures ?? []).find((item) => item.fixtureId === fixture.fixtureId);
  const highMismatch = Number(fixture.bestAlignedMismatchRatio ?? fixture.mismatchRatio ?? 0) > HIGH_MISMATCH_RATIO;
  const shadowLocal = Number(maskGeometry.shadowLocal?.count ?? 0);
  const shadowActual = Number(maskGeometry.shadowActual?.count ?? 0);
  const shadowCountDelta = shadowActual - shadowLocal;
  const highlightCentroidDelta = centroidDelta(maskGeometry.highlightLocal?.centroid, maskGeometry.highlightActual?.centroid);
  const shadowCentroidDelta = centroidDelta(maskGeometry.shadowLocal?.centroid, maskGeometry.shadowActual?.centroid);
  const paintCandidatesRejected =
    !isMeaningfulImprovement(candidateEvidence.byName['paint-dim-background']) &&
    !isMeaningfulImprovement(candidateEvidence.byName['paint-edge-shadow']);
  const edgeCandidateWorse = Number(candidateEvidence.byName['paint-edge-shadow']?.fixtureAlignedDeltaPct ?? 0) > 0;
  const leftEdgeDominant = bandStats.leftColMismatchShare >= 0.35 || bandStats.leftColMismatchRatio >= 0.25;
  const rowLocalized = bandStats.topRowMismatchShare >= 0.45 || bandStats.worstRows.length >= 3;
  const brightDominant = Number(luma.brightEither?.mismatchShare ?? 0) >= 0.8;
  const shadowMaskStrong = Number(masks.shadowCandidate?.mismatchShare ?? 0) >= 0.1 || Math.abs(shadowCountDelta) >= 100;
  const widthConflict = residualFixture?.primaryResidualAxis === 'GEOMETRY_WIDTH_CONFLICT';

  let strategyDecision = 'KEEP_DEFAULT_FOR_NOW';
  let nextAction = 'keep default renderer while higher-risk fixtures are investigated';
  const blockers = [];

  if (highMismatch && widthConflict) {
    strategyDecision = 'MODEL_TEMPLATE_WIDTH_BEFORE_PAINT';
    nextAction = 'build a per-template chat width model, then re-run mask strategy before any paint CSS';
    blockers.push('residual classifier reports geometry width conflict');
  } else if (highMismatch && leftEdgeDominant && rowLocalized && paintCandidatesRejected) {
    strategyDecision = 'RECROP_OR_SHELL_CONTEXT_BEFORE_CSS';
    nextAction = 'compare actual/local message shell padding, template crop x/y, and row-band masks before another CSS candidate';
    blockers.push('mismatch is left/row localized but simple paint candidates did not meaningfully improve it');
  } else if (highMismatch && brightDominant && !paintCandidatesRejected) {
    strategyDecision = 'PROVE_PAINT_WITH_ACTUAL_STYLE';
    nextAction = 'prove the improving paint candidate from actual computed style before private renderer selection';
  } else if (highMismatch && shadowMaskStrong) {
    strategyDecision = 'INSPECT_BORDER_SHADOW_MASK';
    nextAction = 'capture exact border/shadow computed styles and compare mask bounds before CSS promotion';
  } else if (highMismatch) {
    strategyDecision = 'ADD_NEW_MASK_PROBE';
    nextAction = 'add a focused probe for the dominant bands before testing another renderer candidate';
  }

  if (edgeCandidateWorse) blockers.push('edge-shadow candidate worsens this fixture');
  if (paintCandidatesRejected) blockers.push('paint candidates do not explain this fixture');

  return {
    fixtureId: fixture.fixtureId,
    highMismatch,
    strategyDecision,
    nextAction,
    blockers,
    mismatchPct: fixture.mismatchPct ?? '',
    bestAlignedMismatchPct: fixture.bestAlignedMismatchPct ?? '',
    bestAlignedOffset: fixture.bestAlignedOffset ?? null,
    comparedSize,
    residualAxis: residualFixture?.primaryResidualAxis ?? '',
    bandStats,
    lumaSignals: {
      brightMismatchShare: Number(luma.brightEither?.mismatchShare ?? 0),
      brightMismatchSharePct: pct(luma.brightEither?.mismatchShare),
      brightAvgSignedLumaDelta: Number(luma.brightEither?.avgSignedLumaDeltaOnMismatch ?? 0),
      shadowMismatchShare: Number(masks.shadowCandidate?.mismatchShare ?? 0),
      shadowMismatchSharePct: pct(masks.shadowCandidate?.mismatchShare),
      shadowCountDelta,
      highlightCentroidDelta,
      shadowCentroidDelta,
    },
    candidateEvidence,
  };
}

function summarizeBands(breakdown, totalPixels) {
  const rows = (breakdown.rowBands ?? []).map((band) => enrichBand(band, 'yRange', totalPixels));
  const cols = (breakdown.colBands ?? []).map((band) => enrichBand(band, 'xRange', totalPixels));
  const totalMismatch = [...rows, ...cols].reduce((max, band) => Math.max(max, band.totalMismatchEstimate), 0);
  const rowMismatchTotal = rows.reduce((sum, band) => sum + band.mismatchEstimate, 0);
  const colMismatchTotal = cols.reduce((sum, band) => sum + band.mismatchEstimate, 0);
  const normalizedRows = rows.map((band) => ({
    ...band,
    mismatchShare: rowMismatchTotal ? band.mismatchEstimate / rowMismatchTotal : 0,
    mismatchSharePct: pct(rowMismatchTotal ? band.mismatchEstimate / rowMismatchTotal : 0),
  }));
  const normalizedCols = cols.map((band) => ({
    ...band,
    mismatchShare: colMismatchTotal ? band.mismatchEstimate / colMismatchTotal : 0,
    mismatchSharePct: pct(colMismatchTotal ? band.mismatchEstimate / colMismatchTotal : 0),
  }));
  const worstRows = normalizedRows.slice().sort((a, b) => b.mismatchRatio - a.mismatchRatio).slice(0, 3);
  const worstCols = normalizedCols.slice().sort((a, b) => b.mismatchRatio - a.mismatchRatio).slice(0, 2);
  const leftCol = normalizedCols.find((band) => band.index === 0) ?? {};
  return {
    totalMismatchEstimate: totalMismatch,
    worstRows,
    worstCols,
    leftColMismatchRatio: Number(leftCol.mismatchRatio ?? 0),
    leftColMismatchRatioPct: pct(leftCol.mismatchRatio),
    leftColMismatchShare: Number(leftCol.mismatchShare ?? 0),
    leftColMismatchSharePct: pct(leftCol.mismatchShare),
    topRowMismatchShare: worstRows.reduce((sum, band) => sum + Number(band.mismatchShare ?? 0), 0),
    topRowMismatchSharePct: pct(worstRows.reduce((sum, band) => sum + Number(band.mismatchShare ?? 0), 0)),
  };
}

function enrichBand(band, rangeKey, totalPixels) {
  const range = band[rangeKey] ?? [0, 0];
  const span = Math.max(0, Number(range[1] ?? 0) - Number(range[0] ?? 0));
  const ratio = Number(band.mismatchRatio ?? 0);
  const pixels = totalPixels && span ? totalPixels : 0;
  const mismatchEstimate = pixels ? ratio * span : ratio;
  return {
    index: band.index,
    range,
    mismatchRatio: ratio,
    mismatchRatioPct: pct(ratio),
    mismatchEstimate,
    totalMismatchEstimate: mismatchEstimate,
  };
}

function summarizeCandidates(candidates, fixtureKey) {
  const byName = {};
  const useful = [];
  for (const candidate of candidates) {
    if (candidate.status !== 'OK') continue;
    const fixtureAlignedDeltaPct = numberOrNull(candidate.fixtureAlignedDeltaPct?.[fixtureKey]);
    const row = {
      name: candidate.name,
      risk: candidate.promotionRisk ?? '',
      fixtureAlignedDeltaPct,
      fixtureAlignedDeltaLabel: signedPct(fixtureAlignedDeltaPct),
      regressedFixtures: Number(candidate.regressedFixtures ?? 0),
      improvedFixtures: Number(candidate.improvedFixtures ?? 0),
    };
    byName[row.name] = row;
    if (row.name !== 'default' && typeof fixtureAlignedDeltaPct === 'number' && fixtureAlignedDeltaPct <= -MEANINGFUL_DELTA_PCT) {
      useful.push(row);
    }
  }
  useful.sort((a, b) => a.fixtureAlignedDeltaPct - b.fixtureAlignedDeltaPct);
  return {
    byName,
    bestUseful: useful[0] ?? null,
    usefulCandidates: useful,
  };
}

function isMeaningfulImprovement(candidate) {
  return typeof candidate?.fixtureAlignedDeltaPct === 'number' && candidate.fixtureAlignedDeltaPct <= -MEANINGFUL_DELTA_PCT;
}

function centroidDelta(local, actual) {
  if (!Array.isArray(local) || !Array.isArray(actual)) return null;
  return [
    Number((Number(actual[0]) - Number(local[0])).toFixed(3)),
    Number((Number(actual[1]) - Number(local[1])).toFixed(3)),
  ];
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Mask Strategy',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only strategy from existing pixel mask/band evidence. This does not prove Roll20 parity and does not enable production CSS.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Decision | Residual | Aligned mismatch | Left col | Top rows | Candidate clue | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    const clue = fixture.candidateEvidence.bestUseful
      ? `${fixture.candidateEvidence.bestUseful.name} ${fixture.candidateEvidence.bestUseful.fixtureAlignedDeltaLabel} (${fixture.candidateEvidence.bestUseful.risk})`
      : 'none';
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.strategyDecision} | ${fixture.residualAxis} | ${fixture.bestAlignedMismatchPct} | ${fixture.bandStats.leftColMismatchRatioPct} / share ${fixture.bandStats.leftColMismatchSharePct} | ${fixture.bandStats.topRowMismatchSharePct} | ${clue} | ${fixture.nextAction} |`);
  }
  lines.push('');
  lines.push('## Blockers', '');
  for (const fixture of report.fixtures.filter((item) => item.blockers.length)) {
    lines.push(`- \`${fixture.fixtureId}\`: ${fixture.blockers.join('; ')}`);
  }
  return `${lines.join('\n')}\n`;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`Missing or invalid required report: ${path.relative(process.cwd(), file)}`);
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

function fixtureKeyForId(fixtureId) {
  if (fixtureId === 'official-roll20-AW2E') return 'aw2e';
  if (fixtureId === 'official-roll20-Les-Oublies') return 'lesOublies';
  if (fixtureId === 'yshy-commission-1bu') return 'yshy';
  return fixtureId
    .replace(/^official-roll20-/, '')
    .replace(/-([a-z])/g, (_full, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9_]/g, '');
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pct(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Number((number * 100).toFixed(2))}%` : '';
}

function signedPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(2))}%`;
}

await main();

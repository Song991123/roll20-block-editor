#!/usr/bin/env node
/**
 * Classify the remaining local ChatPane vs actual Roll20 chat mismatch.
 *
 * This consumes the existing chat parity/style/candidate reports and explains
 * which residual axis is most likely blocking the next renderer model. It does
 * not compare new screenshots and does not authorize production CSS.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-residual-diagnostics');

const HIGH_MISMATCH_RATIO = 0.1;
const MEANINGFUL_DELTA_PCT = 0.5;

async function main() {
  const parity = await readJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const style = await readOptionalJson(path.join(runDir, 'chat-style-context-diagnostics', 'chat-style-context-diagnostics-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const policy = await readOptionalJson(path.join(runDir, 'chat-renderer-policy', 'chat-renderer-policy-results.json'));

  const report = buildReport({ parity, style, candidates, policy, runDir: runDirArg });

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-residual-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-residual-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT RESIDUAL ${report.summary.status}`);
  console.log(`highMismatch=${report.summary.highMismatch}/${report.summary.fixtures}`);
  for (const fixture of report.fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} residual=${fixture.primaryResidualAxis} mismatch=${fixture.bestAlignedMismatchPct} next=${fixture.nextDiagnostic}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function buildReport({ parity, style, candidates, policy, runDir }) {
  const styleById = new Map((style?.fixtures ?? []).map((fixture) => [fixture.id, fixture]));
  const policyById = new Map((policy?.fixtures ?? []).map((fixture) => [fixture.fixtureId, fixture]));
  const candidateRows = candidates?.candidates ?? [];
  const fixtures = (parity.fixtures ?? []).map((fixture) =>
    classifyFixture({
      fixture,
      style: styleById.get(fixture.fixtureId),
      policy: policyById.get(fixture.fixtureId),
      candidates: candidateRows,
    }),
  );
  const highMismatch = fixtures.filter((fixture) => fixture.highMismatch);
  return {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'diagnostic-only residual classification for Roll20 chat renderer work',
    summary: {
      status: highMismatch.length ? 'RESIDUALS_REMAIN' : 'NO_HIGH_RESIDUALS',
      fixtures: fixtures.length,
      highMismatch: highMismatch.length,
      primaryAxes: countBy(fixtures.map((fixture) => fixture.primaryResidualAxis)),
      nextDiagnostics: countBy(highMismatch.map((fixture) => fixture.nextDiagnostic)),
    },
    fixtures,
  };
}

function classifyFixture({ fixture, style, policy, candidates }) {
  const breakdown = fixture.bestAlignedDiffBreakdown ?? fixture.diffBreakdown ?? {};
  const luma = breakdown.lumaBuckets ?? {};
  const masks = breakdown.masks ?? {};
  const geometry = breakdown.maskGeometry ?? {};
  const highMismatch = Number(fixture.bestAlignedMismatchRatio ?? fixture.mismatchRatio ?? 0) > HIGH_MISMATCH_RATIO;
  const fixtureKey = fixtureKeyForId(fixture.fixtureId);
  const candidateSummary = summarizeFixtureCandidates(candidates, fixtureKey);
  const bright = luma.brightEither ?? {};
  const shadow = masks.shadowCandidate ?? {};
  const highlight = masks.highlightEither ?? {};
  const localShadowCount = Number(geometry.shadowLocal?.count ?? 0);
  const actualShadowCount = Number(geometry.shadowActual?.count ?? 0);
  const shadowCountDelta = actualShadowCount - localShadowCount;
  const tableWidthDelta = numberOrNull(style?.tableDelta?.width);
  const tableHeightDelta = numberOrNull(style?.tableDelta?.height);
  const candidateBest = candidateSummary.bestImprovingCandidate;
  const rejectedTemplateTypography = candidateSummary.byName['template-typography'];
  const typographyRejected =
    rejectedTemplateTypography &&
    Number(rejectedTemplateTypography.fixtureAlignedDeltaPct ?? 0) > -MEANINGFUL_DELTA_PCT;

  const residualSignals = [];
  if (Number(bright.mismatchShare ?? 0) >= 0.8) {
    residualSignals.push(`bright/background pixels dominate (${pct(bright.mismatchShare)})`);
  }
  if (Math.abs(Number(bright.avgSignedLumaDeltaOnMismatch ?? 0)) >= 5) {
    const direction = Number(bright.avgSignedLumaDeltaOnMismatch) > 0 ? 'local brighter than actual' : 'local darker than actual';
    residualSignals.push(`bright luma bias: ${direction} (${Number(bright.avgSignedLumaDeltaOnMismatch).toFixed(3)})`);
  }
  if (Number(shadow.mismatchShare ?? 0) >= 0.1) {
    residualSignals.push(`shadow/dark edge mismatch share ${pct(shadow.mismatchShare)}`);
  }
  if (Math.abs(shadowCountDelta) >= 100) {
    residualSignals.push(`actual/local shadow pixel count delta ${shadowCountDelta}`);
  }
  if (typeof tableWidthDelta === 'number' && Math.abs(tableWidthDelta) >= 8) {
    residualSignals.push(`table width delta ${signedPx(tableWidthDelta)}`);
  }
  if (typeof tableHeightDelta === 'number' && Math.abs(tableHeightDelta) >= 2) {
    residualSignals.push(`table height delta ${signedPx(tableHeightDelta)}`);
  }
  if (typographyRejected) {
    residualSignals.push(`template typography candidate did not meaningfully improve (${signedPct(rejectedTemplateTypography.fixtureAlignedDeltaPct)})`);
  }
  if (candidateBest && candidateBest.fixtureAlignedDeltaPct <= -MEANINGFUL_DELTA_PCT) {
    residualSignals.push(`best current candidate ${candidateBest.name} improves ${signedPct(candidateBest.fixtureAlignedDeltaPct)} but risk=${candidateBest.risk}`);
  }

  const primaryResidualAxis = choosePrimaryAxis({
    highMismatch,
    bright,
    shadow,
    shadowCountDelta,
    tableWidthDelta,
    tableHeightDelta,
    candidateBest,
    typographyRejected,
  });
  return {
    fixtureId: fixture.fixtureId,
    highMismatch,
    policyDecision: policy?.decision ?? '',
    primaryResidualAxis,
    nextDiagnostic: nextDiagnosticForAxis(primaryResidualAxis),
    mismatchPct: fixture.mismatchPct ?? '',
    bestAlignedMismatchPct: fixture.bestAlignedMismatchPct ?? '',
    bestAlignedOffset: fixture.bestAlignedOffset ?? null,
    localSize: fixture.localSize ?? null,
    actualSize: fixture.actualSize ?? null,
    residualSignals,
    dominantBands: {
      rows: topBands(breakdown.rowBands ?? [], 'yRange').slice(0, 3),
      cols: topBands(breakdown.colBands ?? [], 'xRange').slice(0, 2),
    },
    lumaBuckets: {
      brightEither: summarizeBucket(bright),
      midTone: summarizeBucket(luma.midTone),
      darkBoth: summarizeBucket(luma.darkBoth),
    },
    masks: {
      highlightEither: summarizeBucket(highlight),
      shadowCandidate: summarizeBucket(shadow),
      shadowCountDelta,
      shadowLocalCount: localShadowCount,
      shadowActualCount: actualShadowCount,
    },
    styleDeltas: {
      findings: style?.findings ?? [],
      tableWidthDelta,
      tableHeightDelta,
      topStyleDeltas: (style?.topStyleDeltas ?? []).slice(0, 8).map((delta) => ({
        selector: delta.selector,
        key: delta.key,
        local: delta.local,
        actual: delta.actual,
        numericDelta: delta.numericDelta ?? null,
      })),
    },
    candidateEvidence: candidateSummary,
  };
}

function choosePrimaryAxis({ highMismatch, bright, shadow, shadowCountDelta, tableWidthDelta, tableHeightDelta, candidateBest, typographyRejected }) {
  if (!highMismatch) return 'DEFAULT_ACCEPTABLE_FOR_NOW';
  if (typeof tableWidthDelta === 'number' && Math.abs(tableWidthDelta) >= 8) return 'GEOMETRY_WIDTH_CONFLICT';
  if (typeof tableHeightDelta === 'number' && Math.abs(tableHeightDelta) >= 2) return 'GEOMETRY_HEIGHT_OR_CROP';
  if (Number(shadow.mismatchShare ?? 0) >= 0.1 || Math.abs(shadowCountDelta) >= 100) return 'SHADOW_BORDER_RASTERIZATION';
  if (Number(bright.mismatchShare ?? 0) >= 0.8 && Math.abs(Number(bright.avgSignedLumaDeltaOnMismatch ?? 0)) >= 5) return 'BACKGROUND_OR_LIGHT_RASTERIZATION';
  if (candidateBest && candidateBest.fixtureAlignedDeltaPct <= -MEANINGFUL_DELTA_PCT) return 'FIXTURE_LOCAL_CANDIDATE_ONLY';
  if (typographyRejected) return 'NOT_SIMPLE_TYPOGRAPHY';
  return 'UNCLASSIFIED_RESIDUAL';
}

function nextDiagnosticForAxis(axis) {
  switch (axis) {
    case 'GEOMETRY_WIDTH_CONFLICT':
      return 'compare Roll20 chat shell/message/template width model per template before any width or padding patch';
    case 'GEOMETRY_HEIGHT_OR_CROP':
      return 'recapture or model vertical crop, row height, border, and caption/table height before CSS promotion';
    case 'SHADOW_BORDER_RASTERIZATION':
      return 'test border/shadow/background negative controls against actual computed style and pixel masks';
    case 'BACKGROUND_OR_LIGHT_RASTERIZATION':
      return 'sample actual/local template background and border colors, then test a narrow paint-only candidate';
    case 'FIXTURE_LOCAL_CANDIDATE_ONLY':
      return 'prove the fixture-local candidate from actual Roll20 computed style before allowing a private renderer model';
    case 'NOT_SIMPLE_TYPOGRAPHY':
      return 'skip more broad font candidates and inspect paint/crop/rasterization evidence';
    case 'DEFAULT_ACCEPTABLE_FOR_NOW':
      return 'keep default renderer for this fixture while higher mismatch fixtures are investigated';
    default:
      return 'add a focused residual probe for this fixture before another CSS candidate';
  }
}

function summarizeFixtureCandidates(candidates, fixtureKey) {
  const byName = {};
  const rows = candidates
    .filter((candidate) => candidate.status === 'OK')
    .map((candidate) => {
      const fixtureAlignedDeltaPct = numberOrNull(candidate.fixtureAlignedDeltaPct?.[fixtureKey]);
      const row = {
        name: candidate.name,
        risk: candidate.promotionRisk ?? '',
        fixtureAlignedDeltaPct,
        meanAlignedDeltaPct: numberOrNull(candidate.meanAlignedDeltaPct),
        regressedFixtures: Number(candidate.regressedFixtures ?? 0),
        improvedFixtures: Number(candidate.improvedFixtures ?? 0),
      };
      byName[row.name] = row;
      return row;
    });
  const bestImprovingCandidate = rows
    .filter((candidate) => candidate.name !== 'default')
    .filter((candidate) => typeof candidate.fixtureAlignedDeltaPct === 'number')
    .sort((a, b) => a.fixtureAlignedDeltaPct - b.fixtureAlignedDeltaPct)[0] ?? null;
  return {
    byName,
    bestImprovingCandidate,
    rejectedRegressingCandidates: rows
      .filter((candidate) => candidate.risk === 'reject-regresses-fixtures')
      .map((candidate) => candidate.name),
  };
}

function topBands(bands, rangeKey) {
  return bands
    .slice()
    .sort((a, b) => Number(b.mismatchRatio ?? 0) - Number(a.mismatchRatio ?? 0))
    .map((band) => ({
      index: band.index,
      range: band[rangeKey] ?? null,
      mismatchRatio: Number(band.mismatchRatio ?? 0),
      mismatchPct: pct(band.mismatchRatio),
    }));
}

function summarizeBucket(bucket) {
  return {
    pixelRatio: Number(bucket?.pixelRatio ?? 0),
    pixelPct: pct(bucket?.pixelRatio),
    mismatchRatio: Number(bucket?.mismatchRatio ?? 0),
    mismatchPct: pct(bucket?.mismatchRatio),
    mismatchShare: Number(bucket?.mismatchShare ?? 0),
    mismatchSharePct: pct(bucket?.mismatchShare),
    avgSignedLumaDeltaOnMismatch: Number(bucket?.avgSignedLumaDeltaOnMismatch ?? 0),
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Residual Diagnostics',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only residual classification. This is not Roll20 chat parity and does not enable production CSS.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Policy | Residual axis | Aligned mismatch | Main signals | Next diagnostic |',
    '| --- | --- | --- | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.policyDecision || ''} | ${fixture.primaryResidualAxis} | ${fixture.bestAlignedMismatchPct} | ${fixture.residualSignals.join('<br>') || 'none'} | ${fixture.nextDiagnostic} |`);
  }
  lines.push('');
  lines.push('## High-Mismatch Detail', '');
  for (const fixture of report.fixtures.filter((item) => item.highMismatch)) {
    lines.push(`### ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`- Offset: ${fixture.bestAlignedOffset?.join(', ') ?? 'none'}`);
    lines.push(`- Local/actual size: ${fixture.localSize?.join('x') ?? ''} / ${fixture.actualSize?.join('x') ?? ''}`);
    lines.push(`- Bright bucket: mismatch share ${fixture.lumaBuckets.brightEither.mismatchSharePct}, luma delta ${fixture.lumaBuckets.brightEither.avgSignedLumaDeltaOnMismatch}`);
    lines.push(`- Shadow mask: mismatch share ${fixture.masks.shadowCandidate.mismatchSharePct}, count delta ${fixture.masks.shadowCountDelta}`);
    lines.push(`- Dominant rows: ${fixture.dominantBands.rows.map((band) => `${band.index}:${band.mismatchPct}`).join(', ')}`);
    lines.push(`- Dominant cols: ${fixture.dominantBands.cols.map((band) => `${band.index}:${band.mismatchPct}`).join(', ')}`);
    lines.push('');
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

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
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

function signedPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

await main();

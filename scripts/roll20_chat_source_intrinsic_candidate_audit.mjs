#!/usr/bin/env node
/**
 * Audit ChatPane candidates against source/intrinsic renderer requirements.
 *
 * Diagnostic only. This does not emit CSS. It cross-checks the source/intrinsic
 * matrix with candidate pixel deltas, style proof, row-raster proof, and asset
 * policy so a numerically tempting candidate cannot be mistaken for a Roll20
 * renderer model.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = rawArgs.includes('--self-test');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--source-intrinsic-dir',
  '--candidate-comparison-dir',
  '--style-proof-dir',
  '--row-raster-candidates-dir',
  '--asset-plan-dir',
]);
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-source-intrinsic-candidate-audit');
const reportDirs = {
  sourceIntrinsic: readOption('--source-intrinsic-dir', ''),
  candidates: readOption('--candidate-comparison-dir', ''),
  styleProof: readOption('--style-proof-dir', ''),
  rowRasterCandidates: readOption('--row-raster-candidates-dir', ''),
  assetPlan: readOption('--asset-plan-dir', ''),
};

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

async function main() {
  await resolveImplicitReportDirs();
  const reports = {
    sourceIntrinsic: await readReport('chat-source-intrinsic-matrix', 'chat-source-intrinsic-matrix-results.json', reportDirs.sourceIntrinsic),
    candidates: await readReport('chat-candidate-comparison', 'chat-candidate-comparison-results.json', reportDirs.candidates),
    styleProof: await readReport('chat-candidate-style-proof', 'chat-candidate-style-proof-results.json', reportDirs.styleProof),
    rowRasterCandidates: await readReport('chat-row-raster-candidate-comparison', 'chat-row-raster-candidate-comparison-results.json', reportDirs.rowRasterCandidates),
    assetPlan: await readReport('chat-asset-preservation-plan', 'chat-asset-preservation-plan-results.json', reportDirs.assetPlan),
  };
  const report = buildReport(runDirArg, reports, normalizeReportDirs(reportDirs));
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-source-intrinsic-candidate-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-source-intrinsic-candidate-audit-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT SOURCE INTRINSIC CANDIDATE AUDIT ${report.summary.status}`);
  for (const fixture of report.fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} decision=${fixture.sourceIntrinsicDecision} ready=${fixture.readyCandidates.length} blockers=${fixture.blockers.length} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function buildReport(runDirLabel, reports, overrides = {}) {
  const styleByName = new Map((reports.styleProof?.candidates ?? []).map((candidate) => [candidate.name, candidate]));
  const rowByName = new Map((reports.rowRasterCandidates?.candidates ?? []).map((candidate) => [candidate.name, candidate]));
  const candidateRows = (reports.candidates?.candidates ?? []).filter((candidate) => candidate.name && candidate.name !== 'default');
  const fixtures = (reports.sourceIntrinsic?.fixtures ?? [])
    .filter((fixture) => fixture.priority !== 'P2')
    .map((fixture) => auditFixture(fixture, candidateRows, { styleByName, rowByName, assetPlan: reports.assetPlan }));
  const readyCandidates = fixtures.flatMap((fixture) => fixture.readyCandidates);
  const partialCandidates = fixtures.flatMap((fixture) => fixture.partialCandidates);
  const blockers = fixtures.flatMap((fixture) => fixture.blockers.map((blocker) => `${fixture.fixtureId}: ${blocker}`));
  return {
    generatedAt: new Date().toISOString(),
    runDir: runDirLabel,
    reportOverrides: overrides,
    scope: 'diagnostic-only source/intrinsic candidate audit; no production CSS',
    summary: {
      status: readyCandidates.length ? 'SOURCE_INTRINSIC_CANDIDATE_READY_FOR_REVIEW' : 'SOURCE_INTRINSIC_CANDIDATE_BLOCKED',
      fixtures: fixtures.length,
      readyCandidates: readyCandidates.length,
      partialCandidates: partialCandidates.length,
      blockers: blockers.length,
      productionSafe: false,
    },
    fixtures,
    blockers,
  };
}

function auditFixture(sourceFixture, candidateRows, context) {
  const fixtureId = sourceFixture.fixtureId;
  const fixtureKey = fixtureKeyForId(fixtureId);
  const requirements = requirementsFor(sourceFixture);
  const asset = findFixture(context.assetPlan?.fixtures, fixtureId);
  const rows = candidateRows
    .map((candidate) => auditCandidateForFixture(candidate, fixtureKey, sourceFixture, requirements, asset, context))
    .filter((candidate) => candidate.fixtureDeltaPct != null || candidate.name.includes(fixtureKey) || candidate.name.includes(scopeHintFor(fixtureId)));
  rows.sort((a, b) => rankCandidate(a) - rankCandidate(b));
  const readyCandidates = rows.filter((row) => row.auditDecision === 'READY_FOR_SCOPED_REVIEW');
  const partialCandidates = rows.filter((row) => row.auditDecision === 'PARTIAL_NEEDS_SOURCE_INTRINSIC_MODEL').slice(0, 5);
  const rejectedCandidates = rows.filter((row) => row.auditDecision === 'REJECTED').slice(0, 8);
  const missingAxes = requirements.axes.filter((axis) => !readyCandidates.some((candidate) => candidate.coveredAxes.includes(axis)));
  const blockers = [];
  if (sourceFixture.promotionBlocker) {
    blockers.push(`source/intrinsic matrix still blocks promotion: ${sourceFixture.decision}`);
  }
  if (asset?.rendererPolicy === 'DO_NOT_PROMOTE_CSS') {
    blockers.push(`asset policy blocks visual parity: ${asset.decision ?? 'held'}`);
  }
  if (missingAxes.length) {
    blockers.push(`no candidate proves required axes: ${missingAxes.join(', ')}`);
  }
  if (!readyCandidates.length && partialCandidates.length) {
    blockers.push('best candidates are partial only; they must clear source/intrinsic, style, row-raster, and asset gates before CSS review');
  }
  if (!readyCandidates.length && !partialCandidates.length) {
    blockers.push('no usable candidate remains for this fixture under current evidence');
  }
  return {
    fixtureId,
    priority: sourceFixture.priority,
    sourceIntrinsicDecision: sourceFixture.decision,
    sourceIntrinsicPromotionBlocker: Boolean(sourceFixture.promotionBlocker),
    requirements,
    sourceMetrics: {
      tableWidthDelta: numberOrNull(sourceFixture.metrics?.tableWidthDelta),
      tableScrollWidthDelta: numberOrNull(sourceFixture.metrics?.tableScrollWidthDelta),
      sourceMaxWidthPx: numberOrNull(sourceFixture.source?.tableMaxWidthPx),
      rowWidthDeltaSpread: numberOrNull(sourceFixture.metrics?.rowWidthDeltaSpread),
      maxAbsCellDelta: numberOrNull(sourceFixture.metrics?.maxAbsCellDelta),
      maxAbsTopDelta: numberOrNull(sourceFixture.metrics?.maxAbsTopDelta),
    },
    assetDecision: asset?.decision ?? '',
    readyCandidates,
    partialCandidates,
    rejectedCandidates,
    blockers,
    nextAction: nextActionFor(sourceFixture.decision, missingAxes),
  };
}

function auditCandidateForFixture(candidate, fixtureKey, sourceFixture, requirements, asset, context) {
  const fixtureDeltaPct = numberOrNull(candidate.fixtureAlignedDeltaPct?.[fixtureKey]);
  const style = context.styleByName.get(candidate.name);
  const row = context.rowByName.get(candidate.name);
  const styleStatus = style?.styleProofStatus ?? 'NOT_STYLE_PROVEN';
  const rowRasterRisk = row?.rowRasterRisk ?? 'missing-row-raster-candidate';
  const rejectedReasons = [];
  const missingReasons = [];
  const coveredAxes = [];

  if (fixtureDeltaPct != null && fixtureDeltaPct <= -0.5) coveredAxes.push('pixel-gain');
  if (fixtureDeltaPct == null) missingReasons.push('no fixture pixel delta');
  if (candidate.regressedFixtures > 0 || String(candidate.promotionRisk ?? '').includes('reject')) {
    rejectedReasons.push(`candidate risk=${candidate.promotionRisk ?? 'unknown'} regressions=${candidate.regressedFixtures ?? 0}`);
  }
  if (styleStatus === 'REJECT_STYLE_CONTRADICTION') rejectedReasons.push('actual Roll20 style proof contradicts candidate');
  if (styleStatus === 'NOT_STYLE_PROVEN') missingReasons.push('style proof missing');
  if (!['NOT_STYLE_PROVEN', 'REJECT_STYLE_CONTRADICTION'].includes(styleStatus)) coveredAxes.push('style-proof');
  if (String(rowRasterRisk).includes('reject')) rejectedReasons.push(`row raster rejected (${rowRasterRisk})`);
  if (rowRasterRisk === 'missing-row-raster-candidate') missingReasons.push('row raster candidate evidence missing');
  if (rowRasterRisk && rowRasterRisk !== 'missing-row-raster-candidate' && !String(rowRasterRisk).includes('reject')) {
    coveredAxes.push('row-raster-nonregression');
  }
  if (asset?.rendererPolicy === 'DO_NOT_PROMOTE_CSS') missingReasons.push(`asset policy ${asset.decision ?? 'held'}`);
  if (asset?.rendererPolicy && asset.rendererPolicy !== 'DO_NOT_PROMOTE_CSS') coveredAxes.push('asset-policy-clear');
  if (sourceFixture.promotionBlocker) missingReasons.push(`source/intrinsic blocker ${sourceFixture.decision}`);

  if (requirements.axes.includes('message-content-width') && /fixtureA-message|message-width/.test(candidate.name)) coveredAxes.push('message-content-width');
  if (requirements.axes.includes('table-auto-layout-intrinsic') && /coc-table|table-intrinsic|source-context/.test(candidate.name)) coveredAxes.push('table-auto-layout-intrinsic');
  if (requirements.axes.includes('sanitize-rule-order') && /sanitize|source-context|font-context/.test(candidate.name)) coveredAxes.push('sanitize-rule-order');
  if (requirements.axes.includes('crop-top-origin') && /crop|overflow/.test(candidate.name)) coveredAxes.push('crop-top-origin');
  if (requirements.axes.includes('intrinsic-width-split') && /intrinsic|message-width|source-context/.test(candidate.name)) coveredAxes.push('intrinsic-width-split');

  const missingAxes = requirements.axes.filter((axis) => !coveredAxes.includes(axis));
  if (missingAxes.length) missingReasons.push(`missing axes=${missingAxes.join(',')}`);
  const auditDecision = rejectedReasons.length
    ? 'REJECTED'
    : missingReasons.length
      ? 'PARTIAL_NEEDS_SOURCE_INTRINSIC_MODEL'
      : 'READY_FOR_SCOPED_REVIEW';
  return {
    name: candidate.name,
    auditDecision,
    fixtureDeltaPct,
    promotionRisk: candidate.promotionRisk ?? '',
    regressedFixtures: Number(candidate.regressedFixtures ?? 0),
    meanAlignedDeltaPct: numberOrNull(candidate.meanAlignedDeltaPct),
    styleProofStatus: styleStatus,
    rowRasterRisk,
    coveredAxes: unique(coveredAxes),
    missingAxes,
    rejectedReasons,
    missingReasons,
  };
}

function requirementsFor(sourceFixture) {
  if (sourceFixture.decision === 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED') {
    return {
      model: 'COC_SANITIZE_TABLE_AUTO_LAYOUT_CROP',
      axes: ['sanitize-rule-order', 'table-auto-layout-intrinsic', 'crop-top-origin', 'row-raster-nonregression', 'style-proof', 'asset-policy-clear'],
    };
  }
  if (sourceFixture.decision === 'CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED') {
    const axes = ['crop-top-origin', 'intrinsic-width-split', 'row-raster-nonregression', 'style-proof', 'asset-policy-clear'];
    if (sourceFixture.fixtureId === 'fixtureA') axes.unshift('message-content-width');
    return {
      model: 'CROP_INTRINSIC_SPLIT',
      axes,
    };
  }
  return {
    model: 'SOURCE_INTRINSIC_SECONDARY',
    axes: ['style-proof', 'row-raster-nonregression'],
  };
}

function nextActionFor(decision, missingAxes) {
  if (decision === 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED') {
    return `Build a CoC/fixtureC model that proves ${missingAxes.join(', ') || 'all required axes'} together; do not hard-code used table width or replay sanitized typography as CSS.`;
  }
  if (decision === 'CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED') {
    return `Build paired evidence that separates ${missingAxes.join(', ') || 'crop/top-origin and intrinsic width'} before another renderer candidate.`;
  }
  return 'Keep this fixture secondary unless a candidate affects it.';
}

function rankCandidate(candidate) {
  const decisionWeight = {
    READY_FOR_SCOPED_REVIEW: 0,
    PARTIAL_NEEDS_SOURCE_INTRINSIC_MODEL: 1,
    REJECTED: 2,
  }[candidate.auditDecision] ?? 3;
  const delta = candidate.fixtureDeltaPct == null ? 999 : candidate.fixtureDeltaPct;
  return decisionWeight * 1000 + delta;
}

async function resolveImplicitReportDirs() {
  await Promise.all([
    resolveReportDir('sourceIntrinsic', ['chat-source-intrinsic-matrix', 'chat-source-intrinsic'], 'chat-source-intrinsic-matrix-results.json', reportHasFixtures),
    resolveReportDir('candidates', ['chat-candidate-comparison'], 'chat-candidate-comparison-results.json', reportHasCandidates),
    resolveReportDir('styleProof', ['chat-candidate-style-proof', 'chat-style'], 'chat-candidate-style-proof-results.json', reportHasCandidates),
    resolveReportDir('rowRasterCandidates', ['chat-row-raster-candidate-comparison', 'row-raster'], 'chat-row-raster-candidate-comparison-results.json', reportHasCandidates),
    resolveReportDir('assetPlan', ['chat-asset-preservation-plan'], 'chat-asset-preservation-plan-results.json', reportHasFixtures),
  ]);
}

async function resolveReportDir(key, prefixes, fileName, predicate) {
  if (reportDirs[key]) return;
  const canonical = path.join(runDir, canonicalDirName(key));
  const canonicalReport = await readOptionalJson(path.join(canonical, fileName));
  if (predicate(canonicalReport)) {
    reportDirs[key] = canonical;
    return;
  }
  reportDirs[key] = await findLatestFallbackReportDir(prefixes, fileName, predicate);
}

function canonicalDirName(key) {
  return {
    sourceIntrinsic: 'chat-source-intrinsic-matrix',
    candidates: 'chat-candidate-comparison',
    styleProof: 'chat-candidate-style-proof',
    rowRasterCandidates: 'chat-row-raster-candidate-comparison',
    assetPlan: 'chat-asset-preservation-plan',
  }[key];
}

async function readReport(defaultDirName, fileName, overrideDir) {
  const reportDir = overrideDir || path.join(runDir, defaultDirName);
  return readOptionalJson(path.join(reportDir, fileName));
}

async function findLatestFallbackReportDir(prefixes, fileName, predicate) {
  const tmpRoot = path.resolve('..', '_tmp_codex_smoke');
  let entries = [];
  try {
    entries = await readdir(tmpRoot, { withFileTypes: true });
  } catch {
    return '';
  }
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!prefixes.some((prefix) => entry.name.startsWith(prefix))) continue;
    const dir = path.join(tmpRoot, entry.name);
    const reportPath = path.join(dir, fileName);
    const report = await readOptionalJson(reportPath);
    if (!predicate(report)) continue;
    const info = await stat(reportPath).catch(() => null);
    candidates.push({ dir, mtimeMs: info?.mtimeMs ?? 0 });
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0]?.dir ?? '';
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Source Intrinsic Candidate Audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Status: **${report.summary.status}**`,
    '',
    'Scope: diagnostic-only. This report does not promote renderer CSS or prove Roll20 visual parity.',
    '',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`## ${fixture.fixtureId}`, '');
    lines.push(`- Source/intrinsic: ${fixture.sourceIntrinsicDecision}`);
    lines.push(`- Required model: ${fixture.requirements.model}`);
    lines.push(`- Required axes: ${fixture.requirements.axes.join(', ')}`);
    lines.push(`- Source metrics: table ${fmtPx(fixture.sourceMetrics.tableWidthDelta)}, scroll ${fmtPx(fixture.sourceMetrics.tableScrollWidthDelta)}, source max ${fmtPx(fixture.sourceMetrics.sourceMaxWidthPx)}, top ${fmtPx(fixture.sourceMetrics.maxAbsTopDelta)}`);
    lines.push(`- Asset: ${fixture.assetDecision || 'n/a'}`);
    lines.push(`- Next: ${fixture.nextAction}`, '');
    lines.push('### Blockers', '');
    for (const blocker of fixture.blockers) lines.push(`- ${blocker}`);
    lines.push('', '### Partial Candidates', '');
    if (fixture.partialCandidates.length) {
      lines.push('| Candidate | Delta | Risk | Style | Row raster | Covered axes | Missing/reason |');
      lines.push('| --- | ---: | --- | --- | --- | --- | --- |');
      for (const candidate of fixture.partialCandidates) {
        lines.push(`| \`${candidate.name}\` | ${fmtPct(candidate.fixtureDeltaPct)} | ${candidate.promotionRisk || 'n/a'} | ${candidate.styleProofStatus} | ${candidate.rowRasterRisk} | ${candidate.coveredAxes.join('<br>') || 'none'} | ${candidate.missingReasons.join('<br>') || 'none'} |`);
      }
    } else {
      lines.push('- None.');
    }
    lines.push('', '### Rejected Candidates', '');
    if (fixture.rejectedCandidates.length) {
      lines.push('| Candidate | Delta | Risk | Style | Row raster | Rejected because |');
      lines.push('| --- | ---: | --- | --- | --- | --- |');
      for (const candidate of fixture.rejectedCandidates) {
        lines.push(`| \`${candidate.name}\` | ${fmtPct(candidate.fixtureDeltaPct)} | ${candidate.promotionRisk || 'n/a'} | ${candidate.styleProofStatus} | ${candidate.rowRasterRisk} | ${candidate.rejectedReasons.join('<br>') || 'n/a'} |`);
      }
    } else {
      lines.push('- None.');
    }
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- `READY_FOR_SCOPED_REVIEW` would still require renderer gate, browser smoke, and actual Roll20 comparison.');
  lines.push('- `PARTIAL_NEEDS_SOURCE_INTRINSIC_MODEL` means the candidate may be useful evidence but cannot ship.');
  lines.push('- `REJECTED` candidates should not be retried without materially new evidence.');
  return `${lines.join('\n')}\n`;
}

function fixtureKeyForId(fixtureId) {
  if (fixtureId === 'fixtureA') return 'fixtureA';
  if (fixtureId === 'fixtureB') return 'lesOublies';
  if (fixtureId === 'fixtureC-commission-1bu') return 'fixtureC';
  return fixtureId.replace(/^official-roll20-/, '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function scopeHintFor(fixtureId) {
  if (fixtureId === 'fixtureA') return 'fixtureA';
  if (fixtureId === 'fixtureC-commission-1bu') return 'fixtureC';
  if (fixtureId === 'fixtureB') return 'les';
  return fixtureId;
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

function reportHasFixtures(report) {
  return Array.isArray(report?.fixtures) && report.fixtures.length > 0;
}

function reportHasCandidates(report) {
  return Array.isArray(report?.candidates) && report.candidates.length > 0;
}

function normalizeReportDirs(dirs) {
  return Object.fromEntries(Object.entries(dirs).map(([key, value]) => [key, value ? path.relative(process.cwd(), path.resolve(value)) : '']));
}

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index < 0) return fallback;
  const value = rawArgs[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

function firstPositionalArg() {
  return rawArgs.find((arg, index) => !arg.startsWith('--') && arg !== '--self-test' && !optionNamesWithValues.has(rawArgs[index - 1]));
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function unique(values) {
  return [...new Set(values)];
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(2))}%`;
}

function selfTest() {
  const report = buildReport('synthetic', {
    sourceIntrinsic: {
      fixtures: [
        {
          fixtureId: 'fixtureC-commission-1bu',
          priority: 'P0',
          decision: 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED',
          promotionBlocker: true,
          source: { tableMaxWidthPx: 280 },
          metrics: { tableWidthDelta: -24.531, tableScrollWidthDelta: -25, maxAbsTopDelta: 52.703 },
        },
      ],
    },
    candidates: {
      candidates: [
        {
          name: 'fixtureC-coc-table-source-context-r1',
          status: 'OK',
          promotionRisk: 'single-fixture-only',
          regressedFixtures: 0,
          fixtureAlignedDeltaPct: { fixtureC: -1.2 },
        },
        {
          name: 'paint-dim-background',
          status: 'OK',
          promotionRisk: 'reject-regresses-fixtures',
          regressedFixtures: 1,
          fixtureAlignedDeltaPct: { fixtureC: -1.62 },
        },
      ],
    },
    styleProof: {
      candidates: [
        { name: 'fixtureC-coc-table-source-context-r1', styleProofStatus: 'STYLE_COMPATIBLE' },
        { name: 'paint-dim-background', styleProofStatus: 'NOT_STYLE_PROVEN' },
      ],
    },
    rowRasterCandidates: {
      candidates: [
        { name: 'fixtureC-coc-table-source-context-r1', rowRasterRisk: 'no-meaningful-row-raster-gain' },
        { name: 'paint-dim-background', rowRasterRisk: 'reject-row-raster-regression' },
      ],
    },
    assetPlan: {
      fixtures: [
        { fixtureId: 'fixtureC-commission-1bu', decision: 'SOURCE_ASSET_LOST_RELINK_REQUIRED', rendererPolicy: 'DO_NOT_PROMOTE_CSS' },
      ],
    },
  });
  const fixture = report.fixtures[0];
  assert.equal(report.summary.status, 'SOURCE_INTRINSIC_CANDIDATE_BLOCKED');
  assert.equal(fixture.readyCandidates.length, 0);
  assert.equal(fixture.partialCandidates[0].name, 'fixtureC-coc-table-source-context-r1');
  assert.ok(fixture.blockers.some((blocker) => blocker.includes('source/intrinsic matrix still blocks promotion')));
  assert.ok(fixture.rejectedCandidates.some((candidate) => candidate.name === 'paint-dim-background'));
  console.log('roll20_chat_source_intrinsic_candidate_audit self-test PASS');
}

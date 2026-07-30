#!/usr/bin/env node
/**
 * Reconcile Roll20 chat width-related diagnostics into the next safe experiment.
 *
 * Diagnostic only. This script does not emit production CSS. It decides whether
 * each high-mismatch fixture should next target exact text metrics, table
 * intrinsic/scroll sizing, crop/shell context, or paint.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-width-reconciliation');

async function main() {
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const width = await readOptionalJson(path.join(runDir, 'chat-width-model', 'chat-width-model-results.json'));
  const intrinsic = await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const fontGlyph = await readOptionalJson(path.join(runDir, 'chat-font-glyph-model', 'chat-font-glyph-model-results.json'));
  const rows = await readOptionalJson(path.join(runDir, 'chat-row-geometry', 'chat-row-geometry-results.json'));
  const residual = await readOptionalJson(path.join(runDir, 'chat-residual-diagnostics', 'chat-residual-diagnostics-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const styleProof = await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json'));

  const fixtureIds = collectFixtureIds(parity, width, intrinsic, fontGlyph, rows, residual);
  const fixtures = fixtureIds.map((fixtureId) => reconcileFixture(fixtureId, {
    parity,
    width,
    intrinsic,
    fontGlyph,
    rows,
    residual,
    candidates,
    styleProof,
  }));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.nextExperiment !== 'KEEP_DEFAULT');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only chat width reconciliation; no production CSS',
    summary: {
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.nextExperiment)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-width-reconciliation-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-width-reconciliation-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT WIDTH RECONCILIATION ${actionable.length ? 'ACTIONABLE' : 'SECONDARY'}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} next=${fixture.nextExperiment} mismatch=${fixture.alignedMismatchPct} tableDelta=${fmtPx(fixture.signals.tableWidthDelta)} textResidual=${fmtPx(fixture.signals.tableTextResidual)} scrollDelta=${fmtPx(fixture.signals.tableScrollWidthDelta)} candidate=${fixture.bestCandidate?.name ?? 'none'} action=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function reconcileFixture(fixtureId, reports) {
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const width = findFixture(reports.width?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsic?.fixtures, fixtureId);
  const fontGlyph = findFixture(reports.fontGlyph?.fixtures, fixtureId);
  const rows = findFixture(reports.rows?.fixtures, fixtureId);
  const residual = findFixture(reports.residual?.fixtures, fixtureId);
  const key = fixtureKeyForId(fixtureId);
  const bestCandidate = bestFixtureCandidate(reports.candidates, reports.styleProof, key);
  const alignedMismatch = numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio);
  const signals = {
    widthDecision: width?.widthDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    glyphDecision: fontGlyph?.glyphDecision ?? '',
    rowDecision: rows?.rowModel?.decision ?? rows?.rowGeometryDecision ?? rows?.decision ?? '',
    residualAxis: residual?.residualAxis ?? residual?.axis ?? '',
    tableWidthDelta: numberOrNull(width?.deltas?.tableWidthDelta ?? intrinsic?.deltas?.tableWidthDelta ?? fontGlyph?.widthDeltas?.table),
    tableToCropDelta: numberOrNull(width?.deltas?.tableToCropDelta),
    actualTableVsCropRatio: numberOrNull(width?.overflow?.actualTableVsCropRatio),
    tableTextResidual: numberOrNull(fontGlyph?.textWidthModel?.tableTextResidual),
    tableTextDelta: numberOrNull(fontGlyph?.textWidthModel?.tableTextDelta),
    textWidthDecision: fontGlyph?.textWidthModel?.decision ?? '',
    tableScrollWidthDelta: numberOrNull(intrinsic?.structureDeltas?.tableScrollWidthDelta),
    overflowDelta: numberOrNull(intrinsic?.structureDeltas?.overflowDelta),
    maxCellDelta: numberOrNull(intrinsic?.rowCellDeltas?.maxAbsCellWidthDelta),
    firstCellDelta: numberOrNull(intrinsic?.rowCellDeltas?.firstCellWidthDelta),
    rowWidthDeltaSpread: numberOrNull(intrinsic?.rowCellDeltas?.rowWidthDeltaSpread),
    transformContradicted: Boolean(intrinsic?.styleProof?.transformContradicted),
  };
  const decision = decideNextExperiment({ alignedMismatch, signals, bestCandidate });
  return {
    fixtureId,
    priority: alignedMismatch > 0.1 ? 'P0' : alignedMismatch > 0.06 ? 'P1' : 'P2',
    alignedMismatchRatio: alignedMismatch,
    alignedMismatchPct: pct(alignedMismatch),
    nextExperiment: decision.nextExperiment,
    nextAction: decision.nextAction,
    blockers: decision.blockers,
    signals,
    bestCandidate,
    evidence: decision.evidence,
  };
}

function decideNextExperiment({ alignedMismatch, signals, bestCandidate }) {
  if (!(alignedMismatch > 0.1)) {
    return {
      nextExperiment: 'KEEP_DEFAULT',
      nextAction: 'Keep default ChatPane renderer for this fixture while higher-mismatch fixtures are modeled.',
      blockers: [],
      evidence: ['aligned mismatch below high-mismatch threshold'],
    };
  }
  const evidence = [];
  const blockers = [];
  if (signals.transformContradicted) blockers.push('transform/scale candidates contradicted by actual Roll20 computed style');
  if (bestCandidate?.styleProofStatus === 'REJECT_STYLE_CONTRADICTION') {
    blockers.push(`${bestCandidate.name} contradicted by actual style proof`);
  }
  if (signals.widthDecision === 'CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED') {
    evidence.push('template width follows Roll20 chat message/content shell width');
    return {
      nextExperiment: 'CHAT_MESSAGE_CONTENT_WIDTH',
      nextAction: 'Build a per-template Roll20 chat message/content width model; do not widen the global ChatPane shell because it regresses other fixtures.',
      blockers,
      evidence,
    };
  }
  if (Math.abs(signals.tableTextResidual ?? 0) <= 3 && Math.abs(signals.tableWidthDelta ?? 0) >= 8) {
    evidence.push(`table width is explained by exact text metrics: residual ${fmtPx(signals.tableTextResidual)}`);
    return {
      nextExperiment: 'TEXT_METRIC_ALLOCATION',
      nextAction: 'Build an fixtureA-scoped exact text/cell allocation candidate; do not change global ChatPane width.',
      blockers,
      evidence,
    };
  }
  if (
    signals.textWidthDecision === 'TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT' ||
    Math.abs(signals.tableScrollWidthDelta ?? 0) >= 8 ||
    signals.intrinsicDecision === 'TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED'
  ) {
    evidence.push(`table scroll/intrinsic width delta ${fmtPx(signals.tableScrollWidthDelta ?? signals.tableWidthDelta)}`);
    if (signals.actualTableVsCropRatio >= 2) evidence.push(`actual table/crop ratio ${fmtRatio(signals.actualTableVsCropRatio)}`);
    return {
      nextExperiment: 'TABLE_SCROLL_INTRINSIC',
      nextAction: 'Build a fixtureC/CoC-scoped table intrinsic sizing probe using actual scrollWidth/clientWidth evidence; avoid transform and broad font CSS.',
      blockers,
      evidence,
    };
  }
  if (signals.rowDecision === 'UNIFORM_OFFSET_PAINT_OR_CROP' || signals.residualAxis === 'SHADOW_BORDER_RASTERIZATION') {
    evidence.push('row geometry points to crop/paint rather than width allocation');
    return {
      nextExperiment: 'CROP_OR_PAINT_CONTEXT',
      nextAction: 'Test crop-origin, border, and shadow masks before any layout CSS.',
      blockers,
      evidence,
    };
  }
  if (bestCandidate && bestCandidate.fixtureDeltaPct <= -0.5 && !bestCandidate.regresses && bestCandidate.styleProofStatus !== 'REJECT_STYLE_CONTRADICTION') {
    evidence.push(`best fixture-local candidate ${bestCandidate.name} improves ${bestCandidate.fixtureDeltaPct}%`);
    return {
      nextExperiment: 'FIXTURE_LOCAL_CANDIDATE_STYLE_PROOF',
      nextAction: `Style-proof ${bestCandidate.name} and compare against all fixtures before production CSS.`,
      blockers,
      evidence,
    };
  }
  return {
    nextExperiment: 'NEW_NARROW_MODEL_REQUIRED',
    nextAction: 'Create a new fixture/template-specific diagnostic candidate; current candidates are rejected, no-gain, or style-contradicted.',
    blockers,
    evidence: ['no current candidate is safe enough to promote'],
  };
}

function bestFixtureCandidate(candidateReport, styleProofReport, key) {
  const styleProofByName = new Map((styleProofReport?.candidates ?? []).map((candidate) => [candidate.name, candidate]));
  const candidates = (candidateReport?.candidates ?? [])
    .filter((candidate) => candidate.status === 'OK' && candidate.name !== 'default')
    .map((candidate) => ({
      name: candidate.name,
      risk: candidate.promotionRisk ?? '',
      fixtureDeltaPct: numberOrNull(candidate.fixtureAlignedDeltaPct?.[key]),
      regresses: Number(candidate.regressedFixtures ?? 0) > 0,
      meanDeltaPct: numberOrNull(candidate.meanAlignedDeltaPct),
      styleProofStatus: styleProofByName.get(candidate.name)?.styleProofStatus ?? 'NOT_STYLE_PROVEN',
      complexity: candidateComplexity(candidate.name),
    }))
    .filter((candidate) => typeof candidate.fixtureDeltaPct === 'number')
    .sort((a, b) => a.fixtureDeltaPct - b.fixtureDeltaPct || a.complexity - b.complexity || a.name.localeCompare(b.name));
  return candidates[0] ?? null;
}

function candidateComplexity(name) {
  return String(name ?? '')
    .split('-')
    .filter((part) => ['actual', 'width', 'dim', 'background', 'crop', 'origin', 'scale', 'typography', 'metrics', 'shadow'].includes(part)).length;
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      if (fixture.fixtureId || fixture.id) ids.add(fixture.fixtureId ?? fixture.id);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Width Reconciliation',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report chooses the next experiment axis; it does not enable production CSS.',
    '',
    '| Fixture | Priority | Next experiment | Aligned mismatch | Table delta | Text residual | Scroll delta | Best candidate | Blockers | Evidence | Next action |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.nextExperiment} | ${fixture.alignedMismatchPct} | ${fmtPx(fixture.signals.tableWidthDelta)} | ${fmtPx(fixture.signals.tableTextResidual)} | ${fmtPx(fixture.signals.tableScrollWidthDelta)} | ${fixture.bestCandidate?.name ?? 'none'} | ${fixture.blockers.join('<br>') || ''} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- Use this report to choose the next diagnostic candidate only.');
  lines.push('- Do not promote global ChatPane CSS while fixture decisions disagree or style proof contradicts a candidate.');
  return `${lines.join('\n')}\n`;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function fixtureKeyForId(fixtureId) {
  if (fixtureId === 'fixtureA') return 'fixtureA';
  if (fixtureId === 'fixtureB') return 'lesOublies';
  if (fixtureId === 'fixtureC-commission-1bu') return 'fixtureC';
  return fixtureId
    .replace(/^official-roll20-/, '')
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9_]/g, '');
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Number((value * 100).toFixed(2))}%`
    : '';
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${Number(number.toFixed(3))}x`;
}

await main();

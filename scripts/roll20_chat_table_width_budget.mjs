#!/usr/bin/env node
/**
 * Build a fixture-level budget for actual/local Roll20 chat table width deltas.
 *
 * Diagnostic only. The goal is to explain whether table width drift is mostly
 * text measurement, font availability, cell allocation, message shell, or a
 * remaining intrinsic layout constraint. This script does not emit product CSS.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set(['--out-dir']);
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-table-width-budget');

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function firstPositionalArg() {
  return args.find((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(args[index - 1]));
}

async function main() {
  const width = await readOptionalJson(path.join(runDir, 'chat-width-model', 'chat-width-model-results.json'));
  const intrinsic = await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const glyph = await readOptionalJson(path.join(runDir, 'chat-font-glyph-model', 'chat-font-glyph-model-results.json'));
  const messageShell = await readOptionalJson(path.join(runDir, 'chat-message-shell-model', 'chat-message-shell-model-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const styleProof = await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json'));
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));

  const fixtureIds = collectFixtureIds(width, intrinsic, glyph, messageShell, parity);
  const fixtures = fixtureIds.map((fixtureId) => summarizeFixture(fixtureId, {
    width,
    intrinsic,
    glyph,
    messageShell,
    candidates,
    styleProof,
    parity,
  }));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.budgetDecision !== 'WIDTH_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    output: {
      requestedOutDir: rawOutDir || null,
      outDir: path.relative(process.cwd(), outDir),
    },
    scope: 'diagnostic-only Roll20 chat table-width budget',
    summary: {
      status: actionable.length ? 'TABLE_WIDTH_BUDGET_ACTIONABLE' : 'TABLE_WIDTH_BUDGET_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.budgetDecision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-table-width-budget-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-table-width-budget-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT TABLE WIDTH BUDGET ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.budgetDecision} tableDelta=${fmtPx(fixture.tableWidthDelta)} textDelta=${fmtPx(fixture.textMeasureTableDelta)} residual=${fmtPx(fixture.textResidual)} shell=${fixture.messageShellDecision || ''} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function summarizeFixture(fixtureId, reports) {
  const width = findFixture(reports.width?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsic?.fixtures, fixtureId);
  const glyph = findFixture(reports.glyph?.fixtures, fixtureId);
  const messageShell = findFixture(reports.messageShell?.fixtures, fixtureId);
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const candidate = bestCandidateForFixture(reports.candidates, reports.styleProof, fixtureId);

  const tableWidthDelta = numberOrNull(width?.deltas?.tableWidthDelta ?? intrinsic?.deltas?.tableWidthDelta ?? glyph?.widthDeltas?.table);
  const textMeasureTableDelta = numberOrNull(glyph?.textWidthModel?.tableTextDelta);
  const textResidual = numberOrNull(glyph?.textWidthModel?.tableTextResidual);
  const scrollDelta = numberOrNull(intrinsic?.structureDeltas?.tableScrollWidthDelta);
  const firstCellDelta = numberOrNull(intrinsic?.rowCellDeltas?.firstCellWidthDelta ?? glyph?.widthDeltas?.firstCell);
  const maxCellDelta = numberOrNull(intrinsic?.rowCellDeltas?.maxAbsCellWidthDelta);
  const rowSpread = numberOrNull(intrinsic?.rowCellDeltas?.rowWidthDeltaSpread);
  const messageDelta = numberOrNull(messageShell?.deltas?.messageWidthDelta);
  const contentDelta = numberOrNull(messageShell?.deltas?.contentWidthDelta);
  const mismatch = numberOrNull(parity?.bestAlignedMismatchRatio);
  const priority = mismatch > 0.1 ? 'P0' : mismatch > 0.06 ? 'P1' : 'P2';
  const fontSignals = glyph?.fontSignals ?? {};
  const fontAvailabilityChanged = Boolean(fontSignals.fontAvailabilityChanged);
  const tableFontChanged = Boolean(fontSignals.tableFontFamilyChanged);
  const transformContradicted = Boolean(intrinsic?.styleProof?.transformContradicted);
  const spacingRejected = Boolean(intrinsic?.candidateEvidence?.spacingRejectedOrNoGain);
  const fontCandidatesRejected = Boolean(glyph?.candidateEvidence?.fontCandidatesRejected);
  const residualRatio = ratio(Math.abs(textResidual ?? 0), Math.abs(tableWidthDelta ?? 0));
  const textVsTableRatio = ratio(textMeasureTableDelta, tableWidthDelta);
  const budgetDecision = decideBudget({
    priority,
    tableWidthDelta,
    textResidual,
    residualRatio,
    textVsTableRatio,
    messageDelta,
    contentDelta,
    transformContradicted,
    spacingRejected,
    fontCandidatesRejected,
    fontAvailabilityChanged,
    tableFontChanged,
    widthDecision: width?.widthDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    textWidthDecision: glyph?.textWidthModel?.decision ?? '',
  });
  return {
    fixtureId,
    priority,
    budgetDecision,
    nextAction: nextAction(budgetDecision),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    widthDecision: width?.widthDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    glyphDecision: glyph?.glyphDecision ?? '',
    textWidthDecision: glyph?.textWidthModel?.decision ?? '',
    messageShellDecision: messageShell?.messageShellDecision ?? '',
    actualMessageShellModel: messageShell?.actual?.messageShellModel ?? '',
    tableWidthDelta,
    textMeasureTableDelta,
    textResidual,
    residualRatio,
    textVsTableRatio,
    scrollDelta,
    firstCellDelta,
    maxCellDelta,
    rowSpread,
    messageDelta,
    contentDelta,
    fontAvailabilityChanged,
    tableFontChanged,
    transformContradicted,
    spacingRejected,
    fontCandidatesRejected,
    bestCandidate: candidate,
    evidence: evidenceNotes({
      budgetDecision,
      tableWidthDelta,
      textMeasureTableDelta,
      textResidual,
      residualRatio,
      scrollDelta,
      firstCellDelta,
      maxCellDelta,
      rowSpread,
      messageDelta,
      contentDelta,
      fontAvailabilityChanged,
      tableFontChanged,
      transformContradicted,
      spacingRejected,
      fontCandidatesRejected,
      candidate,
    }),
  };
}

function decideBudget(signals) {
  if (signals.priority === 'P2' || Math.abs(signals.tableWidthDelta ?? 0) < 2) return 'WIDTH_SECONDARY';
  if (
    signals.widthDecision === 'CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED' &&
    Math.abs(signals.messageDelta ?? 0) >= 8 &&
    Math.abs(signals.contentDelta ?? 0) >= 8
  ) {
    return 'MESSAGE_CONTENT_WIDTH_BUDGET';
  }
  if (
    signals.textWidthDecision === 'TEXT_WIDTH_EXPLAINS_TABLE_WIDTH' &&
    Math.abs(signals.textResidual ?? 999) <= 3
  ) {
    return 'TEXT_METRIC_EXPLAINS_WIDTH';
  }
  if (
    signals.textWidthDecision === 'TEXT_WIDTH_OVERCONSTRAINED_BY_LAYOUT' ||
    Number(signals.residualRatio ?? 0) >= 0.75
  ) {
    if (signals.transformContradicted && signals.spacingRejected && signals.fontCandidatesRejected) {
      return 'LAYOUT_CONSTRAINT_AFTER_REJECTED_CSS';
    }
    return 'TEXT_LAYOUT_CONSTRAINT_BUDGET';
  }
  if (signals.fontAvailabilityChanged || signals.tableFontChanged) return 'FONT_ACTIVATION_BUDGET';
  if (signals.intrinsicDecision === 'TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED') return 'TABLE_SCROLL_INTRINSIC_BUDGET';
  return 'NARROW_WIDTH_MODEL_REQUIRED';
}

function nextAction(decision) {
  switch (decision) {
    case 'MESSAGE_CONTENT_WIDTH_BUDGET':
      return 'promote only a generic message/content-width rule after proving the condition is not fixture-specific';
    case 'TEXT_METRIC_EXPLAINS_WIDTH':
      return 'model exact text metrics/cell allocation; table delta is explained by measured text width';
    case 'LAYOUT_CONSTRAINT_AFTER_REJECTED_CSS':
      return 'build a table-layout/intrinsic constraint probe; broad font, spacing, and transform candidates are already rejected';
    case 'TEXT_LAYOUT_CONSTRAINT_BUDGET':
      return 'compare wrapping/table-layout/max-content constraints before font or width CSS';
    case 'FONT_ACTIVATION_BUDGET':
      return 'compare font activation with layout constraints; do not ship broad font fallback by itself';
    case 'TABLE_SCROLL_INTRINSIC_BUDGET':
      return 'model table scroll/client/intrinsic width from actual box metrics';
    case 'NARROW_WIDTH_MODEL_REQUIRED':
      return 'create a fixture/template-specific diagnostic candidate and prove it with style evidence';
    default:
      return 'keep table width as secondary evidence';
  }
}

function evidenceNotes(signals) {
  const notes = [];
  if (Math.abs(signals.tableWidthDelta ?? 0) >= 2) notes.push(`table width delta ${fmtPx(signals.tableWidthDelta)}`);
  if (signals.textMeasureTableDelta != null) notes.push(`measureText table delta ${fmtPx(signals.textMeasureTableDelta)}`);
  if (signals.textResidual != null) notes.push(`text residual ${fmtPx(signals.textResidual)} (${fmtRatio(signals.residualRatio)} of table delta)`);
  if (signals.scrollDelta != null) notes.push(`scrollWidth delta ${fmtPx(signals.scrollDelta)}`);
  if (signals.messageDelta != null && Math.abs(signals.messageDelta) >= 2) notes.push(`message width delta ${fmtPx(signals.messageDelta)}`);
  if (signals.contentDelta != null && Math.abs(signals.contentDelta) >= 2) notes.push(`content width delta ${fmtPx(signals.contentDelta)}`);
  if (signals.firstCellDelta != null) notes.push(`first cell delta ${fmtPx(signals.firstCellDelta)}`);
  if (signals.rowSpread != null) notes.push(`row spread ${fmtPx(signals.rowSpread)}`);
  if (signals.maxCellDelta != null) notes.push(`max cell delta ${fmtPx(signals.maxCellDelta)}`);
  if (signals.fontAvailabilityChanged) notes.push('font availability differs');
  if (signals.tableFontChanged) notes.push('table font-family differs');
  if (signals.transformContradicted) notes.push('transform/scale contradicted by actual Roll20 style');
  if (signals.spacingRejected) notes.push('spacing/letter candidates rejected or no-gain');
  if (signals.fontCandidatesRejected) notes.push('broad font/typography candidates rejected or no-gain');
  if (signals.bestCandidate?.name) notes.push(`best current candidate ${signals.bestCandidate.name} (${signals.bestCandidate.fixtureDeltaPct}%)`);
  return notes;
}

function bestCandidateForFixture(candidateReport, styleProofReport, fixtureId) {
  const key = fixtureKeyForId(fixtureId);
  const proofByName = new Map((styleProofReport?.candidates ?? []).map((candidate) => [candidate.name, candidate]));
  const rows = (candidateReport?.candidates ?? [])
    .filter((candidate) => candidate.status === 'OK' && candidate.name !== 'default')
    .map((candidate) => ({
      name: candidate.name,
      risk: candidate.promotionRisk ?? '',
      fixtureDeltaPct: numberOrNull(candidate.fixtureAlignedDeltaPct?.[key]),
      regressedFixtures: Number(candidate.regressedFixtures ?? 0),
      meanDeltaPct: numberOrNull(candidate.meanAlignedDeltaPct),
      styleProofStatus: proofByName.get(candidate.name)?.styleProofStatus ?? 'NOT_STYLE_PROVEN',
      complexity: candidateComplexity(candidate.name),
    }))
    .filter((candidate) => candidate.fixtureDeltaPct != null)
    .sort((a, b) => a.fixtureDeltaPct - b.fixtureDeltaPct || a.complexity - b.complexity || a.name.localeCompare(b.name));
  return rows[0] ?? null;
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
      const id = fixture.fixtureId ?? fixture.id;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Table Width Budget',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report explains the table-width delta budget; it does not enable production ChatPane CSS.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Priority | Decision | Aligned mismatch | Table delta | Text delta | Residual | Scroll delta | Message/content | Font changed | Rejected axes | Best candidate | Evidence | Next |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    const rejected = [
      fixture.transformContradicted ? 'transform' : '',
      fixture.spacingRejected ? 'spacing' : '',
      fixture.fontCandidatesRejected ? 'font' : '',
    ].filter(Boolean).join(', ');
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.budgetDecision} | ${fixture.alignedMismatchPct} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.textMeasureTableDelta)} | ${fmtPx(fixture.textResidual)} | ${fmtPx(fixture.scrollDelta)} | ${fmtPx(fixture.messageDelta)} / ${fmtPx(fixture.contentDelta)} | ${fixture.fontAvailabilityChanged || fixture.tableFontChanged ? 'yes' : 'no'} | ${rejected || 'none'} | ${fixture.bestCandidate?.name ?? 'none'} ${fixture.bestCandidate?.fixtureDeltaPct ?? ''}% | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- A budget decision is a routing signal for the next diagnostic candidate, not a renderer patch.');
  lines.push('- Do not promote broad font/spacing/transform CSS when this report says those axes are rejected or overconstrained.');
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
  if (fixtureId === 'official-roll20-AW2E') return 'aw2e';
  if (fixtureId === 'official-roll20-Les-Oublies') return 'lesOublies';
  if (fixtureId === 'yshy-commission-1bu') return 'yshy';
  return fixtureId
    .replace(/^official-roll20-/, '')
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9_]/g, '');
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ratio(value, divisor) {
  const number = Number(value);
  const base = Number(divisor);
  return Number.isFinite(number) && Number.isFinite(base) && base !== 0
    ? Number((number / base).toFixed(3))
    : null;
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${Number(number.toFixed(2))}x`;
}

await main();

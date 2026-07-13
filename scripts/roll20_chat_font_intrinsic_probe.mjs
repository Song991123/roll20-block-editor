#!/usr/bin/env node
/**
 * Fuse font/glyph evidence with intrinsic table-width evidence.
 *
 * Diagnostic only. This report decides whether the next Roll20 chat renderer
 * probe should target font-face availability/order, table min-content sizing,
 * message width, or something else. It does not emit product CSS.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set(['--out-dir']);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = path.resolve(rawOutDir || path.join(runDir, 'chat-font-intrinsic-probe'));

async function main() {
  const fontGlyph = await readOptionalJson(path.join(runDir, 'chat-font-glyph-model', 'chat-font-glyph-model-results.json'));
  const intrinsic = await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const overflowCrop = await readOptionalJson(path.join(runDir, 'chat-overflow-crop-probe', 'chat-overflow-crop-probe-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));

  const fixtureIds = collectFixtureIds(fontGlyph, intrinsic, overflowCrop, parity);
  const fixtures = fixtureIds.map((fixtureId) => summarizeFixture(fixtureId, {
    fontGlyph,
    intrinsic,
    overflowCrop,
    candidates,
    parity,
  }));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && !['WIDTH_SECONDARY', 'KEEP_CURRENT_AXIS'].includes(fixture.decision));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    output: {
      requestedOutDir: rawOutDir || null,
      outDir: path.relative(process.cwd(), outDir),
      fallbackReason: '',
    },
    scope: 'diagnostic-only Roll20 chat font/intrinsic probe; no production CSS',
    summary: {
      status: actionable.length ? 'FONT_INTRINSIC_PROBE_ACTIONABLE' : 'FONT_INTRINSIC_PROBE_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  const writeResult = await writeFontIntrinsicReport(report, outDir, runDir);

  console.log(`ROLL20 CHAT FONT INTRINSIC PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} tableDelta=${fmtPx(fixture.tableWidthDelta)} fontAvail=${fixture.fontAvailabilityChanged ? 'YES' : 'NO'} tableFont=${fixture.tableFontFamilyChanged ? 'YES' : 'NO'} textResidual=${fmtPx(fixture.tableTextResidual)} widthOverride=${fixture.widthOverrideGain} next=${fixture.nextAction}`);
  }
  if (writeResult.fallbackReason) {
    console.log(`WARNING report write fallback: ${writeResult.fallbackReason}`);
  }
  console.log(`out=${path.relative(process.cwd(), writeResult.outDir)}`);
}

async function writeFontIntrinsicReport(report, requestedOutDir, runDir) {
  const writeTo = async (targetDir, fallbackReason = '') => {
    report.output = {
      requestedOutDir: rawOutDir || null,
      outDir: path.relative(process.cwd(), targetDir),
      fallbackReason,
    };
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, 'chat-font-intrinsic-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(path.join(targetDir, 'chat-font-intrinsic-probe-results.md'), renderMarkdown(report), 'utf8');
    return { outDir: targetDir, fallbackReason };
  };

  try {
    return await writeTo(requestedOutDir);
  } catch (error) {
    if (rawOutDir || !isAccessError(error)) throw error;
    const fallbackDir = path.resolve(
      '..',
      '_tmp_codex_smoke',
      `chat-font-intrinsic-probe-${safePathLabel(path.basename(runDir))}-${Date.now()}`,
    );
    return writeTo(fallbackDir, `${error.code ?? 'WRITE_ERROR'} while writing ${path.relative(process.cwd(), requestedOutDir)}`);
  }
}

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index < 0) return fallback;
  const value = rawArgs[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

function isAccessError(error) {
  return error?.code === 'EPERM' || error?.code === 'EACCES';
}

function safePathLabel(value) {
  return String(value || 'run').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'run';
}

function summarizeFixture(fixtureId, reports) {
  const font = findFixture(reports.fontGlyph?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsic?.fixtures, fixtureId);
  const overflow = findFixture(reports.overflowCrop?.fixtures, fixtureId);
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const candidateSignals = candidateSignalsFor(reports.candidates, fixtureId);
  const tableWidthDelta = numberOrNull(font?.widthDeltas?.table ?? intrinsic?.deltas?.tableWidthDelta ?? overflow?.deltas?.tableWidth);
  const tableTextResidual = numberOrNull(font?.textWidthModel?.tableTextResidual);
  const textMeasureTableDelta = numberOrNull(font?.textWidthModel?.tableTextDelta);
  const fontAvailabilityChanged = Boolean(font?.fontSignals?.fontAvailabilityChanged);
  const tableFontFamilyChanged = Boolean(font?.fontSignals?.tableFontFamilyChanged);
  const rootFontFamilyChanged = Boolean(font?.fontSignals?.rootFontFamilyChanged);
  const changedFonts = (font?.fontSignals?.changedFonts ?? []).map((item) => item.spec).filter(Boolean);
  const textWidthDecision = font?.textWidthModel?.decision ?? '';
  const intrinsicDecision = intrinsic?.intrinsicDecision ?? '';
  const overflowDecision = overflow?.decision ?? '';
  const widthOverrideGain = candidateSignals.widthOverrideGain;
  const decision = decide({
    priority: priorityFor(parity),
    tableWidthDelta,
    tableTextResidual,
    textMeasureTableDelta,
    textWidthDecision,
    intrinsicDecision,
    overflowDecision,
    fontAvailabilityChanged,
    tableFontFamilyChanged,
    rootFontFamilyChanged,
    widthOverrideGain,
  });
  return {
    fixtureId,
    priority: priorityFor(parity),
    decision,
    nextAction: nextAction(decision),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    tableWidthDelta,
    textMeasureTableDelta,
    tableTextResidual,
    textWidthDecision,
    intrinsicDecision,
    overflowDecision,
    fontAvailabilityChanged,
    tableFontFamilyChanged,
    rootFontFamilyChanged,
    changedFonts: changedFonts.slice(0, 12),
    localFontStatus: font?.fontSignals?.localFontStatus ?? '',
    actualFontStatus: font?.fontSignals?.actualFontStatus ?? '',
    localFontFamily: font?.fontSignals?.local?.tableFontFamily ?? '',
    actualFontFamily: font?.fontSignals?.actual?.tableFontFamily ?? '',
    localTableFontSize: font?.fontSignals?.local?.tableFontSize ?? null,
    actualTableFontSize: font?.fontSignals?.actual?.tableFontSize ?? null,
    widthOverrideGain,
    candidateSignals,
    evidence: evidenceNotes({
      tableWidthDelta,
      textMeasureTableDelta,
      tableTextResidual,
      textWidthDecision,
      intrinsicDecision,
      overflowDecision,
      fontAvailabilityChanged,
      tableFontFamilyChanged,
      rootFontFamilyChanged,
      changedFonts,
      widthOverrideGain,
      candidateSignals,
    }),
  };
}

function decide(signals) {
  if (signals.priority === 'P2' || Math.abs(signals.tableWidthDelta ?? 0) < 2) return 'WIDTH_SECONDARY';
  if (signals.textWidthDecision === 'TEXT_WIDTH_EXPLAINS_TABLE_WIDTH' && Math.abs(signals.tableTextResidual ?? 999) <= 3) {
    return 'TEXT_METRIC_WIDTH_MODEL';
  }
  if (
    signals.intrinsicDecision === 'TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED' &&
    signals.overflowDecision === 'TABLE_OVERFLOW_CROP_MODEL_REQUIRED' &&
    signals.fontAvailabilityChanged &&
    signals.tableFontFamilyChanged &&
    signals.widthOverrideGain === 'NO_GAIN'
  ) {
    return 'FONT_FACE_INTRINSIC_MODEL_REQUIRED';
  }
  if (signals.fontAvailabilityChanged || signals.tableFontFamilyChanged || signals.rootFontFamilyChanged) {
    return 'FONT_CONTEXT_BEFORE_WIDTH_CSS';
  }
  if (signals.intrinsicDecision === 'TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED') return 'TABLE_MIN_CONTENT_MODEL_REQUIRED';
  return 'KEEP_CURRENT_AXIS';
}

function nextAction(decision) {
  switch (decision) {
    case 'FONT_FACE_INTRINSIC_MODEL_REQUIRED':
      return 'build a YSHY/CoC diagnostic that mirrors Roll20 font-face availability/order before table min-content sizing; direct width/overflow CSS is already no-gain';
    case 'FONT_CONTEXT_BEFORE_WIDTH_CSS':
      return 'compare Roll20 and local font-face activation/order before another table-width candidate';
    case 'TABLE_MIN_CONTENT_MODEL_REQUIRED':
      return 'model table min-content/intrinsic sizing without transform or broad typography';
    case 'TEXT_METRIC_WIDTH_MODEL':
      return 'continue exact text metric/message width modeling; font-intrinsic table work is secondary';
    default:
      return 'keep current renderer axis; no new font-intrinsic action';
  }
}

function candidateSignalsFor(candidateReport, fixtureId) {
  const key = fixtureKeyForId(fixtureId);
  const rows = (candidateReport?.candidates ?? []).filter((candidate) => candidate.status === 'OK');
  const named = Object.fromEntries(rows.map((candidate) => [candidate.name, candidate]));
  const widthCandidateNames = ['coc-table-actual-width', 'coc-overflow-crop-model', 'coc-table-intrinsic-clamp'];
  const widthDeltas = widthCandidateNames
    .map((name) => ({ name, delta: numberOrNull(named[name]?.fixtureAlignedDeltaPct?.[key]), risk: named[name]?.promotionRisk ?? '' }))
    .filter((item) => item.delta != null);
  const bestWidthDelta = widthDeltas.length ? Math.min(...widthDeltas.map((item) => item.delta)) : null;
  return {
    widthDeltas,
    widthOverrideGain: bestWidthDelta != null && bestWidthDelta <= -0.5 ? 'GAIN' : widthDeltas.length ? 'NO_GAIN' : 'MISSING',
    bestWidthDelta,
    bestCandidateName: rows
      .filter((candidate) => candidate.fixtureAlignedDeltaPct?.[key] != null)
      .sort((a, b) => a.fixtureAlignedDeltaPct[key] - b.fixtureAlignedDeltaPct[key])[0]?.name ?? '',
  };
}

function evidenceNotes(signals) {
  const notes = [];
  notes.push(`table width delta ${fmtPx(signals.tableWidthDelta)}`);
  if (signals.textMeasureTableDelta != null) notes.push(`measureText table delta ${fmtPx(signals.textMeasureTableDelta)}`);
  if (signals.tableTextResidual != null) notes.push(`text residual ${fmtPx(signals.tableTextResidual)}`);
  if (signals.textWidthDecision) notes.push(`text width decision ${signals.textWidthDecision}`);
  if (signals.intrinsicDecision) notes.push(`intrinsic decision ${signals.intrinsicDecision}`);
  if (signals.overflowDecision) notes.push(`overflow/crop decision ${signals.overflowDecision}`);
  if (signals.fontAvailabilityChanged) notes.push(`font availability differs: ${signals.changedFonts.slice(0, 6).join(', ')}`);
  if (signals.tableFontFamilyChanged) notes.push('table font-family differs');
  if (signals.rootFontFamilyChanged) notes.push('root font-family differs');
  notes.push(`width override candidates ${signals.widthOverrideGain}`);
  if (signals.candidateSignals.bestCandidateName) notes.push(`best current candidate ${signals.candidateSignals.bestCandidateName}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Font/Intrinsic Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report fuses font/glyph, intrinsic width, overflow/crop, and candidate comparison evidence. It does not enable production CSS.',
    '',
    '| Fixture | Priority | Decision | Mismatch | Table delta | Text delta | Residual | Font availability | Table font | Width override | Next action |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.alignedMismatchPct} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.textMeasureTableDelta)} | ${fmtPx(fixture.tableTextResidual)} | ${fixture.fontAvailabilityChanged ? 'changed' : 'same'} | ${fixture.tableFontFamilyChanged ? 'changed' : 'same'} | ${fixture.widthOverrideGain} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    if (fixture.changedFonts.length) lines.push(`- changed font specs: ${fixture.changedFonts.join(', ')}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- A decision here is a route to the next experiment, not visual parity.');
  lines.push('- Keep generated reports and Roll20 evidence local-only.');
  return `${lines.join('\n')}\n`;
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      const id = fixture.id ?? fixture.fixtureId;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.id === fixtureId || fixture.fixtureId === fixtureId) ?? null;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function priorityFor(parity) {
  const mismatch = numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio);
  if (mismatch > 0.1) return 'P0';
  if (mismatch > 0.06) return 'P1';
  return 'P2';
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

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function fmtPx(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${Number(value.toFixed(3))}px` : 'n/a';
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

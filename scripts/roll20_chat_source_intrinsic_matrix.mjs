#!/usr/bin/env node
/**
 * Build a source/intrinsic proof matrix for Roll20 chat rolltemplates.
 *
 * Diagnostic only. This script does not emit renderer CSS. It combines source
 * CSS declarations, actual Roll20 computed sidecar evidence, intrinsic width,
 * min-content, table-layout, and table-intrinsic reports so the renderer gates
 * can distinguish a real table formatting-context blocker from a tempting
 * width/font shortcut.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = rawArgs.includes('--self-test');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--source-context-dir',
  '--intrinsic-width-dir',
  '--table-intrinsic-dir',
  '--table-layout-dir',
  '--min-content-dir',
]);
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-source-intrinsic-matrix');

const reportDirs = {
  sourceContext: readOption('--source-context-dir', ''),
  intrinsicWidth: readOption('--intrinsic-width-dir', ''),
  tableIntrinsic: readOption('--table-intrinsic-dir', ''),
  tableLayout: readOption('--table-layout-dir', ''),
  minContent: readOption('--min-content-dir', ''),
};

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

async function main() {
  await resolveImplicitReportDirs();
  const reports = {
    parity: await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json')),
    sourceContext: await readReport('chat-source-context-probe', 'chat-source-context-probe-results.json', reportDirs.sourceContext),
    intrinsicWidth: await readReport('chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json', reportDirs.intrinsicWidth),
    tableIntrinsic: await readReport('chat-table-intrinsic-probe', 'chat-table-intrinsic-probe-results.json', reportDirs.tableIntrinsic),
    tableLayout: await readReport('chat-table-layout-constraint-probe', 'chat-table-layout-constraint-probe-results.json', reportDirs.tableLayout),
    minContent: await readReport('chat-min-content-model', 'chat-min-content-model-results.json', reportDirs.minContent),
  };
  const report = buildReport(runDirArg, reports, normalizeReportDirs(reportDirs));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-source-intrinsic-matrix-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-source-intrinsic-matrix-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT SOURCE INTRINSIC MATRIX ${report.summary.status}`);
  for (const fixture of report.fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} tableDelta=${fmtPx(fixture.metrics.tableWidthDelta)} sourceMax=${fmtPx(fixture.source.tableMaxWidthPx)} rowSpread=${fmtPx(fixture.metrics.rowWidthDeltaSpread)} cell=${fmtPx(fixture.metrics.maxAbsCellDelta)} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function buildReport(runDirLabel, reports, overrides = {}) {
  const fixtureIds = collectFixtureIds(reports.parity, reports.sourceContext, reports.intrinsicWidth, reports.tableIntrinsic, reports.tableLayout, reports.minContent);
  const fixtures = fixtureIds.map((fixtureId) => summarizeFixture(fixtureId, reports));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'SOURCE_INTRINSIC_SECONDARY');
  const promotionBlocked = fixtures.filter((fixture) => fixture.promotionBlocker);
  return {
    generatedAt: new Date().toISOString(),
    runDir: runDirLabel,
    reportOverrides: overrides,
    scope: 'diagnostic-only source/intrinsic matrix for Roll20 chat renderer work; no production CSS',
    summary: {
      status: actionable.length ? 'SOURCE_INTRINSIC_MATRIX_ACTIONABLE' : 'SOURCE_INTRINSIC_MATRIX_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      promotionBlocked: promotionBlocked.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };
}

function summarizeFixture(fixtureId, reports) {
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const sourceContext = findFixture(reports.sourceContext?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsicWidth?.fixtures, fixtureId);
  const tableIntrinsic = findFixture(reports.tableIntrinsic?.fixtures, fixtureId);
  const tableLayout = findFixture(reports.tableLayout?.fixtures, fixtureId);
  const minContent = findFixture(reports.minContent?.fixtures, fixtureId);
  const priority = priorityFor(parity);
  const source = summarizeSource(sourceContext);
  const metrics = summarizeMetrics({ sourceContext, intrinsic, tableIntrinsic, tableLayout, minContent });
  const signals = summarizeSignals({ sourceContext, intrinsic, tableIntrinsic, tableLayout, minContent, source, metrics });
  const decision = decide({ priority, source, metrics, signals });
  return {
    fixtureId,
    priority,
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    decision,
    promotionBlocker: priority === 'P0' && decision !== 'SOURCE_INTRINSIC_SECONDARY',
    nextAction: nextAction(decision),
    source,
    metrics,
    signals,
    evidence: evidenceNotes({ decision, source, metrics, signals }),
  };
}

function summarizeSource(sourceContext) {
  const tableTarget = sourceContext?.sourceCssAudit?.targets?.table ??
    sourceContext?.tableContext?.sourceCssAudit?.targets?.table ??
    null;
  const declarations = tableTarget?.declarations ?? {};
  return {
    sourceContextDecision: sourceContext?.decision ?? '',
    tableContextDecision: sourceContext?.tableContext?.decision ?? '',
    sourceCssStatus: sourceContext?.sourceCssAudit?.status ?? sourceContext?.tableContext?.sourceCssAudit?.status ?? '',
    tableRuleCount: numberOrNull(tableTarget?.ruleCount),
    tableSelectors: tableTarget?.selectors ?? [],
    tableWidth: declarations.width ?? '',
    tableMaxWidth: declarations.maxWidth ?? '',
    tableMinWidth: declarations.minWidth ?? '',
    tableMaxWidthPx: numberOrNull(declarations.maxWidthPx),
    sourceMaxWidthExceeded: Boolean(sourceContext?.tableContext?.sourceMaxWidthExceeded),
    fontDecision: sourceContext?.fontActivation?.decision ?? '',
    changedFonts: sourceContext?.fontActivation?.changedFonts?.length ?? 0,
    sanitizeReplayRejected: sourceContext?.decision === 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED',
  };
}

function summarizeMetrics({ sourceContext, intrinsic, tableIntrinsic, tableLayout, minContent }) {
  return {
    tableWidthDelta: firstNumber(
      minContent?.deltas?.tableWidth,
      tableLayout?.deltas?.tableWidth,
      tableIntrinsic?.deltas?.tableWidth,
      intrinsic?.deltas?.tableWidthDelta,
      sourceContext?.tableContext?.tableWidthDelta,
    ),
    tableScrollWidthDelta: firstNumber(
      minContent?.deltas?.tableScrollWidth,
      tableLayout?.deltas?.tableScrollWidth,
      tableIntrinsic?.deltas?.tableScrollWidth,
      intrinsic?.constraintModel?.tableScrollWidthDelta,
      sourceContext?.tableContext?.tableScrollWidthDelta,
    ),
    tableClientWidthDelta: firstNumber(
      minContent?.deltas?.tableClientWidth,
      intrinsic?.constraintModel?.tableClientWidthDelta,
    ),
    rootWidthDelta: firstNumber(
      minContent?.deltas?.rootWidth,
      tableLayout?.deltas?.rootWidth,
      tableIntrinsic?.deltas?.rootWidth,
      intrinsic?.deltas?.rootWidthDelta,
    ),
    captionWidthDelta: firstNumber(
      minContent?.deltas?.captionWidth,
      tableLayout?.deltas?.captionWidth,
      tableIntrinsic?.deltas?.captionWidth,
      intrinsic?.deltas?.captionWidthDelta,
    ),
    firstCellWidthDelta: firstNumber(
      minContent?.deltas?.firstCellWidth,
      tableLayout?.deltas?.firstCellWidth,
      tableIntrinsic?.deltas?.firstCellWidth,
      intrinsic?.rowCellDeltas?.firstCellWidthDelta,
    ),
    rowWidthDeltaSpread: firstNumber(
      minContent?.rowModel?.rowWidthDeltaSpread,
      tableIntrinsic?.rowModel?.rowWidthDeltaSpread,
      intrinsic?.constraintModel?.rowWidthDeltaSpread,
    ),
    maxAbsCellDelta: firstNumber(
      minContent?.rowModel?.maxAbsCellDelta,
      tableIntrinsic?.rowModel?.maxAbsCellDelta,
      intrinsic?.constraintModel?.maxAbsCellWidthDelta,
    ),
    maxAbsTopDelta: firstNumber(
      minContent?.rowModel?.maxAbsTopDelta,
      tableIntrinsic?.rowModel?.maxAbsTopDelta,
    ),
    tableTextDelta: firstNumber(minContent?.textMetrics?.tableTextDelta),
    tableTextResidual: firstNumber(minContent?.textMetrics?.tableTextResidual),
    tableTextRatioDelta: firstNumber(minContent?.ratios?.tableToTextRatioDelta),
  };
}

function summarizeSignals({ sourceContext, intrinsic, tableIntrinsic, tableLayout, minContent, source, metrics }) {
  return {
    sourceContextDecision: source.sourceContextDecision,
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    intrinsicConstraint: intrinsic?.constraintModel?.decision ?? '',
    tableIntrinsicDecision: tableIntrinsic?.probeDecision ?? tableIntrinsic?.decision ?? '',
    tableLayoutDecision: tableLayout?.decision ?? '',
    minContentDecision: minContent?.decision ?? '',
    bothAutoLayout: Boolean(minContent?.constraints?.bothAutoLayout),
    actualExceedsComputedMax: Boolean(minContent?.constraints?.actualExceedsComputedMax),
    localExceedsComputedMax: Boolean(minContent?.constraints?.localExceedsComputedMax),
    actualMaxWidthCaptured: Boolean(minContent?.constraints?.actualMaxWidthCaptured),
    localScrollTracksWidth: Boolean(minContent?.constraints?.localScrollTracksWidth ?? intrinsic?.constraintModel?.tableScrollTracksWidth),
    actualScrollTracksWidth: Boolean(minContent?.constraints?.actualScrollTracksWidth),
    uniformRows: Boolean(minContent?.rowModel?.uniformRows ?? tableIntrinsic?.rowModel?.uniformWidthDelta),
    cellsSmall: Math.abs(metrics.maxAbsCellDelta ?? Infinity) <= 2,
    rowOffsetPresent: Math.abs(metrics.maxAbsTopDelta ?? 0) >= 24,
    textOverExplainsTable: (
      typeof metrics.tableTextDelta === 'number' &&
      typeof metrics.tableWidthDelta === 'number' &&
      Math.sign(metrics.tableTextDelta) !== Math.sign(metrics.tableWidthDelta)
    ),
    tableWideOnly: Boolean(intrinsic?.constraintModel?.tableWideOnly),
    sourceMaxWidthExceeded: source.sourceMaxWidthExceeded,
    sanitizeReplayRejected: source.sanitizeReplayRejected,
  };
}

function decide({ priority, source, metrics, signals }) {
  if (priority === 'P2') return 'SOURCE_INTRINSIC_SECONDARY';
  if (!source.sourceContextDecision && !signals.intrinsicDecision && !signals.minContentDecision) return 'MISSING_SOURCE_INTRINSIC_EVIDENCE';
  if (
    source.sanitizeReplayRejected &&
    signals.bothAutoLayout &&
    signals.actualExceedsComputedMax &&
    signals.uniformRows &&
    signals.cellsSmall &&
    signals.rowOffsetPresent
  ) {
    return 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED';
  }
  if (
    signals.bothAutoLayout &&
    signals.actualExceedsComputedMax &&
    signals.uniformRows &&
    signals.cellsSmall
  ) {
    return 'TABLE_AUTO_LAYOUT_INTRINSIC_MODEL_REQUIRED';
  }
  if (signals.rowOffsetPresent && Math.abs(metrics.tableWidthDelta ?? 0) >= 8) return 'CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED';
  if (signals.sourceMaxWidthExceeded || /INTRINSIC|TABLE/.test(signals.intrinsicDecision)) return 'SOURCE_TABLE_INTRINSIC_REQUIRED';
  if (source.changedFonts > 0 || /FONT/.test(source.fontDecision)) return 'FONT_RULE_ORDER_REQUIRED';
  return 'SOURCE_INTRINSIC_SECONDARY';
}

function nextAction(decision) {
  switch (decision) {
    case 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED':
      return 'model Roll20 sanitize/rule order plus table auto-layout intrinsic width and crop/top-origin together before any renderer CSS review';
    case 'TABLE_AUTO_LAYOUT_INTRINSIC_MODEL_REQUIRED':
      return 'build a source-order-aware table auto-layout intrinsic proof; avoid hard-coded width, transform, and broad font CSS';
    case 'CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED':
      return 'separate crop/top-origin from intrinsic table width with paired evidence before candidate CSS';
    case 'SOURCE_TABLE_INTRINSIC_REQUIRED':
      return 'prove source max-width/width semantics under Roll20 table layout before another local width candidate';
    case 'FONT_RULE_ORDER_REQUIRED':
      return 'prove Roll20 font-face activation and rule order before changing typography';
    case 'MISSING_SOURCE_INTRINSIC_EVIDENCE':
      return 'rerun source-context, intrinsic-width, table-layout, table-intrinsic, and min-content diagnostics with current sidecars';
    default:
      return 'keep this fixture secondary for the source/intrinsic axis';
  }
}

function evidenceNotes({ decision, source, metrics, signals }) {
  const notes = [
    `decision ${decision}`,
    `source table width=${source.tableWidth || 'n/a'}, max-width=${source.tableMaxWidth || 'n/a'}`,
    `table delta ${fmtPx(metrics.tableWidthDelta)}, scroll delta ${fmtPx(metrics.tableScrollWidthDelta)}, client delta ${fmtPx(metrics.tableClientWidthDelta)}`,
    `row spread ${fmtPx(metrics.rowWidthDeltaSpread)}, max cell delta ${fmtPx(metrics.maxAbsCellDelta)}, top offset ${fmtPx(metrics.maxAbsTopDelta)}`,
    `text delta ${fmtPx(metrics.tableTextDelta)}, residual ${fmtPx(metrics.tableTextResidual)}, ratio delta ${fmtRatio(metrics.tableTextRatioDelta)}`,
    `signals source=${source.sourceContextDecision || 'n/a'}, intrinsic=${signals.intrinsicDecision || 'n/a'}, layout=${signals.tableLayoutDecision || 'n/a'}, min=${signals.minContentDecision || 'n/a'}`,
  ];
  if (signals.sanitizeReplayRejected) notes.push('sanitize replay was rejected as a renderer model');
  if (signals.actualExceedsComputedMax) notes.push('actual Roll20 used table width exceeds computed max-width');
  if (signals.rowOffsetPresent) notes.push('crop/top-origin offset remains present');
  if (signals.textOverExplainsTable) notes.push('text metric delta does not directly explain table delta');
  return notes;
}

async function resolveImplicitReportDirs() {
  await Promise.all([
    resolveReportDir('sourceContext', ['chat-source-context-probe', 'chat-source-context'], 'chat-source-context-probe-results.json', sourceContextHasActionableEvidence),
    resolveReportDir('intrinsicWidth', ['chat-intrinsic-width-model', 'chat-intrinsic-width'], 'chat-intrinsic-width-model-results.json', reportHasFixtures),
    resolveReportDir('tableIntrinsic', ['chat-table-intrinsic-probe', 'chat-table-intrinsic'], 'chat-table-intrinsic-probe-results.json', reportHasFixtures),
    resolveReportDir('tableLayout', ['chat-table-layout-constraint-probe', 'chat-table-layout'], 'chat-table-layout-constraint-probe-results.json', reportHasFixtures),
    resolveReportDir('minContent', ['chat-min-content-model', 'chat-min-content'], 'chat-min-content-model-results.json', reportHasFixtures),
  ]);
}

async function resolveReportDir(key, prefixes, fileName, predicate) {
  if (reportDirs[key]) return;
  const defaultDir = path.join(runDir, canonicalDirName(key));
  const defaultReport = await readOptionalJson(path.join(defaultDir, fileName));
  if (predicate(defaultReport)) {
    reportDirs[key] = defaultDir;
    return;
  }
  reportDirs[key] = await findLatestFallbackReportDir(prefixes, fileName, predicate);
}

function canonicalDirName(key) {
  return {
    sourceContext: 'chat-source-context-probe',
    intrinsicWidth: 'chat-intrinsic-width-model',
    tableIntrinsic: 'chat-table-intrinsic-probe',
    tableLayout: 'chat-table-layout-constraint-probe',
    minContent: 'chat-min-content-model',
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

function sourceContextHasActionableEvidence(report) {
  return (report?.fixtures ?? []).some((fixture) => fixture.decision && fixture.decision !== 'MISSING_EVIDENCE');
}

function reportHasFixtures(report) {
  return Array.isArray(report?.fixtures) && report.fixtures.length > 0;
}

function normalizeReportDirs(dirs) {
  return Object.fromEntries(Object.entries(dirs).map(([key, value]) => [key, value ? rel(path.resolve(value)) : '']));
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

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index < 0) return fallback;
  const value = rawArgs[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

function firstPositionalArg() {
  return rawArgs.find((arg, index) => !arg.startsWith('--') && arg !== '--self-test' && !optionNamesWithValues.has(rawArgs[index - 1]));
}

function priorityFor(parityFixture) {
  const mismatch = numberOrNull(parityFixture?.bestAlignedMismatchRatio ?? parityFixture?.mismatchRatio);
  if (mismatch != null && mismatch >= 0.1) return 'P0';
  if (mismatch != null && mismatch >= 0.03) return 'P1';
  return 'P2';
}

function firstNumber(...values) {
  for (const value of values) {
    const number = numberOrNull(value);
    if (number != null) return number;
  }
  return null;
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${Number(number.toFixed(4))}x`;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Source Intrinsic Matrix',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This does not promote renderer CSS or prove Roll20 visual parity.',
    '',
    '| Fixture | Priority | Decision | Table delta | Scroll delta | Source max | Row spread | Max cell | Top offset | Promotion blocker | Next action |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fmtPx(fixture.metrics.tableWidthDelta)} | ${fmtPx(fixture.metrics.tableScrollWidthDelta)} | ${fmtPx(fixture.source.tableMaxWidthPx)} | ${fmtPx(fixture.metrics.rowWidthDeltaSpread)} | ${fmtPx(fixture.metrics.maxAbsCellDelta)} | ${fmtPx(fixture.metrics.maxAbsTopDelta)} | ${fixture.promotionBlocker ? 'yes' : 'no'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- `promotionBlocker=yes` means the renderer gate should not promote CSS from this evidence.');
  lines.push('- This matrix is a routing proof, not a screenshot parity pass.');
  return `${lines.join('\n')}\n`;
}

function selfTest() {
  const report = buildReport('synthetic', {
    parity: { fixtures: [{ fixtureId: 'fixtureC', bestAlignedMismatchRatio: 0.2 }] },
    sourceContext: {
      fixtures: [{
        fixtureId: 'fixtureC',
        decision: 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED',
        tableContext: {
          decision: 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED',
          sourceMaxWidthExceeded: true,
          sourceCssAudit: {
            targets: {
              table: {
                ruleCount: 1,
                selectors: ['.sheet-rolltemplate-coc table'],
                declarations: { width: '100%', maxWidth: '280px', maxWidthPx: 280 },
              },
            },
          },
        },
        fontActivation: { decision: 'FONT_FACE_ACTIVATION_DIFFERS', changedFonts: [{ spec: 'Bookk' }] },
      }],
    },
    intrinsicWidth: { fixtures: [{ fixtureId: 'fixtureC', intrinsicDecision: 'TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED' }] },
    tableIntrinsic: { fixtures: [{ fixtureId: 'fixtureC', probeDecision: 'TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET', rowModel: { rowWidthDeltaSpread: 0, maxAbsCellDelta: 0.9, maxAbsTopDelta: 52.7 } }] },
    tableLayout: { fixtures: [{ fixtureId: 'fixtureC', decision: 'TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED', deltas: { tableWidth: -24.5, tableScrollWidth: -25 } }] },
    minContent: { fixtures: [{ fixtureId: 'fixtureC', decision: 'TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED', deltas: { tableWidth: -24.5, tableScrollWidth: -25, tableClientWidth: -25 }, constraints: { bothAutoLayout: true, actualExceedsComputedMax: true }, rowModel: { uniformRows: true, maxAbsCellDelta: 0.9, maxAbsTopDelta: 52.7 }, textMetrics: { tableTextDelta: -54.9, tableTextResidual: 30.4 } }] },
  });
  const fixture = report.fixtures[0];
  assert.equal(report.summary.status, 'SOURCE_INTRINSIC_MATRIX_ACTIONABLE');
  assert.equal(fixture.decision, 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED');
  assert.equal(fixture.promotionBlocker, true);
  console.log('ROLL20 CHAT SOURCE INTRINSIC MATRIX SELF_TEST PASS');
}

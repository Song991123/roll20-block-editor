#!/usr/bin/env node
/**
 * Diagnose Roll20 chat table auto-layout constraints.
 *
 * Diagnostic only. This report answers whether a table width/max-width CSS
 * candidate is actually constraining the used table width, or whether table
 * auto layout/min-content behavior is still dominating the result.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--source-context-dir',
  '--intrinsic-width-dir',
  '--table-intrinsic-dir',
]);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const smokePath = path.resolve(args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const outDir = path.resolve(readOption('--out-dir', path.join(runDir, 'chat-table-layout-constraint-probe')));
const sourceContextDir = path.resolve(readOption('--source-context-dir', path.join(runDir, 'chat-source-context-probe')));
const intrinsicWidthDir = path.resolve(readOption('--intrinsic-width-dir', path.join(runDir, 'chat-intrinsic-width-model')));
const tableIntrinsicDir = path.resolve(readOption('--table-intrinsic-dir', path.join(runDir, 'chat-table-intrinsic-probe')));

async function main() {
  const smoke = await readJson(smokePath);
  const sourceContext = await readOptionalJson(path.join(sourceContextDir, 'chat-source-context-probe-results.json'));
  const intrinsicWidth = await readOptionalJson(path.join(intrinsicWidthDir, 'chat-intrinsic-width-model-results.json'));
  const tableIntrinsic = await readOptionalJson(path.join(tableIntrinsicDir, 'chat-table-intrinsic-probe-results.json'));
  const fixtures = [];

  for (const fixtureId of collectFixtureIds(smoke, sourceContext, intrinsicWidth, tableIntrinsic)) {
    fixtures.push(await summarizeFixture(fixtureId, { smoke, sourceContext, intrinsicWidth, tableIntrinsic }));
  }

  const actionable = fixtures.filter((fixture) => fixture.decision !== 'LAYOUT_CONSTRAINT_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    smokePath: rel(smokePath),
    reportOverrides: {
      outDir: rel(outDir),
      sourceContextDir: rel(sourceContextDir),
      intrinsicWidthDir: rel(intrinsicWidthDir),
      tableIntrinsicDir: rel(tableIntrinsicDir),
    },
    scope: 'diagnostic-only chat table auto-layout constraint probe; no production CSS',
    summary: {
      status: actionable.length ? 'TABLE_LAYOUT_CONSTRAINT_ACTIONABLE' : 'TABLE_LAYOUT_CONSTRAINT_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-table-layout-constraint-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-table-layout-constraint-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT TABLE LAYOUT CONSTRAINT ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} decision=${fixture.decision} localMax=${fmtPx(fixture.signals.localComputedMaxWidth)} actualMax=${fmtPx(fixture.signals.actualComputedMaxWidth)} tableDelta=${fmtPx(fixture.deltas.tableWidth)} next=${fixture.nextAction}`);
  }
  console.log(`out=${rel(outDir)}`);
}

async function summarizeFixture(fixtureId, reports) {
  const localTemplate = localTemplateFor(reports.smoke, fixtureId);
  const actualSidecar = await readOptionalJson(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  const local = summarizeTemplate(localTemplate);
  const actual = summarizeTemplate(actualTemplate);
  const source = findFixture(reports.sourceContext?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsicWidth?.fixtures, fixtureId);
  const tableProbe = findFixture(reports.tableIntrinsic?.fixtures, fixtureId);

  if (!local || !actual) {
    return {
      fixtureId,
      status: 'MISSING_DOM_EVIDENCE',
      decision: 'MISSING_DOM_EVIDENCE',
      nextAction: 'regenerate local smoke and actual Roll20 chat DOM sidecars before layout constraint modeling',
      hasLocal: Boolean(local),
      hasActual: Boolean(actual),
      signals: {},
      deltas: {},
      evidence: [],
    };
  }

  const deltas = {
    rootWidth: delta(actual.root.width, local.root.width),
    tableWidth: delta(actual.table.width, local.table.width),
    tableScrollWidth: delta(actual.table.scrollWidth, local.table.scrollWidth),
    captionWidth: delta(actual.caption?.width, local.caption?.width),
    firstCellWidth: delta(actual.firstCell?.width, local.firstCell?.width),
  };
  const sourceMaxWidth = numberOrNull(source?.sourceCssAudit?.targets?.table?.declarations?.maxWidthPx);
  const signals = buildSignals({ local, actual, sourceMaxWidth, intrinsic, tableProbe });
  const decision = decide(signals, deltas);
  return {
    fixtureId,
    status: 'COMPARED',
    decision,
    nextAction: nextAction(decision),
    sourceContextDecision: source?.tableContext?.decision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    tableProbeDecision: tableProbe?.probeDecision ?? '',
    sourceTableSummary: source?.sourceCssAudit?.targets?.table?.summary ?? '',
    local,
    actual,
    deltas,
    signals,
    evidence: evidenceNotes({ decision, signals, deltas }),
  };
}

function summarizeTemplate(template) {
  if (!template?.computedStyle) return null;
  const children = new Map((template.computedChildren ?? []).map((child) => [child.selector, child]));
  const table = children.get('table') ?? template.tableStructure?.table ?? null;
  if (!table?.computedStyle) return null;
  return {
    root: summarizeNode(template),
    table: summarizeNode(table),
    caption: summarizeNode(children.get('caption')),
    firstCell: summarizeNode(children.get('td:first') ?? children.get('sheet-template_label:first')),
  };
}

function summarizeNode(node) {
  if (!node) return null;
  const style = node.computedStyle ?? {};
  return {
    selector: node.selector ?? '',
    className: node.className ?? '',
    width: numberOrNull(node.rect?.width ?? node.boxMetrics?.offsetWidth),
    height: numberOrNull(node.rect?.height ?? node.boxMetrics?.offsetHeight),
    scrollWidth: numberOrNull(node.boxMetrics?.scrollWidth),
    clientWidth: numberOrNull(node.boxMetrics?.clientWidth),
    offsetWidth: numberOrNull(node.boxMetrics?.offsetWidth),
    style: {
      display: style.display ?? null,
      width: style.width ?? null,
      minWidth: style.minWidth ?? null,
      maxWidth: style.maxWidth ?? null,
      tableLayout: style.tableLayout ?? null,
      borderCollapse: style.borderCollapse ?? null,
      borderSpacing: style.borderSpacing ?? null,
      overflowWrap: style.overflowWrap ?? null,
      wordBreak: style.wordBreak ?? null,
      whiteSpace: style.whiteSpace ?? null,
      fontFamily: style.fontFamily ?? null,
      fontSize: style.fontSize ?? null,
      lineHeight: style.lineHeight ?? null,
    },
    hasStyleField: {
      minWidth: Object.prototype.hasOwnProperty.call(style, 'minWidth'),
      maxWidth: Object.prototype.hasOwnProperty.call(style, 'maxWidth'),
    },
  };
}

function buildSignals({ local, actual, sourceMaxWidth, intrinsic, tableProbe }) {
  const localComputedMaxWidth = cssPx(local.table.style.maxWidth);
  const actualComputedMaxWidth = cssPx(actual.table.style.maxWidth);
  const localComputedMinWidth = cssPx(local.table.style.minWidth);
  const actualComputedMinWidth = cssPx(actual.table.style.minWidth);
  return {
    sourceMaxWidth,
    localComputedMaxWidth,
    actualComputedMaxWidth,
    localComputedMinWidth,
    actualComputedMinWidth,
    localHasMaxWidthField: local.table.hasStyleField.maxWidth,
    actualHasMaxWidthField: actual.table.hasStyleField.maxWidth,
    localTableAutoLayout: local.table.style.display === 'table' && local.table.style.tableLayout === 'auto',
    actualTableAutoLayout: actual.table.style.display === 'table' && actual.table.style.tableLayout === 'auto',
    localUsedExceedsComputedMax: exceeds(local.table.width, localComputedMaxWidth),
    actualUsedExceedsComputedMax: exceeds(actual.table.width, actualComputedMaxWidth),
    localUsedExceedsSourceMax: exceeds(local.table.width, sourceMaxWidth),
    actualUsedExceedsSourceMax: exceeds(actual.table.width, sourceMaxWidth),
    localScrollEqualsUsed: sameMagnitude(local.table.scrollWidth, local.table.width, 2),
    actualScrollEqualsUsed: sameMagnitude(actual.table.scrollWidth, actual.table.width, 2),
    rowDeltaUniform: Boolean(intrinsic?.constraintModel?.rowDeltaUniform ?? tableProbe?.rowModel?.uniformWidthDelta),
    cellsSmall: Boolean(intrinsic?.constraintModel?.cellsSmall) || Math.abs(tableProbe?.rowModel?.maxAbsCellDelta ?? Infinity) <= 2,
    cssMetricCandidatesRejected: Boolean(intrinsic?.constraintModel?.cssMetricCandidatesRejected),
    tableConstraintDecision: intrinsic?.constraintModel?.decision ?? '',
    tableProbeDecision: tableProbe?.probeDecision ?? '',
  };
}

function decide(signals, deltas) {
  if (!signals.localHasMaxWidthField || !signals.actualHasMaxWidthField) {
    if (
      signals.localUsedExceedsComputedMax &&
      !signals.actualHasMaxWidthField &&
      Math.abs(deltas.tableWidth ?? 0) >= 8
    ) {
      return 'ACTUAL_MAX_WIDTH_CAPTURE_GAP_BEFORE_AUTO_LAYOUT_MODEL';
    }
  }
  if (signals.localUsedExceedsComputedMax && signals.actualUsedExceedsComputedMax) {
    return 'TABLE_AUTO_LAYOUT_OVERRIDES_MAX_WIDTH_BOTH_CONTEXTS';
  }
  if (signals.localUsedExceedsComputedMax && signals.localTableAutoLayout && signals.localScrollEqualsUsed) {
    return 'LOCAL_TABLE_AUTO_LAYOUT_OVERRIDES_MAX_WIDTH';
  }
  if (signals.sourceMaxWidth != null && signals.actualUsedExceedsSourceMax && !signals.actualHasMaxWidthField) {
    return 'SOURCE_MAX_WIDTH_EXCEEDED_ACTUAL_CAPTURE_GAP';
  }
  if (
    Math.abs(deltas.tableWidth ?? 0) >= 8 &&
    signals.localTableAutoLayout &&
    signals.actualTableAutoLayout &&
    signals.rowDeltaUniform &&
    signals.cellsSmall
  ) {
    return 'TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED';
  }
  return 'LAYOUT_CONSTRAINT_SECONDARY';
}

function nextAction(decision) {
  switch (decision) {
    case 'ACTUAL_MAX_WIDTH_CAPTURE_GAP_BEFORE_AUTO_LAYOUT_MODEL':
      return 'recapture actual Roll20 chat DOM with minWidth/maxWidth fields, then model table auto-layout/min-content instead of retrying max-width CSS';
    case 'TABLE_AUTO_LAYOUT_OVERRIDES_MAX_WIDTH_BOTH_CONTEXTS':
      return 'model table auto-layout/min-content directly; max-width is applied but does not constrain used table width';
    case 'LOCAL_TABLE_AUTO_LAYOUT_OVERRIDES_MAX_WIDTH':
      return 'treat max-width clamp as rejected locally and test table formatting/min-content context, not another width declaration';
    case 'SOURCE_MAX_WIDTH_EXCEEDED_ACTUAL_CAPTURE_GAP':
      return 'capture actual computed max-width before deciding whether Roll20 sanitize/order drops or ignores source max-width';
    case 'TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED':
      return 'build a table auto-layout/min-content diagnostic candidate with row/cell constraints, then gate it against all fixtures';
    case 'MISSING_DOM_EVIDENCE':
      return 'regenerate local and actual chat DOM evidence';
    default:
      return 'keep table layout constraint secondary';
  }
}

function evidenceNotes({ decision, signals, deltas }) {
  const notes = [];
  notes.push(`decision ${decision}`);
  notes.push(`table width delta ${fmtPx(deltas.tableWidth)}, scroll delta ${fmtPx(deltas.tableScrollWidth)}`);
  if (signals.sourceMaxWidth != null) notes.push(`source table max-width ${fmtPx(signals.sourceMaxWidth)}`);
  if (signals.localComputedMaxWidth != null) notes.push(`local computed max-width ${fmtPx(signals.localComputedMaxWidth)}`);
  if (signals.actualComputedMaxWidth != null) notes.push(`actual computed max-width ${fmtPx(signals.actualComputedMaxWidth)}`);
  if (!signals.actualHasMaxWidthField) notes.push('actual computed max-width field is missing; recapture with updated chat capture sidecar');
  if (signals.localUsedExceedsComputedMax) notes.push('local used table width exceeds computed max-width');
  if (signals.actualUsedExceedsComputedMax) notes.push('actual used table width exceeds computed max-width');
  if (signals.localTableAutoLayout && signals.localScrollEqualsUsed) notes.push('local table is auto layout and scrollWidth tracks used width');
  if (signals.actualTableAutoLayout && signals.actualScrollEqualsUsed) notes.push('actual table is auto layout and scrollWidth tracks used width');
  if (signals.cssMetricCandidatesRejected) notes.push('CSS metric candidates are already rejected/no-gain');
  if (signals.tableConstraintDecision) notes.push(`intrinsic constraint ${signals.tableConstraintDecision}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Table Layout Constraint Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Smoke: \`${report.smokePath}\``,
    '',
    'Scope: diagnostic-only. This report does not promote production renderer CSS or prove visual parity.',
    '',
    '| Fixture | Decision | Source max | Local max | Actual max | Table delta | Local exceeds max | Actual max captured | Next action |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    const signals = fixture.signals ?? {};
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fmtPx(signals.sourceMaxWidth)} | ${fmtPx(signals.localComputedMaxWidth)} | ${fmtPx(signals.actualComputedMaxWidth)} | ${fmtPx(fixture.deltas?.tableWidth)} | ${signals.localUsedExceedsComputedMax ? 'yes' : 'no'} | ${signals.actualHasMaxWidthField ? 'yes' : 'no'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence ?? []) lines.push(`- ${note}`);
    if (fixture.sourceTableSummary) lines.push(`- source table: ${fixture.sourceTableSummary}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- A layout constraint decision is a route to the next renderer experiment, not a parity pass.');
  lines.push('- Keep generated reports/screenshots local-only unless sanitized and explicitly approved.');
  return `${lines.join('\n')}\n`;
}

function localTemplateFor(smoke, fixtureId) {
  return (smoke?.fixtures ?? []).find((fixture) => fixture.id === fixtureId || fixture.fixtureId === fixtureId)?.cardInfo?.templateComputed ?? null;
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

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index < 0) return fallback;
  const value = rawArgs[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readOptionalJson(file) {
  try {
    return await readJson(file);
  } catch {
    return null;
  }
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cssPx(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'none' || raw === 'auto' || raw === 'normal') return null;
  const match = raw.match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match ? Number(match[1]) : null;
}

function delta(actual, local) {
  const a = numberOrNull(actual);
  const l = numberOrNull(local);
  return a != null && l != null ? Number((a - l).toFixed(3)) : null;
}

function exceeds(width, maxWidth) {
  return width != null && maxWidth != null && width > maxWidth + 1;
}

function sameMagnitude(a, b, tolerance = 1) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(Math.abs(left) - Math.abs(right)) <= tolerance;
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
  return typeof value === 'number' && Number.isFinite(value) ? `${Number(value.toFixed(3))}px` : 'n/a';
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Diagnose Roll20 chat rolltemplate table min-content behavior.
 *
 * Diagnostic only. This fuses fresh actual Roll20 chat sidecars with the local
 * ChatPane smoke and existing table/font probes to decide whether the next
 * renderer work should model text metrics, table auto-layout/min-content, or
 * crop/message context. It does not emit product CSS.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--actual-sidecar',
  '--font-glyph-dir',
  '--intrinsic-width-dir',
  '--table-intrinsic-dir',
  '--table-layout-dir',
  '--source-context-dir',
]);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const smokePath = path.resolve(args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const outDir = path.resolve(readOption('--out-dir', path.join(runDir, 'chat-min-content-model')));
const actualSidecarOverrides = readKeyValueOptions('--actual-sidecar');
const fontGlyphDir = path.resolve(readOption('--font-glyph-dir', path.join(runDir, 'chat-font-glyph-model')));
const intrinsicWidthDir = path.resolve(readOption('--intrinsic-width-dir', path.join(runDir, 'chat-intrinsic-width-model')));
const tableIntrinsicDir = path.resolve(readOption('--table-intrinsic-dir', path.join(runDir, 'chat-table-intrinsic-probe')));
const tableLayoutDir = path.resolve(readOption('--table-layout-dir', path.join(runDir, 'chat-table-layout-constraint-probe')));
const sourceContextDir = path.resolve(readOption('--source-context-dir', path.join(runDir, 'chat-source-context-probe')));

async function main() {
  const smoke = await readJson(smokePath);
  const fontGlyph = await readOptionalJson(path.join(fontGlyphDir, 'chat-font-glyph-model-results.json'));
  const intrinsicWidth = await readOptionalJson(path.join(intrinsicWidthDir, 'chat-intrinsic-width-model-results.json'));
  const tableIntrinsic = await readOptionalJson(path.join(tableIntrinsicDir, 'chat-table-intrinsic-probe-results.json'));
  const tableLayout = await readOptionalJson(path.join(tableLayoutDir, 'chat-table-layout-constraint-probe-results.json'));
  const sourceContext = await readOptionalJson(path.join(sourceContextDir, 'chat-source-context-probe-results.json'));
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));

  const fixtureIds = collectFixtureIds(smoke, fontGlyph, intrinsicWidth, tableIntrinsic, tableLayout, sourceContext, parity);
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await summarizeFixture(fixtureId, {
      smoke,
      fontGlyph,
      intrinsicWidth,
      tableIntrinsic,
      tableLayout,
      sourceContext,
      parity,
    }));
  }

  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && !['MIN_CONTENT_SECONDARY', 'MISSING_DOM_EVIDENCE'].includes(fixture.decision));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    smokePath: rel(smokePath),
    reportOverrides: {
      outDir: rel(outDir),
      actualSidecars: Object.fromEntries([...actualSidecarOverrides].map(([fixtureId, file]) => [fixtureId, rel(file)])),
      fontGlyphDir: rel(fontGlyphDir),
      intrinsicWidthDir: rel(intrinsicWidthDir),
      tableIntrinsicDir: rel(tableIntrinsicDir),
      tableLayoutDir: rel(tableLayoutDir),
      sourceContextDir: rel(sourceContextDir),
    },
    scope: 'diagnostic-only chat table min-content model; no production CSS',
    summary: {
      status: actionable.length ? 'MIN_CONTENT_MODEL_ACTIONABLE' : 'MIN_CONTENT_MODEL_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-min-content-model-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-min-content-model-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT MIN CONTENT MODEL ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} tableDelta=${fmtPx(fixture.deltas.tableWidth)} textDelta=${fmtPx(fixture.textMetrics.tableTextDelta)} residual=${fmtPx(fixture.textMetrics.tableTextResidual)} ratioDelta=${fmtRatio(fixture.ratios.tableToTextRatioDelta)} next=${fixture.nextAction}`);
  }
  console.log(`out=${rel(outDir)}`);
}

async function summarizeFixture(fixtureId, reports) {
  const localFixture = findFixture(reports.smoke?.fixtures, fixtureId);
  const actualSidecarPath = actualSidecarOverrides.get(fixtureId)
    ?? path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actualSidecar = await readOptionalJson(actualSidecarPath);
  const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  const local = summarizeTemplate(localTemplate);
  const actual = summarizeTemplate(actualTemplate);
  const priority = priorityFor(findFixture(reports.parity?.fixtures, fixtureId));

  if (!local || !actual) {
    return {
      fixtureId,
      priority,
      status: 'MISSING_DOM_EVIDENCE',
      decision: 'MISSING_DOM_EVIDENCE',
      nextAction: 'recapture local ChatPane smoke and actual Roll20 chat DOM sidecar with row/text/table metrics',
      actualSidecarPath: rel(actualSidecarPath),
      deltas: {},
      textMetrics: {},
      ratios: {},
      evidence: ['missing local or actual template/table evidence'],
    };
  }

  const fontGlyphFixture = findFixture(reports.fontGlyph?.fixtures, fixtureId);
  const intrinsicFixture = findFixture(reports.intrinsicWidth?.fixtures, fixtureId);
  const tableIntrinsicFixture = findFixture(reports.tableIntrinsic?.fixtures, fixtureId);
  const tableLayoutFixture = findFixture(reports.tableLayout?.fixtures, fixtureId);
  const sourceContextFixture = findFixture(reports.sourceContext?.fixtures, fixtureId);
  const deltas = {
    rootWidth: delta(local.root.width, actual.root.width),
    tableWidth: delta(local.table.width, actual.table.width),
    tableScrollWidth: delta(local.table.scrollWidth, actual.table.scrollWidth),
    tableClientWidth: delta(local.table.clientWidth, actual.table.clientWidth),
    firstCellWidth: delta(local.firstCell?.width, actual.firstCell?.width),
    captionWidth: delta(local.caption?.width, actual.caption?.width),
  };
  const textMetrics = compareTextMetrics({
    localText: localFixture?.cardInfo?.textMeasureEvidence ?? localTemplate?.textMeasureEvidence,
    actualText: actualSidecar?.textMeasureEvidence ?? actualTemplate?.textMeasureEvidence,
    fontGlyph: fontGlyphFixture,
    tableDelta: deltas.tableWidth,
  });
  const rowModel = compareRows(local.rows, actual.rows, tableIntrinsicFixture);
  const constraints = {
    localExceedsComputedMax: exceeds(local.table.width, local.table.computedMaxWidth),
    actualExceedsComputedMax: exceeds(actual.table.width, actual.table.computedMaxWidth),
    localScrollTracksWidth: sameMagnitude(local.table.scrollWidth, local.table.width, 2),
    actualScrollTracksWidth: sameMagnitude(actual.table.scrollWidth, actual.table.width, 2),
    bothAutoLayout: local.table.display === 'table' && actual.table.display === 'table' &&
      local.table.tableLayout === 'auto' && actual.table.tableLayout === 'auto',
    actualMaxWidthCaptured: actual.table.computedMaxWidth != null,
    sourceContextDecision: sourceContextFixture?.decision ?? '',
    intrinsicDecision: intrinsicFixture?.intrinsicDecision ?? '',
    tableIntrinsicDecision: tableIntrinsicFixture?.probeDecision ?? '',
    tableLayoutDecision: tableLayoutFixture?.decision ?? '',
  };
  const ratios = {
    localTableToTextRatio: ratio(local.table.width, textMetrics.localTableTextWidth),
    actualTableToTextRatio: ratio(actual.table.width, textMetrics.actualTableTextWidth),
    tableToTextRatioDelta: delta(
      ratio(local.table.width, textMetrics.localTableTextWidth),
      ratio(actual.table.width, textMetrics.actualTableTextWidth),
    ),
    actualVsLocalTable: ratio(actual.table.width, local.table.width),
    actualVsLocalText: ratio(textMetrics.actualTableTextWidth, textMetrics.localTableTextWidth),
  };
  const decision = decide({ priority, deltas, textMetrics, rowModel, constraints, ratios });

  return {
    fixtureId,
    priority,
    status: 'COMPARED',
    decision,
    nextAction: nextAction(decision),
    actualSidecarPath: rel(actualSidecarPath),
    deltas,
    textMetrics,
    ratios,
    rowModel,
    constraints,
    local,
    actual,
    evidence: evidenceNotes({ decision, deltas, textMetrics, ratios, rowModel, constraints }),
  };
}

function summarizeTemplate(template) {
  if (!template?.computedStyle) return null;
  const table = child(template, 'table') ?? template?.tableStructure?.table ?? null;
  if (!table?.computedStyle) return null;
  return {
    root: summarizeNode(template),
    table: summarizeNode(table),
    caption: summarizeNode(child(template, 'caption')),
    firstCell: summarizeNode(child(template, 'td:first') ?? child(template, 'sheet-template_label:first') ?? template.rowMetrics?.[0]?.cells?.[0]),
    rows: (template.rowMetrics ?? []).map((row) => ({
      index: row.index,
      text: row.text ?? '',
      width: numberOrNull(row.rect?.width),
      height: numberOrNull(row.rect?.height),
      top: numberOrNull(row.rect?.top ?? row.rect?.y),
      cells: (row.cells ?? []).map((cell) => ({
        index: cell.index,
        text: cell.text ?? '',
        className: cell.className ?? '',
        width: numberOrNull(cell.rect?.width),
        height: numberOrNull(cell.rect?.height),
      })),
    })),
  };
}

function summarizeNode(node) {
  if (!node) return null;
  const style = node.computedStyle ?? {};
  return {
    width: numberOrNull(node.rect?.width ?? node.boxMetrics?.offsetWidth),
    height: numberOrNull(node.rect?.height ?? node.boxMetrics?.offsetHeight),
    scrollWidth: numberOrNull(node.boxMetrics?.scrollWidth),
    clientWidth: numberOrNull(node.boxMetrics?.clientWidth),
    computedWidth: cssPx(style.width),
    computedMinWidth: cssPx(style.minWidth),
    computedMaxWidth: cssPx(style.maxWidth),
    display: String(style.display ?? ''),
    tableLayout: String(style.tableLayout ?? ''),
    fontFamily: String(style.fontFamily ?? ''),
    fontSize: cssPx(style.fontSize),
    lineHeight: cssPx(style.lineHeight),
    letterSpacing: cssPx(style.letterSpacing),
    overflowWrap: String(style.overflowWrap ?? ''),
    wordBreak: String(style.wordBreak ?? ''),
    whiteSpace: String(style.whiteSpace ?? ''),
    borderSpacing: String(style.borderSpacing ?? ''),
  };
}

function compareTextMetrics({ localText, actualText, fontGlyph, tableDelta }) {
  const localTable = sampleBySelector(localText, 'table');
  const actualTable = sampleBySelector(actualText, 'table');
  const localWidth = numberOrNull(localTable?.metrics?.width);
  const actualWidth = numberOrNull(actualTable?.metrics?.width);
  const tableTextDelta = numberOrNull(fontGlyph?.textWidthModel?.tableTextDelta) ?? delta(localWidth, actualWidth);
  const tableTextResidual = numberOrNull(fontGlyph?.textWidthModel?.tableTextResidual) ??
    (tableDelta != null && tableTextDelta != null ? Number((tableDelta - tableTextDelta).toFixed(3)) : null);
  return {
    localTableTextWidth: localWidth,
    actualTableTextWidth: actualWidth,
    tableTextDelta,
    tableTextResidual,
    textWidthDecision: fontGlyph?.textWidthModel?.decision ?? '',
    comparedSamples: fontGlyph?.textMeasureSignals?.comparedSamples ?? countComparableSamples(localText, actualText),
    localFont: localTable?.font ?? '',
    actualFont: actualTable?.font ?? '',
    tableFontChanged: (localTable?.font ?? '') !== (actualTable?.font ?? ''),
  };
}

function compareRows(localRows, actualRows, tableIntrinsicFixture) {
  const rowDeltas = [];
  const cellDeltas = [];
  const max = Math.max(localRows.length, actualRows.length);
  for (let index = 0; index < max; index += 1) {
    const local = localRows[index];
    const actual = actualRows[index];
    if (local?.width != null && actual?.width != null) rowDeltas.push(delta(local.width, actual.width));
    const cellMax = Math.max(local?.cells?.length ?? 0, actual?.cells?.length ?? 0);
    for (let cellIndex = 0; cellIndex < cellMax; cellIndex += 1) {
      const localCell = local?.cells?.[cellIndex];
      const actualCell = actual?.cells?.[cellIndex];
      if (localCell?.width != null && actualCell?.width != null) cellDeltas.push(delta(localCell.width, actualCell.width));
    }
  }
  return {
    rowWidthDeltaSpread: numberOrNull(tableIntrinsicFixture?.rowModel?.rowWidthDeltaSpread) ?? spread(rowDeltas),
    maxAbsCellDelta: numberOrNull(tableIntrinsicFixture?.rowModel?.maxAbsCellDelta) ?? maxAbs(cellDeltas),
    maxAbsTopDelta: numberOrNull(tableIntrinsicFixture?.rowModel?.maxAbsTopDelta),
    rowCountDelta: actualRows.length - localRows.length,
    uniformRows: Math.abs(numberOrNull(tableIntrinsicFixture?.rowModel?.rowWidthDeltaSpread) ?? spread(rowDeltas) ?? Infinity) <= 1,
    cellsSmall: Math.abs(numberOrNull(tableIntrinsicFixture?.rowModel?.maxAbsCellDelta) ?? maxAbs(cellDeltas) ?? Infinity) <= 2,
  };
}

function decide({ priority, deltas, textMetrics, rowModel, constraints, ratios }) {
  if (priority === 'P2' || Math.abs(deltas.tableWidth ?? 0) < 2) return 'MIN_CONTENT_SECONDARY';
  const residualAbs = Math.abs(textMetrics.tableTextResidual ?? Infinity);
  const ratioStable = Math.abs(ratios.tableToTextRatioDelta ?? Infinity) <= 0.03;
  if (residualAbs <= 3 && textMetrics.textWidthDecision === 'TEXT_WIDTH_EXPLAINS_TABLE_WIDTH') {
    return 'TEXT_METRIC_WIDTH_MODEL';
  }
  if (
    constraints.bothAutoLayout &&
    constraints.localScrollTracksWidth &&
    constraints.actualScrollTracksWidth &&
    rowModel.uniformRows &&
    rowModel.cellsSmall &&
    constraints.localExceedsComputedMax &&
    constraints.actualExceedsComputedMax &&
    ratioStable
  ) {
    return 'TABLE_MIN_CONTENT_RATIO_MODEL_REQUIRED';
  }
  if (
    constraints.bothAutoLayout &&
    rowModel.uniformRows &&
    rowModel.cellsSmall &&
    constraints.actualExceedsComputedMax
  ) {
    return 'TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED';
  }
  if (Math.abs(rowModel.maxAbsTopDelta ?? 0) >= 24) return 'CROP_CONTEXT_BEFORE_MIN_CONTENT_MODEL';
  return 'MIN_CONTENT_AXIS_UNRESOLVED';
}

function nextAction(decision) {
  switch (decision) {
    case 'TEXT_METRIC_WIDTH_MODEL':
      return 'continue exact text metric/message width modeling for this template; table min-content is secondary';
    case 'TABLE_MIN_CONTENT_RATIO_MODEL_REQUIRED':
      return 'build a scoped table min-content ratio diagnostic candidate that preserves row/cell allocation and proves Roll20 rule order/font activation first';
    case 'TABLE_AUTO_LAYOUT_MIN_CONTENT_MODEL_REQUIRED':
      return 'build a scoped table auto-layout/min-content candidate, then run smoke, candidate comparison, row raster, style proof, and renderer gate';
    case 'CROP_CONTEXT_BEFORE_MIN_CONTENT_MODEL':
      return 'separate crop/top-origin context from intrinsic width before writing another CSS candidate';
    case 'MIN_CONTENT_AXIS_UNRESOLVED':
      return 'inspect missing row/text/crop signals before renderer CSS';
    default:
      return 'keep min-content model secondary';
  }
}

function evidenceNotes({ decision, deltas, textMetrics, ratios, rowModel, constraints }) {
  const notes = [];
  notes.push(`decision ${decision}`);
  notes.push(`table width delta ${fmtPx(deltas.tableWidth)}, scroll delta ${fmtPx(deltas.tableScrollWidth)}`);
  notes.push(`table text delta ${fmtPx(textMetrics.tableTextDelta)}, residual ${fmtPx(textMetrics.tableTextResidual)}`);
  notes.push(`table/text ratio local=${fmtRatio(ratios.localTableToTextRatio)} actual=${fmtRatio(ratios.actualTableToTextRatio)} delta=${fmtRatio(ratios.tableToTextRatioDelta)}`);
  notes.push(`row spread ${fmtPx(rowModel.rowWidthDeltaSpread)}, max cell delta ${fmtPx(rowModel.maxAbsCellDelta)}`);
  if (rowModel.maxAbsTopDelta != null) notes.push(`top offset ${fmtPx(rowModel.maxAbsTopDelta)}`);
  if (constraints.actualMaxWidthCaptured) notes.push('actual computed max-width captured');
  if (constraints.localExceedsComputedMax) notes.push('local used table width exceeds computed max-width');
  if (constraints.actualExceedsComputedMax) notes.push('actual used table width exceeds computed max-width');
  if (constraints.sourceContextDecision) notes.push(`source/context decision ${constraints.sourceContextDecision}`);
  if (constraints.intrinsicDecision) notes.push(`intrinsic decision ${constraints.intrinsicDecision}`);
  if (constraints.tableIntrinsicDecision) notes.push(`table-intrinsic decision ${constraints.tableIntrinsicDecision}`);
  if (constraints.tableLayoutDecision) notes.push(`table-layout decision ${constraints.tableLayoutDecision}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Min-Content Model',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Smoke: \`${report.smokePath}\``,
    '',
    'Scope: diagnostic-only. This report does not enable production ChatPane CSS or prove Roll20 visual parity.',
    '',
    '| Fixture | Priority | Decision | Table delta | Text delta | Residual | Local table/text | Actual table/text | Ratio delta | Row spread | Max cell | Next action |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fmtPx(fixture.deltas.tableWidth)} | ${fmtPx(fixture.textMetrics.tableTextDelta)} | ${fmtPx(fixture.textMetrics.tableTextResidual)} | ${fmtRatio(fixture.ratios.localTableToTextRatio)} | ${fmtRatio(fixture.ratios.actualTableToTextRatio)} | ${fmtRatio(fixture.ratios.tableToTextRatioDelta)} | ${fmtPx(fixture.rowModel?.rowWidthDeltaSpread)} | ${fmtPx(fixture.rowModel?.maxAbsCellDelta)} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence ?? []) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- This report only routes the next renderer experiment; it is not a visual parity pass.');
  lines.push('- Keep generated output local-only and ignored.');
  return `${lines.join('\n')}\n`;
}

function child(template, selector) {
  return (template?.computedChildren ?? []).find((item) => item.selector === selector) ?? null;
}

function sampleBySelector(evidence, selector) {
  return (evidence?.samples ?? []).find((sample) => sample.selector === selector && sample.source === 'element') ??
    (evidence?.samples ?? []).find((sample) => sample.selector === selector) ??
    null;
}

function countComparableSamples(local, actual) {
  const actualKeys = new Set((actual?.samples ?? []).map(textMeasureKey));
  return (local?.samples ?? []).filter((sample) => actualKeys.has(textMeasureKey(sample))).length;
}

function textMeasureKey(sample) {
  return `${sample.selector ?? ''}|${sample.source ?? ''}|${sample.text ?? ''}`;
}

function priorityFor(fixture) {
  const mismatch = Number(fixture?.bestAlignedMismatchRatio ?? fixture?.bestAlignedMismatch ?? fixture?.mismatchRatio);
  if (Number.isFinite(mismatch) && mismatch >= 0.1) return 'P0';
  if (Number.isFinite(mismatch) && mismatch >= 0.03) return 'P1';
  return 'P2';
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

function readKeyValueOptions(name) {
  const values = new Map();
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    let raw = '';
    if (arg === name) {
      raw = rawArgs[index + 1] ?? '';
      index += 1;
    } else if (arg.startsWith(`${name}=`)) {
      raw = arg.slice(name.length + 1);
    }
    if (!raw) continue;
    const separator = raw.indexOf('=');
    if (separator <= 0) throw new Error(`Expected ${name} <fixture-id>=<path>, got: ${raw}`);
    const key = raw.slice(0, separator);
    const value = raw.slice(separator + 1);
    if (!key || !value) throw new Error(`Expected ${name} <fixture-id>=<path>, got: ${raw}`);
    values.set(key, path.resolve(value));
  }
  return values;
}

async function readJson(file) {
  return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
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

function delta(localValue, actualValue) {
  const local = numberOrNull(localValue);
  const actual = numberOrNull(actualValue);
  return local != null && actual != null ? Number((actual - local).toFixed(3)) : null;
}

function ratio(value, divisor) {
  const number = numberOrNull(value);
  const base = numberOrNull(divisor);
  return number != null && base != null && base !== 0 ? Number((number / base).toFixed(4)) : null;
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

function spread(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Number((Math.max(...numbers) - Math.min(...numbers)).toFixed(3)) : null;
}

function maxAbs(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Number(Math.max(...numbers.map(Math.abs)).toFixed(3)) : null;
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

await main();

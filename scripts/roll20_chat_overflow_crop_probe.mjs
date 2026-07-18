#!/usr/bin/env node
/**
 * Compare local ChatPane rolltemplate overflow/crop geometry with actual
 * Roll20 chat DOM sidecars. Diagnostic only: this routes the next renderer
 * experiment and must not be treated as product CSS or visual parity.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const smokePath = path.resolve(args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const outDir = path.join(runDir, 'chat-overflow-crop-probe');

async function main() {
  const smoke = await readOptionalJson(smokePath);
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const width = await readOptionalJson(path.join(runDir, 'chat-width-model', 'chat-width-model-results.json'));
  const intrinsic = await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const tableProbe = await readOptionalJson(path.join(runDir, 'chat-table-intrinsic-probe', 'chat-table-intrinsic-probe-results.json'));
  const rowGeometry = await readOptionalJson(path.join(runDir, 'chat-row-geometry', 'chat-row-geometry-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const styleProof = await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json'));

  const fixtureIds = collectFixtureIds(smoke, parity, width, intrinsic, tableProbe, rowGeometry);
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await summarizeFixture(fixtureId, {
      smoke,
      parity,
      width,
      intrinsic,
      tableProbe,
      rowGeometry,
      candidates,
      styleProof,
    }));
  }
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && !['WIDTH_SECONDARY', 'MISSING_DOM_EVIDENCE'].includes(fixture.decision));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    smokePath: path.relative(process.cwd(), smokePath),
    scope: 'diagnostic-only Roll20 chat overflow/crop probe; no production CSS',
    summary: {
      status: actionable.length ? 'OVERFLOW_CROP_PROBE_ACTIONABLE' : 'OVERFLOW_CROP_PROBE_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-overflow-crop-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-overflow-crop-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT OVERFLOW CROP PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} tableDelta=${fmtPx(fixture.deltas.tableWidth)} overflowDelta=${fmtPx(fixture.deltas.tableOverflow)} tableToCropDelta=${fmtRatio(fixture.deltas.tableToCropRatio)} topOffset=${fmtPx(fixture.rowModel.maxAbsTopDelta)} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function summarizeFixture(fixtureId, reports) {
  const localTemplate = localTemplateFor(reports.smoke, fixtureId);
  const actualSidecar = await readOptionalJson(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const width = findFixture(reports.width?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsic?.fixtures, fixtureId);
  const tableProbe = findFixture(reports.tableProbe?.fixtures, fixtureId);
  const rowGeometry = findFixture(reports.rowGeometry?.fixtures, fixtureId);
  const local = summarizeGeometry(localTemplate);
  const actual = summarizeGeometry(actualTemplate);
  const deltas = {
    rootWidth: delta(actual.rootWidth, local.rootWidth),
    tableWidth: delta(actual.tableWidth, local.tableWidth),
    tableScrollWidth: delta(actual.tableScrollWidth, local.tableScrollWidth),
    tableClientWidth: delta(actual.tableClientWidth, local.tableClientWidth),
    tableOverflow: delta(actual.tableOverflow, local.tableOverflow),
    tableToCropRatio: delta(actual.tableToCropRatio, local.tableToCropRatio, 5),
    scrollToCropRatio: delta(actual.scrollToCropRatio, local.scrollToCropRatio, 5),
    rootHeight: delta(actual.rootHeight, local.rootHeight),
  };
  const candidateSignals = candidateSignalsFor(reports.candidates, reports.styleProof, fixtureId);
  const rowModel = {
    decision: rowGeometry?.rowModel?.decision ?? '',
    rowWidthDeltaSpread: numberOrNull(rowGeometry?.rowModel?.widthSpread ?? rowGeometry?.rowModel?.rowWidthDeltaSpread ?? intrinsic?.rowCellDeltas?.rowWidthDeltaSpread ?? tableProbe?.rowModel?.rowWidthDeltaSpread),
    maxAbsCellDelta: numberOrNull(rowGeometry?.rowModel?.maxAbsCellDelta ?? intrinsic?.rowCellDeltas?.maxAbsCellWidthDelta ?? tableProbe?.rowModel?.maxAbsCellDelta),
    maxAbsTopDelta: numberOrNull(rowGeometry?.rowModel?.maxAbsTopDelta ?? tableProbe?.rowModel?.maxAbsTopDelta),
  };
  const priority = priorityFor(parity);
  const decision = decide({
    priority,
    hasActual: Boolean(actualTemplate),
    hasLocal: Boolean(localTemplate),
    deltas,
    rowModel,
    widthDecision: width?.widthDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    tableProbeDecision: tableProbe?.probeDecision ?? '',
    candidateSignals,
  });
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    hasActualEvidence: Boolean(actualTemplate),
    hasLocalEvidence: Boolean(localTemplate),
    actual,
    local,
    deltas,
    rowModel,
    widthDecision: width?.widthDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    tableProbeDecision: tableProbe?.probeDecision ?? '',
    candidateSignals,
    evidence: evidenceNotes({ actual, local, deltas, rowModel, width, intrinsic, tableProbe, candidateSignals }),
  };
}

function localTemplateFor(smoke, fixtureId) {
  return (smoke?.fixtures ?? []).find((fixture) => fixture.id === fixtureId || fixture.fixtureId === fixtureId)?.cardInfo?.templateComputed ?? null;
}

function summarizeGeometry(template) {
  if (!template) return {};
  const children = new Map((template.computedChildren ?? []).map((child) => [child.selector, child]));
  const table = children.get('table') ?? template.tableStructure?.table ?? null;
  const rootWidth = numberOrNull(template.rect?.width ?? template.boxMetrics?.offsetWidth);
  const rootHeight = numberOrNull(template.rect?.height ?? template.boxMetrics?.offsetHeight);
  const tableWidth = numberOrNull(table?.rect?.width ?? table?.boxMetrics?.offsetWidth);
  const tableScrollWidth = numberOrNull(table?.boxMetrics?.scrollWidth);
  const tableClientWidth = numberOrNull(table?.boxMetrics?.clientWidth);
  const tableOverflow = tableScrollWidth != null && tableClientWidth != null ? round(tableScrollWidth - tableClientWidth) : null;
  const cropWidth = rootWidth;
  return {
    rootWidth,
    rootHeight,
    tableWidth,
    tableScrollWidth,
    tableClientWidth,
    tableOverflow,
    cropWidth,
    tableToCropRatio: ratio(tableWidth, cropWidth),
    scrollToCropRatio: ratio(tableScrollWidth, cropWidth),
    style: {
      rootOverflow: template.computedStyle?.overflow ?? null,
      tableWidth: table?.computedStyle?.width ?? null,
      tableLayout: table?.computedStyle?.tableLayout ?? null,
      borderSpacing: table?.computedStyle?.borderSpacing ?? null,
      overflowWrap: table?.computedStyle?.overflowWrap ?? null,
      transform: table?.computedStyle?.transform ?? null,
      filter: table?.computedStyle?.filter ?? null,
    },
  };
}

function candidateSignalsFor(candidateReport, styleProofReport, fixtureId) {
  const key = fixtureKeyForId(fixtureId);
  const styleProof = new Map((styleProofReport?.candidates ?? []).map((candidate) => [candidate.name, candidate.styleProofStatus ?? '']));
  const candidates = (candidateReport?.candidates ?? [])
    .filter((candidate) => candidate.status === 'OK' && candidate.name !== 'default')
    .map((candidate) => ({
      name: candidate.name,
      risk: candidate.promotionRisk ?? '',
      styleProof: styleProof.get(candidate.name) ?? '',
      deltaPct: numberOrNull(candidate.fixtureAlignedDeltaPct?.[key]),
      regressedFixtures: Number(candidate.regressedFixtures ?? 0),
      complexity: candidateComplexity(candidate.name),
    }))
    .filter((candidate) => candidate.deltaPct != null)
    .sort((a, b) => a.deltaPct - b.deltaPct || a.complexity - b.complexity || a.name.localeCompare(b.name));
  return {
    best: candidates[0] ?? null,
    rejectedOrNoGain: candidates
      .filter((candidate) => candidate.risk === 'reject-regresses-fixtures' || candidate.risk === 'no-meaningful-gain' || /CONTRADICT/i.test(candidate.styleProof))
      .map((candidate) => candidate.name),
    candidates,
  };
}

function decide(signals) {
  if (!signals.hasActual || !signals.hasLocal) return 'MISSING_DOM_EVIDENCE';
  if (signals.priority === 'P2' || Math.abs(signals.deltas.tableWidth ?? 0) < 2) return 'WIDTH_SECONDARY';
  if (signals.widthDecision === 'CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED' && Math.abs(signals.deltas.rootWidth ?? 0) >= 8) {
    return 'MESSAGE_WIDTH_MODEL';
  }

  const rootMatches = Math.abs(signals.deltas.rootWidth ?? 999) <= 1;
  const tableDrift = Math.abs(signals.deltas.tableWidth ?? 0) >= 8 || Math.abs(signals.deltas.tableScrollWidth ?? 0) >= 8;
  const overflowDrift = Math.abs(signals.deltas.tableOverflow ?? 0) >= 8 || Math.abs(signals.deltas.tableToCropRatio ?? 0) >= 0.025;
  const rowUniform = Math.abs(signals.rowModel.rowWidthDeltaSpread ?? 999) <= 1 && Math.abs(signals.rowModel.maxAbsCellDelta ?? 999) <= 2;
  const topOffset = Math.abs(signals.rowModel.maxAbsTopDelta ?? 0) >= 24;
  const rejectedCss = signals.tableProbeDecision === 'TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET' ||
    signals.intrinsicDecision === 'TABLE_SCROLL_INTRINSIC_MODEL_REQUIRED' ||
    signals.candidateSignals.rejectedOrNoGain.length >= 4;

  if (rootMatches && tableDrift && overflowDrift && rowUniform && topOffset && rejectedCss) {
    return 'TABLE_OVERFLOW_CROP_MODEL_REQUIRED';
  }
  if (rootMatches && tableDrift && overflowDrift && rowUniform) return 'TABLE_OVERFLOW_MODEL_REQUIRED';
  if (rootMatches && tableDrift && topOffset) return 'TABLE_INTRINSIC_PLUS_CROP_OFFSET';
  if (rootMatches && tableDrift) return 'TABLE_INTRINSIC_MODEL_REQUIRED';
  return 'MIXED_WIDTH_CROP_MODEL';
}

function nextAction(decision) {
  switch (decision) {
    case 'TABLE_OVERFLOW_CROP_MODEL_REQUIRED':
      return 'build a CoC/YSHY-scoped overflow/crop candidate from actual table scroll/client width and rolltemplate crop origin; do not promote paint filters or broad typography';
    case 'TABLE_OVERFLOW_MODEL_REQUIRED':
      return 'model table overflow/client width first, then rerun pixel diff before crop-origin work';
    case 'TABLE_INTRINSIC_PLUS_CROP_OFFSET':
      return 'test intrinsic table sizing and crop-origin as separate diagnostic candidates before combining them';
    case 'TABLE_INTRINSIC_MODEL_REQUIRED':
      return 'build a narrow intrinsic table sizing candidate backed by actual style proof';
    case 'MESSAGE_WIDTH_MODEL':
      return 'resolve message/content width before table overflow tuning';
    case 'MIXED_WIDTH_CROP_MODEL':
      return 'separate root width, table width, and crop-origin evidence before another CSS candidate';
    case 'MISSING_DOM_EVIDENCE':
      return 'recapture local smoke and actual Roll20 chat DOM sidecars';
    default:
      return 'keep overflow/crop as secondary evidence';
  }
}

function evidenceNotes({ actual, local, deltas, rowModel, width, intrinsic, tableProbe, candidateSignals }) {
  const notes = [];
  notes.push(`actual/local table widths ${fmtPx(actual.tableWidth)} / ${fmtPx(local.tableWidth)}; delta ${fmtPx(deltas.tableWidth)}`);
  notes.push(`actual/local table overflow ${fmtPx(actual.tableOverflow)} / ${fmtPx(local.tableOverflow)}; delta ${fmtPx(deltas.tableOverflow)}`);
  notes.push(`actual/local table-to-crop ratio ${fmtRatio(actual.tableToCropRatio)} / ${fmtRatio(local.tableToCropRatio)}; delta ${fmtRatio(deltas.tableToCropRatio)}`);
  notes.push(`root width delta ${fmtPx(deltas.rootWidth)}, table scrollWidth delta ${fmtPx(deltas.tableScrollWidth)}`);
  if (Math.abs(rowModel.maxAbsTopDelta ?? 0) >= 24) notes.push(`uniform top offset ${fmtPx(rowModel.maxAbsTopDelta)}`);
  if (rowModel.rowWidthDeltaSpread != null) notes.push(`row spread ${fmtPx(rowModel.rowWidthDeltaSpread)}, max cell delta ${fmtPx(rowModel.maxAbsCellDelta)}`);
  if (width?.widthDecision) notes.push(`width decision ${width.widthDecision}`);
  if (intrinsic?.intrinsicDecision) notes.push(`intrinsic decision ${intrinsic.intrinsicDecision}`);
  if (tableProbe?.probeDecision) notes.push(`table intrinsic probe ${tableProbe.probeDecision}`);
  if (candidateSignals.best?.name) notes.push(`best current candidate ${candidateSignals.best.name} (${candidateSignals.best.deltaPct}%)`);
  if (candidateSignals.rejectedOrNoGain.length) notes.push(`rejected/no-gain/style-contradicted candidates: ${candidateSignals.rejectedOrNoGain.slice(0, 10).join(', ')}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Overflow/Crop Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Smoke: \`${report.smokePath}\``,
    '',
    'Scope: diagnostic-only. This report compares local ChatPane overflow/crop geometry with actual Roll20 chat DOM sidecars and does not enable production CSS.',
    '',
    '| Fixture | Priority | Decision | Mismatch | Root delta | Table delta | Scroll delta | Overflow delta | Table/crop delta | Top offset | Best candidate | Next action |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.alignedMismatchPct} | ${fmtPx(fixture.deltas.rootWidth)} | ${fmtPx(fixture.deltas.tableWidth)} | ${fmtPx(fixture.deltas.tableScrollWidth)} | ${fmtPx(fixture.deltas.tableOverflow)} | ${fmtRatio(fixture.deltas.tableToCropRatio)} | ${fmtPx(fixture.rowModel.maxAbsTopDelta)} | ${fixture.candidateSignals.best?.name ?? 'none'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- This report routes renderer experiments only; it is not a Roll20 parity pass.');
  lines.push('- Keep generated screenshots, sidecars, and private fixture data local-only.');
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

function candidateComplexity(name) {
  return String(name ?? '')
    .split('-')
    .filter((part) => ['actual', 'width', 'overflow', 'crop', 'origin', 'scale', 'typography', 'metrics', 'shadow', 'background'].includes(part)).length;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function delta(actual, local, digits = 3) {
  const a = numberOrNull(actual);
  const l = numberOrNull(local);
  return a != null && l != null ? round(a - l, digits) : null;
}

function ratio(numerator, denominator) {
  const n = numberOrNull(numerator);
  const d = numberOrNull(denominator);
  return n != null && d != null && d !== 0 ? round(n / d, 5) : null;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function fmtPx(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${Number(value.toFixed(3))}px` : 'n/a';
}

function fmtRatio(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value > 0 ? '+' : ''}${Number(value.toFixed(5))}` : 'n/a';
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

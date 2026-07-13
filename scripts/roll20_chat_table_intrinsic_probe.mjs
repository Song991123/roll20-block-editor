#!/usr/bin/env node
/**
 * Compare local ChatPane table intrinsic geometry against actual Roll20 DOM
 * sidecars. Diagnostic only: this script routes the next renderer experiment
 * and must not be interpreted as visual parity or production CSS approval.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set(['--out-dir']);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const smokePath = path.resolve(args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const rawOutDir = readOption('--out-dir', '');
const outDir = path.resolve(rawOutDir || path.join(runDir, 'chat-table-intrinsic-probe'));

async function main() {
  const smoke = await readOptionalJson(smokePath);
  const rowGeometry = await readOptionalJson(path.join(runDir, 'chat-row-geometry', 'chat-row-geometry-results.json'));
  const intrinsic = await readOptionalJson(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const budget = await readOptionalJson(path.join(runDir, 'chat-table-width-budget', 'chat-table-width-budget-results.json'));
  const candidates = await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));

  const fixtureIds = collectFixtureIds(smoke, parity, rowGeometry, intrinsic, budget);
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await summarizeFixture(fixtureId, {
      smoke,
      rowGeometry,
      intrinsic,
      budget,
      candidates,
      parity,
    }));
  }
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.probeDecision !== 'WIDTH_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    smokePath: path.relative(process.cwd(), smokePath),
    output: {
      requestedOutDir: rawOutDir || null,
      outDir: path.relative(process.cwd(), outDir),
      fallbackReason: '',
    },
    scope: 'diagnostic-only Roll20 chat table intrinsic probe; no production CSS',
    summary: {
      status: actionable.length ? 'TABLE_INTRINSIC_PROBE_ACTIONABLE' : 'TABLE_INTRINSIC_PROBE_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.probeDecision)),
      productionSafe: false,
    },
    fixtures,
  };

  const writeResult = await writeIntrinsicProbeReport(report, outDir, runDir);

  console.log(`ROLL20 CHAT TABLE INTRINSIC PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.probeDecision} tableDelta=${fmtPx(fixture.deltas.tableWidth)} rowSpread=${fmtPx(fixture.rowModel.rowWidthDeltaSpread)} maxCell=${fmtPx(fixture.rowModel.maxAbsCellDelta)} topOffset=${fmtPx(fixture.rowModel.maxAbsTopDelta)} next=${fixture.nextAction}`);
  }
  if (writeResult.fallbackReason) {
    console.log(`WARNING report write fallback: ${writeResult.fallbackReason}`);
  }
  console.log(`out=${path.relative(process.cwd(), writeResult.outDir)}`);
}

async function writeIntrinsicProbeReport(report, requestedOutDir, runDir) {
  const writeTo = async (targetDir, fallbackReason = '') => {
    report.output = {
      requestedOutDir: rawOutDir || null,
      outDir: path.relative(process.cwd(), targetDir),
      fallbackReason,
    };
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, 'chat-table-intrinsic-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(path.join(targetDir, 'chat-table-intrinsic-probe-results.md'), renderMarkdown(report), 'utf8');
    return { outDir: targetDir, fallbackReason };
  };

  try {
    return await writeTo(requestedOutDir);
  } catch (error) {
    if (rawOutDir || !isAccessError(error)) throw error;
    const fallbackDir = path.resolve(
      '..',
      '_tmp_codex_smoke',
      `chat-table-intrinsic-probe-${safePathLabel(path.basename(runDir))}-${Date.now()}`,
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

async function summarizeFixture(fixtureId, reports) {
  const localTemplate = localTemplateFor(reports.smoke, fixtureId);
  const actualSidecar = await readOptionalJson(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  const row = findFixture(reports.rowGeometry?.fixtures, fixtureId);
  const intrinsic = findFixture(reports.intrinsic?.fixtures, fixtureId);
  const budget = findFixture(reports.budget?.fixtures, fixtureId);
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const localNodes = summarizeNodes(localTemplate);
  const actualNodes = summarizeNodes(actualTemplate);
  const deltas = {
    rootWidth: delta(actualNodes.root?.width, localNodes.root?.width),
    tableWidth: delta(actualNodes.table?.width, localNodes.table?.width),
    tableScrollWidth: delta(actualNodes.table?.scrollWidth, localNodes.table?.scrollWidth),
    captionWidth: delta(actualNodes.caption?.width, localNodes.caption?.width),
    firstCellWidth: delta(actualNodes.firstCell?.width, localNodes.firstCell?.width),
  };
  const styleDeltas = compareStyles(localNodes, actualNodes);
  const rowModel = {
    decision: row?.rowModel?.decision ?? '',
    rowWidthDeltaSpread: numberOrNull(row?.rowModel?.widthSpread ?? row?.rowModel?.rowWidthDeltaSpread ?? intrinsic?.rowCellDeltas?.rowWidthDeltaSpread),
    maxAbsCellDelta: numberOrNull(row?.rowModel?.maxAbsCellDelta ?? intrinsic?.rowCellDeltas?.maxAbsCellWidthDelta),
    maxAbsTopDelta: numberOrNull(row?.rowModel?.maxAbsTopDelta),
    stableHeights: Boolean(row?.rowModel?.stableHeights),
    uniformWidthDelta: Boolean(row?.rowModel?.uniformWidthDelta),
  };
  const candidateSignals = candidateSignalsFor(reports.candidates, fixtureId);
  const priority = priorityFor(parity);
  const probeDecision = decideProbe({
    priority,
    deltas,
    rowModel,
    styleDeltas,
    budgetDecision: budget?.budgetDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    candidateSignals,
    hasActual: Boolean(actualTemplate),
    hasLocal: Boolean(localTemplate),
  });
  return {
    fixtureId,
    priority,
    probeDecision,
    nextAction: nextAction(probeDecision),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    hasActualEvidence: Boolean(actualTemplate),
    hasLocalEvidence: Boolean(localTemplate),
    deltas,
    rowModel,
    styleDeltas,
    candidateSignals,
    budgetDecision: budget?.budgetDecision ?? '',
    intrinsicDecision: intrinsic?.intrinsicDecision ?? '',
    local: localNodes,
    actual: actualNodes,
    evidence: evidenceNotes({ deltas, rowModel, styleDeltas, candidateSignals, budget }),
  };
}

function localTemplateFor(smoke, fixtureId) {
  return (smoke?.fixtures ?? []).find((fixture) => fixture.id === fixtureId || fixture.fixtureId === fixtureId)?.cardInfo?.templateComputed ?? null;
}

function summarizeNodes(template) {
  if (!template) return {};
  const children = new Map((template.computedChildren ?? []).map((child) => [child.selector, child]));
  const table = children.get('table') ?? template.tableStructure?.table ?? null;
  const caption = children.get('caption') ?? null;
  const firstCell = children.get('td:first') ?? children.get('sheet-template_label:first') ?? null;
  return {
    root: summarizeNode(template),
    table: summarizeNode(table),
    caption: summarizeNode(caption),
    firstCell: summarizeNode(firstCell),
  };
}

function summarizeNode(node) {
  if (!node) return null;
  return {
    width: numberOrNull(node.rect?.width ?? node.boxMetrics?.offsetWidth),
    height: numberOrNull(node.rect?.height ?? node.boxMetrics?.offsetHeight),
    scrollWidth: numberOrNull(node.boxMetrics?.scrollWidth),
    clientWidth: numberOrNull(node.boxMetrics?.clientWidth),
    offsetWidth: numberOrNull(node.boxMetrics?.offsetWidth),
    style: pickStyle(node.computedStyle ?? {}),
  };
}

function pickStyle(style) {
  const keys = [
    'display',
    'boxSizing',
    'width',
    'fontFamily',
    'fontSize',
    'lineHeight',
    'letterSpacing',
    'overflowWrap',
    'wordBreak',
    'whiteSpace',
    'borderCollapse',
    'borderSpacing',
    'tableLayout',
    'textRendering',
    'webkitFontSmoothing',
    'textShadow',
    'transform',
  ];
  return Object.fromEntries(keys.map((key) => [key, style[key] ?? null]));
}

function compareStyles(localNodes, actualNodes) {
  const out = {};
  for (const nodeKey of ['root', 'table', 'caption', 'firstCell']) {
    const local = localNodes[nodeKey]?.style ?? {};
    const actual = actualNodes[nodeKey]?.style ?? {};
    const changes = {};
    for (const key of Object.keys({ ...local, ...actual })) {
      if (String(local[key] ?? '') !== String(actual[key] ?? '')) {
        changes[key] = { local: local[key] ?? null, actual: actual[key] ?? null };
      }
    }
    out[nodeKey] = changes;
  }
  return out;
}

function candidateSignalsFor(candidateReport, fixtureId) {
  const key = fixtureKeyForId(fixtureId);
  const candidates = (candidateReport?.candidates ?? [])
    .filter((candidate) => candidate.status === 'OK' && candidate.name !== 'default')
    .map((candidate) => ({
      name: candidate.name,
      risk: candidate.promotionRisk ?? '',
      deltaPct: numberOrNull(candidate.fixtureAlignedDeltaPct?.[key]),
      regressedFixtures: Number(candidate.regressedFixtures ?? 0),
      complexity: candidateComplexity(candidate.name),
    }))
    .filter((candidate) => candidate.deltaPct != null)
    .sort((a, b) => a.deltaPct - b.deltaPct || a.complexity - b.complexity || a.name.localeCompare(b.name));
  return {
    best: candidates[0] ?? null,
    rejectedOrNoGain: candidates.filter((candidate) => candidate.risk === 'reject-regresses-fixtures' || candidate.risk === 'no-meaningful-gain').map((candidate) => candidate.name),
    candidates,
  };
}

function candidateComplexity(name) {
  return String(name ?? '')
    .split('-')
    .filter((part) => ['actual', 'width', 'dim', 'background', 'crop', 'origin', 'scale', 'typography', 'metrics', 'shadow'].includes(part)).length;
}

function decideProbe(signals) {
  if (!signals.hasActual || !signals.hasLocal) return 'MISSING_DOM_EVIDENCE';
  if (signals.priority === 'P2' || Math.abs(signals.deltas.tableWidth ?? 0) < 2) return 'WIDTH_SECONDARY';
  const tableDeltaAbs = Math.abs(signals.deltas.tableWidth ?? 0);
  const rootDeltaAbs = Math.abs(signals.deltas.rootWidth ?? 0);
  const tableWide =
    tableDeltaAbs >= 8 &&
    Math.abs(signals.rowModel.rowWidthDeltaSpread ?? 999) <= 1 &&
    Math.abs(signals.rowModel.maxAbsCellDelta ?? 999) <= 2;
  const rootMatches =
    rootDeltaAbs <= 4 ||
    (tableDeltaAbs >= 8 && rootDeltaAbs / tableDeltaAbs <= 0.08);
  const topOffset = Math.abs(signals.rowModel.maxAbsTopDelta ?? 0) >= 24;
  const rejectedCss = signals.budgetDecision === 'LAYOUT_CONSTRAINT_AFTER_REJECTED_CSS' ||
    signals.candidateSignals.rejectedOrNoGain.length >= 4;
  if (tableWide && rootMatches && topOffset && rejectedCss) return 'TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET';
  if (tableWide && rootMatches && rejectedCss) return 'TABLE_WIDE_INTRINSIC_AFTER_REJECTED_CSS';
  if (tableWide && rootMatches) return 'TABLE_WIDE_INTRINSIC_PROBE';
  if (!rootMatches) return 'ROOT_OR_MESSAGE_WIDTH_CONTEXT';
  return 'NARROW_TABLE_MODEL_REQUIRED';
}

function nextAction(decision) {
  switch (decision) {
    case 'TABLE_WIDE_INTRINSIC_WITH_CROP_OFFSET':
      return 'build the next YSHY/CoC probe around table intrinsic width plus rolltemplate crop/top-origin context; do not use transform, global font, or spacing bundles';
    case 'TABLE_WIDE_INTRINSIC_AFTER_REJECTED_CSS':
      return 'test a narrow table intrinsic/caption width model that is scoped to the rolltemplate structure and backed by actual style proof';
    case 'TABLE_WIDE_INTRINSIC_PROBE':
      return 'compare table/caption intrinsic width calculation before any paint or typography patch';
    case 'ROOT_OR_MESSAGE_WIDTH_CONTEXT':
      return 'resolve root/message width context first; table intrinsic evidence is confounded';
    case 'MISSING_DOM_EVIDENCE':
      return 'recapture local smoke and actual Roll20 chat DOM sidecar before renderer work';
    case 'NARROW_TABLE_MODEL_REQUIRED':
      return 'create a narrower table-layout candidate and run smoke/candidate/style-proof/gate';
    default:
      return 'keep table intrinsic width as secondary evidence';
  }
}

function evidenceNotes({ deltas, rowModel, styleDeltas, candidateSignals, budget }) {
  const notes = [];
  notes.push(`root width delta ${fmtPx(deltas.rootWidth)}`);
  notes.push(`table width delta ${fmtPx(deltas.tableWidth)}`);
  notes.push(`table scrollWidth delta ${fmtPx(deltas.tableScrollWidth)}`);
  notes.push(`caption width delta ${fmtPx(deltas.captionWidth)}`);
  notes.push(`first cell width delta ${fmtPx(deltas.firstCellWidth)}`);
  notes.push(`row spread ${fmtPx(rowModel.rowWidthDeltaSpread)}`);
  notes.push(`max cell delta ${fmtPx(rowModel.maxAbsCellDelta)}`);
  if (Math.abs(rowModel.maxAbsTopDelta ?? 0) >= 24) notes.push(`uniform top offset ${fmtPx(rowModel.maxAbsTopDelta)}`);
  if (budget?.budgetDecision) notes.push(`budget decision ${budget.budgetDecision}`);
  const tableStyleKeys = Object.keys(styleDeltas.table ?? {});
  if (tableStyleKeys.length) notes.push(`table style differs: ${tableStyleKeys.join(', ')}`);
  if (candidateSignals.best?.name) notes.push(`best current candidate ${candidateSignals.best.name} (${candidateSignals.best.deltaPct}%)`);
  if (candidateSignals.rejectedOrNoGain.length) notes.push(`rejected/no-gain candidates: ${candidateSignals.rejectedOrNoGain.slice(0, 8).join(', ')}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Table Intrinsic Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Smoke: \`${report.smokePath}\``,
    '',
    'Scope: diagnostic-only. This report compares local ChatPane DOM metrics with actual Roll20 chat DOM sidecars and does not enable production CSS.',
    '',
    '| Fixture | Priority | Decision | Mismatch | Root delta | Table delta | Scroll delta | Caption delta | First cell delta | Row spread | Max cell | Top offset | Best candidate | Next action |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.probeDecision} | ${fixture.alignedMismatchPct} | ${fmtPx(fixture.deltas.rootWidth)} | ${fmtPx(fixture.deltas.tableWidth)} | ${fmtPx(fixture.deltas.tableScrollWidth)} | ${fmtPx(fixture.deltas.captionWidth)} | ${fmtPx(fixture.deltas.firstCellWidth)} | ${fmtPx(fixture.rowModel.rowWidthDeltaSpread)} | ${fmtPx(fixture.rowModel.maxAbsCellDelta)} | ${fmtPx(fixture.rowModel.maxAbsTopDelta)} | ${fixture.candidateSignals.best?.name ?? 'none'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- A probe decision is a route to the next experiment, not a visual parity pass.');
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

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function delta(actual, local) {
  const a = numberOrNull(actual);
  const l = numberOrNull(local);
  return a != null && l != null ? Number((a - l).toFixed(3)) : null;
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

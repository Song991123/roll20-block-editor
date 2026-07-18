#!/usr/bin/env node
/**
 * Gate Roll20 chat renderer work on template-scoped evidence.
 *
 * This is a diagnostic safety gate. It does not promote CSS. It prevents a
 * global ChatPane renderer patch when high-mismatch fixtures point at different
 * width/layout models or when the best candidates are not broadly safe.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = args.includes('--self-test');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--targeted-plan-dir',
  '--width-reconciliation-dir',
  '--policy-dir',
  '--candidate-comparison-dir',
  '--style-proof-dir',
  '--asset-plan-dir',
  '--row-raster-candidates-dir',
  '--cell-allocation-dir',
  '--source-context-dir',
  '--source-intrinsic-dir',
]);
const runDirArg = firstPositionalArg() ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-template-scope-gate');
const reportOverrides = {
  plan: readOption('--targeted-plan-dir', ''),
  reconciliation: readOption('--width-reconciliation-dir', ''),
  policy: readOption('--policy-dir', ''),
  candidates: readOption('--candidate-comparison-dir', ''),
  styleProof: readOption('--style-proof-dir', ''),
  assetPlan: readOption('--asset-plan-dir', ''),
  rowRasterCandidates: readOption('--row-raster-candidates-dir', ''),
  cellAllocation: readOption('--cell-allocation-dir', ''),
  sourceContext: readOption('--source-context-dir', ''),
  sourceIntrinsic: readOption('--source-intrinsic-dir', ''),
};

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function firstPositionalArg() {
  return args.find((arg, index) => !arg.startsWith('--') && arg !== '--self-test' && !optionNamesWithValues.has(args[index - 1]));
}

async function main() {
  await resolveImplicitReportOverrides();
  const reports = {
    plan: await readReportJson('chat-targeted-renderer-plan', 'chat-targeted-renderer-plan-results.json', reportOverrides.plan),
    reconciliation: await readReportJson('chat-width-reconciliation', 'chat-width-reconciliation-results.json', reportOverrides.reconciliation),
    policy: await readReportJson('chat-renderer-policy', 'chat-renderer-policy-results.json', reportOverrides.policy),
    candidates: await readReportJson('chat-candidate-comparison', 'chat-candidate-comparison-results.json', reportOverrides.candidates),
    styleProof: await readReportJson('chat-candidate-style-proof', 'chat-candidate-style-proof-results.json', reportOverrides.styleProof),
    assetPlan: await readReportJson('chat-asset-preservation-plan', 'chat-asset-preservation-plan-results.json', reportOverrides.assetPlan),
    rowRasterCandidates: await readReportJson('chat-row-raster-candidate-comparison', 'chat-row-raster-candidate-comparison-results.json', reportOverrides.rowRasterCandidates),
    cellAllocation: await readReportJson('chat-cell-allocation-probe', 'chat-cell-allocation-probe-results.json', reportOverrides.cellAllocation),
    sourceContext: await readReportJson('chat-source-context-probe', 'chat-source-context-probe-results.json', reportOverrides.sourceContext),
    sourceIntrinsic: await readReportJson('chat-source-intrinsic-matrix', 'chat-source-intrinsic-matrix-results.json', reportOverrides.sourceIntrinsic),
  };
  const report = buildReport(runDirArg, reports, normalizeReportOverrides(reportOverrides));

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-template-scope-gate-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-template-scope-gate-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT TEMPLATE SCOPE GATE action=${report.action} blockers=${report.blockers.length}`);
  for (const fixture of report.fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} scope=${fixture.requiredScope} model=${fixture.requiredModel} mismatch=${fixture.alignedMismatchPct} best=${fixture.bestCandidate?.name ?? 'none'} risk=${fixture.bestCandidate?.risk ?? 'none'}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function resolveImplicitReportOverrides() {
  if (!reportOverrides.cellAllocation && !(await defaultReportExists('chat-cell-allocation-probe', 'chat-cell-allocation-probe-results.json'))) {
    reportOverrides.cellAllocation = await findLatestFallbackReportDir(
      ['chat-cell-allocation-probe'],
      'chat-cell-allocation-probe-results.json',
    );
  }
  if (!reportOverrides.sourceContext && !(await defaultReportExists('chat-source-context-probe', 'chat-source-context-probe-results.json'))) {
    reportOverrides.sourceContext = await findLatestFallbackReportDir(
      ['chat-source-context-probe', 'chat-source-context'],
      'chat-source-context-probe-results.json',
    );
  }
  if (!reportOverrides.sourceIntrinsic && !(await defaultReportExists('chat-source-intrinsic-matrix', 'chat-source-intrinsic-matrix-results.json'))) {
    reportOverrides.sourceIntrinsic = await findLatestFallbackReportDir(
      ['chat-source-intrinsic-matrix', 'chat-source-intrinsic'],
      'chat-source-intrinsic-matrix-results.json',
    );
  }
}

function buildReport(runDirLabel, reports, overrides = {}) {
  const fixtureIds = collectFixtureIds(reports.plan, reports.reconciliation);
  const candidatesByFixture = bestCandidatesByFixture(reports.candidates, reports.styleProof);
  const fixtures = fixtureIds.map((fixtureId) => {
    const plan = findFixture(reports.plan?.fixtures, fixtureId);
    const reconciliation = findFixture(reports.reconciliation?.fixtures, fixtureId);
    const assetPlan = findFixture(reports.assetPlan?.fixtures, fixtureId);
    const bestCandidate = candidatesByFixture.get(fixtureKeyForId(fixtureId)) ?? null;
    const rowRasterCandidate = findCandidate(reports.rowRasterCandidates?.candidates, bestCandidate?.name);
    const rowRasterSummary = summarizeRowRasterCandidate(rowRasterCandidate, fixtureId);
    const cellAllocation = summarizeCellAllocation(reports.cellAllocation, fixtureId, bestCandidate?.name);
    const strategy = plan?.strategy ?? '';
    const nextExperiment = reconciliation?.nextExperiment ?? '';
    const requiredModel = requiredModelFor(strategy, nextExperiment);
    const alignedMismatch = numberOrNull(plan?.alignedMismatchRatio ?? reconciliation?.alignedMismatchRatio);
    const assetBlocksPromotion = assetPlan?.rendererPolicy === 'DO_NOT_PROMOTE_CSS' || assetPlan?.decision === 'SOURCE_ASSET_LOST_RELINK_REQUIRED';
    const rowRasterBlocksPromotion = rowRasterSummary.risk.includes('reject');
    const cellAllocationBlocksPromotion = Boolean(cellAllocation.bestCandidateScenario?.productionBlocker);
    const fixturePriority = plan?.priority ?? reconciliation?.priority ?? priorityFor(alignedMismatch);
    const sourceContext = summarizeSourceContext(reports.sourceContext, fixtureId);
    const sourceIntrinsic = summarizeSourceIntrinsic(reports.sourceIntrinsic, fixtureId);
    const sourceContextBlocksPromotion = sourceContextBlocks(sourceContext, fixturePriority);
    const sourceIntrinsicBlocksPromotion = sourceIntrinsicBlocks(sourceIntrinsic, fixturePriority);
    return {
      fixtureId,
      priority: fixturePriority,
      alignedMismatchRatio: alignedMismatch,
      alignedMismatchPct: pct(alignedMismatch),
      strategy,
      nextExperiment,
      requiredScope: requiredScopeFor(fixtureId, strategy, nextExperiment),
      requiredModel,
      tableWidthDelta: numberOrNull(reconciliation?.signals?.tableWidthDelta),
      tableTextResidual: numberOrNull(reconciliation?.signals?.tableTextResidual),
      tableScrollWidthDelta: numberOrNull(reconciliation?.signals?.tableScrollWidthDelta),
      bestCandidate,
      assetDecision: assetPlan?.decision ?? '',
      assetRendererPolicy: assetPlan?.rendererPolicy ?? '',
      assetBlockers: assetPlan?.blockers ?? [],
      assetBlocksPromotion,
      rowRaster: rowRasterSummary,
      rowRasterBlocksPromotion,
      cellAllocation,
      cellAllocationBlocksPromotion,
      sourceContext,
      sourceContextBlocksPromotion,
      sourceIntrinsic,
      sourceIntrinsicBlocksPromotion,
      requiredProofChecklist: plan?.requiredProofChecklist ?? proofChecklistForModel(requiredModel),
      promotionReady: isFixturePromotionReady(bestCandidate, { assetBlocksPromotion, rowRasterBlocksPromotion, cellAllocationBlocksPromotion, sourceContextBlocksPromotion, sourceIntrinsicBlocksPromotion }),
      nextAction: nextActionFor(fixtureId, requiredModel, sourceContext, sourceIntrinsic),
    };
  });
  const highMismatch = fixtures.filter((fixture) => fixture.priority === 'P0');
  const highModels = new Set(highMismatch.map((fixture) => fixture.requiredModel).filter(Boolean));
  const highScopes = new Set(highMismatch.map((fixture) => fixture.requiredScope).filter(Boolean));
  const unsafeCandidates = fixtures
    .filter((fixture) => fixture.priority === 'P0' && !fixture.promotionReady)
    .map((fixture) => `${fixture.fixtureId}: ${fixture.bestCandidate?.name ?? 'none'} is not promotion-ready (${promotionHoldReason(fixture)})`);
  const assetBlockers = highMismatch
    .filter((fixture) => fixture.assetBlocksPromotion)
    .flatMap((fixture) => (fixture.assetBlockers.length ? fixture.assetBlockers : ['asset preservation policy holds renderer CSS']).map((blocker) => `${fixture.fixtureId}: ${blocker}`));
  const rowRasterBlockers = highMismatch
    .filter((fixture) => fixture.rowRasterBlocksPromotion)
    .map((fixture) => `${fixture.fixtureId}: ${fixture.bestCandidate?.name ?? 'none'} row-raster risk=${fixture.rowRaster.risk}; weighted delta=${fmtSignedPct(fixture.rowRaster.weightedDeltaPct)}, worst-row delta=${fmtSignedPct(fixture.rowRaster.worstRowDeltaPct)}`);
  const cellAllocationBlockers = highMismatch
    .flatMap((fixture) => fixture.cellAllocation.rejectedScenarios.map((scenario) =>
      `${fixture.fixtureId}: ${scenario.scenario} cell allocation rejected (${scenario.allocationDecision}; table delta=${fmtPx(scenario.tableDelta)}, max text-cell delta=${fmtPx(scenario.maxAbsTextCellWidthDelta)}, max ratio delta=${fmtSignedPct(scenario.maxAbsCellRatioDeltaPct)})`,
    ));
  const sourceContextBlockers = highMismatch
    .filter((fixture) => fixture.sourceContextBlocksPromotion)
    .map((fixture) => `${fixture.fixtureId}: source/context gate requires ${fixture.sourceContext.decision} before scoped renderer promotion (${sourceContextHoldReason(fixture.sourceContext)})`);
  const sourceIntrinsicBlockers = highMismatch
    .filter((fixture) => fixture.sourceIntrinsicBlocksPromotion)
    .map((fixture) => `${fixture.fixtureId}: source/intrinsic matrix requires ${fixture.sourceIntrinsic.decision} before scoped renderer promotion (${sourceIntrinsicHoldReason(fixture.sourceIntrinsic)})`);
  const blockers = [];
  if (highModels.size > 1) blockers.push(`high-mismatch fixtures require split renderer models: ${[...highModels].join(', ')}`);
  if (highScopes.size > 1) blockers.push(`high-mismatch fixtures require template-scoped rules: ${[...highScopes].join(', ')}`);
  blockers.push(...unsafeCandidates);
  blockers.push(...assetBlockers);
  blockers.push(...rowRasterBlockers);
  blockers.push(...cellAllocationBlockers);
  blockers.push(...sourceContextBlockers);
  blockers.push(...sourceIntrinsicBlockers);
  if (reports.policy?.summary?.globalSafeCandidates === 0 || reports.policy?.summary?.globalSafeCandidates === '0') {
    blockers.push('chat renderer policy reports no global-safe candidates');
  }
  const action = blockers.length ? 'HOLD_GLOBAL_CHAT_RENDERER_PATCH' : 'ALLOW_SCOPED_REVIEW';
  return {
    generatedAt: new Date().toISOString(),
    runDir: runDirLabel,
    reportOverrides: overrides,
    scope: 'diagnostic-only template scope gate; no production CSS',
    action,
    summary: {
      fixtures: fixtures.length,
      highMismatch: highMismatch.length,
      highModels: [...highModels],
      highScopes: [...highScopes],
      blockers: blockers.length,
      promotionReadyFixtures: fixtures.filter((fixture) => fixture.promotionReady).length,
      assetBlockedFixtures: fixtures.filter((fixture) => fixture.assetBlocksPromotion).length,
      rowRasterBlockedFixtures: fixtures.filter((fixture) => fixture.rowRasterBlocksPromotion).length,
      cellAllocationBlockedFixtures: fixtures.filter((fixture) => fixture.cellAllocationBlocksPromotion || fixture.cellAllocation.rejectedScenarios.length).length,
      sourceContextBlockedFixtures: fixtures.filter((fixture) => fixture.sourceContextBlocksPromotion).length,
      sourceIntrinsicBlockedFixtures: fixtures.filter((fixture) => fixture.sourceIntrinsicBlocksPromotion).length,
    },
    fixtures,
    blockers,
  };
}

function requiredModelFor(strategy, nextExperiment) {
  if (strategy === 'AW2E_TEMPLATE_SCOPED_TEXT_METRICS' || nextExperiment === 'CHAT_MESSAGE_CONTENT_WIDTH' || nextExperiment === 'TEXT_METRIC_ALLOCATION') {
    return 'MESSAGE_CONTENT_TEXT_METRICS';
  }
  if (strategy === 'COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL' || nextExperiment === 'TABLE_SCROLL_INTRINSIC') {
    return 'TABLE_INTRINSIC_SANITIZE_FONT';
  }
  if (strategy === 'KEEP_DEFAULT' || nextExperiment === 'KEEP_DEFAULT') return 'KEEP_DEFAULT';
  return 'NEW_NARROW_MODEL';
}

function requiredScopeFor(fixtureId, strategy, nextExperiment) {
  if (fixtureId === 'official-roll20-AW2E' || strategy.includes('AW2E') || nextExperiment === 'CHAT_MESSAGE_CONTENT_WIDTH') {
    return '.sheet-rolltemplate-aw';
  }
  if (fixtureId === 'yshy-commission-1bu' || strategy.includes('COC') || nextExperiment === 'TABLE_SCROLL_INTRINSIC') {
    return '.sheet-rolltemplate-coc';
  }
  if (strategy === 'KEEP_DEFAULT' || nextExperiment === 'KEEP_DEFAULT') return 'default';
  return 'template-specific';
}

function proofChecklistForModel(requiredModel) {
  if (requiredModel === 'MESSAGE_CONTENT_TEXT_METRICS') {
    return [
      'asset-relink-or-explicit-placeholder-acceptance',
      'style-proof:.sheet-rolltemplate-aw',
      'message-content-width-sidecar',
      'exact-text-measurement-sidecar',
      'source-intrinsic-matrix-promotion-blocker-cleared',
      'no-les-yshy-regression',
      'row-raster-and-background-nonregression',
    ];
  }
  if (requiredModel === 'TABLE_INTRINSIC_SANITIZE_FONT') {
    return [
      'asset-relink-or-explicit-placeholder-acceptance',
      'style-proof:.sheet-rolltemplate-coc',
      'scrollwidth-clientwidth-table-intrinsic-sidecar',
      'font-face-rule-order-sanitize-source-context',
      'source-intrinsic-matrix-promotion-blocker-cleared',
      'no-aw2e-les-regression',
      'row-raster-and-background-nonregression',
    ];
  }
  if (requiredModel === 'NEW_NARROW_MODEL') {
    return [
      'template-scope-identified',
      'actual-roll20-style-proof',
      'same-template-pixel-gain',
      'cross-fixture-nonregression',
    ];
  }
  return [];
}

function isFixturePromotionReady(candidate, guards = {}) {
  return Boolean(
    candidate &&
      candidate.deltaPct <= -0.5 &&
      candidate.regressedFixtures === 0 &&
      !['REJECT_STYLE_CONTRADICTION', 'NOT_STYLE_PROVEN'].includes(candidate.styleProofStatus) &&
      !String(candidate.risk ?? '').includes('reject') &&
      !guards.assetBlocksPromotion &&
      !guards.rowRasterBlocksPromotion &&
      !guards.cellAllocationBlocksPromotion &&
      !guards.sourceContextBlocksPromotion &&
      !guards.sourceIntrinsicBlocksPromotion
  );
}

function nextActionFor(fixtureId, requiredModel, sourceContext = null, sourceIntrinsic = null) {
  if (sourceIntrinsic?.decision === 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED') {
    return 'Build a CoC/YSHY scoped source/intrinsic model that proves Roll20 sanitize/rule order, table auto-layout intrinsic sizing, and crop/top-origin together before CSS review.';
  }
  if (sourceIntrinsic?.decision === 'CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED') {
    return 'Separate crop/top-origin from intrinsic table width with paired source/intrinsic evidence before reviewing renderer CSS.';
  }
  if (sourceContext?.decision === 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED') {
    return 'Build a CoC/YSHY scoped source model that proves Roll20 rule order, font-face activation, and table intrinsic context together; do not replay sanitized typography as CSS.';
  }
  if (sourceContext?.decision === 'RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED') {
    return 'Build a template-scoped source-context model and prove rule order plus font-face/table intrinsic behavior before reviewing renderer CSS.';
  }
  if (requiredModel === 'MESSAGE_CONTENT_TEXT_METRICS') {
    return 'Build and style-proof an AW2E template-scoped message/content width plus exact text metrics candidate; do not widen global ChatPane.';
  }
  if (requiredModel === 'TABLE_INTRINSIC_SANITIZE_FONT') {
    return 'Build and style-proof a CoC/YSHY table intrinsic, sanitize-order, and font-context candidate; do not use transform or broad typography CSS.';
  }
  if (requiredModel === 'KEEP_DEFAULT') {
    return 'Keep the default renderer while P0 fixtures are modeled.';
  }
  return `Create a new narrow renderer model for ${fixtureId}.`;
}

function bestCandidatesByFixture(candidateReport, styleProofReport) {
  const styleProofByName = new Map((styleProofReport?.candidates ?? []).map((candidate) => [candidate.name, candidate]));
  const byFixture = new Map();
  for (const candidate of candidateReport?.candidates ?? []) {
    if (candidate.name === 'default' || candidate.status !== 'OK') continue;
    for (const [fixtureKey, rawDelta] of Object.entries(candidate.fixtureAlignedDeltaPct ?? {})) {
      const deltaPct = numberOrNull(rawDelta);
      if (typeof deltaPct !== 'number') continue;
      const item = {
        name: candidate.name,
        deltaPct,
        risk: candidate.promotionRisk ?? candidate.status ?? '',
        regressedFixtures: Number(candidate.regressedFixtures ?? 0),
        meanDeltaPct: numberOrNull(candidate.meanAlignedDeltaPct),
        styleProofStatus: styleProofByName.get(candidate.name)?.styleProofStatus ?? 'NOT_STYLE_PROVEN',
      };
      const previous = byFixture.get(fixtureKey);
      if (!previous || item.deltaPct < previous.deltaPct || (item.deltaPct === previous.deltaPct && item.regressedFixtures < previous.regressedFixtures)) {
        byFixture.set(fixtureKey, item);
      }
    }
  }
  return byFixture;
}

function findCandidate(candidates, name) {
  if (!name) return null;
  return (candidates ?? []).find((candidate) => candidate.name === name) ?? null;
}

function summarizeRowRasterCandidate(candidate, fixtureId) {
  if (!candidate) {
    return {
      risk: 'missing-row-raster-candidate',
      weightedMismatchPct: '',
      weightedDeltaPct: null,
      worstRowMismatchPct: '',
      worstRowDeltaPct: null,
    };
  }
  const key = fixtureKeyForId(fixtureId);
  const fixture = candidate[key] ?? {};
  const prefix = rowRasterPrefixForFixture(fixtureId);
  return {
    risk: candidate.rowRasterRisk ?? '',
    weightedMismatchPct: fixture.rowWeightedMismatchPct ?? '',
    weightedDeltaPct: numberOrNull(candidate[`${prefix}RowWeightedDeltaPct`]),
    worstRowMismatchPct: fixture.worstRowMismatchPct ?? '',
    worstRowDeltaPct: numberOrNull(candidate[`${prefix}WorstRowDeltaPct`]),
  };
}

function summarizeCellAllocation(report, fixtureId, bestCandidateName = '') {
  const fixture = (report?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  const scenarios = (fixture?.scenarios ?? []).map((scenario) => ({
    scenario: scenario.scenario ?? '',
    status: scenario.status ?? '',
    allocationDecision: scenario.allocationDecision ?? '',
    productionBlocker: Boolean(scenario.productionBlocker),
    tableDelta: numberOrNull(scenario.tableDelta),
    maxAbsCellWidthDelta: numberOrNull(scenario.maxAbsCellWidthDelta),
    maxAbsTextCellWidthDelta: numberOrNull(scenario.maxAbsTextCellWidthDelta),
    maxAbsCellRatioDeltaPct: numberOrNull(scenario.maxAbsCellRatioDeltaPct),
    nextAction: scenario.nextAction ?? '',
  }));
  const defaultScenario = scenarios.find((scenario) => scenario.scenario === 'default') ?? null;
  const bestCandidateScenario = bestCandidateName
    ? scenarios.find((scenario) => scenario.scenario === bestCandidateName) ?? null
    : null;
  return {
    status: report?.summary?.status ?? '',
    defaultScenario,
    bestCandidateScenario,
    rejectedScenarios: scenarios.filter((scenario) => scenario.productionBlocker && scenario.status !== 'MISSING'),
    scenarios,
  };
}

function summarizeSourceContext(report, fixtureId) {
  const fixture = (report?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  if (!fixture) {
    return {
      decision: 'MISSING_SOURCE_CONTEXT',
      cssClassification: '',
      fontDecision: '',
      tableDecision: '',
      changedFonts: 0,
      tableWidthDelta: null,
      sanitizeReplayDeltaPct: null,
      evidence: [],
      nextAction: '',
    };
  }
  return {
    decision: fixture.decision ?? '',
    cssClassification: fixture.cssEvidence?.classification ?? '',
    expectedRulePresent: Boolean(fixture.cssEvidence?.expectedRulePresent),
    fontDecision: fixture.fontActivation?.decision ?? '',
    tableDecision: fixture.tableContext?.decision ?? '',
    changedFonts: Number(fixture.fontActivation?.changedFonts?.length ?? 0),
    tableWidthDelta: numberOrNull(fixture.tableContext?.tableWidthDelta),
    sanitizeReplayDeltaPct: numberOrNull(fixture.rowPaintSource?.sanitizeReplayDeltaPct),
    evidence: fixture.evidence ?? [],
    nextAction: fixture.nextAction ?? '',
  };
}

function summarizeSourceIntrinsic(report, fixtureId) {
  const fixture = (report?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  if (!fixture) {
    return {
      decision: 'MISSING_SOURCE_INTRINSIC_MATRIX',
      promotionBlocker: true,
      sourceMaxWidthPx: null,
      tableWidthDelta: null,
      tableScrollWidthDelta: null,
      rowWidthDeltaSpread: null,
      maxAbsCellDelta: null,
      maxAbsTopDelta: null,
      nextAction: '',
    };
  }
  return {
    decision: fixture.decision ?? '',
    promotionBlocker: Boolean(fixture.promotionBlocker),
    sourceMaxWidthPx: numberOrNull(fixture.source?.tableMaxWidthPx),
    tableWidthDelta: numberOrNull(fixture.metrics?.tableWidthDelta),
    tableScrollWidthDelta: numberOrNull(fixture.metrics?.tableScrollWidthDelta),
    rowWidthDeltaSpread: numberOrNull(fixture.metrics?.rowWidthDeltaSpread),
    maxAbsCellDelta: numberOrNull(fixture.metrics?.maxAbsCellDelta),
    maxAbsTopDelta: numberOrNull(fixture.metrics?.maxAbsTopDelta),
    nextAction: fixture.nextAction ?? '',
  };
}

function sourceContextBlocks(sourceContext, priority) {
  if (!sourceContext || priority === 'P2') return false;
  return [
    'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED',
    'RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED',
    'FONT_FACE_ACTIVATION_REQUIRED',
    'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED',
    'MISSING_SOURCE_CONTEXT',
  ].includes(sourceContext.decision);
}

function sourceIntrinsicBlocks(sourceIntrinsic, priority) {
  if (!sourceIntrinsic || priority === 'P2') return false;
  return (
    sourceIntrinsic.promotionBlocker ||
    [
      'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED',
      'CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED',
      'MISSING_SOURCE_INTRINSIC_MATRIX',
    ].includes(sourceIntrinsic.decision)
  );
}

function sourceContextHoldReason(sourceContext) {
  if (!sourceContext) return 'missing source/context evidence';
  const parts = [];
  if (sourceContext.cssClassification) parts.push(`css=${sourceContext.cssClassification}`);
  if (sourceContext.fontDecision) parts.push(`font=${sourceContext.fontDecision}`);
  if (sourceContext.tableDecision) parts.push(`table=${sourceContext.tableDecision}`);
  if (typeof sourceContext.tableWidthDelta === 'number') parts.push(`tableDelta=${fmtPx(sourceContext.tableWidthDelta)}`);
  if (sourceContext.changedFonts) parts.push(`changedFonts=${sourceContext.changedFonts}`);
  if (typeof sourceContext.sanitizeReplayDeltaPct === 'number') parts.push(`sanitizeReplay=${fmtSignedPct(sourceContext.sanitizeReplayDeltaPct)}`);
  return parts.join(', ') || 'missing source/context evidence';
}

function sourceIntrinsicHoldReason(sourceIntrinsic) {
  if (!sourceIntrinsic) return 'missing source/intrinsic evidence';
  const parts = [];
  if (typeof sourceIntrinsic.sourceMaxWidthPx === 'number') parts.push(`sourceMax=${fmtPx(sourceIntrinsic.sourceMaxWidthPx)}`);
  if (typeof sourceIntrinsic.tableWidthDelta === 'number') parts.push(`tableDelta=${fmtPx(sourceIntrinsic.tableWidthDelta)}`);
  if (typeof sourceIntrinsic.tableScrollWidthDelta === 'number') parts.push(`scrollDelta=${fmtPx(sourceIntrinsic.tableScrollWidthDelta)}`);
  if (typeof sourceIntrinsic.rowWidthDeltaSpread === 'number') parts.push(`rowSpread=${fmtPx(sourceIntrinsic.rowWidthDeltaSpread)}`);
  if (typeof sourceIntrinsic.maxAbsCellDelta === 'number') parts.push(`cellDelta=${fmtPx(sourceIntrinsic.maxAbsCellDelta)}`);
  if (typeof sourceIntrinsic.maxAbsTopDelta === 'number') parts.push(`topDelta=${fmtPx(sourceIntrinsic.maxAbsTopDelta)}`);
  return parts.join(', ') || 'missing source/intrinsic evidence';
}

function rowRasterPrefixForFixture(fixtureId) {
  if (fixtureId === 'official-roll20-AW2E') return 'aw2e';
  if (fixtureId === 'yshy-commission-1bu') return 'yshy';
  return fixtureKeyForId(fixtureId);
}

function promotionHoldReason(fixture) {
  const reasons = [
    `candidate=${fixture.bestCandidate?.risk ?? 'missing candidate'}`,
    `style=${fixture.bestCandidate?.styleProofStatus ?? 'n/a'}`,
  ];
  if (fixture.assetBlocksPromotion) reasons.push(`asset=${fixture.assetDecision || fixture.assetRendererPolicy || 'held'}`);
  if (fixture.rowRasterBlocksPromotion) reasons.push(`rowRaster=${fixture.rowRaster.risk}`);
  if (fixture.cellAllocationBlocksPromotion) reasons.push(`cellAllocation=${fixture.cellAllocation.bestCandidateScenario?.allocationDecision ?? 'held'}`);
  if (fixture.sourceContextBlocksPromotion) reasons.push(`sourceContext=${fixture.sourceContext.decision}`);
  if (fixture.sourceIntrinsicBlocksPromotion) reasons.push(`sourceIntrinsic=${fixture.sourceIntrinsic.decision}`);
  return reasons.join(', ');
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Template Scope Gate',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Action: **${report.action}**`,
    '',
    'Scope: diagnostic-only. This gate prevents global ChatPane CSS promotion when fixtures require different template-scoped models.',
    '',
    '| Fixture | Priority | Required scope | Required model | Mismatch | Table delta | Text residual | Scroll delta | Best candidate | Cell allocation | Source context | Source/intrinsic | Asset gate | Row raster | Proof checklist | Ready | Next action |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    const cell = fixture.cellAllocation.bestCandidateScenario ?? fixture.cellAllocation.defaultScenario;
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | \`${fixture.requiredScope}\` | ${fixture.requiredModel} | ${fixture.alignedMismatchPct} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.tableTextResidual)} | ${fmtPx(fixture.tableScrollWidthDelta)} | ${fixture.bestCandidate?.name ?? 'none'} (${fixture.bestCandidate?.risk ?? 'n/a'}) | ${cell ? `${cell.scenario}:${cell.allocationDecision}` : 'n/a'} | ${fixture.sourceContext.decision || 'n/a'} | ${fixture.sourceIntrinsic.decision || 'n/a'} (${sourceIntrinsicHoldReason(fixture.sourceIntrinsic)}) | ${fixture.assetDecision || 'n/a'} | ${fixture.rowRaster.risk || 'n/a'} ${fixture.rowRaster.weightedMismatchPct ? `(${fixture.rowRaster.weightedMismatchPct})` : ''} | ${fixture.requiredProofChecklist.join('<br>') || 'none'} | ${fixture.promotionReady ? 'yes' : 'no'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Blockers', '');
  if (report.blockers.length) {
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- No global/template-scope blocker found by this gate.');
  }
  lines.push('', '## Report Overrides', '');
  const overrides = Object.entries(report.reportOverrides ?? {});
  if (overrides.length) {
    for (const [key, value] of overrides) lines.push(`- ${key}: \`${value}\``);
  } else {
    lines.push('- None; canonical run reports were used.');
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- `ALLOW_SCOPED_REVIEW` would only allow a scoped renderer review; it would not prove Roll20 visual parity.');
  lines.push('- `HOLD_GLOBAL_CHAT_RENDERER_PATCH` means no global ChatPane width/font/paint CSS should be promoted from this evidence.');
  return `${lines.join('\n')}\n`;
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      if (fixture.fixtureId) ids.add(fixture.fixtureId);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function readReportJson(defaultDirName, reportFileName, overrideDir = '') {
  const file = overrideDir
    ? path.join(path.resolve(overrideDir), reportFileName)
    : path.join(runDir, defaultDirName, reportFileName);
  if (overrideDir && !(await fileExists(file))) {
    throw new Error(`Missing override report for ${defaultDirName}: ${file}`);
  }
  return readOptionalJson(file);
}

async function defaultReportExists(defaultDirName, reportFileName) {
  return fileExists(path.join(runDir, defaultDirName, reportFileName));
}

async function findLatestFallbackReportDir(prefixes, reportFileName) {
  const root = path.resolve('..', '_tmp_codex_smoke');
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return '';
  }

  const normalizedPrefixes = Array.isArray(prefixes) ? prefixes : [prefixes];
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!normalizedPrefixes.some((prefix) => entry.name.startsWith(`${prefix}-`))) continue;
    const dir = path.join(root, entry.name);
    const reportFile = path.join(dir, reportFileName);
    if (!(await fileExists(reportFile))) continue;
    const report = await readOptionalJson(reportFile);
    if (path.resolve(report?.runDir ?? '') !== runDir) continue;
    let mtimeMs = 0;
    try {
      mtimeMs = (await stat(reportFile)).mtimeMs;
    } catch {
      mtimeMs = 0;
    }
    candidates.push({ dir, mtimeMs });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs || b.dir.localeCompare(a.dir));
  return candidates[0]?.dir ?? '';
}

async function fileExists(file) {
  try {
    await readFile(file, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function normalizeReportOverrides(overrides) {
  return Object.fromEntries(
    Object.entries(overrides)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, path.resolve(value)]),
  );
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

function priorityFor(alignedMismatch) {
  return alignedMismatch > 0.1 ? 'P0' : alignedMismatch > 0.06 ? 'P1' : 'P2';
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number((value * 100).toFixed(2))}%` : '';
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function fmtSignedPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(2))}%`;
}

function selfTest() {
  const report = buildReport('reports/test', {
    plan: {
      fixtures: [
        { fixtureId: 'official-roll20-AW2E', priority: 'P0', alignedMismatchRatio: 0.18, strategy: 'AW2E_TEMPLATE_SCOPED_TEXT_METRICS' },
        { fixtureId: 'yshy-commission-1bu', priority: 'P0', alignedMismatchRatio: 0.2, strategy: 'COC_TABLE_INTRINSIC_AND_SANITIZE_MODEL' },
        { fixtureId: 'official-roll20-Les-Oublies', priority: 'P1', alignedMismatchRatio: 0.06, strategy: 'KEEP_DEFAULT' },
      ],
    },
    reconciliation: {
      fixtures: [
        { fixtureId: 'official-roll20-AW2E', signals: { tableWidthDelta: 15.75, tableTextResidual: 0.148, tableScrollWidthDelta: 16 } },
        { fixtureId: 'yshy-commission-1bu', signals: { tableWidthDelta: -24.531, tableTextResidual: 30.415, tableScrollWidthDelta: -25 } },
      ],
    },
    policy: { summary: { globalSafeCandidates: 0 } },
    candidates: {
      candidates: [
        { name: 'aw2e-font-size-only', status: 'OK', promotionRisk: 'no-meaningful-gain', fixtureAlignedDeltaPct: { aw2e: -0.02 }, regressedFixtures: 0 },
        { name: 'paint-dim-background', status: 'OK', promotionRisk: 'reject-regresses-fixtures', fixtureAlignedDeltaPct: { yshy: -1.62 }, regressedFixtures: 1 },
      ],
    },
    styleProof: { candidates: [] },
    assetPlan: {
      fixtures: [
        {
          fixtureId: 'official-roll20-AW2E',
          decision: 'SOURCE_ASSET_LOST_RELINK_REQUIRED',
          rendererPolicy: 'DO_NOT_PROMOTE_CSS',
          blockers: ['external source/proxy currently resolves to a placeholder image'],
        },
      ],
    },
    rowRasterCandidates: {
      candidates: [
        {
          name: 'aw2e-font-size-only',
          rowRasterRisk: 'reject-row-raster-regression',
          aw2eRowWeightedDeltaPct: 6.82,
          aw2eWorstRowDeltaPct: 8.16,
          aw2e: { rowWeightedMismatchPct: '24.75%', worstRowMismatchPct: '34.44%' },
        },
      ],
    },
    cellAllocation: {
      summary: { status: 'CELL_ALLOCATION_BLOCKERS_FOUND' },
      fixtures: [
        {
          fixtureId: 'official-roll20-AW2E',
          scenarios: [
            {
              scenario: 'default',
              status: 'COMPARED',
              allocationDecision: 'UNIFORM_TABLE_SCALE_OR_CROP_CONTEXT',
              productionBlocker: false,
              tableDelta: 15.75,
              maxAbsTextCellWidthDelta: 4.953,
              maxAbsCellRatioDeltaPct: 0.255,
            },
            {
              scenario: 'aw2e-font-size-only',
              status: 'COMPARED',
              allocationDecision: 'BROAD_STYLE_BREAKS_CELL_ALLOCATION',
              productionBlocker: true,
              tableDelta: -188.391,
              maxAbsTextCellWidthDelta: 73.719,
              maxAbsCellRatioDeltaPct: 6.802,
            },
          ],
        },
      ],
    },
    sourceContext: {
      fixtures: [
        {
          fixtureId: 'official-roll20-AW2E',
          decision: 'RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED',
          cssEvidence: { classification: 'EXPECTED_RULE_PRESENT', expectedRulePresent: true },
          fontActivation: { decision: 'FONT_FACE_ACTIVATION_DIFFERS', changedFonts: [] },
          tableContext: { decision: 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED', tableWidthDelta: 15.75 },
        },
        {
          fixtureId: 'yshy-commission-1bu',
          decision: 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED',
          cssEvidence: { classification: 'EXPECTED_RULE_PRESENT', expectedRulePresent: true },
          fontActivation: { decision: 'FONT_FACE_ACTIVATION_DIFFERS', changedFonts: [{ spec: '12px BookkMyungjo-Bd' }] },
          tableContext: { decision: 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED', tableWidthDelta: -24.531 },
          rowPaintSource: { sanitizeReplayDeltaPct: 14.95 },
        },
      ],
    },
    sourceIntrinsic: {
      fixtures: [
        {
          fixtureId: 'official-roll20-AW2E',
          decision: 'CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED',
          promotionBlocker: true,
          source: { tableMaxWidthPx: 110 },
          metrics: {
            tableWidthDelta: 15.75,
            tableScrollWidthDelta: 16,
            rowWidthDeltaSpread: 0,
            maxAbsCellDelta: 4.953,
            maxAbsTopDelta: 406.188,
          },
        },
        {
          fixtureId: 'yshy-commission-1bu',
          decision: 'SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED',
          promotionBlocker: true,
          source: { tableMaxWidthPx: 280 },
          metrics: {
            tableWidthDelta: -24.531,
            tableScrollWidthDelta: -25,
            rowWidthDeltaSpread: 0,
            maxAbsCellDelta: 0.906,
            maxAbsTopDelta: 52.703,
          },
        },
      ],
    },
  }, { styleProof: path.resolve('tmp-style-proof') });
  assert.equal(report.action, 'HOLD_GLOBAL_CHAT_RENDERER_PATCH');
  assert.equal(report.reportOverrides.styleProof, path.resolve('tmp-style-proof'));
  assert.ok(report.blockers.some((blocker) => blocker.includes('split renderer models')));
  assert.ok(report.blockers.some((blocker) => blocker.includes('placeholder image')));
  assert.ok(report.blockers.some((blocker) => blocker.includes('row-raster risk=reject-row-raster-regression')));
  assert.ok(report.blockers.some((blocker) => blocker.includes('cell allocation rejected')));
  assert.ok(report.blockers.some((blocker) => blocker.includes('source/context gate requires RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED')));
  assert.ok(report.blockers.some((blocker) => blocker.includes('source/context gate requires SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED')));
  assert.ok(report.blockers.some((blocker) => blocker.includes('source/intrinsic matrix requires CROP_AND_TABLE_INTRINSIC_SPLIT_REQUIRED')));
  assert.ok(report.blockers.some((blocker) => blocker.includes('source/intrinsic matrix requires SANITIZE_INTRINSIC_CROP_MODEL_REQUIRED')));
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').requiredScope, '.sheet-rolltemplate-aw');
  assert.ok(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').requiredProofChecklist.includes('message-content-width-sidecar'));
  assert.ok(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').requiredProofChecklist.includes('source-intrinsic-matrix-promotion-blocker-cleared'));
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').cellAllocationBlocksPromotion, true);
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').sourceContextBlocksPromotion, true);
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').sourceIntrinsicBlocksPromotion, true);
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').promotionReady, false);
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'yshy-commission-1bu').requiredModel, 'TABLE_INTRINSIC_SANITIZE_FONT');
  assert.ok(report.fixtures.find((fixture) => fixture.fixtureId === 'yshy-commission-1bu').requiredProofChecklist.includes('font-face-rule-order-sanitize-source-context'));
  assert.ok(report.fixtures.find((fixture) => fixture.fixtureId === 'yshy-commission-1bu').requiredProofChecklist.includes('source-intrinsic-matrix-promotion-blocker-cleared'));
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'yshy-commission-1bu').sourceIntrinsicBlocksPromotion, true);
  console.log('roll20_chat_template_scope_gate self-test PASS');
}

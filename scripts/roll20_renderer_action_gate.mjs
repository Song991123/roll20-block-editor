#!/usr/bin/env node
/**
 * Consolidate Roll20 actual evidence into a renderer action recommendation.
 *
 * This does not prove visual parity and does not upload to Roll20. It prevents
 * diagnostic CSS candidates from being mistaken for production-ready renderer
 * fixes when actual screenshots, chat evidence, or cross-fixture agreement are
 * still missing.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--full-root-dir',
  '--scroll-metrics-full-root-dir',
  '--root-cutoff-dir',
  '--geometry-dir',
  '--chat-template-scope-dir',
  '--cell-allocation-dir',
]);
const runDirArg = firstPositionalArg() ?? '';
const runDir = path.resolve(runDirArg);

if (!runDirArg) {
  console.error('Usage: node scripts/roll20_renderer_action_gate.mjs reports/roll20-actual-compare/<label> [--out-dir <writable-report-dir>] [--full-root-dir <report-dir>] [--geometry-dir <report-dir>]');
  process.exit(2);
}

const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'renderer-action-gate');
const reportOverrides = {
  fullRoot: readOption('--full-root-dir', ''),
  scrollMetricsFullRoot: readOption('--scroll-metrics-full-root-dir', ''),
  rootCutoff: readOption('--root-cutoff-dir', ''),
  geometry: readOption('--geometry-dir', ''),
  chatTemplateScope: readOption('--chat-template-scope-dir', ''),
  chatCellAllocation: readOption('--cell-allocation-dir', ''),
};

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
  const status = await readJsonIfExists(path.join(runDir, 'actual-verification-status', 'actual-verification-status-results.json'));
  const fullRoot = await readReportJson('full-root-candidate-smoke', 'full-root-candidate-smoke-results.json', reportOverrides.fullRoot);
  const scrollMetricsFullRoot = await readReportJson('full-root-candidate-smoke-scroll-metrics', 'full-root-candidate-smoke-results.json', reportOverrides.scrollMetricsFullRoot);
  const rootStitchAudit = await readJsonIfExists(path.join(runDir, 'root-stitch-audit', 'root-stitch-audit-results.json'));
  const rootCutoff = await readReportJson('root-cutoff-diagnostics', 'root-cutoff-diagnostics-results.json', reportOverrides.rootCutoff);
  const stateVisibility = await readJsonIfExists(path.join(runDir, 'state-visibility-diagnostics', 'state-visibility-diagnostics-results.json'));
  const attrClassVisibility = await readJsonIfExists(path.join(runDir, 'attr-class-visibility-diagnostics', 'attr-class-visibility-diagnostics-results.json'));
  const attrClassGeometry = await readJsonIfExists(path.join(runDir, 'attr-class-panel-geometry-diagnostics', 'attr-class-panel-geometry-diagnostics-results.json'));
  const geometry = await readReportJson('geometry-delta-diagnostics', 'geometry-delta-diagnostics-results.json', reportOverrides.geometry);
  const inputFlowAxis = await readJsonIfExists(path.join(runDir, 'input-flow-axis-diagnostics', 'input-flow-axis-diagnostics-results.json'));
  const chatParity = await readJsonIfExists(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const chatStyle = await readJsonIfExists(path.join(runDir, 'chat-style-context-diagnostics', 'chat-style-context-diagnostics-results.json'));
  const chatCandidates = await readJsonIfExists(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const chatCandidateStyleProof = await readJsonIfExists(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json'));
  const chatRendererPolicy = await readJsonIfExists(path.join(runDir, 'chat-renderer-policy', 'chat-renderer-policy-results.json'));
  const chatResidual = await readJsonIfExists(path.join(runDir, 'chat-residual-diagnostics', 'chat-residual-diagnostics-results.json'));
  const chatMaskStrategy = await readJsonIfExists(path.join(runDir, 'chat-mask-strategy', 'chat-mask-strategy-results.json'));
  const chatShellGeometry = await readJsonIfExists(path.join(runDir, 'chat-shell-geometry', 'chat-shell-geometry-results.json'));
  const chatFontCell = await readJsonIfExists(path.join(runDir, 'chat-font-cell-model', 'chat-font-cell-model-results.json'));
  const chatWidthModel = await readJsonIfExists(path.join(runDir, 'chat-width-model', 'chat-width-model-results.json'));
  const chatMessageShellModel = await readJsonIfExists(path.join(runDir, 'chat-message-shell-model', 'chat-message-shell-model-results.json'));
  const chatTableWidthBudget = await readJsonIfExists(path.join(runDir, 'chat-table-width-budget', 'chat-table-width-budget-results.json'));
  const chatTableIntrinsicProbe = await readJsonIfExists(path.join(runDir, 'chat-table-intrinsic-probe', 'chat-table-intrinsic-probe-results.json'));
  const chatOverflowCropProbe = await readJsonIfExists(path.join(runDir, 'chat-overflow-crop-probe', 'chat-overflow-crop-probe-results.json'));
  const chatIntrinsicWidthModel = await readJsonIfExists(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const chatFontGlyphModel = await readJsonIfExists(path.join(runDir, 'chat-font-glyph-model', 'chat-font-glyph-model-results.json'));
  const chatFontIntrinsicProbe = await readJsonIfExists(path.join(runDir, 'chat-font-intrinsic-probe', 'chat-font-intrinsic-probe-results.json'));
  const chatRowPaintSourceProbe = await readJsonIfExists(path.join(runDir, 'chat-row-paint-source-probe', 'chat-row-paint-source-probe-results.json'));
  const chatRowRasterProbe = await readJsonIfExists(path.join(runDir, 'chat-row-raster-probe', 'chat-row-raster-probe-results.json'));
  const chatRowRasterCandidates = await readJsonIfExists(path.join(runDir, 'chat-row-raster-candidate-comparison', 'chat-row-raster-candidate-comparison-results.json'));
  const chatRowCompositingProbe = await readJsonIfExists(path.join(runDir, 'chat-row-compositing-probe', 'chat-row-compositing-probe-results.json'));
  const chatBackgroundSourceProbe = await readJsonIfExists(path.join(runDir, 'chat-background-source-probe', 'chat-background-source-probe-results.json'));
  const chatBackgroundRasterModelProbe = await readJsonIfExists(path.join(runDir, 'chat-background-raster-model-probe', 'chat-background-raster-model-probe-results.json'));
  const chatBackgroundAssetProbe = await readJsonIfExists(path.join(runDir, 'chat-background-asset-probe', 'chat-background-asset-probe-results.json'));
  const chatRowGeometry = await readJsonIfExists(path.join(runDir, 'chat-row-geometry', 'chat-row-geometry-results.json'));
  const chatWidthReconciliation = await readJsonIfExists(path.join(runDir, 'chat-width-reconciliation', 'chat-width-reconciliation-results.json'));
  const chatCurrentMetricsAudit = await readJsonIfExists(path.join(runDir, 'chat-current-metrics-audit', 'chat-current-metrics-audit-results.json'));
  const chatStructureCompare = await readJsonIfExists(path.join(runDir, 'chat-structure-compare', 'chat-structure-compare-results.json'));
  const chatAssetPreservationPlan = await readJsonIfExists(path.join(runDir, 'chat-asset-preservation-plan', 'chat-asset-preservation-plan-results.json'));
  const chatCellAllocationProbe = await readReportJson('chat-cell-allocation-probe', 'chat-cell-allocation-probe-results.json', reportOverrides.chatCellAllocation);
  const chatTemplateScopeGate = await readReportJson('chat-template-scope-gate', 'chat-template-scope-gate-results.json', reportOverrides.chatTemplateScope);

  const fixtures = mergeFixtures({ status, fullRoot, scrollMetricsFullRoot, rootStitchAudit, rootCutoff, stateVisibility, attrClassVisibility, attrClassGeometry, geometry });
  const recommendation = recommend(fixtures, status, runDir, inputFlowAxis, chatParity, chatStyle, chatCandidates, chatCandidateStyleProof, chatRendererPolicy, chatResidual, chatMaskStrategy, chatShellGeometry, chatFontCell, chatWidthModel, chatMessageShellModel, chatTableWidthBudget, chatTableIntrinsicProbe, chatOverflowCropProbe, chatIntrinsicWidthModel, chatFontGlyphModel, chatFontIntrinsicProbe, chatRowPaintSourceProbe, chatRowRasterProbe, chatRowRasterCandidates, chatRowCompositingProbe, chatBackgroundSourceProbe, chatBackgroundRasterModelProbe, chatBackgroundAssetProbe, chatAssetPreservationPlan, chatRowGeometry, chatWidthReconciliation, chatCellAllocationProbe, chatTemplateScopeGate, chatCurrentMetricsAudit, chatStructureCompare);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    reportOverrides: normalizeReportOverrides(reportOverrides),
    scope: 'Roll20 renderer action gate; diagnostic only, not visual parity',
    recommendation,
    inputFlowAxis: summarizeInputFlowAxis(inputFlowAxis),
    chatParity: summarizeChatParity(chatParity),
    chatStyle: summarizeChatStyle(chatStyle),
    chatCandidates: summarizeChatCandidates(chatCandidates),
    chatCandidateStyleProof: summarizeChatCandidateStyleProof(chatCandidateStyleProof),
    chatRendererPolicy: summarizeChatRendererPolicy(chatRendererPolicy),
    chatResidual: summarizeChatResidual(chatResidual),
    chatMaskStrategy: summarizeChatMaskStrategy(chatMaskStrategy),
    chatShellGeometry: summarizeChatShellGeometry(chatShellGeometry),
    chatFontCell: summarizeChatFontCell(chatFontCell),
    chatWidthModel: summarizeChatWidthModel(chatWidthModel),
    chatMessageShellModel: summarizeChatMessageShellModel(chatMessageShellModel),
    chatTableWidthBudget: summarizeChatTableWidthBudget(chatTableWidthBudget),
    chatTableIntrinsicProbe: summarizeChatTableIntrinsicProbe(chatTableIntrinsicProbe),
    chatOverflowCropProbe: summarizeChatOverflowCropProbe(chatOverflowCropProbe),
    chatIntrinsicWidthModel: summarizeChatIntrinsicWidthModel(chatIntrinsicWidthModel),
    chatFontGlyphModel: summarizeChatFontGlyphModel(chatFontGlyphModel),
    chatFontIntrinsicProbe: summarizeChatFontIntrinsicProbe(chatFontIntrinsicProbe),
    chatRowPaintSourceProbe: summarizeChatRowPaintSourceProbe(chatRowPaintSourceProbe),
    chatRowRasterProbe: summarizeChatRowRasterProbe(chatRowRasterProbe),
    chatRowRasterCandidates: summarizeChatRowRasterCandidates(chatRowRasterCandidates),
    chatRowCompositingProbe: summarizeChatRowCompositingProbe(chatRowCompositingProbe),
    chatBackgroundSourceProbe: summarizeChatBackgroundSourceProbe(chatBackgroundSourceProbe),
    chatBackgroundRasterModelProbe: summarizeChatBackgroundRasterModelProbe(chatBackgroundRasterModelProbe),
    chatBackgroundAssetProbe: summarizeChatBackgroundAssetProbe(chatBackgroundAssetProbe),
    chatAssetPreservationPlan: summarizeChatAssetPreservationPlan(chatAssetPreservationPlan),
    chatRowGeometry: summarizeChatRowGeometry(chatRowGeometry),
    chatWidthReconciliation: summarizeChatWidthReconciliation(chatWidthReconciliation),
    chatCellAllocationProbe: summarizeChatCellAllocationProbe(chatCellAllocationProbe),
    chatTemplateScopeGate: summarizeChatTemplateScopeGate(chatTemplateScopeGate),
    chatCurrentMetrics: summarizeChatCurrentMetrics(status, chatCurrentMetricsAudit),
    chatStructure: summarizeChatStructure(chatStructureCompare),
    summary: summarize(fixtures),
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'renderer-action-gate-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'renderer-action-gate-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 RENDERER ACTION ${recommendation.action}`);
  for (const reason of recommendation.blockers) console.log(`BLOCKER ${reason}`);
  for (const warning of recommendation.warnings) console.log(`WARNING ${warning}`);
  for (const note of recommendation.positiveFindings) console.log(`EVIDENCE ${note}`);
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function mergeFixtures({ status, fullRoot, scrollMetricsFullRoot, rootStitchAudit, rootCutoff, stateVisibility, attrClassVisibility, attrClassGeometry, geometry }) {
  const ids = new Set();
  for (const source of [status, fullRoot, scrollMetricsFullRoot, rootStitchAudit, rootCutoff, attrClassVisibility, attrClassGeometry, stateVisibility, geometry]) {
    for (const fixture of source?.fixtures ?? []) ids.add(fixture.fixtureId);
  }

  return [...ids].sort().map((fixtureId) => {
    const statusFixture = findFixture(status, fixtureId);
    const fullRootFixture = findFixture(fullRoot, fixtureId);
    const scrollMetricsFullRootFixture = findFixture(scrollMetricsFullRoot, fixtureId);
    const rootStitchFixture = findFixture(rootStitchAudit, fixtureId);
    const rootCutoffFixture = findFixture(rootCutoff, fixtureId);
    const stateFixture = findFixture(stateVisibility, fixtureId);
    const attrClassVisibilityFixture = findFixture(attrClassVisibility, fixtureId);
    const attrClassGeometryFixture = findFixture(attrClassGeometry, fixtureId);
    const geometryFixture = findFixture(geometry, fixtureId);
    const targets = Object.fromEntries((statusFixture?.actualTargets ?? []).map((target) => [target.id, target.validation]));
    const attrClassSidecar = readAttrClassSidecarSync(runDir, fixtureId);

    return {
      fixtureId,
      sandboxEvidence: targets.sandbox ?? null,
      chatEvidence: targets.chat ?? null,
      fullRootStatus: fullRootFixture?.status ?? 'MISSING',
      fullRootReason: fullRootFixture?.reason ?? '',
      rootStitchAudit: rootStitchFixture
        ? {
            status: rootStitchFixture.status,
            primaryIssue: rootStitchFixture.primaryIssue ?? '',
            trustedEvidence: rootStitchFixture.trustedEvidence ?? [],
            overlapDiagnostics: rootStitchFixture.overlapDiagnostics ?? [],
          }
          : null,
      rootCutoff: rootCutoffFixture
        ? {
            status: rootCutoffFixture.status,
            stitchedHeight: rootCutoffFixture.stitchedRoot?.height ?? null,
            sidecarHeight: rootCutoffFixture.sidecarRoot?.height ?? null,
            heightDelta: rootCutoffFixture.cutoff?.heightDelta ?? null,
            risk: rootCutoffFixture.cutoff?.risk ?? null,
            visualOverlapPlacement: rootCutoffFixture.cutoff?.visualOverlapPlacement ?? false,
            clippedValues: rootCutoffFixture.cutoff?.clippedValues ?? [],
            belowValues: rootCutoffFixture.cutoff?.belowValues ?? [],
          }
        : null,
      bestCandidate: fullRootFixture?.bestCandidate
        ? {
            id: fullRootFixture.bestCandidate.id,
            mismatchRatio: fullRootFixture.bestCandidate.mismatchRatio,
            mismatchPct: pctNumber(fullRootFixture.bestCandidate.mismatchRatio),
            rootHeightDelta: fullRootFixture.bestCandidate.rootHeightDelta ?? null,
            patch: candidatePatch(fullRootFixture.bestCandidate),
            localSize: fullRootFixture.bestCandidate.localSize ?? null,
          }
        : null,
      closestRootHeightCandidate: fullRootFixture?.closestRootHeightCandidate
        ? {
            id: fullRootFixture.closestRootHeightCandidate.id,
            mismatchRatio: fullRootFixture.closestRootHeightCandidate.mismatchRatio,
            mismatchPct: pctNumber(fullRootFixture.closestRootHeightCandidate.mismatchRatio),
            rootHeightDelta: fullRootFixture.closestRootHeightCandidate.rootHeightDelta ?? null,
            patch: candidatePatch(fullRootFixture.closestRootHeightCandidate),
            localSize: fullRootFixture.closestRootHeightCandidate.localSize ?? null,
          }
        : null,
      attrClassValueCount: Number(fullRootFixture?.localBaseline?.attrClassValues?.length ?? fullRootFixture?.localBaseline?.derivedStateProbeValues?.values?.length ?? 0),
      attrClassSidecar,
      diagnosticBestCandidate: fullRootFixture?.diagnosticBestCandidate
        ? {
            id: fullRootFixture.diagnosticBestCandidate.id,
            mismatchRatio: fullRootFixture.diagnosticBestCandidate.mismatchRatio,
            mismatchPct: pctNumber(fullRootFixture.diagnosticBestCandidate.mismatchRatio),
            rootHeightDelta: fullRootFixture.diagnosticBestCandidate.rootHeightDelta ?? null,
            patch: candidatePatch(fullRootFixture.diagnosticBestCandidate),
            localSize: fullRootFixture.diagnosticBestCandidate.localSize ?? null,
        }
        : null,
      scrollMetricsComparison: scrollMetricsFullRootFixture
        ? {
            status: scrollMetricsFullRootFixture.status,
            actualSize: scrollMetricsFullRootFixture.actual?.size ?? null,
            diagnosticBestCandidate: scrollMetricsFullRootFixture.diagnosticBestCandidate
              ? {
                  id: scrollMetricsFullRootFixture.diagnosticBestCandidate.id,
                  mismatchRatio: scrollMetricsFullRootFixture.diagnosticBestCandidate.mismatchRatio,
                  mismatchPct: pctNumber(scrollMetricsFullRootFixture.diagnosticBestCandidate.mismatchRatio),
                  rootHeightDelta: scrollMetricsFullRootFixture.diagnosticBestCandidate.rootHeightDelta ?? null,
                  patch: candidatePatch(scrollMetricsFullRootFixture.diagnosticBestCandidate),
                  localSize: scrollMetricsFullRootFixture.diagnosticBestCandidate.localSize ?? null,
                }
              : null,
            closestRootHeightCandidate: scrollMetricsFullRootFixture.closestRootHeightCandidate
              ? {
                  id: scrollMetricsFullRootFixture.closestRootHeightCandidate.id,
                  mismatchRatio: scrollMetricsFullRootFixture.closestRootHeightCandidate.mismatchRatio,
                  mismatchPct: pctNumber(scrollMetricsFullRootFixture.closestRootHeightCandidate.mismatchRatio),
                  rootHeightDelta: scrollMetricsFullRootFixture.closestRootHeightCandidate.rootHeightDelta ?? null,
                  patch: candidatePatch(scrollMetricsFullRootFixture.closestRootHeightCandidate),
                  localSize: scrollMetricsFullRootFixture.closestRootHeightCandidate.localSize ?? null,
                }
              : null,
            sourceCandidate: summarizeScrollMetricsCandidate(
              scrollMetricsFullRootFixture.candidates?.find((candidate) => candidate.id === 'sandbox-source-state'),
            ),
            statePanelGeometry: summarizeScrollMetricsPanelGeometry(scrollMetricsFullRootFixture.targetGeometry),
          }
        : null,
      stateVisibility: stateFixture
        ? {
            status: stateFixture.status,
            primaryFinding: stateFixture.primaryFinding ?? '',
            matchedLocalExpected: stateFixture.localExpectedVisibility?.matched ?? null,
            actualVisibleCount: stateFixture.localExpectedVisibility?.actualVisibleCount ?? null,
            localVisibleCount: stateFixture.localExpectedVisibility?.localVisibleCount ?? null,
            largestHeightDeltas: stateFixture.localExpectedVisibility?.largestHeightDeltas ?? [],
        }
        : null,
      attrClassVisibility: attrClassVisibilityFixture
        ? {
            status: attrClassVisibilityFixture.status,
            checkedValues: attrClassVisibilityFixture.actualSummary?.checkedValues ?? [],
            visiblePanelCount: attrClassVisibilityFixture.actualSummary?.visiblePanelValues?.length ?? null,
            extraVisibleValues: attrClassVisibilityFixture.actualSummary?.extraVisibleValues ?? [],
            checkedVisibleContradiction: attrClassVisibilityFixture.actualSummary?.checkedVisibleContradiction ?? false,
            selectorMismatchCount: attrClassVisibilityFixture.selectorSummary?.selectorMismatchCount ?? 0,
            visibleDespiteUncheckedCount: attrClassVisibilityFixture.selectorSummary?.visibleDespiteUncheckedCount ?? 0,
        }
        : null,
      attrClassGeometry: attrClassGeometryFixture
        ? {
            status: attrClassGeometryFixture.status,
            actualRootHeight: attrClassGeometryFixture.boundary?.actualRootHeight ?? null,
            intersectingCount: attrClassGeometryFixture.boundary?.intersectingValues?.length ?? null,
            fullyContainedCount: attrClassGeometryFixture.boundary?.fullyContainedValues?.length ?? null,
            clippedValues: attrClassGeometryFixture.boundary?.clippedValues ?? [],
            belowValues: attrClassGeometryFixture.boundary?.belowValues ?? [],
            heightClosestCandidateId: attrClassGeometryFixture.sourceOrderFit?.heightClosestCandidateId ?? null,
            heightClosestRootDelta: attrClassGeometryFixture.sourceOrderFit?.heightClosestRootDelta ?? null,
            firstRowsBottomDeltaVsActual: attrClassGeometryFixture.sourceOrderFit?.firstRowsBottomDeltaVsActual ?? null,
          }
        : null,
      geometry: geometryFixture
        ? {
            status: geometryFixture.status,
            bestCandidate: geometryFixture.bestCandidate ?? '',
            cssMismatchPct: pctNumber(geometryFixture.cssMismatch),
            rootHeightDelta: geometryFixture.rootHeightDelta ?? null,
            countsMatched: geometryFixture.countsMatched ?? null,
            topFinding: geometryFixture.topGeometryFinding ?? '',
          }
        : null,
    };
  });
}

function recommend(fixtures, status, activeRunDir, inputFlowAxis, chatParity, chatStyle, chatCandidates, chatCandidateStyleProof, chatRendererPolicy, chatResidual, chatMaskStrategy, chatShellGeometry, chatFontCell, chatWidthModel, chatMessageShellModel, chatTableWidthBudget, chatTableIntrinsicProbe, chatOverflowCropProbe, chatIntrinsicWidthModel, chatFontGlyphModel, chatFontIntrinsicProbe, chatRowPaintSourceProbe, chatRowRasterProbe, chatRowRasterCandidates, chatRowCompositingProbe, chatBackgroundSourceProbe, chatBackgroundRasterModelProbe, chatBackgroundAssetProbe, chatAssetPreservationPlan, chatRowGeometry, chatWidthReconciliation, chatCellAllocationProbe, chatTemplateScopeGate, chatCurrentMetricsAudit, chatStructureCompare) {
  const blockers = [];
  const warnings = [];
  const positiveFindings = [];

  const generatedSummaryComplete =
    Number(status?.summary?.generatedTargetCount ?? 0) > 0 &&
    status.summary.generatedPresentCount === status.summary.generatedTargetCount &&
    status.summary.generatedDiffedCount === status.summary.generatedTargetCount;
  const generatedStatusComplete = status?.status === 'GENERATED_ACTUAL_SCREENSHOTS_DIFFED';
  const generatedEvidenceComplete = Boolean(generatedSummaryComplete || generatedStatusComplete);
  const inputFlowSummary = summarizeInputFlowAxis(inputFlowAxis);
  const chatParitySummary = summarizeChatParity(chatParity);
  const chatStyleSummary = summarizeChatStyle(chatStyle);
  const chatCandidateSummary = summarizeChatCandidates(chatCandidates);
  const chatCandidateStyleProofSummary = summarizeChatCandidateStyleProof(chatCandidateStyleProof);
  const chatRendererPolicySummary = summarizeChatRendererPolicy(chatRendererPolicy);
  const chatResidualSummary = summarizeChatResidual(chatResidual);
  const chatMaskStrategySummary = summarizeChatMaskStrategy(chatMaskStrategy);
  const chatShellGeometrySummary = summarizeChatShellGeometry(chatShellGeometry);
  const chatFontCellSummary = summarizeChatFontCell(chatFontCell);
  const chatWidthModelSummary = summarizeChatWidthModel(chatWidthModel);
  const chatMessageShellModelSummary = summarizeChatMessageShellModel(chatMessageShellModel);
  const chatTableWidthBudgetSummary = summarizeChatTableWidthBudget(chatTableWidthBudget);
  const chatTableIntrinsicProbeSummary = summarizeChatTableIntrinsicProbe(chatTableIntrinsicProbe);
  const chatOverflowCropProbeSummary = summarizeChatOverflowCropProbe(chatOverflowCropProbe);
  const chatIntrinsicWidthModelSummary = summarizeChatIntrinsicWidthModel(chatIntrinsicWidthModel);
  const chatFontGlyphModelSummary = summarizeChatFontGlyphModel(chatFontGlyphModel);
  const chatFontIntrinsicProbeSummary = summarizeChatFontIntrinsicProbe(chatFontIntrinsicProbe);
  const chatRowPaintSourceProbeSummary = summarizeChatRowPaintSourceProbe(chatRowPaintSourceProbe);
  const chatRowRasterProbeSummary = summarizeChatRowRasterProbe(chatRowRasterProbe);
  const chatRowRasterCandidatesSummary = summarizeChatRowRasterCandidates(chatRowRasterCandidates);
  const chatRowCompositingProbeSummary = summarizeChatRowCompositingProbe(chatRowCompositingProbe);
  const chatBackgroundSourceProbeSummary = summarizeChatBackgroundSourceProbe(chatBackgroundSourceProbe);
  const chatBackgroundRasterModelProbeSummary = summarizeChatBackgroundRasterModelProbe(chatBackgroundRasterModelProbe);
  const chatBackgroundAssetProbeSummary = summarizeChatBackgroundAssetProbe(chatBackgroundAssetProbe);
  const chatAssetPreservationPlanSummary = summarizeChatAssetPreservationPlan(chatAssetPreservationPlan);
  const chatRowGeometrySummary = summarizeChatRowGeometry(chatRowGeometry);
  const chatWidthReconciliationSummary = summarizeChatWidthReconciliation(chatWidthReconciliation);
  const chatCellAllocationProbeSummary = summarizeChatCellAllocationProbe(chatCellAllocationProbe);
  const chatTemplateScopeGateSummary = summarizeChatTemplateScopeGate(chatTemplateScopeGate);
  const chatCurrentMetrics = summarizeChatCurrentMetrics(status, chatCurrentMetricsAudit);
  const chatStructureSummary = summarizeChatStructure(chatStructureCompare);
  const chatStructureMismatchIds = new Set((chatStructureSummary?.mismatchFixtures ?? []).map((fixture) => fixture.fixtureId));
  const styleProofStatusByName = new Map(
    (chatCandidateStyleProofSummary?.candidates ?? []).map((candidate) => [
      candidate.name,
      candidate.styleProofStatus,
    ]),
  );
  const unresolvedStyleProofCandidates = chatCandidateSummary?.styleProofCandidates
    ?.filter((candidate) => !styleProofStatusByName.has(candidate.name))
    ?? [];

  if (!generatedEvidenceComplete) {
    blockers.push(`generated-sheet actual evidence incomplete: status=${status?.status ?? 'unknown'}`);
  }

  const missingTrustedRoot = fixtures.filter((fixture) => !fixture.sandboxEvidence?.ok);
  if (missingTrustedRoot.length) {
    blockers.push(`missing trusted generated-sheet root evidence for ${missingTrustedRoot.map((fixture) => fixture.fixtureId).join(', ')}`);
  }

  const missingChat = fixtures.filter((fixture) => !fixture.chatEvidence?.ok);
  if (missingChat.length) {
    blockers.push(`missing trustworthy Roll20 chat screenshots for ${missingChat.map((fixture) => fixture.fixtureId).join(', ')}`);
  }
  if (!chatParitySummary) {
    warnings.push('local ChatPane vs actual Roll20 chat parity diagnostic has not been run');
  } else {
    if (chatParitySummary.needsNormalizedCapture > 0) {
      blockers.push(`actual Roll20 chat parity needs normalized rolltemplate crop evidence for ${chatParitySummary.needsNormalizedCapture}/${chatParitySummary.fixtures} fixtures`);
    }
    if (chatParitySummary.actualChatCssInactive > 0) {
      blockers.push(`actual Roll20 chat CSS evidence is inactive for ${chatParitySummary.actualChatCssInactive}/${chatParitySummary.fixtures} fixtures; do not treat CSS-active local ChatPane mismatch as a production renderer regression until Roll20 chat CSS activation is proven`);
    }
    if (chatParitySummary.actualChatCssScopedMismatch > 0) {
      blockers.push(`actual Roll20 chat CSS appears scoped/prefix-mismatched for ${chatParitySummary.actualChatCssScopedMismatch}/${chatParitySummary.fixtures} fixtures; verify whether Roll20 stores rolltemplate CSS under .charsheet or without sheet-* chat selectors before changing local ChatPane CSS`);
    }
    if (chatParitySummary.actualCaptureScaleSuspect > 0) {
      blockers.push(`actual Roll20 chat screenshots have non-PNG or non-1x capture scale for ${chatParitySummary.actualCaptureScaleSuspect}/${chatParitySummary.fixtures} fixtures${formatChatSuspectSuffix(chatParitySummary, 'capture scale/format')}; recapture with PNG bytes and clip.scale=1 before using pixel mismatch as a production renderer target`);
    }
    if (chatParitySummary.actualCropGeometrySuspect > 0) {
      blockers.push(`actual Roll20 chat crop geometry is suspect for ${chatParitySummary.actualCropGeometrySuspect}/${chatParitySummary.normalizedCompared} normalized fixtures${formatChatSuspectSuffix(chatParitySummary, 'crop geometry')}; recapture with element-bound template screenshots before using pixel mismatch as a production renderer target`);
    }
    if (chatParitySummary.actualTemplatePixelSuspect > 0) {
      blockers.push(`actual Roll20 chat crop foreground pixels are suspect for ${chatParitySummary.actualTemplatePixelSuspect}/${chatParitySummary.normalizedCompared} normalized fixtures${formatChatSuspectSuffix(chatParitySummary, 'foreground pixels')}; the DOM sidecar has rolltemplate text but the PNG likely captured map/grid/background, so recapture from a visible text chat panel before tuning ChatPane CSS`);
    }
    const rendererMismatchFixtures = (chatParitySummary.fixturesWithMismatch ?? [])
      .filter((fixture) => !chatStructureMismatchIds.has(fixture.fixtureId));
    if (rendererMismatchFixtures.length > 0) {
      const maxAligned = rendererMismatchFixtures.reduce((max, fixture) => Math.max(max, Number(fixture.bestAlignedMismatchPct ?? 0)), 0);
      const maxRaw = rendererMismatchFixtures.reduce((max, fixture) => Math.max(max, Number(fixture.mismatchPct ?? 0)), 0);
      blockers.push(`actual Roll20 rolltemplate crop differs from local ChatPane template for ${rendererMismatchFixtures.length}/${chatParitySummary.normalizedCompared} same-structure geometry-authoritative normalized fixtures after small-offset alignment; same-structure max aligned mismatch ${num(maxAligned)}% (raw ${num(maxRaw)}%)`);
    }
  }
  if (chatCurrentMetrics.missing > 0) {
    const missingFields = chatCurrentMetrics.missingFieldsByFixture
      ?.map((item) => `${item.fixtureId}: ${item.missing.join(', ')}`)
      .join('; ');
    blockers.push(`actual Roll20 chat sidecars lack current row/typography metrics for ${chatCurrentMetrics.missing}/${chatCurrentMetrics.total} fixtures (${chatCurrentMetrics.missingFixtures.join(', ')}); ${missingFields ? `missing fields: ${missingFields}; ` : ''}run diagnose:roll20-chat-current-metrics and plan:roll20-chat-capture with --require-current-metrics before tuning ChatPane CSS`);
  }
  if (!chatStructureSummary) {
    warnings.push('chat structure compare has not been run; run diagnose:roll20-chat-structure before using chat pixel mismatch as renderer CSS evidence');
  } else {
    if (chatStructureSummary.mismatches > 0) {
      blockers.push(`actual Roll20 chat structure differs from local ChatPane smoke for ${chatStructureSummary.mismatchFixtures.map(formatChatStructureMismatch).join('; ')}; recapture the same rolltemplate before treating pixel mismatch as renderer CSS`);
    }
    positiveFindings.push(`chat structure compare: status=${chatStructureSummary.status}, mismatches=${chatStructureSummary.mismatches}/${chatStructureSummary.totalFixtures}, counts=${formatFindingCounts(chatStructureSummary.counts)}`);
    for (const fixture of chatStructureSummary.mismatchFixtures) {
      positiveFindings.push(`${fixture.fixtureId} chat structure=${fixture.status}, local=${fixture.localTemplate || 'n/a'}, actual=${fixture.actualTemplate || 'n/a'}, rows=${fixture.localRows}/${fixture.actualRows}, next=${fixture.nextAction}`);
    }
  }
  if (!chatCandidateSummary) {
    warnings.push('chat candidate comparison has not been run; run diagnose:roll20-chat-candidates before promoting any ChatPane renderer candidate');
  } else {
    if (chatCandidateSummary.regressingCandidates.length) {
      blockers.push(`chat candidate comparison rejects fixture-regressing candidates: ${chatCandidateSummary.regressingCandidates.map(formatChatCandidate).join('; ')}`);
    }
    if (unresolvedStyleProofCandidates.length) {
      blockers.push(`chat candidate comparison has numerically promising candidates without actual Roll20 style proof: ${unresolvedStyleProofCandidates.map(formatChatCandidate).join('; ')}`);
    }
  }
  if (!chatCandidateStyleProofSummary) {
    warnings.push('chat candidate style-proof diagnostic has not been run; run diagnose:roll20-chat-candidate-style before promoting any ChatPane renderer candidate');
  } else {
    if (chatCandidateStyleProofSummary.rejectedCandidates.length) {
      blockers.push(`actual Roll20 computed styles contradict promising ChatPane candidates: ${chatCandidateStyleProofSummary.rejectedCandidates.map(formatChatStyleProofCandidate).join('; ')}`);
    }
    if (chatCandidateStyleProofSummary.needsNewSidecarCandidates.length) {
      blockers.push(`promising ChatPane candidates need additional actual Roll20 sidecar fields before promotion: ${chatCandidateStyleProofSummary.needsNewSidecarCandidates.map(formatChatStyleProofCandidate).join('; ')}`);
    }
    if (chatCandidateStyleProofSummary.styleCompatibleCandidates.length) {
      positiveFindings.push(`actual Roll20 computed styles support these diagnostic ChatPane candidates, pending pixel parity review: ${chatCandidateStyleProofSummary.styleCompatibleCandidates.map(formatChatStyleProofCandidate).join('; ')}`);
    }
  }

  const compared = fixtures.filter((fixture) => fixture.bestCandidate);
  const reliableCompared = fixtures
    .map((fixture) => ({ fixture, candidate: reliableRendererCandidate(fixture) }))
    .filter((item) => item.candidate);
  const missingFullRootCandidates = fixtures.filter((fixture) => !fixture.bestCandidate);
  if (missingFullRootCandidates.length) {
    blockers.push(`missing full-root candidate comparison for ${missingFullRootCandidates.map(formatMissingFullRoot).join('; ')}`);
  }
  if (reliableCompared.length < 3) {
    blockers.push(`reliable cross-fixture renderer evidence too small: ${reliableCompared.length}/${fixtures.length} fixtures have full-root candidates without root-cutoff risk`);
  }

  const patchFamilies = new Map();
  for (const { fixture, candidate } of reliableCompared) {
    const family = patchFamily(candidate?.patch);
    if (!patchFamilies.has(family)) patchFamilies.set(family, []);
    patchFamilies.get(family).push(fixture.fixtureId);
  }
  if (patchFamilies.size > 1) {
    blockers.push(`best diagnostic patch is not uniform across fixtures: ${[...patchFamilies.entries()].map(([patch, ids]) => `${patch}=>${ids.join(',')}`).join('; ')}`);
  }
  if (inputFlowSummary?.globalModelSafe === false && inputFlowSummary.blockGlobalModelFixtures.length) {
    warnings.push(`input-flow renderer model is not global-safe: apply candidates ${inputFlowSummary.applyCandidateFixtures.join(', ') || 'none'}; blocked by ${inputFlowSummary.blockGlobalModelFixtures.join(', ')}`);
  }
  if (inputFlowSummary?.modelRollout?.publicUiDecision === 'DO_NOT_EXPOSE') {
    warnings.push(`input-flow renderer model rollout policy is ${inputFlowSummary.modelRollout.globalDecision}; public UI decision is ${inputFlowSummary.modelRollout.publicUiDecision}`);
  }

  const highRootCutoffRisk = fixtures.filter((fixture) => fixture.rootCutoff?.risk === 'HIGH');
  const supersededRootCutoffRisk = highRootCutoffRisk.filter((fixture) => reliableRendererCandidate(fixture)?.evidenceSource === 'scroll-metrics-source');
  const unresolvedRootCutoffRisk = highRootCutoffRisk.filter((fixture) => reliableRendererCandidate(fixture)?.evidenceSource !== 'scroll-metrics-source');
  if (unresolvedRootCutoffRisk.length) {
    blockers.push(`trusted stitched root height disagrees with live sidecar root for ${unresolvedRootCutoffRisk.map((fixture) => `${fixture.fixtureId} delta=${num(fixture.rootCutoff.heightDelta)}px`).join(', ')}`);
  }

  for (const fixture of compared) {
    positiveFindings.push(`${fixture.fixtureId} best diagnostic candidate ${fixture.bestCandidate.id} at ${fixture.bestCandidate.mismatchPct}% with root delta ${num(fixture.bestCandidate.rootHeightDelta)}px`);
  }
  for (const fixture of compared.filter((item) => item.rootCutoff?.risk === 'HIGH')) {
    warnings.push(`${fixture.fixtureId} trusted full-root candidate result is excluded from reliable patch-family comparison because root-cutoff risk is HIGH.`);
  }
  for (const fixture of supersededRootCutoffRisk) {
    warnings.push(`${fixture.fixtureId} root cutoff risk is superseded for renderer-candidate comparison by qualified scroll-metrics source evidence, but it still blocks any claim based on the older stitched full-root screenshot.`);
  }
  for (const { fixture, candidate } of reliableCompared.filter((item) => item.candidate?.evidenceSource === 'scroll-metrics-source')) {
    warnings.push(`${fixture.fixtureId} uses scroll-metrics source candidate for reliable patch-family comparison: root delta ${num(candidate.rootHeightDelta)}px, panelY=${num(candidate.statePanelYDelta)}px, panelH=${num(candidate.statePanelHeightDelta)}px.`);
  }
  for (const fixture of fixtures.filter((item) => item.diagnosticBestCandidate && !item.bestCandidate)) {
    warnings.push(`${fixture.fixtureId} has diagnostic-only full-root comparison ${fixture.diagnosticBestCandidate.id} at ${fixture.diagnosticBestCandidate.mismatchPct}% with root delta ${num(fixture.diagnosticBestCandidate.rootHeightDelta)}px; this must not count as trusted renderer evidence`);
  }
  for (const fixture of fixtures.filter((item) => item.scrollMetricsComparison?.diagnosticBestCandidate)) {
    const best = fixture.scrollMetricsComparison.diagnosticBestCandidate;
    const closest = fixture.scrollMetricsComparison.closestRootHeightCandidate;
    const source = fixture.scrollMetricsComparison.sourceCandidate;
    const panels = fixture.scrollMetricsComparison.statePanelGeometry;
    warnings.push(`${fixture.fixtureId} scroll-metrics diagnostic uses actual ${fmtSize(fixture.scrollMetricsComparison.actualSize)}; pixel best ${best.id} at ${best.mismatchPct}% has root delta ${num(best.rootHeightDelta)}px${closest ? `, while height closest ${closest.id} has root delta ${num(closest.rootHeightDelta)}px` : ''}${source ? `; sandbox source root delta ${num(source.rootHeightDelta)}px, panelY=${num(source.statePanelYDelta)}px, panelH=${num(source.statePanelHeightDelta)}px` : ''}${panels ? `; chosen state panels compared ${panels.compared}/${panels.actualCount}, maxYDelta=${num(panels.maxAbsYDelta)}px, maxHeightDelta=${num(panels.maxAbsHeightDelta)}px` : ''}. This supersedes cutoff-prone 9168px-only conclusions but is still diagnostic-only.`);
  }

  const matchedState = fixtures.filter((fixture) => fixture.stateVisibility?.matchedLocalExpected === true);
  if (matchedState.length) {
    positiveFindings.push(`local Sandbox expected panel visibility matches actual sampled panels for ${matchedState.map((fixture) => fixture.fixtureId).join(', ')}`);
  }
  const attrClassVisibilityFindings = fixtures.filter((fixture) => fixture.attrClassVisibility?.selectorMismatchCount > 0 || fixture.attrClassVisibility?.checkedVisibleContradiction);
  for (const fixture of attrClassVisibilityFindings) {
    positiveFindings.push(`${fixture.fixtureId} attr_class visibility diagnostic: checked=${fixture.attrClassVisibility.checkedValues.join(',') || 'none'}, visiblePanels=${fixture.attrClassVisibility.visiblePanelCount ?? 'unknown'}, selectorMismatch=${fixture.attrClassVisibility.selectorMismatchCount}`);
  }
  const attrClassGeometryFindings = fixtures.filter((fixture) => fixture.attrClassGeometry?.intersectingCount != null);
  for (const fixture of attrClassGeometryFindings) {
    positiveFindings.push(`${fixture.fixtureId} attr_class panel geometry: actualH=${fixture.attrClassGeometry.actualRootHeight}, intersecting=${fixture.attrClassGeometry.intersectingCount}, fullyInside=${fixture.attrClassGeometry.fullyContainedCount}, closest=${fixture.attrClassGeometry.heightClosestCandidateId ?? 'unknown'}`);
  }
  for (const fixture of fixtures.filter((item) => item.rootCutoff)) {
    positiveFindings.push(`${fixture.fixtureId} root cutoff diagnostic: stitched=${fixture.rootCutoff.stitchedHeight}, sidecar=${fixture.rootCutoff.sidecarHeight}, delta=${num(fixture.rootCutoff.heightDelta)}px, risk=${fixture.rootCutoff.risk}`);
  }
  if (inputFlowSummary) {
    positiveFindings.push(`input-flow axis diagnostic: status=${inputFlowSummary.status}, applyCandidate=${inputFlowSummary.applyCandidateFixtures.length}, blockGlobalModel=${inputFlowSummary.blockGlobalModelFixtures.length}, globalSafe=${inputFlowSummary.globalModelSafe ? 'YES' : 'NO'}`);
    if (inputFlowSummary.modelRollout) {
      positiveFindings.push(`input-flow rollout policy: global=${inputFlowSummary.modelRollout.globalDecision}, publicUi=${inputFlowSummary.modelRollout.publicUiDecision}, candidates=${inputFlowSummary.modelRollout.candidateModels.join(', ') || 'none'}, blockers=${inputFlowSummary.modelRollout.blockers.join(', ') || 'none'}`);
    }
  }
  if (chatParitySummary) {
    const sameStructureMismatchCount = (chatParitySummary.fixturesWithMismatch ?? [])
      .filter((fixture) => !chatStructureMismatchIds.has(fixture.fixtureId)).length;
    positiveFindings.push(`chat parity diagnostic: normalized=${chatParitySummary.normalizedCompared}/${chatParitySummary.fixtures}, normalizedHighMismatch=${chatParitySummary.normalizedHighMismatch}, alignedHighMismatch=${chatParitySummary.alignedHighMismatch}, authoritativeNormalizedHighMismatch=${chatParitySummary.authoritativeNormalizedHighMismatch}, sameStructureAuthoritativeMismatch=${sameStructureMismatchCount}, structureExcluded=${chatStructureMismatchIds.size}, actualCropGeometrySuspect=${chatParitySummary.actualCropGeometrySuspect}, actualTemplatePixelSuspect=${chatParitySummary.actualTemplatePixelSuspect}, needsNormalizedCapture=${chatParitySummary.needsNormalizedCapture}, currentMetricMissing=${chatCurrentMetrics.missing}/${chatCurrentMetrics.total}, actualChatCssInactive=${chatParitySummary.actualChatCssInactive}, actualChatCssScopedMismatch=${chatParitySummary.actualChatCssScopedMismatch}, actualCaptureScaleSuspect=${chatParitySummary.actualCaptureScaleSuspect}, authoritativeMaxAlignedMismatch=${chatParitySummary.authoritativeMaxAlignedMismatchPct}%, maxAlignedMismatchIncludingSuspects=${chatParitySummary.maxAlignedMismatchPct}%`);
  }
  if (!chatStyleSummary) {
    warnings.push('chat style/context diagnostic has not been run; run diagnose:roll20-chat-style before promoting ChatPane shell/template CSS');
  } else {
    positiveFindings.push(`chat style context diagnostic: compared=${chatStyleSummary.compared}/${chatStyleSummary.fixtures}, findings=${formatFindingCounts(chatStyleSummary.findingCounts)}, tableWidthDeltas=${formatFixtureDeltas(chatStyleSummary.tableWidthDeltas)}, rootWidthDeltas=${formatFixtureDeltas(chatStyleSummary.rootWidthDeltas)}`);
    if (chatStyleSummary.conflictingTableWidthDirection) {
      blockers.push(`actual Roll20 chat table width deltas conflict across fixtures (${formatFixtureDeltas(chatStyleSummary.tableWidthDeltas)}); do not promote a single ChatPane width/padding patch without a narrower renderer model`);
    }
  }
  if (!chatRendererPolicySummary) {
    warnings.push('chat renderer rollout policy has not been run; run diagnose:roll20-chat-renderer-policy before exposing or promoting any ChatPane renderer model');
  } else {
    positiveFindings.push(`chat renderer rollout policy: global=${chatRendererPolicySummary.globalDecision}, publicUi=${chatRendererPolicySummary.publicUiDecision}, split=${chatRendererPolicySummary.splitDecisions ? 'YES' : 'NO'}, highMismatch=${chatRendererPolicySummary.highMismatch}, globalSafeCandidates=${chatRendererPolicySummary.globalSafeCandidates.join(', ') || 'none'}`);
    if (chatRendererPolicySummary.globalDecision !== 'READY_FOR_REVIEW_NOT_AUTOMATIC') {
      blockers.push(`chat renderer rollout policy holds global ChatPane patch: ${chatRendererPolicySummary.globalBlockers.join('; ') || chatRendererPolicySummary.globalDecision}`);
    }
  }
  if (!chatResidualSummary) {
    warnings.push('chat residual diagnostics have not been run; run diagnose:roll20-chat-residual before trying another chat CSS candidate');
  } else {
    positiveFindings.push(`chat residual diagnostics: status=${chatResidualSummary.status}, highMismatch=${chatResidualSummary.highMismatch}/${chatResidualSummary.totalFixtures}, axes=${formatFindingCounts(chatResidualSummary.primaryAxes)}`);
    for (const fixture of chatResidualSummary.highMismatchFixtures) {
      positiveFindings.push(`${fixture.fixtureId} chat residual axis=${fixture.primaryResidualAxis}, next=${fixture.nextDiagnostic}`);
    }
  }
  if (!chatMaskStrategySummary) {
    warnings.push('chat mask strategy has not been run; run diagnose:roll20-chat-mask-strategy before trying another chat paint/crop candidate');
  } else {
    positiveFindings.push(`chat mask strategy: status=${chatMaskStrategySummary.status}, highMismatch=${chatMaskStrategySummary.highMismatch}/${chatMaskStrategySummary.totalFixtures}, decisions=${formatFindingCounts(chatMaskStrategySummary.decisions)}`);
    for (const fixture of chatMaskStrategySummary.highMismatchFixtures) {
      positiveFindings.push(`${fixture.fixtureId} chat mask decision=${fixture.strategyDecision}, next=${fixture.nextAction}`);
    }
  }
  if (!chatShellGeometrySummary) {
    warnings.push('chat shell geometry has not been run; run diagnose:roll20-chat-shell-geometry before changing ChatPane shell, crop, or width behavior');
  } else {
    positiveFindings.push(`chat shell geometry: status=${chatShellGeometrySummary.status}, compared=${chatShellGeometrySummary.compared}/${chatShellGeometrySummary.totalFixtures}, decisions=${formatFindingCounts(chatShellGeometrySummary.decisions)}`);
    for (const fixture of chatShellGeometrySummary.modelNeededFixtures) {
      positiveFindings.push(`${fixture.fixtureId} chat shell decision=${fixture.shellDecision}, templateDelta=${num(fixture.templateWidthDelta)}/${num(fixture.templateHeightDelta)}px, tableOffsetDelta=${num(fixture.tableOffsetDeltaX)}/${num(fixture.tableOffsetDeltaY)}px, firstCellDelta=${num(fixture.firstCellWidthDelta)}px, next=${fixture.nextAction}`);
    }
  }
  if (!chatFontCellSummary) {
    warnings.push('chat font/cell model has not been run; run diagnose:roll20-chat-font-cell before changing ChatPane typography or cell allocation');
  } else {
    positiveFindings.push(`chat font/cell model: status=${chatFontCellSummary.status}, actionable=${chatFontCellSummary.actionable}/${chatFontCellSummary.totalFixtures}, decisions=${formatFindingCounts(chatFontCellSummary.decisions)}`);
    for (const fixture of chatFontCellSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} font/cell decision=${fixture.modelDecision}, cellDelta=${num(fixture.cellWidthDelta)}px, fontDelta=${num(fixture.fontSizeDelta)}px, templateTypography=${fixture.typographyCandidateDeltaLabel || 'n/a'} ${fixture.typographyCandidateRisk || ''}, cellMetrics=${fixture.cellMetricsCandidateDeltaLabel || 'n/a'} ${fixture.cellMetricsCandidateRisk || ''}, next=${fixture.nextAction}`);
    }
  }
  if (!chatWidthModelSummary) {
    warnings.push('chat width model has not been run; run diagnose:roll20-chat-width before changing ChatPane width, padding, or overflow behavior');
  } else {
    positiveFindings.push(`chat width model: status=${chatWidthModelSummary.status}, actionable=${chatWidthModelSummary.actionable}/${chatWidthModelSummary.totalFixtures}, decisions=${formatFindingCounts(chatWidthModelSummary.decisions)}`);
    for (const fixture of chatWidthModelSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} width decision=${fixture.widthDecision}, actualTableCrop=${num(fixture.actualTableVsCropRatio)}x, tableDelta=${num(fixture.tableWidthDelta)}px, tableToCropDelta=${num(fixture.tableToCropDelta)}px, next=${fixture.nextAction}`);
    }
  }
  if (chatMessageShellModelSummary) {
    positiveFindings.push(`chat message shell model: status=${chatMessageShellModelSummary.status}, actionable=${chatMessageShellModelSummary.actionable}/${chatMessageShellModelSummary.totalFixtures}, decisions=${formatFindingCounts(chatMessageShellModelSummary.decisions)}`);
    for (const fixture of chatMessageShellModelSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} message shell=${fixture.messageShellDecision}, actual=${fixture.actualMessageShellModel || 'n/a'}, messageDelta=${fmtPx(fixture.messageWidthDelta)}, contentDelta=${fmtPx(fixture.contentWidthDelta)}, gutterDelta=${fmtPx(fixture.chatRightGutterDelta)}, next=${fixture.nextAction}`);
    }
  }
  if (chatTableWidthBudgetSummary) {
    positiveFindings.push(`chat table width budget: status=${chatTableWidthBudgetSummary.status}, actionable=${chatTableWidthBudgetSummary.actionable}/${chatTableWidthBudgetSummary.totalFixtures}, decisions=${formatFindingCounts(chatTableWidthBudgetSummary.decisions)}`);
    for (const fixture of chatTableWidthBudgetSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} table budget=${fixture.budgetDecision}, tableDelta=${fmtPx(fixture.tableWidthDelta)}, textDelta=${fmtPx(fixture.textMeasureTableDelta)}, residual=${fmtPx(fixture.textResidual)}, bestCandidate=${fixture.bestCandidateName || 'none'}, next=${fixture.nextAction}`);
    }
  }
  if (chatTableIntrinsicProbeSummary) {
    positiveFindings.push(`chat table intrinsic probe: status=${chatTableIntrinsicProbeSummary.status}, actionable=${chatTableIntrinsicProbeSummary.actionable}/${chatTableIntrinsicProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatTableIntrinsicProbeSummary.decisions)}`);
    for (const fixture of chatTableIntrinsicProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} intrinsic probe=${fixture.probeDecision}, rootDelta=${fmtPx(fixture.rootWidthDelta)}, tableDelta=${fmtPx(fixture.tableWidthDelta)}, scrollDelta=${fmtPx(fixture.tableScrollWidthDelta)}, rowSpread=${fmtPx(fixture.rowWidthDeltaSpread)}, topOffset=${fmtPx(fixture.maxAbsTopDelta)}, next=${fixture.nextAction}`);
    }
  }
  if (chatOverflowCropProbeSummary) {
    positiveFindings.push(`chat overflow/crop probe: status=${chatOverflowCropProbeSummary.status}, actionable=${chatOverflowCropProbeSummary.actionable}/${chatOverflowCropProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatOverflowCropProbeSummary.decisions)}`);
    for (const fixture of chatOverflowCropProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} overflow/crop=${fixture.decision}, rootDelta=${fmtPx(fixture.rootWidthDelta)}, tableDelta=${fmtPx(fixture.tableWidthDelta)}, overflowDelta=${fmtPx(fixture.tableOverflowDelta)}, tableToCropDelta=${num(fixture.tableToCropRatioDelta)}, topOffset=${fmtPx(fixture.maxAbsTopDelta)}, next=${fixture.nextAction}`);
    }
  }
  if (!chatIntrinsicWidthModelSummary) {
    warnings.push('chat intrinsic width model has not been run; run diagnose:roll20-chat-intrinsic-width before changing overflowed rolltemplate table sizing');
  } else {
    positiveFindings.push(`chat intrinsic width model: status=${chatIntrinsicWidthModelSummary.status}, actionable=${chatIntrinsicWidthModelSummary.actionable}/${chatIntrinsicWidthModelSummary.totalFixtures}, decisions=${formatFindingCounts(chatIntrinsicWidthModelSummary.decisions)}, transformContradicted=${chatIntrinsicWidthModelSummary.transformContradicted.join(', ') || 'none'}`);
    for (const fixture of chatIntrinsicWidthModelSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} intrinsic decision=${fixture.intrinsicDecision}, constraint=${fixture.constraintDecision || 'n/a'}, tableDelta=${fmtPx(fixture.tableWidthDelta)}, scrollDelta=${fmtPx(fixture.tableScrollWidthDelta)}, overflowDelta=${fmtPx(fixture.overflowDelta)}, colDelta=${num(fixture.columnCountDelta)}, longTokenDelta=${num(fixture.longestTokenLengthDelta)}, rowSpread=${fmtPx(fixture.rowWidthDeltaSpread)}, maxCellDelta=${fmtPx(fixture.maxAbsCellWidthDelta)}, firstCellDelta=${fmtPx(fixture.firstCellWidthDelta)}, fontDelta=${fmtPx(fixture.fontSizeDelta)}, letterDelta=${fmtPx(fixture.letterSpacingDelta)}, borderSpacingDelta=${fmtPx(fixture.borderSpacingXDelta)}, transformContradicted=${fixture.transformContradicted ? 'YES' : 'NO'}, next=${fixture.nextAction}`);
    }
  }
  if (!chatFontGlyphModelSummary) {
    warnings.push('chat font/glyph model has not been run; run diagnose:roll20-chat-font-glyph before trying another font, typography, or text-width candidate');
  } else {
    positiveFindings.push(`chat font/glyph model: status=${chatFontGlyphModelSummary.status}, actionable=${chatFontGlyphModelSummary.actionable}/${chatFontGlyphModelSummary.totalFixtures}, textMeasureMissing=${chatFontGlyphModelSummary.textMeasureMissing}, decisions=${formatFindingCounts(chatFontGlyphModelSummary.decisions)}`);
    if (chatFontGlyphModelSummary.textMeasureMissing > 0) {
      blockers.push(`chat font/glyph model needs textMeasureEvidence recapture for ${chatFontGlyphModelSummary.actionableFixtures.filter((fixture) => fixture.textMeasureMissing).map((fixture) => fixture.fixtureId).join(', ') || `${chatFontGlyphModelSummary.textMeasureMissing} fixture(s)`}; recapture actual Roll20 chat DOM sidecars before another ChatPane text-width candidate`);
    }
    for (const fixture of chatFontGlyphModelSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} font/glyph decision=${fixture.glyphDecision}, textWidthModel=${fixture.textWidthDecision || 'n/a'}, tableDelta=${num(fixture.tableWidthDelta)}px, tableTextResidual=${num(fixture.tableTextResidual)}px, textMeasure=${fixture.textMeasureStatus || 'n/a'} samples=${fixture.textMeasureComparedSamples}, meanTextWidthDelta=${num(fixture.textMeasureMeanAbsWidthDelta)}px, fontAvailabilityChanged=${fixture.fontAvailabilityChanged ? 'YES' : 'NO'}, tableFontChanged=${fixture.tableFontFamilyChanged ? 'YES' : 'NO'}, fontCandidatesRejected=${fixture.fontCandidatesRejected ? 'YES' : 'NO'}, next=${fixture.nextAction}`);
    }
  }
  if (chatFontIntrinsicProbeSummary) {
    positiveFindings.push(`chat font/intrinsic probe: status=${chatFontIntrinsicProbeSummary.status}, actionable=${chatFontIntrinsicProbeSummary.actionable}/${chatFontIntrinsicProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatFontIntrinsicProbeSummary.decisions)}`);
    for (const fixture of chatFontIntrinsicProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} font/intrinsic=${fixture.decision}, tableDelta=${fmtPx(fixture.tableWidthDelta)}, textDelta=${fmtPx(fixture.textMeasureTableDelta)}, residual=${fmtPx(fixture.tableTextResidual)}, fontAvailabilityChanged=${fixture.fontAvailabilityChanged ? 'YES' : 'NO'}, tableFontChanged=${fixture.tableFontFamilyChanged ? 'YES' : 'NO'}, widthOverride=${fixture.widthOverrideGain}, next=${fixture.nextAction}`);
    }
  }
  if (chatRowPaintSourceProbeSummary) {
    positiveFindings.push(`chat row/paint/source probe: status=${chatRowPaintSourceProbeSummary.status}, actionable=${chatRowPaintSourceProbeSummary.actionable}/${chatRowPaintSourceProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatRowPaintSourceProbeSummary.decisions)}`);
    for (const fixture of chatRowPaintSourceProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} row/paint/source=${fixture.decision}, row=${fixture.rowDecision || 'n/a'}, paint=${fixture.paintGainLabel || 'n/a'}, style=${fixture.paintStyleStatus || 'n/a'}, source=${fixture.sourceOrderDecision || 'n/a'}, next=${fixture.nextAction}`);
    }
  }
  if (chatRowRasterProbeSummary) {
    positiveFindings.push(`chat row raster probe: status=${chatRowRasterProbeSummary.status}, actionable=${chatRowRasterProbeSummary.actionable}/${chatRowRasterProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatRowRasterProbeSummary.decisions)}`);
    for (const fixture of chatRowRasterProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} row raster=${fixture.decision}, rowWeighted=${fixture.rowWeightedMismatchPct || 'n/a'}, worstRow=${fixture.worstRowIndex ?? 'n/a'} ${fixture.worstRowMismatchPct || 'n/a'}, lumaDelta=${num(fixture.worstRowSignedLumaDelta)}, next=${fixture.nextAction}`);
    }
  }
  if (chatRowRasterCandidatesSummary) {
    positiveFindings.push(`chat row raster candidate comparison: compared=${chatRowRasterCandidatesSummary.compared}/${chatRowRasterCandidatesSummary.totalCandidates}, rejected=${chatRowRasterCandidatesSummary.rejected}, noMeaningfulGain=${chatRowRasterCandidatesSummary.noMeaningfulGain}`);
    for (const candidate of chatRowRasterCandidatesSummary.rejectedCandidates) {
      positiveFindings.push(`${candidate.name} row raster rejected: risk=${candidate.rowRasterRisk}, aw2eWeightedDelta=${num(candidate.aw2eRowWeightedDeltaPct)}, aw2eWorstDelta=${num(candidate.aw2eWorstRowDeltaPct)}, yshyWeightedDelta=${num(candidate.yshyRowWeightedDeltaPct)}, yshyWorstDelta=${num(candidate.yshyWorstRowDeltaPct)}`);
    }
  }
  if (chatRowCompositingProbeSummary) {
    positiveFindings.push(`chat row compositing probe: status=${chatRowCompositingProbeSummary.status}, actionable=${chatRowCompositingProbeSummary.actionable}/${chatRowCompositingProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatRowCompositingProbeSummary.decisions)}`);
    for (const fixture of chatRowCompositingProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} compositing=${fixture.decision}, weighted=${fixture.rowWeightedMismatchPct || 'n/a'}, lumaCorrected=${fixture.lumaCorrectedMismatchPct || 'n/a'}, gain=${fmtSigned(fixture.lumaCorrectionGainPct)}, edge=${fixture.edgeMismatchSharePct || 'n/a'}, flat=${fixture.flatPaintMismatchSharePct || 'n/a'}, darker=${fixture.localDarkerMismatchSharePct || 'n/a'}, next=${fixture.nextAction}`);
    }
  }
  if (chatBackgroundSourceProbeSummary) {
    positiveFindings.push(`chat background/source probe: status=${chatBackgroundSourceProbeSummary.status}, actionable=${chatBackgroundSourceProbeSummary.actionable}/${chatBackgroundSourceProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatBackgroundSourceProbeSummary.decisions)}`);
    for (const fixture of chatBackgroundSourceProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} background/source=${fixture.decision}, bg=${fixture.backgroundStyleDecision || 'n/a'}, widthDelta=${fmtPx(fixture.tableWidthDelta)}, lumaGain=${fmtSigned(fixture.lumaCorrectionGainPct)}, bgSizeRisk=${fixture.backgroundSizeCandidateRisk || 'n/a'}, next=${fixture.nextAction}`);
    }
  }
  if (chatBackgroundRasterModelProbeSummary) {
    positiveFindings.push(`chat background raster model probe: status=${chatBackgroundRasterModelProbeSummary.status}, actionable=${chatBackgroundRasterModelProbeSummary.actionable}/${chatBackgroundRasterModelProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatBackgroundRasterModelProbeSummary.decisions)}`);
    for (const fixture of chatBackgroundRasterModelProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} background raster=${fixture.decision}, source=${fixture.backgroundSourceDecision || 'n/a'}, row=${fixture.rowWeightedMismatchPct || 'n/a'}, lumaGain=${fmtSigned(fixture.lumaCorrectionGainPct)}, bgSizeRisk=${fixture.backgroundSizeRisk || 'n/a'}, width=${fixture.widthExperiment || 'n/a'}, next=${fixture.nextAction}`);
    }
  }
  if (chatBackgroundAssetProbeSummary) {
    positiveFindings.push(`chat background asset probe: status=${chatBackgroundAssetProbeSummary.status}, actionable=${chatBackgroundAssetProbeSummary.actionable}/${chatBackgroundAssetProbeSummary.totalFixtures}, decisions=${formatFindingCounts(chatBackgroundAssetProbeSummary.decisions)}`);
    for (const fixture of chatBackgroundAssetProbeSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} background asset=${fixture.decision}, hashes=${fixture.hashesMatch ? 'match' : 'differ'}, local=${fixture.localSummary || 'n/a'}, actual=${fixture.actualSummary || 'n/a'}, source=${fixture.sourceSummary || 'n/a'}, next=${fixture.nextAction}`);
    }
  }
  if (!chatAssetPreservationPlanSummary && chatBackgroundAssetProbeSummary?.actionableFixtures.length) {
    warnings.push(`chat asset preservation plan has not been run; run corepack pnpm run plan:roll20-chat-assets -- ${path.relative(process.cwd(), activeRunDir)} before judging background-image chat mismatches as renderer CSS`);
  } else if (chatAssetPreservationPlanSummary) {
    positiveFindings.push(`chat asset preservation plan: action=${chatAssetPreservationPlanSummary.rendererAction}, blockers=${chatAssetPreservationPlanSummary.blockers}, requirements=${chatAssetPreservationPlanSummary.productRequirements.map((item) => `${item.id}:${item.implementationStatus}`).join(', ') || 'none'}`);
    for (const fixture of chatAssetPreservationPlanSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} asset preservation=${fixture.decision}, policy=${fixture.rendererPolicy}, next=${fixture.nextAction}`);
    }
    if (chatAssetPreservationPlanSummary.rendererAction === 'HOLD_RENDERER_FOR_ASSET_POLICY' || chatAssetPreservationPlanSummary.blockers > 0) {
      blockers.push(`chat asset preservation policy holds renderer CSS: ${chatAssetPreservationPlanSummary.blockerMessages.join('; ') || chatAssetPreservationPlanSummary.rendererAction}`);
    }
  }
  if (!chatRowGeometrySummary) {
    warnings.push('chat row geometry model has not been run; run diagnose:roll20-chat-rows to separate row offset, cell allocation, and table-wide width axes before another chat renderer candidate');
  } else {
    positiveFindings.push(`chat row geometry: status=${chatRowGeometrySummary.status}, compared=${chatRowGeometrySummary.compared}/${chatRowGeometrySummary.totalFixtures}, decisions=${formatFindingCounts(chatRowGeometrySummary.decisions)}`);
    for (const fixture of chatRowGeometrySummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} row geometry=${fixture.rowDecision}, topDelta=${num(fixture.maxAbsTopDelta)}px, widthDelta=${num(fixture.maxAbsWidthDelta)}px, cellDelta=${num(fixture.maxAbsCellDelta)}px, next=${fixture.nextAction}`);
    }
  }
  if (!chatWidthReconciliationSummary) {
    warnings.push('chat width reconciliation has not been run; run diagnose:roll20-chat-width-reconciliation before adding another chat width/intrinsic candidate');
  } else {
    positiveFindings.push(`chat width reconciliation: actionable=${chatWidthReconciliationSummary.actionable}/${chatWidthReconciliationSummary.totalFixtures}, decisions=${formatFindingCounts(chatWidthReconciliationSummary.decisions)}`);
    for (const fixture of chatWidthReconciliationSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} width reconciliation=${fixture.nextExperiment}, priority=${fixture.priority}, tableDelta=${fmtPx(fixture.tableWidthDelta)}, textResidual=${fmtPx(fixture.tableTextResidual)}, scrollDelta=${fmtPx(fixture.tableScrollWidthDelta)}, bestCandidate=${fixture.bestCandidateName || 'none'}, next=${fixture.nextAction}`);
    }
  }
  if (!chatCellAllocationProbeSummary) {
    warnings.push('chat cell allocation probe has not been run; run diagnose:roll20-chat-cell-allocation before promoting table/cell font, wrap, or width candidates');
  } else {
    positiveFindings.push(`chat cell allocation probe: status=${chatCellAllocationProbeSummary.status}, scenarios=${chatCellAllocationProbeSummary.scenarios}, rejected=${chatCellAllocationProbeSummary.rejectedScenarios.length}`);
    for (const fixture of chatCellAllocationProbeSummary.fixtures) {
      const defaultScenario = fixture.defaultScenario;
      if (defaultScenario) {
        positiveFindings.push(`${fixture.fixtureId} default cell allocation=${defaultScenario.allocationDecision}, tableDelta=${fmtPx(defaultScenario.tableDelta)}, maxTextCell=${fmtPx(defaultScenario.maxAbsTextCellWidthDelta)}, maxRatio=${fmtSigned(defaultScenario.maxAbsCellRatioDeltaPct)}%`);
      }
    }
    if (chatCellAllocationProbeSummary.rejectedScenarios.length) {
      blockers.push(`chat cell allocation probe rejects production-unsafe scenarios: ${chatCellAllocationProbeSummary.rejectedScenarios.map((item) => `${item.fixtureId}/${item.scenario}=${item.allocationDecision} tableDelta=${fmtPx(item.tableDelta)} maxTextCell=${fmtPx(item.maxAbsTextCellWidthDelta)}`).join('; ')}`);
    }
  }
  if (!chatTemplateScopeGateSummary) {
    warnings.push(`chat template scope gate has not been run; run corepack pnpm run gate:roll20-chat-template-scope -- ${path.relative(process.cwd(), activeRunDir)} before promoting a global ChatPane renderer patch`);
  } else {
    positiveFindings.push(`chat template scope gate: action=${chatTemplateScopeGateSummary.action}, highModels=${chatTemplateScopeGateSummary.highModels.join(', ') || 'none'}, highScopes=${chatTemplateScopeGateSummary.highScopes.join(', ') || 'none'}, blockers=${chatTemplateScopeGateSummary.blockers}`);
    for (const fixture of chatTemplateScopeGateSummary.fixtures.filter((item) => item.priority === 'P0')) {
      positiveFindings.push(`${fixture.fixtureId} template scope=${fixture.requiredScope}, model=${fixture.requiredModel}, ready=${fixture.promotionReady ? 'YES' : 'NO'}, best=${fixture.bestCandidateName || 'none'}, next=${fixture.nextAction}`);
    }
    if (chatTemplateScopeGateSummary.action === 'HOLD_GLOBAL_CHAT_RENDERER_PATCH' || chatTemplateScopeGateSummary.blockers > 0) {
      blockers.push(`chat template scope gate holds global ChatPane renderer CSS: ${chatTemplateScopeGateSummary.blockerMessages.join('; ') || chatTemplateScopeGateSummary.action}`);
    }
  }

  const action = blockers.length
    ? 'HOLD_PRODUCTION_RENDERER_PATCH'
    : warnings.length
      ? 'EXPERIMENT_ONLY'
      : 'READY_FOR_REVIEWED_RENDERER_PATCH';

  const nextActions = blockers.length ? [] : [
    'Patch the smallest generic renderer behavior that matches the repeated candidate pattern.',
    'Rerun full-root candidate, preview/edit visual, evidence guard, lint, and build.',
  ];
  if (missingTrustedRoot.length) {
    nextActions.push(`Capture trusted generated-sheet root evidence for ${missingTrustedRoot.map((fixture) => fixture.fixtureId).join(', ')}.`);
  }
  if (missingChat.length) {
    nextActions.push(`Capture roll20-chat.png screenshots with fresh DOM sidecars for ${missingChat.map((fixture) => fixture.fixtureId).join(', ')}.`);
  }
  if (!chatRowGeometrySummary) {
    nextActions.push('Run corepack pnpm run diagnose:roll20-chat-rows to classify row geometry before another chat renderer candidate.');
  } else if (chatRowGeometrySummary.actionableFixtures.length) {
    nextActions.push(...chatRowGeometrySummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatWidthReconciliationSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-width-reconciliation -- ${path.relative(process.cwd(), activeRunDir)} to choose the next fixture-specific chat width experiment.`);
  } else if (chatWidthReconciliationSummary.actionableFixtures.length) {
    nextActions.push(...chatWidthReconciliationSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (chatParitySummary?.needsNormalizedCapture > 0) {
    nextActions.push('Recapture actual Roll20 chat DOM sidecars with rolltemplate rect/clip metadata for element-level chat parity comparison.');
  }
  if (chatCurrentMetrics.missing > 0) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-current-metrics -- ${path.relative(process.cwd(), activeRunDir)} and corepack pnpm run plan:roll20-chat-capture -- ${path.relative(process.cwd(), activeRunDir)} --require-current-metrics, then recapture current row/typography chat evidence for ${chatCurrentMetrics.missingFixtures.join(', ')}.`);
  }
  if (chatStructureSummary?.mismatches > 0) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-structure -- ${path.relative(process.cwd(), activeRunDir)}, then recapture same-template Roll20 chat evidence for ${chatStructureSummary.mismatchFixtures.map((fixture) => fixture.fixtureId).join(', ')} before using those pixel diffs for renderer CSS.`);
  }
  if (chatParitySummary?.authoritativeNormalizedHighMismatch > 0) {
    if (chatParitySummary.actualChatCssScopedMismatch > 0) {
      nextActions.push('Inspect Roll20 actual chat and character iframe styles for scoped/unprefixed rolltemplate CSS. If confirmed in a correctly uploaded sandbox/test room, model local ChatPane CSS using the verified Roll20 chat selector behavior instead of assuming sheet-* CSS activation.');
    } else if (chatParitySummary.actualChatCssInactive > 0) {
      nextActions.push('First recapture or prove a Roll20 chat state where user rolltemplate CSS is active. Current actual chat CSS-inactive evidence can explain large CSS-active local/actual mismatches.');
    } else if (chatParitySummary.actualCaptureScaleSuspect > 0) {
      nextActions.push(`Run corepack pnpm run plan:roll20-chat-capture -- ${path.relative(process.cwd(), activeRunDir)} to generate the focused chat recapture checklist, then recapture true PNG at clip.scale=1 for ${formatChatSuspectList(chatParitySummary, 'capture scale/format') || 'the affected normalized fixtures'} before tuning local ChatPane CSS from pixel diffs.`);
    } else if (chatParitySummary.actualCropGeometrySuspect > 0) {
      nextActions.push(`Run corepack pnpm run plan:roll20-chat-capture -- ${path.relative(process.cwd(), activeRunDir)} to generate the focused chat recapture checklist, then recapture element-bound Roll20 chat crops for ${formatChatSuspectList(chatParitySummary, 'crop geometry') || 'the affected normalized fixtures'} before tuning local ChatPane CSS from pixel diffs.`);
    } else if (chatParitySummary.actualTemplatePixelSuspect > 0) {
      nextActions.push(`Run corepack pnpm run plan:roll20-chat-capture -- ${path.relative(process.cwd(), activeRunDir)} to generate the focused chat recapture checklist, then recapture visible text-chat rolltemplate foreground for ${formatChatSuspectList(chatParitySummary, 'foreground pixels') || 'the affected normalized fixtures'} before tuning local ChatPane CSS from pixel diffs.`);
    } else {
      nextActions.push('Fix local ChatPane rolltemplate shell sizing/content to match actual Roll20 chat, then rerun rolltemplate chat smoke and diagnose:roll20-chat-parity.');
    }
  }
  if (!chatStyleSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-style -- ${path.relative(process.cwd(), activeRunDir)} before the next ChatPane CSS candidate.`);
  } else if (chatStyleSummary.conflictingTableWidthDirection) {
    nextActions.push('Use chat-style context diagnostics to explain the opposite AW2E/YSHY table-width deltas before testing another global ChatPane width, padding, or wrap patch.');
  }
  if (!chatRendererPolicySummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-renderer-policy -- ${path.relative(process.cwd(), activeRunDir)} and keep the policy output local-only.`);
  } else if (chatRendererPolicySummary.globalDecision !== 'READY_FOR_REVIEW_NOT_AUTOMATIC') {
    nextActions.push(chatRendererPolicySummary.nextAction || 'Follow the chat renderer policy before any production ChatPane renderer change.');
  }
  if (!chatResidualSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-residual -- ${path.relative(process.cwd(), activeRunDir)} before the next Les/YSHY chat renderer hypothesis.`);
  } else if (chatResidualSummary.highMismatchFixtures.length) {
    nextActions.push(...chatResidualSummary.highMismatchFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextDiagnostic}`));
  }
  if (!chatMaskStrategySummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-mask-strategy -- ${path.relative(process.cwd(), activeRunDir)} before another ChatPane paint/crop candidate.`);
  } else if (chatMaskStrategySummary.highMismatchFixtures.length) {
    nextActions.push(...chatMaskStrategySummary.highMismatchFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatShellGeometrySummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-shell-geometry -- ${path.relative(process.cwd(), activeRunDir)} before changing ChatPane shell/crop/width behavior.`);
  } else if (chatShellGeometrySummary.modelNeededFixtures.length) {
    nextActions.push(...chatShellGeometrySummary.modelNeededFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatFontCellSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-font-cell -- ${path.relative(process.cwd(), activeRunDir)} before changing ChatPane typography or cell allocation.`);
  } else if (chatFontCellSummary.actionableFixtures.length) {
    nextActions.push(...chatFontCellSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatWidthModelSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-width -- ${path.relative(process.cwd(), activeRunDir)} before changing ChatPane width, padding, or overflow behavior.`);
  } else if (chatWidthModelSummary.actionableFixtures.length) {
    nextActions.push(...chatWidthModelSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatMessageShellModelSummary && chatWidthModelSummary?.decisions?.CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-message-shell -- ${path.relative(process.cwd(), activeRunDir)} before changing message/card width.`);
  } else if (chatMessageShellModelSummary?.actionableFixtures.length) {
    nextActions.push(...chatMessageShellModelSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatTableWidthBudgetSummary && chatWidthModelSummary?.actionableFixtures?.length) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-table-width-budget -- ${path.relative(process.cwd(), activeRunDir)} before choosing the next table-width renderer candidate.`);
  } else if (chatTableWidthBudgetSummary?.actionableFixtures.length) {
    nextActions.push(...chatTableWidthBudgetSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  const needsIntrinsicProbe = chatTableWidthBudgetSummary?.actionableFixtures?.some((fixture) => /INTRINSIC|LAYOUT_CONSTRAINT/i.test(fixture.budgetDecision));
  if (!chatTableIntrinsicProbeSummary && needsIntrinsicProbe) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-table-intrinsic-probe -- ${path.relative(process.cwd(), activeRunDir)} before testing the next CoC/YSHY table intrinsic candidate.`);
  } else if (chatTableIntrinsicProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatTableIntrinsicProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  const needsOverflowCropProbe = chatTableIntrinsicProbeSummary?.actionableFixtures?.some((fixture) => /CROP|INTRINSIC/i.test(fixture.probeDecision));
  if (!chatOverflowCropProbeSummary && needsOverflowCropProbe) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-overflow-crop -- ${path.relative(process.cwd(), activeRunDir)} before testing the next CoC/YSHY overflow/crop renderer candidate.`);
  } else if (chatOverflowCropProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatOverflowCropProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatIntrinsicWidthModelSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-intrinsic-width -- ${path.relative(process.cwd(), activeRunDir)} before changing overflowed rolltemplate table sizing.`);
  } else if (chatIntrinsicWidthModelSummary.actionableFixtures.length) {
    nextActions.push(...chatIntrinsicWidthModelSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatFontGlyphModelSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-font-glyph -- ${path.relative(process.cwd(), activeRunDir)} before trying another font or text-width candidate.`);
  } else if (chatFontGlyphModelSummary.actionableFixtures.length) {
    nextActions.push(...chatFontGlyphModelSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  const needsFontIntrinsicProbe = chatFontGlyphModelSummary?.actionableFixtures?.some((fixture) => fixture.fontAvailabilityChanged || fixture.tableFontFamilyChanged || /LAYOUT_CONSTRAINT|INTRINSIC/i.test(fixture.textWidthDecision || ''));
  if (!chatFontIntrinsicProbeSummary && needsFontIntrinsicProbe) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-font-intrinsic -- ${path.relative(process.cwd(), activeRunDir)} before adding another table width or font candidate.`);
  } else if (chatFontIntrinsicProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatFontIntrinsicProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  const needsRowPaintSourceProbe =
    chatFontIntrinsicProbeSummary?.actionableFixtures?.some((fixture) => /FONT_FACE_INTRINSIC|TABLE_MIN_CONTENT|FONT_CONTEXT/i.test(fixture.decision || '')) ||
    chatWidthReconciliationSummary?.actionableFixtures?.some((fixture) => /TABLE_SCROLL_INTRINSIC|CROP_OR_PAINT/i.test(fixture.nextExperiment || '')) ||
    chatCandidateStyleProofSummary?.rejectedCandidates?.some((candidate) => candidate.name === 'paint-dim-background');
  if (!chatRowPaintSourceProbeSummary && needsRowPaintSourceProbe) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-row-paint-source -- ${path.relative(process.cwd(), activeRunDir)} before adding another YSHY/CoC paint, source-order, or table intrinsic candidate.`);
  } else if (chatRowPaintSourceProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatRowPaintSourceProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  const needsRowRasterProbe = chatRowPaintSourceProbeSummary?.actionableFixtures?.some((fixture) => /ROW_BAND_RASTER|ROW_LUMA|ROW_MASK/i.test(fixture.decision || ''));
  if (!chatRowRasterProbeSummary && needsRowRasterProbe) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-row-raster -- ${path.relative(process.cwd(), activeRunDir)} before building the next YSHY/CoC row-band renderer experiment.`);
  } else if (chatRowRasterProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatRowRasterProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (chatRowRasterProbeSummary && !chatRowRasterCandidatesSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-row-raster-candidates -- ${path.relative(process.cwd(), activeRunDir)} to compare row-raster effects without overwriting default gate evidence.`);
  } else if (chatRowRasterCandidatesSummary?.rejectedCandidates.length) {
    nextActions.push(`Keep row-raster-regressing candidates out of production consideration: ${chatRowRasterCandidatesSummary.rejectedCandidates.map((candidate) => candidate.name).join(', ')}.`);
  }
  if (chatRowRasterProbeSummary && !chatRowCompositingProbeSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-row-compositing -- ${path.relative(process.cwd(), activeRunDir)} to split row-raster mismatch into text edge, background compositing, and color/source buckets.`);
  } else if (chatRowCompositingProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatRowCompositingProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (chatRowCompositingProbeSummary && !chatBackgroundSourceProbeSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-background-source -- ${path.relative(process.cwd(), activeRunDir)} to separate matching background declarations from raster/source-context differences.`);
  } else if (chatBackgroundSourceProbeSummary && !chatBackgroundRasterModelProbeSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-background-raster -- ${path.relative(process.cwd(), activeRunDir)} to reject or route already-tested raster-only models before touching production ChatPane CSS.`);
  } else if (chatBackgroundRasterModelProbeSummary && !chatBackgroundAssetProbeSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-background-assets -- ${path.relative(process.cwd(), activeRunDir)} to compare background image bytes/proxy placeholders before browser-paint tuning.`);
  } else if (chatBackgroundAssetProbeSummary?.actionableFixtures.length && !chatAssetPreservationPlanSummary) {
    nextActions.push(`Run corepack pnpm run plan:roll20-chat-assets -- ${path.relative(process.cwd(), activeRunDir)} before deciding whether asset loss or renderer CSS owns the mismatch.`);
  } else if (chatAssetPreservationPlanSummary?.actionableFixtures.length) {
    nextActions.push(...chatAssetPreservationPlanSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  } else if (chatBackgroundAssetProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatBackgroundAssetProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  } else if (chatBackgroundRasterModelProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatBackgroundRasterModelProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  } else if (chatBackgroundSourceProbeSummary?.actionableFixtures.length) {
    nextActions.push(...chatBackgroundSourceProbeSummary.actionableFixtures.map((fixture) => `${fixture.fixtureId}: ${fixture.nextAction}`));
  }
  if (!chatCandidateSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-candidates -- ${path.relative(process.cwd(), activeRunDir)} and keep the generated candidate report local-only.`);
  } else if (unresolvedStyleProofCandidates.length) {
    nextActions.push(`For promising chat candidates (${unresolvedStyleProofCandidates.map((candidate) => candidate.name).join(', ')}), prove the same change from actual Roll20 computed styles before production CSS; otherwise keep them diagnostic-only.`);
  }
  if (!chatCandidateStyleProofSummary) {
    nextActions.push(`Run corepack pnpm run diagnose:roll20-chat-candidate-style -- ${path.relative(process.cwd(), activeRunDir)} to classify promising candidates against actual Roll20 computed styles.`);
  } else if (chatCandidateStyleProofSummary.rejectedCandidates.length || chatCandidateStyleProofSummary.needsNewSidecarCandidates.length) {
    nextActions.push(`Remove rejected ChatPane candidates from production consideration (${chatCandidateStyleProofSummary.rejectedCandidates.map((candidate) => candidate.name).join(', ') || 'none'}) and capture extra sidecar fields for ${chatCandidateStyleProofSummary.needsNewSidecarCandidates.map((candidate) => candidate.name).join(', ') || 'none'} before further CSS experiments.`);
  }
  if (missingFullRootCandidates.length) {
    const ids = missingFullRootCandidates.map((fixture) => fixture.fixtureId);
    const fixtureArg = ids.length === 1 ? ` ${ids[0]}` : '';
    nextActions.push(`Run corepack pnpm run plan:roll20-root-capture -- ${path.relative(process.cwd(), activeRunDir)}${fixtureArg}, then capture or stitch DPR-corrected full-root evidence and rerun root-stitch audit/full-root candidate smoke for ${ids.join(', ')}.`);
  }
  const largeDiagnosticRootDeltas = fixtures.filter((fixture) => {
    const delta = fixture.diagnosticBestCandidate?.rootHeightDelta;
    return typeof delta === 'number' && Math.abs(delta) > 1000;
  });
  if (largeDiagnosticRootDeltas.length) {
    nextActions.push(`Resolve large diagnostic root-height deltas before CSS work: ${largeDiagnosticRootDeltas.map((fixture) => `${fixture.fixtureId} ${num(fixture.diagnosticBestCandidate.rootHeightDelta)}px`).join(', ')}. Check whether capture coverage or Roll20 default/hidden state differs from local render.`);
  }
  if (patchFamilies.size > 1) {
    nextActions.push('Compare the differing diagnostic patch families before promoting CSS: current fixtures do not agree on one generic renderer fix.');
  }
  if (inputFlowSummary?.globalModelSafe === false) {
    nextActions.push(`Do not enable the input-flow renderer model globally. It is candidate-only for ${inputFlowSummary.applyCandidateFixtures.join(', ') || 'none'} and blocked by ${inputFlowSummary.blockGlobalModelFixtures.join(', ') || 'unknown fixtures'}.`);
  }
  if (inputFlowSummary?.modelRollout?.publicUiDecision === 'DO_NOT_EXPOSE') {
    nextActions.push('Keep roll20RendererModel out of public UI and automatic product defaults until modelRollout no longer says DO_NOT_EXPOSE.');
  }
  if (unresolvedRootCutoffRisk.length) {
    nextActions.push(`Resolve root cutoff/capture-container disagreement before production CSS: ${unresolvedRootCutoffRisk.map((fixture) => `${fixture.fixtureId} stitched=${fixture.rootCutoff.stitchedHeight} sidecar=${fixture.rootCutoff.sidecarHeight}`).join('; ')}. Capture or derive authoritative Roll20 root/container height, then rerun full-root candidates.`);
  }
  if (supersededRootCutoffRisk.length) {
    nextActions.push(`Keep old cutoff-prone stitched evidence excluded for ${supersededRootCutoffRisk.map((fixture) => fixture.fixtureId).join(', ')}; use scroll-metrics source evidence only as diagnostic renderer-candidate evidence until a fresh trusted full-root screenshot is captured.`);
  }
  const attrClassStateTargets = compared.filter((fixture) => {
    if (!fixture.attrClassValueCount) return false;
    const closest = fixture.closestRootHeightCandidate;
    if (!closest?.id) return false;
    if (fixture.bestCandidate?.id && fixture.bestCandidate.id !== closest.id) return true;
    return /attr-class-state|playbook-state/.test(closest.id);
  });
  if (attrClassStateTargets.length) {
    const missingSidecar = attrClassStateTargets.filter((fixture) => !fixture.attrClassSidecar?.exists);
    const capturedSidecar = attrClassStateTargets.filter((fixture) => fixture.attrClassSidecar?.exists);
    if (missingSidecar.length) {
      const fixtureArg = missingSidecar.length === 1 ? ` ${missingSidecar[0].fixtureId}` : '';
      nextActions.push(`Run corepack pnpm run plan:roll20-attr-class-state -- ${path.relative(process.cwd(), activeRunDir)}${fixtureArg} and capture the generated browser-side checked/value state sidecar before renderer CSS work.`);
    }
    if (capturedSidecar.length) {
      const missingVisibilityDiagnostic = capturedSidecar.filter((fixture) => !fixture.attrClassVisibility);
      if (missingVisibilityDiagnostic.length) {
        const fixtureArg = missingVisibilityDiagnostic.length === 1 ? ` ${missingVisibilityDiagnostic[0].fixtureId}` : '';
        nextActions.push(`Run corepack pnpm run diagnose:roll20-attr-class-visibility -- ${path.relative(process.cwd(), activeRunDir)}${fixtureArg} before CSS work. Captured checked state does not explain closest height, so selector prefix/state visibility must be compared.`);
      } else {
        nextActions.push(`Use attr_class visibility diagnostics before CSS work: ${capturedSidecar.map((fixture) => `${fixture.fixtureId} checked=${fixture.attrClassSidecar.checkedValues.join(',') || 'none'} visiblePanels=${fixture.attrClassVisibility?.visiblePanelCount ?? 'unknown'} selectorMismatch=${fixture.attrClassVisibility?.selectorMismatchCount ?? 0}`).join('; ')}. If checked state does not explain visible panels, model Roll20 selector prefix/default-state behavior rather than forcing more checked values.`);
      }
      const missingGeometryDiagnostic = capturedSidecar.filter((fixture) => fixture.attrClassVisibility && !fixture.attrClassGeometry);
      if (missingGeometryDiagnostic.length) {
        const fixtureArg = missingGeometryDiagnostic.length === 1 ? ` ${missingGeometryDiagnostic[0].fixtureId}` : '';
        nextActions.push(`Run corepack pnpm run diagnose:roll20-attr-class-geometry -- ${path.relative(process.cwd(), activeRunDir)}${fixtureArg} after full-root candidates. Actual-visible panel names need root-boundary/source-order geometry before renderer CSS.`);
      }
    }
  }
  if (blockers.length) {
    nextActions.push('Keep diagnostic CSS candidates out of production until trusted full-root evidence and best-patch behavior repeat across fixtures.');
  }

  return {
    action,
    blockers,
    warnings,
    positiveFindings,
    nextActions,
  };
}

function summarizeInputFlowAxis(report) {
  if (!report?.summary) return null;
  return {
    status: report.summary.status ?? 'UNKNOWN',
    compared: Number(report.summary.compared ?? 0),
    inlineBestFixtures: report.summary.inlineBestFixtures ?? [],
    sourceGeometryFixtures: report.summary.sourceGeometryFixtures ?? [],
    applyCandidateFixtures: report.summary.applyCandidateFixtures ?? [],
    blockGlobalModelFixtures: report.summary.blockGlobalModelFixtures ?? [],
    globalModelSafe: Boolean(report.summary.globalModelSafe),
    modelRollout: report.modelRollout
      ? {
          globalDecision: report.modelRollout.globalDecision ?? 'UNKNOWN',
          publicUiDecision: report.modelRollout.publicUiDecision ?? 'UNKNOWN',
          defaultModel: report.modelRollout.defaultModel ?? 'default',
          candidateModels: report.modelRollout.candidateModels ?? [],
          blockers: report.modelRollout.blockers ?? [],
        }
      : null,
  };
}

function summarizeChatStyle(report) {
  if (!report?.fixtures) return null;
  const fixtures = report.fixtures ?? [];
  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  const tableWidthDeltas = compared
    .map((fixture) => ({
      fixtureId: fixture.id,
      value: fixture.tableDelta?.width ?? null,
    }))
    .filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
  const rootWidthDeltas = compared
    .map((fixture) => ({
      fixtureId: fixture.id,
      value: fixture.rootDelta?.width ?? null,
    }))
    .filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
  const hasPositiveTableDelta = tableWidthDeltas.some((item) => item.value >= 8);
  const hasNegativeTableDelta = tableWidthDeltas.some((item) => item.value <= -8);
  return {
    fixtures: fixtures.length,
    compared: compared.length,
    missingEvidence: Number(report.summary?.missingEvidence ?? fixtures.length - compared.length),
    findingCounts: report.summary?.findingCounts ?? {},
    tableWidthDeltas,
    rootWidthDeltas,
    conflictingTableWidthDirection: hasPositiveTableDelta && hasNegativeTableDelta,
    fixturesWithFindings: compared.map((fixture) => ({
      fixtureId: fixture.id,
      findings: fixture.findings ?? [],
      rootDelta: fixture.rootDelta ?? null,
      tableDelta: fixture.tableDelta ?? null,
      rows: fixture.rows
        ? {
            localCount: fixture.rows.localCount ?? 0,
            actualCount: fixture.rows.actualCount ?? 0,
            largestHeightDeltas: (fixture.rows.largestHeightDeltas ?? []).slice(0, 3),
          }
        : null,
      topStyleDeltas: (fixture.topStyleDeltas ?? []).slice(0, 6).map((delta) => ({
        selector: delta.selector,
        key: delta.key,
        numericDelta: delta.numericDelta ?? null,
      })),
    })),
  };
}

function summarizeChatCandidates(report) {
  if (!report?.candidates) return null;
  const okCandidates = report.candidates.filter((candidate) => candidate.status === 'OK' && candidate.name !== 'default');
  const regressingCandidates = okCandidates
    .filter((candidate) => candidate.promotionRisk === 'reject-regresses-fixtures' || Number(candidate.regressedFixtures ?? 0) > 0)
    .map(summarizeChatCandidate)
    .sort(chatCandidateSort);
  const styleProofCandidates = okCandidates
    .filter((candidate) => candidate.promotionRisk === 'candidate-needs-style-proof')
    .map(summarizeChatCandidate)
    .sort(chatCandidateSort);
  const bestNumericCandidates = okCandidates
    .map(summarizeChatCandidate)
    .filter((candidate) => typeof candidate.meanAlignedDeltaPct === 'number')
    .sort((a, b) => a.meanAlignedDeltaPct - b.meanAlignedDeltaPct)
    .slice(0, 3);
  return {
    candidateCount: report.candidates.length,
    generatedAt: report.generatedAt ?? null,
    regressingCandidates,
    styleProofCandidates,
    bestNumericCandidates,
  };
}

function summarizeChatCandidateStyleProof(report) {
  if (!report?.candidates) return null;
  const candidates = report.candidates.map((candidate) => ({
    name: candidate.name,
    styleProofStatus: candidate.styleProofStatus ?? 'UNKNOWN',
    promotionRisk: candidate.promotionRisk ?? '',
    meanAlignedDeltaPct: candidate.meanAlignedDeltaPct ?? null,
    regressedFixtures: Number(candidate.regressedFixtures ?? 0),
    fixtureStatuses: (candidate.fixtures ?? []).map((fixture) => ({
      fixtureId: fixture.fixtureId,
      status: fixture.status,
      finding: fixture.finding ?? '',
    })),
  }));
  return {
    candidateCount: candidates.length,
    generatedAt: report.generatedAt ?? null,
    candidates,
    rejectedCandidates: candidates.filter((candidate) => candidate.styleProofStatus === 'REJECT_STYLE_CONTRADICTION'),
    needsNewSidecarCandidates: candidates.filter((candidate) => candidate.styleProofStatus === 'NEEDS_NEW_SIDECAR_FIELDS'),
    styleCompatibleCandidates: candidates.filter((candidate) => candidate.styleProofStatus === 'STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW'),
  };
}

function summarizeChatRendererPolicy(report) {
  if (!report?.policy) return null;
  return {
    globalDecision: report.policy.globalDecision ?? 'UNKNOWN',
    publicUiDecision: report.policy.publicUiDecision ?? 'UNKNOWN',
    defaultModel: report.policy.defaultModel ?? 'default',
    globalSafeCandidates: report.policy.globalSafeCandidates ?? [],
    globalBlockers: report.policy.globalBlockers ?? [],
    nextAction: report.policy.nextAction ?? '',
    fixtures: Number(report.summary?.fixtures ?? report.fixtures?.length ?? 0),
    compared: Number(report.summary?.compared ?? 0),
    highMismatch: Number(report.summary?.highMismatch ?? 0),
    splitDecisions: Boolean(report.summary?.splitDecisions),
    conflictingTableWidthDirection: Boolean(report.summary?.conflictingTableWidthDirection),
    fixtureDecisions: (report.fixtures ?? []).map((fixture) => ({
      fixtureId: fixture.fixtureId,
      decision: fixture.decision,
      defaultAlignedMismatchPct: fixture.defaultAlignedMismatchPct ?? '',
      tableWidthDeltaPx: fixture.tableWidthDeltaPx ?? null,
      candidateModels: (fixture.candidateModels ?? []).map((candidate) => ({
        name: candidate.name,
        risk: candidate.risk,
        fixtureAlignedDeltaPct: candidate.fixtureAlignedDeltaPct ?? null,
        styleProofStatus: candidate.styleProofStatus,
      })),
    })),
  };
}

function summarizeChatResidual(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    highMismatch: Boolean(fixture.highMismatch),
    policyDecision: fixture.policyDecision ?? '',
    primaryResidualAxis: fixture.primaryResidualAxis ?? 'UNKNOWN',
    bestAlignedMismatchPct: fixture.bestAlignedMismatchPct ?? '',
    nextDiagnostic: fixture.nextDiagnostic ?? '',
    residualSignals: fixture.residualSignals ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    highMismatch: Number(report.summary.highMismatch ?? fixtures.filter((fixture) => fixture.highMismatch).length),
    primaryAxes: report.summary.primaryAxes ?? {},
    nextDiagnostics: report.summary.nextDiagnostics ?? {},
    highMismatchFixtures: fixtures.filter((fixture) => fixture.highMismatch),
    fixtures,
  };
}

function summarizeChatMaskStrategy(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    highMismatch: Boolean(fixture.highMismatch),
    strategyDecision: fixture.strategyDecision ?? 'UNKNOWN',
    residualAxis: fixture.residualAxis ?? '',
    bestAlignedMismatchPct: fixture.bestAlignedMismatchPct ?? '',
    leftColMismatchRatioPct: fixture.bandStats?.leftColMismatchRatioPct ?? '',
    leftColMismatchSharePct: fixture.bandStats?.leftColMismatchSharePct ?? '',
    topRowMismatchSharePct: fixture.bandStats?.topRowMismatchSharePct ?? '',
    nextAction: fixture.nextAction ?? '',
    blockers: fixture.blockers ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    highMismatch: Number(report.summary.highMismatch ?? fixtures.filter((fixture) => fixture.highMismatch).length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    highMismatchFixtures: fixtures.filter((fixture) => fixture.highMismatch),
    fixtures,
  };
}

function summarizeChatShellGeometry(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => {
    const deltas = fixture.geometryDeltas ?? {};
    return {
      fixtureId: fixture.fixtureId,
      status: fixture.status ?? 'UNKNOWN',
      shellDecision: fixture.shellDecision ?? '',
      nextAction: fixture.nextAction ?? '',
      bestAlignedMismatchPct: fixture.parity?.bestAlignedMismatchPct ?? '',
      templateWidthDelta: deltas.templateWidthDelta ?? null,
      templateHeightDelta: deltas.templateHeightDelta ?? null,
      tableWidthDelta: deltas.tableWidthDelta ?? null,
      tableHeightDelta: deltas.tableHeightDelta ?? null,
      tableOffsetDeltaX: deltas.tableOffsetDelta?.[0] ?? null,
      tableOffsetDeltaY: deltas.tableOffsetDelta?.[1] ?? null,
      firstCellWidthDelta: deltas.firstCellWidthDelta ?? null,
      actualCropMargin: deltas.cropMarginActual ?? null,
      evidence: fixture.evidence ?? [],
    };
  });
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    compared: Number(report.summary.compared ?? fixtures.filter((fixture) => fixture.status === 'COMPARED').length),
    shellModelNeeded: Number(report.summary.shellModelNeeded ?? 0),
    decisions: report.summary.decisions ?? {},
    modelNeededFixtures: fixtures.filter((fixture) => fixture.status === 'COMPARED' && fixture.shellDecision !== 'SHELL_OK_OR_SECONDARY'),
    fixtures,
  };
}

function summarizeChatFontCell(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    modelDecision: fixture.modelDecision ?? 'UNKNOWN',
    shellDecision: fixture.shellDecision ?? '',
    bestAlignedMismatchPct: fixture.bestAlignedMismatchPct ?? '',
    cellWidthDelta: fixture.cellWidthDelta ?? null,
    tableWidthDelta: fixture.tableWidthDelta ?? null,
    fontSizeDelta: fixture.fontSizeDelta ?? null,
    letterSpacingChanged: Boolean(fixture.letterSpacingChanged),
    fontFamilyChanged: Boolean(fixture.fontFamilyChanged),
    typographyCandidateDeltaLabel: fixture.typographyCandidateDeltaLabel ?? '',
    typographyCandidateRisk: fixture.typographyCandidateRisk ?? '',
    cellMetricsCandidateDeltaLabel: fixture.cellMetricsCandidateDeltaLabel ?? '',
    cellMetricsCandidateRisk: fixture.cellMetricsCandidateRisk ?? '',
    nextAction: fixture.nextAction ?? '',
    signals: fixture.signals ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.modelDecision !== 'KEEP_DEFAULT_FOR_NOW').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.modelDecision !== 'KEEP_DEFAULT_FOR_NOW'),
    fixtures,
  };
}

function summarizeChatWidthModel(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    status: fixture.status ?? 'UNKNOWN',
    widthDecision: fixture.widthDecision ?? 'UNKNOWN',
    bestAlignedMismatchPct: fixture.parity?.bestAlignedMismatchPct ?? '',
    actualTableVsCropRatio: fixture.overflow?.actualTableVsCropRatio ?? null,
    localTableVsCropRatio: fixture.overflow?.localTableVsCropRatio ?? null,
    tableWidthDelta: fixture.deltas?.tableWidthDelta ?? null,
    tableToCropDelta: fixture.deltas?.tableToCropDelta ?? null,
    messageWidthDelta: fixture.deltas?.messageWidthDelta ?? null,
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    compared: Number(report.summary.compared ?? fixtures.filter((fixture) => fixture.status === 'COMPARED').length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.widthDecision !== 'WIDTH_SECONDARY_OR_ACCEPTABLE').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.status === 'COMPARED' && fixture.widthDecision !== 'WIDTH_SECONDARY_OR_ACCEPTABLE'),
    fixtures,
  };
}

function summarizeChatMessageShellModel(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    status: fixture.status ?? 'UNKNOWN',
    messageShellDecision: fixture.messageShellDecision ?? 'UNKNOWN',
    actualMessageShellModel: fixture.actual?.messageShellModel ?? '',
    bestAlignedMismatchPct: fixture.parity?.bestAlignedMismatchPct ?? '',
    widthDecision: fixture.widthDecision ?? '',
    messageWidthDelta: fixture.deltas?.messageWidthDelta ?? null,
    contentWidthDelta: fixture.deltas?.contentWidthDelta ?? null,
    chatRightGutterDelta: fixture.deltas?.chatRightGutterDelta ?? null,
    actualLeftInset: fixture.actual?.template?.leftInset ?? null,
    actualRightInset: fixture.actual?.template?.rightInset ?? null,
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    compared: Number(report.summary.compared ?? fixtures.filter((fixture) => fixture.status === 'COMPARED').length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.messageShellDecision !== 'MESSAGE_SHELL_SECONDARY').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.status === 'COMPARED' && fixture.messageShellDecision !== 'MESSAGE_SHELL_SECONDARY'),
    fixtures,
  };
}

function summarizeChatTableWidthBudget(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    budgetDecision: fixture.budgetDecision ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    tableWidthDelta: fixture.tableWidthDelta ?? null,
    textMeasureTableDelta: fixture.textMeasureTableDelta ?? null,
    textResidual: fixture.textResidual ?? null,
    scrollDelta: fixture.scrollDelta ?? null,
    messageDelta: fixture.messageDelta ?? null,
    contentDelta: fixture.contentDelta ?? null,
    fontAvailabilityChanged: Boolean(fixture.fontAvailabilityChanged),
    tableFontChanged: Boolean(fixture.tableFontChanged),
    transformContradicted: Boolean(fixture.transformContradicted),
    spacingRejected: Boolean(fixture.spacingRejected),
    fontCandidatesRejected: Boolean(fixture.fontCandidatesRejected),
    bestCandidateName: fixture.bestCandidate?.name ?? '',
    bestCandidateDeltaPct: fixture.bestCandidate?.fixtureDeltaPct ?? null,
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.budgetDecision !== 'WIDTH_SECONDARY').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.budgetDecision !== 'WIDTH_SECONDARY'),
    fixtures,
  };
}

function summarizeChatTableIntrinsicProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    probeDecision: fixture.probeDecision ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    rootWidthDelta: fixture.deltas?.rootWidth ?? null,
    tableWidthDelta: fixture.deltas?.tableWidth ?? null,
    tableScrollWidthDelta: fixture.deltas?.tableScrollWidth ?? null,
    captionWidthDelta: fixture.deltas?.captionWidth ?? null,
    firstCellWidthDelta: fixture.deltas?.firstCellWidth ?? null,
    rowWidthDeltaSpread: fixture.rowModel?.rowWidthDeltaSpread ?? null,
    maxAbsCellDelta: fixture.rowModel?.maxAbsCellDelta ?? null,
    maxAbsTopDelta: fixture.rowModel?.maxAbsTopDelta ?? null,
    bestCandidateName: fixture.candidateSignals?.best?.name ?? '',
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.probeDecision !== 'WIDTH_SECONDARY').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.probeDecision !== 'WIDTH_SECONDARY'),
    fixtures,
  };
}

function summarizeChatOverflowCropProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    rootWidthDelta: fixture.deltas?.rootWidth ?? null,
    tableWidthDelta: fixture.deltas?.tableWidth ?? null,
    tableScrollWidthDelta: fixture.deltas?.tableScrollWidth ?? null,
    tableClientWidthDelta: fixture.deltas?.tableClientWidth ?? null,
    tableOverflowDelta: fixture.deltas?.tableOverflow ?? null,
    tableToCropRatioDelta: fixture.deltas?.tableToCropRatio ?? null,
    scrollToCropRatioDelta: fixture.deltas?.scrollToCropRatio ?? null,
    maxAbsTopDelta: fixture.rowModel?.maxAbsTopDelta ?? null,
    rowWidthDeltaSpread: fixture.rowModel?.rowWidthDeltaSpread ?? null,
    maxAbsCellDelta: fixture.rowModel?.maxAbsCellDelta ?? null,
    bestCandidateName: fixture.candidateSignals?.best?.name ?? '',
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && !['WIDTH_SECONDARY', 'MISSING_DOM_EVIDENCE'].includes(fixture.decision)).length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && !['WIDTH_SECONDARY', 'MISSING_DOM_EVIDENCE'].includes(fixture.decision)),
    fixtures,
  };
}

function summarizeChatIntrinsicWidthModel(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    status: fixture.status ?? 'UNKNOWN',
    intrinsicDecision: fixture.intrinsicDecision ?? 'UNKNOWN',
    bestAlignedMismatchPct: fixture.parity?.bestAlignedMismatchPct ?? '',
    tableWidthDelta: fixture.deltas?.tableWidthDelta ?? null,
    firstCellWidthDelta: fixture.rowCellDeltas?.firstCellWidthDelta ?? null,
    fontSizeDelta: fixture.deltas?.fontSizeDelta ?? null,
    letterSpacingDelta: fixture.deltas?.letterSpacingDelta ?? null,
    borderSpacingXDelta: fixture.deltas?.borderSpacingXDelta ?? null,
    tableStructureStatus: fixture.structureDeltas?.status ?? '',
    tableScrollWidthDelta: fixture.structureDeltas?.tableScrollWidthDelta ?? null,
    tableClientWidthDelta: fixture.structureDeltas?.tableClientWidthDelta ?? null,
    overflowDelta: fixture.structureDeltas?.overflowDelta ?? null,
    columnCountDelta: fixture.structureDeltas?.columnCountDelta ?? null,
    longestTokenLengthDelta: fixture.structureDeltas?.longestTokenLengthDelta ?? null,
    tableStructureMatches: fixture.structureDeltas?.structureMatches ?? null,
    constraintDecision: fixture.constraintModel?.decision ?? '',
    rowWidthDeltaSpread: fixture.rowCellDeltas?.rowWidthDeltaSpread ?? null,
    maxAbsCellWidthDelta: fixture.rowCellDeltas?.maxAbsCellWidthDelta ?? null,
    transformContradicted: Boolean(fixture.styleProof?.transformContradicted),
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    compared: Number(report.summary.compared ?? fixtures.filter((fixture) => fixture.status === 'COMPARED').length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.intrinsicDecision !== 'INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE').length),
    decisions: report.summary.decisions ?? {},
    transformContradicted: report.summary.transformContradicted ?? [],
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.status === 'COMPARED' && fixture.intrinsicDecision !== 'INTRINSIC_WIDTH_SECONDARY_OR_ACCEPTABLE'),
    fixtures,
  };
}

function summarizeChatFontGlyphModel(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    status: fixture.status ?? 'UNKNOWN',
    glyphDecision: fixture.glyphDecision ?? 'UNKNOWN',
    tableWidthDelta: fixture.widthDeltas?.table ?? null,
    firstCellWidthDelta: fixture.widthDeltas?.firstCell ?? null,
    fontAvailabilityChanged: Boolean(fixture.fontSignals?.fontAvailabilityChanged),
    tableFontFamilyChanged: Boolean(fixture.fontSignals?.tableFontFamilyChanged),
    rootFontFamilyChanged: Boolean(fixture.fontSignals?.rootFontFamilyChanged),
    fontCandidatesRejected: Boolean(fixture.candidateEvidence?.fontCandidatesRejected),
    textMeasureStatus: fixture.textMeasureSignals?.status ?? '',
    textMeasureMissing: Boolean(fixture.textMeasureSignals?.missing),
    textMeasureComparedSamples: Number(fixture.textMeasureSignals?.comparedSamples ?? 0),
    textMeasureMeanAbsWidthDelta: fixture.textMeasureSignals?.meanAbsWidthDelta ?? null,
    textWidthDecision: fixture.textWidthModel?.decision ?? '',
    tableTextResidual: fixture.textWidthModel?.tableTextResidual ?? null,
    tableTextDelta: fixture.textWidthModel?.tableTextDelta ?? null,
    textWidthRatioMean: fixture.textWidthModel?.widthRatioMean ?? null,
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    compared: Number(report.summary.compared ?? fixtures.filter((fixture) => fixture.status === 'COMPARED').length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.glyphDecision !== 'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE').length),
    textMeasureMissing: Number(report.summary.textMeasureMissing ?? fixtures.filter((fixture) => fixture.textMeasureMissing).length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.status === 'COMPARED' && fixture.glyphDecision !== 'GLYPH_MODEL_SECONDARY_OR_ACCEPTABLE'),
    fixtures,
  };
}

function summarizeChatFontIntrinsicProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    tableWidthDelta: fixture.tableWidthDelta ?? null,
    textMeasureTableDelta: fixture.textMeasureTableDelta ?? null,
    tableTextResidual: fixture.tableTextResidual ?? null,
    textWidthDecision: fixture.textWidthDecision ?? '',
    intrinsicDecision: fixture.intrinsicDecision ?? '',
    overflowDecision: fixture.overflowDecision ?? '',
    fontAvailabilityChanged: Boolean(fixture.fontAvailabilityChanged),
    tableFontFamilyChanged: Boolean(fixture.tableFontFamilyChanged),
    rootFontFamilyChanged: Boolean(fixture.rootFontFamilyChanged),
    widthOverrideGain: fixture.widthOverrideGain ?? '',
    changedFonts: fixture.changedFonts ?? [],
    nextAction: fixture.nextAction ?? '',
    evidence: fixture.evidence ?? [],
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && !['WIDTH_SECONDARY', 'KEEP_CURRENT_AXIS'].includes(fixture.decision)).length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && !['WIDTH_SECONDARY', 'KEEP_CURRENT_AXIS'].includes(fixture.decision)),
    fixtures,
  };
}

function summarizeChatRowPaintSourceProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    rowDecision: fixture.rowDecision ?? '',
    widthExperiment: fixture.widthExperiment ?? '',
    fontIntrinsicDecision: fixture.fontIntrinsicDecision ?? '',
    maskDecision: fixture.maskDecision ?? '',
    sourceOrderDecision: fixture.sourceOrderDecision ?? '',
    paintGainPct: fixture.paintGainPct ?? null,
    paintGainLabel: fixture.paintGainLabel ?? '',
    paintStyleStatus: fixture.paintStyleStatus ?? '',
    paintStyleFinding: fixture.paintStyleFinding ?? '',
    maxAbsTopDelta: fixture.geometrySignals?.maxAbsTopDelta ?? null,
    maxAbsWidthDelta: fixture.geometrySignals?.maxAbsWidthDelta ?? null,
    maxAbsCellDelta: fixture.geometrySignals?.maxAbsCellDelta ?? null,
    topRowMismatchSharePct: fixture.maskSignals?.topRowMismatchSharePct ?? '',
    brightMismatchSharePct: fixture.maskSignals?.brightMismatchSharePct ?? '',
    sourceClassification: fixture.sourceEvidence?.classification ?? '',
    expectedRulePresent: Boolean(fixture.sourceEvidence?.expectedRulePresent),
    evidence: fixture.evidence ?? [],
    nextAction: fixture.nextAction ?? '',
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && !['KEEP_CURRENT_AXIS', 'MISSING_EVIDENCE'].includes(fixture.decision)).length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && !['KEEP_CURRENT_AXIS', 'MISSING_EVIDENCE'].includes(fixture.decision)),
    fixtures,
  };
}

function summarizeChatRowRasterProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => {
    const worst = fixture.worstRows?.[0] ?? null;
    return {
      fixtureId: fixture.fixtureId,
      priority: fixture.priority ?? '',
      decision: fixture.decision ?? 'UNKNOWN',
      alignedMismatchPct: fixture.alignedMismatchPct ?? '',
      comparedRows: Number(fixture.comparedRows ?? 0),
      rowWeightedMismatchPct: fixture.summary?.rowWeightedMismatchPct ?? '',
      maxRowMismatchPct: fixture.summary?.maxRowMismatchPct ?? '',
      meanSignedLumaDelta: fixture.summary?.meanSignedLumaDelta ?? null,
      worstRowIndex: worst?.index ?? null,
      worstRowMismatchPct: worst?.mismatchPct ?? '',
      worstRowSignedLumaDelta: worst?.avgSignedLumaDelta ?? null,
      worstRowBrightMismatchSharePct: worst?.brightMismatchSharePct ?? '',
      worstRowDarkMismatchSharePct: worst?.darkMismatchSharePct ?? '',
      evidence: fixture.evidence ?? [],
      nextAction: fixture.nextAction ?? '',
    };
  });
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'RASTER_SECONDARY').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'RASTER_SECONDARY'),
    fixtures,
  };
}

function summarizeChatRowRasterCandidates(report) {
  if (!report?.summary) return null;
  const candidates = (report.candidates ?? []).map((candidate) => ({
    name: candidate.name,
    status: candidate.status ?? 'UNKNOWN',
    rowRasterRisk: candidate.rowRasterRisk ?? '',
    aw2eRowWeightedDeltaPct: candidate.aw2eRowWeightedDeltaPct ?? null,
    aw2eWorstRowDeltaPct: candidate.aw2eWorstRowDeltaPct ?? null,
    aw2eWorstRowLumaDeltaChange: candidate.aw2eWorstRowLumaDeltaChange ?? null,
    aw2eRowWeightedMismatchPct: candidate.aw2e?.rowWeightedMismatchPct ?? '',
    aw2eWorstRowMismatchPct: candidate.aw2e?.worstRowMismatchPct ?? '',
    aw2eWorstRowIndex: candidate.aw2e?.worstRowIndex ?? null,
    yshyRowWeightedDeltaPct: candidate.yshyRowWeightedDeltaPct ?? null,
    yshyWorstRowDeltaPct: candidate.yshyWorstRowDeltaPct ?? null,
    yshyWorstRowLumaDeltaChange: candidate.yshyWorstRowLumaDeltaChange ?? null,
    yshyRowWeightedMismatchPct: candidate.yshy?.rowWeightedMismatchPct ?? '',
    yshyWorstRowMismatchPct: candidate.yshy?.worstRowMismatchPct ?? '',
    yshyWorstRowIndex: candidate.yshy?.worstRowIndex ?? null,
  }));
  return {
    totalCandidates: Number(report.summary.candidates ?? candidates.length),
    compared: Number(report.summary.compared ?? candidates.filter((candidate) => candidate.status === 'OK').length),
    rejected: Number(report.summary.rejected ?? candidates.filter((candidate) => candidate.rowRasterRisk === 'reject-row-raster-regression').length),
    noMeaningfulGain: Number(report.summary.noMeaningfulGain ?? candidates.filter((candidate) => candidate.rowRasterRisk === 'no-meaningful-row-raster-gain').length),
    productionSafe: Boolean(report.summary.productionSafe),
    rejectedCandidates: candidates.filter((candidate) => candidate.status === 'OK' && candidate.rowRasterRisk === 'reject-row-raster-regression'),
    candidates,
  };
}

function summarizeChatRowCompositingProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    comparedRows: Number(fixture.comparedRows ?? 0),
    rowWeightedMismatchPct: fixture.summary?.rowWeightedMismatchPct ?? '',
    lumaCorrectedMismatchPct: fixture.summary?.lumaCorrectedMismatchPct ?? '',
    lumaCorrectionGainPct: fixture.summary?.lumaCorrectionGainPct ?? null,
    edgeMismatchSharePct: fixture.summary?.edgeMismatchSharePct ?? '',
    flatPaintMismatchSharePct: fixture.summary?.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: fixture.summary?.localDarkerMismatchSharePct ?? '',
    localBrighterMismatchSharePct: fixture.summary?.localBrighterMismatchSharePct ?? '',
    chromaMismatchSharePct: fixture.summary?.chromaMismatchSharePct ?? '',
    worstRowIndex: fixture.worstRows?.[0]?.index ?? null,
    worstRowDecision: fixture.worstRows?.[0]?.decision ?? '',
    worstRowMismatchPct: fixture.worstRows?.[0]?.mismatchPct ?? '',
    worstRowLumaCorrectedMismatchPct: fixture.worstRows?.[0]?.lumaCorrectedMismatchPct ?? '',
    worstRowLumaCorrectionGainPct: fixture.worstRows?.[0]?.lumaCorrectionGainPct ?? null,
    worstRowEdgeMismatchSharePct: fixture.worstRows?.[0]?.edgeMismatchSharePct ?? '',
    worstRowFlatPaintMismatchSharePct: fixture.worstRows?.[0]?.flatPaintMismatchSharePct ?? '',
    worstRowLocalDarkerMismatchSharePct: fixture.worstRows?.[0]?.localDarkerMismatchSharePct ?? '',
    evidence: fixture.evidence ?? [],
    nextAction: fixture.nextAction ?? '',
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && !['COMPOSITING_SECONDARY', 'MISSING_EVIDENCE'].includes(fixture.decision)).length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && !['COMPOSITING_SECONDARY', 'MISSING_EVIDENCE'].includes(fixture.decision)),
    fixtures,
  };
}

function summarizeChatBackgroundSourceProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    backgroundStyleDecision: fixture.backgroundStyleDecision ?? '',
    tableWidthDelta: fixture.tableWidthDelta ?? null,
    compositingDecision: fixture.compositingDecision ?? '',
    rowWeightedMismatchPct: fixture.rowWeightedMismatchPct ?? '',
    lumaCorrectedMismatchPct: fixture.lumaCorrectedMismatchPct ?? '',
    lumaCorrectionGainPct: fixture.lumaCorrectionGainPct ?? null,
    flatPaintMismatchSharePct: fixture.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: fixture.localDarkerMismatchSharePct ?? '',
    backgroundSizeCandidateRisk: fixture.backgroundSizeCandidateRisk ?? '',
    evidence: fixture.evidence ?? [],
    nextAction: fixture.nextAction ?? '',
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'BACKGROUND_SOURCE_SECONDARY').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'BACKGROUND_SOURCE_SECONDARY'),
    fixtures,
  };
}

function summarizeChatBackgroundRasterModelProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    backgroundSourceDecision: fixture.backgroundSourceDecision ?? '',
    backgroundStyleDecision: fixture.backgroundStyleDecision ?? '',
    compositingDecision: fixture.compositingDecision ?? '',
    rowRasterDecision: fixture.rowRasterDecision ?? '',
    rowWeightedMismatchPct: fixture.rowWeightedMismatchPct ?? '',
    lumaCorrectedMismatchPct: fixture.lumaCorrectedMismatchPct ?? '',
    lumaCorrectionGainPct: fixture.lumaCorrectionGainPct ?? null,
    flatPaintMismatchSharePct: fixture.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: fixture.localDarkerMismatchSharePct ?? '',
    backgroundSizeRisk: fixture.backgroundSizeRisk ?? '',
    backgroundSizeWeightedDeltaPct: fixture.backgroundSizeWeightedDeltaPct ?? null,
    backgroundSizeWorstDeltaPct: fixture.backgroundSizeWorstDeltaPct ?? null,
    widthExperiment: fixture.widthExperiment ?? '',
    tableWidthDelta: fixture.tableWidthDelta ?? null,
    scrollDelta: fixture.scrollDelta ?? null,
    textResidual: fixture.textResidual ?? null,
    evidence: fixture.evidence ?? [],
    nextAction: fixture.nextAction ?? '',
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'RASTER_MODEL_SECONDARY').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'RASTER_MODEL_SECONDARY'),
    fixtures,
  };
}

function summarizeChatBackgroundAssetProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    backgroundSourceDecision: fixture.backgroundSourceDecision ?? '',
    backgroundRasterDecision: fixture.backgroundRasterDecision ?? '',
    cssUrlEquivalent: Boolean(fixture.cssUrlEquivalent),
    hashesMatch: Boolean(fixture.hashesMatch),
    sourceMatchesProxy: Boolean(fixture.sourceMatchesProxy),
    localSummary: fixture.localAsset?.summary ?? '',
    actualSummary: fixture.actualAsset?.summary ?? '',
    sourceSummary: fixture.sourceAsset?.summary ?? '',
    localPlaceholder: Boolean(fixture.localAsset?.placeholder),
    actualPlaceholder: Boolean(fixture.actualAsset?.placeholder),
    sourcePlaceholder: Boolean(fixture.sourceAsset?.placeholder),
    evidence: fixture.evidence ?? [],
    nextAction: fixture.nextAction ?? '',
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'NO_BACKGROUND_IMAGE').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'NO_BACKGROUND_IMAGE'),
    fixtures,
  };
}

function summarizeChatAssetPreservationPlan(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision ?? 'UNKNOWN',
    rendererPolicy: fixture.rendererPolicy ?? '',
    nextAction: fixture.nextAction ?? '',
    blockers: fixture.blockers ?? [],
    evidence: fixture.evidence ?? [],
    sourceSummary: fixture.asset?.sourceSummary ?? '',
    sourcePlaceholder: Boolean(fixture.asset?.sourcePlaceholder),
    localSummary: fixture.asset?.localSummary ?? '',
    actualSummary: fixture.asset?.actualSummary ?? '',
    hashesMatch: Boolean(fixture.asset?.hashesMatch),
  }));
  return {
    rendererAction: report.rendererAction ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'NO_BACKGROUND_IMAGE').length),
    blockers: Number(report.summary.blockers ?? (report.blockers ?? []).length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    blockerMessages: report.blockers ?? [],
    productRequirements: (report.productRequirements ?? []).map((requirement) => ({
      id: requirement.id ?? '',
      priority: requirement.priority ?? '',
      implementationStatus: requirement.implementationStatus ?? '',
      requirement: requirement.requirement ?? '',
      publicSafety: requirement.publicSafety ?? '',
    })),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'NO_BACKGROUND_IMAGE'),
    fixtures,
  };
}

function summarizeChatTemplateScopeGate(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    requiredScope: fixture.requiredScope ?? '',
    requiredModel: fixture.requiredModel ?? '',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    tableWidthDelta: fixture.tableWidthDelta ?? null,
    tableTextResidual: fixture.tableTextResidual ?? null,
    tableScrollWidthDelta: fixture.tableScrollWidthDelta ?? null,
    bestCandidateName: fixture.bestCandidate?.name ?? '',
    bestCandidateRisk: fixture.bestCandidate?.risk ?? '',
    bestCandidateStyleProof: fixture.bestCandidate?.styleProofStatus ?? '',
    promotionReady: Boolean(fixture.promotionReady),
    nextAction: fixture.nextAction ?? '',
  }));
  return {
    action: report.action ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    highMismatch: Number(report.summary.highMismatch ?? fixtures.filter((fixture) => fixture.priority === 'P0').length),
    highModels: report.summary.highModels ?? [],
    highScopes: report.summary.highScopes ?? [],
    blockers: Number(report.summary.blockers ?? (report.blockers ?? []).length),
    blockerMessages: report.blockers ?? [],
    promotionReadyFixtures: Number(report.summary.promotionReadyFixtures ?? fixtures.filter((fixture) => fixture.promotionReady).length),
    fixtures,
  };
}

function summarizeChatCellAllocationProbe(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => {
    const scenarios = (fixture.scenarios ?? []).map((scenario) => ({
      scenario: scenario.scenario ?? '',
      status: scenario.status ?? '',
      allocationDecision: scenario.allocationDecision ?? '',
      productionBlocker: Boolean(scenario.productionBlocker),
      tableDelta: scenario.tableDelta ?? null,
      maxAbsCellWidthDelta: scenario.maxAbsCellWidthDelta ?? null,
      maxAbsTextCellWidthDelta: scenario.maxAbsTextCellWidthDelta ?? null,
      maxAbsCellRatioDeltaPct: scenario.maxAbsCellRatioDeltaPct ?? null,
      nextAction: scenario.nextAction ?? '',
    }));
    return {
      fixtureId: fixture.fixtureId,
      hasActualEvidence: Boolean(fixture.hasActualEvidence),
      defaultScenario: scenarios.find((scenario) => scenario.scenario === 'default') ?? null,
      rejectedScenarios: scenarios.filter((scenario) => scenario.productionBlocker && scenario.status !== 'MISSING'),
      scenarios,
    };
  });
  const rejectedScenarios = fixtures.flatMap((fixture) =>
    fixture.rejectedScenarios.map((scenario) => ({ fixtureId: fixture.fixtureId, ...scenario })),
  );
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    scenarios: Number(report.summary.scenarios ?? fixtures.reduce((sum, fixture) => sum + fixture.scenarios.length, 0)),
    productionSafe: Boolean(report.summary.productionSafe),
    rejectedScenarios,
    fixtures,
  };
}

function summarizeChatRowGeometry(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    status: fixture.status ?? 'UNKNOWN',
    rowDecision: fixture.rowModel?.decision ?? 'UNKNOWN',
    comparedRows: Number(fixture.comparedRows ?? 0),
    maxAbsTopDelta: fixture.rowModel?.maxAbsTopDelta ?? fixture.maxAbsTopDelta ?? null,
    maxAbsHeightDelta: fixture.rowModel?.maxAbsHeightDelta ?? fixture.maxAbsHeightDelta ?? null,
    maxAbsWidthDelta: fixture.rowModel?.maxAbsWidthDelta ?? fixture.maxAbsWidthDelta ?? null,
    maxAbsCellDelta: fixture.rowModel?.maxAbsCellDelta ?? null,
    topSpread: fixture.rowModel?.topSpread ?? null,
    widthSpread: fixture.rowModel?.widthSpread ?? null,
    tableWidthDelta: fixture.templateMetrics?.tableRectWidthDelta ?? null,
    nextAction: fixture.rowModel?.nextAction ?? fixture.reason ?? '',
    styleDeltas: fixture.templateMetrics?.styleDeltas ?? {},
  }));
  return {
    status: report.summary.status ?? 'UNKNOWN',
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    compared: Number(report.summary.compared ?? fixtures.filter((fixture) => fixture.status === 'COMPARED').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.status === 'COMPARED' && fixture.rowDecision !== 'ROW_GEOMETRY_SECONDARY'),
    fixtures,
  };
}

function summarizeChatWidthReconciliation(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    nextExperiment: fixture.nextExperiment ?? 'UNKNOWN',
    alignedMismatchPct: fixture.alignedMismatchPct ?? '',
    tableWidthDelta: fixture.signals?.tableWidthDelta ?? null,
    tableTextResidual: fixture.signals?.tableTextResidual ?? null,
    tableScrollWidthDelta: fixture.signals?.tableScrollWidthDelta ?? null,
    actualTableVsCropRatio: fixture.signals?.actualTableVsCropRatio ?? null,
    bestCandidateName: fixture.bestCandidate?.name ?? '',
    bestCandidateDeltaPct: fixture.bestCandidate?.fixtureDeltaPct ?? null,
    nextAction: fixture.nextAction ?? '',
    blockers: fixture.blockers ?? [],
    evidence: fixture.evidence ?? [],
  }));
  return {
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    actionable: Number(report.summary.actionable ?? fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.nextExperiment !== 'KEEP_DEFAULT').length),
    decisions: report.summary.decisions ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    actionableFixtures: fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.nextExperiment !== 'KEEP_DEFAULT'),
    fixtures,
  };
}

function summarizeChatStructure(report) {
  if (!report?.summary) return null;
  const fixtures = (report.fixtures ?? []).map((fixture) => ({
    fixtureId: fixture.fixtureId,
    status: fixture.status ?? 'UNKNOWN',
    decision: fixture.decision ?? '',
    nextAction: fixture.nextAction ?? '',
    localTemplate: fixture.local?.templateClass ?? '',
    actualTemplate: fixture.actual?.templateClass ?? '',
    localRows: Number(fixture.local?.rowCount ?? 0),
    actualRows: Number(fixture.actual?.rowCount ?? 0),
    chosenRollButton: fixture.local?.chosenRollButton ?? '',
    chosenTemplateInvoke: fixture.local?.chosenTemplateInvoke ?? '',
    actualStrategy: fixture.actual?.selectedTemplateStrategy ?? '',
    availableActualTemplates: fixture.actual?.availableTemplateClasses ?? [],
  }));
  const mismatchFixtures = fixtures.filter((fixture) => fixture.status !== 'STRUCTURE_MATCH');
  return {
    status: report.summary.status ?? (mismatchFixtures.length ? 'STRUCTURE_MISMATCH_FOUND' : 'STRUCTURE_MATCHED'),
    totalFixtures: Number(report.summary.fixtures ?? fixtures.length),
    mismatches: Number(report.summary.mismatches ?? mismatchFixtures.length),
    counts: report.summary.counts ?? {},
    productionSafe: Boolean(report.summary.productionSafe),
    mismatchFixtures,
    fixtures,
  };
}

function summarizeChatCandidate(candidate) {
  return {
    name: candidate.name,
    risk: candidate.promotionRisk ?? '',
    meanAlignedDeltaPct: candidate.meanAlignedDeltaPct ?? null,
    regressedFixtures: Number(candidate.regressedFixtures ?? 0),
    improvedFixtures: Number(candidate.improvedFixtures ?? 0),
    fixtureAlignedDeltaPct: candidate.fixtureAlignedDeltaPct ?? {},
    yshyAlignedDeltaPct: parsePctValue(candidate.yshyAlignedDeltaPct),
  };
}

function formatChatStructureMismatch(fixture) {
  return `${fixture.fixtureId} (${fixture.status}, local=${fixture.localTemplate || 'n/a'}, actual=${fixture.actualTemplate || 'n/a'}, rows=${fixture.localRows}/${fixture.actualRows})`;
}

function chatCandidateSort(a, b) {
  return Number(a.regressedFixtures ?? 0) - Number(b.regressedFixtures ?? 0) ||
    Number(a.meanAlignedDeltaPct ?? 0) - Number(b.meanAlignedDeltaPct ?? 0) ||
    a.name.localeCompare(b.name);
}

function summarizeChatParity(report) {
  if (!report?.summary) return null;
  const fixtures = report.fixtures ?? [];
  const authoritativeMismatchFixtures = fixtures.filter(
    (fixture) =>
      fixture.status === 'DIFFED' &&
      fixture.compareMode === 'rolltemplate-crop' &&
      !fixture.actualCropGeometry?.suspect &&
      !fixture.actualTemplatePixels?.suspect &&
      Number(fixture.bestAlignedMismatchRatio ?? fixture.mismatchRatio ?? 0) > 0.1,
  );
  const authoritativeNormalizedHighMismatch = Number(
    report.summary.authoritativeNormalizedHighMismatch ??
      authoritativeMismatchFixtures.length,
  );
  return {
    fixtures: Number(report.summary.fixtures ?? 0),
    compared: Number(report.summary.compared ?? 0),
    normalizedCompared: Number(report.summary.normalizedCompared ?? 0),
    needsNormalizedCapture: Number(report.summary.needsNormalizedCapture ?? 0),
    highMismatch: Number(report.summary.highMismatch ?? 0),
    normalizedHighMismatch: Number(report.summary.normalizedHighMismatch ?? 0),
    alignedHighMismatch: Number(report.summary.alignedHighMismatch ?? report.summary.normalizedHighMismatch ?? 0),
    authoritativeNormalizedHighMismatch,
    actualCropGeometrySuspect: Number(
      report.summary.actualCropGeometrySuspect ??
        fixtures.filter((fixture) => fixture.status === 'DIFFED' && fixture.compareMode === 'rolltemplate-crop' && fixture.actualCropGeometry?.suspect).length,
    ),
    actualTemplatePixelSuspect: Number(
      report.summary.actualTemplatePixelSuspect ??
        fixtures.filter((fixture) => fixture.status === 'DIFFED' && fixture.compareMode === 'rolltemplate-crop' && fixture.actualTemplatePixels?.suspect).length,
    ),
    actualChatCssInactive: Number(report.summary.actualChatCssInactive ?? 0),
    actualChatCssScopedMismatch: Number(report.summary.actualChatCssScopedMismatch ?? 0),
    actualChatCssUnknown: Number(report.summary.actualChatCssUnknown ?? 0),
    actualCaptureScaleSuspect: Number(report.summary.actualCaptureScaleSuspect ?? 0),
    maxMismatchRatio: Number(report.summary.maxMismatchRatio ?? 0),
    maxMismatchPct: pctNumber(report.summary.maxMismatchRatio ?? 0),
    maxNormalizedMismatchRatio: Number(report.summary.maxNormalizedMismatchRatio ?? 0),
    maxNormalizedMismatchPct: pctNumber(report.summary.maxNormalizedMismatchRatio ?? 0),
    maxAlignedMismatchRatio: Number(report.summary.maxAlignedMismatchRatio ?? report.summary.maxNormalizedMismatchRatio ?? 0),
    maxAlignedMismatchPct: pctNumber(report.summary.maxAlignedMismatchRatio ?? report.summary.maxNormalizedMismatchRatio ?? 0),
    authoritativeMaxMismatchRatio: authoritativeMismatchFixtures.reduce((max, fixture) => Math.max(max, Number(fixture.mismatchRatio ?? 0)), 0),
    authoritativeMaxMismatchPct: pctNumber(authoritativeMismatchFixtures.reduce((max, fixture) => Math.max(max, Number(fixture.mismatchRatio ?? 0)), 0)),
    authoritativeMaxAlignedMismatchRatio: authoritativeMismatchFixtures.reduce((max, fixture) => Math.max(max, Number(fixture.bestAlignedMismatchRatio ?? fixture.mismatchRatio ?? 0)), 0),
    authoritativeMaxAlignedMismatchPct: pctNumber(authoritativeMismatchFixtures.reduce((max, fixture) => Math.max(max, Number(fixture.bestAlignedMismatchRatio ?? fixture.mismatchRatio ?? 0)), 0)),
    fixturesWithMismatch: authoritativeMismatchFixtures
      .map((fixture) => ({
        fixtureId: fixture.fixtureId,
        mismatchPct: pctNumber(fixture.mismatchRatio),
        bestAlignedMismatchPct: pctNumber(fixture.bestAlignedMismatchRatio ?? fixture.mismatchRatio),
        bestAlignedOffset: fixture.bestAlignedOffset ?? null,
        localSize: fixture.localSize ?? null,
        actualSize: fixture.actualSize ?? null,
        actualImageFormat: fixture.actualImageFormat ?? null,
        actualScreenshotScale: fixture.actualScreenshotScale ?? null,
        actualChatCss: fixture.actualChatCss ?? null,
      })),
    suspectFixtures: summarizeChatParitySuspectFixtures(fixtures),
  };
}

function summarizeChatParitySuspectFixtures(fixtures) {
  return fixtures
    .filter((fixture) =>
      fixture.status === 'DIFFED' &&
      fixture.compareMode === 'rolltemplate-crop' &&
      (
        fixture.actualCropGeometry?.suspect ||
        fixture.actualTemplatePixels?.suspect ||
        isActualCaptureScaleSuspect(fixture)
      )
    )
    .map((fixture) => {
      const reasons = [];
      if (fixture.actualCropGeometry?.suspect) {
        reasons.push(`crop geometry: ${fixture.actualCropGeometry.reason ?? 'recapture element-bound template screenshot'}`);
      }
      if (fixture.actualTemplatePixels?.suspect) {
        reasons.push(`foreground pixels: ${fixture.actualTemplatePixels.reason ?? 'recapture visible rolltemplate foreground'}`);
      }
      if (isActualCaptureScaleSuspect(fixture)) {
        reasons.push(`capture scale/format: ${fixture.actualImageFormat ?? 'unknown format'} ${Array.isArray(fixture.actualScreenshotScale) ? fixture.actualScreenshotScale.join('x') : 'unknown scale'}`);
      }
      return { fixtureId: fixture.fixtureId, reasons };
    });
}

function isActualCaptureScaleSuspect(fixture) {
  if (!fixture || fixture.status !== 'DIFFED') return false;
  if (fixture.actualImageFormat && fixture.actualImageFormat !== 'png') return true;
  const [scaleX, scaleY] = fixture.actualScreenshotScale ?? [];
  if (scaleX == null || scaleY == null) return false;
  return Math.abs(Number(scaleX) - 1) > 0.01 || Math.abs(Number(scaleY) - 1) > 0.01;
}

function formatChatSuspectSuffix(chatParitySummary, reasonPrefix) {
  const ids = (chatParitySummary?.suspectFixtures ?? [])
    .filter((fixture) => fixture.reasons.some((reason) => reason.startsWith(reasonPrefix)))
    .map((fixture) => fixture.fixtureId);
  return ids.length ? ` (${ids.join(', ')})` : '';
}

function formatChatSuspectList(chatParitySummary, reasonPrefix) {
  return (chatParitySummary?.suspectFixtures ?? [])
    .filter((fixture) => fixture.reasons.some((reason) => reason.startsWith(reasonPrefix)))
    .map((fixture) => fixture.fixtureId)
    .join(', ');
}

function summarizeChatCurrentMetrics(status, audit = null) {
  const auditFixtures = Array.isArray(audit?.fixtures) ? audit.fixtures : [];
  const auditMissingFixtures = auditFixtures.filter((fixture) => fixture.status !== 'PASS');
  const statusMissingFixtures = Array.isArray(status?.summary?.chatCurrentMetricsMissingFixtures)
    ? status.summary.chatCurrentMetricsMissingFixtures
    : [];
  const missingFixtures = auditMissingFixtures.length
    ? auditMissingFixtures.map((fixture) => fixture.fixtureId)
    : statusMissingFixtures;
  return {
    present: audit?.summary
      ? Number(audit.summary.pass ?? 0)
      : Number(status?.summary?.chatCurrentMetricsPresent ?? 0),
    total: audit?.summary
      ? Number(audit.summary.fixtures ?? 0)
      : Number(status?.summary?.chatCurrentMetricsTotal ?? 0),
    missing: audit?.summary
      ? Number(audit.summary.needsRecapture ?? 0)
      : Number(status?.summary?.chatCurrentMetricsMissing ?? 0),
    missingFixtures,
    missingFieldsByFixture: auditMissingFixtures.map((fixture) => ({
      fixtureId: fixture.fixtureId,
      missing: fixture.missing ?? [],
    })),
    source: audit ? 'chat-current-metrics-audit' : 'actual-status',
  };
}

function reliableRendererCandidate(fixture) {
  if (fixture.rootCutoff?.risk !== 'HIGH' && fixture.bestCandidate) {
    return { ...fixture.bestCandidate, evidenceSource: 'trusted-full-root' };
  }
  const source = fixture.scrollMetricsComparison?.sourceCandidate;
  if (!source) return null;
  const rootDelta = Math.abs(Number(source.rootHeightDelta ?? Number.POSITIVE_INFINITY));
  const panelY = Math.abs(Number(source.statePanelYDelta ?? Number.POSITIVE_INFINITY));
  const panelH = Math.abs(Number(source.statePanelHeightDelta ?? Number.POSITIVE_INFINITY));
  if (rootDelta <= 50 && panelY <= 50 && panelH <= 10) {
    return { ...source, evidenceSource: 'scroll-metrics-source' };
  }
  return null;
}

function formatMissingFullRoot(fixture) {
  const audit = fixture.rootStitchAudit;
  if (!audit) return fixture.fixtureId;
  const diagnostics = audit.overlapDiagnostics ?? [];
  if (diagnostics.length) {
    const best = diagnostics
      .slice()
      .sort((a, b) => Number(b.segmentCount ?? 0) - Number(a.segmentCount ?? 0))[0];
    const duplicateSegments = best.segmentHashSummary?.duplicateSegmentCount ?? 0;
    return `${fixture.fixtureId} (${audit.primaryIssue}; best diagnostic ${best.source}, ${best.segmentCount} segments, max score ${best.maxOverlapScore ?? 'n/a'}, duplicate segments ${duplicateSegments})`;
  }
  if (audit.primaryIssue) return `${fixture.fixtureId} (${audit.primaryIssue})`;
  return fixture.fixtureId;
}

function readAttrClassSidecarSync(activeRunDir, fixtureId) {
  const file = path.join(activeRunDir, 'live-iframe-probe', `${fixtureId}-attr-class-state.json`);
  if (!existsSync(file)) return { exists: false, path: path.relative(activeRunDir, file), checkedValues: [] };
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    const docs = Array.isArray(json.documents) ? json.documents : [];
    const inputs = docs.flatMap((doc) => doc.attrClassInputs ?? []);
    return {
      exists: true,
      path: path.relative(activeRunDir, file),
      checkedValues: [...new Set(inputs.filter((input) => input.checked).map((input) => input.value).filter(Boolean))],
      inputCount: inputs.length,
      capturedAt: json.capturedAt ?? json.generatedAt ?? null,
    };
  } catch (error) {
    return {
      exists: true,
      path: path.relative(activeRunDir, file),
      checkedValues: [],
      error: String(error?.message || error),
    };
  }
}

function summarize(fixtures) {
  return {
    totalFixtures: fixtures.length,
    trustedSandboxEvidence: fixtures.filter((fixture) => fixture.sandboxEvidence?.ok).length,
    trustedChatEvidence: fixtures.filter((fixture) => fixture.chatEvidence?.ok).length,
    fullRootCompared: fixtures.filter((fixture) => fixture.bestCandidate).length,
    stateVisibilityCompared: fixtures.filter((fixture) => fixture.stateVisibility?.status === 'COMPARED').length,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Renderer Action Gate',
    '',
    `Run dir: \`${report.runDir}\``,
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: diagnostic action gate only. This is not Roll20 visual parity.',
    '',
    `## Recommendation: ${report.recommendation.action}`,
    '',
  ];

  if (report.recommendation.blockers.length) {
    lines.push('### Blockers', '');
    for (const blocker of report.recommendation.blockers) lines.push(`- ${blocker}`);
    lines.push('');
  }
  if (report.recommendation.positiveFindings.length) {
    lines.push('### Positive Evidence', '');
    for (const finding of report.recommendation.positiveFindings) lines.push(`- ${finding}`);
    lines.push('');
  }
  if (report.recommendation.warnings.length) {
    lines.push('### Diagnostic Warnings', '');
    for (const warning of report.recommendation.warnings) lines.push(`- ${warning}`);
    lines.push('');
  }
  if (report.inputFlowAxis) {
    lines.push('### Input-Flow Axis Boundary', '');
    lines.push(`- Status: ${report.inputFlowAxis.status}`);
    lines.push(`- Global model safe: ${report.inputFlowAxis.globalModelSafe ? 'YES' : 'NO'}`);
    lines.push(`- Apply candidates: ${report.inputFlowAxis.applyCandidateFixtures.join(', ') || 'none'}`);
    lines.push(`- Blocks global model: ${report.inputFlowAxis.blockGlobalModelFixtures.join(', ') || 'none'}`);
    lines.push('');
  }
  if (report.chatParity) {
    lines.push('### Chat Parity Boundary', '');
    lines.push(`- Compared: ${report.chatParity.compared}/${report.chatParity.fixtures}`);
    lines.push(`- Normalized compared: ${report.chatParity.normalizedCompared}/${report.chatParity.fixtures}`);
    lines.push(`- Needs normalized capture: ${report.chatParity.needsNormalizedCapture}`);
    if (report.chatCurrentMetrics) {
      lines.push(`- Current row/typography sidecars: ${report.chatCurrentMetrics.present}/${report.chatCurrentMetrics.total} current (${report.chatCurrentMetrics.missing} missing)`);
      if (report.chatCurrentMetrics.missingFixtures.length) {
        lines.push(`- Current metric recapture fixtures: ${report.chatCurrentMetrics.missingFixtures.join(', ')}`);
      }
    }
    lines.push(`- High mismatch: ${report.chatParity.highMismatch}`);
    lines.push(`- Normalized high mismatch: ${report.chatParity.normalizedHighMismatch}`);
    lines.push(`- Actual chat CSS inactive: ${report.chatParity.actualChatCssInactive}`);
    lines.push(`- Actual chat CSS scoped/prefix mismatch: ${report.chatParity.actualChatCssScopedMismatch}`);
    lines.push(`- Actual chat CSS unknown: ${report.chatParity.actualChatCssUnknown}`);
    lines.push(`- Max mismatch: ${report.chatParity.maxMismatchPct}%`);
    lines.push(`- Max normalized mismatch: ${report.chatParity.maxNormalizedMismatchPct}%`);
    if (report.chatParity.fixturesWithMismatch?.length) {
      lines.push('');
      lines.push('| Fixture | Mismatch | Actual CSS | Local size | Actual size |');
      lines.push('| --- | ---: | --- | --- | --- |');
      for (const fixture of report.chatParity.fixturesWithMismatch) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.mismatchPct}% | ${fixture.actualChatCss?.classification ?? ''} | ${fmtSize(fixture.localSize)} | ${fmtSize(fixture.actualSize)} |`);
      }
    }
    lines.push('');
  }
  if (report.chatStructure) {
    lines.push('### Chat Structure Boundary', '');
    lines.push(`- Status: ${report.chatStructure.status}`);
    lines.push(`- Mismatches: ${report.chatStructure.mismatches}/${report.chatStructure.totalFixtures}`);
    lines.push(`- Counts: ${formatFindingCounts(report.chatStructure.counts)}`);
    if (report.chatStructure.fixtures.length) {
      lines.push('');
      lines.push('| Fixture | Status | Local template | Actual template | Rows L/A | Decision | Next action |');
      lines.push('| --- | --- | --- | --- | ---: | --- | --- |');
      for (const fixture of report.chatStructure.fixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | \`${fixture.localTemplate || ''}\` | \`${fixture.actualTemplate || ''}\` | ${fixture.localRows}/${fixture.actualRows} | ${fixture.decision} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatStyle) {
    lines.push('### Chat Style Context Boundary', '');
    lines.push(`- Compared: ${report.chatStyle.compared}/${report.chatStyle.fixtures}`);
    lines.push(`- Missing style evidence: ${report.chatStyle.missingEvidence}`);
    lines.push(`- Finding counts: ${formatFindingCounts(report.chatStyle.findingCounts)}`);
    lines.push(`- Table width deltas: ${formatFixtureDeltas(report.chatStyle.tableWidthDeltas)}`);
    lines.push(`- Root width deltas: ${formatFixtureDeltas(report.chatStyle.rootWidthDeltas)}`);
    lines.push(`- Conflicting table-width direction: ${report.chatStyle.conflictingTableWidthDirection ? 'YES' : 'NO'}`);
    if (report.chatStyle.fixturesWithFindings?.length) {
      lines.push('');
      lines.push('| Fixture | Findings | Root delta W/H | Table delta W/H | Rows L/A | Top style deltas |');
      lines.push('| --- | --- | ---: | ---: | ---: | --- |');
      for (const fixture of report.chatStyle.fixturesWithFindings) {
        const topStyle = fixture.topStyleDeltas
          .map((delta) => `${delta.selector}.${delta.key}${delta.numericDelta == null ? '' : ` ${num(delta.numericDelta)}`}`)
          .join(', ');
        lines.push(
          `| \`${fixture.fixtureId}\` | ${(fixture.findings ?? []).join(', ')} | ${fixture.rootDelta?.width ?? ''}/${fixture.rootDelta?.height ?? ''} | ${fixture.tableDelta?.width ?? ''}/${fixture.tableDelta?.height ?? ''} | ${fixture.rows?.localCount ?? ''}/${fixture.rows?.actualCount ?? ''} | ${topStyle} |`,
        );
      }
    }
    lines.push('');
  }
  if (report.chatCandidates) {
    lines.push('### Chat Candidate Boundary', '');
    lines.push(`- Candidates: ${report.chatCandidates.candidateCount}`);
    lines.push(`- Fixture-regressing candidates: ${report.chatCandidates.regressingCandidates.length}`);
    lines.push(`- Need actual style proof: ${report.chatCandidates.styleProofCandidates.length}`);
    lines.push(`- Best numeric candidates: ${report.chatCandidates.bestNumericCandidates.map(formatChatCandidate).join('; ') || 'none'}`);
    if (report.chatCandidates.regressingCandidates.length || report.chatCandidates.styleProofCandidates.length) {
      lines.push('');
      lines.push('| Candidate | Risk | Mean delta | Regressions | AW2E delta | Les delta | YSHY delta |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: |');
      for (const candidate of [
        ...report.chatCandidates.styleProofCandidates,
        ...report.chatCandidates.regressingCandidates.slice(0, 6),
      ]) {
        lines.push(`| \`${candidate.name}\` | ${candidate.risk} | ${fmtPct(candidate.meanAlignedDeltaPct)} | ${candidate.regressedFixtures} | ${fmtPct(candidate.fixtureAlignedDeltaPct?.aw2e)} | ${fmtPct(candidate.fixtureAlignedDeltaPct?.lesOublies)} | ${fmtPct(candidate.fixtureAlignedDeltaPct?.yshy)} |`);
      }
    }
    lines.push('');
  }
  if (report.chatCandidateStyleProof) {
    lines.push('### Chat Candidate Style-Proof Boundary', '');
    lines.push(`- Candidates checked: ${report.chatCandidateStyleProof.candidateCount}`);
    lines.push(`- Rejected by actual style: ${report.chatCandidateStyleProof.rejectedCandidates.length}`);
    lines.push(`- Need new sidecar fields: ${report.chatCandidateStyleProof.needsNewSidecarCandidates.length}`);
    if (report.chatCandidateStyleProof.candidates.length) {
      lines.push('');
      lines.push('| Candidate | Style proof | Mean delta | Key fixture findings |');
      lines.push('| --- | --- | ---: | --- |');
      for (const candidate of report.chatCandidateStyleProof.candidates) {
        lines.push(`| \`${candidate.name}\` | ${candidate.styleProofStatus} | ${fmtPct(candidate.meanAlignedDeltaPct)} | ${candidate.fixtureStatuses.map((fixture) => `${fixture.fixtureId}:${fixture.status}`).join('<br>')} |`);
      }
    }
    lines.push('');
  }
  if (report.chatRendererPolicy) {
    lines.push('### Chat Renderer Policy Boundary', '');
    lines.push(`- Global decision: ${report.chatRendererPolicy.globalDecision}`);
    lines.push(`- Public UI: ${report.chatRendererPolicy.publicUiDecision}`);
    lines.push(`- Compared: ${report.chatRendererPolicy.compared}/${report.chatRendererPolicy.fixtures}`);
    lines.push(`- High mismatch fixtures: ${report.chatRendererPolicy.highMismatch}`);
    lines.push(`- Split decisions: ${report.chatRendererPolicy.splitDecisions ? 'YES' : 'NO'}`);
    lines.push(`- Conflicting table-width direction: ${report.chatRendererPolicy.conflictingTableWidthDirection ? 'YES' : 'NO'}`);
    lines.push(`- Global safe candidates: ${report.chatRendererPolicy.globalSafeCandidates.join(', ') || 'none'}`);
    if (report.chatRendererPolicy.globalBlockers.length) {
      lines.push(`- Policy blockers: ${report.chatRendererPolicy.globalBlockers.join('; ')}`);
    }
    lines.push(`- Policy next action: ${report.chatRendererPolicy.nextAction || 'none'}`);
    if (report.chatRendererPolicy.fixtureDecisions.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Default aligned | Table width delta | Candidate models |');
      lines.push('| --- | --- | ---: | ---: | --- |');
      for (const fixture of report.chatRendererPolicy.fixtureDecisions) {
        const candidates = fixture.candidateModels
          .map((candidate) => `${candidate.name} ${fmtPct(candidate.fixtureAlignedDeltaPct)} ${candidate.risk}/${candidate.styleProofStatus}`)
          .join('<br>');
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.defaultAlignedMismatchPct} | ${num(fixture.tableWidthDeltaPx)}px | ${candidates || 'none'} |`);
      }
    }
    lines.push('');
  }
  if (report.chatResidual) {
    lines.push('### Chat Residual Boundary', '');
    lines.push(`- Status: ${report.chatResidual.status}`);
    lines.push(`- High mismatch fixtures: ${report.chatResidual.highMismatch}/${report.chatResidual.totalFixtures}`);
    lines.push(`- Residual axes: ${formatFindingCounts(report.chatResidual.primaryAxes)}`);
    if (report.chatResidual.highMismatchFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Policy | Residual axis | Aligned mismatch | Next diagnostic | Signals |');
      lines.push('| --- | --- | --- | ---: | --- | --- |');
      for (const fixture of report.chatResidual.highMismatchFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.policyDecision} | ${fixture.primaryResidualAxis} | ${fixture.bestAlignedMismatchPct} | ${fixture.nextDiagnostic} | ${fixture.residualSignals.join('<br>')} |`);
      }
    }
    lines.push('');
  }
  if (report.chatMaskStrategy) {
    lines.push('### Chat Mask Strategy', '');
    lines.push(`- Status: ${report.chatMaskStrategy.status}`);
    lines.push(`- High mismatch fixtures: ${report.chatMaskStrategy.highMismatch}/${report.chatMaskStrategy.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatMaskStrategy.decisions)}`);
    if (report.chatMaskStrategy.highMismatchFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Residual | Aligned mismatch | Left col | Top rows | Next action | Blockers |');
      lines.push('| --- | --- | --- | ---: | ---: | ---: | --- | --- |');
      for (const fixture of report.chatMaskStrategy.highMismatchFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.strategyDecision} | ${fixture.residualAxis} | ${fixture.bestAlignedMismatchPct} | ${fixture.leftColMismatchRatioPct} / share ${fixture.leftColMismatchSharePct} | ${fixture.topRowMismatchSharePct} | ${fixture.nextAction} | ${fixture.blockers.join('<br>')} |`);
      }
    }
    lines.push('');
  }
  if (report.chatShellGeometry) {
    lines.push('### Chat Shell Geometry', '');
    lines.push(`- Status: ${report.chatShellGeometry.status}`);
    lines.push(`- Compared: ${report.chatShellGeometry.compared}/${report.chatShellGeometry.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatShellGeometry.decisions)}`);
    if (report.chatShellGeometry.modelNeededFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Aligned mismatch | Template Δ | Table Δ | Table inset Δ | First cell Δ | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |');
      for (const fixture of report.chatShellGeometry.modelNeededFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.shellDecision} | ${fixture.bestAlignedMismatchPct} | ${num(fixture.templateWidthDelta)}/${num(fixture.templateHeightDelta)}px | ${num(fixture.tableWidthDelta)}/${num(fixture.tableHeightDelta)}px | ${num(fixture.tableOffsetDeltaX)}/${num(fixture.tableOffsetDeltaY)}px | ${num(fixture.firstCellWidthDelta)}px | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatFontCell) {
    lines.push('### Chat Font/Cell Model', '');
    lines.push(`- Status: ${report.chatFontCell.status}`);
    lines.push(`- Actionable fixtures: ${report.chatFontCell.actionable}/${report.chatFontCell.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatFontCell.decisions)}`);
    if (report.chatFontCell.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Shell | Aligned mismatch | Cell Δ | Font Δ | Template typography | Cell metrics | Signals | Next action |');
      lines.push('| --- | --- | --- | ---: | ---: | ---: | --- | --- | --- | --- |');
      for (const fixture of report.chatFontCell.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.modelDecision} | ${fixture.shellDecision} | ${fixture.bestAlignedMismatchPct} | ${num(fixture.cellWidthDelta)}px | ${num(fixture.fontSizeDelta)}px | ${fixture.typographyCandidateDeltaLabel || 'n/a'} ${fixture.typographyCandidateRisk || ''} | ${fixture.cellMetricsCandidateDeltaLabel || 'n/a'} ${fixture.cellMetricsCandidateRisk || ''} | ${fixture.signals.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatWidthModel) {
    lines.push('### Chat Width Model', '');
    lines.push(`- Status: ${report.chatWidthModel.status}`);
    lines.push(`- Actionable fixtures: ${report.chatWidthModel.actionable}/${report.chatWidthModel.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatWidthModel.decisions)}`);
    if (report.chatWidthModel.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Aligned mismatch | Actual table/crop | Table Δ | Table-to-crop Δ | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- |');
      for (const fixture of report.chatWidthModel.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.widthDecision} | ${fixture.bestAlignedMismatchPct} | ${num(fixture.actualTableVsCropRatio)}x | ${num(fixture.tableWidthDelta)}px | ${num(fixture.tableToCropDelta)}px | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatMessageShellModel) {
    lines.push('### Chat Message Shell Model', '');
    lines.push(`- Status: ${report.chatMessageShellModel.status}`);
    lines.push(`- Actionable fixtures: ${report.chatMessageShellModel.actionable}/${report.chatMessageShellModel.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatMessageShellModel.decisions)}`);
    if (report.chatMessageShellModel.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Actual shell | Aligned mismatch | Message ? | Content ? | Gutter ? | Insets L/R | Evidence | Next action |');
      lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |');
      for (const fixture of report.chatMessageShellModel.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.messageShellDecision} | ${fixture.actualMessageShellModel || ''} | ${fixture.bestAlignedMismatchPct} | ${num(fixture.messageWidthDelta)}px | ${num(fixture.contentWidthDelta)}px | ${num(fixture.chatRightGutterDelta)}px | ${num(fixture.actualLeftInset)}px / ${num(fixture.actualRightInset)}px | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatTableWidthBudget) {
    lines.push('### Chat Table Width Budget', '');
    lines.push(`- Status: ${report.chatTableWidthBudget.status}`);
    lines.push(`- Actionable fixtures: ${report.chatTableWidthBudget.actionable}/${report.chatTableWidthBudget.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatTableWidthBudget.decisions)}`);
    if (report.chatTableWidthBudget.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Table ? | Text ? | Residual | Scroll ? | Message/content ? | Rejected axes | Best candidate | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |');
      for (const fixture of report.chatTableWidthBudget.actionableFixtures) {
        const rejected = [
          fixture.transformContradicted ? 'transform' : '',
          fixture.spacingRejected ? 'spacing' : '',
          fixture.fontCandidatesRejected ? 'font' : '',
        ].filter(Boolean).join(', ');
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.budgetDecision} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.textMeasureTableDelta)} | ${fmtPx(fixture.textResidual)} | ${fmtPx(fixture.scrollDelta)} | ${fmtPx(fixture.messageDelta)} / ${fmtPx(fixture.contentDelta)} | ${rejected || 'none'} | ${fixture.bestCandidateName || 'none'} ${fixture.bestCandidateDeltaPct ?? ''}% | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatTableIntrinsicProbe) {
    lines.push('### Chat Table Intrinsic Probe', '');
    lines.push(`- Status: ${report.chatTableIntrinsicProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatTableIntrinsicProbe.actionable}/${report.chatTableIntrinsicProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatTableIntrinsicProbe.decisions)}`);
    if (report.chatTableIntrinsicProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Root ? | Table ? | Scroll ? | Caption ? | First cell ? | Row spread | Max cell | Top offset | Best candidate | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |');
      for (const fixture of report.chatTableIntrinsicProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.probeDecision} | ${fmtPx(fixture.rootWidthDelta)} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.tableScrollWidthDelta)} | ${fmtPx(fixture.captionWidthDelta)} | ${fmtPx(fixture.firstCellWidthDelta)} | ${fmtPx(fixture.rowWidthDeltaSpread)} | ${fmtPx(fixture.maxAbsCellDelta)} | ${fmtPx(fixture.maxAbsTopDelta)} | ${fixture.bestCandidateName || 'none'} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatOverflowCropProbe) {
    lines.push('### Chat Overflow/Crop Probe', '');
    lines.push(`- Status: ${report.chatOverflowCropProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatOverflowCropProbe.actionable}/${report.chatOverflowCropProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatOverflowCropProbe.decisions)}`);
    if (report.chatOverflowCropProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Root ? | Table ? | Scroll ? | Overflow ? | Table/crop ? | Top offset | Best candidate | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |');
      for (const fixture of report.chatOverflowCropProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fmtPx(fixture.rootWidthDelta)} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.tableScrollWidthDelta)} | ${fmtPx(fixture.tableOverflowDelta)} | ${num(fixture.tableToCropRatioDelta)} | ${fmtPx(fixture.maxAbsTopDelta)} | ${fixture.bestCandidateName || 'none'} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatIntrinsicWidthModel) {
    lines.push('### Chat Intrinsic Width Model', '');
    lines.push(`- Status: ${report.chatIntrinsicWidthModel.status}`);
    lines.push(`- Actionable fixtures: ${report.chatIntrinsicWidthModel.actionable}/${report.chatIntrinsicWidthModel.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatIntrinsicWidthModel.decisions)}`);
    lines.push(`- Transform-contradicted fixtures: ${report.chatIntrinsicWidthModel.transformContradicted.join(', ') || 'none'}`);
    if (report.chatIntrinsicWidthModel.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Table Δ | First cell Δ | Font Δ | Letter Δ | Border spacing Δ | Transform proof | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |');
      for (const fixture of report.chatIntrinsicWidthModel.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.intrinsicDecision} | ${num(fixture.tableWidthDelta)}px | ${num(fixture.firstCellWidthDelta)}px | ${num(fixture.fontSizeDelta)}px | ${num(fixture.letterSpacingDelta)}px | ${num(fixture.borderSpacingXDelta)}px | ${fixture.transformContradicted ? 'rejected' : 'n/a'} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatFontGlyphModel) {
    lines.push('### Chat Font Glyph Model', '');
    lines.push(`- Status: ${report.chatFontGlyphModel.status}`);
    lines.push(`- Actionable fixtures: ${report.chatFontGlyphModel.actionable}/${report.chatFontGlyphModel.totalFixtures}`);
    lines.push(`- Text measure missing: ${report.chatFontGlyphModel.textMeasureMissing}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatFontGlyphModel.decisions)}`);
    if (report.chatFontGlyphModel.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Table delta | Text measure | Font availability | Table font changed | Font candidates | Evidence | Next action |');
      lines.push('| --- | --- | ---: | --- | --- | --- | --- | --- | --- |');
      for (const fixture of report.chatFontGlyphModel.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.glyphDecision} | ${num(fixture.tableWidthDelta)}px | ${fixture.textMeasureStatus || 'n/a'} (${fixture.textMeasureComparedSamples}) | ${fixture.fontAvailabilityChanged ? 'changed' : 'same'} | ${fixture.tableFontFamilyChanged ? 'yes' : 'no'} | ${fixture.fontCandidatesRejected ? 'rejected/no-gain' : 'not rejected'} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatFontIntrinsicProbe) {
    lines.push('### Chat Font/Intrinsic Probe', '');
    lines.push(`- Status: ${report.chatFontIntrinsicProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatFontIntrinsicProbe.actionable}/${report.chatFontIntrinsicProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatFontIntrinsicProbe.decisions)}`);
    if (report.chatFontIntrinsicProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Table delta | Text delta | Residual | Font availability | Table font | Width override | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | --- | --- | --- | --- | --- |');
      for (const fixture of report.chatFontIntrinsicProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.textMeasureTableDelta)} | ${fmtPx(fixture.tableTextResidual)} | ${fixture.fontAvailabilityChanged ? 'changed' : 'same'} | ${fixture.tableFontFamilyChanged ? 'changed' : 'same'} | ${fixture.widthOverrideGain || 'n/a'} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatRowPaintSourceProbe) {
    lines.push('### Chat Row/Paint/Source Probe', '');
    lines.push(`- Status: ${report.chatRowPaintSourceProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatRowPaintSourceProbe.actionable}/${report.chatRowPaintSourceProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatRowPaintSourceProbe.decisions)}`);
    if (report.chatRowPaintSourceProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Row | Paint gain | Paint style | Source | Top delta | Width delta | Bright mismatch | Evidence | Next action |');
      lines.push('| --- | --- | --- | ---: | --- | --- | ---: | ---: | ---: | --- | --- |');
      for (const fixture of report.chatRowPaintSourceProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.rowDecision || 'n/a'} | ${fixture.paintGainLabel || 'n/a'} | ${fixture.paintStyleStatus || 'n/a'} | ${fixture.sourceOrderDecision || 'n/a'} | ${fmtPx(fixture.maxAbsTopDelta)} | ${fmtPx(fixture.maxAbsWidthDelta)} | ${fixture.brightMismatchSharePct || 'n/a'} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatRowRasterProbe) {
    lines.push('### Chat Row Raster Probe', '');
    lines.push(`- Status: ${report.chatRowRasterProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatRowRasterProbe.actionable}/${report.chatRowRasterProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatRowRasterProbe.decisions)}`);
    if (report.chatRowRasterProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Rows | Row weighted mismatch | Worst row | Worst mismatch | Luma delta | Bright share | Dark share | Evidence | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |');
      for (const fixture of report.chatRowRasterProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.comparedRows} | ${fixture.rowWeightedMismatchPct || 'n/a'} | ${fixture.worstRowIndex ?? 'n/a'} | ${fixture.worstRowMismatchPct || 'n/a'} | ${num(fixture.worstRowSignedLumaDelta)} | ${fixture.worstRowBrightMismatchSharePct || 'n/a'} | ${fixture.worstRowDarkMismatchSharePct || 'n/a'} | ${fixture.evidence.join('<br>')} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatRowRasterCandidates) {
    lines.push('### Chat Row Raster Candidate Comparison', '');
    lines.push(`- Compared: ${report.chatRowRasterCandidates.compared}/${report.chatRowRasterCandidates.totalCandidates}`);
    lines.push(`- Rejected row-raster regressions: ${report.chatRowRasterCandidates.rejected}`);
    lines.push(`- No meaningful row-raster gain: ${report.chatRowRasterCandidates.noMeaningfulGain}`);
    lines.push(`- Production safe: ${report.chatRowRasterCandidates.productionSafe ? 'yes' : 'no'}`);
    if (report.chatRowRasterCandidates.candidates.length) {
      lines.push('');
      lines.push('| Candidate | Status | Risk | AW2E weighted | AW2E delta | AW2E worst | AW2E worst delta | YSHY weighted | YSHY delta | YSHY worst | YSHY worst delta |');
      lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
      for (const candidate of report.chatRowRasterCandidates.candidates) {
        lines.push(`| \`${candidate.name}\` | ${candidate.status} | ${candidate.rowRasterRisk || 'n/a'} | ${candidate.aw2eRowWeightedMismatchPct || 'n/a'} | ${fmtSigned(candidate.aw2eRowWeightedDeltaPct)} | ${candidate.aw2eWorstRowMismatchPct || 'n/a'} | ${fmtSigned(candidate.aw2eWorstRowDeltaPct)} | ${candidate.yshyRowWeightedMismatchPct || 'n/a'} | ${fmtSigned(candidate.yshyRowWeightedDeltaPct)} | ${candidate.yshyWorstRowMismatchPct || 'n/a'} | ${fmtSigned(candidate.yshyWorstRowDeltaPct)} |`);
      }
    }
    lines.push('');
  }
  if (report.chatRowCompositingProbe) {
    lines.push('### Chat Row Compositing Probe', '');
    lines.push(`- Status: ${report.chatRowCompositingProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatRowCompositingProbe.actionable}/${report.chatRowCompositingProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatRowCompositingProbe.decisions)}`);
    if (report.chatRowCompositingProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Rows | Weighted | Luma-corrected | Gain | Edge | Flat paint | Local darker | Chroma | Worst row | Worst row type | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |');
      for (const fixture of report.chatRowCompositingProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.comparedRows} | ${fixture.rowWeightedMismatchPct || 'n/a'} | ${fixture.lumaCorrectedMismatchPct || 'n/a'} | ${fmtSigned(fixture.lumaCorrectionGainPct)} | ${fixture.edgeMismatchSharePct || 'n/a'} | ${fixture.flatPaintMismatchSharePct || 'n/a'} | ${fixture.localDarkerMismatchSharePct || 'n/a'} | ${fixture.chromaMismatchSharePct || 'n/a'} | ${fixture.worstRowIndex ?? 'n/a'} | ${fixture.worstRowDecision || 'n/a'} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatBackgroundSourceProbe) {
    lines.push('### Chat Background/Source Probe', '');
    lines.push(`- Status: ${report.chatBackgroundSourceProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatBackgroundSourceProbe.actionable}/${report.chatBackgroundSourceProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatBackgroundSourceProbe.decisions)}`);
    if (report.chatBackgroundSourceProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Background | Table delta | Weighted | Luma-corrected | Gain | Flat paint | Local darker | Background-size risk | Next action |');
      lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |');
      for (const fixture of report.chatBackgroundSourceProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.backgroundStyleDecision || 'n/a'} | ${fmtPx(fixture.tableWidthDelta)} | ${fixture.rowWeightedMismatchPct || 'n/a'} | ${fixture.lumaCorrectedMismatchPct || 'n/a'} | ${fmtSigned(fixture.lumaCorrectionGainPct)} | ${fixture.flatPaintMismatchSharePct || 'n/a'} | ${fixture.localDarkerMismatchSharePct || 'n/a'} | ${fixture.backgroundSizeCandidateRisk || 'n/a'} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatBackgroundRasterModelProbe) {
    lines.push('### Chat Background Raster Model Probe', '');
    lines.push(`- Status: ${report.chatBackgroundRasterModelProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatBackgroundRasterModelProbe.actionable}/${report.chatBackgroundRasterModelProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatBackgroundRasterModelProbe.decisions)}`);
    if (report.chatBackgroundRasterModelProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Source | Row mismatch | Luma gain | Background-size risk | Width experiment | Table delta | Next action |');
      lines.push('| --- | --- | --- | ---: | ---: | --- | --- | ---: | --- |');
      for (const fixture of report.chatBackgroundRasterModelProbe.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.backgroundSourceDecision || 'n/a'} | ${fixture.rowWeightedMismatchPct || 'n/a'} | ${fmtSigned(fixture.lumaCorrectionGainPct)} | ${fixture.backgroundSizeRisk || 'n/a'} | ${fixture.widthExperiment || 'n/a'} | ${fmtPx(fixture.tableWidthDelta)} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatBackgroundAssetProbe) {
    lines.push('### Chat Background Asset Probe', '');
    lines.push(`- Status: ${report.chatBackgroundAssetProbe.status}`);
    lines.push(`- Actionable fixtures: ${report.chatBackgroundAssetProbe.actionable}/${report.chatBackgroundAssetProbe.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatBackgroundAssetProbe.decisions)}`);
    if (report.chatBackgroundAssetProbe.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Hashes | Local asset | Actual asset | Source asset | Placeholder | Next action |');
      lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
      for (const fixture of report.chatBackgroundAssetProbe.actionableFixtures) {
        const placeholder = [fixture.localPlaceholder ? 'local' : '', fixture.actualPlaceholder ? 'actual' : '', fixture.sourcePlaceholder ? 'source' : ''].filter(Boolean).join(', ') || 'no';
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.hashesMatch ? 'same' : 'different'} | ${fixture.localSummary || 'n/a'} | ${fixture.actualSummary || 'n/a'} | ${fixture.sourceSummary || 'n/a'} | ${placeholder} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatAssetPreservationPlan) {
    lines.push('### Chat Asset Preservation Plan', '');
    lines.push(`- Renderer action: ${report.chatAssetPreservationPlan.rendererAction}`);
    lines.push(`- Actionable fixtures: ${report.chatAssetPreservationPlan.actionable}/${report.chatAssetPreservationPlan.totalFixtures}`);
    lines.push(`- Blockers: ${report.chatAssetPreservationPlan.blockers}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatAssetPreservationPlan.decisions)}`);
    if (report.chatAssetPreservationPlan.productRequirements.length) {
      lines.push('');
      lines.push('| Requirement | Priority | Status | Safety |');
      lines.push('| --- | --- | --- | --- |');
      for (const requirement of report.chatAssetPreservationPlan.productRequirements) {
        lines.push(`| \`${requirement.id}\` | ${requirement.priority || 'n/a'} | ${requirement.implementationStatus || 'n/a'} | ${requirement.publicSafety || 'n/a'} |`);
      }
    }
    if (report.chatAssetPreservationPlan.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Policy | Source asset | Placeholder | Hashes | Next action |');
      lines.push('| --- | --- | --- | --- | --- | --- | --- |');
      for (const fixture of report.chatAssetPreservationPlan.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.rendererPolicy || 'n/a'} | ${fixture.sourceSummary || 'n/a'} | ${fixture.sourcePlaceholder ? 'source' : 'no'} | ${fixture.hashesMatch ? 'match' : 'differ'} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatTemplateScopeGate) {
    lines.push('### Chat Template Scope Gate', '');
    lines.push(`- Action: ${report.chatTemplateScopeGate.action}`);
    lines.push(`- High-mismatch fixtures: ${report.chatTemplateScopeGate.highMismatch}/${report.chatTemplateScopeGate.totalFixtures}`);
    lines.push(`- High models: ${report.chatTemplateScopeGate.highModels.join(', ') || 'none'}`);
    lines.push(`- High scopes: ${report.chatTemplateScopeGate.highScopes.join(', ') || 'none'}`);
    lines.push(`- Blockers: ${report.chatTemplateScopeGate.blockers}`);
    if (report.chatTemplateScopeGate.fixtures.length) {
      lines.push('');
      lines.push('| Fixture | Priority | Scope | Model | Mismatch | Table delta | Text residual | Scroll delta | Best candidate | Ready | Next action |');
      lines.push('| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |');
      for (const fixture of report.chatTemplateScopeGate.fixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | \`${fixture.requiredScope}\` | ${fixture.requiredModel} | ${fixture.alignedMismatchPct || 'n/a'} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.tableTextResidual)} | ${fmtPx(fixture.tableScrollWidthDelta)} | ${fixture.bestCandidateName || 'none'} (${fixture.bestCandidateRisk || 'n/a'}) | ${fixture.promotionReady ? 'yes' : 'no'} | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  if (report.chatCellAllocationProbe) {
    lines.push('### Chat Cell Allocation Probe', '');
    lines.push(`- Status: ${report.chatCellAllocationProbe.status}`);
    lines.push(`- Fixtures: ${report.chatCellAllocationProbe.totalFixtures}`);
    lines.push(`- Scenarios: ${report.chatCellAllocationProbe.scenarios}`);
    lines.push(`- Rejected scenarios: ${report.chatCellAllocationProbe.rejectedScenarios.length}`);
    if (report.chatCellAllocationProbe.fixtures.length) {
      lines.push('');
      lines.push('| Fixture | Scenario | Decision | Table delta | Max text cell | Max ratio | Next action |');
      lines.push('| --- | --- | --- | ---: | ---: | ---: | --- |');
      for (const fixture of report.chatCellAllocationProbe.fixtures) {
        for (const scenario of fixture.scenarios) {
          lines.push(`| \`${fixture.fixtureId}\` | \`${scenario.scenario}\` | ${scenario.allocationDecision} | ${fmtPx(scenario.tableDelta)} | ${fmtPx(scenario.maxAbsTextCellWidthDelta)} | ${fmtSigned(scenario.maxAbsCellRatioDeltaPct)}% | ${scenario.nextAction} |`);
        }
      }
    }
    lines.push('');
  }
  if (report.chatRowGeometry) {
    lines.push('### Chat Row Geometry', '');
    lines.push(`- Status: ${report.chatRowGeometry.status}`);
    lines.push(`- Compared fixtures: ${report.chatRowGeometry.compared}/${report.chatRowGeometry.totalFixtures}`);
    lines.push(`- Decisions: ${formatFindingCounts(report.chatRowGeometry.decisions)}`);
    if (report.chatRowGeometry.actionableFixtures.length) {
      lines.push('');
      lines.push('| Fixture | Decision | Rows | Top delta | Width delta | Cell delta | Top spread | Width spread | Next action |');
      lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
      for (const fixture of report.chatRowGeometry.actionableFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.rowDecision} | ${fixture.comparedRows} | ${num(fixture.maxAbsTopDelta)}px | ${num(fixture.maxAbsWidthDelta)}px | ${num(fixture.maxAbsCellDelta)}px | ${num(fixture.topSpread)}px | ${num(fixture.widthSpread)}px | ${fixture.nextAction} |`);
      }
    }
    lines.push('');
  }
  lines.push('### Next Actions', '');
  for (const action of report.recommendation.nextActions) lines.push(`- ${action}`);
  lines.push('');

  lines.push('## Fixture Evidence', '');
  lines.push('| Fixture | Sandbox | Chat | Full-root best | Diagnostic best | Scroll-metrics diagnostic | Root stitch audit | Root cutoff | Patch | State visibility | Attr class visibility | Attr class geometry | Top panel delta |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    const topDelta = fixture.stateVisibility?.largestHeightDeltas?.[0];
    lines.push([
      `| \`${fixture.fixtureId}\``,
      fmtValidation(fixture.sandboxEvidence),
      fmtValidation(fixture.chatEvidence),
      fixture.bestCandidate
        ? `${fixture.bestCandidate.mismatchPct}% / root ${num(fixture.bestCandidate.rootHeightDelta)}px`
        : fixture.diagnosticBestCandidate
          ? 'trusted missing'
          : fixture.fullRootReason || fixture.fullRootStatus,
      fixture.diagnosticBestCandidate ? `${fixture.diagnosticBestCandidate.mismatchPct}% / root ${num(fixture.diagnosticBestCandidate.rootHeightDelta)}px` : '',
      fmtScrollMetricsComparison(fixture.scrollMetricsComparison),
      fmtRootStitchAudit(fixture.rootStitchAudit),
      fmtRootCutoff(fixture.rootCutoff),
      fixture.bestCandidate?.patch || '',
      fixture.stateVisibility ? `${fixture.stateVisibility.matchedLocalExpected ? 'matched' : 'not matched'} ${fixture.stateVisibility.localVisibleCount ?? ''}/${fixture.stateVisibility.actualVisibleCount ?? ''}` : '',
      fmtAttrClassVisibility(fixture.attrClassVisibility),
      fmtAttrClassGeometry(fixture.attrClassGeometry),
      topDelta ? `${topDelta.selector} ${num(topDelta.heightDelta)}px` : '',
    ].join(' | ') + ' |');
  }
  lines.push('');
  lines.push('## Claim Boundary', '');
  lines.push('- `HOLD_PRODUCTION_RENDERER_PATCH` means diagnostic candidates may guide local experiments, but should not be promoted as generic renderer CSS.');
  lines.push('- Any missing actual screenshots, chat screenshots, full-root comparisons, or cross-fixture agreement must stay visible in TODO.');
  lines.push('- Generated reports remain local-only and ignored by Git.');
  return `${lines.join('\n')}\n`;
}

function fmtRootStitchAudit(audit) {
  if (!audit) return '';
  const diagnostics = audit.overlapDiagnostics ?? [];
  if (diagnostics.length && !(audit.trustedEvidence ?? []).length) {
    const best = diagnostics
      .slice()
      .sort((a, b) => Number(b.segmentCount ?? 0) - Number(a.segmentCount ?? 0))[0];
    const duplicateSegments = best.segmentHashSummary?.duplicateSegmentCount ?? 0;
    return `${audit.status}: diagnostic only (${best.segmentCount} seg, max ${best.maxOverlapScore ?? 'n/a'}, dup ${duplicateSegments})`;
  }
  return audit.trustedEvidence?.length
    ? `${audit.status}: ${audit.trustedEvidence.join('<br>')}`
    : `${audit.status}${audit.primaryIssue ? `: ${audit.primaryIssue}` : ''}`;
}

function fmtScrollMetricsComparison(comparison) {
  if (!comparison) return '';
  if (comparison.status !== 'DIAGNOSTIC_COMPARED') return comparison.status || '';
  const best = comparison.diagnosticBestCandidate;
  const closest = comparison.closestRootHeightCandidate;
  const source = comparison.sourceCandidate;
  const panels = comparison.statePanelGeometry;
  const bestText = best ? `best ${best.mismatchPct}% / root ${num(best.rootHeightDelta)}px` : 'no pixel best';
  const closestText = closest ? `closest ${closest.id} root ${num(closest.rootHeightDelta)}px` : 'no height closest';
  const sourceText = source ? `; source root ${num(source.rootHeightDelta)}px, panelY ${num(source.statePanelYDelta)}px, panelH ${num(source.statePanelHeightDelta)}px` : '';
  const panelText = panels ? `; panels ${panels.compared}/${panels.actualCount}, maxY ${num(panels.maxAbsYDelta)}px, maxH ${num(panels.maxAbsHeightDelta)}px` : '';
  return `${fmtSize(comparison.actualSize)} ${bestText}; ${closestText}${sourceText}${panelText}`;
}

function summarizeScrollMetricsCandidate(candidate) {
  if (!candidate) return null;
  return {
    id: candidate.id,
    mismatchRatio: candidate.mismatchRatio,
    mismatchPct: pctNumber(candidate.mismatchRatio),
    rootHeightDelta: candidate.rootHeightDelta ?? null,
    patch: candidatePatch(candidate),
    localSize: candidate.localSize ?? null,
    statePanelYDelta: candidate.geometryFit?.statePanelYDelta ?? null,
    statePanelHeightDelta: candidate.geometryFit?.statePanelHeightDelta ?? null,
    statePanelComparedCount: candidate.geometryFit?.statePanelComparedCount ?? null,
    geometryScore: candidate.geometryFit?.score ?? null,
  };
}

function summarizeScrollMetricsPanelGeometry(targetGeometry) {
  if (targetGeometry?.status !== 'COMPARED') return null;
  const findings = targetGeometry.statePanelFindings ?? [];
  const compared = findings.filter((finding) => finding.status === 'COMPARED');
  if (!compared.length) {
    return {
      compared: 0,
      missing: findings.filter((finding) => finding.status === 'MISSING').length,
      actualCount: targetGeometry.counts?.statePanels?.actual ?? findings.length,
      localCount: targetGeometry.counts?.statePanels?.local ?? null,
      maxAbsYDelta: null,
      maxAbsHeightDelta: null,
      topFindings: [],
    };
  }
  return {
    compared: compared.length,
    missing: findings.filter((finding) => finding.status === 'MISSING').length,
    actualCount: targetGeometry.counts?.statePanels?.actual ?? findings.length,
    localCount: targetGeometry.counts?.statePanels?.local ?? null,
    maxAbsYDelta: Math.max(...compared.map((finding) => Math.abs(finding.yDelta ?? 0))),
    maxAbsHeightDelta: Math.max(...compared.map((finding) => Math.abs(finding.heightDelta ?? 0))),
    topFindings: compared.slice(0, 5).map((finding) => ({
      selector: finding.selector,
      yDelta: finding.yDelta ?? null,
      heightDelta: finding.heightDelta ?? null,
    })),
  };
}

function fmtRootCutoff(cutoff) {
  if (!cutoff) return '';
  const clipped = cutoff.clippedValues?.length ? ` clipped ${cutoff.clippedValues.join(',')}` : '';
  const below = cutoff.belowValues?.length ? ` below ${cutoff.belowValues.join(',')}` : '';
  return `${cutoff.risk}: stitched ${cutoff.stitchedHeight ?? ''} / sidecar ${cutoff.sidecarHeight ?? ''} / delta ${num(cutoff.heightDelta)}px${clipped}${below}`;
}

function fmtAttrClassVisibility(visibility) {
  if (!visibility) return '';
  const checked = visibility.checkedValues?.join(',') || 'none';
  const prefix = visibility.selectorMismatchCount ? `selector mismatch ${visibility.selectorMismatchCount}` : 'no selector mismatch';
  const panels = visibility.visiblePanelCount == null ? 'unknown panels' : `${visibility.visiblePanelCount} panels`;
  return `${visibility.status}: checked ${checked}, ${panels}, ${prefix}`;
}

function fmtAttrClassGeometry(geometry) {
  if (!geometry) return '';
  const clipped = geometry.clippedValues?.length ? ` clipped ${geometry.clippedValues.join(',')}` : '';
  const below = geometry.belowValues?.length ? ` below ${geometry.belowValues.join(',')}` : '';
  return `${geometry.status}: ${geometry.intersectingCount ?? '?'} intersect / ${geometry.fullyContainedCount ?? '?'} full, closest ${geometry.heightClosestCandidateId ?? ''}${clipped}${below}`;
}

function findFixture(source, fixtureId) {
  return (source?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
    } catch (error) {
      lastError = error;
      await sleep(100);
    }
  }
  throw lastError;
}

async function readReportJson(defaultDirName, reportFileName, overrideDir = '') {
  const file = overrideDir
    ? path.join(path.resolve(overrideDir), reportFileName)
    : path.join(runDir, defaultDirName, reportFileName);
  if (overrideDir && !existsSync(file)) {
    throw new Error(`Missing override report for ${defaultDirName}: ${file}`);
  }
  return readJsonIfExists(file);
}

function normalizeReportOverrides(overrides) {
  return Object.fromEntries(
    Object.entries(overrides)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => [key, path.resolve(value)]),
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fmtValidation(validation) {
  if (!validation) return '';
  return validation.ok ? validation.kind : `MISSING:${validation.kind}`;
}

function formatFindingCounts(counts) {
  const entries = Object.entries(counts ?? {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]));
  return entries.length
    ? entries.map(([key, value]) => `${key}:${value}`).join(', ')
    : 'none';
}

function formatFixtureDeltas(deltas) {
  return (deltas ?? []).length
    ? deltas.map((item) => `${item.fixtureId}:${num(item.value)}px`).join(', ')
    : 'none';
}

function formatChatCandidate(candidate) {
  return `${candidate.name} risk=${candidate.risk || 'unknown'} mean=${fmtPct(candidate.meanAlignedDeltaPct)} regressions=${candidate.regressedFixtures}`;
}

function formatChatStyleProofCandidate(candidate) {
  const fixtures = candidate.fixtureStatuses
    ?.filter((fixture) => fixture.status !== 'STYLE_COMPATIBLE')
    .map((fixture) => `${fixture.fixtureId}:${fixture.status}`)
    .join(',');
  return `${candidate.name} status=${candidate.styleProofStatus}${fixtures ? ` (${fixtures})` : ''}`;
}

function patchFamily(patch) {
  if (!patch) return 'none';
  if (patch.startsWith('renderer-model:')) return patch;
  if (patch.startsWith('sheet-class-alias-css:')) return patch;
  if (patch.startsWith('sheet-class-alias-css')) return 'sheet-class-alias-css:all';
  if (patch.startsWith('sheet-class-alias-text-input-height')) return 'sheet-class-alias-css+text-input-height';
  if (patch.startsWith('inline-block-text-input-height')) return 'inline-block+text-input-height';
  if (patch.startsWith('inline-block-nowrap-text-input-height')) return 'nowrap+text-input-height';
  if (patch.startsWith('inline-block')) return 'inline-block';
  if (patch.startsWith('text-input-height')) return 'text-input-height';
  return patch.split(':')[0] || patch;
}

function candidatePatch(candidate) {
  if (!candidate) return '';
  if (candidate.roll20RendererModel && candidate.roll20RendererModel !== 'default') {
    return `renderer-model:${candidate.roll20RendererModel}`;
  }
  return candidate.contextPatch ?? '';
}

function pctNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number((value * 100).toFixed(2)) : null;
}

function parsePctValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/%$/, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function fmtPct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${num(value)}%` : '';
}

function fmtSigned(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const rounded = num(value);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function fmtPx(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${num(value)}px` : 'n/a';
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : '';
}

function fmtSize(size) {
  if (!size) return 'unknown size';
  if (Array.isArray(size)) return `${size[0]}x${size[1]}`;
  const width = size.w ?? size.width;
  const height = size.h ?? size.height;
  return width && height ? `${width}x${height}` : 'unknown size';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

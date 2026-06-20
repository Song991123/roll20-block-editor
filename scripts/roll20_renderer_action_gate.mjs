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
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_renderer_action_gate.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const outDir = path.join(runDir, 'renderer-action-gate');

async function main() {
  const status = await readJsonIfExists(path.join(runDir, 'actual-verification-status', 'actual-verification-status-results.json'));
  const fullRoot = await readJsonIfExists(path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json'));
  const scrollMetricsFullRoot = await readJsonIfExists(path.join(runDir, 'full-root-candidate-smoke-scroll-metrics', 'full-root-candidate-smoke-results.json'));
  const rootStitchAudit = await readJsonIfExists(path.join(runDir, 'root-stitch-audit', 'root-stitch-audit-results.json'));
  const rootCutoff = await readJsonIfExists(path.join(runDir, 'root-cutoff-diagnostics', 'root-cutoff-diagnostics-results.json'));
  const stateVisibility = await readJsonIfExists(path.join(runDir, 'state-visibility-diagnostics', 'state-visibility-diagnostics-results.json'));
  const attrClassVisibility = await readJsonIfExists(path.join(runDir, 'attr-class-visibility-diagnostics', 'attr-class-visibility-diagnostics-results.json'));
  const attrClassGeometry = await readJsonIfExists(path.join(runDir, 'attr-class-panel-geometry-diagnostics', 'attr-class-panel-geometry-diagnostics-results.json'));
  const geometry = await readJsonIfExists(path.join(runDir, 'geometry-delta-diagnostics', 'geometry-delta-diagnostics-results.json'));
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
  const chatIntrinsicWidthModel = await readJsonIfExists(path.join(runDir, 'chat-intrinsic-width-model', 'chat-intrinsic-width-model-results.json'));
  const chatFontGlyphModel = await readJsonIfExists(path.join(runDir, 'chat-font-glyph-model', 'chat-font-glyph-model-results.json'));
  const chatRowGeometry = await readJsonIfExists(path.join(runDir, 'chat-row-geometry', 'chat-row-geometry-results.json'));

  const fixtures = mergeFixtures({ status, fullRoot, scrollMetricsFullRoot, rootStitchAudit, rootCutoff, stateVisibility, attrClassVisibility, attrClassGeometry, geometry });
  const recommendation = recommend(fixtures, status, runDir, inputFlowAxis, chatParity, chatStyle, chatCandidates, chatCandidateStyleProof, chatRendererPolicy, chatResidual, chatMaskStrategy, chatShellGeometry, chatFontCell, chatWidthModel, chatIntrinsicWidthModel, chatFontGlyphModel, chatRowGeometry);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
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
    chatIntrinsicWidthModel: summarizeChatIntrinsicWidthModel(chatIntrinsicWidthModel),
    chatFontGlyphModel: summarizeChatFontGlyphModel(chatFontGlyphModel),
    chatRowGeometry: summarizeChatRowGeometry(chatRowGeometry),
    chatCurrentMetrics: summarizeChatCurrentMetrics(status),
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

function recommend(fixtures, status, activeRunDir, inputFlowAxis, chatParity, chatStyle, chatCandidates, chatCandidateStyleProof, chatRendererPolicy, chatResidual, chatMaskStrategy, chatShellGeometry, chatFontCell, chatWidthModel, chatIntrinsicWidthModel, chatFontGlyphModel, chatRowGeometry) {
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
  const chatIntrinsicWidthModelSummary = summarizeChatIntrinsicWidthModel(chatIntrinsicWidthModel);
  const chatFontGlyphModelSummary = summarizeChatFontGlyphModel(chatFontGlyphModel);
  const chatRowGeometrySummary = summarizeChatRowGeometry(chatRowGeometry);
  const chatCurrentMetrics = summarizeChatCurrentMetrics(status);
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
      blockers.push(`actual Roll20 chat screenshots have non-PNG or non-1x capture scale for ${chatParitySummary.actualCaptureScaleSuspect}/${chatParitySummary.fixtures} fixtures; recapture with PNG bytes and clip.scale=1 before using pixel mismatch as a production renderer target`);
    }
    if (chatParitySummary.actualCropGeometrySuspect > 0) {
      blockers.push(`actual Roll20 chat crop geometry is suspect for ${chatParitySummary.actualCropGeometrySuspect}/${chatParitySummary.normalizedCompared} normalized fixtures; recapture with element-bound template screenshots before using pixel mismatch as a production renderer target`);
    }
    if (chatParitySummary.actualTemplatePixelSuspect > 0) {
      blockers.push(`actual Roll20 chat crop foreground pixels are suspect for ${chatParitySummary.actualTemplatePixelSuspect}/${chatParitySummary.normalizedCompared} normalized fixtures; the DOM sidecar has rolltemplate text but the PNG likely captured map/grid/background, so recapture from a visible text chat panel before tuning ChatPane CSS`);
    }
    if (chatParitySummary.authoritativeNormalizedHighMismatch > 0) {
      blockers.push(`actual Roll20 rolltemplate crop differs from local ChatPane template for ${chatParitySummary.authoritativeNormalizedHighMismatch}/${chatParitySummary.normalizedCompared} geometry-authoritative normalized fixtures after small-offset alignment; authoritative max aligned mismatch ${chatParitySummary.authoritativeMaxAlignedMismatchPct}% (raw ${chatParitySummary.authoritativeMaxMismatchPct}%)`);
    }
  }
  if (chatCurrentMetrics.missing > 0) {
    blockers.push(`actual Roll20 chat sidecars lack current row/typography metrics for ${chatCurrentMetrics.missing}/${chatCurrentMetrics.total} fixtures (${chatCurrentMetrics.missingFixtures.join(', ')}); run plan:roll20-chat-capture with --require-current-metrics and recapture same-action chat screenshot+DOM sidecars before tuning ChatPane CSS`);
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
    positiveFindings.push(`chat parity diagnostic: normalized=${chatParitySummary.normalizedCompared}/${chatParitySummary.fixtures}, normalizedHighMismatch=${chatParitySummary.normalizedHighMismatch}, alignedHighMismatch=${chatParitySummary.alignedHighMismatch}, authoritativeNormalizedHighMismatch=${chatParitySummary.authoritativeNormalizedHighMismatch}, actualCropGeometrySuspect=${chatParitySummary.actualCropGeometrySuspect}, actualTemplatePixelSuspect=${chatParitySummary.actualTemplatePixelSuspect}, needsNormalizedCapture=${chatParitySummary.needsNormalizedCapture}, currentMetricMissing=${chatCurrentMetrics.missing}/${chatCurrentMetrics.total}, actualChatCssInactive=${chatParitySummary.actualChatCssInactive}, actualChatCssScopedMismatch=${chatParitySummary.actualChatCssScopedMismatch}, actualCaptureScaleSuspect=${chatParitySummary.actualCaptureScaleSuspect}, authoritativeMaxAlignedMismatch=${chatParitySummary.authoritativeMaxAlignedMismatchPct}%, maxAlignedMismatchIncludingSuspects=${chatParitySummary.maxAlignedMismatchPct}%`);
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
  if (!chatIntrinsicWidthModelSummary) {
    warnings.push('chat intrinsic width model has not been run; run diagnose:roll20-chat-intrinsic-width before changing overflowed rolltemplate table sizing');
  } else {
    positiveFindings.push(`chat intrinsic width model: status=${chatIntrinsicWidthModelSummary.status}, actionable=${chatIntrinsicWidthModelSummary.actionable}/${chatIntrinsicWidthModelSummary.totalFixtures}, decisions=${formatFindingCounts(chatIntrinsicWidthModelSummary.decisions)}, transformContradicted=${chatIntrinsicWidthModelSummary.transformContradicted.join(', ') || 'none'}`);
    for (const fixture of chatIntrinsicWidthModelSummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} intrinsic decision=${fixture.intrinsicDecision}, constraint=${fixture.constraintDecision || 'n/a'}, tableDelta=${num(fixture.tableWidthDelta)}px, rowSpread=${num(fixture.rowWidthDeltaSpread)}px, maxCellDelta=${num(fixture.maxAbsCellWidthDelta)}px, firstCellDelta=${num(fixture.firstCellWidthDelta)}px, fontDelta=${num(fixture.fontSizeDelta)}px, letterDelta=${num(fixture.letterSpacingDelta)}px, borderSpacingDelta=${num(fixture.borderSpacingXDelta)}px, transformContradicted=${fixture.transformContradicted ? 'YES' : 'NO'}, next=${fixture.nextAction}`);
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
  if (!chatRowGeometrySummary) {
    warnings.push('chat row geometry model has not been run; run diagnose:roll20-chat-rows to separate row offset, cell allocation, and table-wide width axes before another chat renderer candidate');
  } else {
    positiveFindings.push(`chat row geometry: status=${chatRowGeometrySummary.status}, compared=${chatRowGeometrySummary.compared}/${chatRowGeometrySummary.totalFixtures}, decisions=${formatFindingCounts(chatRowGeometrySummary.decisions)}`);
    for (const fixture of chatRowGeometrySummary.actionableFixtures) {
      positiveFindings.push(`${fixture.fixtureId} row geometry=${fixture.rowDecision}, topDelta=${num(fixture.maxAbsTopDelta)}px, widthDelta=${num(fixture.maxAbsWidthDelta)}px, cellDelta=${num(fixture.maxAbsCellDelta)}px, next=${fixture.nextAction}`);
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
  if (chatParitySummary?.needsNormalizedCapture > 0) {
    nextActions.push('Recapture actual Roll20 chat DOM sidecars with rolltemplate rect/clip metadata for element-level chat parity comparison.');
  }
  if (chatCurrentMetrics.missing > 0) {
    nextActions.push(`Run corepack pnpm run plan:roll20-chat-capture -- ${path.relative(process.cwd(), activeRunDir)} --require-current-metrics, then recapture current row/typography chat evidence for ${chatCurrentMetrics.missingFixtures.join(', ')}.`);
  }
  if (chatParitySummary?.authoritativeNormalizedHighMismatch > 0) {
    if (chatParitySummary.actualChatCssScopedMismatch > 0) {
      nextActions.push('Inspect Roll20 actual chat and character iframe styles for scoped/unprefixed rolltemplate CSS. If confirmed in a correctly uploaded sandbox/test room, model local ChatPane CSS using the verified Roll20 chat selector behavior instead of assuming sheet-* CSS activation.');
    } else if (chatParitySummary.actualChatCssInactive > 0) {
      nextActions.push('First recapture or prove a Roll20 chat state where user rolltemplate CSS is active. Current actual chat CSS-inactive evidence can explain large CSS-active local/actual mismatches.');
    } else if (chatParitySummary.actualCaptureScaleSuspect > 0) {
      nextActions.push('Recapture actual Roll20 chat screenshots as true PNG at clip.scale=1 for every normalized fixture before tuning local ChatPane CSS from pixel diffs.');
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
  };
}

function summarizeChatCurrentMetrics(status) {
  const missingFixtures = Array.isArray(status?.summary?.chatCurrentMetricsMissingFixtures)
    ? status.summary.chatCurrentMetricsMissingFixtures
    : [];
  return {
    present: Number(status?.summary?.chatCurrentMetricsPresent ?? 0),
    total: Number(status?.summary?.chatCurrentMetricsTotal ?? 0),
    missing: Number(status?.summary?.chatCurrentMetricsMissing ?? 0),
    missingFixtures,
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

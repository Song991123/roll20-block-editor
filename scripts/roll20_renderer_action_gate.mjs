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

  const fixtures = mergeFixtures({ status, fullRoot, scrollMetricsFullRoot, rootStitchAudit, rootCutoff, stateVisibility, attrClassVisibility, attrClassGeometry, geometry });
  const recommendation = recommend(fixtures, status, runDir, inputFlowAxis, chatParity);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'Roll20 renderer action gate; diagnostic only, not visual parity',
    recommendation,
    inputFlowAxis: summarizeInputFlowAxis(inputFlowAxis),
    chatParity: summarizeChatParity(chatParity),
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

function recommend(fixtures, status, activeRunDir, inputFlowAxis, chatParity) {
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
    if (chatParitySummary.authoritativeNormalizedHighMismatch > 0) {
      blockers.push(`actual Roll20 rolltemplate crop differs from local ChatPane template for ${chatParitySummary.authoritativeNormalizedHighMismatch}/${chatParitySummary.normalizedCompared} geometry-authoritative normalized fixtures; max normalized mismatch ${chatParitySummary.maxNormalizedMismatchPct}%`);
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
  }
  if (chatParitySummary) {
    positiveFindings.push(`chat parity diagnostic: normalized=${chatParitySummary.normalizedCompared}/${chatParitySummary.fixtures}, normalizedHighMismatch=${chatParitySummary.normalizedHighMismatch}, authoritativeNormalizedHighMismatch=${chatParitySummary.authoritativeNormalizedHighMismatch}, actualCropGeometrySuspect=${chatParitySummary.actualCropGeometrySuspect}, needsNormalizedCapture=${chatParitySummary.needsNormalizedCapture}, actualChatCssInactive=${chatParitySummary.actualChatCssInactive}, actualChatCssScopedMismatch=${chatParitySummary.actualChatCssScopedMismatch}, actualCaptureScaleSuspect=${chatParitySummary.actualCaptureScaleSuspect}, maxNormalizedMismatch=${chatParitySummary.maxNormalizedMismatchPct}%`);
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
  if (chatParitySummary?.needsNormalizedCapture > 0) {
    nextActions.push('Recapture actual Roll20 chat DOM sidecars with rolltemplate rect/clip metadata for element-level chat parity comparison.');
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
  };
}

function summarizeChatParity(report) {
  if (!report?.summary) return null;
  const fixtures = report.fixtures ?? [];
  const authoritativeNormalizedHighMismatch = Number(
    report.summary.authoritativeNormalizedHighMismatch ??
      fixtures.filter((fixture) =>
        fixture.status === 'DIFFED' &&
        fixture.compareMode === 'rolltemplate-crop' &&
        !fixture.actualCropGeometry?.suspect &&
        Number(fixture.mismatchRatio ?? 0) > 0.1,
      ).length,
  );
  return {
    fixtures: Number(report.summary.fixtures ?? 0),
    compared: Number(report.summary.compared ?? 0),
    normalizedCompared: Number(report.summary.normalizedCompared ?? 0),
    needsNormalizedCapture: Number(report.summary.needsNormalizedCapture ?? 0),
    highMismatch: Number(report.summary.highMismatch ?? 0),
    normalizedHighMismatch: Number(report.summary.normalizedHighMismatch ?? 0),
    authoritativeNormalizedHighMismatch,
    actualCropGeometrySuspect: Number(
      report.summary.actualCropGeometrySuspect ??
        fixtures.filter((fixture) => fixture.status === 'DIFFED' && fixture.compareMode === 'rolltemplate-crop' && fixture.actualCropGeometry?.suspect).length,
    ),
    actualChatCssInactive: Number(report.summary.actualChatCssInactive ?? 0),
    actualChatCssScopedMismatch: Number(report.summary.actualChatCssScopedMismatch ?? 0),
    actualChatCssUnknown: Number(report.summary.actualChatCssUnknown ?? 0),
    actualCaptureScaleSuspect: Number(report.summary.actualCaptureScaleSuspect ?? 0),
    maxMismatchRatio: Number(report.summary.maxMismatchRatio ?? 0),
    maxMismatchPct: pctNumber(report.summary.maxMismatchRatio ?? 0),
    maxNormalizedMismatchRatio: Number(report.summary.maxNormalizedMismatchRatio ?? 0),
    maxNormalizedMismatchPct: pctNumber(report.summary.maxNormalizedMismatchRatio ?? 0),
    fixturesWithMismatch: fixtures
      .filter((fixture) => fixture.status === 'DIFFED' && fixture.compareMode === 'rolltemplate-crop' && !fixture.actualCropGeometry?.suspect && Number(fixture.mismatchRatio ?? 0) > 0.1)
      .map((fixture) => ({
        fixtureId: fixture.fixtureId,
        mismatchPct: pctNumber(fixture.mismatchRatio),
        localSize: fixture.localSize ?? null,
        actualSize: fixture.actualSize ?? null,
        actualImageFormat: fixture.actualImageFormat ?? null,
        actualScreenshotScale: fixture.actualScreenshotScale ?? null,
        actualChatCss: fixture.actualChatCss ?? null,
      })),
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

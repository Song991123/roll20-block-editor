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
  const rootStitchAudit = await readJsonIfExists(path.join(runDir, 'root-stitch-audit', 'root-stitch-audit-results.json'));
  const stateVisibility = await readJsonIfExists(path.join(runDir, 'state-visibility-diagnostics', 'state-visibility-diagnostics-results.json'));
  const attrClassVisibility = await readJsonIfExists(path.join(runDir, 'attr-class-visibility-diagnostics', 'attr-class-visibility-diagnostics-results.json'));
  const geometry = await readJsonIfExists(path.join(runDir, 'geometry-delta-diagnostics', 'geometry-delta-diagnostics-results.json'));

  const fixtures = mergeFixtures({ status, fullRoot, rootStitchAudit, stateVisibility, attrClassVisibility, geometry });
  const recommendation = recommend(fixtures, status, runDir);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'Roll20 renderer action gate; diagnostic only, not visual parity',
    recommendation,
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

function mergeFixtures({ status, fullRoot, rootStitchAudit, stateVisibility, attrClassVisibility, geometry }) {
  const ids = new Set();
  for (const source of [status, fullRoot, rootStitchAudit, attrClassVisibility, stateVisibility, geometry]) {
    for (const fixture of source?.fixtures ?? []) ids.add(fixture.fixtureId);
  }

  return [...ids].sort().map((fixtureId) => {
    const statusFixture = findFixture(status, fixtureId);
    const fullRootFixture = findFixture(fullRoot, fixtureId);
    const rootStitchFixture = findFixture(rootStitchAudit, fixtureId);
    const stateFixture = findFixture(stateVisibility, fixtureId);
    const attrClassVisibilityFixture = findFixture(attrClassVisibility, fixtureId);
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
      bestCandidate: fullRootFixture?.bestCandidate
        ? {
            id: fullRootFixture.bestCandidate.id,
            mismatchRatio: fullRootFixture.bestCandidate.mismatchRatio,
            mismatchPct: pctNumber(fullRootFixture.bestCandidate.mismatchRatio),
            rootHeightDelta: fullRootFixture.bestCandidate.rootHeightDelta ?? null,
            patch: fullRootFixture.bestCandidate.contextPatch ?? '',
            localSize: fullRootFixture.bestCandidate.localSize ?? null,
          }
        : null,
      closestRootHeightCandidate: fullRootFixture?.closestRootHeightCandidate
        ? {
            id: fullRootFixture.closestRootHeightCandidate.id,
            mismatchRatio: fullRootFixture.closestRootHeightCandidate.mismatchRatio,
            mismatchPct: pctNumber(fullRootFixture.closestRootHeightCandidate.mismatchRatio),
            rootHeightDelta: fullRootFixture.closestRootHeightCandidate.rootHeightDelta ?? null,
            patch: fullRootFixture.closestRootHeightCandidate.contextPatch ?? '',
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
            patch: fullRootFixture.diagnosticBestCandidate.contextPatch ?? '',
            localSize: fullRootFixture.diagnosticBestCandidate.localSize ?? null,
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

function recommend(fixtures, status, activeRunDir) {
  const blockers = [];
  const warnings = [];
  const positiveFindings = [];

  const generatedSummaryComplete =
    Number(status?.summary?.generatedTargetCount ?? 0) > 0 &&
    status.summary.generatedPresentCount === status.summary.generatedTargetCount &&
    status.summary.generatedDiffedCount === status.summary.generatedTargetCount;
  const generatedStatusComplete = status?.status === 'GENERATED_ACTUAL_SCREENSHOTS_DIFFED';
  const generatedEvidenceComplete = Boolean(generatedSummaryComplete || generatedStatusComplete);

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

  const compared = fixtures.filter((fixture) => fixture.bestCandidate);
  const missingFullRootCandidates = fixtures.filter((fixture) => !fixture.bestCandidate);
  if (missingFullRootCandidates.length) {
    blockers.push(`missing full-root candidate comparison for ${missingFullRootCandidates.map(formatMissingFullRoot).join('; ')}`);
  }
  if (compared.length < 3) {
    blockers.push(`cross-fixture renderer evidence too small: ${compared.length}/${fixtures.length} fixtures have full-root candidates`);
  }

  const patchFamilies = new Map();
  for (const fixture of compared) {
    const family = patchFamily(fixture.bestCandidate?.patch);
    if (!patchFamilies.has(family)) patchFamilies.set(family, []);
    patchFamilies.get(family).push(fixture.fixtureId);
  }
  if (patchFamilies.size > 1) {
    blockers.push(`best diagnostic patch is not uniform across fixtures: ${[...patchFamilies.entries()].map(([patch, ids]) => `${patch}=>${ids.join(',')}`).join('; ')}`);
  }

  for (const fixture of compared) {
    positiveFindings.push(`${fixture.fixtureId} best diagnostic candidate ${fixture.bestCandidate.id} at ${fixture.bestCandidate.mismatchPct}% with root delta ${num(fixture.bestCandidate.rootHeightDelta)}px`);
  }
  for (const fixture of fixtures.filter((item) => item.diagnosticBestCandidate && !item.bestCandidate)) {
    warnings.push(`${fixture.fixtureId} has diagnostic-only full-root comparison ${fixture.diagnosticBestCandidate.id} at ${fixture.diagnosticBestCandidate.mismatchPct}% with root delta ${num(fixture.diagnosticBestCandidate.rootHeightDelta)}px; this must not count as trusted renderer evidence`);
  }

  const matchedState = fixtures.filter((fixture) => fixture.stateVisibility?.matchedLocalExpected === true);
  if (matchedState.length) {
    positiveFindings.push(`local Sandbox expected panel visibility matches actual sampled panels for ${matchedState.map((fixture) => fixture.fixtureId).join(', ')}`);
  }
  const attrClassVisibilityFindings = fixtures.filter((fixture) => fixture.attrClassVisibility?.selectorMismatchCount > 0 || fixture.attrClassVisibility?.checkedVisibleContradiction);
  for (const fixture of attrClassVisibilityFindings) {
    positiveFindings.push(`${fixture.fixtureId} attr_class visibility diagnostic: checked=${fixture.attrClassVisibility.checkedValues.join(',') || 'none'}, visiblePanels=${fixture.attrClassVisibility.visiblePanelCount ?? 'unknown'}, selectorMismatch=${fixture.attrClassVisibility.selectorMismatchCount}`);
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
  lines.push('### Next Actions', '');
  for (const action of report.recommendation.nextActions) lines.push(`- ${action}`);
  lines.push('');

  lines.push('## Fixture Evidence', '');
  lines.push('| Fixture | Sandbox | Chat | Full-root best | Diagnostic best | Root stitch audit | Patch | State visibility | Attr class visibility | Top panel delta |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
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
      fmtRootStitchAudit(fixture.rootStitchAudit),
      fixture.bestCandidate?.patch || '',
      fixture.stateVisibility ? `${fixture.stateVisibility.matchedLocalExpected ? 'matched' : 'not matched'} ${fixture.stateVisibility.localVisibleCount ?? ''}/${fixture.stateVisibility.actualVisibleCount ?? ''}` : '',
      fmtAttrClassVisibility(fixture.attrClassVisibility),
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

function fmtAttrClassVisibility(visibility) {
  if (!visibility) return '';
  const checked = visibility.checkedValues?.join(',') || 'none';
  const prefix = visibility.selectorMismatchCount ? `selector mismatch ${visibility.selectorMismatchCount}` : 'no selector mismatch';
  const panels = visibility.visiblePanelCount == null ? 'unknown panels' : `${visibility.visiblePanelCount} panels`;
  return `${visibility.status}: checked ${checked}, ${panels}, ${prefix}`;
}

function findFixture(source, fixtureId) {
  return (source?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId) ?? null;
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return JSON.parse(await readFile(file, 'utf8'));
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
  if (patch.startsWith('sheet-class-alias-css:')) return patch;
  if (patch.startsWith('sheet-class-alias-css')) return 'sheet-class-alias-css:all';
  if (patch.startsWith('sheet-class-alias-text-input-height')) return 'sheet-class-alias-css+text-input-height';
  if (patch.startsWith('inline-block-text-input-height')) return 'inline-block+text-input-height';
  if (patch.startsWith('inline-block')) return 'inline-block';
  if (patch.startsWith('text-input-height')) return 'text-input-height';
  return patch.split(':')[0] || patch;
}

function pctNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number((value * 100).toFixed(2)) : null;
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : '';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

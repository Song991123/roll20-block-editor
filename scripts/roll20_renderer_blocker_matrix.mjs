#!/usr/bin/env node
/**
 * Summarize why the Roll20 renderer action gate is still holding.
 *
 * This reads local-only full-root candidate reports and writes a compact
 * cross-fixture patch-effect matrix. It does not contact Roll20 and does not
 * prove visual parity.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_renderer_blocker_matrix.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const candidateReportPath = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');
const scrollMetricsCandidateReportPath = path.join(runDir, 'full-root-candidate-smoke-scroll-metrics', 'full-root-candidate-smoke-results.json');
const actionGatePath = path.join(runDir, 'renderer-action-gate', 'renderer-action-gate-results.json');
const outDir = path.join(runDir, 'renderer-blocker-matrix');

async function main() {
  if (!existsSync(candidateReportPath)) {
    throw new Error(`Missing full-root candidate report: ${candidateReportPath}`);
  }
  const candidateReport = JSON.parse(await readFile(candidateReportPath, 'utf8'));
  const scrollMetricsCandidateReport = existsSync(scrollMetricsCandidateReportPath)
    ? JSON.parse(await readFile(scrollMetricsCandidateReportPath, 'utf8'))
    : null;
  const actionGate = existsSync(actionGatePath)
    ? JSON.parse(await readFile(actionGatePath, 'utf8'))
    : null;
  const fixtures = (candidateReport.fixtures ?? []).map(summarizeFixture);
  const scrollMetricsFixtures = (scrollMetricsCandidateReport?.fixtures ?? []).map(summarizeScrollMetricsFixture);
  const matrix = buildPatchMatrix(fixtures);
  const scrollMetricsMatrix = buildScrollMetricsMatrix(scrollMetricsFixtures);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'diagnostic blocker matrix only; not Roll20 visual parity',
    rendererAction: actionGate?.recommendation?.action ?? null,
    blockers: actionGate?.recommendation?.blockers ?? [],
    fixtures,
    scrollMetricsFixtures,
    matrix,
    scrollMetricsMatrix,
    promotionRisks: assessPromotionRisks(fixtures, matrix, actionGate),
    disagreementDiagnosis: diagnoseDisagreement(fixtures, scrollMetricsFixtures, actionGate),
    conclusion: conclude(fixtures, matrix),
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'renderer-blocker-matrix-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'renderer-blocker-matrix-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 RENDERER BLOCKER MATRIX ${report.conclusion.status}`);
  console.log(`fixtures=${fixtures.length}`);
  console.log(`action=${report.rendererAction ?? 'unknown'}`);
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function summarizeFixture(fixture) {
  const candidates = Array.isArray(fixture.candidates) ? fixture.candidates : [];
  const baseline = candidates.find((candidate) => candidate.id === 'sandbox-actual-root-width-source')
    ?? candidates.find((candidate) => candidate.id === 'sandbox-source-state')
    ?? candidates.find((candidate) => candidate.id === 'normal-source-state')
    ?? candidates[0]
    ?? null;
  const best = fixture.bestCandidate ?? null;
  const componentEffects = Array.isArray(fixture.componentEffects) ? fixture.componentEffects : [];
  const effects = componentEffects.map((effect) => ({
    candidateId: effect.candidateId ?? effect.id ?? '',
    patch: patchFamily(effect.patch ?? effect.contextPatch ?? effect.candidateId ?? ''),
    mismatchDeltaPct: round(Number(effect.mismatchDeltaRatio ?? effect.mismatchDelta ?? 0) * (Math.abs(Number(effect.mismatchDeltaRatio ?? 0)) <= 1 ? 100 : 1)),
    rootHeightDeltaChange: round(Number(effect.rootHeightDeltaChange ?? 0)),
    localSize: effect.localSize ?? null,
  }));
  return {
    fixtureId: fixture.fixtureId,
    status: fixture.status,
    actualSize: sizeLabel(fixture.actual?.size ?? fixture.actual?.outputSize),
    bestCandidate: best?.id ?? null,
    bestPatch: patchFamily(best?.contextPatch),
    bestMismatchPct: pct(best?.mismatchRatio),
    bestRootHeightDelta: round(best?.rootHeightDelta),
    baselineCandidate: baseline?.id ?? null,
    baselineMismatchPct: pct(baseline?.mismatchRatio),
    baselineRootHeightDelta: round(baseline?.rootHeightDelta),
    actualRootHeight: round(fixture.actual?.size?.h ?? fixture.actual?.outputSize?.h),
    bestLocalRoot: sizeLabel(best?.localSize),
    componentEffects: effects,
  };
}

function buildPatchMatrix(fixtures) {
  const patchNames = [...new Set(fixtures.flatMap((fixture) => fixture.componentEffects.map((effect) => effect.patch)))].filter(Boolean).sort();
  return patchNames.map((patch) => {
    const cells = fixtures.map((fixture) => {
      const effects = fixture.componentEffects.filter((effect) => effect.patch === patch);
      if (!effects.length) return { fixtureId: fixture.fixtureId, status: 'missing' };
      const best = effects.slice().sort((a, b) => a.mismatchDeltaPct - b.mismatchDeltaPct)[0];
      return {
        fixtureId: fixture.fixtureId,
        status: best.mismatchDeltaPct < -0.05 ? 'helps' : best.mismatchDeltaPct > 0.05 ? 'hurts' : 'neutral',
        bestCandidate: best.candidateId,
        mismatchDeltaPct: best.mismatchDeltaPct,
        rootHeightDeltaChange: best.rootHeightDeltaChange,
      };
    });
    return {
      patch,
      cells,
      helps: cells.filter((cell) => cell.status === 'helps').length,
      hurts: cells.filter((cell) => cell.status === 'hurts').length,
      neutral: cells.filter((cell) => cell.status === 'neutral').length,
      missing: cells.filter((cell) => cell.status === 'missing').length,
    };
  });
}

function summarizeScrollMetricsFixture(fixture) {
  const candidates = Array.isArray(fixture.candidates) ? fixture.candidates : [];
  const source = candidates.find((candidate) => candidate.id === 'sandbox-source-state') ?? null;
  const rootClosest = candidates
    .filter((candidate) => Number.isFinite(Number(candidate.rootHeightDelta)))
    .slice()
    .sort((a, b) => Math.abs(Number(a.rootHeightDelta)) - Math.abs(Number(b.rootHeightDelta)))[0] ?? null;
  const pixelBest = fixture.diagnosticBestCandidate ?? null;
  return {
    fixtureId: fixture.fixtureId,
    status: fixture.status,
    actualSize: sizeLabel(fixture.actual?.size),
    sourceCandidate: summarizeCandidate(source),
    rootClosestCandidate: summarizeCandidate(rootClosest),
    pixelBestCandidate: summarizeCandidate(pixelBest),
    qualifiedSource: isQualifiedScrollMetricsSource(source),
    statePanelGeometry: summarizePanelGeometry(fixture.targetGeometry),
    candidates: candidates.map(summarizeCandidate).filter(Boolean),
  };
}

function summarizeCandidate(candidate) {
  if (!candidate) return null;
  return {
    id: candidate.id ?? '',
    patch: patchFamily(candidate.contextPatch),
    rawPatch: candidate.contextPatch ?? '',
    mismatchPct: pct(candidate.mismatchRatio),
    rootHeightDelta: round(candidate.rootHeightDelta),
    localRoot: sizeLabel(candidate.localSize),
    geometryScore: round(candidate.geometryFit?.score),
    statePanelYDelta: round(candidate.geometryFit?.statePanelYDelta),
    statePanelHeightDelta: round(candidate.geometryFit?.statePanelHeightDelta),
    statePanelComparedCount: candidate.geometryFit?.statePanelComparedCount ?? null,
  };
}

function isQualifiedScrollMetricsSource(candidate) {
  if (!candidate) return false;
  const rootDelta = Math.abs(Number(candidate.rootHeightDelta ?? Number.POSITIVE_INFINITY));
  const panelY = Math.abs(Number(candidate.geometryFit?.statePanelYDelta ?? Number.POSITIVE_INFINITY));
  const panelH = Math.abs(Number(candidate.geometryFit?.statePanelHeightDelta ?? Number.POSITIVE_INFINITY));
  return rootDelta <= 50 && panelY <= 50 && panelH <= 10;
}

function summarizePanelGeometry(targetGeometry) {
  if (targetGeometry?.status !== 'COMPARED') return null;
  const findings = Array.isArray(targetGeometry.statePanelFindings) ? targetGeometry.statePanelFindings : [];
  const compared = findings.filter((finding) => finding.status === 'COMPARED');
  return {
    compared: compared.length,
    actualCount: targetGeometry.counts?.statePanels?.actual ?? findings.length,
    localCount: targetGeometry.counts?.statePanels?.local ?? null,
    maxAbsYDelta: compared.length ? round(Math.max(...compared.map((finding) => Math.abs(Number(finding.yDelta ?? 0))))) : null,
    maxAbsHeightDelta: compared.length ? round(Math.max(...compared.map((finding) => Math.abs(Number(finding.heightDelta ?? 0))))) : null,
  };
}

function buildScrollMetricsMatrix(fixtures) {
  return fixtures
    .filter((fixture) => fixture.status === 'DIAGNOSTIC_COMPARED')
    .map((fixture) => {
      const candidates = fixture.candidates ?? [];
      const source = fixture.sourceCandidate;
      const inlineText = candidates
        .filter((candidate) => candidate.patch === 'inline-block+text-input-height')
        .slice()
        .sort((a, b) => Math.abs(Number(a.rootHeightDelta ?? Number.POSITIVE_INFINITY)) - Math.abs(Number(b.rootHeightDelta ?? Number.POSITIVE_INFINITY)))[0] ?? null;
      const rows = [
        { label: 'source', candidate: source },
        { label: 'root-closest', candidate: fixture.rootClosestCandidate },
        { label: 'pixel-best', candidate: fixture.pixelBestCandidate },
        { label: 'inline-block+text-input-height', candidate: inlineText },
      ].filter((row) => row.candidate);
      return {
        fixtureId: fixture.fixtureId,
        actualSize: fixture.actualSize,
        qualifiedSource: fixture.qualifiedSource,
        statePanelGeometry: fixture.statePanelGeometry,
        rows,
      };
    });
}

function diagnoseDisagreement(fixtures, scrollMetricsFixtures, actionGate) {
  const gateBlockers = actionGate?.recommendation?.blockers ?? [];
  const fullRootBestFamilies = new Map();
  for (const fixture of fixtures) {
    const family = fixture.bestPatch || 'none';
    if (!fullRootBestFamilies.has(family)) fullRootBestFamilies.set(family, []);
    fullRootBestFamilies.get(family).push(fixture.fixtureId);
  }
  const qualifiedScrollMetrics = scrollMetricsFixtures.filter((fixture) => fixture.qualifiedSource);
  const aw2e = scrollMetricsFixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E');
  const notes = [];
  if (gateBlockers.some((blocker) => blocker.includes('best diagnostic patch is not uniform'))) {
    notes.push('The remaining renderer gate blocker is cross-fixture patch-family disagreement.');
  }
  if (aw2e?.qualifiedSource) {
    notes.push('AW2E source-state already matches live scroll-metrics root/panel geometry tightly; its mismatch is not primarily fixed by the Les/YSHY inline-block+text-input-height family.');
  }
  const inlineBestFixtures = fixtures
    .filter((fixture) => fixture.bestPatch === 'inline-block+text-input-height')
    .map((fixture) => fixture.fixtureId);
  if (inlineBestFixtures.length) {
    notes.push(`inline-block+text-input-height remains fixture-best for ${inlineBestFixtures.join(', ')} and should be investigated as a generic Roll20 input/inline-flow baseline axis, not blindly shipped.`);
  }
  return {
    status: gateBlockers.length ? 'BLOCKER_EXPLAINED_NEEDS_RENDERER_MODEL' : 'NO_ACTIVE_GATE_BLOCKER',
    fullRootBestFamilies: Object.fromEntries(fullRootBestFamilies),
    qualifiedScrollMetricsFixtures: qualifiedScrollMetrics.map((fixture) => fixture.fixtureId),
    notes,
  };
}

function conclude(fixtures, matrix) {
  const broadHelps = matrix.filter((row) => row.helps >= 2 && row.hurts === 0);
  const uniformBest = new Set(fixtures.map((fixture) => fixture.bestPatch || 'none')).size === 1;
  if (uniformBest) {
    return {
      status: 'READY_TO_TEST_PATCH_LOCALLY',
      reason: 'All compared fixtures agree on the same best patch family.',
    };
  }
  if (broadHelps.length) {
    return {
      status: 'NEEDS_TARGETED_LOCAL_EXPERIMENT',
      reason: `Some patches help multiple fixtures without hurting the set (${broadHelps.map((row) => row.patch).join(', ')}), but the fixture best patches still differ.`,
    };
  }
  return {
    status: 'HOLD_PRODUCTION_RENDERER_PATCH',
    reason: 'No candidate patch family is currently uniform enough to promote to production renderer CSS.',
  };
}

function assessPromotionRisks(fixtures, matrix, actionGate) {
  const bestFamilies = new Map();
  for (const fixture of fixtures) {
    const family = fixture.bestPatch || 'none';
    if (!bestFamilies.has(family)) bestFamilies.set(family, []);
    bestFamilies.get(family).push(fixture.fixtureId);
  }
  const fixtureCount = fixtures.length;
  const rows = matrix.map((row) => {
    const broadButNotUniform = row.helps >= Math.max(2, Math.ceil(fixtureCount / 2)) && row.helps < fixtureCount && row.hurts === 0;
    const dangerousRootShift = row.cells.some((cell) => (
      Number.isFinite(cell.rootHeightDeltaChange) && Math.abs(cell.rootHeightDeltaChange) > 500
    ));
    const missingCoverage = row.missing > 0;
    const isBestSomewhere = bestFamilies.has(row.patch);
    const risk = missingCoverage || row.hurts > 0 || dangerousRootShift || broadButNotUniform || !isBestSomewhere
      ? 'DO_NOT_PROMOTE_DIRECTLY'
      : 'EXPERIMENT_ONLY';
    const reasons = [];
    if (row.hurts > 0) reasons.push(`hurts ${row.hurts}/${fixtureCount} fixture(s)`);
    if (missingCoverage) reasons.push(`missing from ${row.missing}/${fixtureCount} fixture(s)`);
    if (dangerousRootShift) reasons.push('contains >500px root-height shift');
    if (broadButNotUniform) reasons.push('helps multiple fixtures but is not fixture-best everywhere');
    if (!isBestSomewhere) reasons.push('not best for any fixture');
    if (!reasons.length) reasons.push('requires local production-path experiment before reviewed renderer patch');
    return {
      patch: row.patch,
      risk,
      reason: reasons.join('; '),
      bestFor: bestFamilies.get(row.patch) ?? [],
      helps: row.helps,
      neutral: row.neutral,
      hurts: row.hurts,
      missing: row.missing,
    };
  });
  const gateBlockers = actionGate?.recommendation?.blockers ?? [];
  const gateWarnings = actionGate?.recommendation?.warnings ?? [];
  return {
    summary: summarizePromotionRisk(rows, bestFamilies, gateBlockers),
    fixtureBestFamilies: Object.fromEntries(bestFamilies),
    gateBlockers,
    gateWarnings,
    rows,
  };
}

function summarizePromotionRisk(rows, bestFamilies, gateBlockers) {
  const broadCandidateRows = rows.filter((row) => row.helps >= 2 && row.hurts === 0);
  const bestFamilyCount = bestFamilies.size;
  if (gateBlockers?.length) {
    return `DO_NOT_PROMOTE_DIRECTLY: renderer gate still has ${gateBlockers.length} blocker(s).`;
  }
  if (bestFamilyCount > 1) {
    return `DO_NOT_PROMOTE_DIRECTLY: fixture best families differ (${[...bestFamilies.keys()].join(', ')}).`;
  }
  if (broadCandidateRows.length) {
    return `EXPERIMENT_ONLY: broad-help candidates exist (${broadCandidateRows.map((row) => row.patch).join(', ')}), but they still need production-path and actual Roll20 context proof.`;
  }
  return 'HOLD: no broad candidate is safe to promote from this matrix alone.';
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Renderer Blocker Matrix');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: diagnostic matrix only. This is not Roll20 visual parity.');
  lines.push('');
  lines.push(`Renderer action: **${report.rendererAction ?? 'unknown'}**`);
  lines.push(`Conclusion: **${report.conclusion.status}** - ${report.conclusion.reason}`);
  lines.push('');
  lines.push('## Disagreement Diagnosis');
  lines.push('');
  lines.push(`Status: **${report.disagreementDiagnosis.status}**`);
  lines.push('');
  for (const note of report.disagreementDiagnosis.notes) lines.push(`- ${note}`);
  lines.push('');
  if (report.blockers.length) {
    lines.push('## Current Gate Blockers');
    lines.push('');
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
    lines.push('');
  }
  lines.push('## Fixture Summary');
  lines.push('');
  lines.push('| Fixture | Actual | Best candidate | Best patch | Best mismatch | Root delta | Baseline | Best local root |');
  lines.push('| --- | --- | --- | --- | ---: | ---: | --- | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.actualSize} | ${fixture.bestCandidate ?? ''} | ${fixture.bestPatch || 'none'} | ${fixture.bestMismatchPct ?? ''}% | ${fixture.bestRootHeightDelta ?? ''} | ${fixture.baselineCandidate ?? ''} / ${fixture.baselineMismatchPct ?? ''}% | ${fixture.bestLocalRoot} |`);
  }
  lines.push('');
  lines.push('## Patch Effect Matrix');
  lines.push('');
  lines.push('| Patch family | Helps | Neutral | Hurts | Missing | Per-fixture effect |');
  lines.push('| --- | ---: | ---: | ---: | ---: | --- |');
  for (const row of report.matrix) {
    const cells = row.cells
      .map((cell) => `${cell.fixtureId}: ${cell.status}${Number.isFinite(cell.mismatchDeltaPct) ? ` (${signed(cell.mismatchDeltaPct)}%)` : ''}`)
      .join('<br>');
    lines.push(`| ${row.patch} | ${row.helps} | ${row.neutral} | ${row.hurts} | ${row.missing} | ${cells} |`);
  }
  lines.push('');
  if (report.scrollMetricsMatrix.length) {
    lines.push('## Scroll-Metrics Replacement Matrix');
    lines.push('');
    lines.push('| Fixture | Actual | Source qualified | Source | Root closest | Pixel best | Inline/text-input candidate | Panel geometry |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const fixture of report.scrollMetricsMatrix) {
      const cells = Object.fromEntries(fixture.rows.map((row) => [row.label, row.candidate]));
      lines.push(`| \`${fixture.fixtureId}\` | ${fixture.actualSize} | ${fixture.qualifiedSource ? 'yes' : 'no'} | ${fmtCandidate(cells.source)} | ${fmtCandidate(cells['root-closest'])} | ${fmtCandidate(cells['pixel-best'])} | ${fmtCandidate(cells['inline-block+text-input-height'])} | ${fmtPanelGeometry(fixture.statePanelGeometry)} |`);
    }
    lines.push('');
  }
  lines.push('## Promotion Risk');
  lines.push('');
  lines.push(report.promotionRisks.summary);
  lines.push('');
  lines.push('| Patch family | Risk | Reason | Best for | Helps/Neutral/Hurts/Missing |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of report.promotionRisks.rows) {
    lines.push(`| ${row.patch} | ${row.risk} | ${escapePipe(row.reason)} | ${row.bestFor.map((id) => `\`${id}\``).join('<br>')} | ${row.helps}/${row.neutral}/${row.hurts}/${row.missing} |`);
  }
  lines.push('');
  lines.push('## Next Action');
  lines.push('');
  lines.push('- Keep production renderer CSS on HOLD when `Promotion Risk` says `DO_NOT_PROMOTE_DIRECTLY`, even if a candidate helps two fixtures.');
  lines.push('- Run `corepack pnpm run diagnose:roll20-computed-style-context -- <run>` after refreshing actual Roll20 computed-style sidecars for `.sheet-2colrow`, `.sheet-3colrow`, `.sheet-col`, `input[type="text"]`, and textarea.');
  lines.push('- Resolve AW2E root-cutoff/root-height disagreement before using AW2E pixel-best candidates as production evidence.');
  lines.push('- Use this report after each candidate-smoke rerun to avoid promoting a fixture-specific CSS tweak.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function patchFamily(value) {
  if (!value) return '';
  const text = String(value);
  if (text.startsWith('inline-block-text-input-height')) return 'inline-block+text-input-height';
  if (text.startsWith('inline-block-nowrap-text-input-height')) return 'nowrap+text-input-height';
  if (text.startsWith('inline-block-wordspace')) return 'inline-block-wordspace';
  if (text.startsWith('inline-block-nowrap')) return 'inline-block-nowrap';
  if (text.startsWith('inline-block-font-zero')) return 'inline-block-font-zero';
  if (text.startsWith('text-input-height')) return 'text-input-height';
  if (text.startsWith('sheet-class-alias-css:')) return text;
  if (text.startsWith('sheet-class-alias-css')) return 'sheet-class-alias-css:all';
  if (text.startsWith('sheet-class-alias-text-input-height')) return 'sheet-class-alias-css+text-input-height';
  if (text.startsWith('row-width-fudge')) return 'row-width-fudge';
  if (text.startsWith('actual-root-width')) return 'actual-root-width';
  return text;
}

function fmtCandidate(candidate) {
  if (!candidate) return '';
  const patch = candidate.patch || 'none';
  return `${candidate.id}<br>${patch}<br>${candidate.mismatchPct ?? ''}% / root ${candidate.rootHeightDelta ?? ''}px`;
}

function fmtPanelGeometry(geometry) {
  if (!geometry) return '';
  return `${geometry.compared}/${geometry.actualCount}, maxY ${geometry.maxAbsYDelta ?? ''}px, maxH ${geometry.maxAbsHeightDelta ?? ''}px`;
}

function sizeLabel(size) {
  if (!size) return '';
  const w = Math.round(Number(size.w ?? size.width ?? 0));
  const h = Math.round(Number(size.h ?? size.height ?? 0));
  return w && h ? `${w}x${h}` : '';
}

function pct(ratio) {
  const value = Number(ratio);
  return Number.isFinite(value) ? round(value * 100) : null;
}

function round(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 1000) / 1000 : null;
}

function signed(value) {
  const rounded = round(value);
  if (rounded == null) return '';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function escapePipe(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

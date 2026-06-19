#!/usr/bin/env node
/**
 * Diagnose the Roll20 input/inline-flow renderer axis.
 *
 * This compares source-state candidates with inline/text-input-height
 * candidates against actual Roll20 computed-style sidecars. It is diagnostic
 * only: matching this slice does not prove visual parity.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_input_flow_axis_diagnostics.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const fullRootPath = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');
const scrollMetricsPath = path.join(runDir, 'full-root-candidate-smoke-scroll-metrics', 'full-root-candidate-smoke-results.json');
const outDir = path.join(runDir, 'input-flow-axis-diagnostics');
const selectors = ['input', '.sheet-2colrow', '.sheet-col', 'table', 'textarea'];

async function main() {
  if (!existsSync(fullRootPath)) throw new Error(`Missing full-root candidate report: ${fullRootPath}`);
  const fullRoot = JSON.parse(await readFile(fullRootPath, 'utf8'));
  const scrollMetrics = existsSync(scrollMetricsPath) ? JSON.parse(await readFile(scrollMetricsPath, 'utf8')) : null;
  const scrollMetricsByFixture = new Map((scrollMetrics?.fixtures ?? []).map((fixture) => [fixture.fixtureId, fixture]));
  const fixtures = (fullRoot.fixtures ?? []).map((fixture) => analyzeFixture(fixture, scrollMetricsByFixture.get(fixture.fixtureId)));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'input/inline-flow axis diagnostic; not Roll20 visual parity',
    fixtures,
    summary: summarize(fixtures),
  };
  report.modelRollout = buildModelRollout(report.summary, fixtures);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'input-flow-axis-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'input-flow-axis-diagnostics-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 INPUT FLOW AXIS ${report.summary.status}`);
  console.log(`fixtures=${fixtures.length}`);
  console.log(`inlineBest=${report.summary.inlineBestFixtures.length}`);
  console.log(`sourceGeometryBest=${report.summary.sourceGeometryFixtures.length}`);
  console.log(`applyCandidate=${report.summary.applyCandidateFixtures.length}`);
  console.log(`blockGlobalModel=${report.summary.blockGlobalModelFixtures.length}`);
  console.log(`globalModelSafe=${report.summary.globalModelSafe ? 'YES' : 'NO'}`);
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function analyzeFixture(fixture, scrollMetricsFixture) {
  const actualStylePath = path.join(runDir, 'live-iframe-probe', `${fixture.fixtureId}-computed-styles.json`);
  const actual = existsSync(actualStylePath) ? readJsonSync(actualStylePath) : null;
  const usingScrollMetrics = shouldUseScrollMetrics(scrollMetricsFixture);
  const candidateSource = usingScrollMetrics ? scrollMetricsFixture : fixture;
  const candidates = Array.isArray(candidateSource?.candidates) ? candidateSource.candidates : [];
  const source = findCandidate(candidates, ['sandbox-source-state', 'sandbox-actual-root-width-source', 'normal-source-state']);
  const inlineTextCandidates = candidates
    .filter((candidate) => patchFamily(candidate.contextPatch) === 'inline-block+text-input-height')
    .sort(sortByRootThenMismatch);
  const inlineText = inlineTextCandidates[0] ?? null;
  const rendererModelCandidates = candidates
    .filter((candidate) => patchFamily(candidatePatch(candidate)) === 'renderer-model:input-flow-27' || patchFamily(candidatePatch(candidate)) === 'renderer-model:input-flow-276')
    .sort(sortByRootThenMismatch);
  const rendererModel = rendererModelCandidates[0] ?? null;
  const nowrapText = candidates
    .filter((candidate) => patchFamily(candidate.contextPatch) === 'nowrap+text-input-height')
    .sort(sortByRootThenMismatch)[0] ?? null;
  const best = fixture.bestCandidate ?? null;
  const sourceSummary = summarizeCandidate(source, actual);
  const inlineSummary = summarizeCandidate(inlineText, actual);
  const rendererModelSummary = summarizeCandidate(rendererModel, actual);
  const nowrapSummary = summarizeCandidate(nowrapText, actual);
  const delta = compareCandidateSummaries(sourceSummary, inlineSummary);
  const diagnosis = diagnoseFixture({ fixture, sourceSummary, inlineSummary, nowrapSummary, best, delta });
  const modelBoundary = classifyModelBoundary({ sourceSummary, inlineSummary, rendererModelSummary, diagnosis });
  return {
    fixtureId: fixture.fixtureId,
    status: actual ? 'COMPARED' : 'MISSING_ACTUAL_STYLE',
    candidateEvidence: usingScrollMetrics ? 'scroll-metrics' : 'trusted-full-root',
    actualStylePath: actual ? path.relative(runDir, actualStylePath) : path.relative(runDir, actualStylePath),
    bestCandidate: best ? summarizeBasicCandidate(best) : null,
    source: sourceSummary,
    inlineText: inlineSummary,
    rendererModel: rendererModelSummary,
    nowrapText: nowrapSummary,
    sourceToInlineDelta: delta,
    diagnosis,
    modelBoundary,
  };
}

function shouldUseScrollMetrics(fixture) {
  if (fixture?.status !== 'DIAGNOSTIC_COMPARED') return false;
  const source = (fixture.candidates ?? []).find((candidate) => candidate.id === 'sandbox-source-state');
  if (!source) return false;
  const rootDelta = Math.abs(Number(source.rootHeightDelta ?? Number.POSITIVE_INFINITY));
  const panelY = Math.abs(Number(source.geometryFit?.statePanelYDelta ?? Number.POSITIVE_INFINITY));
  const panelH = Math.abs(Number(source.geometryFit?.statePanelHeightDelta ?? Number.POSITIVE_INFINITY));
  return rootDelta <= 50 && panelY <= 50 && panelH <= 10;
}

function summarizeCandidate(candidate, actual) {
  if (!candidate) return null;
  const selectorSummaries = Object.fromEntries(selectors.map((selector) => [
    selector,
    summarizeSelector(actual, candidate, selector),
  ]));
  return {
    ...summarizeBasicCandidate(candidate),
    selectors: selectorSummaries,
  };
}

function summarizeBasicCandidate(candidate) {
  return {
    id: candidate.id,
    patch: patchFamily(candidatePatch(candidate)),
    rawPatch: candidate.contextPatch ?? '',
    mismatchPct: pct(candidate.mismatchRatio),
    rootHeightDelta: round(candidate.rootHeightDelta),
    localSize: sizeLabel(candidate.localSize),
  };
}

function summarizeSelector(actual, candidate, selector) {
  const actualEntry = (actual?.selected ?? []).find((entry) => entry.selector === selector) ?? null;
  const actualSamples = (actualEntry?.samples ?? []).filter(isVisibleNode).slice(0, 8);
  const localSamples = localNodesForSelector(candidate, selector).filter(isVisibleNode).slice(0, 8);
  return {
    actualCount: actualEntry?.count ?? null,
    localCount: localNodesForSelector(candidate, selector).length,
    actualVisibleSamples: actualSamples.length,
    localVisibleSamples: localSamples.length,
    firstActualHeight: round(actualSamples[0]?.rect?.height),
    firstLocalHeight: round(localSamples[0]?.rect?.height),
    firstHeightDelta: diff(round(localSamples[0]?.rect?.height), round(actualSamples[0]?.rect?.height)),
    medianActualHeight: median(actualSamples.map((node) => node.rect?.height)),
    medianLocalHeight: median(localSamples.map((node) => node.rect?.height)),
    medianHeightDelta: diff(median(localSamples.map((node) => node.rect?.height)), median(actualSamples.map((node) => node.rect?.height))),
    firstActualStyleHeight: actualSamples[0]?.style?.height ?? '',
    firstLocalStyleHeight: localSamples[0]?.style?.height ?? '',
    firstActualDisplay: actualSamples[0]?.style?.display ?? '',
    firstLocalDisplay: localSamples[0]?.style?.display ?? '',
  };
}

function compareCandidateSummaries(source, inlineText) {
  if (!source || !inlineText) return null;
  const selectorDeltas = {};
  for (const selector of selectors) {
    const sourceSelector = source.selectors?.[selector];
    const inlineSelector = inlineText.selectors?.[selector];
    selectorDeltas[selector] = {
      sourceMedianHeightDelta: sourceSelector?.medianHeightDelta ?? null,
      inlineMedianHeightDelta: inlineSelector?.medianHeightDelta ?? null,
      improvement: improvement(sourceSelector?.medianHeightDelta, inlineSelector?.medianHeightDelta),
      sourceFirstHeightDelta: sourceSelector?.firstHeightDelta ?? null,
      inlineFirstHeightDelta: inlineSelector?.firstHeightDelta ?? null,
    };
  }
  return {
    mismatchDeltaPct: diff(inlineText.mismatchPct, source.mismatchPct),
    rootHeightDeltaChange: diff(inlineText.rootHeightDelta, source.rootHeightDelta),
    selectorDeltas,
  };
}

function diagnoseFixture({ fixture, sourceSummary, inlineSummary, nowrapSummary, best, delta }) {
  if (!sourceSummary || !inlineSummary) {
    return {
      status: 'INSUFFICIENT_CANDIDATES',
      notes: ['source or inline/text-input candidate is missing'],
    };
  }
  const bestFamily = patchFamily(best?.contextPatch);
  const notes = [];
  const inputImprovement = delta?.selectorDeltas?.input?.improvement ?? null;
  const rowImprovement = delta?.selectorDeltas?.['.sheet-2colrow']?.improvement ?? null;
  const rootImproves = Math.abs(inlineSummary.rootHeightDelta ?? Number.POSITIVE_INFINITY) < Math.abs(sourceSummary.rootHeightDelta ?? Number.POSITIVE_INFINITY);
  const mismatchImproves = (inlineSummary.mismatchPct ?? Number.POSITIVE_INFINITY) < (sourceSummary.mismatchPct ?? Number.POSITIVE_INFINITY);
  const rootWorsensMaterially = Math.abs(inlineSummary.rootHeightDelta ?? 0) - Math.abs(sourceSummary.rootHeightDelta ?? 0) > 20;
  if (inputImprovement != null && inputImprovement > 0) notes.push(`input median height moves toward actual by ${inputImprovement}px`);
  if (rowImprovement != null && rowImprovement > 0) notes.push(`row median height moves toward actual by ${rowImprovement}px`);
  if (rootImproves) notes.push(`root delta improves from ${sourceSummary.rootHeightDelta}px to ${inlineSummary.rootHeightDelta}px`);
  if (rootWorsensMaterially) notes.push(`root delta worsens from ${sourceSummary.rootHeightDelta}px to ${inlineSummary.rootHeightDelta}px`);
  if (mismatchImproves) notes.push(`pixel mismatch improves from ${sourceSummary.mismatchPct}% to ${inlineSummary.mismatchPct}%`);
  if (nowrapSummary && Math.abs(nowrapSummary.rootHeightDelta ?? 0) === Math.abs(inlineSummary.rootHeightDelta ?? 0)) {
    notes.push('nowrap variant has similar root fit; treat nowrap as secondary until computed style proves it');
  }
  const status = bestFamily === 'inline-block+text-input-height'
    ? 'INLINE_TEXT_INPUT_IS_FIXTURE_BEST'
    : rootWorsensMaterially
      ? 'SOURCE_OR_OTHER_AXIS_DOMINATES'
    : rootImproves || mismatchImproves
      ? 'INLINE_TEXT_INPUT_HELPS_NOT_FIXTURE_BEST'
      : 'SOURCE_OR_OTHER_AXIS_DOMINATES';
  return {
    status,
    bestFamily: bestFamily || 'none',
    rootImproves,
    mismatchImproves,
    rootWorsensMaterially,
    notes,
    actualRootHeight: round(fixture.actual?.size?.h ?? fixture.actual?.outputSize?.h),
  };
}

function classifyModelBoundary({ sourceSummary, inlineSummary, rendererModelSummary, diagnosis }) {
  if (!sourceSummary || !inlineSummary || !rendererModelSummary) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      model: null,
      reasons: ['source, inline/text-input, or production-path renderer-model candidate is missing'],
    };
  }
  const reasons = [];
  const modelMatchesDiagnostic =
    rendererModelSummary.rootHeightDelta === inlineSummary.rootHeightDelta &&
    rendererModelSummary.mismatchPct === inlineSummary.mismatchPct;
  if (modelMatchesDiagnostic) {
    reasons.push('production-path renderer model reproduces the diagnostic inline/text-input candidate');
  } else {
    reasons.push('production-path renderer model does not exactly reproduce the diagnostic inline/text-input candidate');
  }
  if (diagnosis.rootImproves) reasons.push(`root delta improves from ${sourceSummary.rootHeightDelta}px to ${inlineSummary.rootHeightDelta}px`);
  if (diagnosis.mismatchImproves) reasons.push(`pixel mismatch improves from ${sourceSummary.mismatchPct}% to ${inlineSummary.mismatchPct}%`);
  if (diagnosis.rootWorsensMaterially) reasons.push(`root delta worsens materially from ${sourceSummary.rootHeightDelta}px to ${inlineSummary.rootHeightDelta}px`);

  if (
    modelMatchesDiagnostic &&
    diagnosis.status === 'INLINE_TEXT_INPUT_IS_FIXTURE_BEST' &&
    diagnosis.rootImproves &&
    diagnosis.mismatchImproves &&
    !diagnosis.rootWorsensMaterially
  ) {
    return {
      status: 'APPLY_CANDIDATE_FOR_THIS_AXIS',
      model: rendererModelSummary.patch,
      reasons,
    };
  }
  if (diagnosis.status === 'SOURCE_OR_OTHER_AXIS_DOMINATES' || diagnosis.rootWorsensMaterially) {
    return {
      status: 'BLOCK_GLOBAL_MODEL',
      model: rendererModelSummary.patch,
      reasons,
    };
  }
  return {
    status: 'EXPERIMENT_ONLY',
    model: rendererModelSummary.patch,
    reasons,
  };
}

function findCandidate(candidates, ids) {
  for (const id of ids) {
    const found = candidates.find((candidate) => candidate.id === id);
    if (found) return found;
  }
  return null;
}

function sortByRootThenMismatch(a, b) {
  return Math.abs(Number(a.rootHeightDelta ?? Number.POSITIVE_INFINITY)) - Math.abs(Number(b.rootHeightDelta ?? Number.POSITIVE_INFINITY))
    || Number(a.mismatchRatio ?? Number.POSITIVE_INFINITY) - Number(b.mismatchRatio ?? Number.POSITIVE_INFINITY);
}

function localNodesForSelector(candidate, selector) {
  const geometry = candidate?.metrics?.targetGeometry ?? {};
  if (selector === '.sheet-2colrow') return geometry.rows ?? [];
  if (selector === '.sheet-3colrow') return flattenGeometry(geometry).filter((node) => hasClass(node, 'sheet-3colrow'));
  if (selector === '.sheet-col') return flattenGeometry(geometry).filter((node) => hasClass(node, 'sheet-col'));
  if (selector === 'table') return geometry.tables ?? [];
  if (selector === 'input') return geometry.inputs ?? [];
  if (selector === 'textarea') return flattenGeometry(geometry).filter((node) => node.tag === 'TEXTAREA');
  return [];
}

function flattenGeometry(geometry) {
  const roots = [
    ...(geometry.statePanels ?? []),
    ...(geometry.rows ?? []),
    ...(geometry.tables ?? []),
    ...(geometry.inputs ?? []),
  ];
  const out = [];
  const stack = [...roots];
  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;
    out.push(node);
    if (Array.isArray(node.children)) stack.push(...node.children);
  }
  return out;
}

function summarize(fixtures) {
  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  const inlineBestFixtures = compared.filter((fixture) => fixture.diagnosis.status === 'INLINE_TEXT_INPUT_IS_FIXTURE_BEST').map((fixture) => fixture.fixtureId);
  const sourceGeometryFixtures = compared.filter((fixture) => fixture.diagnosis.status === 'SOURCE_OR_OTHER_AXIS_DOMINATES').map((fixture) => fixture.fixtureId);
  const applyCandidateFixtures = compared.filter((fixture) => fixture.modelBoundary.status === 'APPLY_CANDIDATE_FOR_THIS_AXIS').map((fixture) => fixture.fixtureId);
  const blockGlobalModelFixtures = compared.filter((fixture) => fixture.modelBoundary.status === 'BLOCK_GLOBAL_MODEL').map((fixture) => fixture.fixtureId);
  return {
    status: inlineBestFixtures.length && sourceGeometryFixtures.length ? 'SPLIT_RENDERER_AXIS_CONFIRMED' : 'NEEDS_MORE_FIXTURES',
    compared: compared.length,
    inlineBestFixtures,
    sourceGeometryFixtures,
    applyCandidateFixtures,
    blockGlobalModelFixtures,
    globalModelSafe: applyCandidateFixtures.length === compared.length && blockGlobalModelFixtures.length === 0,
  };
}

function buildModelRollout(summary, fixtures) {
  const decisions = fixtures.map((fixture) => {
    const status = fixture.modelBoundary?.status ?? 'INSUFFICIENT_EVIDENCE';
    const recommendedModel = status === 'APPLY_CANDIDATE_FOR_THIS_AXIS'
      ? fixture.modelBoundary.model
      : 'default';
    const productDecision = status === 'APPLY_CANDIDATE_FOR_THIS_AXIS'
      ? 'CANDIDATE_ONLY_DO_NOT_EXPOSE'
      : status === 'BLOCK_GLOBAL_MODEL'
        ? 'KEEP_DEFAULT_BLOCKS_GLOBAL'
        : 'KEEP_DEFAULT_NEEDS_EVIDENCE';
    const requiredEvidence = [];
    if (status === 'APPLY_CANDIDATE_FOR_THIS_AXIS') {
      requiredEvidence.push('prove the model on additional non-fixture sheets before exposing it as an automatic boundary');
      requiredEvidence.push('rerun full-root, chat, preview/edit, and actual Roll20 gates after any production-path toggle');
    } else if (status === 'BLOCK_GLOBAL_MODEL') {
      requiredEvidence.push('identify the separate source/default-state/selector axis before applying input-flow to this sheet shape');
    } else {
      requiredEvidence.push('refresh actual computed-style sidecars and production-path candidates');
    }
    return {
      fixtureId: fixture.fixtureId,
      productDecision,
      diagnosticStatus: status,
      recommendedModel,
      evidenceSource: fixture.candidateEvidence,
      sourceRootHeightDelta: fixture.source?.rootHeightDelta ?? null,
      candidateRootHeightDelta: fixture.inlineText?.rootHeightDelta ?? null,
      sourceMismatchPct: fixture.source?.mismatchPct ?? null,
      candidateMismatchPct: fixture.inlineText?.mismatchPct ?? null,
      reasons: fixture.modelBoundary?.reasons ?? [],
      requiredEvidence,
    };
  });
  const blockers = decisions
    .filter((decision) => decision.productDecision !== 'CANDIDATE_ONLY_DO_NOT_EXPOSE')
    .map((decision) => `${decision.fixtureId}:${decision.productDecision}`);
  return {
    globalDecision: summary.globalModelSafe
      ? 'READY_FOR_REVIEWED_GLOBAL_EXPERIMENT'
      : 'DO_NOT_ENABLE_GLOBALLY',
    publicUiDecision: 'DO_NOT_EXPOSE',
    defaultModel: 'default',
    candidateModels: [...new Set(decisions.map((decision) => decision.recommendedModel).filter((model) => model && model !== 'default'))],
    blockers,
    decisions,
    nextEvidence: summary.globalModelSafe
      ? [
          'run full renderer gate after enabling the model in a controlled branch',
          'capture actual Roll20 evidence for a broader corpus before user-facing exposure',
        ]
      : [
          'keep roll20RendererModel off in product UI',
          'collect broader fixture evidence for source/default-state-dominant sheets',
          'separate input-flow from chat rolltemplate renderer work',
        ],
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Input/Inline-Flow Axis Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: diagnostic only. This does not prove Roll20 visual parity.');
  lines.push('');
  lines.push(`Summary: **${report.summary.status}**`);
  lines.push('');
  lines.push('| Fixture | Diagnosis | Boundary | Best family | Source | Inline/text-input | Source -> inline | Notes |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.diagnosis.status}<br>${fixture.candidateEvidence} | ${fixture.modelBoundary.status}<br>${fixture.modelBoundary.model ?? ''} | ${fixture.diagnosis.bestFamily} | ${fmtCandidate(fixture.source)} | ${fmtCandidate(fixture.inlineText)} | ${fmtDelta(fixture.sourceToInlineDelta)} | ${fixture.diagnosis.notes.join('<br>')} |`);
  }
  lines.push('');
  lines.push('## Model Boundary');
  lines.push('');
  lines.push(`Global model safe: **${report.summary.globalModelSafe ? 'yes' : 'NO'}**`);
  lines.push('');
  lines.push(`- Apply candidate fixtures: ${report.summary.applyCandidateFixtures.map((id) => `\`${id}\``).join(', ') || 'none'}`);
  lines.push(`- Block global model fixtures: ${report.summary.blockGlobalModelFixtures.map((id) => `\`${id}\``).join(', ') || 'none'}`);
  lines.push('');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId} boundary`);
    lines.push('');
    lines.push(`Status: **${fixture.modelBoundary.status}**`);
    lines.push('');
    for (const reason of fixture.modelBoundary.reasons) lines.push(`- ${reason}`);
    lines.push('');
  }
  lines.push('## Rollout Policy');
  lines.push('');
  lines.push(`Global decision: **${report.modelRollout.globalDecision}**`);
  lines.push(`Public UI decision: **${report.modelRollout.publicUiDecision}**`);
  lines.push(`Default model: \`${report.modelRollout.defaultModel}\``);
  lines.push(`Candidate models: ${report.modelRollout.candidateModels.map((model) => `\`${model}\``).join(', ') || 'none'}`);
  lines.push('');
  lines.push('| Fixture | Product decision | Recommended model | Evidence | Source -> candidate | Required evidence |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const decision of report.modelRollout.decisions) {
    lines.push(`| \`${decision.fixtureId}\` | ${decision.productDecision} | \`${decision.recommendedModel}\` | ${decision.evidenceSource} | ${decision.sourceMismatchPct ?? ''}%/${decision.sourceRootHeightDelta ?? ''}px -> ${decision.candidateMismatchPct ?? ''}%/${decision.candidateRootHeightDelta ?? ''}px | ${decision.requiredEvidence.join('<br>')} |`);
  }
  lines.push('');
  lines.push('Next evidence:');
  for (const item of report.modelRollout.nextEvidence) lines.push(`- ${item}`);
  lines.push('');
  lines.push('');
  lines.push('## Selector Height Snapshot');
  lines.push('');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    lines.push('');
    lines.push('| Candidate | Selector | Actual count | Local count | Actual median h | Local median h | Median delta | Actual first h | Local first h | First delta |');
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const [label, candidate] of [['source', fixture.source], ['inline/text-input', fixture.inlineText], ['renderer-model', fixture.rendererModel], ['nowrap/text-input', fixture.nowrapText]]) {
      if (!candidate) continue;
      for (const selector of selectors) {
        const item = candidate.selectors?.[selector];
        if (!item) continue;
        lines.push(`| ${label} | \`${selector}\` | ${item.actualCount ?? ''} | ${item.localCount ?? ''} | ${item.medianActualHeight ?? ''} | ${item.medianLocalHeight ?? ''} | ${item.medianHeightDelta ?? ''} | ${item.firstActualHeight ?? ''} | ${item.firstLocalHeight ?? ''} | ${item.firstHeightDelta ?? ''} |`);
      }
    }
    lines.push('');
  }
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- Use this report to choose the next renderer investigation axis.');
  lines.push('- Do not promote inline/text-input CSS globally while any fixture remains `SOURCE_OR_OTHER_AXIS_DOMINATES`.');
  lines.push('- A fixture can be root-height aligned and still visually mismatched; rerun the renderer gate and visual diff after any production-path change.');
  return `${lines.join('\n')}\n`;
}

function fmtCandidate(candidate) {
  if (!candidate) return '';
  return `${candidate.id}<br>${candidate.patch || 'none'}<br>${candidate.mismatchPct ?? ''}% / root ${candidate.rootHeightDelta ?? ''}px`;
}

function fmtDelta(delta) {
  if (!delta) return '';
  return `mismatch ${signed(delta.mismatchDeltaPct)}%, root ${signed(delta.rootHeightDeltaChange)}px`;
}

function patchFamily(value) {
  if (!value) return '';
  const text = String(value);
  if (text.startsWith('inline-block-text-input-height')) return 'inline-block+text-input-height';
  if (text.startsWith('inline-block-nowrap-text-input-height')) return 'nowrap+text-input-height';
  if (text.startsWith('text-input-height')) return 'text-input-height';
  if (text.startsWith('sheet-class-alias-css:')) return text;
  if (text.startsWith('sheet-class-alias-css')) return 'sheet-class-alias-css:all';
  if (text.startsWith('actual-root-width')) return 'actual-root-width';
  if (text.startsWith('renderer-model:')) return text;
  return text.split(':')[0] || text;
}

function candidatePatch(candidate) {
  if (!candidate) return '';
  if (candidate.roll20RendererModel && candidate.roll20RendererModel !== 'default') {
    return `renderer-model:${candidate.roll20RendererModel}`;
  }
  return candidate.contextPatch ?? '';
}

function isVisibleNode(node) {
  const rect = node?.rect ?? {};
  return Number(rect.width ?? 0) > 0 || Number(rect.height ?? 0) > 0;
}

function hasClass(node, className) {
  return String(node?.className ?? '').split(/\s+/).includes(className);
}

function readJsonSync(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function median(values) {
  const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return round(nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2);
}

function improvement(before, after) {
  if (!Number.isFinite(Number(before)) || !Number.isFinite(Number(after))) return null;
  return round(Math.abs(Number(before)) - Math.abs(Number(after)));
}

function diff(after, before) {
  if (!Number.isFinite(Number(after)) || !Number.isFinite(Number(before))) return null;
  return round(Number(after) - Number(before));
}

function pct(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? round(numeric * 100) : null;
}

function round(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 1000) / 1000 : null;
}

function signed(value) {
  if (!Number.isFinite(Number(value))) return '';
  return Number(value) > 0 ? `+${value}` : `${value}`;
}

function sizeLabel(size) {
  if (!size) return '';
  const width = Math.round(Number(size.w ?? size.width ?? 0));
  const height = Math.round(Number(size.h ?? size.height ?? 0));
  return width && height ? `${width}x${height}` : '';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

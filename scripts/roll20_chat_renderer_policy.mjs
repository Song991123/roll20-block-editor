#!/usr/bin/env node
/**
 * Build a diagnostic-only rollout policy for Roll20 chat/rolltemplate rendering.
 *
 * The policy deliberately does not enable production CSS. It converts current
 * actual Roll20 evidence into per-fixture decisions so global ChatPane patches
 * do not get promoted when fixtures disagree.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-renderer-policy');

const IMPROVEMENT_THRESHOLD_PCT = -0.5;
const REGRESSION_THRESHOLD_PCT = 0.5;
const HIGH_MISMATCH_RATIO = 0.1;
const TABLE_WIDTH_CONFLICT_PX = 8;

async function main() {
  const chatParity = await readJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const chatStyle = await readJson(path.join(runDir, 'chat-style-context-diagnostics', 'chat-style-context-diagnostics-results.json'));
  const chatCandidates = await readJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  const chatCandidateStyleProof = await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json'));

  const policy = buildPolicy({
    runDir: runDirArg,
    chatParity,
    chatStyle,
    chatCandidates,
    chatCandidateStyleProof,
  });

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-renderer-policy-results.json'), `${JSON.stringify(policy, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-renderer-policy-results.md'), renderMarkdown(policy), 'utf8');

  console.log(`ROLL20 CHAT RENDERER POLICY ${policy.policy.globalDecision}`);
  console.log(`publicUi=${policy.policy.publicUiDecision}`);
  for (const blocker of policy.policy.globalBlockers) console.log(`BLOCKER ${blocker}`);
  for (const fixture of policy.fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} decision=${fixture.decision} mismatch=${fixture.defaultAlignedMismatchPct} candidates=${fixture.candidateModels.map((candidate) => candidate.name).join(',') || 'none'}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

export function buildPolicy({ runDir, chatParity, chatStyle, chatCandidates, chatCandidateStyleProof }) {
  const parityFixtures = new Map(
    (chatParity.fixtures ?? [])
      .filter((fixture) => fixture.status !== 'NOT_APPLICABLE')
      .map((fixture) => [fixture.fixtureId, fixture]),
  );
  const styleFixtures = new Map((chatStyle.fixtures ?? []).map((fixture) => [fixture.id, fixture]));
  const fixtureIds = [...parityFixtures.keys()].sort();
  const candidates = chatCandidates.candidates ?? [];
  const styleProofByName = new Map(
    (chatCandidateStyleProof?.candidates ?? []).map((candidate) => [candidate.name, candidate]),
  );

  const fixtures = fixtureIds.map((fixtureId) =>
    classifyFixture({
      fixtureId,
      parity: parityFixtures.get(fixtureId),
      style: styleFixtures.get(fixtureId),
      candidates,
      styleProofByName,
    }),
  );

  const compared = fixtures.filter((fixture) => fixture.evidenceState === 'COMPARED');
  const highMismatch = compared.filter((fixture) => fixture.defaultAlignedMismatchRatio > HIGH_MISMATCH_RATIO);
  const tableWidthDeltas = compared
    .map((fixture) => ({ fixtureId: fixture.fixtureId, value: fixture.tableWidthDeltaPx }))
    .filter((item) => typeof item.value === 'number' && Number.isFinite(item.value));
  const hasPositiveWidthDelta = tableWidthDeltas.some((item) => item.value >= TABLE_WIDTH_CONFLICT_PX);
  const hasNegativeWidthDelta = tableWidthDeltas.some((item) => item.value <= -TABLE_WIDTH_CONFLICT_PX);
  const globalSafeCandidates = candidates
    .filter((candidate) => candidate.status === 'OK' && candidate.name !== 'default')
    .filter((candidate) => Number(candidate.regressedFixtures ?? 0) === 0)
    .filter((candidate) => Number(candidate.improvedFixtures ?? 0) >= Math.max(2, compared.length))
    .filter((candidate) => candidate.promotionRisk === 'candidate-needs-style-proof')
    .map((candidate) => candidate.name);

  const globalBlockers = [];
  if (compared.length !== fixtureIds.length) {
    globalBlockers.push(`chat evidence incomplete: compared=${compared.length}/${fixtureIds.length}`);
  }
  if (highMismatch.length) {
    globalBlockers.push(`default ChatPane still has high aligned mismatch for ${highMismatch.map((fixture) => `${fixture.fixtureId}:${fixture.defaultAlignedMismatchPct}`).join(', ')}`);
  }
  if (hasPositiveWidthDelta && hasNegativeWidthDelta) {
    globalBlockers.push(`actual Roll20 table width deltas conflict: ${tableWidthDeltas.map((item) => `${item.fixtureId}:${formatSignedPx(item.value)}`).join(', ')}`);
  }
  if (highMismatch.length && !globalSafeCandidates.length) {
    globalBlockers.push('no chat renderer candidate improves enough fixtures without regression and with required style-proof status');
  }
  const unsafeFixtureDecisions = fixtures.filter((fixture) => fixture.decision !== 'KEEP_DEFAULT_CHAT_RENDERER');
  if (unsafeFixtureDecisions.length) {
    globalBlockers.push(`per-fixture decisions are split: ${unsafeFixtureDecisions.map((fixture) => `${fixture.fixtureId}:${fixture.decision}`).join(', ')}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'diagnostic-only Roll20 chat renderer rollout policy; does not enable production CSS',
    thresholds: {
      improvementThresholdPct: IMPROVEMENT_THRESHOLD_PCT,
      regressionThresholdPct: REGRESSION_THRESHOLD_PCT,
      highMismatchRatio: HIGH_MISMATCH_RATIO,
      tableWidthConflictPx: TABLE_WIDTH_CONFLICT_PX,
    },
    policy: {
      globalDecision: globalBlockers.length ? 'HOLD_GLOBAL_CHAT_RENDERER_PATCH' : 'READY_FOR_REVIEW_NOT_AUTOMATIC',
      publicUiDecision: 'DO_NOT_EXPOSE',
      defaultModel: 'default',
      globalSafeCandidates,
      globalBlockers,
      nextAction: chooseNextAction({ highMismatch, hasPositiveWidthDelta, hasNegativeWidthDelta, globalSafeCandidates }),
    },
    summary: {
      fixtures: fixtureIds.length,
      compared: compared.length,
      highMismatch: highMismatch.length,
      splitDecisions: unsafeFixtureDecisions.length > 0,
      conflictingTableWidthDirection: hasPositiveWidthDelta && hasNegativeWidthDelta,
      globalSafeCandidateCount: globalSafeCandidates.length,
    },
    fixtures,
  };
}

function classifyFixture({ fixtureId, parity, style, candidates, styleProofByName }) {
  const fixtureKey = fixtureKeyForId(fixtureId);
  const defaultCandidate = candidates.find((candidate) => candidate.name === 'default');
  const defaultAlignedMismatchRatio = numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio);
  const defaultAlignedMismatchPct = pct(defaultAlignedMismatchRatio);
  const tableWidthDeltaPx = numberOrNull(style?.tableDelta?.width);
  const findings = style?.findings ?? [];
  const localSize = parity?.localSize ?? null;
  const actualSize = parity?.actualSize ?? null;
  const candidateModels = candidates
    .filter((candidate) => candidate.status === 'OK' && candidate.name !== 'default')
    .map((candidate) => {
      const fixtureDeltaPct = numberOrNull(candidate.fixtureAlignedDeltaPct?.[fixtureKey]);
      const styleProof = styleProofByName.get(candidate.name);
      return {
        name: candidate.name,
        risk: candidate.promotionRisk ?? 'unknown',
        fixtureAlignedDeltaPct: fixtureDeltaPct,
        meanAlignedDeltaPct: numberOrNull(candidate.meanAlignedDeltaPct),
        regressedFixtures: Number(candidate.regressedFixtures ?? 0),
        improvedFixtures: Number(candidate.improvedFixtures ?? 0),
        styleProofStatus: styleProof?.styleProofStatus ?? 'NOT_STYLE_PROVEN',
        suitableForFixture: isFixtureCandidateSuitable(candidate, fixtureDeltaPct, styleProof),
      };
    })
    .filter((candidate) => typeof candidate.fixtureAlignedDeltaPct === 'number' && candidate.fixtureAlignedDeltaPct <= IMPROVEMENT_THRESHOLD_PCT)
    .sort((a, b) => a.fixtureAlignedDeltaPct - b.fixtureAlignedDeltaPct || a.name.localeCompare(b.name));

  const hardBlockers = [];
  if (!parity || parity.status !== 'DIFFED') hardBlockers.push('missing chat visual diff evidence');
  if (parity?.actualCropGeometry?.suspect) hardBlockers.push(`suspect actual crop geometry: ${parity.actualCropGeometry.reason ?? 'unknown'}`);
  if (parity?.actualTemplatePixels?.suspect) hardBlockers.push(`suspect actual template pixels: ${parity.actualTemplatePixels.reason ?? 'unknown'}`);
  if (parity?.actualChatCss?.classification && parity.actualChatCss.classification !== 'EXPECTED_RULE_PRESENT') {
    hardBlockers.push(`actual Roll20 template CSS not proven active: ${parity.actualChatCss.classification}`);
  }
  const styleFindings = [];
  if (typeof tableWidthDeltaPx === 'number' && Math.abs(tableWidthDeltaPx) >= TABLE_WIDTH_CONFLICT_PX) {
    styleFindings.push(`table-width-delta ${formatSignedPx(tableWidthDeltaPx)}`);
  }
  if (findings.includes('root-typography-delta')) styleFindings.push('root-typography-delta');
  if (findings.includes('table-typography-delta')) styleFindings.push('table-typography-delta');
  if (findings.includes('actual-overflow-clipped-by-chat-crop')) styleFindings.push('actual-overflow-clipped-by-chat-crop');

  const suitableCandidates = candidateModels.filter((candidate) => candidate.suitableForFixture);
  let decision = 'KEEP_DEFAULT_CHAT_RENDERER';
  const reasons = [];
  if (hardBlockers.length) {
    decision = 'NEEDS_AUTHORITATIVE_CHAT_EVIDENCE';
    reasons.push(...hardBlockers);
  } else if (Number(defaultAlignedMismatchRatio ?? 0) > HIGH_MISMATCH_RATIO) {
    if (suitableCandidates.length) {
      decision = 'CANDIDATE_ONLY_DO_NOT_EXPOSE';
      reasons.push(`candidate improves this fixture but is not global-safe: ${suitableCandidates.map((candidate) => candidate.name).join(', ')}`);
    } else if (candidateModels.length) {
      decision = 'NEEDS_NARROW_TEMPLATE_MODEL';
      reasons.push(`only fixture-local candidates exist and none satisfy style-proof/regression rules: ${candidateModels.map((candidate) => `${candidate.name}:${candidate.risk}`).join(', ')}`);
    } else {
      decision = 'NEEDS_NEW_DIAGNOSTIC_MODEL';
      reasons.push('default mismatch is high and no current candidate improves this fixture');
    }
  } else {
    reasons.push(`default aligned mismatch ${defaultAlignedMismatchPct} is below high-mismatch threshold`);
  }
  if (styleFindings.length) reasons.push(`style evidence: ${styleFindings.join(', ')}`);
  if (defaultCandidate?.summary?.authoritativeNormalizedHighMismatch != null) {
    reasons.push(`current default global high mismatch=${defaultCandidate.summary.authoritativeNormalizedHighMismatch}`);
  }

  return {
    fixtureId,
    fixtureKey,
    evidenceState: parity?.status === 'DIFFED' && style?.status === 'COMPARED' ? 'COMPARED' : 'INCOMPLETE',
    decision,
    reasons,
    defaultAlignedMismatchRatio,
    defaultAlignedMismatchPct,
    defaultRawMismatchPct: parity?.mismatchPct ?? '',
    bestAlignedOffset: parity?.bestAlignedOffset ?? null,
    localSize,
    actualSize,
    tableWidthDeltaPx,
    tableHeightDeltaPx: numberOrNull(style?.tableDelta?.height),
    findings,
    actualChatCss: {
      classification: parity?.actualChatCss?.classification ?? 'UNKNOWN',
      expectedRules: parity?.actualChatCss?.expectedRules ?? {},
    },
    candidateModels,
  };
}

function isFixtureCandidateSuitable(candidate, fixtureDeltaPct, styleProof) {
  if (typeof fixtureDeltaPct !== 'number' || fixtureDeltaPct > IMPROVEMENT_THRESHOLD_PCT) return false;
  if (Number(candidate.regressedFixtures ?? 0) > 0) return false;
  if (candidate.promotionRisk === 'reject-regresses-fixtures') return false;
  if (styleProof?.styleProofStatus === 'REJECT_STYLE_CONTRADICTION') return false;
  return candidate.promotionRisk === 'candidate-needs-style-proof' ||
    candidate.promotionRisk === 'single-fixture-only' ||
    styleProof?.styleProofStatus === 'STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW';
}

function chooseNextAction({ highMismatch, hasPositiveWidthDelta, hasNegativeWidthDelta, globalSafeCandidates }) {
  if (hasPositiveWidthDelta && hasNegativeWidthDelta) {
    return 'Model chat renderer by template/fixture evidence instead of width/padding globals; inspect actual Roll20 chat shell width, font, and overflow per template.';
  }
  if (highMismatch.length && !globalSafeCandidates.length) {
    return 'Add a new diagnostic candidate that targets the high-mismatch fixtures and prove it against actual Roll20 computed style before production CSS.';
  }
  if (highMismatch.length) {
    return 'Run style proof and pixel diff for the remaining high-mismatch candidate set.';
  }
  return 'Review the policy manually before any production renderer change; public UI remains hidden.';
}

function renderMarkdown(policy) {
  const lines = [
    '# Roll20 Chat Renderer Policy',
    '',
    `Generated: ${policy.generatedAt}`,
    `Run: \`${policy.runDir}\``,
    '',
    'Scope: diagnostic-only. This does not prove Roll20 visual parity and does not enable production ChatPane CSS.',
    '',
    `## Global Decision: ${policy.policy.globalDecision}`,
    '',
    `- Public UI: ${policy.policy.publicUiDecision}`,
    `- Default model: ${policy.policy.defaultModel}`,
    `- Global safe candidates: ${policy.policy.globalSafeCandidates.join(', ') || 'none'}`,
    `- Next action: ${policy.policy.nextAction}`,
    '',
  ];
  if (policy.policy.globalBlockers.length) {
    lines.push('### Blockers', '');
    for (const blocker of policy.policy.globalBlockers) lines.push(`- ${blocker}`);
    lines.push('');
  }
  lines.push('## Fixture Decisions', '');
  lines.push('| Fixture | Decision | Default aligned | Table width delta | CSS | Candidate models | Reasons |');
  lines.push('| --- | --- | ---: | ---: | --- | --- | --- |');
  for (const fixture of policy.fixtures) {
    const candidates = fixture.candidateModels
      .map((candidate) => `${candidate.name} (${formatSignedPct(candidate.fixtureAlignedDeltaPct)}, ${candidate.risk}, ${candidate.styleProofStatus})`)
      .join('<br>');
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.decision} | ${fixture.defaultAlignedMismatchPct} | ${formatSignedPx(fixture.tableWidthDeltaPx)} | ${fixture.actualChatCss.classification} | ${candidates || 'none'} | ${fixture.reasons.join('<br>')} |`);
  }
  lines.push('');
  lines.push('Do not expose these decisions as product UI until the renderer gate stops holding production patches.');
  return `${lines.join('\n')}\n`;
}

function fixtureKeyForId(fixtureId) {
  if (fixtureId === 'fixtureA') return 'fixtureA';
  if (fixtureId === 'fixtureB') return 'lesOublies';
  if (fixtureId === 'fixtureC') return 'fixtureC';
  return fixtureId
    .replace(/^reference-corpus-/, '')
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9_]/g, '');
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`Missing or invalid required report: ${path.relative(process.cwd(), file)}`);
    console.error(String(error?.message || error));
    process.exit(2);
  }
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pct(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `${Number((value * 100).toFixed(2))}%`;
}

function formatSignedPct(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `${value > 0 ? '+' : ''}${Number(value.toFixed(2))}%`;
}

function formatSignedPx(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `${value > 0 ? '+' : ''}${Number(value.toFixed(3))}px`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

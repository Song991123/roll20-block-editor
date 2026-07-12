#!/usr/bin/env node
/**
 * Gate Roll20 chat renderer work on template-scoped evidence.
 *
 * This is a diagnostic safety gate. It does not promote CSS. It prevents a
 * global ChatPane renderer patch when high-mismatch fixtures point at different
 * width/layout models or when the best candidates are not broadly safe.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = args.includes('--self-test');
const runDirArg = args.find((arg) => arg !== '--self-test') ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-template-scope-gate');

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

async function main() {
  const reports = {
    plan: await readOptionalJson(path.join(runDir, 'chat-targeted-renderer-plan', 'chat-targeted-renderer-plan-results.json')),
    reconciliation: await readOptionalJson(path.join(runDir, 'chat-width-reconciliation', 'chat-width-reconciliation-results.json')),
    policy: await readOptionalJson(path.join(runDir, 'chat-renderer-policy', 'chat-renderer-policy-results.json')),
    candidates: await readOptionalJson(path.join(runDir, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json')),
    styleProof: await readOptionalJson(path.join(runDir, 'chat-candidate-style-proof', 'chat-candidate-style-proof-results.json')),
  };
  const report = buildReport(runDirArg, reports);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-template-scope-gate-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-template-scope-gate-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT TEMPLATE SCOPE GATE action=${report.action} blockers=${report.blockers.length}`);
  for (const fixture of report.fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} scope=${fixture.requiredScope} model=${fixture.requiredModel} mismatch=${fixture.alignedMismatchPct} best=${fixture.bestCandidate?.name ?? 'none'} risk=${fixture.bestCandidate?.risk ?? 'none'}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function buildReport(runDirLabel, reports) {
  const fixtureIds = collectFixtureIds(reports.plan, reports.reconciliation);
  const candidatesByFixture = bestCandidatesByFixture(reports.candidates, reports.styleProof);
  const fixtures = fixtureIds.map((fixtureId) => {
    const plan = findFixture(reports.plan?.fixtures, fixtureId);
    const reconciliation = findFixture(reports.reconciliation?.fixtures, fixtureId);
    const bestCandidate = candidatesByFixture.get(fixtureKeyForId(fixtureId)) ?? null;
    const strategy = plan?.strategy ?? '';
    const nextExperiment = reconciliation?.nextExperiment ?? '';
    const requiredModel = requiredModelFor(strategy, nextExperiment);
    const alignedMismatch = numberOrNull(plan?.alignedMismatchRatio ?? reconciliation?.alignedMismatchRatio);
    return {
      fixtureId,
      priority: plan?.priority ?? reconciliation?.priority ?? priorityFor(alignedMismatch),
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
      promotionReady: isFixturePromotionReady(bestCandidate),
      nextAction: nextActionFor(fixtureId, requiredModel),
    };
  });
  const highMismatch = fixtures.filter((fixture) => fixture.priority === 'P0');
  const highModels = new Set(highMismatch.map((fixture) => fixture.requiredModel).filter(Boolean));
  const highScopes = new Set(highMismatch.map((fixture) => fixture.requiredScope).filter(Boolean));
  const unsafeCandidates = fixtures
    .filter((fixture) => fixture.priority === 'P0' && !fixture.promotionReady)
    .map((fixture) => `${fixture.fixtureId}: ${fixture.bestCandidate?.name ?? 'none'} is not promotion-ready (${fixture.bestCandidate?.risk ?? 'missing candidate'}, style=${fixture.bestCandidate?.styleProofStatus ?? 'n/a'})`);
  const blockers = [];
  if (highModels.size > 1) blockers.push(`high-mismatch fixtures require split renderer models: ${[...highModels].join(', ')}`);
  if (highScopes.size > 1) blockers.push(`high-mismatch fixtures require template-scoped rules: ${[...highScopes].join(', ')}`);
  blockers.push(...unsafeCandidates);
  if (reports.policy?.summary?.globalSafeCandidates === 0 || reports.policy?.summary?.globalSafeCandidates === '0') {
    blockers.push('chat renderer policy reports no global-safe candidates');
  }
  const action = blockers.length ? 'HOLD_GLOBAL_CHAT_RENDERER_PATCH' : 'ALLOW_SCOPED_REVIEW';
  return {
    generatedAt: new Date().toISOString(),
    runDir: runDirLabel,
    scope: 'diagnostic-only template scope gate; no production CSS',
    action,
    summary: {
      fixtures: fixtures.length,
      highMismatch: highMismatch.length,
      highModels: [...highModels],
      highScopes: [...highScopes],
      blockers: blockers.length,
      promotionReadyFixtures: fixtures.filter((fixture) => fixture.promotionReady).length,
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

function isFixturePromotionReady(candidate) {
  return Boolean(
    candidate &&
      candidate.deltaPct <= -0.5 &&
      candidate.regressedFixtures === 0 &&
      !['REJECT_STYLE_CONTRADICTION', 'NOT_STYLE_PROVEN'].includes(candidate.styleProofStatus) &&
      !String(candidate.risk ?? '').includes('reject')
  );
}

function nextActionFor(fixtureId, requiredModel) {
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
    '| Fixture | Priority | Required scope | Required model | Mismatch | Table delta | Text residual | Scroll delta | Best candidate | Ready | Next action |',
    '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | \`${fixture.requiredScope}\` | ${fixture.requiredModel} | ${fixture.alignedMismatchPct} | ${fmtPx(fixture.tableWidthDelta)} | ${fmtPx(fixture.tableTextResidual)} | ${fmtPx(fixture.tableScrollWidthDelta)} | ${fixture.bestCandidate?.name ?? 'none'} (${fixture.bestCandidate?.risk ?? 'n/a'}) | ${fixture.promotionReady ? 'yes' : 'no'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Blockers', '');
  if (report.blockers.length) {
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- No global/template-scope blocker found by this gate.');
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
  });
  assert.equal(report.action, 'HOLD_GLOBAL_CHAT_RENDERER_PATCH');
  assert.ok(report.blockers.some((blocker) => blocker.includes('split renderer models')));
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'official-roll20-AW2E').requiredScope, '.sheet-rolltemplate-aw');
  assert.equal(report.fixtures.find((fixture) => fixture.fixtureId === 'yshy-commission-1bu').requiredModel, 'TABLE_INTRINSIC_SANITIZE_FONT');
  console.log('roll20_chat_template_scope_gate self-test PASS');
}

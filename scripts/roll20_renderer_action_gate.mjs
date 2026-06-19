#!/usr/bin/env node
/**
 * Consolidate Roll20 actual evidence into a renderer action recommendation.
 *
 * This does not prove visual parity and does not upload to Roll20. It prevents
 * diagnostic CSS candidates from being mistaken for production-ready renderer
 * fixes when actual screenshots, chat evidence, or cross-fixture agreement are
 * still missing.
 */

import { existsSync } from 'node:fs';
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
  const stateVisibility = await readJsonIfExists(path.join(runDir, 'state-visibility-diagnostics', 'state-visibility-diagnostics-results.json'));
  const geometry = await readJsonIfExists(path.join(runDir, 'geometry-delta-diagnostics', 'geometry-delta-diagnostics-results.json'));

  const fixtures = mergeFixtures({ status, fullRoot, stateVisibility, geometry });
  const recommendation = recommend(fixtures, status);
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
  for (const note of recommendation.positiveFindings) console.log(`EVIDENCE ${note}`);
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function mergeFixtures({ status, fullRoot, stateVisibility, geometry }) {
  const ids = new Set();
  for (const source of [status, fullRoot, stateVisibility, geometry]) {
    for (const fixture of source?.fixtures ?? []) ids.add(fixture.fixtureId);
  }

  return [...ids].sort().map((fixtureId) => {
    const statusFixture = findFixture(status, fixtureId);
    const fullRootFixture = findFixture(fullRoot, fixtureId);
    const stateFixture = findFixture(stateVisibility, fixtureId);
    const geometryFixture = findFixture(geometry, fixtureId);
    const targets = Object.fromEntries((statusFixture?.actualTargets ?? []).map((target) => [target.id, target.validation]));

    return {
      fixtureId,
      sandboxEvidence: targets.sandbox ?? null,
      chatEvidence: targets.chat ?? null,
      fullRootStatus: fullRootFixture?.status ?? 'MISSING',
      fullRootReason: fullRootFixture?.reason ?? '',
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

function recommend(fixtures, status) {
  const blockers = [];
  const warnings = [];
  const positiveFindings = [];

  if (!status?.actualEvidenceComplete) {
    blockers.push(`actual evidence incomplete: status=${status?.status ?? 'unknown'}`);
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

  const matchedState = fixtures.filter((fixture) => fixture.stateVisibility?.matchedLocalExpected === true);
  if (matchedState.length) {
    positiveFindings.push(`local Sandbox expected panel visibility matches actual sampled panels for ${matchedState.map((fixture) => fixture.fixtureId).join(', ')}`);
  }

  const action = blockers.length
    ? 'HOLD_PRODUCTION_RENDERER_PATCH'
    : warnings.length
      ? 'EXPERIMENT_ONLY'
      : 'READY_FOR_REVIEWED_RENDERER_PATCH';

  const nextActions = blockers.length
    ? [
        'Capture trusted AW2E full-root/root evidence through Roll20 file-input or another proven activation path.',
        'Capture roll20-chat.png screenshots with DOM sidecar evidence for all prepared fixtures.',
        'Keep diagnostic CSS candidates out of production until best-patch behavior is repeated across trusted fixtures.',
      ]
    : [
        'Patch the smallest generic renderer behavior that matches the repeated candidate pattern.',
        'Rerun full-root candidate, preview/edit visual, evidence guard, lint, and build.',
      ];

  return {
    action,
    blockers,
    warnings,
    positiveFindings,
    nextActions,
  };
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
  lines.push('### Next Actions', '');
  for (const action of report.recommendation.nextActions) lines.push(`- ${action}`);
  lines.push('');

  lines.push('## Fixture Evidence', '');
  lines.push('| Fixture | Sandbox | Chat | Full-root best | Patch | State visibility | Top panel delta |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    const topDelta = fixture.stateVisibility?.largestHeightDeltas?.[0];
    lines.push([
      `| \`${fixture.fixtureId}\``,
      fmtValidation(fixture.sandboxEvidence),
      fmtValidation(fixture.chatEvidence),
      fixture.bestCandidate ? `${fixture.bestCandidate.mismatchPct}% / root ${num(fixture.bestCandidate.rootHeightDelta)}px` : fixture.fullRootReason || fixture.fullRootStatus,
      fixture.bestCandidate?.patch || '',
      fixture.stateVisibility ? `${fixture.stateVisibility.matchedLocalExpected ? 'matched' : 'not matched'} ${fixture.stateVisibility.localVisibleCount ?? ''}/${fixture.stateVisibility.actualVisibleCount ?? ''}` : '',
      topDelta ? `${topDelta.selector} ${num(topDelta.heightDelta)}px` : '',
    ].join(' | ') + ' |');
  }
  lines.push('');
  lines.push('## Claim Boundary', '');
  lines.push('- `HOLD_PRODUCTION_RENDERER_PATCH` means diagnostic candidates may guide local experiments, but should not be promoted as generic renderer CSS.');
  lines.push('- Missing actual screenshots, chat screenshots, or cross-fixture agreement must stay visible in TODO.');
  lines.push('- Generated reports remain local-only and ignored by Git.');
  return `${lines.join('\n')}\n`;
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

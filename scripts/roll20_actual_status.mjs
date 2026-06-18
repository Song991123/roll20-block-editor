#!/usr/bin/env node
/**
 * Summarize one local Roll20 actual-screen verification run.
 *
 * This is intentionally a status gate, not a parity shortcut. It reports
 * whether local pre-upload checks passed, whether Roll20 screenshots exist,
 * and whether screenshot diffs have been produced. Missing actual screenshots
 * remain unverified unless --require-actual is passed, in which case the script
 * exits non-zero.
 *
 * Usage:
 *   node scripts/roll20_actual_status.mjs [reports/roll20-actual-compare/<label>] [--require-actual]
 *
 * If the run folder is omitted, the newest PASS pre-upload run is selected.
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const REQUIRE_ACTUAL = args.includes('--require-actual');
const RUN_DIR_ARG = args.find((arg) => arg !== '--require-actual') ?? '';
const RUN_ROOT = path.resolve('reports/roll20-actual-compare');

const TARGETS = [
  {
    id: 'sandbox',
    filename: 'roll20-sandbox.png',
    preferredFilenames: ['roll20-sandbox-root-full.png', 'roll20-sandbox-root.png'],
    evidence: 'Custom Sheet Sandbox or new test-room initial sheet screenshot',
    requiredForGeneratedSheetCheck: true,
  },
  {
    id: 'chat',
    filename: 'roll20-chat.png',
    evidence: 'Roll20 chat or rolltemplate smoke screenshot',
    requiredForGeneratedSheetCheck: true,
  },
  {
    id: 'room',
    filename: 'roll20-room.png',
    evidence: 'Read-only existing solo-room observation screenshot',
    requiredForGeneratedSheetCheck: false,
  },
];

async function main() {
  const runDir = RUN_DIR_ARG ? path.resolve(RUN_DIR_ARG) : await findLatestPreuploadRun();
  const baselineDir = path.join(runDir, 'local-baseline');
  const outDir = path.join(runDir, 'actual-verification-status');
  if (!existsSync(baselineDir)) {
    throw new Error(`missing local baseline folder: ${baselineDir}`);
  }

  const preupload = await readPreupload(runDir);
  const diffReport = await readDiff(runDir);
  const blockerEvidence = await readBlockerEvidence(runDir);
  const fixtures = [];
  for (const fixtureId of await listFixtureIds(baselineDir)) {
    fixtures.push(await inspectFixture(runDir, fixtureId, diffReport));
  }

  const allTargets = fixtures.flatMap((fixture) => fixture.actualTargets);
  const generatedTargets = allTargets.filter((target) => target.requiredForGeneratedSheetCheck);
  const observationTargets = allTargets.filter((target) => !target.requiredForGeneratedSheetCheck);
  const actualTargetCount = allTargets.length;
  const actualPresentCount = allTargets.filter((target) => target.exists).length;
  const diffedCount = allTargets.filter((target) => target.diffStatus === 'DIFFED').length;
  const failedDiffCount = allTargets.filter((target) => target.diffStatus === 'FAIL').length;
  const generatedTargetCount = generatedTargets.length;
  const generatedPresentCount = generatedTargets.filter((target) => target.exists).length;
  const generatedDiffedCount = generatedTargets.filter((target) => target.diffStatus === 'DIFFED').length;
  const observationTargetCount = observationTargets.length;
  const observationPresentCount = observationTargets.filter((target) => target.exists).length;
  const observationDiffedCount = observationTargets.filter((target) => target.diffStatus === 'DIFFED').length;
  const localReady =
    Boolean(preupload.pass) &&
    fixtures.every((fixture) => fixture.localBaselineReady && fixture.payloadReady) &&
    failedDiffCount === 0;
  const generatedEvidenceComplete =
    generatedPresentCount === generatedTargetCount && generatedDiffedCount === generatedTargetCount;
  const roomObservationComplete =
    observationTargetCount === 0 ||
    (observationPresentCount === observationTargetCount && observationDiffedCount === observationTargetCount);
  const actualEvidenceComplete = generatedEvidenceComplete && roomObservationComplete;
  const commandPass = localReady && (!REQUIRE_ACTUAL || generatedEvidenceComplete);
  const status = statusOf({
    localReady,
    generatedEvidenceComplete,
    generatedPresentCount,
    generatedTargetCount,
    generatedDiffedCount,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    requireActual: REQUIRE_ACTUAL,
    scope: 'status of local Roll20 actual-screen evidence; not a Roll20 visual parity claim',
    status,
    commandPass,
    actualEvidenceComplete,
    actualParityVerified: false,
    preupload,
    summary: {
      fixtures: fixtures.length,
      actualTargetCount,
      actualPresentCount,
      actualMissingCount: actualTargetCount - actualPresentCount,
      diffedCount,
      failedDiffCount,
      generatedTargetCount,
      generatedPresentCount,
      generatedMissingCount: generatedTargetCount - generatedPresentCount,
      generatedDiffedCount,
      observationTargetCount,
      observationPresentCount,
      observationMissingCount: observationTargetCount - observationPresentCount,
      observationDiffedCount,
      blockerEvidenceCount: blockerEvidence.length,
    },
    blockerEvidence,
    fixtures,
    nextAction: buildNextAction({
      preupload,
      generatedPresentCount,
      generatedTargetCount,
      generatedDiffedCount,
      observationPresentCount,
      observationTargetCount,
      blockerEvidence,
    }),
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'actual-verification-status-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'actual-verification-status-results.md'), renderMarkdown(report), 'utf8');

  console.log(renderConsoleSummary(report, outDir));
  process.exitCode = commandPass ? 0 : 1;
}

async function findLatestPreuploadRun() {
  if (!existsSync(RUN_ROOT)) {
    throw new Error(`missing Roll20 actual-compare report root: ${RUN_ROOT}`);
  }
  const entries = await fs.readdir(RUN_ROOT, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = path.join(RUN_ROOT, entry.name);
    const preuploadJson = path.join(runDir, 'preupload-verification', 'preupload-verification-results.json');
    const baselineDir = path.join(runDir, 'local-baseline');
    if (!existsSync(preuploadJson) || !existsSync(baselineDir)) continue;
    try {
      const report = JSON.parse(await fs.readFile(preuploadJson, 'utf8'));
      if (!report.pass) continue;
      const stat = await fs.stat(preuploadJson);
      candidates.push({ runDir, mtimeMs: stat.mtimeMs });
    } catch {
      // Ignore malformed local reports.
    }
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!candidates[0]) {
    throw new Error(`no PASS pre-upload run found under ${RUN_ROOT}; pass an explicit run folder`);
  }
  return candidates[0].runDir;
}

async function readPreupload(runDir) {
  const file = path.join(runDir, 'preupload-verification', 'preupload-verification-results.json');
  if (!existsSync(file)) {
    return { exists: false, pass: false, file: rel(file), note: 'missing pre-upload verification report' };
  }
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  return {
    exists: true,
    pass: Boolean(report.pass),
    file: rel(file),
    generatedAt: report.generatedAt ?? null,
    checks: Array.isArray(report.results)
      ? report.results.map((result) => ({ id: result.id, ok: Boolean(result.ok), exitCode: result.exitCode }))
      : [],
  };
}

async function readDiff(runDir) {
  const file = path.join(runDir, 'actual-screenshot-diff', 'actual-screenshot-diff-results.json');
  if (!existsSync(file)) return { exists: false, items: [], file: rel(file) };
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  return { exists: true, file: rel(file), generatedAt: report.generatedAt ?? null, items: report.items ?? [] };
}

async function readBlockerEvidence(runDir) {
  const evidenceDir = path.join(runDir, 'roll20-sandbox-observation');
  if (!existsSync(evidenceDir)) return [];
  const entries = await fs.readdir(evidenceDir, { withFileTypes: true });
  const evidence = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const file = path.join(evidenceDir, entry.name);
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      evidence.push({
        file: rel(file),
        status: data.status ?? data.result ?? data.ok ?? null,
        blocker: data.blocker ?? data.error ?? data.message ?? null,
      });
    } catch {
      evidence.push({ file: rel(file), status: 'unreadable', blocker: null });
    }
  }
  return evidence;
}

async function listFixtureIds(baselineDir) {
  const entries = await fs.readdir(baselineDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function inspectFixture(runDir, fixtureId, diffReport) {
  const root = path.join(runDir, 'local-baseline', fixtureId);
  const payload = path.join(root, 'payload');
  const screenshots = path.join(root, 'screenshots');
  const localPreview = path.join(screenshots, 'local-preview.png');
  const localEdit = path.join(screenshots, 'local-edit.png');
  const payloadFiles = ['sheet.html', 'sheet.css', 'translation.json'].map((name) => ({
    name,
    path: rel(path.join(payload, name)),
    exists: existsSync(path.join(payload, name)),
  }));
  return {
    fixtureId,
    localBaselineReady: existsSync(localPreview) && existsSync(localEdit),
    payloadReady: payloadFiles.every((file) => file.exists),
    localScreenshots: {
      preview: fileStatus(localPreview),
      edit: fileStatus(localEdit),
    },
    payloadFiles,
    actualTargets: TARGETS.map((target) => inspectTarget(fixtureId, screenshots, target, diffReport)),
  };
}

function inspectTarget(fixtureId, screenshots, target, diffReport) {
  const preferredFiles = (target.preferredFilenames ?? (target.preferredFilename ? [target.preferredFilename] : []))
    .map((filename) => path.join(screenshots, filename));
  const preferredFile = preferredFiles.find((file) => existsSync(file)) ?? preferredFiles[0] ?? null;
  const fallbackFile = path.join(screenshots, target.filename);
  const file = preferredFile && existsSync(preferredFile) ? preferredFile : fallbackFile;
  const diffItem = diffReport.items.find((item) => item.fixtureId === fixtureId && item.target === target.id);
  return {
    id: target.id,
    evidence: target.evidence,
    screenshot: fileStatus(file),
    preferredScreenshot: preferredFile ? fileStatus(preferredFile) : null,
    preferredScreenshots: preferredFiles.map(fileStatus),
    fallbackScreenshot: preferredFile ? fileStatus(fallbackFile) : null,
    exists: existsSync(file),
    diffStatus: diffItem?.status ?? 'NOT_RUN',
    requiredForGeneratedSheetCheck: Boolean(target.requiredForGeneratedSheetCheck),
    bestMismatchRatio: diffItem?.result?.best?.mismatchRatio ?? null,
    note: diffItem?.note ?? (existsSync(file) ? 'screenshot present; diff not run yet' : 'missing actual Roll20 screenshot'),
  };
}

function fileStatus(file) {
  return { path: rel(file), exists: existsSync(file) };
}

function buildNextAction({
  preupload,
  generatedPresentCount,
  generatedTargetCount,
  generatedDiffedCount,
  observationPresentCount,
  observationTargetCount,
  blockerEvidence,
}) {
  if (!preupload.pass) {
    return 'Run or fix the local pre-upload gate before attempting Roll20 Sandbox upload.';
  }
  if (generatedPresentCount < generatedTargetCount) {
    if (blockerEvidence.length > 0) {
      return 'Chrome file upload is still blocked in the recorded evidence. Enable Allow access to file URLs for the Codex extension, upload payloads in Roll20 Sandbox, capture screenshots, then rerun screenshot diff and this status command.';
    }
    return 'Upload payloads in Roll20 Custom Sheet Sandbox/test room, capture roll20-sandbox-root-full.png or roll20-sandbox-root.png plus roll20-chat.png, then rerun screenshot diff and this status command. Existing solo-room screenshots are optional observation evidence, not part of the generated-sheet gate.';
  }
  if (generatedDiffedCount < generatedTargetCount) {
    return 'Actual screenshots exist. Run node scripts/roll20_actual_screenshot_diff.mjs for this run, then classify differences.';
  }
  if (observationPresentCount < observationTargetCount) {
    return 'Generated-sheet actual evidence is diffed. Optionally add read-only solo-room observation screenshots, then classify differences before making any parity claim.';
  }
  return 'Classify diff results by wrapper/context, base CSS, cascade, default state, translation, worker JS, rolltemplate/chat, asset loading, viewport/crop, or edit overlay before making any parity claim.';
}

function statusOf({
  localReady,
  generatedEvidenceComplete,
  generatedPresentCount,
  generatedTargetCount,
  generatedDiffedCount,
}) {
  if (!localReady) return 'LOCAL_PREUPLOAD_NOT_READY';
  if (generatedEvidenceComplete) return 'GENERATED_ACTUAL_SCREENSHOTS_DIFFED';
  if (generatedPresentCount === 0) return 'PREUPLOAD_READY_MISSING_GENERATED_ACTUAL';
  if (generatedPresentCount < generatedTargetCount) return 'PARTIAL_GENERATED_ACTUAL_SCREENSHOTS';
  if (generatedDiffedCount < generatedTargetCount) return 'GENERATED_ACTUAL_SCREENSHOTS_NEED_DIFF';
  return 'ACTUAL_STATUS_NEEDS_REVIEW';
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Actual Verification Status',
    '',
    `Generated: ${report.generatedAt}`,
    `Run folder: \`${rel(report.runDir)}\``,
    '',
    'Scope: status of local Roll20 actual-screen evidence. This is not a Roll20 visual parity claim.',
    '',
    '## Summary',
    '',
    `- Pre-upload gate: ${report.preupload.pass ? 'PASS' : 'MISSING/FAIL'}`,
    `- Fixtures: ${report.summary.fixtures}`,
    `- Generated-sheet screenshots: ${report.summary.generatedPresentCount}/${report.summary.generatedTargetCount}`,
    `- Generated-sheet diffs: ${report.summary.generatedDiffedCount}/${report.summary.generatedTargetCount}`,
    `- Solo-room observation screenshots: ${report.summary.observationPresentCount}/${report.summary.observationTargetCount}`,
    `- Solo-room observation diffs: ${report.summary.observationDiffedCount}/${report.summary.observationTargetCount}`,
    `- All actual screenshots: ${report.summary.actualPresentCount}/${report.summary.actualTargetCount}`,
    `- All screenshot diffs: ${report.summary.diffedCount}/${report.summary.actualTargetCount}`,
    `- Blocker evidence files: ${report.summary.blockerEvidenceCount}`,
    `- Status: ${report.status}`,
    `- Command gate: ${report.commandPass ? 'PASS' : 'NEEDS ACTION'}`,
    `- Generated-sheet actual evidence complete: ${report.summary.generatedDiffedCount === report.summary.generatedTargetCount ? 'yes' : 'no'}`,
    `- All actual evidence complete, including optional room observation: ${report.actualEvidenceComplete ? 'yes' : 'no'}`,
    '',
    `Next action: ${report.nextAction}`,
    '',
    '## Fixtures',
    '',
    '| Fixture | Local baseline | Payload | Sandbox | Chat | Room |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const fixture of report.fixtures) {
    const targetStatus = Object.fromEntries(
      fixture.actualTargets.map((target) => [target.id, target.exists ? target.diffStatus : 'MISSING']),
    );
    lines.push(
      `| \`${fixture.fixtureId}\` | ${fixture.localBaselineReady ? 'ready' : 'missing'} | ${fixture.payloadReady ? 'ready' : 'missing'} | ${targetStatus.sandbox} | ${targetStatus.chat} | ${targetStatus.room} |`,
    );
  }

  if (report.blockerEvidence.length > 0) {
    lines.push('', '## Blocker Evidence', '', '| File | Status | Blocker |', '| --- | --- | --- |');
    for (const item of report.blockerEvidence) {
      lines.push(`| \`${item.file}\` | ${escapeCell(String(item.status ?? ''))} | ${escapeCell(String(item.blocker ?? ''))} |`);
    }
  }

  lines.push(
    '',
    '## Evidence Rules',
    '',
    '- Missing Roll20 screenshots are unverified, never PASS.',
    '- A DIFFED target is diagnostic evidence, not a parity claim until the mismatch is classified.',
    '- `sandbox` and `chat` targets are the generated-sheet actual-screen gate.',
    '- `room` targets are read-only solo-room observation evidence and are reported separately.',
    '- Existing Roll20 rooms are observation-only; generated payloads go to Custom Sheet Sandbox or a new test room.',
  );
  return `${lines.join('\n')}\n`;
}

function renderConsoleSummary(report, outDir) {
  return [
    `ROLL20 ACTUAL STATUS ${report.status}`,
    `run=${rel(report.runDir)}`,
    `preupload=${report.preupload.pass ? 'PASS' : 'MISSING/FAIL'}`,
    `generatedActualScreenshots=${report.summary.generatedPresentCount}/${report.summary.generatedTargetCount}`,
    `generatedDiffed=${report.summary.generatedDiffedCount}/${report.summary.generatedTargetCount}`,
    `roomObservationScreenshots=${report.summary.observationPresentCount}/${report.summary.observationTargetCount}`,
    `roomObservationDiffed=${report.summary.observationDiffedCount}/${report.summary.observationTargetCount}`,
    `commandGate=${report.commandPass ? 'PASS' : 'NEEDS_ACTION'}`,
    `out=${rel(outDir)}`,
  ].join('\n');
}

function escapeCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 160);
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

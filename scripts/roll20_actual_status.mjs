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
 *   node scripts/roll20_actual_status.mjs [reports/roll20-actual-compare/<label>] [--require-actual] [--require-renderer-ready]
 *
 * If the run folder is omitted, the newest PASS pre-upload run is selected.
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const REQUIRE_ACTUAL = args.includes('--require-actual');
const REQUIRE_RENDERER_READY = args.includes('--require-renderer-ready');
const RUN_DIR_ARG = args.find((arg) => arg !== '--require-actual' && arg !== '--require-renderer-ready') ?? '';
const RUN_ROOT = path.resolve('reports/roll20-actual-compare');
const MAX_CHAT_SIDECAR_AGE_MS = 5 * 60 * 1000;

const TARGETS = [
  {
    id: 'sandbox',
    filename: 'roll20-sandbox.png',
    preferredFilenames: [
      'roll20-sandbox-root-full-dpr-corrected.png',
      'roll20-sandbox-root-full.png',
      'roll20-sandbox-root.png',
    ],
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
  const rootStitchAudit = await readRootStitchAudit(runDir);
  const rootCutoff = await readRootCutoff(runDir);
  const scrollMetricsReplacement = await readScrollMetricsReplacement(runDir);
  const rendererAction = await readRendererAction(runDir);
  const chatParity = await readChatParity(runDir);
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
  const trustedFullRootComplete =
    rootStitchAudit.fixtureCount > 0 &&
    rootStitchAudit.trustedFullRootCount === rootStitchAudit.fixtureCount;
  const cutoffRiskFixtureIds = new Set(rootCutoff.highRiskFixtures.map((fixture) => fixture.fixtureId));
  const replacementFixtureIds = new Set(scrollMetricsReplacement.qualifiedFixtures.map((fixture) => fixture.fixtureId));
  const unresolvedCutoffRiskFixtureIds = new Set(
    [...cutoffRiskFixtureIds].filter((fixtureId) => !replacementFixtureIds.has(fixtureId)),
  );
  const reliableTrustedFullRootCount = Math.max(0, rootStitchAudit.trustedFullRootCount - unresolvedCutoffRiskFixtureIds.size);
  const reliableTrustedFullRootComplete =
    rootStitchAudit.fixtureCount > 0 &&
    reliableTrustedFullRootCount === rootStitchAudit.fixtureCount;
  const rendererReady =
    reliableTrustedFullRootComplete &&
    rendererAction.exists &&
    rendererAction.action !== 'HOLD_PRODUCTION_RENDERER_PATCH' &&
    rendererAction.action !== 'MISSING_RENDERER_ACTION_GATE';
  const roomObservationComplete =
    observationTargetCount === 0 ||
    (observationPresentCount === observationTargetCount && observationDiffedCount === observationTargetCount);
  const actualEvidenceComplete = generatedEvidenceComplete && roomObservationComplete;
  const commandPass =
    localReady &&
    (!REQUIRE_ACTUAL || generatedEvidenceComplete) &&
    (!REQUIRE_RENDERER_READY || rendererReady);
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
    requireRendererReady: REQUIRE_RENDERER_READY,
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
      trustedFullRootCount: rootStitchAudit.trustedFullRootCount,
      trustedFullRootTotal: rootStitchAudit.fixtureCount,
      trustedFullRootMissing: rootStitchAudit.missingTrustedFixtures,
      trustedFullRootCutoffRiskCount: rootCutoff.highRiskFixtures.length,
      trustedFullRootCutoffUnresolvedCount: unresolvedCutoffRiskFixtureIds.size,
      trustedFullRootScrollMetricsReplacementCount: scrollMetricsReplacement.qualifiedFixtures.length,
      reliableTrustedFullRootCount,
      reliableTrustedFullRootComplete,
      rendererAction: rendererAction.action,
      rendererBlockerCount: rendererAction.blockerCount,
      chatParityExists: chatParity.exists,
      chatParityCompared: chatParity.compared,
      chatParityFixtures: chatParity.fixtures,
      chatParityNormalizedCompared: chatParity.normalizedCompared,
      chatParityNeedsNormalizedCapture: chatParity.needsNormalizedCapture,
      chatParityNormalizedHighMismatch: chatParity.normalizedHighMismatch,
      chatParityActualCssInactive: chatParity.actualChatCssInactive,
      chatParityActualCssScopedMismatch: chatParity.actualChatCssScopedMismatch,
      chatParityActualCssUnknown: chatParity.actualChatCssUnknown,
      chatParityMaxNormalizedMismatchPct: chatParity.maxNormalizedMismatchPct,
      trustedFullRootComplete,
      rendererReady,
    },
    blockerEvidence,
    rootStitchAudit,
    rootCutoff,
    scrollMetricsReplacement,
    rendererAction,
    chatParity,
    fixtures,
    nextAction: buildNextAction({
      preupload,
      generatedPresentCount,
      generatedTargetCount,
      generatedDiffedCount,
      observationPresentCount,
      observationTargetCount,
      blockerEvidence,
      rootStitchAudit,
      rootCutoff,
      scrollMetricsReplacement,
      rendererAction,
      chatParity,
      fixtures,
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

async function readRootStitchAudit(runDir) {
  const file = path.join(runDir, 'root-stitch-audit', 'root-stitch-audit-results.json');
  if (!existsSync(file)) {
    return {
      exists: false,
      file: rel(file),
      fixtureCount: 0,
      trustedFullRootCount: 0,
      missingTrustedFixtures: [],
      note: 'missing root stitch audit report',
    };
  }
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  const fixtures = Array.isArray(report.fixtures) ? report.fixtures : [];
  const trustedFixtures = fixtures.filter((fixture) => Array.isArray(fixture.trustedEvidence) && fixture.trustedEvidence.length > 0);
  return {
    exists: true,
    file: rel(file),
    pass: Boolean(report.pass),
    fixtureCount: fixtures.length,
    trustedFullRootCount: trustedFixtures.length,
    missingTrustedFixtures: fixtures
      .filter((fixture) => !(Array.isArray(fixture.trustedEvidence) && fixture.trustedEvidence.length > 0))
      .map((fixture) => ({
        fixtureId: fixture.fixtureId,
        status: fixture.status ?? 'MISSING',
        primaryIssue: fixture.primaryIssue ?? '',
      })),
  };
}

async function readRootCutoff(runDir) {
  const file = path.join(runDir, 'root-cutoff-diagnostics', 'root-cutoff-diagnostics-results.json');
  if (!existsSync(file)) {
    return {
      exists: false,
      file: rel(file),
      highRiskFixtures: [],
      note: 'missing root cutoff diagnostic report',
    };
  }
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  const fixtures = Array.isArray(report.fixtures) ? report.fixtures : [];
  return {
    exists: true,
    file: rel(file),
    highRiskFixtures: fixtures
      .filter((fixture) => fixture.cutoff?.risk === 'HIGH')
      .map((fixture) => ({
        fixtureId: fixture.fixtureId,
        stitchedHeight: fixture.stitchedRoot?.height ?? null,
        sidecarHeight: fixture.sidecarRoot?.height ?? null,
        heightDelta: fixture.cutoff?.heightDelta ?? null,
      })),
  };
}

async function readScrollMetricsReplacement(runDir) {
  const file = path.join(runDir, 'full-root-candidate-smoke-scroll-metrics', 'full-root-candidate-smoke-results.json');
  if (!existsSync(file)) {
    return {
      exists: false,
      file: rel(file),
      qualifiedFixtures: [],
      note: 'missing scroll-metrics full-root candidate report',
    };
  }
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  const fixtures = Array.isArray(report.fixtures) ? report.fixtures : [];
  return {
    exists: true,
    file: rel(file),
    qualifiedFixtures: fixtures
      .map((fixture) => {
        const source = (fixture.candidates ?? []).find((candidate) => candidate.id === 'sandbox-source-state');
        if (!source) return null;
        const rootDelta = Math.abs(Number(source.rootHeightDelta ?? Number.POSITIVE_INFINITY));
        const panelY = Math.abs(Number(source.geometryFit?.statePanelYDelta ?? Number.POSITIVE_INFINITY));
        const panelH = Math.abs(Number(source.geometryFit?.statePanelHeightDelta ?? Number.POSITIVE_INFINITY));
        if (rootDelta > 50 || panelY > 50 || panelH > 10) return null;
        return {
          fixtureId: fixture.fixtureId,
          candidateId: source.id,
          rootHeightDelta: source.rootHeightDelta ?? null,
          statePanelYDelta: source.geometryFit?.statePanelYDelta ?? null,
          statePanelHeightDelta: source.geometryFit?.statePanelHeightDelta ?? null,
          actualSize: fixture.actual?.size ?? null,
        };
      })
      .filter(Boolean),
  };
}

async function readRendererAction(runDir) {
  const file = path.join(runDir, 'renderer-action-gate', 'renderer-action-gate-results.json');
  if (!existsSync(file)) {
    return {
      exists: false,
      file: rel(file),
      action: 'MISSING_RENDERER_ACTION_GATE',
      blockerCount: 0,
      blockers: [],
    };
  }
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  const recommendation = report.recommendation ?? {};
  return {
    exists: true,
    file: rel(file),
    action: recommendation.action ?? 'UNKNOWN',
    blockerCount: Array.isArray(recommendation.blockers) ? recommendation.blockers.length : 0,
    blockers: recommendation.blockers ?? [],
  };
}

async function readChatParity(runDir) {
  const file = path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json');
  if (!existsSync(file)) {
    return {
      exists: false,
      file: rel(file),
      fixtures: 0,
      compared: 0,
      normalizedCompared: 0,
      needsNormalizedCapture: 0,
      normalizedHighMismatch: 0,
      actualChatCssInactive: 0,
      actualChatCssScopedMismatch: 0,
      actualChatCssUnknown: 0,
      maxNormalizedMismatchPct: null,
      note: 'missing chat parity diagnostic',
    };
  }
  const report = JSON.parse(await fs.readFile(file, 'utf8'));
  const summary = report.summary ?? {};
  return {
    exists: true,
    file: rel(file),
    generatedAt: report.generatedAt ?? null,
    fixtures: Number(summary.fixtures ?? 0),
    compared: Number(summary.compared ?? 0),
    normalizedCompared: Number(summary.normalizedCompared ?? 0),
    needsNormalizedCapture: Number(summary.needsNormalizedCapture ?? 0),
    normalizedHighMismatch: Number(summary.normalizedHighMismatch ?? 0),
    actualChatCssInactive: Number(summary.actualChatCssInactive ?? 0),
    actualChatCssScopedMismatch: Number(summary.actualChatCssScopedMismatch ?? 0),
    actualChatCssUnknown: Number(summary.actualChatCssUnknown ?? 0),
    maxNormalizedMismatchPct: pctNumber(summary.maxNormalizedMismatchRatio ?? 0),
    mismatchFixtures: (report.fixtures ?? [])
      .filter((fixture) => fixture.status === 'DIFFED' && Number(fixture.mismatchRatio ?? 0) > 0.1)
      .map((fixture) => ({
        fixtureId: fixture.fixtureId,
        mode: fixture.compareMode ?? '',
        mismatchPct: pctNumber(fixture.mismatchRatio ?? 0),
        actualCss: fixture.actualChatCss?.classification ?? '',
      })),
    note: 'diagnostic only; does not prove Roll20 chat visual parity',
  };
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
    actualTargets: await Promise.all(TARGETS.map((target) => inspectTarget(fixtureId, screenshots, target, diffReport))),
  };
}

async function inspectTarget(fixtureId, screenshots, target, diffReport) {
  const preferredFiles = (target.preferredFilenames ?? (target.preferredFilename ? [target.preferredFilename] : []))
    .map((filename) => path.join(screenshots, filename));
  const preferredFile = preferredFiles.find((file) => existsSync(file)) ?? preferredFiles[0] ?? null;
  const fallbackFile = path.join(screenshots, target.filename);
  const file = preferredFile && existsSync(preferredFile) ? preferredFile : fallbackFile;
  const diffItem = diffReport.items.find((item) => item.fixtureId === fixtureId && item.target === target.id);
  const rawExists = existsSync(file);
  const validation = await validateActualTargetEvidence({ screenshots, target, file, fallbackFile, preferredFile });
  const exists = rawExists && validation.ok;
  return {
    id: target.id,
    evidence: target.evidence,
    screenshot: fileStatus(file),
    preferredScreenshot: preferredFile ? fileStatus(preferredFile) : null,
    preferredScreenshots: preferredFiles.map(fileStatus),
    fallbackScreenshot: preferredFile ? fileStatus(fallbackFile) : null,
    rawExists,
    exists,
    validation,
    diffStatus: exists ? (diffItem?.status ?? 'NOT_RUN') : (rawExists ? 'SUSPECT' : 'NOT_RUN'),
    requiredForGeneratedSheetCheck: Boolean(target.requiredForGeneratedSheetCheck),
    bestMismatchRatio: exists ? (diffItem?.result?.best?.mismatchRatio ?? null) : null,
    note: validation.ok
      ? (diffItem?.note ?? (rawExists ? 'screenshot present; diff not run yet' : 'missing actual Roll20 screenshot'))
      : validation.note,
  };
}

function fileStatus(file) {
  return { path: rel(file), exists: existsSync(file) };
}

async function validateActualTargetEvidence({ screenshots, target, file, fallbackFile, preferredFile }) {
  if (target.id === 'chat') return validateChatEvidence(screenshots, file);
  if (target.id !== 'sandbox') return { ok: true, kind: 'not-required', note: '' };
  if (!existsSync(file)) return { ok: false, kind: 'missing', note: 'missing actual Roll20 screenshot' };

  const selectedName = path.basename(file);
  const fallbackName = path.basename(fallbackFile);
  if (selectedName !== fallbackName) {
    const sidecar = file.replace(/\.(png|jpg|jpeg)$/i, '.json');
    const completeManifest = path.join(screenshots, 'roll20-root-dpr-complete-manifest.json');
    const correctedManifest = path.join(screenshots, 'roll20-root-dpr-corrected-manifest.json');
    if (existsSync(sidecar) || existsSync(completeManifest) || existsSync(correctedManifest)) {
      return { ok: true, kind: 'root-capture', note: `root evidence present for ${selectedName}` };
    }
    return {
      ok: false,
      kind: 'root-capture-missing-sidecar',
      note: `${selectedName} exists, but no root capture sidecar/manifest proves the iframe root was active`,
    };
  }

  const domEvidence = await readJsonIfExists(path.join(screenshots, 'roll20-sandbox-dom-evidence.json'));
  if (domEvidence && hasPositiveDomEvidence(domEvidence)) {
    return { ok: true, kind: 'dom-evidence', note: 'fallback viewport screenshot has positive iframe DOM evidence' };
  }
  return {
    ok: false,
    kind: preferredFile && preferredFile !== fallbackFile ? 'preferred-missing-fallback-unproven' : 'fallback-unproven',
    note: 'fallback roll20-sandbox.png exists, but no positive iframe DOM/root evidence proves the sheet rendered',
  };
}

async function validateChatEvidence(screenshots, file) {
  const domEvidenceFile = path.join(screenshots, 'roll20-chat-dom-evidence.json');
  const domEvidence = await readJsonIfExists(domEvidenceFile);
  const chatPageScreenshot = path.join(screenshots, 'roll20-chat-page.png');
  const hasChatPageScreenshot = existsSync(chatPageScreenshot);
  const hasDomEvidence = Boolean(domEvidence);
  const hasRenderedChatDom = hasPositiveChatDomEvidence(domEvidence);
  if (!existsSync(file)) {
    if (hasRenderedChatDom) {
      return {
        ok: false,
        kind: hasChatPageScreenshot ? 'chat-dom-page-screenshot-only' : 'chat-dom-only',
        note: hasChatPageScreenshot
          ? 'Roll20 chat DOM evidence exists and roll20-chat-page.png exists, but roll20-chat.png is missing; page screenshots are not accepted as chat visual evidence'
          : 'Roll20 chat DOM evidence exists, but roll20-chat.png is missing; visual rolltemplate/chat evidence is still unverified',
      };
    }
    if (hasChatPageScreenshot) {
      return {
        ok: false,
        kind: hasDomEvidence ? 'chat-page-screenshot-dom-empty' : 'chat-page-screenshot-only',
        note: 'roll20-chat-page.png exists, but roll20-chat.png is missing; page screenshots are not accepted as chat visual evidence',
      };
    }
    return { ok: false, kind: hasDomEvidence ? 'chat-dom-empty' : 'missing', note: 'missing Roll20 chat screenshot' };
  }
  if (hasRenderedChatDom) {
    const freshness = await validateSidecarFreshness(file, domEvidenceFile);
    if (!freshness.ok) {
      return {
        ok: false,
        kind: 'chat-screenshot-dom-stale',
        note: freshness.note,
      };
    }
    return { ok: true, kind: 'chat-screenshot-with-dom', note: 'Roll20 chat screenshot exists with supporting DOM evidence' };
  }
  if (hasDomEvidence) {
    return {
      ok: false,
      kind: 'chat-screenshot-dom-empty',
      note: 'Roll20 chat screenshot exists, but DOM evidence did not show rendered rolltemplate markers',
    };
  }
  return {
    ok: false,
    kind: 'chat-screenshot-only',
    note: 'Roll20 chat screenshot exists, but no DOM sidecar proves which rolltemplate/message rendered',
  };
}

async function validateSidecarFreshness(screenshot, sidecar) {
  if (!existsSync(screenshot) || !existsSync(sidecar)) {
    return { ok: false, note: 'Roll20 chat screenshot or DOM sidecar is missing' };
  }
  const [screenshotStat, sidecarStat] = await Promise.all([fs.stat(screenshot), fs.stat(sidecar)]);
  const deltaMs = Math.abs(screenshotStat.mtimeMs - sidecarStat.mtimeMs);
  if (deltaMs > MAX_CHAT_SIDECAR_AGE_MS) {
    return {
      ok: false,
      note: `Roll20 chat screenshot and DOM sidecar are stale relative to each other (${Math.round(deltaMs / 1000)}s apart)`,
    };
  }
  return { ok: true, note: 'Roll20 chat screenshot and DOM sidecar timestamps are close enough' };
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function hasPositiveDomEvidence(evidence) {
  if (Number(evidence.bodyLen ?? 0) > 0) return true;
  if (Number(evidence.roots ?? evidence.rootCount ?? 0) > 0) return true;
  if (Array.isArray(evidence.rootSamples) && evidence.rootSamples.some((sample) => String(sample ?? '').trim().length > 0)) return true;
  if (evidence.textMarkers && Object.values(evidence.textMarkers).some(Boolean)) return true;
  return false;
}

function hasPositiveChatDomEvidence(evidence) {
  if (!evidence) return false;
  if (Number(evidence.rolltemplateCount ?? 0) > 0) return true;
  if (Array.isArray(evidence.rolltemplates) && evidence.rolltemplates.length > 0) return true;
  if (evidence.textMarkers?.rolltemplate) return true;
  return false;
}

function buildNextAction({
  preupload,
  generatedPresentCount,
  generatedTargetCount,
  generatedDiffedCount,
  observationPresentCount,
  observationTargetCount,
  blockerEvidence,
  rootStitchAudit,
  rootCutoff,
  scrollMetricsReplacement,
  rendererAction,
  chatParity,
  fixtures,
}) {
  if (!preupload.pass) {
    return 'Run or fix the local pre-upload gate before attempting Roll20 Sandbox upload.';
  }
  if (rootStitchAudit.exists && rootStitchAudit.trustedFullRootCount < rootStitchAudit.fixtureCount) {
    const missingIds = rootStitchAudit.missingTrustedFixtures.map((fixture) => fixture.fixtureId);
    const missing = missingIds.join(', ');
    const fixtureArg = missingIds.length === 1 ? ` ${missingIds[0]}` : '';
    return `Run corepack pnpm run plan:roll20-root-capture -- ${rel(path.resolve(runDirFromReport(rootStitchAudit.file)))}${fixtureArg}, then capture trusted DPR-corrected full-root Roll20 evidence for ${missing} and rerun root stitch audit, screenshot diff, full-root candidate smoke, and renderer action gate.`;
  }
  const replacementIds = new Set((scrollMetricsReplacement.qualifiedFixtures ?? []).map((fixture) => fixture.fixtureId));
  const unresolvedRootCutoff = rootCutoff.highRiskFixtures.filter((fixture) => !replacementIds.has(fixture.fixtureId));
  if (rootCutoff.exists && unresolvedRootCutoff.length > 0) {
    const fixtures = unresolvedRootCutoff
      .map((fixture) => `${fixture.fixtureId} stitched=${fixture.stitchedHeight} sidecar=${fixture.sidecarHeight}`)
      .join('; ');
    return `Trusted full-root files exist, but root cutoff diagnostics mark them unreliable for ${fixtures}. Promote or recapture an authoritative full-root source before treating renderer output as ready.`;
  }
  if (generatedPresentCount < generatedTargetCount) {
    const missingGenerated = generatedMissingTargets(fixtures);
    const missingSandbox = missingGenerated.filter((target) => target.targetId === 'sandbox');
    const missingChat = missingGenerated.filter((target) => target.targetId === 'chat');
    if (missingGenerated.length > 0 && missingSandbox.length === 0 && missingChat.length > 0) {
      return `Generated sheet roots are present, but trustworthy Roll20 chat visual evidence is missing or suspect for ${missingChat.map((target) => `${target.fixtureId} (${target.kind})`).join(', ')}. Recapture roll20-chat.png with a fresh roll20-chat-dom-evidence.json sidecar from the same roll action, then rerun screenshot diff, diagnose:roll20-chat-parity, gate:roll20-renderer-action, and this status command.`;
    }
    if (missingSandbox.length > 0) {
      const missing = missingSandbox.map((target) => `${target.fixtureId} (${target.kind})`).join(', ');
      if (blockerEvidence.length > 0) {
        return `Chrome file upload is still blocked in the recorded evidence, and sandbox root evidence is missing or suspect for ${missing}. Enable Allow access to file URLs for the Codex extension or use the documented endpoint/settings fallback in the dedicated Sandbox, capture trustworthy root screenshots, then rerun screenshot diff and this status command.`;
      }
      return `Sandbox root evidence is missing or suspect for ${missing}. Upload payloads in Roll20 Custom Sheet Sandbox/test room, capture roll20-sandbox-root-full-dpr-corrected.png or roll20-sandbox-root.png with sidecar/manifest proof, then rerun screenshot diff and this status command.`;
    }
    if (blockerEvidence.length > 0) {
      return 'Chrome file upload is still blocked in the recorded evidence. Enable Allow access to file URLs for the Codex extension, upload payloads in Roll20 Sandbox, capture screenshots, then rerun screenshot diff and this status command.';
    }
    return 'Upload payloads in Roll20 Custom Sheet Sandbox/test room, capture roll20-sandbox-root-full-dpr-corrected.png or roll20-sandbox-root.png plus roll20-chat.png, then rerun screenshot diff and this status command. Existing solo-room screenshots are optional observation evidence, not part of the generated-sheet gate.';
  }
  if (generatedDiffedCount < generatedTargetCount) {
    return 'Actual screenshots exist. Run node scripts/roll20_actual_screenshot_diff.mjs for this run, then classify differences.';
  }
  if (chatParity?.exists && chatParity.needsNormalizedCapture > 0) {
    return 'Roll20 chat evidence exists but is not normalized for every fixture. Recapture roll20-chat.png with fresh DOM sidecars that include rolltemplate rect/clip metadata, then rerun diagnose:roll20-chat-parity.';
  }
  if (chatParity?.exists && chatParity.actualChatCssScopedMismatch > 0) {
    return 'Actual Roll20 chat CSS appears scoped/prefix-mismatched. Inspect actual chat and character iframe style selectors before deciding whether local ChatPane should apply sheet-* rolltemplate CSS.';
  }
  if (chatParity?.exists && chatParity.actualChatCssInactive > 0) {
    return 'Actual Roll20 chat CSS evidence is inactive for one or more fixtures. Prove a CSS-active Custom Sheet Sandbox/test-room chat state before treating local ChatPane mismatches as production renderer defects.';
  }
  if (chatParity?.exists && chatParity.normalizedHighMismatch > 0) {
    return 'Roll20 chat screenshots are normalized but still differ from local ChatPane. Fix chat shell/template sizing after confirming actual Roll20 user rolltemplate CSS is active.';
  }
  if (observationPresentCount < observationTargetCount) {
    return 'Generated-sheet actual evidence is diffed. Optionally add read-only solo-room observation screenshots, then classify differences before making any parity claim.';
  }
  if (rendererAction.exists && rendererAction.action === 'HOLD_PRODUCTION_RENDERER_PATCH') {
    return 'Renderer action gate is still HOLD. Resolve its listed blockers before changing production renderer CSS.';
  }
  return 'Classify diff results by wrapper/context, base CSS, cascade, default state, translation, worker JS, rolltemplate/chat, asset loading, viewport/crop, or edit overlay before making any parity claim.';
}

function generatedMissingTargets(fixtures = []) {
  return fixtures.flatMap((fixture) =>
    fixture.actualTargets
      .filter((target) => target.requiredForGeneratedSheetCheck && !target.exists)
      .map((target) => ({
        fixtureId: fixture.fixtureId,
        targetId: target.id,
        kind: target.validation?.kind ?? (target.rawExists ? 'suspect' : 'missing'),
        note: target.note ?? target.validation?.note ?? '',
      })),
  );
}

function runDirFromReport(reportFile) {
  const absolute = path.resolve(reportFile);
  const marker = `${path.sep}root-stitch-audit${path.sep}`;
  if (absolute.includes(marker)) return absolute.slice(0, absolute.indexOf(marker));
  return path.dirname(path.dirname(absolute));
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
    `- Trusted full-root evidence: ${report.summary.trustedFullRootCount}/${report.summary.trustedFullRootTotal}`,
    `- Reliable trusted full-root evidence: ${report.summary.reliableTrustedFullRootCount}/${report.summary.trustedFullRootTotal} (cutoff risk: ${report.summary.trustedFullRootCutoffRiskCount}, unresolved: ${report.summary.trustedFullRootCutoffUnresolvedCount}, scroll-metrics replacement: ${report.summary.trustedFullRootScrollMetricsReplacementCount})`,
    `- Renderer action: ${report.summary.rendererAction} (${report.summary.rendererBlockerCount} blockers)`,
    `- Renderer ready for production CSS: ${report.summary.rendererReady ? 'yes' : 'NO'}`,
    `- Chat parity diagnostic: ${report.summary.chatParityExists ? 'present' : 'missing'} (${report.summary.chatParityCompared}/${report.summary.chatParityFixtures} compared, normalized ${report.summary.chatParityNormalizedCompared}/${report.summary.chatParityFixtures})`,
    `- Chat blockers: needs normalized capture ${report.summary.chatParityNeedsNormalizedCapture}, normalized high mismatch ${report.summary.chatParityNormalizedHighMismatch}, actual CSS inactive ${report.summary.chatParityActualCssInactive}, scoped/prefix mismatch ${report.summary.chatParityActualCssScopedMismatch}, actual CSS unknown ${report.summary.chatParityActualCssUnknown}`,
    `- Max normalized chat mismatch: ${report.summary.chatParityMaxNormalizedMismatchPct ?? 'n/a'}%`,
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
      fixture.actualTargets.map((target) => [target.id, target.exists ? target.diffStatus : (target.rawExists ? 'SUSPECT' : 'MISSING')]),
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

  if (report.rootStitchAudit.missingTrustedFixtures.length > 0) {
    lines.push('', '## Missing Trusted Full-Root Evidence', '', '| Fixture | Status | Issue |', '| --- | --- | --- |');
    for (const fixture of report.rootStitchAudit.missingTrustedFixtures) {
      lines.push(`| \`${fixture.fixtureId}\` | ${escapeCell(String(fixture.status ?? ''))} | ${escapeCell(String(fixture.primaryIssue ?? ''))} |`);
    }
  }

  if (report.chatParity.exists) {
    lines.push('', '## Chat Parity Boundary', '');
    lines.push(`- Report: \`${report.chatParity.file}\``);
    lines.push(`- Compared: ${report.chatParity.compared}/${report.chatParity.fixtures}`);
    lines.push(`- Normalized compared: ${report.chatParity.normalizedCompared}/${report.chatParity.fixtures}`);
    lines.push(`- Needs normalized capture: ${report.chatParity.needsNormalizedCapture}`);
    lines.push(`- Normalized high mismatch: ${report.chatParity.normalizedHighMismatch}`);
    lines.push(`- Actual chat CSS inactive: ${report.chatParity.actualChatCssInactive}`);
    lines.push(`- Actual chat CSS scoped/prefix mismatch: ${report.chatParity.actualChatCssScopedMismatch}`);
    lines.push(`- Actual chat CSS unknown: ${report.chatParity.actualChatCssUnknown}`);
    lines.push(`- Max normalized mismatch: ${report.chatParity.maxNormalizedMismatchPct}%`);
    if (report.chatParity.mismatchFixtures.length) {
      lines.push('', '| Fixture | Mode | Mismatch | Actual CSS |', '| --- | --- | ---: | --- |');
      for (const fixture of report.chatParity.mismatchFixtures) {
        lines.push(`| \`${fixture.fixtureId}\` | ${fixture.mode} | ${fixture.mismatchPct}% | ${fixture.actualCss} |`);
      }
    }
  }

  lines.push(
    '',
    '## Evidence Rules',
    '',
    '- Missing Roll20 screenshots are unverified, never PASS.',
    '- A fallback `roll20-sandbox.png` is SUSPECT unless a DOM/root sidecar proves the Roll20 iframe actually rendered the sheet.',
    '- A DIFFED target is diagnostic evidence, not a parity claim until the mismatch is classified.',
    '- `sandbox` and `chat` targets are the generated-sheet actual-screen gate.',
    '- `room` targets are read-only solo-room observation evidence and are reported separately.',
    '- Existing Roll20 rooms are observation-only; generated payloads go to Custom Sheet Sandbox or a new test room.',
  );
  return `${lines.join('\n')}\n`;
}

function renderConsoleSummary(report, outDir) {
  const missingGenerated = generatedMissingTargets(report.fixtures);
  const lines = [
    `ROLL20 ACTUAL STATUS ${report.status}`,
    `run=${rel(report.runDir)}`,
    `preupload=${report.preupload.pass ? 'PASS' : 'MISSING/FAIL'}`,
    `generatedActualScreenshots=${report.summary.generatedPresentCount}/${report.summary.generatedTargetCount}`,
    `generatedDiffed=${report.summary.generatedDiffedCount}/${report.summary.generatedTargetCount}`,
    `roomObservationScreenshots=${report.summary.observationPresentCount}/${report.summary.observationTargetCount}`,
    `roomObservationDiffed=${report.summary.observationDiffedCount}/${report.summary.observationTargetCount}`,
    `trustedFullRoot=${report.summary.trustedFullRootCount}/${report.summary.trustedFullRootTotal}`,
    `reliableTrustedFullRoot=${report.summary.reliableTrustedFullRootCount}/${report.summary.trustedFullRootTotal}`,
    `trustedFullRootCutoffRisk=${report.summary.trustedFullRootCutoffRiskCount}`,
    `trustedFullRootCutoffUnresolved=${report.summary.trustedFullRootCutoffUnresolvedCount}`,
    `scrollMetricsReplacement=${report.summary.trustedFullRootScrollMetricsReplacementCount}`,
    `rendererAction=${report.summary.rendererAction}`,
    `rendererBlockers=${report.summary.rendererBlockerCount}`,
    `rendererReady=${report.summary.rendererReady ? 'YES' : 'NO'}`,
    `chatParity=${report.summary.chatParityExists ? 'PRESENT' : 'MISSING'}`,
    `chatNormalizedCompared=${report.summary.chatParityNormalizedCompared}/${report.summary.chatParityFixtures}`,
    `chatNeedsNormalizedCapture=${report.summary.chatParityNeedsNormalizedCapture}`,
    `chatActualCssInactive=${report.summary.chatParityActualCssInactive}`,
    `chatActualCssScopedMismatch=${report.summary.chatParityActualCssScopedMismatch}`,
    `chatNormalizedHighMismatch=${report.summary.chatParityNormalizedHighMismatch}`,
    `commandGate=${report.commandPass ? 'PASS' : 'NEEDS_ACTION'}`,
    `out=${rel(outDir)}`,
  ];
  for (const target of missingGenerated) {
    lines.push(`missingGenerated=${target.fixtureId}:${target.targetId}:${target.kind}`);
  }
  lines.push(`nextAction=${report.nextAction}`);
  return lines.join('\n');
}

function escapeCell(value) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 160);
}

function pctNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number((number * 100).toFixed(2));
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

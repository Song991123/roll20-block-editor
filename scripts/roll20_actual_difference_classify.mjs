#!/usr/bin/env node
/**
 * Classify actual Roll20 screenshot differences from local-only evidence.
 *
 * This reads existing ignored reports under reports/roll20-actual-compare and
 * writes a heuristic classification report. It is not a visual parity gate.
 *
 * Usage:
 *   node scripts/roll20_actual_difference_classify.mjs reports/roll20-actual-compare/<label>
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_actual_difference_classify.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const outDir = path.join(runDir, 'actual-difference-classification');

async function main() {
  const diffReport = await readJsonIfExists(path.join(runDir, 'actual-screenshot-diff', 'actual-screenshot-diff-results.json'));
  if (!diffReport) {
    throw new Error(`missing actual screenshot diff report under ${runDir}`);
  }
  const baseline = await readJsonIfExists(path.join(runDir, 'local-baseline-results.json'));
  const sanitize = await readJsonIfExists(path.join(runDir, 'sandbox-sanitize-audit', 'roll20-sandbox-sanitize-audit-results.json'));
  const status = await readJsonIfExists(path.join(runDir, 'actual-verification-status', 'actual-verification-status-results.json'));
  const fixtureIds = await listFixtureIds(path.join(runDir, 'local-baseline'));

  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await classifyFixture({ fixtureId, diffReport, baseline, sanitize, status }));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'heuristic actual Roll20 difference classification; not visual parity',
    pass: true,
    summary: {
      fixtures: fixtures.length,
      diffedSandbox: fixtures.filter((fixture) => fixture.targets.sandbox?.status === 'DIFFED').length,
      missingSandbox: fixtures.filter((fixture) => fixture.targets.sandbox?.status === 'SKIP').length,
      missingChat: fixtures.filter((fixture) => fixture.targets.chat?.status === 'SKIP').length,
      parityVerified: false,
    },
    fixtures,
    nextActions: buildGlobalNextActions(fixtures),
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'actual-difference-classification-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'actual-difference-classification-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    const sandbox = fixture.targets.sandbox;
    console.log(`${sandbox?.status ?? 'MISSING'} ${fixture.fixtureId} ${sandbox?.primaryClassification ?? sandbox?.note ?? ''}`);
  }
  console.log(`ROLL20 ACTUAL DIFFERENCE CLASSIFICATION OK ${outDir}`);
}

async function classifyFixture({ fixtureId, diffReport, baseline, sanitize, status }) {
  const baselineFixture = baseline?.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const sanitizeFixture = sanitize?.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const statusFixture = status?.fixtures?.find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
  const screenshotDir = path.join(runDir, 'local-baseline', fixtureId, 'screenshots');
  const chatDomEvidence = await readJsonIfExists(path.join(screenshotDir, 'roll20-chat-dom-evidence.json'));
  const diffItems = Object.fromEntries(
    (diffReport.items ?? [])
      .filter((item) => item.fixtureId === fixtureId)
      .map((item) => [item.target, item]),
  );

  return {
    fixtureId,
    localBaseline: summarizeBaseline(baselineFixture),
    sandboxSanitize: summarizeSanitize(sanitizeFixture),
    chatDomEvidence: summarizeChatDom(chatDomEvidence),
    targets: {
      sandbox: classifyTarget('sandbox', diffItems.sandbox, baselineFixture, sanitizeFixture, chatDomEvidence),
      chat: classifyTarget('chat', diffItems.chat, baselineFixture, sanitizeFixture, chatDomEvidence),
      room: classifyTarget('room', diffItems.room, baselineFixture, sanitizeFixture, chatDomEvidence),
    },
    statusSummary: statusFixture ? summarizeStatusFixture(statusFixture) : null,
  };
}

function summarizeBaseline(fixture) {
  if (!fixture) return null;
  return {
    importMatchPct: fixture.import?.matchPct ?? null,
    blockCount: fixture.import?.blockCount ?? null,
    workerBlockCount: fixture.import?.workerBlockCount ?? null,
    warnings: fixture.import?.warnings ?? null,
    emitBytes: fixture.emitBytes ?? null,
    previewDom: fixture.previewDom
      ? {
          width: fixture.previewDom.rect?.width ?? null,
          height: fixture.previewDom.rect?.height ?? null,
          visibleElementCount: fixture.previewDom.visibleElementCount ?? null,
          rollButtonCount: fixture.previewDom.rollButtonCount ?? null,
          workerScriptCount: fixture.previewDom.workerScriptCount ?? null,
          rolltemplateCount: fixture.previewDom.rolltemplateCount ?? null,
          stateCandidate: summarizeStateCandidate(fixture.previewDom.stateCandidate ?? fixture.previewStateCandidate ?? null),
        }
      : null,
  };
}

function summarizeStateCandidate(candidate) {
  if (!candidate) return null;
  return {
    actionName: candidate.actionName ?? null,
    actionLabel: candidate.actionLabel ?? null,
    candidateKind: candidate.candidateKind ?? null,
    hiddenAttrs: candidate.hiddenAttrs ?? null,
    applied: candidate.applied ?? Boolean(candidate.appliedControls?.length),
    before: candidate.hiddenStateBefore ?? null,
    after: candidate.hiddenStateAfter ?? null,
  };
}

function summarizeSanitize(fixture) {
  if (!fixture) return null;
  return {
    pass: Boolean(fixture.pass),
    issues: fixture.issues ?? [],
    htmlChanged: Boolean(fixture.html?.changed),
    cssChanged: Boolean(fixture.css?.changed),
    htmlBytes: fixture.html ? { before: fixture.html.beforeBytes, after: fixture.html.afterBytes } : null,
    cssBytes: fixture.css ? { before: fixture.css.beforeBytes, after: fixture.css.afterBytes } : null,
    runtimeStripCount: fixture.html?.runtimeStripCount ?? 0,
    htmlWarnings: fixture.html?.warningCounts ?? {},
    cssWarnings: fixture.css?.warningCounts ?? {},
  };
}

function summarizeChatDom(evidence) {
  if (!evidence) return { exists: false, rolltemplateCount: 0, messageCount: 0 };
  return {
    exists: true,
    capturedAt: evidence.capturedAt ?? null,
    rolltemplateCount: Array.isArray(evidence.rolltemplates) ? evidence.rolltemplates.length : 0,
    messageCount: Array.isArray(evidence.messages) ? evidence.messages.length : 0,
    lastRolltemplateClass: evidence.rolltemplates?.at(-1)?.class ?? null,
    lastRolltemplateTextExcerpt: evidence.rolltemplates?.at(-1)?.text?.slice(0, 120) ?? null,
  };
}

function summarizeStatusFixture(fixture) {
  return {
    localBaselineReady: fixture.localBaselineReady ?? null,
    payloadReady: fixture.payloadReady ?? null,
    actualTargets: fixture.actualTargets?.map((target) => ({
      id: target.id,
      exists: target.exists,
      diffStatus: target.diffStatus,
      requiredForGeneratedSheetCheck: target.requiredForGeneratedSheetCheck,
    })) ?? [],
  };
}

function classifyTarget(target, item, baselineFixture, sanitizeFixture, chatDomEvidence) {
  if (!item) {
    return { target, status: 'MISSING_REPORT_ITEM', primaryClassification: 'missing diff report item' };
  }
  if (item.status === 'SKIP') {
    const categories = [];
    if (target === 'chat' && chatDomEvidence) {
      categories.push('rolltemplate/chat DOM exists but screenshot evidence missing');
    }
    categories.push(item.note ?? 'missing screenshot');
    return {
      target,
      status: 'SKIP',
      note: item.note ?? '',
      primaryClassification: target === 'chat' && chatDomEvidence
        ? 'chat screenshot missing after DOM smoke'
        : 'missing actual screenshot',
      categories,
      nextAction: target === 'chat'
        ? 'Capture a trustworthy Roll20 chat pane screenshot or add a dedicated DOM-to-screenshot capture path before claiming chat parity.'
        : 'Capture the missing Roll20 actual screenshot in the dedicated sandbox/test room or observation room.',
    };
  }
  if (item.status !== 'DIFFED') {
    return { target, status: item.status ?? 'UNKNOWN', primaryClassification: 'diff not available', note: item.note ?? '' };
  }

  const result = item.result ?? {};
  const best = result.best ?? {};
  const localSize = result.localSize ?? [];
  const actualRawSize = result.actualSize ?? [];
  const actualSize = result.actualNormalizedSize ?? actualRawSize;
  const usedRootCrop = Boolean(result.actualMeta?.cssCrop);
  const sizeRatio = localSize[0] && actualSize[0] ? actualSize[0] / localSize[0] : null;
  const comparedHeightRatio = localSize[1] && actualSize[1] ? actualSize[1] / localSize[1] : null;
  const crop = best.crop ?? [];
  const mismatchRatio = Number(best.mismatchRatio ?? result.topLeft?.mismatchRatio ?? 1);
  const categories = [];
  const evidence = [];

  if (actualSize[1] && localSize[1] && actualSize[1] < localSize[1] * 0.35) {
    categories.push('viewport/crop/sheet size');
    evidence.push(`${usedRootCrop ? 'normalized root crop' : 'actual screenshot'} height ${actualSize[1]} is only ${pct(comparedHeightRatio)} of local preview height ${localSize[1]}`);
  }
  if (actualSize[0] && localSize[0] && actualSize[0] < localSize[0] * 0.95) {
    categories.push('dialog viewport clipped horizontally');
    evidence.push(`${usedRootCrop ? 'normalized root crop' : 'actual screenshot'} width ${actualSize[0]} is ${pct(sizeRatio)} of local preview width ${localSize[0]}`);
  }
  if (usedRootCrop) {
    categories.push('root crop captured');
    evidence.push(`root crop came from ${result.actualMeta.rectKey ?? 'unknown rect'} with inset ${JSON.stringify(result.actualMeta.insetCss ?? {})}`);
  }
  if (Array.isArray(crop) && (crop[0] !== 0 || crop[1] !== 0)) {
    categories.push('crop offset');
    evidence.push(`best crop starts at ${crop[0]},${crop[1]}`);
  }
  if (sanitizeFixture?.html?.changed || sanitizeFixture?.css?.changed) {
    categories.push('Roll20 sandbox sanitize/prefix');
    evidence.push(`sandbox sanitizer rewrites html=${Boolean(sanitizeFixture.html?.changed)} css=${Boolean(sanitizeFixture.css?.changed)}`);
  }
  const stateCandidate = baselineFixture?.previewDom?.stateCandidate ?? baselineFixture?.previewStateCandidate ?? null;
  if (stateCandidate) {
    categories.push('default attr/state');
    evidence.push(`local baseline applied state hint ${stateCandidate.actionName ?? stateCandidate.actionLabel ?? 'unknown'}`);
  }
  if (sanitizeFixture?.html?.warningCounts?.['html-url-proxied'] || sanitizeFixture?.css?.warningCounts?.['css-url-proxied']) {
    categories.push('asset loading/url proxy');
    evidence.push(`Roll20 sanitizer proxies ${sanitizeFixture.html?.warningCounts?.['html-url-proxied'] ?? 0} HTML URLs and ${sanitizeFixture.css?.warningCounts?.['css-url-proxied'] ?? 0} CSS URLs`);
  }

  const primaryClassification = categories.includes('viewport/crop/sheet size')
    ? 'viewport/crop/sheet size dominates current diff'
    : categories[0] ?? 'unclassified visual mismatch';

  return {
    target,
    status: 'DIFFED',
    mismatchRatio,
    mismatchPercent: pct(mismatchRatio),
    localSize,
    actualSize,
    actualRawSize,
    actualNormalizedSize: result.actualNormalizedSize ?? null,
    usedRootCrop,
    comparedSize: result.comparedSize ?? null,
    bounds: best.bounds ?? null,
    crop,
    sizeRatio,
    comparedHeightRatio,
    primaryClassification,
    categories,
    evidence,
    nextAction: buildTargetNextAction({ target, categories, mismatchRatio }),
  };
}

function buildTargetNextAction({ target, categories, mismatchRatio }) {
  if (target === 'sandbox' && categories.includes('viewport/crop/sheet size') && categories.includes('root crop captured')) {
    return 'Capture a full-height or scroll-stitched Roll20 sheet-root screenshot, or compare against a matching local viewport crop, before renderer CSS changes.';
  }
  if (target === 'sandbox' && categories.includes('viewport/crop/sheet size')) {
    return 'Capture Roll20 actual sheet root with normalized crop/scale, excluding Roll20 character tab chrome when possible, before renderer CSS changes.';
  }
  if (categories.includes('Roll20 sandbox sanitize/prefix')) {
    return 'Compare actual Roll20 DOM/CSS after sanitize against local Sandbox expected preview DOM/CSS for the same fixture.';
  }
  if (mismatchRatio > 0.05) {
    return 'Inspect computed CSS/default attributes on representative differing elements in Roll20 and local preview.';
  }
  return 'Treat as a small residual diff only after viewport/state/crop are normalized.';
}

function buildGlobalNextActions(fixtures) {
  const actions = [];
  if (fixtures.some((fixture) => fixture.targets.sandbox?.categories?.includes('root crop captured') && fixture.targets.sandbox?.categories?.includes('viewport/crop/sheet size'))) {
    actions.push('Capture full-height/scroll-stitched Roll20 sheet-root evidence or compare against a matching local visible viewport crop.');
  } else if (fixtures.some((fixture) => fixture.targets.sandbox?.primaryClassification?.includes('viewport'))) {
    actions.push('Add a Roll20 character-iframe root crop capture path so sandbox screenshots compare sheet root to sheet root.');
  }
  if (fixtures.some((fixture) => fixture.targets.chat?.primaryClassification?.includes('chat screenshot missing'))) {
    actions.push('Add reliable Roll20 chat screenshot capture or separate DOM evidence gate; do not count chat DOM evidence as screenshot parity.');
  }
  if (fixtures.some((fixture) => fixture.targets.sandbox?.categories?.includes('Roll20 sandbox sanitize/prefix'))) {
    actions.push('Run local Sandbox expected preview vs actual Roll20 DOM/CSS comparison for diffed fixtures.');
  }
  if (fixtures.some((fixture) => fixture.targets.sandbox?.status === 'SKIP')) {
    actions.push('Apply and capture missing AW2E/YSHY generated sandbox screenshots in the dedicated sandbox/test room.');
  }
  return [...new Set(actions)];
}

async function listFixtureIds(baselineDir) {
  if (!existsSync(baselineDir)) return [];
  const entries = await readdir(baselineDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

function pct(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 10000) / 100}%`;
}

function rel(file) {
  return path.relative(process.cwd(), file).replaceAll(path.sep, '/');
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Actual Difference Classification');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('Scope: heuristic diagnosis only. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | ---: |');
  lines.push(`| Fixtures | ${report.summary.fixtures} |`);
  lines.push(`| Diffed sandbox screenshots | ${report.summary.diffedSandbox} |`);
  lines.push(`| Missing sandbox screenshots | ${report.summary.missingSandbox} |`);
  lines.push(`| Missing chat screenshots | ${report.summary.missingChat} |`);
  lines.push(`| Parity verified | ${report.summary.parityVerified ? 'yes' : 'no'} |`);
  lines.push('');
  lines.push('## Fixture Classifications');
  lines.push('');
  lines.push('| Fixture | Target | Status | Mismatch | Primary Classification | Next Action |');
  lines.push('| --- | --- | --- | ---: | --- | --- |');
  for (const fixture of report.fixtures) {
    for (const target of ['sandbox', 'chat', 'room']) {
      const item = fixture.targets[target];
      lines.push(`| ${fixture.fixtureId} | ${target} | ${item.status} | ${item.mismatchPercent ?? ''} | ${item.primaryClassification ?? ''} | ${item.nextAction ?? ''} |`);
    }
  }
  lines.push('');
  lines.push('## Evidence Details');
  for (const fixture of report.fixtures) {
    lines.push('');
    lines.push(`### ${fixture.fixtureId}`);
    lines.push('');
    const baseline = fixture.localBaseline;
    if (baseline?.previewDom) {
      lines.push(`- Local preview size: ${baseline.previewDom.width}x${baseline.previewDom.height}; visible elements ${baseline.previewDom.visibleElementCount}; roll buttons ${baseline.previewDom.rollButtonCount}.`);
    }
    if (baseline?.previewDom?.stateCandidate) {
      lines.push(`- Local state hint: ${baseline.previewDom.stateCandidate.actionName ?? baseline.previewDom.stateCandidate.actionLabel}; hidden attrs ${JSON.stringify(baseline.previewDom.stateCandidate.hiddenAttrs ?? {})}.`);
    }
    if (fixture.sandboxSanitize) {
      lines.push(`- Sandbox sanitize rewrites: html=${fixture.sandboxSanitize.htmlChanged}, css=${fixture.sandboxSanitize.cssChanged}, runtime stripped=${fixture.sandboxSanitize.runtimeStripCount}.`);
    }
    if (fixture.chatDomEvidence?.exists) {
      lines.push(`- Roll20 chat DOM evidence exists: rolltemplates=${fixture.chatDomEvidence.rolltemplateCount}, last class=${fixture.chatDomEvidence.lastRolltemplateClass}.`);
    }
    for (const target of ['sandbox', 'chat', 'room']) {
      const item = fixture.targets[target];
      if (!item?.evidence?.length) continue;
      lines.push(`- ${target} evidence: ${item.evidence.join('; ')}.`);
    }
  }
  if (report.nextActions.length) {
    lines.push('');
    lines.push('## Next Actions');
    for (const action of report.nextActions) {
      lines.push(`- ${action}`);
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

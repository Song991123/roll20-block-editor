#!/usr/bin/env node
/**
 * Summarize the context gaps behind a visible Roll20 root-crop mismatch.
 *
 * This script reads only local ignored evidence under
 * reports/roll20-actual-compare/<run-label>. It does not log into Roll20 and it
 * does not prove visual parity. Its job is to keep the next renderer work honest:
 * when Roll20 iframe DOM/CSS is inaccessible, classify the strongest available
 * signals instead of guessing from a single pixel diff.
 *
 * Usage:
 *   node scripts/roll20_visible_context_diagnostics.mjs \
 *     reports/roll20-actual-compare/<run-label>
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_visible_context_diagnostics.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const outDir = path.join(runDir, 'visible-context-diagnostics');

async function main() {
  const baseline = await readJsonRequired(path.join(runDir, 'local-baseline-results.json'));
  const diff = await readJsonRequired(path.join(runDir, 'actual-screenshot-diff', 'actual-screenshot-diff-results.json'));
  const classification = await readJsonIfExists(path.join(runDir, 'actual-difference-classification', 'actual-difference-classification-results.json'));
  const cropDiag = await readJsonIfExists(path.join(runDir, 'visible-crop-diagnostics', 'visible-crop-diagnostics-results.json'));
  const sanitize = await readJsonIfExists(path.join(runDir, 'sandbox-sanitize-audit', 'roll20-sandbox-sanitize-audit-results.json'));
  const roundtrip = await readJsonIfExists(path.join(runDir, 'payload-roundtrip-visual', 'payload-roundtrip-visual-results.json'));
  const status = await readJsonIfExists(path.join(runDir, 'actual-verification-status', 'actual-verification-status-results.json'));
  const fixtureIds = await listFixtureIds(path.join(runDir, 'local-baseline'));

  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await summarizeFixture({
      fixtureId,
      baseline,
      diff,
      classification,
      cropDiag,
      sanitize,
      roundtrip,
      status,
    }));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'local-only visible Roll20 context diagnostics; not visual parity',
    pass: true,
    summary: {
      fixtures: fixtures.length,
      diffedSandbox: fixtures.filter((fixture) => fixture.actual?.sandbox?.status === 'DIFFED').length,
      actualDomCssReadable: false,
      reasonActualDomCssUnavailable: 'current evidence contains screenshot/metadata only; Roll20 iframe contentDocument was unavailable to automation',
      visualParityVerified: false,
    },
    fixtures,
    globalNextActions: buildGlobalNextActions(fixtures),
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'visible-context-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'visible-context-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    const sandbox = fixture.actual?.sandbox;
    const topHypothesis = fixture.hypotheses[0]?.name ?? 'missing actual evidence';
    console.log(`${sandbox?.status ?? 'SKIP'} ${fixture.fixtureId} ${topHypothesis}`);
  }
  console.log(`ROLL20 VISIBLE CONTEXT DIAGNOSTICS OK ${outDir}`);
}

async function summarizeFixture({ fixtureId, baseline, diff, classification, cropDiag, sanitize, roundtrip, status }) {
  const baselineFixture = baseline.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const sanitizeFixture = sanitize?.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const roundtripFixture = roundtrip?.fixtures?.find((fixture) => fixture.id === fixtureId) ?? null;
  const classFixture = classification?.fixtures?.find((fixture) => fixture.fixtureId === fixtureId) ?? null;
  const statusFixture = status?.fixtures?.find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
  const cropFixture = cropDiag?.items?.find((item) => item.fixtureId === fixtureId) ?? null;
  const diffItems = Object.fromEntries(
    (diff.items ?? [])
      .filter((item) => item.fixtureId === fixtureId)
      .map((item) => [item.target, item]),
  );
  const screenshotDir = path.join(runDir, 'local-baseline', fixtureId, 'screenshots');
  const sandboxRootMeta = await readJsonIfExists(path.join(screenshotDir, 'roll20-sandbox-root.json'));
  const sandboxRootCropMeta = await readJsonIfExists(path.join(screenshotDir, 'roll20-sandbox-root-crop-meta.json'));
  const chatDomEvidence = await readJsonIfExists(path.join(screenshotDir, 'roll20-chat-dom-evidence.json'));

  const actual = summarizeActual(diffItems, sandboxRootMeta, sandboxRootCropMeta, classFixture, statusFixture);
  const local = summarizeLocal(baselineFixture, roundtripFixture);
  const sandboxSanitize = summarizeSanitize(sanitizeFixture);
  const visibleCrop = summarizeVisibleCrop(cropFixture);
  const chat = summarizeChat(chatDomEvidence, diffItems.chat);

  return {
    fixtureId,
    local,
    actual,
    sandboxSanitize,
    visibleCrop,
    chat,
    hypotheses: rankHypotheses({ local, actual, sandboxSanitize, visibleCrop, chat }),
    nextProbes: buildNextProbes({ fixtureId, actual, visibleCrop, chat, sandboxSanitize }),
  };
}

function summarizeLocal(fixture, roundtripFixture) {
  const stateCandidate = fixture?.previewDom?.stateCandidate ?? fixture?.previewStateCandidate ?? null;
  return {
    importMatchPct: fixture?.import?.matchPct ?? null,
    blockCount: fixture?.import?.blockCount ?? null,
    workerBlockCount: fixture?.import?.workerBlockCount ?? null,
    warnings: fixture?.import?.warnings ?? null,
    previewSize: fixture?.previewDom?.rect
      ? {
          width: fixture.previewDom.rect.width,
          height: fixture.previewDom.rect.height,
        }
      : null,
    visibleElementCount: fixture?.previewDom?.visibleElementCount ?? null,
    rollButtonCount: fixture?.previewDom?.rollButtonCount ?? null,
    workerScriptCount: fixture?.previewDom?.workerScriptCount ?? null,
    rolltemplateCount: fixture?.previewDom?.rolltemplateCount ?? null,
    stateCandidate: stateCandidate
      ? {
          actionName: stateCandidate.actionName ?? null,
          actionLabel: stateCandidate.actionLabel ?? null,
          candidateKind: stateCandidate.candidateKind ?? null,
          hiddenAttrs: stateCandidate.hiddenAttrs ?? null,
          applied: stateCandidate.applied ?? Boolean(stateCandidate.appliedControls?.length),
          before: stateCandidate.hiddenStateBefore ?? null,
          after: stateCandidate.hiddenStateAfter ?? null,
        }
      : null,
    payloadRoundtrip: roundtripFixture
      ? {
          pass: Boolean(roundtripFixture.pass),
          mismatchRatio: roundtripFixture.visualDiff?.mismatchRatio ?? roundtripFixture.result?.mismatchRatio ?? null,
          note: 'local payload roundtrip only; not actual Roll20',
        }
      : null,
  };
}

function summarizeActual(diffItems, sandboxRootMeta, sandboxRootCropMeta, classFixture, statusFixture) {
  const sandbox = diffItems.sandbox ?? null;
  const result = sandbox?.result ?? null;
  const actualMeta = result?.actualMeta ?? null;
  const iframeRect = sandboxRootMeta?.iframeRect ?? sandboxRootCropMeta?.iframeRect ?? sandboxRootCropMeta?.sourceMeta?.iframeRect ?? null;
  const dialogRect = sandboxRootMeta?.dialogRect ?? sandboxRootCropMeta?.dialogRect ?? sandboxRootCropMeta?.sourceMeta?.dialogRect ?? null;
  const contentDocument = sandboxRootMeta?.contentDocument ?? sandboxRootCropMeta?.contentDocument ?? null;
  return {
    sandbox: sandbox
      ? {
          status: sandbox.status,
          mismatchRatio: sandbox.status === 'DIFFED' ? result?.best?.mismatchRatio ?? null : null,
          mismatchPercent: sandbox.status === 'DIFFED' ? pct(result?.best?.mismatchRatio ?? null) : null,
          localSize: result?.localSize ?? null,
          actualRawSize: result?.actualSize ?? null,
          actualNormalizedSize: result?.actualNormalizedSize ?? null,
          comparedSize: result?.comparedSize ?? null,
          usedRootCrop: Boolean(actualMeta?.cssCrop),
          actualMeta,
          classification: classFixture?.targets?.sandbox?.primaryClassification ?? sandbox.note ?? null,
          categories: classFixture?.targets?.sandbox?.categories ?? [],
          evidence: classFixture?.targets?.sandbox?.evidence ?? [],
        }
      : { status: 'MISSING_REPORT_ITEM' },
    iframe: {
      iframeRect,
      dialogRect,
      contentDocumentReadable: Boolean(contentDocument?.readable),
      contentDocumentNote: contentDocument?.note ?? 'not available in current local evidence',
      cropInsetCss: actualMeta?.insetCss ?? null,
      cssCrop: actualMeta?.cssCrop ?? null,
      pixelCrop: actualMeta?.pixelCrop ?? null,
      scale: actualMeta?.scale ?? null,
    },
    status: statusFixture
      ? {
          localBaselineReady: statusFixture.localBaselineReady ?? null,
          payloadReady: statusFixture.payloadReady ?? null,
          actualTargets: statusFixture.actualTargets ?? [],
        }
      : null,
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

function summarizeVisibleCrop(item) {
  if (!item) return null;
  const result = item.result ?? {};
  return {
    status: item.status,
    comparedSize: result.comparedSize ?? item.comparedSize ?? null,
    mismatchRatio: result.mismatchRatio ?? null,
    cropGainRatio: result.localCropImprovementRatio ?? null,
    mismatchBounds: result.mismatchBounds ?? null,
    dominantBand: result.dominantBand ?? null,
    dominantQuadrant: result.dominantQuadrant ?? null,
    hypothesis: item.hypothesis ?? null,
  };
}

function summarizeChat(evidence, chatDiffItem) {
  return {
    domEvidenceExists: Boolean(evidence),
    rolltemplateCount: Array.isArray(evidence?.rolltemplates) ? evidence.rolltemplates.length : 0,
    messageCount: Array.isArray(evidence?.messages) ? evidence.messages.length : 0,
    screenshotStatus: chatDiffItem?.status ?? 'MISSING_REPORT_ITEM',
    screenshotNote: chatDiffItem?.note ?? null,
  };
}

function rankHypotheses({ local, actual, sandboxSanitize, visibleCrop, chat }) {
  const ranked = [];
  const sandbox = actual.sandbox;
  const iframe = actual.iframe;
  if (sandbox?.status !== 'DIFFED') {
    ranked.push({
      name: 'missing generated Roll20 sandbox screenshot',
      confidence: 'high',
      evidence: sandbox?.classification ?? 'sandbox target is not diffed',
    });
    return ranked;
  }

  const localWidth = local.previewSize?.width ?? null;
  const actualWidth = sandbox.actualNormalizedSize?.[0] ?? sandbox.actualRawSize?.[0] ?? null;
  const localHeight = local.previewSize?.height ?? null;
  const actualHeight = sandbox.actualNormalizedSize?.[1] ?? sandbox.actualRawSize?.[1] ?? null;
  const cropGain = visibleCrop?.cropGainRatio ?? null;
  const cropInsetLeft = iframe.cropInsetCss?.left ?? null;
  const iframeWidth = iframe.iframeRect?.width ?? null;

  if (localWidth && actualWidth && localHeight && actualHeight && actualHeight / localHeight < 0.35) {
    ranked.push({
      name: 'Roll20 viewport/full-height evidence gap',
      confidence: 'high',
      evidence: `actual visible crop ${actualWidth}x${actualHeight} covers ${pct(actualHeight / localHeight)} of local ${localWidth}x${localHeight}`,
    });
  }

  if (iframeWidth && localWidth && actualWidth && cropInsetLeft !== null) {
    ranked.push({
      name: 'Roll20 scale/layout context mismatch',
      confidence: 'medium-high',
      evidence: `Roll20 iframe width ${iframeWidth}, crop inset left ${cropInsetLeft}, visible crop width ${actualWidth}, local preview width ${localWidth}`,
    });
  }

  if (visibleCrop?.mismatchRatio >= 0.15 && typeof cropGain === 'number' && cropGain < 0.02) {
    ranked.push({
      name: 'visible CSS/state/asset mismatch, not simple crop drift',
      confidence: 'medium-high',
      evidence: `visible mismatch ${pct(visibleCrop.mismatchRatio)}; top-aligned crop gain only ${pct(cropGain)}`,
    });
  }

  if (sandboxSanitize?.htmlChanged || sandboxSanitize?.cssChanged) {
    ranked.push({
      name: 'Roll20 sandbox sanitize/prefix rewrite',
      confidence: 'medium',
      evidence: `htmlChanged=${sandboxSanitize.htmlChanged}, cssChanged=${sandboxSanitize.cssChanged}, selector prefixes=${sandboxSanitize.cssWarnings?.['css-selector-prefixed'] ?? 0}`,
    });
  }

  if (local.stateCandidate) {
    ranked.push({
      name: 'default attr/state needs actual Roll20 confirmation',
      confidence: 'medium',
      evidence: `local baseline applied ${local.stateCandidate.actionName ?? local.stateCandidate.actionLabel}; actual iframe DOM/state was not readable`,
    });
  }

  const proxiedUrls = (sandboxSanitize?.htmlWarnings?.['html-url-proxied'] ?? 0) + (sandboxSanitize?.cssWarnings?.['css-url-proxied'] ?? 0);
  if (proxiedUrls > 0) {
    ranked.push({
      name: 'asset proxy/loading difference',
      confidence: 'medium',
      evidence: `Roll20 sandbox proxy warnings: ${proxiedUrls} URL(s)`,
    });
  }

  if (chat.domEvidenceExists && chat.screenshotStatus !== 'DIFFED') {
    ranked.push({
      name: 'chat visual evidence missing despite DOM rolltemplate',
      confidence: 'high',
      evidence: `chat DOM rolltemplates=${chat.rolltemplateCount}, messages=${chat.messageCount}, screenshot=${chat.screenshotStatus}`,
    });
  }

  return ranked;
}

function buildNextProbes({ fixtureId, actual, visibleCrop, chat, sandboxSanitize }) {
  const probes = [];
  if (!actual.iframe.contentDocumentReadable) {
    probes.push('Capture actual Roll20 iframe root metrics when readable: body scrollWidth/clientWidth, root bounding box, charactersheet class list, and sampled computed styles.');
  }
  if (actual.sandbox?.status === 'DIFFED') {
    probes.push('Generate a local expected viewport using Roll20 iframe width/inset context and compare that against the actual root crop before changing renderer CSS.');
  }
  if (visibleCrop?.mismatchRatio >= 0.05) {
    probes.push('Add a sampled visible-node CSS/context comparison for the matched local crop versus the Roll20 sandbox expected preview.');
  }
  if (sandboxSanitize?.htmlChanged || sandboxSanitize?.cssChanged) {
    probes.push('Diff normal preview versus local Sandbox expected preview at the same visible crop to isolate Roll20 sanitize/prefix impact.');
  }
  if (chat.domEvidenceExists && chat.screenshotStatus !== 'DIFFED') {
    probes.push('Capture a trustworthy Roll20 chat pane screenshot or a dedicated DOM-to-image chat card artifact before claiming rolltemplate parity.');
  }
  probes.push(`Capture full-height or scroll-stitched Roll20 root evidence for ${fixtureId} before any full-sheet parity claim.`);
  return probes;
}

function buildGlobalNextActions(fixtures) {
  const actions = new Set();
  if (fixtures.some((fixture) => fixture.actual?.sandbox?.status === 'DIFFED')) {
    actions.add('Build same-context local visible preview: Roll20 iframe/dialog width, measured inset, sandbox sanitize mode, and state-map hint.');
    actions.add('Capture full-height/scroll-stitched Roll20 root evidence; current root crop covers only the visible top of tall sheets.');
  }
  if (fixtures.some((fixture) => fixture.hypotheses.some((hypothesis) => hypothesis.name.includes('default attr/state')))) {
    actions.add('When Roll20 iframe DOM becomes readable, compare actual hidden attr/default state against the local state-map-applied baseline.');
  }
  if (fixtures.some((fixture) => fixture.hypotheses.some((hypothesis) => hypothesis.name.includes('chat visual evidence')))) {
    actions.add('Fix chat screenshot capture path separately from sheet-root capture.');
  }
  actions.add('Do not change renderer CSS from this report alone; it is triage evidence, not parity proof.');
  return [...actions];
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Visible Context Diagnostics',
    '',
    `Run dir: \`${report.runDir}\``,
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local-only context diagnosis for actual Roll20 screenshot mismatches. This is not a Roll20 visual parity claim.',
    '',
    `Actual iframe DOM/CSS readable: **${report.summary.actualDomCssReadable ? 'yes' : 'no'}**`,
    `Reason: ${report.summary.reasonActualDomCssUnavailable}`,
    '',
    '| Fixture | Sandbox | Local preview | Actual compared | Mismatch | Crop gain | Top hypothesis | Chat |',
    '| --- | --- | ---: | ---: | ---: | ---: | --- | --- |',
  ];

  for (const item of report.fixtures) {
    const sandbox = item.actual?.sandbox ?? {};
    const localSize = item.local?.previewSize ? `${item.local.previewSize.width}x${item.local.previewSize.height}` : '';
    const actualSize = Array.isArray(sandbox.actualNormalizedSize)
      ? sandbox.actualNormalizedSize.join('x')
      : Array.isArray(sandbox.actualRawSize)
        ? sandbox.actualRawSize.join('x')
        : '';
    const cropGain = pct(item.visibleCrop?.cropGainRatio);
    const chat = item.chat.domEvidenceExists
      ? `DOM ${item.chat.rolltemplateCount}/${item.chat.messageCount}, screenshot ${item.chat.screenshotStatus}`
      : `screenshot ${item.chat.screenshotStatus}`;
    lines.push(`| \`${item.fixtureId}\` | ${sandbox.status ?? ''} | ${localSize} | ${actualSize} | ${sandbox.mismatchPercent ?? ''} | ${cropGain} | ${item.hypotheses[0]?.name ?? ''} | ${chat} |`);
  }

  lines.push('');
  lines.push('## Fixture Details');
  lines.push('');
  for (const item of report.fixtures) {
    lines.push(`### ${item.fixtureId}`);
    lines.push('');
    lines.push('- Hypotheses:');
    for (const hypothesis of item.hypotheses) {
      lines.push(`  - ${hypothesis.confidence}: ${hypothesis.name} - ${hypothesis.evidence}`);
    }
    lines.push('- Next probes:');
    for (const probe of item.nextProbes) {
      lines.push(`  - ${probe}`);
    }
    lines.push('');
  }

  lines.push('## Global Next Actions');
  lines.push('');
  for (const action of report.globalNextActions) lines.push(`- ${action}`);
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This report can prioritize the next investigation.');
  lines.push('- It does not prove actual Roll20 visual parity.');
  lines.push('- It does not prove full-height sheet parity when only a visible root crop exists.');
  lines.push('- It does not prove chat/rolltemplate visual parity without a trustworthy chat screenshot.');
  return `${lines.join('\n')}\n`;
}

async function listFixtureIds(baselineDir) {
  const entries = await readdir(baselineDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function readJsonRequired(file) {
  if (!existsSync(file)) throw new Error(`Missing required report: ${file}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

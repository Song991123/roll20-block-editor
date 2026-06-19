#!/usr/bin/env node
/**
 * Create a local-only capture plan for missing or stale Roll20 chat evidence.
 *
 * The plan is intentionally evidence-only: it does not log in to Roll20, click
 * roll buttons, or capture screenshots. It reads an ignored actual-compare run
 * folder, identifies generated-sheet chat targets that are missing/suspect, and
 * writes concrete screenshot destinations plus a browser-side DOM probe snippet.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const onlyFixture = args.find((arg, index) => index > 0 && !arg.startsWith('--')) ?? '';
const INCLUDE_ALL = args.includes('--all');
const SELF_TEST = args.includes('--self-test');
const MAX_CHAT_SIDECAR_AGE_MS = 5 * 60 * 1000;

if (SELF_TEST) {
  runSelfTest();
} else if (!args[0]) {
  console.error('Usage: node scripts/roll20_chat_capture_plan.mjs reports/roll20-actual-compare/<label> [fixture-id] [--all]');
  process.exit(2);
} else {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

const outDir = path.join(runDir, 'roll20-chat-capture-plan');

async function main() {
  if (!existsSync(runDir)) throw new Error(`missing run folder: ${runDir}`);
  const baselineDir = path.join(runDir, 'local-baseline');
  if (!existsSync(baselineDir)) throw new Error(`missing local baseline folder: ${baselineDir}`);

  const fixtureIds = (await readdir(baselineDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((fixtureId) => !onlyFixture || fixtureId === onlyFixture)
    .sort((a, b) => a.localeCompare(b));
  if (!fixtureIds.length) throw new Error(`no fixture folders found${onlyFixture ? ` for ${onlyFixture}` : ''}`);

  const status = await readJsonIfExists(path.join(runDir, 'actual-verification-status', 'actual-verification-status-results.json'));
  const chatParity = await readJsonIfExists(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const entries = fixtureIds.map((fixtureId) => buildEntry(fixtureId, status, chatParity));
  const plannedEntries = INCLUDE_ALL ? entries : entries.filter((entry) => entry.needsCapture);

  await mkdir(path.join(outDir, 'snippets'), { recursive: true });
  const snippetChecks = [];
  for (const entry of plannedEntries) {
    const snippet = renderDomProbeSnippet(entry);
    snippetChecks.push(validateSnippetSyntax(entry.fixtureId, snippet));
    await writeFile(path.join(outDir, 'snippets', `${entry.fixtureId}-chat-dom-probe-snippet.js`), snippet, 'utf8');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    includeAll: INCLUDE_ALL,
    fixtureFilter: onlyFixture || null,
    scope: 'local-only Roll20 chat capture handoff plan; not Roll20 visual parity',
    currentStatus: {
      status: status?.status ?? 'UNKNOWN',
      generatedActualScreenshots: ratio(status?.summary?.generatedPresentCount, status?.summary?.generatedTargetCount),
      generatedDiffed: ratio(status?.summary?.generatedDiffedCount, status?.summary?.generatedTargetCount),
      rendererReady: Boolean(status?.summary?.rendererReady),
      rendererAction: status?.summary?.rendererAction ?? 'UNKNOWN',
      rendererBlockers: Number(status?.summary?.rendererBlockerCount ?? 0),
      chatNormalizedCompared: ratio(status?.summary?.chatParityNormalizedCompared, status?.summary?.chatParityFixtures),
      chatNeedsNormalizedCapture: Number(status?.summary?.chatParityNeedsNormalizedCapture ?? 0),
      chatActualCssInactive: Number(status?.summary?.chatParityActualCssInactive ?? 0),
      chatActualCssScopedMismatch: Number(status?.summary?.chatParityActualCssScopedMismatch ?? 0),
      chatNormalizedHighMismatch: Number(status?.summary?.chatParityNormalizedHighMismatch ?? 0),
    },
    entries,
    plannedEntries,
    snippetChecks,
    followUpCommands: [
      `node scripts/roll20_actual_screenshot_diff.mjs ${rel(runDir)}`,
      `corepack pnpm run diagnose:roll20-chat-parity -- ${rel(runDir)}`,
      `corepack pnpm run gate:roll20-renderer-action -- ${rel(runDir)}`,
      `corepack pnpm run status:roll20-actual -- ${rel(runDir)}`,
    ],
  };

  await writeFile(path.join(outDir, 'roll20-chat-capture-plan-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'roll20-chat-capture-plan-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT CAPTURE PLAN ${plannedEntries.length ? 'NEEDS_CAPTURE' : 'ALL_CHAT_EVIDENCE_TRUSTED'}`);
  console.log(`run=${rel(runDir)}`);
  console.log(`plannedFixtures=${plannedEntries.length}/${entries.length}`);
  console.log(`snippetSyntax=${snippetChecks.every((check) => check.ok) ? 'PASS' : 'FAIL'}`);
  for (const entry of plannedEntries) {
    console.log(`CHAT_CAPTURE ${entry.fixtureId}: ${entry.chat.status} ${entry.captureReasons.join('; ')}`);
  }
  console.log(`out=${rel(outDir)}`);
}

function buildEntry(fixtureId, status, chatParity) {
  const fixtureDir = path.join(runDir, 'local-baseline', fixtureId);
  const screenshots = path.join(fixtureDir, 'screenshots');
  const payloadHtml = path.join(fixtureDir, 'payload', 'sheet.html');
  const chat = validateChatEvidence(screenshots);
  const statusFixture = (status?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId);
  const statusChatTarget = statusFixture?.actualTargets?.find((target) => target.id === 'chat') ?? null;
  const parityFixture = (chatParity?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId) ?? null;
  const rollButtons = extractRollButtonNames(payloadHtml);
  const captureReasons = [];
  if (!chat.ok) captureReasons.push(chat.note);
  if (parityFixture?.status === 'NEEDS_NORMALIZED_CAPTURE') {
    captureReasons.push('chat parity diagnostic needs normalized rolltemplate crop metadata');
  }
  const needsCapture = captureReasons.length > 0;
  const targets = {
    chatPng: fileTarget(path.join(screenshots, 'roll20-chat.png')),
    chatDomEvidence: fileTarget(path.join(screenshots, 'roll20-chat-dom-evidence.json')),
    chatPagePng: fileTarget(path.join(screenshots, 'roll20-chat-page.png')),
  };
  return {
    fixtureId,
    needsCapture,
    captureReasons,
    chat,
    statusTarget: statusChatTarget
      ? {
          exists: Boolean(statusChatTarget.exists),
          rawExists: Boolean(statusChatTarget.rawExists),
          diffStatus: statusChatTarget.diffStatus ?? '',
          validationKind: statusChatTarget.validation?.kind ?? '',
          note: statusChatTarget.note ?? statusChatTarget.validation?.note ?? '',
        }
      : null,
    parity: parityFixture
      ? {
          status: parityFixture.status ?? '',
          compareMode: parityFixture.compareMode ?? '',
          mismatchPct: pct(parityFixture.mismatchRatio),
          actualCss: parityFixture.actualChatCss?.classification ?? '',
        }
      : null,
    rollButtons,
    targets,
    snippetPath: rel(path.join(outDir, 'snippets', `${fixtureId}-chat-dom-probe-snippet.js`)),
    captureChecklist: [
      'Load this fixture in the dedicated Roll20 Custom Sheet Sandbox or approved test room.',
      'Clear or visually separate old chat messages if needed so the next rolltemplate is unambiguous.',
      `Click a real sheet roll button${rollButtons.length ? ` such as ${rollButtons.slice(0, 4).map((name) => `\`${name}\``).join(', ')}` : ''}.`,
      'Capture roll20-chat.png from the visible Roll20 chat/rolltemplate area. Prefer CDP Page.captureScreenshot with format=png and clip.scale=1; do not trust a .png filename if the screenshot bytes are JPEG or scaled.',
      'Immediately capture roll20-chat-dom-evidence.json from the same message/action using the generated DOM probe snippet or browser automation.',
      'Keep screenshot and DOM sidecar timestamps within 5 minutes.',
      'Rerun screenshot diff, chat parity diagnostics, renderer action gate, and status.',
    ],
  };
}

function validateChatEvidence(screenshots) {
  const screenshot = path.join(screenshots, 'roll20-chat.png');
  const pageScreenshot = path.join(screenshots, 'roll20-chat-page.png');
  const domEvidenceFile = path.join(screenshots, 'roll20-chat-dom-evidence.json');
  const domEvidence = readJsonIfExists(domEvidenceFile);
  const hasPageScreenshot = existsSync(pageScreenshot);
  const hasDomEvidence = Boolean(domEvidence);
  const hasRenderedChatDom = hasPositiveChatDomEvidence(domEvidence);
  const freshness = existsSync(screenshot) && existsSync(domEvidenceFile)
    ? validateSidecarFreshness(screenshot, domEvidenceFile)
    : null;

  if (!existsSync(screenshot)) {
    if (hasRenderedChatDom) {
      return {
        ok: false,
        status: hasPageScreenshot ? 'DOM_PAGE_ONLY' : 'DOM_ONLY',
        note: hasPageScreenshot
          ? 'Roll20 chat DOM evidence exists and roll20-chat-page.png exists, but roll20-chat.png is missing'
          : 'Roll20 chat DOM evidence exists, but roll20-chat.png is missing',
        screenshot: fileTarget(screenshot),
        sidecar: fileTarget(domEvidenceFile),
        sidecarFreshness: freshness,
      };
    }
    return {
      ok: false,
      status: hasDomEvidence ? 'DOM_EMPTY_OR_SCREENSHOT_MISSING' : 'MISSING',
      note: hasPageScreenshot
        ? 'roll20-chat-page.png exists, but roll20-chat.png is missing'
        : 'missing Roll20 chat screenshot',
      screenshot: fileTarget(screenshot),
      sidecar: fileTarget(domEvidenceFile),
      sidecarFreshness: freshness,
    };
  }
  if (!hasRenderedChatDom) {
    return {
      ok: false,
      status: hasDomEvidence ? 'SCREENSHOT_WITH_EMPTY_DOM' : 'SCREENSHOT_ONLY',
      note: hasDomEvidence
        ? 'Roll20 chat screenshot exists, but DOM evidence did not show rendered rolltemplate markers'
        : 'Roll20 chat screenshot exists, but no DOM sidecar proves which rolltemplate/message rendered',
      screenshot: fileTarget(screenshot),
      sidecar: fileTarget(domEvidenceFile),
      sidecarFreshness: freshness,
    };
  }
  if (!freshness.ok) {
    return {
      ok: false,
      status: 'STALE_DOM',
      note: freshness.note,
      screenshot: fileTarget(screenshot),
      sidecar: fileTarget(domEvidenceFile),
      sidecarFreshness: freshness,
    };
  }
  return {
    ok: true,
    status: 'PRESENT',
    note: 'Roll20 chat screenshot exists with fresh supporting DOM evidence',
    screenshot: fileTarget(screenshot),
    sidecar: fileTarget(domEvidenceFile),
    sidecarFreshness: freshness,
  };
}

function validateSidecarFreshness(screenshot, sidecar) {
  const screenshotStat = statSync(screenshot);
  const sidecarStat = statSync(sidecar);
  const deltaMs = Math.abs(screenshotStat.mtimeMs - sidecarStat.mtimeMs);
  return {
    ok: deltaMs <= MAX_CHAT_SIDECAR_AGE_MS,
    deltaSeconds: Math.round(deltaMs / 1000),
    screenshotMtime: screenshotStat.mtime.toISOString(),
    sidecarMtime: sidecarStat.mtime.toISOString(),
    note: deltaMs <= MAX_CHAT_SIDECAR_AGE_MS
      ? 'Roll20 chat screenshot and DOM sidecar timestamps are close enough'
      : `Roll20 chat screenshot and DOM sidecar are stale relative to each other (${Math.round(deltaMs / 1000)}s apart)`,
  };
}

function extractRollButtonNames(file) {
  if (!existsSync(file)) return [];
  const html = readFileSync(file, 'utf8');
  const names = new Set();
  const re = /name\s*=\s*["'](roll_[^"']+)["']/gi;
  let match;
  while ((match = re.exec(html)) && names.size < 12) {
    names.add(match[1]);
  }
  return [...names];
}

function renderDomProbeSnippet(entry) {
  return `(() => {
  const fixtureId = ${JSON.stringify(entry.fixtureId)};
  const textchat = document.querySelector('#textchat, #rightsidebar, .textchatcontainer');
  const messages = Array.from(document.querySelectorAll('#textchat .message, #textchat .chatlogmessage, #rightsidebar .message, #rightsidebar .chatlogmessage'));
  const templates = Array.from(document.querySelectorAll('[class*="sheet-rolltemplate-"], [class*="rolltemplate-"]'));
  const latestTemplate = templates[templates.length - 1] || null;
  const latestMessage = latestTemplate ? messages.find((message) => message.contains(latestTemplate)) : messages[messages.length - 1] || null;
  const rectOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  };
  const cloneRect = (rect) => rect ? { x: rect.x, y: rect.y, left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom } : null;
  const clip = rectOf(textchat) || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight, right: window.innerWidth, bottom: window.innerHeight };
  const templateInfos = templates.map((template, index) => ({
    index,
    className: template.className,
    rect: cloneRect(rectOf(template)),
    htmlSnippet: template.outerHTML.slice(0, 4000),
    text: (template.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 1000),
  }));
  const styleText = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((node) => node.tagName === 'STYLE' ? node.textContent || '' : node.href || '')
    .join('\\n');
  const expectedClasses = [...new Set(templateInfos
    .flatMap((template) => String(template.className || '').split(/\\s+/))
    .filter((className) => className.startsWith('sheet-rolltemplate-')))];
  const expectedRules = Object.fromEntries(expectedClasses.map((className) => [className, styleText.includes('.' + className)]));
  const unprefixedRules = expectedClasses
    .map((className) => className.replace(/^sheet-/, ''))
    .filter((className) => styleText.includes('.' + className));
  const scopedUnprefixedRules = expectedClasses
    .map((className) => className.replace(/^sheet-/, ''))
    .filter((className) => styleText.includes('.charsheet .' + className) || styleText.includes('.charactersheet .' + className));
  const anyExpectedRulePresent = Object.values(expectedRules).some(Boolean);
  const hasScopedOrUnprefixedMismatch = unprefixedRules.length > 0 || scopedUnprefixedRules.length > 0;
  const chatCssEvidence = {
    capturedAt: new Date().toISOString(),
    expectedRules,
    anyExpectedRulePresent,
    unprefixedRules,
    scopedUnprefixedRules,
    unprefixedRulePresent: unprefixedRules.length > 0,
    scopedUnprefixedRulePresent: scopedUnprefixedRules.length > 0,
    styleElementCount: document.querySelectorAll('style').length,
    stylesheetLinkCount: document.querySelectorAll('link[rel="stylesheet"]').length,
    styleTextLength: styleText.length,
    templateCount: templates.length,
    classification: anyExpectedRulePresent
      ? 'EXPECTED_RULE_PRESENT'
      : hasScopedOrUnprefixedMismatch
        ? 'CSS_RULE_SCOPED_OR_UNPREFIXED'
        : 'CSS_RULE_MISSING_IN_PAGE_STYLES',
    note: 'Read-only DOM probe of Roll20 text chat. CSS evidence is diagnostic and must be interpreted with the matching screenshot.',
  };
  const evidence = {
    fixtureId,
    capturedAt: new Date().toISOString(),
    captureMethod: 'Browser DOM probe paired with a manually or automation-captured roll20-chat.png',
    pageUrl: '[redacted-url]',
    activeRightTab: document.querySelector('#textchattab.active, .textchattab.active') ? 'textchattab' : null,
    chatSelector: textchat ? (textchat.id ? '#' + textchat.id : textchat.className) : null,
    chatRect: cloneRect(clip),
    clip: cloneRect(clip),
    screenshotClipApplied: cloneRect(clip),
    screenshotCssClip: cloneRect(clip),
    messageCount: messages.length,
    rolltemplateCount: templates.length,
    latestMessage: latestMessage ? {
      className: latestMessage.className,
      rect: rectOf(latestMessage),
      text: (latestMessage.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 2000),
    } : null,
    latestTemplate: templateInfos.length ? { ...templateInfos[templateInfos.length - 1] } : null,
    rolltemplates: templateInfos,
    templates: templateInfos.slice(-5),
    chatCssEvidence,
    textMarkers: {
      rolltemplate: templates.length > 0,
      sheetRolltemplate: templates.some((template) => String(template.className).includes('sheet-rolltemplate-')),
    },
    viewport: {
      width: window.visualViewport?.width ?? window.innerWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
      scale: window.visualViewport?.scale ?? 1,
      offsetLeft: window.visualViewport?.offsetLeft ?? 0,
      offsetTop: window.visualViewport?.offsetTop ?? 0,
    },
    evidenceNote: 'Save this JSON immediately beside roll20-chat.png as roll20-chat-dom-evidence.json. The screenshot and sidecar must describe the same roll action.',
  };
  console.log(JSON.stringify(evidence, null, 2));
  return evidence;
})();\n`;
}

function runSelfTest() {
  const snippet = renderDomProbeSnippet({ fixtureId: 'self-test' });
  const syntax = validateSnippetSyntax('self-test', snippet);
  if (!syntax.ok) {
    console.error(`ROLL20 CHAT CAPTURE PLAN SELF_TEST FAIL syntax ${syntax.error}`);
    process.exitCode = 1;
    return;
  }
  const template = fakeElement({
    className: 'sheet-rolltemplate-aw',
    rect: { x: 120, y: 180, width: 260, height: 90, right: 380, bottom: 270 },
    textContent: 'rolls Succeeds',
    outerHTML: '<div class="sheet-rolltemplate-aw"><table><tbody><tr><td>rolls</td></tr></tbody></table></div>',
  });
  const message = fakeElement({
    className: 'message general you',
    rect: { x: 100, y: 160, width: 300, height: 130, right: 400, bottom: 290 },
    textContent: 'GM rolls Succeeds',
    contains: (node) => node === template,
  });
  const textchat = fakeElement({
    id: 'textchat',
    className: 'textchatcontainer',
    rect: { x: 90, y: 40, width: 340, height: 780, right: 430, bottom: 820 },
    textContent: 'chat',
  });
  const style = { tagName: 'STYLE', textContent: '.sheet-rolltemplate-aw table{border-collapse:collapse;}' };
  const activeTab = fakeElement({
    className: 'active',
    rect: { x: 0, y: 0, width: 1, height: 1, right: 1, bottom: 1 },
  });
  const fakeDocument = {
    querySelector(selector) {
      if (selector.includes('#textchattab.active')) return activeTab;
      if (selector.includes('#textchat')) return textchat;
      return null;
    },
    querySelectorAll(selector) {
      if (selector.includes('.message')) return [message];
      if (selector.includes('rolltemplate')) return [template];
      if (selector === 'style, link[rel="stylesheet"]') return [style];
      if (selector === 'style') return [style];
      if (selector === 'link[rel="stylesheet"]') return [];
      return [];
    },
  };
  const fakeWindow = {
    innerWidth: 1280,
    innerHeight: 900,
    visualViewport: {
      width: 1280,
      height: 900,
      scale: 1,
      offsetLeft: 0,
      offsetTop: 0,
    },
  };
  const capturedLogs = [];
  const fakeConsole = { log: (value) => capturedLogs.push(value) };
  let evidence;
  try {
    // eslint-disable-next-line no-new-func
    evidence = new Function('document', 'window', 'console', `return ${snippet}`)(fakeDocument, fakeWindow, fakeConsole);
  } catch (error) {
    console.error(`ROLL20 CHAT CAPTURE PLAN SELF_TEST FAIL runtime ${String(error?.message || error)}`);
    process.exitCode = 1;
    return;
  }
  const failures = [];
  if (evidence.fixtureId !== 'self-test') failures.push('fixtureId mismatch');
  if (!evidence.clip?.width || !evidence.clip?.height) failures.push('missing clip');
  if (!evidence.screenshotClipApplied?.width || !evidence.screenshotCssClip?.width) failures.push('missing screenshot clip aliases');
  if (evidence.chatRect === evidence.clip) failures.push('chatRect and clip reused the same object');
  if (evidence.clip === evidence.screenshotClipApplied) failures.push('clip and screenshotClipApplied reused the same object');
  if (evidence.clip === evidence.screenshotCssClip) failures.push('clip and screenshotCssClip reused the same object');
  if (!Array.isArray(evidence.rolltemplates) || evidence.rolltemplates.length !== 1) failures.push('missing rolltemplates array');
  if (!evidence.rolltemplates?.[0]?.rect?.width) failures.push('missing rolltemplate rect');
  if (evidence.chatCssEvidence?.classification !== 'EXPECTED_RULE_PRESENT') failures.push(`unexpected css classification ${evidence.chatCssEvidence?.classification}`);
  if (!evidence.textMarkers?.rolltemplate || !evidence.textMarkers?.sheetRolltemplate) failures.push('missing text markers');
  if (!capturedLogs.some((value) => String(value).includes('"rolltemplates"'))) failures.push('console JSON did not include rolltemplates');
  try {
    const json = JSON.stringify(evidence);
    const parsed = JSON.parse(json);
    if (json.includes('[Circular]')) failures.push('serialized evidence contains [Circular]');
    if (!parsed.clip?.width || !parsed.screenshotClipApplied?.width || !parsed.screenshotCssClip?.width) {
      failures.push('serialized evidence lost clip aliases');
    }
  } catch (error) {
    failures.push(`evidence is not JSON serializable: ${String(error?.message || error)}`);
  }
  if (failures.length) {
    console.error(`ROLL20 CHAT CAPTURE PLAN SELF_TEST FAIL ${failures.join('; ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('ROLL20 CHAT CAPTURE PLAN SELF_TEST PASS');
  console.log('fields=clip,screenshotClipApplied,screenshotCssClip,rolltemplates,chatCssEvidence');
}

function fakeElement({ id = '', className = '', rect, textContent = '', outerHTML = '', contains = () => false }) {
  return {
    id,
    className,
    textContent,
    outerHTML,
    tagName: 'DIV',
    contains,
    getBoundingClientRect() {
      return rect;
    },
  };
}

function validateSnippetSyntax(fixtureId, snippet) {
  try {
    // eslint-disable-next-line no-new-func
    new Function(snippet);
    return { fixtureId, ok: true };
  } catch (error) {
    return { fixtureId, ok: false, error: String(error?.message || error) };
  }
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Capture Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${rel(report.runDir)}\``,
    '',
    'Scope: local-only handoff plan. This is not Roll20 visual parity and does not replace actual screenshots.',
    '',
    '## Current Gate State',
    '',
    `- Actual status: ${report.currentStatus.status}`,
    `- Generated actual screenshots: ${report.currentStatus.generatedActualScreenshots}`,
    `- Generated diffs: ${report.currentStatus.generatedDiffed}`,
    `- Renderer action: ${report.currentStatus.rendererAction}`,
    `- Renderer ready: ${report.currentStatus.rendererReady ? 'YES' : 'NO'}`,
    `- Renderer blockers: ${report.currentStatus.rendererBlockers}`,
    `- Chat normalized compared: ${report.currentStatus.chatNormalizedCompared}`,
    `- Chat needs normalized capture: ${report.currentStatus.chatNeedsNormalizedCapture}`,
    `- Chat actual CSS inactive: ${report.currentStatus.chatActualCssInactive}`,
    `- Chat scoped/prefix mismatch: ${report.currentStatus.chatActualCssScopedMismatch}`,
    `- Chat normalized high mismatch: ${report.currentStatus.chatNormalizedHighMismatch}`,
    '',
    '## Planned Captures',
    '',
  ];

  if (!report.plannedEntries.length) {
    lines.push('No chat recapture needed by the current local evidence rules.', '');
  } else {
    lines.push('| Fixture | Chat status | Reason | Screenshot | DOM sidecar | Snippet |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const entry of report.plannedEntries) {
      lines.push(`| \`${entry.fixtureId}\` | ${entry.chat.status} | ${escapeCell(entry.captureReasons.join('; '))} | \`${entry.targets.chatPng.relativePath}\` | \`${entry.targets.chatDomEvidence.relativePath}\` | \`${entry.snippetPath}\` |`);
    }
    lines.push('');
  }

  if (report.snippetChecks.length) {
    lines.push('## Snippet Syntax Checks', '');
    lines.push('| Fixture | Syntax | Error |');
    lines.push('| --- | --- | --- |');
    for (const check of report.snippetChecks) {
      lines.push(`| \`${check.fixtureId}\` | ${check.ok ? 'PASS' : 'FAIL'} | ${escapeCell(check.error ?? '')} |`);
    }
    lines.push('');
  }

  lines.push('## Per-Fixture Details', '');
  for (const entry of report.entries) {
    lines.push(`### ${entry.fixtureId}`, '');
    lines.push(`- Needs capture: ${entry.needsCapture ? 'YES' : 'no'}`);
    if (entry.captureReasons.length) lines.push(`- Capture reason: ${entry.captureReasons.join('; ')}`);
    lines.push(`- Chat status: ${entry.chat.status}`);
    lines.push(`- Reason: ${entry.chat.note}`);
    if (entry.chat.sidecarFreshness) {
      lines.push(`- Sidecar freshness: ${entry.chat.sidecarFreshness.deltaSeconds}s (${entry.chat.sidecarFreshness.ok ? 'ok' : 'stale'})`);
    }
    if (entry.parity) {
      lines.push(`- Chat parity diagnostic: ${entry.parity.status || 'unknown'}, mode=${entry.parity.compareMode || 'n/a'}, mismatch=${entry.parity.mismatchPct ?? 'n/a'}%, actualCss=${entry.parity.actualCss || 'n/a'}`);
    }
    lines.push(`- Suggested roll buttons: ${entry.rollButtons.length ? entry.rollButtons.map((name) => `\`${name}\``).join(', ') : 'none detected in payload'}`);
    lines.push('- Checklist:');
    for (const item of entry.captureChecklist) lines.push(`  - ${item}`);
    lines.push('');
  }

  lines.push('## Follow-Up Commands', '');
  for (const command of report.followUpCommands) lines.push(`- \`${command}\``);
  lines.push('');
  lines.push('## Claim Boundary', '');
  lines.push('- A DOM sidecar without `roll20-chat.png` is not visual evidence.');
  lines.push('- `roll20-chat.png` without a fresh DOM sidecar is suspect.');
  lines.push('- Prefer true PNG bytes at CSS scale 1 for chat crops. If Chrome/browser tooling returns JPEG bytes or a non-1 screenshot scale, record that in the sidecar and treat pixel mismatch as lower-confidence diagnostic evidence.');
  lines.push('- The screenshot and sidecar must come from the same Roll20 roll action and stay within 5 minutes.');
  lines.push('- Generated reports and screenshots stay ignored/local-only.');
  return `${lines.join('\n')}\n`;
}

function hasPositiveChatDomEvidence(evidence) {
  if (!evidence) return false;
  if (Number(evidence.rolltemplateCount ?? 0) > 0) return true;
  if (Array.isArray(evidence.rolltemplates) && evidence.rolltemplates.length > 0) return true;
  if (Array.isArray(evidence.templates) && evidence.templates.length > 0) return true;
  if (evidence.textMarkers?.rolltemplate) return true;
  if (evidence.latestTemplate?.className) return true;
  return false;
}

function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function fileTarget(file) {
  return {
    path: file,
    relativePath: rel(file),
    exists: existsSync(file),
    mtime: existsSync(file) ? statSync(file).mtime.toISOString() : null,
  };
}

function pct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number((number * 100).toFixed(2));
}

function ratio(a, b) {
  const left = Number(a ?? 0);
  const right = Number(b ?? 0);
  return `${left}/${right}`;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 180);
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

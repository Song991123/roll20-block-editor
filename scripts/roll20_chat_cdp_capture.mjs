#!/usr/bin/env node
/**
 * Capture Roll20 chat evidence through an already-open Chrome/Edge CDP endpoint.
 *
 * This is a local-only helper. It does not log in, create rooms, or upload sheet
 * source. Use it only against the dedicated Roll20 Custom Sheet Sandbox or an
 * approved test room after the intended fixture is already loaded.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  classifyRoll20Target,
  isRoll20CaptureReady,
  isRoll20PageUrl,
  nextActionForReadiness,
  selfTestRoll20Readiness,
} from './lib/roll20Readiness.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(readOption('--run-dir', args[0] ?? ''));
const FIXTURE_ID = readOption('--fixture', '');
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', 'app.roll20.net');
const ROLL_BUTTON = readOption('--roll-button', '');
const EXPECTED_TEMPLATE_CLASS = readOption('--expected-template-class', '');
const SKIP_CLICK = hasFlag('--skip-click');
const KEEP_DIALOGS = hasFlag('--keep-dialogs');
const WAIT_MS = Number(readOption('--wait-ms', '1500'));
const DRY_RUN = hasFlag('--dry-run');
const PLAN_ONLY = hasFlag('--plan-only') || hasFlag('--print-plan');
const SELF_TEST_READINESS = hasFlag('--self-test-readiness');
const OUT_DIR_RAW = readOption('--out-dir', '');
const OUT_DIR = OUT_DIR_RAW ? path.resolve(OUT_DIR_RAW) : '';
const SNIPPET_RAW = readOption('--snippet', '');

if (SELF_TEST_READINESS) {
  runReadinessSelfTest();
  process.exit(0);
}

if (!RUN_DIR || !FIXTURE_ID) {
  console.error('Usage: node scripts/roll20_chat_cdp_capture.mjs --run-dir reports/roll20-actual-compare/<label> --fixture <fixture-id> [--out-dir <ignored-temp-dir>] [--snippet <probe-snippet.js>] [--sheet-frame-evidence <json>] [--cdp http://127.0.0.1:9222] [--roll-button roll_name] [--expected-template-class sheet-rolltemplate-name] [--skip-click] [--keep-dialogs] [--dry-run] [--plan-only] [--self-test-readiness]');
  process.exit(2);
}

const screenshotsDir = path.join(RUN_DIR, 'local-baseline', FIXTURE_ID, 'screenshots');
const outputDir = OUT_DIR || screenshotsDir;
const canonicalSnippetPath = path.join(RUN_DIR, 'roll20-chat-capture-plan', 'snippets', `${FIXTURE_ID}-chat-dom-probe-snippet.js`);
const snippetPath = SNIPPET_RAW ? path.resolve(SNIPPET_RAW) : canonicalSnippetPath;
const chatPngPath = path.join(outputDir, 'roll20-chat.png');
const sidecarPath = path.join(outputDir, 'roll20-chat-dom-evidence.json');
const sheetFrameEvidencePath = path.resolve(readOption('--sheet-frame-evidence', path.join(screenshotsDir, 'roll20-sandbox-dom-evidence.json')));
const sheetFrameProbeCommand = `corepack pnpm run probe:roll20-sheet-frame -- --run-dir ${rel(RUN_DIR)} --fixture ${FIXTURE_ID}${OUT_DIR ? ` --out-dir ${rel(path.join(OUT_DIR, 'sheet-frame'))}` : ''}`;
const chatCaptureCommand = `corepack pnpm run capture:roll20-chat-cdp -- --run-dir ${rel(RUN_DIR)} --fixture ${FIXTURE_ID}${OUT_DIR ? ` --out-dir ${rel(OUT_DIR)}` : ''}${SNIPPET_RAW ? ` --snippet ${rel(snippetPath)}` : ''}${sheetFrameEvidencePath !== path.join(screenshotsDir, 'roll20-sandbox-dom-evidence.json') ? ` --sheet-frame-evidence ${rel(sheetFrameEvidencePath)}` : ''}`;

main().catch((error) => {
  const message = String(error?.message ?? error);
  if (message.startsWith('ROLL20 CHAT CDP CAPTURE BLOCKED_')) {
    console.error(message);
  } else {
    console.error(error?.stack || error);
  }
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(RUN_DIR)) throw new Error(`missing run dir: ${RUN_DIR}`);
  if (!existsSync(snippetPath)) {
    throw new Error(`missing chat probe snippet: ${snippetPath}\nRun: corepack pnpm run plan:roll20-chat-capture -- ${rel(RUN_DIR)} ${FIXTURE_ID} --require-current-metrics${OUT_DIR ? ` --out-dir ${rel(path.join(OUT_DIR, 'plan'))}` : ''}`);
  }
  await mkdir(outputDir, { recursive: true });

  if (PLAN_ONLY) {
    const buttons = await suggestedRollButtons();
    console.log('ROLL20 CHAT CDP CAPTURE PLAN_ONLY');
    console.log(`fixture=${FIXTURE_ID}`);
    console.log(`run=${rel(RUN_DIR)}`);
    console.log(`snippet=${rel(snippetPath)}`);
    if (SNIPPET_RAW) console.log(`canonicalSnippet=${rel(canonicalSnippetPath)}`);
    console.log(`chatPng=${rel(chatPngPath)}`);
    console.log(`sidecar=${rel(sidecarPath)}`);
    console.log(`sheetFrameEvidence=${rel(sheetFrameEvidencePath)}`);
    if (OUT_DIR) console.log(`canonicalScreenshotsDir=${rel(screenshotsDir)}`);
    console.log(`sheetFrameProbe=${sheetFrameProbeCommand}`);
    console.log(`cdp=${CDP_URL}`);
    console.log(`pageMatch=${PAGE_MATCH}`);
    console.log(`rollButtons=${buttons.length ? buttons.join(', ') : '(none in plan; pass --roll-button)'}`);
    console.log(`capture=${chatCaptureCommand}`);
    console.log('next=Open the dedicated Roll20 Custom Sheet Sandbox/test-room page in a CDP-enabled Chrome, load this fixture, run the sheet-frame probe until it writes VISIBLE_MATCH evidence, then rerun the capture command without --plan-only.');
    return;
  }

  const { chromium } = await import('playwright-core');
  const browser = await connectOverCdp(chromium);
  try {
    const page = await findRoll20Page(browser);
    if (!page) {
      const urls = browser.contexts().flatMap((context) => context.pages()).map((candidate) => candidate.url());
      throw new Error(`no Roll20 page matching "${PAGE_MATCH}" found via ${CDP_URL}\nOpen pages:\n${urls.map((url) => `- ${url}`).join('\n')}`);
    }
    const readiness = await getRoll20PageReadiness(page);

    if (DRY_RUN) {
      const summary = await pageSummary(page);
      console.log(`ROLL20 CHAT CDP CAPTURE ${readiness.ready ? 'DRY_RUN_READY' : 'DRY_RUN_NOT_READY'}`);
      console.log(`page=${summary.url}`);
      console.log(`readiness=${readiness.status}`);
      console.log(`title=${summary.title}`);
      console.log(`frames=${summary.frames.length}`);
      console.log(`rollButton=${ROLL_BUTTON || '(none)'}`);
      console.log(`expectedTemplateClass=${EXPECTED_TEMPLATE_CLASS || '(none)'}`);
      console.log(`keepDialogs=${KEEP_DIALOGS ? 'YES' : 'NO'}`);
      console.log(`snippet=${rel(snippetPath)}`);
      if (SNIPPET_RAW) console.log(`canonicalSnippet=${rel(canonicalSnippetPath)}`);
      console.log(`sheetFrameEvidence=${rel(sheetFrameEvidencePath)}`);
      console.log(`targets=${rel(chatPngPath)}, ${rel(sidecarPath)}`);
      if (!readiness.ready) console.log(`next=${readiness.nextAction}`);
      else if (summary.frames.length <= 1) console.log(`next=The Roll20 editor URL is open, but no character-sheet iframe is present. Open the intended character sheet and rerun: ${sheetFrameProbeCommand}`);
      else console.log(`next=Run or re-run the current-page sheet-frame probe first: ${sheetFrameProbeCommand}`);
      return;
    }
    assertCaptureReadyPage(readiness);
    const sheetFrameEvidence = await readSheetFrameEvidence();
    validateSheetFrameEvidence(sheetFrameEvidence);

    if (!SKIP_CLICK) {
      const clicked = await clickRollButton(page, ROLL_BUTTON);
      if (!clicked.ok) {
        throw new Error(`could not click Roll20 roll button${ROLL_BUTTON ? ` ${ROLL_BUTTON}` : ''}: ${clicked.reason}`);
      }
      await page.waitForTimeout(Math.max(0, WAIT_MS));
    }

    const overlayCleanup = KEEP_DIALOGS ? { status: 'disabled' } : await closeOverlappingCharacterDialogs(page);
    if (overlayCleanup.closedCount) await page.waitForTimeout(300);
    const snippet = await readFile(snippetPath, 'utf8');
    const { evidence, frameInfo } = await evaluateChatProbe(page, snippet);
    validateEvidence(evidence);

    const clip = normalizeClip(evidence.screenshotClipApplied ?? evidence.clip ?? evidence.chatRect);
    const pageClip = applyFrameOffset(clip, frameInfo);
    const cdp = await page.context().newCDPSession(page);
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      clip: { x: pageClip.x, y: pageClip.y, width: pageClip.width, height: pageClip.height, scale: 1 },
    });
    const png = Buffer.from(shot.data, 'base64');
    const pixelStats = await analyzeScreenshotPixels(page, png);
    assertCapturedTemplateForeground(evidence, pixelStats);
    const enriched = {
      ...evidence,
      captureAutomation: {
        tool: 'scripts/roll20_chat_cdp_capture.mjs',
        capturedAt: new Date().toISOString(),
        cdpUrl: CDP_URL.replace(/\/\/.*@/, '//[redacted]@'),
        pageMatch: PAGE_MATCH,
        rollButton: SKIP_CLICK ? null : ROLL_BUTTON || '(auto)',
        expectedTemplateClass: EXPECTED_TEMPLATE_CLASS || null,
        overlayCleanup,
        screenshotPath: rel(chatPngPath),
        sidecarPath: rel(sidecarPath),
        screenshotBytes: png.length,
        screenshotClipApplied: pageClip,
        screenshotCssClip: clip,
        captureFrame: frameInfo,
        sheetFrameEvidence: summarizeSheetFrameEvidence(sheetFrameEvidence),
        screenshotPixelStats: pixelStats,
      },
      screenshotClipApplied: pageClip,
      screenshotCssClip: clip,
      captureFrame: frameInfo,
      screenshotPixelStats: pixelStats,
    };

    await writeFile(chatPngPath, png);
    await writeFile(sidecarPath, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');

    console.log('ROLL20 CHAT CDP CAPTURE PASS');
    console.log(`fixture=${FIXTURE_ID}`);
    console.log(`page=${page.url()}`);
    console.log(`rolltemplateCount=${evidence.rolltemplateCount ?? evidence.rolltemplates?.length ?? 0}`);
    console.log(`chatPng=${rel(chatPngPath)}`);
    console.log(`sidecar=${rel(sidecarPath)}`);
  } finally {
    await browser.close();
  }
}

async function closeOverlappingCharacterDialogs(page) {
  return page.evaluate(() => {
    const rectOf = (el) => {
      const rect = el?.getBoundingClientRect?.();
      if (!rect) return null;
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    };
    const intersects = (a, b) => Boolean(a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y);
    const chatRoot = document.querySelector('#textchat, .textchatcontainer, #rightsidebar');
    const chatRect = rectOf(chatRoot) || { x: window.innerWidth * 0.55, y: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth * 0.45, height: window.innerHeight };
    const dialogs = Array.from(document.querySelectorAll('.ui-dialog,.characterdialog,.characterviewer,.charactereditor'))
      .filter((dialog) => {
        const rect = rectOf(dialog);
        if (!rect || rect.width <= 0 || rect.height <= 0 || !intersects(rect, chatRect)) return false;
        const hasSheetFrame = Boolean(dialog.querySelector('iframe[title*="Character sheet" i], iframe[src*="/editor/character/"]'));
        const looksLikeCharacter = hasSheetFrame || /character|charsheet|characterviewer|charactereditor/i.test(String(dialog.className || ''));
        return looksLikeCharacter;
      });
    const closed = [];
    for (const dialog of dialogs) {
      const summary = {
        className: String(dialog.className || '').slice(0, 160),
        rect: rectOf(dialog),
        method: '',
      };
      const closeButton = dialog.querySelector('.ui-dialog-titlebar-close,[aria-label="Close"],.close');
      if (closeButton instanceof HTMLElement) {
        closeButton.click();
        summary.method = 'close-button';
      } else if (globalThis.jQuery && typeof globalThis.jQuery(dialog).dialog === 'function') {
        globalThis.jQuery(dialog).dialog('close');
        summary.method = 'jquery-dialog-close';
      } else {
        dialog.style.display = 'none';
        summary.method = 'hide-fallback';
      }
      closed.push(summary);
    }
    return {
      status: closed.length ? 'closed-overlapping-character-dialogs' : 'none',
      closedCount: closed.length,
      chatRect,
      closed,
    };
  });
}

async function evaluateChatProbe(page, snippet) {
  const frames = [page.mainFrame(), ...page.frames().filter((frame) => frame !== page.mainFrame())];
  const failures = [];
  for (const frame of frames) {
    try {
      const evidence = await frame.evaluate(snippet);
      if (!evidence?.textMarkers?.rolltemplate) {
        failures.push(`${shortFrameName(frame)}: no rolltemplate marker`);
        continue;
      }
      const frameInfo = await readFrameInfo(page, frame);
      return { evidence, frameInfo };
    } catch (error) {
      failures.push(`${shortFrameName(frame)}: ${String(error?.message ?? error).split('\n')[0]}`);
    }
  }
  throw new Error(`chat probe did not find usable Roll20 rolltemplate evidence in any frame:\n${failures.map((line) => `- ${line}`).join('\n')}`);
}

async function readFrameInfo(page, frame) {
  const isMainFrame = frame === page.mainFrame();
  if (isMainFrame) {
    return {
      isMainFrame: true,
      url: redactUrl(frame.url()),
      name: frame.name() || '',
      frameElementBox: null,
      offset: { x: 0, y: 0 },
    };
  }
  const handle = await frame.frameElement();
  const box = await handle.boundingBox();
  await handle.dispose();
  const offset = {
    x: Number(box?.x ?? 0),
    y: Number(box?.y ?? 0),
  };
  return {
    isMainFrame: false,
    url: redactUrl(frame.url()),
    name: frame.name() || '',
    frameElementBox: box
      ? {
          x: finiteNumber(box.x),
          y: finiteNumber(box.y),
          width: finiteNumber(box.width),
          height: finiteNumber(box.height),
        }
      : null,
    offset,
  };
}

function applyFrameOffset(clip, frameInfo) {
  const offset = frameInfo?.offset ?? { x: 0, y: 0 };
  return {
    x: Number((clip.x + Number(offset.x ?? 0)).toFixed(3)),
    y: Number((clip.y + Number(offset.y ?? 0)).toFixed(3)),
    width: clip.width,
    height: clip.height,
  };
}

async function analyzeScreenshotPixels(page, png) {
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  return page.evaluate(async (url) => {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('could not decode captured chat PNG for foreground sanity check'));
    });
    image.src = url;
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('canvas 2d context unavailable for captured chat PNG sanity check');
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let dark = 0;
    let edge = 0;
    let nonWhite = 0;
    const total = canvas.width * canvas.height;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (luma < 80) dark += 1;
      if (luma < 245) nonWhite += 1;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      if (max - min > 40 || luma < 160) edge += 1;
    }
    return {
      width: canvas.width,
      height: canvas.height,
      total,
      darkRatio: total ? dark / total : 0,
      edgeRatio: total ? edge / total : 0,
      nonWhiteRatio: total ? nonWhite / total : 0,
    };
  }, dataUrl);
}

function assertCapturedTemplateForeground(evidence, stats) {
  const text = String(evidence?.latestTemplate?.text ?? evidence?.selectedTemplate?.text ?? '').trim();
  if (!text) return;
  const darkRatio = Number(stats?.darkRatio ?? 0);
  const edgeRatio = Number(stats?.edgeRatio ?? 0);
  const nonWhiteRatio = Number(stats?.nonWhiteRatio ?? 0);
  if (darkRatio >= 0.002 || edgeRatio >= 0.005) return;
  throw new Error([
    'ROLL20 CHAT CDP CAPTURE BLOCKED_FOREGROUND_PIXEL_SUSPECT',
    `Captured PNG has expected rolltemplate DOM text but almost no foreground pixels (dark=${pct(darkRatio)}, edge=${pct(edgeRatio)}, nonWhite=${pct(nonWhiteRatio)}).`,
    'This usually means the screenshot clip hit VTT grid, Sandbox Tools, toast UI, or another wrong surface instead of the visible rolltemplate.',
    'Do not overwrite roll20-chat.png from this capture. Recheck frame/target coordinate mapping or use a verified full-page crop path.',
  ].join('\n'));
}

function selfTestForegroundGuard() {
  const failures = [];
  const evidence = { latestTemplate: { text: 'Roll Result: 12' } };
  try {
    assertCapturedTemplateForeground(evidence, { darkRatio: 0.0001, edgeRatio: 0.0002, nonWhiteRatio: 0.03 });
    failures.push('foreground guard did not reject an empty-looking rolltemplate crop');
  } catch (error) {
    if (!String(error?.message ?? error).includes('BLOCKED_FOREGROUND_PIXEL_SUSPECT')) {
      failures.push('foreground guard rejected with an unexpected error');
    }
  }
  try {
    assertCapturedTemplateForeground(evidence, { darkRatio: 0.01, edgeRatio: 0.02, nonWhiteRatio: 0.25 });
  } catch {
    failures.push('foreground guard rejected a foreground-rich rolltemplate crop');
  }
  try {
    assertCapturedTemplateForeground({ latestTemplate: { text: '' } }, { darkRatio: 0, edgeRatio: 0, nonWhiteRatio: 0 });
  } catch {
    failures.push('foreground guard rejected an evidence object without expected template text');
  }
  return failures;
}

async function connectOverCdp(chromium) {
  try {
    return await chromium.connectOverCDP(CDP_URL);
  } catch (error) {
    const message = String(error?.message ?? error);
    const endpointClosed = /ECONNREFUSED|ERR_CONNECTION_REFUSED|connect.*127\.0\.0\.1|connect.*localhost/i.test(message);
    const hint = endpointClosed
      ? [
          `CDP endpoint is not listening at ${CDP_URL}.`,
          'Open Chrome/Edge with remote debugging enabled, keep the dedicated Roll20 Sandbox/test-room tab visible, or pass --cdp with the active endpoint.',
          `Use --plan-only to print the required fixture/snippet/output paths without connecting.`,
        ].join('\n')
      : [
          `Could not connect to CDP endpoint ${CDP_URL}.`,
          'Confirm the browser was launched with remote debugging and that the Roll20 tab belongs to that browser instance.',
        ].join('\n');
    const wrapped = new Error(`ROLL20 CHAT CDP CAPTURE BLOCKED_CDP_ENDPOINT\n${hint}\nOriginal: ${message}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

async function findRoll20Page(browser) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const roll20Pages = pages.filter((page) => isRoll20PageUrl(page.url()));
  return roll20Pages.find((page) => isRoll20EditorTopPage(page.url()))
    ?? roll20Pages.find((page) => page.url().includes(PAGE_MATCH) && !/\/editor\/character\//.test(page.url()))
    ?? roll20Pages[0]
    ?? null;
}

function isRoll20EditorTopPage(url) {
  try {
    return new URL(url).pathname === '/editor';
  } catch {
    return false;
  }
}

async function getRoll20PageReadiness(page) {
  const url = page.url();
  const title = await page.title().catch(() => '');
  const status = classifyRoll20Target({ url, title });
  return {
    ready: isRoll20CaptureReady(status),
    status,
    url,
    title,
    nextAction: nextActionForReadiness(status, { pageMatch: PAGE_MATCH, captureVerb: 'capture' }),
  };
}

function assertCaptureReadyPage(readiness) {
  if (readiness.ready) return;
  throw new Error([
    'ROLL20 CHAT CDP CAPTURE BLOCKED_PAGE_NOT_READY',
    `status=${readiness.status}`,
    `page=${readiness.url}`,
    `title=${readiness.title}`,
    `next=${readiness.nextAction}`,
  ].join('\n'));
}

function runReadinessSelfTest() {
  const failures = [
    ...selfTestRoll20Readiness(),
    ...selfTestForegroundGuard(),
    ...selfTestSheetFrameEvidenceGuard(),
  ];
  if (failures.length) {
    console.error(`ROLL20 CHAT CDP CAPTURE READINESS_SELF_TEST FAIL ${JSON.stringify(failures, null, 2)}`);
    process.exit(1);
  }
  console.log('ROLL20 CHAT CDP CAPTURE READINESS_SELF_TEST PASS');
}

async function readSheetFrameEvidence() {
  try {
    return JSON.parse(await readFile(sheetFrameEvidencePath, 'utf8'));
  } catch (error) {
    const message = String(error?.message ?? error);
    const missing = /ENOENT|no such file/i.test(message);
    throw new Error([
      'ROLL20 CHAT CDP CAPTURE BLOCKED_SHEET_FRAME_EVIDENCE',
      missing
        ? `Missing sheet-frame DOM evidence: ${rel(sheetFrameEvidencePath)}`
        : `Could not read sheet-frame DOM evidence: ${rel(sheetFrameEvidencePath)} (${message})`,
      `Run: ${sheetFrameProbeCommand}`,
      'Then open the same loaded Roll20 character sheet and rerun this chat capture.',
    ].join('\n'));
  }
}

function validateSheetFrameEvidence(evidence) {
  const result = classifySheetFrameEvidence(evidence, FIXTURE_ID);
  if (result.ok && ROLL_BUTTON) {
    const rollButtonNames = evidence.hits?.rollButtonNames ?? [];
    if (!rollButtonNames.includes(ROLL_BUTTON)) {
      throw new Error([
        'ROLL20 CHAT CDP CAPTURE BLOCKED_SHEET_FRAME_EVIDENCE',
        `sheet-frame evidence does not contain requested roll button ${ROLL_BUTTON}; found ${rollButtonNames.join(', ') || 'none'}`,
        'The currently open character sheet may be a different fixture or default state than the planned capture.',
        `Evidence file: ${rel(sheetFrameEvidencePath)}`,
        `Run: ${sheetFrameProbeCommand}`,
      ].join('\n'));
    }
  }
  if (result.ok) return;
  throw new Error([
    'ROLL20 CHAT CDP CAPTURE BLOCKED_SHEET_FRAME_EVIDENCE',
    result.note,
    `Evidence file: ${rel(sheetFrameEvidencePath)}`,
    `Run: ${sheetFrameProbeCommand}`,
  ].join('\n'));
}

function classifySheetFrameEvidence(evidence, expectedFixture = FIXTURE_ID) {
  if (!evidence || typeof evidence !== 'object') return { ok: false, note: 'sheet-frame evidence is empty or malformed' };
  if (expectedFixture && evidence.fixtureId && evidence.fixtureId !== expectedFixture) {
    return { ok: false, note: `sheet-frame evidence fixture mismatch: expected ${expectedFixture}, got ${evidence.fixtureId}` };
  }
  if (evidence.status && evidence.status !== 'VISIBLE_MATCH') {
    return { ok: false, note: `sheet-frame evidence status is ${evidence.status}, not VISIBLE_MATCH` };
  }
  const sheetHitCount = Number(evidence.sheetHitCount ?? 0);
  const expectedMarkers = evidence.textMarkers
    ? Boolean(evidence.textMarkers.expectedSheetText || evidence.textMarkers.expectedAttr || evidence.textMarkers.expectedRollButton)
    : false;
  const expectedHits = (evidence.hits?.rollButtonNames?.length || 0)
    + (evidence.hits?.attrNames?.length || 0)
    + (evidence.hits?.textTokens?.length || 0);
  const strongHits = (evidence.hits?.rollButtonNames?.length || 0) > 0
    || (evidence.hits?.textTokens?.length || 0) > 0
    || (evidence.hits?.attrNames?.length || 0) >= 5
    || evidence.activationMatch?.ok === true;
  if (!strongHits && (sheetHitCount <= 0 && expectedHits <= 0 && !expectedMarkers)) {
    return {
      ok: false,
      note: 'sheet-frame evidence does not contain expected fixture markers; generic root/body evidence is not enough before chat capture',
    };
  }
  if (!strongHits) {
    return {
      ok: false,
      note: `sheet-frame evidence is too weak for fixture proof: rollButtons=${evidence.hits?.rollButtonNames?.length || 0}, attrs=${evidence.hits?.attrNames?.length || 0}, text=${evidence.hits?.textTokens?.length || 0}`,
    };
  }
  return {
    ok: true,
    note: `sheet-frame evidence matches ${FIXTURE_ID} with ${Math.max(sheetHitCount, expectedHits)} expected marker hits`,
  };
}

function summarizeSheetFrameEvidence(evidence) {
  return {
    file: rel(sheetFrameEvidencePath),
    fixtureId: evidence?.fixtureId ?? null,
    status: evidence?.status ?? null,
    generatedAt: evidence?.generatedAt ?? null,
    frame: evidence?.frame ?? null,
    sheetHitCount: evidence?.sheetHitCount ?? null,
    rootCount: evidence?.rootCount ?? evidence?.roots ?? null,
    attrCount: evidence?.counts?.attrCount ?? null,
    rollButtonCount: evidence?.counts?.rollButtonCount ?? null,
  };
}

function selfTestSheetFrameEvidenceGuard() {
  const failures = [];
  const valid = classifySheetFrameEvidence({
    fixtureId: FIXTURE_ID || 'fixture',
    status: 'VISIBLE_MATCH',
    sheetHitCount: 2,
    hits: { rollButtonNames: ['roll_a'], attrNames: ['attr_a'], textTokens: [] },
  }, FIXTURE_ID || 'fixture');
  if (!valid.ok) failures.push(`valid sheet-frame evidence rejected: ${valid.note}`);
  const generic = classifySheetFrameEvidence({
    fixtureId: FIXTURE_ID || 'fixture',
    status: 'VISIBLE_MATCH',
    rootCount: 4,
    bodyLen: 1000,
    hits: { rollButtonNames: [], attrNames: [], textTokens: [] },
  }, FIXTURE_ID || 'fixture');
  if (generic.ok) failures.push('generic root/body evidence was accepted as sheet-frame proof');
  const wrongFixture = classifySheetFrameEvidence({
    fixtureId: 'other-fixture',
    status: 'VISIBLE_MATCH',
    sheetHitCount: 2,
  }, FIXTURE_ID || 'fixture');
  if (wrongFixture.ok) failures.push('wrong fixture sheet-frame evidence was accepted');
  return failures;
}

async function clickRollButton(page, requestedName) {
  const names = requestedName ? [requestedName] : await suggestedRollButtons();
  if (!names.length) return { ok: false, reason: 'no --roll-button provided and no suggested roll buttons found in capture plan' };
  const selectors = names.flatMap((name) => [
    `button[name="${cssEscape(name)}"]`,
    `input[type="button"][name="${cssEscape(name)}"]`,
    `[name="${cssEscape(name)}"]`,
  ]);
  const attempts = [];
  for (const frame of page.frames()) {
    for (const selector of selectors) {
      try {
        const locators = frame.locator(selector);
        const count = await locators.count();
        attempts.push(`${shortFrameName(frame)} ${selector} count=${count}`);
        for (let index = 0; index < count; index += 1) {
          const locator = locators.nth(index);
          const box = await locator.boundingBox().catch(() => null);
          if (!box || box.width <= 0 || box.height <= 0) continue;
          await locator.click({ timeout: 3000, force: true });
          return { ok: true, frameUrl: frame.url(), selector, index, method: 'locator-visible' };
        }
      } catch (error) {
        attempts.push(`${shortFrameName(frame)} ${selector} locator-error=${String(error?.message ?? error).split('\n')[0]}`);
      }
    }
    for (const name of names) {
      try {
        const clicked = await frame.evaluate((rollName) => {
          const candidates = Array.from(document.querySelectorAll(`[name="${CSS.escape(rollName)}"]`));
          const visible = candidates.find((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
          }) || candidates[0] || null;
          if (!visible) return { ok: false, reason: 'not-found', count: candidates.length };
          visible.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          visible.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
          visible.click();
          return { ok: true, count: candidates.length, className: String(visible.className || '') };
        }, name);
        attempts.push(`${shortFrameName(frame)} dom-click ${name} ok=${clicked.ok} count=${clicked.count ?? 0}`);
        if (clicked.ok) return { ok: true, frameUrl: frame.url(), selector: `[name="${cssEscape(name)}"]`, method: 'dom-visible-click', detail: clicked };
      } catch (error) {
        attempts.push(`${shortFrameName(frame)} dom-click-error=${String(error?.message ?? error).split('\n')[0]}`);
      }
    }
  }
  return { ok: false, reason: `tried ${selectors.length} selectors across ${page.frames().length} frames; attempts=${attempts.slice(0, 18).join(' | ')}` };
}

async function suggestedRollButtons() {
  const planPath = path.join(RUN_DIR, 'roll20-chat-capture-plan', 'roll20-chat-capture-plan-results.json');
  try {
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    const entry = (plan.entries ?? []).find((candidate) => candidate.fixtureId === FIXTURE_ID);
    return Array.isArray(entry?.rollButtons) ? entry.rollButtons.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') throw new Error('chat probe returned no evidence object');
  if (!evidence.textMarkers?.rolltemplate) throw new Error('chat probe did not find a rolltemplate marker');
  if (EXPECTED_TEMPLATE_CLASS) {
    const selectedClasses = String(evidence.latestTemplate?.className || evidence.selectedTemplate?.className || '').split(/\s+/);
    if (!selectedClasses.includes(EXPECTED_TEMPLATE_CLASS)) {
      throw new Error(`chat probe selected ${selectedClasses.join(' ') || '(none)'}, expected ${EXPECTED_TEMPLATE_CLASS}; regenerate the capture plan or clear old chat messages and recapture the target rolltemplate`);
    }
  }
  if (!evidence.templateForegroundEvidence) {
    throw new Error('chat evidence missing templateForegroundEvidence; regenerate the capture plan and retry');
  }
  if (evidence.templateForegroundEvidence.status !== 'FOREGROUND_TEMPLATE_HIT') {
    const note = evidence.templateForegroundEvidence.note || 'selected rolltemplate is not proven foreground';
    throw new Error(`chat evidence foreground check failed: ${evidence.templateForegroundEvidence.status || 'UNKNOWN'}; ${note}`);
  }
  if (!evidence.latestTemplate?.computedStyle || !Object.prototype.hasOwnProperty.call(evidence.latestTemplate.computedStyle, 'filter')) {
    throw new Error('chat evidence missing latestTemplate.computedStyle.filter; regenerate the capture plan and retry');
  }
  const tableEvidence = evidence.latestTemplate?.computedChildren?.find((child) => child?.selector === 'table')
    ?? evidence.latestTemplate?.tableStructure?.table
    ?? null;
  if (!Object.prototype.hasOwnProperty.call(tableEvidence?.computedStyle ?? {}, 'filter')) {
    throw new Error('chat evidence missing table computedStyle.filter; regenerate the capture plan and retry');
  }
}

function normalizeClip(raw) {
  if (!raw) throw new Error('chat evidence missing screenshot clip');
  const x = Number(raw.x ?? raw.left ?? 0);
  const y = Number(raw.y ?? raw.top ?? 0);
  const width = Number(raw.width ?? 0);
  const height = Number(raw.height ?? 0);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error(`invalid screenshot clip: ${JSON.stringify(raw)}`);
  }
  return { x, y, width, height };
}

async function pageSummary(page) {
  return {
    url: page.url(),
    title: await page.title().catch(() => ''),
    frames: page.frames().map((frame) => ({ url: frame.url(), name: frame.name() })),
  };
}

function readOption(name, fallback) {
  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1] ?? fallback;
  const prefix = `${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function cssEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function shortFrameName(frame) {
  const name = frame.name() || '(unnamed)';
  const url = redactUrl(frame.url());
  return `${name} ${url}`.trim();
}

function redactUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(url || '').slice(0, 160);
  }
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(3)) : null;
}

function pct(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(2)}%` : 'n/a';
}

function rel(filePath) {
  return path.relative(process.cwd(), path.resolve(filePath)) || '.';
}

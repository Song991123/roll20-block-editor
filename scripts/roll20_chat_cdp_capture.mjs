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
  nextActionForReadiness,
  selfTestRoll20Readiness,
} from './lib/roll20Readiness.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(readOption('--run-dir', args[0] ?? ''));
const FIXTURE_ID = readOption('--fixture', '');
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', 'app.roll20.net');
const ROLL_BUTTON = readOption('--roll-button', '');
const SKIP_CLICK = hasFlag('--skip-click');
const WAIT_MS = Number(readOption('--wait-ms', '1500'));
const DRY_RUN = hasFlag('--dry-run');
const PLAN_ONLY = hasFlag('--plan-only') || hasFlag('--print-plan');
const SELF_TEST_READINESS = hasFlag('--self-test-readiness');

if (SELF_TEST_READINESS) {
  runReadinessSelfTest();
  process.exit(0);
}

if (!RUN_DIR || !FIXTURE_ID) {
  console.error('Usage: node scripts/roll20_chat_cdp_capture.mjs --run-dir reports/roll20-actual-compare/<label> --fixture <fixture-id> [--cdp http://127.0.0.1:9222] [--roll-button roll_name] [--skip-click] [--dry-run] [--plan-only] [--self-test-readiness]');
  process.exit(2);
}

const screenshotsDir = path.join(RUN_DIR, 'local-baseline', FIXTURE_ID, 'screenshots');
const snippetPath = path.join(RUN_DIR, 'roll20-chat-capture-plan', 'snippets', `${FIXTURE_ID}-chat-dom-probe-snippet.js`);
const chatPngPath = path.join(screenshotsDir, 'roll20-chat.png');
const sidecarPath = path.join(screenshotsDir, 'roll20-chat-dom-evidence.json');

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
    throw new Error(`missing chat probe snippet: ${snippetPath}\nRun: corepack pnpm run plan:roll20-chat-capture -- ${rel(RUN_DIR)} ${FIXTURE_ID} --require-current-metrics`);
  }
  await mkdir(screenshotsDir, { recursive: true });

  if (PLAN_ONLY) {
    const buttons = await suggestedRollButtons();
    console.log('ROLL20 CHAT CDP CAPTURE PLAN_ONLY');
    console.log(`fixture=${FIXTURE_ID}`);
    console.log(`run=${rel(RUN_DIR)}`);
    console.log(`snippet=${rel(snippetPath)}`);
    console.log(`chatPng=${rel(chatPngPath)}`);
    console.log(`sidecar=${rel(sidecarPath)}`);
    console.log(`cdp=${CDP_URL}`);
    console.log(`pageMatch=${PAGE_MATCH}`);
    console.log(`rollButtons=${buttons.length ? buttons.join(', ') : '(none in plan; pass --roll-button)'}`);
    console.log('next=Open the dedicated Roll20 Custom Sheet Sandbox/test-room page in a CDP-enabled Chrome, load this fixture, then rerun without --plan-only.');
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
      console.log(`snippet=${rel(snippetPath)}`);
      console.log(`targets=${rel(chatPngPath)}, ${rel(sidecarPath)}`);
      if (!readiness.ready) console.log(`next=${readiness.nextAction}`);
      return;
    }
    assertCaptureReadyPage(readiness);

    if (!SKIP_CLICK) {
      const clicked = await clickRollButton(page, ROLL_BUTTON);
      if (!clicked.ok) {
        throw new Error(`could not click Roll20 roll button${ROLL_BUTTON ? ` ${ROLL_BUTTON}` : ''}: ${clicked.reason}`);
      }
      await page.waitForTimeout(Math.max(0, WAIT_MS));
    }

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
        screenshotPath: rel(chatPngPath),
        sidecarPath: rel(sidecarPath),
        screenshotBytes: png.length,
        screenshotClipApplied: pageClip,
        screenshotCssClip: clip,
        captureFrame: frameInfo,
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
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (page.url().includes(PAGE_MATCH)) return page;
    }
  }
  return null;
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
  ];
  if (failures.length) {
    console.error(`ROLL20 CHAT CDP CAPTURE READINESS_SELF_TEST FAIL ${JSON.stringify(failures, null, 2)}`);
    process.exit(1);
  }
  console.log('ROLL20 CHAT CDP CAPTURE READINESS_SELF_TEST PASS');
}

async function clickRollButton(page, requestedName) {
  const names = requestedName ? [requestedName] : await suggestedRollButtons();
  if (!names.length) return { ok: false, reason: 'no --roll-button provided and no suggested roll buttons found in capture plan' };
  const selectors = names.flatMap((name) => [
    `button[name="${cssEscape(name)}"]`,
    `input[type="button"][name="${cssEscape(name)}"]`,
    `[name="${cssEscape(name)}"]`,
  ]);
  for (const frame of page.frames()) {
    for (const selector of selectors) {
      const locator = frame.locator(selector).first();
      try {
        if (await locator.count()) {
          await locator.click({ timeout: 3000, force: true });
          return { ok: true, frameUrl: frame.url(), selector };
        }
      } catch {
        // Try the next selector/frame. Roll20 iframes can be transient.
      }
    }
  }
  return { ok: false, reason: `tried ${selectors.length} selectors across ${page.frames().length} frames` };
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
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
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

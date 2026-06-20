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

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(readOption('--run-dir', args[0] ?? ''));
const FIXTURE_ID = readOption('--fixture', '');
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', 'app.roll20.net');
const ROLL_BUTTON = readOption('--roll-button', '');
const SKIP_CLICK = hasFlag('--skip-click');
const WAIT_MS = Number(readOption('--wait-ms', '1500'));
const DRY_RUN = hasFlag('--dry-run');

if (!RUN_DIR || !FIXTURE_ID) {
  console.error('Usage: node scripts/roll20_chat_cdp_capture.mjs --run-dir reports/roll20-actual-compare/<label> --fixture <fixture-id> [--cdp http://127.0.0.1:9222] [--roll-button roll_name] [--skip-click] [--dry-run]');
  process.exit(2);
}

const screenshotsDir = path.join(RUN_DIR, 'local-baseline', FIXTURE_ID, 'screenshots');
const snippetPath = path.join(RUN_DIR, 'roll20-chat-capture-plan', 'snippets', `${FIXTURE_ID}-chat-dom-probe-snippet.js`);
const chatPngPath = path.join(screenshotsDir, 'roll20-chat.png');
const sidecarPath = path.join(screenshotsDir, 'roll20-chat-dom-evidence.json');

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(RUN_DIR)) throw new Error(`missing run dir: ${RUN_DIR}`);
  if (!existsSync(snippetPath)) {
    throw new Error(`missing chat probe snippet: ${snippetPath}\nRun: corepack pnpm run plan:roll20-chat-capture -- ${rel(RUN_DIR)} ${FIXTURE_ID} --require-current-metrics`);
  }
  await mkdir(screenshotsDir, { recursive: true });

  const { chromium } = await import('playwright-core');
  const browser = await chromium.connectOverCDP(CDP_URL);
  try {
    const page = await findRoll20Page(browser);
    if (!page) {
      const urls = browser.contexts().flatMap((context) => context.pages()).map((candidate) => candidate.url());
      throw new Error(`no Roll20 page matching "${PAGE_MATCH}" found via ${CDP_URL}\nOpen pages:\n${urls.map((url) => `- ${url}`).join('\n')}`);
    }

    if (DRY_RUN) {
      const summary = await pageSummary(page);
      console.log(`ROLL20 CHAT CDP CAPTURE DRY_RUN`);
      console.log(`page=${summary.url}`);
      console.log(`frames=${summary.frames.length}`);
      console.log(`rollButton=${ROLL_BUTTON || '(none)'}`);
      console.log(`snippet=${rel(snippetPath)}`);
      console.log(`targets=${rel(chatPngPath)}, ${rel(sidecarPath)}`);
      return;
    }

    if (!SKIP_CLICK) {
      const clicked = await clickRollButton(page, ROLL_BUTTON);
      if (!clicked.ok) {
        throw new Error(`could not click Roll20 roll button${ROLL_BUTTON ? ` ${ROLL_BUTTON}` : ''}: ${clicked.reason}`);
      }
      await page.waitForTimeout(Math.max(0, WAIT_MS));
    }

    const snippet = await readFile(snippetPath, 'utf8');
    const evidence = await page.evaluate(snippet);
    validateEvidence(evidence);

    const clip = normalizeClip(evidence.screenshotClipApplied ?? evidence.clip ?? evidence.chatRect);
    const cdp = await page.context().newCDPSession(page);
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: 1 },
    });
    const png = Buffer.from(shot.data, 'base64');
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
        screenshotClipApplied: clip,
      },
      screenshotClipApplied: clip,
      screenshotCssClip: clip,
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

async function findRoll20Page(browser) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (page.url().includes(PAGE_MATCH)) return page;
    }
  }
  return null;
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

function rel(filePath) {
  return path.relative(process.cwd(), path.resolve(filePath)) || '.';
}

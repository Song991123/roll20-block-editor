#!/usr/bin/env node
/**
 * Execute a generated Roll20 upload snippet through an already-open CDP browser.
 *
 * This is local-only verification tooling. Use it only against the dedicated
 * Custom Sheet Sandbox or an approved test room. It does not create rooms and
 * it refuses to run without an explicit sandbox/test campaign id.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  classifyRoll20Target,
  isRoll20PageUrl,
  nextActionForReadiness,
  selfTestRoll20Readiness,
} from './lib/roll20Readiness.mjs';
import { parseParticipantCounts } from './lib/roll20ParticipantPreflight.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(readOption('--run-dir', args[0] ?? ''));
const FIXTURE_ID = readOption('--fixture', args[1] ?? '');
const ENDPOINT_CAMPAIGN_ID = readOption('--endpoint-campaign-id', '');
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const SETTINGS_URL = readOption(
  '--settings-url',
  ENDPOINT_CAMPAIGN_ID ? `https://app.roll20.net/sheetsandbox/settings/${ENDPOINT_CAMPAIGN_ID}` : '',
);
const OUT_DIR_RAW = readOption('--out-dir', '');
const OUT_DIR = OUT_DIR_RAW ? path.resolve(OUT_DIR_RAW) : '';
const STAY_ON_CURRENT_PAGE = hasFlag('--stay-on-current-page');
const REQUIRE_SOLO_ROOM = hasFlag('--require-solo-room');
const DRY_RUN = hasFlag('--dry-run');
const SELF_TEST = hasFlag('--self-test');

if (SELF_TEST) {
  runSelfTest();
  process.exit(0);
}

if (!RUN_DIR || !FIXTURE_ID || !ENDPOINT_CAMPAIGN_ID) {
  console.error('Usage: node scripts/roll20_upload_cdp_apply.mjs --run-dir reports/roll20-actual-compare/<label> --fixture <fixture-id> --endpoint-campaign-id <sandboxCampaignId> [--out-dir <ignored-temp-dir>] [--cdp http://127.0.0.1:9222] [--settings-url <url>] [--stay-on-current-page] [--dry-run]');
  process.exit(2);
}

main().catch((error) => {
  const message = String(error?.message ?? error);
  if (message.startsWith('ROLL20 UPLOAD CDP ')) {
    console.error(message);
  } else {
    console.error(error?.stack || error);
  }
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(RUN_DIR)) throw new Error(`missing run dir: ${RUN_DIR}`);
  const snippetPath = path.join(
    RUN_DIR,
    'roll20-upload-handoff',
    'snippets',
    `${FIXTURE_ID}-upload-snippet.js`,
  );
  if (!existsSync(snippetPath)) {
    throw new Error([
      'ROLL20 UPLOAD CDP BLOCKED_MISSING_SNIPPET',
      `snippet=${rel(snippetPath)}`,
      `next=Run: corepack pnpm run snippet:roll20-upload -- ${rel(RUN_DIR)} ${FIXTURE_ID} --apply-settings --endpoint-campaign-id ${ENDPOINT_CAMPAIGN_ID}`,
    ].join('\n'));
  }

  const { chromium } = await import('playwright-core');
  const browser = await connectOverCdp(chromium);
  try {
    const page = await findRoll20Page(browser, REQUIRE_SOLO_ROOM);
    if (!page) {
      const urls = browser.contexts().flatMap((context) => context.pages()).map((candidate) => candidate.url());
      throw new Error(`ROLL20 UPLOAD CDP BLOCKED_NO_PAGE\nNo Roll20 page found via ${CDP_URL}.\nOpen pages:\n${urls.map((url) => `- ${redactUrl(url)}`).join('\n')}`);
    }

    let participantPreflight = null;
    let participantPreflightAfterNavigation = null;
    let participantPreflightBeforeApply = null;
    const participantRoomUrl = REQUIRE_SOLO_ROOM ? page.url() : '';
    if (REQUIRE_SOLO_ROOM) {
      participantPreflight = await requireSoloParticipant(page, 'before-navigation');
    }

    if (!STAY_ON_CURRENT_PAGE && SETTINGS_URL) {
      await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    }

    if (REQUIRE_SOLO_ROOM) {
      participantPreflightAfterNavigation = await recheckSoloRoom(
        page,
        participantRoomUrl,
        SETTINGS_URL,
        'after-navigation',
      );
    }

    const readiness = await getPageSummary(page);
    const pageCampaignId = campaignIdFromUrl(readiness.url);
    if (pageCampaignId && pageCampaignId !== ENDPOINT_CAMPAIGN_ID) {
      throw new Error([
        'ROLL20 UPLOAD CDP BLOCKED_CAMPAIGN_MISMATCH',
        `expected=${ENDPOINT_CAMPAIGN_ID}`,
        `pageCampaignId=${pageCampaignId}`,
        `page=${readiness.url}`,
      ].join('\n'));
    }

    const canRun = readiness.host === 'app.roll20.net'
      && (readiness.hasSandboxInputs || readiness.hasManifestField);
    if (!canRun) {
      throw new Error([
        'ROLL20 UPLOAD CDP BLOCKED_NOT_SANDBOX_UPLOAD_PAGE',
        `page=${readiness.url}`,
        `title=${readiness.title}`,
        `hasSandboxInputs=${readiness.hasSandboxInputs}`,
        `hasManifestField=${readiness.hasManifestField}`,
        `next=${nextActionForReadiness(classifyRoll20Target({ url: page.url(), title: readiness.title }), { captureVerb: 'roll20-upload-cdp' })}`,
      ].join('\n'));
    }

    const outDir = OUT_DIR || path.join(RUN_DIR, 'roll20-upload-handoff', 'cdp-apply');
    await mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${FIXTURE_ID}-cdp-apply-result.json`);

    if (DRY_RUN) {
      const report = {
        generatedAt: new Date().toISOString(),
        fixtureId: FIXTURE_ID,
        mode: 'dry-run',
        page: readiness,
        participantPreflight,
        participantPreflightAfterNavigation,
        participantPreflightBeforeApply,
        snippetPath,
        outPath,
        canonicalOutDir: path.join(RUN_DIR, 'roll20-upload-handoff', 'cdp-apply'),
      };
      await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      printResult('DRY_RUN_READY', report, outPath);
      return;
    }

    const snippet = await readFile(snippetPath, 'utf8');
    if (REQUIRE_SOLO_ROOM) {
      participantPreflightBeforeApply = await recheckSoloRoom(
        page,
        participantRoomUrl,
        SETTINGS_URL,
        'immediately-before-apply',
      );
    }
    const consoleLines = [];
    const onConsole = (message) => {
      const text = message.text();
      if (text) consoleLines.push({ type: message.type(), text: text.slice(0, 2000) });
    };
    page.on('console', onConsole);
    let result;
    let evaluateError = null;
    try {
      result = await page.evaluate(snippet);
    } catch (error) {
      evaluateError = String(error?.message ?? error);
    } finally {
      page.off('console', onConsole);
    }
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000).catch(() => {});
    const after = await getPageSummary(page);
    const report = {
      generatedAt: new Date().toISOString(),
      fixtureId: FIXTURE_ID,
      mode: 'apply',
      cdpUrl: CDP_URL.replace(/\/\/.*@/, '//[redacted]@'),
      endpointCampaignId: ENDPOINT_CAMPAIGN_ID,
      snippetPath,
      before: readiness,
      participantPreflight,
      participantPreflightAfterNavigation,
      participantPreflightBeforeApply,
      after,
      evaluateError,
      result,
      consoleLines,
    };
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const reloadDuringSubmit = isReloadDuringSubmit(evaluateError, after);
    report.reloadDuringSubmit = reloadDuringSubmit;
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    if (evaluateError && !reloadDuringSubmit) {
      throw new Error([
        'ROLL20 UPLOAD CDP BLOCKED_EVALUATE_FAILED',
        `error=${evaluateError}`,
        `out=${rel(outPath)}`,
        'next=Inspect the saved local report, confirm whether Roll20 saved/reloaded, then run the activation checker or sheet-frame probe only if the intended fixture is visible.',
      ].join('\n'));
    }

    const status = result?.activation?.status || 'UNKNOWN';
    if (reloadDuringSubmit) {
      printResult('APPLY_CONTEXT_RELOADED_NEEDS_ACTIVATION_PROBE', report, outPath);
      return;
    }
    printResult(status === 'VISIBLE_MATCH' ? 'PASS_VISIBLE_MATCH' : `APPLY_${status}`, report, outPath);
  } finally {
    await browser.close();
  }
}

async function connectOverCdp(chromium) {
  try {
    return await chromium.connectOverCDP(CDP_URL);
  } catch (error) {
    throw new Error([
      'ROLL20 UPLOAD CDP BLOCKED_CDP_ENDPOINT',
      `Could not connect to ${CDP_URL}: ${error?.message ?? error}`,
      'Run preflight:roll20-cdp, open the dedicated Sandbox/test-room page in a CDP-enabled browser, then retry.',
    ].join('\n'));
  }
}

async function findRoll20Page(browser, requireSoloRoom = false) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const roll20Pages = pages.filter((page) => isRoll20PageUrl(page.url()));
  if (requireSoloRoom) {
    return roll20Pages.find((page) => safePathname(page.url()) === '/editor')
      ?? roll20Pages.find((page) => /\/editor\//.test(safePathname(page.url())))
      ?? roll20Pages[0]
      ?? null;
  }
  return roll20Pages.find((page) => /\/sheetsandbox\/settings\//.test(safePathname(page.url())))
    ?? roll20Pages.find((page) => safePathname(page.url()) === '/editor')
    ?? roll20Pages[0]
    ?? null;
}

async function inspectParticipantPage(page) {
  const snapshot = await page.evaluate(() => ({
    pathname: location.pathname,
    participantText: (() => {
      const element = document.querySelector('.party-page-members');
      if (!element) return '';
      const style = getComputedStyle(element);
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getClientRects().length > 0;
      return visible ? (element.innerText ?? element.textContent ?? '') : '';
    })(),
  }));
  return {
    pathname: snapshot.pathname,
    ...parseParticipantCounts(snapshot.participantText),
    source: '.party-page-members',
    mutationPerformed: false,
  };
}

async function requireSoloParticipant(page, stage) {
  const participant = await inspectParticipantPage(page);
  if (participant.status === 'PASS_SOLO') return { ...participant, stage };
  throw new Error([
    'ROLL20 UPLOAD CDP BLOCKED_ROOM_PARTICIPANTS',
    `stage=${stage}`,
    `page=${page.url()}`,
    `status=${participant.status}`,
    `counts=${participant.counts.join(',') || 'none'}`,
    'next=Stop. Open the dedicated legacy test room, confirm exactly one visible member, and rerun with --require-solo-room.',
  ].join('\n'));
}

async function recheckSoloRoom(page, roomUrl, settingsUrl, stage) {
  if (roomUrl && page.url() !== roomUrl) {
    await page.goto(roomUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }
  const participant = await requireSoloParticipant(page, stage);
  if (settingsUrl && page.url() !== settingsUrl) {
    await page.goto(settingsUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }
  return participant;
}

async function getPageSummary(page) {
  return page.evaluate(() => {
    const url = new URL(location.href);
    return {
      url: location.href,
      host: location.hostname,
      pathname: location.pathname,
      title: document.title,
      hasSandboxInputs: Boolean(document.querySelector('#sheetHtml, #sheetCss, #sheetTranslation')),
      hasManifestField: Boolean(document.querySelector('textarea[name="customcharsheet_json"], input[name="customcharsheet_json"], [name="customcharsheet_json"]')),
      hasSettingsForm: Boolean(document.querySelector('#settingsform')),
      hasSaveButton: Boolean(document.querySelector('#save-changes-button')),
      bodyTextSnippet: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      origin: url.origin,
    };
  });
}

function printResult(label, report, outPath) {
  console.log(`ROLL20 UPLOAD CDP ${label}`);
  console.log(`fixture=${FIXTURE_ID}`);
  console.log(`page=${redactUrl(report.after?.url || report.page?.url || '')}`);
  console.log(`snippet=${rel(report.snippetPath)}`);
  console.log(`out=${rel(outPath)}`);
  if (report.result?.activation?.status) console.log(`activation=${report.result.activation.status}`);
  if (report.result?.settingsSave?.status) console.log(`settingsSave=${report.result.settingsSave.status}`);
  if (report.result?.endpointFallback?.status) console.log(`endpointFallback=${report.result.endpointFallback.status}`);
  console.log('next=Open/reload the dedicated Roll20 editor, open the intended character, run probe:roll20-sheet-frame, then capture chat only after VISIBLE_MATCH evidence.');
}

function campaignIdFromUrl(url) {
  try {
    return new URL(url).pathname.match(/\/(?:sheetsandbox\/settings|settings|editor)\/(\d+)/)?.[1] || '';
  } catch {
    return '';
  }
}

function safePathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function runSelfTest() {
  const failures = selfTestRoll20Readiness();
  if (failures.length) {
    console.error(`ROLL20 UPLOAD CDP SELF_TEST FAIL ${JSON.stringify(failures, null, 2)}`);
    process.exit(1);
  }
  const settingsId = campaignIdFromUrl('https://app.roll20.net/sheetsandbox/settings/21639681');
  if (settingsId !== '21639681') {
    console.error('ROLL20 UPLOAD CDP SELF_TEST FAIL settings campaign id parse');
    process.exit(1);
  }
  const reloadedAfterSubmit = isReloadDuringSubmit(
    'Execution context was destroyed, most likely because of a navigation.',
    { host: 'app.roll20.net', hasSandboxInputs: true },
  );
  const unrelatedFailure = isReloadDuringSubmit(
    'ReferenceError: missingFunction is not defined',
    { host: 'app.roll20.net', hasSandboxInputs: true },
  );
  const wrongPage = isReloadDuringSubmit(
    'Execution context was destroyed, most likely because of a navigation.',
    { host: 'example.invalid', hasSandboxInputs: true },
  );
  if (!reloadedAfterSubmit || unrelatedFailure || wrongPage) {
    console.error('ROLL20 UPLOAD CDP SELF_TEST FAIL reload-after-submit classification');
    process.exit(1);
  }
  const participant = parseParticipantCounts('- generic: 1 구성원');
  if (participant.status !== 'PASS_SOLO') {
    console.error('ROLL20 UPLOAD CDP SELF_TEST FAIL participant guard');
    process.exit(1);
  }
  console.log('ROLL20 UPLOAD CDP SELF_TEST PASS');
}

function isReloadDuringSubmit(evaluateError, after) {
  return Boolean(
    evaluateError &&
    /execution context was destroyed|target closed|frame was detached|navigation/i.test(evaluateError) &&
    after?.host === 'app.roll20.net' &&
    after?.hasSandboxInputs,
  );
}

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function rel(filePath) {
  return path.relative(process.cwd(), filePath) || '.';
}

function redactUrl(url) {
  return String(url ?? '').replace(/\/editor\/character\/([^/]+)\/([^/]+)/, '/editor/character/[campaign]/[character]');
}

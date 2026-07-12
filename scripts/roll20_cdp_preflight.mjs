#!/usr/bin/env node
/**
 * Check whether a Chrome/Edge CDP endpoint is ready for Roll20 capture.
 *
 * This helper does not log in, upload sheets, or capture private evidence. It
 * only checks the debugging endpoint, lists matching Roll20 pages when present,
 * and prints exact next commands for the Roll20 chat capture helpers.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROLL20_READINESS, classifyRoll20Target, isRoll20PageTarget, nextActionForReadiness } from './lib/roll20Readiness.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = hasFlag('--self-test');
const RAW_RUN_DIR = readOption('--run-dir', args[0] ?? '');
const RUN_DIR = path.resolve(RAW_RUN_DIR);
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', 'app.roll20.net');
const FIXTURE = readOption('--fixture', '');
const LAUNCH = hasFlag('--launch');
const PROFILE_DIR = path.resolve(readOption('--profile-dir', path.join('.tmp', 'roll20-cdp-profile')));
const START_URL = readOption('--url', 'https://app.roll20.net/editor');
const WAIT_AFTER_LAUNCH_MS = Number(readOption('--wait-after-launch-ms', '2500'));

if (SELF_TEST) {
  runSelfTest();
} else if (!RAW_RUN_DIR) {
  console.error('Usage: node scripts/roll20_cdp_preflight.mjs --run-dir reports/roll20-actual-compare/<label> [--fixture <fixture-id>] [--launch] [--wait-after-launch-ms 2500]');
  process.exit(2);
} else {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

async function main() {
  if (!existsSync(RUN_DIR)) throw new Error(`missing run dir: ${RUN_DIR}`);

  const initialEndpoint = await inspectEndpoint(CDP_URL);
  let endpoint = initialEndpoint;
  const plannedEntries = readPlannedEntries(RUN_DIR, FIXTURE);
  const plannedFixtures = plannedEntries.map((entry) => entry.fixtureId);
  const currentEvidence = readCurrentEvidence(RUN_DIR);
  const launchCommand = buildLaunchCommand();
  const sheetFrameProbeCommands = plannedEntries.map((entry) => entry.sheetFrameProbeCommand || [
    'corepack pnpm run probe:roll20-sheet-frame --',
    `--run-dir ${quoteArg(rel(RUN_DIR))}`,
    `--fixture ${quoteArg(entry.fixtureId)}`,
  ].join(' '));
  const captureCommands = plannedEntries.map((entry) => entry.chatCaptureCommand || [
    'corepack pnpm run capture:roll20-chat-cdp --',
    `--run-dir ${quoteArg(rel(RUN_DIR))}`,
    `--fixture ${quoteArg(entry.fixtureId)}`,
  ].join(' '));

  let launchResult = null;
  if (LAUNCH && !endpoint.ok) {
    await mkdir(PROFILE_DIR, { recursive: true });
    launchResult = launchBrowser();
    if (launchResult.ok && WAIT_AFTER_LAUNCH_MS > 0) {
      await sleep(WAIT_AFTER_LAUNCH_MS);
      endpoint = await inspectEndpoint(CDP_URL);
      launchResult.recheckAfterMs = WAIT_AFTER_LAUNCH_MS;
      launchResult.recheckStatus = classifyStatus(endpoint);
      launchResult.recheckReason = endpoint.reason;
      launchResult.recheckTargets = endpoint.targets?.length ?? 0;
      launchResult.recheckRoll20Targets = endpoint.roll20Targets?.length ?? 0;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir: RUN_DIR,
    cdpUrl: CDP_URL,
    pageMatch: PAGE_MATCH,
    status: classifyStatus(endpoint),
    initialStatus: classifyStatus(initialEndpoint),
    initialEndpoint,
    endpoint,
    plannedFixtures,
    sheetFrameProbeCommands,
    captureCommands,
    currentEvidence,
    launchCommand,
    launchResult,
    nextAction: nextActionForEndpoint(endpoint, { plannedFixtures, currentEvidence }),
  };

  const outDir = path.join(RUN_DIR, 'roll20-cdp-preflight');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'roll20-cdp-preflight-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'roll20-cdp-preflight-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CDP PREFLIGHT ${report.status}`);
  console.log(`run=${rel(RUN_DIR)}`);
  console.log(`cdp=${CDP_URL}`);
  console.log(`targets=${endpoint.targets?.length ?? 0}`);
  console.log(`roll20Targets=${endpoint.roll20Targets?.length ?? 0}`);
  console.log(`plannedFixtures=${plannedFixtures.length}`);
  if (currentEvidence.status !== 'UNKNOWN') {
    console.log(`actualStatus=${currentEvidence.status}`);
    console.log(`rendererAction=${currentEvidence.rendererAction}`);
    console.log(`rendererReady=${currentEvidence.rendererReady ? 'YES' : 'NO'}`);
  }
  if (!endpoint.ok) {
    console.log(`launch=${launchCommand}`);
  }
  if (launchResult) {
    console.log(`launchResult=${launchResult.ok ? 'STARTED' : 'FAILED'}`);
    if (launchResult.recheckStatus) console.log(`launchRecheck=${launchResult.recheckStatus}`);
  }
  for (const command of sheetFrameProbeCommands) {
    console.log(`probe=${command}`);
  }
  for (const command of captureCommands) {
    console.log(`capture=${command}`);
  }
  console.log(`next=${report.nextAction}`);
  console.log(`out=${rel(outDir)}`);
}

async function inspectEndpoint(cdpUrl) {
  const targetsUrl = `${cdpUrl.replace(/\/$/, '')}/json/list`;
  try {
    const response = await fetch(targetsUrl);
    if (!response.ok) {
      return {
        ok: false,
        reason: `HTTP ${response.status} from ${targetsUrl}`,
        targets: [],
        roll20Targets: [],
      };
    }
    const targets = await response.json();
    const pages = Array.isArray(targets) ? targets : [];
    const roll20Targets = pages
      .filter(isRoll20PageTarget)
      .map((target) => ({
        id: target.id ?? '',
        type: target.type ?? '',
        title: target.title ?? '',
        url: target.url ?? '',
        readiness: classifyRoll20Target(target),
        webSocketDebuggerUrl: target.webSocketDebuggerUrl ? '[present]' : '',
      }));
    return {
      ok: true,
      reason: 'endpoint reachable',
      targets: pages.map((target) => ({
        id: target.id ?? '',
        type: target.type ?? '',
        title: target.title ?? '',
        url: target.url ?? '',
      })),
      roll20Targets,
    };
  } catch (error) {
    return {
      ok: false,
      reason: String(error?.message ?? error),
      targets: [],
      roll20Targets: [],
    };
  }
}

function classifyStatus(endpoint) {
  if (!endpoint.ok) return 'CDP_CLOSED';
  if (!endpoint.roll20Targets.length) return 'NO_MATCHING_ROLL20_PAGE';
  if (endpoint.roll20Targets.some((target) => target.readiness === ROLL20_READINESS.CAPTURE_READY)) return 'READY';
  if (endpoint.roll20Targets.some((target) => target.readiness === ROLL20_READINESS.LOGIN_REQUIRED)) return 'LOGIN_REQUIRED';
  if (endpoint.roll20Targets.some((target) => target.readiness === ROLL20_READINESS.CHALLENGE_OR_WAITING)) return 'CHALLENGE_OR_WAITING';
  return 'ROLL20_PAGE_NOT_READY';
}

function nextActionForEndpoint(endpoint, context = {}) {
  const plannedCount = context.plannedFixtures?.length ?? 0;
  const currentEvidence = context.currentEvidence ?? { status: 'UNKNOWN' };
  const status = classifyStatus(endpoint);
  if (status === 'CDP_CLOSED') {
    return 'Start a CDP-enabled browser with the launch command, log in to Roll20 there if needed, load the dedicated Sandbox/test room, then rerun this preflight.';
  }
  if (status === 'NO_MATCHING_ROLL20_PAGE') {
    return `Open a Roll20 Sandbox/test-room page matching ${PAGE_MATCH} in this CDP-enabled browser.`;
  }
  if (status === 'LOGIN_REQUIRED') {
    return nextActionForReadiness(ROLL20_READINESS.LOGIN_REQUIRED, { pageMatch: PAGE_MATCH, captureVerb: 'this preflight' });
  }
  if (status === 'CHALLENGE_OR_WAITING') {
    return nextActionForReadiness(ROLL20_READINESS.CHALLENGE_OR_WAITING, { pageMatch: PAGE_MATCH, captureVerb: 'this preflight' });
  }
  if (status === 'READY') {
    if (plannedCount === 0) {
      if (currentEvidence.status !== 'UNKNOWN' && currentEvidence.rendererReady === false) {
        return [
          'CDP is ready, but the current chat capture plan has no missing/stale fixtures.',
          `Do not recapture blindly. Current renderer action is ${currentEvidence.rendererAction || 'UNKNOWN'} with ${currentEvidence.rendererBlockers} blocker(s)`,
          currentEvidence.chatSameStructureHighMismatch > 0
            ? `and ${currentEvidence.chatSameStructureHighMismatch} same-structure high-mismatch chat fixture(s).`
            : '.',
          'Run the renderer/template/asset diagnostics named by gate:roll20-renderer-action, or pass --fixture/--all only when you intentionally need a fresh live capture.',
        ].join(' ');
      }
      return 'CDP is ready and no capture fixtures are currently planned. Run plan:roll20-chat-capture --all or pass --fixture only if you intentionally need fresh Roll20 evidence.';
    }
    return 'Load the intended fixture in the dedicated Roll20 Sandbox/test room, run the sheet-frame probe until it writes VISIBLE_MATCH evidence, then run the capture command for each planned fixture.';
  }
  return 'Navigate the CDP-enabled browser to the dedicated Roll20 Sandbox/test room, then rerun this preflight.';
}

function readCurrentEvidence(runDir) {
  const statusPath = path.join(runDir, 'actual-verification-status', 'actual-verification-status-results.json');
  if (!existsSync(statusPath)) {
    return {
      status: 'UNKNOWN',
      rendererReady: false,
      rendererAction: 'UNKNOWN',
      rendererBlockers: 0,
      chatSameStructureHighMismatch: 0,
    };
  }
  try {
    const status = JSON.parse(readFileSync(statusPath, 'utf8').replace(/^\uFEFF/, ''));
    const summary = status.summary ?? {};
    return {
      status: status.status ?? 'UNKNOWN',
      rendererReady: Boolean(summary.rendererReady),
      rendererAction: summary.rendererAction ?? 'UNKNOWN',
      rendererBlockers: Number(summary.rendererBlockerCount ?? 0),
      chatSameStructureHighMismatch: Number(summary.chatSameStructureHighMismatchCount ?? summary.chatSameStructureHighMismatch ?? summary.chatParitySameStructureHighMismatch ?? 0),
      chatSameStructureMaxAlignedMismatchPct: Number(summary.chatSameStructureMaxAlignedMismatchPct ?? 0),
      generatedActualScreenshots: ratio(summary.generatedPresentCount, summary.generatedTargetCount),
      generatedDiffed: ratio(summary.generatedDiffedCount, summary.generatedTargetCount),
      trustedFullRoot: ratio(summary.trustedFullRootCount, summary.trustedFullRootTotal),
    };
  } catch {
    return {
      status: 'UNKNOWN',
      rendererReady: false,
      rendererAction: 'UNKNOWN',
      rendererBlockers: 0,
      chatSameStructureHighMismatch: 0,
    };
  }
}

function readPlannedEntries(runDir, fixtureFilter) {
  const planPath = path.join(runDir, 'roll20-chat-capture-plan', 'roll20-chat-capture-plan-results.json');
  if (!existsSync(planPath)) return fixtureFilter ? [{ fixtureId: fixtureFilter }] : [];
  try {
    const plan = JSON.parse(readFileSync(planPath, 'utf8'));
    const planned = Array.isArray(plan.plannedEntries) ? plan.plannedEntries : [];
    const entries = fixtureFilter
      ? planned.filter((entry) => entry.fixtureId === fixtureFilter)
      : planned;
    if (entries.length) return entries.filter((entry) => entry.fixtureId);
    return fixtureFilter ? [{ fixtureId: fixtureFilter }] : [];
  } catch {
    return fixtureFilter ? [{ fixtureId: fixtureFilter }] : [];
  }
}

function buildLaunchCommand() {
  const chromePath = findBrowserPath();
  const executable = chromePath || 'chrome.exe';
  return [
    quoteArg(executable),
    '--remote-debugging-port=9222',
    `--user-data-dir=${quoteArg(PROFILE_DIR)}`,
    '--new-window',
    quoteArg(START_URL),
  ].join(' ');
}

function findBrowserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? '';
}

function launchBrowser() {
  const executable = findBrowserPath();
  if (!executable) {
    return {
      ok: false,
      reason: 'Chrome/Edge executable not found; run the printed launch command manually with your browser path.',
    };
  }
  const child = spawn(executable, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${PROFILE_DIR}`,
    '--new-window',
    START_URL,
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();
  return {
    ok: true,
    executable,
    profileDir: PROFILE_DIR,
    url: START_URL,
    note: 'Browser launched visibly. Log in to Roll20 in that window if needed, then rerun preflight.',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 CDP Preflight',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${rel(report.runDir)}\``,
    '',
    `Status: **${report.status}**`,
    '',
    `- CDP URL: \`${report.cdpUrl}\``,
    `- Page match: \`${report.pageMatch}\``,
    `- Endpoint: ${report.endpoint.ok ? 'reachable' : `closed (${report.endpoint.reason})`}`,
    `- Initial status: ${report.initialStatus}`,
    `- Targets: ${report.endpoint.targets.length}`,
    `- Roll20 targets: ${report.endpoint.roll20Targets.length}`,
    `- Planned fixtures: ${report.plannedFixtures.length}`,
    '',
  ];
  if (report.currentEvidence?.status && report.currentEvidence.status !== 'UNKNOWN') {
    lines.push('## Current Evidence Snapshot', '');
    lines.push(`- Actual status: ${report.currentEvidence.status}`);
    lines.push(`- Generated actual screenshots: ${report.currentEvidence.generatedActualScreenshots}`);
    lines.push(`- Generated diffs: ${report.currentEvidence.generatedDiffed}`);
    lines.push(`- Trusted full-root: ${report.currentEvidence.trustedFullRoot}`);
    lines.push(`- Renderer action: ${report.currentEvidence.rendererAction}`);
    lines.push(`- Renderer ready: ${report.currentEvidence.rendererReady ? 'YES' : 'NO'}`);
    lines.push(`- Renderer blockers: ${report.currentEvidence.rendererBlockers}`);
    lines.push(`- Same-structure high-mismatch chat fixtures: ${report.currentEvidence.chatSameStructureHighMismatch}`);
    if (Number.isFinite(report.currentEvidence.chatSameStructureMaxAlignedMismatchPct)) {
      lines.push(`- Same-structure max aligned mismatch: ${report.currentEvidence.chatSameStructureMaxAlignedMismatchPct.toFixed(2)}%`);
    }
    lines.push('');
  }
  if (report.endpoint.roll20Targets.length) {
    lines.push('## Roll20 Targets', '');
    lines.push('| Type | Readiness | Title | URL |');
    lines.push('| --- | --- | --- | --- |');
    for (const target of report.endpoint.roll20Targets) {
      lines.push(`| ${escapeCell(target.type)} | ${escapeCell(target.readiness)} | ${escapeCell(target.title)} | ${escapeCell(target.url)} |`);
    }
    lines.push('');
  }
  if (!report.endpoint.ok || !report.endpoint.roll20Targets.length) {
    lines.push('## Launch Command', '');
    lines.push('```powershell');
    lines.push(report.launchCommand);
    lines.push('```', '');
  }
  if (report.launchResult) {
    lines.push('## Launch Result', '');
    lines.push(`- Started: ${report.launchResult.ok ? 'yes' : 'no'}`);
    if (report.launchResult.reason) lines.push(`- Reason: ${report.launchResult.reason}`);
    if (report.launchResult.executable) lines.push(`- Executable: \`${report.launchResult.executable}\``);
    if (report.launchResult.profileDir) lines.push(`- Profile: \`${report.launchResult.profileDir}\``);
    if (report.launchResult.recheckStatus) {
      lines.push(`- Recheck after: ${report.launchResult.recheckAfterMs}ms`);
      lines.push(`- Recheck status: **${report.launchResult.recheckStatus}**`);
      lines.push(`- Recheck targets: ${report.launchResult.recheckTargets}`);
      lines.push(`- Recheck Roll20 targets: ${report.launchResult.recheckRoll20Targets}`);
    }
    lines.push('');
  }
  if (report.sheetFrameProbeCommands.length) {
    lines.push('## Sheet-Frame Probe Commands', '');
    for (const command of report.sheetFrameProbeCommands) {
      lines.push('```powershell');
      lines.push(command);
      lines.push('```');
    }
    lines.push('');
  }
  if (report.captureCommands.length) {
    lines.push('## Capture Commands', '');
    for (const command of report.captureCommands) {
      lines.push('```powershell');
      lines.push(command);
      lines.push('```');
    }
    lines.push('');
  }
  lines.push('## Next Action', '');
  lines.push(report.nextAction);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function runSelfTest() {
  const readyEndpoint = {
    ok: true,
    reason: 'endpoint reachable',
    targets: [],
    roll20Targets: [{ readiness: ROLL20_READINESS.CAPTURE_READY }],
  };
  const closedEndpoint = {
    ok: false,
    reason: 'connect ECONNREFUSED',
    targets: [],
    roll20Targets: [],
  };
  const heldEvidence = {
    status: 'GENERATED_ACTUAL_SCREENSHOTS_DIFFED',
    rendererReady: false,
    rendererAction: 'HOLD_PRODUCTION_RENDERER_PATCH',
    rendererBlockers: 8,
    chatSameStructureHighMismatch: 2,
  };
  const failures = [];
  const noPlanNext = nextActionForEndpoint(readyEndpoint, {
    plannedFixtures: [],
    currentEvidence: heldEvidence,
  });
  if (!noPlanNext.includes('Do not recapture blindly') || !noPlanNext.includes('HOLD_PRODUCTION_RENDERER_PATCH')) {
    failures.push('READY/no-plan next action did not point to renderer diagnostics');
  }
  const plannedNext = nextActionForEndpoint(readyEndpoint, {
    plannedFixtures: ['official-roll20-AW2E'],
    currentEvidence: heldEvidence,
  });
  if (!plannedNext.includes('run the sheet-frame probe')) {
    failures.push('READY/planned-fixture next action did not preserve capture instructions');
  }
  const closedNext = nextActionForEndpoint(closedEndpoint, {
    plannedFixtures: [],
    currentEvidence: heldEvidence,
  });
  if (!closedNext.includes('Start a CDP-enabled browser')) {
    failures.push('CDP_CLOSED next action regressed');
  }
  if (failures.length) {
    console.error(`ROLL20 CDP PREFLIGHT SELF_TEST FAIL ${failures.join('; ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('ROLL20 CDP PREFLIGHT SELF_TEST PASS');
}

function readOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function quoteArg(value) {
  const text = String(value);
  return /\s/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function ratio(a, b) {
  const left = Number(a ?? 0);
  const right = Number(b ?? 0);
  return `${left}/${right}`;
}

function rel(file) {
  return path.relative(process.cwd(), path.resolve(file)) || '.';
}

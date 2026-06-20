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
import { ROLL20_READINESS, classifyRoll20Target, nextActionForReadiness } from './lib/roll20Readiness.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(readOption('--run-dir', args[0] ?? ''));
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', 'app.roll20.net');
const FIXTURE = readOption('--fixture', '');
const LAUNCH = hasFlag('--launch');
const PROFILE_DIR = path.resolve(readOption('--profile-dir', path.join('.tmp', 'roll20-cdp-profile')));
const START_URL = readOption('--url', 'https://app.roll20.net/editor');

if (!RUN_DIR) {
  console.error('Usage: node scripts/roll20_cdp_preflight.mjs --run-dir reports/roll20-actual-compare/<label> [--fixture <fixture-id>] [--launch]');
  process.exit(2);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(RUN_DIR)) throw new Error(`missing run dir: ${RUN_DIR}`);

  const endpoint = await inspectEndpoint(CDP_URL);
  const plannedFixtures = readPlannedFixtures(RUN_DIR, FIXTURE);
  const launchCommand = buildLaunchCommand();
  const captureCommands = plannedFixtures.map((fixtureId) => [
    'corepack pnpm run capture:roll20-chat-cdp --',
    `--run-dir ${quoteArg(rel(RUN_DIR))}`,
    `--fixture ${quoteArg(fixtureId)}`,
  ].join(' '));

  let launchResult = null;
  if (LAUNCH && !endpoint.ok) {
    await mkdir(PROFILE_DIR, { recursive: true });
    launchResult = launchBrowser();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir: RUN_DIR,
    cdpUrl: CDP_URL,
    pageMatch: PAGE_MATCH,
    status: classifyStatus(endpoint),
    endpoint,
    plannedFixtures,
    captureCommands,
    launchCommand,
    launchResult,
    nextAction: nextActionForEndpoint(endpoint),
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
  if (!endpoint.ok) {
    console.log(`launch=${launchCommand}`);
  }
  for (const command of captureCommands) {
    console.log(`capture=${command}`);
  }
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
      .filter((target) => String(target.url ?? '').includes(PAGE_MATCH))
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

function nextActionForEndpoint(endpoint) {
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
    return 'Load the intended fixture in the dedicated Roll20 Sandbox/test room, then run the capture command for each planned fixture.';
  }
  return 'Navigate the CDP-enabled browser to the dedicated Roll20 Sandbox/test room, then rerun this preflight.';
}

function readPlannedFixtures(runDir, fixtureFilter) {
  if (fixtureFilter) return [fixtureFilter];
  const planPath = path.join(runDir, 'roll20-chat-capture-plan', 'roll20-chat-capture-plan-results.json');
  if (!existsSync(planPath)) return [];
  try {
    const plan = JSON.parse(readFileSync(planPath, 'utf8'));
    const planned = Array.isArray(plan.plannedEntries) ? plan.plannedEntries : [];
    return planned.map((entry) => entry.fixtureId).filter(Boolean);
  } catch {
    return [];
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
    `- Targets: ${report.endpoint.targets.length}`,
    `- Roll20 targets: ${report.endpoint.roll20Targets.length}`,
    `- Planned fixtures: ${report.plannedFixtures.length}`,
    '',
  ];
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

function rel(file) {
  return path.relative(process.cwd(), path.resolve(file)) || '.';
}

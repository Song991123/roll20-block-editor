#!/usr/bin/env node
/**
 * Read-only participant preflight for an already-open Roll20 room.
 *
 * This intentionally does not navigate, click, upload, save, open a
 * character, or capture a screenshot. An existing room is eligible for
 * generated-sheet work only when the visible page exposes exactly one
 * participant count. Sandbox pages without a readable room count are not
 * silently treated as solo rooms.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isRoll20PageUrl } from './lib/roll20Readiness.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = hasFlag('--self-test');
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', '/editor');
const OUT_DIR = readOption('--out-dir', '');

if (SELF_TEST) runSelfTest();
else main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});

async function main() {
  const { chromium } = await import('playwright-core');
  let browser;
  try {
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (error) {
    throw new Error([
      'ROLL20 ROOM PREFLIGHT BLOCKED_CDP_ENDPOINT',
      `Could not connect to ${CDP_URL}: ${error?.message ?? error}`,
      'Open the dedicated legacy test room in a CDP-enabled browser, then retry.',
    ].join('\n'));
  }

  // Do not call browser.close(): this is a user-owned browser connection.
  const pages = browser.contexts()
    .flatMap((context) => context.pages())
    .filter((page) => isRoll20PageUrl(page.url()))
    .filter((page) => page.url().includes(PAGE_MATCH));
  const pageResults = [];
  for (const page of pages) pageResults.push(await inspectPage(page));

  const eligible = pageResults.filter((result) => result.status === 'PASS_SOLO');
  const report = {
    generatedAt: new Date().toISOString(),
    cdpUrl: redactCdpUrl(CDP_URL),
    pageMatch: PAGE_MATCH,
    status: eligible.length === 1 ? 'PASS_SOLO' : eligible.length > 1 ? 'BLOCKED_AMBIGUOUS' : 'BLOCKED_NO_SOLO_ROOM',
    mutationPerformed: false,
    pages: pageResults,
    next: eligible.length === 1
      ? 'A single existing room has a visible one-member count. Keep the participant check fresh and continue only with read-only observation unless this is the dedicated legacy test room.'
      : 'Do not upload, save, open a character, click a roll, or change settings. Use the dedicated Sandbox/new test room, or establish a fresh visible one-member legacy room first.',
  };

  if (OUT_DIR) {
    const outDir = path.resolve(OUT_DIR);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'roll20-room-participant-preflight-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(`ROLL20 ROOM PARTICIPANT PREFLIGHT ${report.status}`);
  console.log(`pages=${pageResults.length}`);
  for (const result of pageResults) {
    console.log(`page=${result.pathname} status=${result.status} counts=${result.visibleCounts.join(',') || 'none'}`);
  }
  console.log(`mutationPerformed=${report.mutationPerformed}`);
  console.log(`next=${report.next}`);
  if (report.status !== 'PASS_SOLO') process.exitCode = 1;
}

async function inspectPage(page) {
  const snapshot = await page.evaluate(() => ({
    pathname: location.pathname,
    title: document.title,
    bodyText: document.body?.innerText ?? '',
  }));
  const participant = parseParticipantCounts(snapshot.bodyText);
  return {
    pathname: snapshot.pathname,
    title: snapshot.title,
    status: participant.status,
    visibleCounts: participant.counts,
    evidence: participant.lines,
    mutationPerformed: false,
  };
}

export function parseParticipantCounts(bodyText) {
  const lines = String(bodyText ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const matches = [];
  for (const line of lines) {
    // Roll20 currently exposes a compact line such as "- generic: 1 구성원".
    // Keep the parser narrow so unrelated numbers are ignored.
    const match = line.match(/(?:^|\s)(\d+)\s+(구성원|members?|participants?)\s*$/i);
    if (!match) continue;
    matches.push({ line, count: Number(match[1]) });
  }
  const counts = matches.map((match) => match.count);
  let status = 'BLOCKED_UNKNOWN';
  if (counts.length === 1 && counts[0] === 1) status = 'PASS_SOLO';
  else if (counts.some((count) => count !== 1)) status = 'BLOCKED_NOT_SOLO';
  else if (counts.length > 1) status = 'BLOCKED_AMBIGUOUS';
  return { status, counts, lines: matches.map((match) => match.line) };
}

function runSelfTest() {
  const cases = [
    ['- generic: 1 구성원', 'PASS_SOLO'],
    ['Players\n- generic: 2 구성원', 'BLOCKED_NOT_SOLO'],
    ['Players\nNo participant line', 'BLOCKED_UNKNOWN'],
    ['1 member\n1 participant', 'BLOCKED_AMBIGUOUS'],
  ];
  const failures = [];
  for (const [input, expected] of cases) {
    const actual = parseParticipantCounts(input).status;
    if (actual !== expected) failures.push({ input, expected, actual });
  }
  if (failures.length) {
    console.error(`ROLL20 ROOM PARTICIPANT PREFLIGHT SELF_TEST FAIL ${JSON.stringify(failures)}`);
    process.exit(1);
  }
  console.log('ROLL20 ROOM PARTICIPANT PREFLIGHT SELF_TEST PASS');
}

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function redactCdpUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
  } catch {
    return '[redacted]';
  }
}

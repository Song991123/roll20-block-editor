#!/usr/bin/env node
/**
 * Read-only participant preflight for an already-open Roll20 room.
 *
 * This intentionally does not navigate, click, upload, save, open a
 * character, or capture a screenshot. An existing room is eligible for
 * generated-sheet work only when the visible page proves exactly one
 * participant. Sandbox pages without readable room evidence are not silently
 * treated as solo rooms.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isRoll20PageUrl } from './lib/roll20Readiness.mjs';
import { classifyParticipantEvidence, parseParticipantCounts } from './lib/roll20ParticipantPreflight.mjs';

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
      ? 'A single existing room has current visible one-participant evidence. Keep the preflight fresh and continue only with read-only observation unless this is the dedicated legacy test room.'
      : 'Do not upload, save, open a character, click a roll, or change settings. Use the dedicated Sandbox/new test room, or establish fresh visible one-participant evidence first.',
  };

  if (OUT_DIR) {
    const outDir = path.resolve(OUT_DIR);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'roll20-room-participant-preflight-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(`ROLL20 ROOM PARTICIPANT PREFLIGHT ${report.status}`);
  console.log(`pages=${pageResults.length}`);
  for (const result of pageResults) {
    console.log(`page=${result.pathname} status=${result.status} source=${result.source} counts=${result.visibleCounts.join(',') || 'none'}`);
  }
  console.log(`mutationPerformed=${report.mutationPerformed}`);
  console.log(`next=${report.next}`);
  if (report.status !== 'PASS_SOLO') process.exitCode = 1;
}

async function inspectPage(page) {
  const snapshot = await page.evaluate(() => ({
    pathname: location.pathname,
    title: document.title,
    participantText: (() => {
      const element = document.querySelector('.party-page-members');
      if (!element) return '';
      const style = getComputedStyle(element);
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.getClientRects().length > 0;
      return visible ? (element.innerText ?? element.textContent ?? '') : '';
    })(),
    playerZone: (() => {
      const zone = document.querySelector('#playerzone');
      if (!zone) return { visible: false, visibleCards: null };
      const style = getComputedStyle(zone);
      const rect = zone.getBoundingClientRect();
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && rect.width > 0
        && rect.height > 0;
      if (!visible) return { visible: false, visibleCards: null };
      const visibleCards = Array.from(zone.querySelectorAll('.player[id^="player_"]')).filter((element) => {
        const cardStyle = getComputedStyle(element);
        const cardRect = element.getBoundingClientRect();
        return cardStyle.display !== 'none'
          && cardStyle.visibility !== 'hidden'
          && cardRect.width > 0
          && cardRect.height > 0;
      }).length;
      return { visible: true, visibleCards };
    })(),
  }));
  const participant = classifyParticipantEvidence({
    participantText: snapshot.participantText,
    playerZoneVisible: snapshot.playerZone.visible,
    visiblePlayerCards: snapshot.playerZone.visibleCards,
  });
  return {
    pathname: snapshot.pathname,
    title: snapshot.title,
    status: participant.status,
    visibleCounts: participant.counts,
    evidence: participant.lines,
    source: participant.source,
    mutationPerformed: false,
  };
}

function runSelfTest() {
  const cases = [
    ['- generic: 1 구성원', 'PASS_SOLO'],
    ['Players\n- generic: 2 members', 'BLOCKED_NOT_SOLO'],
    ['Players\nNo participant line', 'BLOCKED_UNKNOWN'],
    ['1 member\n1 participant', 'BLOCKED_AMBIGUOUS'],
  ];
  const failures = [];
  for (const [input, expected] of cases) {
    const actual = parseParticipantCounts(input).status;
    if (actual !== expected) failures.push({ input, expected, actual });
  }
  const cardOnly = classifyParticipantEvidence({ participantText: '', playerZoneVisible: true, visiblePlayerCards: 1 });
  const ambiguous = classifyParticipantEvidence({ participantText: '1 구성원', playerZoneVisible: true, visiblePlayerCards: 2 });
  if (cardOnly.status !== 'PASS_SOLO' || cardOnly.source !== 'visible-player-cards' || ambiguous.status !== 'BLOCKED_AMBIGUOUS') {
    failures.push({ cardOnly, ambiguous });
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

#!/usr/bin/env node
/**
 * Probe an already-open Roll20 Sandbox/test-room page for the generated sheet
 * inside the character-sheet iframe and save positive DOM evidence.
 *
 * This is local-only verification tooling. It does not log in, upload source,
 * change room settings, click roll buttons, or capture screenshots.
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
const SELF_TEST = hasFlag('--self-test');
const PLAN_ONLY = hasFlag('--plan-only') || hasFlag('--print-plan');
const DRY_RUN = hasFlag('--dry-run');
const RUN_DIR = path.resolve(readOption('--run-dir', args[0] ?? ''));
const FIXTURE_ID = readOption('--fixture', args[1] ?? '');
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', 'app.roll20.net');

if (SELF_TEST) {
  runSelfTest();
  process.exit(0);
}

if (!RUN_DIR || !FIXTURE_ID) {
  console.error('Usage: node scripts/roll20_sheet_frame_probe.mjs --run-dir reports/roll20-actual-compare/<label> --fixture <fixture-id> [--cdp http://127.0.0.1:9222] [--page-match app.roll20.net] [--dry-run] [--plan-only] [--self-test]');
  process.exit(2);
}

const payloadDir = path.join(RUN_DIR, 'local-baseline', FIXTURE_ID, 'payload');
const screenshotsDir = path.join(RUN_DIR, 'local-baseline', FIXTURE_ID, 'screenshots');
const sidecarPath = path.join(screenshotsDir, 'roll20-sandbox-dom-evidence.json');

main().catch((error) => {
  const message = String(error?.message ?? error);
  if (message.startsWith('ROLL20 SHEET FRAME PROBE ')) {
    console.error(message);
  } else {
    console.error(error?.stack || error);
  }
  process.exitCode = 1;
});

async function main() {
  if (!existsSync(RUN_DIR)) throw new Error(`missing run dir: ${RUN_DIR}`);
  if (!existsSync(payloadDir)) throw new Error(`missing payload dir: ${payloadDir}`);
  const sourceTexts = await readPayloadTexts(payloadDir);
  const hints = extractActivationHints(sourceTexts);
  await mkdir(screenshotsDir, { recursive: true });

  if (PLAN_ONLY) {
    console.log('ROLL20 SHEET FRAME PROBE PLAN_ONLY');
    console.log(`fixture=${FIXTURE_ID}`);
    console.log(`run=${rel(RUN_DIR)}`);
    console.log(`sidecar=${rel(sidecarPath)}`);
    console.log(`cdp=${CDP_URL}`);
    console.log(`pageMatch=${PAGE_MATCH}`);
    console.log(`expectedRollButtons=${hints.rollButtonNames.slice(0, 8).join(', ') || '(none)'}`);
    console.log(`expectedAttrs=${hints.attrNames.slice(0, 8).join(', ') || '(none)'}`);
    console.log('next=Open the dedicated Roll20 Sandbox/test-room page in a CDP-enabled browser, open a character sheet, then rerun without --plan-only.');
    return;
  }

  const { chromium } = await import('playwright-core');
  const browser = await connectOverCdp(chromium);
  try {
    const page = await findRoll20Page(browser);
    if (!page) {
      const urls = browser.contexts().flatMap((context) => context.pages()).map((candidate) => candidate.url());
      throw new Error(`ROLL20 SHEET FRAME PROBE BLOCKED_NO_PAGE\nNo Roll20 page matching "${PAGE_MATCH}" found via ${CDP_URL}.\nOpen pages:\n${urls.map((url) => `- ${url}`).join('\n')}`);
    }
    const readiness = await getRoll20PageReadiness(page);
    const summary = await pageSummary(page);
    if (DRY_RUN) {
      console.log(`ROLL20 SHEET FRAME PROBE ${readiness.ready ? 'DRY_RUN_READY' : 'DRY_RUN_NOT_READY'}`);
      console.log(`page=${summary.url}`);
      console.log(`readiness=${readiness.status}`);
      console.log(`title=${summary.title}`);
      console.log(`frames=${summary.frames.length}`);
      console.log(`sidecar=${rel(sidecarPath)}`);
      if (!readiness.ready) console.log(`next=${readiness.nextAction}`);
      return;
    }
    assertProbeReadyPage(readiness);

    const probe = await probeSheetFrames(page, hints);
    if (probe.status !== 'VISIBLE_MATCH') {
      const best = probe.bestProbe;
      throw new Error([
        'ROLL20 SHEET FRAME PROBE NOT_PROVEN',
        `fixture=${FIXTURE_ID}`,
        `bestFrame=${best?.frame?.title || best?.frame?.name || best?.frame?.url || '(none)'}`,
        `sheetHitCount=${best?.sheetHitCount ?? 0}`,
        `rootCount=${best?.rootCount ?? 0}`,
        `rollButtonCount=${best?.counts?.rollButtonCount ?? 0}`,
        `attrCount=${best?.counts?.attrCount ?? 0}`,
        'Open the intended character sheet iframe/tab or verify the generated fixture was applied before saving DOM evidence.',
      ].join('\n'));
    }

    const sidecar = {
      fixtureId: FIXTURE_ID,
      status: 'VISIBLE_MATCH',
      generatedAt: new Date().toISOString(),
      tool: 'scripts/roll20_sheet_frame_probe.mjs',
      scope: 'positive Roll20 character-sheet iframe DOM evidence only; not screenshot or visual parity',
      page: {
        url: redactUrl(page.url()),
        title: await page.title().catch(() => ''),
        readiness: readiness.status,
      },
      expected: {
        rolltemplateClasses: hints.rolltemplateClasses.slice(0, 16),
        rollButtonNames: hints.rollButtonNames.slice(0, 16),
        attrNames: hints.attrNames.slice(0, 16),
        textTokens: hints.textTokens.slice(0, 16),
      },
      ...probe.bestProbe,
      candidates: probe.candidates,
      nextAction: 'Capture Roll20 root/chat screenshots from the same loaded fixture, then rerun screenshot diff and status gates.',
    };
    await writeFile(sidecarPath, `${JSON.stringify(sidecar, null, 2)}\n`, 'utf8');

    console.log('ROLL20 SHEET FRAME PROBE PASS');
    console.log(`fixture=${FIXTURE_ID}`);
    console.log(`page=${redactUrl(page.url())}`);
    console.log(`frame=${sidecar.frame.title || sidecar.frame.name || sidecar.frame.url}`);
    console.log(`sheetHitCount=${sidecar.sheetHitCount}`);
    console.log(`rootCount=${sidecar.rootCount}`);
    console.log(`attrCount=${sidecar.counts.attrCount}`);
    console.log(`rollButtonCount=${sidecar.counts.rollButtonCount}`);
    console.log(`sidecar=${rel(sidecarPath)}`);
  } finally {
    await browser.close();
  }
}

async function readPayloadTexts(dir) {
  const files = {
    html: path.join(dir, 'sheet.html'),
    css: path.join(dir, 'sheet.css'),
    translation: path.join(dir, 'translation.json'),
    manifest: path.join(dir, 'sheet.json'),
  };
  for (const [label, file] of Object.entries(files)) {
    if (!existsSync(file)) throw new Error(`missing ${label} payload file: ${file}`);
  }
  return {
    html: await readFile(files.html, 'utf8'),
    css: await readFile(files.css, 'utf8'),
    translation: await readFile(files.translation, 'utf8'),
    manifest: await readFile(files.manifest, 'utf8'),
  };
}

function extractActivationHints(sourceTexts) {
  const combined = `${sourceTexts.html}\n${sourceTexts.css}\n${sourceTexts.translation}\n${sourceTexts.manifest}`;
  const html = sourceTexts.html;
  return {
    rolltemplateClasses: uniqueMatches(combined, /\b(?:sheet-)?rolltemplate-[a-z0-9_-]+\b/gi, 24),
    rollButtonNames: uniqueMatches(html, /\bname\s*=\s*["'](roll_[^"']+)["']/gi, 32, 1),
    attrNames: uniqueMatches(html, /\bname\s*=\s*["'](attr_[^"']+)["']/gi, 32, 1),
    textTokens: extractVisibleTextTokens(html, sourceTexts.translation, 48),
  };
}

function uniqueMatches(text, regex, limit, group = 0) {
  const seen = new Set();
  const values = [];
  for (const match of text.matchAll(regex)) {
    const value = String(match[group] ?? '').trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    values.push(value);
    if (values.length >= limit) break;
  }
  return values;
}

function extractVisibleTextTokens(html, translation, limit) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const visibleText = withoutScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ');
  const translationText = safeTranslationValues(translation).join(' ');
  const stop = new Set(['class', 'sheet', 'type', 'value', 'name', 'input', 'button', 'hidden', 'roll', 'text', 'label', 'span', 'div', 'attr']);
  const seen = new Set();
  const tokens = [];
  for (const token of `${visibleText} ${translationText}`.split(/[^\p{L}\p{N}_-]+/u)) {
    const clean = token.trim();
    if (clean.length < 4 || clean.length > 40) continue;
    if (/^(attr_|roll_|sheet_|repeating_)/i.test(clean)) continue;
    if (/^[0-9_-]+$/.test(clean)) continue;
    if (stop.has(clean.toLowerCase())) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(clean);
    if (tokens.length >= limit) break;
  }
  return tokens;
}

function safeTranslationValues(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    return Object.values(parsed).filter((value) => typeof value === 'string').slice(0, 120);
  } catch {
    return [];
  }
}

async function connectOverCdp(chromium) {
  try {
    return await chromium.connectOverCDP(CDP_URL);
  } catch (error) {
    throw new Error(`ROLL20 SHEET FRAME PROBE BLOCKED_CDP_ENDPOINT\nCould not connect to ${CDP_URL}: ${String(error?.message ?? error)}`);
  }
}

async function findRoll20Page(browser) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (isRoll20PageUrl(page.url())) return page;
    }
  }
  return null;
}

async function getRoll20PageReadiness(page) {
  const target = { url: page.url(), title: await page.title().catch(() => '') };
  const status = classifyRoll20Target(target);
  return {
    status,
    ready: isRoll20CaptureReady(status),
    nextAction: nextActionForReadiness(status, { pageMatch: PAGE_MATCH, captureVerb: 'sheet frame probe' }),
  };
}

function assertProbeReadyPage(readiness) {
  if (readiness.ready) return;
  throw new Error(`ROLL20 SHEET FRAME PROBE BLOCKED_PAGE_NOT_READY\nreadiness=${readiness.status}\nnext=${readiness.nextAction}`);
}

async function pageSummary(page) {
  return {
    url: redactUrl(page.url()),
    title: await page.title().catch(() => ''),
    frames: page.frames().map((frame) => ({
      url: redactUrl(frame.url()),
      name: frame.name() || '',
    })),
  };
}

async function probeSheetFrames(page, hints) {
  const frames = [page.mainFrame(), ...page.frames().filter((frame) => frame !== page.mainFrame())];
  const candidates = [];
  for (const frame of frames) {
    try {
      const frameMeta = await readFrameInfo(page, frame);
      const result = await frame.evaluate((expected) => {
        const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
        const bodyText = normalize(document.body?.innerText || document.body?.textContent || '');
        const bodyHtml = document.body?.outerHTML || '';
        const hits = {
          rolltemplateClasses: expected.rolltemplateClasses.filter((className) => bodyHtml.includes(className)),
          rollButtonNames: expected.rollButtonNames.filter((name) => bodyHtml.includes(name)),
          attrNames: expected.attrNames.filter((name) => bodyHtml.includes(name)),
          textTokens: expected.textTokens.filter((token) => bodyText.includes(token)),
        };
        const rootNodes = Array.from(document.querySelectorAll('.charsheet,.charactersheet,.sheetform,#charsheet-root'));
        const rollButtons = Array.from(document.querySelectorAll('button[type="roll"], button[name^="roll_"], [name^="roll_"]'));
        const attrs = Array.from(document.querySelectorAll('[name^="attr_"]'));
        return {
          bodyLen: bodyText.length,
          bodySnippet: bodyText.slice(0, 1200),
          rootCount: rootNodes.length,
          roots: rootNodes.length,
          rootSamples: rootNodes.slice(0, 8).map((node) => normalize(node.innerText || node.textContent).slice(0, 240)),
          counts: {
            charsheetCount: document.querySelectorAll('.charsheet,.charactersheet').length,
            sheetformCount: document.querySelectorAll('.sheetform').length,
            attrCount: attrs.length,
            rollButtonCount: rollButtons.length,
            rolltemplateCount: document.querySelectorAll('[class*="rolltemplate-"]').length,
          },
          samples: {
            attrNames: attrs.slice(0, 20).map((node) => node.getAttribute('name')).filter(Boolean),
            rollButtonNames: rollButtons.slice(0, 20).map((node) => node.getAttribute('name')).filter(Boolean),
          },
          hits,
        };
      }, hints);
      const sheetHitCount = result.hits.rollButtonNames.length + result.hits.attrNames.length + result.hits.textTokens.length;
      const chatTemplateHitCount = result.hits.rolltemplateClasses.length;
      candidates.push({
        frame: frameMeta,
        ...result,
        sheetHitCount,
        chatTemplateHitCount,
        textMarkers: {
          expectedSheetText: result.hits.textTokens.length > 0,
          expectedAttr: result.hits.attrNames.length > 0,
          expectedRollButton: result.hits.rollButtonNames.length > 0,
          rolltemplate: result.hits.rolltemplateClasses.length > 0,
        },
      });
    } catch (error) {
      candidates.push({
        frame: { url: redactUrl(frame.url()), name: frame.name() || '' },
        error: String(error?.message ?? error).split('\n')[0],
        bodyLen: 0,
        rootCount: 0,
        counts: { attrCount: 0, rollButtonCount: 0 },
        sheetHitCount: 0,
        chatTemplateHitCount: 0,
      });
    }
  }
  candidates.sort((a, b) => scoreProbe(b) - scoreProbe(a));
  const bestProbe = candidates[0] ?? null;
  return {
    status: bestProbe && bestProbe.sheetHitCount > 0 ? 'VISIBLE_MATCH' : 'NOT_PROVEN',
    bestProbe,
    candidates,
  };
}

function scoreProbe(candidate) {
  return (Number(candidate.sheetHitCount ?? 0) * 10000)
    + (Number(candidate.rootCount ?? 0) * 100)
    + (Number(candidate.counts?.rollButtonCount ?? 0) * 10)
    + Number(candidate.counts?.attrCount ?? 0)
    + Number(candidate.chatTemplateHitCount ?? 0);
}

async function readFrameInfo(page, frame) {
  const isMainFrame = frame === page.mainFrame();
  const base = {
    isMainFrame,
    url: redactUrl(frame.url()),
    name: frame.name() || '',
    title: '',
    frameElementBox: null,
  };
  try {
    base.title = await frame.evaluate(() => document.title || '');
  } catch {
    // keep empty title
  }
  if (isMainFrame) return base;
  const handle = await frame.frameElement();
  try {
    const [box, attrs] = await Promise.all([
      handle.boundingBox(),
      handle.evaluate((el) => ({
        title: el.getAttribute('title') || '',
        id: el.id || '',
        className: String(el.className || ''),
      })),
    ]);
    return {
      ...base,
      title: attrs.title || base.title,
      frameElementId: attrs.id,
      frameElementClassName: attrs.className,
      frameElementBox: box
        ? {
            x: finiteNumber(box.x),
            y: finiteNumber(box.y),
            width: finiteNumber(box.width),
            height: finiteNumber(box.height),
          }
        : null,
    };
  } finally {
    await handle.dispose();
  }
}

function runSelfTest() {
  const sourceTexts = {
    html: '<div class="sheet-root"><input name="attr_character_name"><button type="roll" name="roll_test">Roll</button><rolltemplate class="sheet-rolltemplate-test">Move</rolltemplate><span>Playbook</span></div>',
    css: '.sheet-rolltemplate-test { color: red; }',
    translation: '{"playbook":"Playbook"}',
    manifest: '{"name":"Self Test"}',
  };
  const hints = extractActivationHints(sourceTexts);
  const failures = [];
  if (!hints.attrNames.includes('attr_character_name')) failures.push('missing attr hint');
  if (!hints.rollButtonNames.includes('roll_test')) failures.push('missing roll hint');
  if (!hints.rolltemplateClasses.includes('sheet-rolltemplate-test')) failures.push('missing rolltemplate hint');
  if (!hints.textTokens.includes('Playbook')) failures.push('missing text token hint');
  const readyFailures = selfTestRoll20Readiness();
  if (readyFailures.length) failures.push(`readiness self-test failed: ${readyFailures.map((item) => item.name).join(', ')}`);
  if (scoreProbe({ sheetHitCount: 1, rootCount: 0, counts: { attrCount: 0, rollButtonCount: 0 } }) <= scoreProbe({ sheetHitCount: 0, rootCount: 10, counts: { attrCount: 100, rollButtonCount: 20 } })) {
    failures.push('probe scoring should prefer expected fixture hits over generic roots');
  }
  if (failures.length) throw new Error(`roll20_sheet_frame_probe self-test failed: ${failures.join(', ')}`);
  console.log('ROLL20 SHEET FRAME PROBE SELF-TEST PASS');
}

function hasFlag(name) {
  return args.includes(name);
}

function readOption(name, fallback = '') {
  const exact = args.indexOf(name);
  if (exact >= 0) return args[exact + 1] || fallback;
  const prefix = `${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(3)) : null;
}

function redactUrl(value) {
  return String(value || '').replace(/([?&](?:access_token|token|key|session|auth)=)[^&]+/gi, '$1[redacted]');
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

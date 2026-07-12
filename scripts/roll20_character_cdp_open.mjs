#!/usr/bin/env node
/**
 * Open or close a character sheet dialog in an already-loaded Roll20
 * Sandbox/test-room editor through CDP.
 *
 * This is local-only verification tooling. It does not upload sheet source,
 * save room settings, edit character data, click rolls, or capture screenshots.
 */

import {
  classifyRoll20Target,
  isRoll20CaptureReady,
  isRoll20PageUrl,
  nextActionForReadiness,
  selfTestRoll20Readiness,
} from './lib/roll20Readiness.mjs';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = hasFlag('--self-test');
const LIST = hasFlag('--list');
const DRY_RUN = hasFlag('--dry-run');
const CLOSE = hasFlag('--close');
const CHARACTER_ID = readOption('--character-id', '');
const CHARACTER_NAME = readOption('--character-name', '');
const CDP_URL = readOption('--cdp', process.env.ROLL20_CDP_URL ?? 'http://127.0.0.1:9222');
const PAGE_MATCH = readOption('--page-match', 'app.roll20.net');

if (SELF_TEST) {
  runSelfTest();
  process.exit(0);
}

if (!LIST && !CHARACTER_ID && !CHARACTER_NAME) {
  console.error('Usage: node scripts/roll20_character_cdp_open.mjs --list | --character-id <id> | --character-name <name> [--close] [--dry-run] [--cdp http://127.0.0.1:9222]');
  process.exit(2);
}

main().catch((error) => {
  const message = String(error?.message ?? error);
  if (message.startsWith('ROLL20 CHARACTER CDP ')) {
    console.error(message);
  } else {
    console.error(error?.stack || error);
  }
  process.exitCode = 1;
});

async function main() {
  const { chromium } = await import('playwright-core');
  const browser = await connectOverCdp(chromium);
  try {
    const page = await findRoll20Page(browser);
    if (!page) {
      const urls = browser.contexts().flatMap((context) => context.pages()).map((candidate) => candidate.url());
      throw new Error(`ROLL20 CHARACTER CDP BLOCKED_NO_PAGE\nNo Roll20 page matching "${PAGE_MATCH}" found via ${CDP_URL}.\nOpen pages:\n${urls.map((url) => `- ${url}`).join('\n')}`);
    }

    const readiness = await getRoll20PageReadiness(page);
    if (!isRoll20CaptureReady(readiness.status)) {
      throw new Error([
        'ROLL20 CHARACTER CDP BLOCKED_PAGE_NOT_READY',
        `page=${redactUrl(page.url())}`,
        `readiness=${readiness.status}`,
        `next=${readiness.nextAction}`,
      ].join('\n'));
    }

    const target = { id: CHARACTER_ID, name: CHARACTER_NAME, close: CLOSE, dryRun: DRY_RUN };
    const result = await page.evaluate(async (options) => {
      const summarizeDialog = (el) => {
        const rect = el.getBoundingClientRect();
        return {
          className: String(el.className || ''),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
          rect: {
            x: Math.round(rect.x * 1000) / 1000,
            y: Math.round(rect.y * 1000) / 1000,
            width: Math.round(rect.width * 1000) / 1000,
            height: Math.round(rect.height * 1000) / 1000,
            visible: rect.width > 0 && rect.height > 0,
          },
        };
      };
      const summarizeFrame = (frame) => {
        const rect = frame.getBoundingClientRect();
        return {
          title: frame.title || '',
          src: frame.src || '',
          name: frame.name || '',
          rect: {
            x: Math.round(rect.x * 1000) / 1000,
            y: Math.round(rect.y * 1000) / 1000,
            width: Math.round(rect.width * 1000) / 1000,
            height: Math.round(rect.height * 1000) / 1000,
            visible: rect.width > 0 && rect.height > 0,
          },
        };
      };
      const collection = window.Campaign?.characters;
      const models = Array.isArray(collection?.models) ? collection.models : [];
      const characters = models.map((model) => ({
        id: model.id || model.attributes?.id || '',
        name: model.get?.('name') || model.attributes?.name || '',
        archived: Boolean(model.get?.('archived') ?? model.attributes?.archived),
      }));
      if (!collection) return { ok: false, reason: 'Campaign.characters is not available', characters };
      if (options.list) return { ok: true, action: 'list', characters };

      const wantedName = String(options.name || '').trim();
      const character = options.id
        ? collection.get?.(options.id)
        : models.find((model) => String(model.get?.('name') || model.attributes?.name || '') === wantedName);
      if (!character) return { ok: false, reason: 'target character not found', characters };

      const name = character.get?.('name') || character.attributes?.name || '';
      const id = character.id || character.attributes?.id || '';
      const action = options.close ? 'close' : 'open';
      const calls = [];

      if (!options.dryRun) {
        if (options.close) {
          try {
            character.view?.$el?.dialog?.('close');
            calls.push('view.$el.dialog(close)');
          } catch (error) {
            calls.push(`close-error:${error?.message || error}`);
          }
        } else {
          try {
            const rendered = character.view?.render?.();
            if (rendered?.then) await rendered;
            calls.push('view.render');
          } catch (error) {
            calls.push(`render-error:${error?.message || error}`);
          }
          try {
            const shown = character.view?.showDialog?.();
            if (shown?.then) await shown;
            calls.push('view.showDialog');
          } catch (error) {
            calls.push(`showDialog-error:${error?.message || error}`);
          }
        }
      }

      return {
        ok: true,
        action,
        dryRun: Boolean(options.dryRun),
        target: { id, name },
        calls,
        characters,
        dialogs: Array.from(document.querySelectorAll('.ui-dialog,.characterdialog,.characterviewer,.charactereditor'))
          .map(summarizeDialog)
          .filter((dialog) => dialog.rect.visible)
          .slice(0, 12),
        frames: Array.from(document.querySelectorAll('iframe')).map(summarizeFrame).slice(0, 12),
      };
    }, { ...target, list: LIST });

    if (!result.ok) {
      throw new Error([
        'ROLL20 CHARACTER CDP NOT_FOUND',
        `reason=${result.reason}`,
        `available=${(result.characters ?? []).map((character) => `${character.name}:${character.id}`).join(', ') || '(none)'}`,
      ].join('\n'));
    }

    if (result.action === 'list') {
      console.log('ROLL20 CHARACTER CDP LIST');
      console.log(`page=${redactUrl(page.url())}`);
      for (const character of result.characters) {
        console.log(`character=${character.name}\tid=${character.id}\tarchived=${character.archived}`);
      }
      return;
    }

    console.log(`ROLL20 CHARACTER CDP ${CLOSE ? 'CLOSE' : DRY_RUN ? 'DRY_RUN' : 'OPEN'} PASS`);
    console.log(`page=${redactUrl(page.url())}`);
    console.log(`character=${result.target.name}`);
    console.log(`characterId=${result.target.id}`);
    console.log(`calls=${result.calls.join(', ') || '(dry-run)'}`);
    console.log(`visibleDialogs=${result.dialogs.length}`);
    console.log(`visibleFrames=${result.frames.filter((frame) => frame.rect.visible).length}`);
    const sheetFrame = result.frames.find((frame) => /character sheet/i.test(frame.title) || /\/editor\/character\//.test(frame.src));
    if (sheetFrame) console.log(`sheetFrame=${sheetFrame.title || sheetFrame.src}`);
    if (!CLOSE) {
      console.log('next=Run probe:roll20-sheet-frame for the intended fixture before trusting root/chat capture.');
    }
  } finally {
    await browser.close();
  }
}

async function connectOverCdp(chromium) {
  try {
    return await chromium.connectOverCDP(CDP_URL);
  } catch (error) {
    throw new Error([
      'ROLL20 CHARACTER CDP BLOCKED_CDP_ENDPOINT',
      `Could not connect to ${CDP_URL}: ${error?.message ?? error}`,
      'Run preflight:roll20-cdp, open the dedicated Sandbox/test-room page in a CDP-enabled browser, then retry.',
    ].join('\n'));
  }
}

async function findRoll20Page(browser) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const roll20Pages = pages.filter((page) => isRoll20PageUrl(page.url()));
  return roll20Pages.find((page) => /\/editor(?:$|[?#/])/.test(page.url()))
    ?? roll20Pages.find((page) => page.url().includes(PAGE_MATCH))
    ?? null;
}

async function getRoll20PageReadiness(page) {
  const target = { url: page.url(), title: await page.title().catch(() => '') };
  const status = classifyRoll20Target(target);
  return {
    status,
    ready: isRoll20CaptureReady(status),
    nextAction: nextActionForReadiness(status, { pageMatch: PAGE_MATCH, captureVerb: 'open-character-cdp' }),
  };
}

function runSelfTest() {
  const failures = selfTestRoll20Readiness();
  if (failures.length) {
    console.error(`ROLL20 CHARACTER CDP SELF_TEST FAIL ${JSON.stringify(failures, null, 2)}`);
    process.exit(1);
  }
  console.log('ROLL20 CHARACTER CDP SELF_TEST PASS');
}

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function redactUrl(url) {
  return String(url ?? '').replace(/\/editor\/character\/([^/]+)\/([^/]+)/, '/editor/character/[campaign]/[character]');
}

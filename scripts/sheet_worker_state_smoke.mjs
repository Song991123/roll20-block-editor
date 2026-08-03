#!/usr/bin/env node
/**
 * Browser smoke for Roll20 sheet worker state selectors.
 *
 * Roll20 sheets often use hidden inputs plus CSS attribute selectors such as
 * `.sheet-tabstoggle[value="character"] ~ .sheet-character`. This smoke proves
 * the local preview worker simulator updates both DOM properties and DOM
 * attributes after `setAttrs`, so CSS state selectors can react like Roll20.
 *
 * Scope: local static app preview iframe only. This is not actual Roll20 parity.
 *
 * Usage:
 *   node scripts/sheet_worker_state_smoke.mjs \
 *     --out-dir ./out --base-path /roll20-block-editor \
 *     --report-dir reports/sheet-worker-state-smoke
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const OUT_DIR = path.resolve(argOf('--out-dir', './out'));
const BASE_PATH = argOf('--base-path', '/roll20-block-editor');
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/sheet-worker-state-smoke'));
const PORT = Number(argOf('--port', '4198'));
const VIEWPORT = { width: 1280, height: 900 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
};

const SYNTHETIC_SHEET = {
  html: `
<div class="tabs">
  <input type="hidden" class="tabstoggle" name="attr_sheetTab" value="combat">
  <button type="action" name="act_character">Character</button>
  <button type="action" name="act_combat">Combat</button>
  <button type="action" name="act_silent_update">Silent update</button>
  <button type="action" name="act_worker_add_row">Worker add row</button>
  <button type="action" name="act_worker_remove_row">Worker remove row</button>
  <div class="character">Character panel</div>
  <div class="combat">Combat panel</div>
</div>
<div class="duplicate-attr">
  <label><input type="checkbox" class="visible-lock" name="attr_lock"> Visible lock</label>
  <div class="anchor-scope">
    <input type="checkbox" class="local-lock" name="attr_lock" style="display:none">
    <div class="choice">Choice list that should hide when mirrored lock is checked</div>
  </div>
</div>
<fieldset class="repeating_items">
  <input type="text" name="attr_item_name" value="New item">
  <input type="number" name="attr_item_qty" value="1">
</fieldset>
<input type="text" name="attr_loop_probe" value="idle">
<input type="text" name="attr_second_probe" value="idle">
<input type="hidden" name="attr_event_source" value="">
<input type="hidden" name="attr_event_attr" value="">
<input type="hidden" name="attr_event_previous" value="">
<input type="hidden" name="attr_event_new" value="">
<input type="hidden" name="attr_worker_source" value="">
<input type="hidden" name="attr_silent_fired" value="">
<input type="hidden" name="attr_callback_done" value="">
<input type="hidden" name="attr_silent_probe" value="idle">
<input type="hidden" name="attr_repeat_change_source" value="">
<input type="hidden" name="attr_repeat_change_attr" value="">
<input type="hidden" name="attr_repeat_change_previous" value="">
<input type="hidden" name="attr_repeat_change_new" value="">
<input type="hidden" name="attr_repeat_section_changed" value="">
<input type="hidden" name="attr_repeat_plain_changed" value="">
<input type="hidden" name="attr_repeat_remove_source" value="">
<input type="hidden" name="attr_repeat_remove_attr" value="">
<input type="hidden" name="attr_repeat_remove_trigger" value="">
<input type="hidden" name="attr_repeat_removed_count" value="0">
<input type="hidden" name="attr_repeat_removed_name" value="">
<script type="text/worker">
  on("clicked:character", function () {
    setAttrs({ sheetTab: "character" });
  });
  on("clicked:combat", function () {
    setAttrs({ sheetTab: "combat" });
  });
  on("change:sheettab", function (eventInfo) {
    setAttrs({ worker_source: eventInfo.sourceType }, { silent: true });
  });
  on("change:loop_probe", function () {
    setAttrs({ loop_probe: "armed" });
  });
  on("change:loop_probe change:second_probe", function (eventInfo) {
    setAttrs({
      event_source: eventInfo.sourceType,
      event_attr: eventInfo.sourceAttribute,
      event_previous: eventInfo.previousValue,
      event_new: eventInfo.newValue
    }, { silent: true });
  });
  on("change:silent_probe", function () {
    setAttrs({ silent_fired: "yes" }, { silent: true });
  });
  on("clicked:silent_update", function () {
    setAttrs({ silent_probe: "updated" }, { silent: true }, function () {
      setAttrs({ callback_done: "yes" }, { silent: true });
    });
  });
  on("change:repeating_items:item_qty", function (eventInfo) {
    setAttrs({
      repeat_change_source: eventInfo.sourceType,
      repeat_change_attr: eventInfo.sourceAttribute,
      repeat_change_previous: eventInfo.previousValue,
      repeat_change_new: eventInfo.newValue
    }, { silent: true });
  });
  on("change:repeating_items", function () {
    setAttrs({ repeat_section_changed: "yes" }, { silent: true });
  });
  on("change:item_qty", function () {
    setAttrs({ repeat_plain_changed: "yes" }, { silent: true });
  });
  on("remove:repeating_items", function (eventInfo) {
    var removedKeys = Object.keys(eventInfo.removedInfo || {});
    var nameKey = removedKeys.find(function (key) { return /_item_name$/.test(key); });
    setAttrs({
      repeat_remove_source: eventInfo.sourceType,
      repeat_remove_attr: eventInfo.sourceAttribute,
      repeat_remove_trigger: eventInfo.triggerName,
      repeat_removed_count: removedKeys.length,
      repeat_removed_name: nameKey ? eventInfo.removedInfo[nameKey] : ""
    }, { silent: true });
  });
  on("clicked:worker_add_row", function () {
    var rowId = generateRowID();
    var values = {};
    values["repeating_items_" + rowId + "_item_name"] = "Worker item";
    values["repeating_items_" + rowId + "_item_qty"] = "2";
    setAttrs(values);
  });
  on("clicked:worker_remove_row", function () {
    getSectionIDs("repeating_items", function (ids) {
      if (ids[0]) removeRepeatingRow("repeating_items_" + ids[0]);
    });
  });
</script>
`,
  css: `
.tabstoggle ~ .character,
.tabstoggle ~ .combat {
  display: none;
}
.tabstoggle[value="character"] ~ .character {
  display: block;
  color: rgb(20, 120, 40);
}
.tabstoggle[value="combat"] ~ .combat {
  display: block;
  color: rgb(120, 40, 20);
}
.local-lock:checked ~ .choice {
  display: none;
}
`,
  i18n: '{}',
};

function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let url = decodeURIComponent((req.url ?? '/').split('?')[0]);
      if (url.startsWith(BASE_PATH)) url = url.slice(BASE_PATH.length) || '/';
      if (url.endsWith('/')) url += 'index.html';
      const file = path.join(OUT_DIR, path.normalize(url).replace(/^([/\\])+/, ''));
      if (!file.startsWith(OUT_DIR)) {
        res.writeHead(403).end();
        return;
      }
      const body = await fs.readFile(file);
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function warmPerfHook(page) {
  await page.waitForFunction(() => Boolean(window.__perfHook), null, { timeout: 30000 });
  await page.waitForFunction(
    async () => {
      try {
        const r = await window.__perfHook.importSheet({ html: '<div>ready</div>' });
        return r.blockCount > 0;
      } catch {
        return false;
      }
    },
    null,
    { timeout: 30000, polling: 1000 },
  );
}

async function importSynthetic(page) {
  return page.evaluate(async (sheet) => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    window.__perfHook.clearAll();
    await sleep(300);
    const result = await window.__perfHook.importSheet(sheet);
    window.__perfHook.setPreviewRenderMode('iframe');
    window.__perfHook.setPreviewZoom(1);
    window.__perfHook.setMainMode('preview');
    return result;
  }, SYNTHETIC_SHEET);
}

async function readState(frame) {
  return frame.evaluate(() => {
    const input = document.querySelector('[name="attr_sheetTab"]');
    const character = document.querySelector('.sheet-character');
    const combat = document.querySelector('.sheet-combat');
    const visibleLock = document.querySelector('.sheet-visible-lock');
    const localLock = document.querySelector('.sheet-local-lock');
    const choice = document.querySelector('.sheet-choice');
    const charStyle = character ? getComputedStyle(character) : null;
    const combatStyle = combat ? getComputedStyle(combat) : null;
    const choiceStyle = choice ? getComputedStyle(choice) : null;
    return {
      inputValueProperty: input?.value ?? null,
      inputValueAttribute: input?.getAttribute('value') ?? null,
      characterDisplay: charStyle?.display ?? null,
      combatDisplay: combatStyle?.display ?? null,
      characterText: character?.textContent?.trim() ?? '',
      combatText: combat?.textContent?.trim() ?? '',
      visibleLockChecked: visibleLock?.checked ?? null,
      visibleLockCheckedAttribute: visibleLock?.getAttribute('checked') ?? null,
      localLockChecked: localLock?.checked ?? null,
      localLockCheckedAttribute: localLock?.getAttribute('checked') ?? null,
      choiceDisplay: choiceStyle?.display ?? null,
      loopProbe: document.querySelector('[name="attr_loop_probe"]')?.value ?? null,
      secondProbe: document.querySelector('[name="attr_second_probe"]')?.value ?? null,
      eventSource: document.querySelector('[name="attr_event_source"]')?.value ?? null,
      eventAttribute: document.querySelector('[name="attr_event_attr"]')?.value ?? null,
      eventPrevious: document.querySelector('[name="attr_event_previous"]')?.value ?? null,
      eventNew: document.querySelector('[name="attr_event_new"]')?.value ?? null,
      workerSource: document.querySelector('[name="attr_worker_source"]')?.value ?? null,
      silentFired: document.querySelector('[name="attr_silent_fired"]')?.value ?? null,
      callbackDone: document.querySelector('[name="attr_callback_done"]')?.value ?? null,
      silentProbe: document.querySelector('[name="attr_silent_probe"]')?.value ?? null,
      repeatingTemplateDisplay: getComputedStyle(document.querySelector('fieldset.repeating_items')).display,
      repeatingGroup: document.querySelector('.repcontainer')?.getAttribute('data-groupname') ?? null,
      repeatingControlGroup: document.querySelector('.repcontrol')?.getAttribute('data-groupname') ?? null,
      repeatingRowCount: document.querySelectorAll('.repcontainer .repitem').length,
      repeatingRowId: document.querySelector('.repcontainer .repitem')?.getAttribute('data-reprowid') ?? null,
      repeatingName: document.querySelector('.repcontainer [name$="_item_name"]')?.value ?? null,
      repeatingQty: document.querySelector('.repcontainer [name$="_item_qty"]')?.value ?? null,
      repeatingNameAttr: document.querySelector('.repcontainer [name$="_item_name"]')?.getAttribute('name') ?? null,
      repeatingEditMode: document.querySelector('.repcontainer')?.classList.contains('editmode') ?? false,
      repeatingEditText: document.querySelector('.repcontrol_edit')?.textContent?.trim() ?? '',
      repeatingAddDisplay: document.querySelector('.repcontrol_add') ? getComputedStyle(document.querySelector('.repcontrol_add')).display : null,
      repeatChangeSource: document.querySelector('[name="attr_repeat_change_source"]')?.value ?? null,
      repeatChangeAttr: document.querySelector('[name="attr_repeat_change_attr"]')?.value ?? null,
      repeatChangePrevious: document.querySelector('[name="attr_repeat_change_previous"]')?.value ?? null,
      repeatChangeNew: document.querySelector('[name="attr_repeat_change_new"]')?.value ?? null,
      repeatSectionChanged: document.querySelector('[name="attr_repeat_section_changed"]')?.value ?? null,
      repeatPlainChanged: document.querySelector('[name="attr_repeat_plain_changed"]')?.value ?? null,
      repeatRemoveSource: document.querySelector('[name="attr_repeat_remove_source"]')?.value ?? null,
      repeatRemoveAttr: document.querySelector('[name="attr_repeat_remove_attr"]')?.value ?? null,
      repeatRemoveTrigger: document.querySelector('[name="attr_repeat_remove_trigger"]')?.value ?? null,
      repeatRemovedCount: document.querySelector('[name="attr_repeat_removed_count"]')?.value ?? null,
      repeatRemovedName: document.querySelector('[name="attr_repeat_removed_name"]')?.value ?? null,
      workerQueueOverflows: Number(document.body?.getAttribute('data-r20-worker-queue-overflows') ?? 0),
    };
  });
}

function passForState(state, expected) {
  const other = expected === 'character' ? 'combat' : 'character';
  return (
    state.inputValueProperty === expected &&
    state.inputValueAttribute === expected &&
    state[`${expected}Display`] !== 'none' &&
    state[`${other}Display`] === 'none'
  );
}

function renderMarkdown(report) {
  const lines = [
    '# Sheet Worker State Smoke',
    '',
    `Generated: ${report.finishedAt ?? report.startedAt}`,
    '',
    'Scope: local static app preview iframe only. This proves worker `setAttrs` updates CSS-visible DOM attributes for Roll20-style state selectors. It is not actual Roll20 visual parity.',
    '',
    '| Step | Input property | Input attribute | Character display | Combat display | Event source | Event attribute | Status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const step of report.steps) {
    lines.push(
      `| ${step.name} | ${step.state.inputValueProperty} | ${step.state.inputValueAttribute} | ${step.state.characterDisplay} | ${step.state.combatDisplay} | ${step.state.eventSource ?? ''} | ${step.state.eventAttribute ?? ''} | ${step.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  lines.push('## Duplicate Attribute Mirror');
  lines.push('');
  lines.push('| Step | Visible lock | Hidden anchor | Choice display | Status |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const step of report.duplicateAttrSteps ?? []) {
    lines.push(
      `| ${step.name} | ${step.state.visibleLockChecked} / ${step.state.visibleLockCheckedAttribute ?? ''} | ${step.state.localLockChecked} / ${step.state.localLockCheckedAttribute ?? ''} | ${step.state.choiceDisplay} | ${step.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  lines.push('## Repeating Section Runtime');
  lines.push('');
  lines.push('| Step | Rows | Row value | Event source | Removed values | Status |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const step of report.repeatingSteps ?? []) {
    lines.push(
      `| ${step.name} | ${step.state.repeatingRowCount} | ${step.state.repeatingName ?? ''} / ${step.state.repeatingQty ?? ''} | ${step.state.repeatChangeSource || step.state.repeatRemoveSource || ''} | ${step.state.repeatRemovedCount ?? ''} | ${step.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
  lines.push('');
  lines.push(`Console/page errors: ${report.consoleErrors.length + report.pageErrors.length}`);
  lines.push(`Screenshot: \`${report.screenshotPath}\``);
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: VIEWPORT });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) consoleErrors.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const report = {
    startedAt: new Date().toISOString(),
    baseUrl: `http://127.0.0.1:${PORT}${BASE_PATH}/`,
    steps: [],
    duplicateAttrSteps: [],
    repeatingSteps: [],
    consoleErrors,
    pageErrors,
  };

  try {
    await page.goto(report.baseUrl, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.setItem('__perfOn', '1'));
    await page.reload({ waitUntil: 'networkidle' });
    await warmPerfHook(page);
    report.import = await importSynthetic(page);

    const iframe = page.locator('[data-testid="preview-iframe"]').first();
    await iframe.waitFor({ state: 'visible', timeout: 30000 });
    const iframeHandle = await iframe.elementHandle();
    const frame = await iframeHandle?.contentFrame();
    if (!frame) throw new Error('preview iframe contentFrame unavailable');
    await frame.locator('.charactersheet.charsheet').waitFor({ state: 'visible', timeout: 30000 });

    const initial = await readState(frame);
    report.steps.push({ name: 'initial-combat', state: initial, pass: passForState(initial, 'combat') });
    report.repeatingSteps.push({
      name: 'runtime-shell',
      state: initial,
      pass:
        initial.repeatingTemplateDisplay === 'none' &&
        initial.repeatingGroup === 'repeating_items' &&
        initial.repeatingControlGroup === 'repeating_items' &&
        initial.repeatingRowCount === 0,
    });

    await frame.locator('button[name="act_worker_add_row"]').click({ timeout: 10000 });
    try {
      await frame.waitForFunction(() => (
        document.querySelectorAll('.repcontainer .repitem').length === 1 &&
        document.querySelector('.repcontainer [name$="_item_name"]')?.value === 'Worker item' &&
        document.querySelector('[name="attr_repeat_change_source"]')?.value === 'sheetworker'
      ), null, { timeout: 10000 });
    } catch (error) {
      const debug = {
        state: await readState(frame),
        emit: await page.evaluate(() => window.__perfHook?.getEmitContent?.()),
        consoleErrors,
        pageErrors,
      };
      throw new Error(`worker repeating row did not settle: ${JSON.stringify(debug)}`, { cause: error });
    }
    const workerAddedRow = await readState(frame);
    report.repeatingSteps.push({
      name: 'worker-created-row',
      state: workerAddedRow,
      pass:
        workerAddedRow.repeatingRowCount === 1 &&
        workerAddedRow.repeatingRowId?.startsWith('-') &&
        !workerAddedRow.repeatingRowId.includes('_') &&
        workerAddedRow.repeatingName === 'Worker item' &&
        workerAddedRow.repeatingQty === '2' &&
        workerAddedRow.repeatingNameAttr?.startsWith(`attr_repeating_items_${workerAddedRow.repeatingRowId}_`) &&
        workerAddedRow.repeatChangeSource === 'sheetworker' &&
        workerAddedRow.repeatChangeAttr?.endsWith('_item_qty') &&
        workerAddedRow.repeatChangePrevious === '1' &&
        workerAddedRow.repeatChangeNew === '2' &&
        workerAddedRow.repeatSectionChanged === 'yes' &&
        workerAddedRow.repeatPlainChanged === 'yes',
    });

    await frame.locator('button[name="act_worker_remove_row"]').click({ timeout: 10000 });
    await frame.waitForFunction(() => (
      document.querySelectorAll('.repcontainer .repitem').length === 0 &&
      document.querySelector('[name="attr_repeat_remove_source"]')?.value === 'sheetworker'
    ), null, { timeout: 10000 });
    const workerRemovedRow = await readState(frame);
    report.repeatingSteps.push({
      name: 'worker-removed-row',
      state: workerRemovedRow,
      pass:
        workerRemovedRow.repeatingRowCount === 0 &&
        workerRemovedRow.repeatRemoveSource === 'sheetworker' &&
        workerRemovedRow.repeatRemoveAttr?.startsWith('repeating_items_') &&
        workerRemovedRow.repeatRemoveAttr?.endsWith('_item_name') &&
        workerRemovedRow.repeatRemoveTrigger === 'remove:repeating_items' &&
        workerRemovedRow.repeatRemovedCount === '2' &&
        workerRemovedRow.repeatRemovedName === 'Worker item',
    });

    await frame.locator('button.repcontrol_add').click({ timeout: 10000 });
    await frame.waitForFunction(() => document.querySelectorAll('.repcontainer .repitem').length === 1, null, { timeout: 10000 });
    const userAddedRow = await readState(frame);
    report.repeatingSteps.push({
      name: 'user-added-row',
      state: userAddedRow,
      pass:
        userAddedRow.repeatingName === 'New item' &&
        userAddedRow.repeatingQty === '1' &&
        userAddedRow.repeatingRowId?.startsWith('-'),
    });

    const repeatingQty = frame.locator('.repcontainer [name$="_item_qty"]');
    await repeatingQty.fill('4');
    await repeatingQty.evaluate((node) => node.dispatchEvent(new Event('change', { bubbles: true })));
    await frame.waitForFunction(() => (
      document.querySelector('[name="attr_repeat_change_source"]')?.value === 'player' &&
      document.querySelector('[name="attr_repeat_change_new"]')?.value === '4'
    ), null, { timeout: 10000 });
    const userChangedRow = await readState(frame);
    report.repeatingSteps.push({
      name: 'repeating-change-aliases',
      state: userChangedRow,
      pass:
        userChangedRow.repeatChangeSource === 'player' &&
        userChangedRow.repeatChangeAttr?.endsWith('_item_qty') &&
        userChangedRow.repeatChangePrevious === '1' &&
        userChangedRow.repeatChangeNew === '4' &&
        userChangedRow.repeatSectionChanged === 'yes' &&
        userChangedRow.repeatPlainChanged === 'yes',
    });

    await frame.locator('button.repcontrol_edit').click({ timeout: 10000 });
    await frame.waitForFunction(() => (
      document.querySelector('.repcontainer')?.classList.contains('editmode') &&
      document.querySelector('.repcontrol_edit')?.textContent?.trim() === 'Done' &&
      getComputedStyle(document.querySelector('.repcontrol_add')).display === 'none'
    ), null, { timeout: 10000 });
    const userEditMode = await readState(frame);
    report.repeatingSteps.push({
      name: 'modify-mode',
      state: userEditMode,
      pass:
        userEditMode.repeatingEditMode === true &&
        userEditMode.repeatingEditText === 'Done' &&
        userEditMode.repeatingAddDisplay === 'none',
    });

    await frame.locator('button.repcontrol_del').click({ timeout: 10000 });
    await frame.waitForFunction(() => (
      document.querySelectorAll('.repcontainer .repitem').length === 0 &&
      document.querySelector('[name="attr_repeat_remove_source"]')?.value === 'player'
    ), null, { timeout: 10000 });
    const userRemovedRow = await readState(frame);
    report.repeatingSteps.push({
      name: 'user-removed-row',
      state: userRemovedRow,
      pass:
        userRemovedRow.repeatingRowCount === 0 &&
        userRemovedRow.repeatRemoveSource === 'player' &&
        userRemovedRow.repeatRemoveTrigger === 'remove:repeating_items' &&
        userRemovedRow.repeatRemovedCount === '2' &&
        userRemovedRow.repeatRemovedName === 'New item',
    });

    await frame.locator('button[name="act_character"]').click({ timeout: 10000 });
    await frame.waitForFunction(() => {
      const input = document.querySelector('[name="attr_sheetTab"]');
      const character = document.querySelector('.sheet-character');
      return input?.getAttribute('value') === 'character' && getComputedStyle(character).display !== 'none';
    }, null, { timeout: 10000 });
    const character = await readState(frame);
    report.steps.push({
      name: 'after-character-click',
      state: character,
      pass: passForState(character, 'character') && character.workerSource === 'sheetworker',
    });

    await frame.locator('button[name="act_combat"]').click({ timeout: 10000 });
    await frame.waitForFunction(() => {
      const input = document.querySelector('[name="attr_sheetTab"]');
      const combat = document.querySelector('.sheet-combat');
      return input?.getAttribute('value') === 'combat' && getComputedStyle(combat).display !== 'none';
    }, null, { timeout: 10000 });
    const combat = await readState(frame);
    report.steps.push({ name: 'after-combat-click', state: combat, pass: passForState(combat, 'combat') });

    const beforeLock = await readState(frame);
    report.duplicateAttrSteps.push({
      name: 'before-visible-lock-click',
      state: beforeLock,
      pass: beforeLock.visibleLockChecked === false && beforeLock.localLockChecked === false && beforeLock.choiceDisplay !== 'none',
    });
    await frame.locator('.sheet-visible-lock').click({ timeout: 10000 });
    await frame.waitForFunction(() => {
      const localLock = document.querySelector('.sheet-local-lock');
      const choice = document.querySelector('.sheet-choice');
      return localLock?.checked === true && localLock?.getAttribute('checked') === 'checked' && getComputedStyle(choice).display === 'none';
    }, null, { timeout: 10000 });
    const afterLock = await readState(frame);
    report.duplicateAttrSteps.push({
      name: 'after-visible-lock-click',
      state: afterLock,
      pass:
        afterLock.visibleLockChecked === true &&
        afterLock.localLockChecked === true &&
        afterLock.visibleLockCheckedAttribute === 'checked' &&
        afterLock.localLockCheckedAttribute === 'checked' &&
        afterLock.choiceDisplay === 'none',
    });

    await frame.locator('[name="attr_loop_probe"]').fill('armed');
    await frame.locator('[name="attr_loop_probe"]').evaluate((node) => {
      node.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await frame.waitForFunction(() => (
      document.querySelector('[name="attr_loop_probe"]')?.value === 'armed' &&
      document.body?.getAttribute('data-r20-worker-queue-overflows') === '0'
    ), null, { timeout: 10000 });
    const workerLoop = await readState(frame);
    report.steps.push({
      name: 'same-value-change-does-not-reenter-worker',
      state: workerLoop,
      pass:
        workerLoop.loopProbe === 'armed' &&
        workerLoop.eventSource === 'player' &&
        workerLoop.eventAttribute === 'loop_probe' &&
        workerLoop.eventPrevious === 'idle' &&
        workerLoop.eventNew === 'armed' &&
        workerLoop.workerQueueOverflows === 0,
    });

    await frame.locator('[name="attr_second_probe"]').fill('changed');
    await frame.locator('[name="attr_second_probe"]').evaluate((node) => {
      node.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await frame.waitForFunction(() => (
      document.querySelector('[name="attr_event_source"]')?.value === 'player' &&
      document.querySelector('[name="attr_event_attr"]')?.value === 'second_probe'
    ), null, { timeout: 10000 });
    const secondEvent = await readState(frame);
    report.steps.push({
      name: 'multi-event-listener-receives-second-event',
      state: secondEvent,
      pass:
        secondEvent.secondProbe === 'changed' &&
        secondEvent.eventSource === 'player' &&
        secondEvent.eventAttribute === 'second_probe' &&
        secondEvent.eventPrevious === 'idle' &&
        secondEvent.eventNew === 'changed',
    });

    const beforeSilentUpdate = await readState(frame);
    await frame.locator('button[name="act_silent_update"]').click({ timeout: 10000 });
    await frame.waitForFunction(() => (
      document.querySelector('[name="attr_silent_probe"]')?.value === 'updated' &&
      document.querySelector('[name="attr_callback_done"]')?.value === 'yes'
    ), null, { timeout: 10000 });
    const silentUpdate = await readState(frame);
    report.steps.push({
      name: 'silent-setattrs-callback-without-change-event',
      state: silentUpdate,
      pass:
        silentUpdate.silentProbe === 'updated' &&
        silentUpdate.callbackDone === 'yes' &&
        silentUpdate.silentFired === beforeSilentUpdate.silentFired,
    });

    report.screenshotPath = path.join(REPORT_DIR, 'sheet-worker-state.png');
    await frame.locator('.charactersheet.charsheet').screenshot({ path: report.screenshotPath });
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  report.finishedAt = new Date().toISOString();
  report.pass =
    report.steps.every((step) => step.pass) &&
    report.duplicateAttrSteps.every((step) => step.pass) &&
    report.repeatingSteps.every((step) => step.pass) &&
    report.consoleErrors.filter((msg) => msg.type === 'error').length === 0 &&
    report.pageErrors.length === 0;

  await fs.writeFile(path.join(REPORT_DIR, 'sheet-worker-state-smoke-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'sheet-worker-state-smoke-results.md'), renderMarkdown(report), 'utf8');
  console.log(`SHEET WORKER STATE SMOKE ${report.pass ? 'PASS' : 'FAIL'}`);
  if (!report.pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

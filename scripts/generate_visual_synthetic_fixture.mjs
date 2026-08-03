#!/usr/bin/env node
/**
 * Generate the anonymous fixture used by the local preview/edit pixel gate.
 *
 * This fixture is synthetic by design. It contains no third-party sheet
 * source, identity, asset URL, screenshot, or source-derived measurement.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixtureExpectationFailures } from './lib/fixtureExpectations.mjs';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out-dir');
const outDir = path.resolve(
  outIndex >= 0 && args[outIndex + 1] ? args[outIndex + 1] : '.tmp/visual-synthetic',
);
const selfTest = args.includes('--self-test');

const files = {
  'fixture-A/source.html': [
    '<div class="sheet-sandbox-proof" style="width:420px;min-height:180px;padding:16px">',
    '  <label data-i18n="name"></label>',
    '  <input type="text" name="attr_name" value="">',
    '  <input type="hidden" name="attr_clicked" value="0">',
    '  <div class="sheet-proof-actions">',
    '    <button type="roll" name="roll_check" value="&amp;{template:proof} {{name=Sandbox proof}} {{result=[[1d20]]}}">Roll</button>',
    '    <button type="action" name="act_mark" data-i18n="mark"></button>',
    '  </div>',
    '  <script type="text/worker">on(\'clicked:mark\', function () { setAttrs({ clicked: \'1\' }); });</script>',
    '</div>',
    '<rolltemplate class="sheet-rolltemplate-proof">',
    '  <div class="sheet-proof-card">',
    '    <div class="sheet-proof-title">{{name}}</div>',
    '    <div class="sheet-proof-row"><span data-i18n="result"></span><strong>{{result}}</strong></div>',
    '  </div>',
    '</rolltemplate>',
  ].join('\n'),
  'fixture-A/source.css': [
    '.sheet-sandbox-proof { background: #fff0f5; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
    '.sheet-sandbox-proof label { display: block; font-weight: 700; }',
    '.sheet-sandbox-proof .sheet-proof-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }',
    '.sheet-sandbox-proof .sheet-proof-actions button { margin: 0; }',
    '.sheet-rolltemplate-proof .sheet-proof-card { width: 280px; overflow: hidden; border: 2px solid #d96b91; border-radius: 6px; background: #fffafc; color: #3b2730; }',
    '.sheet-rolltemplate-proof .sheet-proof-title { padding: 10px 12px; background: #d96b91; color: #ffffff; font-size: 17px; font-weight: 700; }',
    '.sheet-rolltemplate-proof .sheet-proof-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; }',
    '.sheet-rolltemplate-proof .sheet-proof-row strong { color: #9f3158; font-size: 20px; }',
  ].join('\n'),
  'fixture-A/source.i18n': JSON.stringify({ name: 'Name', result: 'Result', mark: 'Mark' }),
  'fixture-A/manifest.json': JSON.stringify({
    id: 'fixture-A',
    synthetic: true,
    legacyMode: 'modern',
    sandboxPreparationExpectation: 'change',
  }),
  'fixture-B/source.html': [
    '<div class="sheet-layout-proof" style="width:760px;min-height:320px;padding:16px">',
    '  <div class="sheet-2colrow">',
    '    <div class="sheet-col">',
    '      <label data-i18n="name"></label>',
    '      <input type="text" name="attr_name" value="">',
    '      <textarea name="attr_notes" rows="3"></textarea>',
    '    </div>',
    '    <div class="sheet-col">',
    '      <label data-i18n="role"></label>',
    '      <select name="attr_role"><option value="one">One</option><option value="two">Two</option></select>',
    '      <table class="sheet-layout-table">',
    '        <thead><tr><th data-i18n="score"></th><th data-i18n="state"></th></tr></thead>',
    '        <tbody><tr><td><input type="number" name="attr_score" value="0"></td><td data-i18n="ready"></td></tr></tbody>',
    '      </table>',
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n'),
  'fixture-B/source.css': [
    '.sheet-layout-proof { background: #fffafc; border: 2px solid #d96b91; box-sizing: border-box; color: #3b2730; }',
    '.sheet-layout-proof .sheet-2colrow { display: flex; gap: 16px; align-items: flex-start; }',
    '.sheet-layout-proof .sheet-col { flex: 1 1 0; min-width: 0; }',
    '.sheet-layout-proof label { display: block; font-weight: 700; margin-bottom: 6px; }',
    '.sheet-layout-proof textarea, .sheet-layout-proof select { display: block; margin-top: 8px; }',
    '.sheet-layout-proof table { width: 100%; margin-top: 14px; border-collapse: collapse; }',
    '.sheet-layout-proof th, .sheet-layout-proof td { border: 1px solid #e7b5c6; padding: 4px; }',
  ].join('\n'),
  'fixture-B/source.i18n': JSON.stringify({
    name: 'Name',
    role: 'Role',
    score: 'Score',
    state: 'State',
    ready: 'Ready',
  }),
  'fixture-B/manifest.json': JSON.stringify({
    id: 'fixture-B',
    synthetic: true,
    legacyMode: 'modern',
    purpose: 'generic layout/control regression',
    sandboxPreparationExpectation: 'identity',
  }),
  'fixture-C/source.html': [
    '<div class="advanced-proof" style="width:680px;min-height:300px;padding:16px">',
    '  <input class="advanced-toggle" type="checkbox" name="attr_show_details" value="1" checked>',
    '  <label class="advanced-toggle-label" data-i18n="show_details"></label>',
    '  <section class="advanced-panel">',
    '    <div class="advanced-summary">',
    '      <h3 data-i18n="summary"></h3>',
    '      <ul class="advanced-list"><li data-i18n="first"></li><li data-i18n="second"></li></ul>',
    '    </div>',
    '    <fieldset class="repeating_items">',
    '      <div class="advanced-item-row">',
    '        <label data-i18n="item"></label>',
    '        <input type="text" name="attr_item_name" value="">',
    '        <select name="attr_item_rank"><option value="one">One</option><option value="two" selected>Two</option></select>',
    '      </div>',
    '    </fieldset>',
    '  </section>',
    '  <section class="advanced-closed" data-i18n="closed"></section>',
    '  <script>window.__syntheticPageScriptRan = true;</script>',
    '</div>',
  ].join('\n'),
  'fixture-C/source.css': [
    '.advanced-proof { --accent: #b94c78; container: synthetic-sheet / inline-size; background: #fffafc; border: 2px solid var(--accent); box-sizing: border-box; color: #3b2730; }',
    '.advanced-toggle { position: absolute; opacity: 0; pointer-events: none; }',
    '.advanced-toggle-label { display: inline-block; margin-bottom: 12px; color: var(--accent); font-weight: 700; }',
    '.advanced-toggle:not(:checked) ~ .advanced-panel { display: none; }',
    '.advanced-toggle:checked ~ .advanced-closed { display: none; }',
    '.advanced-list { margin: 0; padding-left: 20px; }',
    '.advanced-item-row { display: flex; align-items: center; gap: 8px; }',
    '@layer synthetic-components {',
    '  @supports (display: grid) {',
    '    .advanced-panel { display: grid; grid-template-columns: 1fr; gap: 14px; }',
    '  }',
    '}',
    '@container synthetic-sheet (min-width: 600px) {',
    '  .advanced-panel { grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); }',
    '}',
  ].join('\n'),
  'fixture-C/source.i18n': JSON.stringify({
    show_details: 'Show details',
    summary: 'Summary',
    first: 'First item',
    second: 'Second item',
    item: 'Repeating item',
    closed: 'Closed',
  }),
  'fixture-C/manifest.json': JSON.stringify({
    id: 'fixture-C',
    synthetic: true,
    legacyMode: 'modern',
    purpose: 'conditional state and nested CSS regression',
    sandboxPreparationExpectation: 'change',
    expected: {
      normal: {
        checkedControlNames: ['attr_show_details'],
        selectedControlValues: { attr_item_rank: 'two' },
        minimumTagCounts: { section: 2, fieldset: 1, ul: 1, li: 2 },
        visibleI18nKeys: ['show_details', 'summary', 'first', 'second'],
        hiddenI18nKeys: ['closed', 'item'],
        ordinaryScriptCount: 0,
      },
      sandbox: {
        checkedControlNames: ['attr_show_details'],
        selectedControlValues: { attr_item_rank: 'two' },
        minimumTagCounts: { fieldset: 1, ul: 1, li: 2 },
        maximumTagCounts: { section: 0 },
        visibleI18nKeys: ['show_details', 'summary', 'first', 'second'],
        hiddenI18nKeys: ['item'],
        absentI18nKeys: ['closed'],
        ordinaryScriptCount: 0,
      },
    },
  }),
  'fixture-D/source.html': [
    '<div class="form-state-proof" style="width:620px;min-height:260px;padding:16px">',
    '  <div class="form-state-radios">',
    '    <label><input type="radio" name="attr_mode" value="alpha">Alpha</label>',
    '    <label><input type="radio" name="attr_mode" value="beta" checked>Beta</label>',
    '  </div>',
    '  <label>Tags<select name="attr_tags" multiple size="3">',
    '    <option value="one" selected>One</option>',
    '    <option value="two">Two</option>',
    '    <option value="three" selected>Three</option>',
    '  </select></label>',
    '  <input type="text" name="attr_readonly" value="fixed" readonly>',
    '  <input type="text" name="attr_disabled" value="blocked" disabled>',
    '  <input type="text" name="attr_worker_probe" value="">',
    '  <input type="text" name="attr_worker_mode" value="">',
    '  <script type="text/worker">on(\'sheet:opened\', function () { setAttrs({ worker_probe: \'installed\' }); getAttrs([\'mode\'], function (values) { setAttrs({ worker_mode: values.mode }); }); });</script>',
    '</div>',
  ].join('\n'),
  'fixture-D/source.css': [
    '.form-state-proof { background: #fffafc; border: 2px solid #b94c78; box-sizing: border-box; color: #3b2730; }',
    '.form-state-radios { display: flex; gap: 12px; margin-bottom: 12px; }',
    '.form-state-proof select { display: block; margin: 6px 0 12px; }',
    '.form-state-proof input[type="text"] { display: block; margin-top: 8px; }',
  ].join('\n'),
  'fixture-D/source.i18n': '{}',
  'fixture-D/manifest.json': JSON.stringify({
    id: 'fixture-D',
    synthetic: true,
    legacyMode: 'modern',
    purpose: 'grouped and uncommon form-state regression',
    sandboxPreparationExpectation: 'change',
    expected: {
      normal: {
        checkedControlNames: ['attr_mode'],
        checkedControlValues: { attr_mode: ['beta'] },
        selectedControlValues: { attr_tags: 'one' },
        selectedOptionValues: { attr_tags: ['one', 'three'] },
        controlValues: {
          attr_mode: 'beta',
          attr_readonly: 'fixed',
          attr_disabled: 'blocked',
          attr_worker_probe: 'installed',
          attr_worker_mode: 'beta',
        },
        disabledControlNames: ['attr_disabled'],
        readOnlyControlNames: ['attr_readonly'],
        multipleControlNames: ['attr_tags'],
        minimumTagCounts: { select: 1, option: 3 },
        ordinaryScriptCount: 0,
        nonControlAttrNameCount: 0,
      },
      sandbox: {
        checkedControlNames: ['attr_mode'],
        checkedControlValues: { attr_mode: ['beta'] },
        selectedControlValues: { attr_tags: 'one' },
        selectedOptionValues: { attr_tags: ['one', 'three'] },
        controlValues: {
          attr_mode: 'beta',
          attr_readonly: 'fixed',
          attr_disabled: 'blocked',
          attr_worker_probe: 'installed',
          attr_worker_mode: 'beta',
        },
        disabledControlNames: ['attr_disabled'],
        readOnlyControlNames: ['attr_readonly'],
        multipleControlNames: ['attr_tags'],
        minimumTagCounts: { select: 1, option: 3 },
        ordinaryScriptCount: 0,
        nonControlAttrNameCount: 0,
      },
    },
  }),
  'fixture-E/source.html': [
    '<div class="option-group-proof" style="width:420px;min-height:180px;padding:16px">',
    '  <label>Role<select name="attr_role">',
    '    <optgroup label="Archived" disabled data-kind="history">',
    '      <option value="old">Old</option>',
    '    </optgroup>',
    '    <optgroup label="Current" class="active-group">',
    '      <option value="current" selected>Current</option>',
    '      <option value="future" data-hook="future">Future</option>',
    '    </optgroup>',
    '  </select></label>',
    '</div>',
  ].join('\n'),
  'fixture-E/source.css': [
    '.option-group-proof { background: #fffafc; border: 2px solid #b94c78; box-sizing: border-box; color: #3b2730; }',
    '.option-group-proof label { display: block; font-weight: 700; }',
    '.option-group-proof select { display: block; margin-top: 8px; min-width: 220px; }',
    '.option-group-proof .active-group { color: #9f3158; }',
  ].join('\n'),
  'fixture-E/source.i18n': '{}',
  'fixture-E/manifest.json': JSON.stringify({
    id: 'fixture-E',
    synthetic: true,
    legacyMode: 'modern',
    purpose: 'nested select option-group regression',
    sandboxPreparationExpectation: 'identity',
    expected: {
      normal: {
        selectedControlValues: { attr_role: 'current' },
        selectedOptionValues: { attr_role: ['current'] },
        controlValues: { attr_role: 'current' },
        optgroupLabels: ['Archived', 'Current'],
        disabledOptgroupLabels: ['Archived'],
        dataAttributeValues: { 'data-kind': ['history'], 'data-hook': ['future'] },
        minimumTagCounts: { select: 1, optgroup: 2, option: 3 },
        ordinaryScriptCount: 0,
        nonControlAttrNameCount: 0,
      },
      sandbox: {
        selectedControlValues: { attr_role: 'current' },
        selectedOptionValues: { attr_role: ['current'] },
        controlValues: { attr_role: 'current' },
        optgroupLabels: ['Archived', 'Current'],
        disabledOptgroupLabels: ['Archived'],
        dataAttributeValues: { 'data-kind': ['history'], 'data-hook': ['future'] },
        minimumTagCounts: { select: 1, optgroup: 2, option: 3 },
        ordinaryScriptCount: 0,
        nonControlAttrNameCount: 0,
      },
    },
  }),
  'fixture-F/source.html': [
    '<div class="asset-font-proof" style="width:560px;min-height:300px;padding:16px">',
    '  <label>Heat<input type="range" name="attr_heat" class="sheet-native-range" min="0" max="10" step="2" value="6" data-form-kind="range"></label>',
    '  <label>Tint<input type="color" name="attr_tint" value="#d96b91" disabled></label>',
    '  <label>Day<input type="date" name="attr_day" value="2026-08-03" readonly data-form-kind="date"></label>',
    '  <details open>',
    '    <summary>Advanced controls</summary>',
    '    <progress value="65" max="100">65%</progress>',
    '    <meter min="0" max="10" value="7">7/10</meter>',
    '    <output>Ready</output>',
    '  </details>',
    '  <span>Void<wbr class="sheet-break-probe" data-form-kind="void">break</span>',
    '  <img class="sheet-owned-pixel" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQMcAAAAASUVORK5CYII=" width="24" height="24" alt="Synthetic asset">',
    '  <div class="sheet-malformed-tail">CSS fallback probe</div>',
    '</div>',
  ].join('\n'),
  'fixture-F/source.css': [
    '@font-face { font-family: "Synthetic Local"; src: local("Arial"); font-style: normal; font-weight: 400; }',
    '@property --synthetic-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }',
    '@keyframes synthetic-pulse { from { opacity: 0.82; } to { opacity: 1; } }',
    '.asset-font-proof { --synthetic-angle: 0deg; background: #fffafc; border: 2px solid #b94c78; box-sizing: border-box; color: #3b2730; font-family: "Synthetic Local", Arial, sans-serif; }',
    '.asset-font-proof label { display: block; margin-bottom: 10px; }',
    '.asset-font-proof input { margin-left: 10px; }',
    '.asset-font-proof details { margin-top: 14px; padding: 10px; border: 1px solid #e7b5c6; }',
    '.asset-font-proof progress, .asset-font-proof meter, .asset-font-proof output { display: block; margin-top: 8px; }',
    '.asset-font-proof .sheet-owned-pixel { display: block; margin-top: 12px; background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQMcAAAAASUVORK5CYII="); image-rendering: pixelated; animation: synthetic-pulse 2s steps(1, end) infinite paused; animation-delay: -1s; }',
    '/* MALFORMED_CSS_PROBE */ @supports (display: grid) { .asset-font-proof .sheet-malformed-tail { color: #123456; }',
  ].join('\n'),
  'fixture-F/source.i18n': '{}',
  'fixture-F/manifest.json': JSON.stringify({
    id: 'fixture-F',
    synthetic: true,
    legacyMode: 'modern',
    purpose: 'native input, local asset, font, animation, and raw CSS fallback regression',
    sandboxPreparationExpectation: 'change',
    expectedEmit: {
      htmlIncludes: [
        'type="range"',
        'type="color"',
        'type="date"',
        '<details',
        '<progress',
        '<meter',
        '<wbr',
        'data-form-kind="range"',
        'data-form-kind="void"',
      ],
      htmlExcludes: ['</input>'],
      cssIncludes: [
        '@font-face',
        '@property --synthetic-angle',
        '@keyframes synthetic-pulse',
        'data:image/png;base64,',
        '@supports (display: grid)',
        '#123456',
      ],
    },
    expected: {
      normal: {
        controlValues: {
          attr_heat: '6',
          attr_tint: '#d96b91',
          attr_day: '2026-08-03',
        },
        disabledControlNames: ['attr_tint'],
        readOnlyControlNames: ['attr_day'],
        dataAttributeValues: { 'data-form-kind': ['date', 'range', 'void'] },
        minimumTagCounts: {
          input: 3,
          details: 1,
          summary: 1,
          progress: 1,
          meter: 1,
          output: 1,
          wbr: 1,
          img: 1,
        },
        visibleTextFragments: ['Advanced controls', 'Ready'],
        ordinaryScriptCount: 0,
        nonControlAttrNameCount: 0,
      },
      sandbox: {
        controlValues: {
          attr_heat: '6',
          attr_tint: '#d96b91',
          attr_day: '2026-08-03',
        },
        disabledControlNames: ['attr_tint'],
        readOnlyControlNames: ['attr_day'],
        dataAttributeValues: { 'data-form-kind': ['date', 'range'] },
        minimumTagCounts: { input: 3, img: 1 },
        maximumTagCounts: { details: 0, summary: 0, progress: 0, meter: 0, output: 0, wbr: 0 },
        visibleTextFragments: ['Advanced controls', 'Ready'],
        ordinaryScriptCount: 0,
        nonControlAttrNameCount: 0,
      },
    },
  }),
  'fixture-G/source.html': [
    '<div class="sheet-repeating-runtime-proof" style="width:700px;min-height:340px;padding:16px">',
    '  <h3 data-i18n="runtime_title"></h3>',
    '  <input type="hidden" name="attr_repeat_ready" value="no">',
    '  <input type="hidden" name="attr_repeat_context_name" value="">',
    '  <input type="hidden" name="attr_repeat_context_qty" value="">',
    '  <input type="hidden" name="attr_repeat_order_value" value="">',
    '  <input type="hidden" name="attr_repeat_order_source" value="">',
    '  <input type="hidden" name="attr_repeat_remove_source" value="">',
    '  <div class="sheet-repeating-grid">',
    '    <section class="sheet-repeating-pane sheet-primary-view">',
    '      <h4 data-i18n="primary_view"></h4>',
    '      <fieldset class="repeating_items">',
    '        <div class="sheet-runtime-row">',
    '          <label><span data-i18n="item_name"></span><input type="text" name="attr_item_name" value="New item"></label>',
    '          <label><span data-i18n="item_qty"></span><input type="number" name="attr_item_qty" value="1"></label>',
    '        </div>',
    '      </fieldset>',
    '    </section>',
    '    <section class="sheet-repeating-pane sheet-summary-view">',
    '      <h4 data-i18n="summary_view"></h4>',
    '      <fieldset class="repeating_items">',
    '        <div class="sheet-runtime-row sheet-summary-row">',
    '          <label><span data-i18n="item_name"></span><input type="text" name="attr_item_name" value="New item" readonly></label>',
    '          <label><span data-i18n="item_qty"></span><input type="number" name="attr_item_qty" value="1" readonly></label>',
    '          <label><span data-i18n="item_total"></span><input type="number" name="attr_item_total" value="2" readonly></label>',
    '        </div>',
    '      </fieldset>',
    '    </section>',
    '  </div>',
    '  <script type="text/worker">',
    '    on("sheet:opened", function () {',
    '      getSectionIDs("repeating_items", function (ids) {',
    '        if (ids.length > 0) { setAttrs({ repeat_ready: "yes" }, { silent: true }); return; }',
    '        var first = generateRowID();',
    '        var second = generateRowID();',
    '        var initial = {};',
    '        initial["repeating_items_" + first + "_item_name"] = "First item";',
    '        initial["repeating_items_" + first + "_item_qty"] = "1";',
    '        initial["repeating_items_" + first + "_item_total"] = "2";',
    '        initial["repeating_items_" + second + "_item_name"] = "Second item";',
    '        initial["repeating_items_" + second + "_item_qty"] = "2";',
    '        initial["repeating_items_" + second + "_item_total"] = "4";',
    '        setAttrs(initial, function () { setAttrs({ repeat_ready: "yes" }, { silent: true }); });',
    '      });',
    '    });',
    '    on("change:repeating_items:item_qty", function () {',
    '      getAttrs(["repeating_items_item_name", "repeating_items_item_qty"], function (values) {',
    '        setAttrs({',
    '          repeat_context_name: values.repeating_items_item_name,',
    '          repeat_context_qty: values.repeating_items_item_qty,',
    '          repeating_items_item_total: parseInt(values.repeating_items_item_qty || "0", 10) * 2',
    '        }, { silent: true });',
    '      });',
    '    });',
    '    on("change:_reporder:items", function (eventInfo) {',
    '      getAttrs(["_reporder_repeating_items"], function (values) {',
    '        setAttrs({ repeat_order_value: values._reporder_repeating_items, repeat_order_source: eventInfo.sourceType }, { silent: true });',
    '      });',
    '    });',
    '    on("remove:repeating_items", function (eventInfo) {',
    '      setAttrs({ repeat_remove_source: eventInfo.sourceType }, { silent: true });',
    '    });',
    '  </script>',
    '</div>',
  ].join('\n'),
  'fixture-G/source.css': [
    '.sheet-repeating-runtime-proof { background: #fffafc; border: 2px solid #b94c78; box-sizing: border-box; color: #3b2730; }',
    '.sheet-repeating-runtime-proof h3 { margin: 0 0 14px; color: #9f3158; }',
    '.sheet-repeating-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }',
    '.sheet-repeating-pane { min-width: 0; padding: 12px; border: 1px solid #e7b5c6; background: #ffffff; }',
    '.sheet-repeating-pane h4 { margin: 0 0 10px; }',
    '.sheet-runtime-row { display: grid; grid-template-columns: minmax(0, 1fr) 76px; gap: 8px; align-items: end; margin-bottom: 8px; }',
    '.sheet-summary-row { grid-template-columns: minmax(0, 1fr) 62px 62px; }',
    '.sheet-runtime-row label, .sheet-runtime-row span { display: block; min-width: 0; }',
    '.sheet-runtime-row input { box-sizing: border-box; width: 100%; margin: 4px 0 0; }',
  ].join('\n'),
  'fixture-G/source.i18n': JSON.stringify({
    runtime_title: 'Repeating runtime',
    primary_view: 'Editable rows',
    summary_view: 'Shared summary',
    item_name: 'Name',
    item_qty: 'Qty',
    item_total: 'Total',
  }),
  'fixture-G/manifest.json': JSON.stringify({
    id: 'fixture-G',
    synthetic: true,
    legacyMode: 'modern',
    purpose: 'duplicate repeating views, row context, and reorder regression',
    sandboxPreparationExpectation: 'change',
    expected: {
      normal: {
        controlValues: { attr_repeat_ready: 'yes' },
        minimumTagCounts: { fieldset: 2, section: 2, input: 16 },
        visibleI18nKeys: ['runtime_title', 'primary_view', 'summary_view', 'item_name', 'item_qty', 'item_total'],
        visibleTextFragments: ['Repeating runtime'],
        ordinaryScriptCount: 0,
      },
      sandbox: {
        controlValues: { attr_repeat_ready: 'yes' },
        minimumTagCounts: { fieldset: 2, input: 16 },
        maximumTagCounts: { section: 0 },
        visibleI18nKeys: ['runtime_title', 'primary_view', 'summary_view', 'item_name', 'item_qty', 'item_total'],
        visibleTextFragments: ['Repeating runtime'],
        ordinaryScriptCount: 0,
      },
    },
    actualInteraction: {
      repeatingGroup: 'repeating_items',
      duplicateInstances: 2,
      initialRowsPerInstance: 2,
      expectedNames: ['First item', 'Second item'],
      quantityChange: { rowName: 'Second item', value: '3', expectedTotal: '6' },
      reorderEvent: 'change:_reporder:items',
      removalEvent: 'remove:repeating_items',
    },
  }),
};

async function main() {
  if (selfTest) {
    if (!files['fixture-A/source.html'].includes('sheet-sandbox-proof')) {
      throw new Error('synthetic HTML marker missing');
    }
    if (!files['fixture-A/source.html'].includes('type="text/worker"')) {
      throw new Error('synthetic worker marker missing');
    }
    if (!files['fixture-A/source.html'].includes('<rolltemplate')) {
      throw new Error('synthetic Rolltemplate marker missing');
    }
    if (!files['fixture-A/source.html'].includes('&amp;{template:proof}')) {
      throw new Error('synthetic Roll button template marker missing');
    }
    if (!files['fixture-A/source.html'].includes('type="action" name="act_mark"')) {
      throw new Error('synthetic action button marker missing');
    }
    if (!files['fixture-A/source.html'].includes("on('clicked:mark'")) {
      throw new Error('synthetic action worker event missing');
    }
    if (!files['fixture-A/source.css'].includes('#fff0f5')) {
      throw new Error('synthetic CSS marker missing');
    }
    if (JSON.parse(files['fixture-A/source.i18n']).name !== 'Name') {
      throw new Error('synthetic translation marker missing');
    }
    if (JSON.parse(files['fixture-A/source.i18n']).result !== 'Result') {
      throw new Error('synthetic Rolltemplate translation marker missing');
    }
    if (JSON.parse(files['fixture-A/source.i18n']).mark !== 'Mark') {
      throw new Error('synthetic action translation marker missing');
    }
    if (JSON.parse(files['fixture-A/manifest.json']).synthetic !== true) {
      throw new Error('synthetic manifest marker missing');
    }
    if (!files['fixture-B/source.html'].includes('sheet-2colrow')) {
      throw new Error('layout fixture row marker missing');
    }
    if (!files['fixture-B/source.html'].includes('<table')) {
      throw new Error('layout fixture table marker missing');
    }
    if (!files['fixture-B/source.html'].includes('textarea')) {
      throw new Error('layout fixture textarea marker missing');
    }
    if (JSON.parse(files['fixture-B/source.i18n']).ready !== 'Ready') {
      throw new Error('layout fixture translation marker missing');
    }
    if (!files['fixture-C/source.html'].includes('checked')) {
      throw new Error('conditional fixture default state missing');
    }
    if (!files['fixture-C/source.html'].includes('repeating_items')) {
      throw new Error('conditional fixture repeating section missing');
    }
    if (!files['fixture-C/source.html'].includes('<script>')) {
      throw new Error('conditional fixture page script missing');
    }
    if (!files['fixture-C/source.css'].includes('@layer synthetic-components')) {
      throw new Error('conditional fixture layer at-rule missing');
    }
    if (!files['fixture-C/source.css'].includes('@supports (display: grid)')) {
      throw new Error('conditional fixture supports at-rule missing');
    }
    if (!files['fixture-C/source.css'].includes('@container synthetic-sheet')) {
      throw new Error('conditional fixture container at-rule missing');
    }
    if (JSON.parse(files['fixture-C/source.i18n']).closed !== 'Closed') {
      throw new Error('conditional fixture translation marker missing');
    }
    const conditionalManifest = JSON.parse(files['fixture-C/manifest.json']);
    if (conditionalManifest.expected.normal.selectedControlValues.attr_item_rank !== 'two') {
      throw new Error('conditional fixture selected value expectation missing');
    }
    if (!conditionalManifest.expected.normal.hiddenI18nKeys.includes('closed')) {
      throw new Error('conditional fixture hidden translation expectation missing');
    }
    if (!conditionalManifest.expected.sandbox.absentI18nKeys.includes('closed')) {
      throw new Error('conditional fixture Sandbox tag-strip expectation missing');
    }
    const expectationFailures = fixtureExpectationFailures(
      {
        checkedControlNames: ['attr_show_details'],
        selectedControlValues: { attr_item_rank: 'two' },
        tagCounts: { section: 2, fieldset: 1, ul: 1, li: 2 },
        ordinaryScriptCount: 0,
      },
      conditionalManifest.expected.normal,
      {
        visibleKeys: ['show_details', 'summary', 'first', 'second'],
        hiddenKeys: ['closed', 'item'],
      },
    );
    if (expectationFailures.length > 0) {
      throw new Error(`fixture expectation helper rejected valid state: ${expectationFailures.join(', ')}`);
    }
    if (fixtureExpectationFailures({}, conditionalManifest.expected.normal).length === 0) {
      throw new Error('fixture expectation helper accepted invalid state');
    }
    if (!files['fixture-D/source.html'].includes("getAttrs(['mode']")) {
      throw new Error('grouped form fixture worker probe missing');
    }
    const formManifest = JSON.parse(files['fixture-D/manifest.json']);
    const formExpectationFailures = fixtureExpectationFailures({
      checkedControlNames: ['attr_mode'],
      checkedControlValues: { attr_mode: ['beta'] },
      selectedControlValues: { attr_tags: 'one' },
      selectedOptionValues: { attr_tags: ['one', 'three'] },
      controlValues: {
        attr_mode: 'beta',
        attr_readonly: 'fixed',
        attr_disabled: 'blocked',
        attr_worker_probe: 'installed',
        attr_worker_mode: 'beta',
      },
      disabledControlNames: ['attr_disabled'],
      readOnlyControlNames: ['attr_readonly'],
      multipleControlNames: ['attr_tags'],
      tagCounts: { select: 1, option: 3 },
      ordinaryScriptCount: 0,
      nonControlAttrNameCount: 0,
    }, formManifest.expected.normal);
    if (formExpectationFailures.length > 0) {
      throw new Error(`grouped form expectation helper rejected valid state: ${formExpectationFailures.join(', ')}`);
    }
    if (!files['fixture-E/source.html'].includes('<optgroup')) {
      throw new Error('option group fixture structure missing');
    }
    for (const fixtureId of ['fixture-B', 'fixture-E']) {
      const manifest = JSON.parse(files[`${fixtureId}/manifest.json`]);
      if (manifest.sandboxPreparationExpectation !== 'identity') {
        throw new Error(`${fixtureId} must prove identity-safe Sandbox preparation`);
      }
    }
    const optionGroupManifest = JSON.parse(files['fixture-E/manifest.json']);
    const optionGroupExpectationFailures = fixtureExpectationFailures({
      selectedControlValues: { attr_role: 'current' },
      selectedOptionValues: { attr_role: ['current'] },
      controlValues: { attr_role: 'current' },
      optgroupLabels: ['Archived', 'Current'],
      disabledOptgroupLabels: ['Archived'],
      dataAttributeValues: { 'data-kind': ['history'], 'data-hook': ['future'] },
      tagCounts: { select: 1, optgroup: 2, option: 3 },
      ordinaryScriptCount: 0,
      nonControlAttrNameCount: 0,
    }, optionGroupManifest.expected.normal);
    if (optionGroupExpectationFailures.length > 0) {
      throw new Error(`option group expectation helper rejected valid state: ${optionGroupExpectationFailures.join(', ')}`);
    }
    if (!files['fixture-F/source.html'].includes('type="range"')) {
      throw new Error('native input fixture range control missing');
    }
    if (!files['fixture-F/source.html'].includes('data:image/png;base64,')) {
      throw new Error('native input fixture local asset missing');
    }
    if (!files['fixture-F/source.css'].includes('@font-face')) {
      throw new Error('native input fixture font face missing');
    }
    if (!files['fixture-F/source.css'].includes('@keyframes synthetic-pulse')) {
      throw new Error('native input fixture animation missing');
    }
    if (!files['fixture-F/source.css'].includes('MALFORMED_CSS_PROBE')) {
      throw new Error('native input fixture raw CSS fallback probe missing');
    }
    const nativeInputManifest = JSON.parse(files['fixture-F/manifest.json']);
    const nativeInputExpectationFailures = fixtureExpectationFailures({
      controlValues: {
        attr_heat: '6',
        attr_tint: '#d96b91',
        attr_day: '2026-08-03',
      },
      disabledControlNames: ['attr_tint'],
      readOnlyControlNames: ['attr_day'],
      dataAttributeValues: { 'data-form-kind': ['date', 'range', 'void'] },
      tagCounts: { input: 3, details: 1, summary: 1, progress: 1, meter: 1, output: 1, wbr: 1, img: 1 },
      visibleText: 'Advanced controls Ready',
      ordinaryScriptCount: 0,
      nonControlAttrNameCount: 0,
    }, nativeInputManifest.expected.normal);
    if (nativeInputExpectationFailures.length > 0) {
      throw new Error(`native input expectation helper rejected valid state: ${nativeInputExpectationFailures.join(', ')}`);
    }
    const repeatingHtml = files['fixture-G/source.html'];
    if ((repeatingHtml.match(/<fieldset class="repeating_items">/g) ?? []).length !== 2) {
      throw new Error('shared repeating fixture duplicate fieldsets missing');
    }
    if (!repeatingHtml.includes('repeating_items_item_total')) {
      throw new Error('shared repeating fixture row-context write missing');
    }
    if (!repeatingHtml.includes('change:_reporder:items')) {
      throw new Error('shared repeating fixture reorder event missing');
    }
    const repeatingManifest = JSON.parse(files['fixture-G/manifest.json']);
    if (repeatingManifest.actualInteraction?.duplicateInstances !== 2) {
      throw new Error('shared repeating fixture interaction contract missing');
    }
    console.log('VISUAL SYNTHETIC FIXTURE SELF-TEST PASS');
    return;
  }

  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(outDir, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, `${content}\n`, 'utf8');
  }
  await writeFile(
    path.join(outDir, 'synthetic-meta.json'),
    `${JSON.stringify({ synthetic: true, fixtureIds: ['fixture-A', 'fixture-B', 'fixture-C', 'fixture-D', 'fixture-E', 'fixture-F', 'fixture-G'], files: Object.keys(files) }, null, 2)}\n`,
    'utf8',
  );
  console.log(`VISUAL SYNTHETIC FIXTURE GENERATED ${outDir}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Diagnose Roll20 actual state visibility versus local selector-prefix
 * assumptions.
 *
 * This consumes ignored live iframe probes captured from the dedicated Roll20
 * Custom Sheet Sandbox. It does not log into Roll20, does not mutate rooms, and
 * does not prove visual parity. Its job is to make state/prefix mismatches
 * visible before preview/export sanitizer code is changed.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_state_visibility_diagnostics.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const outDir = path.join(runDir, 'state-visibility-diagnostics');
const probeDir = path.join(runDir, 'live-iframe-probe');
const localBaselineDir = path.join(runDir, 'local-baseline');
const repoRoot = process.cwd();

async function main() {
  const fixtureIds = await discoverFixtureIds();
  const fixtures = [];
  const browser = await chromium.launch({ headless: true });
  try {
    for (const fixtureId of fixtureIds) {
      fixtures.push(await analyzeFixture(fixtureId, browser));
    }
  } finally {
    await browser.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'local-only Roll20 state visibility diagnostics; not visual parity',
    pass: true,
    summary: {
      compared: fixtures.filter((fixture) => fixture.status === 'COMPARED').length,
      skipped: fixtures.filter((fixture) => fixture.status === 'SKIP').length,
      roll20VisualParity: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'state-visibility-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'state-visibility-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    if (fixture.status === 'SKIP') {
      console.log(`SKIP ${fixture.fixtureId} ${fixture.reason}`);
      continue;
    }
    console.log(`${fixture.status} ${fixture.fixtureId} state=${fixture.stateSummary.sheetTab ?? ''} visiblePanels=${fixture.actualVisiblePanels.length} issue=${fixture.primaryFinding}`);
  }
  console.log(`ROLL20 STATE VISIBILITY DIAGNOSTICS OK ${outDir}`);
}

async function discoverFixtureIds() {
  if (!existsSync(probeDir)) return [];
  const { readdir } = await import('node:fs/promises');
  const ids = new Set();
  for (const name of await readdir(probeDir)) {
    const match = /^(.*)-state-visibility\.json$/.exec(name);
    if (match) ids.add(match[1]);
  }
  return [...ids].sort();
}

async function analyzeFixture(fixtureId, browser) {
  const stateFile = path.join(probeDir, `${fixtureId}-state-visibility.json`);
  const rulesFile = path.join(probeDir, `${fixtureId}-css-state-rules.json`);
  const payloadHtmlFile = path.join(localBaselineDir, fixtureId, 'payload', 'sheet.html');
  const payloadCssFile = path.join(localBaselineDir, fixtureId, 'payload', 'sheet.css');

  if (!existsSync(stateFile) || !existsSync(rulesFile)) {
    return {
      fixtureId,
      status: 'SKIP',
      reason: 'missing actual state visibility or CSS state rule probe',
    };
  }

  const stateProbe = await readJsonRequired(stateFile);
  const ruleProbe = await readJsonRequired(rulesFile);
  const payloadHtml = await readTextIfExists(payloadHtmlFile);
  const payloadCss = await readTextIfExists(payloadCssFile);

  const stateSummary = summarizeState(stateProbe);
  const actualVisiblePanels = summarizePanels(stateProbe, ruleProbe);
  const actualStateRules = summarizeStateRules(stateProbe, ruleProbe);
  const payloadStateSelectors = summarizePayloadSelectors(payloadCss);
  const payloadClasses = summarizePayloadClasses(payloadHtml);
  const localExpectedCssMode = await detectLocalExpectedCssMode();
  const localExpectedVisibility = await compareLocalExpectedVisibility({
    browser,
    payloadHtml,
    payloadCss,
    actualVisiblePanels,
  });
  const prefixMismatch = diagnosePrefixMismatch({
    actualStateRules,
    payloadStateSelectors,
    payloadClasses,
    actualVisiblePanels,
  });

  return {
    fixtureId,
    status: 'COMPARED',
    capturedAt: {
      state: stateProbe.capturedAt ?? null,
      rules: ruleProbe.capturedAt ?? null,
    },
    stateSummary,
    actualVisiblePanels,
    actualStateRules,
    payloadStateSelectors,
    payloadClasses,
    prefixMismatch,
    primaryFinding: prefixMismatch.kind,
    localExpectedCssMode,
    localExpectedVisibility,
    interpretation: buildInterpretation({
      stateSummary,
      actualVisiblePanels,
      actualStateRules,
      payloadStateSelectors,
      payloadClasses,
      prefixMismatch,
      localExpectedCssMode,
      localExpectedVisibility,
    }),
    nextChecks: buildNextChecks(prefixMismatch, localExpectedCssMode, localExpectedVisibility),
  };
}

async function compareLocalExpectedVisibility({ browser, payloadHtml, payloadCss, actualVisiblePanels }) {
  if (!payloadHtml && !payloadCss) {
    return {
      status: 'SKIP',
      reason: 'missing payload HTML/CSS',
      matched: false,
    };
  }
  const selectors = [...new Set(actualVisiblePanels.map((panel) => panel.selector).filter(Boolean))];
  if (!selectors.length) {
    return {
      status: 'SKIP',
      reason: 'actual probe did not include visible panel selectors',
      matched: false,
    };
  }

  const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
  try {
    await page.setContent(buildLocalExpectedStateDoc(payloadHtml, payloadCss), { waitUntil: 'load' });
    const actualBySelector = new Map(actualVisiblePanels.map((panel) => [panel.selector, panel]));
    const localPanels = await page.evaluate((panelSelectors) => {
      return panelSelectors.map((selector) => {
        const node = document.querySelector(selector);
        if (!node) {
          return {
            selector,
            exists: false,
            display: null,
            visibility: null,
            height: null,
            visible: false,
          };
        }
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          selector,
          exists: true,
          className: node.getAttribute('class') ?? '',
          display: style.display,
          visibility: style.visibility,
          height: Number(rect.height.toFixed(3)),
          visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0,
        };
      });
    }, selectors);
    for (const panel of localPanels) {
      const actual = actualBySelector.get(panel.selector);
      panel.actualHeight = actual?.height ?? null;
      panel.heightDelta = typeof actual?.height === 'number' && typeof panel.height === 'number'
        ? Number((panel.height - actual.height).toFixed(3))
        : null;
    }

    const actualVisibleSelectors = selectors;
    const localVisibleSelectors = localPanels.filter((panel) => panel.visible).map((panel) => panel.selector);
    const localVisibleSet = new Set(localVisibleSelectors);
    const actualVisibleSet = new Set(actualVisibleSelectors);
    const missingLocally = actualVisibleSelectors.filter((selector) => !localVisibleSet.has(selector));
    const extraLocally = localVisibleSelectors.filter((selector) => !actualVisibleSet.has(selector));
    return {
      status: 'COMPARED',
      matched: missingLocally.length === 0 && extraLocally.length === 0,
      actualVisibleCount: actualVisibleSelectors.length,
      localVisibleCount: localVisibleSelectors.length,
      missingLocally,
      extraLocally,
      panels: localPanels,
      largestHeightDeltas: [...localPanels]
        .filter((panel) => typeof panel.heightDelta === 'number')
        .sort((a, b) => Math.abs(b.heightDelta) - Math.abs(a.heightDelta))
        .slice(0, 5)
        .map((panel) => ({
          selector: panel.selector,
          actualHeight: panel.actualHeight,
          localHeight: panel.height,
          heightDelta: panel.heightDelta,
        })),
    };
  } finally {
    await page.close();
  }
}

function buildLocalExpectedStateDoc(payloadHtml, payloadCss) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html, body { margin: 0; padding: 0; background: transparent; }
.ui-dialog .charsheet { box-sizing: content-box; font-size: 13px; line-height: 18.5714px; background: transparent; }
${payloadCss}
</style>
</head>
<body>
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all" id="dialog-window">
  <div class="dialog largedialog characterviewer">
    <div class="tab-content" id="tab-content">
      <form class="sheetform">
        <div class="charactersheet tab-pane active charsheet lang-undefined" id="charsheet-root">
${payloadHtml}
        </div>
      </form>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function detectLocalExpectedCssMode() {
  const files = [
    path.join(repoRoot, 'lib', 'preview', 'buildDoc.ts'),
    path.join(repoRoot, 'components', 'editor', 'ExportDialog.tsx'),
    path.join(repoRoot, 'scripts', 'roll20_sandbox_sanitize_audit.mjs'),
  ];
  const evidence = [];
  for (const file of files) {
    const text = await readTextIfExists(file);
    evidence.push({
      file: path.relative(repoRoot, file),
      prefixSelectorsFalse: /sanitizeRoll20SandboxCss\([^)]*prefixSelectors:\s*false/s.test(text),
    });
  }
  const previewUsesUnprefixedCss = evidence.some((item) => item.file === path.join('lib', 'preview', 'buildDoc.ts') && item.prefixSelectorsFalse);
  return {
    previewUsesUnprefixedCss,
    evidence,
  };
}

function summarizeState(stateProbe) {
  const inputs = stateProbe.inputs ?? {};
  const sheetTab = firstInputValue(inputs.sheetTab);
  const sheetTabForBtn = firstInputValue(inputs.sheetTabForBtn);
  return {
    sheetTab,
    sheetTabForBtn,
    inputs: {
      sheetTab: summarizeInputList(inputs.sheetTab),
      sheetTabForBtn: summarizeInputList(inputs.sheetTabForBtn),
    },
    rootRect: stateProbe.rootRect ?? null,
  };
}

function firstInputValue(items) {
  const item = Array.isArray(items) ? items[0] : null;
  return item?.propertyValue ?? item?.attrValue ?? null;
}

function summarizeInputList(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    name: item.name,
    className: item.className,
    attrValue: item.attrValue,
    propertyValue: item.propertyValue,
    type: item.type,
    display: item.cssDisplay,
  }));
}

function summarizePanels(stateProbe, ruleProbe) {
  const bySelector = new Map();
  for (const panel of stateProbe.panels ?? []) {
    if (panel?.selector) bySelector.set(panel.selector, panel);
  }
  for (const panel of ruleProbe.panels ?? []) {
    if (panel?.selector) bySelector.set(panel.selector, { ...bySelector.get(panel.selector), ...panel });
  }
  return [...bySelector.values()]
    .filter((panel) => panel && panel.display !== 'none' && panel.visibility !== 'hidden')
    .map((panel) => ({
      selector: panel.selector,
      className: panel.className,
      display: panel.display,
      visibility: panel.visibility,
      height: round(panel.rect?.h),
      matchedRulesCount: Array.isArray(panel.matchedRules) ? panel.matchedRules.length : null,
    }));
}

function summarizeStateRules(stateProbe, ruleProbe) {
  const rules = [];
  for (const text of stateProbe.matchingRules ?? []) {
    rules.push({ selectorText: extractSelectorText(text), source: 'state-visibility.matchingRules' });
  }
  for (const rule of ruleProbe.rules ?? []) {
    const selectorText = rule.selectorText ?? extractSelectorText(rule.cssText ?? '');
    if (isLikelyStateRule(selectorText)) {
      rules.push({
        selectorText,
        display: rule.style?.display ?? '',
        visibility: rule.style?.visibility ?? '',
        source: 'css-state-rules.rules',
      });
    }
  }

  const unique = [];
  const seen = new Set();
  for (const rule of rules) {
    const key = rule.selectorText;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({
      ...rule,
      classSelectors: classSelectors(rule.selectorText),
      hasSheetPrefixedStateAnchor: /\.sheet-tabstoggle(?:forbtn)?\b/.test(rule.selectorText),
      hasUnprefixedStateAnchor: /\.tabstoggle(?:forbtn)?\b/.test(rule.selectorText),
    });
  }
  return unique;
}

function summarizePayloadSelectors(css) {
  if (!css) {
    return {
      present: false,
      stateRules: [],
    };
  }
  const stateRules = [];
  for (const match of css.matchAll(/([^{}]+){([^{}]*)}/g)) {
    const selectorText = match[1].trim();
    if (!isLikelyStateRule(selectorText)) continue;
    stateRules.push({
      selectorText,
      display: /display\s*:\s*([^;]+)/i.exec(match[2])?.[1]?.trim() ?? '',
      classSelectors: classSelectors(selectorText),
      hasSheetPrefixedStateAnchor: /\.sheet-tabstoggle(?:forbtn)?\b/.test(selectorText),
      hasUnprefixedStateAnchor: /\.tabstoggle(?:forbtn)?\b/.test(selectorText),
    });
  }
  return {
    present: true,
    stateRules,
  };
}

function summarizePayloadClasses(html) {
  if (!html) {
    return {
      present: false,
      classTokens: [],
      stateAnchorClasses: [],
      panelClasses: [],
    };
  }
  const tokens = new Set();
  for (const match of html.matchAll(/\bclass=(["'])(.*?)\1/gi)) {
    for (const token of match[2].split(/\s+/).filter(Boolean)) tokens.add(token);
  }
  const classTokens = [...tokens].sort();
  return {
    present: true,
    classTokens,
    stateAnchorClasses: classTokens.filter((token) => /^(sheet-)?tabstoggle/.test(token)),
    panelClasses: classTokens.filter((token) => ['sheet-character', 'sheet-skills', 'sheet-combat', 'sheet-equipment_and_spells', 'sheet-journal'].includes(token)),
  };
}

function diagnosePrefixMismatch({ actualStateRules, payloadStateSelectors, payloadClasses, actualVisiblePanels }) {
  const actualHasUnprefixedRules = actualStateRules.some((rule) => rule.hasUnprefixedStateAnchor);
  const actualHasSheetAnchorRules = actualStateRules.some((rule) => rule.hasSheetPrefixedStateAnchor);
  const payloadHasUnprefixedRules = payloadStateSelectors.stateRules.some((rule) => rule.hasUnprefixedStateAnchor);
  const payloadHasSheetAnchorRules = payloadStateSelectors.stateRules.some((rule) => rule.hasSheetPrefixedStateAnchor);
  const htmlHasSheetAnchors = payloadClasses.stateAnchorClasses.some((token) => token.startsWith('sheet-'));
  const visiblePanelsWithNoMatchedRules = actualVisiblePanels.filter((panel) => panel.matchedRulesCount === 0);

  if (actualHasUnprefixedRules && !actualHasSheetAnchorRules && htmlHasSheetAnchors && visiblePanelsWithNoMatchedRules.length > 0) {
    return {
      kind: 'ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML',
      severity: 'P0',
      actualHasUnprefixedRules,
      actualHasSheetAnchorRules,
      payloadHasUnprefixedRules,
      payloadHasSheetAnchorRules,
      htmlHasSheetAnchors,
      visiblePanelsWithNoMatchedRules: visiblePanelsWithNoMatchedRules.map((panel) => panel.selector),
    };
  }

  return {
    kind: 'NO_CONFIRMED_PREFIX_MISMATCH',
    severity: 'VERIFY',
    actualHasUnprefixedRules,
    actualHasSheetAnchorRules,
    payloadHasUnprefixedRules,
    payloadHasSheetAnchorRules,
    htmlHasSheetAnchors,
    visiblePanelsWithNoMatchedRules: visiblePanelsWithNoMatchedRules.map((panel) => panel.selector),
  };
}

function buildInterpretation({ stateSummary, actualVisiblePanels, actualStateRules, payloadStateSelectors, payloadClasses, prefixMismatch, localExpectedCssMode, localExpectedVisibility }) {
  const notes = [];
  if (stateSummary.sheetTab || stateSummary.sheetTabForBtn) {
    notes.push(`actual hidden state inputs are sheetTab=${stateSummary.sheetTab ?? 'unknown'} / sheetTabForBtn=${stateSummary.sheetTabForBtn ?? 'unknown'}`);
  }
  if (actualVisiblePanels.length) {
    notes.push(`actual Roll20 still displays ${actualVisiblePanels.length} sampled panels/sections`);
  }
  if (actualStateRules.some((rule) => rule.hasUnprefixedStateAnchor)) {
    notes.push('actual CSSOM contains unprefixed state anchors such as `.tabstoggle[...]`');
  }
  if (!actualStateRules.some((rule) => rule.hasSheetPrefixedStateAnchor)) {
    notes.push('actual CSSOM probe did not find `.sheet-tabstoggle[...]` state anchors');
  }
  if (payloadClasses.stateAnchorClasses.length) {
    notes.push(`payload HTML state anchors are ${payloadClasses.stateAnchorClasses.join(', ')}`);
  }
  if (payloadStateSelectors.stateRules.length) {
    const kinds = payloadStateSelectors.stateRules.map((rule) => rule.hasSheetPrefixedStateAnchor ? 'sheet-prefixed' : rule.hasUnprefixedStateAnchor ? 'unprefixed' : 'other');
    notes.push(`payload CSS state rules are ${[...new Set(kinds)].join(', ')}`);
  }
  if (prefixMismatch.kind === 'ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML') {
    if (localExpectedCssMode.previewUsesUnprefixedCss) {
      notes.push('local Roll20 Sandbox expected preview already keeps CSS selectors unprefixed, so this diagnostic is now an actual Roll20 state-behavior finding to reverify across fixtures rather than a request to re-add blanket CSS prefixing');
    } else {
      notes.push('root cause hypothesis: Roll20 actual uploaded HTML is sheet-prefixed while the observed CSS state selectors remain unprefixed, so local auto-prefix/sandbox expected preview can hide/show panels differently than actual Roll20');
    }
  }
  if (localExpectedVisibility?.status === 'COMPARED') {
    notes.push(`local Sandbox expected wrapper shows ${localExpectedVisibility.localVisibleCount}/${localExpectedVisibility.actualVisibleCount} of the actual-visible sampled panels`);
    if (localExpectedVisibility.matched) {
      notes.push('local Sandbox expected panel visibility matches the captured actual visible panel set for this sample; remaining mismatch should be treated as geometry/assets/control styling until another fixture disproves it');
    } else {
      notes.push('local Sandbox expected panel visibility does not match the captured actual visible panel set; inspect state selector modeling before geometry CSS changes');
    }
    const topDelta = localExpectedVisibility.largestHeightDeltas?.[0];
    if (topDelta) {
      notes.push(`largest sampled local-vs-actual panel height delta is ${topDelta.heightDelta}px at ${topDelta.selector}`);
    }
  }
  return notes;
}

function buildNextChecks(prefixMismatch, localExpectedCssMode, localExpectedVisibility) {
  const checks = [
    'Do not claim Roll20 visual parity from this diagnostic.',
    'Rerun full-root candidate smoke after any preview/export sanitize change.',
    'Rerun local preview/edit visual smoke after any renderer change.',
  ];
  if (prefixMismatch.kind === 'ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML') {
    if (localExpectedCssMode.previewUsesUnprefixedCss) {
      checks.unshift('Local Sandbox expected preview already uses unprefixed CSS selector modeling; next reverify this actual Roll20 state behavior with another fixture before changing renderer CSS.');
      if (localExpectedVisibility?.status === 'COMPARED' && localExpectedVisibility.matched) {
        checks.unshift('For this fixture, local Sandbox expected panel visibility matches actual sampled panel visibility; prioritize geometry/assets/control styling before more state-selector changes.');
      } else {
        checks.unshift('Compare local Sandbox expected preview visibility against the captured actual visible panels so intentional all-panel visibility is not mistaken for a renderer regression.');
      }
    } else {
      checks.unshift('Patch the local Roll20 actual/sandbox expected path so CSS prefixing behavior is modeled from observed Roll20 evidence, not the older blanket-prefix assumption.');
    }
    checks.unshift('Keep source-preserving preview and actual Roll20 expected preview as separate modes until the prefix contract is reverified with another fixture.');
  }
  return checks;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 State Visibility Diagnostics',
    '',
    `Run dir: \`${report.runDir}\``,
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local-only diagnosis of actual Roll20 state visibility and selector prefix behavior. This is not a visual parity claim.',
    '',
    '| Fixture | Status | Actual state | Visible sampled panels | Primary finding |',
    '| --- | --- | --- | ---: | --- |',
  ];

  for (const fixture of report.fixtures) {
    if (fixture.status === 'SKIP') {
      lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} |  |  | ${fixture.reason ?? ''} |`);
      continue;
    }
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.stateSummary.sheetTab ?? ''}/${fixture.stateSummary.sheetTabForBtn ?? ''} | ${fixture.actualVisiblePanels.length} | ${fixture.primaryFinding} |`);
  }

  for (const fixture of report.fixtures.filter((item) => item.status === 'COMPARED')) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push('### Interpretation');
    lines.push('');
    for (const note of fixture.interpretation) lines.push(`- ${note}`);
    lines.push('');
    lines.push('### Actual Visible Panels');
    lines.push('');
    lines.push('| Selector | Class | Display | Height | Matched state rules |');
    lines.push('| --- | --- | --- | ---: | ---: |');
    for (const panel of fixture.actualVisiblePanels) {
      lines.push(`| \`${panel.selector}\` | \`${panel.className ?? ''}\` | ${panel.display}/${panel.visibility} | ${panel.height ?? ''} | ${panel.matchedRulesCount ?? ''} |`);
    }
    lines.push('');
    lines.push('### State Rule Shape');
    lines.push('');
    lines.push('| Source | Selector anchor shape | Selector excerpt |');
    lines.push('| --- | --- | --- |');
    for (const rule of fixture.actualStateRules) {
      lines.push(`| actual Roll20 CSSOM | ${rule.hasSheetPrefixedStateAnchor ? 'sheet-prefixed' : rule.hasUnprefixedStateAnchor ? 'unprefixed' : 'other'} | \`${shorten(rule.selectorText, 160)}\` |`);
    }
    for (const rule of fixture.payloadStateSelectors.stateRules) {
      lines.push(`| payload CSS | ${rule.hasSheetPrefixedStateAnchor ? 'sheet-prefixed' : rule.hasUnprefixedStateAnchor ? 'unprefixed' : 'other'} | \`${shorten(rule.selectorText, 160)}\` |`);
    }
    lines.push('');
    lines.push('### Payload HTML Anchors');
    lines.push('');
    lines.push(`- State anchor classes: ${fixture.payloadClasses.stateAnchorClasses.map((token) => `\`${token}\``).join(', ') || 'none'}`);
    lines.push(`- Panel classes: ${fixture.payloadClasses.panelClasses.map((token) => `\`${token}\``).join(', ') || 'none'}`);
    lines.push('');
    lines.push('### Local Expected CSS Mode');
    lines.push('');
    lines.push(`- Preview keeps sandbox CSS selectors unprefixed: ${fixture.localExpectedCssMode.previewUsesUnprefixedCss ? 'yes' : 'no'}`);
    for (const item of fixture.localExpectedCssMode.evidence) {
      lines.push(`- \`${item.file}\`: ${item.prefixSelectorsFalse ? 'uses `prefixSelectors: false`' : 'no direct `prefixSelectors: false` evidence'}`);
    }
    lines.push('');
    lines.push('### Local Expected Visibility');
    lines.push('');
    if (fixture.localExpectedVisibility.status === 'COMPARED') {
      lines.push(`- Match actual visible panel set: ${fixture.localExpectedVisibility.matched ? 'yes' : 'no'}`);
      lines.push(`- Actual visible panels: ${fixture.localExpectedVisibility.actualVisibleCount}`);
      lines.push(`- Local Sandbox expected visible panels: ${fixture.localExpectedVisibility.localVisibleCount}`);
      if (fixture.localExpectedVisibility.missingLocally.length) {
        lines.push(`- Missing locally: ${fixture.localExpectedVisibility.missingLocally.map((selector) => `\`${selector}\``).join(', ')}`);
      }
      if (fixture.localExpectedVisibility.extraLocally.length) {
        lines.push(`- Extra locally: ${fixture.localExpectedVisibility.extraLocally.map((selector) => `\`${selector}\``).join(', ')}`);
      }
      if (fixture.localExpectedVisibility.largestHeightDeltas.length) {
        lines.push('- Largest local-vs-actual height deltas:');
        for (const delta of fixture.localExpectedVisibility.largestHeightDeltas) {
          lines.push(`  - \`${delta.selector}\`: local ${delta.localHeight}px vs actual ${delta.actualHeight}px (${delta.heightDelta}px)`);
        }
      }
      lines.push('');
      lines.push('| Selector | Local display | Actual height | Local height | Delta | Local visible |');
      lines.push('| --- | --- | ---: | ---: | ---: | --- |');
      for (const panel of fixture.localExpectedVisibility.panels) {
        lines.push(`| \`${panel.selector}\` | ${panel.exists ? `${panel.display}/${panel.visibility}` : 'missing'} | ${panel.actualHeight ?? ''} | ${panel.height ?? ''} | ${panel.heightDelta ?? ''} | ${panel.visible ? 'yes' : 'no'} |`);
      }
    } else {
      lines.push(`- ${fixture.localExpectedVisibility.reason ?? 'not compared'}`);
    }
    lines.push('');
    lines.push('### Next Checks');
    lines.push('');
    for (const check of fixture.nextChecks) lines.push(`- ${check}`);
  }

  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This report can prove a selector/state mismatch hypothesis for the captured fixture only.');
  lines.push('- It does not prove all-sheet behavior or visual parity.');
  lines.push('- Actual Roll20 screenshots/chats remain local-only evidence and must not be committed.');
  return `${lines.join('\n')}\n`;
}

function isLikelyStateRule(selectorText) {
  return /\.tabstoggle(?:forbtn)?\b|\.sheet-tabstoggle(?:forbtn)?\b|\[value=/.test(selectorText ?? '');
}

function extractSelectorText(cssText) {
  return String(cssText ?? '').split('{')[0].trim();
}

function classSelectors(selectorText) {
  return [...String(selectorText ?? '').matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((match) => match[1]);
}

function round(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

function shorten(value, max = 120) {
  const s = String(value ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

async function readJsonRequired(file) {
  if (!existsSync(file)) throw new Error(`Missing required report: ${file}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readTextIfExists(file) {
  if (!existsSync(file)) return '';
  return readFile(file, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

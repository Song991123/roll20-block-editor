#!/usr/bin/env node
/**
 * Diagnose Roll20 attr_class/default-state visibility with actual iframe
 * sidecars and emitted payload selector shapes.
 *
 * This reads ignored local reports only. It does not copy sheet source,
 * screenshots, or private Roll20 evidence into tracked files, and it does not
 * prove Roll20 visual parity.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const fixtureFilter = args[1] && !args[1].startsWith('--') ? args[1] : null;

if (!args[0]) {
  console.error('Usage: node scripts/roll20_attr_class_visibility_diagnostics.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

const outDir = path.join(runDir, 'attr-class-visibility-diagnostics');

async function main() {
  const fixtureIds = await discoverFixtureIds();
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    if (fixtureFilter && fixtureId !== fixtureFilter) continue;
    fixtures.push(await analyzeFixture(fixtureId));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'actual Roll20 attr_class selector/visibility diagnostic; not visual parity',
    summary: {
      fixtures: fixtures.length,
      withActualSidecar: fixtures.filter((fixture) => fixture.actualSidecar.exists).length,
      withSelectorMismatch: fixtures.filter((fixture) => fixture.selectorSummary.selectorMismatchCount > 0).length,
      withCheckedVisibleContradiction: fixtures.filter((fixture) => fixture.actualSummary.checkedVisibleContradiction).length,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'attr-class-visibility-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'attr-class-visibility-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    console.log([
      fixture.status,
      fixture.fixtureId,
      `checked=${fixture.actualSummary.checkedValues.join(',') || 'none'}`,
      `visiblePanels=${fixture.actualSummary.visiblePanelValues.length}`,
      `selectorMismatch=${fixture.selectorSummary.selectorMismatchCount ? 'YES' : 'NO'}`,
    ].join(' '));
  }
  console.log(`ROLL20 ATTR CLASS VISIBILITY DIAGNOSTICS OK ${path.relative(process.cwd(), outDir)}`);
}

async function discoverFixtureIds() {
  const fullRootPath = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');
  const ids = new Set();
  if (existsSync(fullRootPath)) {
    const fullRoot = JSON.parse(await readFile(fullRootPath, 'utf8'));
    for (const fixture of fullRoot.fixtures ?? []) ids.add(fixture.fixtureId);
  }
  const sidecarDir = path.join(runDir, 'live-iframe-probe');
  if (existsSync(sidecarDir)) {
    const { readdir } = await import('node:fs/promises');
    for (const file of await readdir(sidecarDir)) {
      if (file.endsWith('-attr-class-state.json')) ids.add(file.replace(/-attr-class-state\.json$/, ''));
    }
  }
  return [...ids].sort();
}

async function analyzeFixture(fixtureId) {
  const sidecar = await readActualSidecar(fixtureId);
  const payload = await readPayload(fixtureId);
  const actualSummary = summarizeActual(sidecar);
  const selectors = extractCheckedDisplaySelectors(payload.css);
  const htmlClasses = extractHtmlClassSet(payload.html);
  const selectorRows = selectors.map((selector) => analyzeSelector(selector, htmlClasses, actualSummary));
  const selectorSummary = summarizeSelectors(selectorRows);
  const status = !sidecar.exists
    ? 'NO_ACTUAL_SIDECAR'
    : selectorSummary.selectorMismatchCount > 0 || actualSummary.checkedVisibleContradiction
      ? 'COMPARED_NEEDS_RENDERER_MODEL'
      : 'COMPARED_NO_ATTR_CLASS_MISMATCH';

  return {
    fixtureId,
    status,
    actualSidecar: {
      exists: sidecar.exists,
      path: sidecar.path,
      inputCount: sidecar.inputs.length,
      capturedAt: sidecar.capturedAt,
      error: sidecar.error ?? null,
    },
    payload: {
      htmlExists: payload.htmlExists,
      cssExists: payload.cssExists,
      htmlClassCount: htmlClasses.size,
      checkedDisplaySelectorCount: selectors.length,
    },
    actualSummary,
    selectorSummary,
    selectorRows,
    interpretation: interpret({ actualSummary, selectorSummary, selectors, payload }),
  };
}

async function readActualSidecar(fixtureId) {
  const file = path.join(runDir, 'live-iframe-probe', `${fixtureId}-attr-class-state.json`);
  if (!existsSync(file)) {
    return { exists: false, path: path.relative(runDir, file), inputs: [], visibleValueSections: [], checkedValues: [], capturedAt: null };
  }
  try {
    const json = JSON.parse(await readFile(file, 'utf8'));
    const docs = Array.isArray(json.documents) ? json.documents : [];
    return {
      exists: true,
      path: path.relative(runDir, file),
      inputs: docs.flatMap((doc) => doc.attrClassInputs ?? []),
      visibleValueSections: docs.flatMap((doc) => doc.visibleValueSections ?? []),
      checkedValues: [...new Set(docs.flatMap((doc) => doc.checkedValues ?? []))],
      capturedAt: json.capturedAt ?? json.generatedAt ?? null,
    };
  } catch (error) {
    return {
      exists: true,
      path: path.relative(runDir, file),
      inputs: [],
      visibleValueSections: [],
      checkedValues: [],
      capturedAt: null,
      error: String(error?.message || error),
    };
  }
}

async function readPayload(fixtureId) {
  const htmlPath = path.join(runDir, 'local-baseline', fixtureId, 'payload', 'sheet.html');
  const cssPath = path.join(runDir, 'local-baseline', fixtureId, 'payload', 'sheet.css');
  return {
    htmlExists: existsSync(htmlPath),
    cssExists: existsSync(cssPath),
    html: existsSync(htmlPath) ? await readFile(htmlPath, 'utf8') : '',
    css: existsSync(cssPath) ? await readFile(cssPath, 'utf8') : '',
  };
}

function summarizeActual(sidecar) {
  const checkedValues = [...new Set([
    ...sidecar.checkedValues,
    ...sidecar.inputs.filter((input) => input.checked).map((input) => input.value).filter(Boolean),
  ])];
  const visiblePanelValues = [];
  for (const section of sidecar.visibleValueSections ?? []) {
    const nodes = Array.isArray(section.nodes) ? section.nodes : [];
    const panelNodes = nodes.filter(isVisiblePanelNode);
    if (panelNodes.length) {
      visiblePanelValues.push({
        value: section.value,
        visiblePanelNodeCount: panelNodes.length,
        sampleClasses: panelNodes.slice(0, 3).map((node) => node.className || '').filter(Boolean),
        sampleTags: panelNodes.slice(0, 3).map((node) => node.tagName || '').filter(Boolean),
      });
    }
  }
  const checkedSet = new Set(checkedValues.map(slug));
  const visibleSet = new Set(visiblePanelValues.map((section) => slug(section.value)));
  const extraVisible = [...visibleSet].filter((value) => !checkedSet.has(value));
  return {
    checkedValues,
    visiblePanelValues,
    visiblePanelValueNames: visiblePanelValues.map((section) => section.value),
    extraVisibleValues: extraVisible,
    checkedVisibleContradiction: checkedValues.length > 0 && extraVisible.length > 0,
  };
}

function isVisiblePanelNode(node) {
  if (!node || node.visible === false) return false;
  const tag = String(node.tagName || '').toLowerCase();
  if (tag === 'input') return false;
  const className = String(node.className || '');
  if (/\bsheet-is[A-Z]/.test(className) || /\bis[A-Z]/.test(className)) return false;
  const rect = node.rect ?? {};
  const width = Number(rect.width ?? 0);
  const height = Number(rect.height ?? 0);
  if (width <= 0 || height <= 0) return false;
  const style = node.style ?? {};
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  return true;
}

function extractCheckedDisplaySelectors(css) {
  const rows = [];
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectorText = block[1].trim();
    const declarations = block[2].trim();
    if (!/:checked/.test(selectorText)) continue;
    const displayMatch = declarations.match(/display\s*:\s*([^;]+)/i);
    if (!displayMatch) continue;
    for (const selector of selectorText.split(',')) {
      const parts = [...selector.matchAll(/\.([_a-zA-Z][\w-]*)\s*:checked\s*~\s*\.([_a-zA-Z][\w-]*)/g)];
      for (const part of parts) {
        rows.push({
          selector: selector.trim().replace(/\s+/g, ' '),
          anchorClass: part[1],
          targetClass: part[2],
          display: displayMatch[1].trim(),
        });
      }
    }
  }
  return rows;
}

function extractHtmlClassSet(html) {
  const classSet = new Set();
  for (const match of html.matchAll(/\bclass\s*=\s*(["'])(.*?)\1/gis)) {
    for (const token of match[2].split(/\s+/)) {
      const trimmed = token.trim();
      if (trimmed) classSet.add(trimmed);
    }
  }
  return classSet;
}

function analyzeSelector(selector, htmlClasses, actualSummary) {
  const anchor = selector.anchorClass;
  const target = selector.targetClass;
  const anchorSheet = sheetAlias(anchor);
  const targetSheet = sheetAlias(target);
  const valueSlug = slug(anchor.replace(/^is/i, '') || target);
  const targetSlug = slug(target);
  const actualVisible = actualSummary.visiblePanelValues.find((section) => {
    const sectionSlug = slug(section.value);
    return sectionSlug === valueSlug || sectionSlug === targetSlug;
  });
  return {
    ...selector,
    htmlMatches: {
      anchorDirect: htmlClasses.has(anchor),
      anchorSheet: htmlClasses.has(anchorSheet),
      targetDirect: htmlClasses.has(target),
      targetSheet: htmlClasses.has(targetSheet),
    },
    selectorMatchesPayloadHtmlDirectly: htmlClasses.has(anchor) && htmlClasses.has(target),
    selectorMatchesRoll20PrefixedHtmlShape: htmlClasses.has(anchorSheet) && htmlClasses.has(targetSheet),
    actual: {
      checked: actualSummary.checkedValues.some((value) => slug(value) === valueSlug || slug(value) === targetSlug),
      visiblePanel: Boolean(actualVisible),
      visiblePanelNodeCount: actualVisible?.visiblePanelNodeCount ?? 0,
    },
    mismatch: {
      unprefixedSelectorAgainstSheetPrefixedHtml: !(htmlClasses.has(anchor) && htmlClasses.has(target)) && htmlClasses.has(anchorSheet) && htmlClasses.has(targetSheet),
      visibleDespiteUnchecked: Boolean(actualVisible) && !actualSummary.checkedValues.some((value) => slug(value) === valueSlug || slug(value) === targetSlug),
    },
  };
}

function summarizeSelectors(rows) {
  const selectorMismatchCount = rows.filter((row) => row.mismatch.unprefixedSelectorAgainstSheetPrefixedHtml).length;
  const visibleDespiteUncheckedCount = rows.filter((row) => row.mismatch.visibleDespiteUnchecked).length;
  return {
    selectors: rows.length,
    selectorMismatchCount,
    visibleDespiteUncheckedCount,
    directMatchCount: rows.filter((row) => row.selectorMatchesPayloadHtmlDirectly).length,
    sheetPrefixedShapeCount: rows.filter((row) => row.selectorMatchesRoll20PrefixedHtmlShape).length,
  };
}

function interpret({ actualSummary, selectorSummary, selectors, payload }) {
  const notes = [];
  if (!payload.htmlExists || !payload.cssExists) {
    notes.push('Missing emitted payload HTML/CSS for this fixture; selector visibility cannot be compared.');
    return notes;
  }
  if (!selectors.length) {
    notes.push('No display :checked sibling selectors were found in the emitted payload CSS.');
    return notes;
  }
  if (actualSummary.checkedVisibleContradiction) {
    notes.push(`Actual Roll20 checked values (${actualSummary.checkedValues.join(', ') || 'none'}) do not account for visible panel values (${actualSummary.visiblePanelValueNames.join(', ') || 'none'}).`);
  }
  if (selectorSummary.selectorMismatchCount) {
    notes.push(`${selectorSummary.selectorMismatchCount}/${selectorSummary.selectors} checked show selectors are unprefixed while the payload HTML shape is Roll20 sheet-prefixed.`);
    notes.push('This can make Roll20 actual leave default-visible panels visible even when only one attr_class checkbox is checked; do not fix by forcing more checked values alone.');
  }
  if (!notes.length) {
    notes.push('No attr_class selector/prefix mismatch was detected from current sidecar and payload evidence.');
  }
  notes.push('Next action: model this as Roll20 selector prefix/default-state behavior in diagnostics before any production renderer CSS change.');
  return notes;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Attr Class Visibility Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: actual Roll20 attr_class selector/visibility diagnostic. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Checked | Visible panels | Selectors | Prefix mismatch | Visible despite unchecked | Interpretation |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push([
      `| \`${fixture.fixtureId}\``,
      fixture.status,
      fixture.actualSummary.checkedValues.join(', ') || 'none',
      String(fixture.actualSummary.visiblePanelValues.length),
      String(fixture.selectorSummary.selectors),
      String(fixture.selectorSummary.selectorMismatchCount),
      String(fixture.selectorSummary.visibleDespiteUncheckedCount),
      fixture.interpretation.join('<br>'),
    ].join(' | ') + ' |');
  }
  for (const fixture of report.fixtures.filter((item) => item.selectorRows.length > 0)) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Actual sidecar: \`${fixture.actualSidecar.path}\`, inputs=${fixture.actualSidecar.inputCount}, capturedAt=\`${fixture.actualSidecar.capturedAt ?? ''}\``);
    lines.push('');
    lines.push('| Selector | Direct HTML | Sheet-prefixed HTML | Actual checked | Actual visible | Mismatch |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const row of fixture.selectorRows.slice(0, 40)) {
      lines.push([
        `| \`${row.selector}\``,
        bool(row.selectorMatchesPayloadHtmlDirectly),
        bool(row.selectorMatchesRoll20PrefixedHtmlShape),
        bool(row.actual.checked),
        `${bool(row.actual.visiblePanel)} (${row.actual.visiblePanelNodeCount})`,
        row.mismatch.unprefixedSelectorAgainstSheetPrefixedHtml ? 'unprefixed selector vs sheet-prefixed HTML' : row.mismatch.visibleDespiteUnchecked ? 'visible despite unchecked' : '',
      ].join(' | ') + ' |');
    }
    if (fixture.selectorRows.length > 40) {
      lines.push('');
      lines.push(`_Only the first 40 selector rows are shown; JSON contains ${fixture.selectorRows.length} rows._`);
    }
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This report explains selector/state evidence only. It is not a renderer fix.');
  lines.push('- Do not promote `sheet-` alias CSS or forced checked-state candidates into production until cross-fixture visual evidence supports the same behavior.');
  lines.push('- Generated report output remains ignored under `reports/` and must not be committed.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function sheetAlias(className) {
  return className.startsWith('sheet-') ? className : `sheet-${className}`;
}

function bool(value) {
  return value ? 'yes' : 'no';
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

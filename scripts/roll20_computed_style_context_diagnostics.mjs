#!/usr/bin/env node
/**
 * Compare actual Roll20 computed-style sidecars against local renderer
 * candidates. This is local-only diagnostic evidence and does not prove visual
 * parity or contact Roll20.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const selfTest = args.includes('--self-test');
const runDir = path.resolve(args.find((arg) => !arg.startsWith('--')) ?? '');

if (!selfTest && !args.find((arg) => !arg.startsWith('--'))) {
  console.error('Usage: node scripts/roll20_computed_style_context_diagnostics.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const outDir = path.join(runDir, 'computed-style-context-diagnostics');
const fullRootPath = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');
// Keep this list aligned with roll20_sheet_frame_probe.mjs. The sidecar can
// already capture these selectors; omitting them here made a generic payload
// look covered while silently skipping table cells, selects, and roll buttons.
const targetSelectors = [
  '.sheet-2colrow',
  '.sheet-3colrow',
  '.sheet-col',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'input',
  'textarea',
  'select',
  "button[type='roll']",
];
const styleFields = [
  'display',
  'position',
  'float',
  'clear',
  'boxSizing',
  'width',
  'height',
  'margin',
  'padding',
  'border',
  'overflow',
  'fontSize',
  'lineHeight',
  'verticalAlign',
  'whiteSpace',
  'wordSpacing',
];

async function main() {
  if (selfTest) {
    runSelfTest();
    console.log('ROLL20 COMPUTED STYLE CONTEXT SELF-TEST PASS');
    return;
  }
  if (!existsSync(fullRootPath)) throw new Error(`Missing full-root candidate report: ${fullRootPath}`);
  const fullRoot = JSON.parse(await readFile(fullRootPath, 'utf8'));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'actual Roll20 computed-style sidecars vs local candidate geometry styles; not visual parity',
    fixtures: (fullRoot.fixtures ?? []).map(compareFixture),
  };
  report.summary = summarize(report.fixtures);
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'computed-style-context-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'computed-style-context-diagnostics-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 COMPUTED STYLE CONTEXT ${report.summary.status}`);
  console.log(`compared=${report.summary.comparedFixtures}/${report.summary.totalFixtures}`);
  console.log(`missingActualStyle=${report.summary.missingActualStyle}`);
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function compareFixture(fixture) {
  const fixtureId = fixture.fixtureId;
  const actualStylePath = path.join(runDir, 'live-iframe-probe', `${fixtureId}-computed-styles.json`);
  if (!existsSync(actualStylePath)) {
    return {
      fixtureId,
      status: 'MISSING_ACTUAL_STYLE',
      reason: `missing live iframe computed-style sidecar: ${path.relative(runDir, actualStylePath)}`,
      requiredForPromotion: true,
    };
  }
  const actual = readJsonSync(actualStylePath);
  const candidates = candidateSet(fixture);
  const comparisons = candidates.map((candidate) => compareCandidate(actual, candidate));
  const bestStyleCandidate = comparisons
    .slice()
    .sort((a, b) => a.styleScore - b.styleScore || Math.abs(a.rootHeightDelta ?? 0) - Math.abs(b.rootHeightDelta ?? 0))[0] ?? null;
  const blockers = [];
  if (comparisons.some((item) => item.selectorDiffs.some((diff) => diff.status === 'MISSING_ACTUAL_SELECTOR'))) {
    blockers.push('actual sidecar lacks one or more target selectors; refresh the Roll20 computed-style probe before renderer CSS promotion');
  }
  if (bestStyleCandidate?.selectorDiffs?.some((diff) => diff.sampleDiffCount > 0)) {
    blockers.push('best local candidate still has computed-style sample differences against actual Roll20');
  }
  return {
    fixtureId,
    status: 'COMPARED',
    actualStylePath: path.relative(runDir, actualStylePath),
    actualState: actual.state ?? null,
    candidates: comparisons,
    bestStyleCandidate,
    promotionStatus: blockers.length ? 'DO_NOT_PROMOTE_DIRECTLY' : 'STYLE_CONTEXT_MATCHED_NEEDS_VISUAL_RECHECK',
    blockers,
  };
}

function candidateSet(fixture) {
  const byId = new Map((fixture.candidates ?? []).map((candidate) => [candidate.id, candidate]));
  const ids = [
    fixture.baselineCandidate,
    fixture.bestCandidate?.id,
    fixture.closestRootHeightCandidate?.id,
    fixture.bestGeometryCandidate?.id,
    'sandbox-source-state',
    'sandbox-actual-root-width-source',
    'sandbox-inline-block-text-input-270-source',
    'sandbox-nowrap-text-input-270-source',
  ].filter(Boolean);
  const seen = new Set();
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    });
}

function compareCandidate(actual, candidate) {
  const selectorDiffs = targetSelectors.map((selector) => compareSelector(actual, candidate, selector));
  const styleScore = selectorDiffs.reduce((score, diff) => {
    const missingPenalty = diff.status === 'COMPARED' ? 0 : 100;
    return score + missingPenalty + Math.abs(diff.countDelta ?? 0) * 5 + diff.sampleDiffCount;
  }, 0);
  return {
    candidateId: candidate.id,
    patch: candidatePatch(candidate),
    mismatchPct: pct(candidate.mismatchRatio),
    rootHeightDelta: round(candidate.rootHeightDelta),
    localSize: candidate.localSize ?? null,
    styleScore,
    selectorDiffs,
  };
}

function candidatePatch(candidate) {
  if (!candidate) return '';
  if (candidate.roll20RendererModel && candidate.roll20RendererModel !== 'default') {
    return `renderer-model:${candidate.roll20RendererModel}`;
  }
  return candidate.contextPatch ?? '';
}

function compareSelector(actual, candidate, selector) {
  const actualEntry = (actual.selected ?? []).find((entry) => entry.selector === selector) ?? null;
  const localNodes = localNodesForSelector(candidate, selector);
  if (!actualEntry) {
    return {
      selector,
      status: 'MISSING_ACTUAL_SELECTOR',
      actualCount: null,
      localCount: localNodes.length,
      countDelta: null,
      sampleDiffCount: 0,
      sampleDiffs: [],
    };
  }
  const actualSamples = (actualEntry.samples ?? []).slice(0, 3);
  const localSamples = localNodes.filter(isVisibleNode).slice(0, 3);
  const sampleDiffs = [];
  const sampleCount = Math.min(actualSamples.length, localSamples.length);
  for (let index = 0; index < sampleCount; index += 1) {
    const diffs = diffNodeStyles(actualSamples[index], localSamples[index]);
    if (diffs.length) sampleDiffs.push({ index, diffs });
  }
  return {
    selector,
    status: 'COMPARED',
    actualCount: Number(actualEntry.count ?? actualSamples.length),
    localCount: localNodes.length,
    visibleActualSamples: actualSamples.length,
    visibleLocalSamples: localSamples.length,
    countDelta: localNodes.length - Number(actualEntry.count ?? actualSamples.length),
    sampleDiffCount: sampleDiffs.reduce((sum, item) => sum + item.diffs.length, 0),
    sampleDiffs,
    firstActual: summarizeNode(actualSamples[0]),
    firstLocal: summarizeNode(localSamples[0]),
  };
}

function localNodesForSelector(candidate, selector) {
  const geometry = candidate.metrics?.targetGeometry ?? {};
  const allNodes = flattenStatePanels(geometry);
  if (selector === '.sheet-2colrow') return geometry.rows ?? [];
  if (selector === '.sheet-3colrow') return allNodes.filter((node) => hasClass(node, 'sheet-3colrow'));
  if (selector === '.sheet-col') return allNodes.filter((node) => hasClass(node, 'sheet-col'));
  if (selector === 'table') return geometry.tables ?? allNodes.filter((node) => node.tag === 'TABLE');
  if (selector === 'thead') return allNodes.filter((node) => node.tag === 'THEAD');
  if (selector === 'tbody') return allNodes.filter((node) => node.tag === 'TBODY');
  if (selector === 'tr') return allNodes.filter((node) => node.tag === 'TR');
  if (selector === 'td') return allNodes.filter((node) => node.tag === 'TD');
  if (selector === 'th') return allNodes.filter((node) => node.tag === 'TH');
  if (selector === 'input') return geometry.inputs ?? allNodes.filter((node) => node.tag === 'INPUT');
  if (selector === 'textarea') return geometry.textareas ?? allNodes.filter((node) => node.tag === 'TEXTAREA');
  if (selector === 'select') return geometry.selects ?? allNodes.filter((node) => node.tag === 'SELECT');
  if (selector === "button[type='roll']") {
    return geometry.rollButtons ?? allNodes.filter((node) => node.tag === 'BUTTON' && String(node.type ?? '').toLowerCase() === 'roll');
  }
  return [];
}

function flattenStatePanels(geometry) {
  const roots = [
    ...(geometry.statePanels ?? []),
    ...(geometry.rows ?? []),
    ...(geometry.tables ?? []),
    ...(geometry.inputs ?? []),
  ];
  const out = [];
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const node = stack.shift();
    if (!node) continue;
    if (seen.has(node)) continue;
    seen.add(node);
    out.push(node);
    if (Array.isArray(node.children)) stack.push(...node.children);
  }
  return out;
}

function runSelfTest() {
  const cell = { tag: 'TD', rect: { width: 10, height: 10 }, children: [] };
  const row = { tag: 'TR', rect: { width: 20, height: 10 }, children: [cell] };
  const table = { tag: 'TABLE', rect: { width: 20, height: 10 }, children: [row] };
  const geometry = {
    rows: [{ tag: 'DIV', className: 'sheet-2colrow', rect: { width: 100, height: 40 }, children: [
      { tag: 'DIV', className: 'sheet-col', rect: { width: 50, height: 40 }, children: [] },
      { tag: 'DIV', className: 'sheet-col', rect: { width: 50, height: 40 }, children: [] },
    ] }],
    tables: [table],
    inputs: [{ tag: 'INPUT', rect: { width: 20, height: 10 }, children: [] }],
    textareas: [{ tag: 'TEXTAREA', rect: { width: 20, height: 20 }, children: [] }],
    selects: [{ tag: 'SELECT', rect: { width: 20, height: 10 }, children: [] }],
    rollButtons: [{ tag: 'BUTTON', type: 'roll', rect: { width: 20, height: 10 }, children: [] }],
  };
  const candidate = { metrics: { targetGeometry: geometry } };
  const expectations = new Map([
    ['.sheet-2colrow', 1],
    ['.sheet-col', 2],
    ['table', 1],
    ['tr', 1],
    ['td', 1],
    ['input', 1],
    ['textarea', 1],
    ['select', 1],
    ["button[type='roll']", 1],
  ]);
  for (const [selector, expected] of expectations) {
    const actual = localNodesForSelector(candidate, selector).length;
    if (actual !== expected) {
      throw new Error(`selector ${selector} expected ${expected}, got ${actual}`);
    }
  }
}

function diffNodeStyles(actualNode, localNode) {
  const diffs = [];
  for (const field of styleFields) {
    const actualValue = normalizeStyleValue(actualNode?.style?.[field]);
    const localValue = normalizeStyleValue(localNode?.style?.[field]);
    if (actualValue !== localValue) diffs.push({ field, actual: actualValue, local: localValue });
  }
  for (const field of ['width', 'height']) {
    const actualValue = round(actualNode?.rect?.[field]);
    const localValue = round(localNode?.rect?.[field]);
    if (actualValue !== localValue) diffs.push({ field: `rect.${field}`, actual: actualValue, local: localValue });
  }
  return diffs;
}

function summarizeNode(node) {
  if (!node) return null;
  return {
    tag: node.tag ?? '',
    className: node.className ?? '',
    name: node.name ?? '',
    type: node.type ?? '',
    rect: node.rect ?? null,
    style: Object.fromEntries(styleFields.map((field) => [field, node.style?.[field] ?? ''])),
  };
}

function isVisibleNode(node) {
  const rect = node?.rect ?? {};
  return Number(rect.width ?? 0) > 0 || Number(rect.height ?? 0) > 0 || node?.tag === 'HTML' || node?.tag === 'BODY';
}

function hasClass(node, className) {
  return String(node?.className ?? '').split(/\s+/).includes(className);
}

function summarize(fixtures) {
  const comparedFixtures = fixtures.filter((fixture) => fixture.status === 'COMPARED').length;
  const missingActualStyle = fixtures.filter((fixture) => fixture.status === 'MISSING_ACTUAL_STYLE').length;
  const promotable = fixtures.filter((fixture) => fixture.promotionStatus === 'STYLE_CONTEXT_MATCHED_NEEDS_VISUAL_RECHECK').length;
  return {
    totalFixtures: fixtures.length,
    comparedFixtures,
    missingActualStyle,
    promotable,
    status: missingActualStyle || promotable < fixtures.length ? 'DO_NOT_PROMOTE_DIRECTLY' : 'STYLE_CONTEXT_MATCHED_NEEDS_VISUAL_RECHECK',
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Computed-Style Context Diagnostics');
  lines.push('');
  lines.push(`Run dir: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('Scope: actual Roll20 computed-style sidecars compared with local candidate geometry styles. This is not visual parity.');
  lines.push('');
  lines.push(`Summary: **${report.summary.status}**, compared ${report.summary.comparedFixtures}/${report.summary.totalFixtures}, missing actual style ${report.summary.missingActualStyle}.`);
  lines.push('');
  lines.push('| Fixture | Status | Promotion | Best style candidate | Score | Blockers |');
  lines.push('| --- | --- | --- | --- | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.promotionStatus ?? ''} | ${fixture.bestStyleCandidate?.candidateId ?? ''} | ${fixture.bestStyleCandidate?.styleScore ?? ''} | ${(fixture.blockers ?? [fixture.reason ?? '']).join('<br>')} |`);
  }
  for (const fixture of report.fixtures.filter((item) => item.status === 'COMPARED')) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Actual style sidecar: \`${fixture.actualStylePath}\``);
    lines.push('');
    lines.push('| Candidate | Patch | Mismatch | Root delta | Style score |');
    lines.push('| --- | --- | ---: | ---: | ---: |');
    for (const candidate of fixture.candidates) {
      lines.push(`| ${candidate.candidateId} | ${candidate.patch} | ${candidate.mismatchPct ?? ''}% | ${candidate.rootHeightDelta ?? ''} | ${candidate.styleScore} |`);
    }
    if (fixture.bestStyleCandidate) {
      lines.push('');
      lines.push(`### Best Style Candidate: ${fixture.bestStyleCandidate.candidateId}`);
      lines.push('');
      lines.push('| Selector | Actual count | Local count | Sample diffs | First actual | First local |');
      lines.push('| --- | ---: | ---: | ---: | --- | --- |');
      for (const diff of fixture.bestStyleCandidate.selectorDiffs) {
        lines.push(`| \`${diff.selector}\` | ${diff.actualCount ?? ''} | ${diff.localCount} | ${diff.sampleDiffCount} | ${fmtNode(diff.firstActual)} | ${fmtNode(diff.firstLocal)} |`);
      }
      for (const diff of fixture.bestStyleCandidate.selectorDiffs.filter((item) => item.sampleDiffs.length)) {
        lines.push('');
        lines.push(`#### ${diff.selector} sample differences`);
        lines.push('');
        for (const sample of diff.sampleDiffs.slice(0, 3)) {
          const text = sample.diffs.slice(0, 12).map((item) => `${item.field}: ${item.actual} -> ${item.local}`).join('; ');
          lines.push(`- sample ${sample.index}: ${text}`);
        }
      }
    }
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- `STYLE_CONTEXT_MATCHED_NEEDS_VISUAL_RECHECK` would only mean this computed-style slice matched; full visual parity still needs screenshot/diff and Roll20 upload evidence.');
  lines.push('- `MISSING_ACTUAL_STYLE` means the actual Roll20 iframe probe must be refreshed before CSS promotion.');
  return `${lines.join('\n')}\n`;
}

function fmtNode(node) {
  if (!node) return '';
  const label = [node.tag, node.className ? `.${String(node.className).split(/\s+/).slice(0, 2).join('.')}` : '', node.type ? `[${node.type}]` : ''].join('');
  const rect = node.rect ? `${round(node.rect.width)}x${round(node.rect.height)}` : '';
  const style = node.style ? `display=${node.style.display}; h=${node.style.height}; w=${node.style.width}; margin=${node.style.margin}; padding=${node.style.padding}` : '';
  return `${label} ${rect} ${style}`;
}

function readJsonSync(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function normalizeStyleValue(value) {
  if (value == null) return '';
  return String(value).replace(/\b0\.8px\b/g, '1px').trim();
}

function pct(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? round(numeric * 100) : null;
}

function round(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 1000) / 1000 : null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Compare an anonymous Roll20 iframe computed-style sidecar with the local
 * preview smoke's style snapshot.
 *
 * This is a local diagnostic only. It deliberately records no sheet source,
 * room identifier, URL, or selector-specific product rule, and it does not
 * promote a CSS change by itself.
 *
 * Usage:
 *   node scripts/roll20_style_sidecar_compare.mjs \
 *     --actual reports/roll20-actual-compare/<run>/live-iframe-probe/anonymous-legacy-computed-styles.json \
 *     --local reports/preview-edit-visual-synthetic/preview-edit-visual-results.json \
 *     --out reports/roll20-actual-compare/<run>/style-sidecar-compare
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const actualPath = valueOf('--actual');
const localPath = valueOf('--local');
const outDir = path.resolve(valueOf('--out', 'reports/roll20-style-sidecar-compare'));

if (!actualPath || !localPath) {
  console.error('Usage: node scripts/roll20_style_sidecar_compare.mjs --actual <json> --local <json> --out <dir>');
  process.exit(2);
}

const styleFields = [
  'display',
  'position',
  'boxSizing',
  'width',
  'height',
  'minHeight',
  'margin',
  'padding',
  'borderTopWidth',
  'backgroundColor',
  'color',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'verticalAlign',
  'whiteSpace',
  'overflow',
];

const targetMap = [
  { role: 'sheet-root', actual: '.charsheet', local: 'root' },
  { role: 'authored-root', actual: '.sheet-sandbox-proof', local: 'contentRoot' },
  { role: 'text-label', actual: "label[data-i18n='name']", local: 'firstText' },
  { role: 'text-input', actual: "input[name='attr_name']", local: 'firstControl' },
  { role: 'roll-control', actual: "button[type='roll'][name='roll_check']", local: 'firstRollButton' },
];

async function main() {
  const actual = await readJson(actualPath);
  const localReport = await readJson(localPath);
  const localFixture = (localReport.fixtures ?? []).find((fixture) => fixture.compatibilityMode === 'legacy')
    ?? localReport.fixtures?.[0];
  if (!localFixture?.previewCapture?.styles?.targets) {
    throw new Error('Local preview style targets are missing');
  }

  const comparisons = targetMap.map((target) => compareTarget(target, actual, localFixture.previewCapture.styles.targets));
  const wrapper = compareWrapperContext(actual, localFixture.previewCapture.styles.targets);
  const leafComparisons = comparisons.filter((item) => item.role !== 'sheet-root');
  const leafDifferences = leafComparisons.reduce((sum, item) => sum + item.differenceCount, 0);
  const rootDifferences = comparisons.find((item) => item.role === 'sheet-root')?.differenceCount ?? 0;
  const report = {
    generatedAt: new Date().toISOString(),
    anonymous: true,
    mode: actual.mode ?? 'unknown',
    scope: 'computed-style/context comparison only; not visual parity',
    actualPath: path.basename(actualPath),
    localPath: path.basename(localPath),
    summary: {
      status: leafDifferences === 0 ? (rootDifferences === 0 ? 'STYLE_CONTEXT_MATCHED_NEEDS_VISUAL_RECHECK' : 'LEAF_STYLES_MATCH_WRAPPER_DELTA') : 'STYLE_DIFF_REMAINS',
      targetCount: comparisons.length,
      leafDifferenceCount: leafDifferences,
      rootDifferenceCount: rootDifferences,
      wrapperDifferenceCount: wrapper.differenceCount,
      actualFrameWidth: actual.viewport?.innerWidth ?? null,
      localSheetRectWidth: localFixture.previewCapture?.styles?.targets?.dialog?.rectWidth ?? null,
    },
    comparisons,
    wrapper,
    claimBoundary: [
      'A leaf-style match is only evidence for the sampled synthetic controls.',
      'Wrapper width/inset and browser scale must be normalized before a pixel claim.',
      'This report does not prove arbitrary-sheet parity, legacy sanitization completeness, or worker/runtime parity.',
    ],
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'style-sidecar-compare-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'style-sidecar-compare-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 STYLE SIDECAR ${report.summary.status}`);
  console.log(`leafDifferences=${report.summary.leafDifferenceCount}`);
  console.log(`rootDifferences=${report.summary.rootDifferenceCount}`);
  console.log(`wrapperDifferences=${report.summary.wrapperDifferenceCount}`);
  console.log(`out=${outDir}`);
}

function compareTarget(target, actual, localTargets) {
  const actualNode = firstVisible(actual.selected?.[target.actual] ?? []);
  const localNode = localTargets[target.local] ?? null;
  const differences = [];
  const unavailableFields = [];
  if (!actualNode) differences.push({ field: 'node', actual: 'missing', local: 'present' });
  if (!localNode) differences.push({ field: 'node', actual: 'present', local: 'missing' });
  if (actualNode && localNode) {
    for (const field of styleFields) {
      const actualValue = actualNode.style?.[field] ?? '';
      const localValue = localStyleValue(localNode, field);
      if (actualValue === '' || localValue === undefined) {
        unavailableFields.push(field);
      } else if (!equivalentStyleValue(actualValue, localValue)) {
        differences.push({ field, actual: actualValue, local: localValue });
      }
    }
  }
  return {
    role: target.role,
    actualSelector: target.actual,
    localTarget: target.local,
    actualRect: actualNode?.rect ?? null,
    localRect: localRect(localNode),
    differenceCount: differences.length,
    differences,
    unavailableFields,
  };
}

function compareWrapperContext(actual, localTargets) {
  const mappings = [
    { role: 'dialog', actual: '#dialog-window', local: 'dialog' },
    { role: 'form', actual: 'form.sheetform', local: 'sheetform' },
  ];
  const comparisons = mappings.map((mapping) => {
    const actualNode = firstVisible(actual.frameContext?.selected?.[mapping.actual] ?? []);
    const localNode = localTargets[mapping.local] ?? null;
    const differences = [];
    for (const field of ['display', 'position', 'boxSizing', 'width', 'height', 'padding', 'overflow']) {
      const actualValue = actualNode?.style?.[field] ?? '';
      const localValue = localStyleValue(localNode, field);
      if (actualValue && localValue !== undefined && !equivalentStyleValue(actualValue, localValue)) differences.push({ field, actual: actualValue, local: localValue });
    }
    return {
      role: mapping.role,
      actualSelector: mapping.actual,
      localTarget: mapping.local,
      actualRect: actualNode?.rect ?? null,
      localRect: localRect(localNode),
      differenceCount: differences.length,
      differences,
    };
  });
  return {
    differenceCount: comparisons.reduce((sum, item) => sum + item.differenceCount, 0),
    comparisons,
    interpretation: 'Wrapper differences are context evidence; do not patch imported sheet CSS from them.',
  };
}

function firstVisible(nodes) {
  return nodes.find((node) => Number(node?.rect?.width ?? 0) > 0 || Number(node?.rect?.height ?? 0) > 0) ?? nodes[0] ?? null;
}

function localRect(node) {
  if (!node) return null;
  return {
    width: node.rectWidth ?? node.rect?.width ?? null,
    height: node.rectHeight ?? node.rect?.height ?? null,
  };
}

function localStyleValue(node, field) {
  if (!node) return '';
  if (field === 'borderTopWidth') return node.borderTopWidth ?? node.borderWidth;
  if (field === 'width') return node.width ?? node.cssWidth;
  if (field === 'height') return node.height ?? node.cssHeight;
  return node[field];
}

function equivalentStyleValue(actualValue, localValue) {
  if (actualValue === localValue) return true;
  const actualPx = parsePx(actualValue);
  const localPx = parsePx(localValue);
  return actualPx !== null && localPx !== null && Math.abs(actualPx - localPx) <= 1;
}

function parsePx(value) {
  const match = /^(-?\d+(?:\.\d+)?)px$/.exec(String(value ?? '').trim());
  return match ? Number(match[1]) : null;
}

function renderMarkdown(report) {
  const lines = [
    '# Anonymous Roll20 Style Sidecar Comparison',
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    'Scope: computed-style/context comparison only; this is not visual parity.',
    '',
    `Summary: **${report.summary.status}**; leaf differences ${report.summary.leafDifferenceCount}, root differences ${report.summary.rootDifferenceCount}, wrapper differences ${report.summary.wrapperDifferenceCount}.`,
    '',
    '| Role | Differences | Actual rect | Local rect |',
    '| --- | ---: | --- | --- |',
  ];
  for (const item of report.comparisons) {
    lines.push(`| ${item.role} | ${item.differenceCount} | ${fmtRect(item.actualRect)} | ${fmtRect(item.localRect)} |`);
  }
  lines.push('');
  for (const item of report.comparisons) renderDifferences(lines, item);
  lines.push('## Wrapper Context');
  lines.push('');
  for (const item of report.wrapper.comparisons) {
    lines.push(`- ${item.role}: ${item.differenceCount} differences; actual ${fmtRect(item.actualRect)}, local ${fmtRect(item.localRect)}`);
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  for (const item of report.claimBoundary) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function renderDifferences(lines, item) {
  if (!item.differences.length) return;
  lines.push(`### ${item.role}`);
  lines.push('');
  lines.push('| Field | Actual | Local |');
  lines.push('| --- | --- | --- |');
  for (const difference of item.differences) lines.push(`| ${difference.field} | ${fmt(difference.actual)} | ${fmt(difference.local)} |`);
  lines.push('');
}

function fmtRect(rect) {
  if (!rect) return '';
  return `${round(rect.width)} x ${round(rect.height)}`;
}

function round(value) {
  return typeof value === 'number' ? Math.round(value * 100) / 100 : value ?? '';
}

function fmt(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function valueOf(flag, fallback = '') {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function readJson(file) {
  const resolved = path.resolve(file);
  if (!existsSync(resolved)) throw new Error(`Missing JSON: ${resolved}`);
  return JSON.parse(await readFile(resolved, 'utf8'));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

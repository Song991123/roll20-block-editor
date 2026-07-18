#!/usr/bin/env node
/**
 * Compare local ChatPane rolltemplate DOM/style evidence with actual Roll20
 * chat DOM/style evidence. This is diagnostic-only: it explains why pixel
 * candidates diverge, and must not be treated as visual parity.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1');
const LOCAL_SMOKE = path.resolve(args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const OUT_DIR = path.join(RUN_DIR, 'chat-style-context-diagnostics');

const STYLE_KEYS = [
  'display',
  'boxSizing',
  'width',
  'height',
  'padding',
  'margin',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'color',
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'textAlign',
  'textRendering',
  'webkitFontSmoothing',
  'mozOsxFontSmoothing',
  'textShadow',
  'whiteSpace',
  'wordBreak',
  'overflowWrap',
  'borderCollapse',
  'tableLayout',
  'transform',
];

const IMPORTANT_SELECTORS = [
  'root',
  'table',
  'caption',
  'td:first',
  'sheet-template_label:first',
  'sheet-template_value:first',
  '.inlinerollresult:first',
];

function rel(file) {
  return path.relative(process.cwd(), file);
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function n(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/px$/, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, digits = 3) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function rectOf(node) {
  return node?.rect ?? null;
}

function styleOf(node) {
  return node?.computedStyle ?? null;
}

function childMap(template) {
  const out = new Map();
  for (const child of template?.computedChildren ?? []) {
    if (child?.selector) out.set(child.selector, child);
  }
  return out;
}

function getComparableNodes(localTemplate, actualTemplate) {
  const localChildren = childMap(localTemplate);
  const actualChildren = childMap(actualTemplate);
  return IMPORTANT_SELECTORS.map((selector) => ({
    selector,
    local: selector === 'root' ? localTemplate : localChildren.get(selector),
    actual: selector === 'root' ? actualTemplate : actualChildren.get(selector),
  }));
}

function rectDeltas(localNode, actualNode) {
  const localRect = rectOf(localNode);
  const actualRect = rectOf(actualNode);
  if (!localRect || !actualRect) return null;
  return {
    width: round((actualRect.width ?? 0) - (localRect.width ?? 0)),
    height: round((actualRect.height ?? 0) - (localRect.height ?? 0)),
    top: round((actualRect.top ?? 0) - (localRect.top ?? 0)),
    left: round((actualRect.left ?? 0) - (localRect.left ?? 0)),
  };
}

function styleDeltas(localNode, actualNode) {
  const localStyle = styleOf(localNode);
  const actualStyle = styleOf(actualNode);
  if (!localStyle || !actualStyle) return [];
  const deltas = [];
  for (const key of STYLE_KEYS) {
    const local = localStyle[key] ?? null;
    const actual = actualStyle[key] ?? null;
    if (local === actual) continue;
    const localNumber = n(local);
    const actualNumber = n(actual);
    deltas.push({
      key,
      local,
      actual,
      numericDelta: localNumber !== null && actualNumber !== null
        ? round(actualNumber - localNumber)
        : null,
    });
  }
  return deltas;
}

function rowDeltas(localTemplate, actualTemplate) {
  const localRows = localTemplate?.rowMetrics ?? [];
  const actualRows = actualTemplate?.rowMetrics ?? [];
  const count = Math.min(localRows.length, actualRows.length);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const l = localRows[i];
    const a = actualRows[i];
    const lRect = rectOf(l);
    const aRect = rectOf(a);
    if (!lRect || !aRect) continue;
    rows.push({
      index: i,
      textLocal: String(l.text ?? '').slice(0, 80),
      textActual: String(a.text ?? '').slice(0, 80),
      widthDelta: round(aRect.width - lRect.width),
      heightDelta: round(aRect.height - lRect.height),
      topDelta: round(aRect.top - lRect.top),
      cellCountDelta: (a.cells?.length ?? 0) - (l.cells?.length ?? 0),
    });
  }
  rows.sort((a, b) => Math.abs(b.heightDelta ?? 0) - Math.abs(a.heightDelta ?? 0));
  return {
    localCount: localRows.length,
    actualCount: actualRows.length,
    compared: count,
    largestHeightDeltas: rows.slice(0, 5),
  };
}

function classifyFixture(localTemplate, actualTemplate, nodes, rows) {
  const findings = [];
  const root = nodes.find((item) => item.selector === 'root');
  const table = nodes.find((item) => item.selector === 'table');
  const rootDelta = rectDeltas(root?.local, root?.actual);
  const tableDelta = rectDeltas(table?.local, table?.actual);
  const rootStyles = styleDeltas(root?.local, root?.actual);
  const tableStyles = styleDeltas(table?.local, table?.actual);

  if (Math.abs(rootDelta?.width ?? 0) >= 8) findings.push('root-width-delta');
  if (Math.abs(rootDelta?.height ?? 0) >= 8) findings.push('root-height-delta');
  if (Math.abs(tableDelta?.width ?? 0) >= 8) findings.push('table-width-delta');
  if (Math.abs(tableDelta?.height ?? 0) >= 8) findings.push('table-height-delta');
  if (rows.largestHeightDeltas.some((row) => Math.abs(row.heightDelta ?? 0) >= 8)) {
    findings.push('row-height-delta');
  }
  if (rootStyles.some((d) => ['fontFamily', 'fontSize', 'letterSpacing'].includes(d.key))) {
    findings.push('root-typography-delta');
  }
  if (tableStyles.some((d) => ['fontFamily', 'fontSize', 'letterSpacing'].includes(d.key))) {
    findings.push('table-typography-delta');
  }
  if (
    actualTemplate?.computedStyle?.width === '267px' &&
    Math.abs((rectOf(table?.actual)?.width ?? 0) - 267) > 100
  ) {
    findings.push('actual-overflow-clipped-by-chat-crop');
  }
  return findings.length ? findings : ['no-large-structured-delta'];
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Chat Style Context Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${rel(RUN_DIR)}\``);
  lines.push(`Local smoke: \`${rel(LOCAL_SMOKE)}\``);
  lines.push('');
  lines.push('Diagnostic-only comparison of local ChatPane DOM/style sidecars against actual Roll20 chat DOM/style sidecars.');
  lines.push('');
  lines.push('| Fixture | Status | Findings | Root delta W/H | Table delta W/H | Rows L/A | Largest row height deltas | Top style deltas |');
  lines.push('| --- | --- | --- | ---: | ---: | ---: | --- | --- |');
  for (const item of report.fixtures) {
    const rowSummary = item.rows.largestHeightDeltas
      .slice(0, 3)
      .map((row) => `r${row.index}:${row.heightDelta}`)
      .join(', ');
    const styleSummary = item.topStyleDeltas
      .slice(0, 6)
      .map((d) => `${d.selector}.${d.key}`)
      .join(', ');
    lines.push(
      `| \`${item.id}\` | ${item.status} | ${item.findings.join(', ')} | ${item.rootDelta?.width ?? ''}/${item.rootDelta?.height ?? ''} | ${item.tableDelta?.width ?? ''}/${item.tableDelta?.height ?? ''} | ${item.rows.localCount}/${item.rows.actualCount} | ${rowSummary} | ${styleSummary} |`,
    );
  }
  lines.push('');
  lines.push('## Fixture Details');
  for (const item of report.fixtures) {
    lines.push('');
    lines.push(`### ${item.id}`);
    lines.push('');
    lines.push(`- Status: ${item.status}`);
    lines.push(`- Findings: ${item.findings.join(', ')}`);
    lines.push(`- Root rect delta: ${JSON.stringify(item.rootDelta)}`);
    lines.push(`- Table rect delta: ${JSON.stringify(item.tableDelta)}`);
    lines.push(`- Row counts local/actual: ${item.rows.localCount}/${item.rows.actualCount}`);
    for (const row of item.rows.largestHeightDeltas.slice(0, 5)) {
      lines.push(`- Row ${row.index}: width ${row.widthDelta}, height ${row.heightDelta}, top ${row.topDelta}, cells ${row.cellCountDelta}`);
    }
    lines.push('');
    lines.push('| Selector | Property | Local | Actual | Delta |');
    lines.push('| --- | --- | --- | --- | ---: |');
    for (const d of item.topStyleDeltas.slice(0, 20)) {
      lines.push(`| \`${d.selector}\` | \`${d.key}\` | ${escapeCell(d.local)} | ${escapeCell(d.actual)} | ${d.numericDelta ?? ''} |`);
    }
  }
  lines.push('');
  lines.push('This report does not authorize production CSS changes. Use it to form the next specific renderer hypothesis.');
  return `${lines.join('\n')}\n`;
}

function escapeCell(value) {
  return `\`${String(value ?? '').replace(/\|/g, '\\|').slice(0, 120)}\``;
}

async function main() {
  const local = await readJson(LOCAL_SMOKE);
  if (!local?.fixtures) throw new Error(`Missing local smoke JSON: ${LOCAL_SMOKE}`);

  const fixtures = [];
  for (const localFixture of local.fixtures) {
    const id = localFixture.id;
    const actualPath = path.join(RUN_DIR, 'local-baseline', id, 'screenshots', 'roll20-chat-dom-evidence.json');
    const actual = await readJson(actualPath);
    const localTemplate = localFixture.cardInfo?.templateComputed;
    const actualTemplate = actual?.latestTemplate;
    if (!localTemplate || !actualTemplate) {
      fixtures.push({
        id,
        status: 'MISSING_EVIDENCE',
        actualPath: rel(actualPath),
        findings: ['missing-local-or-actual-template-style'],
        rootDelta: null,
        tableDelta: null,
        rows: { localCount: 0, actualCount: 0, compared: 0, largestHeightDeltas: [] },
        topStyleDeltas: [],
      });
      continue;
    }
    const nodes = getComparableNodes(localTemplate, actualTemplate);
    const enriched = nodes.map((node) => ({
      ...node,
      rectDelta: rectDeltas(node.local, node.actual),
      styleDeltas: styleDeltas(node.local, node.actual),
    }));
    const allStyleDeltas = enriched.flatMap((node) =>
      node.styleDeltas.map((delta) => ({
        selector: node.selector,
        ...delta,
      })),
    );
    allStyleDeltas.sort((a, b) => {
      const abs = (item) => Math.abs(item.numericDelta ?? 0);
      return abs(b) - abs(a) || String(a.selector).localeCompare(String(b.selector));
    });
    const rows = rowDeltas(localTemplate, actualTemplate);
    const findings = classifyFixture(localTemplate, actualTemplate, enriched, rows);
    fixtures.push({
      id,
      status: 'COMPARED',
      actualPath: rel(actualPath),
      localTemplateClass: localTemplate.className ?? null,
      actualTemplateClass: actualTemplate.className ?? null,
      findings,
      rootDelta: enriched.find((item) => item.selector === 'root')?.rectDelta ?? null,
      tableDelta: enriched.find((item) => item.selector === 'table')?.rectDelta ?? null,
      rows,
      topStyleDeltas: allStyleDeltas,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir: rel(RUN_DIR),
    localSmoke: rel(LOCAL_SMOKE),
    summary: {
      compared: fixtures.filter((item) => item.status === 'COMPARED').length,
      missingEvidence: fixtures.filter((item) => item.status !== 'COMPARED').length,
      findingCounts: fixtures.reduce((acc, item) => {
        for (const finding of item.findings) acc[finding] = (acc[finding] ?? 0) + 1;
        return acc;
      }, {}),
    },
    fixtures,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'chat-style-context-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'chat-style-context-diagnostics-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 CHAT STYLE CONTEXT compared=${report.summary.compared}/${fixtures.length}`);
  console.log(`out=${rel(OUT_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

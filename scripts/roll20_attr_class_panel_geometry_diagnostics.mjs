#!/usr/bin/env node
/**
 * Diagnose actual Roll20 attr_class panel geometry against stitched root
 * evidence and emitted attr_class source order.
 *
 * This reads ignored local evidence only. It does not prove Roll20 visual
 * parity and must not be used as a production renderer patch by itself.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const fixtureFilter = args[1] && !args[1].startsWith('--') ? args[1] : null;
const outDir = path.join(runDir, 'attr-class-panel-geometry-diagnostics');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_attr_class_panel_geometry_diagnostics.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

async function main() {
  const fullRoot = await readJsonIfExists(path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json'));
  const fixtureIds = (fullRoot?.fixtures ?? [])
    .map((fixture) => fixture.fixtureId)
    .filter((fixtureId) => !fixtureFilter || fixtureId === fixtureFilter);
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await analyzeFixture({ fixtureId, fullRoot }));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'actual attr_class panel root-relative geometry; not visual parity',
    summary: {
      fixtures: fixtures.length,
      compared: fixtures.filter((fixture) => fixture.status === 'COMPARED').length,
      withPartialActualBoundary: fixtures.filter((fixture) => fixture.boundary?.partialAtActualBottom).length,
      withSourceOrderHeightMatch: fixtures.filter((fixture) => fixture.sourceOrderFit?.heightClosestMatchesCandidate).length,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'attr-class-panel-geometry-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'attr-class-panel-geometry-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    console.log([
      fixture.status,
      fixture.fixtureId,
      `actualH=${fixture.actualSize?.h ?? 'n/a'}`,
      `inActual=${fixture.boundary?.intersectingValues?.length ?? 0}`,
      `fully=${fixture.boundary?.fullyContainedValues?.length ?? 0}`,
      `closest=${fixture.sourceOrderFit?.heightClosestCandidateId ?? 'n/a'}`,
    ].join(' '));
  }
  console.log(`ROLL20 ATTR CLASS PANEL GEOMETRY DIAGNOSTICS OK ${path.relative(process.cwd(), outDir)}`);
}

async function analyzeFixture({ fixtureId, fullRoot }) {
  const sidecar = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixtureId}-attr-class-state.json`));
  const fixture = (fullRoot?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  const payloadHtml = await readMaybe(path.join(runDir, 'local-baseline', fixtureId, 'payload', 'sheet.html'));
  if (!sidecar || !fixture) {
    return {
      fixtureId,
      status: 'SKIP',
      reason: !sidecar ? 'missing attr-class sidecar' : 'missing full-root candidate report fixture',
    };
  }

  const doc = sidecar.documents?.[0] ?? {};
  const rootRect = doc.root?.rect ?? null;
  const actualSize = fixture.actual?.size ?? null;
  const sourceOrderValues = collectInputValues(payloadHtml, 'attr_class');
  const panelRows = buildPanelRows({ doc, rootRect, actualSize, sourceOrderValues });
  const boundary = summarizeBoundary({ panelRows, actualSize });
  const sourceOrderFit = summarizeSourceOrderFit({ fixture, sourceOrderValues, panelRows, actualSize });

  return {
    fixtureId,
    status: 'COMPARED',
    actualSize,
    sidecarRoot: {
      rect: rootRect,
      heightDeltaVsActual: typeof rootRect?.height === 'number' && typeof actualSize?.h === 'number'
        ? Number((rootRect.height - actualSize.h).toFixed(3))
        : null,
    },
    checkedValues: doc.checkedValues ?? [],
    sourceOrderValues,
    boundary,
    sourceOrderFit,
    panelRows,
    interpretation: interpret({ boundary, sourceOrderFit }),
  };
}

function buildPanelRows({ doc, rootRect, actualSize, sourceOrderValues }) {
  const rootY = Number(rootRect?.y ?? 0);
  const sourceOrder = new Map(sourceOrderValues.map((value, index) => [slug(value), index + 1]));
  return (doc.visibleValueSections ?? [])
    .map((section) => {
      const panelNodes = (section.nodes ?? []).filter(isPanelNode).map((node) => {
        const rect = node.rect ?? {};
        const top = Number(rect.y ?? 0) - rootY;
        const height = Number(rect.height ?? 0);
        const bottom = top + height;
        return {
          className: node.className ?? '',
          tagName: node.tagName ?? '',
          top: round(top),
          bottom: round(bottom),
          height: round(height),
          width: round(Number(rect.width ?? 0)),
          intersectsActualRoot: typeof actualSize?.h === 'number' ? top < actualSize.h && bottom > 0 : null,
          fullyInsideActualRoot: typeof actualSize?.h === 'number' ? top >= 0 && bottom <= actualSize.h : null,
        };
      });
      const top = min(panelNodes.map((node) => node.top));
      const bottom = max(panelNodes.map((node) => node.bottom));
      return {
        value: section.value,
        sourceOrder: sourceOrder.get(slug(section.value)) ?? null,
        nodeCount: panelNodes.length,
        top,
        bottom,
        heightSpan: typeof top === 'number' && typeof bottom === 'number' ? round(bottom - top) : null,
        intersectsActualRoot: panelNodes.some((node) => node.intersectsActualRoot),
        fullyInsideActualRoot: panelNodes.some((node) => node.fullyInsideActualRoot),
        clippedByActualBottom: typeof actualSize?.h === 'number' && panelNodes.some((node) => node.top < actualSize.h && node.bottom > actualSize.h),
        belowActualRoot: typeof actualSize?.h === 'number' && panelNodes.every((node) => node.top >= actualSize.h),
        sampleNodes: panelNodes.slice(0, 4),
      };
    })
    .filter((row) => row.nodeCount > 0)
    .sort((a, b) => (a.sourceOrder ?? 999) - (b.sourceOrder ?? 999));
}

function summarizeBoundary({ panelRows, actualSize }) {
  const actualH = Number(actualSize?.h ?? 0) || null;
  const intersectingValues = panelRows.filter((row) => row.intersectsActualRoot).map((row) => row.value);
  const fullyContainedValues = panelRows.filter((row) => row.fullyInsideActualRoot).map((row) => row.value);
  const clippedValues = panelRows.filter((row) => row.clippedByActualBottom).map((row) => row.value);
  const belowValues = panelRows.filter((row) => row.belowActualRoot).map((row) => row.value);
  const bottomNeighbors = actualH
    ? panelRows
        .map((row) => ({
          value: row.value,
          sourceOrder: row.sourceOrder,
          top: row.top,
          bottom: row.bottom,
          bottomDelta: typeof row.bottom === 'number' ? round(row.bottom - actualH) : null,
          topDelta: typeof row.top === 'number' ? round(row.top - actualH) : null,
        }))
        .sort((a, b) => Math.abs(a.bottomDelta ?? Number.POSITIVE_INFINITY) - Math.abs(b.bottomDelta ?? Number.POSITIVE_INFINITY))
        .slice(0, 5)
    : [];
  return {
    actualRootHeight: actualH,
    intersectingValues,
    fullyContainedValues,
    clippedValues,
    belowValues,
    partialAtActualBottom: clippedValues.length > 0 || belowValues.length > 0,
    bottomNeighbors,
  };
}

function summarizeSourceOrderFit({ fixture, sourceOrderValues, panelRows, actualSize }) {
  const closest = fixture.closestRootHeightCandidate ?? null;
  const match = /attr-class-state-first-(\d+)/.exec(String(closest?.id ?? ''));
  const closestCount = match ? Number(match[1]) : null;
  const firstValues = closestCount ? sourceOrderValues.slice(0, closestCount) : [];
  const firstSlugs = new Set(firstValues.map(slug));
  const firstRows = panelRows.filter((row) => firstSlugs.has(slug(row.value)));
  const firstRowsBottom = max(firstRows.map((row) => row.bottom));
  return {
    heightClosestCandidateId: closest?.id ?? null,
    heightClosestRootDelta: closest?.rootHeightDelta ?? null,
    heightClosestMismatchPct: typeof closest?.mismatchRatio === 'number' ? Number((closest.mismatchRatio * 100).toFixed(2)) : null,
    closestCount,
    firstValues,
    firstRowsBottom,
    firstRowsBottomDeltaVsActual: typeof firstRowsBottom === 'number' && typeof actualSize?.h === 'number'
      ? round(firstRowsBottom - actualSize.h)
      : null,
    heightClosestMatchesCandidate: Boolean(closestCount && Math.abs(Number(closest?.rootHeightDelta ?? Number.POSITIVE_INFINITY)) <= 350),
  };
}

function interpret({ boundary, sourceOrderFit }) {
  const notes = [];
  if (boundary?.partialAtActualBottom) {
    notes.push(`Actual stitched root cuts through or before sidecar-visible panels: clipped=${boundary.clippedValues.join(', ') || 'none'}, below=${boundary.belowValues.join(', ') || 'none'}.`);
  }
  if (sourceOrderFit?.heightClosestMatchesCandidate) {
    notes.push(`The closest-height local candidate is ${sourceOrderFit.heightClosestCandidateId} (${sourceOrderFit.heightClosestRootDelta}px), so source-order prefix state still explains height better than actual-visible names alone.`);
  }
  if (typeof sourceOrderFit?.firstRowsBottomDeltaVsActual === 'number') {
    notes.push(`The sidecar panel bottom for the height-closest first set is ${sourceOrderFit.firstRowsBottomDeltaVsActual}px from actual stitched height.`);
  }
  if (!notes.length) notes.push('No boundary/source-order explanation was found from current sidecar geometry.');
  notes.push('Next action: inspect which DOM containers contribute to the stitched root cutoff before changing production CSS.');
  return notes;
}

function isPanelNode(node) {
  if (!node || node.visible === false) return false;
  if (String(node.tagName || '').toLowerCase() === 'input') return false;
  const rect = node.rect ?? {};
  if (Number(rect.width ?? 0) <= 0 || Number(rect.height ?? 0) <= 0) return false;
  const style = node.style ?? {};
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function collectInputValues(html, name) {
  const values = [];
  const re = /<input\b[^>]*>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const tag = match[0];
    const tagName = attr(tag, 'name');
    if (tagName !== name) continue;
    const value = attr(tag, 'value');
    if (value && !values.includes(value)) values.push(value);
  }
  return values;
}

function attr(tag, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*([\"'])(.*?)\\1`, 'i');
  return re.exec(tag)?.[2] ?? '';
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Attr Class Panel Geometry Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: actual attr_class panel root-relative geometry. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Actual H | Sidecar root H | In actual | Fully inside | Clipped | Below | Height closest | Interpretation |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    lines.push([
      `| \`${fixture.fixtureId}\``,
      fixture.status,
      String(fixture.actualSize?.h ?? ''),
      String(round(fixture.sidecarRoot?.rect?.height)),
      String(fixture.boundary?.intersectingValues?.length ?? ''),
      String(fixture.boundary?.fullyContainedValues?.length ?? ''),
      fixture.boundary?.clippedValues?.join(', ') || '',
      fixture.boundary?.belowValues?.join(', ') || '',
      fixture.sourceOrderFit?.heightClosestCandidateId ?? '',
      fixture.interpretation?.join('<br>') ?? fixture.reason ?? '',
    ].join(' | ') + ' |');
  }
  for (const fixture of report.fixtures.filter((item) => item.status === 'COMPARED')) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Checked values: \`${fixture.checkedValues.join(', ') || 'none'}\``);
    lines.push(`Height-closest first set: \`${fixture.sourceOrderFit.firstValues.join(', ') || 'none'}\``);
    lines.push('');
    lines.push('| Order | Value | Range | Intersects actual | Fully inside | Clipped | Below | Sample classes |');
    lines.push('| ---: | --- | --- | --- | --- | --- | --- | --- |');
    for (const row of fixture.panelRows) {
      lines.push(`| ${row.sourceOrder ?? ''} | ${row.value} | ${row.top}-${row.bottom} | ${yes(row.intersectsActualRoot)} | ${yes(row.fullyInsideActualRoot)} | ${yes(row.clippedByActualBottom)} | ${yes(row.belowActualRoot)} | ${row.sampleNodes.map((node) => node.className).join('<br>')} |`);
    }
    lines.push('');
    lines.push('### Bottom Neighbors');
    lines.push('');
    lines.push('| Value | Order | Top delta | Bottom delta |');
    lines.push('| --- | ---: | ---: | ---: |');
    for (const item of fixture.boundary.bottomNeighbors ?? []) {
      lines.push(`| ${item.value} | ${item.sourceOrder ?? ''} | ${item.topDelta} | ${item.bottomDelta} |`);
    }
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This report explains why actual-visible panel names may not equal full-root visual state.');
  lines.push('- It is local-only diagnostic evidence and does not prove Roll20 visual parity.');
  lines.push('- Do not commit generated reports or private sidecars from `reports/`.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readMaybe(file) {
  return existsSync(file) ? readFile(file, 'utf8') : '';
}

function min(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return finite.length ? Math.min(...finite) : null;
}

function max(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return finite.length ? Math.max(...finite) : null;
}

function round(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function yes(value) {
  return value ? 'yes' : 'no';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

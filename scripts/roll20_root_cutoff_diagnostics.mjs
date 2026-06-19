#!/usr/bin/env node
/**
 * Compare trusted stitched Roll20 root evidence against live iframe sidecar
 * root metrics to expose capture/root cutoff risk.
 *
 * This is local-only diagnostic evidence. It does not prove visual parity.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const fixtureFilter = args[1] && !args[1].startsWith('--') ? args[1] : null;
const outDir = path.join(runDir, 'root-cutoff-diagnostics');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_root_cutoff_diagnostics.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

async function main() {
  const fullRoot = await readJsonIfExists(path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json'));
  const fixtureIds = (fullRoot?.fixtures ?? [])
    .map((fixture) => fixture.fixtureId)
    .filter((fixtureId) => !fixtureFilter || fixtureId === fixtureFilter);
  const fixtures = [];
  for (const fixtureId of fixtureIds) fixtures.push(await analyzeFixture({ fixtureId, fullRoot }));

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'stitched root vs live sidecar root cutoff diagnostic; not visual parity',
    summary: {
      fixtures: fixtures.length,
      compared: fixtures.filter((fixture) => fixture.status === 'COMPARED').length,
      cutoffRisk: fixtures.filter((fixture) => fixture.cutoff?.risk === 'HIGH').length,
    },
    fixtures,
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'root-cutoff-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'root-cutoff-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    console.log([
      fixture.status,
      fixture.fixtureId,
      `stitched=${fixture.stitchedRoot?.height ?? 'n/a'}`,
      `sidecar=${fixture.sidecarRoot?.height ?? 'n/a'}`,
      `delta=${fixture.cutoff?.heightDelta ?? 'n/a'}`,
      `risk=${fixture.cutoff?.risk ?? 'n/a'}`,
    ].join(' '));
  }
  console.log(`ROLL20 ROOT CUTOFF DIAGNOSTICS OK ${path.relative(process.cwd(), outDir)}`);
}

async function analyzeFixture({ fixtureId, fullRoot }) {
  const fixture = (fullRoot?.fixtures ?? []).find((item) => item.fixtureId === fixtureId);
  const shotsDir = path.join(runDir, 'local-baseline', fixtureId, 'screenshots');
  const stitchMeta = await readJsonIfExists(path.join(shotsDir, 'roll20-sandbox-root-full-dpr-corrected.json'));
  const stitchManifest = await readJsonIfExists(path.join(shotsDir, 'roll20-root-dpr-complete-manifest.json'));
  const rootMetricsSidecar = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixtureId}-root-container-metrics.json`));
  const attrSidecar = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixtureId}-attr-class-state.json`));
  const geometrySidecar = await readJsonIfExists(path.join(runDir, 'attr-class-panel-geometry-diagnostics', 'attr-class-panel-geometry-diagnostics-results.json'));
  const panelGeometry = (geometrySidecar?.fixtures ?? []).find((item) => item.fixtureId === fixtureId) ?? null;

  if (!fixture || !stitchMeta) {
    return {
      fixtureId,
      status: 'SKIP',
      reason: !fixture ? 'missing full-root candidate fixture' : 'missing stitched root metadata',
    };
  }

  const sidecarRoot = rootMetricsSidecar?.root?.rect ?? attrSidecar?.documents?.[0]?.root?.rect ?? null;
  const sidecarSource = rootMetricsSidecar?.root?.rect
    ? `${fixtureId}-root-container-metrics.json`
    : attrSidecar?.documents?.[0]?.root?.rect
      ? `${fixtureId}-attr-class-state.json`
      : null;
  const dialogScroller = rootMetricsSidecar?.scrollers?.find((item) => item.id === 'dialog-window') ?? null;
  const stitchedHeight = Number(stitchMeta.outputSize?.h ?? stitchMeta.outputCss?.h ?? fixture.actual?.size?.h ?? 0) || null;
  const sidecarHeight = Number(sidecarRoot?.height ?? 0) || null;
  const segmentSummary = summarizeSegments(stitchManifest ?? stitchMeta);
  const cutoff = summarizeCutoff({ stitchedHeight, sidecarHeight, panelGeometry, segmentSummary });
  return {
    fixtureId,
    status: 'COMPARED',
    stitchedRoot: {
      width: stitchMeta.outputSize?.w ?? stitchMeta.outputCss?.w ?? fixture.actual?.size?.w ?? null,
      height: stitchedHeight,
      segmentCount: stitchMeta.segmentCount ?? stitchManifest?.segments?.length ?? null,
      duplicateSegmentCount: stitchMeta.segmentHashSummary?.duplicateSegmentCount ?? null,
      sourceManifest: stitchMeta.sourceManifest ?? null,
      manifestNote: stitchManifest?.note ?? null,
    },
    sidecarRoot: sidecarRoot
      ? {
          source: sidecarSource,
          width: round(sidecarRoot.width),
          height: sidecarHeight,
          x: round(sidecarRoot.x),
          y: round(sidecarRoot.y),
          dialogScrollTop: round(dialogScroller?.scroll?.scrollTop),
          dialogScrollHeight: round(dialogScroller?.scroll?.scrollHeight),
          dialogClientHeight: round(dialogScroller?.scroll?.clientHeight),
        }
      : null,
    segmentSummary,
    attrClassPanelBoundary: panelGeometry?.boundary
      ? {
          intersectingCount: panelGeometry.boundary.intersectingValues?.length ?? null,
          fullyContainedCount: panelGeometry.boundary.fullyContainedValues?.length ?? null,
          clippedValues: panelGeometry.boundary.clippedValues ?? [],
          belowValues: panelGeometry.boundary.belowValues ?? [],
        }
      : null,
    cutoff,
    interpretation: interpret({ cutoff, panelGeometry }),
  };
}

function summarizeSegments(meta) {
  const segments = meta?.segments ?? [];
  if (!segments.length) return null;
  const scrollTops = segments.map((segment) => Number(segment.scrollTop ?? segment.destCss?.y ?? segment.destPx?.y ?? 0)).filter(Number.isFinite);
  const segmentHeights = segments.map((segment) => Number(segment.destCss?.h ?? segment.destPx?.h ?? 0)).filter(Number.isFinite);
  const maxScrollTop = max(scrollTops);
  const medianAdvance = median(scrollTops.slice(1).map((value, index) => value - scrollTops[index]).filter((value) => value > 0));
  return {
    segmentCount: segments.length,
    maxScrollTop,
    medianAdvance,
    medianSegmentHeight: median(segmentHeights),
    lastSegmentBottom: typeof maxScrollTop === 'number' && segmentHeights.length ? round(maxScrollTop + (segmentHeights.at(-1) ?? 0)) : null,
    placementSource: meta?.note?.includes('visual overlap') ? 'visual-overlap-derived' : 'manifest',
  };
}

function summarizeCutoff({ stitchedHeight, sidecarHeight, panelGeometry, segmentSummary }) {
  const heightDelta = typeof sidecarHeight === 'number' && typeof stitchedHeight === 'number'
    ? round(sidecarHeight - stitchedHeight)
    : null;
  const deltaRatio = typeof heightDelta === 'number' && sidecarHeight
    ? Number((heightDelta / sidecarHeight).toFixed(4))
    : null;
  const belowValues = panelGeometry?.boundary?.belowValues ?? [];
  const clippedValues = panelGeometry?.boundary?.clippedValues ?? [];
  const visualOverlapPlacement = segmentSummary?.placementSource === 'visual-overlap-derived';
  let risk = 'LOW';
  if ((heightDelta ?? 0) > 1000 || belowValues.length || visualOverlapPlacement) risk = 'HIGH';
  else if ((heightDelta ?? 0) > 250 || clippedValues.length) risk = 'MEDIUM';
  return {
    stitchedHeight,
    sidecarHeight,
    heightDelta,
    deltaRatio,
    risk,
    visualOverlapPlacement,
    clippedValues,
    belowValues,
  };
}

function interpret({ cutoff, panelGeometry }) {
  const notes = [];
  if (!cutoff) return ['Missing cutoff evidence.'];
  if (cutoff.heightDelta > 0) {
    notes.push(`Live sidecar root is ${cutoff.heightDelta}px taller than stitched full-root evidence.`);
  }
  if (cutoff.visualOverlapPlacement) {
    notes.push('Stitch manifest placements were derived from visual overlap because iframe scrollTop/root metadata was not readable; keep this separate from renderer CSS conclusions.');
  }
  if (cutoff.clippedValues?.length || cutoff.belowValues?.length) {
    notes.push(`Panel geometry crosses the stitched cutoff: clipped=${cutoff.clippedValues.join(', ') || 'none'}, below=${cutoff.belowValues.join(', ') || 'none'}.`);
  }
  if (panelGeometry?.sourceOrderFit?.heightClosestCandidateId) {
    notes.push(`Height-closest local state remains ${panelGeometry.sourceOrderFit.heightClosestCandidateId}, so root cutoff and source-order state must be analyzed together.`);
  }
  notes.push('Next action: capture or derive authoritative Roll20 root/container height before applying production renderer CSS.');
  return notes;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Root Cutoff Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: stitched root vs live sidecar root cutoff diagnostic. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Stitched H | Sidecar H | Delta | Risk | Sidecar source | Dialog scroll | Segments | Placement | Clipped | Below | Interpretation |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- | --- | --- | ---: | --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    lines.push([
      `| \`${fixture.fixtureId}\``,
      fixture.status,
      String(fixture.stitchedRoot?.height ?? ''),
      String(fixture.sidecarRoot?.height ?? ''),
      String(fixture.cutoff?.heightDelta ?? ''),
      fixture.cutoff?.risk ?? '',
      fixture.sidecarRoot?.source ?? '',
      fmtScroll(fixture.sidecarRoot),
      String(fixture.segmentSummary?.segmentCount ?? fixture.stitchedRoot?.segmentCount ?? ''),
      fixture.segmentSummary?.placementSource ?? '',
      fixture.cutoff?.clippedValues?.join(', ') || '',
      fixture.cutoff?.belowValues?.join(', ') || '',
      fixture.interpretation?.join('<br>') ?? fixture.reason ?? '',
    ].join(' | ') + ' |');
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- A trusted stitch can still be insufficient for renderer conclusions if live sidecar root metrics are much taller.');
  lines.push('- This report is a diagnostic input to renderer gates, not a parity claim.');
  lines.push('- Generated reports and sidecars remain ignored local evidence.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function fmtScroll(sidecarRoot) {
  if (!sidecarRoot) return '';
  if (sidecarRoot.dialogScrollTop == null) return '';
  return `top=${sidecarRoot.dialogScrollTop}, h=${sidecarRoot.dialogClientHeight}/${sidecarRoot.dialogScrollHeight}`;
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

function max(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return finite.length ? Math.max(...finite) : null;
}

function median(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  if (!finite.length) return null;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 ? round(finite[mid]) : round((finite[mid - 1] + finite[mid]) / 2);
}

function round(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

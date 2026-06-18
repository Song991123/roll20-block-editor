#!/usr/bin/env node
/**
 * Audit local Roll20 stitched-root evidence before treating it as sheet-root
 * visual proof. This script reads ignored screenshot metadata only; it does
 * not contact Roll20 and does not prove visual parity.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_root_stitch_audit.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const outDir = path.join(runDir, 'root-stitch-audit');

async function main() {
  const baselineDir = path.join(runDir, 'local-baseline');
  const fixtureIds = await listFixtureIds(baselineDir);
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    fixtures.push(await auditFixture(fixtureId));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'local Roll20 stitched-root evidence audit; not visual parity',
    pass: fixtures.every((fixture) => fixture.status !== 'FAIL'),
    fixtures,
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'root-stitch-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'root-stitch-audit-results.md'), renderMarkdown(report), 'utf8');
  for (const fixture of fixtures) {
    console.log(`${fixture.status} ${fixture.fixtureId} ${fixture.primaryIssue ?? ''}`);
  }
  console.log(`ROLL20 ROOT STITCH AUDIT ${report.pass ? 'OK' : 'FOUND_ISSUES'} ${outDir}`);
  if (!report.pass) process.exitCode = 1;
}

async function auditFixture(fixtureId) {
  const shotsDir = path.join(runDir, 'local-baseline', fixtureId, 'screenshots');
  const stitchedMeta = await readJsonIfExists(path.join(shotsDir, 'roll20-sandbox-root-full.json'));
  const dprManifest = await readJsonIfExists(path.join(shotsDir, 'roll20-root-dpr-corrected-manifest.json'));
  const checks = [];
  if (stitchedMeta) checks.push(auditStitchedMeta(stitchedMeta, 'roll20-sandbox-root-full.json'));
  if (dprManifest) checks.push(auditCaptureManifest(dprManifest, 'roll20-root-dpr-corrected-manifest.json'));
  if (!checks.length) {
    return { fixtureId, status: 'SKIP', primaryIssue: 'missing stitched root metadata', checks: [] };
  }
  const failing = checks.flatMap((check) => check.issues.map((issue) => ({ source: check.source, ...issue })));
  return {
    fixtureId,
    status: failing.length ? 'FAIL' : 'PASS',
    primaryIssue: failing[0]?.message ?? null,
    checks,
  };
}

function auditStitchedMeta(meta, source) {
  const issues = [];
  const outputWidth = Number(meta.outputSize?.w ?? meta.outputCss?.w ?? 0);
  const segments = Array.isArray(meta.segments) ? meta.segments : [];
  const narrowScaled = segments.filter((segment) => {
    const imageWidth = Number(segment.imageSize?.width ?? 0);
    const destWidth = Number(segment.destPx?.w ?? outputWidth);
    return segment.cropImageFull === true && imageWidth > 0 && destWidth > 0 && imageWidth < destWidth * 0.9;
  });
  if (narrowScaled.length) {
    const first = narrowScaled[0];
    issues.push({
      code: 'scaled_full_image_segment',
      severity: 'fail',
      message: `${narrowScaled.length}/${segments.length} full-image clipped segments scale source width ${first.imageSize?.width}px into destination width ${first.destPx?.w ?? outputWidth}px; this can include VTT chrome/grid instead of sheet-root-only pixels`,
    });
  }
  issues.push(...coverageIssues({
    outputHeight: Number(meta.outputSize?.h ?? meta.outputCss?.h ?? 0),
    segments: segments.map((segment) => ({ y: Number(segment.destPx?.y ?? 0), h: Number(segment.destPx?.h ?? 0) })),
  }));
  return { source, status: issues.length ? 'FAIL' : 'PASS', segmentCount: segments.length, issues };
}

function auditCaptureManifest(manifest, source) {
  const segments = Array.isArray(manifest.segments) ? manifest.segments : [];
  const issues = coverageIssues({
    outputHeight: Number(manifest.outputCss?.h ?? 0),
    segments: segments.map((segment) => ({ y: Number(segment.destCss?.y ?? 0), h: Number(segment.destCss?.h ?? 0) })),
  });
  const firstY = Math.min(...segments.map((segment) => Number(segment.destCss?.y ?? Infinity)));
  if (Number.isFinite(firstY) && firstY > 5) {
    issues.push({
      code: 'missing_top_segment',
      severity: 'fail',
      message: `first captured segment starts at sheet y=${round(firstY)}px; recapture from the top before stitching`,
    });
  }
  return { source, status: issues.length ? 'FAIL' : 'PASS', segmentCount: segments.length, issues };
}

function coverageIssues({ outputHeight, segments }) {
  const issues = [];
  if (!Number.isFinite(outputHeight) || outputHeight <= 0 || !segments.length) return issues;
  const sorted = segments
    .filter((segment) => Number.isFinite(segment.y) && Number.isFinite(segment.h) && segment.h > 0)
    .sort((a, b) => a.y - b.y);
  let coveredUntil = 0;
  for (const segment of sorted) {
    if (segment.y > coveredUntil + 20) {
      issues.push({
        code: 'coverage_gap',
        severity: 'fail',
        message: `coverage gap from y=${round(coveredUntil)}px to y=${round(segment.y)}px`,
      });
    }
    coveredUntil = Math.max(coveredUntil, segment.y + segment.h);
  }
  if (coveredUntil < outputHeight - 20) {
    issues.push({
      code: 'coverage_incomplete',
      severity: 'fail',
      message: `coverage ends at y=${round(coveredUntil)}px before output height ${round(outputHeight)}px`,
    });
  }
  return issues;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Root Stitch Audit');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('Scope: local evidence audit only. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Primary issue | Checks |');
  lines.push('| --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| ${fixture.fixtureId} | ${fixture.status} | ${fixture.primaryIssue ?? ''} | ${fixture.checks.map((check) => `${check.source}: ${check.status}`).join('<br>')} |`);
  }
  lines.push('');
  lines.push('## Issues');
  for (const fixture of report.fixtures) {
    for (const check of fixture.checks) {
      for (const issue of check.issues) {
        lines.push(`- ${fixture.fixtureId} / ${check.source} / ${issue.code}: ${issue.message}`);
      }
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function listFixtureIds(baselineDir) {
  if (!existsSync(baselineDir)) return [];
  const entries = await readdir(baselineDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

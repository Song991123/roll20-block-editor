#!/usr/bin/env node
/**
 * Audit local Roll20 stitched-root evidence before treating it as sheet-root
 * visual proof. This script reads ignored screenshot metadata only; it does
 * not contact Roll20 and does not prove visual parity.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
  const dprCorrectedMeta = await readJsonIfExists(path.join(shotsDir, 'roll20-sandbox-root-full-dpr-corrected.json'));
  const dprManifest = await readJsonIfExists(path.join(shotsDir, 'roll20-root-dpr-corrected-manifest.json'));
  const dprCompleteManifest = await readJsonIfExists(path.join(shotsDir, 'roll20-root-dpr-complete-manifest.json'));
  const overlapDiagnostics = await readOverlapDiagnostics(shotsDir);
  const checks = [];
  if (stitchedMeta) checks.push(auditStitchedMeta(stitchedMeta, 'roll20-sandbox-root-full.json'));
  if (dprCorrectedMeta) checks.push(auditStitchedMeta(dprCorrectedMeta, 'roll20-sandbox-root-full-dpr-corrected.json'));
  if (dprManifest) checks.push(auditCaptureManifest(dprManifest, 'roll20-root-dpr-corrected-manifest.json'));
  if (dprCompleteManifest) checks.push(auditCaptureManifest(dprCompleteManifest, 'roll20-root-dpr-complete-manifest.json'));
  if (!checks.length) {
    const hasDiagnostics = overlapDiagnostics.length > 0;
    return {
      fixtureId,
      status: 'SKIP',
      primaryIssue: hasDiagnostics
        ? 'only overlap stitch diagnostic evidence is present; capture trusted DPR-corrected full-root evidence'
        : 'missing stitched root metadata',
      checks: [],
      overlapDiagnostics,
    };
  }
  const failing = checks.flatMap((check) => check.issues.map((issue) => ({ source: check.source, ...issue })));
  const preferredSources = new Set([
    'roll20-sandbox-root-full-dpr-corrected.json',
    'roll20-root-dpr-complete-manifest.json',
  ]);
  const preferredChecks = checks.filter((check) => preferredSources.has(check.source));
  const preferredFailing = preferredChecks.flatMap((check) => check.issues.map((issue) => ({ source: check.source, ...issue })));
  const hasTrustedPreferred = preferredChecks.length > 0 && preferredFailing.length === 0;
  return {
    fixtureId,
    status: hasTrustedPreferred || failing.length === 0 ? 'PASS' : 'FAIL',
    primaryIssue: hasTrustedPreferred ? null : failing[0]?.message ?? null,
    trustedEvidence: hasTrustedPreferred ? preferredChecks.map((check) => check.source) : [],
    overlapDiagnostics,
    supersededIssues: hasTrustedPreferred
      ? failing.filter((issue) => !preferredSources.has(issue.source))
      : [],
    checks,
  };
}

async function readOverlapDiagnostics(shotsDir) {
  if (!existsSync(shotsDir)) return [];
  const entries = await readdir(shotsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /overlap-stitch-diagnostic\.json$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  const diagnostics = [];
  for (const file of files) {
    const meta = await readJsonIfExists(path.join(shotsDir, file));
    if (!meta) continue;
    const placements = Array.isArray(meta.placements) ? meta.placements : [];
    const scores = placements
      .map((placement) => Number(placement.score))
      .filter((score) => Number.isFinite(score));
    diagnostics.push({
      source: file,
      status: 'DIAGNOSTIC_ONLY',
      segmentCount: Number(meta.segments?.length ?? placements.length ?? 0),
      outputSize: meta.outputSize ?? null,
      maxOverlapScore: scores.length ? round(Math.max(...scores)) : null,
      averageOverlapScore: scores.length
        ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null,
      transitionSummary: summarizeOverlapTransitions(meta, placements),
      segmentHashSummary: await summarizeSegmentHashes(meta),
      scope: meta.scope ?? 'visual-overlap diagnostic only; not trusted Roll20 full-root evidence',
    });
  }
  return diagnostics;
}

async function summarizeSegmentHashes(meta) {
  if (meta.segmentHashSummary) return meta.segmentHashSummary;
  const segments = Array.isArray(meta.segments) ? meta.segments : [];
  const items = [];
  for (const segment of segments) {
    if (!segment.file || !existsSync(segment.file)) continue;
    const bytes = await readFile(segment.file);
    items.push({
      index: segment.index,
      file: segment.file,
      hash: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.hash)) groups.set(item.hash, []);
    groups.get(item.hash).push(item);
  }
  const duplicateGroups = [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      hash: group[0].hash,
      indexes: group.map((item) => item.index),
      files: group.map((item) => path.relative(process.cwd(), item.file)),
    }));
  return {
    hashedSegmentCount: items.length,
    uniqueHashCount: groups.size,
    duplicateSegmentCount: duplicateGroups.reduce((sum, group) => sum + group.indexes.length, 0),
    duplicateGroups,
  };
}

function summarizeOverlapTransitions(meta, placements) {
  if (meta.transitionSummary) return meta.transitionSummary;
  const transitions = [];
  for (let i = 1; i < placements.length; i += 1) {
    const previous = placements[i - 1];
    const current = placements[i];
    const advance = Number(current.y) - Number(previous.y);
    transitions.push({
      from: i - 1,
      to: i,
      advance,
      overlap: current.overlapFromPrevious,
      score: current.score,
    });
  }
  const advances = transitions.map((item) => item.advance).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const scores = transitions.map((item) => Number(item.score)).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  const advanceMedian = median(advances);
  const scoreMedian = median(scores);
  const lowAdvanceLimit = advanceMedian == null ? 80 : Math.max(40, advanceMedian * 0.35);
  const highScoreLimit = scoreMedian == null ? 8 : Math.max(6, scoreMedian * 1.75);
  return {
    transitionCount: transitions.length,
    advanceMin: advances[0] ?? null,
    advanceMax: advances[advances.length - 1] ?? null,
    advanceMedian,
    scoreMin: scores[0] ?? null,
    scoreMax: scores[scores.length - 1] ?? null,
    scoreMedian,
    lowAdvanceLimit,
    highScoreLimit,
    lowAdvanceTransitions: transitions.filter((item) => Number.isFinite(item.advance) && item.advance < lowAdvanceLimit),
    highScoreTransitions: transitions.filter((item) => Number.isFinite(item.score) && item.score > highScoreLimit),
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
  lines.push('| Fixture | Status | Trusted evidence | Primary issue | Checks |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    const diagnostics = (fixture.overlapDiagnostics ?? [])
      .map((diag) => {
        const lowAdvance = diag.transitionSummary?.lowAdvanceTransitions?.length ?? 0;
        const highScore = diag.transitionSummary?.highScoreTransitions?.length ?? 0;
        const duplicateSegments = diag.segmentHashSummary?.duplicateSegmentCount ?? 0;
        return `${diag.source}: ${diag.status} (${diag.segmentCount} seg, max score ${diag.maxOverlapScore ?? 'n/a'}, low advance ${lowAdvance}, high score ${highScore}, duplicate seg ${duplicateSegments})`;
      })
      .join('<br>');
    const checks = [
      ...fixture.checks.map((check) => `${check.source}: ${check.status}`),
      diagnostics,
    ].filter(Boolean).join('<br>');
    lines.push(`| ${fixture.fixtureId} | ${fixture.status} | ${(fixture.trustedEvidence ?? []).join('<br>')} | ${fixture.primaryIssue ?? ''} | ${checks} |`);
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
  if (report.fixtures.some((fixture) => fixture.supersededIssues?.length)) {
    lines.push('');
    lines.push('## Superseded Issues');
    for (const fixture of report.fixtures) {
      for (const issue of fixture.supersededIssues ?? []) {
        lines.push(`- ${fixture.fixtureId} / ${issue.source} / ${issue.code}: ${issue.message}`);
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

function median(values) {
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2
    ? round(values[mid])
    : round((values[mid - 1] + values[mid]) / 2);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

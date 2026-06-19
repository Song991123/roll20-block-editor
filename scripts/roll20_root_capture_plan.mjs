#!/usr/bin/env node
/**
 * Create a local-only capture plan for missing Roll20 trusted full-root evidence.
 *
 * This script does not log into Roll20 and does not capture screenshots. It
 * reads the ignored actual-compare run folder, finds fixtures without trusted
 * DPR-corrected full-root evidence, and writes a concrete handoff plan with the
 * required files, commands, and a browser-side metrics snippet.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const onlyFixture = args[1] ?? '';

if (!args[0]) {
  console.error('Usage: node scripts/roll20_root_capture_plan.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

const outDir = path.join(runDir, 'roll20-root-capture-plan');

async function main() {
  if (!existsSync(runDir)) throw new Error(`missing run folder: ${runDir}`);
  const baselineDir = path.join(runDir, 'local-baseline');
  if (!existsSync(baselineDir)) throw new Error(`missing local baseline folder: ${baselineDir}`);

  const rootAudit = await readJsonIfExists(path.join(runDir, 'root-stitch-audit', 'root-stitch-audit-results.json'));
  const rendererGate = await readJsonIfExists(path.join(runDir, 'renderer-action-gate', 'renderer-action-gate-results.json'));
  const actualStatus = await readJsonIfExists(path.join(runDir, 'actual-verification-status', 'actual-verification-status-results.json'));
  const allFixtures = rootAudit?.fixtures ?? [];
  const fixtures = allFixtures.filter((fixture) => !onlyFixture || fixture.fixtureId === onlyFixture);
  if (!fixtures.length) throw new Error(`no fixture entries found${onlyFixture ? ` for ${onlyFixture}` : ''}`);

  const trustedExamples = allFixtures
    .filter((fixture) => Array.isArray(fixture.trustedEvidence) && fixture.trustedEvidence.length > 0)
    .map((fixture) => readTrustedExample(runDir, fixture.fixtureId))
    .filter(Boolean);
  const plannedFixtures = fixtures.filter((fixture) => !(Array.isArray(fixture.trustedEvidence) && fixture.trustedEvidence.length > 0));

  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'local-only Roll20 root capture handoff plan; not visual parity and not screenshot evidence',
    actualStatus: {
      status: actualStatus?.status ?? 'UNKNOWN',
      generatedActualScreenshots: ratio(actualStatus?.summary?.generatedPresentCount, actualStatus?.summary?.generatedTargetCount),
      generatedDiffed: ratio(actualStatus?.summary?.generatedDiffedCount, actualStatus?.summary?.generatedTargetCount),
      trustedFullRoot: ratio(actualStatus?.summary?.trustedFullRootCount, actualStatus?.summary?.trustedFullRootTotal),
      rendererReady: Boolean(actualStatus?.summary?.rendererReady),
    },
    rendererAction: {
      action: rendererGate?.recommendation?.action ?? 'UNKNOWN',
      blockers: rendererGate?.recommendation?.blockers ?? [],
    },
    trustedExamples,
    plannedFixtures: plannedFixtures.map((fixture) => buildFixturePlan(runDir, fixture, trustedExamples)),
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'roll20-root-capture-plan-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'roll20-root-capture-plan-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 ROOT CAPTURE PLAN ${plannedFixtures.length ? 'NEEDS_CAPTURE' : 'ALL_TRUSTED'}`);
  console.log(`run=${rel(runDir)}`);
  console.log(`plannedFixtures=${plannedFixtures.length}`);
  console.log(`trustedExamples=${trustedExamples.length}`);
  for (const fixture of report.plannedFixtures) {
    console.log(`MISSING ${fixture.fixtureId}: ${fixture.primaryIssue}`);
  }
  console.log(`out=${rel(outDir)}`);
}

function readTrustedExample(baseRunDir, fixtureId) {
  const manifestFile = path.join(baseRunDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-root-dpr-complete-manifest.json');
  if (!existsSync(manifestFile)) return null;
  try {
    const manifest = JSON.parse(readFileSyncText(manifestFile));
    return {
      fixtureId,
      manifest: rel(manifestFile),
      outputCss: manifest.outputCss ?? null,
      viewportCss: manifest.viewportCss ?? null,
      scale: manifest.scale ?? null,
      segmentCount: Array.isArray(manifest.segments) ? manifest.segments.length : 0,
      coverage: summarizeCoverage(manifest),
      segmentPattern: summarizeSegmentPattern(manifest),
    };
  } catch {
    return null;
  }
}

function buildFixturePlan(baseRunDir, fixture, trustedExamples) {
  const fixtureId = fixture.fixtureId;
  const shotsDir = path.join(baseRunDir, 'local-baseline', fixtureId, 'screenshots');
  const completeManifest = path.join(shotsDir, 'roll20-root-dpr-complete-manifest.json');
  const outputPng = path.join(shotsDir, 'roll20-sandbox-root-full-dpr-corrected.png');
  const outputJson = outputPng.replace(/\.png$/i, '.json');
  const diagnostics = (fixture.overlapDiagnostics ?? []).map((item) => ({
    source: item.source,
    segmentCount: item.segmentCount ?? 0,
    outputSize: item.outputSize ?? null,
    duplicateSegmentCount: item.segmentHashSummary?.duplicateSegmentCount ?? 0,
    maxOverlapScore: item.maxOverlapScore ?? null,
    transitionSummary: item.transitionSummary ?? null,
  }));
  const largestDiagnostic = diagnostics.slice().sort((a, b) => Number(b.segmentCount) - Number(a.segmentCount))[0] ?? null;
  return {
    fixtureId,
    status: fixture.status ?? 'MISSING',
    primaryIssue: fixture.primaryIssue ?? 'missing trusted DPR-corrected full-root evidence',
    evidenceState: {
      completeManifest: fileStatus(completeManifest),
      outputPng: fileStatus(outputPng),
      outputJson: fileStatus(outputJson),
      fallbackSandbox: fileStatus(path.join(shotsDir, 'roll20-sandbox.png')),
      fallbackDomEvidence: fileStatus(path.join(shotsDir, 'roll20-sandbox-dom-evidence.json')),
      chatPng: fileStatus(path.join(shotsDir, 'roll20-chat.png')),
      chatDomEvidence: fileStatus(path.join(shotsDir, 'roll20-chat-dom-evidence.json')),
    },
    diagnostics,
    recommendedCapture: {
      requiredFiles: [
        rel(completeManifest),
        rel(outputPng),
        rel(outputJson),
      ],
      segmentFolder: rel(path.join(shotsDir, 'roll20-root-dpr-complete-segments')),
      minimumExpectedSegmentCount: inferSegmentCount(largestDiagnostic, trustedExamples),
      requiredProperties: [
        'segment screenshots must be sheet-root-only DPR-corrected clips',
        'manifest outputCss must cover the full .charactersheet root width and height',
        'every segment should use cropImage: "full"',
        'coverage must start at y=0 and end at outputCss.h without gaps',
        'segment image hashes must not contain byte-identical duplicates',
      ],
      stitchCommand: `corepack pnpm run stitch:roll20-actual-root -- --manifest ${rel(completeManifest)} --out ${rel(outputPng)}`,
      auditCommand: `corepack pnpm run audit:roll20-root-stitch -- ${rel(baseRunDir)}`,
      diffCommand: `node scripts/roll20_actual_screenshot_diff.mjs ${rel(baseRunDir)}`,
      rendererReadyCommand: `corepack pnpm run gate:roll20-renderer-ready -- ${rel(baseRunDir)}`,
    },
    browserMetricsSnippet: renderBrowserMetricsSnippet(),
  };
}

function inferSegmentCount(largestDiagnostic, trustedExamples) {
  const diagnosticHeight = Number(largestDiagnostic?.outputSize?.h ?? 0);
  if (diagnosticHeight > 0) {
    const medianTrustedSegmentHeight = median(
      trustedExamples
        .map((example) => Number(example.segmentPattern?.medianHeight ?? 0))
        .filter((value) => value > 0),
    );
    if (medianTrustedSegmentHeight > 0) return Math.max(1, Math.ceil(diagnosticHeight / medianTrustedSegmentHeight));
  }
  const maxTrusted = Math.max(0, ...trustedExamples.map((example) => Number(example.segmentCount ?? 0)));
  return maxTrusted || null;
}

function summarizeCoverage(manifest) {
  const outputHeight = Number(manifest.outputCss?.h ?? 0);
  const segments = (manifest.segments ?? [])
    .map((segment) => ({
      y: Number(segment.destCss?.y ?? 0),
      h: Number(segment.destCss?.h ?? 0),
    }))
    .filter((segment) => Number.isFinite(segment.y) && Number.isFinite(segment.h) && segment.h > 0)
    .sort((a, b) => a.y - b.y);
  const end = segments.reduce((max, segment) => Math.max(max, segment.y + segment.h), 0);
  return {
    outputHeight,
    startsAt: segments[0]?.y ?? null,
    endsAt: end,
    complete: outputHeight > 0 && (segments[0]?.y ?? Infinity) <= 1 && end >= outputHeight - 1,
  };
}

function summarizeSegmentPattern(manifest) {
  const heights = (manifest.segments ?? [])
    .map((segment) => Number(segment.destCss?.h ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  const advances = [];
  for (let index = 1; index < (manifest.segments ?? []).length; index += 1) {
    const prevY = Number(manifest.segments[index - 1]?.destCss?.y ?? 0);
    const y = Number(manifest.segments[index]?.destCss?.y ?? 0);
    if (Number.isFinite(prevY) && Number.isFinite(y)) advances.push(y - prevY);
  }
  return {
    medianHeight: median(heights),
    medianAdvance: median(advances),
    firstScrollTop: manifest.segments?.[0]?.scrollTop ?? null,
    lastScrollTop: manifest.segments?.at?.(-1)?.scrollTop ?? manifest.segments?.[manifest.segments.length - 1]?.scrollTop ?? null,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Root Capture Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${rel(report.runDir)}\``,
    '',
    'Scope: local-only handoff plan. This is not Roll20 visual parity and not screenshot evidence.',
    '',
    '## Current Gate State',
    '',
    `- Actual status: ${report.actualStatus.status}`,
    `- Generated actual screenshots: ${report.actualStatus.generatedActualScreenshots}`,
    `- Generated diffs: ${report.actualStatus.generatedDiffed}`,
    `- Trusted full-root: ${report.actualStatus.trustedFullRoot}`,
    `- Renderer action: ${report.rendererAction.action}`,
    `- Renderer ready: ${report.actualStatus.rendererReady ? 'YES' : 'NO'}`,
    '',
  ];
  if (report.rendererAction.blockers.length) {
    lines.push('### Renderer Blockers', '');
    for (const blocker of report.rendererAction.blockers) lines.push(`- ${blocker}`);
    lines.push('');
  }

  lines.push('## Trusted Capture Examples', '');
  if (!report.trustedExamples.length) {
    lines.push('- No trusted examples found in this run.', '');
  } else {
    lines.push('| Fixture | Segments | Output CSS | Scale | Coverage | Median segment |', '| --- | ---: | --- | --- | --- | --- |');
    for (const example of report.trustedExamples) {
      lines.push(`| \`${example.fixtureId}\` | ${example.segmentCount} | ${fmtSize(example.outputCss)} | ${fmtScale(example.scale)} | ${example.coverage.complete ? 'complete' : 'incomplete'} | h=${round(example.segmentPattern.medianHeight)}, step=${round(example.segmentPattern.medianAdvance)} |`);
    }
    lines.push('');
  }

  lines.push('## Missing Trusted Root Fixtures', '');
  if (!report.plannedFixtures.length) {
    lines.push('All fixtures in this run already have trusted full-root evidence.', '');
  }
  for (const fixture of report.plannedFixtures) {
    lines.push(`### ${fixture.fixtureId}`, '');
    lines.push(`- Current status: ${fixture.status}`);
    lines.push(`- Primary issue: ${fixture.primaryIssue}`);
    lines.push(`- Minimum expected segment count: ${fixture.recommendedCapture.minimumExpectedSegmentCount ?? 'unknown until iframe/root metrics are readable'}`);
    lines.push('', '| Evidence file | Current |', '| --- | --- |');
    for (const [name, status] of Object.entries(fixture.evidenceState)) {
      lines.push(`| ${name} | ${status.exists ? 'exists' : 'missing'}: \`${status.path}\` |`);
    }
    lines.push('', '#### Existing Diagnostics', '');
    if (!fixture.diagnostics.length) {
      lines.push('- No overlap diagnostics found.', '');
    } else {
      lines.push('| Source | Segments | Output | Duplicate segments | Max overlap |', '| --- | ---: | --- | ---: | ---: |');
      for (const diagnostic of fixture.diagnostics) {
        lines.push(`| \`${diagnostic.source}\` | ${diagnostic.segmentCount} | ${fmtSize(diagnostic.outputSize)} | ${diagnostic.duplicateSegmentCount} | ${diagnostic.maxOverlapScore ?? ''} |`);
      }
      lines.push('');
    }
    lines.push('#### Required Output', '');
    for (const file of fixture.recommendedCapture.requiredFiles) lines.push(`- \`${file}\``);
    lines.push('', '#### Commands After Capture', '');
    lines.push('```bash');
    lines.push(fixture.recommendedCapture.stitchCommand);
    lines.push(fixture.recommendedCapture.auditCommand);
    lines.push(fixture.recommendedCapture.diffCommand);
    lines.push(fixture.recommendedCapture.rendererReadyCommand);
    lines.push('```', '');
    lines.push('#### Browser Metrics Snippet', '');
    lines.push('Run this in the Roll20 character iframe context when DevTools can target the sheet frame. It only prints/copies geometry; it does not capture images.');
    lines.push('```js');
    lines.push(fixture.browserMetricsSnippet);
    lines.push('```', '');
  }
  return `${lines.join('\n')}\n`;
}

function renderBrowserMetricsSnippet() {
  return `(() => {
  const root = document.querySelector('.charactersheet, #charsheet-root, .charsheet');
  if (!root) throw new Error('No Roll20 character sheet root found in this frame.');
  const rootRect = root.getBoundingClientRect();
  const scroller = document.scrollingElement || document.documentElement;
  const viewportCss = { w: innerWidth, h: innerHeight };
  const visibleTop = Math.max(0, rootRect.top);
  const visibleBottom = Math.min(innerHeight, rootRect.bottom);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const step = Math.max(100, Math.floor(visibleHeight * 0.82));
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const stops = [];
  for (let y = 0; y < maxScroll; y += step) stops.push(y);
  if (!stops.length || stops[stops.length - 1] !== maxScroll) stops.push(maxScroll);
  const manifestSkeleton = {
    note: 'Fill image names after capturing DPR-corrected sheet-root-only clips for each stop.',
    output: 'roll20-sandbox-root-full-dpr-corrected.png',
    outputCss: { w: rootRect.width, h: rootRect.height },
    viewportCss,
    scale: { x: devicePixelRatio, y: devicePixelRatio },
    segments: stops.map((scrollTop, index) => ({
      image: 'roll20-root-dpr-complete-segments/segment-' + String(index).padStart(3, '0') + '.png',
      cropImage: 'full',
      destCss: { x: 0, y: scrollTop, w: rootRect.width, h: Math.min(visibleHeight, rootRect.height - scrollTop) },
      scrollTop
    }))
  };
  console.log(JSON.stringify(manifestSkeleton, null, 2));
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(JSON.stringify(manifestSkeleton, null, 2));
  return manifestSkeleton;
})()`;
}

function fileStatus(file) {
  return { path: rel(file), exists: existsSync(file) };
}

function readFileSyncText(file) {
  return readFileSync(file, 'utf8');
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function median(values) {
  const clean = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[middle] : (clean[middle - 1] + clean[middle]) / 2;
}

function ratio(value, total) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(total))) return 'unknown';
  return `${value}/${total}`;
}

function fmtSize(size) {
  if (!size) return '';
  const w = Number(size.w ?? size.width ?? 0);
  const h = Number(size.h ?? size.height ?? 0);
  return `${round(w)}x${round(h)}`;
}

function fmtScale(scale) {
  if (!scale) return '';
  return `${round(Number(scale.x ?? 0))}x${round(Number(scale.y ?? 0))}`;
}

function round(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(3).replace(/\.?0+$/, '') : '';
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

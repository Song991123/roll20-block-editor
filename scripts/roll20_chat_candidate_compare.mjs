import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const [runDirArg = 'reports/roll20-actual-compare/2026-06-18-state-map-v1'] = args;
const runDir = path.resolve(runDirArg);
const diagnosticJson = path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json');
const outDir = path.join(runDir, 'chat-candidate-comparison');

const candidates = [
  ['default', 'reports/rolltemplate-chat-smoke/screenshots'],
  ['no-shadow', 'reports/rolltemplate-chat-smoke-no-template-shadow/screenshots'],
  ['font-fallback', 'reports/rolltemplate-chat-smoke-font-fallback/screenshots'],
  ['font-fallback-no-shadow-rejected', 'reports/rolltemplate-chat-smoke-font-fallback-no-shadow/screenshots'],
  ['text-auto-aa', 'reports/rolltemplate-chat-smoke-text-auto-aa/screenshots'],
  ['soft-shadow-rejected', 'reports/rolltemplate-chat-smoke-soft-template-shadow/screenshots'],
  ['tight-cell-spacing', 'reports/rolltemplate-chat-smoke-tight-cell-spacing/screenshots'],
  ['table-scale-x', 'reports/rolltemplate-chat-smoke-table-scale-x/screenshots'],
];

const rows = [];
for (const [name, screenshotsRelative] of candidates) {
  const screenshots = path.resolve(screenshotsRelative);
  if (!existsSync(screenshots)) {
    rows.push({ name, status: 'MISSING_SCREENSHOTS', screenshots: screenshotsRelative });
    continue;
  }
  execFileSync('node', ['scripts/roll20_chat_parity_diagnostics.mjs', runDir, screenshots], { stdio: 'pipe' });
  const report = JSON.parse(await readFile(diagnosticJson, 'utf8'));
  rows.push(summarizeReport(name, screenshotsRelative, report));
}

const defaultScreenshots = path.resolve('reports/rolltemplate-chat-smoke/screenshots');
if (existsSync(defaultScreenshots)) {
  execFileSync('node', ['scripts/roll20_chat_parity_diagnostics.mjs', runDir, defaultScreenshots], { stdio: 'pipe' });
}

const defaultRow = rows.find((row) => row.name === 'default' && row.status === 'OK');
const withDelta = rows.map((row) => {
  if (!defaultRow || row.status !== 'OK') return row;
  return {
    ...row,
    yshyAlignedDeltaPct: pctDelta(row.yshy.alignedPct, defaultRow.yshy.alignedPct),
    yshyHighlightYDeltaChange: numberDelta(row.yshy.highlightCentroidDelta?.[1], defaultRow.yshy.highlightCentroidDelta?.[1]),
  };
});

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'chat-candidate-comparison-results.json'), `${JSON.stringify({ runDir: runDirArg, generatedAt: new Date().toISOString(), candidates: withDelta }, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-candidate-comparison-results.md'), renderMarkdown(runDirArg, withDelta), 'utf8');

for (const row of withDelta) {
  if (row.status !== 'OK') {
    console.log(`SKIP ${row.name} ${row.status}`);
    continue;
  }
  console.log(`CANDIDATE ${row.name} yshy=${row.yshy.rawPct}/${row.yshy.alignedPct} delta=${row.yshyAlignedDeltaPct ?? ''} highlightYChange=${row.yshyHighlightYDeltaChange ?? ''}`);
}
console.log(`out=${path.relative(process.cwd(), outDir)}`);

function summarizeReport(name, screenshots, report) {
  const fixture = (id) => report.fixtures.find((item) => item.fixtureId === id);
  return {
    name,
    status: 'OK',
    screenshots,
    aw2e: summarizeFixture(fixture('official-roll20-AW2E')),
    lesOublies: summarizeFixture(fixture('official-roll20-Les-Oublies')),
    yshy: summarizeFixture(fixture('yshy-commission-1bu')),
    summary: {
      normalizedHighMismatch: report.summary.normalizedHighMismatch,
      alignedHighMismatch: report.summary.alignedHighMismatch,
      authoritativeNormalizedHighMismatch: report.summary.authoritativeNormalizedHighMismatch,
      maxAlignedMismatch: pct(report.summary.maxAlignedMismatchRatio),
    },
  };
}

function summarizeFixture(fixture) {
  const breakdown = fixture.bestAlignedDiffBreakdown ?? fixture.diffBreakdown ?? {};
  const geometry = breakdown.maskGeometry ?? {};
  return {
    rawPct: fixture.mismatchPct,
    alignedPct: fixture.bestAlignedMismatchPct,
    offset: fixture.bestAlignedOffset,
    highlightMismatchRatio: breakdown.masks?.highlightEither?.mismatchRatio ?? null,
    highlightMismatchShare: breakdown.masks?.highlightEither?.mismatchShare ?? null,
    shadowMismatchShare: breakdown.masks?.shadowCandidate?.mismatchShare ?? null,
    highlightLocalCount: geometry.highlightLocal?.count ?? null,
    highlightActualCount: geometry.highlightActual?.count ?? null,
    highlightCentroidDelta: centroidDelta(geometry.highlightLocal, geometry.highlightActual),
    shadowCentroidDelta: centroidDelta(geometry.shadowLocal, geometry.shadowActual),
  };
}

function centroidDelta(local, actual) {
  if (!local?.centroid || !actual?.centroid) return null;
  return [
    Number((local.centroid[0] - actual.centroid[0]).toFixed(2)),
    Number((local.centroid[1] - actual.centroid[1]).toFixed(2)),
  ];
}

function renderMarkdown(runDirLabel, candidates) {
  const lines = [
    '# Roll20 Chat Candidate Comparison',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Run: \`${runDirLabel}\``,
    '',
    '| Candidate | Status | AW2E aligned | Les aligned | YSHY raw | YSHY aligned | YSHY aligned delta | Highlight ratio | Highlight count L/A | Highlight centroid delta | Highlight Y change | Shadow share | Gate aligned high |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |',
  ];
  for (const row of candidates) {
    if (row.status !== 'OK') {
      lines.push(`| \`${row.name}\` | ${row.status} |  |  |  |  |  |  |  |  |  |  |  |`);
      continue;
    }
    lines.push(`| \`${row.name}\` | ${row.status} | ${row.aw2e.alignedPct} | ${row.lesOublies.alignedPct} | ${row.yshy.rawPct} | ${row.yshy.alignedPct} | ${row.yshyAlignedDeltaPct ?? ''} | ${pct(row.yshy.highlightMismatchRatio)} | ${row.yshy.highlightLocalCount}/${row.yshy.highlightActualCount} | ${row.yshy.highlightCentroidDelta?.join(',') ?? ''} | ${row.yshyHighlightYDeltaChange ?? ''} | ${pct(row.yshy.shadowMismatchShare)} | ${row.summary.alignedHighMismatch} |`);
  }
  lines.push('');
  lines.push('This comparison is diagnostic-only. A candidate is not production-safe unless actual Roll20 computed style and the renderer gate also support it.');
  return `${lines.join('\n')}\n`;
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number((value * 100).toFixed(2))}%` : '';
}

function pctDelta(value, base) {
  const numeric = Number.parseFloat(value);
  const baseNumeric = Number.parseFloat(base);
  if (!Number.isFinite(numeric) || !Number.isFinite(baseNumeric)) return null;
  return `${Number((numeric - baseNumeric).toFixed(2))}%`;
}

function numberDelta(value, base) {
  if (typeof value !== 'number' || typeof base !== 'number') return null;
  return Number((value - base).toFixed(2));
}

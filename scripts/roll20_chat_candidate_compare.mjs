import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && rawArgs[index - 1] !== '--out-dir');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const diagnosticJson = path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json');
const rawOutDir = readOption('--out-dir', '');
const outDir = rawOutDir ? path.resolve(rawOutDir) : path.join(runDir, 'chat-candidate-comparison');
const useIsolatedParityOutput = Boolean(rawOutDir);

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

const candidates = [
  ['default', 'reports/rolltemplate-chat-smoke/screenshots'],
  ['no-shadow', 'reports/rolltemplate-chat-smoke-no-template-shadow/screenshots'],
  ['font-fallback', 'reports/rolltemplate-chat-smoke-font-fallback/screenshots'],
  ['font-fallback-no-shadow-rejected', 'reports/rolltemplate-chat-smoke-font-fallback-no-shadow/screenshots'],
  ['text-auto-aa', 'reports/rolltemplate-chat-smoke-text-auto-aa/screenshots'],
  ['soft-shadow-rejected', 'reports/rolltemplate-chat-smoke-soft-template-shadow/screenshots'],
  ['tight-cell-spacing', 'reports/rolltemplate-chat-smoke-tight-cell-spacing/screenshots'],
  ['roll20-chat-shell-width-340', 'reports/rolltemplate-chat-smoke-roll20-chat-shell-width-340/screenshots'],
  ['aw2e-message-full-width', 'reports/rolltemplate-chat-smoke-aw2e-message-full-width/screenshots'],
  ['aw2e-message-width-font-size', 'reports/rolltemplate-chat-smoke-aw2e-message-width-font-size/screenshots'],
  ['aw2e-message-width-text-metrics', 'reports/rolltemplate-chat-smoke-aw2e-message-width-text-metrics/screenshots'],
  ['table-scale-x', 'reports/rolltemplate-chat-smoke-table-scale-x/screenshots'],
  ['aw2e-root-width-actual', 'reports/rolltemplate-chat-smoke-aw2e-root-width-actual/screenshots'],
  ['coc-table-scale-x', 'reports/rolltemplate-chat-smoke-coc-table-scale-x/screenshots'],
  ['coc-table-actual-width', 'reports/rolltemplate-chat-smoke-coc-table-actual-width/screenshots'],
  ['coc-crop-origin-y20', 'reports/rolltemplate-chat-smoke-coc-crop-origin-y20/screenshots'],
  ['coc-overflow-crop-model', 'reports/rolltemplate-chat-smoke-coc-overflow-crop-model/screenshots'],
  ['roll20-message-padding', 'reports/rolltemplate-chat-smoke-roll20-message-padding/screenshots'],
  ['roll20-break-word', 'reports/rolltemplate-chat-smoke-roll20-break-word/screenshots'],
  ['roll20-intrinsic-spacing', 'reports/rolltemplate-chat-smoke-intrinsic-spacing/screenshots'],
  ['roll20-border-spacing', 'reports/rolltemplate-chat-smoke-border-spacing/screenshots'],
  ['roll20-letter-spacing', 'reports/rolltemplate-chat-smoke-letter-spacing/screenshots'],
  ['shell-typography', 'reports/rolltemplate-chat-smoke-shell-typography/screenshots'],
  ['template-typography', 'reports/rolltemplate-chat-smoke-template-typography/screenshots'],
  ['cell-metrics', 'reports/rolltemplate-chat-smoke-cell-metrics/screenshots'],
  ['aw2e-font-size-only', 'reports/rolltemplate-chat-smoke-aw2e-font-size-only/screenshots'],
  ['aw2e-text-metrics', 'reports/rolltemplate-chat-smoke-aw2e-text-metrics/screenshots'],
  ['yshy-bookk-unavailable', 'reports/rolltemplate-chat-smoke-yshy-bookk-unavailable/screenshots'],
  ['yshy-table-font-context', 'reports/rolltemplate-chat-smoke-yshy-table-font-context/screenshots'],
  ['yshy-bookk-table-font-context', 'reports/rolltemplate-chat-smoke-yshy-bookk-table-font-context/screenshots'],
  ['yshy-bookk-missing-render', 'reports/rolltemplate-chat-smoke-yshy-bookk-missing-render/screenshots'],
  ['yshy-missing-bookk-table-font-context', 'reports/rolltemplate-chat-smoke-yshy-missing-bookk-table-font-context/screenshots'],
  ['coc-table-intrinsic-clamp', 'reports/rolltemplate-chat-smoke-coc-table-intrinsic-clamp/screenshots'],
  ['yshy-sanitize-typography', 'reports/rolltemplate-chat-smoke-yshy-sanitize-typography/screenshots'],
  ['paint-dim-background', 'reports/rolltemplate-chat-smoke-paint-dim-background/screenshots'],
  ['paint-dim-brightness', 'reports/rolltemplate-chat-smoke-paint-dim-brightness/screenshots'],
  ['paint-dim-saturate', 'reports/rolltemplate-chat-smoke-paint-dim-saturate/screenshots'],
  ['coc-background-size-actual', 'reports/rolltemplate-chat-smoke-coc-background-size-actual/screenshots'],
  ['coc-table-actual-width-dim-background', 'reports/rolltemplate-chat-smoke-coc-table-actual-width-dim-background/screenshots'],
  ['coc-crop-origin-y20-dim-background', 'reports/rolltemplate-chat-smoke-coc-crop-origin-y20-dim-background/screenshots'],
  ['paint-edge-shadow', 'reports/rolltemplate-chat-smoke-paint-edge-shadow/screenshots'],
];

const rows = [];
for (const [name, screenshotsRelative] of candidates) {
  const screenshots = path.resolve(screenshotsRelative);
  if (!existsSync(screenshots)) {
    rows.push({ name, status: 'MISSING_SCREENSHOTS', screenshots: screenshotsRelative });
    continue;
  }
  const report = await runParityDiagnostic(name, screenshots);
  rows.push(summarizeReport(name, screenshotsRelative, report));
}

const defaultScreenshots = path.resolve('reports/rolltemplate-chat-smoke/screenshots');
if (!useIsolatedParityOutput && existsSync(defaultScreenshots)) {
  execFileSync('node', ['scripts/roll20_chat_parity_diagnostics.mjs', runDir, defaultScreenshots], { stdio: 'pipe' });
}

const defaultRow = rows.find((row) => row.name === 'default' && row.status === 'OK');
const withDelta = rows.map((row) => {
  if (!defaultRow || row.status !== 'OK') return row;
  const fixtureDeltas = {
    aw2e: pctNumberDelta(row.aw2e.alignedPct, defaultRow.aw2e.alignedPct),
    lesOublies: pctNumberDelta(row.lesOublies.alignedPct, defaultRow.lesOublies.alignedPct),
    yshy: pctNumberDelta(row.yshy.alignedPct, defaultRow.yshy.alignedPct),
  };
  const deltaValues = Object.values(fixtureDeltas).filter((value) => typeof value === 'number');
  const improvedFixtures = deltaValues.filter((value) => value <= -0.5).length;
  const regressedFixtures = deltaValues.filter((value) => value >= 0.5).length;
  const maxRegressionPct = deltaValues.length ? Math.max(...deltaValues) : null;
  const meanAlignedDeltaPct = deltaValues.length
    ? Number((deltaValues.reduce((sum, value) => sum + value, 0) / deltaValues.length).toFixed(2))
    : null;
  return {
    ...row,
    fixtureAlignedDeltaPct: fixtureDeltas,
    improvedFixtures,
    regressedFixtures,
    maxRegressionPct,
    meanAlignedDeltaPct,
    promotionRisk: classifyPromotionRisk(row, {
      fixtureDeltas,
      improvedFixtures,
      regressedFixtures,
      maxRegressionPct,
      meanAlignedDeltaPct,
    }),
    yshyAlignedDeltaPct: formatPctDelta(fixtureDeltas.yshy),
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
  console.log(`CANDIDATE ${row.name} risk=${row.promotionRisk ?? ''} mean=${formatPctDelta(row.meanAlignedDeltaPct)} regressions=${row.regressedFixtures ?? ''} yshy=${row.yshy.rawPct}/${row.yshy.alignedPct} delta=${row.yshyAlignedDeltaPct ?? ''} highlightYChange=${row.yshyHighlightYDeltaChange ?? ''}`);
}
console.log(`out=${path.relative(process.cwd(), outDir)}`);

async function runParityDiagnostic(name, screenshots) {
  if (!useIsolatedParityOutput) {
    execFileSync('node', ['scripts/roll20_chat_parity_diagnostics.mjs', runDir, screenshots], { stdio: 'pipe' });
    return JSON.parse(await readFile(diagnosticJson, 'utf8'));
  }
  const parityOutDir = path.join(outDir, 'parity-probes', safeFilePart(name));
  execFileSync('node', ['scripts/roll20_chat_parity_diagnostics.mjs', runDir, screenshots, '--out-dir', parityOutDir], { stdio: 'pipe' });
  return JSON.parse(await readFile(path.join(parityOutDir, 'chat-parity-diagnostics-results.json'), 'utf8'));
}

function safeFilePart(value) {
  return String(value || 'candidate').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 120);
}

function summarizeReport(name, screenshots, report) {
  const fixture = (id) => report.fixtures.find((item) => item.fixtureId === id);
  const fixtureRows = {
    aw2e: summarizeFixture(fixture('official-roll20-AW2E')),
    lesOublies: summarizeFixture(fixture('official-roll20-Les-Oublies')),
    yshy: summarizeFixture(fixture('yshy-commission-1bu')),
  };
  const comparedFixtures = Object.values(fixtureRows).filter((row) => row.status === 'DIFFED').length;
  return {
    name,
    status: 'OK',
    screenshots,
    comparedFixtures,
    ...fixtureRows,
    summary: {
      normalizedHighMismatch: report.summary.normalizedHighMismatch,
      alignedHighMismatch: report.summary.alignedHighMismatch,
      authoritativeNormalizedHighMismatch: report.summary.authoritativeNormalizedHighMismatch,
      maxAlignedMismatch: pct(report.summary.maxAlignedMismatchRatio),
    },
  };
}

function summarizeFixture(fixture) {
  if (!fixture || fixture.status !== 'DIFFED') {
    return {
      status: fixture?.status ?? 'MISSING',
      rawPct: '',
      alignedPct: '',
      offset: null,
      highlightMismatchRatio: null,
      highlightMismatchShare: null,
      shadowMismatchShare: null,
      highlightLocalCount: null,
      highlightActualCount: null,
      highlightCentroidDelta: null,
      shadowCentroidDelta: null,
    };
  }
  const breakdown = fixture.bestAlignedDiffBreakdown ?? fixture.diffBreakdown ?? {};
  const geometry = breakdown.maskGeometry ?? {};
  return {
    status: fixture.status,
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
    '| Candidate | Status | Risk | Mean delta | Regressions | AW2E delta | Les delta | YSHY raw | YSHY aligned | YSHY delta | Highlight ratio | Highlight count L/A | Highlight centroid delta | Highlight Y change | Shadow share | Gate aligned high |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: |',
  ];
  for (const row of candidates) {
    if (row.status !== 'OK') {
      lines.push(`| \`${row.name}\` | ${row.status} |  |  |  |  |  |  |  |  |  |  |  |  |  |  |`);
      continue;
    }
    lines.push(`| \`${row.name}\` | ${row.status} | ${row.promotionRisk ?? ''} | ${formatPctDelta(row.meanAlignedDeltaPct)} | ${row.regressedFixtures ?? ''} | ${formatPctDelta(row.fixtureAlignedDeltaPct?.aw2e)} | ${formatPctDelta(row.fixtureAlignedDeltaPct?.lesOublies)} | ${row.yshy.rawPct} | ${row.yshy.alignedPct} | ${row.yshyAlignedDeltaPct ?? ''} | ${pct(row.yshy.highlightMismatchRatio)} | ${row.yshy.highlightLocalCount}/${row.yshy.highlightActualCount} | ${row.yshy.highlightCentroidDelta?.join(',') ?? ''} | ${row.yshyHighlightYDeltaChange ?? ''} | ${pct(row.yshy.shadowMismatchShare)} | ${row.summary.alignedHighMismatch} |`);
  }
  lines.push('');
  lines.push('This comparison is diagnostic-only. A candidate is not production-safe unless actual Roll20 computed style and the renderer gate also support it.');
  return `${lines.join('\n')}\n`;
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number((value * 100).toFixed(2))}%` : '';
}

function pctNumberDelta(value, base) {
  const numeric = Number.parseFloat(value);
  const baseNumeric = Number.parseFloat(base);
  if (!Number.isFinite(numeric) || !Number.isFinite(baseNumeric)) return null;
  return Number((numeric - baseNumeric).toFixed(2));
}

function formatPctDelta(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}%` : '';
}

function numberDelta(value, base) {
  if (typeof value !== 'number' || typeof base !== 'number') return null;
  return Number((value - base).toFixed(2));
}

function classifyPromotionRisk(row, summary) {
  if (row.name === 'default') return 'baseline';
  if (Number(row.comparedFixtures ?? 0) < 3) return 'fixture-local-incomplete-coverage';
  if (summary.regressedFixtures > 0) return 'reject-regresses-fixtures';
  if (summary.improvedFixtures >= 2 && (summary.maxRegressionPct ?? 0) < 0.5) return 'candidate-needs-style-proof';
  if (summary.improvedFixtures === 1) return 'single-fixture-only';
  return 'no-meaningful-gain';
}

#!/usr/bin/env node
/**
 * Route row-background/source-context work for Roll20 chat rolltemplates.
 *
 * Diagnostic only. This fuses actual/local computed background styles, row
 * compositing buckets, and rejected candidate evidence. It does not emit CSS.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--default-smoke',
  '--parity-dir',
  '--style-context-dir',
  '--row-compositing-dir',
  '--row-raster-candidates-dir',
  '--style-proof-dir',
]);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.resolve(readOption('--out-dir', path.join(runDir, 'chat-background-source-probe')));
const DEFAULT_SMOKE = readOption('--default-smoke', 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const parityDir = path.resolve(readOption('--parity-dir', path.join(runDir, 'chat-parity-diagnostics')));
const styleContextDir = path.resolve(readOption('--style-context-dir', path.join(runDir, 'chat-style-context-diagnostics')));
const rowCompositingDir = path.resolve(readOption('--row-compositing-dir', path.join(runDir, 'chat-row-compositing-probe')));
const rowRasterCandidatesDir = path.resolve(readOption('--row-raster-candidates-dir', path.join(runDir, 'chat-row-raster-candidate-comparison')));
const styleProofDir = path.resolve(readOption('--style-proof-dir', path.join(runDir, 'chat-candidate-style-proof')));

async function main() {
  const localSmoke = await readOptionalJson(DEFAULT_SMOKE);
  const parity = await readOptionalJson(path.join(parityDir, 'chat-parity-diagnostics-results.json'));
  const style = await readOptionalJson(path.join(styleContextDir, 'chat-style-context-diagnostics-results.json'));
  const compositing = await readOptionalJson(path.join(rowCompositingDir, 'chat-row-compositing-probe-results.json'));
  const rasterCandidates = await readOptionalJson(path.join(rowRasterCandidatesDir, 'chat-row-raster-candidate-comparison-results.json'));
  const styleProof = await readOptionalJson(path.join(styleProofDir, 'chat-candidate-style-proof-results.json'));
  const fixtureIds = collectFixtureIds(localSmoke, parity, style, compositing);
  const fixtures = await Promise.all(fixtureIds.map((fixtureId) => summarizeFixture(fixtureId, {
    localSmoke,
    parity,
    style,
    compositing,
    rasterCandidates,
    styleProof,
  })));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'BACKGROUND_SOURCE_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    reportOverrides: {
      outDir: rel(outDir),
      defaultSmoke: rel(path.resolve(DEFAULT_SMOKE)),
      parityDir: rel(parityDir),
      styleContextDir: rel(styleContextDir),
      rowCompositingDir: rel(rowCompositingDir),
      rowRasterCandidatesDir: rel(rowRasterCandidatesDir),
      styleProofDir: rel(styleProofDir),
    },
    scope: 'diagnostic-only background/source-context routing for Roll20 chat; no production CSS',
    summary: {
      status: actionable.length ? 'BACKGROUND_SOURCE_ACTIONABLE' : 'BACKGROUND_SOURCE_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-background-source-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-background-source-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT BACKGROUND SOURCE PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} mismatch=${fixture.alignedMismatchPct} bg=${fixture.backgroundStyleDecision} widthDelta=${fmtPx(fixture.tableWidthDelta)} lumaGain=${fmtSigned(fixture.lumaCorrectionGainPct)} bgSizeRisk=${fixture.backgroundSizeCandidateRisk || 'n/a'} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

async function summarizeFixture(fixtureId, reports) {
  const localFixture = findFixture(reports.localSmoke?.fixtures, fixtureId);
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const style = findFixture(reports.style?.fixtures, fixtureId);
  const compositing = findFixture(reports.compositing?.fixtures, fixtureId);
  const actualSidecar = await readOptionalJson(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const localTable = child(localFixture?.cardInfo?.templateComputed, 'table');
  const actualTable = child(actualSidecar?.latestTemplate, 'table');
  const priority = priorityFor(numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio));
  const backgroundStyle = compareBackgroundStyle(localTable, actualTable);
  const cocBackgroundSize = candidateByName(reports.rasterCandidates, 'coc-background-size-actual');
  const backgroundSizeStyleProof = candidateByName(reports.styleProof, 'coc-background-size-actual');
  const isFixtureCCoc = fixtureId === 'fixtureC';
  const fixtureCandidate = candidateForFixture(cocBackgroundSize, fixtureId);
  const observedTableWidthDelta = rectDelta(localTable?.rect, actualTable?.rect, 'width');
  const contextTableWidthDelta = observedTableWidthDelta ?? style?.tableDelta?.width ?? null;
  const decision = decide({
    fixtureId,
    isFixtureCCoc,
    priority,
    backgroundStyle,
    compositing,
    tableWidthDelta: contextTableWidthDelta,
    backgroundSizeCandidateRisk: isFixtureCCoc ? cocBackgroundSize?.rowRasterRisk ?? '' : '',
    fixtureCRowWeightedDeltaPct: isFixtureCCoc ? cocBackgroundSize?.fixtureCRowWeightedDeltaPct ?? null : null,
    lumaCorrectionGainPct: compositing?.summary?.lumaCorrectionGainPct ?? null,
  });
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    tableWidthDelta: contextTableWidthDelta,
    observedTableWidthDelta,
    styleContextTableWidthDelta: style?.tableDelta?.width ?? null,
    compositingDecision: compositing?.decision ?? '',
    rowWeightedMismatchPct: compositing?.summary?.rowWeightedMismatchPct ?? '',
    lumaCorrectedMismatchPct: compositing?.summary?.lumaCorrectedMismatchPct ?? '',
    lumaCorrectionGainPct: compositing?.summary?.lumaCorrectionGainPct ?? null,
    flatPaintMismatchSharePct: compositing?.summary?.flatPaintMismatchSharePct ?? '',
    localDarkerMismatchSharePct: compositing?.summary?.localDarkerMismatchSharePct ?? '',
    backgroundStyleDecision: backgroundStyle.decision,
    backgroundStyle,
    backgroundSizeCandidateRisk: isFixtureCCoc ? cocBackgroundSize?.rowRasterRisk ?? '' : '',
    backgroundSizeCandidateFixture: fixtureCandidate ? {
      rowWeightedMismatchPct: fixtureCandidate.rowWeightedMismatchPct ?? '',
      worstRowMismatchPct: fixtureCandidate.worstRowMismatchPct ?? '',
    } : null,
    backgroundSizeStyleProof: backgroundSizeStyleProof ? {
      status: backgroundSizeStyleProof.styleProofStatus ?? '',
      fixtures: backgroundSizeStyleProof.fixtures?.map((fixture) => ({
        fixtureId: fixture.fixtureId,
        status: fixture.status,
        finding: fixture.finding,
      })) ?? [],
    } : null,
    evidence: evidenceNotes({ fixtureId, isFixtureCCoc, backgroundStyle, compositing, style, cocBackgroundSize, backgroundSizeStyleProof }),
  };
}

function decide({ fixtureId, isFixtureCCoc, priority, backgroundStyle, compositing, tableWidthDelta, backgroundSizeCandidateRisk, fixtureCRowWeightedDeltaPct, lumaCorrectionGainPct }) {
  if (priority === 'P2') return 'BACKGROUND_SOURCE_SECONDARY';
  if (!backgroundStyle.localPresent || !backgroundStyle.actualPresent) return 'BACKGROUND_STYLE_EVIDENCE_MISSING';
  if (!backgroundStyle.imageEquivalent) return 'BACKGROUND_ASSET_URL_OR_PROXY_MISMATCH';
  if (fixtureId === 'fixtureA' && compositing?.decision === 'COLOR_ASSET_RASTER_MODEL_REQUIRED') {
    return 'COLOR_ASSET_RASTER_CONTEXT_REQUIRED';
  }
  if (backgroundStyle.declarationMatches && Math.abs(Number(lumaCorrectionGainPct ?? 0)) < 1 && compositing?.summary?.flatPaintMismatchShare >= 0.45) {
    return 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS';
  }
  if (isFixtureCCoc && backgroundSizeCandidateRisk === 'reject-row-raster-regression') return 'BACKGROUND_SIZE_CANDIDATE_REJECTED';
  if (Math.abs(Number(tableWidthDelta ?? 0)) > 8 && backgroundStyle.declarationMatches) {
    return 'TABLE_WIDTH_CONTEXT_BEFORE_BACKGROUND_CSS';
  }
  if (isFixtureCCoc && typeof fixtureCRowWeightedDeltaPct === 'number' && fixtureCRowWeightedDeltaPct < -0.5) return 'BACKGROUND_SIZE_NEEDS_STYLE_PROOF';
  if (backgroundStyle.imageEquivalent && !backgroundStyle.declarationMatches) return 'BACKGROUND_DECLARATION_DIFFERS';
  return 'BACKGROUND_SOURCE_SECONDARY';
}

function nextAction(decision) {
  switch (decision) {
    case 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS':
      return 'inspect rendered background raster/source context: same CSS declarations produce different flat pixels, and simple luma correction is weak';
    case 'BACKGROUND_SIZE_CANDIDATE_REJECTED':
      return 'do not tune background-size; it regresses row raster. Inspect table/crop/source raster context instead';
    case 'TABLE_WIDTH_CONTEXT_BEFORE_BACKGROUND_CSS':
      return 'model table width/crop context before any background CSS candidate';
    case 'COLOR_ASSET_RASTER_CONTEXT_REQUIRED':
      return 'keep fixtureA on its color/asset raster axis; do not reuse fixtureC/CoC background-size candidates';
    case 'BACKGROUND_DECLARATION_DIFFERS':
      return 'compare exact background declarations and Roll20-side cascade before trying pixel-tuned CSS';
    case 'BACKGROUND_ASSET_URL_OR_PROXY_MISMATCH':
      return 'compare asset URL proxying/loading and fetched image bytes before renderer CSS';
    case 'BACKGROUND_STYLE_EVIDENCE_MISSING':
      return 'recapture local and actual computed table background style evidence';
    case 'BACKGROUND_SIZE_NEEDS_STYLE_PROOF':
      return 'prove any background-size change against actual Roll20 computed style before pixel tuning';
    default:
      return 'keep background source secondary for this fixture';
  }
}

function compareBackgroundStyle(localTable, actualTable) {
  const local = localTable?.computedStyle ?? null;
  const actual = actualTable?.computedStyle ?? null;
  const keys = ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'filter'];
  const deltas = Object.fromEntries(keys.map((key) => [key, {
    local: normalizeStyleValue(local?.[key]),
    actual: normalizeStyleValue(actual?.[key]),
    matches: key === 'backgroundImage'
      ? equivalentUrl(local?.[key]) === equivalentUrl(actual?.[key])
      : normalizeStyleValue(local?.[key]) === normalizeStyleValue(actual?.[key]),
  }]));
  const localPresent = Boolean(local);
  const actualPresent = Boolean(actual);
  const imageEquivalent = localPresent && actualPresent && deltas.backgroundImage.matches;
  const declarationMatches = imageEquivalent && deltas.backgroundColor.matches && deltas.backgroundSize.matches && deltas.backgroundPosition.matches && deltas.filter.matches;
  return {
    localPresent,
    actualPresent,
    imageEquivalent,
    declarationMatches,
    decision: !localPresent || !actualPresent
      ? 'MISSING'
      : declarationMatches
        ? 'DECLARATIONS_MATCH'
        : imageEquivalent
          ? 'IMAGE_MATCH_STYLE_DIFFERS'
          : 'IMAGE_DIFFERS',
    deltas,
    localTableRect: localTable?.rect ?? null,
    actualTableRect: actualTable?.rect ?? null,
  };
}

function evidenceNotes({ fixtureId, isFixtureCCoc, backgroundStyle, compositing, style, cocBackgroundSize, backgroundSizeStyleProof }) {
  const notes = [];
  notes.push(`background style ${backgroundStyle.decision}`);
  notes.push(`table width delta ${fmtPx(style?.tableDelta?.width)}`);
  const observedDelta = rectDelta(backgroundStyle.localTableRect, backgroundStyle.actualTableRect, 'width');
  if (observedDelta != null) notes.push(`observed local-vs-actual table rect width delta ${fmtPx(observedDelta)}`);
  if (compositing?.decision) {
    notes.push(`compositing ${compositing.decision}: weighted ${compositing.summary?.rowWeightedMismatchPct || 'n/a'}, luma-corrected ${compositing.summary?.lumaCorrectedMismatchPct || 'n/a'} (${fmtSigned(compositing.summary?.lumaCorrectionGainPct)})`);
    notes.push(`flat ${compositing.summary?.flatPaintMismatchSharePct || 'n/a'}, local darker ${compositing.summary?.localDarkerMismatchSharePct || 'n/a'}`);
  }
  if (isFixtureCCoc && cocBackgroundSize) {
    notes.push(`coc-background-size-actual row raster risk ${cocBackgroundSize.rowRasterRisk || 'n/a'}, fixtureC weighted delta ${fmtSigned(cocBackgroundSize.fixtureCRowWeightedDeltaPct)}, worst delta ${fmtSigned(cocBackgroundSize.fixtureCWorstRowDeltaPct)}`);
  } else if (cocBackgroundSize) {
    notes.push(`coc-background-size-actual is fixtureC/CoC-scoped; ${fixtureId} keeps its own compositing/style axis`);
  }
  if (backgroundSizeStyleProof) {
    notes.push(`coc-background-size-actual style proof ${backgroundSizeStyleProof.styleProofStatus || 'n/a'}`);
  }
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Background Source Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report routes background/source-context investigation and does not authorize production CSS.',
    '',
    '| Fixture | Priority | Decision | Mismatch | Background | Table width delta | Weighted | Luma gain | Background-size risk | Next |',
    '| --- | --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.alignedMismatchPct} | ${fixture.backgroundStyleDecision} | ${fmtPx(fixture.tableWidthDelta)} | ${fixture.rowWeightedMismatchPct || 'n/a'} | ${fmtSigned(fixture.lumaCorrectionGainPct)} | ${fixture.backgroundSizeCandidateRisk || 'n/a'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- Generated reports and actual Roll20 evidence stay local-only.');
  lines.push('- This does not prove Roll20 visual parity.');
  return `${lines.join('\n')}\n`;
}

function child(template, selector) {
  return (template?.computedChildren ?? []).find((item) => item.selector === selector) ?? null;
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      const id = fixture.fixtureId ?? fixture.id;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
}

function candidateByName(report, name) {
  return (report?.candidates ?? []).find((candidate) => candidate.name === name) ?? null;
}

function candidateForFixture(candidate, fixtureId) {
  if (!candidate) return null;
  if (fixtureId === 'fixtureA') return candidate.fixtureA ?? null;
  if (fixtureId === 'fixtureB') return candidate.lesOublies ?? null;
  if (fixtureId === 'fixtureC') return candidate.fixtureC ?? null;
  return null;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function normalizeStyleValue(value) {
  return String(value ?? '')
    .replace(/%2F/gi, '/')
    .replace(/https%3A/gi, 'https:')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function equivalentUrl(value) {
  return normalizeStyleValue(value)
    .replace('https://imgsrv.roll20.net/?src=', '')
    .replace(/https:\/*/g, 'https://')
    .replace(/\/+/g, '/')
    .replace('https:/', 'https://');
}

function priorityFor(mismatch) {
  if (mismatch > 0.1) return 'P0';
  if (mismatch > 0.06) return 'P1';
  return 'P2';
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rectDelta(localRect, actualRect, key) {
  const localValue = numberOrNull(localRect?.[key]);
  const actualValue = numberOrNull(actualRect?.[key]);
  if (localValue == null || actualValue == null) return null;
  return Number((localValue - actualValue).toFixed(3));
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function fmtPx(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number(value.toFixed(3))}px` : 'n/a';
}

function fmtSigned(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

await main();

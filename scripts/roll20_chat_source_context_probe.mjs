#!/usr/bin/env node
/**
 * Classify Roll20 chat source/context mismatches before renderer changes.
 *
 * Diagnostic only. This probe ties together actual Roll20 chat CSS evidence,
 * font availability, computed table styles, text measurement, and intrinsic
 * width reports. It does not emit product CSS or claim visual parity.
 */

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set([
  '--out-dir',
  '--default-smoke',
  '--font-intrinsic-dir',
  '--row-paint-source-dir',
  '--width-reconciliation-dir',
  '--intrinsic-width-dir',
]);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const defaultSmokeArg = readOption('--default-smoke', 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json');
const defaultSmokePath = path.resolve(defaultSmokeArg);
const outDir = path.resolve(readOption('--out-dir', path.join(runDir, 'chat-source-context-probe')));
const fontIntrinsicDir = path.resolve(readOption('--font-intrinsic-dir', path.join(runDir, 'chat-font-intrinsic-probe')));
const rowPaintSourceDirExplicit = hasOption('--row-paint-source-dir');
let rowPaintSourceDir = path.resolve(readOption('--row-paint-source-dir', path.join(runDir, 'chat-row-paint-source-probe')));
const widthReconciliationDir = path.resolve(readOption('--width-reconciliation-dir', path.join(runDir, 'chat-width-reconciliation')));
const intrinsicWidthDir = path.resolve(readOption('--intrinsic-width-dir', path.join(runDir, 'chat-intrinsic-width-model')));

const STYLE_KEYS = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'overflowWrap',
  'borderCollapse',
  'borderSpacing',
  'tableLayout',
  'width',
  'backgroundImage',
  'backgroundSize',
  'filter',
  'transform',
];
const CUSTOM_FONT_RE = /BookkMyungjo-Bd/i;

async function main() {
  await resolveImplicitReportOverrides();

  const defaultSmoke = await readJson(defaultSmokePath);
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const fontIntrinsic = await readOptionalJson(path.join(fontIntrinsicDir, 'chat-font-intrinsic-probe-results.json'));
  const rowPaintSource = await readOptionalJson(path.join(rowPaintSourceDir, 'chat-row-paint-source-probe-results.json'));
  const widthReconciliation = await readOptionalJson(path.join(widthReconciliationDir, 'chat-width-reconciliation-results.json'));
  const intrinsicWidth = await readOptionalJson(path.join(intrinsicWidthDir, 'chat-intrinsic-width-model-results.json'));

  const fixtureIds = collectFixtureIds(defaultSmoke, parity, fontIntrinsic, rowPaintSource, widthReconciliation, intrinsicWidth);
  const fixtures = await Promise.all(fixtureIds.map((fixtureId) => summarizeFixture(fixtureId, {
    defaultSmoke,
    parity,
    fontIntrinsic,
    rowPaintSource,
    widthReconciliation,
    intrinsicWidth,
  })));
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && !['SOURCE_CONTEXT_SECONDARY', 'MISSING_EVIDENCE'].includes(fixture.decision));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only Roll20 chat source/context probe; no production CSS',
    reportOverrides: {
      outDir: rel(outDir),
      defaultSmoke: rel(defaultSmokePath),
      fontIntrinsicDir: rel(fontIntrinsicDir),
      rowPaintSourceDir: rel(rowPaintSourceDir),
      widthReconciliationDir: rel(widthReconciliationDir),
      intrinsicWidthDir: rel(intrinsicWidthDir),
    },
    summary: {
      status: actionable.length ? 'SOURCE_CONTEXT_ACTIONABLE' : 'SOURCE_CONTEXT_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-source-context-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-source-context-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT SOURCE CONTEXT ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} mismatch=${fixture.alignedMismatchPct || 'n/a'} css=${fixture.cssEvidence.classification || 'n/a'} font=${fixture.fontActivation.decision} table=${fixture.tableContext.decision} next=${fixture.nextAction}`);
  }
  console.log(`out=${rel(outDir)}`);
}

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index === -1) return fallback;
  const value = rawArgs[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

function hasOption(name) {
  return rawArgs.includes(name);
}

async function resolveImplicitReportOverrides() {
  if (rowPaintSourceDirExplicit) return;

  const reportFileName = 'chat-row-paint-source-probe-results.json';
  const currentReport = await readOptionalJson(path.join(rowPaintSourceDir, reportFileName));
  if (rowPaintSourceHasSanitizeReplayRejection(currentReport)) return;

  const fallbackDir = await findLatestFallbackReportDir(
    ['chat-row-paint-source-probe', 'chat-row-paint-source', 'row-paint-source'],
    reportFileName,
    (candidateReport) => rowPaintSourceReportImproves(candidateReport, currentReport),
  );
  if (fallbackDir) rowPaintSourceDir = fallbackDir;
}

async function summarizeFixture(fixtureId, reports) {
  const localFixture = findSmokeFixture(reports.defaultSmoke, fixtureId);
  const actualSidecar = await readOptionalJson(path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'));
  const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  const localTable = child(localTemplate, 'table');
  const actualTable = child(actualTemplate, 'table');
  const localCaption = child(localTemplate, 'caption');
  const actualCaption = child(actualTemplate, 'caption');
  const localFirstCell = child(localTemplate, 'td:first');
  const actualFirstCell = child(actualTemplate, 'td:first');
  const parity = findFixture(reports.parity?.fixtures, fixtureId);
  const fontIntrinsic = findFixture(reports.fontIntrinsic?.fixtures, fixtureId);
  const rowPaintSource = findFixture(reports.rowPaintSource?.fixtures, fixtureId);
  const widthReconciliation = findFixture(reports.widthReconciliation?.fixtures, fixtureId);
  const intrinsicWidth = findFixture(reports.intrinsicWidth?.fixtures, fixtureId);
  const priority = priorityFor(parity);

  if (!localTemplate || !actualTemplate || !localTable || !actualTable) {
    return {
      fixtureId,
      priority,
      decision: 'MISSING_EVIDENCE',
      nextAction: 'recapture local smoke and actual Roll20 chat DOM sidecar with current computed style and table metrics',
      alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
      cssEvidence: summarizeCssEvidence(actualSidecar),
      fontActivation: { decision: 'MISSING_FONT_EVIDENCE', changedFonts: [] },
      tableContext: { decision: 'MISSING_TABLE_EVIDENCE' },
      styleDiffs: {},
      evidence: ['missing local or actual template/table evidence'],
    };
  }

  const styleDiffs = {
    template: compareStyles(localTemplate, actualTemplate, STYLE_KEYS),
    table: compareStyles(localTable, actualTable, STYLE_KEYS),
    caption: compareStyles(localCaption, actualCaption, STYLE_KEYS),
    firstCell: compareStyles(localFirstCell, actualFirstCell, STYLE_KEYS),
  };
  const cssEvidence = summarizeCssEvidence(actualSidecar);
  const fontActivation = classifyFontActivation({
    localFontEvidence: localFixture?.cardInfo?.fontEvidence,
    actualFontEvidence: actualSidecar?.fontEvidence,
    localTable,
    actualTable,
    localTemplate,
    actualTemplate,
  });
  const textMeasure = compareTextMeasure(
    localFixture?.cardInfo?.textMeasureEvidence ?? localTemplate?.textMeasureEvidence,
    actualSidecar?.textMeasureEvidence ?? actualTemplate?.textMeasureEvidence,
  );
  const tableContext = classifyTableContext({
    styleDiffs,
    textMeasure,
    widthReconciliation,
    intrinsicWidth,
    localTable,
    actualTable,
    localTemplate,
    actualTemplate,
  });
  const sanitizeReplayRejected = rowPaintSource?.decision === 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED' ||
    rowPaintSource?.sourceOrderDecision === 'SANITIZE_STYLE_REPLAY_REJECTED';
  const decision = decide({
    priority,
    cssEvidence,
    fontActivation,
    tableContext,
    sanitizeReplayRejected,
    rowPaintSource,
  });

  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision, fixtureId),
    alignedMismatchPct: parity?.bestAlignedMismatchPct ?? '',
    alignedMismatchRatio: numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio),
    cssEvidence,
    fontActivation,
    textMeasure,
    tableContext,
    rowPaintSource: rowPaintSource
      ? {
          decision: rowPaintSource.decision ?? '',
          sourceOrderDecision: rowPaintSource.sourceOrderDecision ?? '',
          sanitizeReplayDeltaPct: rowPaintSource.sourceEvidence?.sanitizeReplayDeltaPct ?? null,
        }
      : null,
    fontIntrinsic: fontIntrinsic
      ? {
          decision: fontIntrinsic.decision ?? '',
          intrinsicDecision: fontIntrinsic.intrinsicDecision ?? '',
          textWidthDecision: fontIntrinsic.textWidthDecision ?? '',
          widthOverrideGain: fontIntrinsic.widthOverrideGain ?? '',
        }
      : null,
    styleDiffs,
    boxDeltas: {
      templateWidth: delta(widthOf(localTemplate), widthOf(actualTemplate)),
      tableWidth: delta(widthOf(localTable), widthOf(actualTable)),
      tableScrollWidth: delta(localTable.boxMetrics?.scrollWidth, actualTable.boxMetrics?.scrollWidth),
      captionWidth: delta(widthOf(localCaption), widthOf(actualCaption)),
      firstCellWidth: delta(widthOf(localFirstCell), widthOf(actualFirstCell)),
    },
    evidence: evidenceNotes({
      cssEvidence,
      fontActivation,
      textMeasure,
      tableContext,
      rowPaintSource,
      styleDiffs,
    }),
  };
}

function decide({ priority, cssEvidence, fontActivation, tableContext, sanitizeReplayRejected, rowPaintSource }) {
  if (priority === 'P2') return 'SOURCE_CONTEXT_SECONDARY';
  if (!cssEvidence.classification) return 'MISSING_EVIDENCE';
  if (sanitizeReplayRejected) return 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED';
  if (
    cssEvidence.expectedRulePresent &&
    fontActivation.decision === 'FONT_FACE_ACTIVATION_DIFFERS' &&
    tableContext.decision === 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED'
  ) {
    return 'RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED';
  }
  if (fontActivation.decision === 'FONT_FACE_ACTIVATION_DIFFERS') return 'FONT_FACE_ACTIVATION_REQUIRED';
  if (tableContext.decision === 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED') return 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED';
  if (rowPaintSource?.decision && rowPaintSource.decision !== 'KEEP_CURRENT_AXIS') return rowPaintSource.decision;
  return 'SOURCE_CONTEXT_SECONDARY';
}

function nextAction(decision, fixtureId = '') {
  const isCoc = fixtureId === 'yshy-commission-1bu';
  switch (decision) {
    case 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED':
      return 'do not replay observed sanitized typography as local CSS; inspect actual Roll20 rule order, font activation, and table intrinsic context together';
    case 'RULE_ORDER_FONT_FACE_TABLE_CONTEXT_REQUIRED':
      return isCoc
        ? 'build a CoC/YSHY diagnostic model that mirrors Roll20 CSS rule order plus font-face availability before table min-content sizing'
        : 'build a template-scoped diagnostic model that mirrors Roll20 CSS rule order plus font-face availability before intrinsic table sizing';
    case 'FONT_FACE_ACTIVATION_REQUIRED':
      return 'compare Roll20 and local font-face activation/order; do not force broad table typography yet';
    case 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED':
      return 'model table intrinsic width/source context without transform, filter, or broad typography hacks';
    case 'MISSING_EVIDENCE':
      return 'recapture or rerun required Roll20 chat sidecar and local smoke evidence';
    default:
      return 'keep current renderer axis; no source-context promotion from this evidence';
  }
}

function summarizeCssEvidence(sidecar) {
  const css = sidecar?.chatCssEvidence ?? {};
  return {
    classification: css.classification ?? '',
    expectedRulePresent: Boolean(css.anyExpectedRulePresent),
    unprefixedRulePresent: Boolean(css.unprefixedRulePresent),
    scopedUnprefixedRulePresent: Boolean(css.scopedUnprefixedRulePresent),
    styleElementCount: numberOrNull(css.styleElementCount),
    stylesheetLinkCount: numberOrNull(css.stylesheetLinkCount),
    styleTextLength: numberOrNull(css.styleTextLength),
    templateCount: numberOrNull(css.templateCount),
  };
}

function classifyFontActivation({ localFontEvidence, actualFontEvidence, localTable, actualTable, localTemplate, actualTemplate }) {
  const localChecks = checkMap(localFontEvidence);
  const actualChecks = checkMap(actualFontEvidence);
  const changedFonts = [];
  for (const [spec, localOk] of localChecks.entries()) {
    if (!CUSTOM_FONT_RE.test(spec)) continue;
    const actualOk = actualChecks.get(spec);
    if (actualOk != null && Boolean(localOk) !== Boolean(actualOk)) {
      changedFonts.push({ spec, localOk: Boolean(localOk), actualOk: Boolean(actualOk) });
    }
  }
  const tableFontDiffers = !sameCss(localTable?.computedStyle?.fontFamily, actualTable?.computedStyle?.fontFamily);
  const templateFontDiffers = !sameCss(localTemplate?.computedStyle?.fontFamily, actualTemplate?.computedStyle?.fontFamily);
  const actualCustomFontFailed = changedFonts.some((item) => item.localOk && !item.actualOk);
  const decision = actualCustomFontFailed || tableFontDiffers || templateFontDiffers
    ? 'FONT_FACE_ACTIVATION_DIFFERS'
    : 'FONT_CONTEXT_SECONDARY';
  return {
    decision,
    localStatus: localFontEvidence?.status ?? '',
    actualStatus: actualFontEvidence?.status ?? '',
    changedFonts,
    actualCustomFontFailed,
    tableFontDiffers,
    templateFontDiffers,
    localTableFontFamily: localTable?.computedStyle?.fontFamily ?? '',
    actualTableFontFamily: actualTable?.computedStyle?.fontFamily ?? '',
    localTemplateFontFamily: localTemplate?.computedStyle?.fontFamily ?? '',
    actualTemplateFontFamily: actualTemplate?.computedStyle?.fontFamily ?? '',
  };
}

function classifyTableContext({ styleDiffs, textMeasure, widthReconciliation, intrinsicWidth, localTable, actualTable, localTemplate, actualTemplate }) {
  const mismatchedTableStyles = Object.entries(styleDiffs.table ?? {})
    .filter(([key, value]) => !value.same && ['borderSpacing', 'fontFamily', 'fontSize', 'letterSpacing', 'overflowWrap', 'width'].includes(key))
    .map(([key]) => key);
  const tableWidthDelta = delta(widthOf(localTable), widthOf(actualTable));
  const tableScrollWidthDelta = delta(localTable?.boxMetrics?.scrollWidth, actualTable?.boxMetrics?.scrollWidth);
  const templateWidthDelta = delta(widthOf(localTemplate), widthOf(actualTemplate));
  const widthNextExperiment = widthReconciliation?.nextExperiment ?? '';
  const intrinsicDecision = intrinsicWidth?.intrinsicDecision ?? intrinsicWidth?.decision ?? '';
  const decision = (
    widthNextExperiment === 'TABLE_SCROLL_INTRINSIC' ||
    /INTRINSIC|SANITIZE|TABLE/.test(intrinsicDecision) ||
    Math.abs(tableWidthDelta ?? 0) >= 8 ||
    mismatchedTableStyles.length >= 3
  )
    ? 'TABLE_INTRINSIC_SOURCE_CONTEXT_REQUIRED'
    : 'TABLE_CONTEXT_SECONDARY';
  return {
    decision,
    widthNextExperiment,
    intrinsicDecision,
    tableWidthDelta,
    tableScrollWidthDelta,
    templateWidthDelta,
    mismatchedTableStyles,
    comparedTextMeasureSamples: textMeasure.comparedSamples,
    maxTextMeasureDelta: textMeasure.maxWidthDelta,
    meanTextMeasureDelta: textMeasure.meanWidthDelta,
  };
}

function compareTextMeasure(localEvidence, actualEvidence) {
  const localSamples = Array.isArray(localEvidence?.samples) ? localEvidence.samples : [];
  const actualSamples = Array.isArray(actualEvidence?.samples) ? actualEvidence.samples : [];
  const actualBySelector = new Map(actualSamples.map((sample) => [sample.selector, sample]));
  const compared = [];
  for (const local of localSamples) {
    const actual = actualBySelector.get(local.selector);
    if (!actual) continue;
    compared.push({
      selector: local.selector,
      localFont: local.font ?? '',
      actualFont: actual.font ?? '',
      localWidth: numberOrNull(local.metrics?.width),
      actualWidth: numberOrNull(actual.metrics?.width),
      widthDelta: delta(local.metrics?.width, actual.metrics?.width),
      localElementWidth: numberOrNull(local.elementWidth),
      actualElementWidth: numberOrNull(actual.elementWidth),
      elementWidthDelta: delta(local.elementWidth, actual.elementWidth),
    });
  }
  const deltas = compared.map((item) => item.widthDelta).filter((value) => typeof value === 'number');
  return {
    localSamples: localSamples.length,
    actualSamples: actualSamples.length,
    comparedSamples: compared.length,
    meanWidthDelta: deltas.length ? Number((deltas.reduce((sum, value) => sum + Math.abs(value), 0) / deltas.length).toFixed(3)) : null,
    maxWidthDelta: deltas.length ? Number(Math.max(...deltas.map((value) => Math.abs(value))).toFixed(3)) : null,
    samples: compared.slice(0, 8),
  };
}

function compareStyles(local, actual, keys) {
  return Object.fromEntries(keys.map((key) => {
    const localValue = local?.computedStyle?.[key] ?? '';
    const actualValue = actual?.computedStyle?.[key] ?? '';
    return [key, {
      local: localValue,
      actual: actualValue,
      same: sameCss(localValue, actualValue),
    }];
  }));
}

function evidenceNotes({ cssEvidence, fontActivation, textMeasure, tableContext, rowPaintSource, styleDiffs }) {
  const notes = [];
  notes.push(`actual CSS ${cssEvidence.classification || 'missing'}; expected rule present=${cssEvidence.expectedRulePresent ? 'yes' : 'no'}; styles=${cssEvidence.styleElementCount ?? 'n/a'} links=${cssEvidence.stylesheetLinkCount ?? 'n/a'}`);
  notes.push(`font activation ${fontActivation.decision}; changed custom specs=${fontActivation.changedFonts.length}`);
  if (fontActivation.actualCustomFontFailed) notes.push('local custom font checks pass while actual Roll20 custom font checks fail');
  notes.push(`table context ${tableContext.decision}; table width delta=${fmtPx(tableContext.tableWidthDelta)}, scroll delta=${fmtPx(tableContext.tableScrollWidthDelta)}, style diffs=${tableContext.mismatchedTableStyles.join(', ') || 'none'}`);
  if (textMeasure.comparedSamples) notes.push(`text measure compared ${textMeasure.comparedSamples} samples; max delta=${fmtPx(textMeasure.maxWidthDelta)}, mean abs delta=${fmtPx(textMeasure.meanWidthDelta)}`);
  if (rowPaintSource?.decision) notes.push(`row/paint/source prior decision ${rowPaintSource.decision}; source=${rowPaintSource.sourceOrderDecision ?? 'n/a'}; sanitize replay delta=${fmtSigned(rowPaintSource.sourceEvidence?.sanitizeReplayDeltaPct)}`);
  const tableFilter = styleDiffs.table?.filter;
  if (tableFilter) notes.push(`table filter local=${tableFilter.local || 'n/a'} actual=${tableFilter.actual || 'n/a'}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Source Context Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report routes Roll20 chat renderer work before production CSS is changed.',
    '',
    '| Fixture | Priority | Decision | Mismatch | CSS | Font | Table | Width delta | Text samples | Next action |',
    '| --- | --- | --- | ---: | --- | --- | --- | ---: | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.alignedMismatchPct || ''} | ${fixture.cssEvidence.classification || ''} | ${fixture.fontActivation.decision || ''} | ${fixture.tableContext.decision || ''} | ${fmtPx(fixture.tableContext.tableWidthDelta)} | ${fixture.textMeasure.comparedSamples ?? 0} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence ?? []) lines.push(`- ${note}`);
    if (fixture.fontActivation.changedFonts?.length) {
      lines.push(`- changed font specs: ${fixture.fontActivation.changedFonts.map((item) => `${item.spec} local=${item.localOk ? 'yes' : 'no'} actual=${item.actualOk ? 'yes' : 'no'}`).join('; ')}`);
    }
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- This is source/context routing evidence, not visual parity.');
  lines.push('- It must not be used to promote broad typography, transform, filter, or global ChatPane CSS.');
  lines.push('- Generated reports and Roll20 evidence stay local-only.');
  return `${lines.join('\n')}\n`;
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      const id = fixture.id ?? fixture.fixtureId;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function findSmokeFixture(report, fixtureId) {
  return (report?.fixtures ?? []).find((fixture) => (fixture.id ?? fixture.fixtureId) === fixtureId) ?? null;
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => (fixture.id ?? fixture.fixtureId) === fixtureId) ?? null;
}

function child(template, selector) {
  if (selector === 'root') return template ?? null;
  return (template?.computedChildren ?? template?.elements ?? []).find((item) => item?.selector === selector) ?? null;
}

function checkMap(fontEvidence) {
  return new Map((fontEvidence?.checks ?? []).map((check) => [String(check.spec ?? ''), Boolean(check.ok)]));
}

function priorityFor(parity) {
  const mismatch = numberOrNull(parity?.bestAlignedMismatchRatio ?? parity?.mismatchRatio);
  if (mismatch > 0.1) return 'P0';
  if (mismatch > 0.06) return 'P1';
  return 'P2';
}

function sameCss(a, b) {
  return normalizeCss(a) === normalizeCss(b);
}

function normalizeCss(value) {
  return String(value ?? '')
    .replace(/%2F/gi, '/')
    .replace(/https%3A/gi, 'https:')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function widthOf(element) {
  return numberOrNull(element?.rect?.width ?? element?.boxMetrics?.offsetWidth ?? cssPx(element?.computedStyle?.width));
}

function cssPx(value) {
  const match = String(value ?? '').match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match ? Number(match[1]) : null;
}

function delta(local, actual) {
  const l = numberOrNull(local);
  const a = numberOrNull(actual);
  return l == null || a == null ? null : Number((a - l).toFixed(3));
}

async function readJson(file) {
  return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
}

async function readOptionalJson(file) {
  try {
    return await readJson(file);
  } catch {
    return null;
  }
}

async function findLatestFallbackReportDir(prefixes, reportFileName, predicate = null) {
  const root = path.resolve('..', '_tmp_codex_smoke');
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return '';
  }

  const normalizedPrefixes = Array.isArray(prefixes) ? prefixes : [prefixes];
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!normalizedPrefixes.some((prefix) => entry.name.startsWith(`${prefix}-`))) continue;
    const dir = path.join(root, entry.name);
    const reportFile = path.join(dir, reportFileName);
    if (!(await fileExists(reportFile))) continue;
    const report = await readOptionalJson(reportFile);
    if (path.resolve(report?.runDir ?? '') !== runDir) continue;
    if (predicate && !predicate(report)) continue;
    let mtimeMs = 0;
    try {
      mtimeMs = (await stat(reportFile)).mtimeMs;
    } catch {
      mtimeMs = 0;
    }
    candidates.push({ dir, mtimeMs });
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs || b.dir.localeCompare(a.dir));
  return candidates[0]?.dir ?? '';
}

async function fileExists(file) {
  try {
    await readFile(file, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function rowPaintSourceReportImproves(candidateReport, currentReport) {
  if (!candidateReport) return false;
  if (!currentReport) return true;
  const candidatePromoted = countPromotedSanitizeReplayRejections(candidateReport);
  const currentPromoted = countPromotedSanitizeReplayRejections(currentReport);
  if (candidatePromoted !== currentPromoted) return candidatePromoted > currentPromoted;
  return countSanitizeReplaySignals(candidateReport) > countSanitizeReplaySignals(currentReport);
}

function rowPaintSourceHasSanitizeReplayRejection(report) {
  return countPromotedSanitizeReplayRejections(report) > 0;
}

function countPromotedSanitizeReplayRejections(report) {
  return (report?.fixtures ?? []).filter((fixture) => (
    fixture?.decision === 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED'
  )).length;
}

function countSanitizeReplaySignals(report) {
  return (report?.fixtures ?? []).filter((fixture) => (
    fixture?.decision === 'SANITIZE_REPLAY_REJECTED_SOURCE_MODEL_REQUIRED' ||
    fixture?.sourceOrderDecision === 'SANITIZE_STYLE_REPLAY_REJECTED' ||
    Number(fixture?.sourceEvidence?.sanitizeReplayDeltaPct) > 0
  )).length;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function fmtPx(value) {
  return typeof value === 'number' ? `${Number(value.toFixed(3))}px` : 'n/a';
}

function fmtSigned(value) {
  if (typeof value !== 'number') return 'n/a';
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

await main();

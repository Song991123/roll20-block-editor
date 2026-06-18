#!/usr/bin/env node
/**
 * Diagnose actual Roll20 iframe geometry versus the best local same-context
 * candidate.
 *
 * This consumes ignored evidence produced by:
 *   corepack pnpm run smoke:roll20-same-context-visible -- <run-dir>
 *
 * It does not log into Roll20 and it does not prove visual parity. Its purpose
 * is to separate selector/count parity from height/flow/style geometry deltas
 * before changing generic renderer CSS.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');

if (!args[0]) {
  console.error('Usage: node scripts/roll20_geometry_delta_diagnostics.mjs reports/roll20-actual-compare/<label>');
  process.exit(2);
}

const outDir = path.join(runDir, 'geometry-delta-diagnostics');
const sameContextFile = path.join(runDir, 'same-context-visible-smoke', 'same-context-visible-smoke-results.json');
const fullRootFile = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');

async function main() {
  const sameContext = await readJsonIfExists(sameContextFile);
  const fullRoot = await readJsonIfExists(fullRootFile);
  if (!sameContext && !fullRoot) {
    throw new Error(`Missing required report: ${sameContextFile} or ${fullRootFile}`);
  }

  const fixtures = [];
  const fixtureIds = new Set([
    ...(sameContext?.fixtures ?? []).map((fixture) => fixture.fixtureId),
    ...(fullRoot?.fixtures ?? []).map((fixture) => fixture.fixtureId),
  ]);
  for (const fixtureId of fixtureIds) {
    const sameFixture = (sameContext?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId);
    const fullFixture = (fullRoot?.fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId);
    fixtures.push(await analyzeFixture(sameFixture, fullFixture));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    sources: [sameContext ? path.relative(runDir, sameContextFile) : null, fullRoot ? path.relative(runDir, fullRootFile) : null].filter(Boolean),
    scope: 'local-only geometry delta diagnostics; not Roll20 visual parity',
    pass: true,
    fixtures,
    summary: {
      compared: fixtures.filter((fixture) => fixture.status === 'COMPARED').length,
      skipped: fixtures.filter((fixture) => fixture.status === 'SKIP').length,
      parityVerified: false,
    },
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'geometry-delta-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'geometry-delta-diagnostics-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    if (fixture.status === 'SKIP') {
      console.log(`SKIP ${fixture.fixtureId} ${fixture.reason}`);
    } else {
      console.log(`${fixture.status} ${fixture.fixtureId} rootDelta=${num(fixture.root?.heightDelta)} top=${fixture.contentFindings[0]?.selector ?? fixture.topFindings[0]?.selector ?? ''}`);
    }
  }
  console.log(`ROLL20 GEOMETRY DELTA DIAGNOSTICS OK ${outDir}`);
}

async function analyzeFixture(sameContextFixture, fullRootFixture) {
  if (sameContextFixture?.status === 'COMPARED' && sameContextFixture.computedStyleComparison && sameContextFixture.bestCandidate) {
    return analyzeSameContextFixture(sameContextFixture);
  }
  if (fullRootFixture?.status === 'COMPARED' && fullRootFixture.bestCandidate) {
    return analyzeFullRootFixture(fullRootFixture);
  }
  const fixture = sameContextFixture ?? fullRootFixture ?? {};
  return {
    fixtureId: fixture.fixtureId,
    status: 'SKIP',
    reason: fixture.reason ?? 'missing computed-style comparison, full-root candidate, or best candidate',
  };
}

async function analyzeSameContextFixture(fixture) {
  if (fixture.status !== 'COMPARED' || !fixture.computedStyleComparison || !fixture.bestCandidate) {
    return {
      fixtureId: fixture.fixtureId,
      status: 'SKIP',
      reason: fixture.reason ?? 'missing computed-style comparison or best candidate',
    };
  }

  const comparison = fixture.computedStyleComparison;
  const root = summarizeRoot(comparison.rootDiffs ?? []);
  const selectorFindings = (comparison.selectorDiffs ?? [])
    .map((diff) => summarizeSelector(diff))
    .filter(Boolean);
  const topFindings = selectorFindings
    .filter((item) => item.importanceScore > 0)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 12);
  const contentFindings = selectorFindings
    .filter((item) => item.importanceScore > 0 && !isRootWrapperSelector(item.selector))
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 12);
  const actualTargetGeometry = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixture.fixtureId}-target-geometry.json`));
  const localTargetGeometry = fixture.bestCandidate.metrics?.targetGeometry ?? null;
  const targetGeometry = compareTargetGeometry(actualTargetGeometry, localTargetGeometry);

  return {
    fixtureId: fixture.fixtureId,
    status: 'COMPARED',
    bestCandidate: {
      id: fixture.bestCandidate.id,
      mismatchRatio: fixture.bestCandidate.mismatchRatio,
      nativeMismatchRatio: fixture.bestCandidate.nativeCompare?.mismatchRatio ?? null,
      computedStyleScore: fixture.bestCandidate.computedStyleScore ?? null,
    },
    countsMatched: selectorFindings
      .filter((item) => item.countSource === 'selected')
      .every((item) => item.countDelta === 0),
    root,
    selectorFindings,
    topFindings,
    contentFindings,
    targetGeometry,
    interpretation: buildInterpretation({ root, topFindings, contentFindings, selectorFindings, targetGeometry }),
    nextChecks: buildNextChecks({ root, topFindings, contentFindings, selectorFindings, targetGeometry }),
    unresolvedGeometryGaps: buildUnresolvedGeometryGaps(targetGeometry),
  };
}

async function analyzeFullRootFixture(fixture) {
  const actualTargetGeometry = await readJsonIfExists(path.join(runDir, 'live-iframe-probe', `${fixture.fixtureId}-target-geometry.json`));
  const localTargetGeometry = fixture.bestCandidate.metrics?.targetGeometry ?? null;
  const targetGeometry = compareTargetGeometry(actualTargetGeometry, localTargetGeometry);
  const contentFindings = buildFindingsFromFullRootGeometry(fixture.targetGeometry);
  const topFindings = contentFindings.slice(0, 12);
  const selectorFindings = contentFindings;
  const root = {
    widthDelta: delta(fixture.bestCandidate.rootRect?.width, fixture.actual?.outputCss?.w ?? fixture.actual?.size?.w),
    heightDelta: fixture.bestCandidate.rootHeightDelta ?? delta(fixture.bestCandidate.rootRect?.height, fixture.actual?.outputCss?.h ?? fixture.actual?.size?.h),
    fullHeightEvidence: true,
    width: null,
    height: {
      field: 'rect.height',
      actual: fixture.actual?.outputCss?.h ?? fixture.actual?.size?.h ?? null,
      local: fixture.bestCandidate.rootRect?.height ?? fixture.bestCandidate.localSize?.h ?? null,
      delta: fixture.bestCandidate.rootHeightDelta ?? null,
    },
    boxSizing: null,
    fontSize: null,
    lineHeight: null,
    background: null,
  };

  return {
    fixtureId: fixture.fixtureId,
    status: 'COMPARED',
    evidenceSource: 'full-root-candidate-smoke',
    bestCandidate: {
      id: fixture.bestCandidate.id,
      mismatchRatio: fixture.bestCandidate.mismatchRatio,
      nativeMismatchRatio: fixture.bestCandidate.nativeCompare?.mismatchRatio ?? null,
      computedStyleScore: fixture.bestCandidate.computedStyleScore ?? null,
    },
    countsMatched: Boolean(
      fixture.targetGeometry?.counts?.rows?.actual === fixture.targetGeometry?.counts?.rows?.local &&
      fixture.targetGeometry?.counts?.images?.actual === fixture.targetGeometry?.counts?.images?.local &&
      fixture.targetGeometry?.counts?.tables?.actual === fixture.targetGeometry?.counts?.tables?.local,
    ),
    root,
    selectorFindings,
    topFindings,
    contentFindings,
    targetGeometry,
    interpretation: buildInterpretation({ root, topFindings, contentFindings, selectorFindings, targetGeometry }),
    nextChecks: buildNextChecks({ root, topFindings, contentFindings, selectorFindings, targetGeometry }),
    unresolvedGeometryGaps: buildUnresolvedGeometryGaps(targetGeometry),
  };
}

function buildUnresolvedGeometryGaps(targetGeometry) {
  if (targetGeometry?.status !== 'COMPARED') return [];
  const gaps = [];
  const tallTables = (targetGeometry.tables ?? [])
    .filter((item) => item.status === 'COMPARED' && Math.abs(item.heightDelta ?? 0) >= 50)
    .map((item) => ({
      kind: 'table',
      index: item.index,
      selector: item.selector,
      heightDelta: item.heightDelta,
      reason: 'table delta is large, but current target probe only captures shallow table children',
      nextProbe: 'capture table descendants: tbody/tr/td/input/button/textarea/select with rect, display, padding, border, line-height, and value/default visibility',
    }));
  const wrappedRows = (targetGeometry.rows ?? [])
    .filter((item) => {
      if (item.status !== 'COMPARED') return false;
      const children = item.childComparisons ?? [];
      if (children.length < 2) return false;
      return children.some((child) => {
        const relDelta = childRelativeYDelta(item, child);
        return typeof relDelta === 'number' && Math.abs(relDelta) >= 50;
      });
    })
    .map((item) => ({
      kind: 'row-wrap',
      index: item.index,
      selector: item.selector,
      heightDelta: item.heightDelta,
      reason: 'child y deltas indicate local/actual inline-block wrapping or vertical placement differs',
      nextProbe: 'capture row child inline metrics: x/y/width/margin/border/word-spacing/white-space plus parent available width',
    }));
  gaps.push(...wrappedRows, ...tallTables);
  return gaps;
}

function childRelativeYDelta(parent, child) {
  const actualParentY = parent.actual?.rect?.y;
  const localParentY = parent.local?.rect?.y;
  const actualChildY = child.actual?.rect?.y;
  const localChildY = child.local?.rect?.y;
  if (![actualParentY, localParentY, actualChildY, localChildY].every((value) => typeof value === 'number')) return null;
  return Number(((localChildY - localParentY) - (actualChildY - actualParentY)).toFixed(3));
}

function buildFindingsFromFullRootGeometry(targetGeometry) {
  if (!targetGeometry || targetGeometry.status !== 'COMPARED') return [];
  return [
    ...(targetGeometry.rowFindings ?? []).map((finding) => normalizeFullRootFinding(finding, 'row')),
    ...(targetGeometry.tableFindings ?? []).map((finding) => normalizeFullRootFinding(finding, 'table')),
    ...(targetGeometry.imageFindings ?? []).map((finding) => normalizeFullRootFinding(finding, 'image')),
  ]
    .filter(Boolean)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 24);
}

function normalizeFullRootFinding(finding, kind) {
  if (!finding || finding.status !== 'COMPARED') return null;
  const heightDelta = typeof finding.heightDelta === 'number' ? finding.heightDelta : delta(finding.localRect?.height, finding.actualRect?.height);
  const yDelta = typeof finding.yDelta === 'number' ? finding.yDelta : delta(finding.localRect?.y, finding.actualRect?.y);
  const widthDelta = typeof finding.widthDelta === 'number' ? finding.widthDelta : delta(finding.localRect?.width, finding.actualRect?.width);
  const importanceScore =
    Math.abs(heightDelta ?? 0) * 4 +
    Math.abs(yDelta ?? 0) * 1.5 +
    Math.abs(widthDelta ?? 0) +
    (kind === 'row' ? 20 : 0) +
    (finding.childCount?.actual !== finding.childCount?.local ? 40 : 0);
  return {
    selector: finding.selector ?? kind,
    actualCount: finding.childCount?.actual ?? '',
    localCount: finding.childCount?.local ?? '',
    countDelta: typeof finding.childCount?.actual === 'number' && typeof finding.childCount?.local === 'number'
      ? finding.childCount.local - finding.childCount.actual
      : 0,
    countExact: finding.childCount?.actual === finding.childCount?.local,
    countSource: `full-root:${kind}`,
    actualSource: 'full-root',
    localSource: 'full-root',
    actualPartial: false,
    localPartial: false,
    rect: {
      yDelta,
      heightDelta,
      widthDelta,
      y: fieldDiff('rect.y', finding.actualRect?.y, finding.localRect?.y, yDelta),
      height: fieldDiff('rect.height', finding.actualRect?.height, finding.localRect?.height, heightDelta),
      width: fieldDiff('rect.width', finding.actualRect?.width, finding.localRect?.width, widthDelta),
    },
    style: {
      height: fieldDiff('style.height', finding.actualStyle?.height, finding.localStyle?.height, null),
      lineHeight: valuesDiffer(finding.actualStyle?.lineHeight, finding.localStyle?.lineHeight)
        ? fieldDiff('style.lineHeight', finding.actualStyle?.lineHeight, finding.localStyle?.lineHeight, null)
        : null,
      padding: valuesDiffer(finding.actualStyle?.padding, finding.localStyle?.padding)
        ? fieldDiff('style.padding', finding.actualStyle?.padding, finding.localStyle?.padding, null)
        : null,
      margin: valuesDiffer(finding.actualStyle?.margin, finding.localStyle?.margin)
        ? fieldDiff('style.margin', finding.actualStyle?.margin, finding.localStyle?.margin, null)
        : null,
      fontSize: valuesDiffer(finding.actualStyle?.fontSize, finding.localStyle?.fontSize)
        ? fieldDiff('style.fontSize', finding.actualStyle?.fontSize, finding.localStyle?.fontSize, null)
        : null,
      backgroundImage: null,
    },
    importanceScore: Number(importanceScore.toFixed(3)),
    sampleDiffs: [],
  };
}

function compareTargetGeometry(actual, local) {
  if (!actual || !local) {
    return {
      status: 'SKIP',
      reason: !actual ? 'missing actual target geometry probe' : 'missing local target geometry in same-context candidate',
    };
  }
  const rows = compareIndexedTargets(actual.rows ?? [], local.rows ?? []);
  const tables = compareIndexedTargets(actual.tables ?? [], local.tables ?? []);
  const images = compareIndexedTargets(actual.images ?? [], local.images ?? []);
  const topRows = rows
    .filter((row) => row.status === 'COMPARED')
    .sort((a, b) => Math.abs(b.heightDelta ?? 0) - Math.abs(a.heightDelta ?? 0))
    .slice(0, 8);
  return {
    status: 'COMPARED',
    actualCapturedAt: actual.capturedAt ?? null,
    actualState: actual.state ?? null,
    rowCount: { actual: actual.rows?.length ?? 0, local: local.rows?.length ?? 0 },
    tableCount: { actual: actual.tables?.length ?? 0, local: local.tables?.length ?? 0 },
    imageCount: { actual: actual.images?.length ?? 0, local: local.images?.length ?? 0 },
    rows,
    tables,
    images,
    topRows,
  };
}

function compareIndexedTargets(actualItems, localItems) {
  const length = Math.max(actualItems.length, localItems.length);
  const items = [];
  for (let index = 0; index < length; index += 1) {
    const actual = actualItems[index] ?? null;
    const local = localItems[index] ?? null;
    if (!actual || !local) {
      items.push({
        index,
        status: 'MISSING',
        actualPresent: Boolean(actual),
        localPresent: Boolean(local),
      });
      continue;
    }
    items.push({
      index,
      status: 'COMPARED',
      selector: targetLabel(actual, local),
      actual: summarizeTarget(actual),
      local: summarizeTarget(local),
      yDelta: delta(local.rect?.y, actual.rect?.y),
      widthDelta: delta(local.rect?.width, actual.rect?.width),
      heightDelta: delta(local.rect?.height, actual.rect?.height),
      childCount: { actual: actual.children?.length ?? 0, local: local.children?.length ?? 0 },
      childComparisons: compareIndexedTargets(actual.children ?? [], local.children ?? []).slice(0, 12),
    });
  }
  return items;
}

function summarizeTarget(item) {
  return {
    tag: item.tag,
    className: item.className,
    text: item.text,
    rect: item.rect,
    scroll: item.scroll,
    natural: item.natural,
    style: {
      display: item.style?.display,
      position: item.style?.position,
      float: item.style?.float,
      clear: item.style?.clear,
      boxSizing: item.style?.boxSizing,
      width: item.style?.width,
      height: item.style?.height,
      margin: item.style?.margin,
      padding: item.style?.padding,
      overflow: item.style?.overflow,
      fontSize: item.style?.fontSize,
      lineHeight: item.style?.lineHeight,
    },
  };
}

function targetLabel(actual, local) {
  const item = actual ?? local;
  const cls = item?.className ? `.${String(item.className).trim().split(/\s+/).slice(0, 3).join('.')}` : '';
  return `${item?.tag ?? ''}${cls}`;
}

function summarizeRoot(rootDiffs) {
  const height = rootDiffs.find((diff) => diff.field === 'rect.height');
  const width = rootDiffs.find((diff) => diff.field === 'rect.width');
  const boxSizing = rootDiffs.find((diff) => diff.field === 'style.boxSizing');
  const fontSize = rootDiffs.find((diff) => diff.field === 'style.fontSize');
  const lineHeight = rootDiffs.find((diff) => diff.field === 'style.lineHeight');
  const background = rootDiffs.find((diff) => diff.field === 'style.backgroundColor');
  return {
    widthDelta: numericDeltaFromDiff(width),
    heightDelta: numericDeltaFromDiff(height),
    width,
    height,
    boxSizing,
    fontSize,
    lineHeight,
    background,
  };
}

function summarizeSelector(diff) {
  const sampleDiffs = diff.sampleDiffs ?? [];
  const rectHeight = findField(sampleDiffs, 'rect.height');
  const rectY = findField(sampleDiffs, 'rect.y');
  const rectWidth = findField(sampleDiffs, 'rect.width');
  const styleHeight = findField(sampleDiffs, 'style.height');
  const lineHeight = findField(sampleDiffs, 'style.lineHeight');
  const padding = findField(sampleDiffs, 'style.padding');
  const margin = findField(sampleDiffs, 'style.margin');
  const fontSize = findField(sampleDiffs, 'style.fontSize');
  const backgroundImage = findField(sampleDiffs, 'style.backgroundImage');
  const countExact = diff.actualCount === diff.localCount && !diff.actualPartial && !diff.localPartial;
  const heightDelta = numericDeltaFromDiff(rectHeight);
  const yDelta = numericDeltaFromDiff(rectY);
  const widthDelta = numericDeltaFromDiff(rectWidth);
  const importanceScore =
    Math.abs(heightDelta ?? 0) * 4 +
    Math.abs(yDelta ?? 0) * 1.5 +
    Math.abs(widthDelta ?? 0) +
    Math.abs(diff.countDelta ?? 0) * 50 +
    (lineHeight ? 12 : 0) +
    (padding ? 12 : 0) +
    (fontSize ? 8 : 0) +
    (backgroundImage ? 4 : 0);
  return {
    selector: diff.selector,
    actualCount: diff.actualCount,
    localCount: diff.localCount,
    countDelta: diff.countDelta,
    countExact,
    countSource: diff.actualPartial || diff.localPartial
      ? 'partial'
      : `${diff.actualSource ?? 'selected'}:${diff.localSource ?? 'selected'}`,
    actualSource: diff.actualSource ?? null,
    localSource: diff.localSource ?? null,
    actualPartial: Boolean(diff.actualPartial),
    localPartial: Boolean(diff.localPartial),
    rect: {
      yDelta,
      heightDelta,
      widthDelta,
      y: rectY,
      height: rectHeight,
      width: rectWidth,
    },
    style: {
      height: styleHeight,
      lineHeight,
      padding,
      margin,
      fontSize,
      backgroundImage,
    },
    importanceScore: Number(importanceScore.toFixed(3)),
    sampleDiffs,
  };
}

function buildInterpretation({ root, topFindings, contentFindings, selectorFindings, targetGeometry }) {
  const notes = [];
  const selectedCounts = selectorFindings.filter((item) => item.countSource === 'selected:selected');
  if (selectedCounts.length && selectedCounts.every((item) => item.countDelta === 0)) {
    notes.push('selected selector counts match; this is geometry/height work, not selector-count recovery');
  }
  if (root.heightDelta !== null) {
    const direction = root.heightDelta > 0 ? 'local is taller' : 'actual is taller';
    notes.push(`root height delta ${num(root.heightDelta)}px (${direction})`);
  }
  const biggestHeight = [...contentFindings]
    .filter((item) => item.rect.heightDelta !== null)
    .sort((a, b) => Math.abs(b.rect.heightDelta) - Math.abs(a.rect.heightDelta))[0];
  if (biggestHeight) {
    notes.push(`largest sampled height delta: ${biggestHeight.selector} ${num(biggestHeight.rect.heightDelta)}px`);
  }
  const shifted = topFindings.filter((item) => item.rect.yDelta !== null && Math.abs(item.rect.yDelta) >= 20);
  if (shifted.length) {
    notes.push(`large y-offset deltas appear after earlier flow differences: ${shifted.slice(0, 4).map((item) => item.selector).join(', ')}`);
  }
  const smallerControls = selectorFindings.filter((item) =>
    ['input', 'td', 'tr', 'table'].includes(item.selector) &&
    typeof item.rect.heightDelta === 'number' &&
    item.rect.heightDelta < 0,
  );
  if (smallerControls.length) {
    notes.push(`some controls/tables are smaller locally (${smallerControls.map((item) => `${item.selector} ${num(item.rect.heightDelta)}px`).join(', ')}), so root growth is not explained by larger inputs alone`);
  }
  const targetTop = targetGeometry?.topRows?.[0];
  if (targetTop) {
    notes.push(`target row detail: row ${targetTop.index} ${targetTop.selector} height delta ${num(targetTop.heightDelta)}px`);
  }
  return notes;
}

function buildNextChecks({ root, topFindings, contentFindings, selectorFindings, targetGeometry }) {
  const checks = [];
  if (root.heightDelta !== null) {
    if (root.fullHeightEvidence) {
      checks.push('Use the existing stitched full-height Roll20 root evidence to inspect which row/table/control geometry deltas account for the remaining root height delta.');
    } else {
      checks.push('Capture full-height or scroll-stitched Roll20 root screenshots so the root height delta can be tied to visual areas, not just top-crop evidence.');
    }
  }
  const twoCol = selectorFindings.find((item) => item.selector.includes('sheet-2colrow'));
  if (twoCol?.rect?.heightDelta !== null && Math.abs(twoCol?.rect?.heightDelta ?? 0) >= 50) {
    checks.push('Inspect every `.sheet-2colrow` child in actual/local probes, including child image/table heights and whether hidden descendants affect flow differently.');
  }
  if (targetGeometry?.status === 'COMPARED') {
    const row = targetGeometry.topRows?.[0];
    if (row) checks.push(`Targeted row probe currently points at row ${row.index} (${row.selector}) with height delta ${num(row.heightDelta)}px; inspect its child comparisons before renderer CSS changes.`);
  }
  const table = selectorFindings.find((item) => item.selector.toLowerCase() === 'table');
  const input = selectorFindings.find((item) => item.selector.toLowerCase() === 'input');
  if (table?.rect?.heightDelta || input?.rect?.heightDelta) {
    checks.push('Compare Roll20 baseline table/control CSS for height, line-height, border, and padding before patching user CSS output.');
  }
  if (contentFindings.some((item) => item.selector.includes('button'))) {
    checks.push('Check Roll20 button pseudo/background styles separately; button deltas affect visual parity but may not explain total root height.');
  }
  checks.push('Do not add sheet-specific fixes for Les-Oublies; any renderer patch must be generic Roll20 context behavior and rerun preview/edit regression smokes.');
  return checks;
}

function renderMarkdown(report) {
  const hasFullHeightEvidence = report.fixtures.some((fixture) => fixture.status === 'COMPARED' && fixture.root?.fullHeightEvidence);
  const lines = [
    '# Roll20 Geometry Delta Diagnostics',
    '',
    `Run dir: \`${report.runDir}\``,
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local-only comparison of actual Roll20 iframe computed geometry versus the best available local candidate evidence. This is not a Roll20 visual parity claim.',
    '',
    '| Fixture | Status | Best candidate | CSS mismatch | Root height delta | Counts matched | Top geometry finding |',
    '| --- | --- | --- | ---: | ---: | ---: | --- |',
  ];
  for (const fixture of report.fixtures) {
    if (fixture.status !== 'COMPARED') {
      lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} |  |  |  |  | ${fixture.reason ?? ''} |`);
      continue;
    }
    const top = [...(fixture.contentFindings ?? [])]
      .filter((item) => typeof item.rect?.heightDelta === 'number')
      .sort((a, b) => Math.abs(b.rect.heightDelta) - Math.abs(a.rect.heightDelta))[0] ?? fixture.contentFindings[0] ?? fixture.topFindings[0];
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.bestCandidate.id} | ${pct(fixture.bestCandidate.mismatchRatio)} | ${num(fixture.root.heightDelta)}px | ${fixture.countsMatched ? 'yes' : 'no'} | ${top ? `${top.selector}: height ${num(top.rect.heightDelta)}px, y ${num(top.rect.yDelta)}px` : ''} |`);
  }

  for (const fixture of report.fixtures.filter((item) => item.status === 'COMPARED')) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push('### Interpretation');
    lines.push('');
    for (const note of fixture.interpretation) lines.push(`- ${note}`);
    lines.push('');
    lines.push('### Top Content Geometry Deltas');
    lines.push('');
    lines.push('| Selector | Counts | Sources | y delta | height delta | width delta | Style clues |');
    lines.push('| --- | ---: | --- | ---: | ---: | ---: | --- |');
    for (const item of fixture.contentFindings) {
      const styleClues = [
        item.style.height ? `height ${item.style.height.actual} -> ${item.style.height.local}` : null,
        item.style.lineHeight ? `line-height ${item.style.lineHeight.actual} -> ${item.style.lineHeight.local}` : null,
        item.style.padding ? `padding ${item.style.padding.actual} -> ${item.style.padding.local}` : null,
        item.style.fontSize ? `font ${item.style.fontSize.actual} -> ${item.style.fontSize.local}` : null,
        item.style.backgroundImage ? 'background-image differs' : null,
      ].filter(Boolean).join('<br>');
      lines.push(`| \`${item.selector}\` | ${item.actualCount}/${item.localCount} | ${item.countSource} | ${num(item.rect.yDelta)} | ${num(item.rect.heightDelta)} | ${num(item.rect.widthDelta)} | ${styleClues} |`);
    }
    lines.push('');
    lines.push('### Root Wrapper Deltas');
    lines.push('');
    lines.push('| Selector | Counts | y delta | height delta | Style height |');
    lines.push('| --- | ---: | ---: | ---: | --- |');
    for (const item of fixture.topFindings.filter((entry) => isRootWrapperSelector(entry.selector))) {
      const height = item.style.height ? `${item.style.height.actual} -> ${item.style.height.local}` : '';
      lines.push(`| \`${item.selector}\` | ${item.actualCount}/${item.localCount} | ${num(item.rect.yDelta)} | ${num(item.rect.heightDelta)} | ${height} |`);
    }
    lines.push('');
    lines.push('### Next Checks');
    lines.push('');
    for (const check of fixture.nextChecks) lines.push(`- ${check}`);
    if (fixture.targetGeometry?.status === 'COMPARED') {
      lines.push('');
      lines.push('### Target Row Details');
      lines.push('');
      lines.push('| Row | Actual height | Local height | Delta | Child count | First child deltas |');
      lines.push('| ---: | ---: | ---: | ---: | ---: | --- |');
      for (const row of fixture.targetGeometry.topRows ?? []) {
        const childDeltas = (row.childComparisons ?? [])
          .filter((child) => child.status === 'COMPARED')
          .slice(0, 4)
          .map((child) => `${child.selector}: y ${num(child.yDelta)}px, h ${num(child.heightDelta)}px`)
          .join('<br>');
        lines.push(`| ${row.index} | ${num(row.actual.rect?.height)} | ${num(row.local.rect?.height)} | ${num(row.heightDelta)} | ${row.childCount.actual}/${row.childCount.local} | ${childDeltas} |`);
      }
    }
    if (fixture.unresolvedGeometryGaps?.length) {
      lines.push('');
      lines.push('### Unresolved Deep-Probe Gaps');
      lines.push('');
      lines.push('| Kind | Index | Selector | Height delta | Why it matters | Next probe |');
      lines.push('| --- | ---: | --- | ---: | --- | --- |');
      for (const gap of fixture.unresolvedGeometryGaps) {
        lines.push(`| ${gap.kind} | ${gap.index} | \`${gap.selector}\` | ${num(gap.heightDelta)} | ${gap.reason} | ${gap.nextProbe} |`);
      }
    }
  }

  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- Matching selector counts here do not prove visual parity.');
  lines.push('- Geometry deltas here are root-cause clues only.');
  if (hasFullHeightEvidence) {
    lines.push('- The stitched full-height Roll20 root evidence narrows this fixture to geometry work, but it still does not prove full-sheet visual parity.');
  } else {
    lines.push('- Full-height/scroll-stitched Roll20 root capture is still required before full-sheet parity claims.');
  }
  return `${lines.join('\n')}\n`;
}

function findField(diffs, field) {
  return diffs.find((diff) => diff.field === field) ?? null;
}

function fieldDiff(field, actual, local, explicitDelta) {
  return {
    field,
    actual: actual ?? null,
    local: local ?? null,
    delta: explicitDelta ?? delta(local, actual),
  };
}

function valuesDiffer(actual, local) {
  return actual !== undefined && local !== undefined && actual !== local;
}

function isRootWrapperSelector(selector) {
  return selector === 'html' ||
    selector === 'body' ||
    selector === 'form.sheetform' ||
    selector === '.charactersheet' ||
    selector === '#charsheet-root';
}

function numericDeltaFromDiff(diff) {
  if (!diff) return null;
  if (typeof diff.delta === 'number') return diff.delta;
  if (typeof diff.local === 'number' && typeof diff.actual === 'number') {
    return Number((diff.local - diff.actual).toFixed(3));
  }
  return null;
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/, '') : '';
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '';
}

async function readJsonRequired(file) {
  if (!existsSync(file)) throw new Error(`Missing required report: ${file}`);
  return JSON.parse(await readFile(file, 'utf8'));
}

async function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, 'utf8'));
}

function delta(local, actual) {
  return typeof local === 'number' && typeof actual === 'number' ? Number((local - actual).toFixed(3)) : null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

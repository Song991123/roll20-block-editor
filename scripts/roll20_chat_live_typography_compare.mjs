import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const expectedFixture = valueAfterFlag(args, '--expect-fixture') ?? '';
const positionalArgs = positionalOnly(args, new Set(['--expect-fixture']));
const runDirArg = positionalArgs[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const defaultProbe = path.join(runDirArg, 'chat-row-geometry', 'live-typography-probe-current.json');
const legacyProbe = path.join(runDirArg, 'chat-row-geometry', 'yshy-live-typography-probe.json');
const probeArg = positionalArgs[1] ?? (existsSync(defaultProbe) ? defaultProbe : legacyProbe);
const localSmokeArg = positionalArgs[2] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';

const runDir = path.resolve(runDirArg);
const probeFile = path.resolve(probeArg);
const localSmokeFile = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-live-typography-compare');

if (!existsSync(probeFile)) {
  console.error(`missing live probe: ${probeFile}`);
  process.exit(2);
}
if (!existsSync(localSmokeFile)) {
  console.error(`missing local smoke: ${localSmokeFile}`);
  process.exit(2);
}

const probe = await readJson(probeFile);
const localSmoke = await readJson(localSmokeFile);
const selectedTemplate = probe.selectedTemplate ?? probe.latestTemplate ?? probe.template ?? null;
const selectedClassName = String(selectedTemplate?.className ?? probe.templateClass ?? '');
const fixtureGuess = fixtureForTemplateClass(selectedClassName);
const localFixture = localSmoke.fixtures?.find((fixture) => (fixture.id ?? fixture.fixtureId) === fixtureGuess) ?? null;
const localTemplate = localFixture?.cardInfo?.templateComputed ?? null;
const localTable = childBySelector(localTemplate, 'table');
const actualTable = childBySelector(selectedTemplate, 'table');

const report = {
  generatedAt: new Date().toISOString(),
  runDir: runDirArg,
  probeFile: path.relative(process.cwd(), probeFile),
  localSmoke: localSmokeArg,
  status: fixtureGuess && localFixture ? 'COMPARED' : 'UNMATCHED',
  expectedFixture: expectedFixture || null,
  expectedFixtureMatched: expectedFixture ? fixtureGuess === expectedFixture : null,
  warning: buildWarning(probe, selectedClassName, fixtureGuess),
  selectedTemplate: {
    className: selectedClassName,
    fixtureGuess,
    selectedTemplateIndex: probe.selectedTemplateIndex ?? null,
    templateCount: probe.templateCount ?? probe.rolltemplateCount ?? null,
    text: normalizeText(selectedTemplate?.text),
  },
  localFixture: localFixture
    ? {
        fixtureId: localFixture.id ?? localFixture.fixtureId,
        templateClassName: localTemplate?.className ?? '',
      }
    : null,
  metrics: localFixture
    ? compareMetrics({
        localTemplate,
        actualTemplate: selectedTemplate,
        localTable,
        actualTable,
        localViewport: localFixture.cardInfo?.viewportEvidence,
        actualViewport: probe.viewportEvidence,
        localFontEvidence: localFixture.cardInfo?.fontEvidence,
        actualFontEvidence: probe.fontEvidence,
      })
    : null,
  claimBoundary: [
    'A live typography probe is DOM/style evidence only. It is not a same-moment screenshot sidecar and cannot prove Roll20 pixel parity.',
    'The selected template must match the intended fixture class before its numbers can be used for that fixture.',
    'If the selected template is AW2E-like, do not use it to explain YSHY mismatch.',
  ],
};

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'chat-live-typography-compare-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(path.join(outDir, 'chat-live-typography-compare-results.md'), renderMarkdown(report), 'utf8');

console.log(`ROLL20 CHAT LIVE TYPOGRAPHY ${report.status}`);
console.log(`probe=${path.relative(process.cwd(), probeFile)}`);
console.log(`selectedClass=${selectedClassName || 'unknown'}`);
console.log(`fixtureGuess=${fixtureGuess || 'unknown'}`);
if (report.warning) console.log(`warning=${report.warning}`);
if (report.expectedFixture) console.log(`expectedFixtureMatched=${report.expectedFixtureMatched ? 'YES' : 'NO'}`);
if (report.metrics) {
  console.log(`templateWidthDelta=${report.metrics.template.widthDelta}`);
  console.log(`tableWidthDelta=${report.metrics.table.widthDelta}`);
  console.log(`actualDpr=${report.metrics.viewport.actualDevicePixelRatio ?? 'unknown'}`);
}
console.log(`out=${path.relative(process.cwd(), outDir)}`);
if (expectedFixture && fixtureGuess !== expectedFixture) {
  process.exitCode = 1;
}

async function readJson(file) {
  return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
}

function valueAfterFlag(values, flag) {
  const index = values.indexOf(flag);
  if (index < 0) return null;
  return values[index + 1] && !values[index + 1].startsWith('--') ? values[index + 1] : '';
}

function positionalOnly(values, flagsWithValue) {
  const positional = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (flagsWithValue.has(value)) {
      index += 1;
      continue;
    }
    if (value.startsWith('--')) continue;
    positional.push(value);
  }
  return positional;
}

function fixtureForTemplateClass(className) {
  if (/\bsheet-rolltemplate-aw\b/.test(className)) return 'official-roll20-AW2E';
  if (/\bsheet-rolltemplate-initiative-roll\b/.test(className)) return 'official-roll20-Les-Oublies';
  if (/\bsheet-rolltemplate-coc\b/.test(className)) return 'yshy-commission-1bu';
  return '';
}

function buildWarning(probe, className, fixtureGuess) {
  const callerGuess = String(probe.fixtureGuess ?? '');
  if (!fixtureGuess) return `Could not map selected template class \`${className || 'unknown'}\` to a known fixture.`;
  if (callerGuess && callerGuess !== 'unknown' && callerGuess !== fixtureGuess) {
    return `Probe fixtureGuess was \`${callerGuess}\`, but selected template class maps to \`${fixtureGuess}\`.`;
  }
  if (callerGuess === 'unknown') {
    return `Probe fixtureGuess was unknown; selected template class maps to \`${fixtureGuess}\`.`;
  }
  return '';
}

function childBySelector(template, selector) {
  const children = template?.computedChildren ?? template?.elements ?? [];
  return children.find((child) => child?.selector === selector) ?? null;
}

function compareMetrics({ localTemplate, actualTemplate, localTable, actualTable, localViewport, actualViewport, localFontEvidence, actualFontEvidence }) {
  return {
    template: compareElement(localTemplate, actualTemplate),
    table: compareElement(localTable, actualTable),
    styles: {
      template: stylePairs(localTemplate, actualTemplate, [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'borderCollapse',
        'borderSpacing',
        'tableLayout',
        'transform',
        'zoom',
      ]),
      table: stylePairs(localTable, actualTable, [
        'fontFamily',
        'fontSize',
        'fontWeight',
        'letterSpacing',
        'lineHeight',
        'backgroundImage',
        'backgroundSize',
        'borderCollapse',
        'borderSpacing',
        'tableLayout',
        'transform',
        'zoom',
      ]),
    },
    boxes: {
      template: boxPairs(localTemplate, actualTemplate),
      table: boxPairs(localTable, actualTable),
    },
    viewport: {
      localDevicePixelRatio: localViewport?.devicePixelRatio ?? null,
      actualDevicePixelRatio: actualViewport?.devicePixelRatio ?? null,
      localVisualScale: localViewport?.visualViewport?.scale ?? null,
      actualVisualScale: actualViewport?.visualViewport?.scale ?? null,
    },
    fonts: {
      local: summarizeFontChecks(localFontEvidence),
      actual: summarizeFontChecks(actualFontEvidence),
    },
  };
}

function compareElement(localElement, actualElement) {
  return {
    localRect: rectSummary(localElement?.rect, localElement?.computedStyle),
    actualRect: rectSummary(actualElement?.rect, actualElement?.computedStyle),
    widthDelta: delta(rectWidth(localElement), rectWidth(actualElement)),
    heightDelta: delta(rectHeight(localElement), rectHeight(actualElement)),
  };
}

function stylePairs(localElement, actualElement, keys) {
  return Object.fromEntries(keys.map((key) => {
    const local = localElement?.computedStyle?.[key] ?? null;
    const actual = actualElement?.computedStyle?.[key] ?? null;
    return [key, { local, actual, same: local === actual }];
  }));
}

function boxPairs(localElement, actualElement) {
  const keys = ['offsetWidth', 'clientWidth', 'scrollWidth', 'offsetHeight', 'clientHeight', 'scrollHeight'];
  return Object.fromEntries(keys.map((key) => {
    const local = localElement?.boxMetrics?.[key] ?? null;
    const actual = actualElement?.boxMetrics?.[key] ?? null;
    return [key, { local, actual, delta: delta(local, actual) }];
  }));
}

function summarizeFontChecks(fontEvidence) {
  return (fontEvidence?.checks ?? []).map((check) => ({
    spec: check.spec,
    ok: check.ok,
  }));
}

function rectSummary(rect, style = null) {
  return {
    width: rectWidth({ rect, computedStyle: style }),
    height: rectHeight({ rect, computedStyle: style }),
  };
}

function rectWidth(element) {
  return numberOrCss(element?.rect?.width, element?.computedStyle?.width);
}

function rectHeight(element) {
  return numberOrCss(element?.rect?.height, element?.computedStyle?.height);
}

function numberOrCss(numberValue, cssValue) {
  if (typeof numberValue === 'number' && Number.isFinite(numberValue)) return Number(numberValue.toFixed(3));
  return numberFromCssPx(cssValue);
}

function numberFromCssPx(value) {
  if (typeof value === 'number') return value;
  const match = String(value ?? '').match(/^-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function delta(local, actual) {
  if (typeof local !== 'number' || typeof actual !== 'number') return null;
  return Number((local - actual).toFixed(3));
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Live Typography Compare',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Probe: \`${report.probeFile}\``,
    `Local smoke: \`${report.localSmoke}\``,
    '',
    `Status: **${report.status}**`,
    '',
  ];
  if (report.warning) lines.push(`Warning: ${report.warning}`, '');
  if (report.expectedFixture) {
    lines.push(`Expected fixture: \`${report.expectedFixture}\` (${report.expectedFixtureMatched ? 'matched' : 'mismatch'})`, '');
  }
  lines.push(
    '## Selected Template',
    '',
    `- Class: \`${report.selectedTemplate.className || 'unknown'}\``,
    `- Fixture guess: \`${report.selectedTemplate.fixtureGuess || 'unknown'}\``,
    `- Template index/count: ${report.selectedTemplate.selectedTemplateIndex ?? 'n/a'} / ${report.selectedTemplate.templateCount ?? 'n/a'}`,
    `- Text: ${report.selectedTemplate.text || 'n/a'}`,
    '',
  );

  if (report.metrics) {
    lines.push(
      '## Metric Deltas',
      '',
      '| Scope | Width delta | Height delta | Local size | Actual size |',
      '| --- | ---: | ---: | --- | --- |',
      `| Template | ${fmt(report.metrics.template.widthDelta)} | ${fmt(report.metrics.template.heightDelta)} | ${fmtSize(report.metrics.template.localRect)} | ${fmtSize(report.metrics.template.actualRect)} |`,
      `| Table | ${fmt(report.metrics.table.widthDelta)} | ${fmt(report.metrics.table.heightDelta)} | ${fmtSize(report.metrics.table.localRect)} | ${fmtSize(report.metrics.table.actualRect)} |`,
      '',
      '## Style Differences',
      '',
      '| Scope | Property | Local | Actual |',
      '| --- | --- | --- | --- |',
    );
    for (const [scope, pairs] of Object.entries(report.metrics.styles)) {
      for (const [key, pair] of Object.entries(pairs)) {
        if (!pair.same) lines.push(`| ${scope} | \`${key}\` | ${escapeCell(pair.local)} | ${escapeCell(pair.actual)} |`);
      }
    }
    lines.push(
      '',
      '## Viewport',
      '',
      `- Local DPR/scale: ${report.metrics.viewport.localDevicePixelRatio ?? 'n/a'} / ${report.metrics.viewport.localVisualScale ?? 'n/a'}`,
      `- Actual DPR/scale: ${report.metrics.viewport.actualDevicePixelRatio ?? 'n/a'} / ${report.metrics.viewport.actualVisualScale ?? 'n/a'}`,
      '',
    );
  }

  lines.push('## Claim Boundary', '');
  for (const claim of report.claimBoundary) lines.push(`- ${claim}`);
  return `${lines.join('\n')}\n`;
}

function fmt(value) {
  return typeof value === 'number' ? String(value) : '';
}

function fmtSize(rect) {
  if (!rect) return '';
  return `${rect.width ?? '?'}x${rect.height ?? '?'}`;
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 240);
}

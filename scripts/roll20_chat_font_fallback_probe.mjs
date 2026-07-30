#!/usr/bin/env node
/**
 * Probe local browser fallback font metrics against actual Roll20 text samples.
 *
 * Diagnostic only. Actual Roll20 can keep a custom font family in computed
 * style while document.fonts.check() fails, so the browser paints with a
 * fallback face. This script measures candidate fallback stacks in headless
 * Chromium against the actual Roll20 textMeasureEvidence widths.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const optionNamesWithValues = new Set(['--out-dir', '--actual-sidecar', '--fixture', '--families']);
const args = rawArgs.filter((arg, index) => !arg.startsWith('--') && !optionNamesWithValues.has(rawArgs[index - 1]));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const fixtureId = readOption('--fixture', args[1] ?? 'fixtureC-commission-1bu');
const outDir = path.resolve(readOption('--out-dir', path.join(runDir, 'chat-font-fallback-probe')));
const actualSidecarPath = path.resolve(readOption(
  '--actual-sidecar',
  path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json'),
));
const extraFamilies = readOption('--families', '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const DEFAULT_FAMILIES = [
  'Arial',
  '"Helvetica Neue"',
  'Helvetica',
  'sans-serif',
  '"Segoe UI"',
  '"Malgun Gothic"',
  '"맑은 고딕"',
  'Gulim',
  'Dotum',
  'Batang',
  'serif',
  'Georgia',
  '"Times New Roman"',
  '"Noto Sans KR"',
  '"Noto Serif KR"',
  '"Apple SD Gothic Neo"',
];

async function main() {
  const actualSidecar = await readJson(actualSidecarPath);
  const actualTemplate = actualSidecar?.latestTemplate ?? null;
  const evidence = actualSidecar?.textMeasureEvidence ?? actualTemplate?.textMeasureEvidence ?? {};
  const samples = selectSamples(evidence.samples ?? []);
  const families = unique([...extraFamilies, ...DEFAULT_FAMILIES]);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const measured = await page.evaluate(({ samples, families }) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const out = [];
      for (const sample of samples) {
        const variants = [];
        for (const family of families) {
          const font = buildFont(sample.font, family);
          context.font = font;
          const metrics = context.measureText(sample.text || '');
          variants.push({
            family,
            font,
            width: round(metrics.width),
            delta: round(metrics.width - sample.actualWidth),
            absDelta: round(Math.abs(metrics.width - sample.actualWidth)),
          });
        }
        variants.sort((a, b) => a.absDelta - b.absDelta || a.family.localeCompare(b.family));
        out.push({ ...sample, variants: variants.slice(0, 8) });
      }
      return out;

      function buildFont(sourceFont, family) {
        const raw = String(sourceFont || '');
        const size = raw.match(/(\d+(?:\.\d+)?)px/)?.[1] || '12';
        const weight = /\b700\b|\bbold\b/i.test(raw) ? '700' : '400';
        const style = /\bitalic\b/i.test(raw) ? 'italic' : 'normal';
        return `${style} normal ${weight} ${size}px ${family}`;
      }

      function round(value) {
        return Number(Number(value).toFixed(3));
      }
    }, { samples, families });

    const aggregate = aggregateFamilies(measured, families);
    const report = {
      generatedAt: new Date().toISOString(),
      runDir: runDirArg,
      fixtureId,
      actualSidecar: rel(actualSidecarPath),
      reportOverrides: {
        outDir: rel(outDir),
        extraFamilies,
      },
      scope: 'diagnostic-only font fallback metric probe; no production CSS',
      summary: {
        status: aggregate.length ? 'FONT_FALLBACK_PROBE_COMPLETE' : 'FONT_FALLBACK_NO_SAMPLES',
        samples: measured.length,
        candidateFamilies: families.length,
        bestFamilies: aggregate.slice(0, 5),
        productionSafe: false,
      },
      samples: measured,
    };

    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'chat-font-fallback-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(path.join(outDir, 'chat-font-fallback-probe-results.md'), renderMarkdown(report), 'utf8');

    console.log(`ROLL20 CHAT FONT FALLBACK PROBE ${report.summary.status}`);
    for (const family of report.summary.bestFamilies) {
      console.log(`FAMILY ${family.family} meanAbs=${fmtPx(family.meanAbsDelta)} maxAbs=${fmtPx(family.maxAbsDelta)} wins=${family.wins}/${family.samples}`);
    }
    for (const sample of measured) {
      const best = sample.variants[0];
      console.log(`SAMPLE ${sample.selector} actual=${fmtPx(sample.actualWidth)} best=${best?.family ?? ''} delta=${fmtPx(best?.delta)}`);
    }
    console.log(`out=${rel(outDir)}`);
  } finally {
    await browser.close();
  }
}

function selectSamples(samples) {
  return samples
    .filter((sample) => /BookkMyungjo-Bd/i.test(sample.font ?? ''))
    .map((sample) => ({
      selector: sample.selector ?? '',
      source: sample.source ?? '',
      text: sample.text ?? '',
      font: sample.font ?? '',
      actualWidth: numberOrNull(sample.metrics?.width),
      elementWidth: numberOrNull(sample.elementWidth),
    }))
    .filter((sample) => sample.text && sample.actualWidth != null)
    .slice(0, 24);
}

function aggregateFamilies(samples, families) {
  return families
    .map((family) => {
      const deltas = [];
      let wins = 0;
      for (const sample of samples) {
        const item = sample.variants.find((variant) => variant.family === family);
        if (!item) continue;
        deltas.push(item.absDelta);
        if (sample.variants[0]?.family === family) wins += 1;
      }
      return {
        family,
        samples: deltas.length,
        wins,
        meanAbsDelta: mean(deltas),
        maxAbsDelta: max(deltas),
      };
    })
    .filter((item) => item.samples > 0)
    .sort((a, b) => a.meanAbsDelta - b.meanAbsDelta || b.wins - a.wins || a.family.localeCompare(b.family));
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Font Fallback Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Fixture: \`${report.fixtureId}\``,
    `Actual sidecar: \`${report.actualSidecar}\``,
    '',
    'Scope: diagnostic-only. This report measures local browser fallback font candidates against actual Roll20 text widths. It does not enable production CSS.',
    '',
    '## Best Families',
    '',
    '| Family | Samples | Wins | Mean abs delta | Max abs delta |',
    '| --- | ---: | ---: | ---: | ---: |',
  ];
  for (const family of report.summary.bestFamilies) {
    lines.push(`| ${family.family} | ${family.samples} | ${family.wins} | ${fmtPx(family.meanAbsDelta)} | ${fmtPx(family.maxAbsDelta)} |`);
  }
  lines.push('', '## Sample Winners', '');
  lines.push('| Selector | Text | Actual width | Best family | Delta |');
  lines.push('| --- | --- | ---: | --- | ---: |');
  for (const sample of report.samples) {
    const best = sample.variants[0];
    lines.push(`| \`${sample.selector}\` | ${truncate(sample.text, 24)} | ${fmtPx(sample.actualWidth)} | ${best?.family ?? ''} | ${fmtPx(best?.delta)} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- A close fallback metric is only a candidate axis. It still needs rolltemplate smoke, pixel diff, row raster, style proof, and renderer gate evidence.');
  lines.push('- If no local fallback closely matches actual Roll20, prefer asset/font preservation or live Roll20 font-face reproduction over CSS guessing.');
  return `${lines.join('\n')}\n`;
}

function readOption(name, fallback = '') {
  const index = rawArgs.indexOf(name);
  if (index < 0) return fallback;
  const value = rawArgs[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
}

async function readJson(file) {
  return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return null;
  return Number((numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(3));
}

function max(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  return numbers.length ? Number(Math.max(...numbers).toFixed(3)) : null;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

function truncate(value, max) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

await main();

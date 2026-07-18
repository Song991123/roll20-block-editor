#!/usr/bin/env node
/**
 * Audit local-only Roll20 upload payloads before they are applied in Custom
 * Sheet Sandbox or a test room.
 *
 * Scope: verifies generated payload files under
 * reports/roll20-actual-compare/<run>/local-baseline/. It does not upload to
 * Roll20 or prove actual Roll20 visual parity.
 */

import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const positional = args.filter((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--report-dir');
const runDir = path.resolve(positional[0] ?? 'reports/roll20-actual-compare/2026-06-18-actual-diff-ready');
const requestedReportDir = path.resolve(argOf('--report-dir', path.join(runDir, 'payload-audit')));

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const FORBIDDEN = [
  { code: 'app.preview_dialog', re: /\br20-preview-dialog\b/i, files: ['html', 'css'] },
  { code: 'app.next_or_tailwind', re: /__next|nextjs|tailwind|radix|shadcn/i, files: ['html', 'css', 'json'] },
  { code: 'edit.overlay_attr', re: /data-r20-(?:layer-role|can-drop|drop-mode)\b/i, files: ['html', 'css'] },
  { code: 'edit.overlay_class', re: /\br20-(?:selected|dragging|drop-target|editing)\b/i, files: ['html', 'css'] },
  { code: 'edit.block_id', re: /\sdata-r20-block-id=(?:"[^"]*"|'[^']*')/i, files: ['html'] },
  { code: 'app.preview_marker', re: /preview-iframe|edit-canvas|Sheet Sandbox Tools/i, files: ['html', 'css', 'json'] },
  { code: 'unsafe.iframe', re: /<iframe[\s>]/i, files: ['html'] },
  { code: 'unsafe.inline_handler', re: /\son[a-z]+\s*=\s*["']/i, files: ['html'] },
];

const REQUIRED_ZIP_FILES = ['README.txt', 'sheet.css', 'sheet.html', 'sheet.json', 'translation.json'];

const CSS_SELECTOR_RULES = [
  {
    code: 'css.rolltemplate_selector_missing_sheet_prefix',
    re: /(^|[^A-Za-z0-9_-])\.rolltemplate-[A-Za-z0-9_-]+/g,
    message: 'Roll20 chat DOM uses .sheet-rolltemplate-*; exported payload CSS must not lose the sheet- prefix.',
  },
  {
    code: 'css.rolltemplate_runtime_class_prefixed',
    re: /\.sheet-(?:inlinerollresult|fullcrit|fullfail|importantroll)\b/g,
    message: 'Roll20 inline roll runtime classes are unprefixed in chat DOM and must stay unprefixed in rolltemplate CSS.',
  },
];

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readText(file) {
  return fs.readFile(file, 'utf8');
}

function countMatches(text, re) {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  return (String(text ?? '').match(new RegExp(re.source, flags)) ?? []).length;
}

async function listFixtures() {
  const localRoot = path.join(runDir, 'local-baseline');
  const entries = await fs.readdir(localRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      dir: path.join(localRoot, entry.name),
      payloadDir: path.join(localRoot, entry.name, 'payload'),
      zipFile: path.join(localRoot, entry.name, 'upload.zip'),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function auditFixture(fixture) {
  const entry = {
    id: fixture.id,
    pass: false,
    files: {},
    issues: [],
  };
  const htmlFile = path.join(fixture.payloadDir, 'sheet.html');
  const cssFile = path.join(fixture.payloadDir, 'sheet.css');
  const translationFile = path.join(fixture.payloadDir, 'translation.json');
  const manifestFile = path.join(fixture.payloadDir, 'sheet.json');
  const readmeFile = path.join(fixture.payloadDir, 'README.txt');

  const files = {
    html: (await exists(htmlFile)) ? await readText(htmlFile) : '',
    css: (await exists(cssFile)) ? await readText(cssFile) : '',
    translation: (await exists(translationFile)) ? await readText(translationFile) : '',
    json: (await exists(manifestFile)) ? await readText(manifestFile) : '',
    readme: (await exists(readmeFile)) ? await readText(readmeFile) : '',
  };

  entry.files = {
    htmlBytes: Buffer.byteLength(files.html),
    cssBytes: Buffer.byteLength(files.css),
    translationBytes: Buffer.byteLength(files.translation),
    manifestBytes: Buffer.byteLength(files.json),
    readmeBytes: Buffer.byteLength(files.readme),
  };

  for (const [kind, text] of Object.entries(files)) {
    if (kind === 'readme') continue;
    for (const rule of FORBIDDEN) {
      if (!rule.files.includes(kind === 'translation' ? 'json' : kind)) continue;
      const count = countMatches(text, rule.re);
      if (count > 0) entry.issues.push({ severity: 'error', code: rule.code, file: kind, count });
    }
  }

  if (files.html.trim().length === 0) entry.issues.push({ severity: 'error', code: 'payload.empty_html', file: 'html', count: 1 });
  if (files.css.trim().length === 0) entry.issues.push({ severity: 'warning', code: 'payload.empty_css', file: 'css', count: 1 });
  for (const rule of CSS_SELECTOR_RULES) {
    const count = countMatches(files.css, rule.re);
    if (count > 0) {
      entry.issues.push({
        severity: 'error',
        code: rule.code,
        file: 'css',
        count,
        message: rule.message,
      });
    }
  }

  try {
    JSON.parse(files.translation.trim() || '{}');
  } catch (err) {
    entry.issues.push({ severity: 'error', code: 'payload.invalid_translation_json', file: 'translation', message: String(err).slice(0, 200) });
  }

  try {
    const manifest = JSON.parse(files.json || '{}');
    for (const [key, expected] of Object.entries({ html: 'sheet.html', css: 'sheet.css', translations: 'translation.json' })) {
      if (manifest[key] !== expected) {
        entry.issues.push({ severity: 'error', code: `manifest.${key}`, file: 'sheet.json', expected, actual: manifest[key] });
      }
    }
  } catch (err) {
    entry.issues.push({ severity: 'error', code: 'payload.invalid_manifest_json', file: 'sheet.json', message: String(err).slice(0, 200) });
  }

  if (!(await exists(fixture.zipFile))) {
    entry.issues.push({ severity: 'error', code: 'zip.missing', file: 'upload.zip', count: 1 });
  } else {
    const zip = await JSZip.loadAsync(await fs.readFile(fixture.zipFile));
    const names = Object.keys(zip.files).sort();
    entry.zipFiles = names;
    for (const required of REQUIRED_ZIP_FILES) {
      if (!names.includes(required)) {
        entry.issues.push({ severity: 'error', code: 'zip.missing_file', file: 'upload.zip', expected: required });
      }
    }
    const zipHtml = zip.files['sheet.html'] ? await zip.files['sheet.html'].async('string') : '';
    const htmlMismatch = zipHtml !== files.html;
    if (htmlMismatch) entry.issues.push({ severity: 'error', code: 'zip.html_mismatch', file: 'upload.zip', count: 1 });
  }

  entry.pass = entry.issues.every((issue) => issue.severity !== 'error');
  return entry;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Payload Audit');
  lines.push('');
  lines.push(`Run: \`${report.runDir}\``);
  lines.push(`Generated: ${report.finishedAt}`);
  lines.push('');
  lines.push('Scope: local-only upload payload hygiene. This does not prove actual Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | HTML bytes | CSS bytes | Translation bytes | Issues |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const item of report.fixtures) {
    lines.push(`| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.files.htmlBytes} | ${item.files.cssBytes} | ${item.files.translationBytes} | ${formatIssues(item.issues)} |`);
  }
  lines.push('');
  lines.push('Gates: no app wrapper/UI tokens, no edit overlay attributes/classes, no internal `data-r20-block-id`, valid translation/manifest JSON, and zip payload matches the payload folder.');
  return `${lines.join('\n')}\n`;
}

function formatIssues(issues) {
  if (!issues.length) return 'none';
  return issues.map((issue) => `${issue.severity}:${issue.code}${issue.count ? `(${issue.count})` : ''}`).join('<br>');
}

async function prepareReportDir() {
  try {
    await fs.mkdir(requestedReportDir, { recursive: true });
    return requestedReportDir;
  } catch (error) {
    const fallback = path.join(tmpdir(), `roll20-payload-audit-${Date.now()}`);
    await fs.mkdir(fallback, { recursive: true });
    console.warn(`report directory unavailable; using temporary output: ${fallback}`);
    return fallback;
  }
}

async function main() {
  if (!(await exists(path.join(runDir, 'local-baseline')))) {
    throw new Error(`missing local-baseline under ${runDir}`);
  }
  const reportDir = await prepareReportDir();
  const fixtures = await listFixtures();
  const report = {
    startedAt: new Date().toISOString(),
    runDir,
    reportDir,
    fixtures: [],
  };
  for (const fixture of fixtures) {
    const entry = await auditFixture(fixture);
    report.fixtures.push(entry);
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} issues=${entry.issues.length}`);
  }
  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((fixture) => fixture.pass);
  await fs.writeFile(path.join(reportDir, 'roll20-payload-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(reportDir, 'roll20-payload-audit-results.md'), renderMarkdown(report), 'utf8');
  if (!report.pass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

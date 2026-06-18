#!/usr/bin/env node
/**
 * Audit generated Roll20 upload payloads against the observed Roll20 Custom
 * Sheet Sandbox sanitize/prefix behavior.
 *
 * Scope: local-only diagnostic. It does not upload to Roll20 and does not
 * prove visual parity. It answers: "What would Roll20's sandbox sanitizer
 * likely rewrite or reject before rendering this payload?"
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path, { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const positional = args.filter((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--report-dir');
const runDir = resolve(positional[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1');
const reportDir = resolve(argOf('--report-dir', join(runDir, 'sandbox-sanitize-audit')));

function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function compileSandboxSanitizerModule() {
  const outRoot = join(REPO_ROOT, '.tmp/roll20-sandbox-sanitize-audit-build');
  const compiled = join(outRoot, 'lib/emit/roll20SandboxSanitize.js');
  const tsPath = join(REPO_ROOT, 'lib/emit/roll20SandboxSanitize.ts');
  const tscJs = join(REPO_ROOT, 'node_modules/typescript/lib/tsc.js');

  if (!existsSync(tsPath)) throw new Error(`sandbox sanitizer not found: ${tsPath}`);
  if (!existsSync(tscJs)) throw new Error(`TypeScript compiler not found: ${tscJs}`);

  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });
  execFileSync(process.execPath, [
    tscJs,
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'ES2020',
    '--outDir', outRoot,
    '--rootDir', REPO_ROOT,
    'lib/emit/roll20SandboxSanitize.ts',
    '--esModuleInterop',
    '--skipLibCheck',
    '--noEmit', 'false',
    '--declaration', 'false',
  ], { cwd: REPO_ROOT, stdio: 'pipe' });

  if (!existsSync(compiled)) throw new Error(`compile did not produce ${compiled}`);
  return compiled;
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function listFixtures() {
  const localRoot = join(runDir, 'local-baseline');
  const entries = await fs.readdir(localRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      id: entry.name,
      payloadDir: join(localRoot, entry.name, 'payload'),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function warningCounts(warnings) {
  return warnings.reduce((acc, warning) => {
    acc[warning.code] = (acc[warning.code] ?? 0) + 1;
    return acc;
  }, {});
}

async function auditFixture(fixture, sanitizer) {
  const htmlFile = join(fixture.payloadDir, 'sheet.html');
  const cssFile = join(fixture.payloadDir, 'sheet.css');
  const html = existsSync(htmlFile) ? readFileSync(htmlFile, 'utf8') : '';
  const css = existsSync(cssFile) ? readFileSync(cssFile, 'utf8') : '';
  const cssResult = sanitizer.sanitizeRoll20SandboxCss(css);
  const htmlResult = sanitizer.sanitizeRoll20SandboxHtml(html);

  const issues = [];
  if (!html.trim()) issues.push({ severity: 'error', code: 'payload.empty_html' });
  if (css.trim() && !cssResult.css.trim()) {
    issues.push({ severity: 'error', code: 'sandbox.css_rejected_or_empty' });
  }
  if (cssResult.warnings.some((warning) => warning.code === 'css-rejected')) {
    issues.push({ severity: 'error', code: 'sandbox.css_rejected' });
  }

  const htmlChanged = htmlResult.html !== html;
  const cssChanged = cssResult.css !== css;
  const htmlRuntimeStripCount = htmlResult.warnings.filter((w) => w.code === 'html-runtime-stripped').length;

  return {
    id: fixture.id,
    pass: issues.every((issue) => issue.severity !== 'error'),
    issues,
    html: {
      beforeBytes: Buffer.byteLength(html),
      afterBytes: Buffer.byteLength(htmlResult.html),
      beforeHash: sha256(html),
      afterHash: sha256(htmlResult.html),
      changed: htmlChanged,
      runtimeStripCount: htmlRuntimeStripCount,
      warningCounts: warningCounts(htmlResult.warnings),
    },
    css: {
      beforeBytes: Buffer.byteLength(css),
      afterBytes: Buffer.byteLength(cssResult.css),
      beforeHash: sha256(css),
      afterHash: sha256(cssResult.css),
      changed: cssChanged,
      warningCounts: warningCounts(cssResult.warnings),
    },
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Sandbox Sanitize Audit',
    '',
    `Generated: ${report.finishedAt}`,
    '',
    'Scope: local diagnostic against observed Roll20 Custom Sheet Sandbox sanitize/prefix behavior. This does not upload to Roll20 and does not prove visual parity.',
    '',
    `Run: \`${path.relative(process.cwd(), report.runDir)}\``,
    '',
    '| Fixture | Status | HTML bytes | HTML changed | CSS bytes | CSS changed | Runtime stripped | Issues |',
    '| --- | --- | ---: | --- | ---: | --- | ---: | --- |',
  ];

  for (const item of report.fixtures) {
    lines.push(`| \`${item.id}\` | ${item.pass ? 'PASS' : 'FAIL'} | ${item.html.beforeBytes} -> ${item.html.afterBytes} | ${item.html.changed ? `${item.html.beforeHash} -> ${item.html.afterHash}` : 'no'} | ${item.css.beforeBytes} -> ${item.css.afterBytes} | ${item.css.changed ? `${item.css.beforeHash} -> ${item.css.afterHash}` : 'no'} | ${item.html.runtimeStripCount} | ${formatIssues(item.issues)} |`);
  }

  lines.push('');
  lines.push('## Warning Counts');
  lines.push('');
  lines.push('| Fixture | HTML warnings | CSS warnings |');
  lines.push('| --- | --- | --- |');
  for (const item of report.fixtures) {
    lines.push(`| \`${item.id}\` | ${formatCounts(item.html.warningCounts)} | ${formatCounts(item.css.warningCounts)} |`);
  }

  lines.push('');
  lines.push('Failure gate: empty HTML or CSS that Roll20 sandbox sanitizer would reject/clear. Other rewrites are diagnostics to compare against actual Roll20 screenshots.');
  return `${lines.join('\n')}\n`;
}

function formatCounts(counts) {
  const entries = Object.entries(counts).sort();
  return entries.length ? entries.map(([code, count]) => `${code}:${count}`).join('<br>') : 'none';
}

function formatIssues(issues) {
  return issues.length ? issues.map((issue) => `${issue.severity}:${issue.code}`).join('<br>') : 'none';
}

async function main() {
  if (!(await exists(join(runDir, 'local-baseline')))) {
    throw new Error(`missing local-baseline under ${runDir}`);
  }
  const sanitizer = require(compileSandboxSanitizerModule());
  if (
    typeof sanitizer.sanitizeRoll20SandboxCss !== 'function' ||
    typeof sanitizer.sanitizeRoll20SandboxHtml !== 'function'
  ) {
    throw new Error('compiled sandbox sanitizer exports are missing');
  }

  await fs.mkdir(reportDir, { recursive: true });
  const report = {
    startedAt: new Date().toISOString(),
    runDir,
    scope: 'local sandbox sanitize diagnostic; not Roll20 visual parity',
    fixtures: [],
  };

  for (const fixture of await listFixtures()) {
    const entry = await auditFixture(fixture, sanitizer);
    report.fixtures.push(entry);
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} htmlChanged=${entry.html.changed} cssChanged=${entry.css.changed}`);
  }

  report.finishedAt = new Date().toISOString();
  report.pass = report.fixtures.every((fixture) => fixture.pass);
  await fs.writeFile(join(reportDir, 'roll20-sandbox-sanitize-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(join(reportDir, 'roll20-sandbox-sanitize-audit-results.md'), renderMarkdown(report), 'utf8');
  console.log(report.pass ? 'ROLL20 SANDBOX SANITIZE AUDIT PASS' : 'ROLL20 SANDBOX SANITIZE AUDIT FAIL');
  if (!report.pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

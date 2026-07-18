#!/usr/bin/env node
/**
 * Audit the local legacy Roll20 export path with copyright-safe synthetic CSS.
 *
 * Scope:
 * - proves the sanitizer performs legacy-only CSS rewriting/removal;
 * - proves ExportDialog routes legacy export through sanitizeForRoll20Legacy;
 * - does not prove actual Roll20 legacy visual parity.
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
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const require = createRequire(import.meta.url);

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const requestedReportDir = resolve(argOf('--report-dir', 'reports/legacy-export-audit'));
const requestedBuildDir = resolve(argOf('--build-dir', join(tmpdir(), `legacy-export-audit-build-${process.pid}`)));

function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const SYNTHETIC_MODERN_CSS = `
:root {
  --r20-accent: #c02030;
  --r20-gap: 12px;
}

.sheet-modern {
  position: sticky;
  transform: scale(0.92);
  animation: r20-fade 200ms ease-in-out;
  color: var(--r20-accent);
  margin-left: var(--r20-missing, 7px);
}

.sheet-fixed {
  position: fixed;
  transform: rotate(10deg);
}

.sheet-stable {
  display: block;
  padding: 8px;
  color: red;
}

@keyframes r20-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
`.trim();

function compileSanitizerModule() {
  const outRoot = requestedBuildDir;
  const compiled = join(outRoot, 'lib/emit/sanitize.js');
  const tsPath = join(REPO_ROOT, 'lib/emit/sanitize.ts');
  const tscJs = join(REPO_ROOT, 'node_modules/typescript/lib/tsc.js');

  if (!existsSync(tsPath)) throw new Error(`sanitizer not found: ${tsPath}`);
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
    'lib/emit/sanitize.ts',
    '--esModuleInterop',
    '--skipLibCheck',
    '--noEmit', 'false',
    '--declaration', 'false',
  ], { cwd: REPO_ROOT, stdio: 'pipe' });

  if (!existsSync(compiled)) {
    throw new Error(`sanitizer compile did not produce ${compiled}`);
  }
  return compiled;
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function includesText(text, expected) {
  return text.toLowerCase().includes(expected.toLowerCase());
}

function countWarning(warnings, code) {
  return warnings.filter((warning) => warning.code === code).length;
}

function check(assertions, name, pass, details = {}) {
  assertions.push({ name, pass: Boolean(pass), details });
}

function auditExportDialogStatic(assertions) {
  const file = join(REPO_ROOT, 'components/editor/ExportDialog.tsx');
  const source = readFileSync(file, 'utf8');
  check(
    assertions,
    'ExportDialog imports sanitizeForRoll20Legacy',
    /sanitizeForRoll20Legacy/.test(source),
    { file },
  );
  check(
    assertions,
    'ExportDialog gates sanitizer behind legacyMode',
    /if\s*\(\s*legacyMode\s*&&\s*exportText\.css\s*\)/.test(source),
    { file },
  );
  check(
    assertions,
    'ExportDialog writes sanitize-warnings.json only for legacy export',
    /extraFiles\[['"]sanitize-warnings\.json['"]\]/.test(source),
    { file },
  );
  check(
    assertions,
    'ExportDialog sends sanitized CSS into buildZip',
    /css:\s*cssForZip/.test(source),
    { file },
  );
  check(
    assertions,
    'ExportDialog writes the selected mode into sheet.json metadata',
    /\{\s*\.\.\.meta,\s*legacy:\s*legacyMode\s*\}/.test(source),
    { file },
  );
  check(
    assertions,
    'ExportDialog shares the preview Roll20 compatibility mode',
    /setRoll20CompatibilityMode/.test(source),
    { file },
  );
}

function runAudit() {
  const assertions = [];
  const { sanitizeForRoll20Legacy } = require(compileSanitizerModule());
  if (typeof sanitizeForRoll20Legacy !== 'function') {
    throw new Error('compiled sanitizer did not export sanitizeForRoll20Legacy');
  }

  const modernCss = SYNTHETIC_MODERN_CSS;
  const legacy = sanitizeForRoll20Legacy(modernCss);
  const legacyCss = legacy.sanitized;
  const warnings = legacy.warnings;

  check(assertions, 'Modern CSS source keeps transform', includesText(modernCss, 'transform: scale(0.92)'));
  check(assertions, 'Modern CSS source keeps animation', includesText(modernCss, 'animation: r20-fade'));
  check(assertions, 'Modern CSS source keeps keyframes', includesText(modernCss, '@keyframes r20-fade'));
  check(assertions, 'Legacy CSS converts scale transform to zoom', includesText(legacyCss, 'zoom: 0.92'));
  check(assertions, 'Legacy CSS removes non-scale transform', !/transform\s*:/i.test(legacyCss), {
    legacyCssExcerpt: legacyCss.slice(0, 500),
  });
  check(assertions, 'Legacy CSS strips animation declarations', !/animation(?:-[a-z-]+)?\s*:/i.test(legacyCss));
  check(assertions, 'Legacy CSS strips keyframes at-rule', !/@(?:-[a-z]+-)?keyframes\b/i.test(legacyCss));
  check(assertions, 'Legacy CSS inlines known CSS variable', includesText(legacyCss, 'color: #c02030'));
  check(assertions, 'Legacy CSS uses fallback for missing CSS variable', includesText(legacyCss, 'margin-left: 7px'));
  check(assertions, 'Legacy CSS converts sticky positioning', includesText(legacyCss, 'position: relative'));
  check(assertions, 'Legacy CSS converts fixed positioning', includesText(legacyCss, 'position: absolute'));
  check(assertions, 'Legacy CSS strips custom property declarations', !/--r20-(?:accent|gap)\s*:/i.test(legacyCss));
  check(assertions, 'Legacy CSS preserves stable declarations', includesText(legacyCss, 'padding: 8px') && includesText(legacyCss, 'color: red'));
  check(assertions, 'Legacy sanitizer emits warnings', warnings.length >= 8, { warningCount: warnings.length });

  for (const code of [
    'transform-converted',
    'transform-complex',
    'animation-stripped',
    'keyframes-stripped',
    'var-inlined',
    'position-sticky',
    'position-fixed',
    'var-decl-stripped',
  ]) {
    check(assertions, `Legacy warning includes ${code}`, countWarning(warnings, code) > 0, {
      count: countWarning(warnings, code),
    });
  }

  auditExportDialogStatic(assertions);

  return {
    generatedAt: new Date().toISOString(),
    scope: 'local synthetic legacy export audit; not actual Roll20 visual parity',
    pass: assertions.every((assertion) => assertion.pass),
    modernCssSha256: sha256(modernCss),
    legacyCssSha256: sha256(legacyCss),
    modernCssBytes: Buffer.byteLength(modernCss),
    legacyCssBytes: Buffer.byteLength(legacyCss),
    warningCount: warnings.length,
    warningCodes: warnings.reduce((acc, warning) => {
      acc[warning.code] = (acc[warning.code] ?? 0) + 1;
      return acc;
    }, {}),
    assertions,
    syntheticModernCss: modernCss,
    syntheticLegacyCss: legacyCss,
    warnings,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Legacy Export Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local synthetic export-path audit. This proves sanitizer behavior and the ExportDialog routing guard; it does not prove actual Roll20 legacy visual parity.',
    '',
    `Status: ${report.pass ? 'PASS' : 'FAIL'}`,
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    `| Modern CSS bytes | ${report.modernCssBytes} |`,
    `| Legacy CSS bytes | ${report.legacyCssBytes} |`,
    `| Warning count | ${report.warningCount} |`,
    '',
    '| Warning code | Count |',
    '| --- | ---: |',
  ];

  for (const [code, count] of Object.entries(report.warningCodes).sort()) {
    lines.push(`| \`${code}\` | ${count} |`);
  }

  lines.push('');
  lines.push('| Assertion | Status |');
  lines.push('| --- | --- |');
  for (const assertion of report.assertions) {
    lines.push(`| ${assertion.name} | ${assertion.pass ? 'PASS' : 'FAIL'} |`);
  }

  lines.push('');
  lines.push('Next checks: add preview-level modern/legacy visual captures, then test legacy payload behavior in Roll20 Custom Sheet Sandbox or a new test room.');
  return `${lines.join('\n')}\n`;
}

function prepareReportDir() {
  try {
    mkdirSync(requestedReportDir, { recursive: true });
    return requestedReportDir;
  } catch (error) {
    const fallback = join(tmpdir(), `legacy-export-audit-${Date.now()}`);
    mkdirSync(fallback, { recursive: true });
    console.warn(`report directory unavailable; using temporary output: ${fallback}`);
    return fallback;
  }
}

const reportDir = prepareReportDir();
const report = runAudit();
report.reportDir = reportDir;
writeFileSync(join(reportDir, 'legacy-export-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
writeFileSync(join(reportDir, 'legacy-export-audit-results.md'), renderMarkdown(report), 'utf8');

console.log(JSON.stringify({
  pass: report.pass,
  warningCount: report.warningCount,
  report: join(reportDir, 'legacy-export-audit-results.md'),
}));

if (!report.pass) process.exitCode = 1;

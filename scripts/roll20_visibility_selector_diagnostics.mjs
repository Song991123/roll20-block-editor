#!/usr/bin/env node
/**
 * Diagnose CSS/HTML class selector visibility mismatches.
 *
 * Roll20 sheets commonly use sheet-* class conventions and Roll20/Sandbox may
 * rewrite CSS differently from the local expected renderer. This report finds
 * class selectors in emitted payload CSS that only match if sheet- aliases are
 * considered, which is a common reason conditional sections stay visible.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const fixtureFilter = args[1] && !args[1].startsWith('--') ? args[1] : null;

if (!args[0]) {
  console.error('Usage: node scripts/roll20_visibility_selector_diagnostics.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

const outDir = path.join(runDir, 'visibility-selector-diagnostics');

async function main() {
  const baselineDir = path.join(runDir, 'local-baseline');
  const fixtureIds = (await readdir(baselineDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => !fixtureFilter || id === fixtureFilter)
    .sort();
  const fixtures = [];
  for (const fixtureId of fixtureIds) fixtures.push(await analyzeFixture(fixtureId));
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    scope: 'source-level selector diagnostics only; not Roll20 visual parity',
    fixtures,
    summary: {
      fixtures: fixtures.length,
      withAliasOnlyHideSelectors: fixtures.filter((fixture) => fixture.aliasOnlyHideSelectors.length > 0).length,
      withMissingHideSelectors: fixtures.filter((fixture) => fixture.missingHideSelectors.length > 0).length,
    },
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'visibility-selector-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'visibility-selector-diagnostics-results.md'), renderMarkdown(report), 'utf8');
  for (const fixture of fixtures) {
    console.log(`${fixture.status} ${fixture.fixtureId} aliasOnlyHide=${fixture.aliasOnlyHideSelectors.length} missingHide=${fixture.missingHideSelectors.length}`);
  }
  console.log(`ROLL20 VISIBILITY SELECTOR DIAGNOSTICS OK ${path.relative(process.cwd(), outDir)}`);
}

async function analyzeFixture(fixtureId) {
  const payloadDir = path.join(runDir, 'local-baseline', fixtureId, 'payload');
  const htmlPath = path.join(payloadDir, 'sheet.html');
  const cssPath = path.join(payloadDir, 'sheet.css');
  if (!existsSync(htmlPath) || !existsSync(cssPath)) {
    return {
      fixtureId,
      status: 'SKIP',
      reason: 'missing emitted payload HTML/CSS',
      aliasOnlyHideSelectors: [],
      missingHideSelectors: [],
      directHideSelectors: [],
    };
  }
  const html = await readFile(htmlPath, 'utf8');
  const css = await readFile(cssPath, 'utf8');
  const htmlClasses = collectHtmlClasses(html);
  const rules = collectCssRules(css);
  const hideRules = rules.filter((rule) => /display\s*:\s*none\b/i.test(rule.body));
  const findings = hideRules.flatMap((rule) => {
    const classes = collectSelectorClasses(rule.selector);
    return classes.map((className) => {
      const direct = htmlClasses.has(className);
      const sheetAlias = className.startsWith('sheet-') ? className.slice('sheet-'.length) : `sheet-${className}`;
      const alias = htmlClasses.has(sheetAlias);
      return {
        selector: rule.selector,
        className,
        direct,
        alias,
        sheetAlias,
      };
    });
  });
  const aliasOnlyHideSelectors = uniqueFindings(findings.filter((item) => !item.direct && item.alias));
  const missingHideSelectors = uniqueFindings(findings.filter((item) => !item.direct && !item.alias));
  const directHideSelectors = uniqueFindings(findings.filter((item) => item.direct));
  return {
    fixtureId,
    status: 'COMPARED',
    payloadHtml: path.relative(process.cwd(), htmlPath),
    payloadCss: path.relative(process.cwd(), cssPath),
    htmlClassCount: htmlClasses.size,
    cssRuleCount: rules.length,
    hideRuleCount: hideRules.length,
    aliasOnlyHideSelectors,
    missingHideSelectors,
    directHideSelectors: directHideSelectors.slice(0, 30),
    interpretation: buildInterpretation(aliasOnlyHideSelectors, missingHideSelectors),
  };
}

function collectHtmlClasses(html) {
  const classes = new Set();
  const re = /\bclass\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    for (const token of match[1].split(/\s+/).filter(Boolean)) classes.add(token);
  }
  return classes;
}

function collectCssRules(css) {
  const rules = [];
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(withoutComments))) {
    rules.push({
      selector: match[1].trim().replace(/\s+/g, ' '),
      body: match[2],
    });
  }
  return rules;
}

function collectSelectorClasses(selector) {
  const classes = new Set();
  const re = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
  let match;
  while ((match = re.exec(selector))) classes.add(match[1]);
  return [...classes];
}

function uniqueFindings(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${item.className}|${item.sheetAlias}|${item.selector}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function buildInterpretation(aliasOnly, missing) {
  const notes = [];
  if (aliasOnly.length) {
    notes.push(`${aliasOnly.length} hide selector class references only match emitted HTML through a sheet- alias.`);
  }
  if (missing.length) {
    notes.push(`${missing.length} hide selector class references have no direct or sheet-aliased emitted HTML class.`);
  }
  if (!notes.length) notes.push('No emitted payload hide selector class mismatch found.');
  return notes;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Visibility Selector Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: source-level CSS/HTML selector diagnostics. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Hide rules | Alias-only hide refs | Missing hide refs | Interpretation |');
  lines.push('| --- | --- | ---: | ---: | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.hideRuleCount ?? ''} | ${fixture.aliasOnlyHideSelectors.length} | ${fixture.missingHideSelectors.length} | ${(fixture.interpretation ?? [fixture.reason]).join('<br>')} |`);
  }
  for (const fixture of report.fixtures.filter((item) => item.status === 'COMPARED')) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push('### Alias-Only Hide Selectors');
    lines.push('');
    if (!fixture.aliasOnlyHideSelectors.length) {
      lines.push('- None.');
    } else {
      for (const item of fixture.aliasOnlyHideSelectors.slice(0, 40)) {
        lines.push(`- \`.${item.className}\` only matches emitted HTML via \`.${item.sheetAlias}\` in selector \`${item.selector}\`.`);
      }
    }
    if (fixture.missingHideSelectors.length) {
      lines.push('');
      lines.push('### Missing Hide Selectors');
      lines.push('');
      for (const item of fixture.missingHideSelectors.slice(0, 40)) {
        lines.push(`- \`.${item.className}\` has no direct or sheet-aliased emitted HTML class in selector \`${item.selector}\`.`);
      }
    }
  }
  lines.push('');
  lines.push('## Next Action');
  lines.push('');
  lines.push('- If a fixture has alias-only hide selectors and local screenshots show extra conditional content, compare Roll20 actual DOM/class rewriting before changing production CSS.');
  lines.push('- Do not blindly add dual selectors globally; verify this behavior against at least AW2E, Les-Oublies, and YSHY full-root evidence.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

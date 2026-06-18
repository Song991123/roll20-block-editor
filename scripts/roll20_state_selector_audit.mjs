#!/usr/bin/env node
/**
 * Audit Roll20 default-state CSS selectors against HTML controls.
 *
 * Roll20 sheets often use hidden inputs, checkboxes, radio buttons, `[value]`,
 * `:checked`, and sibling combinators to choose the default visible tab/state.
 * If import/export drops a class, value, name, or checked attribute, the sheet
 * can look correct in a static count but open to the wrong screen.
 *
 * This script reads ignored fixtures and, optionally, ignored generated Roll20
 * payloads from `reports/roll20-actual-compare/<label>/`. It writes an ignored
 * report. It is a semantic guard, not a Roll20 visual parity claim.
 *
 * Usage:
 *   node scripts/roll20_state_selector_audit.mjs \
 *     --fixtures test-fixtures/visual \
 *     --payload-run reports/roll20-actual-compare/<label> \
 *     --report-dir reports/state-selector-audit
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');

function argOf(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const PAYLOAD_RUN = argOf('--payload-run', '');
const PAYLOAD_RUN_DIR = PAYLOAD_RUN ? path.resolve(PAYLOAD_RUN) : '';
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/state-selector-audit'));
const ONLY = argOf('--only', '');

const VALUE_SELECTOR_RE = /\[\s*value\s*(?:[*^$|~]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*\]/gi;
const STATE_SELECTOR_RE = /:checked\b|\[\s*(?:name|value)\s*(?:[*^$|~]?=)/i;

async function main() {
  const fixtureIds = await listFixtures();
  const entries = [];
  for (const fixtureId of fixtureIds) {
    entries.push(await auditFixture(fixtureId));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    fixtureRoot: FIXTURES_DIR,
    payloadRun: PAYLOAD_RUN_DIR || null,
    scope: 'local-only state selector semantic audit; not Roll20 visual parity',
    pass: entries.every((entry) => entry.pass),
    entries,
  };
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORT_DIR, 'state-selector-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'state-selector-audit-results.md'), renderMarkdown(report), 'utf8');
  for (const entry of entries) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.fixtureId} source=${summary(entry.source)} payload=${entry.payload ? summary(entry.payload) : 'n/a'}`);
  }
  console.log(report.pass ? 'STATE SELECTOR AUDIT PASS' : 'STATE SELECTOR AUDIT FAIL');
  process.exitCode = report.pass ? 0 : 1;
}

async function listFixtures() {
  const items = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  return items
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .filter((name) => !ONLY || name === ONLY)
    .filter((name) => existsSync(path.join(FIXTURES_DIR, name, 'manifest.json')))
    .sort((a, b) => a.localeCompare(b));
}

async function auditFixture(fixtureId) {
  const fixtureDir = path.join(FIXTURES_DIR, fixtureId);
  const manifest = JSON.parse(await fs.readFile(path.join(fixtureDir, 'manifest.json'), 'utf8'));
  const sourceHtml = await readMaybe(path.join(fixtureDir, 'source.html'));
  const sourceCss = await readMaybe(path.join(fixtureDir, 'source.css'));
  const source = auditDoc({ html: sourceHtml, css: sourceCss, label: 'source' });

  let payload = null;
  if (PAYLOAD_RUN_DIR) {
    const payloadDir = path.join(PAYLOAD_RUN_DIR, 'local-baseline', fixtureId, 'payload');
    const payloadHtml = await readMaybe(path.join(payloadDir, 'sheet.html'));
    const payloadCss = await readMaybe(path.join(payloadDir, 'sheet.css'));
    payload = payloadHtml || payloadCss
      ? auditDoc({ html: payloadHtml, css: payloadCss, label: 'payload' })
      : {
          label: 'payload',
          status: 'missing',
          selectorCount: 0,
          issueCount: 1,
          issues: [{ severity: 'fail', message: `missing payload files under ${payloadDir}` }],
        };
  }

  const payloadRegressions = payload ? findPayloadRegressions(source, payload) : [];
  const pass = payload ? payloadRegressions.length === 0 : true;
  return {
    fixtureId,
    corpus: manifest.corpus ?? null,
    legacyMode: manifest.legacyMode ?? null,
    source,
    payload,
    payloadRegressionCount: payloadRegressions.length,
    payloadRegressions,
    pass,
  };
}

function findPayloadRegressions(source, payload) {
  const sourceIssueKeys = new Set(source.issues.map((issue) => issueKey(issue.selector)));
  return payload.issues
    .filter((issue) => !sourceIssueKeys.has(issueKey(issue.selector)))
    .slice(0, 50);
}

function issueKey(selector = '') {
  return String(selector)
    .replace(/\.sheet-/g, '.')
    .replace(/\bsheet-/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function auditDoc({ html, css, label }) {
  const controls = parseControls(html);
  const selectors = parseStateSelectors(css);
  const issues = [];
  const inactiveSelectors = [];

  for (const selector of selectors) {
    if (selector.anchorClasses.length === 0 && selector.values.length === 0 && !selector.requiresChecked) {
      continue;
    }
    const anchorMatches = controls.filter((control) => controlMatchesAnchor(control, selector));
    if (anchorMatches.length === 0) {
      issues.push({
        severity: 'fail',
        selector: selector.selector,
        message: `No HTML control matches selector anchor ${selector.anchorText}`,
      });
      continue;
    }
    const activeMatches = anchorMatches.filter((control) => controlMatchesSelector(control, selector));
    if (activeMatches.length === 0) {
      inactiveSelectors.push({
        selector: selector.selector,
        anchor: selector.controlAnchorText,
        reason: selector.requiresChecked ? 'matching controls are not checked by default' : 'matching controls have a different default value',
      });
    }
  }

  const stateControls = controls.filter((control) =>
    control.type === 'hidden' ||
    control.type === 'checkbox' ||
    control.type === 'radio' ||
    control.checked ||
    control.value,
  );

  return {
    label,
    status: 'audited',
    controlCount: controls.length,
    stateControlCount: stateControls.length,
    selectorCount: selectors.length,
    issueCount: issues.length,
    inactiveSelectorCount: inactiveSelectors.length,
    checkedControlCount: controls.filter((control) => control.checked).length,
    valueControlCount: controls.filter((control) => Boolean(control.value)).length,
    classedControlCount: controls.filter((control) => control.classes.length > 0).length,
    issues: issues.slice(0, 50),
    inactiveSelectors: inactiveSelectors.slice(0, 80),
    selectors: selectors.slice(0, 80),
  };
}

function parseControls(html) {
  const controls = [];
  const inputRe = /<(input|select|textarea|button)\b([^>]*)>/gi;
  let match;
  while ((match = inputRe.exec(html))) {
    const tag = match[1].toLowerCase();
    const attrs = parseAttrs(match[2]);
    const type = (attrs.type || (tag === 'button' ? 'button' : tag)).toLowerCase();
    controls.push({
      tag,
      type,
      name: attrs.name || '',
      value: attrs.value || '',
      checked: Object.hasOwn(attrs, 'checked'),
      selected: Object.hasOwn(attrs, 'selected'),
      classes: splitClasses(attrs.class || ''),
      attrs,
    });
  }
  return controls;
}

function parseAttrs(attrText) {
  const attrs = {};
  const attrRe = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(attrText))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function splitClasses(classText) {
  return String(classText)
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseStateSelectors(css) {
  const selectors = [];
  const ruleRe = /([^{}]+)\{/g;
  let match;
  while ((match = ruleRe.exec(stripCssComments(css)))) {
    const selectorGroup = match[1]
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean);
    for (const selector of selectorGroup) {
      if (!STATE_SELECTOR_RE.test(selector)) continue;
      selectors.push(parseSelector(selector));
    }
  }
  return selectors;
}

function stripCssComments(css) {
  return String(css).replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseSelector(selector) {
  const anchorText = selector.split(/~|\+/)[0] || selector;
  const controlAnchorText = pickControlAnchor(anchorText);
  const anchorClasses = [...controlAnchorText.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  const values = [];
  let valueMatch;
  VALUE_SELECTOR_RE.lastIndex = 0;
  while ((valueMatch = VALUE_SELECTOR_RE.exec(controlAnchorText))) {
    values.push(valueMatch[1] ?? valueMatch[2] ?? valueMatch[3] ?? '');
  }
  const names = [];
  const nameRe = /\[\s*name\s*(?:[*^$|~]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\s*\]/gi;
  let nameMatch;
  while ((nameMatch = nameRe.exec(controlAnchorText))) {
    names.push(nameMatch[1] ?? nameMatch[2] ?? nameMatch[3] ?? '');
  }
  const tagMatch = controlAnchorText.match(/^([a-zA-Z][\w-]*)/);
  return {
    selector,
    anchorText: anchorText.trim(),
    controlAnchorText: controlAnchorText.trim(),
    tag: tagMatch ? tagMatch[1].toLowerCase() : '',
    anchorClasses,
    values,
    names,
    requiresChecked: /:checked\b/i.test(controlAnchorText),
    hasSiblingCombinator: /(~|\+)/.test(selector),
  };
}

function pickControlAnchor(anchorText) {
  const parts = anchorText
    .split(/\s+|>/)
    .map((part) => part.trim())
    .filter(Boolean);
  return [...parts].reverse().find((part) => STATE_SELECTOR_RE.test(part)) ?? parts.at(-1) ?? anchorText;
}

function controlMatchesAnchor(control, selector) {
  const tagMatches = !selector.tag || selector.tag === control.tag || (selector.tag === 'input' && control.tag === 'input');
  const classMatches = selector.anchorClasses.every((className) => {
    const candidates = classAlternates(className);
    return candidates.some((candidate) => control.classes.includes(candidate));
  });
  const nameMatches = selector.names.every((name) => control.name === name);
  return tagMatches && classMatches && nameMatches;
}

function controlMatchesSelector(control, selector) {
  if (!controlMatchesAnchor(control, selector)) return false;
  const valueMatches = selector.values.every((value) => control.value === value);
  const checkedMatches = !selector.requiresChecked || control.checked;
  return valueMatches && checkedMatches;
}

function classAlternates(className) {
  const values = new Set([className]);
  if (className.startsWith('sheet-')) values.add(className.slice('sheet-'.length));
  else values.add(`sheet-${className}`);
  return [...values];
}

async function readMaybe(file) {
  return existsSync(file) ? fs.readFile(file, 'utf8') : '';
}

function summary(audit) {
  if (!audit) return 'n/a';
  return `${audit.selectorCount} selectors/${audit.issueCount} issues`;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 State Selector Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local-only semantic audit for hidden/value/checked CSS state anchors. This is not Roll20 visual parity.',
    '',
    '| Fixture | Source selectors | Source source-only issues | Payload selectors | Payload issues | Payload regressions | Result |',
    '| --- | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  for (const entry of report.entries) {
    lines.push([
      entry.fixtureId,
      entry.source.selectorCount,
      entry.source.issueCount,
      entry.payload?.selectorCount ?? 'n/a',
      entry.payload?.issueCount ?? 'n/a',
      entry.payloadRegressionCount,
      entry.pass ? 'PASS' : 'FAIL',
    ].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  for (const entry of report.entries) {
    lines.push('', `## ${entry.fixtureId}`, '');
    lines.push(renderAuditBlock(entry.source));
    if (entry.payload) lines.push('', renderAuditBlock(entry.payload));
  }
  return `${lines.join('\n')}\n`;
}

function renderAuditBlock(audit) {
  const lines = [
    `### ${audit.label}`,
    '',
    `- Controls: ${audit.controlCount}`,
    `- State controls: ${audit.stateControlCount}`,
    `- Checked controls: ${audit.checkedControlCount}`,
    `- Classed controls: ${audit.classedControlCount}`,
    `- State selectors: ${audit.selectorCount}`,
    `- Issues: ${audit.issueCount}`,
    `- Inactive default-state selectors: ${audit.inactiveSelectorCount}`,
  ];
  if (audit.issues.length > 0) {
    lines.push('', '| Severity | Selector | Message |', '| --- | --- | --- |');
    for (const issue of audit.issues.slice(0, 20)) {
      lines.push([issue.severity, issue.selector ?? '', issue.message].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }
  }
  return lines.join('\n');
}

function mdCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

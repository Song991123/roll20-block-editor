#!/usr/bin/env node
/**
 * Check whether numerically promising local ChatPane candidates are supported
 * by actual Roll20 computed styles. This is diagnostic-only and should be used
 * to prevent pixel-improving hacks from becoming production renderer CSS.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const RUN_DIR = path.resolve(args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1');
const OUT_DIR = path.join(RUN_DIR, 'chat-candidate-style-proof');

const CANDIDATE_SMOKE = {
  default: 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json',
  'no-shadow': 'reports/rolltemplate-chat-smoke-no-template-shadow/rolltemplate-chat-smoke-results.json',
  'table-scale-x': 'reports/rolltemplate-chat-smoke-table-scale-x/rolltemplate-chat-smoke-results.json',
  'roll20-break-word': 'reports/rolltemplate-chat-smoke-roll20-break-word/rolltemplate-chat-smoke-results.json',
  'text-auto-aa': 'reports/rolltemplate-chat-smoke-text-auto-aa/rolltemplate-chat-smoke-results.json',
};

const TARGET_RISKS = new Set(['candidate-needs-style-proof']);
const COMPARABLE_SELECTORS = [
  'root',
  'table',
  'caption',
  'td:first',
  'sheet-template_label:first',
  'sheet-template_value:first',
  '.inlinerollresult:first',
];

function rel(file) {
  return path.relative(process.cwd(), file);
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function fixtureById(report, id) {
  return (report?.fixtures ?? []).find((fixture) => fixture.id === id || fixture.fixtureId === id) ?? null;
}

function templateOf(smokeFixture) {
  return smokeFixture?.cardInfo?.templateComputed ?? null;
}

function childMap(template) {
  const out = new Map();
  for (const child of template?.computedChildren ?? []) {
    if (child?.selector) out.set(child.selector, child);
  }
  return out;
}

function comparableNodes(template) {
  const children = childMap(template);
  return COMPARABLE_SELECTORS.map((selector) => ({
    selector,
    node: selector === 'root' ? template : children.get(selector) ?? null,
  })).filter((item) => item.node);
}

function styleValue(template, selector, key) {
  if (!template) return null;
  if (selector === 'root') return template.computedStyle?.[key] ?? null;
  return childMap(template).get(selector)?.computedStyle?.[key] ?? null;
}

function actualTemplateFor(runDir, fixtureId) {
  return path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
}

function isNone(value) {
  return value === 'none' || value === '' || value == null;
}

function sameValue(a, b) {
  return String(a ?? '') === String(b ?? '');
}

function summarizeProof(candidate, fixtureId, defaultTemplate, candidateTemplate, actualTemplate) {
  if (!candidateTemplate || !actualTemplate) {
    return {
      fixtureId,
      status: 'MISSING_EVIDENCE',
      finding: 'missing candidate or actual computed template',
      evidence: [],
    };
  }
  if (candidate.name === 'no-shadow') {
    return summarizeNoShadow(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (candidate.name === 'table-scale-x') {
    return summarizeTableScale(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (candidate.name === 'roll20-break-word') {
    return summarizeOverflowWrap(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (candidate.name === 'text-auto-aa') {
    return {
      fixtureId,
      status: 'NO_COMPUTED_STYLE_PROOF',
      finding: 'text-rendering/font-smoothing candidate is not captured by current computed-style sidecars',
      evidence: [
        { selector: 'root', key: 'textRendering', localCandidate: null, actual: null },
      ],
    };
  }
  return {
    fixtureId,
    status: 'UNKNOWN_CANDIDATE',
    finding: `no style-proof rule for ${candidate.name}`,
    evidence: [],
  };
}

function summarizeNoShadow(candidate, fixtureId, candidateTemplate, actualTemplate) {
  const evidence = comparableNodes(actualTemplate).map(({ selector }) => ({
    selector,
    key: 'textShadow',
    localCandidate: styleValue(candidateTemplate, selector, 'textShadow'),
    actual: styleValue(actualTemplate, selector, 'textShadow'),
  }));
  const actualKeepsShadow = evidence.some((item) => !isNone(item.actual));
  const candidateRemovesShadow = evidence.some((item) => isNone(item.localCandidate));
  return {
    fixtureId,
    status: actualKeepsShadow && candidateRemovesShadow ? 'CONTRADICTED_BY_ACTUAL_STYLE' : 'STYLE_COMPATIBLE',
    finding: actualKeepsShadow
      ? 'actual Roll20 still has text-shadow on comparable rolltemplate nodes'
      : 'actual Roll20 comparable nodes also have no text-shadow',
    evidence,
  };
}

function summarizeTableScale(candidate, fixtureId, candidateTemplate, actualTemplate) {
  const evidence = [{
    selector: 'table',
    key: 'transform',
    localCandidate: styleValue(candidateTemplate, 'table', 'transform'),
    actual: styleValue(actualTemplate, 'table', 'transform'),
  }, {
    selector: 'table',
    key: 'transformOrigin',
    localCandidate: styleValue(candidateTemplate, 'table', 'transformOrigin'),
    actual: styleValue(actualTemplate, 'table', 'transformOrigin'),
  }];
  const transformMatches = sameValue(evidence[0].localCandidate, evidence[0].actual);
  return {
    fixtureId,
    status: transformMatches ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: transformMatches
      ? 'actual Roll20 table transform matches the candidate'
      : 'actual Roll20 table transform does not match candidate scaleX',
    evidence,
  };
}

function summarizeOverflowWrap(candidate, fixtureId, candidateTemplate, actualTemplate) {
  const evidence = comparableNodes(actualTemplate).map(({ selector }) => ({
    selector,
    key: 'overflowWrap',
    localCandidate: styleValue(candidateTemplate, selector, 'overflowWrap'),
    actual: styleValue(actualTemplate, selector, 'overflowWrap'),
  }));
  const matches = evidence.filter((item) => sameValue(item.localCandidate, item.actual)).length;
  return {
    fixtureId,
    status: matches >= Math.ceil(evidence.length / 2) ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: `${matches}/${evidence.length} comparable nodes match actual Roll20 overflow-wrap`,
    evidence,
  };
}

function candidateStatus(fixtureProofs) {
  const statuses = fixtureProofs.map((proof) => proof.status);
  if (statuses.some((status) => status === 'CONTRADICTED_BY_ACTUAL_STYLE')) return 'REJECT_STYLE_CONTRADICTION';
  if (statuses.some((status) => status === 'NO_COMPUTED_STYLE_PROOF')) return 'NEEDS_NEW_SIDECAR_FIELDS';
  if (statuses.every((status) => status === 'STYLE_COMPATIBLE')) return 'STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW';
  return 'INCOMPLETE_STYLE_PROOF';
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Candidate Style Proof',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${rel(RUN_DIR)}\``,
    '',
    'Diagnostic-only check that compares promising local ChatPane candidate styles against actual Roll20 computed styles.',
    '',
    '| Candidate | Gate status | Mean delta | Regression count | Style proof status | Fixture statuses |',
    '| --- | --- | ---: | ---: | --- | --- |',
  ];
  for (const candidate of report.candidates) {
    lines.push(`| \`${candidate.name}\` | ${candidate.promotionRisk} | ${fmtPct(candidate.meanAlignedDeltaPct)} | ${candidate.regressedFixtures} | ${candidate.styleProofStatus} | ${candidate.fixtures.map((fixture) => `${fixture.fixtureId}:${fixture.status}`).join('<br>')} |`);
  }
  lines.push('');
  for (const candidate of report.candidates) {
    lines.push(`## ${candidate.name}`);
    lines.push('');
    lines.push(`- Style proof status: ${candidate.styleProofStatus}`);
    lines.push(`- Pixel candidate mean delta: ${fmtPct(candidate.meanAlignedDeltaPct)}`);
    for (const fixture of candidate.fixtures) {
      lines.push(`- ${fixture.fixtureId}: ${fixture.status} - ${fixture.finding}`);
      for (const evidence of fixture.evidence.slice(0, 8)) {
        lines.push(`  - ${evidence.selector}.${evidence.key}: local=${quote(evidence.localCandidate)} actual=${quote(evidence.actual)}`);
      }
    }
    lines.push('');
  }
  lines.push('This report does not authorize production CSS changes. A pixel-improving candidate must match actual Roll20 style evidence before promotion.');
  return `${lines.join('\n')}\n`;
}

function quote(value) {
  return `\`${String(value ?? '').replace(/\|/g, '\\|').slice(0, 140)}\``;
}

function fmtPct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number(value.toFixed(2))}%` : '';
}

async function main() {
  const comparison = await readJson(path.join(RUN_DIR, 'chat-candidate-comparison', 'chat-candidate-comparison-results.json'));
  if (!comparison?.candidates) throw new Error(`Missing chat candidate comparison under ${RUN_DIR}`);
  const defaultSmoke = await readJson(CANDIDATE_SMOKE.default);
  if (!defaultSmoke?.fixtures) throw new Error(`Missing default local chat smoke: ${CANDIDATE_SMOKE.default}`);

  const targetCandidates = comparison.candidates.filter((candidate) => TARGET_RISKS.has(candidate.promotionRisk));
  const candidates = [];
  for (const candidate of targetCandidates) {
    const smokePath = CANDIDATE_SMOKE[candidate.name];
    const candidateSmoke = smokePath ? await readJson(smokePath) : null;
    const fixtures = [];
    for (const fixtureId of ['official-roll20-AW2E', 'official-roll20-Les-Oublies', 'yshy-commission-1bu']) {
      const actualSidecar = await readJson(actualTemplateFor(RUN_DIR, fixtureId));
      const defaultFixture = fixtureById(defaultSmoke, fixtureId);
      const candidateFixture = fixtureById(candidateSmoke, fixtureId);
      fixtures.push(summarizeProof(
        candidate,
        fixtureId,
        templateOf(defaultFixture),
        templateOf(candidateFixture),
        actualSidecar?.latestTemplate ?? null,
      ));
    }
    candidates.push({
      name: candidate.name,
      promotionRisk: candidate.promotionRisk,
      meanAlignedDeltaPct: candidate.meanAlignedDeltaPct ?? null,
      regressedFixtures: Number(candidate.regressedFixtures ?? 0),
      fixtureAlignedDeltaPct: candidate.fixtureAlignedDeltaPct ?? {},
      smokePath: smokePath ? rel(path.resolve(smokePath)) : null,
      styleProofStatus: candidateStatus(fixtures),
      fixtures,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    runDir: rel(RUN_DIR),
    candidates,
    summary: {
      candidates: candidates.length,
      contradicted: candidates.filter((candidate) => candidate.styleProofStatus === 'REJECT_STYLE_CONTRADICTION').length,
      needsNewSidecarFields: candidates.filter((candidate) => candidate.styleProofStatus === 'NEEDS_NEW_SIDECAR_FIELDS').length,
      styleCompatible: candidates.filter((candidate) => candidate.styleProofStatus === 'STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW').length,
    },
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'chat-candidate-style-proof-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(OUT_DIR, 'chat-candidate-style-proof-results.md'), renderMarkdown(report), 'utf8');
  console.log(`ROLL20 CHAT CANDIDATE STYLE PROOF contradicted=${report.summary.contradicted}/${report.summary.candidates} needsNewSidecar=${report.summary.needsNewSidecarFields}`);
  console.log(`out=${rel(OUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

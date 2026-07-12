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
  'roll20-chat-shell-width-340': 'reports/rolltemplate-chat-smoke-roll20-chat-shell-width-340/rolltemplate-chat-smoke-results.json',
  'aw2e-message-full-width': 'reports/rolltemplate-chat-smoke-aw2e-message-full-width/rolltemplate-chat-smoke-results.json',
  'aw2e-message-width-font-size': 'reports/rolltemplate-chat-smoke-aw2e-message-width-font-size/rolltemplate-chat-smoke-results.json',
  'table-scale-x': 'reports/rolltemplate-chat-smoke-table-scale-x/rolltemplate-chat-smoke-results.json',
  'aw2e-root-width-actual': 'reports/rolltemplate-chat-smoke-aw2e-root-width-actual/rolltemplate-chat-smoke-results.json',
  'coc-table-scale-x': 'reports/rolltemplate-chat-smoke-coc-table-scale-x/rolltemplate-chat-smoke-results.json',
  'coc-table-actual-width': 'reports/rolltemplate-chat-smoke-coc-table-actual-width/rolltemplate-chat-smoke-results.json',
  'coc-overflow-crop-model': 'reports/rolltemplate-chat-smoke-coc-overflow-crop-model/rolltemplate-chat-smoke-results.json',
  'roll20-break-word': 'reports/rolltemplate-chat-smoke-roll20-break-word/rolltemplate-chat-smoke-results.json',
  'roll20-intrinsic-spacing': 'reports/rolltemplate-chat-smoke-intrinsic-spacing/rolltemplate-chat-smoke-results.json',
  'roll20-border-spacing': 'reports/rolltemplate-chat-smoke-border-spacing/rolltemplate-chat-smoke-results.json',
  'roll20-letter-spacing': 'reports/rolltemplate-chat-smoke-letter-spacing/rolltemplate-chat-smoke-results.json',
  'aw2e-font-size-only': 'reports/rolltemplate-chat-smoke-aw2e-font-size-only/rolltemplate-chat-smoke-results.json',
  'yshy-bookk-unavailable': 'reports/rolltemplate-chat-smoke-yshy-bookk-unavailable/rolltemplate-chat-smoke-results.json',
  'yshy-table-font-context': 'reports/rolltemplate-chat-smoke-yshy-table-font-context/rolltemplate-chat-smoke-results.json',
  'yshy-bookk-table-font-context': 'reports/rolltemplate-chat-smoke-yshy-bookk-table-font-context/rolltemplate-chat-smoke-results.json',
  'yshy-bookk-missing-render': 'reports/rolltemplate-chat-smoke-yshy-bookk-missing-render/rolltemplate-chat-smoke-results.json',
  'yshy-missing-bookk-table-font-context': 'reports/rolltemplate-chat-smoke-yshy-missing-bookk-table-font-context/rolltemplate-chat-smoke-results.json',
  'coc-table-intrinsic-clamp': 'reports/rolltemplate-chat-smoke-coc-table-intrinsic-clamp/rolltemplate-chat-smoke-results.json',
  'paint-dim-background': 'reports/rolltemplate-chat-smoke-paint-dim-background/rolltemplate-chat-smoke-results.json',
  'paint-dim-brightness': 'reports/rolltemplate-chat-smoke-paint-dim-brightness/rolltemplate-chat-smoke-results.json',
  'paint-dim-saturate': 'reports/rolltemplate-chat-smoke-paint-dim-saturate/rolltemplate-chat-smoke-results.json',
  'coc-background-size-actual': 'reports/rolltemplate-chat-smoke-coc-background-size-actual/rolltemplate-chat-smoke-results.json',
  'text-auto-aa': 'reports/rolltemplate-chat-smoke-text-auto-aa/rolltemplate-chat-smoke-results.json',
};

const TARGET_RISKS = new Set(['candidate-needs-style-proof', 'single-fixture-only']);
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

function summarizeProof(candidate, fixtureId, defaultTemplate, candidateTemplate, actualTemplate, candidateFixture, actualSidecar) {
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
  if (candidate.name === 'aw2e-message-width-font-size') {
    return summarizeAw2eMessageWidthFontSize(candidate, fixtureId, candidateTemplate, actualTemplate, candidateFixture, actualSidecar);
  }
  if (candidate.name === 'roll20-chat-shell-width-340' || candidate.name === 'aw2e-message-full-width') {
    return summarizeMessageShellWidth(candidate, fixtureId, candidateFixture, actualSidecar);
  }
  if (candidate.name === 'table-scale-x' || candidate.name === 'coc-table-scale-x') {
    return summarizeTableScale(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (candidate.name === 'aw2e-root-width-actual') {
    return summarizeWidthCandidate(candidate, fixtureId, candidateTemplate, actualTemplate, 'root', 1.5);
  }
  if (candidate.name === 'coc-table-actual-width' || candidate.name === 'coc-overflow-crop-model') {
    return summarizeWidthCandidate(candidate, fixtureId, candidateTemplate, actualTemplate, 'table', 1.5);
  }
  if (candidate.name === 'roll20-break-word') {
    return summarizeOverflowWrap(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (
    candidate.name === 'roll20-intrinsic-spacing' ||
    candidate.name === 'roll20-border-spacing' ||
    candidate.name === 'roll20-letter-spacing' ||
    candidate.name === 'coc-table-intrinsic-clamp'
  ) {
    return summarizeIntrinsicSpacing(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (candidate.name === 'aw2e-font-size-only') {
    return summarizeAw2eFontSize(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (
    candidate.name === 'yshy-bookk-unavailable' ||
    candidate.name === 'yshy-table-font-context' ||
    candidate.name === 'yshy-bookk-table-font-context' ||
    candidate.name === 'yshy-bookk-missing-render' ||
    candidate.name === 'yshy-missing-bookk-table-font-context'
  ) {
    return summarizeYshyFontContext(candidate, fixtureId, candidateTemplate, actualTemplate, candidateFixture, actualSidecar);
  }
  if (candidate.name === 'text-auto-aa') {
    return summarizeTextAutoAa(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (
    candidate.name === 'paint-dim-background' ||
    candidate.name === 'paint-dim-brightness' ||
    candidate.name === 'paint-dim-saturate'
  ) {
    return summarizePaintFilter(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  if (candidate.name === 'coc-background-size-actual') {
    return summarizeCocBackgroundSize(candidate, fixtureId, candidateTemplate, actualTemplate);
  }
  return {
    fixtureId,
    status: 'UNKNOWN_CANDIDATE',
    finding: `no style-proof rule for ${candidate.name}`,
    evidence: [],
  };
}

function summarizeMessageShellWidth(candidate, fixtureId, candidateFixture, actualSidecar) {
  const localMessageWidth = numberOrNull(candidateFixture?.cardInfo?.latestMessage?.rect?.width ?? candidateFixture?.cardInfo?.width);
  const actualMessageWidth = numberOrNull(actualSidecar?.latestMessage?.rect?.width);
  const localChatGroupWidth = numberOrNull(candidateFixture?.cardInfo?.width);
  const actualChatWidth = numberOrNull(actualSidecar?.chatRect?.width);
  const messageDelta = delta(localMessageWidth, actualMessageWidth);
  const chatDelta = delta(localChatGroupWidth, actualChatWidth);
  const messageMatches = typeof messageDelta === 'number' && Math.abs(messageDelta) <= 1.5;
  const chatMatches = typeof chatDelta === 'number' && Math.abs(chatDelta) <= 1.5;
  if (candidate.name === 'aw2e-message-full-width' && fixtureId !== 'official-roll20-AW2E' && messageMatches) {
    return {
      fixtureId,
      status: 'STYLE_NEUTRAL',
      finding: 'scoped message-shell candidate leaves this fixture message width matching actual Roll20',
      evidence: [
        { selector: 'chat', key: 'rect.width', localCandidate: localChatGroupWidth, actual: actualChatWidth },
        { selector: 'message', key: 'rect.width', localCandidate: localMessageWidth, actual: actualMessageWidth },
      ],
    };
  }
  return {
    fixtureId,
    status: messageMatches && chatMatches ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: messageMatches && chatMatches
      ? 'local ChatPane shell/message width matches actual Roll20 chat evidence'
      : `local ChatPane shell/message width differs from actual Roll20 (message ${fmtPx(messageDelta)}, chat ${fmtPx(chatDelta)})`,
    evidence: [
      { selector: 'chat', key: 'rect.width', localCandidate: localChatGroupWidth, actual: actualChatWidth },
      { selector: 'message', key: 'rect.width', localCandidate: localMessageWidth, actual: actualMessageWidth },
    ],
  };
}

function summarizeAw2eMessageWidthFontSize(candidate, fixtureId, candidateTemplate, actualTemplate, candidateFixture, actualSidecar) {
  if (fixtureId !== 'official-roll20-AW2E') {
    return {
      fixtureId,
      status: 'STYLE_NEUTRAL',
      finding: 'AW2E-scoped candidate does not target this fixture',
      evidence: [],
    };
  }
  const shell = summarizeMessageShellWidth(candidate, fixtureId, candidateFixture, actualSidecar);
  const font = summarizeAw2eFontSize(candidate, fixtureId, candidateTemplate, actualTemplate);
  const compatible = shell.status === 'STYLE_COMPATIBLE' && font.status === 'STYLE_COMPATIBLE';
  return {
    fixtureId,
    status: compatible ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: compatible
      ? 'AW2E message/content width and table font size both match actual Roll20 evidence'
      : 'AW2E message/content width plus font-size candidate is not fully supported by actual Roll20 style evidence',
    evidence: [
      ...shell.evidence.map((item) => ({ ...item, group: 'message-shell' })),
      ...font.evidence.map((item) => ({ ...item, group: 'font-size' })),
    ],
  };
}

function summarizeWidthCandidate(candidate, fixtureId, candidateTemplate, actualTemplate, selector, tolerancePx) {
  const localWidth = widthOf(candidateTemplate, selector);
  const actualWidth = widthOf(actualTemplate, selector);
  const transform = styleValue(candidateTemplate, selector, 'transform');
  const actualTransform = styleValue(actualTemplate, selector, 'transform');
  const delta = Number.isFinite(localWidth) && Number.isFinite(actualWidth)
    ? Number((localWidth - actualWidth).toFixed(3))
    : null;
  const transformContradicted = !sameValue(transform, actualTransform);
  const widthMatches = typeof delta === 'number' && Math.abs(delta) <= tolerancePx;
  return {
    fixtureId,
    status: widthMatches && !transformContradicted ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: widthMatches
      ? `${selector} width is within ${tolerancePx}px of actual Roll20`
      : `${selector} width differs from actual Roll20 by ${fmtPx(delta)}`,
    evidence: [
      { selector, key: 'rect.width', localCandidate: localWidth, actual: actualWidth },
      { selector, key: 'transform', localCandidate: transform, actual: actualTransform },
    ],
  };
}

function widthOf(template, selector) {
  if (!template) return null;
  const node = selector === 'root' ? template : childMap(template).get(selector);
  const width = node?.rect?.width ?? node?.boxMetrics?.offsetWidth ?? null;
  const number = Number(width);
  return Number.isFinite(number) ? number : null;
}

function summarizeAw2eFontSize(candidate, fixtureId, candidateTemplate, actualTemplate) {
  const evidence = [
    ['table', 'fontSize'],
    ['table', 'letterSpacing'],
    ['td:first', 'fontSize'],
    ['td:first', 'letterSpacing'],
  ].map(([selector, key]) => ({
    selector,
    key,
    localCandidate: styleValue(candidateTemplate, selector, key),
    actual: styleValue(actualTemplate, selector, key),
  }));
  const comparable = evidence.filter((item) => item.localCandidate != null && item.actual != null);
  const fontSizeMatches = comparable
    .filter((item) => item.key === 'fontSize')
    .every((item) => sameValue(item.localCandidate, item.actual));
  const letterSpacingContradicted = comparable
    .filter((item) => item.key === 'letterSpacing')
    .some((item) => !sameValue(item.localCandidate, item.actual));
  return {
    fixtureId,
    status: fontSizeMatches && !letterSpacingContradicted ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: fontSizeMatches
      ? 'AW2E table font-size matches actual Roll20; letter-spacing decides whether this narrower candidate is enough'
      : 'AW2E table font-size does not match actual Roll20',
    evidence,
  };
}

function summarizeYshyFontContext(candidate, fixtureId, candidateTemplate, actualTemplate, candidateFixture, actualSidecar) {
  if (fixtureId !== 'yshy-commission-1bu') {
    return {
      fixtureId,
      status: 'STYLE_NEUTRAL',
      finding: 'YSHY/CoC font-context candidate is scoped away from this fixture',
      evidence: [],
    };
  }
  const tableTargets = [
    ['root', 'fontFamily'],
    ['root', 'fontSize'],
    ['table', 'fontFamily'],
    ['table', 'fontSize'],
    ['caption', 'fontFamily'],
    ['td:first', 'fontFamily'],
  ];
  const evidence = tableTargets.map(([selector, key]) => ({
    selector,
    key,
    localCandidate: styleValue(candidateTemplate, selector, key),
    actual: styleValue(actualTemplate, selector, key),
  }));
  const checks = ['12px BookkMyungjo-Bd', '700 12px BookkMyungjo-Bd', '13px "BookkMyungjo-Bd"', '700 13px "BookkMyungjo-Bd"'];
  const localFontChecks = new Map((candidateFixture?.cardInfo?.fontEvidence?.checks ?? []).map((check) => [check.spec, Boolean(check.ok)]));
  const actualFontChecks = new Map((actualSidecar?.fontEvidence?.checks ?? []).map((check) => [check.spec, Boolean(check.ok)]));
  const fontEvidence = checks.map((spec) => ({
    selector: 'font-check',
    key: spec,
    localCandidate: localFontChecks.get(spec) ?? null,
    actual: actualFontChecks.get(spec) ?? null,
  }));
  const tableMatches = evidence
    .filter((item) => ['root', 'table'].includes(item.selector))
    .filter((item) => item.localCandidate != null && item.actual != null)
    .every((item) => sameValue(item.localCandidate, item.actual));
  const bookkMatches = fontEvidence
    .filter((item) => item.localCandidate != null && item.actual != null)
    .every((item) => sameValue(item.localCandidate, item.actual));
  const expectsBookk = candidate.name === 'yshy-bookk-unavailable' || candidate.name === 'yshy-bookk-table-font-context';
  const expectsTableFont = candidate.name === 'yshy-table-font-context' || candidate.name === 'yshy-bookk-table-font-context';
  const compatible = (!expectsBookk || bookkMatches) && (!expectsTableFont || tableMatches);
  return {
    fixtureId,
    status: compatible ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: compatible
      ? 'YSHY font-context candidate matches the targeted actual Roll20 font checks/styles'
      : `YSHY font-context candidate mismatch: table=${tableMatches ? 'match' : 'diff'}, Bookk availability=${bookkMatches ? 'match' : 'diff'}`,
    evidence: [...evidence, ...fontEvidence],
  };
}

function summarizeTextAutoAa(candidate, fixtureId, candidateTemplate, actualTemplate) {
  const keys = ['textRendering', 'webkitFontSmoothing', 'mozOsxFontSmoothing'];
  const requiredKeys = new Set(['textRendering', 'webkitFontSmoothing']);
  const evidence = comparableNodes(actualTemplate)
    .flatMap(({ selector }) => keys.map((key) => ({
      selector,
      key,
      localCandidate: styleValue(candidateTemplate, selector, key),
      actual: styleValue(actualTemplate, selector, key),
    })));
  const requiredEvidence = evidence.filter((item) => requiredKeys.has(item.key));
  const missingActual = requiredEvidence.filter((item) => item.actual == null).length;
  const missingLocal = requiredEvidence.filter((item) => item.localCandidate == null).length;
  if (missingActual || missingLocal) {
    return {
      fixtureId,
      status: 'NO_COMPUTED_STYLE_PROOF',
      finding: `text-rasterization fields missing from ${missingLocal ? 'local candidate' : ''}${missingLocal && missingActual ? ' and ' : ''}${missingActual ? 'actual Roll20 sidecar' : ''}`,
      evidence,
    };
  }
  const matches = evidence.filter((item) => sameValue(item.localCandidate, item.actual)).length;
  return {
    fixtureId,
    status: matches === evidence.length ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: `${matches}/${evidence.length} text-rasterization fields match actual Roll20`,
    evidence,
  };
}

function summarizePaintFilter(candidate, fixtureId, candidateTemplate, actualTemplate) {
  const evidence = ['table', 'caption', 'td:first', 'sheet-template_label:first', 'sheet-template_value:first']
    .map((selector) => ({
      selector,
      key: 'filter',
      localCandidate: styleValue(candidateTemplate, selector, 'filter'),
      actual: styleValue(actualTemplate, selector, 'filter'),
    }));
  const comparable = evidence.filter((item) => item.localCandidate != null && item.actual != null);
  const matches = comparable.filter((item) => sameValue(item.localCandidate, item.actual)).length;
  if (!comparable.length) {
    return {
      fixtureId,
      status: 'NO_COMPUTED_STYLE_PROOF',
      finding: 'filter fields are missing from local or actual computed-style sidecars; recapture before treating paint candidates as style-compatible',
      evidence,
    };
  }
  const actualHasNoFilter = comparable.every((item) => isNone(item.actual));
  const candidateUsesFilter = comparable.some((item) => !isNone(item.localCandidate));
  const status = candidateUsesFilter && actualHasNoFilter
    ? 'CONTRADICTED_BY_ACTUAL_STYLE'
    : matches === comparable.length
      ? 'STYLE_COMPATIBLE'
      : 'CONTRADICTED_BY_ACTUAL_STYLE';
  return {
    fixtureId,
    status,
    finding: candidateUsesFilter && actualHasNoFilter
      ? 'pixel gain comes from a local CSS filter that actual Roll20 does not apply'
      : `${matches}/${comparable.length} comparable filter fields match actual Roll20`,
    evidence,
  };
}

function summarizeCocBackgroundSize(candidate, fixtureId, candidateTemplate, actualTemplate) {
  if (fixtureId !== 'yshy-commission-1bu') {
    return {
      fixtureId,
      status: 'STYLE_NEUTRAL',
      finding: 'CoC background-size diagnostic is scoped away from this fixture',
      evidence: [],
    };
  }
  const evidence = ['table'].flatMap((selector) => [
    {
      selector,
      key: 'backgroundImage',
      localCandidate: styleValue(candidateTemplate, selector, 'backgroundImage'),
      actual: styleValue(actualTemplate, selector, 'backgroundImage'),
    },
    {
      selector,
      key: 'backgroundSize',
      localCandidate: styleValue(candidateTemplate, selector, 'backgroundSize'),
      actual: styleValue(actualTemplate, selector, 'backgroundSize'),
    },
    {
      selector,
      key: 'backgroundPosition',
      localCandidate: styleValue(candidateTemplate, selector, 'backgroundPosition'),
      actual: styleValue(actualTemplate, selector, 'backgroundPosition'),
    },
    {
      selector,
      key: 'filter',
      localCandidate: styleValue(candidateTemplate, selector, 'filter'),
      actual: styleValue(actualTemplate, selector, 'filter'),
    },
  ]);
  const comparable = evidence.filter((item) => item.localCandidate != null && item.actual != null);
  if (!comparable.length) {
    return {
      fixtureId,
      status: 'NO_COMPUTED_STYLE_PROOF',
      finding: 'background raster fields are missing from local or actual computed-style sidecars',
      evidence,
    };
  }
  const backgroundSize = comparable.find((item) => item.key === 'backgroundSize');
  const filter = comparable.find((item) => item.key === 'filter');
  const usesNoFilter = !filter || sameValue(filter.localCandidate, filter.actual) || (isNone(filter.localCandidate) && isNone(filter.actual));
  const sizeMatches = backgroundSize ? sameValue(backgroundSize.localCandidate, backgroundSize.actual) : false;
  return {
    fixtureId,
    status: sizeMatches && usesNoFilter ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: sizeMatches
      ? 'CoC background-size candidate matches actual Roll20 computed background-size'
      : 'CoC background-size candidate changes computed background-size away from actual Roll20; diagnostic only',
    evidence,
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

function summarizeIntrinsicSpacing(candidate, fixtureId, candidateTemplate, actualTemplate) {
  const targets = candidate.name === 'roll20-border-spacing'
    ? [['table', 'borderSpacing']]
    : candidate.name === 'roll20-letter-spacing'
      ? [
          ['table', 'letterSpacing'],
          ['caption', 'letterSpacing'],
          ['td:first', 'letterSpacing'],
          ['sheet-template_label:first', 'letterSpacing'],
          ['sheet-template_value:first', 'letterSpacing'],
        ]
      : [
          ['table', 'borderSpacing'],
          ['table', 'letterSpacing'],
          ['caption', 'letterSpacing'],
          ['td:first', 'letterSpacing'],
          ['sheet-template_label:first', 'letterSpacing'],
          ['sheet-template_value:first', 'letterSpacing'],
        ];
  const evidence = targets.map(([selector, key]) => ({
    selector,
    key,
    localCandidate: styleValue(candidateTemplate, selector, key),
    actual: styleValue(actualTemplate, selector, key),
  }));
  const comparable = evidence.filter((item) => item.localCandidate != null && item.actual != null);
  const matches = comparable.filter((item) => sameValue(item.localCandidate, item.actual)).length;
  return {
    fixtureId,
    status: comparable.length && matches === comparable.length ? 'STYLE_COMPATIBLE' : 'CONTRADICTED_BY_ACTUAL_STYLE',
    finding: `${matches}/${comparable.length} intrinsic spacing fields match actual Roll20`,
    evidence,
  };
}

function candidateStatus(fixtureProofs) {
  const statuses = fixtureProofs.map((proof) => proof.status);
  if (statuses.some((status) => status === 'CONTRADICTED_BY_ACTUAL_STYLE')) return 'REJECT_STYLE_CONTRADICTION';
  if (statuses.some((status) => status === 'NO_COMPUTED_STYLE_PROOF')) return 'NEEDS_NEW_SIDECAR_FIELDS';
  if (statuses.some((status) => status === 'STYLE_COMPATIBLE') && statuses.every((status) => status === 'STYLE_COMPATIBLE' || status === 'STYLE_NEUTRAL')) return 'STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW';
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

function fmtPx(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Number(value.toFixed(3))}px` : 'n/a';
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function delta(localValue, actualValue) {
  const local = Number(localValue);
  const actual = Number(actualValue);
  return Number.isFinite(local) && Number.isFinite(actual)
    ? Number((local - actual).toFixed(3))
    : null;
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
        candidateFixture,
        actualSidecar,
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

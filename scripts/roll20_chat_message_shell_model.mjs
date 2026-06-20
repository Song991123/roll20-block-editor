#!/usr/bin/env node
/**
 * Diagnose Roll20 chat message-shell geometry separately from template/table
 * geometry. This prevents agents from treating a fixture-local message gutter
 * difference as a safe global ChatPane width patch.
 *
 * Diagnostic only. Reads ignored local Roll20 evidence and local ChatPane smoke
 * results; it does not emit product CSS.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const localSmokeArg = args[1] ?? 'reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.json';
const localSmokePath = path.resolve(localSmokeArg);
const outDir = path.join(runDir, 'chat-message-shell-model');

async function main() {
  const localSmoke = await readJson(localSmokePath);
  const parity = await readOptionalJson(path.join(runDir, 'chat-parity-diagnostics', 'chat-parity-diagnostics-results.json'));
  const width = await readOptionalJson(path.join(runDir, 'chat-width-model', 'chat-width-model-results.json'));
  const fixtures = [];
  for (const localFixture of localSmoke.fixtures ?? []) {
    fixtures.push(await compareFixture(localFixture, { parity, width }));
  }
  const compared = fixtures.filter((fixture) => fixture.status === 'COMPARED');
  const actionable = compared.filter((fixture) => fixture.messageShellDecision !== 'MESSAGE_SHELL_SECONDARY');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    localSmoke: localSmokeArg,
    scope: 'diagnostic-only Roll20 chat message shell model',
    summary: {
      status: actionable.length ? 'MESSAGE_SHELL_MODEL_REQUIRED' : 'MESSAGE_SHELL_SECONDARY',
      fixtures: fixtures.length,
      compared: compared.length,
      actionable: actionable.length,
      decisions: countBy(compared.map((fixture) => fixture.messageShellDecision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-message-shell-model-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-message-shell-model-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT MESSAGE SHELL ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} status=${fixture.status} decision=${fixture.messageShellDecision ?? ''} model=${fixture.actual?.messageShellModel ?? ''} messageDelta=${fmtPx(fixture.deltas?.messageWidthDelta)} gutterDelta=${fmtPx(fixture.deltas?.chatRightGutterDelta)} next=${fixture.nextAction ?? ''}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function compareFixture(localFixture, reports) {
  const fixtureId = localFixture.id;
  const actualPath = path.join(runDir, 'local-baseline', fixtureId, 'screenshots', 'roll20-chat-dom-evidence.json');
  const actualSidecar = await readOptionalJson(actualPath);
  const local = extractLocal(localFixture);
  const actual = extractActual(actualSidecar);
  if (!local || !actual) {
    return {
      fixtureId,
      status: 'MISSING',
      localAvailable: Boolean(local),
      actualAvailable: Boolean(actual),
      messageShellDecision: 'MISSING_MESSAGE_SHELL_EVIDENCE',
      nextAction: 'rerun local rolltemplate_chat_smoke and recapture actual Roll20 chat sidecar with latestMessage/template rects',
    };
  }
  const parityFixture = findFixture(reports.parity?.fixtures, fixtureId);
  const widthFixture = findFixture(reports.width?.fixtures, fixtureId);
  const deltas = {
    chatWidthDelta: delta(local.chat.width, actual.chat.width),
    messageWidthDelta: delta(local.message.width, actual.message.width),
    templateWidthDelta: delta(local.template.width, actual.template.width),
    contentWidthDelta: delta(local.content.width, actual.content.width),
    templateLeftInsetDelta: delta(local.template.leftInset, actual.template.leftInset),
    templateRightInsetDelta: delta(local.template.rightInset, actual.template.rightInset),
    chatRightGutterDelta: delta(local.message.chatRightGutter, actual.message.chatRightGutter),
  };
  const decision = decideMessageShell({ parityFixture, widthFixture, deltas, actual });
  return {
    fixtureId,
    status: 'COMPARED',
    messageShellDecision: decision.messageShellDecision,
    nextAction: decision.nextAction,
    parity: {
      bestAlignedMismatchPct: parityFixture?.bestAlignedMismatchPct ?? '',
      bestAlignedMismatchRatio: parityFixture?.bestAlignedMismatchRatio ?? null,
    },
    widthDecision: widthFixture?.widthDecision ?? '',
    local,
    actual,
    deltas,
    evidence: decision.evidence,
  };
}

function extractLocal(fixture) {
  const card = fixture?.cardInfo;
  const template = card?.templateComputed;
  const latestMessage = card?.latestMessage;
  if (!card || !template?.rect) return null;
  const messageWidth = numberOrNull(latestMessage?.rect?.width ?? card.width);
  const templateWidth = numberOrNull(template.rect.width ?? card.templateWidth);
  if (!messageWidth || !templateWidth) return null;
  const leftInset = latestMessage?.rect
    ? numberOrNull(template.rect.left - latestMessage.rect.left)
    : 45;
  const rightInset = latestMessage?.rect
    ? numberOrNull(latestMessage.rect.right - template.rect.right)
    : numberOrNull(messageWidth - templateWidth - leftInset);
  const chatWidth = numberOrNull(card.width);
  return {
    chat: { width: chatWidth },
    message: {
      width: messageWidth,
      chatRightGutter: chatWidth == null ? null : Number((chatWidth - messageWidth).toFixed(3)),
      className: latestMessage?.className ?? '',
      textPrefix: textPrefix(latestMessage?.text ?? card.text),
    },
    content: { width: templateWidth },
    template: {
      width: templateWidth,
      className: template.className ?? '',
      leftInset,
      rightInset,
    },
  };
}

function extractActual(sidecar) {
  const chatRect = sidecar?.chatRect;
  const message = sidecar?.latestMessage;
  const template = sidecar?.latestTemplate;
  if (!chatRect?.width || !message?.rect?.width || !template?.rect?.width) return null;
  const chatWidth = numberOrNull(chatRect.width);
  const messageWidth = numberOrNull(message.rect.width);
  const templateWidth = numberOrNull(template.rect.width);
  const chatRightGutter = numberOrNull(chatRect.right - message.rect.right);
  return {
    chat: { width: chatWidth },
    message: {
      width: messageWidth,
      chatRightGutter,
      className: message.className ?? '',
      textPrefix: textPrefix(message.text),
    },
    content: { width: templateWidth },
    template: {
      width: templateWidth,
      className: template.className ?? '',
      leftInset: numberOrNull(template.rect.left - message.rect.left),
      rightInset: numberOrNull(message.rect.right - template.rect.right),
    },
    messageShellModel: Math.abs(chatRightGutter ?? 0) <= 1.5
      ? 'FULL_CHAT_WIDTH_MESSAGE'
      : 'INSET_CHAT_WIDTH_MESSAGE',
  };
}

function decideMessageShell({ parityFixture, widthFixture, deltas, actual }) {
  const highMismatch = Number(parityFixture?.bestAlignedMismatchRatio ?? 0) > 0.1;
  const evidence = [];
  if (actual.messageShellModel) evidence.push(`actual message shell: ${actual.messageShellModel}`);
  if (Math.abs(deltas.messageWidthDelta ?? 0) >= 8) evidence.push(`message width delta ${fmtPx(deltas.messageWidthDelta)}`);
  if (Math.abs(deltas.contentWidthDelta ?? 0) >= 8) evidence.push(`content/template width delta ${fmtPx(deltas.contentWidthDelta)}`);
  if (Math.abs(deltas.chatRightGutterDelta ?? 0) >= 8) evidence.push(`chat right gutter delta ${fmtPx(deltas.chatRightGutterDelta)}`);

  if (
    highMismatch &&
    widthFixture?.widthDecision === 'CHAT_MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED' &&
    Math.abs(deltas.messageWidthDelta ?? 0) >= 8 &&
    Math.abs(deltas.contentWidthDelta ?? 0) >= 8
  ) {
    return {
      messageShellDecision: 'MESSAGE_CONTENT_WIDTH_MODEL_REQUIRED',
      nextAction: 'model message/content width per rolltemplate context; do not widen every ChatPane message globally',
      evidence,
    };
  }
  if (
    highMismatch &&
    widthFixture?.widthDecision !== 'TABLE_WIDTH_MODEL_REQUIRED' &&
    Math.abs(deltas.chatRightGutterDelta ?? 0) >= 8
  ) {
    return {
      messageShellDecision: 'CHAT_RIGHT_GUTTER_MODEL_REQUIRED',
      nextAction: 'compare Roll20 message gutter/margin computed styles before changing template/table width',
      evidence,
    };
  }
  return {
    messageShellDecision: 'MESSAGE_SHELL_SECONDARY',
    nextAction: 'keep message shell as secondary evidence while table/paint/default-state diagnostics continue',
    evidence,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Message Shell Model',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This report separates chat message box geometry from rolltemplate table geometry.',
    '',
    `Status: ${report.summary.status}`,
    '',
    '| Fixture | Decision | Actual shell | Aligned mismatch | Width decision | Message delta | Content delta | Gutter delta | Insets L/R actual | Evidence | Next |',
    '| --- | --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.messageShellDecision} | ${fixture.actual?.messageShellModel ?? ''} | ${fixture.parity?.bestAlignedMismatchPct ?? ''} | ${fixture.widthDecision ?? ''} | ${fmtPx(fixture.deltas?.messageWidthDelta)} | ${fmtPx(fixture.deltas?.contentWidthDelta)} | ${fmtPx(fixture.deltas?.chatRightGutterDelta)} | ${fmtPx(fixture.actual?.template?.leftInset)} / ${fmtPx(fixture.actual?.template?.rightInset)} | ${(fixture.evidence ?? []).join('<br>')} | ${fixture.nextAction ?? ''} |`);
  }
  lines.push('', '## Claim Boundary', '');
  lines.push('- This report is not a production renderer patch.');
  lines.push('- A full-chat-width message for one fixture is not enough to widen every chat card; candidate comparison must remain cross-fixture.');
  return `${lines.join('\n')}\n`;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    console.error(`Missing or invalid required report: ${path.relative(process.cwd(), file)}`);
    console.error(String(error?.message || error));
    process.exit(2);
  }
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(3)) : null;
}

function delta(localValue, actualValue) {
  const local = Number(localValue);
  const actual = Number(actualValue);
  return Number.isFinite(local) && Number.isFinite(actual)
    ? Number((actual - local).toFixed(3))
    : null;
}

function countBy(values) {
  const out = {};
  for (const value of values) out[value || 'unknown'] = (out[value || 'unknown'] ?? 0) + 1;
  return out;
}

function textPrefix(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function fmtPx(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `${number > 0 ? '+' : ''}${Number(number.toFixed(3))}px`;
}

await main();

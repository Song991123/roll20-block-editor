#!/usr/bin/env node
/**
 * Create a local-only Roll20 Custom Sheet Sandbox upload handoff checklist.
 *
 * Use this when browser automation reaches Roll20 but Chrome blocks
 * `fileChooser.setFiles` with `Not allowed`. The output stays under ignored
 * reports and contains exact local payload paths plus screenshot destinations.
 *
 * Usage:
 *   node scripts/roll20_upload_handoff.mjs \
 *     reports/roll20-actual-compare/<label> [fixture-id]
 *
 * If no run folder is provided, the newest ignored run with a PASS pre-upload
 * report is selected. This avoids accidentally handing off stale payloads.
 */

import { existsSync, readFileSync } from 'node:fs';
import { statSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));
const [RUN_DIR_ARG, ONLY] = parseArgs(positionalArgs);
const MISSING_ONLY = args.includes('--missing-only');
const RUN_ROOT = path.resolve('reports/roll20-actual-compare');
const MAX_CHAT_SIDECAR_AGE_MS = 5 * 60 * 1000;

function parseArgs(rawArgs) {
  const first = rawArgs[0] ?? '';
  const second = rawArgs[1] ?? '';
  if (!first) return ['', ''];
  const looksLikePath = first.includes('/') || first.includes('\\') || first.startsWith('.') || existsSync(first);
  if (looksLikePath) return [first, second];
  return ['', first];
}

async function main() {
  const runDir = RUN_DIR_ARG ? path.resolve(RUN_DIR_ARG) : await findLatestPreuploadRun();
  const outDir = path.join(runDir, 'roll20-upload-handoff');
  const baselineDir = path.join(runDir, 'local-baseline');
  if (!existsSync(baselineDir)) {
    throw new Error(`missing local baseline folder: ${baselineDir}`);
  }
  const fixtureIds = (await fs.readdir(baselineDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((fixtureId) => !ONLY || fixtureId === ONLY)
    .sort((a, b) => a.localeCompare(b));

  const entries = [];
  for (const fixtureId of fixtureIds) {
    entries.push(await buildEntry(runDir, fixtureId));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    selectedAutomatically: !RUN_DIR_ARG,
    privacy: 'local-only ignored report; do not commit generated evidence',
    blocker:
      'Chrome extension file upload is blocked until Allow access to file URLs is enabled for the Codex extension.',
    missingOnly: MISSING_ONLY,
    entries,
  };

  const visibleEntries = MISSING_ONLY
    ? entries.filter((entry) => entry.evidence.needsGeneratedActual || entry.evidence.needsChat)
    : entries;
  report.visibleEntries = visibleEntries.length;

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'roll20-upload-handoff.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'roll20-upload-handoff.md'), renderMarkdown(report), 'utf8');
  console.log(JSON.stringify({ outDir, runDir, entries: entries.length, visibleEntries: report.visibleEntries, missingOnly: MISSING_ONLY }, null, 2));
}

async function findLatestPreuploadRun() {
  if (!existsSync(RUN_ROOT)) {
    throw new Error(`missing Roll20 actual-compare report root: ${RUN_ROOT}`);
  }
  const entries = await fs.readdir(RUN_ROOT, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const runDir = path.join(RUN_ROOT, entry.name);
    const preuploadJson = path.join(runDir, 'preupload-verification', 'preupload-verification-results.json');
    const baselineDir = path.join(runDir, 'local-baseline');
    if (!existsSync(preuploadJson) || !existsSync(baselineDir)) continue;
    try {
      const report = JSON.parse(await fs.readFile(preuploadJson, 'utf8'));
      if (report.pass) {
        const stat = await fs.stat(preuploadJson);
        candidates.push({ runDir, mtimeMs: stat.mtimeMs });
      }
    } catch {
      // Ignore malformed local reports.
    }
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!candidates[0]) {
    throw new Error(`no PASS pre-upload run found under ${RUN_ROOT}; pass an explicit run folder`);
  }
  return candidates[0].runDir;
}

async function buildEntry(runDir, fixtureId) {
  const root = path.join(runDir, 'local-baseline', fixtureId);
  const payload = path.join(root, 'payload');
  const screenshots = path.join(root, 'screenshots');
  const files = {
    html: path.join(payload, 'sheet.html'),
    css: path.join(payload, 'sheet.css'),
    translation: path.join(payload, 'translation.json'),
    zip: path.join(root, 'upload.zip'),
  };
  const screenshotTargets = {
    sandbox: withRelative(path.join(screenshots, 'roll20-sandbox.png')),
    sandboxDomEvidence: withRelative(path.join(screenshots, 'roll20-sandbox-dom-evidence.json')),
    sandboxRoot: withRelative(path.join(screenshots, 'roll20-sandbox-root.png')),
    sandboxFullRootDpr: withRelative(path.join(screenshots, 'roll20-sandbox-root-full-dpr-corrected.png')),
    sandboxFullRootDprMeta: withRelative(path.join(screenshots, 'roll20-sandbox-root-full-dpr-corrected.json')),
    chat: withRelative(path.join(screenshots, 'roll20-chat.png')),
    chatPage: withRelative(path.join(screenshots, 'roll20-chat-page.png')),
    chatDomEvidence: withRelative(path.join(screenshots, 'roll20-chat-dom-evidence.json')),
    room: withRelative(path.join(screenshots, 'roll20-room.png')),
  };
  const stitchManifest = withRelative(path.join(screenshots, 'roll20-root-dpr-complete-manifest.json'));
  const sandboxValidation = validateSandboxEvidence(screenshots);
  const chatValidation = validateChatEvidence(screenshots);
  const evidence = {
    hasSandboxViewport: existsSync(screenshotTargets.sandbox.path),
    hasSandboxRoot: existsSync(screenshotTargets.sandboxRoot.path),
    hasSandboxFullRootDpr: existsSync(screenshotTargets.sandboxFullRootDpr.path),
    hasSandboxDomEvidence: existsSync(screenshotTargets.sandboxDomEvidence.path),
    hasChat: existsSync(screenshotTargets.chat.path),
    hasChatDomEvidence: existsSync(screenshotTargets.chatDomEvidence.path),
    generatedActualStatus: sandboxValidation.status,
    generatedActualNote: sandboxValidation.note,
    needsGeneratedActual: !sandboxValidation.ok,
    chatStatus: chatValidation.status,
    chatNote: chatValidation.note,
    needsChat: !chatValidation.ok,
  };
  return {
    fixtureId,
    evidence,
    files: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, { path: file, relativePath: rel(file), exists: existsSync(file) }])),
    screenshotTargets,
    stitchManifest,
    nextRootCapturePlanCommand: `corepack pnpm run plan:roll20-root-capture -- ${path.relative(process.cwd(), runDir)} ${fixtureId}`,
    nextStitchCommand: `corepack pnpm run stitch:roll20-actual-root -- --manifest ${stitchManifest.relativePath} --out ${screenshotTargets.sandboxFullRootDpr.relativePath}`,
    nextAuditCommand: `corepack pnpm run audit:roll20-root-stitch -- ${path.relative(process.cwd(), runDir)}`,
    nextDiffCommand: `node scripts/roll20_actual_screenshot_diff.mjs ${path.relative(process.cwd(), runDir)}`,
    nextStatusCommand: `corepack pnpm run status:roll20-actual -- ${path.relative(process.cwd(), runDir)} --require-actual`,
  };
}

function validateSandboxEvidence(screenshots) {
  const rootFullDpr = path.join(screenshots, 'roll20-sandbox-root-full-dpr-corrected.png');
  const rootFull = path.join(screenshots, 'roll20-sandbox-root-full.png');
  const root = path.join(screenshots, 'roll20-sandbox-root.png');
  const fallback = path.join(screenshots, 'roll20-sandbox.png');
  const candidates = [rootFullDpr, rootFull, root, fallback];
  const selected = candidates.find((file) => existsSync(file));
  if (!selected) {
    return { ok: false, status: 'MISSING', note: 'no Roll20 sandbox screenshot exists yet' };
  }
  if (selected !== fallback) {
    const sidecar = selected.replace(/\.(png|jpg|jpeg)$/i, '.json');
    const completeManifest = path.join(screenshots, 'roll20-root-dpr-complete-manifest.json');
    const correctedManifest = path.join(screenshots, 'roll20-root-dpr-corrected-manifest.json');
    if (existsSync(sidecar) || existsSync(completeManifest) || existsSync(correctedManifest)) {
      return { ok: true, status: 'PRESENT', note: `root evidence present for ${path.basename(selected)}` };
    }
    return {
      ok: false,
      status: 'SUSPECT',
      note: `${path.basename(selected)} exists, but no root sidecar/manifest proves the iframe root was active`,
    };
  }

  const domEvidence = readJsonIfExists(path.join(screenshots, 'roll20-sandbox-dom-evidence.json'));
  if (domEvidence && hasPositiveDomEvidence(domEvidence)) {
    return { ok: true, status: 'PRESENT', note: 'fallback viewport screenshot has positive iframe DOM evidence' };
  }
  return {
    ok: false,
    status: 'SUSPECT',
    note: 'fallback roll20-sandbox.png exists, but no positive iframe DOM/root evidence proves the sheet rendered',
  };
}

function validateChatEvidence(screenshots) {
  const screenshot = path.join(screenshots, 'roll20-chat.png');
  const pageScreenshot = path.join(screenshots, 'roll20-chat-page.png');
  const domEvidenceFile = path.join(screenshots, 'roll20-chat-dom-evidence.json');
  const domEvidence = readJsonIfExists(domEvidenceFile);
  const hasPageScreenshot = existsSync(pageScreenshot);
  const hasDomEvidence = Boolean(domEvidence);
  const hasRenderedChatDom = hasPositiveChatDomEvidence(domEvidence);
  if (!existsSync(screenshot)) {
    if (hasRenderedChatDom) {
      return {
        ok: false,
        status: hasPageScreenshot ? 'DOM_PAGE_ONLY' : 'DOM_ONLY',
        note: hasPageScreenshot
          ? 'Roll20 chat DOM evidence exists and roll20-chat-page.png exists, but roll20-chat.png is missing; page screenshots are not accepted as chat visual evidence'
          : 'Roll20 chat DOM evidence exists, but roll20-chat.png is missing',
      };
    }
    if (hasPageScreenshot) {
      return {
        ok: false,
        status: hasDomEvidence ? 'PAGE_DOM_EMPTY' : 'PAGE_ONLY',
        note: 'roll20-chat-page.png exists, but roll20-chat.png is missing; page screenshots are not accepted as chat visual evidence',
      };
    }
    return { ok: false, status: hasDomEvidence ? 'DOM_EMPTY' : 'MISSING', note: 'missing Roll20 chat screenshot' };
  }
  if (hasRenderedChatDom) {
    const freshness = validateSidecarFreshness(screenshot, domEvidenceFile);
    if (!freshness.ok) {
      return { ok: false, status: 'STALE_DOM', note: freshness.note };
    }
    const foreground = validateChatForeground(domEvidence);
    if (!foreground.ok) {
      return { ok: false, status: 'FOREGROUND_SUSPECT', note: foreground.note };
    }
    return { ok: true, status: 'PRESENT', note: 'Roll20 chat screenshot exists with supporting DOM evidence' };
  }
  if (hasDomEvidence) {
    return {
      ok: false,
      status: 'PRESENT_NO_DOM_MARKERS',
      note: 'Roll20 chat screenshot exists, but DOM evidence did not show rendered rolltemplate markers',
    };
  }
  return {
    ok: false,
    status: 'PRESENT_SCREENSHOT_ONLY',
    note: 'Roll20 chat screenshot exists, but no DOM sidecar proves which rolltemplate/message rendered',
  };
}

function validateChatForeground(domEvidence) {
  const chatSelector = String(domEvidence?.chatSelector ?? '');
  const chatElementSelector = String(domEvidence?.chatElementSelector ?? '');
  const foreground = domEvidence?.templateForegroundEvidence;
  if (!chatElementSelector) {
    return {
      ok: false,
      note: 'Roll20 chat sidecar was captured by an older probe without chatElementSelector, so the screenshot cannot prove the chat root was foreground instead of an overlapping character/dialog panel',
    };
  }
  if (chatSelector === '#rightsidebar' && domEvidence?.activeRightTab !== 'textchattab') {
    return {
      ok: false,
      note: 'Roll20 chat sidecar selected broad #rightsidebar without an active text chat tab marker; recapture #textchat or .textchatcontainer foreground with the current probe',
    };
  }
  if (!foreground) {
    return {
      ok: false,
      note: 'Roll20 chat sidecar was captured before templateForegroundEvidence was added; recapture so elementFromPoint proves the selected rolltemplate is foreground',
    };
  }
  if (foreground.status !== 'FOREGROUND_TEMPLATE_HIT') {
    return {
      ok: false,
      note: `Roll20 chat sidecar foreground proof failed (${foreground.status || 'UNKNOWN'}): ${foreground.note || 'selected rolltemplate is not proven foreground'}`,
    };
  }
  return { ok: true, note: `Roll20 chat sidecar selected ${chatSelector || chatElementSelector} and proved foreground rolltemplate hit` };
}

function validateSidecarFreshness(screenshot, sidecar) {
  if (!existsSync(screenshot) || !existsSync(sidecar)) {
    return { ok: false, note: 'Roll20 chat screenshot or DOM sidecar is missing' };
  }
  const screenshotStat = statSync(screenshot);
  const sidecarStat = statSync(sidecar);
  const deltaMs = Math.abs(screenshotStat.mtimeMs - sidecarStat.mtimeMs);
  if (deltaMs > MAX_CHAT_SIDECAR_AGE_MS) {
    return {
      ok: false,
      note: `Roll20 chat screenshot and DOM sidecar are stale relative to each other (${Math.round(deltaMs / 1000)}s apart)`,
    };
  }
  return { ok: true, note: 'Roll20 chat screenshot and DOM sidecar timestamps are close enough' };
}

function readJsonIfExists(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function hasPositiveDomEvidence(evidence) {
  if (Number(evidence.bodyLen ?? 0) > 0) return true;
  if (Number(evidence.roots ?? evidence.rootCount ?? 0) > 0) return true;
  if (Array.isArray(evidence.rootSamples) && evidence.rootSamples.some((sample) => String(sample ?? '').trim().length > 0)) return true;
  if (evidence.textMarkers && Object.values(evidence.textMarkers).some(Boolean)) return true;
  return false;
}

function hasPositiveChatDomEvidence(evidence) {
  if (!evidence) return false;
  if (Number(evidence.rolltemplateCount ?? 0) > 0) return true;
  if (Array.isArray(evidence.rolltemplates) && evidence.rolltemplates.length > 0) return true;
  if (evidence.textMarkers?.rolltemplate) return true;
  return false;
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function withRelative(file) {
  return { path: file, relativePath: rel(file), exists: existsSync(file) };
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Upload Handoff',
    '',
    `Generated: ${report.generatedAt}`,
    `Run folder: \`${path.relative(process.cwd(), report.runDir)}\`${report.selectedAutomatically ? ' (auto-selected latest PASS pre-upload run)' : ''}`,
    '',
    'This folder is local-only and ignored by Git. Do not commit screenshots, copied sheet source, room names, character names, campaign IDs, or generated reports.',
    '',
    '## Current Blocker',
    '',
    'To enable file upload, go to chrome://extensions in Chrome, click Details under the Codex extension, and enable "Allow access to file URLs." See [here](https://developers.openai.com/codex/app/chrome-extension#upload-files) for details.',
    '',
    'If file chooser upload remains blocked, generate a Sandbox-only page snippet with:',
    '',
    `\`corepack pnpm run snippet:roll20-upload -- ${path.relative(process.cwd(), report.runDir)} [fixture-id]\``,
    '',
    'The generated snippet stays under this ignored handoff folder and embeds source-derived payload text. Run it only in the dedicated Custom Sheet Sandbox editor/settings page, then capture screenshots and rerun the gates below.',
    '',
    '## Upload Order',
    '',
    '1. In the kept Roll20 Custom Sheet Sandbox tab, open `Sheet Sandbox Tools`.',
    '2. Upload `sheet.html` with the `HTML` button.',
    '3. Upload `sheet.css` with the `CSS` button.',
    '4. Upload `translation.json` with the `Translation` button, when present.',
    '5. Capture the loaded sheet viewport as `roll20-sandbox.png` beside the local baseline screenshots.',
    '6. Prefer a DPR-corrected full sheet-root segment capture and stitch it to `roll20-sandbox-root-full-dpr-corrected.png`.',
    '7. Click a roll button if available and capture chat as `roll20-chat.png`.',
    '8. Run the stitch audit, screenshot diff, and status commands listed below.',
    '',
    '## Payloads',
    '',
  ];

  const visibleEntries = report.missingOnly
    ? report.entries.filter((entry) => entry.evidence.needsGeneratedActual || entry.evidence.needsChat)
    : report.entries;
  if (report.missingOnly) {
    lines.push(`Missing-only mode: ${visibleEntries.length}/${report.entries.length} fixtures still need generated actual or chat evidence.`, '');
  }

  for (const entry of visibleEntries) {
    lines.push(`### ${entry.fixtureId}`, '');
    lines.push('| Evidence | Current |', '| --- | --- |');
    lines.push(`| generated actual evidence | ${entry.evidence.needsGeneratedActual ? entry.evidence.generatedActualStatus : 'present'} |`);
    lines.push(`| generated actual note | ${entry.evidence.generatedActualNote} |`);
    lines.push(`| chat evidence | ${entry.evidence.needsChat ? entry.evidence.chatStatus : 'present'} |`);
    lines.push(`| chat note | ${entry.evidence.chatNote} |`);
    lines.push('');
    lines.push('| Artifact | Exists | Path |', '| --- | --- | --- |');
    for (const [name, file] of Object.entries(entry.files)) {
      lines.push(`| ${name} | ${file.exists ? 'yes' : 'NO'} | \`${file.relativePath}\` |`);
    }
    lines.push('', '| Screenshot | Current | Save As |', '| --- | --- | --- |');
    for (const [name, target] of Object.entries(entry.screenshotTargets)) {
      lines.push(`| ${name} | ${target.exists ? 'exists' : 'missing'} | \`${target.relativePath}\` |`);
    }
    lines.push('');
    lines.push(`Stitch manifest: \`${entry.stitchManifest.relativePath}\``);
    lines.push(`Root capture plan: \`${entry.nextRootCapturePlanCommand}\``);
    lines.push(`Stitch command: \`${entry.nextStitchCommand}\``);
    lines.push(`Audit command: \`${entry.nextAuditCommand}\``);
    lines.push(`Diff command: \`${entry.nextDiffCommand}\``);
    lines.push(`Status gate: \`${entry.nextStatusCommand}\``);
    lines.push('');
  }
  if (!visibleEntries.length) {
    lines.push('No missing generated actual/chat evidence for the selected fixtures.', '');
  }
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

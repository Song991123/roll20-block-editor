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

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const [RUN_DIR_ARG, ONLY] = parseArgs(args);
const RUN_ROOT = path.resolve('reports/roll20-actual-compare');

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
    entries,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'roll20-upload-handoff.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outDir, 'roll20-upload-handoff.md'), renderMarkdown(report), 'utf8');
  console.log(JSON.stringify({ outDir, runDir, entries: entries.length }, null, 2));
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
  return {
    fixtureId,
    files: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, { path: file, relativePath: rel(file), exists: existsSync(file) }])),
    screenshotTargets: {
      sandbox: withRelative(path.join(screenshots, 'roll20-sandbox.png')),
      chat: withRelative(path.join(screenshots, 'roll20-chat.png')),
      room: withRelative(path.join(screenshots, 'roll20-room.png')),
    },
    nextDiffCommand: `node scripts/roll20_actual_screenshot_diff.mjs ${path.relative(process.cwd(), runDir)}`,
  };
}

function rel(file) {
  return path.relative(process.cwd(), file);
}

function withRelative(file) {
  return { path: file, relativePath: rel(file) };
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
    '## Upload Order',
    '',
    '1. In the kept Roll20 Custom Sheet Sandbox tab, open `Sheet Sandbox Tools`.',
    '2. Upload `sheet.html` with the `HTML` button.',
    '3. Upload `sheet.css` with the `CSS` button.',
    '4. Upload `translation.json` with the `Translation` button, when present.',
    '5. Capture the loaded sheet screenshot as `roll20-sandbox.png` beside the local baseline screenshots.',
    '6. Click a roll button if available and capture chat as `roll20-chat.png`.',
    '7. Run the screenshot diff command listed below.',
    '',
    '## Payloads',
    '',
  ];

  for (const entry of report.entries) {
    lines.push(`### ${entry.fixtureId}`, '');
    lines.push('| Artifact | Exists | Path |', '| --- | --- | --- |');
    for (const [name, file] of Object.entries(entry.files)) {
      lines.push(`| ${name} | ${file.exists ? 'yes' : 'NO'} | \`${file.relativePath}\` |`);
    }
    lines.push('', '| Screenshot | Save As |', '| --- | --- |');
    for (const [name, target] of Object.entries(entry.screenshotTargets)) {
      lines.push(`| ${name} | \`${target.relativePath}\` |`);
    }
    lines.push('', `Diff command: \`${entry.nextDiffCommand}\``, '');
  }
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

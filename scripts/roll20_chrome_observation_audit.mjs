#!/usr/bin/env node
/**
 * Audit local-only Chrome-extension Roll20 observations.
 *
 * The Chrome extension path can read the logged-in Roll20 DOM even when the
 * normal CDP endpoint is closed. Its screenshot API is not automatically valid
 * Roll20 parity evidence, though: it may return JPEG bytes for a .png filename,
 * use a different coordinate space, or capture an overlapping Sandbox Tools
 * panel while the DOM still reports rolltemplate nodes.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = args.includes('--self-test');
const observationDir = path.resolve(args.find((arg) => !arg.startsWith('--')) ?? '');
const outDirArg = readOption('--out-dir', '');

if (SELF_TEST) {
  runSelfTest();
} else if (!observationDir) {
  console.error('Usage: node scripts/roll20_chrome_observation_audit.mjs reports/.../chrome-extension-roll20-observation/<fixture>[/after-refresh] | reports/.../local-baseline/<fixture>/screenshots [--out-dir <dir>] [--self-test]');
  process.exit(2);
} else {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

function readOption(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function main() {
  if (!existsSync(observationDir)) throw new Error(`missing observation dir: ${observationDir}`);
  const report = await auditObservationDir(observationDir);
  const outDir = path.resolve(outDirArg || path.join(observationDir, 'chrome-observation-audit'));
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chrome-observation-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chrome-observation-audit-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHROME OBSERVATION AUDIT ${report.status}`);
  console.log(`dir=${rel(observationDir)}`);
  console.log(`domTemplates=${report.dom.templateCount}`);
  console.log(`imageFiles=${report.images.length}`);
  console.log(`trustedCapture=${report.trustedCapture ? 'YES' : 'NO'}`);
  for (const reason of report.reasons) console.log(`REASON ${reason}`);
  console.log(`out=${rel(outDir)}`);
}

async function auditObservationDir(dir) {
  const domPath = path.join(dir, 'roll20-dom-observation.json');
  const chatSidecarPath = path.join(dir, 'roll20-chat-dom-evidence.json');
  const dom = existsSync(domPath)
    ? JSON.parse(readFileSync(domPath, 'utf8'))
    : existsSync(chatSidecarPath)
      ? normalizeChatSidecarObservation(JSON.parse(readFileSync(chatSidecarPath, 'utf8')))
      : null;
  const files = await readdir(dir, { withFileTypes: true });
  const images = files
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .map((name) => inspectImage(path.join(dir, name)));

  const templateCount = Number(dom?.probe?.templates?.length ?? dom?.probe?.rolltemplates?.length ?? 0);
  const selectedClip = normalizeRect(dom?.selectedClip);
  const chatRoot = normalizeRect(dom?.probe?.chatRoot?.rect);
  const templateRects = (dom?.probe?.templates ?? []).map((template) => normalizeRect(template?.rect)).filter(Boolean);
  const sessionRefreshCount = Number(dom?.probe?.sessionRefreshCount ?? 0);
  const viewport = {
    innerWidth: finite(dom?.probe?.innerWidth),
    innerHeight: finite(dom?.probe?.innerHeight),
    visualWidth: finite(dom?.probe?.visualViewport?.width),
    visualHeight: finite(dom?.probe?.visualViewport?.height),
    devicePixelRatio: finite(dom?.probe?.devicePixelRatio),
  };

  const reasons = [];
  if (!dom) reasons.push('missing roll20-dom-observation.json sidecar');
  if (templateCount <= 0) reasons.push('DOM sidecar has no rolltemplate/template records');
  if (sessionRefreshCount > 0) reasons.push(`Roll20 page still contains session-refresh text markers (${sessionRefreshCount}); recapture after confirming the banner is gone or non-overlapping`);
  if (!images.length) reasons.push('no screenshot files found beside the DOM observation');
  const nonPng = images.filter((image) => image.format !== 'png');
  if (nonPng.length) reasons.push(`screenshot files are not true PNG bytes: ${nonPng.map((image) => `${image.file}=${image.format}`).join(', ')}`);
  const canonicalChat = images.find((image) => image.file === 'roll20-chat.png');
  const pageOnly = images.find((image) => image.file === 'roll20-chat-page.png');
  if (!canonicalChat && pageOnly) {
    reasons.push('roll20-chat-page screenshot exists without a trusted roll20-chat.png template crop; page screenshots remain observation-only');
  }
  if (canonicalChat && canonicalChat.format !== 'png') {
    reasons.push(`canonical roll20-chat.png is not true PNG bytes (${canonicalChat.format}); do not use it for chat visual parity`);
  }
  const directClip = images.filter((image) => /template-observed/i.test(image.file));
  if (directClip.some((image) => image.format !== 'png')) {
    reasons.push('direct template clip came from the Chrome extension JPEG screenshot path, so it cannot satisfy the Roll20 chat PNG evidence gate');
  }
  if (selectedClip && chatRoot && !rectIntersects(selectedClip, chatRoot)) {
    reasons.push('selected template clip does not intersect the observed chat root; coordinate source is inconsistent');
  }
  if (selectedClip && templateRects.length && !templateRects.some((rect) => rectIntersects(selectedClip, rect))) {
    reasons.push('selected template clip does not intersect any recorded template rect');
  }

  const trustedCapture = reasons.length === 0 && images.some((image) => image.file === 'roll20-chat.png' && image.format === 'png');
  const status = trustedCapture
    ? 'TRUSTED_CAPTURE_CANDIDATE'
    : templateCount > 0
      ? 'OBSERVATION_ONLY_BLOCKED_CAPTURE_PATH'
      : 'BLOCKED_NO_TEMPLATE_DOM';

  return {
    generatedAt: new Date().toISOString(),
    scope: 'local-only Chrome extension Roll20 observation audit; not visual parity',
    observationDir: dir,
    status,
    trustedCapture,
    reasons,
    dom: {
      exists: Boolean(dom),
      source: dom?.source ?? '',
      title: dom?.title ?? '',
      url: dom?.url ?? '',
      templateCount,
      selectedClip,
      chatRoot,
      sessionRefreshCount,
      viewport,
      firstTemplates: (dom?.probe?.templates ?? []).slice(0, 4).map((template) => ({
        className: template.className ?? '',
        text: String(template.text ?? '').slice(0, 80),
        rect: normalizeRect(template.rect),
      })),
    },
    images,
    nextAction: trustedCapture
      ? 'Run the normal Roll20 chat parity diagnostics before using this as renderer evidence.'
      : 'Use a CDP-enabled Roll20 Sandbox/test-room capture or build a verified full-screenshot crop adapter that outputs true PNG bytes tied to the foreground text chat panel.',
  };
}

function normalizeChatSidecarObservation(sidecar) {
  const templates = Array.isArray(sidecar?.rolltemplates)
    ? sidecar.rolltemplates
    : sidecar?.latestTemplate
      ? [sidecar.latestTemplate]
      : [];
  return {
    source: 'roll20-chat-dom-evidence.json',
    title: sidecar?.fixtureId ?? '',
    url: sidecar?.captureAutomation?.page ?? '',
    selectedClip: sidecar?.captureDprCorrection?.cssClip ?? sidecar?.clip ?? sidecar?.screenshotClipApplied ?? sidecar?.screenshotCssClip ?? null,
    probe: {
      templates,
      rolltemplates: templates,
      chatRoot: {
        rect: sidecar?.chatRect ?? null,
      },
      sessionRefreshCount: sidecar?.sessionRefreshCount ?? 0,
      innerWidth: sidecar?.viewportEvidence?.innerWidth ?? sidecar?.viewport?.width,
      innerHeight: sidecar?.viewportEvidence?.innerHeight ?? sidecar?.viewport?.height,
      visualViewport: sidecar?.viewportEvidence?.visualViewport ?? sidecar?.viewport ?? null,
      devicePixelRatio: sidecar?.viewportEvidence?.devicePixelRatio,
    },
  };
}

function inspectImage(file) {
  const bytes = readFileSync(file);
  const format = imageFormat(bytes);
  return {
    file: path.basename(file),
    path: rel(file),
    bytes: bytes.length,
    format,
    extension: path.extname(file).replace(/^\./, '').toLowerCase(),
    magic: [...bytes.subarray(0, 12)].map((byte) => byte.toString(16).padStart(2, '0')).join(' '),
    pngSize: format === 'png' ? pngSize(bytes) : null,
    jpegSize: format === 'jpeg' ? jpegSize(bytes) : null,
  };
}

function imageFormat(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'webp-or-riff';
  return 'unknown';
}

function pngSize(bytes) {
  if (bytes.length < 24) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function jpegSize(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function normalizeRect(rect) {
  if (!rect) return null;
  const x = finite(rect.x);
  const y = finite(rect.y);
  const width = finite(rect.width ?? rect.w);
  const height = finite(rect.height ?? rect.h);
  if (x == null || y == null || width == null || height == null) return null;
  return { x, y, width, height };
}

function rectIntersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chrome Observation Audit',
    '',
    `- Status: \`${report.status}\``,
    `- Trusted capture: ${report.trustedCapture ? 'YES' : 'NO'}`,
    `- Observation dir: \`${rel(report.observationDir)}\``,
    `- DOM templates: ${report.dom.templateCount}`,
    `- Screenshot files: ${report.images.length}`,
    '',
    '## Reasons',
    '',
    ...(report.reasons.length ? report.reasons.map((reason) => `- ${reason}`) : ['- none']),
    '',
    '## Images',
    '',
    '| File | Format | Ext | Bytes | Size | Magic |',
    '| --- | --- | --- | ---: | --- | --- |',
    ...report.images.map((image) => {
      const size = image.pngSize ?? image.jpegSize;
      return `| \`${image.file}\` | ${image.format} | ${image.extension} | ${image.bytes} | ${size ? `${size.width}x${size.height}` : 'n/a'} | \`${image.magic}\` |`;
    }),
    '',
    '## Next Action',
    '',
    report.nextAction,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function runSelfTest() {
  const png = Buffer.alloc(24);
  png.set([0x89, 0x50, 0x4e, 0x47], 0);
  png.writeUInt32BE(123, 16);
  png.writeUInt32BE(45, 20);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x00, 0xc8, 0x03, 0x01, 0x11, 0x00]);
  const failures = [];
  if (imageFormat(png) !== 'png') failures.push('png magic');
  if (pngSize(png)?.width !== 123 || pngSize(png)?.height !== 45) failures.push('png size');
  if (imageFormat(jpg) !== 'jpeg') failures.push('jpeg magic');
  if (jpegSize(jpg)?.width !== 200 || jpegSize(jpg)?.height !== 100) failures.push('jpeg size');
  if (!rectIntersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 9, width: 2, height: 2 })) failures.push('rect intersects');
  if (rectIntersects({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 10, width: 2, height: 2 })) failures.push('rect non-intersect');
  if (failures.length) throw new Error(`self-test failed: ${failures.join(', ')}`);
  console.log('ROLL20 CHROME OBSERVATION AUDIT SELF_TEST PASS');
}

function rel(file) {
  return path.relative(process.cwd(), file) || '.';
}

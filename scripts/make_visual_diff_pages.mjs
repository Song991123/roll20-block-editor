#!/usr/bin/env node
/**
 * Build browser-computed visual diff pages for captured visual fixtures.
 *
 * The page uses browser canvas decoding, so it can compare PNG screenshots and
 * PNG/JPEG reference images without adding image-processing packages to the app.
 *
 * Usage:
 *   node scripts/make_visual_diff_pages.mjs [fixture_root] [capture_root] [out_dir] [fixture_id...]
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const fixtureRoot = resolve(args[0] ?? 'test-fixtures/visual');
const captureRoot = resolve(args[1] ?? 'reports/visual-fixture-render/screenshots');
const outDir = resolve(args[2] ?? 'reports/visual-fixture-diff');
const requestedIds = new Set(args.slice(3));

function slash(path) {
  return path.replace(/\\/g, '/');
}

function fileUrl(path) {
  return `file:///${slash(resolve(path)).split('/').map(encodeURIComponent).join('/')}`;
}

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function listFixtures(root) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .filter((dir) => existsSync(join(dir, 'manifest.json')))
    .filter((dir) => requestedIds.size === 0 || requestedIds.has(basename(dir)))
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

function findReference(fixtureDir) {
  const match = readdirSync(fixtureDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .find((name) => /^reference\.(png|jpe?g|webp)$/i.test(name));
  return match ? join(fixtureDir, match) : null;
}

function buildDiffPage({ fixtureId, referencePath, capturePath }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Visual diff: ${htmlEscape(fixtureId)}</title>
<style>
body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; background: #18181b; color: #f4f4f5; }
main { display: grid; gap: 12px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; align-items: start; }
figure { margin: 0; background: #fff; color: #111; padding: 8px; overflow: auto; }
canvas, img { max-width: 100%; height: auto; background: #fff; }
pre { white-space: pre-wrap; background: #09090b; border: 1px solid #3f3f46; padding: 12px; }
</style>
</head>
<body>
<main>
<h1>${htmlEscape(fixtureId)}</h1>
<pre data-testid="result">pending</pre>
<div class="grid">
  <figure><figcaption>Reference</figcaption><img id="reference" src="${fileUrl(referencePath)}"></figure>
  <figure><figcaption>Capture crop</figcaption><canvas id="capture"></canvas></figure>
  <figure><figcaption>Diff</figcaption><canvas id="diff"></canvas></figure>
</div>
</main>
<script>
(function () {
  var reference = document.getElementById('reference');
  var captureCanvas = document.getElementById('capture');
  var diffCanvas = document.getElementById('diff');
  var result = document.querySelector('[data-testid="result"]');
  var capture = new Image();
  capture.src = ${JSON.stringify(fileUrl(capturePath))};
  function fail(message) {
    result.textContent = JSON.stringify({ fixtureId: ${JSON.stringify(fixtureId)}, status: 'error', message: String(message) }, null, 2);
  }
  function draw() {
    try {
      var w = Math.min(reference.naturalWidth, capture.naturalWidth);
      var h = Math.min(reference.naturalHeight, capture.naturalHeight);
      if (!w || !h) return fail('image dimensions unavailable');
      var refCanvas = document.createElement('canvas');
      refCanvas.width = w;
      refCanvas.height = h;
      captureCanvas.width = w;
      captureCanvas.height = h;
      diffCanvas.width = w;
      diffCanvas.height = h;
      var refCtx = refCanvas.getContext('2d', { willReadFrequently: true });
      var capCtx = captureCanvas.getContext('2d', { willReadFrequently: true });
      var diffCtx = diffCanvas.getContext('2d', { willReadFrequently: true });
      refCtx.drawImage(reference, 0, 0, w, h, 0, 0, w, h);
      capCtx.drawImage(capture, 0, 0, w, h, 0, 0, w, h);
      var ref = refCtx.getImageData(0, 0, w, h);
      var cap = capCtx.getImageData(0, 0, w, h);
      var diff = diffCtx.createImageData(w, h);
      var mismatch = 0;
      var sumSq = 0;
      var threshold = 60;
      for (var i = 0; i < ref.data.length; i += 4) {
        var dr = Math.abs(ref.data[i] - cap.data[i]);
        var dg = Math.abs(ref.data[i + 1] - cap.data[i + 1]);
        var db = Math.abs(ref.data[i + 2] - cap.data[i + 2]);
        var delta = dr + dg + db;
        if (delta > threshold) mismatch += 1;
        sumSq += dr * dr + dg * dg + db * db;
        diff.data[i] = delta > threshold ? 255 : cap.data[i];
        diff.data[i + 1] = delta > threshold ? 0 : cap.data[i + 1];
        diff.data[i + 2] = delta > threshold ? 96 : cap.data[i + 2];
        diff.data[i + 3] = 255;
      }
      diffCtx.putImageData(diff, 0, 0);
      result.textContent = JSON.stringify({
        fixtureId: ${JSON.stringify(fixtureId)},
        status: 'diffed',
        referenceSize: [reference.naturalWidth, reference.naturalHeight],
        captureSize: [capture.naturalWidth, capture.naturalHeight],
        comparedSize: [w, h],
        mismatchPixels: mismatch,
        totalPixels: w * h,
        mismatchRatio: Number((mismatch / (w * h)).toFixed(6)),
        rmsRgb: Number(Math.sqrt(sumSq / (w * h * 3)).toFixed(3)),
        note: 'Initial top-left crop diff. This is a diagnostic metric, not a visual parity pass/fail yet.'
      }, null, 2);
    } catch (err) {
      fail(err && err.message ? err.message : err);
    }
  }
  reference.onload = function () { if (capture.complete) draw(); };
  capture.onload = function () { if (reference.complete) draw(); };
  reference.onerror = function () { fail('reference load failed'); };
  capture.onerror = function () { fail('capture load failed'); };
  if (reference.complete && capture.complete) draw();
}());
</script>
</body>
</html>`;
}

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'html'), { recursive: true });

const entries = [];
for (const fixtureDir of listFixtures(fixtureRoot)) {
  const fixtureId = basename(fixtureDir);
  const referencePath = findReference(fixtureDir);
  const capturePath = join(captureRoot, `${fixtureId}.png`);
  if (!referencePath || !existsSync(capturePath)) continue;
  const pagePath = join(outDir, 'html', `${fixtureId}.html`);
  writeFileSync(pagePath, buildDiffPage({ fixtureId, referencePath, capturePath }), 'utf8');
  entries.push({
    fixtureId,
    referencePath,
    capturePath,
    pagePath,
    referenceExt: extname(referencePath).toLowerCase(),
  });
}

writeFileSync(join(outDir, 'visual-fixture-diff-pages.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: entries.length,
  entries,
}, null, 2)}\n`, 'utf8');

const lines = [
  '# Visual Fixture Diff Pages',
  '',
  'Browser canvas diff pages generated for local visual QA. Open these pages in Browser Use and read `[data-testid="result"]` after image load.',
  '',
  `Page count: ${entries.length}`,
  '',
  '| Fixture | Reference | Capture | Page |',
  '| --- | --- | --- | --- |',
];
for (const entry of entries) {
  lines.push(`| \`${entry.fixtureId}\` | ${entry.referenceExt} | png | \`${entry.pagePath}\` |`);
}
writeFileSync(join(outDir, 'visual-fixture-diff-pages.md'), `${lines.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({ count: entries.length, report: join(outDir, 'visual-fixture-diff-pages.md') }));

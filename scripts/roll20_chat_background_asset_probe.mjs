#!/usr/bin/env node
/**
 * Compare Roll20 chat background asset URLs at the byte/proxy level.
 *
 * Diagnostic only. This reads existing local-only reports, fetches only the
 * referenced background images, and writes hash/format/placeholder evidence.
 * It does not change renderer CSS or publish source assets.
 */

import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const selfTest = rawArgs.includes('--self-test');
const args = rawArgs.filter((arg) => !arg.startsWith('--'));
const runDirArg = args[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'chat-background-asset-probe');
const FETCH_TIMEOUT_MS = 15000;

async function main() {
  const backgroundSource = await readOptionalJson(path.join(runDir, 'chat-background-source-probe', 'chat-background-source-probe-results.json'));
  const rasterModel = await readOptionalJson(path.join(runDir, 'chat-background-raster-model-probe', 'chat-background-raster-model-probe-results.json'));
  const fixtureIds = collectFixtureIds(backgroundSource, rasterModel);
  const fixtures = [];
  const cache = new Map();
  for (const fixtureId of fixtureIds) {
    fixtures.push(await summarizeFixture(fixtureId, { backgroundSource, rasterModel }, cache));
  }
  const actionable = fixtures.filter((fixture) => fixture.priority !== 'P2' && fixture.decision !== 'NO_BACKGROUND_IMAGE');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    scope: 'diagnostic-only Roll20 chat background asset/proxy byte routing; no production CSS',
    summary: {
      status: actionable.length ? 'BACKGROUND_ASSET_PROBE_ACTIONABLE' : 'BACKGROUND_ASSET_PROBE_SECONDARY',
      fixtures: fixtures.length,
      actionable: actionable.length,
      decisions: countBy(fixtures.map((fixture) => fixture.decision)),
      productionSafe: false,
    },
    fixtures,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'chat-background-asset-probe-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'chat-background-asset-probe-results.md'), renderMarkdown(report), 'utf8');

  console.log(`ROLL20 CHAT BACKGROUND ASSET PROBE ${report.summary.status}`);
  for (const fixture of fixtures) {
    console.log(`FIXTURE ${fixture.fixtureId} priority=${fixture.priority} decision=${fixture.decision} local=${fixture.localAsset?.summary || 'n/a'} actual=${fixture.actualAsset?.summary || 'n/a'} source=${fixture.sourceAsset?.summary || 'n/a'} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
}

async function summarizeFixture(fixtureId, reports, cache) {
  const sourceFixture = findFixture(reports.backgroundSource?.fixtures, fixtureId);
  const rasterFixture = findFixture(reports.rasterModel?.fixtures, fixtureId);
  const localCssUrl = extractCssUrl(sourceFixture?.backgroundStyle?.deltas?.backgroundImage?.local);
  const actualCssUrl = extractCssUrl(sourceFixture?.backgroundStyle?.deltas?.backgroundImage?.actual);
  const sourceUrl = sourceFromRoll20Proxy(localCssUrl || actualCssUrl);
  const priority = rasterFixture?.priority ?? sourceFixture?.priority ?? 'P2';
  const [localAsset, actualAsset, sourceAsset] = await Promise.all([
    localCssUrl ? fetchAsset(localCssUrl, cache) : null,
    actualCssUrl ? fetchAsset(actualCssUrl, cache) : null,
    sourceUrl ? fetchAsset(sourceUrl, cache) : null,
  ]);
  const decision = decide({
    localCssUrl,
    actualCssUrl,
    localAsset,
    actualAsset,
    sourceAsset,
    backgroundSourceDecision: sourceFixture?.decision ?? '',
    rasterDecision: rasterFixture?.decision ?? '',
  });
  return {
    fixtureId,
    priority,
    decision,
    nextAction: nextAction(decision),
    backgroundSourceDecision: sourceFixture?.decision ?? '',
    backgroundRasterDecision: rasterFixture?.decision ?? '',
    backgroundStyleDecision: sourceFixture?.backgroundStyleDecision ?? '',
    cssUrlEquivalent: normalizeUrl(localCssUrl) === normalizeUrl(actualCssUrl),
    localCssUrl: sanitizeUrl(localCssUrl),
    actualCssUrl: sanitizeUrl(actualCssUrl),
    sourceUrl: sanitizeUrl(sourceUrl),
    localAsset: summarizeAsset(localAsset),
    actualAsset: summarizeAsset(actualAsset),
    sourceAsset: summarizeAsset(sourceAsset),
    hashesMatch: Boolean(localAsset?.ok && actualAsset?.ok && localAsset.sha256 === actualAsset.sha256),
    sourceMatchesProxy: Boolean(localAsset?.ok && sourceAsset?.ok && localAsset.sha256 === sourceAsset.sha256),
    evidence: evidenceNotes({ sourceFixture, rasterFixture, localAsset, actualAsset, sourceAsset }),
  };
}

function decide({ localCssUrl, actualCssUrl, localAsset, actualAsset, sourceAsset, backgroundSourceDecision, rasterDecision }) {
  if (!localCssUrl && !actualCssUrl) return 'NO_BACKGROUND_IMAGE';
  if (backgroundSourceDecision === 'BACKGROUND_DECLARATION_DIFFERS') return 'CASCADE_BEFORE_ASSET_BYTES';
  if (!localAsset?.ok || !actualAsset?.ok) return 'ASSET_FETCH_INCOMPLETE';
  if (localAsset.sha256 !== actualAsset.sha256) return 'LOCAL_ACTUAL_ASSET_BYTES_DIFFER';
  if (sourceAsset?.placeholder || localAsset.placeholder || actualAsset.placeholder) return 'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER';
  if (isBrowserPaintRasterDecision(rasterDecision)) return 'ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT';
  return 'ASSET_BYTES_MATCH_SECONDARY';
}

function isBrowserPaintRasterDecision(decision) {
  return [
    'SOURCE_IMAGE_OR_BROWSER_PAINT_MODEL_REQUIRED',
    'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED',
  ].includes(decision);
}

function nextAction(decision) {
  switch (decision) {
    case 'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER':
      return 'local and actual proxy bytes match, but the source resolves to a tiny removed/placeholder image; preserve or rehost missing source assets before judging original-sheet visual parity, and treat remaining local-vs-actual mismatch as paint/context work';
    case 'ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT':
      return 'asset bytes match; compare browser-decoded paint output and CSS paint box/context before another ChatPane CSS candidate';
    case 'LOCAL_ACTUAL_ASSET_BYTES_DIFFER':
      return 'local and actual fetch different bytes; inspect Roll20 proxy cache, URL normalization, and asset loading before renderer CSS';
    case 'ASSET_FETCH_INCOMPLETE':
      return 'recapture or retry asset fetch with explicit Roll20 proxy/source URLs before paint conclusions';
    case 'CASCADE_BEFORE_ASSET_BYTES':
      return 'background declarations differ, so resolve cascade/style before byte-level paint tuning';
    case 'NO_BACKGROUND_IMAGE':
      return 'no background image URL in current table evidence; keep this fixture on non-image background/cascade diagnostics';
    default:
      return 'keep asset bytes as secondary evidence for this fixture';
  }
}

async function fetchAsset(url, cache) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  if (cache.has(normalized)) return cache.get(normalized);
  const result = await fetchAssetUncached(normalized);
  cache.set(normalized, result);
  return result;
}

async function fetchAssetUncached(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'roll20-block-editor-diagnostic/1.0',
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const image = sniffImage(bytes);
    return {
      ok: response.ok,
      url: sanitizeUrl(url),
      finalUrl: sanitizeUrl(response.url),
      status: response.status,
      contentType: response.headers.get('content-type') ?? '',
      contentLengthHeader: response.headers.get('content-length') ?? '',
      byteLength: bytes.length,
      sha256: sha256(bytes),
      format: image.format,
      width: image.width,
      height: image.height,
      placeholder: isPlaceholderAsset({ url, finalUrl: response.url, byteLength: bytes.length, image }),
      summary: summarizeFetch({ status: response.status, contentType: response.headers.get('content-type') ?? '', byteLength: bytes.length, image, finalUrl: response.url }),
    };
  } catch (error) {
    return {
      ok: false,
      url: sanitizeUrl(url),
      finalUrl: '',
      status: 0,
      contentType: '',
      contentLengthHeader: '',
      byteLength: 0,
      sha256: '',
      format: 'unknown',
      width: null,
      height: null,
      placeholder: false,
      error: error instanceof Error ? error.message : String(error),
      summary: `FETCH_FAIL ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function sniffImage(bytes) {
  if (bytes.length >= 24 && bytes.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return {
      format: 'png',
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }
  if (bytes.length >= 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP') {
    return { format: 'webp', width: null, height: null };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return sniffJpeg(bytes);
  }
  if (bytes.slice(0, 5).toString('utf8').toLowerCase() === '<svg ') {
    return { format: 'svg', width: null, height: null };
  }
  return { format: 'unknown', width: null, height: null };
}

function sniffJpeg(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        format: 'jpeg',
        width: bytes.readUInt16BE(offset + 7),
        height: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += 2 + length;
  }
  return { format: 'jpeg', width: null, height: null };
}

function isPlaceholderAsset({ url, finalUrl, byteLength, image }) {
  const text = `${url} ${finalUrl}`.toLowerCase();
  if (text.includes('removed.png') || text.includes('deleted') || text.includes('placeholder')) return true;
  return image.format === 'png' && byteLength > 0 && byteLength < 2048 && Number(image.width ?? 0) <= 200 && Number(image.height ?? 0) <= 200;
}

function summarizeAsset(asset) {
  if (!asset) return null;
  return {
    ok: asset.ok,
    url: asset.url,
    finalUrl: asset.finalUrl,
    status: asset.status,
    contentType: asset.contentType,
    byteLength: asset.byteLength,
    sha256: asset.sha256,
    format: asset.format,
    width: asset.width,
    height: asset.height,
    placeholder: asset.placeholder,
    error: asset.error ?? '',
    summary: asset.summary,
  };
}

function summarizeFetch({ status, contentType, byteLength, image, finalUrl }) {
  const dims = image.width && image.height ? `${image.width}x${image.height}` : '?x?';
  const tail = finalUrl?.includes('removed.png') ? ' removed.png' : '';
  return `${status} ${contentType || image.format} ${byteLength}b ${image.format} ${dims}${tail}`;
}

function evidenceNotes({ sourceFixture, rasterFixture, localAsset, actualAsset, sourceAsset }) {
  const notes = [];
  if (sourceFixture?.decision) notes.push(`background/source ${sourceFixture.decision}; style ${sourceFixture.backgroundStyleDecision || 'n/a'}`);
  if (rasterFixture?.decision) notes.push(`raster model ${rasterFixture.decision}; row ${rasterFixture.rowWeightedMismatchPct || 'n/a'}; luma gain ${signed(rasterFixture.lumaCorrectionGainPct)}`);
  if (localAsset) notes.push(`local asset ${localAsset.summary}; sha ${shortSha(localAsset.sha256)}`);
  if (actualAsset) notes.push(`actual asset ${actualAsset.summary}; sha ${shortSha(actualAsset.sha256)}`);
  if (sourceAsset) notes.push(`source asset ${sourceAsset.summary}; sha ${shortSha(sourceAsset.sha256)}`);
  if (localAsset?.ok && actualAsset?.ok) notes.push(`local/actual bytes ${localAsset.sha256 === actualAsset.sha256 ? 'match' : 'differ'}`);
  if (localAsset?.ok && sourceAsset?.ok) notes.push(`proxy/source bytes ${localAsset.sha256 === sourceAsset.sha256 ? 'match' : 'differ'}`);
  return notes;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Chat Background Asset Probe',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    '',
    'Scope: diagnostic-only. This fetches referenced background images and compares hashes; it does not commit assets or prove visual parity.',
    '',
    '| Fixture | Priority | Decision | Local asset | Actual asset | Source asset | Hashes | Next |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.decision} | ${fixture.localAsset?.summary || 'n/a'} | ${fixture.actualAsset?.summary || 'n/a'} | ${fixture.sourceAsset?.summary || 'n/a'} | local/actual=${fixture.hashesMatch ? 'same' : 'different'}, proxy/source=${fixture.sourceMatchesProxy ? 'same' : 'different'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Evidence Notes', '');
  for (const fixture of report.fixtures) {
    lines.push(`### ${fixture.fixtureId}`);
    for (const note of fixture.evidence) lines.push(`- ${note}`);
    lines.push('');
  }
  lines.push('## Claim Boundary', '');
  lines.push('- Generated reports and actual Roll20 evidence stay local-only.');
  lines.push('- This does not prove Roll20 visual parity.');
  return `${lines.join('\n')}\n`;
}

function extractCssUrl(value) {
  const text = String(value ?? '').trim();
  if (!text || text === 'none') return '';
  const match = text.match(/url\((['"]?)(.*?)\1\)/i);
  return match?.[2] ? decodeCssUrl(match[2]) : '';
}

function sourceFromRoll20Proxy(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const src = parsed.searchParams.get('src');
    return src ? decodeCssUrl(src) : '';
  } catch {
    return '';
  }
}

function decodeCssUrl(value) {
  try {
    return decodeURIComponent(String(value).replace(/&amp;/g, '&'));
  } catch {
    return String(value);
  }
}

function normalizeUrl(url) {
  return String(url ?? '')
    .replace(/&amp;/g, '&')
    .replace(/^http:\/\//i, 'https://')
    .trim();
}

function sanitizeUrl(url) {
  return normalizeUrl(url);
}

function shortSha(value) {
  return value ? value.slice(0, 12) : '';
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function collectFixtureIds(...reports) {
  const ids = new Set();
  for (const report of reports) {
    for (const fixture of report?.fixtures ?? []) {
      const id = fixture.fixtureId ?? fixture.id;
      if (id) ids.add(id);
    }
  }
  return [...ids].sort();
}

function findFixture(fixtures, fixtureId) {
  return (fixtures ?? []).find((fixture) => fixture.fixtureId === fixtureId || fixture.id === fixtureId) ?? null;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function signed(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function selfTestProbe() {
  const shared = {
    ok: true,
    sha256: 'same',
    placeholder: false,
  };
  assert.equal(
    decide({
      localCssUrl: 'https://example.test/a.png',
      actualCssUrl: 'https://example.test/a.png',
      localAsset: shared,
      actualAsset: shared,
      sourceAsset: { ...shared },
      backgroundSourceDecision: 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS',
      rasterDecision: 'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED',
    }),
    'ASSET_BYTES_MATCH_BROWSER_PAINT_NEXT',
  );
  assert.equal(
    decide({
      localCssUrl: 'https://example.test/a.png',
      actualCssUrl: 'https://example.test/a.png',
      localAsset: { ...shared, placeholder: true },
      actualAsset: shared,
      sourceAsset: shared,
      backgroundSourceDecision: 'BACKGROUND_DECLARATION_MATCHES_BUT_RASTER_DIFFERS',
      rasterDecision: 'FLAT_PAINT_SOURCE_OR_BROWSER_COLOR_MODEL_REQUIRED',
    }),
    'ASSET_BYTES_MATCH_BUT_SOURCE_PLACEHOLDER',
  );
  console.log('roll20_chat_background_asset_probe self-test PASS');
}

if (selfTest) selfTestProbe();
else await main();

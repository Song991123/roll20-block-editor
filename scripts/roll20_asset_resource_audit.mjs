#!/usr/bin/env node
/**
 * Audit external/local asset references used by Roll20 sheet fixtures.
 *
 * Visual parity can fail even when HTML/CSS mapping is correct if background or
 * decorative assets fail to load, hotlink differently, or become relative to a
 * different base. This script scans copied ignored fixtures and optional Roll20
 * payloads, probes HTTP(S) assets with no referrer, and writes an ignored local
 * report.
 *
 * Usage:
 *   node scripts/roll20_asset_resource_audit.mjs \
 *     --fixtures test-fixtures/visual \
 *     --payload-run reports/roll20-actual-compare/<label> \
 *     --report-dir reports/asset-resource-audit
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2).filter((arg) => arg !== '--');

function argOf(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const FIXTURES_DIR = path.resolve(argOf('--fixtures', 'test-fixtures/visual'));
const PAYLOAD_RUN = argOf('--payload-run', '');
const PAYLOAD_RUN_DIR = PAYLOAD_RUN ? path.resolve(PAYLOAD_RUN) : '';
const REPORT_DIR = path.resolve(argOf('--report-dir', 'reports/asset-resource-audit'));
const ONLY = argOf('--only', '');
const PROBE = argOf('--probe', 'true') !== 'false';
const MAX_PROBE = Number(argOf('--max-probe', '80'));
const BROWSER_PROBE = argOf('--browser-probe', 'false') === 'true';
const BROWSER_TIMEOUT_MS = Number(argOf('--browser-timeout-ms', '8000'));
const BROWSER_REFERRER_POLICY = argOf('--browser-referrer-policy', 'strict-origin-when-cross-origin');

async function main() {
  const fixtureIds = await listFixtureIds();
  const entries = [];
  const probeCache = new Map();
  const browserProbeCache = new Map();
  let browser = null;
  let browserPage = null;
  try {
    if (BROWSER_PROBE) {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      browserPage = await context.newPage();
    }

    for (const fixtureId of fixtureIds) {
      entries.push(await auditFixture(fixtureId, probeCache, browserProbeCache, browserPage));
    }
  } finally {
    await browser?.close();
  }
  const report = {
    generatedAt: new Date().toISOString(),
    fixtureRoot: FIXTURES_DIR,
    payloadRun: PAYLOAD_RUN_DIR || null,
    probe: PROBE,
    browserProbe: BROWSER_PROBE,
    browserProbeReferrerPolicy: BROWSER_PROBE ? BROWSER_REFERRER_POLICY : null,
    browserProbeTimeoutMs: BROWSER_PROBE ? BROWSER_TIMEOUT_MS : null,
    scope: 'local-only asset/resource reachability audit; not Roll20 visual parity',
    pass: entries.every((entry) => entry.pass),
    entries,
  };

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(path.join(REPORT_DIR, 'asset-resource-audit-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(REPORT_DIR, 'asset-resource-audit-results.md'), renderMarkdown(report), 'utf8');

  for (const entry of entries) {
    console.log(`${entry.pass ? 'PASS' : 'WARN'} ${entry.fixtureId} source=${summary(entry.source)} payload=${entry.payload ? summary(entry.payload) : 'n/a'}`);
  }
  console.log('ASSET RESOURCE AUDIT COMPLETE');
}

async function listFixtureIds() {
  const items = await fs.readdir(FIXTURES_DIR, { withFileTypes: true });
  return items
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .filter((name) => !ONLY || name === ONLY)
    .filter((name) => existsSync(path.join(FIXTURES_DIR, name, 'manifest.json')))
    .sort((a, b) => a.localeCompare(b));
}

async function auditFixture(fixtureId, probeCache, browserProbeCache, browserPage) {
  const fixtureDir = path.join(FIXTURES_DIR, fixtureId);
  const manifest = JSON.parse(await readMaybe(path.join(fixtureDir, 'manifest.json')));
  const source = await auditDoc({
    htmlPath: path.join(fixtureDir, 'source.html'),
    cssPath: path.join(fixtureDir, 'source.css'),
    label: 'source',
    probeCache,
    browserProbeCache,
    browserPage,
  });

  let payload = null;
  if (PAYLOAD_RUN_DIR) {
    const payloadDir = path.join(PAYLOAD_RUN_DIR, 'local-baseline', fixtureId, 'payload');
    payload = await auditDoc({
      htmlPath: path.join(payloadDir, 'sheet.html'),
      cssPath: path.join(payloadDir, 'sheet.css'),
      label: 'payload',
      probeCache,
      browserProbeCache,
      browserPage,
    });
  }

  const payloadRegressions = payload ? findPayloadRegressions(source, payload) : [];
  return {
    fixtureId,
    corpus: manifest.corpus ?? null,
    legacyMode: manifest.legacyMode ?? null,
    source,
    payload,
    payloadRegressionCount: payloadRegressions.length,
    payloadRegressions,
    pass: payloadRegressions.length === 0,
  };
}

async function auditDoc({ htmlPath, cssPath, label, probeCache, browserProbeCache, browserPage }) {
  const html = await readMaybe(htmlPath);
  const css = await readMaybe(cssPath);
  const refs = dedupeRefs([
    ...extractRefs(html, 'html', htmlPath),
    ...extractRefs(css, 'css', cssPath),
  ]);
  const classified = refs.map(classifyRef);
  const httpRefs = classified.filter((ref) => ref.kind === 'http' || ref.kind === 'https');
  const probed = [];
  if (PROBE) {
    for (const ref of httpRefs.slice(0, MAX_PROBE)) {
      probed.push(await probeUrl(ref, probeCache));
    }
  }
  const probedByUrl = new Map(probed.map((ref) => [ref.url, ref]));
  const browserImageRefs = httpRefs.filter((ref) => isBrowserImageCandidate(ref, probedByUrl.get(ref.url)));
  const browserProbed = [];
  if (BROWSER_PROBE && browserPage) {
    for (const ref of browserImageRefs.slice(0, MAX_PROBE)) {
      browserProbed.push(await probeBrowserImage(ref, browserPage, browserProbeCache));
    }
  }
  const failed = probed.filter((ref) => !ref.ok);
  const browserFailed = browserProbed.filter((ref) => !ref.ok);
  const localMissing = classified.filter((ref) => ref.kind === 'relative' && ref.resolvedPath && !existsSync(ref.resolvedPath));
  return {
    label,
    htmlExists: existsSync(htmlPath),
    cssExists: existsSync(cssPath),
    totalRefs: refs.length,
    httpRefs: httpRefs.length,
    relativeRefs: classified.filter((ref) => ref.kind === 'relative').length,
    dataRefs: classified.filter((ref) => ref.kind === 'data').length,
    unsupportedRefs: classified.filter((ref) => ref.kind === 'unsupported').length,
    probedRefs: probed.length,
    failedProbeCount: failed.length,
    browserImageCandidateRefs: browserImageRefs.length,
    browserProbedRefs: browserProbed.length,
    browserFailedProbeCount: browserFailed.length,
    localMissingCount: localMissing.length,
    byHost: countBy(httpRefs.map((ref) => ref.host || 'unknown')),
    refs: classified.slice(0, 120),
    failedProbes: failed.slice(0, 50),
    browserFailedProbes: browserFailed.slice(0, 50),
    localMissing: localMissing.slice(0, 50),
  };
}

function extractRefs(text, sourceType, sourcePath) {
  const refs = [];
  const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]+))\s*\)/gi;
  let match;
  while ((match = urlRe.exec(text))) {
    refs.push({ raw: cleanUrl(match[1] ?? match[2] ?? match[3]), sourceType, sourcePath, syntax: 'css-url' });
  }

  const attrRe = /\b(?:src|href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  while ((match = attrRe.exec(text))) {
    refs.push({ raw: cleanUrl(match[1] ?? match[2] ?? match[3]), sourceType, sourcePath, syntax: 'html-attr' });
  }

  return refs.filter((ref) => ref.raw && !ref.raw.startsWith('#'));
}

function cleanUrl(value) {
  return String(value ?? '').trim().replace(/^&quot;|&quot;$/g, '');
}

function dedupeRefs(refs) {
  const seen = new Set();
  const out = [];
  for (const ref of refs) {
    const key = `${ref.sourceType}:${ref.syntax}:${ref.raw}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}

function classifyRef(ref) {
  const raw = ref.raw;
  if (/^data:/i.test(raw)) return { ...ref, kind: 'data' };
  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    return { ...ref, kind: url.protocol.replace(':', ''), url: url.href, host: url.host };
  }
  if (/^\/\//.test(raw)) {
    const url = new URL(`https:${raw}`);
    return { ...ref, kind: 'https', url: url.href, host: url.host, protocolRelative: true };
  }
  if (/^(mailto|javascript|blob):/i.test(raw)) return { ...ref, kind: 'unsupported' };
  const resolvedPath = path.resolve(path.dirname(ref.sourcePath), raw.split(/[?#]/)[0]);
  return { ...ref, kind: 'relative', resolvedPath };
}

async function probeUrl(ref, probeCache) {
  if (probeCache.has(ref.url)) return { ...ref, ...probeCache.get(ref.url) };
  const result = await probeUrlOnce(ref.url);
  probeCache.set(ref.url, result);
  return { ...ref, ...result };
}

async function probeUrlOnce(url) {
  const started = Date.now();
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 Roll20SheetBuilderAssetAudit/1.0',
      },
    });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          range: 'bytes=0-0',
          'user-agent': 'Mozilla/5.0 Roll20SheetBuilderAssetAudit/1.0',
        },
      });
    }
    return {
      ok: response.ok || response.status === 206,
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || '',
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: String(error?.message || error).slice(0, 300),
      elapsedMs: Date.now() - started,
    };
  }
}

async function probeBrowserImage(ref, browserPage, browserProbeCache) {
  if (browserProbeCache.has(ref.url)) return { ...ref, ...browserProbeCache.get(ref.url) };
  const result = await probeBrowserImageOnce(browserPage, ref.url);
  browserProbeCache.set(ref.url, result);
  return { ...ref, ...result };
}

async function probeBrowserImageOnce(page, url) {
  try {
    return await page.evaluate(
      ({ imageUrl, timeoutMs, referrerPolicy }) => new Promise((resolve) => {
        const started = performance.now();
        const img = new Image();
        img.decoding = 'async';
        img.referrerPolicy = referrerPolicy;
        let done = false;
        const finish = (event) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({
            ok: img.complete && img.naturalWidth > 0 && img.naturalHeight > 0,
            event,
            currentSrc: img.currentSrc || '',
            naturalWidth: img.naturalWidth || 0,
            naturalHeight: img.naturalHeight || 0,
            complete: img.complete,
            elapsedMs: Math.round(performance.now() - started),
          });
        };
        const timer = setTimeout(() => finish('timeout'), timeoutMs);
        img.onload = () => finish('load');
        img.onerror = () => finish('error');
        img.src = imageUrl;
      }),
      { imageUrl: url, timeoutMs: BROWSER_TIMEOUT_MS, referrerPolicy: BROWSER_REFERRER_POLICY },
    );
  } catch (error) {
    return {
      ok: false,
      event: 'probe-error',
      error: String(error?.message || error).slice(0, 300),
      naturalWidth: 0,
      naturalHeight: 0,
      complete: false,
      elapsedMs: 0,
    };
  }
}

function isBrowserImageCandidate(ref, probeResult = null) {
  const contentType = String(probeResult?.contentType || '').toLowerCase();
  if (contentType.startsWith('image/')) return true;
  if (contentType && (contentType.includes('font') || contentType.includes('css') || contentType.includes('javascript') || contentType.includes('json'))) return false;

  const pathname = safeUrlPathname(ref.url || ref.raw).toLowerCase();
  if (/\.(?:png|jpe?g|gif|webp|avif|svg)(?:$|[?#])/.test(pathname)) return true;
  if (/\.(?:woff2?|ttf|otf|eot|css|js|json)(?:$|[?#])/.test(pathname)) return false;
  return false;
}

function safeUrlPathname(value) {
  try {
    return new URL(value).pathname;
  } catch {
    return String(value || '').split(/[?#]/)[0];
  }
}

function findPayloadRegressions(source, payload) {
  const sourceFailed = new Set(source.failedProbes.map((ref) => ref.url));
  const sourceMissing = new Set(source.localMissing.map((ref) => ref.raw));
  const regressions = [];
  for (const ref of payload.failedProbes) {
    if (!sourceFailed.has(ref.url)) regressions.push({ type: 'http', url: ref.url, status: ref.status, error: ref.error || '' });
  }
  for (const ref of payload.localMissing) {
    if (!sourceMissing.has(ref.raw)) regressions.push({ type: 'relative', raw: ref.raw, resolvedPath: ref.resolvedPath });
  }
  return regressions.slice(0, 50);
}

async function readMaybe(file) {
  if (!existsSync(file)) return '';
  return (await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '');
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function summary(audit) {
  if (!audit) return 'n/a';
  const browser = BROWSER_PROBE ? `/${audit.browserFailedProbeCount} failed-browser` : '';
  return `${audit.totalRefs} refs/${audit.failedProbeCount} failed-http${browser}/${audit.localMissingCount} missing-local`;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Asset Resource Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Scope: local-only asset/resource reachability audit. This is not Roll20 visual parity.',
    '',
    '| Fixture | Source refs | Source failed HTTP | Source failed browser | Source missing local | Payload refs | Payload failed HTTP | Payload failed browser | Payload missing local | Payload regressions | Result |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ];

  for (const entry of report.entries) {
    lines.push([
      entry.fixtureId,
      entry.source.totalRefs,
      entry.source.failedProbeCount,
      report.browserProbe ? entry.source.browserFailedProbeCount : 'n/a',
      entry.source.localMissingCount,
      entry.payload?.totalRefs ?? 'n/a',
      entry.payload?.failedProbeCount ?? 'n/a',
      report.browserProbe ? (entry.payload?.browserFailedProbeCount ?? 'n/a') : 'n/a',
      entry.payload?.localMissingCount ?? 'n/a',
      entry.payloadRegressionCount,
      entry.pass ? 'PASS' : 'WARN',
    ].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  for (const entry of report.entries) {
    lines.push('', `## ${entry.fixtureId}`, '');
    lines.push(renderDocAudit(entry.source));
    if (entry.payload) lines.push('', renderDocAudit(entry.payload));
    if (entry.payloadRegressions.length > 0) {
      lines.push('', '### Payload Regressions', '', '| Type | URL/Path | Detail |', '| --- | --- | --- |');
      for (const regression of entry.payloadRegressions) {
        lines.push([regression.type, regression.url ?? regression.raw, regression.status ?? regression.error ?? regression.resolvedPath ?? ''].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

function renderDocAudit(audit) {
  const lines = [
    `### ${audit.label}`,
    '',
    `- Total refs: ${audit.totalRefs}`,
    `- HTTP refs: ${audit.httpRefs}`,
    `- Relative refs: ${audit.relativeRefs}`,
    `- Data refs: ${audit.dataRefs}`,
    `- Probed refs: ${audit.probedRefs}`,
    `- Failed HTTP probes: ${audit.failedProbeCount}`,
    `- Browser image candidate refs: ${audit.browserImageCandidateRefs}`,
    `- Browser-probed image refs: ${audit.browserProbedRefs}`,
    `- Failed browser image probes: ${audit.browserFailedProbeCount}`,
    `- Missing local relative refs: ${audit.localMissingCount}`,
  ];
  if (Object.keys(audit.byHost).length > 0) {
    lines.push(`- Hosts: ${Object.entries(audit.byHost).map(([host, count]) => `${host}=${count}`).join(', ')}`);
  }
  if (audit.failedProbes.length > 0) {
    lines.push('', '| Failed URL | Status | Type/Error |', '| --- | ---: | --- |');
    for (const ref of audit.failedProbes.slice(0, 20)) {
      lines.push([ref.url, ref.status, ref.error || ref.statusText || ref.contentType].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }
  }
  if (audit.browserFailedProbes.length > 0) {
    lines.push('', '| Browser-failed URL | Event | Size | Detail |', '| --- | --- | --- | --- |');
    for (const ref of audit.browserFailedProbes.slice(0, 20)) {
      lines.push([ref.url, ref.event, `${ref.naturalWidth ?? 0}x${ref.naturalHeight ?? 0}`, ref.error || ref.currentSrc || ''].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }
  }
  if (audit.localMissing.length > 0) {
    lines.push('', '| Missing relative ref | Resolved path |', '| --- | --- |');
    for (const ref of audit.localMissing.slice(0, 20)) {
      lines.push([ref.raw, ref.resolvedPath].map(mdCell).join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
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

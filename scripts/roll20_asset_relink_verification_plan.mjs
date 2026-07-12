#!/usr/bin/env node
/**
 * Check whether a local-only asset replacement map covers the current
 * asset-preservation blockers before agents proceed to Roll20 Sandbox
 * comparison.
 *
 * Diagnostic only. This script reads URL mapping text; it never downloads,
 * stores, or publishes sheet assets.
 */

import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const SELF_TEST = args.includes('--self-test');
const runDirArg = positionalArgs()[0] ?? 'reports/roll20-actual-compare/2026-06-18-state-map-v1';
const runDir = path.resolve(runDirArg);
const outDir = path.join(runDir, 'asset-relink-verification-plan');

if (SELF_TEST) {
  selfTest();
} else {
  await main();
}

async function main() {
  const mapFile = argValue('--map-file');
  const plan = await readOptionalJson(path.join(runDir, 'chat-asset-preservation-plan', 'chat-asset-preservation-plan-results.json'));
  const mapText = mapFile ? await readOptionalText(path.resolve(mapFile)) : '';
  const parsedMap = parseReplacementMap(mapText);
  const fixtures = (plan?.fixtures ?? []).map((fixture) => classifyFixture(fixture, parsedMap));
  const relinkRequired = fixtures.filter((fixture) => fixture.decision === 'SOURCE_ASSET_LOST_RELINK_REQUIRED');
  const covered = relinkRequired.filter((fixture) => fixture.coverage === 'COVERED_ROLL20_READY');
  const localOnly = relinkRequired.filter((fixture) => fixture.coverage === 'COVERED_LOCAL_ONLY');
  const missing = relinkRequired.filter((fixture) => fixture.coverage === 'MISSING_RELINK');
  const report = {
    generatedAt: new Date().toISOString(),
    runDir: runDirArg,
    mapFile: mapFile || '',
    templateFile: path.relative(process.cwd(), path.join(outDir, 'asset-relink-map-template.txt')),
    scope: 'diagnostic-only relink coverage check; URL text only, no asset redistribution',
    action: relinkRequired.length === 0
      ? 'NO_RELINK_BLOCKER_FOUND'
      : missing.length
        ? 'RELINK_MAP_REQUIRED'
        : localOnly.length
          ? 'ROLL20_HOSTED_URL_REQUIRED'
          : 'READY_FOR_LOCAL_AND_ROLL20_RECOMPARE',
    summary: {
      fixtures: fixtures.length,
      relinkRequired: relinkRequired.length,
      coveredRoll20Ready: covered.length,
      coveredLocalOnly: localOnly.length,
      missing: missing.length,
      mapEntries: parsedMap.entries.length,
      mapWarnings: parsedMap.warnings.length,
    },
    fixtures,
    mapWarnings: parsedMap.warnings,
    nextActions: buildNextActions({ missing, localOnly, covered, runDir }),
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'asset-relink-verification-plan-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'asset-relink-verification-plan-results.md'), renderMarkdown(report), 'utf8');
  await writeFile(path.join(outDir, 'asset-relink-map-template.txt'), renderMapTemplate(report), 'utf8');

  console.log(`ROLL20 ASSET RELINK VERIFICATION ${report.action}`);
  console.log(`required=${relinkRequired.length} coveredRoll20Ready=${covered.length} localOnly=${localOnly.length} missing=${missing.length} mapEntries=${parsedMap.entries.length}`);
  for (const fixture of fixtures.filter((item) => item.decision === 'SOURCE_ASSET_LOST_RELINK_REQUIRED')) {
    console.log(`FIXTURE ${fixture.fixtureId} coverage=${fixture.coverage} target=${fixture.coveringTargetKind || 'none'} next=${fixture.nextAction}`);
  }
  console.log(`out=${path.relative(process.cwd(), outDir)}`);
  console.log(`template=${report.templateFile}`);
}

function positionalArgs() {
  const out = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--self-test') continue;
    if (arg === '--map-file') {
      i += 1;
      continue;
    }
    if (!arg.startsWith('--')) out.push(arg);
  }
  return out;
}

function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : '';
}

function parseReplacementMap(text) {
  const entries = [];
  const warnings = [];
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split(/\s*=>\s*/);
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      warnings.push({ line: index + 1, message: 'expected old URL => new URL' });
      return;
    }
    entries.push({
      line: index + 1,
      from: parts[0].trim(),
      to: parts[1].trim(),
      targetKind: classifyTarget(parts[1].trim()),
    });
  });
  return { entries, warnings };
}

function classifyTarget(url) {
  if (/^https?:\/\//i.test(url)) return 'roll20-fetchable-url';
  if (/^data:/i.test(url)) return 'local-only-data-url';
  return 'unsupported-url';
}

function classifyFixture(fixture, parsedMap) {
  if (fixture.decision !== 'SOURCE_ASSET_LOST_RELINK_REQUIRED') {
    return {
      fixtureId: fixture.fixtureId,
      priority: fixture.priority ?? '',
      decision: fixture.decision ?? 'UNKNOWN',
      coverage: 'NOT_REQUIRED',
      nextAction: fixture.nextAction ?? '',
    };
  }
  const candidates = assetCandidateUrls(fixture.asset ?? {});
  const coveringEntry = parsedMap.entries.find((entry) => coversAnyCandidate(entry.from, candidates));
  const coverage = !coveringEntry
    ? 'MISSING_RELINK'
    : coveringEntry.targetKind === 'roll20-fetchable-url'
      ? 'COVERED_ROLL20_READY'
      : 'COVERED_LOCAL_ONLY';
  return {
    fixtureId: fixture.fixtureId,
    priority: fixture.priority ?? '',
    decision: fixture.decision,
    coverage,
    candidateUrls: candidates,
    sourceUrl: fixture.asset?.sourceUrl ?? '',
    localCssUrl: fixture.asset?.localCssUrl ?? '',
    actualCssUrl: fixture.asset?.actualCssUrl ?? '',
    coveringLine: coveringEntry?.line ?? null,
    coveringFrom: coveringEntry?.from ?? '',
    coveringTargetKind: coveringEntry?.targetKind ?? '',
    nextAction: nextActionForCoverage(coverage),
  };
}

function assetCandidateUrls(asset) {
  const values = [
    asset.sourceUrl,
    asset.localCssUrl,
    asset.actualCssUrl,
    extractProxySrc(asset.localCssUrl),
    extractProxySrc(asset.actualCssUrl),
    protocolVariant(asset.sourceUrl),
    protocolVariant(extractProxySrc(asset.localCssUrl)),
    protocolVariant(extractProxySrc(asset.actualCssUrl)),
  ];
  return [...new Set(values.filter(Boolean).map((value) => value.trim()))];
}

function extractProxySrc(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('src') ?? '';
  } catch {
    return '';
  }
}

function protocolVariant(url) {
  if (/^https:\/\//i.test(url)) return url.replace(/^https:/i, 'http:');
  if (/^http:\/\//i.test(url)) return url.replace(/^http:/i, 'https:');
  return '';
}

function coversAnyCandidate(from, candidates) {
  return candidates.some((candidate) => (
    from === candidate ||
    candidate.includes(from) ||
    from.includes(candidate)
  ));
}

function nextActionForCoverage(coverage) {
  switch (coverage) {
    case 'COVERED_ROLL20_READY':
      return 'rerun local preview/edit/export, apply the exported sheet in Roll20 Sandbox/test room, then compare screenshots before judging parity';
    case 'COVERED_LOCAL_ONLY':
      return 'replace the local-only target with a user-owned HTTP(S) hosted URL before Roll20 Sandbox upload; data URLs can prove local preview plumbing only';
    case 'MISSING_RELINK':
      return 'add this source/proxy URL to the local-only asset replacement map before continuing visual parity work';
    default:
      return 'no relink blocker for this fixture';
  }
}

function buildNextActions({ missing, localOnly, covered, runDir }) {
  const actions = [];
  if (missing.length) {
    actions.push(`Add replacement-map entries for ${missing.map((fixture) => fixture.fixtureId).join(', ')}.`);
  }
  if (localOnly.length) {
    actions.push(`Replace local-only data URL targets with user-owned HTTP(S) hosted URLs for ${localOnly.map((fixture) => fixture.fixtureId).join(', ')} before Roll20 upload.`);
  }
  if (covered.length) {
    actions.push(`Rerun local preview/edit/export and then Roll20 Sandbox comparison for ${covered.map((fixture) => fixture.fixtureId).join(', ')}.`);
    actions.push(`After fresh Sandbox evidence, rerun corepack pnpm run gate:roll20-renderer-action -- ${path.relative(process.cwd(), runDir)}.`);
  }
  if (!actions.length) actions.push('Run plan:roll20-chat-assets first or provide a replacement map with --map-file.');
  return actions;
}

function renderMarkdown(report) {
  const lines = [
    '# Roll20 Asset Relink Verification Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Run: \`${report.runDir}\``,
    `Map file: ${report.mapFile ? `\`${report.mapFile}\`` : 'not provided'}`,
    `Template: \`${report.templateFile}\``,
    `Action: **${report.action}**`,
    '',
    'Scope: URL text coverage only. This report does not download, store, publish, or redistribute sheet assets.',
    '',
    '| Fixture | Priority | Decision | Coverage | Covered by | Target | Next |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority || 'n/a'} | ${fixture.decision} | ${fixture.coverage} | ${fixture.coveringLine ? `line ${fixture.coveringLine}` : 'n/a'} | ${fixture.coveringTargetKind || 'n/a'} | ${fixture.nextAction} |`);
  }
  lines.push('', '## Next Actions', '');
  for (const action of report.nextActions) lines.push(`- ${action}`);
  lines.push('', '## Map Template', '');
  lines.push('- Fill the generated `asset-relink-map-template.txt` with user-owned HTTP(S) replacement URLs, then rerun this command with `--map-file`.');
  lines.push('- The template is commented by default, so it is inert until the placeholder targets are replaced and the leading `#` is removed.');
  if (report.mapWarnings.length) {
    lines.push('', '## Map Warnings', '');
    for (const warning of report.mapWarnings) lines.push(`- line ${warning.line}: ${warning.message}`);
  }
  return `${lines.join('\n')}\n`;
}

function renderMapTemplate(report) {
  const unresolved = report.fixtures.filter((fixture) => (
    fixture.decision === 'SOURCE_ASSET_LOST_RELINK_REQUIRED' &&
    fixture.coverage !== 'COVERED_ROLL20_READY'
  ));
  const lines = [
    '# Roll20 asset relink map template',
    '# Scope: URL text only. Do not paste third-party asset bytes here.',
    '# Replace <paste-user-owned-https-url-here> with a user-owned HTTPS URL, then remove the leading "# ".',
    '# Run after editing:',
    `# corepack pnpm run plan:roll20-asset-relink -- ${report.runDir} --map-file ${report.templateFile}`,
  ];
  if (!unresolved.length) {
    lines.push('', '# No unresolved relink blockers found.');
    return `${lines.join('\n')}\n`;
  }
  for (const fixture of unresolved) {
    lines.push(
      '',
      `# fixture: ${fixture.fixtureId}`,
      `# coverage: ${fixture.coverage}`,
      `# next: ${fixture.nextAction}`,
    );
    for (const url of fixture.candidateUrls ?? []) {
      lines.push(`# ${url} => <paste-user-owned-https-url-here>`);
    }
  }
  return `${lines.join('\n')}\n`;
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function readOptionalText(file) {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return '';
  }
}

function selfTest() {
  const fixture = {
    fixtureId: 'sample',
    priority: 'P0',
    decision: 'SOURCE_ASSET_LOST_RELINK_REQUIRED',
    asset: {
      sourceUrl: 'https://i.imgur.com/dead.jpg',
      localCssUrl: 'https://imgsrv.roll20.net/?src=http://i.imgur.com/dead.jpg',
      actualCssUrl: 'https://imgsrv.roll20.net/?src=http://i.imgur.com/dead.jpg',
    },
  };
  const ready = classifyFixture(fixture, parseReplacementMap('http://i.imgur.com/dead.jpg => https://assets.example.com/live.jpg'));
  assert.equal(ready.coverage, 'COVERED_ROLL20_READY');
  const localOnly = classifyFixture(fixture, parseReplacementMap('https://i.imgur.com/dead.jpg => data:image/gif;base64,AAAA'));
  assert.equal(localOnly.coverage, 'COVERED_LOCAL_ONLY');
  const missing = classifyFixture(fixture, parseReplacementMap('https://i.imgur.com/other.jpg => https://assets.example.com/live.jpg'));
  assert.equal(missing.coverage, 'MISSING_RELINK');
  const ignored = classifyFixture({ fixtureId: 'none', decision: 'NO_BACKGROUND_IMAGE' }, parseReplacementMap(''));
  assert.equal(ignored.coverage, 'NOT_REQUIRED');
  const template = renderMapTemplate({
    runDir: 'reports/roll20-actual-compare/sample',
    templateFile: 'reports/roll20-actual-compare/sample/asset-relink-verification-plan/asset-relink-map-template.txt',
    fixtures: [missing, localOnly, ready, ignored],
  });
  assert.match(template, /# https:\/\/i\.imgur\.com\/dead\.jpg => <paste-user-owned-https-url-here>/);
  assert.match(template, /# http:\/\/i\.imgur\.com\/dead\.jpg => <paste-user-owned-https-url-here>/);
  assert.doesNotMatch(template, /fixture: sample[\s\S]*COVERED_ROLL20_READY[\s\S]*assets\.example\.com\/live\.jpg/);
  console.log('roll20_asset_relink_verification_plan self-test PASS');
}

#!/usr/bin/env node
/**
 * Summarize attr_class/playbook default-state candidates from full-root smoke
 * output.
 *
 * This reads ignored local report JSON only. It does not copy sheet source,
 * screenshots, or fixture payloads into tracked files and does not prove
 * Roll20 visual parity.
 */

import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDir = path.resolve(args[0] ?? '');
const fixtureFilter = args[1] && !args[1].startsWith('--') ? args[1] : null;

if (!args[0]) {
  console.error('Usage: node scripts/roll20_playbook_state_diagnostics.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

const fullRootPath = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');
const outDir = path.join(runDir, 'playbook-state-diagnostics');

async function main() {
  if (!existsSync(fullRootPath)) throw new Error(`Missing full-root candidate report: ${fullRootPath}`);
  const fullRoot = JSON.parse(await readFile(fullRootPath, 'utf8'));
  const fixtures = (fullRoot.fixtures ?? [])
    .filter((fixture) => !fixtureFilter || fixture.fixtureId === fixtureFilter)
    .map(analyzeFixture);
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    source: path.relative(runDir, fullRootPath),
    scope: 'attr_class/playbook default-state candidate diagnostics; not Roll20 visual parity',
    fixtures,
    summary: {
      fixtures: fixtures.length,
      withPlaybookCandidates: fixtures.filter((fixture) => fixture.playbookCandidates.length > 0).length,
      withPlaybookSignal: fixtures.filter((fixture) => fixture.playbookSignal).length,
      withPixelHeightDisagreement: fixtures.filter((fixture) => fixture.pixelBest?.id && fixture.heightClosest?.id && fixture.pixelBest.id !== fixture.heightClosest.id).length,
    },
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'playbook-state-diagnostics-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'playbook-state-diagnostics-results.md'), renderMarkdown(report), 'utf8');
  for (const fixture of fixtures) {
    console.log(`${fixture.status} ${fixture.fixtureId} playbookSignal=${fixture.playbookSignal ? 'YES' : 'NO'} playbookCandidates=${fixture.playbookCandidates.length} pixelBest=${fixture.pixelBest?.id ?? ''} heightClosest=${fixture.heightClosest?.id ?? ''}`);
  }
  console.log(`ROLL20 PLAYBOOK STATE DIAGNOSTICS OK ${path.relative(process.cwd(), outDir)}`);
}

function analyzeFixture(fixture) {
  const playbookCandidates = (fixture.candidates ?? [])
    .filter((candidate) => /playbook|sheet-alias/.test(candidate.id) || /playbook/.test(candidate.contextPatch ?? ''))
    .map(summarizeCandidate)
    .sort((a, b) => Math.abs(a.rootHeightDelta ?? Number.POSITIVE_INFINITY) - Math.abs(b.rootHeightDelta ?? Number.POSITIVE_INFINITY));
  const pixelBest = summarizeCandidate(fixture.bestCandidate ?? fixture.diagnosticBestCandidate);
  const heightClosest = summarizeCandidate(fixture.closestRootHeightCandidate);
  const actualHeight = Number(fixture.actual?.size?.h ?? 0) || null;
  const attrClassSidecar = readAttrClassSidecar(fixture.fixtureId);
  const playbookSignal = hasPlaybookSignal({ pixelBest, heightClosest, playbookCandidates });
  return {
    fixtureId: fixture.fixtureId,
    status: fixture.status,
    actualSize: fixture.actual?.size ?? null,
    actualState: fixture.actual?.state ?? null,
    localStateHint: fixture.localBaseline?.stateHint ?? null,
    derivedStateProbeValues: fixture.localBaseline?.derivedStateProbeValues ?? null,
    attrClassSidecar,
    pixelBest,
    heightClosest,
    playbookSignal,
    playbookCandidates,
    interpretation: interpret({ pixelBest, heightClosest, playbookCandidates, playbookSignal, actualHeight, attrClassSidecar }),
  };
}

function summarizeCandidate(candidate) {
  if (!candidate) return null;
  return {
    id: candidate.id,
    mismatchPct: pct(candidate.mismatchRatio),
    rootHeightDelta: num(candidate.rootHeightDelta),
    localSize: candidate.localSize ?? null,
    contextPatch: candidate.contextPatch ?? null,
  };
}

function hasPlaybookSignal({ pixelBest, heightClosest, playbookCandidates }) {
  if (!playbookCandidates.length) return false;
  if (pixelBest?.id && heightClosest?.id && pixelBest.id !== heightClosest.id) return true;
  const overhidden = playbookCandidates.some((candidate) => typeof candidate.rootHeightDelta === 'number' && candidate.rootHeightDelta < -500);
  const overvisible = playbookCandidates.some((candidate) => typeof candidate.rootHeightDelta === 'number' && candidate.rootHeightDelta > 500);
  return overhidden && overvisible;
}

function interpret({ pixelBest, heightClosest, playbookCandidates, playbookSignal, actualHeight, attrClassSidecar }) {
  const notes = [];
  if (!playbookCandidates.length) {
    notes.push('No playbook/default-state diagnostic candidates were found for this fixture.');
    return notes;
  }
  if (!playbookSignal) {
    notes.push('No strong playbook/default-state signal: pixel-best and height-closest candidates agree, or playbook candidates do not bracket actual height.');
    notes.push('Treat generated playbook candidates as background diagnostics for this fixture.');
    return notes;
  }
  if (pixelBest?.id && heightClosest?.id && pixelBest.id !== heightClosest.id) {
    notes.push(`Pixel-best candidate (${pixelBest.id}) differs from height-closest candidate (${heightClosest.id}); do not promote CSS from pixel score alone.`);
  }
  if (heightClosest?.rootHeightDelta != null && Math.abs(heightClosest.rootHeightDelta) <= 350) {
    notes.push(`Height-closest candidate is within ${Math.abs(heightClosest.rootHeightDelta)}px of actual root height ${actualHeight ?? 'unknown'}. Use it as a default-state probe target, not as visual parity proof.`);
  }
  if (attrClassSidecar?.exists) {
    notes.push(`Actual Roll20 attr_class sidecar checked values: ${attrClassSidecar.checkedValues.join(', ') || 'none'}.`);
    const checkedSlugs = attrClassSidecar.checkedValues.map(slug);
    const closestMatchesChecked = checkedSlugs.some((value) => String(heightClosest?.id ?? '').toLowerCase().includes(value));
    if (!closestMatchesChecked && heightClosest?.id) {
      notes.push(`Captured checked state does not explain height-closest candidate (${heightClosest.id}); inspect Roll20 selector prefixing/state visibility, not more forced checked values.`);
    }
  }
  const overhidden = playbookCandidates.filter((candidate) => typeof candidate.rootHeightDelta === 'number' && candidate.rootHeightDelta < -500);
  const overvisible = playbookCandidates.filter((candidate) => typeof candidate.rootHeightDelta === 'number' && candidate.rootHeightDelta > 500);
  if (overhidden.length && overvisible.length) {
    notes.push('Candidate set brackets the actual height from both sides, so the remaining problem is likely default/state selection rather than a single spacing rule.');
  }
  if (attrClassSidecar?.exists) {
    notes.push('Next action: analyze selector prefix/state visibility with the captured sidecar, then rerun full-root candidate smoke.');
  } else {
    notes.push('Next action: capture or reconstruct actual Roll20 checked/value state for the controlling playbook inputs, then rerun full-root candidate smoke.');
  }
  return notes;
}

function readAttrClassSidecar(fixtureId) {
  const file = path.join(runDir, 'live-iframe-probe', `${fixtureId}-attr-class-state.json`);
  if (!existsSync(file)) return { exists: false, checkedValues: [] };
  try {
    const json = JSON.parse(readFileSync(file, 'utf8'));
    const docs = Array.isArray(json.documents) ? json.documents : [];
    const inputs = docs.flatMap((doc) => doc.attrClassInputs ?? []);
    return {
      exists: true,
      path: path.relative(runDir, file),
      checkedValues: [...new Set(inputs.filter((input) => input.checked).map((input) => input.value).filter(Boolean))],
      inputCount: inputs.length,
      capturedAt: json.capturedAt ?? json.generatedAt ?? null,
    };
  } catch (error) {
    return { exists: true, checkedValues: [], error: String(error?.message || error) };
  }
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Playbook State Diagnostics');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: attr_class/playbook default-state candidate diagnostics. This is not Roll20 visual parity.');
  lines.push('');
  lines.push('| Fixture | Status | Signal | Actual | Pixel best | Height closest | Playbook candidates | Interpretation |');
  lines.push('| --- | --- | --- | --- | --- | --- | ---: | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.status} | ${fixture.playbookSignal ? 'YES' : 'NO'} | ${sizeLabel(fixture.actualSize)} | ${candidateLabel(fixture.pixelBest)} | ${candidateLabel(fixture.heightClosest)} | ${fixture.playbookCandidates.length} | ${fixture.interpretation.join('<br>')} |`);
  }
  for (const fixture of report.fixtures.filter((item) => item.playbookSignal && item.playbookCandidates.length > 0)) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Actual state: \`${JSON.stringify(fixture.actualState ?? {})}\``);
    lines.push(`Local state hint: \`${JSON.stringify(fixture.localStateHint ?? {})}\``);
    lines.push(`Derived state probes: \`${JSON.stringify(fixture.derivedStateProbeValues ?? {})}\``);
    if (fixture.attrClassSidecar?.exists) {
      lines.push(`Actual attr_class sidecar: checked=\`${fixture.attrClassSidecar.checkedValues.join(', ') || 'none'}\`, inputs=${fixture.attrClassSidecar.inputCount ?? 0}, capturedAt=\`${fixture.attrClassSidecar.capturedAt ?? ''}\``);
    }
    lines.push('');
    lines.push('| Candidate | Mismatch | Root delta | Local size | Patch |');
    lines.push('| --- | ---: | ---: | --- | --- |');
    for (const candidate of fixture.playbookCandidates) {
      lines.push(`| ${candidate.id} | ${candidate.mismatchPct}% | ${candidate.rootHeightDelta}px | ${sizeLabel(candidate.localSize)} | ${candidate.contextPatch ?? ''} |`);
    }
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This report is derived from existing local ignored full-root candidate smoke output.');
  lines.push('- A close height candidate is a state/default probe target, not proof of Roll20 visual parity.');
  lines.push('- Do not promote diagnostic CSS or forced state candidates into production without actual Roll20 DOM/state evidence and cross-fixture reruns.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function candidateLabel(candidate) {
  if (!candidate) return '';
  return `${candidate.id} (${candidate.mismatchPct}%, ${candidate.rootHeightDelta}px)`;
}

function sizeLabel(size) {
  if (!size) return '';
  const w = Math.round(Number(size.w ?? size.width ?? 0));
  const h = Math.round(Number(size.h ?? size.height ?? 0));
  return w && h ? `${w}x${h}` : '';
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number((value * 100).toFixed(2)) : null;
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

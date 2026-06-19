#!/usr/bin/env node
/**
 * Build a local-only capture plan for Roll20 attr_class/default-state probes.
 *
 * The report is written under the ignored Roll20 actual-compare run folder.
 * It does not log in to Roll20, upload sheets, or publish fixture source. Its
 * purpose is to make the next browser probe precise enough to avoid guessing
 * production renderer CSS from diagnostic candidates.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const runDirArg = args[0];
const fixtureFilter = args[1] && !args[1].startsWith('--') ? args[1] : null;

if (!runDirArg) {
  console.error('Usage: node scripts/roll20_attr_class_state_capture_plan.mjs reports/roll20-actual-compare/<label> [fixture-id]');
  process.exit(2);
}

const runDir = path.resolve(runDirArg);
const fullRootPath = path.join(runDir, 'full-root-candidate-smoke', 'full-root-candidate-smoke-results.json');
const outDir = path.join(runDir, 'attr-class-state-capture-plan');

async function main() {
  if (!existsSync(fullRootPath)) {
    throw new Error(`Missing full-root candidate report: ${fullRootPath}`);
  }
  const fullRoot = JSON.parse(await readFile(fullRootPath, 'utf8'));
  const fixtures = [];
  for (const fixture of fullRoot.fixtures ?? []) {
    if (fixtureFilter && fixture.fixtureId !== fixtureFilter) continue;
    fixtures.push(await analyzeFixture(fixture));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    runDir,
    source: path.relative(runDir, fullRootPath),
    scope: 'Roll20 attr_class/default-state capture planning; not visual parity',
    fixtures,
    summary: {
      fixtures: fixtures.length,
      needsLiveCapture: fixtures.filter((fixture) => fixture.priority === 'P0').length,
      sidecarsFound: fixtures.filter((fixture) => fixture.existingSidecar?.exists).length,
      withHeightBracket: fixtures.filter((fixture) => fixture.heightBracket?.lower || fixture.heightBracket?.upper).length,
    },
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'attr-class-state-capture-plan-results.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outDir, 'attr-class-state-capture-plan-results.md'), renderMarkdown(report), 'utf8');

  for (const fixture of fixtures) {
    const snippetPath = path.join(outDir, `${fixture.fixtureId}-browser-snippet.js`);
    await writeFile(snippetPath, `${fixture.browserSnippet}\n`, 'utf8');
    console.log(`${fixture.priority} ${fixture.fixtureId} values=${fixture.attrClass.values.length} bracket=${bracketLabel(fixture.heightBracket)} snippet=${path.relative(process.cwd(), snippetPath)}`);
  }
  console.log(`ROLL20 ATTR_CLASS STATE CAPTURE PLAN OK ${path.relative(process.cwd(), outDir)}`);
}

async function analyzeFixture(fixture) {
  const fixtureId = fixture.fixtureId;
  const payloadHtmlPath = path.join(runDir, 'local-baseline', fixtureId, 'payload', 'sheet.html');
  const payloadHtml = existsSync(payloadHtmlPath) ? await readFile(payloadHtmlPath, 'utf8') : '';
  const payloadAttrClassInputs = collectInputs(payloadHtml, 'attr_class');
  const attrClassValues = dedupe(payloadAttrClassInputs.map((input) => input.value).filter(Boolean));
  const derived = fixture.localBaseline?.derivedStateProbeValues ?? null;
  const candidateSummary = summarizeCandidates(fixture.candidates ?? [], attrClassValues);
  const heightBracket = findHeightBracket(candidateSummary.attrClassCandidates);
  const existingSidecar = await readExistingSidecar(fixtureId);
  const priority = shouldCapture({ attrClassValues, candidateSummary, heightBracket, existingSidecar }) ? 'P0' : 'P1';
  const browserSnippet = buildBrowserSnippet({
    fixtureId,
    attrClassValues,
    suggestedSidecarName: existingSidecar.path,
  });

  return {
    fixtureId,
    priority,
    status: fixture.status,
    actualSize: fixture.actual?.size ?? null,
    actualStateFromExistingReports: fixture.actual?.state ?? null,
    localStateHint: fixture.localBaseline?.stateHint ?? null,
    attrClass: {
      values: attrClassValues,
      count: attrClassValues.length,
      derivedProbeValues: derived,
      payloadInputs: payloadAttrClassInputs.slice(0, 80),
    },
    candidates: candidateSummary,
    heightBracket,
    existingSidecar,
    browserSnippet,
    interpretation: interpret({ attrClassValues, candidateSummary, heightBracket, existingSidecar }),
  };
}

function summarizeCandidates(candidates, attrClassValues) {
  const attrClassCandidates = attrClassValues.length ? candidates
    .filter((candidate) => /attr-class-state|playbook-state/.test(candidate.id))
    .map((candidate) => ({
      id: candidate.id,
      mismatchPct: pct(candidate.mismatchRatio),
      rootHeightDelta: num(candidate.rootHeightDelta),
      localSize: candidate.localSize ?? null,
      patch: candidate.contextPatch ?? null,
      forcedValues: candidate.contextPatch?.forceAttrClasses ?? (candidate.contextPatch?.forceAttrClass ? [candidate.contextPatch.forceAttrClass] : []),
    }))
    .sort((a, b) => Math.abs(a.rootHeightDelta ?? Number.POSITIVE_INFINITY) - Math.abs(b.rootHeightDelta ?? Number.POSITIVE_INFINITY)) : [];
  return {
    attrClassCandidates,
    closestHeight: attrClassCandidates[0] ?? null,
    bestPixel: [...attrClassCandidates].sort((a, b) => (a.mismatchPct ?? Number.POSITIVE_INFINITY) - (b.mismatchPct ?? Number.POSITIVE_INFINITY))[0] ?? null,
  };
}

function findHeightBracket(candidates) {
  const numeric = candidates.filter((candidate) => typeof candidate.rootHeightDelta === 'number');
  const lower = numeric
    .filter((candidate) => candidate.rootHeightDelta < 0)
    .sort((a, b) => Math.abs(a.rootHeightDelta) - Math.abs(b.rootHeightDelta))[0] ?? null;
  const upper = numeric
    .filter((candidate) => candidate.rootHeightDelta > 0)
    .sort((a, b) => Math.abs(a.rootHeightDelta) - Math.abs(b.rootHeightDelta))[0] ?? null;
  return {
    lower,
    upper,
    best: [lower, upper].filter(Boolean).sort((a, b) => Math.abs(a.rootHeightDelta) - Math.abs(b.rootHeightDelta))[0] ?? null,
  };
}

async function readExistingSidecar(fixtureId) {
  const relativePath = path.join('live-iframe-probe', `${fixtureId}-attr-class-state.json`);
  const file = path.join(runDir, relativePath);
  if (!existsSync(file)) {
    return {
      exists: false,
      path: relativePath,
      checkedValues: [],
      visibleAttrClassInputs: 0,
      capturedAt: null,
    };
  }
  const json = JSON.parse(await readFile(file, 'utf8'));
  const docs = Array.isArray(json.documents) ? json.documents : [];
  const inputs = docs.flatMap((doc) => doc.attrClassInputs ?? []);
  return {
    exists: true,
    path: relativePath,
    checkedValues: dedupe(inputs.filter((input) => input.checked).map((input) => input.value).filter(Boolean)),
    visibleAttrClassInputs: inputs.filter((input) => input.visible).length,
    capturedAt: json.capturedAt ?? json.generatedAt ?? null,
    documentCount: docs.length,
  };
}

function shouldCapture({ attrClassValues, candidateSummary, heightBracket, existingSidecar }) {
  if (!attrClassValues.length) return false;
  if (!candidateSummary.attrClassCandidates.length) return false;
  if (!existingSidecar.exists) return true;
  if (!existingSidecar.checkedValues.length) return true;
  return Boolean(heightBracket?.lower && heightBracket?.upper);
}

function interpret({ attrClassValues, candidateSummary, heightBracket, existingSidecar }) {
  const notes = [];
  if (!attrClassValues.length) {
    notes.push('No emitted attr_class inputs found; this fixture is not an attr_class state target.');
    return notes;
  }
  if (!candidateSummary.attrClassCandidates.length) {
    notes.push('No attr_class/playbook candidates are present in the current full-root smoke output.');
    return notes;
  }
  if (heightBracket?.lower && heightBracket?.upper) {
    notes.push(`Height is bracketed by ${heightBracket.lower.id} (${heightBracket.lower.rootHeightDelta}px) and ${heightBracket.upper.id} (${heightBracket.upper.rootHeightDelta}px).`);
  }
  if (candidateSummary.bestPixel && candidateSummary.closestHeight && candidateSummary.bestPixel.id !== candidateSummary.closestHeight.id) {
    notes.push(`Pixel-best (${candidateSummary.bestPixel.id}) differs from height-closest (${candidateSummary.closestHeight.id}); this needs actual Roll20 checked/value state before CSS promotion.`);
  }
  if (existingSidecar.exists) {
    notes.push(`Existing sidecar found with checked values: ${existingSidecar.checkedValues.join(', ') || 'none recorded'}. Recapture if stale or if it was not taken from the generated sheet iframe.`);
  } else {
    notes.push('No attr_class state sidecar exists yet. Run the generated browser snippet inside the dedicated Roll20 sandbox/editor context and save the JSON under the suggested ignored path.');
  }
  return notes;
}

function buildBrowserSnippet({ fixtureId, attrClassValues, suggestedSidecarName }) {
  const valuesJson = JSON.stringify(attrClassValues);
  return `(() => {
  const expectedAttrClassValues = ${valuesJson};
  const captureDocument = (doc, label) => {
    const esc = (value) => {
      if (doc.defaultView?.CSS?.escape) return doc.defaultView.CSS.escape(String(value));
      return String(value).replace(/["\\\\]/g, '\\\\$&');
    };
    const rectOf = (el) => {
      if (!el?.getBoundingClientRect) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const styleOf = (el) => {
      if (!el) return null;
      const cs = doc.defaultView.getComputedStyle(el);
      return {
        display: cs.display,
        visibility: cs.visibility,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        opacity: cs.opacity,
      };
    };
    const isVisible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = doc.defaultView.getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
    };
    const classText = (el) => typeof el?.className === 'string' ? el.className : String(el?.className || '');
    const root = doc.querySelector('.charactersheet, #charsheet-root, form.sheetform') || doc.body || doc.documentElement;
    const attrClassInputs = [...doc.querySelectorAll('input[name="attr_class"], input[name="class"]')].map((el, index) => {
      const labelEl = el.closest('label') || el.parentElement;
      return {
        index,
        name: el.getAttribute('name') || '',
        type: el.getAttribute('type') || '',
        value: el.value || el.getAttribute('value') || '',
        valueAttr: el.getAttribute('value'),
        checked: Boolean(el.checked),
        checkedAttr: el.hasAttribute('checked'),
        disabled: Boolean(el.disabled),
        className: classText(el),
        labelText: (labelEl?.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 120),
        rect: rectOf(el),
        style: styleOf(el),
        visible: isVisible(el),
      };
    });
    const expectedAnchors = expectedAttrClassValues.map((value) => {
      const matches = [
        ...doc.querySelectorAll(\`input[name="attr_class"][value="\${esc(value)}"], input[name="class"][value="\${esc(value)}"]\`),
      ];
      return {
        value,
        count: matches.length,
        checked: matches.some((node) => Boolean(node.checked)),
        checkedAttr: matches.some((node) => node.hasAttribute('checked')),
      };
    });
    const visibleValueSections = expectedAttrClassValues.map((value) => {
      const lower = String(value).toLowerCase();
      const candidates = [...root.querySelectorAll('[class]')]
        .filter((el) => classText(el).toLowerCase().includes(lower))
        .slice(0, 12)
        .map((el) => ({
          tag: el.tagName,
          className: classText(el),
          text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
          rect: rectOf(el),
          style: styleOf(el),
          visible: isVisible(el),
        }));
      return { value, candidates };
    });
    const cssStateRules = [];
    for (const sheet of [...doc.styleSheets]) {
      let rules = [];
      try {
        rules = [...(sheet.cssRules || [])];
      } catch {
        continue;
      }
      for (const rule of rules) {
        const text = rule.cssText || '';
        if (/attr_class|name=["']?class|\\.sheet-|playbook|Battlebabe|Hardholder/i.test(text)) {
          cssStateRules.push(text.slice(0, 600));
        }
      }
    }
    return {
      label,
      url: doc.location?.href || location.href,
      title: doc.title || '',
      root: { tag: root?.tagName || '', className: classText(root), rect: rectOf(root), style: styleOf(root) },
      attrClassInputs,
      expectedAnchors,
      checkedValues: [...new Set(attrClassInputs.filter((input) => input.checked).map((input) => input.value).filter(Boolean))],
      visibleValueSections,
      cssStateRules: cssStateRules.slice(0, 80),
    };
  };
  const documents = [];
  const addDocument = (doc, label) => {
    try {
      if (doc?.querySelector) documents.push(captureDocument(doc, label));
    } catch (error) {
      documents.push({ label, error: String(error?.message || error) });
    }
  };
  addDocument(document, 'top');
  [...document.querySelectorAll('iframe')].forEach((frame, index) => {
    try {
      addDocument(frame.contentDocument, \`iframe-\${index}\`);
    } catch (error) {
      documents.push({ label: \`iframe-\${index}\`, error: String(error?.message || error), src: frame.src || '' });
    }
  });
  const result = {
    fixtureId: ${JSON.stringify(fixtureId)},
    capturedAt: new Date().toISOString(),
    suggestedLocalPath: ${JSON.stringify(suggestedSidecarName)},
    expectedAttrClassValues,
    documents,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
})();`;
}

function collectInputs(html, wantedName) {
  const inputs = [];
  const tagRe = /<(input|select|textarea)\b[^>]*>/gi;
  let match;
  while ((match = tagRe.exec(String(html || '')))) {
    const attrs = parseTagAttrs(match[0]);
    if (attrs.name !== wantedName) continue;
    inputs.push({
      tag: match[1].toLowerCase(),
      name: attrs.name ?? '',
      type: attrs.type ?? '',
      value: attrs.value ?? '',
      checkedAttr: Object.prototype.hasOwnProperty.call(attrs, 'checked'),
      className: attrs.class ?? '',
    });
  }
  return inputs;
}

function parseTagAttrs(tag) {
  const attrs = {};
  const re = /\s([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+)))?/g;
  let match;
  while ((match = re.exec(String(tag || '')))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Roll20 Attr Class State Capture Plan');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Run: \`${path.relative(process.cwd(), report.runDir)}\``);
  lines.push('');
  lines.push('Scope: plan and browser snippets for capturing actual Roll20 attr_class/default state. This is not visual parity.');
  lines.push('');
  lines.push('| Fixture | Priority | Status | attr_class values | Closest height | Bracket | Sidecar | Interpretation |');
  lines.push('| --- | --- | --- | ---: | --- | --- | --- | --- |');
  for (const fixture of report.fixtures) {
    lines.push(`| \`${fixture.fixtureId}\` | ${fixture.priority} | ${fixture.status} | ${fixture.attrClass.count} | ${candidateLabel(fixture.candidates.closestHeight)} | ${bracketLabel(fixture.heightBracket)} | ${fixture.existingSidecar.exists ? `found (${fixture.existingSidecar.checkedValues.join(', ') || 'no checked values'})` : `missing: \`${fixture.existingSidecar.path}\``} | ${fixture.interpretation.join('<br>')} |`);
  }
  for (const fixture of report.fixtures.filter((item) => item.priority === 'P0')) {
    lines.push('');
    lines.push(`## ${fixture.fixtureId}`);
    lines.push('');
    lines.push(`Suggested sidecar path: \`${fixture.existingSidecar.path}\``);
    lines.push(`Snippet file: \`${path.relative(report.runDir, path.join(outDir, `${fixture.fixtureId}-browser-snippet.js`))}\``);
    lines.push('');
    lines.push('| Candidate | Mismatch | Root delta | Forced values | Local size |');
    lines.push('| --- | ---: | ---: | --- | --- |');
    for (const candidate of fixture.candidates.attrClassCandidates.slice(0, 20)) {
      lines.push(`| ${candidate.id} | ${candidate.mismatchPct}% | ${candidate.rootHeightDelta}px | ${candidate.forcedValues.join(', ')} | ${sizeLabel(candidate.localSize)} |`);
    }
    lines.push('');
    lines.push('Manual save instructions: run the snippet in the dedicated Roll20 sandbox/editor page, copy the returned JSON, and save it under the suggested ignored sidecar path. Do not commit that JSON.');
  }
  lines.push('');
  lines.push('## Claim Boundary');
  lines.push('');
  lines.push('- This report only prepares exact state capture. It does not inspect Roll20 by itself.');
  lines.push('- Sidecar JSON, screenshots, and fixture payloads remain ignored local evidence.');
  lines.push('- Use the captured checked/value state to rerun full-root candidates and renderer gates before changing production renderer CSS.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function candidateLabel(candidate) {
  if (!candidate) return '';
  return `${candidate.id} (${candidate.mismatchPct}%, ${candidate.rootHeightDelta}px)`;
}

function bracketLabel(bracket) {
  if (!bracket) return '';
  const lower = bracket.lower ? `${bracket.lower.id}:${bracket.lower.rootHeightDelta}px` : '';
  const upper = bracket.upper ? `${bracket.upper.id}:${bracket.upper.rootHeightDelta}px` : '';
  return [lower, upper].filter(Boolean).join(' / ');
}

function sizeLabel(size) {
  if (!size) return '';
  const w = Math.round(Number(size.w ?? size.width ?? 0));
  const h = Math.round(Number(size.h ?? size.height ?? 0));
  return w && h ? `${w}x${h}` : '';
}

function dedupe(values) {
  return [...new Set(values.map((value) => String(value)))];
}

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number((value * 100).toFixed(2)) : null;
}

function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

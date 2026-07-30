#!/usr/bin/env node
/**
 * Copy selected visual-reference candidates into an ignored workspace fixture.
 *
 * Usage:
 *   node scripts/prepare_visual_fixture.mjs <inventory_json> <out_root> <selector> [...]
 *
 * Selector formats:
 *   official-roll20:fixtureB
 *   user-custom:CoC\\some-sheet
 *   --top=5
 *
 * The copied fixture contains:
 *   source.html
 *   source.css
 *   source.i18n        (when present)
 *   reference.<ext>    (first strong reference image, otherwise first reference)
 *   manifest.json
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, extname, join, relative, resolve } from 'node:path';

const [inventoryPath, outRoot, ...selectors] = process.argv.slice(2);

if (!inventoryPath || !outRoot || selectors.length === 0) {
  console.error('usage: node scripts/prepare_visual_fixture.mjs <inventory_json> <out_root> <selector> [...]');
  process.exit(2);
}

const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
const candidates = inventory.corpora
  .flatMap((c) => c.sheets)
  .filter((s) => s.referenceCount > 0)
  .sort((a, b) =>
    (b.strongReferenceCount ?? 0) - (a.strongReferenceCount ?? 0) ||
    b.referenceCount - a.referenceCount ||
    b.htmlBytes + b.cssBytes - (a.htmlBytes + a.cssBytes)
  );

function slug(s) {
  return String(s)
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'fixture';
}

function sha256File(file) {
  const buf = readFileSync(file);
  return createHash('sha256').update(buf).digest('hex');
}

function parseSelectors(args) {
  const out = [];
  for (const arg of args) {
    const top = /^--top=(\d+)$/.exec(arg);
    if (top) {
      out.push(...candidates.slice(0, Math.max(0, Number(top[1]))));
      continue;
    }
    const colon = arg.indexOf(':');
    if (colon < 1) throw new Error(`Invalid selector: ${arg}`);
    const corpus = arg.slice(0, colon);
    const relDir = arg.slice(colon + 1).replace(/\//g, '\\');
    const found = candidates.find((s) =>
      s.corpus === corpus &&
      (s.relDir === relDir || s.relDir.toLowerCase() === relDir.toLowerCase())
    );
    if (!found) throw new Error(`No visual candidate matched selector: ${arg}`);
    out.push(found);
  }
  return [...new Map(out.map((item) => [`${item.corpus}:${item.relDir}`, item])).values()];
}

function copyCandidate(candidate) {
  const fixtureId = `${slug(candidate.corpus)}-${slug(candidate.relDir)}`;
  const dir = resolve(outRoot, fixtureId);
  mkdirSync(dir, { recursive: true });

  const ref = (candidate.strongReferenceImages?.[0] ?? candidate.referenceImages?.[0]);
  if (!ref) throw new Error(`Candidate has no reference image: ${candidate.corpus}:${candidate.relDir}`);

  const files = [];
  function copy(label, src, destName) {
    if (!src || !existsSync(src)) return null;
    const dest = join(dir, destName);
    copyFileSync(src, dest);
    const item = {
      label,
      source: src,
      copied: dest,
      bytes: statSync(src).size,
      sha256: sha256File(src),
    };
    files.push(item);
    return item;
  }

  copy('html', candidate.html, 'source.html');
  copy('css', candidate.css, 'source.css');
  copy('i18n', candidate.i18n, 'source.i18n');
  copy('reference', ref, `reference${extname(ref).toLowerCase() || '.png'}`);

  const manifest = {
    fixtureId,
    generatedAt: new Date().toISOString(),
    corpus: candidate.corpus,
    sourceDir: candidate.dir,
    relDir: candidate.relDir,
    referenceImage: ref,
    referenceRelativeToSheet: relative(candidate.dir, ref),
    autoPrefix: null,
    autoPrefixNote: 'Controls preview auto-prefix/sanitize path only; this is not full Roll20 legacy CSS sanitization.',
    legacyCssSanitize: null,
    legacyCssSanitizeNote: 'Reserved for explicit old-Roll20 CSS sanitizer fixtures when implemented.',
    visualStatus: 'prepared-only',
    files,
  };

  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

mkdirSync(outRoot, { recursive: true });
const selected = parseSelectors(selectors);
const manifests = selected.map(copyCandidate);

console.log(JSON.stringify({
  prepared: manifests.length,
  fixtures: manifests.map((m) => ({
    id: m.fixtureId,
    dir: join(resolve(outRoot), m.fixtureId),
    source: `${m.corpus}:${m.relDir}`,
    reference: basename(m.referenceImage),
  })),
}, null, 2));

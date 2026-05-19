#!/usr/bin/env node
/**
 * Copy an explicitly selected sheet fixture into the local ignored fixture area.
 * Use this for important user-provided sheets that may not have reference images.
 *
 * Usage:
 *   node scripts/prepare_explicit_fixture.mjs <fixture_root> <fixture_id> \
 *     --html <path> --css <path> [--i18n <path>] [--reference <path>] \
 *     [--corpus <name>] [--rel <label>] [--legacy true|false|null]
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const positional = [];
const flags = {};
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const value = process.argv[i + 1];
    if (value == null || value.startsWith('--')) {
      flags[key] = 'true';
    } else {
      flags[key] = value;
      i += 1;
    }
  } else {
    positional.push(arg);
  }
}

const fixtureRoot = positional[0];
const fixtureId = positional[1];

if (!fixtureRoot || !fixtureId || !flags.html || !flags.css) {
  console.error('usage: node scripts/prepare_explicit_fixture.mjs <fixture_root> <fixture_id> --html <path> --css <path> [--i18n <path>] [--reference <path>]');
  process.exit(2);
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function parseLegacy(value) {
  if (value === undefined || value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`--legacy must be true, false, or null. Got ${value}`);
}

function copyTracked(label, source, destName) {
  const resolved = resolve(source);
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new Error(`${label} file not found: ${resolved}`);
  }
  const copied = join(outDir, destName);
  copyFileSync(resolved, copied);
  return {
    label,
    source: resolved,
    copied,
    bytes: statSync(copied).size,
    sha256: sha256File(copied),
  };
}

const outDir = resolve(fixtureRoot, fixtureId);
mkdirSync(outDir, { recursive: true });

const files = [
  copyTracked('html', flags.html, 'source.html'),
  copyTracked('css', flags.css, 'source.css'),
];

if (flags.i18n) {
  files.push(copyTracked('i18n', flags.i18n, 'source.i18n'));
}

let referenceRelativeToSheet = null;
if (flags.reference) {
  const ext = extname(flags.reference).toLowerCase() || '.png';
  files.push(copyTracked('reference', flags.reference, `reference${ext}`));
  referenceRelativeToSheet = basename(flags.reference);
}

const manifest = {
  fixtureId,
  generatedAt: new Date().toISOString(),
  corpus: flags.corpus ?? 'explicit',
  sourceDir: resolve(flags.rel ?? '.'),
  relDir: flags.rel ?? fixtureId,
  referenceImage: flags.reference ? resolve(flags.reference) : null,
  referenceRelativeToSheet,
  legacyMode: parseLegacy(flags.legacy),
  legacyModeNote: 'Set true for legacy Roll20 sanitization fixtures, false for modern fixtures.',
  visualStatus: flags.reference ? 'prepared-reference' : 'prepared-no-reference',
  files,
};

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ fixtureId, outDir, files: files.length }));

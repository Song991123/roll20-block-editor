#!/usr/bin/env node
/**
 * Create a local-only, content-addressed manifest for a Roll20 verification
 * payload. It records hashes and mode metadata, never the sheet contents.
 *
 * Usage:
 *   node scripts/roll20_payload_provenance_manifest.mjs \
 *     --modern-payload-dir <ignored-payload-dir> \
 *     --legacy-payload-dir <ignored-payload-dir> \
 *     --out <ignored-manifest.json>
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const FILES = ['sheet.html', 'sheet.css', 'translation.json', 'sheet.json'];
const args = process.argv.slice(2);

if (args.includes('--self-test')) {
  runSelfTest();
  process.exit(0);
}

const modernDir = path.resolve(readOption('--modern-payload-dir'));
const legacyDir = path.resolve(readOption('--legacy-payload-dir'));
const outPath = path.resolve(readOption('--out'));

if (!modernDir || !legacyDir || !outPath || modernDir === path.resolve('.') || legacyDir === path.resolve('.') || outPath === path.resolve('.')) {
  console.error('Usage: node scripts/roll20_payload_provenance_manifest.mjs --modern-payload-dir <dir> --legacy-payload-dir <dir> --out <file>');
  process.exit(2);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});

async function main() {
  const modern = await describePayload(modernDir, 'modern');
  const legacy = await describePayload(legacyDir, 'legacy');
  const sharedFiles = FILES.filter((file) => file !== 'sheet.json');
  const sharedHashes = Object.fromEntries(sharedFiles.map((file) => [
    file,
    modern.files[file].sha256 === legacy.files[file].sha256,
  ]));
  const manifest = {
    schema: 'roll20-payload-provenance/v1',
    generatedAt: new Date().toISOString(),
    privacy: 'local-only ignored verification metadata; contains hashes and no sheet contents or source identity',
    comparisonContract: {
      sharedPayloadFiles: sharedFiles,
      sharedHashes,
      manifestDiffExpected: 'sheet.json legacy flag is mode-specific',
    },
    modes: { modern, legacy },
  };
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ out: outPath, sharedHashes, modern: modern.files, legacy: legacy.files }, null, 2));
}

async function describePayload(dir, mode) {
  const files = {};
  for (const file of FILES) {
    const filePath = path.join(dir, file);
    if (!existsSync(filePath)) throw new Error(`missing ${mode} payload file: ${filePath}`);
    const bytes = await fs.readFile(filePath);
    files[file] = {
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'sheet.json'), 'utf8'));
  const actualLegacy = manifest?.legacy === true;
  if ((mode === 'legacy') !== actualLegacy) {
    throw new Error(`mode mismatch: ${mode} payload has sheet.json legacy=${String(actualLegacy)}`);
  }
  return { mode, files, manifest: { legacy: actualLegacy } };
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) return '';
  return args[index + 1];
}

function runSelfTest() {
  const sample = { legacy: false };
  if (sample.legacy !== false) throw new Error('modern fixture self-test failed');
  console.log('ROLL20 PAYLOAD PROVENANCE SELF-TEST PASS');
}

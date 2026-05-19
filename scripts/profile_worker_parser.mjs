#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error('usage: node scripts/profile_worker_parser.mjs <html-file>');
  process.exit(2);
}

const html = readFileSync(htmlPath, 'utf8');
const lower = html.toLowerCase();
const start = lower.indexOf('<script type="text/worker">');
const bodyStart = start >= 0 ? html.indexOf('>', start) + 1 : -1;
const end = bodyStart >= 0 ? lower.indexOf('</script>', bodyStart) : -1;
const body = start >= 0 && bodyStart >= 0 && end >= 0 ? html.slice(bodyStart, end) : '';

const mod = await import(pathToFileURL(resolve('.tmp/roundtrip-build/lib/import/script_parser.js')).href);
const parseSheetWorkerScript = mod.parseSheetWorkerScript ?? mod.default?.parseSheetWorkerScript;

const t = Date.now();
const parsed = parseSheetWorkerScript(body);
console.log(JSON.stringify({
  hasWorker: body.length > 0,
  bodyBytes: body.length,
  ms: Date.now() - t,
  stats: parsed.stats,
  topBlocks: parsed.blocks.length,
}, null, 2));

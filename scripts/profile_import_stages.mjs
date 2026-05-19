#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error('usage: node scripts/profile_import_stages.mjs <html-file>');
  process.exit(2);
}

const base = resolve('.tmp/roundtrip-build/lib/import');
const dom = await import(pathToFileURL(`${base}/dom_walker.js`).href);
const matcher = await import(pathToFileURL(`${base}/block_matcher.js`).href);
const composite = await import(pathToFileURL(`${base}/composite_matcher.js`).href);
const emitter = await import(pathToFileURL(`${base}/xml_emitter.js`).href);

const html = readFileSync(htmlPath, 'utf8');

function step(label, fn) {
  const t = Date.now();
  const value = fn();
  console.log(JSON.stringify({ label, ms: Date.now() - t }));
  return value;
}

const root = step('parseHtml', () => dom.parseHtml(html));
const ctx = matcher.newMatchContext();
const tree = step('matchTree', () => matcher.matchTree(root, ctx));
const composed = step('packComposites', () => composite.packComposites(tree));
const xml = step('emitWorkspaceXml', () => emitter.emitWorkspaceXml(composed));

console.log(JSON.stringify({
  htmlBytes: html.length,
  rootChildren: root.children.length,
  stats: ctx,
  topBlocks: tree.length,
  composedTopBlocks: composed.length,
  xmlBytes: xml.length,
}, null, 2));

#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as Blockly from 'blockly';
import { registerAllBlocks } from '@/lib/blocks/registry';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import {
  isWorkerBlockType,
  moveImportedWorkerBlocksToWorkspace,
  replaceWorkerWorkspaceFromSourceHtml,
} from '@/lib/blockly/workerWorkspace';
import { importSheet } from '@/lib/import';
import {
  canonicalizeBlockGraph,
  type CanonicalBlockGraph,
} from '@/lib/perf/canonicalBlockGraph';
import { emitAll } from '@/lib/preview/emit';
import { createAnonymousCaseId } from './lib/corpus_harness_core.mjs';

type WorkspaceKey = 'html' | 'css' | 'i18n' | 'js' | 'worker';
type CompatibilityMode = 'modern' | 'legacy';

interface PrivateRoot {
  id: string;
  path: string;
}

interface PrivateCase {
  rootId: string;
  relativeKey: string;
  compatibility: CompatibilityMode | 'both';
  htmlPaths: string[];
  cssPaths: string[];
  translationPaths: string[];
  workerPaths: string[];
}

interface ResolvedTarget {
  anonymousId: string;
  mode: CompatibilityMode;
  root: PrivateRoot;
  descriptor: PrivateCase;
}

interface RuntimeInput {
  html: string;
  css: string;
  i18n: string;
}

const REPO = path.resolve(import.meta.dirname, '..');
const DEFAULT_CONFIG = path.join(REPO, '.tmp', 'corpus-harness', 'config.json');
const WORKSPACE_KEYS: WorkspaceKey[] = ['html', 'css', 'i18n', 'js', 'worker'];
const ANONYMOUS_ID_PATTERN = /^case-[a-f0-9]{24}$/;

function argOf(name: string, fallback = ''): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === '' || (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function modesFor(value: PrivateCase['compatibility']): CompatibilityMode[] {
  if (value === 'both') return ['modern', 'legacy'];
  if (value === 'modern' || value === 'legacy') return [value];
  return [];
}

function safePathList(value: unknown, rootPath: string): string[] | null {
  if (!Array.isArray(value)) return null;
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !path.isAbsolute(item)) return null;
    const resolved = path.resolve(item);
    if (!isInside(rootPath, resolved)) return null;
    result.push(resolved);
  }
  return result;
}

function normalizeCase(value: unknown, root: PrivateRoot): PrivateCase | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (source.rootId !== root.id || typeof source.relativeKey !== 'string') return null;
  const compatibility = source.compatibility;
  if (compatibility !== 'modern' && compatibility !== 'legacy' && compatibility !== 'both') {
    return null;
  }
  const htmlPaths = safePathList(source.htmlPaths, root.path);
  const cssPaths = safePathList(source.cssPaths, root.path);
  const translationPaths = safePathList(source.translationPaths, root.path);
  const workerPaths = safePathList(source.workerPaths, root.path);
  if (!htmlPaths?.length || !cssPaths || !translationPaths || !workerPaths) return null;
  return {
    rootId: root.id,
    relativeKey: source.relativeKey,
    compatibility,
    htmlPaths,
    cssPaths,
    translationPaths,
    workerPaths,
  };
}

async function resolveTarget(configPath: string, anonymousId: string): Promise<ResolvedTarget> {
  if (!ANONYMOUS_ID_PATTERN.test(anonymousId)) {
    throw new Error('probe requires a valid anonymous corpus case ID');
  }
  const config = JSON.parse(await readFile(configPath, 'utf8')) as Record<string, unknown>;
  if (typeof config.cacheDir !== 'string' || !config.cacheDir) {
    throw new Error('corpus config has no cacheDir');
  }
  const cacheDir = path.resolve(REPO, config.cacheDir);
  const index = JSON.parse(
    await readFile(path.join(cacheDir, 'corpus-private-discovery.json'), 'utf8'),
  ) as { version?: number; entries?: unknown[] };
  if (index.version !== 1 || !Array.isArray(index.entries)) {
    throw new Error('private corpus discovery index is missing or incompatible');
  }

  for (const rawEntry of index.entries) {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) continue;
    const entry = rawEntry as { root?: unknown; cases?: unknown };
    if (!entry.root || typeof entry.root !== 'object' || Array.isArray(entry.root)) continue;
    const rawRoot = entry.root as Record<string, unknown>;
    if (
      typeof rawRoot.id !== 'string'
      || typeof rawRoot.path !== 'string'
      || !path.isAbsolute(rawRoot.path)
      || !Array.isArray(entry.cases)
    ) continue;
    const root: PrivateRoot = { id: rawRoot.id, path: path.resolve(rawRoot.path) };
    for (const rawCase of entry.cases) {
      const descriptor = normalizeCase(rawCase, root);
      if (!descriptor) continue;
      for (const mode of modesFor(descriptor.compatibility)) {
        const candidateId = createAnonymousCaseId({
          rootId: descriptor.rootId,
          relativeKey: `${descriptor.relativeKey}\0${mode}`,
        });
        if (candidateId === anonymousId) {
          return { anonymousId, mode, root, descriptor };
        }
      }
    }
  }
  throw new Error('anonymous corpus case is absent from the private discovery index');
}

async function readTextFiles(paths: string[]): Promise<string[]> {
  return Promise.all(paths.map((filePath) => readFile(filePath, 'utf8')));
}

function translationPriority(filePath: string): number {
  const name = path.basename(filePath).toLowerCase();
  if (name === 'translation.json') return 0;
  if (name === 'translations.json') return 1;
  if (/^en(?:[-_][a-z0-9]+)?\.json$/i.test(name)) return 2;
  return 3;
}

async function composeRuntimeInput(descriptor: PrivateCase): Promise<RuntimeInput> {
  const htmlParts = await readTextFiles(descriptor.htmlPaths);
  const cssParts = await readTextFiles(descriptor.cssPaths);
  const translationPath = [...descriptor.translationPaths].sort(
    (left, right) => translationPriority(left) - translationPriority(right)
      || left.localeCompare(right),
  )[0];
  let html = htmlParts.join('\n');
  const hasInlineWorker = /<script\b[^>]*\btype\s*=\s*["']text\/worker["']/i.test(html);
  if (!hasInlineWorker && descriptor.workerPaths.length > 0) {
    const workerParts = await readTextFiles(descriptor.workerPaths);
    html += `\n${workerParts.map(
      (source) => `<script type="text/worker">\n${source}\n</script>`,
    ).join('\n')}`;
  }
  return {
    html,
    css: cssParts.join('\n'),
    i18n: translationPath ? await readFile(translationPath, 'utf8') : '',
  };
}

function captureGraph(key: WorkspaceKey, workspace: Blockly.Workspace): CanonicalBlockGraph {
  const adapter = getBlocklyAdapter();
  return canonicalizeBlockGraph(workspace.getAllBlocks(false).map((block) => ({
    id: block.id,
    type: block.type,
    fields: adapter.getBlockFields(key, block.id),
    inputs: block.inputList.flatMap((input, ordinal) => input.connection
      ? [{ name: input.name, ordinal, targetId: input.connection.targetBlock()?.id ?? null }]
      : []),
    nextId: block.nextConnection?.targetBlock()?.id ?? null,
  })));
}

function preservedAttributeDelta(beforeValue: unknown, afterValue: unknown) {
  const parse = (value: unknown): Array<[string, string]> => {
    try {
      const parsed = JSON.parse(String(value ?? ''));
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((entry) => Array.isArray(entry) && entry.length >= 2)
        .map((entry) => [String(entry[0]), String(entry[1])]);
    } catch {
      return [];
    }
  };
  const group = (entries: Array<[string, string]>) => {
    const values = new Map<string, string[]>();
    for (const [name, value] of entries) {
      const current = values.get(name) ?? [];
      current.push(value);
      values.set(name, current);
    }
    for (const current of values.values()) current.sort();
    return values;
  };
  const before = group(parse(beforeValue));
  const after = group(parse(afterValue));
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  return {
    added: names.filter((name) => !before.has(name) && after.has(name)),
    removed: names.filter((name) => before.has(name) && !after.has(name)),
    changed: names.filter((name) => (
      before.has(name)
      && after.has(name)
      && JSON.stringify(before.get(name)) !== JSON.stringify(after.get(name))
    )),
  };
}

function rootTypeCounts(graph: CanonicalBlockGraph): Record<string, number> {
  const counts = new Map<string, number>();
  for (const index of graph.roots) {
    const type = graph.nodes[index]?.type ?? 'missing';
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function fieldDifferenceTraits(
  before: CanonicalBlockGraph['nodes'][number]['fields'][number] | undefined,
  after: CanonicalBlockGraph['nodes'][number]['fields'][number] | undefined,
) {
  const beforeValue = String(before?.value ?? '');
  const afterValue = String(after?.value ?? '');
  const normalizeLines = (value: string) => value.replace(/\r\n?/g, '\n');
  const normalizeWhitespace = (value: string) => normalizeLines(value).replace(/\s+/g, ' ').trim();
  return {
    trimmedEqual: beforeValue.trim() === afterValue.trim(),
    lineEndingNormalizedEqual: normalizeLines(beforeValue) === normalizeLines(afterValue),
    whitespaceNormalizedEqual: normalizeWhitespace(beforeValue) === normalizeWhitespace(afterValue),
    kindEqual: before?.kind === after?.kind,
    optionsEqual: JSON.stringify(before?.options ?? null) === JSON.stringify(after?.options ?? null),
  };
}

function firstDifference(
  before: CanonicalBlockGraph,
  after: CanonicalBlockGraph,
  includeSyntheticValues = false,
) {
  if (JSON.stringify(before.roots) !== JSON.stringify(after.roots)) {
    return {
      kind: 'roots',
      beforeRootCount: before.roots.length,
      afterRootCount: after.roots.length,
      beforeRootTypes: rootTypeCounts(before),
      afterRootTypes: rootTypeCounts(after),
      beforeNodeCount: before.nodes.length,
      afterNodeCount: after.nodes.length,
    };
  }
  if (before.cycleEdges !== after.cycleEdges) return { kind: 'cycle-edges' };
  const length = Math.max(before.nodes.length, after.nodes.length);
  for (let index = 0; index < length; index += 1) {
    const left = before.nodes[index];
    const right = after.nodes[index];
    if (!left || !right) {
      return {
        kind: 'node-count',
        beforeType: left?.type ?? 'missing',
        afterType: right?.type ?? 'missing',
      };
    }
    if (left.type !== right.type) {
      return { kind: 'block-type', beforeType: left.type, afterType: right.type };
    }
    const fieldNames = new Set([
      ...left.fields.map((field) => field.name),
      ...right.fields.map((field) => field.name),
    ]);
    const changedFieldNames = [...fieldNames].filter((name) => {
      const beforeField = left.fields.find((field) => field.name === name);
      const afterField = right.fields.find((field) => field.name === name);
      return JSON.stringify(beforeField) !== JSON.stringify(afterField);
    }).sort();
    if (changedFieldNames.length > 0) {
      const preservedBefore = left.fields.find(
        (field) => field.name === '__R20_PRESERVED_ATTRS',
      )?.value;
      const preservedAfter = right.fields.find(
        (field) => field.name === '__R20_PRESERVED_ATTRS',
      )?.value;
      return {
        kind: 'fields',
        blockType: left.type,
        changedFieldNames,
        fieldDifferenceTraits: Object.fromEntries(changedFieldNames.map((name) => [
          name,
          fieldDifferenceTraits(
            left.fields.find((field) => field.name === name),
            right.fields.find((field) => field.name === name),
          ),
        ])),
        ...(changedFieldNames.includes('__R20_PRESERVED_ATTRS') ? {
          preservedAttributeDelta: preservedAttributeDelta(preservedBefore, preservedAfter),
        } : {}),
        ...(includeSyntheticValues ? {
          syntheticValues: Object.fromEntries(changedFieldNames.map((name) => [
            name,
            {
              before: left.fields.find((field) => field.name === name)?.value ?? null,
              after: right.fields.find((field) => field.name === name)?.value ?? null,
            },
          ])),
        } : {}),
      };
    }
    if (JSON.stringify(left.inputs) !== JSON.stringify(right.inputs)) {
      return { kind: 'inputs', blockType: left.type };
    }
    if (left.next !== right.next) return { kind: 'next', blockType: left.type };
  }
  return null;
}

async function graphRoundtrip(input: RuntimeInput, includeSyntheticValues = false) {
  registerAllBlocks();
  const adapter = getBlocklyAdapter();
  const workspaces = Object.fromEntries(
    WORKSPACE_KEYS.map((key) => [key, new Blockly.Workspace()]),
  ) as Record<WorkspaceKey, Blockly.Workspace>;
  for (const key of WORKSPACE_KEYS) adapter.registerWorkspace(key, workspaces[key]);
  const emptyXml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';

  const hydrate = (source: RuntimeInput) => {
    const imported = importSheet(source);
    adapter.hydrateFromXml('worker', emptyXml);
    adapter.hydrateFromXml('html', imported.html);
    moveImportedWorkerBlocksToWorkspace();
    replaceWorkerWorkspaceFromSourceHtml(source.html);
    adapter.hydrateFromXml('css', imported.css);
    adapter.hydrateFromXml('i18n', imported.i18n);
    adapter.hydrateFromXml('js', imported.js);
    return imported;
  };

  try {
    const firstImport = hydrate(input);
    const before = Object.fromEntries(
      WORKSPACE_KEYS.map((key) => [key, captureGraph(key, workspaces[key])]),
    ) as Record<WorkspaceKey, CanonicalBlockGraph>;
    const emitted = emitAll(workspaces);
    const secondImport = hydrate({ html: emitted.html, css: emitted.css, i18n: emitted.i18n });
    const after = Object.fromEntries(
      WORKSPACE_KEYS.map((key) => [key, captureGraph(key, workspaces[key])]),
    ) as Record<WorkspaceKey, CanonicalBlockGraph>;
    const graphByWorkspace = Object.fromEntries(WORKSPACE_KEYS.map((key) => [
      key,
      JSON.stringify(before[key]) === JSON.stringify(after[key]),
    ])) as Record<WorkspaceKey, boolean>;
    const htmlWorkerLeakCounts = {
      before: before.html.nodes.filter((node) => isWorkerBlockType(node.type)).length,
      after: after.html.nodes.filter((node) => isWorkerBlockType(node.type)).length,
    };
    const failedWorkspace = WORKSPACE_KEYS.find((key) => !graphByWorkspace[key]) ?? null;
    return {
      pass: Object.values(graphByWorkspace).every(Boolean)
        && htmlWorkerLeakCounts.before === 0
        && htmlWorkerLeakCounts.after === 0,
      graphByWorkspace,
      htmlWorkerLeakCounts,
      firstDifference: failedWorkspace
        ? {
            workspace: failedWorkspace,
            ...firstDifference(
              before[failedWorkspace],
              after[failedWorkspace],
              includeSyntheticValues,
            ),
          }
        : null,
      warningCategories: [...new Set([
        ...firstImport.warnings,
        ...secondImport.warnings,
      ].map((warning) => warning.code.replace(/[^a-z0-9_-]/gi, '').slice(0, 80)))].sort(),
    };
  } finally {
    for (const key of WORKSPACE_KEYS) {
      adapter.unregisterWorkspace(key);
      workspaces[key].dispose();
    }
  }
}

async function selfTest(): Promise<void> {
  assert.deepEqual(
    preservedAttributeDelta(
      '[["class","before"],["name","field"]]',
      '[["class","after"],["type","text"]]',
    ),
    { added: ['type'], removed: ['name'], changed: ['class'] },
  );
  const result = await graphRoundtrip({
    html: [
      '<section class="panel"><!--first\n  second--><input type="text" name="attr_name" value="A"></section>',
      '<script>window.pageReady = true;</script>',
      '<script type="text/worker">on("sheet:opened", function () { setAttrs({ready: "1"}); });</script>',
    ].join('\n'),
    css: ':root { --tone: red; }\n.panel:has(> input) { color: var(--tone); }',
    i18n: '{"title":"Title"}',
  }, true);
  assert.equal(result.pass, true, JSON.stringify({
    graphByWorkspace: result.graphByWorkspace,
    firstDifference: result.firstDifference,
  }));
  assert.deepEqual(result.graphByWorkspace, {
    html: true,
    css: true,
    i18n: true,
    js: true,
    worker: true,
  });
  assert.deepEqual(result.htmlWorkerLeakCounts, { before: 0, after: 0 });
  assert.equal(result.firstDifference, null);
  assert.deepEqual(
    firstDifference(
      {
        roots: [0],
        nodes: [{ type: 'r20_div', fields: [], inputs: [], next: null }],
        cycleEdges: 0,
      },
      {
        roots: [],
        nodes: [{ type: 'r20_div', fields: [], inputs: [], next: null }],
        cycleEdges: 0,
      },
    ),
    {
      kind: 'roots',
      beforeRootCount: 1,
      afterRootCount: 0,
      beforeRootTypes: { r20_div: 1 },
      afterRootTypes: {},
      beforeNodeCount: 1,
      afterNodeCount: 1,
    },
  );
  assert.deepEqual(
    firstDifference(
      {
        roots: [0],
        nodes: [{
          type: 'r20_raw_worker',
          fields: [{ name: 'JS', kind: 'text', value: 'worker();' }],
          inputs: [],
          next: null,
        }],
        cycleEdges: 0,
      },
      {
        roots: [0],
        nodes: [{
          type: 'r20_raw_worker',
          fields: [{ name: 'JS', kind: 'text', value: '\nworker();\n' }],
          inputs: [],
          next: null,
        }],
        cycleEdges: 0,
      },
    ),
    {
      kind: 'fields',
      blockType: 'r20_raw_worker',
      changedFieldNames: ['JS'],
      fieldDifferenceTraits: {
        JS: {
          trimmedEqual: true,
          lineEndingNormalizedEqual: false,
          whitespaceNormalizedEqual: true,
          kindEqual: true,
          optionsEqual: true,
        },
      },
    },
  );
  console.log('corpus mapping probe self-test PASS');
}

async function main(): Promise<void> {
  if (process.argv.includes('--self-test')) {
    await selfTest();
    return;
  }
  const anonymousId = argOf('--only');
  const configPath = path.resolve(argOf('--config', DEFAULT_CONFIG));
  const target = await resolveTarget(configPath, anonymousId);
  const input = await composeRuntimeInput(target.descriptor);
  const started = Date.now();
  const probe = await graphRoundtrip(input);
  const report = {
    version: 1,
    anonymousId: target.anonymousId,
    compatibility: target.mode,
    scope: 'node-only import-emit-reimport canonical graph; no browser or visual proof',
    ...probe,
    durationMs: Date.now() - started,
  };
  const reportDir = path.join(REPO, '.tmp', 'corpus-harness', 'mapping-probes');
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `${target.anonymousId}-${target.mode}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    anonymousId: report.anonymousId,
    compatibility: report.compatibility,
    pass: report.pass,
    graphByWorkspace: report.graphByWorkspace,
    firstDifference: report.firstDifference,
  }));
  process.exitCode = report.pass ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

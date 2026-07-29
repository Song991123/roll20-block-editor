import { classifyRoll20Script } from './worker_source';
import { emitWorkspaceXml } from './xml_emitter';
import type { MatchedBlock } from './block_matcher';

/** Internal marker shared by the HTML and Page JS emitters. */
export const PAGE_JS_SLOT_MARKER_PREFIX = 'r20-page-js-slot:';

export interface PageJsImportEntry {
  slot: string;
  attrs: string;
  body: string;
}

export interface SplitPageJsResult {
  html: string;
  js: string;
  entries: PageJsImportEntry[];
}

/** Move ordinary page scripts out of HTML while preserving source order. */
export function splitOrdinaryPageScripts(html: string): SplitPageJsResult {
  const entries: PageJsImportEntry[] = [];
  const source = String(html ?? '');
  const stripped = source.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,
    (full, rawAttrs: string, body: string) => {
      const type = readScriptType(rawAttrs);
      if (classifyRoll20Script(type, body) === 'worker') return full;
      const slot = `page-${entries.length}`;
      entries.push({ slot, attrs: rawAttrs.trim(), body });
      return `<!-- ${PAGE_JS_SLOT_MARKER_PREFIX}${slot} -->`;
    },
  );
  const blocks: MatchedBlock[] = entries.map((entry) => ({
    blockType: 'r20_raw_page_js',
    fields: { SLOT: entry.slot, ATTRS: entry.attrs, JS: entry.body },
    children: {},
  }));
  return { html: stripped, js: emitWorkspaceXml(blocks), entries };
}

export function makePageJsSlotComment(slot: string): string {
  return `<!-- ${PAGE_JS_SLOT_MARKER_PREFIX}${safeSlot(slot)} -->`;
}

export function parsePageJsSlotComment(comment: string): string | null {
  const match = new RegExp(
    `^\\s*${escapeRegExp(PAGE_JS_SLOT_MARKER_PREFIX)}([A-Za-z0-9_-]+)\\s*$`,
    'i',
  ).exec(String(comment ?? ''));
  return match?.[1] ?? null;
}

/** Replace imported slots and append newly-authored scripts. */
export function mergePageJsSlots(html: string, pageJs: string): string {
  const anchored = new Map<string, string>();
  const remaining = String(pageJs ?? '').replace(
    /<!--[ \t]*r20-page-js-slot:([A-Za-z0-9_-]+)[ \t]*-->[ \t\r\n]*(<script\b[\s\S]*?<\/script\s*>)/gi,
    (_full, slot: string, script: string) => {
      anchored.set(slot, script);
      return '';
    },
  );
  const merged = String(html ?? '').replace(
    /<!--[ \t]*r20-page-js-slot:([A-Za-z0-9_-]+)[ \t]*-->/gi,
    (_full, slot: string) => anchored.get(slot) ?? '',
  );
  const appended = remaining
    .replace(/<!--[ \t]*r20-page-js-slot:[A-Za-z0-9_-]+[ \t]*-->/gi, '')
    .trim();
  return [merged, appended].filter(Boolean).join('\n');
}

function readScriptType(attrs: string): string {
  const match = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))/i.exec(attrs);
  return String(match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim().toLowerCase();
}

function safeSlot(value: string): string {
  const normalized = String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '-');
  return normalized || 'page-0';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

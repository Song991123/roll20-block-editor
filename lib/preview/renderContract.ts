import {
  sanitizeRoll20SandboxCss,
  sanitizeRoll20SandboxHtml,
} from '../emit/roll20SandboxSanitize';
import { sanitizeForRoll20Legacy } from '../emit/sanitize';
import { parseTranslationMap } from '../export/payload';
import { isRoll20WorkerScript } from '../import/worker_source';
import { annotateRoll20AutocalcHtml } from './autocalc';
import {
  autoPrefixCssClasses,
  autoPrefixHtmlClasses,
  scopeRoll20LegacyCss,
} from './prefix';
import {
  applyRoll20RuntimeCssAssetPolicy,
  applyRoll20RuntimeHtmlAssetPolicy,
} from './runtimeAssetPolicy';

export type Roll20CompatibilityMode = 'modern' | 'legacy';

export interface SheetRenderContractInput {
  html: string;
  css: string;
  i18n?: string;
  compatibilityMode?: Roll20CompatibilityMode;
  /** Backward-compatible low-level input. Product code should pass compatibilityMode. */
  sanitize?: boolean;
  /** Backward-compatible low-level input. Product code should pass compatibilityMode. */
  legacyCssSanitize?: boolean;
  roll20SandboxSanitize?: boolean;
}

export interface PreparedSheetRenderContract {
  compatibilityMode: Roll20CompatibilityMode;
  sanitize: boolean;
  legacyCssSanitize: boolean;
  roll20SandboxSanitize: boolean;
  hasAuthoredHtml: boolean;
  bodyInner: string;
  previewCss: string;
}

/**
 * Produce the shared source contract consumed by both iframe preview and
 * Shadow edit serialization. Modern and legacy are selected atomically.
 */
export function prepareSheetRenderContract(
  input: SheetRenderContractInput,
): PreparedSheetRenderContract {
  const compatibilityMode = input.compatibilityMode
    ?? (input.legacyCssSanitize === true ? 'legacy' : 'modern');
  const legacyCssSanitize = compatibilityMode === 'legacy';
  const sanitize = input.compatibilityMode
    ? legacyCssSanitize
    : input.sanitize !== false;
  const roll20SandboxSanitize = input.roll20SandboxSanitize === true;
  const userHtml = (input.html ?? '').trim();
  const userCss = (input.css ?? '').trim();

  const prefixedHtml = sanitize ? autoPrefixHtmlClasses(userHtml) : userHtml;
  const prefixedCss = sanitize ? autoPrefixCssClasses(userCss) : userCss;
  const sandboxHtml = roll20SandboxSanitize
    ? restorePreviewWorkerScripts(
        sanitizeRoll20SandboxHtml(userHtml, {
          prefixClasses: legacyCssSanitize,
          rewriteUrls: false,
        }).html,
        userHtml,
      )
    : prefixedHtml;
  const sandboxCss = roll20SandboxSanitize
    ? sanitizeRoll20SandboxCss(userCss, {
        prefixSelectors: false,
        rewriteUrls: false,
      }).css
    : prefixedCss;
  const runtimeHtml = applyRoll20RuntimeHtmlAssetPolicy(sandboxHtml, compatibilityMode);
  const runtimeCss = applyRoll20RuntimeCssAssetPolicy(sandboxCss, compatibilityMode);
  const previewCss = legacyCssSanitize
    ? sanitizeForRoll20Legacy(scopeRoll20LegacyCss(runtimeCss)).sanitized
    : runtimeCss;
  const bodyInner = runtimeHtml
    ? addRoll20RepeatingRuntimeHtml(
        annotateRoll20AutocalcHtml(applyTranslationsToHtml(runtimeHtml, input.i18n)),
      )
    : '';

  return {
    compatibilityMode,
    sanitize,
    legacyCssSanitize,
    roll20SandboxSanitize,
    hasAuthoredHtml: userHtml.length > 0,
    bodyInner,
    previewCss,
  };
}

/**
 * Roll20 removes worker script tags from the authored sheet HTML before it
 * mounts the character iframe, but the editor still needs the worker source
 * to drive its local preview runtime. Re-attach only worker scripts after the
 * sandbox HTML allow-list pass; ordinary page scripts stay removed.
 */
function restorePreviewWorkerScripts(sanitizedHtml: string, sourceHtml: string): string {
  const workerScripts: string[] = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(String(sourceHtml ?? '')))) {
    const attrs = match[1] ?? '';
    const body = match[2] ?? '';
    const typeMatch = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))/i.exec(attrs);
    const type = String(typeMatch?.[1] ?? typeMatch?.[2] ?? typeMatch?.[3] ?? '').trim();
    if (!isRoll20WorkerScript(type, body)) continue;
    workerScripts.push(
      `<script type="text/worker" data-r20-worker-source="${escapeHtmlAttribute(body)}"></script>`,
    );
  }
  return workerScripts.length > 0
    ? `${sanitizedHtml}${sanitizedHtml && !sanitizedHtml.endsWith('\n') ? '\n' : ''}${workerScripts.join('\n')}`
    : sanitizedHtml;
}

function escapeHtmlAttribute(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function applyTranslationsToHtml(html: string, i18n: string | undefined): string {
  const translations = parseTranslationMap(i18n);
  if (Object.keys(translations).length === 0) return html;
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(`<template>${html}</template>`, 'text/html');
  const template = doc.querySelector('template');
  if (!template) return html;

  template.content.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key && translations[key] != null) el.textContent = translations[key];
  });
  template.content.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key && translations[key] != null) el.innerHTML = translations[key];
  });
  const attrPairs = [
    ['data-i18n-title', 'title'],
    ['data-i18n-alt', 'alt'],
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-label', 'label'],
  ] as const;
  for (const [source, target] of attrPairs) {
    template.content.querySelectorAll<HTMLElement>(`[${source}]`).forEach((el) => {
      const key = el.getAttribute(source);
      if (key && translations[key] != null) el.setAttribute(target, translations[key]);
    });
  }

  return template.innerHTML;
}

function addRoll20RepeatingRuntimeHtml(html: string): string {
  if (!html || !/repeating_/.test(html)) return html;
  return html.replace(/<fieldset\b[^>]*>[\s\S]*?<\/fieldset>/gi, (fieldset, offset, source) => {
    const startTag = fieldset.match(/^<fieldset\b[^>]*>/i)?.[0] ?? '';
    const classMatch = /\bclass=(["'])([^"']*)\1/i.exec(startTag);
    const groupName = classMatch?.[2]
      .split(/\s+/)
      .find((token) => /^repeating_[\w-]+$/i.test(token));
    if (!groupName) return fieldset;
    const after = String(source).slice(offset + fieldset.length);
    if (/^\s*<div\b[^>]*\bclass=(["'])[^"']*\brepcontainer\b[^"']*\1>\s*<\/div>\s*<div\b[^>]*\bclass=(["'])[^"']*\brepcontrol\b[^"']*\2>/i.test(after)) {
      return fieldset;
    }
    const runtime = `<div class="repcontainer" data-groupname="${groupName}"></div><div class="repcontrol" data-groupname="${groupName}"><button type="button" class="btn repcontrol_edit">Modify</button><button type="button" class="btn repcontrol_add">+Add</button></div>`;
    return `${fieldset}${runtime}`;
  });
}

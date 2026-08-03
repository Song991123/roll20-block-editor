/**
 * Public import API — `importSheet({ html, css, i18n }): ImportResult`.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3 (블록 카탈로그)
 *   - docs/spec/12_roll20_output_spec.md §2/§3 (emit contract — 역방향)
 *
 * 본 모듈은 입력 HTML/CSS/translation 텍스트를 Blockly XML 3 종으로 변환.
 * 결과는 `adapter.hydrateFromXml(key, xml)` 로 그대로 워크스페이스에 박을 수 있음.
 *
 * 일반화: legacy-sheet-corpus / D&D 5e / PbtA 어떤 시트도 같은 알고리즘.
 * 한글 라벨 / legacy-sheet-corpus specific class name hardcoding 0.
 */

import { parseHtml } from './dom_walker';
import { matchTree, newMatchContext } from './block_matcher';
import { newPackStats, packComposites } from './composite_matcher';
import { parseCss, newCssCtx } from './css_parser';
import { parseI18n, newI18nCtx, type I18nOptions } from './i18n_extractor';
import { emitWorkspaceXml } from './xml_emitter';
import { splitOrdinaryPageScripts } from './pageJsWorkspace';
import { detectTemplateMarkers } from './templateMarkers';
import {
  analyzeRepeatingSections,
  describeRepeatingSectionIssue,
} from '../validation/repeatingSections';
import type { ImportHtmlOptions, ImportInput, ImportResult, ImportWarning } from './types';

export type { ImportInput, ImportResult, ImportWarning } from './types';

export interface ImportOptions {
  i18n?: I18nOptions;
  html?: ImportHtmlOptions;
}

export function importSheet(
  input: ImportInput,
  options: ImportOptions = {},
): ImportResult {
  const warnings: ImportWarning[] = [];
  const pageJsSplit = splitOrdinaryPageScripts(input.html ?? '');
  const htmlRoot = pageJsSplit.html.trim() ? parseHtml(pageJsSplit.html) : null;
  for (const issue of htmlRoot ? analyzeRepeatingSections(htmlRoot) : []) {
    warnings.push({
      severity: 'error',
      code: issue.code === 'duplicate-name'
        ? 'html_repeating_duplicate_name'
        : 'html_repeating_invalid_name',
      message: describeRepeatingSectionIssue(issue),
      workspace: 'html',
    });
  }
  const templateMarkers = detectTemplateMarkers(input.html ?? '');
  if (templateMarkers.count > 0) {
    warnings.push({
      severity: 'warning',
      code: 'html_template_directive',
      message: 'HTML에 확장되지 않은 템플릿 구문이 남아 있습니다. 최종 Roll20 HTML로 변환한 뒤 다시 불러오세요.',
      workspace: 'html',
      hint: templateMarkers.kinds.join(','),
    });
  }

  // HTML.
  const htmlCtx = newMatchContext();
  let htmlXml = `<xml xmlns="https://developers.google.com/blockly/xml"></xml>`;
  if (htmlRoot) {
    const tree = matchTree(htmlRoot, htmlCtx);
    // Phase 2 — composite packing layer. atomic chain 의 자주-반복 패턴을
    // composite block 1 개로 묶어 카탈로그 inflation 감소. 인식 실패 시
    // atomic 그대로 유지 (fail-safe).
    const packStats = newPackStats();
    const composed = packComposites(tree, packStats, {
      compactWideRows: options.html?.compactWideRows ?? false,
    });
    htmlXml = emitWorkspaceXml(composed);
    htmlCtx.compositePackStats = packStats;
    for (const w of htmlCtx.warnings) {
      warnings.push({
        severity: 'warning',
        code: w.code,
        message: w.message,
        workspace: 'html',
        hint: w.hint,
      });
    }
  }

  // CSS.
  const cssCtx = newCssCtx();
  let cssXml = `<xml xmlns="https://developers.google.com/blockly/xml"></xml>`;
  if (input.css && input.css.trim()) {
    const tree = parseCss(input.css, cssCtx);
    cssXml = emitWorkspaceXml(tree);
    for (const w of cssCtx.warnings) {
      warnings.push({
        severity: 'warning',
        code: w.code,
        message: w.message,
        workspace: 'css',
        hint: w.hint,
      });
    }
  }

  // i18n.
  const i18nCtx = newI18nCtx();
  let i18nXml = `<xml xmlns="https://developers.google.com/blockly/xml"></xml>`;
  if (input.i18n && input.i18n.trim()) {
    const tree = parseI18n(input.i18n, i18nCtx, options.i18n);
    i18nXml = emitWorkspaceXml(tree);
    for (const w of i18nCtx.warnings) {
      warnings.push({
        severity: 'warning',
        code: w.code,
        message: w.message,
        workspace: 'i18n',
      });
    }
  }

  const htmlCoverage =
    htmlCtx.totalCount > 0
      ? Math.round((htmlCtx.matchedCount * 1000) / htmlCtx.totalCount) / 10
      : 0;
  const cssCoverage =
    cssCtx.total > 0
      ? Math.round((cssCtx.matched * 1000) / cssCtx.total) / 10
      : 0;
  const structuredTotal = htmlCtx.totalCount + cssCtx.total;
  const structuredMatched = htmlCtx.matchedCount + cssCtx.matched;
  const structuredCoverage =
    structuredTotal > 0
      ? Math.round((structuredMatched * 1000) / structuredTotal) / 10
      : 0;

  return {
    html: htmlXml,
    css: cssXml,
    i18n: i18nXml,
    js: pageJsSplit.js,
    warnings,
    stats: {
      htmlMatched: htmlCtx.matchedCount,
      htmlTotal: htmlCtx.totalCount,
      htmlRawFallback: htmlCtx.rawFallbackCount,
      cssMatched: cssCtx.matched,
      cssTotal: cssCtx.total,
      cssRawFallback: cssCtx.rawFallback,
      i18nKeys: i18nCtx.keys,
      pageScriptBlocks: pageJsSplit.entries.length,
      templateMarkerCount: templateMarkers.count,
      // Keep the historical field as the HTML-only percentage for callers
      // that already consume it; expose the CSS and combined scopes too.
      coverage: htmlCoverage,
      htmlCoverage,
      cssCoverage,
      structuredCoverage,
      warningCount: warnings.length,
      sanitizeDropped: htmlCtx.sanitizeDropped,
      scriptBlocksMatched: htmlCtx.scriptBlocksMatched,
      scriptStatementsRaw: htmlCtx.scriptStatementsRaw,
      compositeAtomicTotal: htmlCtx.compositePackStats?.atomicTotal ?? 0,
      compositeAfterPackTotal: htmlCtx.compositePackStats?.afterPackTotal ?? 0,
      compositeCollapsed: htmlCtx.compositePackStats?.collapsed ?? 0,
      compositePackedByType: htmlCtx.compositePackStats?.packedByType ?? {},
      wideRowBundles: htmlCtx.compositePackStats?.wideRowBundles ?? 0,
      wideRowCollapsed: htmlCtx.compositePackStats?.wideRowCollapsed ?? 0,
    },
  };
}

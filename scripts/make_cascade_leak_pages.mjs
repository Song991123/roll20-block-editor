#!/usr/bin/env node
/**
 * Build browser-computed cascade diagnostic pages from rendered visual fixtures.
 *
 * Usage:
 *   node scripts/make_cascade_leak_pages.mjs [render_root] [out_dir] [fixture_id...]
 *
 * Defaults:
 *   render_root = reports/visual-fixture-render/html
 *   out_dir     = reports/cascade-leak
 *
 * Open the generated HTML pages in a browser and read
 * `[data-testid="cascade-result"]`. The page computes actual matched CSS rules
 * and computed style values inside the browser, which is the only reliable
 * place to inspect cascade behavior.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const renderRoot = resolve(args[0] ?? 'reports/visual-fixture-render/html');
const outDir = resolve(args[1] ?? 'reports/cascade-leak');
const requestedIds = new Set(args.slice(2).map((id) => id.replace(/\.html$/i, '')));

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function listRenderedFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.html')
    .map((entry) => join(root, entry.name))
    .filter((path) => requestedIds.size === 0 || requestedIds.has(basename(path, '.html')))
    .sort((a, b) => basename(a).localeCompare(basename(b)));
}

function injectAnalyzer(html, fixtureId) {
  const marker = '<script id="r20-cascade-diagnostic">';
  if (html.includes(marker)) return html;

  const analyzer = `
<style id="r20-cascade-diagnostic-ui">
#r20-cascade-diagnostic-panel {
  position: fixed;
  inset: auto 12px 12px 12px;
  z-index: 2147483647;
  max-height: 42vh;
  overflow: auto;
  padding: 12px;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  background: #09090b;
  color: #f4f4f5;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
  box-shadow: 0 12px 32px rgba(0,0,0,0.35);
}
#r20-cascade-diagnostic-panel h2 {
  margin: 0 0 8px;
  font: 600 13px/1.2 system-ui, sans-serif;
}
#r20-cascade-diagnostic-panel pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>
<div id="r20-cascade-diagnostic-panel">
  <h2>Cascade diagnostic: ${htmlEscape(fixtureId)}</h2>
  <pre data-testid="cascade-result">pending</pre>
</div>
${marker}
(function () {
  var fixtureId = ${JSON.stringify(fixtureId)};
  var properties = [
    'box-sizing',
    'display',
    'position',
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'margin',
    'padding',
    'border-top-width',
    'border-top-style',
    'background-color',
    'background-image',
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'overflow',
    'visibility',
    'opacity',
    'pointer-events',
    'transform'
  ];
  var sourceLabels = {
    'roll20-base': 'roll20-base',
    'roll20-base-dark': 'roll20-darkmode',
    'roll20-dialog-open': 'roll20-dialog-context',
    'r20-baseline-fallback': 'roll20-baseline-fallback',
    'r20-runtime': 'app-preview-runtime',
    'r20-layer-filter': 'app-layer-filter',
    'r20-user': 'sheet-user-css',
    'r20-preview-hidden': 'preview-hidden-runtime',
    'r20-cascade-diagnostic-ui': 'diagnostic-ui'
  };
  var appLikeSources = {
    'app-preview-runtime': true,
    'app-layer-filter': true,
    'preview-hidden-runtime': true,
    'external-or-app-css': true
  };
  var roll20Sources = {
    'roll20-base': true,
    'roll20-darkmode': true,
    'roll20-dialog-context': true,
    'roll20-baseline-fallback': true
  };
  var userSources = {
    'sheet-user-css': true
  };

  function fail(message) {
    var out = document.querySelector('[data-testid="cascade-result"]');
    if (out) out.textContent = JSON.stringify({ fixtureId: fixtureId, status: 'error', message: String(message) }, null, 2);
  }

  function stableSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + cssEscape(el.id);
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 5) {
      var part = node.tagName.toLowerCase();
      var cls = Array.prototype.slice.call(node.classList || []).filter(Boolean).slice(0, 3);
      if (cls.length) part += '.' + cls.map(cssEscape).join('.');
      var name = node.getAttribute && node.getAttribute('name');
      if (name) part += '[name="' + attrEscape(name) + '"]';
      var parent = node.parentElement;
      if (parent) {
        var siblings = Array.prototype.filter.call(parent.children, function (item) {
          return item.tagName === node.tagName;
        });
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(' > ');
  }

  function cssEscape(value) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
  }

  function attrEscape(value) {
    return String(value).replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"');
  }

  function sourceOfSheet(sheet) {
    var owner = sheet && sheet.ownerNode;
    if (!owner) return 'unknown';
    if (owner.id && sourceLabels[owner.id]) return sourceLabels[owner.id];
    if (owner.tagName === 'STYLE') return owner.id ? 'style#' + owner.id : 'inline-style-tag';
    if (owner.tagName === 'LINK') return owner.getAttribute('href') || 'external-or-app-css';
    return 'external-or-app-css';
  }

  function walkRules(ruleList, out, source) {
    for (var i = 0; i < ruleList.length; i++) {
      var rule = ruleList[i];
      if (rule.type === CSSRule.STYLE_RULE) {
        out.push({ rule: rule, source: source });
      } else if (rule.cssRules) {
        walkRules(rule.cssRules, out, source);
      }
    }
  }

  function collectRules() {
    var out = [];
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sheet = document.styleSheets[i];
      var source = sourceOfSheet(sheet);
      try {
        walkRules(sheet.cssRules || [], out, source);
      } catch (err) {
        out.push({ blocked: true, source: source, error: String(err && err.message ? err.message : err) });
      }
    }
    return out;
  }

  function specificity(selector) {
    var clean = String(selector || '')
      .replace(/:where\\([^)]*\\)/g, '')
      .replace(/::[\\w-]+/g, 'x')
      .replace(/:not\\(([^)]*)\\)/g, ' $1 ')
      .replace(/:is\\(([^)]*)\\)/g, ' $1 ')
      .replace(/:has\\(([^)]*)\\)/g, ' $1 ');
    var ids = (clean.match(/#[\\w-]+/g) || []).length;
    var classes = (clean.match(/\\.[\\w-]+|\\[[^\\]]+\\]|:[\\w-]+/g) || []).length;
    var stripped = clean
      .replace(/#[\\w-]+/g, ' ')
      .replace(/\\.[\\w-]+/g, ' ')
      .replace(/\\[[^\\]]+\\]/g, ' ')
      .replace(/:[\\w-]+/g, ' ');
    var elements = (stripped.match(/(^|[\\s>+~])([a-zA-Z][\\w-]*)/g) || []).length;
    return [ids, classes, elements];
  }

  function compareCandidate(a, b) {
    if (!a) return b;
    if (a.important !== b.important) return a.important ? a : b;
    for (var i = 0; i < 3; i++) {
      if (a.specificity[i] !== b.specificity[i]) return a.specificity[i] > b.specificity[i] ? a : b;
    }
    return a.order > b.order ? a : b;
  }

  function winnerFor(el, prop, rules) {
    var inline = el.style && el.style.getPropertyValue(prop);
    var winner = inline ? {
      source: 'inline-style',
      selector: 'style=""',
      value: inline,
      important: el.style.getPropertyPriority(prop) === 'important',
      specificity: [1, 0, 0],
      order: Number.MAX_SAFE_INTEGER
    } : null;
    for (var i = 0; i < rules.length; i++) {
      var item = rules[i];
      if (!item.rule || !item.rule.selectorText || !item.rule.style) continue;
      var declared = item.rule.style.getPropertyValue(prop);
      if (!declared) continue;
      try {
        if (!el.matches(item.rule.selectorText)) continue;
      } catch (_) {
        continue;
      }
      winner = compareCandidate(winner, {
        source: item.source,
        selector: item.rule.selectorText,
        value: declared,
        important: item.rule.style.getPropertyPriority(prop) === 'important',
        specificity: specificity(item.rule.selectorText),
        order: i
      });
    }
    return winner;
  }

  function sampleElements() {
    var selectors = [
      '#dialog-window',
      '.dialog.largedialog',
      '#tab-content',
      '.sheetform',
      '.charactersheet.charsheet',
      'h1',
      'h2',
      'label',
      'input',
      'input[type="text"]',
      'input[type="number"]',
      'input[type="checkbox"]',
      'select',
      'textarea',
      'button',
      'button[type="roll"]',
      'button[type="action"]',
      'table',
      'tr',
      'td',
      'th',
      'img',
      '[class*="sheet-"]'
    ];
    var seen = new Set();
    var elements = [];
    selectors.forEach(function (selector) {
      var el = document.querySelector(selector);
      if (el && el.closest && el.closest('#r20-cascade-diagnostic-panel')) return;
      if (el && !seen.has(el)) {
        seen.add(el);
        elements.push({ reason: selector, el: el });
      }
    });
    Array.prototype.slice.call(document.querySelectorAll('.charactersheet.charsheet *')).some(function (el) {
      if (elements.length >= 36) return true;
      if (el.closest && el.closest('#r20-cascade-diagnostic-panel')) return false;
      if (seen.has(el)) return false;
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 && rect.height <= 0) return false;
      seen.add(el);
      elements.push({ reason: 'visible-sample', el: el });
      return false;
    });
    return elements;
  }

  function run() {
    try {
      var rules = collectRules();
      var blockedSheets = rules.filter(function (item) { return item.blocked; });
      var entries = sampleElements().map(function (item) {
        var el = item.el;
        var computed = window.getComputedStyle(el);
        var rect = el.getBoundingClientRect();
        var winners = {};
        var sourceCounts = {};
        properties.forEach(function (prop) {
          var winner = winnerFor(el, prop, rules);
          var source = winner ? winner.source : 'browser-default-or-inherited';
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
          winners[prop] = {
            computed: computed.getPropertyValue(prop),
            source: source,
            selector: winner ? winner.selector : null,
            declared: winner ? winner.value : null,
            important: winner ? winner.important : false,
            specificity: winner ? winner.specificity : null
          };
        });
        return {
          reason: item.reason,
          selector: stableSelector(el),
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: String(el.className || ''),
          name: el.getAttribute('name') || '',
          type: el.getAttribute('type') || '',
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          sourceCounts: sourceCounts,
          winners: winners
        };
      });
      var totals = {};
      var appLikeHits = [];
      var userHits = [];
      var roll20Hits = [];
      entries.forEach(function (entry) {
        Object.keys(entry.sourceCounts).forEach(function (source) {
          totals[source] = (totals[source] || 0) + entry.sourceCounts[source];
        });
        Object.keys(entry.winners).forEach(function (prop) {
          var winner = entry.winners[prop];
          var hit = {
            element: entry.selector,
            reason: entry.reason,
            property: prop,
            source: winner.source,
            selector: winner.selector,
            computed: winner.computed
          };
          if (appLikeSources[winner.source]) appLikeHits.push(hit);
          if (userSources[winner.source]) userHits.push(hit);
          if (roll20Sources[winner.source]) roll20Hits.push(hit);
        });
      });
      var result = {
        fixtureId: fixtureId,
        status: 'computed',
        generatedAt: new Date().toISOString(),
        scope: 'standalone buildSheetDoc fixture HTML, not the live Next.js app shell',
        sampledElements: entries.length,
        sampledProperties: properties.length,
        styleSheetCount: document.styleSheets.length,
        blockedStyleSheets: blockedSheets,
        totals: totals,
        appLikeHitCount: appLikeHits.length,
        userCssHitCount: userHits.length,
        roll20HitCount: roll20Hits.length,
        appLikeHits: appLikeHits.slice(0, 80),
        userCssHits: userHits.slice(0, 80),
        roll20Hits: roll20Hits.slice(0, 80),
        elements: entries,
        note: 'app-preview-runtime/layer-filter/preview-hidden hits are expected only for preview wrappers, overlays, and hidden runtime nodes. They are suspicious when they win visible sheet element layout/typography properties.'
      };
      var out = document.querySelector('[data-testid="cascade-result"]');
      if (out) out.textContent = JSON.stringify(result, null, 2);
      window.__R20_CASCADE_DIAGNOSTIC__ = result;
    } catch (err) {
      fail(err && err.stack ? err.stack : err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
  } else {
    setTimeout(run, 0);
  }
}());
</script>`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${analyzer}\n</body>`);
  }
  return `${html}\n${analyzer}\n`;
}

if (!existsSync(renderRoot)) {
  console.error(`render root not found: ${renderRoot}`);
  process.exit(2);
}

const files = listRenderedFiles(renderRoot);
if (files.length === 0) {
  console.error(`no rendered fixture HTML files found in ${renderRoot}`);
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'html'), { recursive: true });

const entries = files.map((path) => {
  const fixtureId = basename(path, '.html');
  const html = readFileSync(path, 'utf8');
  const outHtml = join(outDir, 'html', `${fixtureId}.html`);
  writeFileSync(outHtml, injectAnalyzer(html, fixtureId), 'utf8');
  return {
    fixtureId,
    sourceHtml: path,
    pagePath: outHtml,
    sourceBytes: Buffer.byteLength(html),
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  renderRoot,
  outDir,
  count: entries.length,
  entries,
};

writeFileSync(join(outDir, 'cascade-leak-pages.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

const lines = [
  '# Cascade Leak Diagnostic Pages',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  'These pages are rendered fixture HTML with an injected browser-side cascade analyzer. Open a page in the browser and read `[data-testid="cascade-result"]` or `window.__R20_CASCADE_DIAGNOSTIC__`.',
  '',
  'Scope: standalone `buildSheetDoc` fixture output. This checks the preview document CSS stack and does not by itself prove the live Next.js app shell cannot leak into Shadow DOM edit mode.',
  '',
  `Page count: ${entries.length}`,
  '',
  '| Fixture | Source HTML bytes | Diagnostic page |',
  '| --- | ---: | --- |',
];
for (const entry of entries) {
  lines.push(`| \`${entry.fixtureId}\` | ${entry.sourceBytes} | \`${relative(process.cwd(), entry.pagePath)}\` |`);
}
lines.push('');
lines.push('Next check: open each page in Browser Use, collect the JSON result, and update `reports/cascade-leak/cascade-leak-results.md` with app-like/user/Roll20 winner counts.');

writeFileSync(join(outDir, 'cascade-leak-pages.md'), `${lines.join('\n')}\n`, 'utf8');

console.log(JSON.stringify({ count: entries.length, report: join(outDir, 'cascade-leak-pages.md') }));

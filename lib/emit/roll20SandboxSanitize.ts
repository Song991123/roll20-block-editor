/**
 * Roll20 Custom Sheet Sandbox sanitize/prefix approximation.
 *
 * Anchor: docs/spec/30_roll20_actual_sandbox_contract.md
 *
 * This is intentionally separate from `sanitizeForRoll20Legacy`. Legacy mode is
 * an optional compatibility transform; this module models the actual Roll20
 * sandbox HTML/CSS prefixing and allow-list behavior observed in Chrome.
 */

export type Roll20SandboxWarningCode =
  | 'css-mobile-stripped'
  | 'css-selector-prefixed'
  | 'css-chrome-selector-scoped'
  | 'css-url-proxied'
  | 'css-url-dropped'
  | 'css-rejected'
  | 'html-runtime-stripped'
  | 'html-tag-stripped'
  | 'html-class-prefixed'
  | 'html-url-proxied'
  | 'html-url-dropped';

export interface Roll20SandboxWarning {
  code: Roll20SandboxWarningCode;
  message: string;
  source?: string;
}

export interface Roll20SandboxCssResult {
  css: string;
  warnings: Roll20SandboxWarning[];
}

export interface Roll20SandboxHtmlResult {
  html: string;
  warnings: Roll20SandboxWarning[];
}

export interface Roll20SandboxHtmlOptions {
  /** Legacy Roll20 prefixes non-reserved class names; modern Roll20 preserves them. */
  prefixClasses?: boolean;
}

export interface Roll20SandboxCssOptions {
  /**
   * Older settings-preview evidence suggested selector prefixing. The later
   * actual character iframe probe showed uploaded CSS state selectors can remain
   * unprefixed while HTML classes are sheet-prefixed. Keep the old behavior as
   * the default for backwards-compatible diagnostics, and let actual-render
   * callers opt out explicitly.
   */
  prefixSelectors?: boolean;
}

const ROLL20_DIRECT_URL_PREFIXES = [
  'https://s3.amazonaws.com/files.d20.io',
  'https://files.d20.io',
  'https://app.roll20.net/images/',
];

const HTML_ALLOWED_TAGS = new Set([
  'br',
  'input',
  'textarea',
  'div',
  'span',
  'label',
  'hr',
  'img',
  'b',
  'i',
  'strong',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'table',
  'tr',
  'td',
  'tbody',
  'thead',
  'th',
  'tfoot',
  'select',
  'option',
  'optgroup',
  'fieldset',
  'button',
  'ul',
  'li',
  'ol',
  'caption',
]);

const CLASS_PREFIX_EXCEPTIONS = ['attr_', 'sheet-', 'repeating_', 'roll_', 'act_'];

export function sanitizeRoll20SandboxCss(
  css: string,
  options: Roll20SandboxCssOptions = {},
): Roll20SandboxCssResult {
  const prefixSelectors = options.prefixSelectors !== false;
  const warnings: Roll20SandboxWarning[] = [];
  let out = stripMobileCss(css, warnings);
  out = out.replace(/\/\*[\s\S]*?\*\//g, '');

  if (hasUnsafeCssToken(out)) {
    warnings.push({
      code: 'css-rejected',
      message: 'Roll20 sandbox would reject this CSS because unsafe tokens were detected.',
      source: shorten(out),
    });
    return { css: '', warnings };
  }

  out = out.replace(/url\s*\(([^)]+)\)/gi, (_full, rawUrl: string) => {
    const normalized = stripCssUrlQuotes(String(rawUrl).replace(/\s+/g, ''));
    const rewritten = rewriteRoll20Url(normalized, warnings, 'css');
    return rewritten ? `url("${rewritten}")` : '';
  });

  out = out.replace(/([^{]+){([^}]*)}/g, (full, selectorText: string, body: string) => {
    const selectors = selectorText.trim();
    if (!selectors) return full;
    const transformed = selectors
      .split(',')
      .map((selector) => (
        prefixSelectors
          ? prefixRoll20Selector(selector.trim(), warnings)
          : protectRoll20ChromeSelector(selector.trim(), warnings)
      ))
      .join(',');
    return full.replace(selectorText, transformed).replace(body, body);
  });

  return { css: out, warnings };
}

export function sanitizeRoll20SandboxHtml(
  html: string,
  options: Roll20SandboxHtmlOptions = {},
): Roll20SandboxHtmlResult {
  const prefixClasses = options.prefixClasses !== false;
  const warnings: Roll20SandboxWarning[] = [];
  let out = html;

  out = out.replace(/<script\b[\s\S]*?<\/script\s*>/gi, (source) => {
    warnings.push({
      code: 'html-runtime-stripped',
      message: 'Script content is not rendered in Roll20 sandbox sheet HTML.',
      source: shorten(source),
    });
    return '';
  });

  out = out.replace(/<rolltemplate\b[\s\S]*?<\/rolltemplate\s*>/gi, (source) => {
    warnings.push({
      code: 'html-runtime-stripped',
      message: 'Rolltemplate content is not rendered in Roll20 sandbox sheet HTML.',
      source: shorten(source),
    });
    return '';
  });

  out = out.replace(/<mobile\s*>[\s\S]*?<\/mobile\s*>|<\/?web\s*>|<\/?mobile\s*>/gi, '');

  out = out.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (source, rawTag: string, attrs = '') => {
    const tag = rawTag.toLowerCase();
    if (!HTML_ALLOWED_TAGS.has(tag)) {
      warnings.push({
        code: 'html-tag-stripped',
        message: `Tag <${tag}> is outside the observed Roll20 sandbox allow-list.`,
        source: shorten(source),
      });
      return '';
    }

    const rewrittenAttrs = String(attrs)
      .replace(/\sclass=(["'])(.*?)\1/gi, (_classSource, quote: string, classValue: string) => {
        const normalized = prefixClasses
          ? prefixRoll20ClassList(classValue, warnings)
          : classValue.split(/\s+/).filter(Boolean).join(' ');
        return ` class=${quote}${normalized}${quote}`;
      })
      .replace(/\s(src|href)=(["'])(.*?)\2/gi, (attrSource, attrName: string, quote: string, url: string) => {
        const rewritten = rewriteRoll20Url(url.trim(), warnings, 'html');
        return rewritten ? ` ${attrName}=${quote}${rewritten}${quote}` : '';
      });

    return source.replace(attrs, rewrittenAttrs);
  });

  return { html: out, warnings };
}

function stripMobileCss(css: string, warnings: Roll20SandboxWarning[]): string {
  return css.replace(/\/\*\s*start mobile\s*\*\/[\s\S]*?\/\*\s*end mobile\s*\*\//gi, (source) => {
    warnings.push({
      code: 'css-mobile-stripped',
      message: 'Roll20 sandbox removes CSS between start mobile and end mobile comments.',
      source: shorten(source),
    });
    return '';
  });
}

function hasUnsafeCssToken(css: string): boolean {
  return [
    /(\bdata:\b|eval|cookie|\bwindow\b|\bparent\b|\bthis\b)/i,
    /behaviou?r|expression|moz-binding|@charset|javascript|vbscript|[<]|\\\w/i,
    /@import (?!url\(['"]https:\/\/fonts\.googleapis\.com\/css\?family=)/i,
    /[\x7f-\xff]/,
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/,
    /&#/,
  ].some((re) => re.test(css));
}

function prefixRoll20Selector(selector: string, warnings: Roll20SandboxWarning[]): string {
  let s = selector;
  if (s.startsWith('#')) {
    s = `.${s.slice(1)}`;
  }
  if (
    s === '.charsheet' ||
    s.startsWith('.charsheet ') ||
    s === '@font-face' ||
    s.startsWith('.sheet-rolltemplate-') ||
    s.startsWith('@import ')
  ) {
    return s;
  }
  warnings.push({
    code: 'css-selector-prefixed',
    message: `Selector "${selector}" was prefixed with .charsheet.`,
    source: selector,
  });
  return `.charsheet ${s}`;
}

function protectRoll20ChromeSelector(selector: string, warnings: Roll20SandboxWarning[]): string {
  if (
    !selector ||
    selector.startsWith('@') ||
    selector === '.charsheet' ||
    selector.startsWith('.charsheet ') ||
    selector.startsWith('.sheet-rolltemplate-')
  ) {
    return selector;
  }
  if (!targetsRoll20Chrome(selector)) return selector;
  warnings.push({
    code: 'css-chrome-selector-scoped',
    message: `Selector "${selector}" was scoped away from Roll20 dialog chrome.`,
    source: selector,
  });
  return `.charsheet ${selector}`;
}

function targetsRoll20Chrome(selector: string): boolean {
  return [
    /(^|[\s>+~])\.ui-dialog(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.ui-widget(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.ui-widget-content(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.ui-corner-all(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.dialog(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.largedialog(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.characterviewer(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.tab-content(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])\.sheetform(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])#dialog-window(?=$|[\s.#:[>+~])/,
    /(^|[\s>+~])#tab-content(?=$|[\s.#:[>+~])/,
  ].some((re) => re.test(selector));
}

function prefixRoll20ClassList(classValue: string, warnings: Roll20SandboxWarning[]): string {
  return classValue
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (CLASS_PREFIX_EXCEPTIONS.some((prefix) => token.startsWith(prefix))) {
        return token;
      }
      warnings.push({
        code: 'html-class-prefixed',
        message: `Class "${token}" was prefixed with sheet-.`,
        source: token,
      });
      return `sheet-${token}`;
    })
    .join(' ');
}

function rewriteRoll20Url(
  url: string,
  warnings: Roll20SandboxWarning[],
  source: 'css' | 'html',
): string {
  const codePrefix = source === 'css' ? 'css' : 'html';
  const normalized = stripCssUrlQuotes(url);
  if (ROLL20_DIRECT_URL_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return normalized;
  }
  if (/^https?:\/\//i.test(normalized)) {
    warnings.push({
      code: `${codePrefix}-url-proxied` as Roll20SandboxWarningCode,
      message: `External URL "${normalized}" was proxied through Roll20 image proxy.`,
      source: normalized,
    });
    return `https://imgsrv.roll20.net/?src=${encodeURIComponent(normalized)}`;
  }
  warnings.push({
    code: `${codePrefix}-url-dropped` as Roll20SandboxWarningCode,
    message: `Non-http URL "${normalized}" was dropped.`,
    source: normalized,
  });
  return '';
}

function stripCssUrlQuotes(url: string): string {
  return url.replace(/^["']|["']$/g, '');
}

function shorten(s: string, max = 120): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}...` : trimmed;
}

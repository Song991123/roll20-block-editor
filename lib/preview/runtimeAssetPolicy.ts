import type { Roll20CompatibilityMode } from './renderContract';

const ROLL20_MANAGED_HOSTS = new Set([
  'app.roll20.net',
  'files.d20.io',
  'imgsrv.roll20.net',
]);

/**
 * Mirror the mode-specific HTML asset behavior measured in Roll20.
 * Modern proxies external image sources. Legacy preserves image sources but
 * proxies external URLs inside inline style declarations.
 */
export function applyRoll20RuntimeHtmlAssetPolicy(
  html: string,
  mode: Roll20CompatibilityMode,
): string {
  let runtimeHtml = html;

  if (mode === 'modern' && /<img\b/i.test(runtimeHtml)) {
    runtimeHtml = runtimeHtml.replace(/<img\b[^>]*>/gi, (imageTag) => (
      imageTag.replace(
        /(\ssrc\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
        (source, prefix: string, doubleQuoted: string | undefined, singleQuoted: string | undefined, bare: string | undefined) => {
          const value = decodeHtmlUrlEntities((doubleQuoted ?? singleQuoted ?? bare ?? '').trim());
          const proxied = proxyExternalRoll20AssetUrl(value);
          if (!proxied) return source;
          const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : '"';
          return `${prefix}${quote}${proxied}${quote}`;
        },
      )
    ));
  }

  if (mode === 'legacy' && /\sstyle\s*=/i.test(runtimeHtml)) {
    runtimeHtml = runtimeHtml.replace(
      /(\sstyle\s*=\s*)(["'])(.*?)\2/gi,
      (source, prefix: string, quote: string, value: string) => {
        const runtimeStyle = rewriteLegacyCssAssetUrls(value, quote === '"' ? "'" : '"', true);
        return runtimeStyle === value ? source : `${prefix}${quote}${runtimeStyle}${quote}`;
      },
    );
  }

  return runtimeHtml;
}

/**
 * Mirror the mode-specific CSS asset behavior measured in Roll20.
 * Legacy proxies external font and image URLs; modern preserves authored CSS.
 * Export payloads do not call this preview-only policy.
 */
export function applyRoll20RuntimeCssAssetPolicy(
  css: string,
  mode: Roll20CompatibilityMode,
): string {
  if (mode !== 'legacy' || !/url\s*\(/i.test(css)) return css;

  return rewriteLegacyCssAssetUrls(css, '"');
}

function rewriteLegacyCssAssetUrls(
  css: string,
  bareUrlQuote: '"' | "'",
  decodeHtmlEntities = false,
): string {
  return css.replace(
    /url\s*\(\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|((?:\\.|[^)])*))\s*\)/gi,
    (source, doubleQuoted: string | undefined, singleQuoted: string | undefined, bare: string | undefined) => {
      const rawValue = (doubleQuoted ?? singleQuoted ?? bare ?? '').trim();
      const value = decodeHtmlEntities ? decodeHtmlUrlEntities(rawValue) : rawValue;
      const proxied = proxyExternalRoll20AssetUrl(value);
      if (!proxied) return source;
      const quote = doubleQuoted !== undefined ? '"' : singleQuoted !== undefined ? "'" : bareUrlQuote;
      return `url(${quote}${proxied}${quote})`;
    },
  );
}

function decodeHtmlUrlEntities(value: string): string {
  return value.replace(/&(?:amp|#0*38|#x0*26);/gi, '&');
}

function proxyExternalRoll20AssetUrl(value: string): string | null {
  if (!/^https?:\/\//i.test(value) || isRoll20ManagedUrl(value)) return null;
  return `https://imgsrv.roll20.net/?src=${encodeProxySource(value)}`;
}

function encodeProxySource(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => (
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  ));
}

function isRoll20ManagedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (ROLL20_MANAGED_HOSTS.has(host)) return true;
    return host === 's3.amazonaws.com' && url.pathname.startsWith('/files.d20.io/');
  } catch {
    return false;
  }
}

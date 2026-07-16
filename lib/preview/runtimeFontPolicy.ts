import type { Roll20CompatibilityMode } from './renderContract';

/**
 * Mirror the mode-specific user-font URL behavior measured in Roll20.
 * Modern keeps the authored URL. Legacy routes external @font-face assets
 * through Roll20's image proxy, which can change font availability and layout.
 */
export function applyRoll20RuntimeFontUrlPolicy(
  css: string,
  mode: Roll20CompatibilityMode,
): string {
  if (mode !== 'legacy' || !/@font-face\b/i.test(css)) return css;

  return css.replace(/@font-face\s*\{[^{}]*\}/gi, (fontFace) => (
    fontFace.replace(
      /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi,
      (source, doubleQuoted: string | undefined, singleQuoted: string | undefined, bare: string | undefined) => {
        const normalized = (doubleQuoted ?? singleQuoted ?? bare ?? '').trim();
        if (
          !/^https?:\/\//i.test(normalized)
          || isRoll20ManagedFontUrl(normalized)
        ) {
          return source;
        }
        return `url("https://imgsrv.roll20.net/?src=${encodeProxySource(normalized)}")`;
      },
    )
  ));
}

function encodeProxySource(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => (
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  ));
}

function isRoll20ManagedFontUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === 'files.d20.io' || host === 'app.roll20.net' || host === 'imgsrv.roll20.net') {
      return true;
    }
    return host === 's3.amazonaws.com' && url.pathname.startsWith('/files.d20.io/');
  } catch {
    return false;
  }
}

export type AssetRefKind = 'external-url' | 'relative-url' | 'data-url';

export interface AssetRefSummary {
  ref: string;
  kind: AssetRefKind;
  host: string | null;
  roll20Proxy: boolean;
  imgurPage: boolean;
  placeholderRisk: boolean;
  proxySourceRef: string | null;
  replacementRefs: string[];
}

export interface AssetPreflight {
  totalRefs: number;
  externalRefs: number;
  relativeRefs: number;
  dataRefs: number;
  proxyLikeRefs: number;
  roll20ProxyRefs: number;
  imgurPageRefs: number;
  placeholderRiskRefs: number;
  hosts: string[];
  refs: AssetRefSummary[];
}

export interface AssetReplacementDraftOptions {
  sourceLabel?: string;
  limit?: number;
  targetPlaceholder?: string;
}

export function analyzeAssetRefs(html: string, css: string): AssetPreflight {
  const refs = Array.from(new Set([...extractCssUrls(css), ...extractHtmlAssetUrls(html)]));
  let externalRefs = 0;
  let relativeRefs = 0;
  let dataRefs = 0;
  let proxyLikeRefs = 0;
  let roll20ProxyRefs = 0;
  let imgurPageRefs = 0;
  let placeholderRiskRefs = 0;
  const hosts = new Set<string>();
  const refSummaries: AssetRefSummary[] = [];

  for (const ref of refs) {
    const normalized = normalizeAssetRef(ref);
    if (!normalized || normalized.startsWith('#')) continue;
    if (normalized.startsWith('data:')) {
      dataRefs += 1;
      refSummaries.push({
        ref: normalized,
        kind: 'data-url',
        host: null,
        roll20Proxy: false,
        imgurPage: false,
        placeholderRisk: false,
        proxySourceRef: null,
        replacementRefs: [],
      });
      continue;
    }
    const url = parseExternalUrl(normalized);
    if (url) {
      externalRefs += 1;
      const host = url.hostname.toLowerCase();
      hosts.add(host);
      const roll20Proxy = host === 'imgsrv.roll20.net';
      const proxySourceRef = roll20Proxy ? decodeRoll20ProxySource(url) : null;
      const imgurPage = isImgurPageUrl(url);
      if (/(\.|^)roll20\.net$/i.test(host) || /(\.|^)imgur\.com$/i.test(host)) {
        proxyLikeRefs += 1;
      }
      if (roll20Proxy) roll20ProxyRefs += 1;
      if (imgurPage) imgurPageRefs += 1;
      if (roll20Proxy || imgurPage) placeholderRiskRefs += 1;
      refSummaries.push({
        ref: normalized,
        kind: 'external-url',
        host,
        roll20Proxy,
        imgurPage,
        placeholderRisk: roll20Proxy || imgurPage,
        proxySourceRef,
        replacementRefs: uniqueNonEmpty([normalized, proxySourceRef]),
      });
      continue;
    }
    if (!/^(?:javascript|mailto|tel|blob):/i.test(normalized)) {
      relativeRefs += 1;
      refSummaries.push({
        ref: normalized,
        kind: 'relative-url',
        host: null,
        roll20Proxy: false,
        imgurPage: false,
        placeholderRisk: false,
        proxySourceRef: null,
        replacementRefs: [normalized],
      });
    }
  }

  return {
    totalRefs: externalRefs + relativeRefs + dataRefs,
    externalRefs,
    relativeRefs,
    dataRefs,
    proxyLikeRefs,
    roll20ProxyRefs,
    imgurPageRefs,
    placeholderRiskRefs,
    hosts: Array.from(hosts).sort(),
    refs: refSummaries,
  };
}

export function buildAssetReplacementDraft(
  result: AssetPreflight,
  options: AssetReplacementDraftOptions = {},
): string {
  const limit = Math.max(1, Math.floor(options.limit ?? 50));
  const targetPlaceholder = options.targetPlaceholder ?? '<paste-user-owned-https-url-here>';
  const sourceLabel = options.sourceLabel ?? 'asset preflight';
  const refs = result.refs.flatMap((ref) => {
    if (ref.kind === 'data-url') return [];
    const reason = ref.placeholderRisk
      ? 'placeholder-risk'
      : ref.kind === 'relative-url'
        ? 'relative-path'
        : 'external-url';
    return (ref.replacementRefs.length ? ref.replacementRefs : [ref.ref]).map((candidate) => ({
      candidate,
      reason: candidate === ref.proxySourceRef ? `${reason}:proxy-source` : reason,
    }));
  });
  const uniqueRefs = Array.from(
    new Map(refs.map((item) => [item.candidate, item])).values(),
  );
  if (uniqueRefs.length === 0) return '';
  const lines = [
    `# Asset replacement draft from ${sourceLabel}.`,
    `# Replace ${targetPlaceholder} with a user-owned http(s) URL that Roll20 can fetch.`,
    '# Remove the leading "# " after filling each URL.',
  ];
  for (const item of uniqueRefs.slice(0, limit)) {
    lines.push(`# ${item.candidate} => ${targetPlaceholder} # ${item.reason}`);
  }
  if (uniqueRefs.length > limit) {
    lines.push(`# ... ${uniqueRefs.length - limit} more refs omitted from this draft.`);
  }
  return lines.join('\n');
}

function extractCssUrls(css: string): string[] {
  const refs: string[] = [];
  const re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]+))\s*\)/gi;
  for (const match of css.matchAll(re)) {
    refs.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return refs;
}

function extractHtmlAssetUrls(html: string): string[] {
  const refs: string[] = [];
  const re = /\b(?:src|href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(re)) {
    refs.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return refs;
}

function normalizeAssetRef(ref: string): string {
  return ref.trim().replace(/^['"]|['"]$/g, '').replaceAll('&amp;', '&');
}

function parseExternalUrl(ref: string): URL | null {
  try {
    if (ref.startsWith('//')) return new URL(`https:${ref}`);
    if (/^https?:\/\//i.test(ref)) return new URL(ref);
  } catch {}
  return null;
}

function isImgurPageUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host !== 'imgur.com' && host !== 'www.imgur.com') return false;
  return !/\.(?:png|jpe?g|gif|webp)(?:$|[?#])/i.test(url.pathname);
}

function decodeRoll20ProxySource(url: URL): string | null {
  const src = url.searchParams.get('src');
  return src ? normalizeAssetRef(src) : null;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
}

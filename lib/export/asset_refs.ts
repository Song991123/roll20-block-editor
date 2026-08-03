import { analyzeCssImportReferences } from '@/lib/validation/legacyCssAssets';

export type AssetRefKind = 'external-url' | 'relative-url' | 'data-url';

export interface AssetRefSummary {
  ref: string;
  kind: AssetRefKind;
  host: string | null;
  insecureHttp: boolean;
  roll20Proxy: boolean;
  imgurPage: boolean;
  imgurDirectCandidate: boolean;
  placeholderRisk: boolean;
  proxySourceRef: string | null;
  canonicalDirectRef: string | null;
  canonicalReason: string | null;
  replacementRefs: string[];
}

export interface AssetPreflight {
  totalRefs: number;
  externalRefs: number;
  relativeRefs: number;
  dataRefs: number;
  proxyLikeRefs: number;
  insecureHttpRefs: number;
  roll20ProxyRefs: number;
  imgurPageRefs: number;
  imgurDirectCandidateRefs: number;
  canonicalDirectRefs: number;
  placeholderRiskRefs: number;
  cssImportRefs: number;
  fontFileRefs: number;
  legacyGoogleFontImports: number;
  legacyRestrictedCssRefs: number;
  hosts: string[];
  refs: AssetRefSummary[];
}

export interface AssetReplacementDraftOptions {
  sourceLabel?: string;
  limit?: number;
  targetPlaceholder?: string;
}

export function analyzeAssetRefs(html: string, css: string): AssetPreflight {
  const cssImports = analyzeCssImportReferences(css);
  const cssImportRefs = uniqueNonEmpty(cssImports.map((item) => item.ref));
  const fontFileRefs = uniqueNonEmpty(extractFontFaceUrls(css));
  const legacyRestrictedCssRefs = uniqueNonEmpty([
    ...fontFileRefs,
    ...cssImports
      .filter((item) => !item.legacyGoogleFont)
      .map((item) => item.ref),
  ]);
  const refs = Array.from(new Set([
    ...extractCssUrls(css),
    ...cssImportRefs,
    ...extractHtmlAssetUrls(html),
  ]));
  let externalRefs = 0;
  let relativeRefs = 0;
  let dataRefs = 0;
  let proxyLikeRefs = 0;
  let insecureHttpRefs = 0;
  let roll20ProxyRefs = 0;
  let imgurPageRefs = 0;
  let imgurDirectCandidateRefs = 0;
  let canonicalDirectRefs = 0;
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
        insecureHttp: false,
        roll20Proxy: false,
        imgurPage: false,
        imgurDirectCandidate: false,
        placeholderRisk: false,
        proxySourceRef: null,
        canonicalDirectRef: null,
        canonicalReason: null,
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
      const canonical = getCanonicalDirectAssetRef(normalized, url, proxySourceRef);
      const insecureHttp = url.protocol === 'http:';
      const imgurDirectCandidate = canonical?.reason === 'imgur-direct-image' || canonical?.reason === 'roll20-proxy-imgur-direct-image';
      if (/(\.|^)roll20\.net$/i.test(host) || /(\.|^)imgur\.com$/i.test(host)) {
        proxyLikeRefs += 1;
      }
      if (insecureHttp) insecureHttpRefs += 1;
      if (roll20Proxy) roll20ProxyRefs += 1;
      if (imgurPage) imgurPageRefs += 1;
      if (imgurDirectCandidate) imgurDirectCandidateRefs += 1;
      if (canonical) canonicalDirectRefs += 1;
      if (roll20Proxy || imgurPage) placeholderRiskRefs += 1;
      refSummaries.push({
        ref: normalized,
        kind: 'external-url',
        host,
        insecureHttp,
        roll20Proxy,
        imgurPage,
        imgurDirectCandidate,
        placeholderRisk: roll20Proxy || imgurPage,
        proxySourceRef,
        canonicalDirectRef: canonical?.ref ?? null,
        canonicalReason: canonical?.reason ?? null,
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
        insecureHttp: false,
        roll20Proxy: false,
        imgurPage: false,
        imgurDirectCandidate: false,
        placeholderRisk: false,
        proxySourceRef: null,
        canonicalDirectRef: null,
        canonicalReason: null,
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
    insecureHttpRefs,
    roll20ProxyRefs,
    imgurPageRefs,
    imgurDirectCandidateRefs,
    canonicalDirectRefs,
    placeholderRiskRefs,
    cssImportRefs: cssImportRefs.length,
    fontFileRefs: fontFileRefs.length,
    legacyGoogleFontImports: cssImports.filter((item) => item.legacyGoogleFont).length,
    legacyRestrictedCssRefs: legacyRestrictedCssRefs.length,
    hosts: Array.from(hosts).sort(),
    refs: refSummaries,
  };
}

export function buildAssetReplacementDraft(
  result: AssetPreflight,
  options: AssetReplacementDraftOptions = {},
): string {
  const limit = Math.max(1, Math.floor(options.limit ?? 50));
  const targetPlaceholder = options.targetPlaceholder ?? '<여기에-사용자-소유-HTTPS-주소-입력>';
  const sourceLabel = options.sourceLabel ?? '자산 점검';
  const refs = result.refs.flatMap((ref) => {
    if (ref.kind === 'data-url') return [];
    const reason = ref.placeholderRisk
      ? '원본이 사라질 수 있음'
      : ref.kind === 'relative-url'
        ? 'Roll20에서 찾을 수 없는 상대 경로'
        : ref.insecureHttp
          ? '보안 연결 아님'
        : '외부 주소';
    const sourceRules = (ref.replacementRefs.length ? ref.replacementRefs : [ref.ref]).map((candidate) => ({
      candidate,
      target: targetPlaceholder,
      reason: candidate === ref.proxySourceRef ? `${reason} · 원본 주소` : reason,
    }));
    if (!ref.canonicalDirectRef || ref.canonicalDirectRef === ref.ref) return sourceRules;
    return [
      ...sourceRules,
      {
        candidate: ref.ref,
        target: ref.canonicalDirectRef,
        reason: `${describeCanonicalReason(ref.canonicalReason)} · 권한 확인 필요`,
      },
    ];
  });
  const uniqueRefs = Array.from(
    new Map(refs.map((item) => [`${item.candidate}\u0000${item.target}`, item])).values(),
  );
  if (uniqueRefs.length === 0) return '';
  const lines = [
    `# 자산 주소 교체 초안: ${sourceLabel}.`,
    `# ${targetPlaceholder} 부분을 사용자가 소유하고 Roll20에서 불러올 수 있는 HTTPS 주소로 바꾸세요.`,
    '# 주소를 채운 뒤 줄 앞의 "# "를 지우면 적용됩니다.',
  ];
  for (const item of uniqueRefs.slice(0, limit)) {
    lines.push(`# ${item.candidate} => ${item.target} # ${item.reason}`);
  }
  if (uniqueRefs.length > limit) {
    lines.push(`# ... 나머지 ${uniqueRefs.length - limit}개 주소는 초안에서 생략했습니다.`);
  }
  return lines.join('\n');
}

function describeCanonicalReason(reason: string | null): string {
  if (reason?.includes('imgur')) return 'Imgur 바로 열기 후보';
  if (reason?.includes('https') || reason === 'protocol-relative-https') return 'HTTPS 주소 후보';
  return '바로 열기 후보';
}

function extractCssUrls(css: string): string[] {
  const refs: string[] = [];
  const re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]+))\s*\)/gi;
  for (const match of css.matchAll(re)) {
    refs.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return refs;
}

function extractFontFaceUrls(css: string): string[] {
  const refs: string[] = [];
  for (const match of css.matchAll(/@font-face\s*\{([\s\S]*?)\}/gi)) {
    refs.push(...extractCssUrls(match[1] ?? ''));
  }
  return refs;
}

function extractHtmlAssetUrls(html: string): string[] {
  const refs: string[] = [];
  const re = /\b(?:src|href|xlink:href|poster|imagesrc|data-src|data-original|data-background|data-background-image)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(re)) {
    refs.push(match[1] ?? match[2] ?? match[3] ?? '');
  }

  const srcsetRe = /\b(?:srcset|imagesrcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(srcsetRe)) {
    refs.push(...extractSrcsetUrls(match[1] ?? match[2] ?? match[3] ?? ''));
  }

  const inlineStyleRe = /\bstyle\s*=\s*("|')(.*?)\1/gi;
  for (const match of html.matchAll(inlineStyleRe)) {
    refs.push(...extractCssUrls(match[2] ?? ''));
  }

  return refs;
}

function extractSrcsetUrls(value: string): string[] {
  return value
    .split(/\s*,\s*(?=(?:(?:https?:)?\/\/|\/|\.\.?\/|data:|[^\s,]+\s))/i)
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean);
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
  return !isImagePath(url.pathname);
}

function decodeRoll20ProxySource(url: URL): string | null {
  const src = url.searchParams.get('src');
  return src ? normalizeAssetRef(src) : null;
}

function getCanonicalDirectAssetRef(
  ref: string,
  url: URL,
  proxySourceRef: string | null,
): { ref: string; reason: string } | null {
  if (proxySourceRef) {
    const proxySourceUrl = parseExternalUrl(proxySourceRef);
    const sourceCanonical = proxySourceUrl
      ? getCanonicalDirectAssetRef(proxySourceRef, proxySourceUrl, null)
      : null;
    return sourceCanonical
      ? {
          ref: sourceCanonical.ref,
          reason: sourceCanonical.reason === 'imgur-direct-image'
            ? 'roll20-proxy-imgur-direct-image'
            : `roll20-proxy-${sourceCanonical.reason}`,
        }
      : null;
  }

  const host = url.hostname.toLowerCase();
  if ((host === 'imgur.com' || host === 'www.imgur.com') && isImagePath(url.pathname)) {
    return {
      ref: `https://i.imgur.com${url.pathname}${url.search}`,
      reason: 'imgur-direct-image',
    };
  }

  if (url.protocol === 'http:') {
    const upgraded = new URL(url.toString());
    upgraded.protocol = 'https:';
    return {
      ref: upgraded.toString(),
      reason: host === 'i.imgur.com' ? 'imgur-https-upgrade' : 'https-upgrade',
    };
  }

  if (ref.startsWith('//')) {
    return {
      ref: `https:${ref}`,
      reason: 'protocol-relative-https',
    };
  }

  return null;
}

function isImagePath(pathname: string): boolean {
  return /\.(?:png|jpe?g|gif|webp)(?:$|[?#])/i.test(pathname);
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)));
}

import type { ManagedDesignDeclarations } from './designPosition';

export const BACKGROUND_IMAGE_SIZES = ['auto', 'cover', 'contain', '100% 100%'] as const;
export const BACKGROUND_IMAGE_REPEATS = ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'] as const;
export const BACKGROUND_IMAGE_POSITIONS = [
  'left top',
  'center top',
  'right top',
  'left center',
  'center center',
  'right center',
  'left bottom',
  'center bottom',
  'right bottom',
] as const;

export type BackgroundImageSize = (typeof BACKGROUND_IMAGE_SIZES)[number];
export type BackgroundImageRepeat = (typeof BACKGROUND_IMAGE_REPEATS)[number];
export type BackgroundImagePosition = (typeof BACKGROUND_IMAGE_POSITIONS)[number];

export type BackgroundImageSource = {
  kind: 'empty' | 'remote' | 'complex';
  url: string;
  insecureHttp: boolean;
};

export type BackgroundImageUrlResult = {
  url: string | null;
  error: string | null;
  insecureHttp: boolean;
};

const SIMPLE_URL_PATTERN = /^\s*url\(\s*(?:(['"])([\s\S]*?)\1|([^'"\s][^)]*?))\s*\)\s*$/i;

/** Read only the single remote URL form managed by the visual editor. */
export function readBackgroundImageSource(value?: string): BackgroundImageSource {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'none') {
    return { kind: 'empty', url: '', insecureHttp: false };
  }

  const match = raw.match(SIMPLE_URL_PATTERN);
  if (!match) return { kind: 'complex', url: '', insecureHttp: false };
  const candidate = decodeCssUrl(match[2] ?? match[3] ?? '').trim();
  const normalized = normalizeBackgroundImageUrl(candidate);
  if (!normalized.url || normalized.error) {
    return { kind: 'complex', url: '', insecureHttp: false };
  }
  return {
    kind: 'remote',
    url: normalized.url,
    insecureHttp: normalized.insecureHttp,
  };
}

/**
 * New visual-editor assets must be reachable by Roll20. Imported CSS stays
 * lossless elsewhere, but this authoring control rejects local and executable
 * schemes instead of creating a preview-only result.
 */
export function normalizeBackgroundImageUrl(value: string): BackgroundImageUrlResult {
  const raw = value.trim();
  if (!raw) return { url: null, error: null, insecureHttp: false };
  if (/[\r\n\0]/.test(raw)) {
    return { url: null, error: '한 줄짜리 웹 이미지 주소를 입력해 주세요.', insecureHttp: false };
  }

  const candidate = raw.startsWith('//') ? `https:${raw}` : raw;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { url: null, error: 'https:// 또는 http://로 시작하는 이미지 주소를 입력해 주세요.', insecureHttp: false };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { url: null, error: '웹 이미지 주소만 사용할 수 있어요.', insecureHttp: false };
  }
  if (parsed.username || parsed.password) {
    return { url: null, error: '로그인 정보가 포함된 주소는 사용할 수 없어요.', insecureHttp: false };
  }

  return {
    url: parsed.href,
    error: null,
    insecureHttp: parsed.protocol === 'http:',
  };
}

export function backgroundImageUrlPatch(
  value: string,
  current: Record<string, string>,
): { declarations: ManagedDesignDeclarations | null; result: BackgroundImageUrlResult } {
  const result = normalizeBackgroundImageUrl(value);
  if (result.error) return { declarations: null, result };
  if (!result.url) {
    return {
      result,
      declarations: {
        'background-image': null,
        'background-size': null,
        'background-position': null,
        'background-repeat': null,
      },
    };
  }

  return {
    result,
    declarations: {
      'background-image': `url("${escapeCssUrl(result.url)}")`,
      ...(!current['background-size'] ? { 'background-size': 'cover' } : {}),
      ...(!current['background-position'] ? { 'background-position': 'center center' } : {}),
      ...(!current['background-repeat'] ? { 'background-repeat': 'no-repeat' } : {}),
    },
  };
}

function decodeCssUrl(value: string): string {
  return value.replace(/\\([\\'"])/g, '$1');
}

function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

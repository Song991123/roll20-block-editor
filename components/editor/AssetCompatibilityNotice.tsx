import { AlertTriangle } from 'lucide-react';
import type { AssetPreflight } from '@/lib/export/asset_refs';

export function AssetCompatibilityNotice({
  result,
  legacyMode,
}: {
  result: AssetPreflight;
  legacyMode: boolean;
}) {
  if (!legacyMode || result.legacyRestrictedCssRefs === 0) return null;

  return (
    <div
      className="mt-3 flex items-start gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs leading-relaxed text-foreground"
      data-testid="legacy-asset-compatibility"
      data-restricted-count={result.legacyRestrictedCssRefs}
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-[var(--warning)]"
        aria-hidden
      />
      <div>
        <div className="font-semibold">구버전에서는 일부 글꼴이 빠질 수 있어요</div>
        <p className="mt-0.5 text-muted-foreground">
          외부 글꼴 파일이나 스타일 불러오기 {result.legacyRestrictedCssRefs}개가 구버전 Roll20에서
          제한될 수 있습니다. Google Fonts의 구버전 지원 형식으로 바꾸거나 기본 글꼴을 함께
          지정한 뒤 전용 테스트 방에서 확인하세요.
        </p>
        {result.legacyGoogleFontImports > 0 ? (
          <p className="mt-1 text-muted-foreground" data-testid="legacy-google-font-count">
            구버전 지원 형식의 Google Fonts {result.legacyGoogleFontImports}개는 따로 구분했습니다.
          </p>
        ) : null}
      </div>
    </div>
  );
}

'use client';

/**
 * SfxToggle — 효과음 on/off 토글 (statusbar 우측 끝).
 *
 * Anchor:
 *   - lib/sfx/player.ts (playSfx)
 *   - lib/stores/uiStore.ts (sfxEnabled / toggleSfxEnabled)
 *
 * 동작:
 *   - 클릭 = sfxEnabled flip → localStorage 자동 persist (zustand persist).
 *   - 켜는 순간 'toast.info' 1회 재생 → 사용자가 실제 들리는지 확인.
 *   - aria-pressed 로 스크린리더 상태 노출.
 */

import { Volume2, VolumeX } from 'lucide-react';
import { useUiStore } from '@/lib/stores/uiStore';
import { playSfx } from '@/lib/sfx';

export default function SfxToggle() {
  const enabled = useUiStore((s) => s.sfxEnabled);
  const toggle = useUiStore((s) => s.toggleSfxEnabled);

  const handleClick = () => {
    // 먼저 store flip — 그 다음 가청 확인음.
    // 끄는 경우는 음 안 남 (어차피 disabled).
    toggle();
    // toggle 후 state 가 즉시 update — getState() 가 최신.
    if (!enabled) {
      // enabled 가 방금 false → true 가 됐음 (closure 안의 enabled 는 토글 전 값).
      playSfx('toast.info');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={enabled}
      aria-label={enabled ? '효과음 끄기' : '효과음 켜기'}
      title={enabled ? '효과음 켜짐 — 클릭하여 끄기' : '효과음 꺼짐 — 클릭하여 켜기'}
      data-testid="sfx-toggle"
      className="inline-flex h-5 w-5 items-center justify-center rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-[var(--bg-hover)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {enabled ? (
        <Volume2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <VolumeX className="h-3.5 w-3.5 opacity-60" aria-hidden />
      )}
    </button>
  );
}

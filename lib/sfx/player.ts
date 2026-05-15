/**
 * SFX 공개 API — `playSfx('block.add')` 한 줄로 인터랙션 site 에서 호출.
 *
 * 책임:
 *   1. uiStore 의 sfxEnabled / sfxVolume 읽어서 gating.
 *   2. SfxEvent → SFX_PRESETS lookup.
 *   3. 단일 preset / 시퀀스 모두 처리 (시퀀스는 SEQUENCE_STAGGER_MS 간격).
 *   4. 어떤 에러가 나도 silent — UI 흐름 절대 방해 X.
 *
 * SSR safety: useUiStore.getState() 는 SSR 에서도 동작 (Zustand 의 in-memory state).
 *   AudioContext 만 client-only — synth.ts 가 window 체크.
 */
import { useUiStore } from '@/lib/stores/uiStore';
import { SFX_PRESETS, SEQUENCE_STAGGER_MS } from './registry';
import { playPreset, ensureRunning } from './synth';
import type { SfxEvent } from './types';

/**
 * 효과음 1회 재생.
 *
 * 호출 위치는 가능한 한 user gesture handler 안 (onClick / onDrop 등) —
 * AudioContext autoplay-policy 가 거기서 resume 됨.
 *
 * 예:
 *   ```ts
 *   const handleAdd = () => {
 *     const id = appendBlock(type);
 *     if (id) playSfx('block.add'); else playSfx('toast.error');
 *   };
 *   ```
 */
export function playSfx(event: SfxEvent): void {
  try {
    const state = useUiStore.getState();
    if (!state.sfxEnabled) return;
    const vol = state.sfxVolume;
    if (vol <= 0) return;

    const preset = SFX_PRESETS[event];
    if (!preset) return;

    ensureRunning();

    if (Array.isArray(preset)) {
      preset.forEach((p, i) => {
        playPreset(p, vol, (i * SEQUENCE_STAGGER_MS) / 1000);
      });
    } else {
      playPreset(preset, vol, 0);
    }
  } catch {
    /* silent — SFX 가 fail 해도 인터랙션은 진행 */
  }
}

/**
 * AudioContext 를 warm-start.
 * 헤더 마운트 시 호출하면 첫 클릭 latency 가 줄어듦.
 * AudioContext 생성만 — resume 은 user gesture 안에서 됨.
 */
export function preloadSfx(): void {
  try {
    // playSfx 와 동일하게 ensureRunning 만 호출.
    // 음 안 남 (preset 안 줌).
    ensureRunning();
  } catch {
    /* silent */
  }
}

export type { SfxEvent } from './types';

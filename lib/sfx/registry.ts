/**
 * SFX 레지스트리 — 이벤트 이름 ↔ 합성 프리셋.
 *
 * 모든 사운드는 빠르고 짧음 (40~250ms) — UI feedback 용이라 길게 끌면 거슬림.
 * 음역대 분리:
 *   - 블록 추가/snap: 중고음 click (1.2~2k Hz).
 *   - 굴림: dice-rattle 느낌 (sweep + noise).
 *   - 저장 성공: 상승 2-tone (펑샹 jingle).
 *   - 에러: 하강 buzz (저음).
 */
import type { SfxEvent, SoundPreset } from './types';

export const SFX_PRESETS: Record<SfxEvent, SoundPreset | SoundPreset[]> = {
  'block.add': {
    osc: 'triangle',
    freq: 880,
    pitchEndHz: 1320,
    durMs: 90,
    attackMs: 5,
    releaseMs: 70,
    gain: 0.18,
  },

  'block.delete': {
    osc: 'sawtooth',
    freq: 440,
    pitchEndHz: 180,
    durMs: 140,
    attackMs: 4,
    releaseMs: 110,
    gain: 0.16,
    lowpassHz: 1800,
  },

  'block.snap': {
    osc: 'square',
    freq: 1760,
    durMs: 50,
    attackMs: 2,
    releaseMs: 40,
    gain: 0.12,
  },

  // 굴림: 짧은 noise (dice tumble) + sine pop (resolution).
  'roll.click': [
    {
      freq: 0,
      durMs: 120,
      attackMs: 5,
      releaseMs: 90,
      gain: 0.14,
      noise: true,
      lowpassHz: 2400,
    },
    {
      osc: 'sine',
      freq: 660,
      pitchEndHz: 990,
      durMs: 120,
      attackMs: 8,
      releaseMs: 95,
      gain: 0.16,
    },
  ],

  // 크리티컬: 3-tone 상승 fanfare.
  'roll.crit': [
    { osc: 'triangle', freq: 880, durMs: 80, attackMs: 4, releaseMs: 60, gain: 0.18 },
    { osc: 'triangle', freq: 1108, durMs: 90, attackMs: 4, releaseMs: 70, gain: 0.18 },
    { osc: 'triangle', freq: 1318, durMs: 160, attackMs: 4, releaseMs: 140, gain: 0.2 },
  ],

  // 펌블: 하강 2-tone (sad horn).
  'roll.fumble': [
    { osc: 'sawtooth', freq: 330, durMs: 140, attackMs: 5, releaseMs: 110, gain: 0.18, lowpassHz: 1200 },
    { osc: 'sawtooth', freq: 220, durMs: 200, attackMs: 5, releaseMs: 170, gain: 0.18, lowpassHz: 1000 },
  ],

  // 저장 성공: 상승 2-tone jingle.
  'save.success': [
    { osc: 'sine', freq: 880, durMs: 90, attackMs: 5, releaseMs: 70, gain: 0.18 },
    { osc: 'sine', freq: 1320, durMs: 140, attackMs: 5, releaseMs: 120, gain: 0.18 },
  ],

  'toast.error': {
    osc: 'square',
    freq: 220,
    pitchEndHz: 140,
    durMs: 180,
    attackMs: 3,
    releaseMs: 140,
    gain: 0.16,
    lowpassHz: 900,
  },

  'toast.info': {
    osc: 'sine',
    freq: 660,
    durMs: 70,
    attackMs: 3,
    releaseMs: 55,
    gain: 0.12,
  },
};

/**
 * 2-tone / 3-tone 시퀀스 사이 stagger (ms).
 * 각 step 의 offset = index * SEQUENCE_STAGGER_MS.
 */
export const SEQUENCE_STAGGER_MS = 70;

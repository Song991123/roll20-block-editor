/**
 * SFX 타입 — 효과음 이름 / 합성 파라미터 / 토글 상태.
 *
 * Anchor: docs/spec/10_system_architecture.md (UI store family 확장).
 *
 * 모든 효과음은 Web Audio API 로 런타임 합성 — 번들 안에 음원 파일 0개.
 * 저작권 issue 없음, autoplay-policy 안전 (첫 user gesture 후 AudioContext 생성).
 */

/**
 * 효과음 이벤트 이름. 인터랙션 → SFX 매핑은 registry.ts.
 * 새 이벤트 추가 시 SfxEvent union + SFX_PRESETS 양쪽 모두 업데이트.
 */
export type SfxEvent =
  | 'block.add'
  | 'block.delete'
  | 'block.snap'
  | 'roll.click'
  | 'roll.crit'
  | 'roll.fumble'
  | 'save.success'
  | 'toast.error'
  | 'toast.info';

/**
 * 1회 사운드 합성에 필요한 파라미터.
 *
 * - osc:  주 오실레이터 (square / sine / triangle / sawtooth) — 음색 결정.
 * - freq: 시작 주파수 (Hz). pitchEnd 가 있으면 그 값까지 선형 sweep.
 * - durMs: 전체 길이 (ms). attack + sustain + release 의 합.
 * - attackMs / releaseMs: ADSR 의 atk / rel (sustain 은 durMs - atk - rel).
 * - gain: 피크 게인 (0..1). uiStore.sfxVolume 와 곱.
 * - pitchEndHz?: 있으면 freq → pitchEndHz 로 sweep.
 * - lowpassHz?: 있으면 BiquadFilterNode (lowpass) 통과.
 * - noise?: true 면 oscillator 대신 white noise buffer.
 */
export interface SoundPreset {
  osc?: OscillatorType;
  freq: number;
  durMs: number;
  attackMs: number;
  releaseMs: number;
  gain: number;
  pitchEndHz?: number;
  lowpassHz?: number;
  noise?: boolean;
}

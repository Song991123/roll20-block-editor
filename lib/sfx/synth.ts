/**
 * Web Audio 합성 엔진 — Oscillator + ADSR + optional pitch sweep + lowpass.
 *
 * AudioContext 는 lazy singleton.
 * Chrome autoplay-policy: AudioContext 는 첫 user gesture 까지 'suspended'.
 *   ensureRunning() 가 resume() 호출. 호출하는 쪽 (예: button onClick) 이
 *   user gesture 안에서 호출하면 OK.
 *
 * SSR safety: getContext() 가 window 체크 — 서버에서 호출되면 null 반환.
 */
import type { SoundPreset } from './types';

let _ctx: AudioContext | null = null;
let _noiseBuffer: AudioBuffer | null = null;

/**
 * AudioContext 가져오기 (lazy). 서버 / 미지원 브라우저면 null.
 */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_ctx) return _ctx;
  const W = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  try {
    _ctx = new Ctor();
  } catch {
    return null;
  }
  return _ctx;
}

/**
 * AudioContext 가 suspended 면 resume.
 * 첫 user gesture 이후에 호출하면 OK.
 * Promise 를 await 하지 않아도 됨 (fire-and-forget) — 다음 frame 에 적용.
 */
export function ensureRunning(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {
      /* 사용자가 아직 interact 안 함 — silent fail OK */
    });
  }
}

/**
 * 1 회용 white-noise buffer (0.5s).
 * dice-tumble / drop / scratch 사운드 base.
 */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate) {
    return _noiseBuffer;
  }
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * 0.5);
  const buf = ctx.createBuffer(1, length, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  _noiseBuffer = buf;
  return buf;
}

/**
 * 단일 SoundPreset 을 합성/재생.
 *
 * - masterGain: uiStore 의 sfxVolume (0..1). preset.gain 과 곱.
 * - offsetSec: AudioContext.currentTime 기준 + offsetSec 에서 시작.
 *
 * 각 노드는 한 번 연결하고 stop 후 disconnect — leak 없음.
 */
export function playPreset(
  preset: SoundPreset,
  masterGain: number,
  offsetSec = 0,
): void {
  const ctx = getContext();
  if (!ctx) return;
  ensureRunning();

  const startAt = ctx.currentTime + Math.max(0, offsetSec);
  const dur = preset.durMs / 1000;
  const atk = Math.max(0.002, preset.attackMs / 1000);
  const rel = Math.max(0.002, preset.releaseMs / 1000);
  const peak = Math.max(0, Math.min(1, masterGain)) * preset.gain;

  // Source: oscillator OR noise buffer.
  let source: AudioScheduledSourceNode;
  if (preset.noise) {
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    source = noise;
  } else {
    const osc = ctx.createOscillator();
    osc.type = preset.osc ?? 'sine';
    osc.frequency.setValueAtTime(preset.freq, startAt);
    if (preset.pitchEndHz !== undefined) {
      osc.frequency.linearRampToValueAtTime(preset.pitchEndHz, startAt + dur);
    }
    source = osc;
  }

  // Optional lowpass filter.
  let lastNode: AudioNode = source;
  if (preset.lowpassHz !== undefined) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = preset.lowpassHz;
    source.connect(lp);
    lastNode = lp;
  }

  // ADSR envelope.
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(peak, startAt + atk);
  // sustain at peak — sustain time = dur - atk - rel (>=0).
  const sustainEnd = startAt + Math.max(atk, dur - rel);
  gainNode.gain.setValueAtTime(peak, sustainEnd);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

  lastNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(startAt);
  source.stop(startAt + dur + 0.02);

  // Auto-cleanup: source.onended 가 fire 되면 disconnect.
  source.onended = () => {
    try {
      source.disconnect();
      gainNode.disconnect();
    } catch {
      /* already disconnected */
    }
  };
}

/**
 * 테스트 전용 — AudioContext 가 실제로 생성됐는지.
 */
export function _hasAudioContext(): boolean {
  return _ctx !== null;
}

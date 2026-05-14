/**
 * Settings store — 사용자 설정 (외관 / 자동저장 / 에디터 옵션).
 *
 * Anchor: docs/spec/10_system_architecture.md §4.5.
 *
 * Persist: localStorage (작음 / 즉시 hydrate / 설정 손실 영향 작음).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';
export type Language = 'ko' | 'en';
export type FontFamily = 'pretendard' | 'apple_sd' | 'noto';
export type BlocklyRenderer = 'zelos' | 'geras' | 'thrasos';

interface SettingsStore {
  // 저장
  autosave: boolean;
  autosaveInterval: number;
  backupSlots: number;

  // 외관
  theme: Theme;
  language: Language;
  fontFamily: FontFamily;

  // 에디터
  blocklyRenderer: BlocklyRenderer;
  showAdvancedCategories: boolean;
  previewAutoRegen: boolean;
  previewDebounceMs: number;
  cssAutoPrefix: boolean;         // D4 ① default ON

  // a11y
  reducedMotion: boolean;

  // 데이터
  indexedDbUsageBytes: number;

  // Actions
  set: <K extends keyof Omit<SettingsStore, 'set' | 'reset'>>(
    key: K,
    value: SettingsStore[K],
  ) => void;
  reset: () => void;
}

const DEFAULTS: Omit<SettingsStore, 'set' | 'reset'> = {
  autosave: false,           // 페르소나 #1 우려 — default OFF
  autosaveInterval: 5,
  backupSlots: 5,
  theme: 'dark',
  language: 'ko',
  fontFamily: 'pretendard',
  blocklyRenderer: 'zelos',
  showAdvancedCategories: false,
  previewAutoRegen: true,
  previewDebounceMs: 500,
  cssAutoPrefix: true,       // D4 ①
  reducedMotion: false,
  indexedDbUsageBytes: 0,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<SettingsStore>),
      reset: () => set({ ...DEFAULTS }),
    }),
    {
      name: 'r20-settings',
      storage: createJSONStorage(() =>
        typeof window === 'undefined'
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
    },
  ),
);

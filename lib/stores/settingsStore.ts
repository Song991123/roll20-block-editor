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
  // 저장 (autosave) — spec 22 §3.
  /**
   * Autosave master switch. default ON (spec 22 §2 — 페르소나 #1 우려 와
   * "복구 시점에 묻는다" 정책으로 해소: 저장은 백그라운드, 복구는 사용자 동의).
   */
  autosave: boolean;
  /** Autosave debounce 간격 (초). UI 표시용. ms 단위는 `autosaveDebounceMs`. */
  autosaveInterval: number;
  /** Autosave debounce 간격 (ms) — workspaceStore subscribe 가 사용. */
  autosaveDebounceMs: number;
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

  // 즐겨찾기 — BlockTile 의 별 아이콘으로 추가/제거.
  blockFavorites: string[];
  toggleBlockFavorite: (type: string) => void;

  // Actions
  set: <K extends keyof Omit<SettingsStore, 'set' | 'reset'>>(
    key: K,
    value: SettingsStore[K],
  ) => void;
  reset: () => void;
}

const DEFAULTS: Omit<SettingsStore, 'set' | 'reset'> = {
  // spec 22 §2 — 저장은 ON, 복구는 묻는다. 페르소나 #1 우려 해소.
  autosave: true,
  autosaveInterval: 5,
  autosaveDebounceMs: 5000,
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
  blockFavorites: [],
  toggleBlockFavorite: () => {},
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (key, value) => set({ [key]: value } as Partial<SettingsStore>),
      toggleBlockFavorite: (type) =>
        set((s) => ({
          blockFavorites: s.blockFavorites.includes(type)
            ? s.blockFavorites.filter((t) => t !== type)
            : [...s.blockFavorites, type],
        })),
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

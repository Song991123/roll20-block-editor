/**
 * Preview store — 미리보기 표시 옵션 + 동적 토글.
 *
 * Anchor: docs/spec/10_system_architecture.md §4.3.
 *
 * 동적 토글 = 사용자 시트 안 r20_toggle_wrap 발견 시 자동 채워짐 (Phase 2+).
 * 빌더가 미리 가정한 토글 (시대/펄프 등) 없음 — feedback_general_purpose_blocks.md.
 */

import { create } from 'zustand';

export interface DynamicToggle {
  attr: string;          // hidden input attribute name (사용자 시트 정의)
  selectors: string[];   // 영향 받는 CSS 선택자
  on: boolean;
  label: string;         // 사용자가 박은 한국어 라벨
}

interface PreviewStore {
  darkMode: boolean;
  sanitize: boolean;        // D4 ① — default ON
  autoRegen: boolean;       // 큰 시트 OFF 권장
  iframeSandbox: string;    // "allow-same-origin"

  dynamicToggles: DynamicToggle[];

  setDarkMode: (v: boolean) => void;
  setSanitize: (v: boolean) => void;
  setAutoRegen: (v: boolean) => void;
  setDynamicToggle: (attr: string, on: boolean) => void;
  setDynamicToggles: (toggles: DynamicToggle[]) => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  darkMode: true,
  sanitize: true,            // D4 ① default ON
  autoRegen: true,
  iframeSandbox: 'allow-same-origin',
  dynamicToggles: [],

  setDarkMode: (v) => set({ darkMode: v }),
  setSanitize: (v) => set({ sanitize: v }),
  setAutoRegen: (v) => set({ autoRegen: v }),
  setDynamicToggle: (attr, on) =>
    set((s) => ({
      dynamicToggles: s.dynamicToggles.map((t) =>
        t.attr === attr ? { ...t, on } : t,
      ),
    })),
  setDynamicToggles: (toggles) => set({ dynamicToggles: toggles }),
}));

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

/**
 * spec 21 — WYSIWYG Phase A. 미리보기 렌더 모드.
 *   - 'shadow' : Shadow DOM 컨테이너 (기본). DOM 직접 인스펙터/편집 가능, Phase B+ 의 select/drag/inline edit 기반.
 *   - 'iframe' : 레거시 iframe srcdoc — Roll20 환경 시뮬 (sandbox / postMessage bridge).
 */
export type PreviewRenderMode = 'shadow' | 'iframe';

interface PreviewStore {
  darkMode: boolean;
  sanitize: boolean;        // D4 ① — default ON
  autoRegen: boolean;       // 큰 시트 OFF 권장
  iframeSandbox: string;    // allow-scripts only — 사용자 시트 안 script 는 unique origin 안에서만 실행 (parent 접근 X). preview bridge script 동작 필요.
  renderMode: PreviewRenderMode;   // spec 21 Phase A — default 'shadow'

  dynamicToggles: DynamicToggle[];

  setDarkMode: (v: boolean) => void;
  setSanitize: (v: boolean) => void;
  setAutoRegen: (v: boolean) => void;
  setRenderMode: (mode: PreviewRenderMode) => void;
  setDynamicToggle: (attr: string, on: boolean) => void;
  setDynamicToggles: (toggles: DynamicToggle[]) => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  darkMode: true,
  sanitize: true,            // D4 ① default ON
  autoRegen: true,
  iframeSandbox: 'allow-scripts',
  renderMode: 'shadow',      // spec 21 Phase A — Shadow DOM default
  dynamicToggles: [],

  setDarkMode: (v) => set({ darkMode: v }),
  setSanitize: (v) => set({ sanitize: v }),
  setAutoRegen: (v) => set({ autoRegen: v }),
  setRenderMode: (mode) => set({ renderMode: mode }),
  setDynamicToggle: (attr, on) =>
    set((s) => ({
      dynamicToggles: s.dynamicToggles.map((t) =>
        t.attr === attr ? { ...t, on } : t,
      ),
    })),
  setDynamicToggles: (toggles) => set({ dynamicToggles: toggles }),
}));

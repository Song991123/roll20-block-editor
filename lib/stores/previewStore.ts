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
 *   - 'shadow' : 유지 중인 직렬화/회귀 경로. 현재 제품의 편집 화면에는 마운트하지 않는다.
 *   - 'iframe' : preview와 edit가 공유하는 Roll20 sandbox iframe (기본).
 */
export type PreviewRenderMode = 'shadow' | 'iframe';
export type Roll20CompatibilityMode = 'modern' | 'legacy';

export interface AssetReplacementProfile {
  id: string;
  name: string;
  text: string;
  updatedAt: number;
}

interface PreviewStore {
  darkMode: boolean;
  sanitize: boolean;        // HTML/CSS class auto-prefix. Actual modern Roll20 keeps this OFF.
  legacyCssSanitize: boolean; // 구버전 Roll20 CSS 무해화 preview/edit toggle.
  roll20SandboxSanitize: boolean; // 실제 Roll20 Custom Sheet Sandbox 규칙을 preview/edit에 적용하는 진단 토글.
  autoRegen: boolean;       // 큰 시트 OFF 권장
  iframeSandbox: string;    // allow-scripts only — 사용자 시트 안 script 는 unique origin 안에서만 실행 (parent 접근 X). preview bridge script 동작 필요.
  renderMode: PreviewRenderMode;   // Roll20 parity default; active product surface is iframe.
  documentLanguage: string;        // Roll20 page language for :lang() and fallback-font parity.
  assetReplacementMap: string;     // Local-only URL replacement map used by preview/edit/export.
  assetReplacementProfiles: AssetReplacementProfile[]; // Local-only named relink maps for repeated sheet verification.
  activeAssetReplacementProfileId: string | null;

  dynamicToggles: DynamicToggle[];

  setDarkMode: (v: boolean) => void;
  setRoll20CompatibilityMode: (mode: Roll20CompatibilityMode) => void;
  setRoll20SandboxSanitize: (v: boolean) => void;
  setAutoRegen: (v: boolean) => void;
  setRenderMode: (mode: PreviewRenderMode) => void;
  setDocumentLanguage: (language: string) => void;
  setAssetReplacementMap: (text: string) => void;
  setAssetReplacementProfiles: (profiles: AssetReplacementProfile[], activeId?: string | null) => void;
  saveAssetReplacementProfile: (name: string) => string | null;
  loadAssetReplacementProfile: (id: string) => boolean;
  deleteAssetReplacementProfile: (id: string) => void;
  setDynamicToggle: (attr: string, on: boolean) => void;
  setDynamicToggles: (toggles: DynamicToggle[]) => void;
}

function normalizeProfileName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function profileIdFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `asset-map-${slug || 'profile'}`;
}

function sanitizeProfiles(profiles: AssetReplacementProfile[]): AssetReplacementProfile[] {
  const seen = new Set<string>();
  return profiles
    .map((profile) => ({
      id: String(profile.id || profileIdFromName(profile.name || 'profile')).slice(0, 96),
      name: normalizeProfileName(profile.name || 'Asset map'),
      text: String(profile.text ?? ''),
      updatedAt: Number(profile.updatedAt || Date.now()),
    }))
    .filter((profile) => {
      if (!profile.name || seen.has(profile.id)) return false;
      seen.add(profile.id);
      return true;
    })
    .slice(0, 20);
}

export const usePreviewStore = create<PreviewStore>((set) => ({
  darkMode: false,
  sanitize: false,
  legacyCssSanitize: false,
  roll20SandboxSanitize: false,
  autoRegen: true,
  iframeSandbox: 'allow-scripts',
  renderMode: 'iframe',
  documentLanguage: 'en',
  assetReplacementMap: '',
  assetReplacementProfiles: [],
  activeAssetReplacementProfileId: null,
  dynamicToggles: [],

  setDarkMode: (v) => set({ darkMode: v }),
  setRoll20CompatibilityMode: (mode) => set({
    sanitize: mode === 'legacy',
    legacyCssSanitize: mode === 'legacy',
  }),
  setRoll20SandboxSanitize: (v) => set({ roll20SandboxSanitize: v }),
  setAutoRegen: (v) => set({ autoRegen: v }),
  setRenderMode: (mode) => set({ renderMode: mode }),
  setDocumentLanguage: (language) => set({ documentLanguage: language.trim().slice(0, 35) }),
  setAssetReplacementMap: (text) => set({ assetReplacementMap: text, activeAssetReplacementProfileId: null }),
  setAssetReplacementProfiles: (profiles, activeId = null) => set(() => {
    const clean = sanitizeProfiles(profiles);
    const safeActiveId = activeId && clean.some((profile) => profile.id === activeId) ? activeId : null;
    const active = safeActiveId ? clean.find((profile) => profile.id === safeActiveId) : null;
    return {
      assetReplacementProfiles: clean,
      activeAssetReplacementProfileId: safeActiveId,
      ...(active ? { assetReplacementMap: active.text } : {}),
    };
  }),
  saveAssetReplacementProfile: (name) => {
    const cleanName = normalizeProfileName(name);
    if (!cleanName) return null;
    const id = profileIdFromName(cleanName);
    set((state) => {
      const existing = state.assetReplacementProfiles.filter((profile) => profile.id !== id);
      const next = sanitizeProfiles([
        {
          id,
          name: cleanName,
          text: state.assetReplacementMap,
          updatedAt: Date.now(),
        },
        ...existing,
      ]);
      return {
        assetReplacementProfiles: next,
        activeAssetReplacementProfileId: id,
      };
    });
    return id;
  },
  loadAssetReplacementProfile: (id) => {
    let loaded = false;
    set((state) => {
      const profile = state.assetReplacementProfiles.find((item) => item.id === id);
      if (!profile) return {};
      loaded = true;
      return {
        assetReplacementMap: profile.text,
        activeAssetReplacementProfileId: profile.id,
      };
    });
    return loaded;
  },
  deleteAssetReplacementProfile: (id) =>
    set((state) => ({
      assetReplacementProfiles: state.assetReplacementProfiles.filter((profile) => profile.id !== id),
      activeAssetReplacementProfileId:
        state.activeAssetReplacementProfileId === id ? null : state.activeAssetReplacementProfileId,
    })),
  setDynamicToggle: (attr, on) =>
    set((s) => ({
      dynamicToggles: s.dynamicToggles.map((t) =>
        t.attr === attr ? { ...t, on } : t,
      ),
    })),
  setDynamicToggles: (toggles) => set({ dynamicToggles: toggles }),
}));

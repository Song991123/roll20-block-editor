/**
 * UI store — 사이드 패널 / 미리보기 / 검색 등 transient UI 상태.
 *
 * Anchor: docs/spec/10_system_architecture.md §4.2.
 *
 * Persist: localStorage (작음, 즉시 hydrate). 큰 데이터는 IndexedDB 다른 store 에.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SidebarLeftMode = 'blocks' | 'tree';        // D48
export type SidebarRightTab = 'attrs' | 'code';         // D49
export type CodeSubTab = 'html' | 'css' | 'i18n';
export type WorkspaceKey = 'html' | 'css' | 'i18n';
export type PreviewZoom = 'fit' | number;               // D52

export interface UiState {
  // 좌측 사이드
  sidebarLeftMode: SidebarLeftMode;
  sidebarLeftCollapsed: boolean;

  // 우측 사이드
  sidebarRightTab: SidebarRightTab;
  sidebarRightCollapsed: boolean;
  sidebarRightWidth: number;

  // 우측 [코드] 모드 안 sub-탭
  codeSubTab: CodeSubTab;

  // 좌측 [트리] 모드 안 워크스페이스 sub-탭
  treeWorkspaceTab: WorkspaceKey;

  // 좌측 [블록] 모드 검색 / 카테고리
  blocksSearch: string;
  blocksExpandedCategories: string[];
  blocksAdvancedShown: boolean;

  // 좌측 [트리] 모드 펼침 상태
  treeExpanded: Record<string, boolean>;
  treeSearch: string;

  // 미리보기
  previewZoom: PreviewZoom;

  // Actions
  setSidebarLeftMode: (m: SidebarLeftMode) => void;
  setSidebarRightTab: (t: SidebarRightTab) => void;
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  setSidebarRightWidth: (px: number) => void;
  setCodeSubTab: (t: CodeSubTab) => void;
  setTreeWorkspaceTab: (t: WorkspaceKey) => void;
  setBlocksSearch: (q: string) => void;
  toggleBlocksCategory: (id: string) => void;
  setBlocksAdvancedShown: (b: boolean) => void;
  setTreeNodeExpanded: (id: string, b: boolean) => void;
  setTreeSearch: (q: string) => void;
  setPreviewZoom: (z: PreviewZoom) => void;
}

const DEFAULT_STATE = {
  sidebarLeftMode: 'blocks' as SidebarLeftMode,
  sidebarLeftCollapsed: false,
  sidebarRightTab: 'attrs' as SidebarRightTab,
  sidebarRightCollapsed: false,
  sidebarRightWidth: 320,
  codeSubTab: 'html' as CodeSubTab,
  treeWorkspaceTab: 'html' as WorkspaceKey,
  blocksSearch: '',
  blocksExpandedCategories: ['container', 'input', 'display', 'dice', 'i18n'],
  blocksAdvancedShown: false,
  treeExpanded: {} as Record<string, boolean>,
  treeSearch: '',
  previewZoom: 'fit' as PreviewZoom,
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setSidebarLeftMode: (m) => set({ sidebarLeftMode: m }),
      setSidebarRightTab: (t) => set({ sidebarRightTab: t }),
      toggleSidebarLeft: () =>
        set((s) => ({ sidebarLeftCollapsed: !s.sidebarLeftCollapsed })),
      toggleSidebarRight: () =>
        set((s) => ({ sidebarRightCollapsed: !s.sidebarRightCollapsed })),
      setSidebarRightWidth: (px) =>
        set({
          sidebarRightWidth: Math.min(480, Math.max(280, px)),
        }),
      setCodeSubTab: (t) => set({ codeSubTab: t }),
      setTreeWorkspaceTab: (t) => set({ treeWorkspaceTab: t }),
      setBlocksSearch: (q) => set({ blocksSearch: q }),
      toggleBlocksCategory: (id) =>
        set((s) => {
          const expanded = s.blocksExpandedCategories.includes(id);
          return {
            blocksExpandedCategories: expanded
              ? s.blocksExpandedCategories.filter((x) => x !== id)
              : [...s.blocksExpandedCategories, id],
          };
        }),
      setBlocksAdvancedShown: (b) => set({ blocksAdvancedShown: b }),
      setTreeNodeExpanded: (id, b) =>
        set((s) => ({ treeExpanded: { ...s.treeExpanded, [id]: b } })),
      setTreeSearch: (q) => set({ treeSearch: q }),
      setPreviewZoom: (z) => set({ previewZoom: z }),
    }),
    {
      name: 'r20-ui',
      storage: createJSONStorage(() =>
        typeof window === 'undefined'
          ? {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
          : localStorage,
      ),
      // tree 펼침 + 검색 같은 일회성 상태는 persist 안 함
      partialize: (s) => ({
        sidebarLeftMode: s.sidebarLeftMode,
        sidebarLeftCollapsed: s.sidebarLeftCollapsed,
        sidebarRightTab: s.sidebarRightTab,
        sidebarRightCollapsed: s.sidebarRightCollapsed,
        sidebarRightWidth: s.sidebarRightWidth,
        codeSubTab: s.codeSubTab,
        treeWorkspaceTab: s.treeWorkspaceTab,
        blocksExpandedCategories: s.blocksExpandedCategories,
        blocksAdvancedShown: s.blocksAdvancedShown,
        previewZoom: s.previewZoom,
      }),
    },
  ),
);

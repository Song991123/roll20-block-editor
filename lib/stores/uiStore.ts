/**
 * UI store — 사이드 패널 / 미리보기 / 검색 / 효과음 등 transient UI 상태.
 *
 * Anchor: docs/spec/10_system_architecture.md §4.2.
 *
 * Persist: localStorage (작음, 즉시 hydrate). 큰 데이터는 IndexedDB 다른 store 에.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SidebarLeftMode = 'blocks';
export type SidebarRightTab = 'attrs' | 'code' | 'chat'; // D49 + chat (dice 굴림 결과)
export type CodeSubTab = 'html' | 'css' | 'i18n' | 'worker';
export type WorkspaceKey = 'html' | 'css' | 'i18n' | 'worker';
export type PreviewZoom = 'fit' | number;               // D52
// D26 ②-재재 — 메인 영역 분할 뷰. 'split' default (양쪽 동시), 'assemble'/'preview' = 한쪽만 max.
export type MainMode = 'split' | 'assemble' | 'preview' | 'edit';

// Phase A — WYSIWYG 모드. 편집 모드일 때 시트 / 굴림틀 sub-tab.
export type EditSubmode = 'sheet' | 'rolltemplate';
export type EditPlacementMode = 'flow' | 'free';

// Phase A — 미리보기 9 레이어 (N2).
export type PreviewLayer =
  | 'all'
  | 'structure'
  | 'input'
  | 'roll'
  | 'text'
  | 'image'
  | 'table'
  | 'repeating'
  | 'custom';

export interface MainSplit {
  /** 좌측 (워크스페이스) 비율 — 0~100 percent. */
  left: number;
  /** 우측 (미리보기) 비율 — 0~100 percent. */
  right: number;
}

export interface UiState {
  // 메인 영역 모드 — 분할 (default) | 조립만 | 미리보기만.
  mainMode: MainMode;
  // 분할 모드에서 좌/우 비율.
  mainSplit: MainSplit;

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
  // Phase A — 미리보기 레이어 (9 레이어).
  previewLayer: PreviewLayer;

  // Phase A — WYSIWYG 편집 모드 sub-tab.
  editSubmode: EditSubmode;
  // Phase A — 캔버스 폭 (시트 / 굴림틀 별도).
  sheetCanvasWidth: number;       // default 850
  rolltemplateCanvasWidth: number; // default 280
  sheetCanvasWidthAuto: boolean;
  rolltemplateCanvasWidthAuto: boolean;
  // Phase A — snap 8px on/off.
  snapEnabled: boolean;
  editPlacementMode: EditPlacementMode;
  // Phase A — 선택된 위젯 (sheet 또는 rolltemplate).
  selectedWidgetId: string | null;
  hoveredWidgetId: string | null;

  // 효과음 (Web Audio 합성). lib/sfx/player.ts 의 playSfx() 가 읽음.
  // - sfxEnabled: 마스터 on/off (default true). statusbar 토글.
  // - sfxVolume: 0..1 (default 0.6). 현재 UI 슬라이더 없음, 향후 설정 모달에서.
  sfxEnabled: boolean;
  sfxVolume: number;

  // Actions
  setMainMode: (m: MainMode) => void;
  toggleMainMode: () => void;
  setMainSplit: (left: number, right: number) => void;
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
  setPreviewLayer: (l: PreviewLayer) => void;
  setEditSubmode: (m: EditSubmode) => void;
  setSheetCanvasWidth: (w: number) => void;
  setRolltemplateCanvasWidth: (w: number) => void;
  setAutoSheetCanvasWidth: (w: number) => void;
  setAutoRolltemplateCanvasWidth: (w: number) => void;
  resetCanvasWidths: () => void;
  setSnapEnabled: (b: boolean) => void;
  toggleSnapEnabled: () => void;
  setEditPlacementMode: (m: EditPlacementMode) => void;
  setSelectedWidgetId: (id: string | null) => void;
  setHoveredWidgetId: (id: string | null) => void;
  setSfxEnabled: (b: boolean) => void;
  toggleSfxEnabled: () => void;
  setSfxVolume: (v: number) => void;
}

const DEFAULT_STATE = {
  mainMode: 'split' as MainMode,
  mainSplit: { left: 50, right: 50 } as MainSplit,
  sidebarLeftMode: 'blocks' as SidebarLeftMode,
  sidebarLeftCollapsed: false,
  sidebarRightTab: 'attrs' as SidebarRightTab,
  sidebarRightCollapsed: false,
  sidebarRightWidth: 300,
  codeSubTab: 'html' as CodeSubTab,
  treeWorkspaceTab: 'html' as WorkspaceKey,
  blocksSearch: '',
  blocksExpandedCategories: ['container', 'input', 'display', 'dice', 'i18n', 'sheet_worker'],
  blocksAdvancedShown: false,
  treeExpanded: {} as Record<string, boolean>,
  treeSearch: '',
  previewZoom: 'fit' as PreviewZoom,
  previewLayer: 'all' as PreviewLayer,
  editSubmode: 'sheet' as EditSubmode,
  sheetCanvasWidth: 850,
  rolltemplateCanvasWidth: 280,
  // Blank workspaces keep the documented fixed canvas defaults. Import
  // explicitly enables intrinsic sizing after user content is available.
  sheetCanvasWidthAuto: false,
  rolltemplateCanvasWidthAuto: false,
  snapEnabled: true,
  editPlacementMode: 'flow' as EditPlacementMode,
  selectedWidgetId: null as string | null,
  hoveredWidgetId: null as string | null,
  sfxEnabled: true,
  sfxVolume: 0.6,
};

// 분할 모드 cycle: split → edit → assemble → preview → split.
// (Phase A — 'edit' 추가)
function nextMainMode(m: MainMode): MainMode {
  if (m === 'split') return 'edit';
  if (m === 'edit') return 'assemble';
  if (m === 'assemble') return 'preview';
  return 'split';
}

// 비율 합이 양수가 아니면 무시. 합 100 으로 normalize.
function normalizeSplit(left: number, right: number): MainSplit {
  const safeLeft = Number.isFinite(left) ? Math.max(0, left) : 50;
  const safeRight = Number.isFinite(right) ? Math.max(0, right) : 50;
  const total = safeLeft + safeRight;
  if (total <= 0) return { left: 50, right: 50 };
  return {
    left: (safeLeft / total) * 100,
    right: (safeRight / total) * 100,
  };
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setMainMode: (m) => set({ mainMode: m }),
      toggleMainMode: () => set((s) => ({ mainMode: nextMainMode(s.mainMode) })),
      setMainSplit: (left, right) => set({ mainSplit: normalizeSplit(left, right) }),
      setSidebarLeftMode: (m) => set({ sidebarLeftMode: m }),
      setSidebarRightTab: (t) => set({ sidebarRightTab: t }),
      toggleSidebarLeft: () =>
        set((s) => ({ sidebarLeftCollapsed: !s.sidebarLeftCollapsed })),
      toggleSidebarRight: () =>
        set((s) => ({ sidebarRightCollapsed: !s.sidebarRightCollapsed })),
      setSidebarRightWidth: (px) =>
        set({
          sidebarRightWidth: Math.min(520, Math.max(260, px)),
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
      setPreviewLayer: (l) => set({ previewLayer: l }),
      setEditSubmode: (m) => set({ editSubmode: m }),
      setSheetCanvasWidth: (w) =>
        set({
          sheetCanvasWidth: Math.max(320, Math.min(2000, Math.round(w))),
          sheetCanvasWidthAuto: false,
        }),
      setRolltemplateCanvasWidth: (w) =>
        set({
          rolltemplateCanvasWidth: Math.max(200, Math.min(600, Math.round(w))),
          rolltemplateCanvasWidthAuto: false,
        }),
      setAutoSheetCanvasWidth: (w) =>
        set({
          sheetCanvasWidth: Math.max(320, Math.min(2000, Math.round(w))),
          sheetCanvasWidthAuto: true,
        }),
      setAutoRolltemplateCanvasWidth: (w) =>
        set({
          rolltemplateCanvasWidth: Math.max(200, Math.min(600, Math.round(w))),
          rolltemplateCanvasWidthAuto: true,
        }),
      resetCanvasWidths: () =>
        set({
          sheetCanvasWidth: DEFAULT_STATE.sheetCanvasWidth,
          rolltemplateCanvasWidth: DEFAULT_STATE.rolltemplateCanvasWidth,
          // A new sheet starts at the documented 850px canvas. Imported
          // sheets opt into intrinsic-width measurement explicitly.
          sheetCanvasWidthAuto: false,
          rolltemplateCanvasWidthAuto: false,
        }),
      setSnapEnabled: (b) => set({ snapEnabled: b }),
      toggleSnapEnabled: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
      setEditPlacementMode: (m) => set({ editPlacementMode: m }),
      setSelectedWidgetId: (id) => set({ selectedWidgetId: id }),
      setHoveredWidgetId: (id) => set({ hoveredWidgetId: id }),
      setSfxEnabled: (b) => set({ sfxEnabled: b }),
      toggleSfxEnabled: () => set((s) => ({ sfxEnabled: !s.sfxEnabled })),
      setSfxVolume: (v) => set({ sfxVolume: Math.max(0, Math.min(1, v)) }),
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
      // 이전 버전의 persisted mainMode ('assemble' | 'preview' 만 알던 시절) 와 호환.
      // 알 수 없는 값이면 'split' 로 떨어뜨림. mainSplit 누락 시 default 채움.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<UiState>;
        const merged = { ...current, ...p } as UiState;
        if (
          merged.mainMode !== 'split' &&
          merged.mainMode !== 'assemble' &&
          merged.mainMode !== 'preview' &&
          merged.mainMode !== 'edit'
        ) {
          merged.mainMode = 'split';
        }
        if (!merged.mainSplit || typeof merged.mainSplit.left !== 'number') {
          merged.mainSplit = { left: 50, right: 50 };
        }
        return merged;
      },
      partialize: (s) => ({
        mainMode: s.mainMode,
        mainSplit: s.mainSplit,
        editSubmode: s.editSubmode,
        sheetCanvasWidth: s.sheetCanvasWidth,
        rolltemplateCanvasWidth: s.rolltemplateCanvasWidth,
        sheetCanvasWidthAuto: s.sheetCanvasWidthAuto,
        rolltemplateCanvasWidthAuto: s.rolltemplateCanvasWidthAuto,
        snapEnabled: s.snapEnabled,
        editPlacementMode: s.editPlacementMode,
        previewLayer: s.previewLayer,
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
        sfxEnabled: s.sfxEnabled,
        sfxVolume: s.sfxVolume,
      }),
    },
  ),
);

/**
 * Examples store — 샘플 시트 카탈로그 + 로드 상태.
 *
 * Anchor: docs/spec/10_system_architecture.md §4.4 + 02 §7.
 *
 * 정책 (feedback_general_purpose_blocks.md):
 *   - public visibility 만 git 커밋 + GitHub Pages 정적 호스팅
 *   - local visibility 는 사용자 디바이스 IndexedDB 만 — public repo 0
 *   - 미래 사용자가 커스텀 시트 import 해서 블록 extraction 검증 예정 (project memo)
 *
 * Phase 1 = 메타 + 로딩 상태 스토어만. 실 fetch + IndexedDB 는 Phase 3.
 */

import { create } from 'zustand';

export type ExampleVisibility = 'public' | 'local';

export interface ExampleMeta {
  id: string;
  name: string;
  description: string;
  blockCount: number;
  language: 'ko' | 'en';
  visibility: ExampleVisibility;
  thumbnail?: string;
  xmlPath: string;
  cssPath?: string;
  i18nPath?: string;
  systemTags: string[];
}

interface ExamplesStore {
  catalog: ExampleMeta[];
  currentExampleId: string | null;
  loadProgress: number;            // 0 ~ 100
  isLoading: boolean;
  loadError: string | null;

  setCatalog: (catalog: ExampleMeta[]) => void;
  startLoad: (id: string) => void;
  setProgress: (p: number) => void;
  finishLoad: (id: string) => void;
  failLoad: (err: string) => void;
  clearCurrent: () => void;
}

export const useExamplesStore = create<ExamplesStore>((set) => ({
  catalog: [],
  currentExampleId: null,
  loadProgress: 0,
  isLoading: false,
  loadError: null,

  setCatalog: (catalog) => set({ catalog }),
  startLoad: (id) =>
    set({ currentExampleId: id, isLoading: true, loadProgress: 0, loadError: null }),
  setProgress: (p) => set({ loadProgress: p }),
  finishLoad: (id) =>
    set({ currentExampleId: id, isLoading: false, loadProgress: 100, loadError: null }),
  failLoad: (err) => set({ isLoading: false, loadError: err }),
  clearCurrent: () => set({ currentExampleId: null, loadProgress: 0, isLoading: false }),
}));

/**
 * Example catalog loading state.
 *
 * The public catalog is intentionally empty until synthetic, copyright-safe
 * examples exist. Real user/community sheets are local verification fixtures,
 * not bundled examples.
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
  loadProgress: number;
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

/**
 * Workspace store — Blockly 외부 메타 + 양방향 sync 의 single source.
 *
 * Anchor: docs/spec/10_system_architecture.md §4.1.
 *
 * Blockly workspace 객체 자체는 BlocklyModelHost 가 useRef 로 관리.
 * 본 store 에는 직렬화된 XML 캐시 + dirty / count / lastSavedAt
 *   + selectedBlockId + emit 결과 + warnings.
 */

import { create } from 'zustand';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';

export type WorkspaceKey = 'html' | 'css' | 'i18n';

export interface WorkspaceMeta {
  xmlCache: string;
  dirty: boolean;
  blockCount: number;
  lastSavedAt: number | null;
}

export interface EmitOutput {
  html: string;
  css: string;
  i18n: string;
}

export type EmitSeverity = 'error' | 'warning' | 'info';

export interface EmitWarning {
  severity: EmitSeverity;
  code: string;
  message: string;
  blockId: string | null;
}

export type SelectionOrigin = 'preview' | 'tree' | 'inspector' | 'init' | null;

interface WorkspaceStore {
  workspaces: Record<WorkspaceKey, WorkspaceMeta>;
  activeWorkspace: WorkspaceKey;

  emitCache: EmitOutput;
  emitWarnings: EmitWarning[];

  selectedBlockId: string | null;
  selectionOrigin: SelectionOrigin;

  // Actions
  setActiveWorkspace: (w: WorkspaceKey) => void;
  setXmlCache: (w: WorkspaceKey, xml: string, blockCount: number) => void;
  markDirty: (w: WorkspaceKey) => void;
  markSaved: (w: WorkspaceKey) => void;
  resetWorkspace: (w: WorkspaceKey) => void;
  /**
   * 3 워크스페이스 (HTML/CSS/i18n) + emit 캐시 + 선택 상태를 모두 비움.
   * Blockly 워크스페이스 SVG 까지 비우려고 adapter.hydrateFromXml 에 빈 xml 전달.
   * 헤더의 [새 시트] 버튼이 사용.
   */
  clearAll: () => void;
  setEmitCache: (out: Partial<EmitOutput>) => void;
  setEmitWarnings: (warnings: EmitWarning[]) => void;
  setSelectedBlockId: (id: string | null, origin: Exclude<SelectionOrigin, null>) => void;
  /**
   * 활성 워크스페이스 (또는 지정 워크스페이스) 에 새 블록 인스턴스 추가.
   * Blockly adapter 가 실제 Block 객체 생성 → 워크스페이스 changeListener 가
   * setXmlCache 자동 호출. 반환 = 새 블록 id.
   */
  appendBlockToActive: (blockType: string, target?: WorkspaceKey) => string | null;
}

const emptyMeta: WorkspaceMeta = {
  xmlCache: '',
  dirty: false,
  blockCount: 0,
  lastSavedAt: null,
};

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: {
    html: { ...emptyMeta },
    css: { ...emptyMeta },
    i18n: { ...emptyMeta },
  },
  activeWorkspace: 'html',
  emitCache: { html: '', css: '', i18n: '' },
  emitWarnings: [],
  selectedBlockId: null,
  selectionOrigin: null,

  setActiveWorkspace: (w) => set({ activeWorkspace: w }),

  setXmlCache: (w, xml, blockCount) =>
    set((s) => ({
      workspaces: {
        ...s.workspaces,
        [w]: { ...s.workspaces[w], xmlCache: xml, blockCount, dirty: true },
      },
    })),

  markDirty: (w) =>
    set((s) => ({
      workspaces: {
        ...s.workspaces,
        [w]: { ...s.workspaces[w], dirty: true },
      },
    })),

  markSaved: (w) =>
    set((s) => ({
      workspaces: {
        ...s.workspaces,
        [w]: { ...s.workspaces[w], dirty: false, lastSavedAt: Date.now() },
      },
    })),

  resetWorkspace: (w) =>
    set((s) => ({
      workspaces: { ...s.workspaces, [w]: { ...emptyMeta } },
    })),

  clearAll: () => {
    const adapter = getBlocklyAdapter();
    const empty = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
    // Blockly workspace SVG 안의 블록을 비움 (changeListener 가 store sync 도 시도).
    for (const key of ['html', 'css', 'i18n'] as const) {
      try {
        adapter.hydrateFromXml(key, empty);
      } catch {
        /* adapter 미연결 / 미초기화 — 메타 reset 만으로도 UX 충분. */
      }
    }
    set({
      workspaces: {
        html: { ...emptyMeta },
        css: { ...emptyMeta },
        i18n: { ...emptyMeta },
      },
      emitCache: { html: '', css: '', i18n: '' },
      emitWarnings: [],
      selectedBlockId: null,
      selectionOrigin: null,
    });
  },

  setEmitCache: (out) =>
    set((s) => ({ emitCache: { ...s.emitCache, ...out } })),

  setEmitWarnings: (warnings) => set({ emitWarnings: warnings }),

  setSelectedBlockId: (id, origin) =>
    set({ selectedBlockId: id, selectionOrigin: origin }),

  appendBlockToActive: (blockType, target) => {
    const state = useWorkspaceStore.getState();
    const key = target ?? state.activeWorkspace;
    const adapter = getBlocklyAdapter();
    const id = adapter.appendBlockToWorkspace(key, blockType);
    if (id) {
      set({ selectedBlockId: id, selectionOrigin: 'tree' });
    }
    return id;
  },
}));

/** Derived: emit error 가 1건이라도 있으면 다운로드 차단 (D18 ①). */
export function hasBlockingError(warnings: EmitWarning[]): boolean {
  return warnings.some((w) => w.severity === 'error');
}

/** Derived: 모든 워크스페이스 합산 블록 수 (statusbar 용). */
export function totalBlockCount(workspaces: Record<WorkspaceKey, WorkspaceMeta>): number {
  return workspaces.html.blockCount + workspaces.css.blockCount + workspaces.i18n.blockCount;
}

/** Derived: 어느 워크스페이스든 dirty 면 dirty. */
export function anyDirty(workspaces: Record<WorkspaceKey, WorkspaceMeta>): boolean {
  return workspaces.html.dirty || workspaces.css.dirty || workspaces.i18n.dirty;
}

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
  setEmitCache: (out: Partial<EmitOutput>) => void;
  setEmitWarnings: (warnings: EmitWarning[]) => void;
  setSelectedBlockId: (id: string | null, origin: Exclude<SelectionOrigin, null>) => void;
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

  setEmitCache: (out) =>
    set((s) => ({ emitCache: { ...s.emitCache, ...out } })),

  setEmitWarnings: (warnings) => set({ emitWarnings: warnings }),

  setSelectedBlockId: (id, origin) =>
    set({ selectedBlockId: id, selectionOrigin: origin }),
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

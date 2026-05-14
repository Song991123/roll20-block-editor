import { create } from 'zustand';

/**
 * Workspace store — Blockly 외부 메타 상태만 관리.
 *
 * 결정 (06_nextjs_migration_plan §1.3):
 * - Blockly workspace 객체 자체는 Blockly 가 관리 (mutable, store 에 안 넣음)
 * - store 에는 직렬화된 XML 캐시 + dirty flag + 블록 수만
 *
 * Phase 1: html 워크스페이스 1개만. Phase 2 에서 css/i18n 추가.
 */
type WorkspaceKey = 'html' | 'css' | 'i18n';

interface WorkspaceMeta {
  xmlCache: string;
  dirty: boolean;
  blockCount: number;
}

interface WorkspaceStore {
  workspaces: Record<WorkspaceKey, WorkspaceMeta>;
  activeWorkspace: WorkspaceKey;
  setActiveWorkspace: (w: WorkspaceKey) => void;
  markDirty: (w: WorkspaceKey) => void;
  setXmlCache: (w: WorkspaceKey, xml: string) => void;
  setBlockCount: (w: WorkspaceKey, count: number) => void;
  resetWorkspace: (w: WorkspaceKey) => void;
}

const emptyMeta: WorkspaceMeta = { xmlCache: '', dirty: false, blockCount: 0 };

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  workspaces: {
    html: { ...emptyMeta },
    css: { ...emptyMeta },
    i18n: { ...emptyMeta },
  },
  activeWorkspace: 'html',
  setActiveWorkspace: (w) => set({ activeWorkspace: w }),
  markDirty: (w) =>
    set((s) => ({
      workspaces: { ...s.workspaces, [w]: { ...s.workspaces[w], dirty: true } },
    })),
  setXmlCache: (w, xml) =>
    set((s) => ({
      workspaces: { ...s.workspaces, [w]: { ...s.workspaces[w], xmlCache: xml, dirty: false } },
    })),
  setBlockCount: (w, count) =>
    set((s) => ({
      workspaces: { ...s.workspaces, [w]: { ...s.workspaces[w], blockCount: count } },
    })),
  resetWorkspace: (w) =>
    set((s) => ({
      workspaces: { ...s.workspaces, [w]: { ...emptyMeta } },
    })),
}));

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

/**
 * Phase A — WYSIWYG 위젯 인스턴스 (spec 17 §10).
 * type 은 widget registry 의 식별자.
 * x/y/width/height 는 px, 좌상단 기준 absolute.
 */
export type WidgetType =
  | 'text-input'
  | 'number-input'
  | 'textarea-input'
  | 'checkbox-input'
  | 'select-input'
  | 'button'
  | 'roll-button'
  | 'heading'
  | 'image'
  | 'group-box'
  | 'rolltemplate-field'
  | 'rolltemplate-header';

export type WidgetTarget = 'sheet' | 'rolltemplate';

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  attrs: {
    name?: string;
    class?: string;
    label?: string;
    text?: string;
    value?: string;
    src?: string;
    legend?: string;
    formula?: string;
    options?: string[];
    [key: string]: unknown;
  };
}

export interface WorkspaceMeta {
  /**
   * Sub-microsecond change signal — bumped on every Blockly mutation event.
   * Replaces the prior `xmlCache: string` field (which cost 50-200ms at 4500
   * blocks per event for `workspaceToDom + domToText`). No subscriber ever
   * read the string content; they all used it purely as a re-render trigger
   * (WorkspaceTree, Inspector, useEmitPipeline). Now they subscribe to
   * `structureVersion` instead and call `adapter.serializeXml()` on-demand
   * (ExportDialog / Save) — keeping the hot path off the main thread.
   */
  structureVersion: number;
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

  // Phase A — WYSIWYG 위젯 인스턴스 (sheet / rolltemplate 별도).
  sheetWidgets: WidgetInstance[];
  rolltemplateWidgets: WidgetInstance[];

  // Actions
  setActiveWorkspace: (w: WorkspaceKey) => void;
  /**
   * Notify subscribers that workspace `w` mutated. Cheap — increments a counter
   * + updates blockCount + marks dirty. The previously-passed `xml` string is no
   * longer captured into the store (no subscriber needed it); call
   * `getBlocklyAdapter().serializeXml(w)` on-demand if you need the text.
   */
  bumpStructure: (w: WorkspaceKey, blockCount: number) => void;
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
   * bumpStructure 자동 호출. 반환 = 새 블록 id.
   */
  appendBlockToActive: (blockType: string, target?: WorkspaceKey) => string | null;

  // Phase A — WYSIWYG 위젯 actions.
  addWidget: (target: WidgetTarget, type: WidgetType, x: number, y: number) => string;
  removeWidget: (target: WidgetTarget, id: string) => void;
  updateWidget: (target: WidgetTarget, id: string, partial: Partial<WidgetInstance>) => void;
  clearWidgets: (target: WidgetTarget) => void;
}

const emptyMeta: WorkspaceMeta = {
  structureVersion: 0,
  dirty: false,
  blockCount: 0,
  lastSavedAt: null,
};


/** Phase A — 위젯 type → 기본 크기/attrs (spec 17 §5.2). */
function defaultWidget(type: WidgetType): {
  width: number;
  height: number;
  attrs: WidgetInstance['attrs'];
} {
  switch (type) {
    case 'text-input':
      return { width: 180, height: 32, attrs: { name: '', value: '' } };
    case 'number-input':
      return { width: 80, height: 32, attrs: { name: '', value: '0' } };
    case 'textarea-input':
      return { width: 280, height: 80, attrs: { name: '' } };
    case 'checkbox-input':
      return { width: 32, height: 32, attrs: { name: '' } };
    case 'select-input':
      return {
        width: 160,
        height: 32,
        attrs: { name: '', options: ['옵션 1', '옵션 2', '옵션 3'] },
      };
    case 'button':
      return { width: 100, height: 32, attrs: { label: '버튼' } };
    case 'roll-button':
      return {
        width: 120,
        height: 32,
        attrs: { name: '', label: '굴림', formula: '1d20' },
      };
    case 'heading':
      return { width: 200, height: 36, attrs: { text: '제목' } };
    case 'image':
      return { width: 120, height: 120, attrs: { src: '' } };
    case 'group-box':
      return { width: 300, height: 200, attrs: { legend: '' } };
    case 'rolltemplate-field':
      return { width: 120, height: 24, attrs: { name: '' } };
    case 'rolltemplate-header':
      return { width: 240, height: 32, attrs: { text: 'Roll Result' } };
    default:
      return { width: 100, height: 32, attrs: {} };
  }
}

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
  sheetWidgets: [],
  rolltemplateWidgets: [],

  setActiveWorkspace: (w) => set({ activeWorkspace: w }),

  bumpStructure: (w, blockCount) =>
    set((s) => ({
      workspaces: {
        ...s.workspaces,
        [w]: {
          ...s.workspaces[w],
          structureVersion: s.workspaces[w].structureVersion + 1,
          blockCount,
          dirty: true,
        },
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
      // Phase D fix (add-block bumpStructure 버그, local_1abb2993):
      // adapter 내부에서 BLOCK_CREATE 이벤트를 fire 하므로 changeListener 가
      // bumpStructure 를 자동 호출하지만, Events.disable 카운터가 미해소된
      // 환경 또는 listener 미등록 (테스트 등) 환경에서도 store 가 일관되게
      // 갱신되도록 belt+suspenders 로 명시 호출. serializeXml 비용 없이
      // O(N) tree walk + counter++ 만 수행 (BlocklyModelHost 와 동일 비용).
      try {
        const count = adapter.countBlocks(key);
        if (count > 0) state.bumpStructure(key, count);
      } catch {
        /* adapter teardown mid-call */
      }
    }
    return id;
  },

  addWidget: (target, type, x, y) => {
    const id = `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const defaults = defaultWidget(type);
    const instance: WidgetInstance = {
      id,
      type,
      x,
      y,
      width: defaults.width,
      height: defaults.height,
      attrs: { ...defaults.attrs },
    };
    set((s) => {
      const key = target === 'sheet' ? 'sheetWidgets' : 'rolltemplateWidgets';
      return { [key]: [...s[key], instance] } as Partial<WorkspaceStore>;
    });
    return id;
  },

  removeWidget: (target, id) => {
    set((s) => {
      const key = target === 'sheet' ? 'sheetWidgets' : 'rolltemplateWidgets';
      return { [key]: s[key].filter((w) => w.id !== id) } as Partial<WorkspaceStore>;
    });
  },

  updateWidget: (target, id, partial) => {
    set((s) => {
      const key = target === 'sheet' ? 'sheetWidgets' : 'rolltemplateWidgets';
      return {
        [key]: s[key].map((w) =>
          w.id === id
            ? { ...w, ...partial, attrs: { ...w.attrs, ...(partial.attrs ?? {}) } }
            : w,
        ),
      } as Partial<WorkspaceStore>;
    });
  },

  clearWidgets: (target) => {
    const key = target === 'sheet' ? 'sheetWidgets' : 'rolltemplateWidgets';
    set({ [key]: [] } as Partial<WorkspaceStore>);
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

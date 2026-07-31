'use client';

/**
 * useEmitPipeline — workspace XML 변경 → 120ms 디바운스 후 emitAll →
 * workspaceStore.emitCache + emitWarnings 갱신.
 *
 * Anchor:
 *   - docs/spec/10_system_architecture.md §3.3 (emit pipeline)
 *   - components/editor/PreviewMain.tsx (이전 위치)
 *
 * 결정 변경 (import-fix):
 *   - 이전: emit useEffect 가 PreviewMain.tsx 안에 있었음 → mainMode='assemble'/'edit'
 *     에서 PreviewMain 미마운트 → emitCache 미갱신 → 우측 [코드] 탭이 영구 빈 상태.
 *   - 사용자 외부 시트 import 후 조립 모드에서 코드 탭이 "아직 생성된 코드가 없어요"
 *     로 남아있던 버그의 원인.
 *   - 신규: 본 hook 을 EditorShell 에서 호출 → 항상 mount → mainMode 무관 emit.
 *
 * srcdoc (iframe 본문) 합성은 PreviewMain 의 별도 useEffect 에서 emitCache 를
 *   읽어 buildSheetDoc 로 만든다 — sanitize / darkMode / previewLayer 토글이
 *   PreviewMain UI 토글이라 거기 두는 게 맞다.
 */

import { useEffect } from 'react';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { useWorkspaceStore, WORKSPACE_KEYS, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { markEditorTiming } from '@/lib/perf/editorTiming';
import { composeEmittedWorkspaces, emitWorkspace, type EmitResult } from './emit';

let flushVersion = 0;
let immediateFlushSignature: string | null = null;

type CachedWorkspaceEmit = {
  workspace: unknown;
  signature: string;
  result: EmitResult;
};

// A pointer move usually changes only HTML. Re-emitting five large Blockly
// workspaces for every committed drag made imported sheets pay an avoidable
// cost, especially when CSS/i18n/worker trees were large but unchanged.
const emittedWorkspaceCache = new Map<WorkspaceKey, CachedWorkspaceEmit>();

function workspaceSignature(state: ReturnType<typeof useWorkspaceStore.getState>): string {
  return WORKSPACE_KEYS.map((key) => {
    const workspace = state.workspaces[key];
    return `${key}:${workspace.structureVersion}:${workspace.blockCount}`;
  }).join('|');
}

function emitCachedWorkspaces(
  adapter: ReturnType<typeof getBlocklyAdapter>,
  state: ReturnType<typeof useWorkspaceStore.getState>,
) {
  const results: Partial<Record<WorkspaceKey, EmitResult>> = {};
  for (const key of WORKSPACE_KEYS) {
    const workspace = adapter.getWorkspace(key);
    const meta = state.workspaces[key];
    const signature = `${meta.structureVersion}:${meta.blockCount}`;
    const cached = emittedWorkspaceCache.get(key);
    if (cached && cached.workspace === workspace && cached.signature === signature) {
      results[key] = cached.result;
      continue;
    }
    const result = emitWorkspace(workspace, key);
    emittedWorkspaceCache.set(key, { workspace, signature, result });
    results[key] = result;
  }
  return composeEmittedWorkspaces(results);
}

/**
 * Publish a committed edit immediately. Pointer-move events stay debounced;
 * a completed drop should not wait for that debounce window before the live
 * iframe receives the authored HTML/CSS.
 */
export function flushEmitPipeline(): void {
  markEditorTiming('flush-enter');
  flushVersion += 1;
  const state = useWorkspaceStore.getState();
  immediateFlushSignature = workspaceSignature(state);
  const counts = WORKSPACE_KEYS.map((key) => state.workspaces[key].blockCount);
  if (counts.every((count) => count === 0)) {
    emittedWorkspaceCache.clear();
    state.setEmitCache({ html: '', css: '', i18n: '', js: '', worker: '' });
    state.setEmitWarnings([]);
    return;
  }

  const adapter = getBlocklyAdapter();
  markEditorTiming('emit-immediate-start');
  const result = emitCachedWorkspaces(adapter, state);
  markEditorTiming('emit-immediate-end');
  state.setEmitCache({ html: result.html, css: result.css, i18n: result.i18n, js: result.js, worker: result.worker });
  state.setEmitWarnings(result.warnings);
}

export function useEmitPipeline(): void {
  // Perf hot path #3: structureVersion replaces xmlCache string.
  const htmlV = useWorkspaceStore((s) => s.workspaces.html.structureVersion);
  const cssV = useWorkspaceStore((s) => s.workspaces.css.structureVersion);
  const i18nV = useWorkspaceStore((s) => s.workspaces.i18n.structureVersion);
  const jsV = useWorkspaceStore((s) => s.workspaces.js.structureVersion);
  const workerV = useWorkspaceStore((s) => s.workspaces.worker.structureVersion);
  const htmlCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const cssCount = useWorkspaceStore((s) => s.workspaces.css.blockCount);
  const i18nCount = useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const jsCount = useWorkspaceStore((s) => s.workspaces.js.blockCount);
  const workerCount = useWorkspaceStore((s) => s.workspaces.worker.blockCount);
  const setEmitCache = useWorkspaceStore((s) => s.setEmitCache);
  const setEmitWarnings = useWorkspaceStore((s) => s.setEmitWarnings);

  useEffect(() => {
    if (htmlCount + cssCount + i18nCount + jsCount + workerCount === 0) {
      setEmitCache({ html: '', css: '', i18n: '', js: '', worker: '' });
      setEmitWarnings([]);
      return;
    }

    // A committed pointer drop calls flushEmitPipeline synchronously so the
    // iframe can apply the new HTML immediately. The structure-version effect
    // still runs afterward; skip that one duplicate delayed emit for the same
    // workspace snapshot instead of paying the debounce window twice.
    const signature = WORKSPACE_KEYS.map((key) => {
      const workspace = useWorkspaceStore.getState().workspaces[key];
      return `${key}:${workspace.structureVersion}:${workspace.blockCount}`;
    }).join('|');
    if (immediateFlushSignature === signature) {
      immediateFlushSignature = null;
      return;
    }

    const scheduledFlushVersion = flushVersion;
    const handle = window.setTimeout(() => {
      if (scheduledFlushVersion !== flushVersion) return;
      const adapter = getBlocklyAdapter();
      const liveTotal =
        adapter.countBlocks('html') +
        adapter.countBlocks('css') +
        adapter.countBlocks('i18n') +
        adapter.countBlocks('js') +
        adapter.countBlocks('worker');
      if (liveTotal === 0) {
        emittedWorkspaceCache.clear();
        setEmitCache({ html: '', css: '', i18n: '', js: '', worker: '' });
        setEmitWarnings([]);
        return;
      }

      markEditorTiming('emit-delayed-start');
      const result = emitCachedWorkspaces(adapter, useWorkspaceStore.getState());
      markEditorTiming('emit-delayed-end');
      setEmitCache({ html: result.html, css: result.css, i18n: result.i18n, js: result.js, worker: result.worker });
      setEmitWarnings(result.warnings);
    }, 120);
    return () => window.clearTimeout(handle);
  }, [htmlV, cssV, i18nV, jsV, workerV, htmlCount, cssCount, i18nCount, jsCount, workerCount, setEmitCache, setEmitWarnings]);
}

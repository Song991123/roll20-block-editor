'use client';

/**
 * useEmitPipeline — workspace XML 변경 → 500ms 디바운스 후 emitAll →
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
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { emitAll } from './emit';

export function useEmitPipeline(): void {
  // Perf hot path #3: structureVersion replaces xmlCache string.
  const htmlV = useWorkspaceStore((s) => s.workspaces.html.structureVersion);
  const cssV = useWorkspaceStore((s) => s.workspaces.css.structureVersion);
  const i18nV = useWorkspaceStore((s) => s.workspaces.i18n.structureVersion);
  const workerV = useWorkspaceStore((s) => s.workspaces.worker.structureVersion);
  const htmlCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const cssCount = useWorkspaceStore((s) => s.workspaces.css.blockCount);
  const i18nCount = useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const workerCount = useWorkspaceStore((s) => s.workspaces.worker.blockCount);
  const setEmitCache = useWorkspaceStore((s) => s.setEmitCache);
  const setEmitWarnings = useWorkspaceStore((s) => s.setEmitWarnings);

  useEffect(() => {
    if (htmlCount + cssCount + i18nCount + workerCount === 0) {
      setEmitCache({ html: '', css: '', i18n: '', worker: '' });
      setEmitWarnings([]);
      return;
    }

    const handle = window.setTimeout(() => {
      const adapter = getBlocklyAdapter();
      const liveTotal =
        adapter.countBlocks('html') +
        adapter.countBlocks('css') +
        adapter.countBlocks('i18n') +
        adapter.countBlocks('worker');
      if (liveTotal === 0) {
        setEmitCache({ html: '', css: '', i18n: '', worker: '' });
        setEmitWarnings([]);
        return;
      }

      const result = emitAll({
        html: adapter.getWorkspace('html'),
        css: adapter.getWorkspace('css'),
        i18n: adapter.getWorkspace('i18n'),
        worker: adapter.getWorkspace('worker'),
      });
      setEmitCache({ html: result.html, css: result.css, i18n: result.i18n, worker: result.worker });
      setEmitWarnings(result.warnings);
    }, 120);
    return () => window.clearTimeout(handle);
  }, [htmlV, cssV, i18nV, workerV, htmlCount, cssCount, i18nCount, workerCount, setEmitCache, setEmitWarnings]);
}

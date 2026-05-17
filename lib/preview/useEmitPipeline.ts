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
  const setEmitCache = useWorkspaceStore((s) => s.setEmitCache);
  const setEmitWarnings = useWorkspaceStore((s) => s.setEmitWarnings);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const adapter = getBlocklyAdapter();
      const result = emitAll({
        html: adapter.getWorkspace('html'),
        css: adapter.getWorkspace('css'),
        i18n: adapter.getWorkspace('i18n'),
      });
      setEmitCache({ html: result.html, css: result.css, i18n: result.i18n });
      setEmitWarnings(result.warnings);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [htmlV, cssV, i18nV, setEmitCache, setEmitWarnings]);
}

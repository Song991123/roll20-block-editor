'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { getBlockDef } from '@/lib/blocks/registry';
import { emitAll } from '@/lib/preview/emit';
import { buildSheetDoc } from '@/lib/preview/buildDoc';
import PreviewToolbar from './PreviewToolbar';
import PreviewEmptyState from './PreviewEmptyState';

/**
 * 미리보기 메인 — iframe srcdoc, sandbox.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + 10_system_architecture §3 + D52 / D50.
 *
 * Phase 2:
 *   - workspace 의 모든 블록을 emit (lib/preview/emit) → autoPrefix → runtimeCss 합성
 *     (lib/preview/buildDoc) → iframe srcdoc 으로 박음.
 *   - xmlCache / sanitize / darkMode 변경 → 500ms 디바운스 후 재emit.
 *   - 미리보기 → 우측 인스펙터 sync 는 postMessage(r20:select) 유지.
 *   - 선택된 블록 → iframe 안 highlight 는 postMessage(r20:highlight) 송신.
 *   - 좌측 사이드 카드 drag → 본 영역 drop → appendBlockToActive.
 *
 * Phase 5+ 에서 emit-worker 로 이동 (현재는 main thread).
 */
export default function PreviewMain() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const htmlXml = useWorkspaceStore((s) => s.workspaces.html.xmlCache);
  const cssXml = useWorkspaceStore((s) => s.workspaces.css.xmlCache);
  const i18nXml = useWorkspaceStore((s) => s.workspaces.i18n.xmlCache);
  const htmlCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const cssCount = useWorkspaceStore((s) => s.workspaces.css.blockCount);
  const i18nCount = useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const activeWs = useWorkspaceStore((s) => s.activeWorkspace);
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const setEmitCache = useWorkspaceStore((s) => s.setEmitCache);
  const setEmitWarnings = useWorkspaceStore((s) => s.setEmitWarnings);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const sanitize = usePreviewStore((s) => s.sanitize);
  const sandbox = usePreviewStore((s) => s.iframeSandbox);
  const zoom = useUiStore((s) => s.previewZoom);
  const [dragOver, setDragOver] = useState(false);

  const total = htmlCount + cssCount + i18nCount;
  const isEmpty = total === 0;
  const scale = zoom === 'fit' ? 1 : zoom;

  // emit + buildDoc — 500ms 디바운스. xmlCache 가 store 에 박힐 때마다 재계산.
  const [srcdoc, setSrcdoc] = useState<string>(() =>
    buildSheetDoc({ html: '', css: '', sanitize, darkMode }),
  );

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
      const doc = buildSheetDoc({
        html: result.html,
        css: result.css,
        i18n: result.i18n,
        sanitize,
        darkMode,
      });
      setSrcdoc(doc);
    }, 500);
    return () => window.clearTimeout(handle);
    // sanitize / darkMode 변경 시 즉시 재emit 도 동일 path.
  }, [htmlXml, cssXml, i18nXml, sanitize, darkMode, setEmitCache, setEmitWarnings]);

  // 미리보기 → 우측 인스펙터 sync (postMessage).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const data = e.data;
      if (data?.type === 'r20:select' && typeof data.blockId === 'string') {
        setSelected(data.blockId, 'preview');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setSelected]);

  // 선택된 블록 → iframe 안 highlight.
  useEffect(() => {
    if (!selectedId) return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage({ type: 'r20:highlight', blockId: selectedId }, '*');
  }, [selectedId, srcdoc]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        className={`relative flex-1 min-h-0 overflow-auto p-6 ${
          dragOver ? 'ring-2 ring-primary ring-inset' : ''
        }`}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/x-r20-block-type')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!dragOver) setDragOver(true);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={(e) => {
          const type = e.dataTransfer.getData('application/x-r20-block-type');
          setDragOver(false);
          if (!type) return;
          e.preventDefault();
          const id = appendBlock(type);
          const def = getBlockDef(type);
          if (id) {
            toast(
              `'${def?.label ?? type}' 추가됨 — ${(activeWs as WorkspaceKey).toUpperCase()} 워크스페이스`,
              { duration: 1600 },
            );
          } else {
            toast.error('블록 추가 실패', { duration: 2200 });
          }
        }}
      >
        {isEmpty ? (
          <PreviewEmptyState />
        ) : (
          <div
            className="mx-auto bg-white shadow-lg ring-1 ring-border"
            style={{
              width: zoom === 'fit' ? '100%' : `${850 * (typeof scale === 'number' ? scale : 1)}px`,
              maxWidth: '960px',
              transition: 'width 120ms ease',
            }}
          >
            <iframe
              ref={iframeRef}
              title="시트 미리보기"
              sandbox={sandbox}
              srcDoc={srcdoc}
              className="block h-[calc(100vh-220px)] w-full border-0"
            />
          </div>
        )}
      </div>
      <PreviewToolbar />
    </div>
  );
}


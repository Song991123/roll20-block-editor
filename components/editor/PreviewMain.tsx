'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import PreviewToolbar from './PreviewToolbar';
import PreviewEmptyState from './PreviewEmptyState';

/**
 * 미리보기 메인 — iframe srcdoc, sandbox.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + 10_system_architecture §3 + D52 / D50.
 *
 * Phase 1 = mock srcdoc (블록 카탈로그 없으므로 빈 상태 안내).
 * Phase 2 = emit pipeline + autoPrefix + Web Worker (build-sheet-doc).
 */
export default function PreviewMain() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const emit = useWorkspaceStore((s) => s.emitCache);
  const total =
    useWorkspaceStore((s) => s.workspaces.html.blockCount) +
    useWorkspaceStore((s) => s.workspaces.css.blockCount) +
    useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const sandbox = usePreviewStore((s) => s.iframeSandbox);
  const zoom = useUiStore((s) => s.previewZoom);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);

  const srcdoc = useMemo(
    () => buildSrcdoc({ emit, darkMode }),
    [emit, darkMode],
  );

  // 미리보기 → 좌측 트리 / 우측 인스펙터 sync (postMessage).
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

  const isEmpty = total === 0;
  const scale = zoom === 'fit' ? 1 : zoom;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative flex-1 min-h-0 overflow-auto p-6">
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

function buildSrcdoc({
  emit,
  darkMode,
}: {
  emit: { html: string; css: string; i18n: string };
  darkMode: boolean;
}): string {
  // Phase 1 — Roll20 sandbox 의 일반 화이트보드. 다크모드는 토글 효과 (Phase 2 확장).
  const baseCss = `
    body { margin: 0; padding: 16px; background: ${darkMode ? '#0E1116' : '#FFFFFF'}; color: ${darkMode ? '#E6EDF3' : '#0E1116'}; font-family: 'Pretendard', 'Apple SD Gothic Neo', system-ui, sans-serif; font-size: 14px; line-height: 1.5; }
    [data-block-id] { outline: 1px dashed transparent; outline-offset: 2px; cursor: pointer; }
    [data-block-id]:hover { outline-color: rgba(47,129,247,0.5); }
  `;
  const userCss = emit.css || '';
  const userHtml = emit.html || '';
  const script = `
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-block-id]');
      if (!el) return;
      window.parent.postMessage({ type: 'r20:select', blockId: el.dataset.blockId }, '*');
    });
  `;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}\n${userCss}</style></head><body>${userHtml}<script>${script}<\/script></body></html>`;
}

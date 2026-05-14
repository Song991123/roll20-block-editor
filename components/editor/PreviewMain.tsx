'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { getBlocklyAdapter, type BlockSnapshot } from '@/lib/blockly/adapter';
import { getBlockDef } from '@/lib/blocks/registry';
import { CATEGORIES } from '@/lib/blocks/types';
import PreviewToolbar from './PreviewToolbar';
import PreviewEmptyState from './PreviewEmptyState';

/**
 * 미리보기 메인 — iframe srcdoc, sandbox.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + 10_system_architecture §3 + D52 / D50.
 *
 * Stage A-1.5:
 *   - emit 파이프라인이 아직 없으므로 placeholder srcdoc — 워크스페이스 안 블록 카드 목록.
 *   - workspace.xmlCache 변경 → 본 컴포넌트가 placeholder 재계산 → iframe srcdoc 재할당.
 *   - 좌측 사이드의 블록 카드 drag → 본 영역 drop → appendBlockToActive.
 *
 * Phase 2 = generator 파이프라인 + autoPrefix + Web Worker (build-sheet-doc).
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
  const appendBlock = useWorkspaceStore((s) => s.appendBlockToActive);
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const sandbox = usePreviewStore((s) => s.iframeSandbox);
  const zoom = useUiStore((s) => s.previewZoom);
  const [dragOver, setDragOver] = useState(false);

  // 워크스페이스 변경 → 블록 snapshot 평탄화 (placeholder emit 의 source).
  const snapshot = useMemo(() => {
    const adapter = getBlocklyAdapter();
    const out: Array<{ ws: WorkspaceKey; node: BlockSnapshot }> = [];
    for (const ws of ['html', 'css', 'i18n'] as WorkspaceKey[]) {
      for (const node of adapter.listAllBlocks(ws)) out.push({ ws, node });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlXml, cssXml, i18nXml]);

  const total = htmlCount + cssCount + i18nCount;
  const isEmpty = total === 0;
  const scale = zoom === 'fit' ? 1 : zoom;

  const srcdoc = useMemo(
    () => buildPlaceholderSrcdoc({ snapshot, darkMode }),
    [snapshot, darkMode],
  );

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
            toast(`'${def?.label ?? type}' 추가됨 — ${activeWs.toUpperCase()} 워크스페이스`, { duration: 1600 });
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

function buildPlaceholderSrcdoc({
  snapshot,
  darkMode,
}: {
  snapshot: Array<{ ws: WorkspaceKey; node: BlockSnapshot }>;
  darkMode: boolean;
}): string {
  const bg = darkMode ? '#0E1116' : '#FFFFFF';
  const fg = darkMode ? '#E6EDF3' : '#0E1116';
  const cardBg = darkMode ? '#161B22' : '#F7F8FA';
  const borderCol = darkMode ? '#2D343E' : '#D0D7DE';
  const mutedFg = darkMode ? '#8B949E' : '#6E7781';

  const baseCss = `
    body { margin: 0; padding: 24px; background: ${bg}; color: ${fg}; font-family: 'Pretendard','Apple SD Gothic Neo',system-ui,sans-serif; font-size: 13px; line-height: 1.55; }
    h1 { font-size: 14px; font-weight: 600; color: ${fg}; margin: 0 0 12px; letter-spacing: -0.01em; }
    .ws-section { margin-bottom: 20px; }
    .ws-label { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 8px; color: ${fg}; background: ${cardBg}; border: 1px solid ${borderCol}; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
    .card { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: ${cardBg}; border: 1px solid ${borderCol}; cursor: pointer; outline: 1px dashed transparent; outline-offset: 2px; transition: outline-color 80ms; }
    .card:hover { outline-color: rgba(47,129,247,0.45); }
    .card.depth-1 { margin-left: 16px; }
    .card.depth-2 { margin-left: 32px; }
    .card.depth-3 { margin-left: 48px; }
    .swatch { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 8px; }
    .swatch.shape-reporter { border-radius: 999px; width: 14px; height: 8px; }
    .swatch.shape-boolean { width: 14px; height: 8px; clip-path: polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%); border-radius: 0; }
    .label { color: ${fg}; font-weight: 500; }
    .ty { font-family: 'JetBrains Mono',ui-monospace,Menlo,monospace; font-size: 10.5px; color: ${mutedFg}; margin-left: auto; }
    .preview { color: ${mutedFg}; font-size: 11px; }
    .note { margin-top: 12px; padding: 10px 12px; border-radius: 6px; background: ${cardBg}; border: 1px dashed ${borderCol}; color: ${mutedFg}; font-size: 11px; line-height: 1.5; }
  `;

  const sections: Record<WorkspaceKey, Array<{ ws: WorkspaceKey; node: BlockSnapshot }>> = {
    html: [], css: [], i18n: [],
  };
  for (const s of snapshot) sections[s.ws].push(s);

  const wsLabels: Record<WorkspaceKey, string> = {
    html: 'HTML (시트 구조)',
    css: 'CSS (디자인)',
    i18n: '번역 (i18n)',
  };

  const sectionHtml = (Object.keys(sections) as WorkspaceKey[])
    .filter((ws) => sections[ws].length > 0)
    .map((ws) => {
      const items = sections[ws]
        .map(({ node }) => {
          const meta = node.category ? CATEGORIES[node.category] : null;
          const swatchColor = meta?.swatchVar ?? '#888';
          const shape = getBlockDef(node.type)?.shape ?? 'stack';
          const depthClass = `depth-${Math.min(3, node.depth)}`;
          const preview = node.preview ? `<span class="preview">— ${escapeHtml(node.preview)}</span>` : '';
          return `<div class="card ${depthClass}" data-block-id="${escapeAttr(node.id)}">
            <span class="swatch shape-${shape}" style="background:${swatchColor}"></span>
            <span class="label">${escapeHtml(node.label)}</span>
            ${preview}
            <span class="ty">${escapeHtml(node.type)}</span>
          </div>`;
        })
        .join('');
      return `<section class="ws-section">
        <div class="ws-label">${wsLabels[ws]}</div>
        <div class="grid">${items}</div>
      </section>`;
    })
    .join('');

  const script = `
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-block-id]');
      if (!el) return;
      window.parent.postMessage({ type: 'r20:select', blockId: el.dataset.blockId }, '*');
    });
  `;

  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body><h1>시트 미리보기 (Stage A-1.5 placeholder)</h1>${sectionHtml}<p class="note">Phase 2 에서 블록 → 진짜 Roll20 sheet.html 으로 emit 됩니다. 지금은 워크스페이스에 추가된 블록 목록만 표시.</p><script>${script}<\/script></body></html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

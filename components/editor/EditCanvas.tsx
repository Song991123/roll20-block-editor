'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { buildSheetParts } from '@/lib/preview/buildDoc';
import { mountSheetShadow } from '@/lib/preview/shadowMount';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { cn } from '@/lib/utils/cn';
import {
  FRIENDLY_WIDGET_MIME,
  appendFriendlyWidgetPreset,
  decodeFriendlyWidgetDrag,
} from '@/lib/widgets/presets';

const WORKSPACE_ORDER: WorkspaceKey[] = ['html', 'css', 'i18n'];

type DragOrigin = {
  blockId: string;
  ws: WorkspaceKey;
  kind: 'position-fields' | 'style-field';
  origLeft: number;
  origTop: number;
  origStyle: string;
  scale: number;
};

type PendingMove = {
  ws: WorkspaceKey;
  blockId: string;
  kind: DragOrigin['kind'];
  left: number;
  top: number;
  origStyle: string;
};

export default function EditCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const setShadowSelectedRef = useRef<((id: string | null) => void) | null>(null);
  const dragOriginRef = useRef<DragOrigin | null>(null);
  const pendingMoveRef = useRef<PendingMove | null>(null);
  const rafRef = useRef<number | null>(null);

  const emitHtml = useWorkspaceStore((s) => s.emitCache.html);
  const emitCss = useWorkspaceStore((s) => s.emitCache.css);
  const emitI18n = useWorkspaceStore((s) => s.emitCache.i18n);
  const htmlCount = useWorkspaceStore((s) => s.workspaces.html.blockCount);
  const cssCount = useWorkspaceStore((s) => s.workspaces.css.blockCount);
  const i18nCount = useWorkspaceStore((s) => s.workspaces.i18n.blockCount);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const previewLayer = useUiStore((s) => s.previewLayer);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleSnap = useUiStore((s) => s.toggleSnapEnabled);
  const sanitize = usePreviewStore((s) => s.sanitize);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const [lastMove, setLastMove] = useState<string | null>(null);

  const effectiveLayer = editSubmode === 'rolltemplate' ? 'roll' : previewLayer;
  const total = htmlCount + cssCount + i18nCount;
  const isEmpty = total === 0;

  const parts = useMemo(
    () =>
      buildSheetParts({
        html: emitHtml,
        css: emitCss,
        i18n: emitI18n,
        sanitize,
        darkMode,
        previewLayer: effectiveLayer,
        includeEditorOverlays: true,
      }),
    [emitHtml, emitCss, emitI18n, sanitize, darkMode, effectiveLayer],
  );

  const snap = useCallback(
    (value: number) => {
      const px = Math.max(0, Math.round(value));
      return snapEnabled ? Math.round(px / 8) * 8 : px;
    },
    [snapEnabled],
  );

  const flushPendingMove = useCallback(() => {
    const pending = pendingMoveRef.current;
    pendingMoveRef.current = null;
    rafRef.current = null;
    if (!pending) return;

    const adapter = getBlocklyAdapter();
    if (pending.kind === 'position-fields') {
      adapter.setBlockField(pending.ws, pending.blockId, 'LEFT_PX', String(pending.left));
      adapter.setBlockField(pending.ws, pending.blockId, 'TOP_PX', String(pending.top));
      return;
    }

    adapter.setBlockField(
      pending.ws,
      pending.blockId,
      'STYLE',
      upsertCssDeclarations(pending.origStyle, {
        position: 'absolute',
        left: `${pending.left}px`,
        top: `${pending.top}px`,
      }),
    );
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(FRIENDLY_WIDGET_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    const payload = e.dataTransfer.getData(FRIENDLY_WIDGET_MIME);
    if (!payload) return;
    const preset = decodeFriendlyWidgetDrag(payload);
    if (!preset) return;
    e.preventDefault();

    e.stopPropagation();

    const pos = measureDropPosition(hostRef.current, scrollRef.current, e.clientX, e.clientY);
    const id = appendFriendlyWidgetPreset(preset, pos);
    if (id) {
      setLastMove(`${preset.label} 추가: ${Math.round(pos.left)}px, ${Math.round(pos.top)}px`);
    }
  }, []);

  const handleNativeDragOver = useCallback((event: Event) => {
    const e = event as DragEvent;
    if (!hasFriendlyWidgetPayload(e.dataTransfer)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleNativeDrop = useCallback((event: Event) => {
    const e = event as DragEvent;
    const payload = e.dataTransfer?.getData(FRIENDLY_WIDGET_MIME) ?? '';
    if (!payload) return;
    const preset = decodeFriendlyWidgetDrag(payload);
    if (!preset) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = measureDropPosition(hostRef.current, scrollRef.current, e.clientX, e.clientY);
    const id = appendFriendlyWidgetPreset(preset, pos);
    if (id) {
      setLastMove(`${preset.label} 추가: ${Math.round(pos.left)}px, ${Math.round(pos.top)}px`);
    }
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const mounted = mountSheetShadow(host, {
      html: parts.html,
      css: parts.css,
      layer: effectiveLayer,
      darkMode,
      disableNativeControls: true,
      disableInlineTextEdit: true,
      disableContextMenu: true,
      onSelect: (blockId) => {
        setShadowSelectedRef.current?.(blockId);
      },
      onDragStart: (blockId) => {
        const origin = resolveDragOrigin(host, blockId);
        dragOriginRef.current = origin;
        if (!origin) {
          setLastMove('이 블록은 위치를 저장할 STYLE/LEFT/TOP 필드가 없어 이동을 건너뜀');
        }
      },
      onDragMove: (blockId, dx, dy) => {
        const origin = dragOriginRef.current;
        if (!origin || origin.blockId !== blockId) return;
        const scale = origin.scale || 1;
        const left = snap(origin.origLeft + dx / scale);
        const top = snap(origin.origTop + dy / scale);
        pendingMoveRef.current = {
          ws: origin.ws,
          blockId,
          kind: origin.kind,
          left,
          top,
          origStyle: origin.origStyle,
        };
        setLastMove(`${left}px, ${top}px`);
        if (rafRef.current == null) {
          rafRef.current = window.requestAnimationFrame(flushPendingMove);
        }
      },
      onDragEnd: () => {
        if (rafRef.current != null) {
          window.cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        flushPendingMove();
        dragOriginRef.current = null;
      },
    });

    setShadowSelectedRef.current = mounted.setSelected;
    const shadowBody = mounted.shadow.querySelector<HTMLElement>('body.charsheet');
    host.addEventListener('dragover', handleNativeDragOver);
    host.addEventListener('drop', handleNativeDrop);
    mounted.shadow.addEventListener('dragover', handleNativeDragOver);
    mounted.shadow.addEventListener('drop', handleNativeDrop);
    shadowBody?.addEventListener('dragover', handleNativeDragOver);
    shadowBody?.addEventListener('drop', handleNativeDrop);
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingMoveRef.current = null;
      dragOriginRef.current = null;
      setShadowSelectedRef.current = null;
      host.removeEventListener('dragover', handleNativeDragOver);
      host.removeEventListener('drop', handleNativeDrop);
      mounted.shadow.removeEventListener('dragover', handleNativeDragOver);
      mounted.shadow.removeEventListener('drop', handleNativeDrop);
      shadowBody?.removeEventListener('dragover', handleNativeDragOver);
      shadowBody?.removeEventListener('drop', handleNativeDrop);
      mounted.cleanup();
    };
  }, [
    parts,
    effectiveLayer,
    darkMode,
    flushPendingMove,
    snap,
    handleNativeDragOver,
    handleNativeDrop,
  ]);

  return (
    <div
      className="flex flex-1 min-h-0 flex-col bg-[var(--bg-canvas)]"
      data-testid="edit-canvas-root"
      data-edit-submode={editSubmode}
    >
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs">
        <span className="font-medium text-foreground">
          {editSubmode === 'rolltemplate' ? '굴림틀 배치' : '시트 배치'}
        </span>
        <button
          type="button"
          onClick={toggleSnap}
          className={cn(
            'rounded border px-2 py-0.5 text-xs',
            snapEnabled
              ? 'border-[var(--color-primary,#2563eb)] bg-[var(--color-primary,#2563eb)] text-white'
              : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)]',
          )}
          title="8px 단위로 이동"
          data-testid="edit-canvas-snap-toggle"
        >
          snap {snapEnabled ? '8px' : 'off'}
        </button>
        <div className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {lastMove ?? '드래그하면 HTML style/위치 필드에 반영'}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto p-5"
        data-testid="edit-canvas-scroll"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {isEmpty ? (
          <div
            className="flex min-h-[420px] items-center justify-center rounded border border-dashed border-border bg-[var(--bg-elevated)] text-sm text-muted-foreground"
            data-testid="edit-canvas-empty"
          >
            HTML/CSS를 불러오면 미리보기와 같은 편집 화면이 여기에 표시됩니다.
          </div>
        ) : (
          <div className="mx-auto min-w-0 max-w-full">
            <div
              ref={hostRef}
              data-testid="edit-canvas-shadow-host"
              className="block min-h-[calc(100vh-190px)] w-full overflow-visible bg-white"
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function measureDropPosition(
  host: HTMLElement | null,
  fallback: HTMLElement | null,
  clientX: number,
  clientY: number,
): { left: number; top: number } {
  const shadow = host?.shadowRoot;
  const root =
    shadow?.querySelector<HTMLElement>('body.charsheet') ??
    shadow?.querySelector<HTMLElement>('.charsheet');
  const target = root ?? host ?? fallback;
  if (!target) return { left: 24, top: 24 };
  const rect = target.getBoundingClientRect();
  return {
    left: Math.max(0, Math.round(clientX - rect.left + target.scrollLeft)),
    top: Math.max(0, Math.round(clientY - rect.top + target.scrollTop)),
  };
}

function hasFriendlyWidgetPayload(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  for (let i = 0; i < dataTransfer.types.length; i += 1) {
    if (dataTransfer.types[i] === FRIENDLY_WIDGET_MIME) return true;
  }
  return false;
}

function resolveDragOrigin(host: HTMLElement, blockId: string): DragOrigin | null {
  const adapter = getBlocklyAdapter();
  const active = useWorkspaceStore.getState().activeWorkspace;
  const order = [active, ...WORKSPACE_ORDER].filter(
    (ws, idx, arr): ws is WorkspaceKey => !!ws && arr.indexOf(ws) === idx,
  );

  for (const ws of order) {
    if (!adapter.getBlock(ws, blockId)) continue;
    const hasLeft = adapter.hasBlockField(ws, blockId, 'LEFT_PX');
    const hasTop = adapter.hasBlockField(ws, blockId, 'TOP_PX');
    const style = adapter.getBlockField(ws, blockId, 'STYLE') ?? '';
    const scale = getHostScale(host);

    if (hasLeft && hasTop) {
      return {
        blockId,
        ws,
        kind: 'position-fields',
        origLeft: parsePx(adapter.getBlockField(ws, blockId, 'LEFT_PX')),
        origTop: parsePx(adapter.getBlockField(ws, blockId, 'TOP_PX')),
        origStyle: style,
        scale,
      };
    }

    if (adapter.hasBlockField(ws, blockId, 'STYLE')) {
      const measured = measureBlockPosition(host, blockId);
      return {
        blockId,
        ws,
        kind: 'style-field',
        origLeft: parseCssPx(style, 'left') ?? measured.left,
        origTop: parseCssPx(style, 'top') ?? measured.top,
        origStyle: style,
        scale,
      };
    }
  }

  return null;
}

function getHostScale(host: HTMLElement): number {
  const rect = host.getBoundingClientRect();
  return host.offsetWidth > 0 ? rect.width / host.offsetWidth : 1;
}

function measureBlockPosition(host: HTMLElement, blockId: string): { left: number; top: number } {
  const shadow = host.shadowRoot;
  if (!shadow) return { left: 0, top: 0 };
  const escaped = escapeAttr(blockId);
  const el = shadow.querySelector<HTMLElement>(`[data-r20-block-id="${escaped}"]`);
  const root =
    shadow.querySelector<HTMLElement>('body.charsheet') ??
    shadow.querySelector<HTMLElement>('.charsheet');
  if (!el || !root) return { left: 0, top: 0 };
  const elRect = el.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  return {
    left: Math.max(0, Math.round(elRect.left - rootRect.left + root.scrollLeft)),
    top: Math.max(0, Math.round(elRect.top - rootRect.top + root.scrollTop)),
  };
}

function parsePx(value: string | null): number {
  const n = Number.parseFloat(value ?? '0');
  return Number.isFinite(n) ? n : 0;
}

function parseCssPx(style: string, prop: 'left' | 'top'): number | null {
  const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px\\s*(?:;|$)`, 'i');
  const match = style.match(re);
  if (!match) return null;
  const n = Number.parseFloat(match[1]);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function upsertCssDeclarations(style: string, declarations: Record<string, string>): string {
  const map = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (key && value) map.set(key, value);
  }
  for (const [key, value] of Object.entries(declarations)) {
    map.set(key.toLowerCase(), value);
  }
  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function escapeAttr(raw: string): string {
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(raw)
    : raw.replace(/(["\\])/g, '\\$1');
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useUiStore } from '@/lib/stores/uiStore';
import {
  useWorkspaceStore,
  type WidgetInstance,
  type WidgetTarget,
  type WidgetType,
} from '@/lib/stores/workspaceStore';
import { WidgetRender } from '@/lib/widgets/previews';
import { cn } from '@/lib/utils/cn';

/**
 * EditCanvas — WYSIWYG 시트/굴림틀 캔버스 (spec 17 §6).
 *
 * - 시트: width=850px (조정 가능 640/740/850/960/1000)
 * - 굴림틀: width=280px (조정 가능 260/280/300/350)
 * - 빈 상태: empty state message
 * - 위젯 = position: absolute (x/y/w/h px), 실 위젯 모양
 * - snap 8px on/off (uiStore.snapEnabled)
 *
 * A-2 단계: 컨테이너 + 위젯 표시 + 클릭 선택 (A-5 본격 드래그)
 * A-4 단계에서 dnd-kit Droppable 으로 wrap 됨.
 */

const SHEET_WIDTH_OPTIONS = [640, 740, 850, 960, 1000];
const ROLLTEMPLATE_WIDTH_OPTIONS = [260, 280, 300, 350];

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5];

export default function EditCanvas() {
  const editSubmode = useUiStore((s) => s.editSubmode);
  const sheetWidth = useUiStore((s) => s.sheetCanvasWidth);
  const rolltemplateWidth = useUiStore((s) => s.rolltemplateCanvasWidth);
  const setSheetWidth = useUiStore((s) => s.setSheetCanvasWidth);
  const setRolltemplateWidth = useUiStore((s) => s.setRolltemplateCanvasWidth);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleSnap = useUiStore((s) => s.toggleSnapEnabled);
  const selectedWidgetId = useUiStore((s) => s.selectedWidgetId);
  const setSelectedWidgetId = useUiStore((s) => s.setSelectedWidgetId);
  const hoveredWidgetId = useUiStore((s) => s.hoveredWidgetId);

  const sheetWidgets = useWorkspaceStore((s) => s.sheetWidgets);
  const rolltemplateWidgets = useWorkspaceStore((s) => s.rolltemplateWidgets);
  const addWidget = useWorkspaceStore((s) => s.addWidget);
  const updateWidget = useWorkspaceStore((s) => s.updateWidget);
  const removeWidget = useWorkspaceStore((s) => s.removeWidget);

  const target: WidgetTarget = editSubmode === 'sheet' ? 'sheet' : 'rolltemplate';
  const widgets = target === 'sheet' ? sheetWidgets : rolltemplateWidgets;
  const canvasWidth = target === 'sheet' ? sheetWidth : rolltemplateWidth;
  const widthOptions = target === 'sheet' ? SHEET_WIDTH_OPTIONS : ROLLTEMPLATE_WIDTH_OPTIONS;
  const setWidth = target === 'sheet' ? setSheetWidth : setRolltemplateWidth;

  const minHeight = target === 'sheet' ? 1100 : 400;

  const [zoom, setZoom] = useState<number>(1);

  // 키보드 — 화살표 = 1px / Shift+화살표 = 10px / Delete/Backspace = 삭제.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const id = useUiStore.getState().selectedWidgetId;
      if (!id) return;
      const isInput =
        (e.target instanceof HTMLInputElement) ||
        (e.target instanceof HTMLTextAreaElement) ||
        (e.target instanceof HTMLSelectElement);
      if (isInput) return; // 캔버스 안 form 요소 입력 중에는 화살표 무시.
      const submode = useUiStore.getState().editSubmode;
      const tgt: WidgetTarget = submode === 'sheet' ? 'sheet' : 'rolltemplate';
      const list = useWorkspaceStore.getState();
      const widgets = tgt === 'sheet' ? list.sheetWidgets : list.rolltemplateWidgets;
      const w = widgets.find((x) => x.id === id);
      if (!w) return;
      const step = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeWidget(tgt, id);
        useUiStore.getState().setSelectedWidgetId(null);
        return;
      }
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        updateWidget(tgt, id, { x: Math.max(0, w.x + dx), y: Math.max(0, w.y + dy) });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [updateWidget, removeWidget]);

  const onZoomChange = useCallback((dir: 'in' | 'out' | 'reset') => {
    setZoom((z) => {
      if (dir === 'reset') return 1;
      const idx = ZOOM_STEPS.indexOf(z);
      if (dir === 'in') return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, idx + 1)] ?? z;
      return ZOOM_STEPS[Math.max(0, idx - 1)] ?? z;
    });
  }, []);

  // 캔버스 빈 영역 클릭 → 선택 해제.
  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        setSelectedWidgetId(null);
      }
    },
    [setSelectedWidgetId],
  );

  // Snap helper.
  const snap = useCallback(
    (v: number) => (snapEnabled ? Math.round(v / 8) * 8 : Math.round(v)),
    [snapEnabled],
  );

  // Drop handler — WidgetGallery 의 카드 (또는 외부) dataTransfer 에 'application/x-widget-type'.
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type =
        (e.dataTransfer.getData('application/x-widget-type') as string) ||
        (e.dataTransfer.getData('text/plain') as string);
      if (!type) return;
      const node = surfaceRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      // zoom 보정: clientX/Y 는 viewport, surface 는 scale(zoom) 적용 — div 의 실 width = canvasWidth*zoom.
      // 따라서 위젯 좌표 = (clientX - rect.left) / zoom.
      const px = (e.clientX - rect.left) / zoom;
      const py = (e.clientY - rect.top) / zoom;
      const x = snap(Math.max(0, px));
      const y = snap(Math.max(0, py));
      const id = addWidget(target, type as WidgetType, x, y);
      setSelectedWidgetId(id);
    },
    [addWidget, snap, target, zoom, setSelectedWidgetId],
  );

  return (
    <div
      className="flex flex-1 min-h-0 flex-col bg-[var(--bg-canvas)]"
      data-testid="edit-canvas-root"
      data-edit-submode={editSubmode}
    >
      <CanvasToolbar
        target={target}
        widthOptions={widthOptions}
        canvasWidth={canvasWidth}
        setWidth={setWidth}
        zoom={zoom}
        onZoomChange={onZoomChange}
        snapEnabled={snapEnabled}
        onToggleSnap={toggleSnap}
      />
      <div className="flex-1 overflow-auto" data-testid="edit-canvas-scroll">
        <div
          className="mx-auto my-6"
          style={{
            width: canvasWidth * zoom,
            transformOrigin: 'top left',
          }}
        >
          <div
            id="edit-canvas-surface"
            ref={surfaceRef}
            data-testid="edit-canvas-surface"
            data-target={target}
            onMouseDown={onCanvasMouseDown}
            onDragOver={onDragOver}
            onDrop={onDrop}
            style={{
              position: 'relative',
              width: canvasWidth,
              minHeight,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              background: 'var(--bg-app, #fff)',
              border: '1px solid var(--border, #d4d4d8)',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            {widgets.length === 0 ? (
              <EmptyState target={target} />
            ) : (
              widgets.map((w) => (
                <CanvasWidget
                  key={w.id}
                  widget={w}
                  target={target}
                  zoom={zoom}
                  snapEnabled={snapEnabled}
                  isSelected={selectedWidgetId === w.id}
                  isHovered={hoveredWidgetId === w.id}
                  onSelect={() => setSelectedWidgetId(w.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasToolbar({
  target,
  widthOptions,
  canvasWidth,
  setWidth,
  zoom,
  onZoomChange,
  snapEnabled,
  onToggleSnap,
}: {
  target: WidgetTarget;
  widthOptions: number[];
  canvasWidth: number;
  setWidth: (w: number) => void;
  zoom: number;
  onZoomChange: (dir: 'in' | 'out' | 'reset') => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}) {
  const isCustom = !widthOptions.includes(canvasWidth);

  return (
    <div
      className="flex h-9 shrink-0 items-center gap-3 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs"
      data-testid="edit-canvas-toolbar"
    >
      <label className="flex items-center gap-1">
        <span className="text-muted-foreground">폭</span>
        <select
          className="rounded border border-border bg-[var(--bg-elevated-2)] px-1.5 py-0.5 text-xs"
          value={isCustom ? 'custom' : String(canvasWidth)}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'custom') {
              const n = window.prompt('캔버스 폭 (px):', String(canvasWidth));
              if (n) {
                const px = parseInt(n, 10);
                if (Number.isFinite(px) && px > 0) setWidth(px);
              }
              return;
            }
            setWidth(parseInt(v, 10));
          }}
          data-testid="edit-canvas-width-select"
        >
          {widthOptions.map((w) => (
            <option key={w} value={w}>
              {w}px{target === 'sheet' && w === 850 ? ' (기본)' : ''}
              {target === 'rolltemplate' && w === 280 ? ' (기본)' : ''}
            </option>
          ))}
          <option value="custom">사용자 지정…</option>
        </select>
      </label>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-hover)]"
          onClick={() => onZoomChange('out')}
          aria-label="축소"
          data-testid="edit-canvas-zoom-out"
        >
          −
        </button>
        <button
          type="button"
          className="min-w-12 rounded px-1.5 py-0.5 text-center hover:bg-[var(--bg-hover)] tabular-nums"
          onClick={() => onZoomChange('reset')}
          aria-label="줌 리셋"
          data-testid="edit-canvas-zoom-reset"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 hover:bg-[var(--bg-hover)]"
          onClick={() => onZoomChange('in')}
          aria-label="확대"
          data-testid="edit-canvas-zoom-in"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleSnap}
        className={cn(
          'rounded border px-2 py-0.5 text-xs',
          snapEnabled
            ? 'border-[var(--color-primary,#2563eb)] bg-[var(--color-primary,#2563eb)] text-white'
            : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground hover:bg-[var(--bg-hover)]',
        )}
        title="snap 8px (on/off)"
        data-testid="edit-canvas-snap-toggle"
      >
        snap {snapEnabled ? '■ 8' : '□'}
      </button>

      <div className="ml-auto text-[10px] text-muted-foreground tabular-nums">
        {target === 'sheet' ? '시트' : '굴림틀'} · {canvasWidth}px
      </div>
    </div>
  );
}

function EmptyState({ target }: { target: WidgetTarget }) {
  return (
    <div
      className="pointer-events-none flex h-full min-h-[300px] w-full select-none flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground"
      data-testid="edit-canvas-empty"
    >
      <div className="text-base">위젯을 드래그해서 시작하세요</div>
      <div className="flex items-center gap-2 text-xs">
        <span>← 좌측 갤러리</span>
        <span aria-hidden>·</span>
        <span>{target === 'sheet' ? '850px' : '280px'} 캔버스</span>
      </div>
    </div>
  );
}

function CanvasWidget({
  widget,
  target,
  zoom,
  snapEnabled,
  isSelected,
  isHovered,
  onSelect,
}: {
  widget: WidgetInstance;
  target: WidgetTarget;
  zoom: number;
  snapEnabled: boolean;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
}) {
  const setHoveredWidgetId = useUiStore((s) => s.setHoveredWidgetId);
  const updateWidget = useWorkspaceStore((s) => s.updateWidget);

  const style: CSSProperties = {
    position: 'absolute',
    left: widget.x,
    top: widget.y,
    width: widget.width,
    height: widget.height,
    cursor: 'move',
    boxSizing: 'border-box',
    outline: isSelected
      ? '2px solid var(--color-primary, #2563eb)'
      : isHovered
        ? '1px dashed var(--color-primary, #93c5fd)'
        : 'none',
    outlineOffset: 1,
    borderRadius: 4,
  };

  // pointer drag — form 요소 위에서는 시작 안 함.
  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const targetEl = e.target as HTMLElement;
    if (
      targetEl.tagName === 'INPUT' ||
      targetEl.tagName === 'TEXTAREA' ||
      targetEl.tagName === 'SELECT' ||
      targetEl.tagName === 'BUTTON' ||
      targetEl.closest('input, textarea, select, button')
    ) {
      return; // form 입력 우선 — 드래그 시작 안 함.
    }
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = widget.x;
    const origY = widget.y;
    const snap = (v: number) =>
      snapEnabled ? Math.round(v / 8) * 8 : Math.round(v);
    const onMove = (ev: globalThis.MouseEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      updateWidget(target, widget.id, {
        x: snap(Math.max(0, origX + dx)),
        y: snap(Math.max(0, origY + dy)),
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      style={style}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHoveredWidgetId(widget.id)}
      onMouseLeave={() => setHoveredWidgetId(null)}
      data-testid={`canvas-widget-${widget.id}`}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
    >
      <WidgetRender type={widget.type} attrs={widget.attrs} />
    </div>
  );
}

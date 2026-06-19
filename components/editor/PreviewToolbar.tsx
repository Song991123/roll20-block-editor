'use client';

import { useState } from 'react';
import { Maximize2, Minus, Plus, RefreshCw, Moon, Sun, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUiStore } from '@/lib/stores/uiStore';
import { usePreviewStore } from '@/lib/stores/previewStore';

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * 미리보기 줌 / 옵션 컨트롤.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + D52 (fit-to-width default).
 * Polish: Phase A-9 — 통일된 버튼 크기 (h-8) + 통일된 lucide 아이콘 (h-4 w-4) +
 *         레이어 dropdown 은 Radix Portal 기반 (DropdownMenu) 사용해 viewport
 *         밖으로 잘리는 것 방지 (`side="top"` + `sideOffset=6`).
 */
export default function PreviewToolbar() {
  const zoom = useUiStore((s) => s.previewZoom);
  const setZoom = useUiStore((s) => s.setPreviewZoom);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const setDarkMode = usePreviewStore((s) => s.setDarkMode);
  const legacyCssSanitize = usePreviewStore((s) => s.legacyCssSanitize);
  const setLegacyCssSanitize = usePreviewStore((s) => s.setLegacyCssSanitize);

  const numericZoom = typeof zoom === 'number' ? zoom : 1;

  const sheetCanvasWidth = useUiStore((s) => s.sheetCanvasWidth);
  const setSheetCanvasWidth = useUiStore((s) => s.setSheetCanvasWidth);
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const widthValue = widthDraft ?? String(sheetCanvasWidth);

  const stepZoom = (dir: 1 | -1) => {
    const idx = ZOOM_STEPS.indexOf(numericZoom);
    const nextIdx = idx === -1
      ? ZOOM_STEPS.findIndex((s) => s >= numericZoom)
      : Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir));
    setZoom(ZOOM_STEPS[nextIdx] ?? ZOOM_STEPS[2]);
  };

  const commitWidthDraft = () => {
    const next = Number.parseInt(widthValue, 10);
    if (!Number.isFinite(next)) {
      setWidthDraft(null);
      return;
    }
    setSheetCanvasWidth(next);
    setWidthDraft(null);
  };

  // 모든 아이콘 버튼: h-8 w-8, 아이콘 h-4 w-4 — 통일성.
  const ICON_BTN = 'h-8 w-8';
  const ICON_SIZE = 'h-4 w-4';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-11 shrink-0 items-center justify-center gap-1 border-t border-border bg-[var(--bg-elevated)] px-3 text-xs"
        data-testid="preview-toolbar"
      >
        {/* 줌 컨트롤 그룹 */}
        <label className="inline-flex h-8 items-center gap-1.5 rounded border border-border bg-[var(--bg-elevated-2)] px-2 text-[11px] text-muted-foreground">
          <span>W</span>
          <input
            type="text"
            inputMode="numeric"
            min={320}
            max={2000}
            step={10}
            value={widthValue}
            onFocus={() => setWidthDraft(String(sheetCanvasWidth))}
            onChange={(e) => setWidthDraft(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={commitWidthDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setWidthDraft(null);
                e.currentTarget.blur();
              }
            }}
            className="h-6 w-16 bg-transparent text-right font-mono text-foreground outline-none"
            aria-label="시트 가로 크기"
          />
          <span>px</span>
        </label>

        <span className="mx-1.5 h-5 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={ICON_BTN}
              onClick={() => stepZoom(-1)}
              aria-label="축소"
            >
              <Minus className={ICON_SIZE} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">축소</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={zoom === 'fit' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-[11px]"
              onClick={() => setZoom('fit')}
              aria-label="화면 맞춤"
              aria-pressed={zoom === 'fit'}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>맞춤</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">화면 폭에 맞춤</TooltipContent>
        </Tooltip>

        <span className="min-w-[52px] text-center font-mono tabular-nums text-muted-foreground">
          {zoom === 'fit' ? '맞춤' : `${Math.round(numericZoom * 100)}%`}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={ICON_BTN}
              onClick={() => stepZoom(1)}
              aria-label="확대"
            >
              <Plus className={ICON_SIZE} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">확대</TooltipContent>
        </Tooltip>

        <span className="mx-1.5 h-5 w-px bg-border" />

        {/* 다크 모드 토글 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={darkMode ? 'secondary' : 'ghost'}
              size="icon"
              className={ICON_BTN}
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? '라이트 모드로' : '다크 모드로'}
              aria-pressed={darkMode}
            >
              {darkMode ? <Sun className={ICON_SIZE} /> : <Moon className={ICON_SIZE} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{darkMode ? '라이트' : '다크'} 미리보기</TooltipContent>
        </Tooltip>

        <span className="mx-1.5 h-5 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={legacyCssSanitize ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-[11px]"
              onClick={() => setLegacyCssSanitize(!legacyCssSanitize)}
              aria-label="구버전 Roll20 CSS 무해화"
              aria-pressed={legacyCssSanitize}
              data-testid="preview-legacy-css-toggle"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>구버전 CSS</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {legacyCssSanitize
              ? '구버전 Roll20 CSS 무해화 적용 중'
              : '신버전/원본 CSS 기준 미리보기'}
          </TooltipContent>
        </Tooltip>

        {/* 새로고침 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={ICON_BTN}
              aria-label="다시 그리기"
            >
              <RefreshCw className={ICON_SIZE} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">다시 그리기</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

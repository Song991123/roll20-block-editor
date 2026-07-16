'use client';

import { useState } from 'react';
import { Maximize2, Minus, Moon, Plus, ShieldAlert, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PreviewToolbar() {
  const zoom = useUiStore((s) => s.previewZoom);
  const setZoom = useUiStore((s) => s.setPreviewZoom);
  const sheetCanvasWidth = useUiStore((s) => s.sheetCanvasWidth);
  const setSheetCanvasWidth = useUiStore((s) => s.setSheetCanvasWidth);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const setDarkMode = usePreviewStore((s) => s.setDarkMode);
  const legacyCssSanitize = usePreviewStore((s) => s.legacyCssSanitize);
  const setRoll20CompatibilityMode = usePreviewStore((s) => s.setRoll20CompatibilityMode);
  const [widthDraft, setWidthDraft] = useState<string | null>(null);

  const numericZoom = typeof zoom === 'number' ? zoom : 1;
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

  const iconButton = 'h-8 w-8';
  const iconSize = 'h-4 w-4';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-11 shrink-0 items-center justify-center gap-1 border-t border-border bg-[var(--bg-elevated)] px-3 text-xs"
        data-testid="preview-toolbar"
      >
        <label className="inline-flex h-8 items-center gap-1.5 rounded border border-border bg-[var(--bg-elevated-2)] px-2 text-[11px] text-muted-foreground">
          <span>가로</span>
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
              className={iconButton}
              onClick={() => stepZoom(-1)}
              aria-label="축소"
            >
              <Minus className={iconSize} />
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
              aria-label="화면에 맞추기"
              aria-pressed={zoom === 'fit'}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>맞춤</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">현재 창 안에 시트 전체를 맞춰 봅니다.</TooltipContent>
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
              className={iconButton}
              onClick={() => stepZoom(1)}
              aria-label="확대"
            >
              <Plus className={iconSize} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">확대</TooltipContent>
        </Tooltip>

        <span className="mx-1.5 h-5 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={darkMode ? 'secondary' : 'ghost'}
              size="icon"
              className={iconButton}
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? '밝은 배경으로 보기' : '어두운 배경으로 보기'}
              aria-pressed={darkMode}
            >
              {darkMode ? <Sun className={iconSize} /> : <Moon className={iconSize} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{darkMode ? '밝은 배경' : '어두운 배경'}으로 보기</TooltipContent>
        </Tooltip>

        <span className="mx-1.5 h-5 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={legacyCssSanitize ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-[11px]"
              onClick={() => setRoll20CompatibilityMode(legacyCssSanitize ? 'modern' : 'legacy')}
              aria-label="Roll20 렌더 버전"
              aria-pressed={legacyCssSanitize}
              data-testid="preview-legacy-css-toggle"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{legacyCssSanitize ? '구버전' : '신버전'}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {legacyCssSanitize
              ? '구버전 Roll20처럼 HTML 클래스 보정과 CSS 무해화를 적용합니다.'
              : '신버전 Roll20처럼 작성한 HTML/CSS를 그대로 해석합니다.'}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

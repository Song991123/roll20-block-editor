'use client';

import { Maximize2, Minus, Plus, RefreshCw, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUiStore } from '@/lib/stores/uiStore';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { cn } from '@/lib/utils/cn';

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * 미리보기 줌 / 옵션 컨트롤.
 *
 * Anchor: docs/spec/08_wireframes.md W2-C + D52 (fit-to-width default).
 */
export default function PreviewToolbar() {
  const zoom = useUiStore((s) => s.previewZoom);
  const setZoom = useUiStore((s) => s.setPreviewZoom);
  const darkMode = usePreviewStore((s) => s.darkMode);
  const setDarkMode = usePreviewStore((s) => s.setDarkMode);

  const numericZoom = typeof zoom === 'number' ? zoom : 1;

  const stepZoom = (dir: 1 | -1) => {
    const idx = ZOOM_STEPS.indexOf(numericZoom);
    const nextIdx = idx === -1
      ? ZOOM_STEPS.findIndex((s) => s >= numericZoom)
      : Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir));
    setZoom(ZOOM_STEPS[nextIdx] ?? ZOOM_STEPS[2]);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-10 shrink-0 items-center justify-center gap-1.5 border-t border-border bg-[var(--bg-elevated)] px-3 text-xs">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => stepZoom(-1)}
              aria-label="축소"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>축소</TooltipContent>
        </Tooltip>

        <button
          type="button"
          onClick={() => setZoom('fit')}
          className={cn(
            'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors',
            zoom === 'fit'
              ? 'bg-[var(--bg-active)] text-foreground'
              : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
          )}
        >
          <Maximize2 className="h-3 w-3" />
          fit
        </button>

        <span className="min-w-[44px] text-center font-mono tabular-nums text-muted-foreground">
          {zoom === 'fit' ? '맞춤' : `${Math.round(numericZoom * 100)}%`}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => stepZoom(1)}
              aria-label="확대"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>확대</TooltipContent>
        </Tooltip>

        <span className="mx-2 h-4 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? '라이트 모드로' : '다크 모드로'}
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{darkMode ? '라이트' : '다크'} 미리보기</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="다시 그리기"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>다시 그리기</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

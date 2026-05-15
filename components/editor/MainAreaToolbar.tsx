'use client';

import { cn } from '@/lib/utils/cn';
import { useUiStore, type MainMode } from '@/lib/stores/uiStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * MainAreaToolbar — 메인 영역 상단 모드 토글.
 *
 * Anchor: D26 ②-재재 — 분할 뷰 default + 한쪽만 모드.
 *
 * 좌측: [⬌ 분할] / [🟦 조립만] / [📄 미리보기만]
 * 우측: 분할 모드일 때 현재 비율 표시 (resizer 드래그 피드백).
 *
 * 워크스페이스 탭 (HTML / CSS / i18n) 은 WorkspacePane 의 sub-toolbar 로 이동.
 */

const MODES: Array<{
  key: MainMode;
  label: string;
  symbol: string;
  tooltip: string;
}> = [
  { key: 'split', label: '분할', symbol: '⬌', tooltip: '분할 보기 — 양쪽 동시' },
  { key: 'assemble', label: '조립만', symbol: '🟦', tooltip: '워크스페이스만 (한쪽 max)' },
  { key: 'preview', label: '미리보기만', symbol: '📄', tooltip: '미리보기만 (한쪽 max)' },
];

export default function MainAreaToolbar() {
  const mainMode = useUiStore((s) => s.mainMode);
  const setMainMode = useUiStore((s) => s.setMainMode);
  const mainSplit = useUiStore((s) => s.mainSplit);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs">
        <div
          role="tablist"
          aria-label="메인 영역 모드"
          className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-elevated-2)] p-0.5"
        >
          {MODES.map((mode) => {
            const isActive = mainMode === mode.key;
            return (
              <Tooltip key={mode.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setMainMode(mode.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors',
                      isActive
                        ? 'bg-[var(--bg-active)] text-foreground'
                        : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                    )}
                    data-testid={`main-mode-${mode.key}`}
                  >
                    <span aria-hidden="true" className="text-[13px] leading-none">
                      {mode.symbol}
                    </span>
                    {mode.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{mode.tooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="text-[10px] text-muted-foreground tabular-nums">
          {mainMode === 'split' && (
            <span data-testid="split-ratio">
              {Math.round(mainSplit.left)}% / {Math.round(mainSplit.right)}%
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

'use client';

import { cn } from '@/lib/utils/cn';
import { useUiStore, type EditSubmode, type MainMode } from '@/lib/stores/uiStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const MODES: Array<{
  key: MainMode;
  label: string;
  symbol: string;
  tooltip: string;
}> = [
  { key: 'edit', label: '편집', symbol: '✥', tooltip: '시트 위에서 요소를 직접 선택하고 배치합니다.' },
  { key: 'split', label: '분할', symbol: '▥', tooltip: '블록 작업공간과 로컬 미리보기를 함께 봅니다.' },
  { key: 'assemble', label: '블록', symbol: '▤', tooltip: '블록 작업공간만 넓게 봅니다.' },
  { key: 'preview', label: '미리보기', symbol: '◉', tooltip: 'Roll20 형식 로컬 미리보기만 봅니다.' },
];

const SUBMODES: Array<{ key: EditSubmode; label: string; tooltip: string }> = [
  { key: 'sheet', label: '시트', tooltip: '캐릭터 시트 화면을 편집합니다.' },
  { key: 'rolltemplate', label: '굴림 결과', tooltip: '채팅에 표시되는 rolltemplate 화면을 편집합니다.' },
];

export default function MainAreaToolbar() {
  const mainMode = useUiStore((s) => s.mainMode);
  const setMainMode = useUiStore((s) => s.setMainMode);
  const mainSplit = useUiStore((s) => s.mainSplit);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const setEditSubmode = useUiStore((s) => s.setEditSubmode);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs">
        <div
          role="tablist"
          aria-label="화면 모드"
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

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums">
          {mainMode === 'edit' && (
            <div
              role="tablist"
              aria-label="편집 대상"
              className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-elevated-2)] p-0.5"
              data-testid="edit-submode-toolbar"
            >
              {SUBMODES.map((sub) => {
                const isActive = editSubmode === sub.key;
                return (
                  <Tooltip key={sub.key}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setEditSubmode(sub.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors',
                          isActive
                            ? 'bg-[var(--bg-active)] text-foreground'
                            : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                        )}
                        data-testid={`edit-submode-${sub.key}`}
                      >
                        {sub.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{sub.tooltip}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
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

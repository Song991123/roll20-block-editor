'use client';

import { Minus, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';

const TABS: Array<{ key: WorkspaceKey; label: string; tooltip: string; color: string }> = [
  { key: 'html', label: 'HTML', tooltip: '시트 구조와 화면 요소를 편집합니다.', color: 'var(--cat-container)' },
  { key: 'css', label: 'CSS', tooltip: '시트의 색, 크기, 간격과 배치를 편집합니다.', color: 'var(--cat-css)' },
  { key: 'i18n', label: '번역', tooltip: 'data-i18n과 연결되는 문구를 편집합니다.', color: 'var(--cat-i18n)' },
  { key: 'worker', label: '시트 동작', tooltip: '시트에서 실행되는 동작 코드를 관리합니다.', color: 'var(--cat-sheetworker)' },
];

export default function WorkspaceSubToolbar() {
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  const zoom = (dir: 1 | -1) => {
    const ws = getBlocklyAdapter().getWorkspace(activeWorkspace);
    if (!ws) return;
    const target = ws as unknown as { zoomCenter?: (amount: number) => void };
    target.zoomCenter?.(dir);
  };

  const cleanUp = () => {
    const ws = getBlocklyAdapter().getWorkspace(activeWorkspace);
    if (!ws) return;
    const target = ws as unknown as { cleanUp?: () => void };
    target.cleanUp?.();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border bg-[var(--bg-elevated)] px-2 text-xs">
        <div role="tablist" aria-label="작업 영역" className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-elevated-2)] p-0.5">
          {TABS.map((tab) => {
            const isActive = activeWorkspace === tab.key;
            return (
              <Tooltip key={tab.key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveWorkspace(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded px-2 py-1 transition-colors',
                      isActive
                        ? 'bg-[var(--bg-active)] text-foreground'
                        : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                    )}
                    data-testid={`main-workspace-${tab.key}`}
                  >
                    <span aria-hidden="true" className="block h-2 w-2 rounded-full" style={{ background: tab.color }} />
                    {tab.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{tab.tooltip}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="inline-flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(-1)} aria-label="작업 영역 축소" data-testid="ws-zoom-out">
                <Minus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>작업 영역 축소</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoom(1)} aria-label="작업 영역 확대" data-testid="ws-zoom-in">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>작업 영역 확대</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={cleanUp} aria-label="블록 자동 정리" data-testid="ws-cleanup">
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>블록 자동 정리</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

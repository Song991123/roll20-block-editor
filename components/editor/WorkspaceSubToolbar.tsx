'use client';

import { Minus, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';

/**
 * 블록 작업 종류 탭 (design-reset) — 자연어 라벨 + 색 점 + 툴팁에 원래 용어 병기.
 */
const TABS: Array<{ key: WorkspaceKey; label: string; tooltip: string; color: string }> = [
  { key: 'html', label: '화면 구성', tooltip: '시트의 뼈대와 요소를 조립해요. (HTML로 내보내져요)', color: 'var(--cat-container)' },
  { key: 'css', label: '꾸미기', tooltip: '색·크기·간격 같은 생김새를 정해요. (CSS로 내보내져요)', color: 'var(--cat-css)' },
  { key: 'i18n', label: '번역', tooltip: '여러 언어로 보여줄 문구를 정리해요. (translation.json)', color: 'var(--cat-i18n)' },
  { key: 'worker', label: '자동 동작', tooltip: '값이 바뀌면 자동으로 계산되는 동작을 관리해요.', color: 'var(--cat-sheetworker)' },
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
      <div className="r20-strip flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-[var(--border-subtle)] px-2.5 py-1">
        <div role="tablist" aria-label="작업 영역" className="r20-seg r20-seg--compact">
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
                    className="r20-seg-btn"
                    data-testid={`main-workspace-${tab.key}`}
                  >
                    <span
                      aria-hidden="true"
                      className="block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ background: tab.color }}
                    />
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
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => zoom(-1)} aria-label="블록 작업 공간 축소" data-testid="ws-zoom-out">
                <Minus aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>블록을 작게 봐요 (축소)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => zoom(1)} aria-label="블록 작업 공간 확대" data-testid="ws-zoom-in">
                <Plus aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>블록을 크게 봐요 (확대)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={cleanUp} aria-label="블록 자동 정리" data-testid="ws-cleanup">
                <Sparkles aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>흩어진 블록을 가지런히 정리해요</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

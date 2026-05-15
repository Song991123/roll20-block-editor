'use client';

import { Blocks, Eye } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * MainAreaToolbar — 메인 영역 상단 모드 토글 + 워크스페이스 탭.
 *
 * Anchor: D26 ② 재결정 — 블록 조립 ↔ 미리보기.
 *
 * 좌측: [조립] / [미리보기] 토글
 * 우측 (조립 모드일 때만): [HTML] [CSS] [i18n] 워크스페이스 탭
 */

const WORKSPACE_TABS: Array<{ key: WorkspaceKey; label: string; color: string }> = [
  { key: 'html', label: 'HTML', color: 'var(--cat-container)' },
  { key: 'css', label: 'CSS', color: 'var(--cat-css)' },
  { key: 'i18n', label: 'i18n', color: 'var(--cat-i18n)' },
];

export default function MainAreaToolbar() {
  const mainMode = useUiStore((s) => s.mainMode);
  const setMainMode = useUiStore((s) => s.setMainMode);
  const activeWorkspace = useWorkspaceStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-[var(--bg-elevated)] px-3 text-xs">
        {/* 좌측 모드 토글 */}
        <div
          role="tablist"
          aria-label="메인 영역 모드"
          className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-elevated-2)] p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mainMode === 'assemble'}
            onClick={() => setMainMode('assemble')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors',
              mainMode === 'assemble'
                ? 'bg-[var(--bg-active)] text-foreground'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            data-testid="main-mode-assemble"
          >
            <Blocks className="h-3.5 w-3.5" />
            조립
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mainMode === 'preview'}
            onClick={() => setMainMode('preview')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors',
              mainMode === 'preview'
                ? 'bg-[var(--bg-active)] text-foreground'
                : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
            )}
            data-testid="main-mode-preview"
          >
            <Eye className="h-3.5 w-3.5" />
            미리보기
          </button>
        </div>

        {/* 우측 워크스페이스 탭 — 조립 모드일 때만 (미리보기 모드에서는 무의미) */}
        {mainMode === 'assemble' && (
          <div
            role="tablist"
            aria-label="워크스페이스"
            className="inline-flex items-center gap-0.5 rounded-md bg-[var(--bg-elevated-2)] p-0.5"
          >
            {WORKSPACE_TABS.map((tab) => {
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
                        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors',
                        isActive
                          ? 'bg-[var(--bg-active)] text-foreground'
                          : 'text-muted-foreground hover:bg-[var(--bg-hover)] hover:text-foreground',
                      )}
                      data-testid={`main-workspace-${tab.key}`}
                    >
                      <span
                        aria-hidden="true"
                        className="block h-2 w-2 rounded-full"
                        style={{ background: tab.color }}
                      />
                      {tab.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {tab.label} 워크스페이스
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

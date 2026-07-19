'use client';

import { CheckCircle2, CircleAlert, HardDrive } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useWorkspaceStore, totalBlockCount, anyDirty } from '@/lib/stores/workspaceStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useUiStore } from '@/lib/stores/uiStore';
import SfxToggle from './SfxToggle';

const APP_VERSION = 'v0.1.0';

const WORKSPACE_LABEL = {
  html: '화면 구성',
  css: '꾸미기',
  worker: '자동 동작',
  i18n: '번역',
} as const;

export default function Statusbar() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const autosave = useSettingsStore((s) => s.autosave);
  const treeTab = useUiStore((s) => s.treeWorkspaceTab);
  const total = totalBlockCount(workspaces);
  const dirty = anyDirty(workspaces);

  return (
    <TooltipProvider delayDuration={300}>
      <footer
        className="r20-shell-card mx-2.5 mb-2.5 flex shrink-0 items-center gap-2 px-3 text-xs text-muted-foreground"
        style={{ height: 'var(--statusbar-h)' }}
        data-testid="statusbar"
      >
        <span className="r20-chip tabular-nums">
          블록 <span className="font-semibold text-foreground">{total.toLocaleString()}</span>개
        </span>
        {dirty ? (
          <span className="r20-chip r20-chip--warning">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            저장 안 됨
          </span>
        ) : (
          <span className="r20-chip r20-chip--success">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            저장됨
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="r20-chip hidden sm:inline-flex">
              <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
              {autosave ? '이 브라우저에 자동 저장 중' : '자동 저장 꺼짐'}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            작업 내용은 인터넷이 아니라 지금 쓰는 브라우저 안에 저장돼요.
            다른 컴퓨터에서는 보이지 않아요.
          </TooltipContent>
        </Tooltip>
        <span className="hidden md:inline">작업 중: {WORKSPACE_LABEL[treeTab]}</span>
        <span className="flex-1" />
        <SfxToggle />
        <span className="tabular-nums opacity-80">{APP_VERSION}</span>
      </footer>
    </TooltipProvider>
  );
}

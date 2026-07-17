'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Download,
  Bug,
  FilePlus,
  FolderOpen,
  PanelLeft,
  PanelRight,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, anyDirty } from '@/lib/stores/workspaceStore';
import { deleteWorkspace, AUTOSAVE_KEY } from '@/lib/persist/indexeddb';
import { saveCurrentWorkspaceSnapshot } from '@/lib/persist/autosave';

const ImportDialog = dynamic(
  () => import('./ImportDialog').then((m) => ({ default: m.ImportDialog })),
  { ssr: false, loading: () => null },
);
const ExportDialog = dynamic(
  () => import('./ExportDialog').then((m) => ({ default: m.ExportDialog })),
  { ssr: false, loading: () => null },
);

const APP_VERSION = 'v0.1.0';

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="url(#logoGrad)" />
      <path
        d="M9 11h5.5c1.7 0 3 1 3 2.4 0 1.2-.8 2-1.8 2.3 1.3.2 2.3 1.2 2.3 2.5 0 1.7-1.5 2.8-3.4 2.8H9V11Zm2.4 4.1h2.7c.9 0 1.5-.5 1.5-1.2 0-.7-.5-1.1-1.4-1.1h-2.8v2.3Zm0 4.1h3c1.1 0 1.8-.5 1.8-1.3 0-.8-.6-1.3-1.7-1.3h-3.1V19.2Z"
        fill="#1A1A1A"
      />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#5CB1D6" />
          <stop offset="1" stopColor="#2F81F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface EditorHeaderProps {
  onNewSheet?: () => void;
}

export default function EditorHeader({ onNewSheet }: EditorHeaderProps) {
  const toggleLeft = useUiStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUiStore((s) => s.toggleSidebarRight);
  const mainMode = useUiStore((s) => s.mainMode);
  const dirty = useWorkspaceStore((s) => anyDirty(s.workspaces));
  const clearAll = useWorkspaceStore((s) => s.clearAll);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleNewSheet = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('현재 시트의 HTML, CSS, 번역 작업을 모두 비울까요?')
    ) {
      return;
    }
    clearAll();
    if (typeof window !== 'undefined') {
      window.setTimeout(() => clearAll(), 0);
      window.setTimeout(() => clearAll(), 500);
    }
    onNewSheet?.();
    void deleteWorkspace(AUTOSAVE_KEY).catch(() => {
      toast.warning('자동 저장 기록을 지우지 못했어요. 새로고침 뒤 복구 안내가 보이면 무시해 주세요.', {
        duration: 2600,
      });
    });
    toast.success('빈 시트를 만들었어요.', { duration: 2200 });
  }, [clearAll, onNewSheet]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveCurrentWorkspaceSnapshot();
      if (result.ok) {
        toast.success('현재 작업을 저장했어요.', { duration: 1800 });
      } else {
        toast.error('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.', { duration: 2600 });
      }
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return (
    <TooltipProvider delayDuration={250}>
      <header className="flex h-[var(--header-h)] shrink-0 items-center gap-2 border-b border-border bg-[var(--bg-elevated)] px-3">
        {mainMode !== 'preview' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleLeft}
                aria-label="왼쪽 패널 열기/닫기 (Cmd+[)"
                data-testid="sidebar-left-toggle"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">왼쪽 패널 (Cmd+[)</TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-2 pl-1">
          <LogoMark className="h-7 w-7" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Roll20 시트 편집기</div>
            <div className="hidden text-[10.5px] text-muted-foreground md:block">
              블록과 캔버스로 만드는 캐릭터 시트
            </div>
          </div>
        </div>

        <div className="ml-2 flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleNewSheet}
                aria-label="새 시트 만들기"
              >
                <FilePlus className="h-4 w-4" />
                <span className="hidden sm:inline">새 시트</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>빈 시트 만들기</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setImportOpen(true)}
                aria-label="파일에서 불러오기"
                data-testid="header-import-button"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">불러오기</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>HTML/CSS 또는 저장 파일 가져오기</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={dirty ? 'default' : 'ghost'}
                size="sm"
                className="h-8 gap-1.5"
                onClick={handleSave}
                disabled={saving}
                aria-label="현재 시트 저장"
                data-testid="header-save-button"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saving ? '저장 중' : '저장'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>이 브라우저에 현재 작업 저장</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setExportOpen(true)}
                aria-label="Roll20용 파일 내보내기"
                data-testid="header-export-button"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">내보내기</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Roll20 등록용 zip 내보내기</TooltipContent>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-border" />

          {mainMode !== 'preview' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleRight}
                  aria-label="오른쪽 패널 열기/닫기 (Cmd+])"
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">오른쪽 패널 (Cmd+])</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a
                  href="mailto:sjh11235678@gmail.com?subject=Roll20%20%EC%8B%9C%ED%8A%B8%20%ED%8E%B8%EC%A7%91%EA%B8%B0%20%EB%B2%84%EA%B7%B8%20%EC%A0%9C%EB%B3%B4"
                  aria-label="버그 제보 이메일 보내기"
                >
                  <Bug className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">버그 제보</TooltipContent>
          </Tooltip>

          <span className="ml-1 text-[10px] font-medium tracking-wide text-muted-foreground/70 tabular-nums">
            {APP_VERSION}
          </span>
        </div>
      </header>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </TooltipProvider>
  );
}

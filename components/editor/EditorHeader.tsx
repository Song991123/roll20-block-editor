'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { AppLogo } from './AppLogo';

const ImportDialog = dynamic(
  () => import('./ImportDialog').then((m) => ({ default: m.ImportDialog })),
  { ssr: false, loading: () => null },
);
const ExportDialog = dynamic(
  () => import('./ExportDialog').then((m) => ({ default: m.ExportDialog })),
  { ssr: false, loading: () => null },
);

const APP_VERSION = 'v0.1.0';

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

  useEffect(() => {
    const handleOpenImport = () => setImportOpen(true);
    window.addEventListener('r20:open-import', handleOpenImport);
    return () => window.removeEventListener('r20:open-import', handleOpenImport);
  }, []);

  const handleNewSheet = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('지금 만들던 시트를 모두 비우고 새로 시작할까요? (이 브라우저에 저장된 기록도 함께 지워져요)')
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
        toast.success('지금까지의 작업을 이 브라우저에 저장했어요.', { duration: 1800 });
      } else {
        toast.error('저장하지 못했어요. 브라우저 저장 공간이 가득 찼는지 확인해 주세요.', { duration: 2600 });
      }
    } finally {
      setSaving(false);
    }
  }, [saving]);

  return (
    <TooltipProvider delayDuration={250}>
      <header className="r20-shell-card mx-2.5 mt-2.5 flex h-[var(--header-h)] shrink-0 items-center gap-0.5 px-1.5 sm:gap-2 sm:px-3">
        {mainMode !== 'preview' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleLeft}
                aria-label="블록 꾸러미 열기/닫기"
                data-testid="sidebar-left-toggle"
              >
                <PanelLeft aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">왼쪽 블록 꾸러미를 열거나 닫아요</TooltipContent>
          </Tooltip>
        )}

        <div className="flex min-w-0 items-center gap-1 sm:gap-2.5 sm:pl-1">
          <AppLogo className="h-9 w-9 shrink-0 drop-shadow-[0_2px_4px_rgba(178,84,122,0.22)] transition-transform duration-200 hover:-translate-y-0.5" />
          <div className="r20-header-title leading-tight">
            <div className="whitespace-nowrap text-base font-bold tracking-tight">Roll20 시트 편집기</div>
            <div className="hidden whitespace-nowrap text-xs text-muted-foreground lg:block">
              코드 없이 만드는 캐릭터 시트
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0 sm:ml-3 sm:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={handleNewSheet}
                aria-label="새 시트 만들기"
              >
                <FilePlus aria-hidden="true" />
                <span className="hidden sm:inline">새 시트</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>빈 시트에서 새로 시작해요</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setImportOpen(true)}
                aria-label="시트 파일 불러오기"
                data-testid="header-import-button"
              >
                <FolderOpen aria-hidden="true" />
                <span className="hidden sm:inline">불러오기</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>가지고 있는 시트 파일(HTML·CSS·번역)을 열어요</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-0 sm:gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={dirty ? 'default' : 'secondary'}
                size="sm"
                className="gap-1.5"
                onClick={handleSave}
                disabled={saving}
                aria-label="현재 시트 저장"
                data-testid="header-save-button"
              >
                <Save aria-hidden="true" />
                <span className="hidden sm:inline">{saving ? '저장 중…' : '저장'}</span>
                {dirty && !saving && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-white/90 shadow-[0_0_0_2px_rgba(255,255,255,0.35)]"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {dirty
                ? '아직 저장 안 된 변경이 있어요 — 이 브라우저에 저장해요'
                : '지금까지의 작업을 이 브라우저에 저장해요'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() => setExportOpen(true)}
                aria-label="Roll20용 파일 내보내기"
                data-testid="header-export-button"
              >
                <Download aria-hidden="true" />
                <span className="hidden sm:inline">내보내기</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Roll20에 올릴 수 있는 파일 묶음(ZIP)을 만들어요</TooltipContent>
          </Tooltip>

          <div className="h-6 w-px bg-border sm:mx-1" aria-hidden="true" />

          {mainMode !== 'preview' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleRight}
                  aria-label="속성 패널 열기/닫기"
                  data-testid="sidebar-right-toggle"
                >
                  <PanelRight aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">오른쪽 속성 패널을 열거나 닫아요</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon" asChild>
                <a
                  href="mailto:sjh11235678@gmail.com?subject=Roll20%20%EC%8B%9C%ED%8A%B8%20%ED%8E%B8%EC%A7%91%EA%B8%B0%20%EB%B2%84%EA%B7%B8%20%EC%A0%9C%EB%B3%B4"
                  aria-label="버그 제보 이메일 보내기"
                >
                  <Bug aria-hidden="true" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">이상한 점을 발견했다면 메일로 알려주세요</TooltipContent>
          </Tooltip>

          <span className="ml-1 hidden text-xs font-medium tracking-wide text-muted-foreground tabular-nums md:inline">
            {APP_VERSION}
          </span>
        </div>
      </header>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </TooltipProvider>
  );
}

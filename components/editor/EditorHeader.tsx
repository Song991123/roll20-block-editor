'use client';

import {
  Download,
  Save,
  FolderOpen,
  FilePlus,
  PanelLeft,
  PanelRight,
  Settings,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, anyDirty } from '@/lib/stores/workspaceStore';
import {
  EXAMPLES,
  loadExampleIntoWorkspaces,
  type ExampleDescriptor,
} from '@/lib/examples';
import { ImportDialog } from './ImportDialog';
import { ExportDialog } from './ExportDialog';
import { useState } from 'react';

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

export default function EditorHeader() {
  const toggleLeft = useUiStore((s) => s.toggleSidebarLeft);
  const toggleRight = useUiStore((s) => s.toggleSidebarRight);
  const dirty = useWorkspaceStore((s) => anyDirty(s.workspaces));
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleLoadExample = (descriptor: ExampleDescriptor) => async () => {
    try {
      const counts = await loadExampleIntoWorkspaces(descriptor);
      const total = counts.html + counts.css + counts.i18n;
      toast.success(
        `${descriptor.shortName} 예시 로드 — 블록 ${total}개 (HTML ${counts.html} / CSS ${counts.css} / 번역 ${counts.i18n})`,
        { duration: 2200 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`${descriptor.shortName} 로드 실패: ${msg}`, { duration: 3000 });
    }
  };

  const comingSoon = (label: string) => () =>
    toast(`${label} — 곧 추가됩니다`, { duration: 1800 });

  return (
    <TooltipProvider delayDuration={250}>
      <header className="flex h-[var(--header-h)] shrink-0 items-center gap-2 border-b border-border bg-[var(--bg-elevated)] px-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleLeft}
              aria-label="좌측 사이드 토글 (Cmd+[)"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">좌측 토글 (Cmd+[)</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2 pl-1">
          <LogoMark className="h-7 w-7" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Roll20 시트 빌더</div>
            <div className="text-[10.5px] text-muted-foreground hidden md:block">
              블록 코딩으로 만드는 캐릭터 시트
            </div>
          </div>
        </div>

        <div className="ml-2 flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                aria-label="예시 시트 불러오기"
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">예시</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel>예시 시트</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={comingSoon('빈 템플릿')}>
                <span className="flex flex-col">
                  <span className="text-sm">🎲 빈 시트</span>
                  <span className="text-[11px] text-muted-foreground">처음부터 만들기</span>
                </span>
              </DropdownMenuItem>
              {EXAMPLES.map((ex) => (
                <DropdownMenuItem
                  key={ex.id}
                  onSelect={handleLoadExample(ex)}
                  data-testid={`example-${ex.id}`}
                >
                  <span className="flex flex-col">
                    <span className="text-sm">
                      {ex.icon} {ex.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {ex.description}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={comingSoon('새 시트')}
                aria-label="새 시트 만들기"
              >
                <FilePlus className="h-4 w-4" />
                <span className="hidden sm:inline">새 시트</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>새 빈 워크스페이스</TooltipContent>
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
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">불러오기</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>.xml / .zip 가져오기</TooltipContent>
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
                onClick={comingSoon('저장')}
                aria-label="현재 시트 저장"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">저장</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>저장 (Ctrl+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setExportOpen(true)}
                aria-label="시트 다운로드"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">다운로드</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Roll20 등록용 .zip (Ctrl+E)</TooltipContent>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={comingSoon('설정')}
                aria-label="설정"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>설정</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={comingSoon('도움말')}
                aria-label="도움말"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>도움말</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleRight}
                aria-label="우측 사이드 토글 (Cmd+])"
              >
                <PanelRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">우측 토글 (Cmd+])</TooltipContent>
          </Tooltip>

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
                  href="https://github.com/Song991123/roll20-block-editor"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub 저장소 열기"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-4 w-4"
                    aria-hidden
                    fill="currentColor"
                  >
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">GitHub 저장소</TooltipContent>
          </Tooltip>

          <span className="ml-1 text-[10px] font-medium text-muted-foreground/70 tracking-wide tabular-nums">
            {APP_VERSION}
          </span>
        </div>
      </header>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </TooltipProvider>
  );
}

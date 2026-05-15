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

const APP_VERSION = 'v0.1.0';

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="url(#logoGrad)" />
      <path
        d="M9 11h5.5c1.7 0 3 1 3 2.4 0 1.2-.8 2-1.8 2.3 1.3.2 2.3 1.2 2.3 2.5 0 1.7-1.5 2.8-3.4 2.8H9V11Zm2.4 4.1h2.7c.9 0 1.5-.5 1.5-1.2 0-.7-.5-1.1-1.4-1.1h-2.8v2.3Zm0 4.1h3c1.1 0 1.8-.5 1.8-1.3 0-.8-.6-1.3-1.7-1.3h-3.1V19.2Z"
        fill="#0E1116"
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
              <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5">
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
                onClick={comingSoon('파일 불러오기')}
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
                onClick={comingSoon('다운로드')}
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

          <span className="ml-1 text-[10px] font-medium text-muted-foreground/70 tracking-wide tabular-nums">
            {APP_VERSION}
          </span>
        </div>
      </header>
    </TooltipProvider>
  );
}

'use client';

import { Download, Save, FolderOpen, Menu } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

const APP_VERSION = 'v0.1.0';
const REPO_URL = 'https://github.com/song991123/roll20-block-editor';

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="9" fill="url(#logoGrad)" />
      <path
        d="M9.5 11.5h4a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-4v-6Zm0 6h5.2a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H9.5v-6Z"
        stroke="#1a1106"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="14" r="1.6" fill="#1a1106" />
      <circle cx="22" cy="20" r="1.6" fill="#1a1106" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.475 2 2 6.475 2 12a9.994 9.994 0 0 0 6.838 9.488c.5.087.687-.213.687-.476 0-.237-.013-1.024-.013-1.862-2.512.463-3.162-.612-3.362-1.175-.113-.288-.6-1.175-1.025-1.413-.35-.187-.85-.65-.013-.662.788-.013 1.35.725 1.538 1.025.9 1.512 2.338 1.087 2.912.825.088-.65.35-1.087.638-1.337-2.225-.25-4.55-1.113-4.55-4.938 0-1.088.387-1.987 1.025-2.687-.1-.25-.45-1.275.1-2.65 0 0 .837-.263 2.75 1.025a9.28 9.28 0 0 1 2.5-.338c.85 0 1.7.112 2.5.337 1.912-1.3 2.75-1.024 2.75-1.024.55 1.375.2 2.4.1 2.65.637.7 1.025 1.587 1.025 2.687 0 3.838-2.337 4.688-4.562 4.938.362.312.675.912.675 1.85 0 1.337-.013 2.412-.013 2.75 0 .262.188.574.688.474A10.018 10.018 0 0 0 22 12c0-5.525-4.475-10-10-10Z"
      />
    </svg>
  );
}

export default function EditorHeader({
  onOpenMobileSidebar,
}: {
  onOpenMobileSidebar?: () => void;
}) {
  const handleComingSoon = (label: string) => () => {
    toast(`${label} — 곧 추가됩니다`, { duration: 2200 });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        {onOpenMobileSidebar && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden -ml-2"
            onClick={onOpenMobileSidebar}
            aria-label="패널 열기"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Roll20 Block Editor</div>
            <div className="text-[11px] text-muted-foreground hidden sm:block">
              블록 코딩으로 시트를 만들어보세요
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">예시 불러오기</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>예시 시트</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  toast('D&D 5e 예시 — 곧 추가됩니다', { duration: 2200 })
                }
              >
                <span className="flex flex-col">
                  <span className="text-sm">D&D 5e 캐릭터 시트</span>
                  <span className="text-[11px] text-muted-foreground">곧 추가됩니다</span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  disabled
                  onClick={handleComingSoon('내보내기')}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">내보내기</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>곧 추가됩니다</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  disabled
                  onClick={handleComingSoon('저장')}
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">저장</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>곧 추가됩니다</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild type="button" variant="ghost" size="icon" aria-label="GitHub">
                <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
                  <GithubIcon className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub 저장소</TooltipContent>
          </Tooltip>

          <span className="ml-1 text-[10px] font-medium text-muted-foreground/70 tracking-wide tabular-nums">
            {APP_VERSION}
          </span>
        </div>
      </header>
    </TooltipProvider>
  );
}

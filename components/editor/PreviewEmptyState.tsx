'use client';

import type { ReactNode } from 'react';
import {
  Sparkles,
  MousePointerSquareDashed,
  ListTree,
  FolderOpen,
  FilePlus,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/lib/stores/uiStore';

/**
 * 첫 화면 빈 상태 (design-reset).
 * 문구 구조: 이곳이 무엇인지 → 왜 비어 있는지 → 무엇부터 하면 되는지.
 */
export default function PreviewEmptyState() {
  const setSidebarLeftMode = useUiStore((s) => s.setSidebarLeftMode);
  const setBlocksSearch = useUiStore((s) => s.setBlocksSearch);

  const handleStartBlank = () => {
    setSidebarLeftMode('blocks');
    setBlocksSearch('');
    toast('왼쪽 블록 꾸러미에서 원하는 조각을 끌어다 놓아보세요.', {
      duration: 2400,
    });
  };

  const handleImport = () => {
    window.dispatchEvent(new Event('r20:open-import'));
  };

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 py-8 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary-soft)] text-[var(--primary-active)] shadow-[0_1px_2px_rgba(var(--shadow-tint),0.07),0_4px_14px_rgba(var(--shadow-tint),0.09)] ring-1 ring-[var(--primary-soft-border)]">
        <Sparkles className="h-9 w-9" aria-hidden="true" />
      </div>
      <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
        캐릭터 시트, 여기서 만들어요
      </h2>
      <p className="mb-8 max-w-md text-base leading-relaxed text-[var(--text-secondary)]">
        빈 시트로 시작하거나, 가지고 있는 시트 파일을 불러와서 이어서 꾸밀 수 있어요.
        작업 내용은 이 브라우저에 자동 저장돼요.
      </p>

      <div className="mb-8 grid w-full max-w-md gap-2.5">
        <Hint
          step={1}
          accent="var(--cat-container)"
          icon={<ListTree className="h-5 w-5" />}
          title="조각 올리기"
          body="칸, 글자, 버튼 같은 조각을 시트 위에 올려요."
        />
        <Hint
          step={2}
          accent="var(--cat-display)"
          icon={<MousePointerSquareDashed className="h-5 w-5" />}
          title="바로 고치기"
          body="시트에서 요소를 클릭하면 오른쪽 속성 패널에서 이름과 값을 바꿀 수 있어요."
        />
        <Hint
          step={3}
          accent="var(--cat-dice)"
          icon={<Download className="h-5 w-5" />}
          title="Roll20에 올리기"
          body="완성되면 Roll20에 올릴 수 있는 파일 묶음(ZIP)으로 내보내요."
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" size="lg" onClick={handleStartBlank} className="gap-2">
          <FilePlus aria-hidden="true" />
          빈 시트로 시작
        </Button>
        <Button
          variant="default"
          size="lg"
          onClick={handleImport}
          className="gap-2"
          data-testid="empty-import-button"
        >
          <FolderOpen aria-hidden="true" />
          시트 파일 불러오기
        </Button>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        여기 보이는 화면은 미리보기예요. 실제 Roll20 화면과는 조금 다를 수 있어요.
      </p>
    </div>
  );
}

function Hint({
  step,
  accent,
  icon,
  title,
  body,
}: {
  step: number;
  accent: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="r20-lift group flex items-start gap-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 text-left shadow-[0_1px_2px_rgba(var(--shadow-tint),0.05)]">
      <div
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground"
        style={{ background: `color-mix(in srgb, ${accent} 22%, var(--bg-elevated-2))` }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: accent }}
            aria-hidden
          >
            {step}
          </span>
          <span className="text-base font-semibold text-foreground">{title}</span>
        </div>
        <div className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
          {body}
        </div>
      </div>
    </div>
  );
}

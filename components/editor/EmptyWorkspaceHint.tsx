'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 빈 워크스페이스 안내 — 비전공자가 무엇부터 해야 할지 즉시 알도록.
 * BlockWorkspace 에서 blockCount === 0 일 때만 렌더.
 */
export default function EmptyWorkspaceHint({
  onLoadExample,
}: {
  onLoadExample?: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
      <div className="pointer-events-auto max-w-md text-center select-none">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
          환영합니다
        </h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          좌측 카테고리에서 블록을 끌어다 놓아 시트를 만들어보세요.
          <br />
          또는 예시를 불러와 어떻게 만드는지 살펴볼 수 있어요.
        </p>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onLoadExample}
          disabled={!onLoadExample}
        >
          예시 불러오기
        </Button>
      </div>
    </div>
  );
}

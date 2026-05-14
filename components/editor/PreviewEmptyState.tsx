'use client';

import { Sparkles, MousePointerSquareDashed, ListTree } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * 미리보기 영역의 빈 상태 — 첫 진입 시 사용자가 무엇을 할지 보이게.
 *
 * Anchor: docs/spec/02_functional_spec.md §9 (Onboarding) + 08_wireframes.md W2.
 * 한국어 톤: 친근 / "코딩 못해도 OK".
 */
export default function PreviewEmptyState() {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mb-2 text-xl font-semibold tracking-tight text-foreground">
        Roll20 시트 빌더에 오신 걸 환영해요
      </h2>
      <p className="mb-5 max-w-md text-sm leading-relaxed text-muted-foreground">
        가운데가 시트 미리보기예요. 왼쪽에서 블록을 끌어다 놓으면 여기에 시트가 나타나요.
        <br />
        오른쪽 [속성] 패널에서 라벨이나 값을 바꿔 보세요.
      </p>

      <div className="mb-6 grid w-full max-w-md gap-2">
        <Hint
          icon={<ListTree className="h-4 w-4" />}
          title="1. 블록을 끌어와요"
          body="왼쪽 [⬡ 블록] 모드에서 컨테이너 / 입력 / 표시 블록부터 시작해보세요."
        />
        <Hint
          icon={<MousePointerSquareDashed className="h-4 w-4" />}
          title="2. 미리보기에서 클릭"
          body="시트 안 요소를 클릭하면 왼쪽 트리와 오른쪽 속성 패널이 자동으로 따라가요."
        />
        <Hint
          icon={<Sparkles className="h-4 w-4" />}
          title="3. 완성되면 다운로드"
          body="상단 [다운로드] 로 sheet.html / sheet.css / translation.json / README 가 묶인 .zip 을 받아 Roll20 에 올리세요."
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => toast('예시 로드 — Phase 3 에서 추가됩니다', { duration: 1800 })}
        >
          예시 시트 둘러보기
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast('빈 템플릿 — Phase 3 에서 추가됩니다', { duration: 1800 })}
        >
          빈 시트로 시작
        </Button>
      </div>
    </div>
  );
}

function Hint({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-[var(--bg-elevated)] p-3 text-left">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated-2)] text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{title}</div>
        <div className="text-[11px] leading-relaxed text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}

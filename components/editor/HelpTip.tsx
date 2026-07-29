'use client';

/**
 * HelpTip — 물음표 도움말 버튼 (design-reset, UI 전용).
 *
 * 패널 제목 옆에 붙어 "이 화면이 뭔지" 를 마우스만 올려도 알 수 있게 한다.
 * 클릭/포커스로도 열려 키보드 사용자도 접근 가능.
 */
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function HelpTip({
  label,
  children,
  side = 'bottom',
}: {
  /** 스크린리더용 이름 — 예: "블록 꾸러미 도움말" */
  label: string;
  /** 말풍선 안에 보일 설명 */
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="r20-help-dot" aria-label={label}>
          <HelpCircle className="h-[15px] w-[15px]" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[280px]">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

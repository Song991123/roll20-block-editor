'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * design-reset: 읽기 편한 큰 말풍선 — 진한 자두색 배경 + 밝은 글자 (고대비).
 * 설명이 여러 줄이어도 편하게 읽히도록 줄간격/최대폭 확보.
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 max-w-[300px] overflow-hidden rounded-xl bg-[var(--foreground)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--background)] shadow-[0_2px_6px_rgba(var(--shadow-tint),0.1),0_10px_28px_rgba(var(--shadow-tint),0.16)]',
      'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

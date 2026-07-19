'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * design-reset: 다이어리 톤 알약 버튼.
 * - 글자 최소 14px (접근성) / solid 버튼은 --primary-strong (흰 글자 AA 대비).
 * - 은은한 마이크로 모션: hover 색 전환 + 눌림 스케일.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[background-color,color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(180deg,#c34a72_0%,#a83659_100%)] text-primary-foreground shadow-[0_1px_2px_rgba(var(--shadow-tint),0.3),inset_0_1px_0_rgba(255,255,255,0.16)] hover:bg-[linear-gradient(180deg,#cb5680_0%,#b03b61_100%)]',
        secondary:
          'border border-[var(--border-subtle)] bg-secondary text-secondary-foreground hover:bg-[var(--bg-hover)]',
        outline:
          'border-[1.5px] border-[var(--border-strong)] bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
        ghost: 'text-[var(--text-secondary)] hover:bg-accent hover:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-[color-mix(in_srgb,var(--destructive)_86%,black)]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3.5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

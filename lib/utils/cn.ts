import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind class name merge helper (shadcn standard).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Tailwind class name merge helper.
 *
 * shadcn-ui 가 Phase 2 에 들어오면 clsx + tailwind-merge 로 교체.
 * Phase 1 에서는 단순 join 만.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

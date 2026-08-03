/**
 * Opt-in timing markers for browser edit/render smoke tests.
 *
 * The markers stay out of normal user sessions unless the local smoke harness
 * enables `__perfOn`, so the production interaction path does not allocate or
 * retain diagnostic timing state.
 */

type TimingWindow = Window & {
  __r20PerfTimings?: Record<string, number>;
  __perfHook?: unknown;
};

function activeTimings(): Record<string, number> | null {
  if (typeof window === 'undefined') return null;
  try {
    const target = window as TimingWindow;
    if (!target.__perfHook) return null;
    return target.__r20PerfTimings ?? (target.__r20PerfTimings = {});
  } catch {
    return null;
  }
}

export function markEditorTiming(name: string): void {
  const timings = activeTimings();
  if (timings) timings[name] = performance.now();
}

export function markEditorTimingOnce(name: string): void {
  const timings = activeTimings();
  if (timings && typeof timings[name] !== 'number') timings[name] = performance.now();
}

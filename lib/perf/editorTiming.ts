/**
 * Opt-in timing markers for browser edit/render smoke tests.
 *
 * The markers stay out of normal user sessions unless the local smoke harness
 * enables `__perfOn`, so the production interaction path does not allocate or
 * retain diagnostic timing state.
 */

type TimingWindow = Window & {
  __r20PerfTimings?: Record<string, number>;
};

export function markEditorTiming(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem('__perfOn') !== '1') return;
    const target = window as TimingWindow;
    const timings = target.__r20PerfTimings ?? (target.__r20PerfTimings = {});
    timings[name] = performance.now();
  } catch {
    // Diagnostic markers must never affect editing or rendering.
  }
}

/**
 * window.__perfHook — production-safe perf instrumentation.
 *
 * Anchor:
 *   - docs/perf/00_baseline_2026-05-15.md §2 "측정 불가" 표.
 *   - 사용자 task description Step 2 — measurement infra.
 *
 * 활성 조건: `localStorage.setItem('__perfOn', '1')` 후 reload.
 * 비활성 시 hook 미노출 → 사용자 영향 0 (라이브 site default OFF).
 *
 * 일반화: 본 모듈은 generic 측정 hook. 시트 specific 0 — `importSheet` 도
 *   raw HTML/CSS/i18n 텍스트를 받아 lib/import 의 generic pipeline 으로 처리.
 *
 * R5 / V2 적용: 본 hook 은 측정 전용. arch / 사용자 task 본 흐름에 영향 0
 *   (mount 시 1회 console.log + window prop attach 만).
 */

'use client';

import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { importSheet as importPipeline } from '@/lib/import';
import { emitAll } from '@/lib/preview/emit';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';

export interface PerfMeasure {
  label: string;
  ms: number;
  heapBeforeMb: number | null;
  heapAfterMb: number | null;
  heapDeltaMb: number | null;
}

export interface PerfWorkspaceSnap {
  blockCount: Record<WorkspaceKey, number>;
  totalBlocks: number;
  rootBlocks: Record<WorkspaceKey, number>;
}

export interface PerfEmitSnap {
  htmlLen: number;
  cssLen: number;
  i18nLen: number;
}

export interface PerfImportResult {
  parseMs: number;
  emitMs: number;
  injectMs: number;
  totalMs: number;
  matchPct: number;
  blockCount: number;
  warnings: number;
  heapBeforeMb: number | null;
  heapAfterMb: number | null;
}

export interface PerfHook {
  /** Workspace 인스턴스별 + 누적 블록 수 + root (top-level) 블록 수. */
  getWorkspace: () => PerfWorkspaceSnap;
  /** emit 결과 (lazy emit). 길이만 — 본문 dump X (사용자 시트 식별자 leak 방지). */
  getEmitCache: () => PerfEmitSnap;
  /** sync / async 작업 timing + heap delta. */
  measure: <T>(label: string, fn: () => T | Promise<T>) => Promise<PerfMeasure & { value: T }>;
  /** 영시영 / 다른 시트 raw HTML/CSS/i18n 을 generic pipeline 으로 import 후 hydrate. */
  importSheet: (input: { html: string; css?: string; i18n?: string }) => Promise<PerfImportResult>;
  /** 현재 활성 워크스페이스의 모든 블록 제거 (re-측정 용). */
  clearAll: () => void;
  /** Heap (MB) — performance.memory 비표준 API 사용 가능 시. */
  getHeapMb: () => number | null;
  /** Long-task observer — start/stop 으로 임의 구간 main-thread block 측정. */
  startLongTaskObserver: () => void;
  stopLongTaskObserver: () => Array<{ startTime: number; duration: number; name: string }>;
}

const HOOK_FLAG = '__perfOn';
const HOOK_KEY = '__perfHook';

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function getHeapMb(): number | null {
  const perf = performance as unknown as {
    memory?: { usedJSHeapSize?: number };
  };
  const used = perf.memory?.usedJSHeapSize;
  return typeof used === 'number' ? Math.round((used / (1024 * 1024)) * 100) / 100 : null;
}

interface LongTaskEntry {
  startTime: number;
  duration: number;
  name: string;
}

class LongTaskTracker {
  private observer: PerformanceObserver | null = null;
  private buffer: LongTaskEntry[] = [];

  start(): void {
    if (this.observer) return;
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.buffer.push({
            startTime: entry.startTime,
            duration: entry.duration,
            name: entry.name,
          });
        }
      });
      this.observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // longtask unsupported
    }
  }

  stop(): LongTaskEntry[] {
    const out = this.buffer.slice();
    this.observer?.disconnect();
    this.observer = null;
    this.buffer = [];
    return out;
  }
}

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(HOOK_FLAG) === '1';
  } catch {
    return false;
  }
}

function buildHook(): PerfHook {
  const tracker = new LongTaskTracker();

  function countBlocks(key: WorkspaceKey): { total: number; root: number } {
    const adapter = getBlocklyAdapter();
    const snaps = adapter.listAllBlocks(key);
    let root = 0;
    for (const s of snaps) if (s.depth === 0) root += 1;
    return { total: snaps.length, root };
  }

  return {
    getWorkspace: () => {
      const html = countBlocks('html');
      const css = countBlocks('css');
      const i18n = countBlocks('i18n');
      return {
        blockCount: { html: html.total, css: css.total, i18n: i18n.total },
        totalBlocks: html.total + css.total + i18n.total,
        rootBlocks: { html: html.root, css: css.root, i18n: i18n.root },
      };
    },

    getEmitCache: () => {
      const cache = useWorkspaceStore.getState().emitCache;
      return {
        htmlLen: cache.html.length,
        cssLen: cache.css.length,
        i18nLen: cache.i18n.length,
      };
    },

    measure: async <T>(label: string, fn: () => T | Promise<T>) => {
      const heapBeforeMb = getHeapMb();
      const t0 = nowMs();
      const value = await fn();
      const ms = nowMs() - t0;
      const heapAfterMb = getHeapMb();
      const heapDeltaMb =
        heapBeforeMb !== null && heapAfterMb !== null
          ? Math.round((heapAfterMb - heapBeforeMb) * 100) / 100
          : null;
      // eslint-disable-next-line no-console
      console.log(`[perf] ${label}: ${ms.toFixed(1)}ms (heap ${heapBeforeMb}→${heapAfterMb}MB)`);
      return { label, ms, heapBeforeMb, heapAfterMb, heapDeltaMb, value };
    },

    importSheet: async ({ html, css = '', i18n = '' }) => {
      const heapBeforeMb = getHeapMb();
      const t0 = nowMs();
      const result = importPipeline({ html, css, i18n });
      const parseEnd = nowMs();
      const adapter = getBlocklyAdapter();

      // hydrate three workspaces.
      const injectT0 = nowMs();
      adapter.hydrateFromXml('html', result.html);
      if (css) adapter.hydrateFromXml('css', result.css);
      if (i18n) adapter.hydrateFromXml('i18n', result.i18n);
      const injectEnd = nowMs();

      // emit pipeline cost (synchronous emitAll — bypass 500ms debounce).
      const emitT0 = nowMs();
      const emitOut = emitAll({
        html: adapter.getWorkspace('html'),
        css: adapter.getWorkspace('css'),
        i18n: adapter.getWorkspace('i18n'),
      });
      const emitEnd = nowMs();

      // also push to store so user sees Code tab update.
      useWorkspaceStore.getState().setEmitCache({
        html: emitOut.html,
        css: emitOut.css,
        i18n: emitOut.i18n,
      });
      useWorkspaceStore.getState().setEmitWarnings(emitOut.warnings);

      const heapAfterMb = getHeapMb();
      const blockCount = adapter.listAllBlocks('html').length;
      const matchPct =
        result.stats.htmlTotal > 0
          ? Math.round((result.stats.htmlMatched / result.stats.htmlTotal) * 1000) / 10
          : 0;

      return {
        parseMs: parseEnd - t0,
        injectMs: injectEnd - injectT0,
        emitMs: emitEnd - emitT0,
        totalMs: emitEnd - t0,
        matchPct,
        blockCount,
        warnings: result.warnings.length,
        heapBeforeMb,
        heapAfterMb,
      };
    },

    clearAll: () => {
      useWorkspaceStore.getState().clearAll();
    },

    getHeapMb,

    startLongTaskObserver: () => tracker.start(),
    stopLongTaskObserver: () => tracker.stop(),
  };
}

/**
 * EditorShell mount 시 1회 호출. localStorage.__perfOn=1 이 아니면 noop.
 */
export function installPerfHook(): void {
  if (typeof window === 'undefined') return;
  if (!isEnabled()) return;
  const w = window as unknown as { [HOOK_KEY]?: PerfHook };
  if (w[HOOK_KEY]) return;
  w[HOOK_KEY] = buildHook();
  // eslint-disable-next-line no-console
  console.log(
    '[perf] window.__perfHook installed. localStorage.removeItem("__perfOn") + reload 로 비활성.',
  );
}

/**
 * 글로벌 타입 augment — 다른 module 에서 `window.__perfHook` 직접 호출 시 타입 인식.
 */
declare global {
  interface Window {
    __perfHook?: PerfHook;
  }
}

export {}; // ensure module

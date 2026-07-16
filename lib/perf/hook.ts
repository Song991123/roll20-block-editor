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

import { getBlocklyAdapter, type BlockSnapshot } from '@/lib/blockly/adapter';
import {
  moveImportedWorkerBlocksToWorkspace,
  replaceWorkerWorkspaceFromSourceHtml,
} from '@/lib/blockly/workerWorkspace';
import { importSheet as importPipeline } from '@/lib/import';
import { emitAll } from '@/lib/preview/emit';
import {
  usePreviewStore,
  type PreviewRenderMode,
  type Roll20CompatibilityMode,
} from '@/lib/stores/previewStore';
import { useChatStore } from '@/lib/stores/chatStore';
import { useUiStore, type MainMode, type PreviewZoom } from '@/lib/stores/uiStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';
import {
  appendFriendlyWidgetPreset,
  findFriendlyWidgetPreset,
} from '@/lib/widgets/presets';

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

export interface PerfBlockGraphNode {
  id: string;
  type: string;
  depth: number;
  label: string;
  parentId: string | null;
  previousId: string | null;
  nextId: string | null;
  hasNextTarget: boolean;
  childCount: number;
}

export interface PerfEmitSnap {
  htmlLen: number;
  cssLen: number;
  i18nLen: number;
  workerLen: number;
}

export interface PerfImportResult {
  parseMs: number;
  emitMs: number;
  injectMs: number;
  totalMs: number;
  matchPct: number;
  blockCount: number;
  workerBlockCount: number;
  warnings: number;
  compositeCollapsed: number;
  compositePackedByType: Record<string, number>;
  wideRowBundles: number;
  wideRowCollapsed: number;
  heapBeforeMb: number | null;
  heapAfterMb: number | null;
}

export interface PerfEditFlowDropResult {
  containerId: string | null;
  widgetId: string | null;
  nested: boolean;
  widgetStyle: string | null;
  htmlContainsNestedWidget: boolean;
  htmlHasAbsoluteWidget: boolean;
  htmlLen: number;
  cssLen: number;
  i18nLen: number;
  warnings: number;
}

export interface PerfHook {
  /** Workspace 인스턴스별 + 누적 블록 수 + root (top-level) 블록 수. */
  getWorkspace: () => PerfWorkspaceSnap;
  getLayerSnapshot: (key?: WorkspaceKey) => BlockSnapshot[];
  getBlockGraph: (key?: WorkspaceKey) => PerfBlockGraphNode[];
  /** emit 결과 (lazy emit). 길이만 — 본문 dump X (사용자 시트 식별자 leak 방지). */
  getEmitCache: () => PerfEmitSnap;
  /**
   * emit 결과 본문 — 측정 round-trip 시 emit→re-import 입력으로 사용.
   * `__perfOn` flag 활성 + same-origin 일 때만 노출 (사용자 시트 식별자 leak
   * 우려 있으나 perf 측정 사용자는 같은 사용자라 OK). Stage 2 round-trip
   * 측정 phase 에서만 활성.
   */
  getEmitContent: () => { html: string; css: string; i18n: string; worker: string };
  /** sync / async 작업 timing + heap delta. */
  measure: <T>(label: string, fn: () => T | Promise<T>) => Promise<PerfMeasure & { value: T }>;
  /** 영시영 / 다른 시트 raw HTML/CSS/i18n 을 generic pipeline 으로 import 후 hydrate. */
  importSheet: (input: {
    html: string;
    css?: string;
    i18n?: string;
    compactWideRows?: boolean;
  }) => Promise<PerfImportResult>;
  setMainMode: (mode: MainMode) => void;
  setPreviewZoom: (zoom: PreviewZoom) => void;
  setPreviewRenderMode: (mode: PreviewRenderMode) => void;
  setRoll20CompatibilityMode: (mode: Roll20CompatibilityMode) => void;
  setLegacyCssSanitize: (enabled: boolean) => void;
  setRoll20SandboxSanitize: (enabled: boolean) => void;
  setAssetReplacementMap: (text: string) => void;
  getAssetReplacementMap: () => string;
  saveAssetReplacementProfile: (name: string) => string | null;
  loadAssetReplacementProfile: (id: string) => boolean;
  getAssetReplacementProfiles: () => Array<{ id: string; name: string; text: string; updatedAt: number }>;
  appendFriendlyWidgetForEditSmoke: (input?: {
    containerPresetId?: string;
    widgetPresetId?: string;
    mode?: 'flow' | 'absolute';
  }) => PerfEditFlowDropResult;
  /** 현재 활성 워크스페이스의 모든 블록 제거 (re-측정 용). */
  clearChat: () => void;
  clearAll: () => void;
  /** Heap (MB) — performance.memory 비표준 API 사용 가능 시. */
  getHeapMb: () => number | null;
  /** Long-task observer — start/stop 으로 임의 구간 main-thread block 측정. */
  startLongTaskObserver: () => void;
  stopLongTaskObserver: () => Array<{ startTime: number; duration: number; name: string }>;
  /**
   * 합성 (synthetic) Blockly XML 생성기 — 영시영 식별자 / 사용자 시트 토큰 0.
   * 6K 블록 inject hot path 측정용. r20_text_input 블록의 next-chain.
   * @param n  체인 길이 (블록 수)
   * @param prefix  field NAME 접두사 (기본 'syn').
   */
  genSyntheticXml: (n: number, prefix?: string) => string;
  /**
   * 사전 빌드된 Blockly XML 을 워크스페이스에 직접 hydrate — parse/emit 비용 없이
   * 순수 inject 시간만 측정. workspaceStore 도 emit 강제 갱신 X (측정 격리).
   * `before` 옵션으로 setResizesEnabled 우회 시뮬레이션 (회귀 비교).
   */
  injectXml: (
    input: { key?: WorkspaceKey; xml: string; before?: boolean },
  ) => Promise<{
    domParseMs: number;
    domToWorkspaceMs: number;
    totalMs: number;
    blockCount: number;
    longtasksMs: number;
    heapBeforeMb: number | null;
    heapAfterMb: number | null;
  }>;
  /**
   * Chunked inject 측정 — adapter.hydrateFromXmlChunked 호출.
   * longtask observer 도 활성 → 각 chunk 별 main-thread block 시간 누적 + max
   * 추적 가능. progress callback 안 받음 (측정 hook 은 fire-and-forget).
   */
  injectXmlChunked: (
    input: {
      key?: WorkspaceKey;
      xml: string;
      chunkSize?: number;
    },
  ) => Promise<{
    totalMs: number;
    chunkSize: number;
    chunkCount: number;
    blockCount: number;
    longtasksMs: number;
    longestLongtaskMs: number;
    heapBeforeMb: number | null;
    heapAfterMb: number | null;
  }>;
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

function findBlockOpeningTag(html: string, blockId: string): string {
  const marker = `data-r20-block-id="${blockId}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return '';
  const start = html.lastIndexOf('<', markerIndex);
  const end = html.indexOf('>', markerIndex);
  if (start < 0 || end < 0 || start > markerIndex) return '';
  return html.slice(start, end + 1);
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
      const worker = countBlocks('worker');
      return {
        blockCount: { html: html.total, css: css.total, i18n: i18n.total, worker: worker.total },
        totalBlocks: html.total + css.total + i18n.total + worker.total,
        rootBlocks: { html: html.root, css: css.root, i18n: i18n.root, worker: worker.root },
      };
    },

    getLayerSnapshot: (key = 'html') => getBlocklyAdapter().listAllBlocks(key),

    getBlockGraph: (key = 'html') => {
      const adapter = getBlocklyAdapter();
      const ws = adapter.getWorkspace(key);
      if (!ws) return [];
      const snapshots = new Map(adapter.listAllBlocks(key).map((block) => [block.id, block]));
      return ws.getAllBlocks(false).map((block) => {
        const snap = snapshots.get(block.id);
        const previousBlock =
          (block as { getPreviousBlock?: () => { id?: string } | null }).getPreviousBlock?.() ??
          block.previousConnection?.targetBlock() ??
          null;
        const nextBlock =
          (block as { getNextBlock?: () => { id?: string } | null }).getNextBlock?.() ??
          block.nextConnection?.targetBlock() ??
          null;
        const parentBlock = (block as { getParent?: () => { id?: string } | null }).getParent?.() ?? null;
        return {
          id: block.id,
          type: block.type,
          depth: snap?.depth ?? 0,
          label: snap?.label ?? block.type,
          parentId: parentBlock?.id ?? null,
          previousId: previousBlock?.id ?? null,
          nextId: nextBlock?.id ?? null,
          hasNextTarget: Boolean(block.nextConnection?.targetBlock()),
          childCount: block.getChildren(false).filter((child) => child.id !== nextBlock?.id).length,
        };
      });
    },

    getEmitCache: () => {
      const cache = useWorkspaceStore.getState().emitCache;
      return {
        htmlLen: cache.html.length,
        cssLen: cache.css.length,
        i18nLen: cache.i18n.length,
        workerLen: cache.worker.length,
      };
    },

    getEmitContent: () => {
      const cache = useWorkspaceStore.getState().emitCache;
      return {
        html: cache.html,
        css: cache.css,
        i18n: cache.i18n,
        worker: cache.worker,
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

      console.log(`[perf] ${label}: ${ms.toFixed(1)}ms (heap ${heapBeforeMb}→${heapAfterMb}MB)`);
      return { label, ms, heapBeforeMb, heapAfterMb, heapDeltaMb, value };
    },

    importSheet: async ({ html, css = '', i18n = '', compactWideRows = false }) => {
      const heapBeforeMb = getHeapMb();
      const t0 = nowMs();
      const result = importPipeline(
        { html, css, i18n },
        { html: { compactWideRows } },
      );
      const parseEnd = nowMs();
      const adapter = getBlocklyAdapter();

      // hydrate three workspaces.
      const injectT0 = nowMs();
      const emptyXml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
      adapter.hydrateFromXml('worker', emptyXml);
      adapter.hydrateFromXml('html', result.html);
      const workerMove = moveImportedWorkerBlocksToWorkspace();
      const workerSource = replaceWorkerWorkspaceFromSourceHtml(html);
      adapter.hydrateFromXml('css', css ? result.css : emptyXml);
      adapter.hydrateFromXml('i18n', i18n ? result.i18n : emptyXml);
      const injectEnd = nowMs();

      // hydrateFromXml 은 Blockly events disabled 로 돌므로 changeListener 의
      // bumpStructure 가 안 탄다 → store 메타 blockCount 0 유지 → preview/edit
      // 가 빈 상태 placeholder 를 보여줌 (UI sweep 에서 발견). 실제
      // ImportDialog 와 동일하게 명시적으로 bump.
      const bump = useWorkspaceStore.getState().bumpStructure;
      bump('html', adapter.countBlocks('html'));
      bump('css', adapter.countBlocks('css'));
      bump('i18n', adapter.countBlocks('i18n'));
      bump('worker', adapter.countBlocks('worker'));

      // emit pipeline cost (synchronous emitAll — bypass 500ms debounce).
      const emitT0 = nowMs();
      const emitOut = emitAll({
        html: adapter.getWorkspace('html'),
        css: adapter.getWorkspace('css'),
        i18n: adapter.getWorkspace('i18n'),
        worker: adapter.getWorkspace('worker'),
      });
      const emitEnd = nowMs();

      // also push to store so user sees Code tab update.
      useWorkspaceStore.getState().setEmitCache({
        html: emitOut.html,
        css: emitOut.css,
        i18n: emitOut.i18n,
        worker: emitOut.worker,
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
        workerBlockCount: workerSource.replaced ? workerSource.targetCount : workerMove.targetCount,
        warnings: result.warnings.length,
        compositeCollapsed: result.stats.compositeCollapsed ?? 0,
        compositePackedByType: result.stats.compositePackedByType ?? {},
        wideRowBundles: result.stats.wideRowBundles ?? 0,
        wideRowCollapsed: result.stats.wideRowCollapsed ?? 0,
        heapBeforeMb,
        heapAfterMb,
      };
    },

    setMainMode: (mode) => {
      useUiStore.getState().setMainMode(mode);
    },

    setPreviewZoom: (zoom) => {
      useUiStore.getState().setPreviewZoom(zoom);
    },

    setPreviewRenderMode: (mode) => {
      usePreviewStore.getState().setRenderMode(mode);
    },

    setRoll20CompatibilityMode: (mode) => {
      usePreviewStore.getState().setRoll20CompatibilityMode(mode);
    },

    setLegacyCssSanitize: (enabled) => {
      usePreviewStore.getState().setLegacyCssSanitize(enabled);
    },

    setRoll20SandboxSanitize: (enabled) => {
      usePreviewStore.getState().setRoll20SandboxSanitize(enabled);
    },

    setAssetReplacementMap: (text) => {
      usePreviewStore.getState().setAssetReplacementMap(text);
    },

    getAssetReplacementMap: () => usePreviewStore.getState().assetReplacementMap,

    saveAssetReplacementProfile: (name) => usePreviewStore.getState().saveAssetReplacementProfile(name),

    loadAssetReplacementProfile: (id) => usePreviewStore.getState().loadAssetReplacementProfile(id),

    getAssetReplacementProfiles: () => usePreviewStore.getState().assetReplacementProfiles,

    appendFriendlyWidgetForEditSmoke: ({
      containerPresetId = 'section',
      widgetPresetId = 'text-input',
      mode = 'flow',
    } = {}) => {
      const adapter = getBlocklyAdapter();
      const store = useWorkspaceStore.getState();
      const containerPreset = findFriendlyWidgetPreset(containerPresetId);
      const widgetPreset = findFriendlyWidgetPreset(widgetPresetId);
      if (!containerPreset || !widgetPreset) {
        throw new Error(`Unknown friendly widget preset: ${containerPresetId} / ${widgetPresetId}`);
      }

      // 측정 hook 전용 우회: appendFriendlyWidgetPreset 은 사용자가 clearAll 직후
      // 1.2s 안에 실수로 드롭하는 것을 막는 가드가 있다 (lastClearedAt). smoke 는
      // clearAll → 즉시 append 순서로 돌므로 가드를 리셋해 결정적으로 만든다.
      useWorkspaceStore.setState({ lastClearedAt: 0 });

      const containerId = appendFriendlyWidgetPreset(
        containerPreset,
        { left: 32, top: 32 },
        { mode: 'absolute' },
      );
      const widgetId = appendFriendlyWidgetPreset(
        widgetPreset,
        { left: 48, top: 48 },
        {
          mode,
          containerBlockId: mode === 'flow' ? containerId : null,
        },
      );
      const emitOut = emitAll({
        html: adapter.getWorkspace('html'),
        css: adapter.getWorkspace('css'),
        i18n: adapter.getWorkspace('i18n'),
        worker: adapter.getWorkspace('worker'),
      });
      store.setEmitCache({
        html: emitOut.html,
        css: emitOut.css,
        i18n: emitOut.i18n,
        worker: emitOut.worker,
      });
      store.setEmitWarnings(emitOut.warnings);

      const widgetSnapshot = widgetId
        ? adapter.listAllBlocks('html').find((block) => block.id === widgetId)
        : null;
      const widgetTag = widgetId ? findBlockOpeningTag(emitOut.html, widgetId) : '';
      const nested = Boolean(widgetSnapshot && widgetSnapshot.depth > 0);
      return {
        containerId,
        widgetId,
        nested,
        widgetStyle: widgetId ? adapter.getBlockField('html', widgetId, 'STYLE') : null,
        htmlContainsNestedWidget: nested,
        htmlHasAbsoluteWidget: /(?:^|;)\s*position\s*:\s*absolute/i.test(widgetTag),
        htmlLen: emitOut.html.length,
        cssLen: emitOut.css.length,
        i18nLen: emitOut.i18n.length,
        warnings: emitOut.warnings.length,
      };
    },

    genSyntheticXml: (n: number, prefix: string = 'syn'): string => {
      // FLAT top-level 구조 — 각 블록이 독립 top-level (next-chain 없음).
      // 이유: 직전 세션의 next-chain 구현은 N≥256 에서 V8 stack limit 으로
      //   `Blockly.Xml.domToBlock` 재귀가 cap 됨 → 실측 무효 (docs/perf/05).
      // 영시영 1부 실 import 도 top-level 다수 + 얕은 nesting 이므로 flat 구조가
      //   더 충실한 시뮬레이션.
      // 시트 specific 0: NAME 필드 = `${prefix}${i}` (영시영 식별자 / 한글 0).
      if (n <= 0) return '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
      const parts: string[] = [];
      parts.push('<xml xmlns="https://developers.google.com/blockly/xml">');
      // 격자 배치 — workspace 좌표상 시각적으로 분산 (clone 시 동일 좌표 cap 회피).
      const COLS = 50;
      const DX = 220;
      const DY = 36;
      for (let i = 0; i < n; i += 1) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x = 20 + col * DX;
        const y = 20 + row * DY;
        parts.push(`<block type="r20_text_input" x="${x}" y="${y}">`);
        parts.push(`<field name="NAME">${prefix}${i}</field>`);
        parts.push('<field name="CLASS"></field>');
        parts.push('<field name="DEFAULT"></field>');
        parts.push('</block>');
      }
      parts.push('</xml>');
      return parts.join('');
    },

    injectXml: async ({ key = 'html', xml, before = false }) => {
      const adapter = getBlocklyAdapter();
      const ws = adapter.getWorkspace(key);
      if (!ws) {
        throw new Error(`[perf] workspace ${key} not registered`);
      }
      // ws 는 Blockly.WorkspaceSvg — adapter 의 hydrateFromXml 우회하지 않고
      // measurement 격리 위해 직접 Blockly API 호출 (내부 구조 동일).
      // before=true : 회귀 측정 — setResizesEnabled wrap 우회 (Phase 3 fix 이전 시뮬레이션).
      // before=false: 현 adapter 의 hydrateFromXml 과 동일 코드경로.
      // dynamic import 로 Blockly chunk 의 lazy 보장.
      const Blockly = await import('blockly');
      tracker.start();
      const heapBeforeMb = getHeapMb();
      const t0 = nowMs();
      Blockly.Events.disable();
      let domParseMs = 0;
      let domToWorkspaceMs = 0;
      try {
        if (!before) ws.setResizesEnabled(false);
        ws.clear();
        const tParse0 = nowMs();
        const dom = Blockly.utils.xml.textToDom(xml);
        domParseMs = nowMs() - tParse0;
        const tInj0 = nowMs();
        Blockly.Xml.domToWorkspace(dom, ws);
        domToWorkspaceMs = nowMs() - tInj0;
      } finally {
        if (!before) ws.setResizesEnabled(true);
        Blockly.Events.enable();
      }
      const totalMs = nowMs() - t0;
      const heapAfterMb = getHeapMb();
      const longtasks = tracker.stop();
      const longtasksMs = longtasks.reduce((s, e) => s + e.duration, 0);
      const blockCount = adapter.listAllBlocks(key).length;

      console.log(
        `[perf] injectXml(${key}, before=${before}): total=${totalMs.toFixed(1)}ms ` +
          `(domParse=${domParseMs.toFixed(1)}, domToWorkspace=${domToWorkspaceMs.toFixed(1)}) ` +
          `longtasks=${longtasksMs.toFixed(0)}ms blockCount=${blockCount}`,
      );
      return {
        domParseMs,
        domToWorkspaceMs,
        totalMs,
        blockCount,
        longtasksMs,
        heapBeforeMb,
        heapAfterMb,
      };
    },

    injectXmlChunked: async ({ key = 'html', xml, chunkSize = 500 }) => {
      const adapter = getBlocklyAdapter();
      tracker.start();
      const heapBeforeMb = getHeapMb();
      const t0 = nowMs();
      // adapter.hydrateFromXmlChunked 가 자체적으로 clear + Events.disable wrap.
      await adapter.hydrateFromXmlChunked(key, xml, { chunkSize });
      const totalMs = nowMs() - t0;
      // longtask observer 가 flush 할 수 있게 한 tick 양보. 숨겨진 탭에서 rAF 가
      // 멈출 수 있으므로 setTimeout 으로 race — 50ms 안에는 반드시 진행.
      await new Promise<void>((r) => {
        let done = false;
        const fin = () => {
          if (done) return;
          done = true;
          r();
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(fin);
        setTimeout(fin, 50);
      });
      const heapAfterMb = getHeapMb();
      const longtasks = tracker.stop();
      const longtasksMs = longtasks.reduce((s, e) => s + e.duration, 0);
      const longestLongtaskMs = longtasks.reduce((m, e) => Math.max(m, e.duration), 0);
      const blockCount = adapter.listAllBlocks(key).length;
      const chunkCount = Math.ceil(blockCount / Math.max(1, chunkSize)) || 0;

      console.log(
        `[perf] injectXmlChunked(${key}, chunk=${chunkSize}): total=${totalMs.toFixed(1)}ms ` +
          `longtasks=${longtasksMs.toFixed(0)}ms (max=${longestLongtaskMs.toFixed(0)}ms) ` +
          `blockCount=${blockCount} chunks=${chunkCount}`,
      );
      return {
        totalMs,
        chunkSize,
        chunkCount,
        blockCount,
        longtasksMs,
        longestLongtaskMs,
        heapBeforeMb,
        heapAfterMb,
      };
    },

    clearChat: () => {
      useChatStore.getState().clear();
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

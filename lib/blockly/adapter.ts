/**
 * Blockly adapter — Blockly 12 API wrapping.
 *
 * Anchor: docs/spec/10_system_architecture.md §3.3 + §3.2.
 *
 * 모든 외부 컴포넌트는 본 adapter 통해서만 Blockly 호출.
 * 직접 `import * as Blockly` 는 BlocklyModelHost / BlocksLibrary mini preview /
 * 본 모듈에서만 허용.
 *
 * 미래에 Blockly 메이저 변경 시 (R-9) — 본 모듈만 수정하면 컴포넌트 전부 무영향.
 */

import * as Blockly from 'blockly';
import type { WorkspaceKey } from '@/lib/stores/workspaceStore';
import { getBlockDef } from '@/lib/blocks/registry';
import type { BlockCategory } from '@/lib/blocks/types';

/**
 * Main-thread yield — 가능하면 `requestIdleCallback` (브라우저 idle 시간),
 * 없으면 `setTimeout(0)`. SSR 에선 즉시 resolve.
 *
 * timeout=100ms 로 idle 가 안 오면 강제 fire — chunked inject 가 idle 부족으로
 * 무한 대기하지 않도록.
 */
// MessageChannel + postMessage delivers a macrotask that — unlike `setTimeout(0)` —
// is NOT throttled to 1Hz in hidden / backgrounded Chrome tabs. We allocate one
// channel and reuse it across yields.
let __yieldChannel: MessageChannel | null = null;
let __yieldQueue: Array<() => void> = [];
function ensureYieldChannel(): MessageChannel | null {
  if (typeof window === 'undefined' || typeof MessageChannel === 'undefined') return null;
  if (__yieldChannel) return __yieldChannel;
  const ch = new MessageChannel();
  ch.port1.onmessage = () => {
    const cbs = __yieldQueue;
    __yieldQueue = [];
    for (const cb of cbs) {
      try {
        cb();
      } catch {
        // swallow — we're only yielding
      }
    }
  };
  __yieldChannel = ch;
  return ch;
}

function yieldToMain(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const ch = ensureYieldChannel();
  if (!ch) return new Promise<void>((resolve) => setTimeout(resolve, 0));
  return new Promise<void>((resolve) => {
    __yieldQueue.push(resolve);
    ch.port2.postMessage(null);
  });
}


export interface BlockSnapshot {
  id: string;
  type: string;
  /** 자식 / 다음 블록 chain 의 들여쓰기 깊이. */
  depth: number;
  /** 사용자 표시용 한국어 라벨 (블록 정의 label). */
  label: string;
  /** 핵심 필드 미리보기 (예: text_input 의 name 필드 값). */
  preview: string;
  /** 카테고리 id — UI 색 띠 표시. */
  category: BlockCategory | null;
}

/** Inspector 폼이 사용. Blockly Block.inputList 를 평탄화한 field 정보. */
export interface BlockFieldInfo {
  name: string;
  kind: 'text' | 'number' | 'dropdown' | 'checkbox' | 'unknown';
  value: string;
  options?: Array<{ value: string; label: string }>;
}

export interface BlocklyAdapter {
  registerWorkspace(key: WorkspaceKey, ws: Blockly.WorkspaceSvg): void;
  unregisterWorkspace(key: WorkspaceKey): void;
  getWorkspace(key: WorkspaceKey): Blockly.WorkspaceSvg | null;
  listAllBlocks(key: WorkspaceKey): BlockSnapshot[];
  getBlock(key: WorkspaceKey, id: string): BlockSnapshot | null;
  getBlockFields(key: WorkspaceKey, blockId: string): BlockFieldInfo[];
  /** 새 블록 인스턴스를 활성 워크스페이스 top-level 에 추가. 반환 = 새 block id (또는 null). */
  appendBlockToWorkspace(key: WorkspaceKey, blockType: string): string | null;
  setFieldValue(key: WorkspaceKey, blockId: string, fieldName: string, value: string): void;
  /**
   * Phase C WYSIWYG drag — 특정 block 의 field 가 존재하는지 검사.
   * 위치 필드 (LEFT_PX/TOP_PX) 같이 일부 블록에만 있는 field 의 안전한 처리에 사용.
   * 블록 자체가 없으면 false.
   */
  hasBlockField(key: WorkspaceKey, blockId: string, fieldName: string): boolean;
  /**
   * Phase C WYSIWYG drag — 특정 block 의 field 값을 읽음. 없으면 null.
   * number-like field 의 string 그대로 반환 (호출측에서 parseInt/Float).
   */
  getBlockField(key: WorkspaceKey, blockId: string, fieldName: string): string | null;
  /**
   * Phase C WYSIWYG drag — 특정 block 의 field 를 갱신 (setFieldValue 와 동일
   * 시그니처이나 reverse-arg 으로 호환성 더 직관적). 존재하지 않는 field 는 no-op.
   * 반환 = 갱신 성공 여부 (block + field 모두 존재 + 값 변경 시 true).
   */
  setBlockField(key: WorkspaceKey, blockId: string, fieldName: string, value: string): boolean;
  serializeXml(key: WorkspaceKey): string;
  hydrateFromXml(key: WorkspaceKey, xml: string): void;
  /**
   * Chunked hydrate — XML 의 top-level 자식을 chunkSize 단위로 잘라 inject.
   * 각 chunk 사이에 `requestIdleCallback` (없으면 `setTimeout(0)`) 으로 main-thread
   * yield → paint + UI 응답성 확보. wall time 은 비슷하나 longest longtask 가
   * 1개의 거대 task 에서 chunk 크기 비례 작은 task 여러 개로 분산됨.
   *
   * 옵션:
   *  - chunkSize  default 500 (perf sweep §4 결과)
   *  - onProgress(done, total)  완료된 블록 수 / 전체 블록 수
   */
  hydrateFromXmlChunked(
    key: WorkspaceKey,
    xml: string,
    opts?: {
      chunkSize?: number;
      onProgress?: (done: number, total: number) => void;
    },
  ): Promise<void>;
  onChange(key: WorkspaceKey, listener: () => void): () => void;
}

class DefaultAdapter implements BlocklyAdapter {
  private workspaces: Partial<Record<WorkspaceKey, Blockly.WorkspaceSvg>> = {};

  registerWorkspace(key: WorkspaceKey, ws: Blockly.WorkspaceSvg): void {
    this.workspaces[key] = ws;
  }

  unregisterWorkspace(key: WorkspaceKey): void {
    delete this.workspaces[key];
  }

  getWorkspace(key: WorkspaceKey): Blockly.WorkspaceSvg | null {
    return this.workspaces[key] ?? null;
  }

  listAllBlocks(key: WorkspaceKey): BlockSnapshot[] {
    const ws = this.workspaces[key];
    if (!ws) return [];
    const out: BlockSnapshot[] = [];
    for (const block of ws.getTopBlocks(true)) {
      this.walk(block, 0, out);
    }
    return out;
  }

  private walk(block: Blockly.Block, depth: number, out: BlockSnapshot[]): void {
    const def = getBlockDef(block.type);
    out.push({
      id: block.id,
      type: block.type,
      depth,
      label: def?.label ?? block.type,
      preview: this.previewFor(block),
      category: def?.category ?? null,
    });
    for (const child of block.getChildren(true)) {
      this.walk(child, depth + 1, out);
    }
  }

  private previewFor(block: Blockly.Block): string {
    const fields = block.inputList.flatMap((input) => input.fieldRow);
    for (const f of fields) {
      const v = f.getValue?.();
      if (typeof v === 'string' && v && v !== 'undefined') return String(v).slice(0, 40);
    }
    return '';
  }

  getBlock(key: WorkspaceKey, id: string): BlockSnapshot | null {
    const ws = this.workspaces[key];
    if (!ws) return null;
    const b = ws.getBlockById(id);
    if (!b) return null;
    const def = getBlockDef(b.type);
    return {
      id: b.id,
      type: b.type,
      depth: 0,
      label: def?.label ?? b.type,
      preview: this.previewFor(b),
      category: def?.category ?? null,
    };
  }

  getBlockFields(key: WorkspaceKey, blockId: string): BlockFieldInfo[] {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!b) return [];
    const out: BlockFieldInfo[] = [];
    for (const input of b.inputList) {
      for (const f of input.fieldRow) {
        const editable =
          (f as { isCurrentlyEditable?: () => boolean }).isCurrentlyEditable?.() ?? false;
        if (!editable) continue;
        const name = (f as { name?: string }).name ?? '';
        if (!name) continue;
        const rawValue = f.getValue?.();
        const value = rawValue == null ? '' : String(rawValue);
        const fieldType = (f as { constructor: { name?: string } }).constructor?.name ?? '';
        let kind: BlockFieldInfo['kind'] = 'unknown';
        let options: BlockFieldInfo['options'] | undefined;
        if (fieldType === 'FieldNumber') kind = 'number';
        else if (fieldType === 'FieldTextInput') kind = 'text';
        else if (fieldType === 'FieldCheckbox') kind = 'checkbox';
        else if (fieldType === 'FieldDropdown') {
          kind = 'dropdown';
          const dd = f as unknown as {
            getOptions?: (useCache?: boolean) => Array<[unknown, string]>;
          };
          const opts = dd.getOptions?.(false) ?? [];
          options = opts.map(([labelRaw, val]) => ({
            value: String(val),
            label: typeof labelRaw === 'string' ? labelRaw : String(val),
          }));
        }
        out.push({ name, kind, value, options });
      }
    }
    return out;
  }

  appendBlockToWorkspace(key: WorkspaceKey, blockType: string): string | null {
    const ws = this.workspaces[key];
    if (!ws) return null;
    try {
      const block = ws.newBlock(blockType);
      const offset = ws.getTopBlocks(false).length * 8;
      block.moveBy(20 + offset, 20 + offset);
      block.initSvg();
      block.render();
      return block.id;
    } catch {
      return null;
    }
  }

  setFieldValue(key: WorkspaceKey, blockId: string, fieldName: string, value: string): void {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    b?.setFieldValue(value, fieldName);
  }

  /** Phase C — block + field 존재 여부 검사. */
  hasBlockField(key: WorkspaceKey, blockId: string, fieldName: string): boolean {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!b) return false;
    // getField 는 Blockly Block API — 존재 안 하면 null 반환.
    return !!(b as { getField?: (n: string) => unknown }).getField?.(fieldName);
  }

  /** Phase C — field 값 read. */
  getBlockField(key: WorkspaceKey, blockId: string, fieldName: string): string | null {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!b) return null;
    const f = (b as { getField?: (n: string) => unknown }).getField?.(fieldName);
    if (!f) return null;
    const v = (f as { getValue?: () => unknown }).getValue?.();
    return v == null ? null : String(v);
  }

  /** Phase C — field 값 write. 존재하지 않으면 no-op + false. */
  setBlockField(key: WorkspaceKey, blockId: string, fieldName: string, value: string): boolean {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!b) return false;
    const f = (b as { getField?: (n: string) => unknown }).getField?.(fieldName);
    if (!f) return false;
    const cur = (f as { getValue?: () => unknown }).getValue?.();
    if (cur != null && String(cur) === value) return false;
    b.setFieldValue(value, fieldName);
    return true;
  }

  serializeXml(key: WorkspaceKey): string {
    const ws = this.workspaces[key];
    if (!ws) return '';
    const dom = Blockly.Xml.workspaceToDom(ws);
    return Blockly.Xml.domToText(dom);
  }

  hydrateFromXml(key: WorkspaceKey, xml: string): void {
    const ws = this.workspaces[key];
    if (!ws || !xml) return;
    Blockly.Events.disable();
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, ws);
    } finally {
      Blockly.Events.enable();
    }
  }

  async hydrateFromXmlChunked(
    key: WorkspaceKey,
    xml: string,
    opts: {
      chunkSize?: number;
      onProgress?: (done: number, total: number) => void;
    } = {},
  ): Promise<void> {
    const ws = this.workspaces[key];
    if (!ws || !xml) return;
    const chunkSize = Math.max(1, opts.chunkSize ?? 500);
    const onProgress = opts.onProgress;

    const dom = Blockly.utils.xml.textToDom(xml);
    // children = top-level <block> / <shadow> / <variables> 등 모든 root children.
    const allChildren: ChildNode[] = Array.from(dom.childNodes);
    const total = allChildren.length;

    // Re-implement: Blockly.Xml.domToWorkspace 는 root <xml> 의 자식만 처리하므로
    // 각 chunk 를 가짜 <xml> wrapper 에 묶어 호출.
    Blockly.Events.disable();
    // 중요: 각 chunk 안에서 setResizesEnabled wrap 을 우리가 직접 관리.
    // Blockly 의 `appendDomToWorkspace` 가 내부적으로 `ws.clear()` 를 호출하므로
    //   chunk 단위로 호출하면 이전 chunk 내용이 매번 지워짐 → 사용 불가.
    // → 직접 `Blockly.Xml.domToWorkspace` 호출 (append 만 하고 clear 안 함).
    ws.setResizesEnabled(false);
    try {
      ws.clear();
      if (total === 0) {
        onProgress?.(0, 0);
        return;
      }
      // 진행률 시작 알림 (즉시 paint).
      onProgress?.(0, total);

      const doc = dom.ownerDocument ?? globalThis.document;
      let done = 0;
      for (let i = 0; i < total; i += chunkSize) {
        // 각 chunk 사이에 paint 한 번 양보 — requestIdleCallback 선호, fallback setTimeout(0).
        await yieldToMain();

        const chunkRoot = doc.createElementNS(
          'https://developers.google.com/blockly/xml',
          'xml',
        );
        const end = Math.min(i + chunkSize, total);
        for (let j = i; j < end; j += 1) {
          // children 은 다른 doc 에 속할 수 있으니 cloneNode — 원본 dom 손상 방지.
          chunkRoot.appendChild(allChildren[j].cloneNode(true));
        }
        // domToWorkspace 는 clear 안 함 (append-only). setResizesEnabled wrap 은 우리가 외부에서.
        Blockly.Xml.domToWorkspace(chunkRoot, ws);
        done = end;
        onProgress?.(done, total);
      }
    } finally {
      ws.setResizesEnabled(true);
      Blockly.Events.enable();
    }
  }

  onChange(key: WorkspaceKey, listener: () => void): () => void {
    const ws = this.workspaces[key];
    if (!ws) return () => {};
    ws.addChangeListener(listener);
    return () => ws.removeChangeListener(listener);
  }
}

let _adapter: BlocklyAdapter | null = null;

export function getBlocklyAdapter(): BlocklyAdapter {
  if (!_adapter) _adapter = new DefaultAdapter();
  return _adapter;
}

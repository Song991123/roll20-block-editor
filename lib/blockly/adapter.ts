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
function yieldToMain(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    return new Promise<void>((resolve) => {
      w.requestIdleCallback!(() => resolve(), { timeout: 100 });
    });
  }
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
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
        Blockly.Xml.appendDomToWorkspace(chunkRoot, ws);
        done = end;
        onProgress?.(done, total);
      }
    } finally {
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

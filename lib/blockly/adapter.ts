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
    // Perf optimization (Phase 3 — docs/perf/05_yshy_inject.md):
    //   setResizesEnabled(false) wrap is the canonical Blockly 12 bulk-load
    //   pattern (mirrored from appendDomToWorkspace internals). Skips the
    //   O(N) resizeContents() recomputation on every block append → for 6K
    //   blocks this avoids ~6K redundant workspace resize calls.
    //   Events.disable + setResizesEnabled together cover the two biggest
    //   per-block costs during XML hydrate. queueRender batching is already
    //   built-in to Blockly 12 (render_management.ts).
    Blockly.Events.disable();
    ws.setResizesEnabled(false);
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, ws);
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

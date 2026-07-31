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
import { canNestLayerChild } from '@/lib/editor/layerRoles';

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
  childCount: number;
  layerParentId: string | null;
  layerPreviousId: string | null;
  layerRelation: 'root' | 'child' | 'sibling';
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
  registerWorkspace(key: WorkspaceKey, ws: Blockly.Workspace): void;
  unregisterWorkspace(key: WorkspaceKey): void;
  getWorkspace(key: WorkspaceKey): Blockly.Workspace | null;
  /** Return the rendered workspace only; headless model workspaces return null. */
  getWorkspaceSvg(key: WorkspaceKey): Blockly.WorkspaceSvg | null;
  listAllBlocks(key: WorkspaceKey): BlockSnapshot[];
  getBlock(key: WorkspaceKey, id: string): BlockSnapshot | null;
  getBlockFields(key: WorkspaceKey, blockId: string): BlockFieldInfo[];
  /** 새 블록 인스턴스를 활성 워크스페이스 top-level 에 추가. 반환 = 새 block id (또는 null). */
  appendBlockToWorkspace(key: WorkspaceKey, blockType: string): string | null;
  /** 워크스페이스 내 모든 블록 수 (top-level + nested). bumpStructure 인자용. */
  countBlocks(key: WorkspaceKey): number;
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
  /**
   * Phase E WYSIWYG context menu — 선택 레이어와 하위 구조 삭제.
   * 같은 flow의 다음 형제는 보존하고, 블록이 없으면 false.
   */
  deleteBlock(key: WorkspaceKey, blockId: string): boolean;
  /**
   * Phase E WYSIWYG context menu — 블록 복제. Blockly.Xml.blockToDom →
   * domToBlock 으로 같은 워크스페이스에 같은 type/field 의 블록 생성.
   * 위치는 원본 + (20, 20) px 오프셋. 반환 = 새 block id 또는 null.
   */
  duplicateBlock(key: WorkspaceKey, blockId: string): string | null;
  /**
   * Phase E WYSIWYG context menu — top-level 블록을 한 칸 위로 (Y 좌표 swap).
   * statement chain (next/prev connection) 안 블록은 미지원 — false 반환.
   * 호출자는 false 시 토스트로 "지원 예정" 안내.
   */
  moveBlockUp(key: WorkspaceKey, blockId: string): boolean;
  /**
   * Phase E WYSIWYG context menu — top-level 블록을 한 칸 아래로 (Y swap).
   * moveBlockUp 의 대칭. statement chain 안 미지원.
   */
  moveBlockDown(key: WorkspaceKey, blockId: string): boolean;
  moveBlockBefore(key: WorkspaceKey, blockId: string, targetId: string): boolean;
  moveBlockAfter(key: WorkspaceKey, blockId: string, targetId: string): boolean;
  /** Move a nested block out of its current container, preserving sibling order when possible. */
  moveBlockOutOfContainer(key: WorkspaceKey, blockId: string): boolean;
  moveBlockToRoot(key: WorkspaceKey, blockId: string): boolean;
  canNestInContainer(key: WorkspaceKey, targetId: string): boolean;
  canNestTypeInContainer(key: WorkspaceKey, movingType: string, targetId: string): boolean;
  canNestBlockInContainer(key: WorkspaceKey, blockId: string, targetId: string): boolean;
  nestBlockInContainer(key: WorkspaceKey, blockId: string, targetId: string): boolean;
  /** Group contiguous sibling layers in a new generic HTML container. */
  groupBlocksInContainer(key: WorkspaceKey, blockIds: string[]): string | null;
  canUndo(key: WorkspaceKey): boolean;
  canRedo(key: WorkspaceKey): boolean;
  undo(key: WorkspaceKey): boolean;
  redo(key: WorkspaceKey): boolean;
  onChange(key: WorkspaceKey, listener: () => void): () => void;
}

type RenderableBlock = {
  initSvg?: () => void;
  render?: () => void;
};

/**
 * Structural connections are model work needed for the immediate emit. SVG
 * repaint is independent of that model result, so let the browser paint it on
 * the next frame instead of making an iframe drop wait for Blockly rendering.
 * Node/unit-test callers keep the synchronous fallback.
 */
function renderBlocksSoon(blocks: Array<RenderableBlock | null | undefined>): void {
  const render = () => {
    for (const block of blocks) {
      try {
        block?.initSvg?.();
        block?.render?.();
      } catch {
        // A workspace can be disposed between the model mutation and paint.
      }
    }
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(render);
    return;
  }
  render();
}

function isWorkspaceSvg(
  workspace: Blockly.Workspace | null | undefined,
): workspace is Blockly.WorkspaceSvg {
  return Boolean(
    workspace &&
      workspace.rendered &&
      typeof (workspace as Blockly.WorkspaceSvg).setResizesEnabled === 'function',
  );
}

function isBlockSvg(block: Blockly.Block | null | undefined): block is Blockly.BlockSvg {
  return Boolean(block && block.rendered && typeof (block as Blockly.BlockSvg).initSvg === 'function');
}

class DefaultAdapter implements BlocklyAdapter {
  private workspaces: Partial<Record<WorkspaceKey, Blockly.Workspace>> = {};

  registerWorkspace(key: WorkspaceKey, ws: Blockly.Workspace): void {
    this.workspaces[key] = ws;
  }

  unregisterWorkspace(key: WorkspaceKey): void {
    delete this.workspaces[key];
  }

  getWorkspace(key: WorkspaceKey): Blockly.Workspace | null {
    return this.workspaces[key] ?? null;
  }

  getWorkspaceSvg(key: WorkspaceKey): Blockly.WorkspaceSvg | null {
    const ws = this.workspaces[key];
    return isWorkspaceSvg(ws) ? ws : null;
  }

  listAllBlocks(key: WorkspaceKey): BlockSnapshot[] {
    const ws = this.workspaces[key];
    if (!ws) return [];
    const out: BlockSnapshot[] = [];
    const seen = new Set<string>();
    for (const block of ws.getTopBlocks(true)) {
      this.walk(block, 0, out, seen, null, null, 'root');
    }
    return out;
  }

  private walk(
    block: Blockly.Block,
    depth: number,
    out: BlockSnapshot[],
    seen: Set<string>,
    layerParentId: string | null,
    layerPreviousId: string | null,
    layerRelation: BlockSnapshot['layerRelation'],
  ): void {
    if (seen.has(block.id)) return;
    seen.add(block.id);
    const def = getBlockDef(block.type);
    const directChildren = (block.inputList ?? [])
      .map((input) => input.connection?.targetBlock() ?? null)
      .filter((child) => child !== null);
    out.push({
      id: block.id,
      type: block.type,
      depth,
      childCount: directChildren.length,
      layerParentId,
      layerPreviousId,
      layerRelation,
      label: def?.label ?? block.type,
      preview: this.previewFor(block),
      category: def?.category ?? null,
    });

    const nextBlock =
      (block as { getNextBlock?: () => Blockly.Block | null }).getNextBlock?.() ??
      block.nextConnection?.targetBlock() ??
      null;
    for (const child of directChildren) {
      if (child && child.id !== nextBlock?.id) {
        this.walk(child, depth + 1, out, seen, block.id, null, 'child');
      }
    }
    if (nextBlock) {
      this.walk(nextBlock, depth, out, seen, layerParentId, block.id, 'sibling');
    }
  }

  private previewFor(block: Blockly.Block): string {
    const fields = block.inputList.flatMap((input) => input.fieldRow);
    // Prefer authored values over Blockly's static labels (for example the
    // input block label "글자"). This keeps layer/search previews useful for
    // imported sheets without changing the emitted source.
    const editableFields = fields.filter(
      (field) =>
        (field as { isCurrentlyEditable?: () => boolean }).isCurrentlyEditable?.() ?? false,
    );
    for (const f of [...editableFields, ...fields]) {
      const v = f.getValue?.();
      if (typeof v === 'string' && v && v !== 'undefined') return String(v).slice(0, 40);
    }
    return '';
  }

  getBlock(key: WorkspaceKey, id: string): BlockSnapshot | null {
    // Keep the layer metadata returned by listAllBlocks. Returning every
    // block as a root made iframe drop resolution lose the real container
    // relationship after a block was nested.
    return this.listAllBlocks(key).find((block) => block.id === id) ?? null;
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
      // Headless model workspaces have no canvas to lay out. Calling SVG
      // methods here would reintroduce the large-import render bottleneck.
      if (isBlockSvg(block)) {
        const offset = ws.getTopBlocks(false).length * 8;
        block.moveBy(20 + offset, 20 + offset);
        block.initSvg();
        block.render();
      }
      // Phase D fix (add-block bumpStructure 버그, local_1abb2993):
      // `ws.newBlock` 은 데이터 구조만 만들고 BLOCK_CREATE 이벤트를 발화하지
      // 않는다. 따라서 BlocklyModelHost 의 changeListener (BLOCK_CREATE →
      // bumpStructure) 가 트리거 안 되고 → store.blockCount=0 유지 →
      // PreviewEmptyState 영구 표시 → 미리보기 영구 빈 화면.
      // 해결: 명시적으로 BlockCreate 이벤트 발화. disable 카운터가 미해소된
      // 환경에서도 belt+suspenders 로 1회만 enable 후 fire → 원상복구.
      let needsReenable = false;
      try {
        if (!Blockly.Events.isEnabled()) {
          Blockly.Events.enable();
          needsReenable = true;
        }
        Blockly.Events.fire(new Blockly.Events.BlockCreate(block));
      } finally {
        if (needsReenable) Blockly.Events.disable();
      }
      return block.id;
    } catch {
      return null;
    }
  }

  countBlocks(key: WorkspaceKey): number {
    const ws = this.workspaces[key];
    if (!ws) return 0;
    try {
      return ws.getAllBlocks(false).length;
    } catch {
      return 0;
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

  /** Phase C — field 값 write. 존재하지 않으면 no-op + false.
   *
   * Phase D fix (local_86b826b4 검증): hydrateFromXml* / perfHook injectXml 의
   * Events.disable 가 (예외 경로에서) 카운터가 미해소된 채 남아있는 경우
   * setFieldValue 호출이 BLOCK_CHANGE 이벤트를 발화하지 않아 emit 갱신이
   * 안 됨. 본 메서드는 호출 직전 isEnabled() 가 false 면 1회 enable() 로 강제
   * 끌어올린 뒤 setFieldValue → 원상복구. PreviewMain.onEditText 가 추가로
   * bumpStructure 를 직접 호출하므로 belt+suspenders.
   */
  setBlockField(key: WorkspaceKey, blockId: string, fieldName: string, value: string): boolean {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!b) return false;
    const f = (b as { getField?: (n: string) => unknown }).getField?.(fieldName);
    if (!f) return false;
    const cur = (f as { getValue?: () => unknown }).getValue?.();
    if (cur != null && String(cur) === value) return false;
    // 이벤트 보장: disable 카운터가 미해소된 경우 1회만 enable 해서 BLOCK_CHANGE
    // 가 정상 발화되게 한 뒤 원상복구. Blockly.Events.disable/enable 는 nested
    // 카운터라 한번 enable 해 0 으로 끌어내려도 caller 의 finally 의 enable
    // 이 -1 까지 떨어트리지만 isEnabled() 는 ≤0 → false 동작 그대로.
    let needsReenable = false;
    try {
      if (!Blockly.Events.isEnabled()) {
        Blockly.Events.enable();
        needsReenable = true;
      }
      b.setFieldValue(value, fieldName);
    } finally {
      if (needsReenable) Blockly.Events.disable();
    }
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
    const svgWorkspace = isWorkspaceSvg(ws) ? ws : null;
    // Blockly.Xml.domToWorkspace toggles resize handling in its own finally.
    // Keep that toggle inside one batch for SVG workspaces. A headless model
    // has no resize/render hooks and can take the direct fast path.
    const originalSetResizesEnabled = svgWorkspace?.setResizesEnabled;
    const callOriginalSetResizesEnabled = originalSetResizesEnabled?.bind(svgWorkspace);
    if (svgWorkspace && callOriginalSetResizesEnabled) {
      const suppressResizeEnable = (enabled: boolean) => {
        if (enabled) return;
        callOriginalSetResizesEnabled(false);
      };
      svgWorkspace.setResizesEnabled = suppressResizeEnable;
      callOriginalSetResizesEnabled(false);
    }
    try {
      ws.clear();
      const dom = Blockly.utils.xml.textToDom(xml);
      Blockly.Xml.domToWorkspace(dom, ws);
    } finally {
      if (svgWorkspace && originalSetResizesEnabled && callOriginalSetResizesEnabled) {
        svgWorkspace.setResizesEnabled = originalSetResizesEnabled;
        callOriginalSetResizesEnabled(true);
      }
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
    // Blockly.Xml.domToWorkspace re-enables resizing after every chunk. Keep
    // the workspace suppressed until the whole append-only batch completes.
    const svgWorkspace = isWorkspaceSvg(ws) ? ws : null;
    const originalSetResizesEnabled = svgWorkspace?.setResizesEnabled;
    const callOriginalSetResizesEnabled = originalSetResizesEnabled?.bind(svgWorkspace);
    if (svgWorkspace && callOriginalSetResizesEnabled) {
      const suppressResizeEnable = (enabled: boolean) => {
        if (enabled) return;
        callOriginalSetResizesEnabled(false);
      };
      svgWorkspace.setResizesEnabled = suppressResizeEnable;
      callOriginalSetResizesEnabled(false);
    }
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
      if (svgWorkspace && originalSetResizesEnabled && callOriginalSetResizesEnabled) {
        svgWorkspace.setResizesEnabled = originalSetResizesEnabled;
        callOriginalSetResizesEnabled(true);
      }
      Blockly.Events.enable();
    }
  }

  /** Phase E — delete the selected layer and its nested HTML structure. */
  deleteBlock(key: WorkspaceKey, blockId: string): boolean {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!b) return false;
    try {
      // `true` heals a statement gap by promoting the selected block's
      // children/successors. That is useful for Blockly statement editing,
      // but wrong for a Figma-like layer delete: a deleted frame must not
      // leave its descendants as new root layers.
      // Detach the next sibling first so deleting a middle layer does not
      // consume the rest of its parent's flow chain. Reconnect that sibling
      // to the previous block or the original statement input afterward.
      const nextCandidate = b.nextConnection?.targetBlock() ?? null;
      const next = nextCandidate
        && nextCandidate.previousConnection?.targetConnection === b.nextConnection
        ? nextCandidate
        : null;
      const previousConnection = b.previousConnection?.targetConnection ?? null;
      const previousSource = previousConnection?.getSourceBlock?.() ?? null;
      const previous = previousSource
        && previousSource.nextConnection === previousConnection
        ? previousSource
        : null;
      const parentStatementConnection = !previous ? previousConnection : null;
      next?.previousConnection?.disconnect();
      b.dispose(false);
      if (next) {
        if (previous?.nextConnection && !previous.nextConnection.isConnected()) {
          previous.nextConnection.connect(next.previousConnection!);
        } else if (parentStatementConnection && !parentStatementConnection.isConnected()) {
          parentStatementConnection.connect(next.previousConnection!);
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Phase E — block 복제. blockToDom → domToBlock, +20px 오프셋. */
  duplicateBlock(key: WorkspaceKey, blockId: string): string | null {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!ws || !b) return null;
    try {
      const dom = Blockly.Xml.blockToDom(b, true) as Element;
      // blockToDom includes the following statement chain. A layer duplicate
      // must copy the selected block and its nested inputs, not its siblings.
      const nextNode = Array.from(dom.children)
        .find((child) => child.tagName.toLowerCase() === 'next');
      nextNode?.remove();
      // domToBlock 은 Blockly 12 의 단일 블록 hydrate API.
      const newBlock = Blockly.Xml.domToBlock(dom, ws);
      const xy = b.getRelativeToSurfaceXY();
      // 새 블록은 (0,0) 에 박힘 → 원본 + 오프셋 위치로 이동.
      const cur = newBlock.getRelativeToSurfaceXY();
      newBlock.moveBy((xy.x - cur.x) + 20, (xy.y - cur.y) + 20);
      return newBlock.id;
    } catch {
      return null;
    }
  }

  /** Phase E — top-level 블록 순서 위로 (Y 좌표 swap). */
  moveBlockUp(key: WorkspaceKey, blockId: string): boolean {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!ws || !b) return false;
    // statement chain 안 블록은 미지원.
    if ((b as { getParent?: () => unknown }).getParent?.()) return false;
    const tops = ws.getTopBlocks(true); // sorted by Y
    const idx = tops.indexOf(b);
    if (idx <= 0) return false;
    const prev = tops[idx - 1];
    const xyB = b.getRelativeToSurfaceXY();
    const xyP = prev.getRelativeToSurfaceXY();
    b.moveBy(xyP.x - xyB.x, xyP.y - xyB.y);
    prev.moveBy(xyB.x - xyP.x, xyB.y - xyP.y);
    return true;
  }

  /** Phase E — top-level 블록 순서 아래로. */
  moveBlockDown(key: WorkspaceKey, blockId: string): boolean {
    const ws = this.workspaces[key];
    const b = ws?.getBlockById(blockId);
    if (!ws || !b) return false;
    if ((b as { getParent?: () => unknown }).getParent?.()) return false;
    const tops = ws.getTopBlocks(true);
    const idx = tops.indexOf(b);
    if (idx < 0 || idx >= tops.length - 1) return false;
    const next = tops[idx + 1];
    const xyB = b.getRelativeToSurfaceXY();
    const xyN = next.getRelativeToSurfaceXY();
    b.moveBy(xyN.x - xyB.x, xyN.y - xyB.y);
    next.moveBy(xyB.x - xyN.x, xyB.y - xyN.y);
    return true;
  }

  moveBlockBefore(key: WorkspaceKey, blockId: string, targetId: string): boolean {
    const ws = this.workspaces[key];
    const moving = ws?.getBlockById(blockId);
    const target = ws?.getBlockById(targetId);
    if (!ws || !moving || !target || moving === target) return false;
    if (this.moveNestedBlockBefore(moving, target)) return true;
    if ((moving as { getParent?: () => unknown }).getParent?.()) return false;
    if ((target as { getParent?: () => unknown }).getParent?.()) return false;
    const targetXY = target.getRelativeToSurfaceXY();
    const movingXY = moving.getRelativeToSurfaceXY();
    moving.moveBy(targetXY.x - movingXY.x, targetXY.y - movingXY.y - 24);
    return true;
  }

  moveBlockAfter(key: WorkspaceKey, blockId: string, targetId: string): boolean {
    const ws = this.workspaces[key];
    const moving = ws?.getBlockById(blockId);
    const target = ws?.getBlockById(targetId);
    if (!ws || !moving || !target || moving === target) return false;
    if (this.moveNestedBlockAfter(moving, target)) return true;
    if ((moving as { getParent?: () => unknown }).getParent?.()) return false;
    if ((target as { getParent?: () => unknown }).getParent?.()) return false;
    const targetXY = target.getRelativeToSurfaceXY();
    const movingXY = moving.getRelativeToSurfaceXY();
    moving.moveBy(targetXY.x - movingXY.x, targetXY.y - movingXY.y + 24);
    return true;
  }

  moveBlockToRoot(key: WorkspaceKey, blockId: string): boolean {
    const ws = this.workspaces[key];
    const block = ws?.getBlockById(blockId) as
      | (Blockly.Block & { unplug?: (healStack?: boolean) => void; getParent?: () => Blockly.Block | null })
      | null;
    if (!ws || !block) return false;
    if (!block.getParent?.()) return true;
    try {
      block.unplug?.(true);
      return !block.getParent?.();
    } catch {
      return false;
    }
  }

  moveBlockOutOfContainer(key: WorkspaceKey, blockId: string): boolean {
    const ws = this.workspaces[key];
    const block = ws?.getBlockById(blockId) as
      | (Blockly.Block & {
          previousConnection?: Blockly.Connection | null;
          nextConnection?: Blockly.Connection | null;
          getParent?: () => Blockly.Block | null;
          getSurroundParent?: () => Blockly.Block | null;
          initSvg?: () => void;
          render?: () => void;
        })
      | null;
    // getParent() points at the previous statement in a chain. The surround
    // parent is the actual frame/table/flow container that owns the layer.
    const parent = block?.getSurroundParent?.() ?? null;
    if (!ws || !block || !parent) return false;

    const previous = block.previousConnection;
    const next = block.nextConnection;
    const outerNext = parent.nextConnection;
    if (!previous || !outerNext) return false;

    // Preserve both chains before disconnecting the selected block. Blockly's
    // unplug(true) is useful for ordinary moves, but here it can heal the
    // nested chain into the workspace root before we have inserted the layer
    // after its container.
    const innerPrevious = previous.targetConnection;
    const innerNext = next?.targetConnection ?? null;
    const followingOuter = outerNext.targetConnection;
    if (followingOuter && !next) return false;

    try {
      if (previous.isConnected()) previous.disconnect();
      if (next?.isConnected()) next.disconnect();
      if (outerNext.isConnected()) outerNext.disconnect();

      if (innerPrevious && innerNext) innerPrevious.connect(innerNext);
      outerNext.connect(previous);
      if (followingOuter && next) next.connect(followingOuter);

      renderBlocksSoon([block, parent]);
      return true;
    } catch {
      return false;
    }
  }

  private moveNestedBlockBefore(movingRaw: Blockly.Block, targetRaw: Blockly.Block): boolean {
    const moving = movingRaw as Blockly.Block & {
      previousConnection?: Blockly.Connection | null;
      nextConnection?: Blockly.Connection | null;
      unplug?: (healStack?: boolean) => void;
      initSvg?: () => void;
      render?: () => void;
    };
    const target = targetRaw as Blockly.Block & {
      previousConnection?: Blockly.Connection | null;
      nextConnection?: Blockly.Connection | null;
      initSvg?: () => void;
      render?: () => void;
    };
    if (!moving.previousConnection || !moving.nextConnection || !target.previousConnection) return false;
    if (this.containsInputDescendant(movingRaw, targetRaw)) return false;
    try {
      moving.unplug?.(true);
      if (!moving.previousConnection || !target.previousConnection) return false;
      const insertionConnection = target.previousConnection.targetConnection;
      if (!moving.nextConnection || moving.nextConnection.isConnected()) return false;
      if (insertionConnection) {
        if (moving.previousConnection.isConnected()) return false;
        insertionConnection.connect(moving.previousConnection);
        moving.nextConnection.connect(target.previousConnection);
      } else {
        // A root target has no predecessor connection. After unplugging a
        // nested block, connect its next link directly to the root target so
        // the layer can leave its container and land before that target.
        moving.nextConnection.connect(target.previousConnection);
      }
      renderBlocksSoon([moving, target]);
      return true;
    } catch {
      return false;
    }
  }

  private moveNestedBlockAfter(movingRaw: Blockly.Block, targetRaw: Blockly.Block): boolean {
    const moving = movingRaw as Blockly.Block & {
      previousConnection?: Blockly.Connection | null;
      nextConnection?: Blockly.Connection | null;
      unplug?: (healStack?: boolean) => void;
      initSvg?: () => void;
      render?: () => void;
    };
    const target = targetRaw as Blockly.Block & {
      nextConnection?: Blockly.Connection | null;
      initSvg?: () => void;
      render?: () => void;
    };
    if (!moving.previousConnection || !moving.nextConnection) return false;
    if (!target.nextConnection) return false;
    if (this.containsInputDescendant(movingRaw, targetRaw)) return false;
    let nextBlock: (Blockly.Block & { previousConnection?: Blockly.Connection | null; render?: () => void }) | null = null;
    let nextConnection: Blockly.Connection | null = null;
    try {
      moving.unplug?.(true);
      if (!target.nextConnection) return false;
      nextBlock = target.nextConnection.targetBlock() as
        | (Blockly.Block & {
            previousConnection?: Blockly.Connection | null;
            render?: () => void;
          })
        | null;
      nextConnection = nextBlock?.previousConnection ?? null;
      if (target.nextConnection.isConnected()) {
        target.nextConnection.disconnect();
      }
      if (moving.previousConnection.isConnected()) return false;
      target.nextConnection.connect(moving.previousConnection);
      if (nextBlock) {
        if (!moving.nextConnection || moving.nextConnection.isConnected()) return false;
        if (!nextConnection) return false;
        moving.nextConnection.connect(nextConnection);
      }
      renderBlocksSoon([moving, target, nextBlock]);
      return true;
    } catch {
      return false;
    }
  }

  private containsInputDescendant(rootRaw: Blockly.Block, candidate: Blockly.Block): boolean {
    const root = rootRaw as Blockly.Block & {
      inputList?: Array<{ connection?: Blockly.Connection | null }>;
      nextConnection?: Blockly.Connection | null;
    };
    const stack = (root.inputList ?? [])
      .map((input) => input.connection?.targetBlock())
      .filter((block): block is Blockly.Block => Boolean(block));
    while (stack.length) {
      let block: Blockly.Block | null = stack.pop() ?? null;
      while (block) {
        if (block === candidate) return true;
        const childInputs = (block as Blockly.Block & { inputList?: Array<{ connection?: Blockly.Connection | null }> })
          .inputList ?? [];
        for (const input of childInputs) {
          const child = input.connection?.targetBlock();
          if (child) stack.push(child);
        }
        block = (block as Blockly.Block & { nextConnection?: Blockly.Connection | null }).nextConnection?.targetBlock() ?? null;
      }
    }
    return false;
  }

  canNestInContainer(key: WorkspaceKey, targetId: string): boolean {
    const ws = this.workspaces[key];
    const target = ws?.getBlockById(targetId) as
      | (Blockly.Block & { inputList?: Array<{ connection?: Blockly.Connection | null }> })
      | null;
    if (!ws || !target) return false;
    return (target.inputList ?? []).some((input) => {
      const connection = input.connection;
      return Boolean(connection && connection.type === Blockly.ConnectionType.NEXT_STATEMENT);
    });
  }

  canNestTypeInContainer(key: WorkspaceKey, movingType: string, targetId: string): boolean {
    const ws = this.workspaces[key];
    const target = ws?.getBlockById(targetId);
    if (!ws || !target || !movingType) return false;
    const movingTag = '';
    const targetTag = String(target.getFieldValue?.('TAG') ?? '');
    return this.canNestInContainer(key, targetId) && canNestLayerChild(movingType, target.type, movingTag, targetTag);
  }

  canNestBlockInContainer(key: WorkspaceKey, blockId: string, targetId: string): boolean {
    const ws = this.workspaces[key];
    const moving = ws?.getBlockById(blockId);
    if (!ws || !moving || moving.id === targetId) return false;
    const target = ws.getBlockById(targetId);
    const movingTag = String(moving.getFieldValue?.('TAG') ?? '');
    const targetTag = String(target?.getFieldValue?.('TAG') ?? '');
    return this.canNestInContainer(key, targetId)
      && canNestLayerChild(moving.type, target?.type ?? '', movingTag, targetTag);
  }

  nestBlockInContainer(key: WorkspaceKey, blockId: string, targetId: string): boolean {
    const ws = this.workspaces[key];
    const moving = ws?.getBlockById(blockId) as
      | (Blockly.Block & {
          previousConnection?: Blockly.Connection | null;
          nextConnection?: Blockly.Connection | null;
          unplug?: (healStack?: boolean) => void;
          initSvg?: () => void;
          render?: () => void;
        })
      | null;
    const target = ws?.getBlockById(targetId) as
      | (Blockly.Block & { inputList?: Array<{ connection?: Blockly.Connection | null }> })
      | null;
    if (!ws || !moving || !target || moving === target) return false;
    if (!moving.previousConnection) return false;
    if (!this.canNestBlockInContainer(key, blockId, targetId)) return false;
    // A layer drop can originate from the panel instead of the iframe bridge.
    // Reject ancestor -> descendant nesting here as the final invariant so a
    // UI caller cannot create a cyclic DOM/Blockly hierarchy.
    if (this.containsInputDescendant(moving, target)) return false;

    const statementConnection = (target.inputList ?? [])
      .map((input) => input.connection)
      .find((connection): connection is Blockly.Connection => {
        if (!connection) return false;
        return connection.type === Blockly.ConnectionType.NEXT_STATEMENT;
      });
    if (!statementConnection) return false;

    try {
      moving.unplug?.(true);
      let connection = statementConnection;
      let child = connection.targetBlock();
      while (child?.nextConnection?.targetBlock()) {
        child = child.nextConnection.targetBlock();
      }
      if (child?.nextConnection) connection = child.nextConnection;
      if (connection.isConnected()) return false;
      connection.connect(moving.previousConnection);
      renderBlocksSoon([moving]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wrap a contiguous sibling selection in a normal editable `<div>` block.
   * Requiring one parent and contiguous layer order keeps table/conditional
   * structures from being silently reshaped by a convenience action.
   */
  groupBlocksInContainer(key: WorkspaceKey, blockIds: string[]): string | null {
    const ws = this.workspaces[key];
    if (!ws) return null;
    const ids = Array.from(new Set(blockIds.filter(Boolean)));
    if (ids.length < 2) return null;
    const blocks = ids
      .map((id) => ws.getBlockById(id))
      .filter((block): block is Blockly.Block => Boolean(block));
    if (blocks.length !== ids.length) return null;

    const parent = blocks[0].getSurroundParent?.() ?? null;
    if (blocks.some((block) => (block.getSurroundParent?.() ?? null) !== parent)) return null;

    const layerOrder = this.listAllBlocks(key);
    const parentId = parent?.id ?? null;
    const siblingOrder = layerOrder.filter((layer) => layer.layerParentId === parentId);
    const selectedInLayerOrder = siblingOrder.filter((layer) => ids.includes(layer.id));
    if (selectedInLayerOrder.length !== ids.length) return null;
    const firstSiblingIndex = siblingOrder.findIndex((layer) => layer.id === selectedInLayerOrder[0]?.id);
    if (firstSiblingIndex < 0 || selectedInLayerOrder.some((layer, index) => {
      return siblingOrder[firstSiblingIndex + index]?.id !== layer.id;
    })) {
      return null;
    }

    const group = ws.newBlock('r20_element_container');
    try {
      group.setFieldValue('div', 'TAG');
      group.setFieldValue('', 'CLASS');
      if (parentId && !this.canNestBlockInContainer(key, group.id, parentId)) {
        group.dispose(false);
        return null;
      }
      const firstId = selectedInLayerOrder[0]?.id;
      if (!firstId || !this.moveBlockBefore(key, group.id, firstId)) {
        group.dispose(false);
        return null;
      }
      for (const layer of selectedInLayerOrder) {
        if (!this.nestBlockInContainer(key, layer.id, group.id)) {
          return null;
        }
      }
      return group.id;
    } catch {
      // The preflight above keeps this path structural. Do not dispose a
      // partially connected group here: Blockly may own selected children;
      // leaving the failed mutation visible is safer than deleting user data.
      return null;
    }
  }

  canUndo(key: WorkspaceKey): boolean {
    return (this.workspaces[key]?.getUndoStack().length ?? 0) > 0;
  }

  canRedo(key: WorkspaceKey): boolean {
    return (this.workspaces[key]?.getRedoStack().length ?? 0) > 0;
  }

  undo(key: WorkspaceKey): boolean {
    const ws = this.workspaces[key];
    if (!ws || !this.canUndo(key)) return false;
    ws.undo(false);
    return true;
  }

  redo(key: WorkspaceKey): boolean {
    const ws = this.workspaces[key];
    if (!ws || !this.canRedo(key)) return false;
    ws.undo(true);
    return true;
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

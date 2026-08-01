'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { buildRolltemplatePreviewResult } from '@/lib/dice/rolltemplatePreview';
import { extractRolltemplateBody } from '@/lib/dice/rolltemplateRender';
import { commitManagedDesignStyle } from '@/lib/editor/designPosition';
import { getLayerRole } from '@/lib/editor/layerRoles';
import {
  findOwningRolltemplateId,
  listRolltemplateRoots,
  resolveActiveRolltemplateId,
} from '@/lib/editor/rolltemplateScope';
import { getVisualStylePresetGroup } from '@/lib/editor/stylePresets';
import { flushEmitPipeline } from '@/lib/preview/useEmitPipeline';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import {
  appendFriendlyWidgetPreset,
  decodeFriendlyWidgetDrag,
  FRIENDLY_WIDGET_MIME,
} from '@/lib/widgets/presets';
import {
  parseRolltemplateTranslations,
  RolltemplateCardContent,
  RolltemplateRenderSurface,
} from './ChatPane';

export default function RolltemplateEditSurface() {
  const emittedHtml = useWorkspaceStore((state) => state.emitCache.html);
  const emittedCss = useWorkspaceStore((state) => state.emitCache.css);
  const emittedI18n = useWorkspaceStore((state) => state.emitCache.i18n);
  const selectedBlockId = useWorkspaceStore((state) => state.selectedBlockId);
  const selectedBlockIds = useWorkspaceStore((state) => state.selectedBlockIds);
  const setSelectedBlockId = useWorkspaceStore((state) => state.setSelectedBlockId);
  const structureVersion = useWorkspaceStore((state) => state.workspaces.html.structureVersion);
  const canvasWidth = useUiStore((state) => state.rolltemplateCanvasWidth);
  const zoom = useUiStore((state) => state.previewZoom);
  const [dragActive, setDragActive] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const nodes = useMemo(() => {
    void structureVersion;
    return getBlocklyAdapter().listAllBlocks('html');
  }, [structureVersion]);
  const roots = useMemo(() => listRolltemplateRoots(nodes), [nodes]);
  const activeRootId = useMemo(
    () => resolveActiveRolltemplateId(nodes, selectedBlockId),
    [nodes, selectedBlockId],
  );
  const activeRoot = roots.find((root) => root.id === activeRootId) ?? null;
  const templateName = activeRoot
    ? getBlocklyAdapter().getBlockField('html', activeRoot.id, 'NAME')?.trim() || 'default'
    : '';
  const body = activeRoot ? extractRolltemplateBody(emittedHtml, templateName) ?? '' : '';
  const result = useMemo(
    () => buildRolltemplatePreviewResult(body, templateName || 'default'),
    [body, templateName],
  );
  const translations = useMemo(
    () => parseRolltemplateTranslations(emittedI18n),
    [emittedI18n],
  );
  const scale = typeof zoom === 'number' ? zoom : 1;

  useEffect(() => {
    const root = cardRef.current;
    if (!root) return;
    const selected = new Set(selectedBlockIds);
    for (const element of root.querySelectorAll<HTMLElement>('[data-r20-block-id]')) {
      if (selected.has(element.dataset.r20BlockId ?? '')) {
        element.dataset.r20TemplateSelected = '1';
      } else {
        delete element.dataset.r20TemplateSelected;
      }
    }
  }, [body, emittedCss, selectedBlockIds]);

  useEffect(() => {
    if (!activeRootId || findOwningRolltemplateId(nodes, selectedBlockId) !== activeRootId) return;
    const ui = useUiStore.getState();
    if (ui.sidebarRightCollapsed) ui.toggleSidebarRight();
    if (ui.sidebarRightTab !== 'attrs') ui.setSidebarRightTab('attrs');
  }, [activeRootId, nodes, selectedBlockId]);

  const selectRenderedLayer = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element) || !activeRootId) return;
    const element = target.closest<HTMLElement>('[data-r20-block-id]');
    const blockId = element?.dataset.r20BlockId;
    if (!blockId || findOwningRolltemplateId(nodes, blockId) !== activeRootId) return;
    setSelectedBlockId(blockId, 'preview');
  }, [activeRootId, nodes, setSelectedBlockId]);

  const resolveDropContainer = useCallback((blockType: string, target: EventTarget | null) => {
    if (!activeRootId) return null;
    const adapter = getBlocklyAdapter();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const targetElement = target instanceof Element
      ? target.closest<HTMLElement>('[data-r20-block-id]')
      : null;
    let candidateId = targetElement?.dataset.r20BlockId ?? activeRootId;
    if (findOwningRolltemplateId(nodes, candidateId) !== activeRootId) candidateId = activeRootId;
    const seen = new Set<string>();
    while (candidateId && !seen.has(candidateId)) {
      seen.add(candidateId);
      if (adapter.canNestTypeInContainer('html', blockType, candidateId)) return candidateId;
      candidateId = byId.get(candidateId)?.layerParentId ?? activeRootId;
      if (candidateId === activeRootId && seen.has(activeRootId)) break;
    }
    return adapter.canNestTypeInContainer('html', blockType, activeRootId) ? activeRootId : null;
  }, [activeRootId, nodes]);

  const createTemplate = useCallback(() => {
    const adapter = getBlocklyAdapter();
    const state = useWorkspaceStore.getState();
    const existingNames = new Set(
      listRolltemplateRoots(adapter.listAllBlocks('html'))
        .map((root) => adapter.getBlockField('html', root.id, 'NAME')?.trim())
        .filter((name): name is string => Boolean(name)),
    );
    let name = 'default';
    let suffix = 2;
    while (existingNames.has(name)) {
      name = `default${suffix}`;
      suffix += 1;
    }

    const rootId = adapter.appendBlockToWorkspace('html', 'r20_rolltemplate_define');
    if (!rootId) return;
    adapter.setBlockField('html', rootId, 'NAME', name);
    const titleId = adapter.appendBlockToWorkspace('html', 'r20_heading');
    const rowId = adapter.appendBlockToWorkspace('html', 'r20_rolltemplate_row');
    const labelId = adapter.appendBlockToWorkspace('html', 'r20_static_text');
    const valueId = adapter.appendBlockToWorkspace('html', 'r20_static_text');
    if (!titleId || !rowId || !labelId || !valueId) {
      for (const blockId of [valueId, labelId, rowId, titleId, rootId]) {
        if (blockId) adapter.deleteBlock('html', blockId);
      }
      state.bumpStructure('html', adapter.countBlocks('html'));
      toast.error('결과 카드를 만들지 못했어요.');
      return;
    }

    adapter.setBlockField('html', titleId, 'LEVEL', '3');
    adapter.setBlockField('html', titleId, 'TEXT', '{{name}}');
    adapter.setBlockField('html', titleId, 'CLASS', 'result-title');
    adapter.setBlockField('html', rowId, 'CLASS', 'result-row');
    adapter.setBlockField('html', labelId, 'TEXT', '결과');
    adapter.setBlockField('html', labelId, 'CLASS', 'result-label');
    adapter.setBlockField('html', valueId, 'TEXT', '{{result}}');
    adapter.setBlockField('html', valueId, 'CLASS', 'result-value');

    const connected = adapter.nestBlockInContainer('html', titleId, rootId)
      && adapter.nestBlockInContainer('html', rowId, rootId)
      && adapter.nestBlockInContainer('html', labelId, rowId)
      && adapter.nestBlockInContainer('html', valueId, rowId);
    if (!connected) {
      for (const blockId of [valueId, labelId, rowId, titleId, rootId]) {
        adapter.deleteBlock('html', blockId);
      }
      state.bumpStructure('html', adapter.countBlocks('html'));
      toast.error('결과 카드의 내용을 연결하지 못했어요.');
      return;
    }

    const cardPreset = getVisualStylePresetGroup(
      getLayerRole('r20_rolltemplate_define'),
      'r20_rolltemplate_define',
      'rolltemplate',
    )?.presets.find((preset) => preset.id === 'paper')?.declarations ?? {};
    const styles = [
      [rootId, cardPreset],
      [titleId, {
        'background-color': '#d96b91',
        color: '#ffffff',
        padding: '10px 12px',
        'font-size': '18px',
        'font-weight': '700',
      }],
      [rowId, {
        display: 'flex',
        gap: '8px',
        padding: '10px 12px',
        'align-items': 'center',
        'background-color': '#fffdfd',
        'border-width': '0 0 1px 0',
        'border-style': 'solid',
        'border-color': '#ead8df',
      }],
      [labelId, { color: '#5d4450', 'font-weight': '600' }],
      [valueId, {
        color: '#9f3158',
        'margin-left': 'auto',
        'font-size': '20px',
        'font-weight': '700',
      }],
    ] as const;
    let cssChanged = false;
    for (const [blockId, declarations] of styles) {
      const styled = commitManagedDesignStyle(adapter, {
        workspace: 'html',
        blockId,
        declarations,
      });
      cssChanged = cssChanged || styled.cssChanged || styled.cssBlockCreated;
    }
    state.bumpStructure('html', adapter.countBlocks('html'));
    if (cssChanged) state.bumpStructure('css', adapter.countBlocks('css'));
    state.setSelectedBlockId(titleId, 'tree');
    queueMicrotask(() => flushEmitPipeline());
  }, []);

  if (!activeRoot) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-canvas)] p-8" data-testid="rolltemplate-edit-empty">
        <button
          type="button"
          onClick={createTemplate}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary-strong)] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-active)]"
          data-testid="rolltemplate-create"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          주사위 결과 카드 만들기
        </button>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto bg-[var(--bg-canvas)] px-6 py-7"
      data-testid="rolltemplate-edit-surface"
      data-active-template-id={activeRoot.id}
      data-template-name={templateName}
      data-drop-active={dragActive ? '1' : '0'}
      onClick={(event) => selectRenderedLayer(event.target)}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(FRIENDLY_WIDGET_MIME)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setDragActive(false);
      }}
      onDrop={(event) => {
        const preset = decodeFriendlyWidgetDrag(event.dataTransfer.getData(FRIENDLY_WIDGET_MIME));
        setDragActive(false);
        if (!preset || !preset.targets.includes('rolltemplate')) return;
        event.preventDefault();
        const containerBlockId = resolveDropContainer(preset.blockType, event.target);
        if (!containerBlockId) {
          toast.error('이 조각은 현재 위치에 넣을 수 없어요.');
          return;
        }
        const id = appendFriendlyWidgetPreset(preset, undefined, {
          target: 'rolltemplate',
          mode: 'flow',
          containerBlockId,
          placement: 'inside',
        });
        if (!id) toast.error('결과 조각을 추가하지 못했어요.');
      }}
    >
      <style>{`
        [data-testid="rolltemplate-edit-surface"][data-drop-active="1"] [data-r20-rolltemplate-edit-card] {
          outline: 2px solid #d45d84;
          outline-offset: 6px;
        }
        [data-r20-rolltemplate-edit-card] [data-r20-block-id] {
          cursor: pointer;
        }
        [data-r20-rolltemplate-edit-card] [data-r20-template-selected="1"] {
          outline: 2px solid #e7a2b8 !important;
          outline-offset: 2px !important;
        }
      `}</style>
      <div
        className="mx-auto origin-top"
        style={{ width: `${canvasWidth * scale}px` }}
      >
        <div
          ref={cardRef}
          className="overflow-hidden rounded-md border border-[var(--border-strong)] bg-[#f1f1f1] shadow-sm"
          style={{ width: `${canvasWidth}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          data-r20-rolltemplate-edit-card="1"
          data-testid="rolltemplate-edit-card"
        >
          <RolltemplateRenderSurface emittedCss={emittedCss}>
            <div className="textchatcontainer withoutavatars">
              <div className="content">
                <div className="r20-chat-card-group" style={{ width: `${canvasWidth}px` }}>
                  <div className="message general you" style={{ width: `${canvasWidth}px` }}>
                    <div className="spacer" aria-hidden="true" />
                    <span className="by">시트:</span>
                  </div>
                  <div className="message general you" style={{ width: `${canvasWidth}px` }}>
                    <RolltemplateCardContent
                      result={result}
                      emittedHtml={emittedHtml}
                      translations={translations}
                      rootBlockId={activeRoot.id}
                    />
                  </div>
                </div>
              </div>
            </div>
          </RolltemplateRenderSurface>
        </div>
      </div>
    </div>
  );
}

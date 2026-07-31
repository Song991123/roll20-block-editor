'use client';

import { useCallback, useMemo } from 'react';
import { Copy, MousePointerSquareDashed, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getBlocklyAdapter,
  type BlockFieldInfo,
  type BlockSnapshot,
} from '@/lib/blockly/adapter';
import {
  canManageDesignStyle,
  commitManagedDesignStyle,
  MANAGED_DESIGN_STATES,
  readManagedDesignStyle,
  type ManagedDesignDeclarations,
  type ManagedDesignState,
} from '@/lib/editor/designPosition';
import { designStyleFieldForBlockType } from '@/lib/editor/designClassField';
import { getLayerRole } from '@/lib/editor/layerRoles';
import { findOwningRolltemplateId } from '@/lib/editor/rolltemplateScope';
import { flushEmitPipeline } from '@/lib/preview/useEmitPipeline';
import { useWorkspaceStore, WORKSPACE_KEYS, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { fieldDisplayLabel } from './fieldLabels';
import VisualStyleInspector from './VisualStyleInspector';

const GEOMETRY_FIELDS = new Set(['LEFT_PX', 'TOP_PX', 'WIDTH_PX', 'HEIGHT_PX']);

const WORKSPACE_DISPLAY: Record<WorkspaceKey, string> = {
  js: '페이지 JS',
  html: '화면 구성',
  css: '꾸미기',
  i18n: '번역',
  worker: '자동 동작',
};

function resolveSelectedBlock(blockId: string | null): {
  snapshot: BlockSnapshot | null;
  workspace: WorkspaceKey | null;
} {
  if (!blockId) return { snapshot: null, workspace: null };
  const adapter = getBlocklyAdapter();
  for (const workspace of WORKSPACE_KEYS) {
    const snapshot = adapter.listAllBlocks(workspace).find((block) => block.id === blockId);
    if (snapshot) return { snapshot, workspace };
  }
  return { snapshot: null, workspace: null };
}

export default function EditInspector() {
  const selectedId = useWorkspaceStore((s) => s.selectedBlockId);
  const structureVersion = useWorkspaceStore((s) =>
    s.workspaces.html.structureVersion
    + s.workspaces.css.structureVersion
    + s.workspaces.i18n.structureVersion
    + s.workspaces.js.structureVersion
    + s.workspaces.worker.structureVersion,
  );
  const setSelected = useWorkspaceStore((s) => s.setSelectedBlockId);
  const { snapshot, workspace } = useMemo(() => {
    return {
      ...resolveSelectedBlock(selectedId),
    };
  // structureVersion is an intentional invalidation signal for the adapter's
  // external Blockly model; it is not read as a value inside the selector.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, structureVersion]);

  const fields = useMemo(() => {
    if (!selectedId || !workspace) return [];
    return getBlocklyAdapter().getBlockFields(workspace, selectedId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, workspace, structureVersion]);

  const commitField = useCallback((name: string, value: string) => {
    if (!selectedId || !workspace) return;
    const adapter = getBlocklyAdapter();
    if (!adapter.setBlockField(workspace, selectedId, name, value)) return;
    const store = useWorkspaceStore.getState();
    store.bumpStructure(workspace, adapter.countBlocks(workspace));
    queueMicrotask(() => flushEmitPipeline());
  }, [selectedId, workspace]);

  const role = snapshot ? getLayerRole(snapshot.type) : null;
  const visualStyleEnabled = Boolean(
    selectedId
    && workspace === 'html'
    && role
    && role.kind !== 'runtime'
    && canManageDesignStyle(getBlocklyAdapter(), workspace, selectedId),
  );
  const visualStyles = useMemo(() => {
    if (!visualStyleEnabled || !selectedId || workspace !== 'html') {
      return Object.fromEntries(
        MANAGED_DESIGN_STATES.map((state) => [state, {}]),
      ) as Record<ManagedDesignState, Record<string, string>>;
    }
    const adapter = getBlocklyAdapter();
    return Object.fromEntries(
      MANAGED_DESIGN_STATES.map((state) => [
        state,
        readManagedDesignStyle(adapter, workspace, selectedId, state),
      ]),
    ) as Record<ManagedDesignState, Record<string, string>>;
  // structureVersion invalidates the external Blockly and CSS models.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, workspace, structureVersion, visualStyleEnabled]);
  const visualStyleScope = useMemo(() => {
    if (!selectedId || workspace !== 'html') return 'sheet' as const;
    const nodes = getBlocklyAdapter().listAllBlocks('html');
    return findOwningRolltemplateId(nodes, selectedId)
      ? 'rolltemplate' as const
      : 'sheet' as const;
  // structureVersion invalidates template ownership in the external Blockly model.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, workspace, structureVersion]);
  const beforeVisualStyles = useMemo(() => {
    if (!visualStyleEnabled || !selectedId || workspace !== 'html') return {};
    return readManagedDesignStyle(
      getBlocklyAdapter(),
      workspace,
      selectedId,
      'base',
      'before',
    );
  // structureVersion invalidates the external Blockly and CSS models.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, workspace, structureVersion, visualStyleEnabled]);

  const commitVisualStyle = useCallback((
    declarations: ManagedDesignDeclarations,
    state: ManagedDesignState = 'base',
  ) => {
    if (!selectedId || workspace !== 'html') return;
    const adapter = getBlocklyAdapter();
    const result = commitManagedDesignStyle(adapter, {
      workspace,
      blockId: selectedId,
      declarations,
      state,
    });
    if (!result.changed) return;
    const store = useWorkspaceStore.getState();
    if (result.htmlChanged) store.bumpStructure('html', adapter.countBlocks('html'));
    if (result.cssChanged || result.cssBlockCreated) {
      store.bumpStructure('css', adapter.countBlocks('css'));
    }
    queueMicrotask(() => flushEmitPipeline());
  }, [selectedId, workspace]);

  const commitBeforeVisualStyle = useCallback((declarations: ManagedDesignDeclarations) => {
    if (!selectedId || workspace !== 'html') return;
    const adapter = getBlocklyAdapter();
    const result = commitManagedDesignStyle(adapter, {
      workspace,
      blockId: selectedId,
      declarations,
      part: 'before',
    });
    if (!result.changed) return;
    const store = useWorkspaceStore.getState();
    if (result.htmlChanged) store.bumpStructure('html', adapter.countBlocks('html'));
    if (result.cssChanged || result.cssBlockCreated) {
      store.bumpStructure('css', adapter.countBlocks('css'));
    }
    queueMicrotask(() => flushEmitPipeline());
  }, [selectedId, workspace]);

  const deleteSelected = useCallback(() => {
    if (!selectedId || !workspace) return;
    const adapter = getBlocklyAdapter();
    if (!adapter.deleteBlock(workspace, selectedId)) return;
    useWorkspaceStore.getState().bumpStructure(workspace, adapter.countBlocks(workspace));
    setSelected(null, 'inspector');
  }, [selectedId, workspace, setSelected]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId || !workspace) return;
    const adapter = getBlocklyAdapter();
    const duplicateId = adapter.duplicateBlock(workspace, selectedId);
    if (!duplicateId) return;
    useWorkspaceStore.getState().bumpStructure(workspace, adapter.countBlocks(workspace));
    setSelected(duplicateId, 'inspector');
  }, [selectedId, workspace, setSelected]);

  if (!snapshot || !workspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center" data-testid="edit-inspector-empty">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-base font-semibold text-foreground">아직 고른 요소가 없어요</p>
        <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-[var(--text-secondary)]">
          시트에서 요소를 클릭하거나, 왼쪽 레이어 목록에서 골라보세요.
        </p>
      </div>
    );
  }

  const resolvedRole = role ?? getLayerRole(snapshot.type);
  const parent = snapshot.layerParentId
    ? getBlocklyAdapter().listAllBlocks(workspace).find((item) => item.id === snapshot.layerParentId)
    : null;
  const geometry = fields.filter((field) => GEOMETRY_FIELDS.has(field.name));
  const sourceStyleField = designStyleFieldForBlockType(snapshot.type);
  const editable = fields.filter((field) => (
    !GEOMETRY_FIELDS.has(field.name)
    && (!visualStyleEnabled || field.name !== sourceStyleField)
  ));

  return (
    <ScrollArea key={selectedId} className="h-full">
      <div className="space-y-4 p-3.5" data-testid="edit-inspector">
        <header className="r20-form-card flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-muted-foreground">고른 요소</div>
            <div className="mt-1 truncate text-base font-semibold text-foreground">{snapshot.label}</div>
            <details className="mt-1.5">
              <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
                자세한 정보 보기
              </summary>
              <div className="mt-1 rounded-lg bg-[var(--bg-elevated-2)] px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                {snapshot.type}
              </div>
            </details>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${resolvedRole.className}`} data-testid="edit-inspector-role">
            {resolvedRole.label}
          </span>
        </header>

        <div className="grid grid-cols-2 gap-2 text-xs" data-testid="edit-inspector-context">
          <ContextItem label="작업 종류" value={WORKSPACE_DISPLAY[workspace]} />
          <ContextItem label="자리" value={snapshot.layerRelation === 'child' ? '틀 안에 있음' : snapshot.layerRelation === 'sibling' ? '나란히 있음' : '맨 바깥'} />
          <ContextItem label="담고 있는 틀" value={parent?.label ?? '없음'} />
          <ContextItem label="안에 든 것" value={`${snapshot.childCount}개`} />
        </div>

        {geometry.length > 0 && (
          <Section title="위치와 크기">
            <div className="grid grid-cols-2 gap-2">
              {geometry.map((field) => (
                <FieldEditor key={field.name} field={field} onChange={commitField} />
              ))}
            </div>
          </Section>
        )}

        {visualStyleEnabled && (
          <VisualStyleInspector
            valuesByState={visualStyles}
            role={resolvedRole}
            blockType={snapshot.type}
            scope={visualStyleScope}
            onPatch={commitVisualStyle}
            beforeValues={beforeVisualStyles}
            onBeforePatch={commitBeforeVisualStyle}
          />
        )}

        {editable.length > 0 && (
          <Section title="바꿀 수 있는 값">
            <div className="space-y-2.5">
              {editable.map((field) => (
                <FieldEditor key={field.name} field={field} onChange={commitField} />
              ))}
            </div>
          </Section>
        )}

        {editable.length === 0 && geometry.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated-2)] p-3.5 text-sm leading-relaxed text-[var(--text-secondary)]">
            이 요소는 여기서 바꿀 값이 없어요. 시트 위에서 끌어서 자리를 옮길 수 있어요.
          </p>
        )}

        <div className="flex gap-2 border-t border-border pt-3.5">
          <button type="button" onClick={duplicateSelected} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-foreground active:scale-[0.98]" data-testid="edit-inspector-duplicate">
            <Copy className="h-4 w-4" aria-hidden="true" /> 복제
          </button>
          <button type="button" onClick={deleteSelected} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--destructive)_40%,transparent)] bg-[var(--destructive-soft)] px-3 text-sm font-semibold text-[var(--destructive)] transition-colors hover:bg-[color-mix(in_srgb,var(--destructive)_16%,white)] active:scale-[0.98]" data-testid="edit-inspector-delete">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> 삭제
          </button>
        </div>
      </div>
    </ScrollArea>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">{title}</h3>
      {children}
    </section>
  );
}

function FieldEditor({ field, onChange }: { field: BlockFieldInfo; onChange: (name: string, value: string) => void }) {
  const label = fieldDisplayLabel(field.name);
  if (field.kind === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm font-medium">
        <input type="checkbox" className="h-[18px] w-[18px] accent-[var(--primary)]" checked={field.value === 'TRUE' || field.value === 'true' || field.value === '1'} onChange={(event) => onChange(field.name, event.target.checked ? 'TRUE' : 'FALSE')} />
        <span className="truncate text-foreground">{label}</span>
      </label>
    );
  }
  if (field.kind === 'dropdown') {
    return (
      <label className="block">
        <span className="r20-field-label">{label}</span>
        <select value={field.value} onChange={(event) => onChange(field.name, event.target.value)} className="r20-input">
          {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label className="block">
      <span className="r20-field-label">{label}</span>
      <input type="text" inputMode={field.kind === 'number' ? 'decimal' : undefined} value={field.value} onChange={(event) => onChange(field.name, event.target.value)} className="r20-input tabular-nums" data-testid={`edit-inspector-field-${field.name.toLowerCase()}`} />
    </label>
  );
}

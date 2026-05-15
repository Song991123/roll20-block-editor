'use client';

import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { MousePointerSquareDashed } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUiStore } from '@/lib/stores/uiStore';
import {
  useWorkspaceStore,
  type WidgetInstance,
  type WidgetTarget,
} from '@/lib/stores/workspaceStore';
import { getWidget } from '@/lib/widgets/registry';

/**
 * WidgetInspector — 선택된 위젯의 위치/크기/이름/클래스/기본값 폼.
 *
 * Anchor: docs/spec/17_wysiwyg_mode.md §7.
 *
 * - 위치/크기 — x/y/width/height (number)
 * - 이름 — regex /^[a-z][a-z0-9_]*$/i 강제 (N1)
 * - 클래스 — CSS class hook
 * - 기본값 / 라벨 / formula — 위젯 type 별 추가 필드
 */

const NAME_RE = /^[a-z][a-z0-9_]*$/i;

function isValidAttrName(s: string): boolean {
  return s === '' || NAME_RE.test(s);
}

export default function WidgetInspector() {
  const selectedId = useUiStore((s) => s.selectedWidgetId);
  const editSubmode = useUiStore((s) => s.editSubmode);
  const setSelectedWidgetId = useUiStore((s) => s.setSelectedWidgetId);
  const sheetWidgets = useWorkspaceStore((s) => s.sheetWidgets);
  const rolltemplateWidgets = useWorkspaceStore((s) => s.rolltemplateWidgets);
  const updateWidget = useWorkspaceStore((s) => s.updateWidget);
  const removeWidget = useWorkspaceStore((s) => s.removeWidget);

  const target: WidgetTarget = editSubmode === 'sheet' ? 'sheet' : 'rolltemplate';
  const widgets = target === 'sheet' ? sheetWidgets : rolltemplateWidgets;
  const widget = useMemo(
    () => widgets.find((w) => w.id === selectedId) ?? null,
    [widgets, selectedId],
  );

  // Name draft — 유효 안 되도 캔버스 store 는 갱신 X, 사용자 입력 보존.
  const [nameDraft, setNameDraft] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');

  useEffect(() => {
    setNameDraft((widget?.attrs.name as string | undefined) ?? '');
    setNameError('');
  }, [selectedId, widget?.attrs.name]);

  if (!widget) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">선택된 위젯 없음</p>
        <p className="mt-1 max-w-[240px] text-[11px] leading-relaxed text-muted-foreground">
          캔버스에서 위젯을 클릭하거나 갤러리에서 위젯을 끌어다 놓으세요.
        </p>
      </div>
    );
  }

  const def = getWidget(widget.type);

  const setPos = (partial: Partial<Pick<WidgetInstance, 'x' | 'y' | 'width' | 'height'>>) => {
    updateWidget(target, widget.id, partial);
  };

  const setAttr = (key: string, value: unknown) => {
    updateWidget(target, widget.id, { attrs: { [key]: value } });
  };

  const onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setNameDraft(v);
    if (!isValidAttrName(v)) {
      setNameError('영어 + 숫자 + _ 만 가능 — 예: strength, hp_max');
      return; // store 갱신 안 함 (invalid)
    }
    setNameError('');
    setAttr('name', v);
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3.5 p-3" data-testid="widget-inspector">
        <header className="flex items-center justify-between">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
              위젯
            </div>
            <div className="mt-0.5 text-sm font-medium text-foreground">
              {def?.label ?? widget.type}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              removeWidget(target, widget.id);
              setSelectedWidgetId(null);
            }}
            className="rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-500"
            data-testid="widget-inspector-delete"
            title="삭제 (Delete)"
          >
            삭제
          </button>
        </header>

        {/* 위치 / 크기 */}
        <Section title="위치 / 크기">
          <Grid>
            <NumberField label="x" value={widget.x} onChange={(v) => setPos({ x: v })} testid="w-inspector-x" />
            <NumberField label="y" value={widget.y} onChange={(v) => setPos({ y: v })} testid="w-inspector-y" />
            <NumberField label="너비" value={widget.width} onChange={(v) => setPos({ width: Math.max(8, v) })} testid="w-inspector-width" />
            <NumberField label="높이" value={widget.height} onChange={(v) => setPos({ height: Math.max(8, v) })} testid="w-inspector-height" />
          </Grid>
        </Section>

        {/* 이름 (Roll20 attr) */}
        <Section title="이름 (Roll20 attr)">
          <input
            type="text"
            value={nameDraft}
            onChange={onNameChange}
            placeholder="예: strength, hp_max, character_name"
            className={
              'w-full rounded border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none ' +
              (nameError
                ? 'border-red-500/70 ring-1 ring-red-500/50 focus:ring-red-500'
                : 'border-border focus:ring-1 focus:ring-[var(--color-primary,#2563eb)]')
            }
            data-testid="w-inspector-name"
            data-valid={nameError ? 'false' : 'true'}
            aria-invalid={!!nameError}
            spellCheck={false}
            autoComplete="off"
          />
          {nameError ? (
            <p className="mt-1 flex items-start gap-1 text-[10.5px] font-medium text-red-500" data-testid="w-inspector-name-error">
              {nameError}
            </p>
          ) : (
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              영어 + 숫자 + _ 만 가능. Roll20 에서 <code className="font-mono">attr_{nameDraft || 'name'}</code> 으로 노출.
            </p>
          )}
        </Section>

        {/* 클래스 */}
        <Section title="클래스 (CSS class)">
          <input
            type="text"
            value={(widget.attrs.class as string | undefined) ?? ''}
            onChange={(e) => setAttr('class', e.target.value)}
            placeholder="예: stat-box highlighted"
            className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)]"
            data-testid="w-inspector-class"
            spellCheck={false}
            autoComplete="off"
          />
        </Section>

        {/* type 별 추가 필드 */}
        <TypeSpecificFields widget={widget} setAttr={setAttr} />
      </div>
    </ScrollArea>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function NumberField({
  label,
  value,
  onChange,
  testid,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testid?: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="w-10 shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="flex-1 min-w-0 rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)] tabular-nums"
        data-testid={testid}
      />
    </label>
  );
}

function TypeSpecificFields({
  widget,
  setAttr,
}: {
  widget: WidgetInstance;
  setAttr: (k: string, v: unknown) => void;
}) {
  const { type, attrs } = widget;

  if (type === 'text-input' || type === 'number-input' || type === 'textarea-input') {
    return (
      <Section title="기본값">
        <input
          type="text"
          value={(attrs.value as string | undefined) ?? ''}
          onChange={(e) => setAttr('value', e.target.value)}
          className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)]"
          data-testid="w-inspector-value"
        />
      </Section>
    );
  }

  if (type === 'button' || type === 'roll-button') {
    return (
      <>
        <Section title="라벨">
          <input
            type="text"
            value={(attrs.label as string | undefined) ?? ''}
            onChange={(e) => setAttr('label', e.target.value)}
            className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)]"
            data-testid="w-inspector-label"
          />
        </Section>
        {type === 'roll-button' && (
          <Section title="굴림 수식">
            <input
              type="text"
              value={(attrs.formula as string | undefined) ?? ''}
              onChange={(e) => setAttr('formula', e.target.value)}
              placeholder="예: 1d20+@{strength}"
              className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-[var(--color-primary,#2563eb)]"
              data-testid="w-inspector-formula"
              spellCheck={false}
            />
          </Section>
        )}
      </>
    );
  }

  if (type === 'heading' || type === 'rolltemplate-header') {
    return (
      <Section title="텍스트">
        <input
          type="text"
          value={(attrs.text as string | undefined) ?? ''}
          onChange={(e) => setAttr('text', e.target.value)}
          className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)]"
          data-testid="w-inspector-text"
        />
      </Section>
    );
  }

  if (type === 'image') {
    return (
      <Section title="이미지 URL">
        <input
          type="text"
          value={(attrs.src as string | undefined) ?? ''}
          onChange={(e) => setAttr('src', e.target.value)}
          placeholder="https://..."
          className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)]"
          data-testid="w-inspector-src"
          spellCheck={false}
        />
      </Section>
    );
  }

  if (type === 'select-input') {
    const options = ((attrs.options as string[] | undefined) ?? []).join('\n');
    return (
      <Section title="선택 옵션 (줄당 1개)">
        <textarea
          value={options}
          onChange={(e) =>
            setAttr(
              'options',
              e.target.value.split('\n').map((s) => s.trim()).filter((s) => s),
            )
          }
          rows={4}
          className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)]"
          data-testid="w-inspector-options"
        />
      </Section>
    );
  }

  if (type === 'group-box') {
    return (
      <Section title="라벨 (legend)">
        <input
          type="text"
          value={(attrs.legend as string | undefined) ?? ''}
          onChange={(e) => setAttr('legend', e.target.value)}
          className="w-full rounded border border-border bg-[var(--bg-elevated-2)] px-2 py-1 text-xs outline-none transition-colors focus:ring-1 focus:ring-[var(--color-primary,#2563eb)] focus:border-[var(--color-primary,#2563eb)]"
          data-testid="w-inspector-legend"
        />
      </Section>
    );
  }

  return null;
}

export { isValidAttrName, NAME_RE };

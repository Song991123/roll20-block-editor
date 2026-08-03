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
import { widgetTypeDisplayLabel } from './fieldLabels';

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
    const handle = window.setTimeout(() => {
      setNameDraft((widget?.attrs.name as string | undefined) ?? '');
      setNameError('');
    }, 0);
    return () => window.clearTimeout(handle);
  }, [selectedId, widget?.attrs.name]);

  if (!widget) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated-2)] text-muted-foreground">
          <MousePointerSquareDashed className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">아직 고른 요소가 없어요</p>
        <p className="mt-1.5 max-w-[260px] text-sm leading-relaxed text-[var(--text-secondary)]">
          시트에서 요소를 클릭하거나, 왼쪽 목록에서 새 조각을 끌어와 보세요.
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
      setNameError('영문, 숫자, _만 사용할 수 있어요. 예: strength, hp_max');
      return; // store 갱신 안 함 (invalid)
    }
    setNameError('');
    setAttr('name', v);
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3.5 p-3" data-testid="widget-inspector">
        <header className="r20-form-card flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted-foreground">
              고른 요소
            </div>
            <div className="mt-0.5 truncate text-base font-semibold text-foreground">
              {widgetTypeDisplayLabel(widget.type, def?.label ?? widget.type)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              removeWidget(target, widget.id);
              setSelectedWidgetId(null);
            }}
            className="shrink-0 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--destructive)_40%,transparent)] bg-[var(--destructive-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--destructive)] transition-colors hover:bg-[color-mix(in_srgb,var(--destructive)_16%,white)] active:scale-[0.97]"
            data-testid="widget-inspector-delete"
            title="이 요소를 시트에서 지워요 (Delete 키)"
          >
            삭제
          </button>
        </header>

        {/* 위치 / 크기 */}
        <Section title="위치 / 크기">
          <Grid>
            <NumberField label="왼쪽 위치" value={widget.x} onChange={(v) => setPos({ x: v })} testid="w-inspector-x" />
            <NumberField label="위쪽 위치" value={widget.y} onChange={(v) => setPos({ y: v })} testid="w-inspector-y" />
            <NumberField label="너비" value={widget.width} onChange={(v) => setPos({ width: Math.max(8, v) })} testid="w-inspector-width" />
            <NumberField label="높이" value={widget.height} onChange={(v) => setPos({ height: Math.max(8, v) })} testid="w-inspector-height" />
          </Grid>
        </Section>

        {/* 이름 (Roll20 attr) */}
        <Section title="값을 저장할 이름">
          <input
            type="text"
            value={nameDraft}
            onChange={onNameChange}
            placeholder="예: strength, hp_max, character_name"
            className="r20-input"
            data-testid="w-inspector-name"
            data-valid={nameError ? 'false' : 'true'}
            aria-invalid={!!nameError}
            spellCheck={false}
            autoComplete="off"
          />
          {nameError ? (
            <p className="mt-1.5 flex items-start gap-1 text-xs font-semibold text-[var(--destructive)]" data-testid="w-inspector-name-error">
              {nameError}
            </p>
          ) : (
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              이 이름으로 Roll20에 값을 저장해요. 다른 칸과 겹치지 않게 지어 주세요.
            </p>
          )}
        </Section>

        {/* 클래스 */}
        <Section title="스타일 이름 (능숙한 사람용)">
          <input
            type="text"
            value={(widget.attrs.class as string | undefined) ?? ''}
            onChange={(e) => setAttr('class', e.target.value)}
            placeholder="예: stat-box highlighted"
            className="r20-input"
            data-testid="w-inspector-class"
            spellCheck={false}
            autoComplete="off"
          />
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            꾸미기 블록과 이어 쓸 때만 필요해요. 비워 둬도 괜찮아요.
          </p>
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
      <h3 className="mb-1.5 text-sm font-semibold text-[var(--text-secondary)]">
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
    <label className="flex items-center gap-1.5 text-sm">
      <span className="w-11 shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="r20-input flex-1 min-w-0 tabular-nums"
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
      <Section title="처음 값">
        <input
          type="text"
          value={(attrs.value as string | undefined) ?? ''}
          onChange={(e) => setAttr('value', e.target.value)}
          className="r20-input"
          data-testid="w-inspector-value"
        />
      </Section>
    );
  }

  if (type === 'button' || type === 'roll-button') {
    return (
      <>
        <Section title="버튼에 쓸 글자">
          <input
            type="text"
            value={(attrs.label as string | undefined) ?? ''}
            onChange={(e) => setAttr('label', e.target.value)}
            className="r20-input"
            data-testid="w-inspector-label"
          />
        </Section>
        {type === 'roll-button' && (
          <Section title="굴림식 (주사위 규칙)">
            <input
              type="text"
              value={(attrs.formula as string | undefined) ?? ''}
              onChange={(e) => setAttr('formula', e.target.value)}
              placeholder="예: 1d20+@{strength}"
              className="r20-input font-mono"
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
      <Section title="글자 내용">
        <input
          type="text"
          value={(attrs.text as string | undefined) ?? ''}
          onChange={(e) => setAttr('text', e.target.value)}
          className="r20-input"
          data-testid="w-inspector-text"
        />
      </Section>
    );
  }

  if (type === 'image') {
    return (
      <Section title="이미지 주소">
        <input
          type="text"
          value={(attrs.src as string | undefined) ?? ''}
          onChange={(e) => setAttr('src', e.target.value)}
          placeholder="https://..."
          className="r20-input"
          data-testid="w-inspector-src"
          spellCheck={false}
        />
      </Section>
    );
  }

  if (type === 'select-input') {
    const options = ((attrs.options as string[] | undefined) ?? []).join('\n');
    return (
      <Section title="선택지 (한 줄에 하나)">
        <textarea
          value={options}
          onChange={(e) =>
            setAttr(
              'options',
              e.target.value.split('\n').map((s) => s.trim()).filter((s) => s),
            )
          }
          rows={4}
          className="r20-input"
          data-testid="w-inspector-options"
        />
      </Section>
    );
  }

  if (type === 'group-box') {
    return (
      <Section title="그룹 제목">
        <input
          type="text"
          value={(attrs.legend as string | undefined) ?? ''}
          onChange={(e) => setAttr('legend', e.target.value)}
          className="r20-input"
          data-testid="w-inspector-legend"
        />
      </Section>
    );
  }

  return null;
}

export { isValidAttrName, NAME_RE };

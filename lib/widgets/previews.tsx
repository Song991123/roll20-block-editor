'use client';

/**
 * 위젯 미니/캔버스 렌더 — 실 위젯 모양 (spec 17 §5.3).
 *
 * mini=true: 갤러리 카드 안 disabled preview. pointer-events 차단.
 * mini=false: 캔버스 안 실제 렌더. form 요소는 사용자 입력 받음 (disabled X).
 *   단 캔버스 모드도 form interaction 은 hover/select 우선 — onPointerDown stopPropagation 으로 캔버스 드래그 시작 방지.
 */
import { type CSSProperties } from 'react';
import type {
  WidgetInstance,
  WidgetType,
} from '@/lib/stores/workspaceStore';

interface RenderProps {
  type: WidgetType;
  attrs?: WidgetInstance['attrs'];
  mini?: boolean;
}

export function WidgetRender({ type, attrs = {}, mini = false }: RenderProps) {
  const disabled = mini;
  const className = mini ? 'pointer-events-none' : '';

  const name = (attrs.name as string | undefined) ?? '';
  const cssClass = (attrs.class as string | undefined) ?? '';
  const label = (attrs.label as string | undefined) ?? '';
  const text = (attrs.text as string | undefined) ?? '';
  const value = (attrs.value as string | undefined) ?? '';
  const src = (attrs.src as string | undefined) ?? '';
  const legend = (attrs.legend as string | undefined) ?? '';
  const options = (attrs.options as string[] | undefined) ?? [];
  const formula = (attrs.formula as string | undefined) ?? '';

  // 모든 form 요소에 attr_ 접두사 (Roll20 규칙).
  const r20Name = name ? `attr_${name}` : undefined;
  const titleAttr = name ? `attr_${name}` : undefined;

  // 공통 폼 스타일.
  const inputStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: '4px 8px',
    border: '1px solid var(--border, #d4d4d8)',
    borderRadius: '4px',
    background: 'var(--bg-app, #fff)',
    color: 'var(--foreground, #18181b)',
    font: 'inherit',
  };

  switch (type) {
    case 'text-input':
      return (
        <input
          type="text"
          name={r20Name}
          className={`${cssClass} ${className}`.trim()}
          defaultValue={value}
          placeholder={mini ? '텍스트' : ''}
          style={inputStyle}
          title={titleAttr}
          data-widget-name={name || undefined}
          disabled={disabled}
          readOnly={mini}
        />
      );

    case 'number-input':
      return (
        <input
          type="number"
          name={r20Name}
          className={`${cssClass} ${className}`.trim()}
          defaultValue={value || '0'}
          style={inputStyle}
          title={titleAttr}
          data-widget-name={name || undefined}
          disabled={disabled}
          readOnly={mini}
        />
      );

    case 'textarea-input':
      return (
        <textarea
          name={r20Name}
          className={`${cssClass} ${className}`.trim()}
          defaultValue={value}
          placeholder={mini ? '여러 줄...' : ''}
          style={{ ...inputStyle, resize: 'none' }}
          title={titleAttr}
          data-widget-name={name || undefined}
          disabled={disabled}
          readOnly={mini}
        />
      );

    case 'checkbox-input':
      return (
        <div
          className={className}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <input
            type="checkbox"
            name={r20Name}
            className={cssClass}
            title={titleAttr}
            data-widget-name={name || undefined}
            disabled={disabled}
            style={{ width: 20, height: 20 }}
          />
        </div>
      );

    case 'select-input':
      return (
        <select
          name={r20Name}
          className={`${cssClass} ${className}`.trim()}
          style={inputStyle}
          title={titleAttr}
          data-widget-name={name || undefined}
          disabled={disabled}
        >
          {options.length === 0 ? (
            <option>옵션 없음</option>
          ) : (
            options.map((opt, i) => <option key={i}>{opt}</option>)
          )}
        </select>
      );

    case 'button':
      return (
        <button
          type="button"
          className={`${cssClass} ${className}`.trim()}
          style={{
            ...inputStyle,
            cursor: mini ? 'inherit' : 'pointer',
            background: 'var(--bg-elevated, #f4f4f5)',
          }}
          disabled={disabled}
        >
          {label || '버튼'}
        </button>
      );

    case 'roll-button':
      return (
        <button
          type="button"
          className={`roll ${cssClass} ${className}`.trim()}
          data-widget-name={name || undefined}
          title={titleAttr ?? (formula ? `굴림: ${formula}` : undefined)}
          style={{
            ...inputStyle,
            cursor: mini ? 'inherit' : 'pointer',
            background: 'var(--primary)',
            color: '#fff',
            fontWeight: 600,
          }}
          disabled={disabled}
        >
          🎲 {label || '굴림'}
        </button>
      );

    case 'heading':
      return (
        <div
          className={`${cssClass} ${className}`.trim()}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 700,
            fontSize: 18,
            color: 'var(--foreground, #18181b)',
          }}
          title={titleAttr}
          data-widget-name={name || undefined}
        >
          {text || '제목'}
        </div>
      );

    case 'image':
      return (
        <div
          className={`${cssClass} ${className}`.trim()}
          style={{
            width: '100%',
            height: '100%',
            border: '1px dashed var(--border, #d4d4d8)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-elevated-2, #fafafa)',
            color: 'var(--muted-foreground, #71717a)',
            fontSize: 11,
            overflow: 'hidden',
          }}
          title={titleAttr}
          data-widget-name={name || undefined}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={name || 'image'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            '🖼 이미지'
          )}
        </div>
      );

    case 'group-box':
      return (
        <fieldset
          className={`${cssClass} ${className}`.trim()}
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid var(--border, #d4d4d8)',
            borderRadius: 4,
            padding: 8,
            margin: 0,
            background: 'transparent',
          }}
          title={titleAttr}
          data-widget-name={name || undefined}
        >
          {legend && <legend style={{ padding: '0 4px' }}>{legend}</legend>}
        </fieldset>
      );

    case 'rolltemplate-field':
      return (
        <span
          className={`${cssClass} ${className}`.trim()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 6px',
            background: 'var(--bg-elevated-2, #f4f4f5)',
            border: '1px solid var(--border, #d4d4d8)',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 12,
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
          }}
          title={titleAttr}
          data-widget-name={name || undefined}
        >
          {`{{${name || '필드'}}}`}
        </span>
      );

    case 'rolltemplate-header':
      return (
        <div
          className={`${cssClass} ${className}`.trim()}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: 4,
          }}
        >
          {text || 'Roll Result'}
        </div>
      );

    default:
      return <div className={className}>?</div>;
  }
}

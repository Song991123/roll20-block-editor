import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';

export const FRIENDLY_WIDGET_MIME = 'application/x-r20-friendly-widget';

export type FriendlyWidgetGroup = 'layout' | 'text' | 'input' | 'action' | 'media';

export type FriendlyWidgetPreset = {
  id: string;
  group: FriendlyWidgetGroup;
  label: string;
  description: string;
  blockType: string;
  fields: Record<string, string>;
  preview: 'box' | 'heading' | 'label' | 'text' | 'number' | 'textarea' | 'checkbox' | 'image' | 'button';
};

export const FRIENDLY_WIDGET_GROUPS: Record<FriendlyWidgetGroup, string> = {
  layout: '레이아웃',
  text: '글자',
  input: '입력',
  action: '버튼',
  media: '이미지',
};

export const FRIENDLY_WIDGET_PRESETS: FriendlyWidgetPreset[] = [
  {
    id: 'section',
    group: 'layout',
    label: '구역 박스',
    description: '여러 요소를 묶는 기본 영역',
    blockType: 'r20_div',
    preview: 'box',
    fields: {
      CLASS: 'section',
      STYLE: 'width: 320px; min-height: 180px; padding: 12px; border: 1px solid #d4d4d8',
    },
  },
  {
    id: 'row',
    group: 'layout',
    label: '가로줄',
    description: '입력칸을 가로로 정렬하는 줄',
    blockType: 'r20_row',
    preview: 'box',
    fields: {
      STYLE: 'width: 360px; min-height: 42px; display: flex; gap: 8px; align-items: center',
    },
  },
  {
    id: 'heading',
    group: 'text',
    label: '제목',
    description: '시트 구역 제목',
    blockType: 'r20_heading',
    preview: 'heading',
    fields: {
      LEVEL: '2',
      TEXT: '제목',
      CLASS: 'section-title',
      STYLE: 'font-size: 22px; font-weight: 700',
    },
  },
  {
    id: 'label',
    group: 'text',
    label: '라벨',
    description: '입력칸 옆에 붙는 짧은 글자',
    blockType: 'r20_static_text',
    preview: 'label',
    fields: {
      TEXT: '라벨',
      CLASS: 'field-label',
      STYLE: 'font-weight: 600',
    },
  },
  {
    id: 'text-input',
    group: 'input',
    label: '글자 입력',
    description: '이름, 직업 같은 짧은 값',
    blockType: 'r20_text_input',
    preview: 'text',
    fields: {
      NAME: 'name',
      CLASS: 'text-input',
      DEFAULT: '',
      STYLE: 'width: 180px',
    },
  },
  {
    id: 'number-input',
    group: 'input',
    label: '숫자 입력',
    description: 'HP, 능력치, 수치 값',
    blockType: 'r20_number_input',
    preview: 'number',
    fields: {
      NAME: 'value',
      CLASS: 'number-input',
      DEFAULT: '0',
      STYLE: 'width: 72px; text-align: center',
    },
  },
  {
    id: 'textarea',
    group: 'input',
    label: '긴 글 입력',
    description: '메모, 설명, 배경 설정',
    blockType: 'r20_textarea',
    preview: 'textarea',
    fields: {
      NAME: 'notes',
      CLASS: 'textarea',
      ROWS: '4',
      DEFAULT: '',
      STYLE: 'width: 260px; min-height: 96px',
    },
  },
  {
    id: 'checkbox',
    group: 'input',
    label: '체크박스',
    description: 'ON/OFF 상태',
    blockType: 'r20_checkbox',
    preview: 'checkbox',
    fields: {
      NAME: 'flag',
      VALUE: '1',
      CLASS: 'checkbox',
      STYLE: '',
    },
  },
  {
    id: 'chat-button',
    group: 'action',
    label: '채팅 버튼',
    description: '누르면 채팅에 문장이나 매크로 전송',
    blockType: 'r20_chat_button',
    preview: 'button',
    fields: {
      NAME: 'say',
      LABEL: '말하기',
      MESSAGE: 'Hello',
      CLASS: 'chat-button',
      STYLE: 'min-width: 86px',
    },
  },
  {
    id: 'action-button',
    group: 'action',
    label: '액션 버튼',
    description: '시트 worker clicked 이벤트용 버튼',
    blockType: 'r20_action_button',
    preview: 'button',
    fields: {
      NAME: 'action',
      LABEL: 'Action',
      CLASS: 'action-button',
      STYLE: 'min-width: 86px',
    },
  },
  {
    id: 'image',
    group: 'media',
    label: '이미지',
    description: '로고, 배경 조각, 장식 이미지',
    blockType: 'r20_image',
    preview: 'image',
    fields: {
      SRC: '',
      ALT: '',
      CLASS: 'image',
      WIDTH: '160',
      HEIGHT: '',
      STYLE: 'width: 160px; min-height: 90px; object-fit: cover',
    },
  },
];

export function findFriendlyWidgetPreset(id: string): FriendlyWidgetPreset | null {
  return FRIENDLY_WIDGET_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function appendFriendlyWidgetPreset(
  preset: FriendlyWidgetPreset,
  position?: { left: number; top: number },
): string | null {
  const id = useWorkspaceStore.getState().appendBlockToActive(preset.blockType, 'html');
  if (!id) return null;

  const adapter = getBlocklyAdapter();
  for (const [field, value] of Object.entries(preset.fields)) {
    if (field === 'STYLE') continue;
    adapter.setBlockField('html', id, field, value);
  }

  const baseStyle = preset.fields.STYLE ?? '';
  const style = position ? withAbsolutePosition(baseStyle, position.left, position.top) : baseStyle;
  if (style || adapter.hasBlockField('html', id, 'STYLE')) {
    adapter.setBlockField('html', id, 'STYLE', style);
  }
  return id;
}

export function encodeFriendlyWidgetDrag(id: string): string {
  return JSON.stringify({ id });
}

export function decodeFriendlyWidgetDrag(value: string): FriendlyWidgetPreset | null {
  try {
    const parsed = JSON.parse(value) as { id?: unknown };
    return typeof parsed.id === 'string' ? findFriendlyWidgetPreset(parsed.id) : null;
  } catch {
    return null;
  }
}

function withAbsolutePosition(style: string, left: number, top: number): string {
  const map = new Map<string, string>();
  for (const chunk of style.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx <= 0) continue;
    const key = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (key && value) map.set(key, value);
  }
  map.set('position', 'absolute');
  map.set('left', `${Math.max(0, Math.round(left))}px`);
  map.set('top', `${Math.max(0, Math.round(top))}px`);
  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

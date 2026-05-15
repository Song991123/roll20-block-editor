/**
 * WYSIWYG 위젯 레지스트리 — 12 위젯 (spec 17 §5.2).
 */
import type { WidgetDef } from './types';

export const WIDGETS: WidgetDef[] = [
  // 기본 (basic)
  {
    type: 'heading',
    label: '제목',
    category: 'basic',
    targets: ['sheet', 'rolltemplate'],
    cardWidth: 160,
    cardHeight: 56,
  },
  {
    type: 'image',
    label: '이미지',
    category: 'basic',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 90,
  },

  // 입력 (input)
  {
    type: 'text-input',
    label: '텍스트 입력칸',
    category: 'input',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 56,
  },
  {
    type: 'number-input',
    label: '숫자 입력칸',
    category: 'input',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 56,
  },
  {
    type: 'textarea-input',
    label: '여러 줄 입력칸',
    category: 'input',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 80,
  },
  {
    type: 'checkbox-input',
    label: '체크박스',
    category: 'input',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 56,
  },
  {
    type: 'select-input',
    label: '선택 메뉴',
    category: 'input',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 56,
  },

  // 굴림 (dice)
  {
    type: 'button',
    label: '버튼',
    category: 'dice',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 56,
  },
  {
    type: 'roll-button',
    label: '굴림 버튼',
    category: 'dice',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 56,
  },

  // 컨테이너 (container)
  {
    type: 'group-box',
    label: '그룹 박스',
    category: 'container',
    targets: ['sheet'],
    cardWidth: 160,
    cardHeight: 80,
  },

  // 굴림 결과 틀 (rolltemplate)
  {
    type: 'rolltemplate-field',
    label: '{{필드}}',
    category: 'rolltemplate',
    targets: ['rolltemplate'],
    cardWidth: 160,
    cardHeight: 56,
  },
  {
    type: 'rolltemplate-header',
    label: '결과 헤더',
    category: 'rolltemplate',
    targets: ['rolltemplate'],
    cardWidth: 160,
    cardHeight: 56,
  },
];

export function getWidget(type: WidgetDef['type']): WidgetDef | undefined {
  return WIDGETS.find((w) => w.type === type);
}

export function widgetsForTarget(target: 'sheet' | 'rolltemplate'): WidgetDef[] {
  return WIDGETS.filter((w) => w.targets.includes(target));
}

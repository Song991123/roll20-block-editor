import type { LayerRole } from './layerRoles';
import type { ManagedDesignDeclarations } from './designPosition';

export type VisualStylePresetFamily = 'section' | 'button' | 'text' | 'control' | 'result';
export type VisualStylePresetScope = 'sheet' | 'rolltemplate';

export type VisualStylePreset = {
  id: string;
  label: string;
  description: string;
  declarations: ManagedDesignDeclarations;
};

export type VisualStylePresetGroup = {
  family: VisualStylePresetFamily;
  title: string;
  presets: VisualStylePreset[];
};

const SECTION_PRESETS: VisualStylePreset[] = [
  preset('paper', '종이', '밝은 종이 위에 어울리는 얇은 선과 그림자', {
    'background-color': '#fffdfd',
    'background-image': 'none',
    color: '#3f3439',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#ead8df',
    'border-radius': '6px',
    padding: '16px',
    'box-shadow': '0 2px 8px rgba(73, 45, 57, 0.08)',
  }),
  preset('rose', '장미', '제목과 중요 내용을 감싸는 분홍색 선', {
    'background-color': '#fff2f6',
    'background-image': 'none',
    color: '#5d2f40',
    'border-width': '2px',
    'border-style': 'solid',
    'border-color': '#d96b91',
    'border-radius': '6px',
    padding: '16px',
    'box-shadow': 'none',
  }),
  preset('mint', '민트', '반복 항목에 쓰기 좋은 차분한 색과 안쪽 표시선', {
    'background-color': '#f2fbf7',
    'background-image': 'none',
    color: '#245648',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#86c9b3',
    'border-radius': '4px',
    padding: '16px',
    'box-shadow': 'inset 4px 0 0 #4ea88b',
  }),
  preset('ink', '잉크', '작은 정보 구역에 어울리는 선명한 틀', {
    'background-color': '#f7f5f6',
    'background-image': 'none',
    color: '#352f33',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#595057',
    'border-radius': '2px',
    padding: '16px',
    'box-shadow': 'none',
  }),
];

const BUTTON_PRESETS: VisualStylePreset[] = [
  preset('rose', '장미', '주요 주사위 버튼에 어울리는 도톰한 분홍 버튼', {
    'background-color': '#d96b91',
    'background-image': 'none',
    color: '#ffffff',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#b94f75',
    'border-radius': '6px',
    padding: '7px 14px',
    'font-size': '14px',
    'font-weight': '700',
    'line-height': '1.25',
    'box-shadow': '0 2px 0 #963653',
    'text-shadow': 'none',
  }),
  preset('mint', '민트', '보조 굴림에 쓰기 좋은 밝은 민트 버튼', {
    'background-color': '#f2fbf7',
    'background-image': 'none',
    color: '#245648',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#69b99f',
    'border-radius': '6px',
    padding: '7px 14px',
    'font-size': '14px',
    'font-weight': '700',
    'line-height': '1.25',
    'box-shadow': 'none',
    'text-shadow': 'none',
  }),
  preset('ink', '잉크', '흡백 시트에서 눈에 띄는 진한 버튼', {
    'background-color': '#403940',
    'background-image': 'none',
    color: '#ffffff',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#403940',
    'border-radius': '4px',
    padding: '7px 14px',
    'font-size': '14px',
    'font-weight': '700',
    'line-height': '1.25',
    'box-shadow': 'none',
    'text-shadow': 'none',
  }),
  preset('paper', '종이', '본문 사이에 자연스럽게 놓이는 밝은 버튼', {
    'background-color': '#fffdfd',
    'background-image': 'none',
    color: '#5d4450',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#d9bdc8',
    'border-radius': '6px',
    padding: '7px 14px',
    'font-size': '14px',
    'font-weight': '700',
    'line-height': '1.25',
    'box-shadow': '0 1px 3px rgba(73, 45, 57, 0.1)',
    'text-shadow': 'none',
  }),
];

const TEXT_PRESETS: VisualStylePreset[] = [
  preset('underline', '밑줄 제목', '섹션을 구분하는 분홍색 밑줄 제목', {
    'background-color': 'transparent',
    'background-image': 'none',
    color: '#8f3154',
    'border-width': '0 0 2px 0',
    'border-style': 'solid',
    'border-color': '#d96b91',
    'border-radius': '0',
    padding: '6px 2px',
    'font-size': '18px',
    'font-weight': '700',
    'text-align': 'left',
    'box-shadow': 'none',
  }),
  preset('tag', '작은 표시', '단어나 짧은 상태를 감싸는 민트 표시', {
    'background-color': '#e8f7f1',
    'background-image': 'none',
    color: '#285c4c',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#8acbb6',
    'border-radius': '999px',
    padding: '4px 10px',
    'font-size': '13px',
    'font-weight': '700',
    'text-align': 'center',
    'box-shadow': 'none',
  }),
  preset('banner', '진한 제목', '큰 구역 시작점에 쓰는 진한 잉크 제목', {
    'background-color': '#403940',
    'background-image': 'none',
    color: '#ffffff',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#403940',
    'border-radius': '4px',
    padding: '8px 12px',
    'font-size': '16px',
    'font-weight': '700',
    'text-align': 'left',
    'box-shadow': 'none',
  }),
];

const CONTROL_PRESETS: VisualStylePreset[] = [
  preset('clean', '깔끔한 칸', '흰 바탕과 얇은 테두리의 기본 입력 칸', {
    'background-color': '#ffffff',
    'background-image': 'none',
    color: '#3f3439',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#d8c8cf',
    'border-radius': '4px',
    padding: '7px 10px',
    'font-size': '14px',
    'font-weight': '400',
    'line-height': '1.25',
    'box-shadow': 'none',
  }),
  preset('underline', '밑줄 칸', '기록지처럼 밑줄만 남긴 입력 칸', {
    'background-color': 'transparent',
    'background-image': 'none',
    color: '#493941',
    'border-width': '0 0 2px 0',
    'border-style': 'solid',
    'border-color': '#a74d6e',
    'border-radius': '0',
    padding: '6px 2px',
    'font-size': '14px',
    'font-weight': '600',
    'line-height': '1.25',
    'box-shadow': 'none',
  }),
  preset('soft', '부드러운 칸', '연한 분홍 바탕으로 값을 구분하는 입력 칸', {
    'background-color': '#fff2f6',
    'background-image': 'none',
    color: '#5d2f40',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#e7afc3',
    'border-radius': '6px',
    padding: '7px 10px',
    'font-size': '14px',
    'font-weight': '500',
    'line-height': '1.25',
    'box-shadow': 'inset 0 1px 2px rgba(73, 45, 57, 0.06)',
  }),
  preset('ink', '또렷한 칸', '작은 수치와 짧은 값을 또렷하게 보여주는 입력 칸', {
    'background-color': '#f7f5f6',
    'background-image': 'none',
    color: '#302a2e',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#595057',
    'border-radius': '3px',
    padding: '6px 8px',
    'font-size': '14px',
    'font-weight': '700',
    'line-height': '1.25',
    'box-shadow': 'none',
  }),
];

const RESULT_PRESETS: VisualStylePreset[] = [
  preset('paper', '종이 행', '흰 카드에 얇은 구분선을 둔 결과 행', {
    'background-color': '#fffdfd',
    'background-image': 'none',
    color: '#3f3439',
    'border-width': '0 0 1px 0',
    'border-style': 'solid',
    'border-color': '#ead8df',
    'border-radius': '0',
    padding: '8px 10px',
    'box-shadow': 'none',
  }),
  preset('rose', '장미 행', '핵심 결과를 강조하는 연한 분홍 행', {
    'background-color': '#fff2f6',
    'background-image': 'none',
    color: '#5d2f40',
    'border-width': '0 0 1px 0',
    'border-style': 'solid',
    'border-color': '#e2a0b8',
    'border-radius': '0',
    padding: '8px 10px',
    'box-shadow': 'inset 3px 0 0 #d96b91',
  }),
  preset('mint', '민트 행', '보조 판정과 안내에 어울리는 민트 행', {
    'background-color': '#f2fbf7',
    'background-image': 'none',
    color: '#245648',
    'border-width': '0 0 1px 0',
    'border-style': 'solid',
    'border-color': '#9bd3c0',
    'border-radius': '0',
    padding: '8px 10px',
    'box-shadow': 'inset 3px 0 0 #4ea88b',
  }),
  preset('ink', '잉크 행', '결과 카드의 제목처럼 쓰는 진한 행', {
    'background-color': '#403940',
    'background-image': 'none',
    color: '#ffffff',
    'border-width': '1px',
    'border-style': 'solid',
    'border-color': '#403940',
    'border-radius': '3px',
    padding: '8px 10px',
    'box-shadow': 'none',
  }),
];

export function getVisualStylePresetGroup(
  role: LayerRole,
  blockType: string,
  scope: VisualStylePresetScope = 'sheet',
): VisualStylePresetGroup | null {
  if (scope === 'rolltemplate' && (role.kind === 'frame' || role.kind === 'flow')) {
    return { family: 'result', title: '결과 행 모양', presets: RESULT_PRESETS };
  }
  if (role.kind === 'frame' || role.kind === 'flow') {
    return { family: 'section', title: '섹션 모양', presets: SECTION_PRESETS };
  }
  if (role.kind === 'action') {
    return {
      family: 'button',
      title: isRollButtonType(blockType) ? '주사위 버튼 모양' : '버튼 모양',
      presets: BUTTON_PRESETS,
    };
  }
  if (role.kind === 'text') {
    return { family: 'text', title: '글자 꾸밈', presets: TEXT_PRESETS };
  }
  if (role.kind === 'control') {
    if (isToggleControlType(blockType)) return null;
    return {
      family: 'control',
      title: isNumberControlType(blockType) ? '숫자 칸 모양' : '입력 칸 모양',
      presets: CONTROL_PRESETS,
    };
  }
  return null;
}

export function presetMatches(
  values: Record<string, string>,
  presetValue: VisualStylePreset,
): boolean {
  return Object.entries(presetValue.declarations).every(([property, value]) => (
    value != null && values[property] === value
  ));
}

function preset(
  id: string,
  label: string,
  description: string,
  declarations: ManagedDesignDeclarations,
): VisualStylePreset {
  return { id, label, description, declarations };
}

function isRollButtonType(blockType: string): boolean {
  return /(?:^|_)roll(?:_|$)/.test(blockType.toLowerCase());
}

function isNumberControlType(blockType: string): boolean {
  return /(?:^|_)number(?:_|$)/.test(blockType.toLowerCase());
}

function isToggleControlType(blockType: string): boolean {
  return /(?:^|_)(?:checkbox|radio|toggle)(?:_|$)/.test(blockType.toLowerCase());
}

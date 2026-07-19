/**
 * fieldLabels — 속성 패널 표시용 자연어 라벨 (design-reset, UI 전용).
 *
 * Blockly 필드의 내부 이름(NAME, VALUE …)을 사용자에게 보여줄 때만 한국어로
 * 바꾼다. 저장/내보내기 값에는 전혀 영향 없음 (표시 전용 매핑).
 * 목록에 없는 이름은 원문 그대로 보여준다 (안전한 fallback).
 */
export const FIELD_LABELS: Record<string, string> = {
  NAME: '이름',
  VALUE: '값',
  TEXT: '내용',
  LABEL: '이름표',
  TITLE: '제목',
  WIDTH: '너비',
  HEIGHT: '높이',
  SRC: '이미지 주소',
  HREF: '링크 주소',
  CLASS: '스타일 이름 (class)',
  PLACEHOLDER: '안내문',
  CHECKED: '체크됨',
  COLS: '칸 수',
  ROWS: '줄 수',
  SIZE: '크기',
  TYPE: '종류',
  FORMULA: '굴림식',
  KEY: '키',
  LANG: '언어',
  MIN: '최솟값',
  MAX: '최댓값',
  STEP: '증가 단위',
  LEFT_PX: '왼쪽 (px)',
  TOP_PX: '위 (px)',
  WIDTH_PX: '너비 (px)',
  HEIGHT_PX: '높이 (px)',
};

export function fieldDisplayLabel(name: string): string {
  return FIELD_LABELS[name] ?? name;
}

/**
 * 블록 카테고리 표시 이름 — 스키마의 내부 라벨 대신 사용자 언어로.
 * (키 = 카테고리 id. 스키마/블록 정의는 변경하지 않음.)
 */
export const CATEGORY_DISPLAY: Record<string, string> = {
  container: '묶는 틀',
  input: '입력 칸',
  display: '보여주기',
  dice: '주사위 굴림',
  i18n: '번역',
  expression: '값 계산',
  sheet_worker: '자동 동작',
  css: '꾸미기',
  advanced: '고급',
  composite: '자주 쓰는 묶음',
};

export function categoryDisplayLabel(id: string, fallback: string): string {
  return CATEGORY_DISPLAY[id] ?? fallback;
}

/**
 * 자주 쓰는 조각(위젯 프리셋) 표시 이름/설명 — 비전공자 언어.
 * (키 = preset id. lib/widgets/presets.ts 데이터는 변경하지 않음.)
 */
export const WIDGET_DISPLAY: Record<string, { name: string; desc: string }> = {
  section: { name: '묶음 상자', desc: '여러 조각을 한 덩어리로 묶어요' },
  row: { name: '가로 줄', desc: '조각들을 옆으로 나란히 놓아요' },
  heading: { name: '큰 제목', desc: '구역 맨 위에 쓰는 큰 글자예요' },
  label: { name: '설명 글자', desc: '칸 옆에 붙는 짧은 안내 글자예요' },
  'text-input': { name: '글자 칸', desc: '이름, 직업처럼 짧은 글을 적는 칸이에요' },
  'number-input': { name: '숫자 칸', desc: 'HP, 능력치 같은 숫자를 적는 칸이에요' },
  textarea: { name: '긴 글 칸', desc: '메모나 배경 이야기처럼 긴 글을 적는 칸이에요' },
  checkbox: { name: '체크 칸', desc: '켜고 끄는 체크 표시예요' },
  'chat-button': { name: '대화 버튼', desc: '누르면 대화창에 정해둔 말을 보내요' },
  'action-button': { name: '동작 버튼', desc: '누르면 정해둔 자동 동작이 실행돼요' },
  image: { name: '그림', desc: '로고나 장식 그림을 넣어요' },
};

/** 조각 그룹 표시 이름 (layout/text/input/action/media) */
export const WIDGET_GROUP_DISPLAY: Record<string, string> = {
  layout: '배치',
  text: '글자',
  input: '입력 칸',
  action: '버튼',
  media: '그림',
};

/** 시트 위 요소(위젯 타입) 표시 이름 — 속성 패널 헤더용. */
export const WIDGET_TYPE_DISPLAY: Record<string, string> = {
  'group-box': '묶음 상자',
  'text-input': '글자 칸',
  'number-input': '숫자 칸',
  'textarea-input': '긴 글 칸',
  'select-input': '선택 메뉴',
  'checkbox-input': '체크 칸',
  button: '누름 버튼',
  'roll-button': '주사위 버튼',
  'chat-button': '대화 버튼',
  heading: '큰 제목',
  label: '설명 글자',
  image: '그림',
  'rolltemplate-header': '굴림 결과 제목',
};

export function widgetTypeDisplayLabel(type: string, fallback: string): string {
  return WIDGET_TYPE_DISPLAY[type] ?? fallback;
}

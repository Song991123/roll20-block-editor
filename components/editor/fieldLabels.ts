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

/**
 * Export 모듈 타입.
 *
 * Anchor:
 *   - docs/spec/16_redesign_decision_log.md D16 ① (.zip + README.txt)
 *   - docs/spec/16_redesign_decision_log.md D18 ① (ERROR severity → 다운로드 차단)
 *   - docs/spec/12_roll20_output_spec.md §5 (sheet.json manifest 규격)
 *
 * Phase 6 에서는 emit 결과 (lib/preview/emit.ts) 와 사용자 입력 메타를 합쳐
 * Roll20 Custom Sheet Sandbox 에 무수정 업로드 가능한 .zip 패키지를 생성.
 */

import type { EmitWarning } from '@/lib/stores/workspaceStore';

/** Roll20 sheet.json 사용자 입력 메타. */
export interface SheetMetadata {
  /** 시트 이름 — 비어 있으면 "Untitled Sheet" fallback. */
  name: string;
  /** 작가 / 제작자 이름. */
  author: string;
  /** dropdown — All Rights Reserved / CC BY / CC BY-SA / MIT / Public Domain. */
  license: SheetLicense;
  /** semver 권장 — 비어 있으면 "0.1.0". */
  version: string;
  /** 자유 입력 시스템 이름 (D&D 5e, PbtA, …) — 비어 있어도 무방. */
  system: string;
}

/** Roll20 권장 라이선스 dropdown 옵션. */
export type SheetLicense =
  | 'All rights reserved'
  | 'CC BY 4.0'
  | 'CC BY-SA 4.0'
  | 'MIT'
  | 'Public Domain';

export const SHEET_LICENSES: SheetLicense[] = [
  'All rights reserved',
  'CC BY 4.0',
  'CC BY-SA 4.0',
  'MIT',
  'Public Domain',
];

/** emit 결과 → export 입력으로 들어오는 4 텍스트. */
export interface EmitOutput {
  html: string;
  css: string;
  /** translation.json 텍스트 (i18n 워크스페이스에서 JSON 으로 emit). */
  translation: string;
  /** emit 자체 warning + export 단에서 검출되는 추가 warning. */
  warnings: EmitWarning[];
}

/** Severity 재export — UI import 단순화. */
export type Severity = EmitWarning['severity'];

/** zip 안에 들어가는 파일 enumeration. */
export const ZIP_FILES = {
  HTML: 'sheet.html',
  CSS: 'sheet.css',
  TRANSLATION: 'translation.json',
  MANIFEST: 'sheet.json',
  README: 'README.txt',
} as const;

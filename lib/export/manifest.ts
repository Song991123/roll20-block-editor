/**
 * sheet.json 생성 — Roll20 Custom Sheet Sandbox 의 minimal manifest.
 *
 * Anchor:
 *   - docs/spec/12_roll20_output_spec.md §5 (sheet.json schema)
 *   - docs/spec/16_redesign_decision_log.md D16 ① (minimal 폼 — 작가 / 라이선스 / 시스템 / 버전)
 *
 * Phase 6 minimal field set:
 *   html, css, translations, legacy, useroptions, authors, license, name, version, system
 *
 * 시스템 specific 0 — system 필드는 사용자가 자유 입력.
 */

import { type SheetMetadata, ZIP_FILES } from './types';

/** ExportDialog 의 폼 default. */
export const DEFAULT_METADATA: SheetMetadata = {
  name: '',
  author: '',
  license: 'All rights reserved',
  version: '0.1.0',
  system: '',
  legacy: false,
};

/** SheetMetadata + ZIP_FILES 를 합쳐 sheet.json 문자열 반환. */
export function buildManifest(meta: SheetMetadata): string {
  const manifest: Record<string, unknown> = {
    html: ZIP_FILES.HTML,
    css: ZIP_FILES.CSS,
    translations: ZIP_FILES.TRANSLATION,
    legacy: meta.legacy === true,
    useroptions: [],
    name: meta.name.trim() || 'Untitled Sheet',
    authors: meta.author.trim() || 'Anonymous',
    license: meta.license,
    version: meta.version.trim() || '0.1.0',
  };
  const system = meta.system.trim();
  if (system) manifest.system = system;
  return JSON.stringify(manifest, null, 2) + '\n';
}

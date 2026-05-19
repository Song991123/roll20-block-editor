/**
 * .zip 패키징 — sheet.html / sheet.css / translation.json / sheet.json + README.txt
 * 를 jszip 으로 묶어 Blob 반환.
 *
 * Anchor:
 *   - docs/spec/16_redesign_decision_log.md D16 ① (.zip + README.txt)
 *   - docs/spec/12_roll20_output_spec.md §5 (sheet.json schema)
 *
 * jszip 은 브라우저 / 노드 양쪽에서 동작. 본 모듈은 클라이언트 사이드 (Web Worker
 * 미사용 — 시트 사이즈가 작아 main thread 에서도 100ms 미만이면 충분).
 */

import JSZip from 'jszip';
import { buildManifest } from './manifest';
import { buildReadme } from './readme';
import {
  type EmitOutput,
  type SheetMetadata,
  ZIP_FILES,
} from './types';

export interface ZipResult {
  blob: Blob;
  fileName: string;
  /** byte 길이 — 토스트 / 디버그 출력용. */
  size: number;
}

/**
 * Export 입력 텍스트 + 메타 → .zip Blob.
 * blob 의 MIME 은 application/zip.
 *
 * 파일 이름 규칙: `<slug(name)>-<version>.zip`. slug 공백 → hyphen, 한글은 유지.
 */
export async function buildZip(
  emit: EmitOutput,
  meta: SheetMetadata,
): Promise<ZipResult> {
  const zip = new JSZip();
  zip.file(ZIP_FILES.HTML, emit.html);
  zip.file(ZIP_FILES.CSS, emit.css);
  // 빈 번역이면 "{}" 만 들어가도록 normalize.
  const translation = emit.translation.trim().length > 0 ? emit.translation : '{}';
  zip.file(ZIP_FILES.TRANSLATION, translation);
  zip.file(ZIP_FILES.MANIFEST, buildManifest(meta));
  zip.file(ZIP_FILES.README, buildReadme(meta));
  for (const [name, content] of Object.entries(emit.extraFiles ?? {})) {
    zip.file(name, content);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    blob,
    fileName: buildFileName(meta),
    size: blob.size,
  };
}

/** "내 시트" → "내-시트-0.1.0.zip" 형식. */
export function buildFileName(meta: SheetMetadata): string {
  const rawName = meta.name.trim() || 'sheet';
  const version = meta.version.trim() || '0.1.0';
  const slug = rawName
    .replace(/\s+/g, '-')
    .replace(/[/\\?%*:|"<>]/g, '')
    .slice(0, 80);
  return `${slug}-${version}.zip`;
}

/**
 * 다운로드 트리거 — blob URL 생성, <a download> 클릭, revoke.
 * 호출 측은 결과 ZipResult.fileName 를 그대로 사용.
 */
export function triggerDownload(zip: ZipResult): void {
  const url = URL.createObjectURL(zip.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zip.fileName;
  // Firefox 호환: body 에 붙였다 떼야 click 이 동작.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 살짝 늦게 revoke — 클릭과 동시에 revoke 하면 일부 브라우저가 다운로드를 취소.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

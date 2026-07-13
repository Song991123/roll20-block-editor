'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clipboard,
  Download,
  FileArchive,
  Info,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  useWorkspaceStore,
  hasBlockingError,
  type EmitWarning,
} from '@/lib/stores/workspaceStore';
import { SHEET_LICENSES, type SheetMetadata } from '@/lib/export/types';
import { DEFAULT_METADATA } from '@/lib/export/manifest';
import { analyzeEmit } from '@/lib/export/warnings';
import { buildZip, triggerDownload } from '@/lib/export/zip_builder';
import { prepareRoll20Payload } from '@/lib/export/payload';
import {
  applyAssetReplacements,
  summarizeAssetReplacementReadiness,
  type AssetReplacementWarning,
  type AssetReplacementReadiness,
} from '@/lib/export/asset_replacements';
import { analyzeAssetRefs, type AssetPreflight } from '@/lib/export/asset_refs';
import {
  sanitizeForRoll20Legacy,
  type SanitizeWarning,
} from '@/lib/emit/sanitize';
import {
  sanitizeRoll20SandboxCss,
  sanitizeRoll20SandboxHtml,
  type Roll20SandboxWarning,
} from '@/lib/emit/roll20SandboxSanitize';
import { usePreviewStore } from '@/lib/stores/previewStore';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const emitCache = useWorkspaceStore((s) => s.emitCache);
  const emitWarnings = useWorkspaceStore((s) => s.emitWarnings);

  const [meta, setMeta] = useState<SheetMetadata>(DEFAULT_METADATA);
  const [busy, setBusy] = useState(false);
  const [legacyMode, setLegacyMode] = useState(false);
  const [legacyWarnings, setLegacyWarnings] = useState<SanitizeWarning[]>([]);
  const assetReplacementText = usePreviewStore((s) => s.assetReplacementMap);
  const setAssetReplacementText = usePreviewStore((s) => s.setAssetReplacementMap);
  const assetReplacementProfiles = usePreviewStore((s) => s.assetReplacementProfiles);
  const activeAssetReplacementProfileId = usePreviewStore((s) => s.activeAssetReplacementProfileId);
  const saveAssetReplacementProfile = usePreviewStore((s) => s.saveAssetReplacementProfile);
  const loadAssetReplacementProfile = usePreviewStore((s) => s.loadAssetReplacementProfile);
  const deleteAssetReplacementProfile = usePreviewStore((s) => s.deleteAssetReplacementProfile);

  const exportText = useMemo(
    () => applyAssetReplacements(
      { html: emitCache.html, css: emitCache.css },
      assetReplacementText,
    ),
    [emitCache.html, emitCache.css, assetReplacementText],
  );
  const assetReplacementReadiness = useMemo(
    () => summarizeAssetReplacementReadiness(assetReplacementText),
    [assetReplacementText],
  );

  const combinedWarnings = useMemo<EmitWarning[]>(() => {
    if (!open) return [];
    const exportWarnings = analyzeEmit({
      html: exportText.html,
      css: exportText.css,
      translation: emitCache.i18n,
      warnings: [],
    });
    return [...emitWarnings, ...exportWarnings];
  }, [open, exportText.html, exportText.css, emitCache.i18n, emitWarnings]);

  const blocked = hasBlockingError(combinedWarnings);
  const assetPreflight = useMemo(
    () => analyzeAssetRefs(exportText.html, exportText.css),
    [exportText.html, exportText.css],
  );

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const w of combinedWarnings) c[w.severity] += 1;
    return c;
  }, [combinedWarnings]);

  const uploadReadiness = useMemo(() => {
    const htmlBytes = byteSize(exportText.html);
    const cssBytes = byteSize(exportText.css);
    const translationText = emitCache.i18n.trim();
    const translationBytes = byteSize(translationText.length > 0 ? translationText : '{}');
    return [
      {
        label: 'sheet.html',
        detail: htmlBytes > 0 ? `${formatBytes(htmlBytes)} 준비됨` : '비어 있음',
        ok: htmlBytes > 0,
      },
      {
        label: 'sheet.css',
        detail: cssBytes > 0 ? `${formatBytes(cssBytes)} 준비됨` : '비어 있음',
        ok: cssBytes > 0,
      },
      {
        label: 'translation.json',
        detail:
          translationText.length > 0
            ? `${formatBytes(translationBytes)} 준비됨`
            : '번역 파일은 빈 객체({})로 내보냅니다',
        ok: true,
      },
      {
        label: 'sheet.json + README',
        detail: '메타데이터와 Roll20 등록 순서를 함께 넣습니다',
        ok: true,
      },
      {
        label: '브라우저 업로드 권한',
        detail: 'Chrome 파일 선택이 막히면 브라우저 파일 접근 권한을 확인하세요',
        ok: false,
        pending: true,
      },
      {
        label: 'Roll20 실제 검증',
        detail: 'Sandbox나 새 테스트 방에 올린 뒤 스크린샷으로 다시 비교해야 합니다',
        ok: false,
        pending: true,
      },
    ];
  }, [emitCache.i18n, exportText.html, exportText.css]);

  const sandboxDiagnostics = useMemo(() => {
    const payload = prepareRoll20Payload({
      html: exportText.html,
      css: exportText.css,
      translation: emitCache.i18n,
      warnings: [],
    });
    const cssForSandbox =
      legacyMode && payload.css ? sanitizeForRoll20Legacy(payload.css).sanitized : payload.css;
    const htmlResult = sanitizeRoll20SandboxHtml(payload.html);
    const cssResult = sanitizeRoll20SandboxCss(cssForSandbox, { prefixSelectors: false });
    const htmlWarnings = countSandboxWarnings(htmlResult.warnings);
    const cssWarnings = countSandboxWarnings(cssResult.warnings);
    const fatal =
      !payload.html.trim() ||
      (cssForSandbox.trim().length > 0 && !cssResult.css.trim()) ||
      cssResult.warnings.some((warning) => warning.code === 'css-rejected');

    return {
      fatal,
      htmlChanged: htmlResult.html !== payload.html,
      cssChanged: cssResult.css !== cssForSandbox,
      htmlBeforeBytes: byteSize(payload.html),
      htmlAfterBytes: byteSize(htmlResult.html),
      cssBeforeBytes: byteSize(cssForSandbox),
      cssAfterBytes: byteSize(cssResult.css),
      runtimeStripped: htmlWarnings['html-runtime-stripped'] ?? 0,
      classPrefixed: htmlWarnings['html-class-prefixed'] ?? 0,
      tagStripped: htmlWarnings['html-tag-stripped'] ?? 0,
      selectorPrefixed: cssWarnings['css-selector-prefixed'] ?? 0,
      urlsProxied:
        (htmlWarnings['html-url-proxied'] ?? 0) + (cssWarnings['css-url-proxied'] ?? 0),
      urlsDropped:
        (htmlWarnings['html-url-dropped'] ?? 0) + (cssWarnings['css-url-dropped'] ?? 0),
      cssRejected: cssWarnings['css-rejected'] ?? 0,
    };
  }, [emitCache.i18n, exportText.html, exportText.css, legacyMode]);

  async function handleDownload() {
    if (blocked) return;
    setBusy(true);
    try {
      let cssForZip = exportText.css;
      let collectedWarnings: SanitizeWarning[] = [];
      const extraFiles: Record<string, string> = {};
      if (assetReplacementText.trim()) {
        extraFiles['asset-replacements.json'] = JSON.stringify(
          {
            mode: 'local-only-url-replacement',
            generatedAt: new Date().toISOString(),
            replacements: exportText.replacements,
            warnings: exportText.warnings,
          },
          null,
          2,
        );
      }
      if (legacyMode && exportText.css) {
        const r = sanitizeForRoll20Legacy(exportText.css);
        cssForZip = r.sanitized;
        collectedWarnings = r.warnings;
        extraFiles['sanitize-warnings.json'] = JSON.stringify(
          {
            mode: 'legacy-roll20-css-sanitize',
            generatedAt: new Date().toISOString(),
            warningCount: collectedWarnings.length,
            warnings: collectedWarnings,
          },
          null,
          2,
        );
      }
      setLegacyWarnings(collectedWarnings);
      const zip = await buildZip(
        {
          html: exportText.html,
          css: cssForZip,
          translation: emitCache.i18n,
          warnings: [],
          extraFiles,
        },
        meta,
      );
      triggerDownload(zip);
      const kb = (zip.size / 1024).toFixed(1);
      toast.success(`${zip.fileName} 내보내기 완료 (${kb} KB). README.txt에 등록 순서를 적어두었습니다.`, {
        duration: 4500,
      });
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`zip 생성 실패: ${msg}`, { duration: 4000 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Roll20 zip 내보내기
          </DialogTitle>
          <DialogDescription>
            Roll20 Custom Sheet Sandbox에 올릴 `sheet.html`, `sheet.css`,
            `translation.json`, `sheet.json`, `README.txt`를 zip으로 묶습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="시트 이름" hint="비워두면 Untitled Sheet">
              <input
                type="text"
                value={meta.name}
                onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                placeholder="예: 나만의 캐릭터 시트"
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
                data-testid="export-meta-name"
              />
            </Field>
            <Field label="작성자" hint="비워두면 Anonymous">
              <input
                type="text"
                value={meta.author}
                onChange={(e) => setMeta({ ...meta, author: e.target.value })}
                placeholder="예: JeongHyun"
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
                data-testid="export-meta-author"
              />
            </Field>
            <Field label="버전" hint="semver 권장, 기본값 0.1.0">
              <input
                type="text"
                value={meta.version}
                onChange={(e) => setMeta({ ...meta, version: e.target.value })}
                placeholder="0.1.0"
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 font-mono text-sm"
                data-testid="export-meta-version"
              />
            </Field>
            <Field label="라이선스" hint="기본값 All rights reserved">
              <select
                value={meta.license}
                onChange={(e) =>
                  setMeta({
                    ...meta,
                    license: e.target.value as SheetMetadata['license'],
                  })
                }
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
                data-testid="export-meta-license"
              >
                {SHEET_LICENSES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="시스템" hint="자유 입력 (D&D 5e, PbtA, CoC 등)" full>
              <input
                type="text"
                value={meta.system}
                onChange={(e) => setMeta({ ...meta, system: e.target.value })}
                placeholder="예: Call of Cthulhu 7th"
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
                data-testid="export-meta-system"
              />
            </Field>
          </section>

          <section
            className="rounded border border-border bg-[var(--bg-elevated)] p-3"
            data-testid="export-warnings"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">내보내기 전 확인</div>
              <div className="flex items-center gap-3 text-[11px] tabular-nums">
                <span className="text-red-500">오류 {counts.error}</span>
                <span className="text-amber-500">경고 {counts.warning}</span>
                <span className="text-muted-foreground">정보 {counts.info}</span>
              </div>
            </div>

            {combinedWarnings.length === 0 ? (
              <div className="text-[12px] text-muted-foreground">
                감지된 문제가 없습니다. 바로 내보낼 수 있습니다.
              </div>
            ) : (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {combinedWarnings.map((w, i) => (
                  <li
                    key={`${w.code}-${i}`}
                    className="flex items-start gap-2 text-[12px] leading-relaxed"
                    data-severity={w.severity}
                  >
                    <SeverityIcon severity={w.severity} />
                    <span>
                      <span className={severityLabelClass(w.severity)}>
                        [{severityLabel(w.severity)}]
                      </span>{' '}
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {w.code}
                      </span>{' '}
                      {w.message}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {blocked && (
              <div
                className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-300"
                role="alert"
                data-testid="export-blocked-banner"
              >
                <strong>내보내기를 막았습니다.</strong> 위의 오류 항목을 먼저 해결해주세요.
              </div>
            )}
          </section>

          <AssetPreflightPanel result={assetPreflight} />
          <AssetReplacementPanel
            value={assetReplacementText}
            onChange={setAssetReplacementText}
            replacements={exportText.replacements}
            readiness={assetReplacementReadiness}
            warnings={exportText.warnings}
            profiles={assetReplacementProfiles}
            activeProfileId={activeAssetReplacementProfileId}
            onSaveProfile={(name) => {
              const id = saveAssetReplacementProfile(name);
              if (id) toast.success('자산 URL 교체 묶음을 저장했습니다.');
              return id;
            }}
            onLoadProfile={(id) => {
              if (loadAssetReplacementProfile(id)) {
                toast.success('자산 URL 교체 묶음을 불러왔습니다.');
              }
            }}
            onDeleteProfile={(id) => {
              deleteAssetReplacementProfile(id);
              toast.success('자산 URL 교체 묶음을 삭제했습니다.');
            }}
          />

          <section
            className="rounded border border-border bg-[var(--bg-elevated)] p-3"
            data-testid="export-roll20-readiness"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Roll20 업로드 준비 상태</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  이 항목은 zip 구성 파일의 로컬 준비 상태입니다. 실제 Roll20 화면 일치는
                  Sandbox나 새 테스트 방에 올린 뒤 스크린샷으로 다시 확인해야 합니다.
                  Chrome 파일 선택이 막히면 브라우저 파일 접근 권한을 확인하고 다시 업로드하세요.
                </p>
              </div>
              <span
                className="shrink-0 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-200"
                data-testid="export-roll20-verification-badge"
              >
                실제 검증 필요
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {uploadReadiness.map((item) => (
                <li
                  key={item.label}
                  className="flex items-start gap-2 rounded border border-border/70 bg-[var(--bg-elevated-2)] px-2.5 py-2 text-[12px]"
                  data-testid="export-roll20-readiness-item"
                  data-state={item.pending ? 'pending' : item.ok ? 'ready' : 'missing'}
                >
                  {item.pending ? (
                    <CircleDashed
                      className="mt-[1px] h-4 w-4 shrink-0 text-amber-500"
                      aria-hidden
                    />
                  ) : item.ok ? (
                    <CheckCircle2
                      className="mt-[1px] h-4 w-4 shrink-0 text-emerald-500"
                      aria-hidden
                    />
                  ) : (
                    <AlertTriangle
                      className="mt-[1px] h-4 w-4 shrink-0 text-amber-500"
                      aria-hidden
                    />
                  )}
                  <span>
                    <span className="font-medium">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 rounded border border-border/70 bg-[var(--bg-elevated-2)] px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              구버전 시트라면 아래 무해화 옵션을 켠 zip과 끈 zip을 각각 Sandbox에 올려
              비교하세요. 기존 실제 방은 관찰용으로만 쓰고, 업로드 검증은 Custom Sheet
              Sandbox나 새 테스트 방에서 진행합니다. zip 다운로드만으로는 Roll20 실제
              표시가 검증된 것이 아닙니다.
            </div>
          </section>

          <section
            className="rounded border border-border bg-[var(--bg-elevated)] p-3"
            data-testid="export-roll20-sandbox-diagnostics"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Roll20 Sandbox 예상 정리</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Roll20 Custom Sheet Sandbox가 업로드 때 적용하는 HTML/CSS 정리 규칙을
                  로컬에서 미리 계산한 값입니다. 실제 동일성은 Sandbox나 테스트 방
                  스크린샷으로 별도 확인해야 합니다.
                </p>
              </div>
              <span
                className={`shrink-0 rounded border px-2 py-1 text-[11px] font-medium ${
                  sandboxDiagnostics.fatal
                    ? 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-200'
                    : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                }`}
                data-testid="export-roll20-sandbox-status"
              >
                {sandboxDiagnostics.fatal ? '수정 필요' : '치명 오류 없음'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <DiagnosticRow
                label="HTML 정리"
                state={sandboxDiagnostics.htmlChanged ? 'rewritten' : 'same'}
                detail={`${formatBytes(sandboxDiagnostics.htmlBeforeBytes)} -> ${formatBytes(
                  sandboxDiagnostics.htmlAfterBytes,
                )}, 런타임 제거 ${sandboxDiagnostics.runtimeStripped}건`}
              />
              <DiagnosticRow
                label="CSS 정리"
                state={
                  sandboxDiagnostics.cssRejected > 0
                    ? 'fatal'
                    : sandboxDiagnostics.cssChanged
                      ? 'rewritten'
                      : 'same'
                }
                detail={`${formatBytes(sandboxDiagnostics.cssBeforeBytes)} -> ${formatBytes(
                  sandboxDiagnostics.cssAfterBytes,
                )}, selector prefix ${sandboxDiagnostics.selectorPrefixed}건`}
              />
              <DiagnosticRow
                label="클래스/태그"
                state={
                  sandboxDiagnostics.classPrefixed + sandboxDiagnostics.tagStripped > 0
                    ? 'rewritten'
                    : 'same'
                }
                detail={`class prefix ${sandboxDiagnostics.classPrefixed}건, tag 제거 ${sandboxDiagnostics.tagStripped}건`}
              />
              <DiagnosticRow
                label="외부 URL"
                state={sandboxDiagnostics.urlsDropped > 0 ? 'rewritten' : 'same'}
                detail={`proxy ${sandboxDiagnostics.urlsProxied}건, drop ${sandboxDiagnostics.urlsDropped}건`}
              />
            </div>
          </section>

          <section
            className="rounded border border-border bg-[var(--bg-elevated)] p-3"
            data-testid="export-legacy-section"
          >
            <label className="flex cursor-pointer select-none items-start gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={legacyMode}
                onChange={(e) => setLegacyMode(e.target.checked)}
                className="mt-[2px] h-4 w-4 accent-[var(--accent-primary)]"
                data-testid="export-legacy-toggle"
                aria-label="구버전 Roll20 무해화"
              />
              <span className="flex-1">
                <span className="font-medium">구버전 Roll20 무해화</span>
                <span className="ml-1 text-[11px] text-muted-foreground">
                  끄면 원본 CSS를 그대로 내보냅니다. 켜면 구버전 Roll20에서 막힐 수 있는 CSS를
                  바꾸거나 제거하고 보고서를 zip에 넣습니다.
                </span>
              </span>
            </label>
            {legacyMode && legacyWarnings.length > 0 && (
              <div
                className="mt-2 text-[11px] text-muted-foreground"
                data-testid="export-legacy-warnings"
              >
                최근 무해화 결과: {legacyWarnings.length}건. 자세한 내용은 sanitize-warnings.json에 저장됩니다.
              </div>
            )}
            {legacyMode && legacyWarnings.length === 0 && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                내보내기 때 CSS를 검사하고 sanitize-warnings.json을 함께 생성합니다.
              </div>
            )}
          </section>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleDownload}
            disabled={blocked || busy}
            data-testid="export-download-button"
          >
            <FileArchive className="mr-1.5 h-4 w-4" />
            {busy ? '묶는 중...' : '내보내기 (.zip)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssetPreflightPanel({ result }: { result: AssetPreflight }) {
  const hasRisk =
    result.externalRefs > 0 || result.relativeRefs > 0 || result.placeholderRiskRefs > 0;
  return (
    <section
      className="rounded border border-border bg-[var(--bg-elevated)] p-3"
      data-testid="export-asset-preflight"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">외부 자산 점검</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            zip에는 HTML, CSS, translation만 들어갑니다. 이미지와 폰트 URL은 Roll20에서
            다시 불러오기 때문에 원본처럼 보이려면 링크가 살아 있어야 합니다.
          </p>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-1 text-[11px] font-medium ${
            hasRisk
              ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-200'
              : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
          }`}
          data-testid="export-asset-preflight-status"
        >
          {hasRisk ? '확인 필요' : '외부 자산 없음'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-3">
        <Metric label="전체 참조" value={result.totalRefs} />
        <Metric label="외부 URL" value={result.externalRefs} />
        <Metric label="상대 경로" value={result.relativeRefs} />
        <Metric label="data URL" value={result.dataRefs} />
        <Metric label="Roll20 proxy" value={result.roll20ProxyRefs} />
        <Metric label="placeholder risk" value={result.placeholderRiskRefs} />
      </div>
      {hasRisk ? (
        <div className="mt-2 rounded border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-100">
          외부 이미지/폰트는 zip에 포함되지 않습니다. Roll20 프록시, Imgur, 원본 서버가
          이미지를 placeholder로 바꾸면 실제 화면이 달라질 수 있습니다. 배포 전에 직접
          보는 URL로 교체하거나 Roll20 Sandbox에서 자산 로딩을 확인하세요.
          {result.placeholderRiskRefs > 0 ? (
            <span className="mt-1 block" data-testid="export-asset-placeholder-risk">
              Roll20 proxy or Imgur page URLs can resolve to placeholder images when the
              original source is deleted. Relink or rehost those assets before claiming
              visual parity.
            </span>
          ) : null}
          {result.hosts.length > 0 ? (
            <span className="mt-1 block text-muted-foreground">
              감지된 호스트: {result.hosts.slice(0, 5).join(', ')}
              {result.hosts.length > 5 ? ` 외 ${result.hosts.length - 5}개` : ''}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-muted-foreground">
          현재 내보내기 기준으로 외부 이미지나 폰트 참조가 감지되지 않았습니다.
        </div>
      )}
    </section>
  );
}

function AssetReplacementPanel({
  value,
  onChange,
  replacements,
  readiness,
  warnings,
  profiles,
  activeProfileId,
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
}: {
  value: string;
  onChange: (value: string) => void;
  replacements: number;
  readiness: AssetReplacementReadiness;
  warnings: AssetReplacementWarning[];
  profiles: { id: string; name: string; updatedAt: number }[];
  activeProfileId: string | null;
  onSaveProfile: (name: string) => string | null;
  onLoadProfile: (id: string) => void;
  onDeleteProfile: (id: string) => void;
}) {
  const active = value.trim().length > 0;
  const [profileName, setProfileName] = useState('');
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? null;
  const saveDisabled = !active || !profileName.trim();
  function handleSaveProfile() {
    const id = onSaveProfile(profileName);
    if (id) setProfileName('');
  }
  async function handleCopyMap() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('URL 교체 목록을 클립보드에 복사했습니다.');
    } catch {
      toast.error('브라우저가 클립보드 복사를 막았습니다. 텍스트를 직접 선택해서 복사해주세요.');
    }
  }
  function handleDownloadMap() {
    if (!active) return;
    const blob = new Blob([value.endsWith('\n') ? value : `${value}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeRelinkFileName(activeProfile?.name ?? profileName)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success('URL 교체 목록 txt를 만들었습니다. 이 파일은 로컬 검증용입니다.');
  }
  return (
    <section
      className="rounded border border-border bg-[var(--bg-elevated)] p-3"
      data-testid="export-asset-replacement-map"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">자산 URL 교체</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            삭제된 이미지나 폰트를 사용자가 다시 올린 URL로 바꾼 뒤 zip을 만들 수 있습니다.
            실제 파일은 저장하지 않고, HTML/CSS 안의 URL 문자만 교체합니다.
          </p>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-1 text-[11px] font-medium ${
            active
              ? warnings.length
                ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-200'
                : 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-200'
              : 'border-border bg-[var(--bg-elevated-2)] text-muted-foreground'
          }`}
          data-testid="export-asset-replacement-status"
        >
          {active ? `${replacements}건 교체 · Roll20용 ${readiness.roll20ReadyTargets}건` : '선택 사항'}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'https://old.example/image.png => https://new.example/image.png'}
        className="min-h-20 w-full resize-y rounded border border-border bg-[var(--bg-elevated-2)] px-2.5 py-2 font-mono text-[11px] leading-relaxed"
        data-testid="export-asset-replacement-input"
      />
      <div
        className="mt-2 grid grid-cols-1 gap-2 rounded border border-border/70 bg-[var(--bg-elevated-2)] p-2 sm:grid-cols-[minmax(0,1fr)_auto]"
        data-testid="export-asset-replacement-profiles"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-medium text-muted-foreground">
              교체 묶음 이름
            </span>
            <input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="예: 영시영 1부 이미지"
              className="h-8 rounded border border-border bg-[var(--bg-elevated)] px-2 text-[12px]"
              data-testid="export-asset-profile-name"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-medium text-muted-foreground">
              저장된 묶음
            </span>
            <select
              value={activeProfileId ?? ''}
              onChange={(event) => {
                if (event.target.value) onLoadProfile(event.target.value);
              }}
              className="h-8 rounded border border-border bg-[var(--bg-elevated)] px-2 text-[12px]"
              data-testid="export-asset-profile-select"
            >
              <option value="">선택 안 함</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2"
            disabled={saveDisabled}
            onClick={handleSaveProfile}
            data-testid="export-asset-profile-save"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            저장
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!activeProfile}
            onClick={() => {
              if (activeProfile) onDeleteProfile(activeProfile.id);
            }}
            data-testid="export-asset-profile-delete"
            title="선택한 교체 묶음 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2"
            disabled={!active}
            onClick={handleCopyMap}
            data-testid="export-asset-map-copy"
          >
            <Clipboard className="h-3.5 w-3.5" aria-hidden />
            복사
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2"
            disabled={!active}
            onClick={handleDownloadMap}
            data-testid="export-asset-map-download"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            txt 저장
          </Button>
          <span
            className="text-[10.5px] leading-relaxed text-muted-foreground"
            data-testid="export-asset-map-cli-hint"
          >
            저장한 txt는 `plan:roll20-asset-relink --map-file` 검증에 그대로 사용할 수 있습니다.
          </span>
        </div>
        {active ? (
          <div
            className={`rounded border px-2 py-1.5 text-[10.5px] leading-relaxed sm:col-span-2 ${
              readiness.hasLocalOnlyTargets
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100'
            }`}
            data-testid="export-asset-roll20-readiness"
            data-local-only-targets={readiness.localOnlyTargets}
            data-roll20-ready-targets={readiness.roll20ReadyTargets}
          >
            {readiness.hasLocalOnlyTargets ? (
              <>
                Roll20 Sandbox 재검증에는 http(s)로 직접 접근 가능한 사용자 소유 URL이 필요합니다.
                현재 교체 목록에는 로컬 미리보기 전용 target {readiness.localOnlyTargets}건이 있습니다.
              </>
            ) : (
              <>
                교체 target {readiness.roll20ReadyTargets}건이 Roll20 업로드 검증에 쓸 수 있는
                http(s) URL 형식입니다.
              </>
            )}
          </div>
        ) : null}
        {profiles.length > 0 ? (
          <div className="text-[10.5px] leading-relaxed text-muted-foreground sm:col-span-2">
            {profiles.length}개 묶음이 이 브라우저 작업공간에 저장되어 있습니다. 실제 이미지 파일은
            저장하지 않고 URL 교체 규칙만 보관합니다.
          </div>
        ) : null}
      </div>
      <div className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground">
        한 줄에 하나씩 입력하세요. 이 맵은 현재 export에만 적용되며, 원본 작업공간이나 외부 시트
        폴더를 변경하지 않습니다.
      </div>
      {warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-100">
          {warnings.slice(0, 4).map((warning) => (
            <li key={`${warning.line}-${warning.message}`}>
              {warning.line}행: {warning.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/70 bg-[var(--bg-elevated-2)] px-2.5 py-2">
      <div className="text-[10.5px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[13px]">{value}</div>
    </div>
  );
}

function safeRelinkFileName(name: string): string {
  const base = name.trim() || 'roll20-asset-relink-map';
  const safe = base
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return safe || 'roll20-asset-relink-map';
}

function DiagnosticRow({
  label,
  state,
  detail,
}: {
  label: string;
  state: 'same' | 'rewritten' | 'fatal';
  detail: string;
}) {
  const iconClass =
    state === 'fatal'
      ? 'text-red-500'
      : state === 'rewritten'
        ? 'text-amber-500'
        : 'text-emerald-500';
  const labelText =
    state === 'fatal' ? '거부 위험' : state === 'rewritten' ? '수정 예상' : '변경 없음';
  return (
    <div
      className="flex items-start gap-2 rounded border border-border/70 bg-[var(--bg-elevated-2)] px-2.5 py-2 text-[12px]"
      data-testid="export-roll20-sandbox-diagnostic-item"
      data-state={state}
    >
      {state === 'same' ? (
        <CheckCircle2 className={`mt-[1px] h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
      ) : (
        <AlertTriangle className={`mt-[1px] h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
      )}
      <span>
        <span className="font-medium">{label}</span>
        <span className="ml-1 text-[11px] text-muted-foreground">({labelText})</span>
        <span className="block text-[11px] text-muted-foreground">{detail}</span>
      </span>
    </div>
  );
}

function countSandboxWarnings(
  warnings: Roll20SandboxWarning[],
): Partial<Record<Roll20SandboxWarning['code'], number>> {
  const counts: Partial<Record<Roll20SandboxWarning['code'], number>> = {};
  for (const warning of warnings) {
    counts[warning.code] = (counts[warning.code] ?? 0) + 1;
  }
  return counts;
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11.5px] font-medium tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="text-[10.5px] text-muted-foreground/70">{hint}</span> : null}
    </label>
  );
}

function SeverityIcon({ severity }: { severity: EmitWarning['severity'] }) {
  if (severity === 'error') {
    return <ShieldAlert className="mt-[1px] h-4 w-4 shrink-0 text-red-500" aria-hidden />;
  }
  if (severity === 'warning') {
    return <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0 text-amber-500" aria-hidden />;
  }
  return <Info className="mt-[1px] h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />;
}

function severityLabel(s: EmitWarning['severity']): string {
  if (s === 'error') return '오류';
  if (s === 'warning') return '경고';
  return '정보';
}

function severityLabelClass(s: EmitWarning['severity']): string {
  if (s === 'error') return 'font-semibold text-red-500';
  if (s === 'warning') return 'font-semibold text-amber-500';
  return 'font-semibold text-muted-foreground';
}

function byteSize(value: string): number {
  return new TextEncoder().encode(value).length;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

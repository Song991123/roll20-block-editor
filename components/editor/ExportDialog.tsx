'use client';

/**
 * ExportDialog — Roll20 등록용 .zip 다운로드 모달.
 *
 * Anchor:
 *   - docs/spec/16_redesign_decision_log.md D16 ① (.zip + README.txt)
 *   - docs/spec/16_redesign_decision_log.md D18 ① (ERROR 차단)
 *   - docs/spec/12_roll20_output_spec.md §5 (sheet.json 메타)
 *
 * 흐름:
 *   1) 헤더 [다운로드] 버튼 → 본 모달 오픈.
 *   2) workspaceStore.emitCache + emitWarnings + 본 모달 단의 추가 export warning
 *      (warnings.ts) 을 합쳐 표시.
 *   3) ERROR 가 있으면 다운로드 버튼 disabled.
 *   4) 다운로드 클릭 → zip_builder.buildZip → triggerDownload + 토스트.
 *
 * 시스템 specific 0 — D&D / PbtA / CoC 분기 없음.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  FileArchive,
  Info,
  ShieldAlert,
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
import {
  SHEET_LICENSES,
  type SheetMetadata,
} from '@/lib/export/types';
import { DEFAULT_METADATA } from '@/lib/export/manifest';
import { analyzeEmit } from '@/lib/export/warnings';
import { buildZip, triggerDownload } from '@/lib/export/zip_builder';
// Stage 19 — 구버전 Roll20 sandbox 호환 모드 (anchor: docs/spec/19_sanitize_and_default_view.md).
import {
  sanitizeForRoll20Legacy,
  type SanitizeWarning,
} from '@/lib/emit/sanitize';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const emitCache = useWorkspaceStore((s) => s.emitCache);
  const emitWarnings = useWorkspaceStore((s) => s.emitWarnings);

  const [meta, setMeta] = useState<SheetMetadata>(DEFAULT_METADATA);
  const [busy, setBusy] = useState(false);
  // Stage 19 — 구버전 sandbox 호환 모드 (default off — 사용자 명시 opt-in).
  const [legacyMode, setLegacyMode] = useState(false);
  const [legacyWarnings, setLegacyWarnings] = useState<SanitizeWarning[]>([]);

  // 본 모달이 보이는 동안에만 합산 — emitCache 변동 시 자동 재계산.
  const combinedWarnings = useMemo<EmitWarning[]>(() => {
    if (!open) return [];
    const exportWarnings = analyzeEmit({
      html: emitCache.html,
      css: emitCache.css,
      translation: emitCache.i18n,
      warnings: [],
    });
    return [...emitWarnings, ...exportWarnings];
  }, [open, emitCache, emitWarnings]);

  const blocked = hasBlockingError(combinedWarnings);

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const w of combinedWarnings) c[w.severity] += 1;
    return c;
  }, [combinedWarnings]);

  const uploadReadiness = useMemo(() => {
    const htmlBytes = byteSize(emitCache.html);
    const cssBytes = byteSize(emitCache.css);
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
            : '빈 번역은 {}로 내보냄',
        ok: true,
      },
      {
        label: 'sheet.json + README',
        detail: '메타데이터와 등록 순서 포함',
        ok: true,
      },
      {
        label: 'Roll20 실제 검증',
        detail: 'Sandbox나 테스트 방에 업로드한 뒤 화면 비교 필요',
        ok: false,
        pending: true,
      },
    ];
  }, [emitCache]);

  async function handleDownload() {
    if (blocked) return;
    setBusy(true);
    try {
      // Stage 19 — 구버전 호환 모드 on 시 CSS sanitize.
      let cssForZip = emitCache.css;
      let collectedWarnings: SanitizeWarning[] = [];
      const extraFiles: Record<string, string> = {};
      if (legacyMode && emitCache.css) {
        const r = sanitizeForRoll20Legacy(emitCache.css);
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
          html: emitCache.html,
          css: cssForZip,
          translation: emitCache.i18n,
          warnings: [],
          extraFiles,
        },
        meta,
      );
      triggerDownload(zip);
      const kb = (zip.size / 1024).toFixed(1);
      toast.success(
        `${zip.fileName} 내보내기 완료 (${kb} KB). README.txt에 Roll20 등록 순서를 적어뒀어요.`,
        { duration: 4500 },
      );
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
            Roll20용 .zip 내보내기
          </DialogTitle>
          <DialogDescription>
            Roll20 Custom Sheet Sandbox에 올릴 파일을 .zip으로 묶습니다. sheet.html, sheet.css, translation.json, sheet.json, README.txt가 포함돼요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── 메타 폼 ───────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="시트 이름" hint="비어 있으면 Untitled Sheet">
              <input
                type="text"
                value={meta.name}
                onChange={(e) => setMeta({ ...meta, name: e.target.value })}
                placeholder="예: 내 캐릭터 시트"
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
                data-testid="export-meta-name"
              />
            </Field>
            <Field label="작가" hint="비어 있으면 Anonymous">
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
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 text-sm font-mono"
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
            <Field label="시스템" hint="자유 입력 (D&D 5e, PbtA, ...)" full>
              <input
                type="text"
                value={meta.system}
                onChange={(e) => setMeta({ ...meta, system: e.target.value })}
                placeholder="예: Dungeons & Dragons 5e (선택)"
                className="w-full rounded border border-border bg-[var(--bg-elevated)] px-2 py-1.5 text-sm"
                data-testid="export-meta-system"
              />
            </Field>
          </section>

          {/* ── 검사 결과 ─────────────────────────────────────────────── */}
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
                감지된 문제가 없어요. 바로 내보낼 수 있습니다.
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
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
                      — {w.message}
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
                <strong>내보내기를 막았어요.</strong> 위의 오류 항목을 먼저 해결해 주세요.
              </div>
            )}
          </section>
          <section
            className="rounded border border-border bg-[var(--bg-elevated)] p-3"
            data-testid="export-roll20-readiness"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Roll20 업로드 준비 상태</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  이 항목은 zip 구성 파일의 로컬 준비 여부입니다. 실제 Roll20 화면 일치 여부는 Sandbox나 테스트 방에 올려 캡처로 확인해야 합니다.
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
              구버전 시트라면 아래 무해화 옵션을 켠 zip과 끈 zip을 따로 Sandbox에 올려 비교하세요. 기존 실제 방은 관찰용으로만 쓰고, 업로드 검증은 Custom Sheet Sandbox 또는 새 테스트 방에서 진행합니다.
            </div>
          </section>
          {/* Stage 19 — 구버전 Roll20 sandbox 호환 모드 토글 (additive). */}
          <section
            className="rounded border border-border bg-[var(--bg-elevated)] p-3"
            data-testid="export-legacy-section"
          >
            <label className="flex items-start gap-2 text-[12px] cursor-pointer select-none">
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
                  끄면 원본 CSS 그대로, 켜면 구버전에서 막힐 수 있는 CSS를 변환/제거하고 보고서를 zip에 넣습니다.
                </span>
              </span>
            </label>
            {legacyMode && legacyWarnings.length > 0 && (
              <div
                className="mt-2 text-[11px] text-muted-foreground"
                data-testid="export-legacy-warnings"
              >
                최근 무해화 결과: {legacyWarnings.length}건. 자세한 내용은 sanitize-warnings.json에 포함됩니다.
              </div>
            )}
            {legacyMode && legacyWarnings.length === 0 && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                내보내기 시 CSS를 검사하고 sanitize-warnings.json을 함께 생성합니다.
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
            {busy ? '압축 중…' : '내보내기 (.zip)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11.5px] font-medium tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[10.5px] text-muted-foreground/70">{hint}</span>
      )}
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

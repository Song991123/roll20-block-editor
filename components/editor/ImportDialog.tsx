'use client';

/**
 * ImportDialog — HTML / CSS / translation 텍스트를 워크스페이스에 import.
 *
 * Anchor:
 *   - docs/spec/02_functional_spec.md §3 (130 블록 카탈로그)
 *   - lib/import/index.ts (importSheet API)
 *
 * 사용자가 외부 Roll20 시트 (.html + .css + translation.json) 을 텍스트
 * 또는 파일 업로드로 입력 → 130 블록 카탈로그 매칭 → 3 워크스페이스에 hydrate.
 *
 * 매칭 결과 요약 (coverage % / fallback 카운트 / warning 리스트) 을 표시.
 * 시스템 specific 토큰 0 — Roll20 시트면 무엇이든 입력 가능.
 */

import { useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { importSheet } from '@/lib/import';
import {
  analyzeAssetRefs,
  buildAssetReplacementDraft,
  type AssetPreflight,
} from '@/lib/export/asset_refs';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import {
  moveImportedWorkerBlocksToWorkspace,
  replaceWorkerWorkspaceFromSourceHtml,
} from '@/lib/blockly/workerWorkspace';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = 'html' | 'css' | 'i18n';

const inputClassName = 'text-xs text-foreground file:text-foreground';
const textareaClassName =
  'h-56 w-full resize-y rounded border border-border bg-[var(--bg-elevated)] p-2 font-mono text-[12px] text-foreground caret-foreground placeholder:text-muted-foreground';

function arrangeImportedWorkspace(key: WorkspaceKey) {
  const workspace = getBlocklyAdapter().getWorkspace(key);
  if (!workspace) return;

  const blocks = workspace.getTopBlocks(false);
  if (blocks.length <= 1) {
    workspace.resizeContents?.();
    return;
  }

  const columnCount = key === 'html' ? 4 : 2;
  const minColumnWidth = key === 'html' ? 360 : 320;
  const gap = 32;
  let x = 24;
  let y = 24;
  let column = 0;
  let rowHeight = 0;

  for (const block of blocks) {
    const pos = block.getRelativeToSurfaceXY();
    const size = block.getHeightWidth();
    block.moveBy(x - pos.x, y - pos.y);

    rowHeight = Math.max(rowHeight, Math.ceil(size.height || 80));
    column += 1;

    if (column >= columnCount) {
      column = 0;
      x = 24;
      y += rowHeight + gap;
      rowHeight = 0;
    } else {
      x += Math.max(minColumnWidth, Math.ceil(size.width || minColumnWidth) + gap);
    }
  }

  workspace.resizeContents?.();
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [tab, setTab] = useState<Tab>('html');
  const [htmlText, setHtmlText] = useState('');
  const [cssText, setCssText] = useState('');
  const [i18nText, setI18nText] = useState('');
  const [compactWideRows, setCompactWideRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const assetReplacementMap = usePreviewStore((s) => s.assetReplacementMap);
  const setAssetReplacementMap = usePreviewStore((s) => s.setAssetReplacementMap);
  const [report, setReport] = useState<null | {
    coverage: number;
    matched: number;
    total: number;
    rawHtml: number;
    cssMatched: number;
    cssTotal: number;
    i18nKeys: number;
    workerBlocks: number;
    warnings: number;
    sanitizeDropped: number;
    wideRowBundles: number;
    wideRowCollapsed: number;
  }>(null);
  const [progress, setProgress] = useState<null | { done: number; total: number; pct: number }>(null);
  const assetPreflight = useMemo(
    () => analyzeAssetRefs(htmlText, cssText),
    [htmlText, cssText],
  );

  function handleFile(setter: (v: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => setter(typeof r.result === 'string' ? r.result : '');
      r.readAsText(f);
    };
  }

  async function handleImport() {
    setBusy(true);
    setProgress(null);
    // Plan A — chunked inject + progress UI.
    // 큰 sheet (top-level 블록 N > 1000) 만 progress 표시 → 작은 sheet 는 기존 UX.
    const PROGRESS_THRESHOLD = 1000;
    const PROGRESS_TOAST_ID = 'import-progress';
    try {
      const result = importSheet({
        html: htmlText,
        css: cssText,
        i18n: i18nText,
      }, {
        html: { compactWideRows },
      });
      const adapter = getBlocklyAdapter();
      const ws = useWorkspaceStore.getState();
      const emptyXml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';
      // Reset before hydrate to avoid duplicate top blocks.
      ws.resetWorkspace('html');
      ws.resetWorkspace('css');
      ws.resetWorkspace('i18n');
      ws.resetWorkspace('worker');
      adapter.hydrateFromXml('worker', emptyXml);

      // html 워크스페이스가 가장 큼 (6K 가능) → chunked. css/i18n 은 보통 작음.
      // top-level 카운트는 chunked 가 자체 측정 → progress callback 으로 수신.
      let htmlTotal = 0;
      await adapter.hydrateFromXmlChunked('html', result.html, {
        chunkSize: 500,
        onProgress: (done, total) => {
          htmlTotal = total;
          if (total >= PROGRESS_THRESHOLD) {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            setProgress({ done, total, pct });
            toast.loading(`${done.toLocaleString()} / ${total.toLocaleString()}개 블록 불러오는 중… ${pct}%`, {
              id: PROGRESS_TOAST_ID,
            });
          }
        },
      });
      const workerMove = moveImportedWorkerBlocksToWorkspace();
      const workerSource = replaceWorkerWorkspaceFromSourceHtml(htmlText);
      adapter.hydrateFromXml('css', result.css);
      adapter.hydrateFromXml('i18n', result.i18n);
      arrangeImportedWorkspace('html');
      arrangeImportedWorkspace('css');
      arrangeImportedWorkspace('i18n');
      arrangeImportedWorkspace('worker');
      // chunked 토스트 정리.
      if (htmlTotal >= PROGRESS_THRESHOLD) {
        toast.dismiss(PROGRESS_TOAST_ID);
      }
      setProgress(null);
      const htmlBlocks = adapter.getWorkspace('html')?.getAllBlocks(false).length ?? 0;
      const cssBlocks = adapter.getWorkspace('css')?.getAllBlocks(false).length ?? 0;
      const i18nBlocks = adapter.getWorkspace('i18n')?.getAllBlocks(false).length ?? 0;
      const workerBlocks = adapter.getWorkspace('worker')?.getAllBlocks(false).length ?? 0;
      ws.bumpStructure('html', htmlBlocks);
      ws.bumpStructure('css', cssBlocks);
      ws.bumpStructure('i18n', i18nBlocks);
      ws.bumpStructure('worker', workerBlocks);
      ws.markSaved('html');
      ws.markSaved('css');
      ws.markSaved('i18n');
      ws.markSaved('worker');
      setReport({
        coverage: result.stats.coverage,
        matched: result.stats.htmlMatched,
        total: result.stats.htmlTotal,
        rawHtml: result.stats.htmlRawFallback,
        cssMatched: result.stats.cssMatched,
        cssTotal: result.stats.cssTotal,
        i18nKeys: result.stats.i18nKeys,
        workerBlocks: workerSource.replaced ? workerSource.targetCount : workerMove.targetCount,
        warnings: result.warnings.length,
        sanitizeDropped: result.stats.sanitizeDropped,
        wideRowBundles: result.stats.wideRowBundles ?? 0,
        wideRowCollapsed: result.stats.wideRowCollapsed ?? 0,
      });
      if (result.stats.sanitizeDropped > 0) {
        toast.warning(
          `보안을 위해 인라인 이벤트 핸들러 ${result.stats.sanitizeDropped}개를 제거했어요. (onclick 등)`,
          { duration: 4500 },
        );
      }
      toast.success(
        `불러오기 완료: HTML 매칭 ${result.stats.htmlMatched}/${result.stats.htmlTotal} (${result.stats.coverage}%) · 원본 보존 ${result.stats.htmlRawFallback}개`,
        { duration: 3500 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.dismiss('import-progress');
      toast.error(`불러오기 실패: ${msg}`, { duration: 4000 });
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  function handleReset() {
    setHtmlText('');
    setCssText('');
    setI18nText('');
    setReport(null);
  }

  function handleCreateAssetReplacementDraft() {
    const draft = buildAssetReplacementDraft(assetPreflight, {
      sourceLabel: 'import preflight',
    });
    if (!draft) {
      toast('교체할 외부 자산 URL이 없습니다.', { duration: 2200 });
      return;
    }
    const next = [assetReplacementMap.trim(), draft].filter(Boolean).join('\n\n');
    setAssetReplacementMap(next);
    toast.success('자산 교체 목록 초안을 만들었습니다. 내보내기 창에서 새 URL을 채워 주세요.', {
      duration: 3500,
    });
  }

  const anyInput = !!(htmlText.trim() || cssText.trim() || i18nText.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl text-foreground">
        <DialogHeader>
          <DialogTitle>외부 시트 불러오기</DialogTitle>
          <DialogDescription>
            HTML, CSS, translation 파일을 넣으면 블록으로 자동 변환합니다. 아직 지원하지 않는 구조는 원본 블록으로 보존해요.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="i18n">번역</TabsTrigger>
          </TabsList>

          <TabsContent value="html" className="mt-3 space-y-2">
            <input
              type="file"
              accept=".html,.htm,text/html"
              onChange={handleFile(setHtmlText)}
              className={inputClassName}
              aria-label="HTML 파일 업로드"
            />
            <textarea
              value={htmlText}
              onChange={(e) => setHtmlText(e.target.value)}
              placeholder="<input type='text' name='attr_character_name'> ... 같은 HTML 붙여넣기."
              className={textareaClassName}
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="css" className="mt-3 space-y-2">
            <input
              type="file"
              accept=".css,text/css"
              onChange={handleFile(setCssText)}
              className={inputClassName}
              aria-label="CSS 파일 업로드"
            />
            <textarea
              value={cssText}
              onChange={(e) => setCssText(e.target.value)}
              placeholder=".sheet-header { color: red; } ... CSS 붙여넣기."
              className={textareaClassName}
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="i18n" className="mt-3 space-y-2">
            <input
              type="file"
              accept=".json,.txt,application/json,text/plain"
              onChange={handleFile(setI18nText)}
              className={inputClassName}
              aria-label="번역 파일 업로드"
            />
            <textarea
              value={i18nText}
              onChange={(e) => setI18nText(e.target.value)}
              placeholder='{"hello":"안녕"} 또는 key=value 줄 형식.'
              className={textareaClassName}
              spellCheck={false}
            />
          </TabsContent>
        </Tabs>

        <ImportAssetPreflight
          result={assetPreflight}
          onCreateDraft={handleCreateAssetReplacementDraft}
        />

        <label className="flex gap-3 rounded border border-border bg-[var(--bg-elevated)] p-3 text-[12px] leading-relaxed">
          <input
            type="checkbox"
            checked={compactWideRows}
            onChange={(e) => setCompactWideRows(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block font-medium">큰 표 행 빠르게 불러오기</span>
            <span className="block text-muted-foreground">
              반복되는 큰 표 행을 묶음으로 보존해 불러오기 속도를 줄입니다. Roll20 출력 HTML은 유지하지만,
              묶인 행 내부 요소는 나중에 분해하기 전까지 개별 블록으로 편집하기 어렵습니다.
            </span>
          </span>
        </label>

        {progress && progress.total > 0 && (
          <div
            className="rounded border border-border bg-[var(--bg-elevated)] p-3 text-[12px] leading-relaxed"
            role="status"
            aria-live="polite"
            data-testid="import-progress"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">큰 시트를 불러오는 중…</span>
              <span className="tabular-nums text-muted-foreground">
                {progress.done.toLocaleString()} / {progress.total.toLocaleString()} 블록 · {progress.pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded bg-[var(--bg-muted)] overflow-hidden">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <div className="mt-1 text-muted-foreground text-[11px]">
              큰 시트는 잠깐 느려질 수 있어요. 변환은 계속 진행됩니다.
            </div>
          </div>
        )}

        {report && (
          <div className="rounded border border-border bg-[var(--bg-elevated)] p-3 text-[12px] leading-relaxed">
            <div className="font-medium mb-1">매칭 결과</div>
            <div>
              HTML 매칭: <span className="tabular-nums">{report.matched}/{report.total}</span>
              {' '}({report.coverage}%)
              {' · '}원본 보존 <span className="tabular-nums">{report.rawHtml}</span>
            </div>
            <div>
              CSS 규칙: <span className="tabular-nums">{report.cssMatched}/{report.cssTotal}</span>
              {' · '}번역 키 <span className="tabular-nums">{report.i18nKeys}</span>
            </div>
            {report.wideRowBundles > 0 && (
              <div className="mt-1 text-sky-500">
                큰 표 행 묶음 {report.wideRowBundles}개로 약 {report.wideRowCollapsed}개 블록을 줄였습니다.
              </div>
            )}
            {report.sanitizeDropped > 0 && (
              <div className="mt-1 text-amber-500" data-testid="import-sanitize-warning">
                보안을 위해 인라인 이벤트 핸들러(onclick 등) {report.sanitizeDropped}개를 제거했습니다.
              </div>
            )}
            {report.warnings > 0 && (
              <div className="mt-1 text-amber-500">
                경고 {report.warnings}건 — 일부 패턴은 원본 블록으로 보존했습니다.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleReset} disabled={busy}>
            지우기
          </Button>
          <Button onClick={handleImport} disabled={busy || !anyInput}>
            {busy ? (progress ? `${progress.pct}% 불러오는 중…` : '변환 중…') : '불러오기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportAssetPreflight({
  result,
  onCreateDraft,
}: {
  result: AssetPreflight;
  onCreateDraft: () => void;
}) {
  const hasRisk =
    result.externalRefs > 0 || result.relativeRefs > 0 || result.placeholderRiskRefs > 0;
  const draftableRefs = result.refs.filter((ref) => ref.kind !== 'data-url').length;
  return (
    <section
      className="rounded border border-border bg-[var(--bg-elevated)] p-3 text-[12px]"
      data-testid="import-asset-preflight"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">불러오기 자산 점검</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            이미지와 폰트 URL은 시트 구조와 별개로 Roll20에서 다시 로드됩니다. 삭제된 Imgur
            이미지나 Roll20 proxy URL은 placeholder로 보일 수 있습니다.
          </p>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-1 text-[11px] font-medium ${
            hasRisk
              ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-200'
              : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
          }`}
          data-testid="import-asset-preflight-status"
        >
          {hasRisk ? '확인 필요' : '외부 자산 없음'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ImportAssetMetric label="외부 URL" value={result.externalRefs} />
        <ImportAssetMetric label="상대 경로" value={result.relativeRefs} />
        <ImportAssetMetric label="Roll20 proxy" value={result.roll20ProxyRefs} />
        <ImportAssetMetric label="Imgur page" value={result.imgurPageRefs} />
        <ImportAssetMetric label="placeholder risk" value={result.placeholderRiskRefs} />
        <ImportAssetMetric label="data URL" value={result.dataRefs} />
        <ImportAssetMetric label="HTTP URL" value={result.insecureHttpRefs} />
        <ImportAssetMetric label="직링크 후보" value={result.canonicalDirectRefs} />
        <ImportAssetMetric label="Imgur 직링크" value={result.imgurDirectCandidateRefs} />
      </div>
      {hasRisk ? (
        <div className="mt-2 rounded border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900 dark:text-amber-100">
          실제 Roll20 동일성을 확인하려면 이 자산들이 로드되는지 먼저 봐야 합니다.
          삭제되었거나 막힌 URL은 export의 자산 URL 교체에서 사용자가 직접 다시 올린 URL로
          바꿔 주세요.
          {result.canonicalDirectRefs > 0 ? (
            <span className="mt-1 block" data-testid="import-asset-canonical-candidates">
              교체 초안에 {result.canonicalDirectRefs}개의 https/direct 후보를 같이 적습니다.
              후보 URL도 권한과 로딩 상태를 확인한 뒤 사용해야 합니다.
            </span>
          ) : null}
          {result.hosts.length > 0 ? (
            <span className="mt-1 block text-muted-foreground">
              감지된 호스트: {result.hosts.slice(0, 5).join(', ')}
              {result.hosts.length > 5 ? ` 외 ${result.hosts.length - 5}개` : ''}
            </span>
          ) : null}
          {draftableRefs > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-7 px-2 text-[11px]"
              onClick={onCreateDraft}
              data-testid="import-asset-replacement-draft"
            >
              교체 목록 초안 만들기
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ImportAssetMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/70 bg-[var(--bg-elevated-2)] px-2.5 py-2">
      <div className="text-[10.5px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[13px]">{value}</div>
    </div>
  );
}

export default ImportDialog;

'use client';

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
import { importSheet, type ImportWarning } from '@/lib/import';
import {
  analyzeAssetRefs,
  buildAssetReplacementDraft,
  type AssetPreflight,
} from '@/lib/export/asset_refs';
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { registerAllBlocks } from '@/lib/blocks/registry';
import {
  moveImportedWorkerBlocksToWorkspace,
  replaceWorkerWorkspaceFromSourceHtml,
} from '@/lib/blockly/workerWorkspace';
import { usePreviewStore } from '@/lib/stores/previewStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { useWorkspaceStore, type WorkspaceKey } from '@/lib/stores/workspaceStore';
import { MAX_SVG_BLOCKS } from '@/lib/blockly/renderPolicy';

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = 'html' | 'css' | 'i18n' | 'js';
type ExternalJsKind = 'page' | 'worker';

const inputClassName =
  'text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-[var(--bg-elevated-2)] file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-foreground hover:file:bg-[var(--bg-hover)]';
const textareaClassName =
  'h-56 w-full resize-y rounded-xl border-[1.5px] border-border bg-[var(--bg-elevated)] p-3 font-mono text-sm text-foreground caret-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]';

function arrangeImportedWorkspace(key: WorkspaceKey) {
  const workspace = getBlocklyAdapter().getWorkspaceSvg(key);
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

function appendExternalScript(html: string, source: string, kind: ExternalJsKind): string {
  const body = String(source ?? '').trim();
  if (!body) return html;
  const safeBody = body.replace(/<\/script/gi, '<' + '\\/script');
  const type = kind === 'worker' ? 'text/worker' : 'text/javascript';
  return [String(html ?? '').trim(), `<script type="${type}">\n${safeBody}\n</script>`]
    .filter(Boolean)
    .join('\n');
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [tab, setTab] = useState<Tab>('html');
  const [htmlText, setHtmlText] = useState('');
  const [cssText, setCssText] = useState('');
  const [i18nText, setI18nText] = useState('');
  const [jsText, setJsText] = useState('');
  const [jsKind, setJsKind] = useState<ExternalJsKind>('page');
  const [compactWideRows, setCompactWideRows] = useState(false);
  const [busy, setBusy] = useState(false);
  const assetReplacementMap = usePreviewStore((state) => state.assetReplacementMap);
  const setAssetReplacementMap = usePreviewStore((state) => state.setAssetReplacementMap);
  const [report, setReport] = useState<null | {
    coverage: number;
    cssCoverage: number;
    structuredCoverage: number;
    matched: number;
    total: number;
    rawHtml: number;
    rawCss: number;
    cssMatched: number;
    cssTotal: number;
    i18nKeys: number;
    pageJsBlocks: number;
    workerBlocks: number;
    workerRawStatements: number;
    templateMarkerCount: number;
    warnings: number;
    sanitizeDropped: number;
    wideRowBundles: number;
    wideRowCollapsed: number;
    warningDetails: Array<Pick<ImportWarning, 'severity' | 'message' | 'workspace'>>;
  }>(null);
  const [progress, setProgress] = useState<null | { done: number; total: number; pct: number }>(null);
  const assetPreflight = useMemo(
    () => analyzeAssetRefs(htmlText, cssText),
    [htmlText, cssText],
  );

  function handleFile(setter: (value: string) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter(typeof reader.result === 'string' ? reader.result : '');
      reader.readAsText(file);
    };
  }

  async function handleImport() {
    setBusy(true);
    setProgress(null);
    const progressThreshold = 1000;
    const progressToastId = 'import-progress';

    try {
      const htmlWithExternalJs = appendExternalScript(htmlText, jsText, jsKind);
      const result = importSheet(
        {
          html: htmlWithExternalJs,
          css: cssText,
          i18n: i18nText,
        },
        { html: { compactWideRows } },
      );
      const adapter = getBlocklyAdapter();
      registerAllBlocks();
      const workspaceStore = useWorkspaceStore.getState();
      const uiStore = useUiStore.getState();

      if (
        result.stats.htmlTotal >= MAX_SVG_BLOCKS &&
        uiStore.mainMode !== 'preview' &&
        uiStore.mainMode !== 'edit'
      ) {
        uiStore.setMainMode('preview');
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }

      uiStore.setAutoSheetCanvasWidth(uiStore.sheetCanvasWidth);
      uiStore.setAutoRolltemplateCanvasWidth(uiStore.rolltemplateCanvasWidth);
      const emptyXml = '<xml xmlns="https://developers.google.com/blockly/xml"></xml>';

      workspaceStore.resetWorkspace('html');
      workspaceStore.resetWorkspace('css');
      workspaceStore.resetWorkspace('i18n');
      workspaceStore.resetWorkspace('js');
      workspaceStore.resetWorkspace('worker');
      adapter.hydrateFromXml('js', result.js);
      adapter.hydrateFromXml('worker', emptyXml);

      let htmlTotal = result.stats.htmlTotal;
      await (result.stats.htmlTotal >= progressThreshold
        ? adapter.hydrateFromXmlChunked('html', result.html, {
            chunkSize: 500,
            onProgress: (done, total) => {
              htmlTotal = total;
              if (total < progressThreshold) return;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              setProgress({ done, total, pct });
              toast.loading(`블록 ${done.toLocaleString()} / ${total.toLocaleString()}개를 불러오는 중 · ${pct}%`, {
                id: progressToastId,
              });
            },
          })
        : Promise.resolve(adapter.hydrateFromXml('html', result.html)));

      const workerMove = moveImportedWorkerBlocksToWorkspace();
      const workerSource = replaceWorkerWorkspaceFromSourceHtml(htmlWithExternalJs);
      adapter.hydrateFromXml('css', result.css);
      adapter.hydrateFromXml('i18n', result.i18n);
      arrangeImportedWorkspace('html');
      arrangeImportedWorkspace('css');
      arrangeImportedWorkspace('i18n');
      arrangeImportedWorkspace('js');
      arrangeImportedWorkspace('worker');

      if (htmlTotal >= progressThreshold) toast.dismiss(progressToastId);
      setProgress(null);

      const htmlBlocks = adapter.getWorkspace('html')?.getAllBlocks(false).length ?? 0;
      const cssBlocks = adapter.getWorkspace('css')?.getAllBlocks(false).length ?? 0;
      const i18nBlocks = adapter.getWorkspace('i18n')?.getAllBlocks(false).length ?? 0;
      const jsBlocks = adapter.getWorkspace('js')?.getAllBlocks(false).length ?? 0;
      const workerBlocks = adapter.getWorkspace('worker')?.getAllBlocks(false).length ?? 0;
      workspaceStore.bumpStructure('html', htmlBlocks);
      workspaceStore.bumpStructure('css', cssBlocks);
      workspaceStore.bumpStructure('i18n', i18nBlocks);
      workspaceStore.bumpStructure('js', jsBlocks);
      workspaceStore.bumpStructure('worker', workerBlocks);
      workspaceStore.markSaved('html');
      workspaceStore.markSaved('css');
      workspaceStore.markSaved('i18n');
      workspaceStore.markSaved('js');
      workspaceStore.markSaved('worker');

      setReport({
        coverage: result.stats.coverage,
        cssCoverage: result.stats.cssCoverage,
        structuredCoverage: result.stats.structuredCoverage,
        matched: result.stats.htmlMatched,
        total: result.stats.htmlTotal,
        rawHtml: result.stats.htmlRawFallback,
        rawCss: result.stats.cssRawFallback,
        cssMatched: result.stats.cssMatched,
        cssTotal: result.stats.cssTotal,
        i18nKeys: result.stats.i18nKeys,
        pageJsBlocks: jsBlocks,
        workerBlocks: workerSource.replaced ? workerSource.targetCount : workerMove.targetCount,
        workerRawStatements: Math.max(
          result.stats.scriptStatementsRaw,
          workerSource.rawStatementCount,
        ),
        templateMarkerCount: result.stats.templateMarkerCount,
        warnings: result.warnings.length,
        sanitizeDropped: result.stats.sanitizeDropped,
        wideRowBundles: result.stats.wideRowBundles ?? 0,
        wideRowCollapsed: result.stats.wideRowCollapsed ?? 0,
        warningDetails: result.warnings.slice(0, 12).map(({ severity, message, workspace }) => ({
          severity,
          message,
          workspace,
        })),
      });

      if (result.stats.sanitizeDropped > 0) {
        toast.warning(
          `보안을 위해 브라우저에서 자동 실행되는 코드 ${result.stats.sanitizeDropped}개를 제거했습니다.`,
          { duration: 4500 },
        );
      }
      toast.success(
        `불러오기 완료: HTML ${result.stats.htmlCoverage}% · CSS ${result.stats.cssCoverage}% · 원본 보존 ${result.stats.htmlRawFallback + result.stats.cssRawFallback}개`,
        { duration: 3500 },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.dismiss(progressToastId);
      toast.error(`불러오기 실패: ${message}`, { duration: 4000 });
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  function handleReset() {
    setHtmlText('');
    setCssText('');
    setI18nText('');
    setJsText('');
    setJsKind('page');
    setReport(null);
  }

  function handleCreateAssetReplacementDraft() {
    const draft = buildAssetReplacementDraft(assetPreflight, { sourceLabel: 'import preflight' });
    if (!draft) {
      toast('교체할 외부 자산 URL이 없습니다.', { duration: 2200 });
      return;
    }
    setAssetReplacementMap([assetReplacementMap.trim(), draft].filter(Boolean).join('\n\n'));
    toast.success('자산 교체 목록 초안을 만들었습니다. 내보내기 창에서 사용자 소유 URL을 입력해 주세요.', {
      duration: 3500,
    });
  }

  const anyInput = Boolean(htmlText.trim() || cssText.trim() || i18nText.trim() || jsText.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto overscroll-contain text-foreground"
        data-testid="import-dialog"
      >
        <DialogHeader>
          <DialogTitle>시트 파일 불러오기</DialogTitle>
          <DialogDescription>
            HTML, CSS, 번역 파일과 선택한 JS를 넣으면 블록으로 자동 변환합니다. 변환하지 못한 부분은 원본을 유지해 안전하게 보존합니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="i18n">번역</TabsTrigger>
            <TabsTrigger value="js">JS</TabsTrigger>
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
              onChange={(event) => setHtmlText(event.target.value)}
              placeholder="<input type='text' name='attr_character_name'> 같은 HTML을 붙여 넣으세요."
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
              onChange={(event) => setCssText(event.target.value)}
              placeholder=".sheet-header { color: red; } 같은 CSS를 붙여 넣으세요."
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
              onChange={(event) => setI18nText(event.target.value)}
              placeholder='{"hello":"안녕"} 또는 key=value 형식'
              className={textareaClassName}
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="js" className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="JS 종류">
              <button
                type="button"
                onClick={() => setJsKind('page')}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  jsKind === 'page'
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                    : 'border-border bg-[var(--bg-elevated)] text-muted-foreground hover:bg-[var(--bg-hover)]'
                }`}
                aria-pressed={jsKind === 'page'}
                data-testid="import-js-kind-page"
              >
                일반 JS 보관
              </button>
              <button
                type="button"
                onClick={() => setJsKind('worker')}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  jsKind === 'worker'
                    ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-active)]'
                    : 'border-border bg-[var(--bg-elevated)] text-muted-foreground hover:bg-[var(--bg-hover)]'
                }`}
                aria-pressed={jsKind === 'worker'}
                data-testid="import-js-kind-worker"
              >
                Roll20 자동 동작
              </button>
            </div>
            <input
              type="file"
              accept=".js,text/javascript,application/javascript"
              onChange={handleFile(setJsText)}
              className={inputClassName}
              aria-label="JS 파일 업로드"
              data-testid="import-js-file"
            />
            <textarea
              value={jsText}
              onChange={(event) => setJsText(event.target.value)}
              placeholder={
                jsKind === 'worker'
                  ? 'on("sheet:opened", ...), getAttrs(...), setAttrs(...) 같은 Roll20 자동 동작 코드'
                  : '보관할 일반 JavaScript 또는 script 파일 내용을 붙여 넣으세요'
              }
              className={textareaClassName}
              spellCheck={false}
              data-testid="import-js-textarea"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {jsKind === 'worker'
                ? '자동 동작은 화면에 보이지 않고 Roll20용 sheet.html에 포함됩니다.'
                : '일반 JS는 Roll20에서 실행되지 않습니다. 편집 원문과 ZIP의 텍스트 백업에만 보관합니다.'}
            </p>
          </TabsContent>
        </Tabs>

        <ImportAssetPreflight result={assetPreflight} onCreateDraft={handleCreateAssetReplacementDraft} />

        <label className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={compactWideRows}
            onChange={(event) => setCompactWideRows(event.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] accent-[var(--primary)]"
          />
          <span>
            <span className="block font-semibold">큰 시트를 빠르게 불러오기</span>
            <span className="block text-muted-foreground">
              반복되는 넓은 행을 묶음으로 보존해 불러오는 시간을 줄입니다. 내보내기 결과는 같지만, 묶인 행은 나중에 개별 블록으로 고치려면 다시 펼쳐야 합니다.
            </span>
          </span>
        </label>

        {progress && progress.total > 0 && (
          <div
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-sm leading-relaxed"
            role="status"
            aria-live="polite"
            data-testid="import-progress"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">시트를 불러오는 중</span>
              <span className="tabular-nums text-muted-foreground">
                {progress.done.toLocaleString()} / {progress.total.toLocaleString()} 블록 · {progress.pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated-2)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-150"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              큰 시트는 시간이 걸릴 수 있어요. 변환을 중단하지 않고 계속 진행합니다.
            </div>
          </div>
        )}

        {report && (
          <div
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-sm leading-relaxed"
            data-testid="import-result"
          >
            <div className="mb-1 font-semibold">변환 결과</div>
            <div>
              HTML 구조화: <span className="tabular-nums">{report.matched}/{report.total}</span> ({report.coverage}%) · 원본 보존{' '}
              <span className="tabular-nums">{report.rawHtml}</span>개
            </div>
            <div>
              CSS 구조화: <span className="tabular-nums">{report.cssMatched}/{report.cssTotal}</span> ({report.cssCoverage}%) · 원본 보존{' '}
              <span className="tabular-nums">{report.rawCss}</span>개 · 번역 키{' '}
              <span className="tabular-nums">{report.i18nKeys}</span>
            </div>
            <div>
              HTML + CSS 전체 구조화 일치율: <span className="tabular-nums">{report.structuredCoverage}%</span>
            </div>
            {report.rawCss > 0 && (
              <div className="mt-1 text-amber-500" data-testid="import-css-fallback-warning">
                CSS {report.rawCss}건은 현재 구조화 블록으로 분해하지 않고 원본 CSS 블록으로 보존했습니다. 화면은 유지되지만 해당 규칙은 블록 단위 편집이 제한됩니다.
              </div>
            )}
            {(report.pageJsBlocks > 0 || report.workerBlocks > 0) && (
              <div>
                JS 블록: 보관 <span className="tabular-nums">{report.pageJsBlocks}</span> · 자동 동작{' '}
                <span className="tabular-nums">{report.workerBlocks}</span>
              </div>
            )}
            {report.workerRawStatements > 0 && (
              <div className="mt-1 text-amber-500" data-testid="import-worker-raw-warning">
                자동 동작 코드 {report.workerRawStatements}곳은 아직 작은 블록으로 나누지 못해 원문으로 보관했습니다. 코드는 사라지지 않으며 자동 동작 탭에서 직접 확인할 수 있습니다.
              </div>
            )}
            {report.wideRowBundles > 0 && (
              <div className="mt-1 text-sky-500">
                반복 행 {report.wideRowBundles}묶음을 {report.wideRowCollapsed}개 블록으로 줄였습니다.
              </div>
            )}
            {report.sanitizeDropped > 0 && (
              <div className="mt-1 text-amber-500" data-testid="import-sanitize-warning">
                보안을 위해 브라우저에서 자동 실행되는 코드 {report.sanitizeDropped}개를 제거했습니다.
              </div>
            )}
            {report.templateMarkerCount > 0 && (
              <div className="mt-1 text-amber-500" data-testid="import-template-warning">
                확장되지 않은 템플릿 구문 {report.templateMarkerCount}건을 발견했습니다. 최종 HTML로 변환한 뒤 사용하는 것을 권장합니다.
              </div>
            )}
            {report.warnings > 0 && (
              <details className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2 text-amber-500" data-testid="import-warning-details">
                <summary className="cursor-pointer font-medium">확인할 항목 {report.warnings}건</summary>
                <ul className="mt-2 space-y-1 pl-4 text-xs leading-relaxed">
                  {report.warningDetails.map((warning, index) => (
                    <li key={`${warning.workspace ?? 'general'}-${warning.severity}-${index}`}>
                      {warning.message}
                    </li>
                  ))}
                </ul>
                {report.warnings > report.warningDetails.length && (
                  <div className="mt-1 text-xs">나머지 항목은 내보내기 전에 원본과 결과를 함께 확인하세요.</div>
                )}
              </details>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={handleReset} disabled={busy}>
            초기화
          </Button>
          <Button type="button" onClick={handleImport} disabled={busy || !anyInput} data-testid="import-submit">
            {busy ? (progress ? `${progress.pct}% 불러오는 중...` : '변환 중...') : '블록으로 변환하기'}
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
  const hasRisk = result.externalRefs > 0 || result.relativeRefs > 0 || result.placeholderRiskRefs > 0;
  const draftableRefs = result.refs.filter((ref) => ref.kind !== 'data-url').length;

  return (
    <section
      className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 text-sm"
      data-testid="import-asset-preflight"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">이미지·글꼴 미리 확인</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            시트의 이미지·글꼴 주소를 확인합니다. Roll20에서 다시 불러올 때 표시되지 않을 수 있는 주소가 있으면 알려드립니다.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            hasRisk
              ? 'border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] text-[var(--warning)]'
              : 'border-[color-mix(in_srgb,var(--success)_35%,transparent)] bg-[var(--success-soft)] text-[var(--success)]'
          }`}
          data-testid="import-asset-preflight-status"
        >
          {hasRisk ? '확인 필요' : '외부 자산 없음'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ImportAssetMetric label="외부 URL" value={result.externalRefs} />
        <ImportAssetMetric label="상대 경로" value={result.relativeRefs} />
        <ImportAssetMetric label="Roll20 프록시" value={result.roll20ProxyRefs} />
        <ImportAssetMetric label="Imgur 페이지" value={result.imgurPageRefs} />
        <ImportAssetMetric label="placeholder 위험" value={result.placeholderRiskRefs} />
        <ImportAssetMetric label="데이터 URL" value={result.dataRefs} />
        <ImportAssetMetric label="HTTP URL" value={result.insecureHttpRefs} />
        <ImportAssetMetric label="직링크 후보" value={result.canonicalDirectRefs} />
        <ImportAssetMetric label="Imgur 직링크" value={result.imgurDirectCandidateRefs} />
      </div>
      {hasRisk ? (
        <div className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[var(--warning-soft)] px-3 py-2.5 text-xs leading-relaxed text-foreground">
          실제 Roll20와 같은 화면을 확인하려면 자산이 로드되는지 먼저 봐야 합니다. 삭제됐거나 막힌 URL은 내보내기의 자산 교체 목록에서 사용자 소유 URL로 직접 바꿔 주세요.
          {result.canonicalDirectRefs > 0 ? (
            <span className="mt-1 block" data-testid="import-asset-canonical-candidates">
              교체 초안에 HTTPS 직접 후보 {result.canonicalDirectRefs}개를 담았습니다. 후보 URL의 권한과 로딩 상태를 확인한 뒤 사용해야 합니다.
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
              className="mt-2 h-8 px-3 text-xs"
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
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated-2)] px-2.5 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}

export default ImportDialog;

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

import { useState, type ChangeEvent } from 'react';
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
import { getBlocklyAdapter } from '@/lib/blockly/adapter';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = 'html' | 'css' | 'i18n';

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [tab, setTab] = useState<Tab>('html');
  const [htmlText, setHtmlText] = useState('');
  const [cssText, setCssText] = useState('');
  const [i18nText, setI18nText] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<null | {
    coverage: number;
    matched: number;
    total: number;
    rawHtml: number;
    cssMatched: number;
    cssTotal: number;
    i18nKeys: number;
    warnings: number;
    sanitizeDropped: number;
  }>(null);
  const [progress, setProgress] = useState<null | { done: number; total: number; pct: number }>(null);

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
      });
      const adapter = getBlocklyAdapter();
      const ws = useWorkspaceStore.getState();
      // Reset before hydrate to avoid duplicate top blocks.
      ws.resetWorkspace('html');
      ws.resetWorkspace('css');
      ws.resetWorkspace('i18n');

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
            toast.loading(`${done.toLocaleString()} / ${total.toLocaleString()} 블록 적용 중… ${pct}%`, {
              id: PROGRESS_TOAST_ID,
            });
          }
        },
      });
      adapter.hydrateFromXml('css', result.css);
      adapter.hydrateFromXml('i18n', result.i18n);
      // chunked 토스트 정리.
      if (htmlTotal >= PROGRESS_THRESHOLD) {
        toast.dismiss(PROGRESS_TOAST_ID);
      }
      setProgress(null);
      const htmlBlocks = adapter.getWorkspace('html')?.getAllBlocks(false).length ?? 0;
      const cssBlocks = adapter.getWorkspace('css')?.getAllBlocks(false).length ?? 0;
      const i18nBlocks = adapter.getWorkspace('i18n')?.getAllBlocks(false).length ?? 0;
      ws.setXmlCache('html', result.html, htmlBlocks);
      ws.setXmlCache('css', result.css, cssBlocks);
      ws.setXmlCache('i18n', result.i18n, i18nBlocks);
      ws.markSaved('html');
      ws.markSaved('css');
      ws.markSaved('i18n');
      setReport({
        coverage: result.stats.coverage,
        matched: result.stats.htmlMatched,
        total: result.stats.htmlTotal,
        rawHtml: result.stats.htmlRawFallback,
        cssMatched: result.stats.cssMatched,
        cssTotal: result.stats.cssTotal,
        i18nKeys: result.stats.i18nKeys,
        warnings: result.warnings.length,
        sanitizeDropped: result.stats.sanitizeDropped,
      });
      if (result.stats.sanitizeDropped > 0) {
        toast.warning(
          `보안상 인라인 이벤트 핸들러 ${result.stats.sanitizeDropped}개 제거됨 (onclick 등 XSS 위험 attr)`,
          { duration: 4500 },
        );
      }
      toast.success(
        `불러오기 완료 — 매칭 ${result.stats.htmlMatched}/${result.stats.htmlTotal} (${result.stats.coverage}%) · raw fallback ${result.stats.htmlRawFallback}`,
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

  const anyInput = !!(htmlText.trim() || cssText.trim() || i18nText.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>외부 시트 불러오기</DialogTitle>
          <DialogDescription>
            HTML / CSS / translation 텍스트를 입력하면 130 블록 카탈로그로 자동 매칭해 워크스페이스에 박아 줍니다. 매칭 안 되는 패턴은 raw 블록으로 fallback.
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
              className="text-xs"
              aria-label="HTML 파일 업로드"
            />
            <textarea
              value={htmlText}
              onChange={(e) => setHtmlText(e.target.value)}
              placeholder="<input type='text' name='attr_character_name'> ... 같은 HTML 붙여넣기."
              className="h-56 w-full resize-y rounded border border-border bg-[var(--bg-elevated)] p-2 font-mono text-[12px]"
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="css" className="mt-3 space-y-2">
            <input
              type="file"
              accept=".css,text/css"
              onChange={handleFile(setCssText)}
              className="text-xs"
              aria-label="CSS 파일 업로드"
            />
            <textarea
              value={cssText}
              onChange={(e) => setCssText(e.target.value)}
              placeholder=".sheet-header { color: red; } ... CSS 붙여넣기."
              className="h-56 w-full resize-y rounded border border-border bg-[var(--bg-elevated)] p-2 font-mono text-[12px]"
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="i18n" className="mt-3 space-y-2">
            <input
              type="file"
              accept=".json,.txt,application/json,text/plain"
              onChange={handleFile(setI18nText)}
              className="text-xs"
              aria-label="번역 파일 업로드"
            />
            <textarea
              value={i18nText}
              onChange={(e) => setI18nText(e.target.value)}
              placeholder='{"hello":"안녕"} 또는 key=value 줄 형식.'
              className="h-56 w-full resize-y rounded border border-border bg-[var(--bg-elevated)] p-2 font-mono text-[12px]"
              spellCheck={false}
            />
          </TabsContent>
        </Tabs>

        {progress && progress.total > 0 && (
          <div
            className="rounded border border-border bg-[var(--bg-elevated)] p-3 text-[12px] leading-relaxed"
            role="status"
            aria-live="polite"
            data-testid="import-progress"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">큰 시트 적용 중…</span>
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
              화면이 잠시 끊겨도 정상입니다 — 진행되는 동안 다른 영역은 응답합니다.
            </div>
          </div>
        )}

        {report && (
          <div className="rounded border border-border bg-[var(--bg-elevated)] p-3 text-[12px] leading-relaxed">
            <div className="font-medium mb-1">매칭 결과</div>
            <div>
              HTML 매칭: <span className="tabular-nums">{report.matched}/{report.total}</span>
              {' '}({report.coverage}%)
              {' · '}raw fallback <span className="tabular-nums">{report.rawHtml}</span>
            </div>
            <div>
              CSS 규칙: <span className="tabular-nums">{report.cssMatched}/{report.cssTotal}</span>
              {' · '}번역 키 <span className="tabular-nums">{report.i18nKeys}</span>
            </div>
            {report.sanitizeDropped > 0 && (
              <div className="mt-1 text-amber-500" data-testid="import-sanitize-warning">
                보안상 {report.sanitizeDropped}개의 인라인 이벤트 핸들러(onclick 등)가 제거되었습니다 — XSS 방지.
              </div>
            )}
            {report.warnings > 0 && (
              <div className="mt-1 text-amber-500">
                경고 {report.warnings}건 — 일부 패턴은 raw 블록으로 박혔습니다.
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleReset} disabled={busy}>
            지우기
          </Button>
          <Button onClick={handleImport} disabled={busy || !anyInput}>
            {busy ? (progress ? `${progress.pct}% 적용 중…` : '변환 중…') : '변환 시작'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportDialog;

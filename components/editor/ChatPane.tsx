'use client';

import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeTranslationForRoll20 } from '@/lib/export/payload';
import { useChatStore, type ChatRoll } from '@/lib/stores/chatStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import { autoPrefixCssClasses } from '@/lib/preview/prefix';
import type {
  ChatTextResult,
  ErrorResult,
  RollDetail,
  RolltemplateResult,
} from '@/lib/dice/executor';
import {
  defaultRolltemplateBody,
  extractRolltemplateBody,
  renderTemplateBody,
} from '@/lib/dice/rolltemplateRender';

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function safeRolltemplateClass(name: string): string {
  const safe = name.replace(/[^A-Za-z0-9_-]/g, '');
  return `sheet-rolltemplate-${safe || 'default'}`;
}

function extractRolltemplateCss(css: string): string {
  const prefixedCss = autoPrefixCssClasses(css);
  const matches = prefixedCss.match(/[^{}]*sheet-rolltemplate[^{}]*\{[^{}]*\}/g);
  return matches ? rewriteRoll20AssetUrls(matches.join('\n')) : '';
}

function rewriteRoll20AssetUrls(css: string): string {
  return css.replace(/url\s*\(([^)]+)\)/gi, (_full, rawUrl: string) => {
    const normalized = String(rawUrl).trim().replace(/^["']|["']$/g, '');
    if (!/^https?:\/\//i.test(normalized)) return '';
    if (
      normalized.startsWith('https://imgsrv.roll20.net/') ||
      normalized.startsWith('https://s3.amazonaws.com/files.d20.io') ||
      normalized.startsWith('https://files.d20.io') ||
      normalized.startsWith('https://app.roll20.net/images/')
    ) {
      return `url("${normalized}")`;
    }
    return `url("https://imgsrv.roll20.net/?src=${encodeURIComponent(normalized)}")`;
  });
}

function parseTranslations(raw: string): Record<string, string> {
  const text = normalizeTranslationForRoll20(String(raw ?? '')).trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

const roll20ChatShellCss = `
.r20-chat-pane {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
}
.r20-chat-pane .textchatcontainer {
  font-synthesis: style;
  text-rendering: optimizeSpeed;
  padding: 0;
  gap: 0;
}
.r20-chat-pane .textchatcontainer .content {
  line-height: 1.25em;
  font-size: 1.05em;
  overflow-wrap: anywhere;
  word-wrap: break-word;
}
.r20-chat-pane .textchatcontainer .tstamp {
  display: none;
  font-size: 0.8em;
  color: #666;
  padding: 0;
  margin: -4px 0 2px;
  position: relative;
  left: -5px;
  line-height: 1em;
}
.r20-chat-pane .textchatcontainer.withtimestamps .message .tstamp {
  display: block;
}
.r20-chat-pane .textchatcontainer .by {
  font-weight: 700;
  position: relative;
  left: -5px;
}
.r20-chat-pane .textchatcontainer .avatar {
  position: absolute;
  top: 4px;
  left: 5px;
  width: 28px;
  height: 28px;
}
.r20-chat-pane .textchatcontainer .avatar::before {
  content: "";
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 2px;
  background: #c8c8c8;
}
.r20-chat-pane .textchatcontainer .message {
  position: relative;
  margin: 0;
  padding-left: 45px;
  padding-right: 16px;
  padding-bottom: 7px;
  background: #f1f1f1;
  color: #333;
  font-size: 13px;
  line-height: 18px;
}
.r20-chat-pane .textchatcontainer.withoutavatars .message {
  padding-left: 15px;
}
.r20-chat-pane .textchatcontainer .message.you {
  background: #d3e5f5;
}
.r20-chat-pane .textchatcontainer .message.error {
  background: #ffbaba;
  color: #333;
}
.r20-chat-pane .textchatcontainer .message .spacer {
  height: 2px;
  margin-left: -45px;
  margin-right: -15px;
  margin-bottom: 7px;
  background: #d7d7d7;
}
.r20-chat-pane .textchatcontainer.withoutavatars .message .spacer {
  margin-left: -15px;
}
.r20-chat-pane .textchatcontainer .message.you .spacer {
  background: #b1d9fa;
}
.r20-chat-pane .r20-chat-card-group {
  display: block;
  width: 340px;
  min-width: 0;
}
.r20-chat-pane .r20-chat-card-group .message + .message {
  margin-top: 0;
}
.r20-chat-pane .r20-chat-card-group .message {
  box-sizing: border-box;
  width: 340px;
  min-width: 0;
}
.r20-chat-pane .r20-chat-card-group [class*="sheet-rolltemplate-"] {
  box-sizing: border-box;
}
.r20-chat-pane .textchatcontainer .inlinerollresult {
  background-color: #fef68e;
  border: 2px solid #fef68e;
  padding: 0 3px;
  font-weight: 700;
  cursor: help;
  font-size: 1.1em;
}
.r20-chat-pane .textchatcontainer .inlinerollresult.fullcrit {
  border-color: #3fb315;
}
.r20-chat-pane .textchatcontainer .inlinerollresult.fullfail {
  border-color: #b31515;
}
.r20-chat-pane .sheet-rolltemplate-default table {
  width: 100%;
  background-color: #fff;
  border: 1px solid rgba(112, 32, 130, 1);
}
.r20-chat-pane .sheet-rolltemplate-default caption {
  background-color: rgba(112, 32, 130, 1);
  color: #fff;
  font-family: "Helvetica Neue", Helvetica, sans-serif;
  font-weight: 300;
  font-size: 1.1em;
  padding: 5px;
}
.r20-chat-pane .sheet-rolltemplate-default td {
  padding: 5px;
  line-height: 1.4em;
  vertical-align: top;
}
.r20-chat-pane .sheet-rolltemplate-default td:first-child {
  font-weight: 700;
  text-align: right;
  min-width: 50px;
  padding-right: 10px;
}
.r20-chat-pane .sheet-rolltemplate-default tr:nth-child(even) {
  background-color: #eee;
}
`;

function DiceBreakdown({ detail }: { detail: RollDetail }) {
  if (!detail.dice.length) {
    return (
      <span className="text-[var(--fg-muted)] text-xs">
        = <strong className="text-foreground text-sm">{detail.total}</strong>
      </span>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {detail.dice.map((d, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-[var(--fg-muted)]">+</span>}
          <span className="text-[var(--fg-muted)]">
            {d.count}d{d.sides}:
          </span>
          {d.raw.map((v, j) => {
            const kept = d.kept.includes(v);
            const critEdge = d.sides === 20 && v === 20;
            const fumbleEdge = d.sides === 20 && v === 1;
            return (
              <span
                key={j}
                className={[
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded px-1 text-[11px] font-mono',
                  kept
                    ? 'bg-[var(--bg-elevated-2)] text-foreground'
                    : 'line-through text-[var(--fg-muted)]',
                  critEdge && kept && 'ring-1 ring-green-500 text-green-400',
                  fumbleEdge && kept && 'ring-1 ring-red-500 text-red-400',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {v}
              </span>
            );
          })}
        </span>
      ))}
      <span className="text-[var(--fg-muted)]">=</span>
      <strong className="text-foreground text-sm">{detail.total}</strong>
    </div>
  );
}

function CardExpr({ detail, expression }: { detail: RollDetail; expression: string }) {
  const missing = Object.entries(detail.resolvedAttrs)
    .filter(([, v]) => v === undefined)
    .map(([k]) => k);
  return (
    <>
      <div className="font-mono text-[11px] text-[var(--fg-muted)] mb-1.5 break-all">
        {expression}
      </div>
      <DiceBreakdown detail={detail} />
      {missing.length > 0 && (
        <div className="mt-1.5 text-[11px] text-amber-400">
          아직 값이 없는 attr: {missing.map((m) => `@{${m}}`).join(', ')}
        </div>
      )}
      {detail.isCrit && (
        <div className="mt-1.5 text-[11px] font-semibold text-green-400">
          크리티컬 (d20 = 20)
        </div>
      )}
      {detail.isFumble && (
        <div className="mt-1.5 text-[11px] font-semibold text-red-400">
          펌블 (d20 = 1)
        </div>
      )}
    </>
  );
}

function CardRolltemplate({
  result,
  emittedHtml,
  translations,
}: {
  result: RolltemplateResult;
  emittedHtml: string;
  translations: Record<string, string>;
}) {
  const customBody = useMemo(
    () => extractRolltemplateBody(emittedHtml, result.templateName),
    [emittedHtml, result.templateName],
  );
  const innerHtml = customBody
    ? renderTemplateBody(customBody, result.fields, {
        anyCrit: result.anyCrit,
        anyFumble: result.anyFumble,
      }, translations)
    : defaultRolltemplateBody(result);

  return (
    <div>
      <div
        className={[
          'rt-card text-xs',
          safeRolltemplateClass(result.templateName),
          customBody ? '' : 'rounded border border-[#c8c8c8] bg-white p-2 text-[#222]',
        ].join(' ')}
        dangerouslySetInnerHTML={{ __html: innerHtml }}
      />
      {result.anyCrit && (
        <div className="mt-1.5 text-[11px] font-semibold text-green-600">
          크리티컬 포함
        </div>
      )}
      {result.anyFumble && (
        <div className="mt-1.5 text-[11px] font-semibold text-red-600">
          펌블 포함
        </div>
      )}
    </div>
  );
}

function CardError({ error }: { error: ErrorResult }) {
  return (
    <div className="rounded border border-red-500/40 bg-red-500/5 p-2 text-xs text-red-400">
      <div className="font-semibold mb-1">굴림 실패</div>
      <div>{error.message}</div>
      {error.raw && (
        <div className="mt-1 font-mono text-[10px] text-[var(--fg-muted)]">{error.raw}</div>
      )}
    </div>
  );
}

function CardChat({ chat }: { chat: ChatTextResult }) {
  return <div className="text-xs text-foreground">{chat.text}</div>;
}

function RollCard({
  card,
  emittedHtml,
  translations,
}: {
  card: ChatRoll;
  emittedHtml: string;
  translations: Record<string, string>;
}) {
  const r = card.result;
  const isRolltemplate = r.kind === 'rolltemplate';
  if (isRolltemplate) {
    return (
      <div
        data-r20-chat-card
        data-r20-chat-kind={r.kind}
        data-r20-chat-rolltemplate="1"
        className="r20-chat-card-group"
      >
        <div className="message general you">
          <div className="spacer" aria-hidden="true" />
          <div className="avatar" aria-hidden="true" />
          <time className="tstamp">{formatTime(card.ts)}</time>
          <span className="by">{card.sender || 'Sheet'}:</span>
        </div>
        <div className="message general you">
          <CardRolltemplate result={r} emittedHtml={emittedHtml} translations={translations} />
        </div>
      </div>
    );
  }
  return (
    <div
      data-r20-chat-card
      data-r20-chat-kind={r.kind}
      data-r20-chat-rolltemplate={isRolltemplate ? '1' : undefined}
      data-r20-chat-crit={r.kind === 'expr' && r.isCrit ? '1' : undefined}
      data-r20-chat-fumble={r.kind === 'expr' && r.isFumble ? '1' : undefined}
      className={[
        'message general',
        isRolltemplate ? 'text-[#222]' : 'rounded border bg-[var(--bg-elevated)]',
        !isRolltemplate &&
          (r.kind === 'expr' && r.isCrit
            ? 'border-green-500/40 bg-green-500/5'
            : r.kind === 'expr' && r.isFumble
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-border'),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="spacer" aria-hidden="true" />
      <time className="tstamp">{formatTime(card.ts)}</time>
      <div className="by">{card.sender || 'Sheet'}:</div>
      <div className="content">
        {r.kind === 'expr' && <CardExpr detail={r} expression={card.expression} />}
        {r.kind === 'error' && <CardError error={r} />}
        {r.kind === 'chat' && <CardChat chat={r} />}
      </div>
    </div>
  );
}

export default function ChatPane() {
  const rolls = useChatStore((s) => s.rolls);
  const clear = useChatStore((s) => s.clear);
  const emittedHtml = useWorkspaceStore((s) => s.emitCache.html);
  const emittedCss = useWorkspaceStore((s) => s.emitCache.css);
  const emittedI18n = useWorkspaceStore((s) => s.emitCache.i18n);
  const rolltemplateCss = useMemo(() => extractRolltemplateCss(emittedCss), [emittedCss]);
  const translations = useMemo(() => parseTranslations(emittedI18n), [emittedI18n]);

  return (
    <div className="r20-chat-pane flex h-full flex-col min-h-0">
      <style data-r20-chat-shell-css dangerouslySetInnerHTML={{ __html: roll20ChatShellCss }} />
      {rolltemplateCss.trim() && (
        <style
          data-r20-chat-user-css
          dangerouslySetInnerHTML={{ __html: rolltemplateCss }}
        />
      )}
      <div className="h-9 shrink-0 border-b border-border px-3 flex items-center justify-between">
        <div className="text-[11px] font-medium text-[var(--fg-muted)]">
          채팅 ({rolls.length})
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          disabled={rolls.length === 0}
          onClick={() => clear()}
          aria-label="채팅 지우기"
          data-testid="chat-clear"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          지우기
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div
          className="textchatcontainer flex flex-col"
          data-testid="chat-list"
        >
          {rolls.length === 0 ? (
            <div className="text-center text-[11px] text-[var(--fg-muted)] py-8">
              미리보기에서 굴림 버튼을 누르면 결과가 여기에 표시됩니다.
              <br />
              <span className="text-[10px] opacity-70">
                시트의 <code>type=&quot;roll&quot;</code> 버튼을 눌러보세요.
              </span>
            </div>
          ) : (
            rolls.map((card) => (
              <RollCard
                key={card.id}
                card={card}
                emittedHtml={emittedHtml}
                translations={translations}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

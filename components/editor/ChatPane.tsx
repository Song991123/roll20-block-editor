'use client';

import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore, type ChatRoll } from '@/lib/stores/chatStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
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
  const matches = css.match(/[^{}]*sheet-rolltemplate[^{}]*\{[^{}]*\}/g);
  return matches ? matches.join('\n') : '';
}

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
          미정 attr: {missing.map((m) => `@{${m}}`).join(', ')}
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
}: {
  result: RolltemplateResult;
  emittedHtml: string;
}) {
  const customBody = useMemo(
    () => extractRolltemplateBody(emittedHtml, result.templateName),
    [emittedHtml, result.templateName],
  );
  const innerHtml = customBody
    ? renderTemplateBody(customBody, result.fields, {
        anyCrit: result.anyCrit,
        anyFumble: result.anyFumble,
      })
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

function RollCard({ card, emittedHtml }: { card: ChatRoll; emittedHtml: string }) {
  const r = card.result;
  const isRolltemplate = r.kind === 'rolltemplate';
  return (
    <div
      data-r20-chat-card
      data-r20-chat-kind={r.kind}
      data-r20-chat-rolltemplate={isRolltemplate ? '1' : undefined}
      data-r20-chat-crit={r.kind === 'expr' && r.isCrit ? '1' : undefined}
      data-r20-chat-fumble={r.kind === 'expr' && r.isFumble ? '1' : undefined}
      className={[
        'message general',
        isRolltemplate
          ? 'w-full max-w-[280px] self-center text-[#222]'
          : 'rounded border bg-[var(--bg-elevated)]',
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
      <div className="spacer rounded-sm border border-[#b7b7b7] bg-[#f7f7f7] p-2 shadow-sm">
        <div className="by flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-foreground/80">
            {card.sender || 'Sheet'}
          </span>
          <time className="tstamp text-[10px] text-[var(--fg-muted)] font-mono">
            {formatTime(card.ts)}
          </time>
        </div>
        {r.kind === 'expr' && <CardExpr detail={r} expression={card.expression} />}
        {r.kind === 'rolltemplate' && (
          <CardRolltemplate result={r} emittedHtml={emittedHtml} />
        )}
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
  const rolltemplateCss = useMemo(() => extractRolltemplateCss(emittedCss), [emittedCss]);

  return (
    <div className="r20-chat-pane flex h-full flex-col min-h-0">
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
          className="textchatcontainer withoutavatars p-2 flex flex-col gap-2"
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
              <RollCard key={card.id} card={card} emittedHtml={emittedHtml} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

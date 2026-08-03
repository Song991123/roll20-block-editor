'use client';

import { useMemo, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeTranslationForRoll20 } from '@/lib/export/payload';
import { useChatStore, type ChatRoll } from '@/lib/stores/chatStore';
import { useWorkspaceStore } from '@/lib/stores/workspaceStore';
import {
  canEnableChatDiagnostics,
  CHAT_DIAGNOSTICS_STORAGE_KEY,
} from '@/lib/dice/chatDiagnostics';
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
import {
  extractRolltemplateCss,
  type RolltemplateFontPolicy,
} from '@/lib/dice/rolltemplateCss';
import { ROLL20_CHAT_SHELL_WIDTH } from '@/lib/dice/roll20ChatGeometry';

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

type ChatFontPolicy = RolltemplateFontPolicy;
type ChatTextPolicy = 'default' | 'roll20-auto-aa';
type ChatShadowPolicy = 'default' | 'no-template-shadow';
type ChatGeometryPolicy =
  | 'default'
  | 'tight-cell-spacing'
  | 'roll20-chat-shell-width-340'
  | 'table-scale-x'
  | 'roll20-message-padding'
  | 'roll20-break-word'
  | 'roll20-intrinsic-spacing'
  | 'roll20-border-spacing'
  | 'roll20-letter-spacing';
type ChatTypographyPolicy =
  | 'default'
  | 'roll20-shell-typography'
  | 'roll20-template-typography'
  | 'roll20-cell-metrics';
type ChatPaintPolicy =
  | 'default'
  | 'roll20-dim-background'
  | 'roll20-dim-brightness'
  | 'roll20-dim-saturate'
  | 'roll20-edge-shadow';

function isChatDiagnosticMode(): boolean {
  // Candidate CSS is useful while measuring Roll20, but must never become a
  // user-facing production override through a stale localStorage key.
  return typeof window !== 'undefined'
    && canEnableChatDiagnostics(
      process.env.NODE_ENV,
      window.localStorage.getItem(CHAT_DIAGNOSTICS_STORAGE_KEY),
    );
}

function currentChatFontPolicy(): ChatFontPolicy {
  if (!isChatDiagnosticMode()) return 'default';
  const value = window.localStorage.getItem('__r20ChatFontPolicy');
  if (
    value === 'roll20-chat-fallback' ||
    value === 'roll20-sandbox-font-proxy'
  ) return value;
  return 'default';
}

function currentChatTextPolicy(): ChatTextPolicy {
  if (!isChatDiagnosticMode()) return 'default';
  return window.localStorage.getItem('__r20ChatTextPolicy') === 'roll20-auto-aa'
    ? 'roll20-auto-aa'
    : 'default';
}

function currentChatShadowPolicy(): ChatShadowPolicy {
  if (!isChatDiagnosticMode()) return 'default';
  return window.localStorage.getItem('__r20ChatShadowPolicy') === 'no-template-shadow'
    ? 'no-template-shadow'
    : 'default';
}

function currentChatGeometryPolicy(): ChatGeometryPolicy {
  if (!isChatDiagnosticMode()) return 'default';
  const value = window.localStorage.getItem('__r20ChatGeometryPolicy');
  if (
    value === 'tight-cell-spacing' ||
    value === 'roll20-chat-shell-width-340' ||
    value === 'table-scale-x' ||
    value === 'roll20-message-padding' ||
    value === 'roll20-break-word' ||
    value === 'roll20-intrinsic-spacing' ||
    value === 'roll20-border-spacing' ||
    value === 'roll20-letter-spacing'
  ) return value;
  return 'default';
}

function currentChatTypographyPolicy(): ChatTypographyPolicy {
  if (!isChatDiagnosticMode()) return 'default';
  const value = window.localStorage.getItem('__r20ChatTypographyPolicy');
  if (
    value === 'roll20-shell-typography' ||
    value === 'roll20-template-typography' ||
    value === 'roll20-cell-metrics'
  ) return value;
  return 'default';
}

function currentChatPaintPolicy(): ChatPaintPolicy {
  if (!isChatDiagnosticMode()) return 'default';
  const value = window.localStorage.getItem('__r20ChatPaintPolicy');
  if (
    value === 'roll20-dim-background' ||
    value === 'roll20-dim-brightness' ||
    value === 'roll20-dim-saturate' ||
    value === 'roll20-edge-shadow'
  ) return value;
  return 'default';
}

export function parseRolltemplateTranslations(raw: string): Record<string, string> {
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
@font-face {
  font-family: "Proxima Nova";
  src: url("https://use.typekit.net/af/efe4a5/00000000000000007735e609/30/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n4&v=3") format("woff2");
  font-display: auto;
  font-style: normal;
  font-weight: 400;
}
@font-face {
  font-family: "Proxima Nova";
  src: url("https://use.typekit.net/af/2555e1/00000000000000007735e603/30/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff2");
  font-display: auto;
  font-style: normal;
  font-weight: 700;
}
.r20-chat-pane,
.r20-chat-pane .textchatcontainer {
  /* Match the Roll20 chat shell's measured default typography. */
  color: rgb(64, 64, 64);
  font-family: "Proxima Nova", ProximaNova-Regular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  font-size: 13px;
  line-height: 18.5714px;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
}
.r20-chat-pane .textchatcontainer {
  font-synthesis: style;
  text-rendering: optimizeSpeed;
  background: transparent;
  padding: 0;
  gap: 0;
}
.r20-chat-pane[data-r20-chat-text-policy="roll20-auto-aa"] .textchatcontainer {
  text-rendering: auto;
  -webkit-font-smoothing: auto;
}
.r20-chat-pane[data-r20-chat-shadow-policy="no-template-shadow"] [class*="sheet-rolltemplate-"],
.r20-chat-pane[data-r20-chat-shadow-policy="no-template-shadow"] [class*="sheet-rolltemplate-"] * {
  text-shadow: none !important;
}
.r20-chat-pane[data-r20-chat-geometry-policy="tight-cell-spacing"] [class*="sheet-rolltemplate-"] td,
.r20-chat-pane[data-r20-chat-geometry-policy="tight-cell-spacing"] [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-geometry-policy="tight-cell-spacing"] [class*="sheet-rolltemplate-"] .inlinerollresult {
  letter-spacing: -0.075px !important;
}
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-chat-shell-width-340"] .r20-chat-card-group,
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-chat-shell-width-340"] .r20-chat-card-group .message {
  width: ${ROLL20_CHAT_SHELL_WIDTH}px;
}
.r20-chat-pane[data-r20-chat-geometry-policy="table-scale-x"] [class*="sheet-rolltemplate-"] table {
  transform: scaleX(0.981);
  transform-origin: left top;
}
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-message-padding"] .r20-chat-card-group .message {
  padding-right: 28px;
}
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-break-word"] .r20-chat-card-group [class*="sheet-rolltemplate-"],
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-break-word"] .r20-chat-card-group [class*="sheet-rolltemplate-"] * {
  overflow-wrap: break-word !important;
}
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-intrinsic-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table {
  border-spacing: 0 !important;
}
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-border-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table {
  border-spacing: 0 !important;
}
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-intrinsic-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table,
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-intrinsic-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-intrinsic-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  letter-spacing: normal !important;
}
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-letter-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table,
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-letter-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-geometry-policy="roll20-letter-spacing"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  letter-spacing: normal !important;
}
.r20-chat-pane[data-r20-chat-typography-policy="roll20-shell-typography"] .r20-chat-card-group [class*="sheet-rolltemplate-"],
.r20-chat-pane[data-r20-chat-typography-policy="roll20-shell-typography"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table {
  font-family: "Proxima Nova", ProximaNova-Regular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  font-size: 13.65px;
  letter-spacing: normal;
}
.r20-chat-pane[data-r20-chat-typography-policy="roll20-template-typography"] .r20-chat-card-group [class*="sheet-rolltemplate-"],
.r20-chat-pane[data-r20-chat-typography-policy="roll20-template-typography"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table,
.r20-chat-pane[data-r20-chat-typography-policy="roll20-template-typography"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-typography-policy="roll20-template-typography"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  color: rgb(64, 64, 64);
  font-family: "Proxima Nova", ProximaNova-Regular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  font-size: 13.65px;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
}
.r20-chat-pane[data-r20-chat-typography-policy="roll20-cell-metrics"] .r20-chat-card-group [class*="sheet-rolltemplate-"] {
  font-family: "Proxima Nova", ProximaNova-Regular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  font-size: 13.65px;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
}
.r20-chat-pane[data-r20-chat-typography-policy="roll20-cell-metrics"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table,
.r20-chat-pane[data-r20-chat-typography-policy="roll20-cell-metrics"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-typography-policy="roll20-cell-metrics"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  font-size: 13.65px;
  letter-spacing: normal;
  -webkit-font-smoothing: auto;
}
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-background"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table,
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-background"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-background"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  filter: brightness(0.965) saturate(0.985);
}
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-brightness"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table,
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-brightness"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-brightness"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  filter: brightness(0.965);
}
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-saturate"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table,
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-saturate"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-paint-policy="roll20-dim-saturate"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  filter: saturate(0.985);
}
.r20-chat-pane[data-r20-chat-paint-policy="roll20-edge-shadow"] .r20-chat-card-group [class*="sheet-rolltemplate-"] table {
  box-shadow:
    inset 1px 0 0 rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(0, 0, 0, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}
.r20-chat-pane[data-r20-chat-paint-policy="roll20-edge-shadow"] .r20-chat-card-group [class*="sheet-rolltemplate-"] caption,
.r20-chat-pane[data-r20-chat-paint-policy="roll20-edge-shadow"] .r20-chat-card-group [class*="sheet-rolltemplate-"] td {
  box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.08);
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
  width: ${ROLL20_CHAT_SHELL_WIDTH}px;
  min-width: 0;
}
.r20-chat-pane .r20-chat-card-group .message + .message {
  margin-top: 0;
}
.r20-chat-pane .r20-chat-card-group .message {
  box-sizing: border-box;
  width: ${ROLL20_CHAT_SHELL_WIDTH}px;
  min-width: 0;
}
.r20-chat-pane :where(.r20-chat-card-group [class*="sheet-rolltemplate-"]) {
  box-sizing: content-box;
  line-height: 17.0625px;
}
.r20-chat-pane :where(.r20-chat-card-group [class*="sheet-rolltemplate-"], .r20-chat-card-group [class*="sheet-rolltemplate-"] *) {
  box-sizing: content-box;
}
:where(.r20-chat-pane .textchatcontainer) .inlinerollresult {
  background-color: #fef68e;
  border: 2px solid #fef68e;
  padding: 0 3px;
  font-weight: 700;
  cursor: help;
  font-size: 1.1em;
}
:where(.r20-chat-pane .textchatcontainer) .inlinerollresult.fullcrit {
  border-color: #3fb315;
}
:where(.r20-chat-pane .textchatcontainer) .inlinerollresult.fullfail {
  border-color: #b31515;
}
:where(.r20-chat-pane) .sheet-rolltemplate-default table {
  width: 100%;
  background-color: #fff;
  border: 1px solid rgba(112, 32, 130, 1);
}
:where(.r20-chat-pane) .sheet-rolltemplate-default caption {
  background-color: rgba(112, 32, 130, 1);
  color: #fff;
  font-family: "Helvetica Neue", Helvetica, sans-serif;
  font-weight: 300;
  font-size: 1.1em;
  padding: 5px;
  text-align: left;
}
:where(.r20-chat-pane) .sheet-rolltemplate-default td {
  padding: 5px;
  line-height: 1.4em;
  vertical-align: top;
}
:where(.r20-chat-pane) .sheet-rolltemplate-default td:first-child {
  font-weight: 700;
  text-align: right;
  min-width: 50px;
  padding-right: 10px;
}
:where(.r20-chat-pane) .sheet-rolltemplate-default tr:nth-child(even) {
  background-color: #eee;
}
`;

export function RolltemplateRenderSurface({
  emittedCss,
  className = '',
  testId,
  children,
}: {
  emittedCss: string;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  const chatFontPolicy = currentChatFontPolicy();
  const chatTextPolicy = currentChatTextPolicy();
  const chatShadowPolicy = currentChatShadowPolicy();
  const chatGeometryPolicy = currentChatGeometryPolicy();
  const chatTypographyPolicy = currentChatTypographyPolicy();
  const chatPaintPolicy = currentChatPaintPolicy();
  const rolltemplateCss = useMemo(
    () => extractRolltemplateCss(emittedCss, chatFontPolicy),
    [emittedCss, chatFontPolicy],
  );

  return (
    <div
      className={`r20-chat-pane ${className}`.trim()}
      data-testid={testId}
      data-r20-chat-text-policy={chatTextPolicy}
      data-r20-chat-shadow-policy={chatShadowPolicy}
      data-r20-chat-geometry-policy={chatGeometryPolicy}
      data-r20-chat-typography-policy={chatTypographyPolicy}
      data-r20-chat-paint-policy={chatPaintPolicy}
    >
      <style data-r20-chat-shell-css dangerouslySetInnerHTML={{ __html: roll20ChatShellCss }} />
      {rolltemplateCss.trim() && (
        <style
          data-r20-chat-user-css
          dangerouslySetInnerHTML={{ __html: rolltemplateCss }}
        />
      )}
      {children}
    </div>
  );
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

export function RolltemplateCardContent({
  result,
  emittedHtml,
  translations,
  rootBlockId,
}: {
  result: RolltemplateResult;
  emittedHtml: string;
  translations: Record<string, string>;
  rootBlockId?: string | null;
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
  const rolltemplateClassName = customBody
    ? safeRolltemplateClass(result.templateName)
    : 'sheet-rolltemplate-default';

  return (
    <div>
      <div
        className={rolltemplateClassName}
        data-r20-block-id={rootBlockId || undefined}
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
          <RolltemplateCardContent result={r} emittedHtml={emittedHtml} translations={translations} />
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
  const translations = useMemo(() => parseRolltemplateTranslations(emittedI18n), [emittedI18n]);

  return (
    <RolltemplateRenderSurface emittedCss={emittedCss} className="flex h-full min-h-0 flex-col">
      <div className="h-11 shrink-0 border-b border-border px-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">
          굴림 기록 <span className="font-normal text-muted-foreground">({rolls.length})</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2.5 text-xs"
          disabled={rolls.length === 0}
          onClick={() => clear()}
          aria-label="굴림 기록 지우기"
          data-testid="chat-clear"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          지우기
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div
          className="textchatcontainer flex flex-col"
          data-testid="chat-list"
        >
          <div className="content">
            {rolls.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm leading-relaxed text-muted-foreground">
                아직 굴린 기록이 없어요.
                <br />
                미리보기 화면에서 시트의 굴림 버튼을 누르면
                <br />
                결과 말풍선이 여기에 차곡차곡 쌓여요.
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
        </div>
      </ScrollArea>
    </RolltemplateRenderSurface>
  );
}

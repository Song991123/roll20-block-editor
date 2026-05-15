/**
 * Dice executor — AST → 실제 굴림 결과.
 *
 * Anchor:
 *   - lib/dice/parser.ts (AST 정의)
 *   - docs/spec/12_roll20_output_spec.md §2 (sheet roll button value contract)
 *
 * 본 모듈은 parser 의 AST 를 실행한다.
 *   - dice → 난수 (default crypto.getRandomValues, fallback Math.random)
 *   - @{name} → AttrResolver lookup
 *   - ?{Prompt} → QueryResolver (default window.prompt)
 *
 * RollResult 는 ChatPane 카드 렌더 데이터.
 */

import type {
  Expr,
  ParseRoot,
  Rolltemplate,
  RolltemplateField,
  DiceModifier,
} from './parser';

export interface DiceRoll {
  count: number;
  sides: number;
  /** 실제 굴린 결과 (정확한 dice 수). */
  raw: number[];
  /** kept (kh/kl 등 modifier 적용 후 살아남은 값). */
  kept: number[];
  /** rerolled 표시 (UI). */
  rerolled: number[];
  /** kept 의 합. */
  subtotal: number;
}

export interface RollDetail {
  kind: 'expr';
  expression: string;
  /** rolled dice 각 그룹 (1d20+1d8 같이 여러 개 가능). */
  dice: DiceRoll[];
  /** 최종 총합 (modifier 포함). */
  total: number;
  /** d20 결과 20 — UI crit 강조. */
  isCrit: boolean;
  /** d20 결과 1 — UI fumble 강조. */
  isFumble: boolean;
  /** resolved attrs (이름 → 값). undefined 면 미정의. */
  resolvedAttrs: Record<string, number | undefined>;
  /** 사용된 query 응답 (이름 → 응답). */
  queries: Record<string, string>;
}

export interface RolltemplateFieldResult {
  key: string;
  raw: string;
  /** field 가 expression 이면 RollDetail, literal 이면 null. */
  detail: RollDetail | null;
  /** 디스플레이용 텍스트 — expr 이면 total, literal 이면 raw. */
  text: string;
}

export interface RolltemplateResult {
  kind: 'rolltemplate';
  templateName: string;
  fields: RolltemplateFieldResult[];
  /** 모든 dice 의 isCrit/Fumble 집계. */
  anyCrit: boolean;
  anyFumble: boolean;
}

export interface ChatTextResult {
  kind: 'chat';
  text: string;
}

export interface ErrorResult {
  kind: 'error';
  message: string;
  raw: string;
}

export type RollResult = RollDetail | RolltemplateResult | ChatTextResult | ErrorResult;

// ---------- Resolvers ----------

export type AttrResolver = (name: string) => number | string | undefined;
export type QueryResolver = (prompt: string, fallback: string) => string;
export type RngFn = () => number;

const defaultRng: RngFn = () => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined') {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0]! / 0x100000000;
  }
  return Math.random();
};

function rollDie(sides: number, rng: RngFn): number {
  if (!Number.isFinite(sides) || sides < 1) return 0;
  return Math.floor(rng() * sides) + 1;
}

// ---------- 실행 컨텍스트 ----------

interface ExecCtx {
  rng: RngFn;
  attr: AttrResolver;
  query: QueryResolver;
  /** 누적 dice 그룹 (UI 표시용). */
  dice: DiceRoll[];
  resolvedAttrs: Record<string, number | undefined>;
  queries: Record<string, string>;
  diceTouched: boolean;
}

function newCtx(opts: {
  rng?: RngFn;
  attr?: AttrResolver;
  query?: QueryResolver;
}): ExecCtx {
  return {
    rng: opts.rng ?? defaultRng,
    attr: opts.attr ?? (() => undefined),
    query: opts.query ?? ((_p, f) => f),
    dice: [],
    resolvedAttrs: {},
    queries: {},
    diceTouched: false,
  };
}

function toNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return 0;
    const n = Number(s);
    if (Number.isFinite(n)) return n;
    // 표현식인 경우 — 재귀 파싱 (간단 case: '+3' 같은 modifier).
    // attr 값에 또 다른 attr 이 박힌 경우는 미지원 (1단계만).
    const match = s.match(/^[+\-]?\d+(\.\d+)?$/);
    if (match) return Number(s);
    return 0;
  }
  return 0;
}

function applyModifiers(dice: DiceRoll, mods: DiceModifier[], rng: RngFn): void {
  // reroll once first.
  for (const m of mods) {
    if (m.kind === 'r') {
      for (let i = 0; i < dice.raw.length; i++) {
        const v = dice.raw[i]!;
        let trigger = false;
        if (m.op === '<') trigger = v < m.n;
        else if (m.op === '>') trigger = v > m.n;
        else trigger = v === m.n;
        if (trigger) {
          dice.rerolled.push(v);
          const newV = rollDie(dice.sides, rng);
          dice.raw[i] = newV;
        }
      }
    }
  }
  // kh / kl
  let kept = [...dice.raw];
  for (const m of mods) {
    if (m.kind === 'kh') {
      const sorted = [...kept].sort((a, b) => b - a);
      kept = sorted.slice(0, Math.max(1, m.n));
    } else if (m.kind === 'kl') {
      const sorted = [...kept].sort((a, b) => a - b);
      kept = sorted.slice(0, Math.max(1, m.n));
    }
  }
  dice.kept = kept;
  dice.subtotal = kept.reduce((a, b) => a + b, 0);
}

function evalExpr(expr: Expr, ctx: ExecCtx): number {
  switch (expr.kind) {
    case 'num':
      return expr.value;
    case 'group':
      return evalExpr(expr.arg, ctx);
    case 'inline':
      return evalExpr(expr.arg, ctx);
    case 'neg':
      return -evalExpr(expr.arg, ctx);
    case 'bin': {
      const a = evalExpr(expr.lhs, ctx);
      const b = evalExpr(expr.rhs, ctx);
      switch (expr.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return b === 0 ? 0 : a / b;
      }
      return 0;
    }
    case 'fn': {
      const args = expr.args.map((a) => evalExpr(a, ctx));
      switch (expr.name) {
        case 'floor':
          return Math.floor(args[0] ?? 0);
        case 'ceil':
          return Math.ceil(args[0] ?? 0);
        case 'round':
          return Math.round(args[0] ?? 0);
        case 'abs':
          return Math.abs(args[0] ?? 0);
        case 'min':
          return args.length ? Math.min(...args) : 0;
        case 'max':
          return args.length ? Math.max(...args) : 0;
      }
      return 0;
    }
    case 'attr': {
      const raw = ctx.attr(expr.name);
      const n = raw === undefined ? undefined : toNum(raw);
      ctx.resolvedAttrs[expr.name] = n;
      return n ?? 0;
    }
    case 'query': {
      const ans = ctx.query(expr.prompt, expr.fallback);
      ctx.queries[expr.prompt] = ans;
      const n = toNum(ans);
      return n;
    }
    case 'dice': {
      ctx.diceTouched = true;
      const count = Math.max(0, Math.floor(evalExpr(expr.count, ctx)));
      const sides = Math.max(1, Math.floor(evalExpr(expr.sides, ctx)));
      const raw: number[] = [];
      for (let i = 0; i < count; i++) raw.push(rollDie(sides, ctx.rng));
      const dice: DiceRoll = {
        count,
        sides,
        raw,
        kept: [],
        rerolled: [],
        subtotal: 0,
      };
      applyModifiers(dice, expr.modifiers, ctx.rng);
      ctx.dice.push(dice);
      return dice.subtotal;
    }
  }
}

function exprText(expr: Expr): string {
  switch (expr.kind) {
    case 'num':
      return String(expr.value);
    case 'group':
      return `(${exprText(expr.arg)})`;
    case 'inline':
      return `[[${exprText(expr.arg)}]]`;
    case 'neg':
      return `-${exprText(expr.arg)}`;
    case 'bin':
      return `${exprText(expr.lhs)}${expr.op}${exprText(expr.rhs)}`;
    case 'fn':
      return `${expr.name}(${expr.args.map(exprText).join(',')})`;
    case 'attr':
      return `@{${expr.name}}`;
    case 'query':
      return `?{${expr.prompt}|${expr.fallback}}`;
    case 'dice': {
      const c = exprText(expr.count);
      const s = exprText(expr.sides);
      const mods = expr.modifiers
        .map((m) => {
          if (m.kind === 'kh') return `kh${m.n}`;
          if (m.kind === 'kl') return `kl${m.n}`;
          return `r${m.op}${m.n}`;
        })
        .join('');
      return `${c}d${s}${mods}`;
    }
  }
}

function detectCritFumble(detail: RollDetail): void {
  for (const d of detail.dice) {
    if (d.sides === 20) {
      for (const v of d.kept) {
        if (v === 20) detail.isCrit = true;
        if (v === 1) detail.isFumble = true;
      }
    }
  }
}

// ---------- 공개 API ----------

export function executeExpression(
  expr: Expr,
  opts: { rng?: RngFn; attr?: AttrResolver; query?: QueryResolver } = {},
): RollDetail {
  const ctx = newCtx(opts);
  const total = evalExpr(expr, ctx);
  const detail: RollDetail = {
    kind: 'expr',
    expression: exprText(expr),
    dice: ctx.dice,
    total,
    isCrit: false,
    isFumble: false,
    resolvedAttrs: ctx.resolvedAttrs,
    queries: ctx.queries,
  };
  detectCritFumble(detail);
  return detail;
}

export function executeRolltemplate(
  tpl: Rolltemplate,
  opts: { rng?: RngFn; attr?: AttrResolver; query?: QueryResolver } = {},
): RolltemplateResult {
  const fieldResults: RolltemplateFieldResult[] = tpl.fields.map(
    (f: RolltemplateField): RolltemplateFieldResult => {
      if (!f.expr) {
        return { key: f.key, raw: f.raw, detail: null, text: f.literal ?? f.raw };
      }
      const det = executeExpression(f.expr, opts);
      return {
        key: f.key,
        raw: f.raw,
        detail: det,
        text: String(det.total),
      };
    },
  );
  return {
    kind: 'rolltemplate',
    templateName: tpl.name,
    fields: fieldResults,
    anyCrit: fieldResults.some((f) => f.detail?.isCrit),
    anyFumble: fieldResults.some((f) => f.detail?.isFumble),
  };
}

export function executeRoot(
  root: ParseRoot,
  opts: { rng?: RngFn; attr?: AttrResolver; query?: QueryResolver } = {},
): RollResult {
  if (root.kind === 'rolltemplate') return executeRolltemplate(root, opts);
  if (root.kind === 'expr') return executeExpression(root.expr, opts);
  return { kind: 'chat', text: root.text };
}

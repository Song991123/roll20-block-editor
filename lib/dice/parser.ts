/**
 * Roll20 dice expression parser.
 *
 * Anchor:
 *   - Roll20 wiki: Dice Reference / Macros / Rolltemplates
 *   - docs/spec/12_roll20_output_spec.md §2 (sheet roll button value contract)
 *
 * 본 모듈은 사용자가 `<button type="roll" value="...">` 에 박은 표현식을
 * AST 로 파싱한다. 실행은 lib/dice/executor.ts.
 *
 * 지원 문법 (Roll20 spec 의 핵심 subset):
 *   - 기본 dice: 1d20 / 2d6 / 4d10
 *   - modifier 산술: 1d20+5, 2d6-1, 1d8*2, 1d4/2
 *   - 그룹: (1d6+2)*2
 *   - inline roll: [[ ... ]] (결과를 숫자처럼 박는 패턴)
 *   - dice modifier: kh1 (keep highest 1), kl1 (keep lowest 1), r<2 (reroll <2)
 *   - rolltemplate invocation: &{template:NAME} {{key=expr}} {{key2=expr2}}
 *   - attr ref: @{name} / @{character|name} — name 만 추출, resolve 는 executor.
 *   - query: ?{Prompt|default} — resolve 는 executor 가 prompt() 또는 fallback.
 *   - math: floor(x) / ceil(x) / round(x) / abs(x) / min(a,b) / max(a,b)
 *
 * 시스템 specific 0. coc / dnd5e / pbta 등의 시트 이름 토큰 hardcoding 없음.
 */

// ---------- AST ----------

export type DiceModifier =
  | { kind: 'kh'; n: number } // keep highest n
  | { kind: 'kl'; n: number } // keep lowest n
  | { kind: 'r'; op: '<' | '>' | '='; n: number }; // reroll once

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'dice'; count: Expr; sides: Expr; modifiers: DiceModifier[] }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/'; lhs: Expr; rhs: Expr }
  | { kind: 'neg'; arg: Expr }
  | { kind: 'attr'; name: string } // @{...}
  | { kind: 'query'; prompt: string; fallback: string } // ?{...}
  | { kind: 'fn'; name: 'floor' | 'ceil' | 'round' | 'abs' | 'min' | 'max'; args: Expr[] }
  | { kind: 'inline'; arg: Expr } // [[ ... ]]
  | { kind: 'group'; arg: Expr };

export type RolltemplateField = {
  key: string;
  expr: Expr | null; // null = literal text
  literal?: string; // 표현식 아닌 일반 텍스트인 경우
  raw: string;
};

export type Rolltemplate = {
  kind: 'rolltemplate';
  name: string;
  fields: RolltemplateField[];
};

export type ParseRoot =
  | { kind: 'expr'; expr: Expr }
  | Rolltemplate
  | { kind: 'chat'; text: string }; // 일반 채팅 메시지 (굴림 없음)

// ---------- 토크나이저 ----------

type Tok =
  | { t: 'num'; v: number }
  | { t: 'ident'; v: string }
  | { t: '+' | '-' | '*' | '/' | '(' | ')' | ',' | 'd' }
  | { t: 'attr'; v: string } // @{...}
  | { t: 'query'; prompt: string; fallback: string } // ?{...|default}
  | { t: 'kh' | 'kl'; n: number }
  | { t: 'rr'; op: '<' | '>' | '='; n: number }
  | { t: 'inline_open' | 'inline_close' }
  | { t: 'eof' };

function tokenize(input: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\t' || c === '\n') {
      i++;
      continue;
    }
    if (c === '[' && s[i + 1] === '[') {
      out.push({ t: 'inline_open' });
      i += 2;
      continue;
    }
    if (c === ']' && s[i + 1] === ']') {
      out.push({ t: 'inline_close' });
      i += 2;
      continue;
    }
    if (c === '@' && s[i + 1] === '{') {
      const end = s.indexOf('}', i + 2);
      if (end < 0) {
        // unterminated — push as ident-ish raw
        out.push({ t: 'attr', v: s.slice(i + 2) });
        i = s.length;
      } else {
        const inner = s.slice(i + 2, end);
        // 'character|attr' 형식이면 마지막 segment 만 attr 명으로.
        const parts = inner.split('|');
        const name = parts[parts.length - 1].trim();
        out.push({ t: 'attr', v: name });
        i = end + 1;
      }
      continue;
    }
    if (c === '?' && s[i + 1] === '{') {
      const end = s.indexOf('}', i + 2);
      if (end < 0) {
        out.push({ t: 'query', prompt: s.slice(i + 2), fallback: '' });
        i = s.length;
      } else {
        const inner = s.slice(i + 2, end);
        const parts = inner.split('|');
        out.push({
          t: 'query',
          prompt: (parts[0] ?? '').trim(),
          fallback: (parts[1] ?? '').trim(),
        });
        i = end + 1;
      }
      continue;
    }
    if (c >= '0' && c <= '9') {
      let j = i;
      while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      // optional decimal
      if (s[j] === '.' && s[j + 1] >= '0' && s[j + 1] <= '9') {
        j++;
        while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      }
      out.push({ t: 'num', v: Number(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === 'd' || c === 'D') {
      // 'd' 자체를 토큰화 — 단 ident 의 일부면 ident 로.
      // 앞 토큰이 num/ident/) 이면 dice 연산자, 아니면 ident 시작.
      const prev = out[out.length - 1];
      const isOp =
        prev && (prev.t === 'num' || prev.t === ')' || prev.t === 'attr' || prev.t === 'query');
      if (isOp) {
        out.push({ t: 'd' });
        i++;
        continue;
      }
      // fall through to ident
    }
    if (c === 'k' && (s[i + 1] === 'h' || s[i + 1] === 'l')) {
      const kind = s[i + 1] === 'h' ? 'kh' : 'kl';
      let j = i + 2;
      const start = j;
      while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      const n = j > start ? Number(s.slice(start, j)) : 1;
      out.push({ t: kind as 'kh' | 'kl', n });
      i = j;
      continue;
    }
    if (c === 'r' && (s[i + 1] === '<' || s[i + 1] === '>' || s[i + 1] === '=')) {
      const op = s[i + 1] as '<' | '>' | '=';
      let j = i + 2;
      const start = j;
      while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
      const n = j > start ? Number(s.slice(start, j)) : 1;
      out.push({ t: 'rr', op, n });
      i = j;
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z_0-9]/.test(s[j]!)) j++;
      out.push({ t: 'ident', v: s.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/(),'.includes(c)) {
      out.push({ t: c as '+' | '-' | '*' | '/' | '(' | ')' | ',' });
      i++;
      continue;
    }
    // 알 수 없는 문자 — 건너뛰며 best-effort.
    i++;
  }
  out.push({ t: 'eof' });
  return out;
}

// ---------- 파서 ----------

class Parser {
  pos = 0;
  readonly toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }

  peek(): Tok {
    return this.toks[this.pos]!;
  }
  next(): Tok {
    return this.toks[this.pos++]!;
  }
  eat(t: string): boolean {
    if (this.peek().t === t) {
      this.pos++;
      return true;
    }
    return false;
  }

  // expr = additive
  expr(): Expr {
    return this.additive();
  }
  additive(): Expr {
    let lhs = this.multiplicative();
    while (this.peek().t === '+' || this.peek().t === '-') {
      const op = this.next().t as '+' | '-';
      const rhs = this.multiplicative();
      lhs = { kind: 'bin', op, lhs, rhs };
    }
    return lhs;
  }
  multiplicative(): Expr {
    let lhs = this.unary();
    while (this.peek().t === '*' || this.peek().t === '/') {
      const op = this.next().t as '*' | '/';
      const rhs = this.unary();
      lhs = { kind: 'bin', op, lhs, rhs };
    }
    return lhs;
  }
  unary(): Expr {
    if (this.peek().t === '-') {
      this.next();
      return { kind: 'neg', arg: this.unary() };
    }
    if (this.peek().t === '+') {
      this.next();
      return this.unary();
    }
    return this.dice();
  }
  dice(): Expr {
    const lhs = this.primary();
    if (this.peek().t === 'd') {
      this.next();
      const sides = this.primary();
      const modifiers: DiceModifier[] = [];
      while (true) {
        const p = this.peek();
        if (p.t === 'kh') {
          this.next();
          modifiers.push({ kind: 'kh', n: (p as { t: 'kh'; n: number }).n });
          continue;
        }
        if (p.t === 'kl') {
          this.next();
          modifiers.push({ kind: 'kl', n: (p as { t: 'kl'; n: number }).n });
          continue;
        }
        if (p.t === 'rr') {
          this.next();
          const rr = p as { t: 'rr'; op: '<' | '>' | '='; n: number };
          modifiers.push({ kind: 'r', op: rr.op, n: rr.n });
          continue;
        }
        break;
      }
      return { kind: 'dice', count: lhs, sides, modifiers };
    }
    return lhs;
  }
  primary(): Expr {
    const tok = this.peek();
    if (tok.t === 'num') {
      this.next();
      return { kind: 'num', value: (tok as { t: 'num'; v: number }).v };
    }
    if (tok.t === '(') {
      this.next();
      const inner = this.expr();
      this.eat(')');
      return { kind: 'group', arg: inner };
    }
    if (tok.t === 'inline_open') {
      this.next();
      const inner = this.expr();
      this.eat('inline_close');
      return { kind: 'inline', arg: inner };
    }
    if (tok.t === 'attr') {
      this.next();
      return { kind: 'attr', name: (tok as { t: 'attr'; v: string }).v };
    }
    if (tok.t === 'query') {
      this.next();
      const q = tok as { t: 'query'; prompt: string; fallback: string };
      return { kind: 'query', prompt: q.prompt, fallback: q.fallback };
    }
    if (tok.t === 'ident') {
      this.next();
      const name = (tok as { t: 'ident'; v: string }).v;
      // 함수 호출
      if (this.peek().t === '(') {
        this.next();
        const args: Expr[] = [];
        if (this.peek().t !== ')') {
          args.push(this.expr());
          while (this.peek().t === ',') {
            this.next();
            args.push(this.expr());
          }
        }
        this.eat(')');
        const fnName = name.toLowerCase();
        if (
          fnName === 'floor' ||
          fnName === 'ceil' ||
          fnName === 'round' ||
          fnName === 'abs' ||
          fnName === 'min' ||
          fnName === 'max'
        ) {
          return { kind: 'fn', name: fnName, args };
        }
        // unknown function — 첫 인수 그대로 통과 (best-effort)
        return args[0] ?? { kind: 'num', value: 0 };
      }
      // bare ident — attr 처럼 취급 (Roll20 에서 가끔 발생).
      return { kind: 'attr', name };
    }
    // fallback — eat one token and return 0
    if (tok.t !== 'eof') this.next();
    return { kind: 'num', value: 0 };
  }
}

// ---------- 공개 API ----------

/** 단일 expression 만 (rolltemplate 없는) */
export function parseExpression(input: string): Expr {
  const toks = tokenize(input);
  const p = new Parser(toks);
  return p.expr();
}

/**
 * 전체 입력 — rolltemplate / inline roll / 일반 chat 등을 ParseRoot 로 반환.
 *
 * 패턴:
 *   - `&{template:NAME} {{k1=expr}} {{k2=expr}}`  → Rolltemplate
 *   - `[[expr]]` 또는 단순 표현식 → expr
 *   - 일반 텍스트 → 'chat'
 */
export function parseRoot(input: string): ParseRoot {
  const raw = (input ?? '').trim();
  if (!raw) return { kind: 'chat', text: '' };

  // rolltemplate?
  const tplMatch = raw.match(/^&\{template:([A-Za-z0-9_-]+)\}\s*([\s\S]*)$/);
  if (tplMatch) {
    const name = tplMatch[1]!;
    const rest = tplMatch[2] ?? '';
    const fields: RolltemplateField[] = [];
    // {{key=value}} repeated.
    const re = /\{\{([^=}]+)=([^}]*)\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(rest)) !== null) {
      const key = (m[1] ?? '').trim();
      const val = (m[2] ?? '').trim();
      const trimmed = val.trim();
      // 표현식 값 패턴: 숫자, dice, [[..]], @{..}, 산술.
      // literal vs expr: 식별자/연산자 만 있으면 expr, 그 외 일반 text 면 literal.
      const looksLikeExpr = /^(\[\[|[\(\{]|[+\-]?[0-9]|@\{|\?\{|[a-zA-Z]+\s*\()/.test(trimmed);
      let parsedExpr: Expr | null = null;
      if (looksLikeExpr) {
        try {
          parsedExpr = parseExpression(trimmed);
        } catch {
          parsedExpr = null;
        }
      }
      fields.push({
        key,
        expr: parsedExpr,
        literal: parsedExpr ? undefined : val,
        raw: val,
      });
    }
    return { kind: 'rolltemplate', name, fields };
  }

  // 그냥 expression 처럼 보이는가?
  // dice / 숫자 / @{ / ?{ / [[ / 산술 시작.
  if (/^(?:\[\[|\()|^[+\-]?[0-9]|^[0-9]*[dD][0-9]|^@\{|^\?\{|^[a-zA-Z]+\s*\(/.test(raw)) {
    try {
      const expr = parseExpression(raw);
      return { kind: 'expr', expr };
    } catch {
      // fall through
    }
  }
  return { kind: 'chat', text: raw };
}

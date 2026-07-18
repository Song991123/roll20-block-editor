import type { Expr } from '../dice/parser';
import { parseExpression } from '../dice/parser';
import { executeExpression } from '../dice/executor';

function attrName(name: string | null): string {
  return String(name || '').replace(/^attr_/, '').trim();
}

function isDeterministic(expr: Expr): boolean {
  switch (expr.kind) {
    case 'dice':
    case 'query':
      return false;
    case 'bin':
      return isDeterministic(expr.lhs) && isDeterministic(expr.rhs);
    case 'neg':
    case 'group':
    case 'inline':
      return isDeterministic(expr.arg);
    case 'fn':
      return expr.args.every(isDeterministic);
    default:
      return true;
  }
}

export type Roll20AutocalcResult = {
  applied: number;
  rejected: number;
};

export function annotateRoll20Autocalc(root: ParentNode): Roll20AutocalcResult {
  const controls = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name^="attr_"]'));
  const values = new Map<string, string>();
  const formulas: Array<{ element: HTMLInputElement; name: string; expression: string }> = [];

  for (const control of controls) {
    const name = attrName(control.getAttribute('name'));
    if (!name) continue;
    if (
      control instanceof HTMLInputElement &&
      control.disabled &&
      control.type === 'number'
    ) {
      const expression = control.getAttribute('value')?.trim() ?? '';
      if (expression) {
        formulas.push({ element: control, name, expression });
        // Keep Roll20's source expression in data, not in the native number
        // value attribute. The browser parses the latter before our runtime
        // can evaluate it and emits an invalid-value warning for expressions
        // such as `floor(@{pow}/5)`.
        control.dataset.r20AutocalcExpression = expression;
        control.setAttribute('value', '');
      }
      continue;
    }
    if (control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type) && !control.checked) continue;
    const value = control.value || control.getAttribute('value') || '';
    if (!values.has(name) || value) values.set(name, value);
  }

  let applied = 0;
  let rejected = 0;
  const pending = [...formulas];
  for (let pass = 0; pass < Math.max(1, formulas.length); pass += 1) {
    let changed = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const formula = pending[index]!;
      try {
        const expr = parseExpression(formula.expression);
        if (!isDeterministic(expr)) {
          rejected += 1;
          pending.splice(index, 1);
          continue;
        }
        const detail = executeExpression(expr, {
          attr: (name) => values.get(attrName(name)) ?? 0,
          rng: () => 0.5,
        });
        if (!Number.isFinite(detail.total)) throw new Error('non-finite autocalc result');
        const value = String(detail.total);
        formula.element.dataset.r20AutocalcExpression = formula.expression;
        formula.element.dataset.r20AutocalcValue = value;
        values.set(formula.name, value);
        pending.splice(index, 1);
        applied += 1;
        changed = true;
      } catch {
        // A later pass may resolve a derived attribute dependency.
      }
    }
    if (!changed) break;
  }
  rejected += pending.length;
  return { applied, rejected };
}

export function annotateRoll20AutocalcHtml(html: string): string {
  if (!html || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<template>${html}</template>`, 'text/html');
  const template = doc.querySelector('template');
  if (!template) return html;
  annotateRoll20Autocalc(template.content);
  return template.innerHTML;
}

export function applyAnnotatedRoll20Autocalc(root: ParentNode): number {
  let applied = 0;
  root.querySelectorAll<HTMLInputElement>('[data-r20-autocalc-value]').forEach((input) => {
    input.value = input.dataset.r20AutocalcValue ?? '';
    applied += 1;
  });
  return applied;
}

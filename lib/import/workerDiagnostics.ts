import { parseSheetWorkerScript, type ParsedBlock } from './script_parser';

export type RawWorkerDiagnosticCode =
  | 'multi-event'
  | 'switch-case'
  | 'error-handling'
  | 'async-flow'
  | 'unsupported-loop'
  | 'declaration'
  | 'worker-api-shape'
  | 'unsupported-statement'
  | 'source-preserved';

export interface RawWorkerDiagnostic {
  code: RawWorkerDiagnosticCode;
  message: string;
}

const DIAGNOSTIC_MESSAGES: Record<RawWorkerDiagnosticCode, string> = {
  'multi-event': '여러 감지 조건을 한 번에 묶은 코드는 아직 개별 블록으로 나누지 못해요.',
  'switch-case': '여러 갈래 선택 분기(switch/case)는 아직 개별 블록으로 나누지 못해요.',
  'error-handling': '오류 처리(try/catch)는 아직 개별 블록으로 나누지 못해요.',
  'async-flow': '비동기 처리(async/await)는 아직 개별 블록으로 나누지 못해요.',
  'unsupported-loop': '이 반복문은 아직 개별 블록으로 나누지 못해요.',
  declaration: '사용자 함수나 class 정의는 아직 개별 블록으로 나누지 못해요.',
  'worker-api-shape': '자동 동작 함수의 고급 인자나 작성 형식은 아직 개별 블록으로 나누지 못해요.',
  'unsupported-statement': '현재 블록으로 나누지 못하는 코드가 있어 원문으로 보관해요.',
  'source-preserved': '블록으로 나눌 수 있는 코드도 있지만, 이 블록은 사용자가 직접 관리하는 원문 형태예요.',
};

const DIAGNOSTIC_ORDER: RawWorkerDiagnosticCode[] = [
  'multi-event',
  'switch-case',
  'error-handling',
  'async-flow',
  'unsupported-loop',
  'declaration',
  'worker-api-shape',
  'unsupported-statement',
  'source-preserved',
];

/**
 * Explain why a raw Worker block is not represented as smaller blocks.
 * Diagnostics are derived from the current field value and never enter the
 * emitted source, so editing the raw code cannot leave stale metadata behind.
 */
export function diagnoseRawWorkerSource(source: string): RawWorkerDiagnostic[] {
  const text = String(source ?? '').trim();
  if (!text) return [];

  const parsed = parseSheetWorkerScript(text);
  const rawStatements = collectRawStatements(parsed.blocks);
  if (rawStatements.length === 0) {
    return [toDiagnostic('source-preserved')];
  }

  const codes = new Set<RawWorkerDiagnosticCode>();
  for (const statement of rawStatements) {
    const code = classifyRawStatement(statement);
    codes.add(code);
  }

  return DIAGNOSTIC_ORDER.filter((code) => codes.has(code)).map(toDiagnostic);
}

function collectRawStatements(blocks: ParsedBlock[]): string[] {
  const raw: string[] = [];
  for (const block of blocks) {
    if (block.blockType === 'r20_raw_worker' && block.fields.JS?.trim()) {
      raw.push(block.fields.JS);
    }
    for (const children of Object.values(block.children ?? {})) {
      raw.push(...collectRawStatements(children));
    }
    for (const value of Object.values(block.valueInputs ?? {})) {
      raw.push(...collectRawStatements([value]));
    }
  }
  return raw;
}

function classifyRawStatement(statement: string): RawWorkerDiagnosticCode {
  const code = statement.trim();
  const multiEvent = /^on\s*\(\s*(['"])([\s\S]*?)\1/.exec(code);
  if (multiEvent && multiEvent[2].trim().split(/\s+/).length > 1) return 'multi-event';
  if (/^switch\s*\(/.test(code) || /^case\b/.test(code)) return 'switch-case';
  if (/^(?:try\b|catch\b|finally\b)/.test(code)) return 'error-handling';
  if (/^(?:async\b|await\b)/.test(code)) return 'async-flow';
  if (/^(?:while\s*\(|do\b|for\s*\([^;]*(?:\bof\b|\bin\b))/.test(code)) {
    return 'unsupported-loop';
  }
  if (/^(?:(?:async\s+)?function\b|class\b)/.test(code)) return 'declaration';
  if (/^(?:on|getAttrs|setAttrs|getSectionIDs|generateRowID|removeRepeatingRow|getTranslationByKey|getCompendiumPage)\s*\(/.test(code)) {
    return 'worker-api-shape';
  }
  return 'unsupported-statement';
}

function toDiagnostic(code: RawWorkerDiagnosticCode): RawWorkerDiagnostic {
  return { code, message: DIAGNOSTIC_MESSAGES[code] };
}

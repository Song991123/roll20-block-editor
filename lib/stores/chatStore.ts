/**
 * Chat store — Roll20 채팅 패널 시뮬레이션.
 *
 * Anchor:
 *   - docs/spec/10_system_architecture.md §4.2 (UI store family)
 *   - lib/dice/executor.ts (RollResult)
 *
 * 미리보기 영역의 굴림 버튼 클릭 시 결과 카드가 누적된다.
 * 우측 사이드 [채팅] 탭이 본 store 의 rolls 를 렌더.
 */

import { create } from 'zustand';
import type { RollResult } from '@/lib/dice/executor';

const MAX_ROLLS = 50;

export interface ChatRoll {
  id: string;
  /** Date.now() — 카드 우측 timestamp. */
  ts: number;
  /** 카드 좌측 발신자 라벨 — button name / 'Sheet'. */
  sender: string;
  /** 원본 표현식 (UI 상단 echo). */
  expression: string;
  /** 실행 결과. */
  result: RollResult;
}

interface ChatStore {
  rolls: ChatRoll[];
  pushRoll: (r: Omit<ChatRoll, 'id' | 'ts'> & Partial<Pick<ChatRoll, 'id' | 'ts'>>) => void;
  clear: () => void;
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `roll-${Date.now()}-${counter}`;
}

export const useChatStore = create<ChatStore>((set) => ({
  rolls: [],
  pushRoll: (r) =>
    set((s) => {
      const card: ChatRoll = {
        id: r.id ?? nextId(),
        ts: r.ts ?? Date.now(),
        sender: r.sender,
        expression: r.expression,
        result: r.result,
      };
      const next = [card, ...s.rolls];
      if (next.length > MAX_ROLLS) next.length = MAX_ROLLS;
      return { rolls: next };
    }),
  clear: () => set({ rolls: [] }),
}));

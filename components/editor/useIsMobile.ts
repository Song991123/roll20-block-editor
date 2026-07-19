'use client';

/**
 * useIsMobile — UI 전용 뷰포트 훅 (design-reset).
 *
 * 920px 이하에서 사이드바를 서랍(드로어)으로 전환하는 반응형 셸에 쓰인다.
 * 상태/데이터 로직과 무관한 순수 표시용 훅. SSR(정적 export) 첫 렌더에서는
 * 항상 false → hydration 불일치 없음 (데스크톱 DOM 기준 유지).
 */
import { useEffect, useState } from 'react';

export function useIsMobile(query = '(max-width: 920px)'): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);

  return isMobile;
}

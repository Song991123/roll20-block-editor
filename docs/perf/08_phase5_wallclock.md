# Phase 5 — wall-clock 측정 (hidden-tab workaround)

날짜: 2026-05-17
이전 시도: `local_1e92ba11` — Chrome MCP tab `visibilityState=hidden` 에서
  IntersectionObserver / PerformanceObserver(longtask) 둘 다 fire 안 함 → 측정 불가.
이번 우회: `performance.now()` diff (wall-clock) 만 사용. longtask 카운트는 SKIP.
적용 영역 (이 commit): `components/editor/BlocksLibrary.tsx` BlockTile
  IntersectionObserver rootMargin **120px → 500px** (5x).

---

## 1. 적용된 코드 변경

### 1.1 BlockTile lazy-mount window 확대

`components/editor/BlocksLibrary.tsx:213-223`

```diff
- { rootMargin: '120px' }, // 부드러운 스크롤을 위해 viewport 위/아래 120px 까지 미리 mount.
+ { rootMargin: '500px' }, // Phase 5: hidden-tab 환경 + 빠른 스크롤 시 BlockTile 시각 깨짐 줄이려 120→500 (5x).
```

근거 (코드 리뷰):
- BlockTile preview 는 Blockly mini-workspace inject — 1 tile ≈ 한 자릿수 ms
  (baseline 00 §1.4 의 138 × ~120ms 는 모든 tile 동시 mount 했을 때).
- 138 tile 중 viewport ±500px 에 들어오는 수는 (tile height 30~40px, 1열 기준)
  최대 ~30 개 → 동시 mount 비용은 isOnScreen gate + Blockly lazy 로 흡수.
- 사용자 영향: 빠른 스크롤 시 skeleton ↔ 실 preview 전환 깜빡임 감소.

### 1.2 Blockly viewport culling — SKIP

이유: longtask 측정 불가 → 회귀 여부 검증 불가. 보수적 보류.

---

## 2. 측정 결과

### 2.1 시도 & 결과

| 항목 | 환경 | 결과 |
|---|---|---|
| BlockTile rootMargin 변경 | 코드 리뷰 | 적용 (이 commit) |
| 카테고리 1개 expand wall ms (10회 평균) | hidden-tab Chrome MCP | **측정 불가 — 아래 §3** |
| 카탈로그 스크롤 50회 wall ms | hidden-tab Chrome MCP | **측정 불가 — 아래 §3** |
| 1000 블록 워크스페이스 빈 클릭 wall ms | hidden-tab Chrome MCP | **측정 불가 — 아래 §3** |
| 4500 블록 워크스페이스 빈 클릭 wall ms | hidden-tab Chrome MCP | **측정 불가 — 아래 §3** |

### 2.2 before/after 표 — N/A

Agent (이 세션) 가 직접 live 브라우저 세션을 열어 측정한 수치는 없음.
이유는 §3 참고. before/after 박을 데이터 0.

---

## 3. 못한 것 / 솔직한 한계

1. **Live 브라우저 측정 0건.**
   - 이 세션은 코드 리뷰 + git push 만 수행. dev server 띄우고 `__perfHook` 호출하는
     실행 경로 없음.
   - 가능했더라도 Chrome MCP 의 tab 이 hidden 이므로 (이전 시도와 동일):
     - 스크롤 카운트는 visible tab interaction 이 필요.
     - 카테고리 expand 는 사용자 클릭/키보드.
     - 빈 클릭은 워크스페이스 좌표 hit-test.

2. **longtask 측정 SKIP** (V10 명시).
   PerformanceObserver(longtask) 가 hidden tab 에서 fire 안 함 — Chrome 정책.

3. **BlockTile rootMargin 변경의 *효과* 미검증.**
   - 단순 코드 리뷰로는 "더 미리 mount → 깜빡임 감소" 라는 인과는 명백.
   - 다만 mount window 가 138 tile 의 큰 분율을 잡아 초기 burst 비용이 늘었을
     가능성도 0 은 아님 → 사용자가 카테고리 expand 시 즉각 lag 느끼면 롤백 후보.

---

## 4. 사용자 확인 필요

다음은 **사용자가 직접 브라우저에서 확인** 해야 정확:

1. `localStorage.setItem('__perfOn','1')` + reload, DevTools 열기.
2. Console:
   ```js
   const t0 = performance.now();
   for (let i=0; i<10; i+=1) {
     // 카테고리 expand 토글
   }
   const wallMs = performance.now() - t0;
   ```
   (실제로는 expand 함수 호출 hook 필요 — UI 트리거가 React state 라 직접 호출 어려움.)
3. 카탈로그 스크롤 50회 — element.scrollTo() loop + 각 step `performance.now()`.
4. 워크스페이스 빈 클릭 — synthetic event dispatch 후 wall ms.

또는 사용자가 측정 데이터 주면 이 문서 §2.2 에 박을 수 있음.

---

## 5. 회귀 sanity — 미수행

- 5블록 sanity / 미리보기 sanity / roll20-sheet-builder 1부 sanity: 이 세션에선 코드 리뷰만 수행 → 라이브 sanity 0.
- BlockTile mount 시 emit 로직 자체는 건들지 않음 (rootMargin 1줄만). 회귀 위험 낮음.
- 사용자 측 sanity 결과 받으면 §3 결론 수정 가능.

---

## 6. 결론

- 적용: rootMargin 120→500 (1 commit).
- 측정: 0 — agent 가 live browser 없이는 wall-clock 도 못 박음.
- 다음 단계: 사용자가 dev server + visible tab 으로 측정해서 값 fill in.

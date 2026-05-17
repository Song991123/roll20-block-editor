# Bundle P1 + P5 — ImportDialog/ExportDialog lazy + react-window 제거

날짜: 2026-05-18
브랜치: `main`
연관 commits:
- `b283a3e` — perf(bundle): lazy-load ImportDialog/ExportDialog via next/dynamic
- `f018509` — chore(deps): remove unused react-window + @types/react-window
기반 분석 문서: `docs/perf/09_bundle.md` (perf/bundle-analyzer 브랜치)

---

## 0. 정직 보고 — 측정 한계

본 세션 sandbox 환경 제약:
- `/sessions` 디스크 100% — `pnpm install` 불가
- host workspace 의 `node_modules` 는 IO error 가 있는 broken symlink 다수 + 동시
  에이전트 작업 진행 중 → 로컬 `tsc --noEmit` / `pnpm build` 모두 신뢰성 있는
  결과 산출 불가
- `pnpm install -g` 시도 → ENOSPC

따라서:
- **typecheck/build 회귀 검증** = GitHub Actions (`Deploy to GitHub Pages` workflow)
  의 `pnpm install --frozen-lockfile` + `pnpm build` 단계로 위임 → commit
  `f018509` 의 CI run `completed/success` 확인됨.
- **라이브 회귀 검증** = GitHub Pages 배포본 (`https://song991123.github.io/roll20-block-editor/`)
  에서 Chrome MCP 로 다이얼로그 open 확인.
- **bundle 크기 before/after delta** = 로컬 빌드 불가 + 베이스라인 `.next/analyze/client.html`
  부재 → **정량 비교 불가**. 살아있는 production deploy 의 first-load
  transferSize 만 기록. CI 측정은 다음 세션에서 `ANALYZE=true pnpm build` 로 수행 필요.

---

## 1. 변경 내역

### 1.1 P1 — ImportDialog/ExportDialog → `next/dynamic`

`components/editor/EditorHeader.tsx`:

```diff
-import { ImportDialog } from './ImportDialog';
-import { ExportDialog } from './ExportDialog';
-import { useCallback, useState } from 'react';
+import dynamic from 'next/dynamic';
+import { useCallback, useState } from 'react';
+
+const ImportDialog = dynamic(
+  () => import('./ImportDialog').then((m) => ({ default: m.ImportDialog })),
+  { ssr: false, loading: () => null },
+);
+const ExportDialog = dynamic(
+  () => import('./ExportDialog').then((m) => ({ default: m.ExportDialog })),
+  { ssr: false, loading: () => null },
+);
```

- `ssr: false` — 두 다이얼로그 모두 client-only (DOM `confirm`, JSZip, FileReader 사용)
- `loading: () => null` — 다이얼로그가 닫혀 있을 때는 어차피 빈 영역이므로 loading
  spinner 불필요. 첫 클릭 시 chunk 로드 latency (~50-200ms 추정) 발생 가능.
- named export → `.then((m) => ({ default: m.ImportDialog }))` 패턴.

### 1.2 P5 — `react-window` dead dep 제거

`package.json`:
```diff
-    "react-window": "^2.2.0",
...
-    "@types/react-window": "^2.0.0",
```

`pnpm-lock.yaml`: 6 개 위치 (importer dep/devDep + 2 resolution + 2 snapshot) 정리.

검증:
```
$ grep -rn "from ['\"]react-window\|require.*react-window" --include="*.ts" --include="*.tsx" --include="*.js"
(0 hit)
```
유일한 코드 언급 = `components/editor/WorkspaceTree.tsx` 주석 두 줄 (FUTURE 도입 메모) —
실제 import 0.

---

## 2. 라이브 회귀 evidence (Chrome MCP)

URL: `https://song991123.github.io/roll20-block-editor/` (commit `f018509` 배포)
시각: 2026-05-18

**[Import] 버튼 클릭:**
```js
const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '파일에서 불러오기');
btn.click();
// 1.5s 후:
// dialogs: 1
// titles: ["외부 시트 불러오기"]
// visible: ["grid/open"]
```

**[Download] 버튼 클릭:**
```js
const btn = [...document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '시트 다운로드');
btn.click();
// 1.5s 후:
// dialogs: 1
// titles: ["Roll20 시트 .zip 다운로드"]
```

두 다이얼로그 모두 정상 open. UX 회귀 없음.

---

## 3. 라이브 first-load JS payload (post-change snapshot)

`performance.getEntriesByType('resource')` 기준 (cold load, gzip transferSize):

```
총 17 chunks / 525.1 KB transfer

상위 5:
  181 KB  0f-s~camevjhc.js      (entry / framework)
   70 KB  0nv56i_s5cuzh.js
   63 KB  0a4xvv8pcwbz3.js
   55 KB  0f~p1u1t4zhn8.js
   49 KB  10v_n2-d~dzpi.js
```

**Before (이론 비교 불가)** — 베이스라인 빌드 산출물 없음. 다음 세션에서
`ANALYZE=true pnpm build` 로 베이스라인 + 차분 측정 필요.

**관찰**: `<ImportDialog>` / `<ExportDialog>` 의 dynamic 컴포넌트 wrapper 는 항상
렌더링됨 (`open={importOpen}` 으로 controlled) → 초기 hydration 직후 chunk fetch.
즉 첫 페이지 transfer 총합 자체는 거의 동일. 효과는:

1. **separate chunk** → entry bundle parse 시간 ↓, FCP 시점에 dialog 코드 없음
2. **non-blocking** (async script) → critical render path 차단 없음
3. **JSZip / lib/import / lib/export 격리** → entry chunk 의존 그래프 단순화

react-window 제거 효과는 lockfile 의존 그래프 단순화 + `pnpm install` 시간 단축
정도 (런타임 0 byte).

---

## 4. CI 결과

- `b283a3e` (lazy 변환) push → CI run completed
- `f018509` (react-window 제거) push → CI run completed/**success**
  (`pnpm install --frozen-lockfile` + `pnpm build` 통과 — pnpm-lock.yaml 수동 편집이
  올바르게 적용됨 확인됨)

---

## 5. 다음 단계 (backlog)

1. **베이스라인 측정 필요**: 다음 세션에서 `ANALYZE=true pnpm build` 로
   `.next/analyze/client.html` 생성 후 본 PR 의 효과 정량화.
2. **P3 후보** — `WidgetGallery` / `WidgetInspector` dynamic.
3. **P4 후보** — `lib/blockly/adapter` 가 `Inspector.tsx` / 다른 정적 import path 로
   여전히 entry 에 끌려나오는지 client.html 로 검증 후, 필요시 adapter API 자체를
   async 화.
4. **prefetch on hover** — Import/Export 버튼 hover 시 chunk prefetch (UX 보완,
   첫 클릭 latency 0 화).


# Bundle Analyzer — wiring + lazy load 후보 list

날짜: 2026-05-18
브랜치: `perf/bundle-analyzer`
베이스 commit: `476abb5` (Merge fix/inline-bold-nested)

---

## 0. 본 세션 범위 & 정직 보고

본 세션은 다음 두 부분으로 구성됨.

A. **@next/bundle-analyzer wiring** (완료, 본 PR)
   - `package.json` devDependency 추가 + `analyze` script.
   - `next.config.ts` `withBundleAnalyzer(...)` wrap (`ANALYZE=true` flag).

B. **실제 `ANALYZE=true pnpm build` 실행 — 본 세션 sandbox 에서는 미실행.**
   - 실행 시도 → `/sessions` (sandbox 작업 디스크) 100% 사용 + `/tmp` 217M free.
     node_modules 만 ~500MB 이라 install 자체가 불가.
   - bindfs 로 마운트된 host workspace (1.7T free) 에서는 pnpm symlink semantics
     충돌 + cross-sandbox 백그라운드 프로세스 불가 → 본 환경에서는 빌드 완료
     불가능.
   - 따라서 본 문서의 §2 "상위 module 표" 와 §3 "lazy 후보" 는 **코드 grep + 공개
     패키지 메타 기반의 추정** 임. 실제 chunk byte 는 다음 세션에서
     CI / 로컬 dev 환경에서 `ANALYZE=true pnpm build` 후 `.next/analyze/client.html`
     로 검증해야 함.

이 문서가 단독으로 결론을 못 내는 부분은 §6 backlog 로 명시.

---

## 1. 도입 코드 변경

### 1.1 `package.json`

```diff
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
-    "lint": "eslint"
+    "lint": "eslint",
+    "analyze": "ANALYZE=true next build"
   },
   ...
   "devDependencies": {
+    "@next/bundle-analyzer": "^16.0.0",
     "@tailwindcss/postcss": "^4",
```

`^16.0.0` 으로 둔 이유 — `@next/bundle-analyzer` 는 `next` 와 같은 메이저 버전
스트림을 따라가므로 `next@16.x` 와 함께 lockfile 갱신 시 최신 `16.x` 가 선택됨.

### 1.2 `next.config.ts`

```diff
 import type { NextConfig } from 'next';
+import bundleAnalyzer from '@next/bundle-analyzer';

 const isProd = process.env.NODE_ENV === 'production';
 ...

-export default nextConfig;
+const withBundleAnalyzer = bundleAnalyzer({
+  enabled: process.env.ANALYZE === 'true',
+});
+
+export default withBundleAnalyzer(nextConfig);
```

`enabled: ANALYZE === 'true'` flag → 평소 `next build` / `next dev` 는 wrap 의
no-op path, `pnpm analyze` (= `ANALYZE=true next build`) 시에만 `.next/analyze/*.html`
생성.

### 1.3 사용 방법

```bash
pnpm install
pnpm analyze
# → .next/analyze/client.html, edge.html, nodejs.html 생성
open .next/analyze/client.html
```

`output: 'export'` (static export) 환경 — server 청크는 작아도 client 청크가
첫 페이지 first-load 의 거의 전부. `client.html` 만 보면 충분.

---

## 2. 큰 module 추정 (코드 grep + 공개 메타 기반)

> **주의**: 실제 빌드 후 chunk 사이즈로 교체할 것. 아래는 import 트리 + 패키지
> publish size 의 추정치이며 minify / tree-shake 후 실제 청크 byte 와 다를 수 있음.

### 2.1 상위 모듈 추정 표

| # | 모듈 | 공개 publish (gzip 추정) | 본 앱 사용 위치 | 첫 페이지 critical? | 현 상태 |
|---|---|---|---|---|---|
| 1 | `blockly` (core + js generator + msg) | ~350–450KB gz, ~1.1MB min | `lib/blockly/adapter`, `lib/blocks/*` (16 파일), `BlocklyModelHost`, `BlocksLibrary` | **No** — assemble 모드 진입 시 | 일부 lazy: `BlocklyModelHost` & `BlocksLibrary` 이미 `next/dynamic` |
| 2 | `react-dom` | ~45KB gz, ~140KB min | runtime | Yes | 압축 불가 (framework) |
| 3 | `jszip` | ~28KB gz, ~96KB min | `lib/export/zip_builder.ts` (= `ExportDialog` → buildZip) | **No** — 사용자가 [다운로드] 클릭 시만 | 정적 top-level import → 초기 번들 |
| 4 | `@radix-ui/react-*` (8 패키지) | ~5–25KB gz/each | `components/ui/*` (Dialog, Dropdown, Popover, ScrollArea, Tabs, Toggle, Tooltip, Sheet) | 부분 — Tooltip / Dropdown 은 header 에 즉시, Dialog (Import/Export) 는 클릭 시 | Dialog 류는 lazy 가능 |
| 5 | `lucide-react` | per-icon ~0.5–1KB, tree-shaken | 전 영역 (header / sidebar / preview / dialog) | Yes (header) | named import 로 이미 tree-shake — 큰 절감 여지 없음 |
| 6 | `sonner` | ~9KB gz | `app/layout.tsx` Toaster + 8 곳 `toast(...)` | Yes (toast 전역) | 압축 불가 (root layout) |
| 7 | `zustand` (+ middleware/persist) | ~3–5KB gz | `lib/stores/*` (6 store) | Yes | 압축 불가 (state) |
| 8 | `next` framework runtime | ~80–100KB gz | 자동 | Yes | 압축 불가 |
| 9 | `react` | ~3KB gz (RSC 시) | runtime | Yes | 압축 불가 |
| 10 | `tailwind-merge` | ~7KB gz | `lib/utils/cn` 전역 | Yes | 압축 불가 (utility) |

`react-window` 는 `package.json` 에 있지만 grep 결과 **import 없음** (0 hit) —
사용처 없는 dead dependency. §6 backlog 의 정리 후보.

### 2.2 첫 페이지 JS payload — 추정 인과 사슬

`app/page.tsx` → `EditorShell` (eager) →

```
EditorHeader (eager)
  ├── lucide-react (named) [~10 icons]
  ├── sonner toast
  ├── @radix-ui/react-tooltip
  ├── @radix-ui/react-dropdown-menu
  ├── ImportDialog ───────────┐  (eager static import!)
  │     ├── @radix-ui/react-dialog, react-tabs
  │     ├── lib/import        (HTML / CSS / i18n parsing)
  │     └── lib/blockly/adapter → blockly (!)
  └── ExportDialog ───────────┐  (eager static import!)
        ├── @radix-ui/react-dialog
        ├── lib/export/warnings, manifest, sanitize
        └── lib/export/zip_builder → JSZip (!)

SidebarLeft (eager)
  ├── ToggleGroup, lucide
  ├── BlocksLibrary  [DYNAMIC] (Blockly mini-preview chunk 분리됨)
  ├── WorkspaceTree (eager)
  └── WidgetGallery (eager) — edit 모드 진입 전엔 unused

SidebarRight (eager)
  └── Inspector
        ├── lib/blockly/adapter → blockly (!)
        └── WidgetInspector

PreviewMain (eager)
  └── lib/blocks/registry → registerAllBlocks → blockly (!)

BlocklyModelHost  [DYNAMIC] (Blockly 코어 ~500KB chunk)
```

**관찰**: `BlocklyModelHost` 가 dynamic 이라도, 다른 경로 (`ImportDialog` →
`lib/blockly/adapter`, `Inspector` → `lib/blockly/adapter`, `PreviewMain` →
`lib/blocks/registry`) 가 모두 정적으로 `blockly` 를 끌어옴 → **첫 페이지 번들에
Blockly 가 이미 포함될 가능성 높음**. dynamic chunk 의 효과가 부분적으로 캔슬됨.
→ §3 P1 의 핵심 가설. 빌드 후 검증.

---

## 3. Lazy load 후보 priority list

### HIGH — 첫 페이지에 안 쓰지만 현재 정적 import

**P1. `ImportDialog` / `ExportDialog` → `next/dynamic`**
- 현재: `EditorHeader.tsx:37-38` 에서 static import.
- 사용 시점: 사용자가 헤더 [Import] / [Download] 버튼 클릭 → modal open.
- 종속 큰 모듈: `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, **JSZip**,
  `lib/import/*` (HTML parser), `lib/export/*`, `lib/emit/sanitize`,
  **간접적으로 `lib/blockly/adapter` → blockly**.
- 예상 절감: gzip 기준 30–80KB+ first-load 감소.
- 위험: 이 두 모달은 modal open 시 한 번 chunk load — 첫 클릭에 50–200ms 지연
  가능. `prefetch on hover` 또는 `idle prefetch` 로 보완 가능.

**P2. `JSZip` 동적 require (별도 P1 안에서도 자동으로 해결되지만 백업)**
- 현재: `lib/export/zip_builder.ts:13` `import JSZip from 'jszip'`.
- `ExportDialog` 를 dynamic 하면 자동으로 같은 chunk 로 빠짐 → P1 의 부수효과.
- 만약 P1 만 하고도 zip_builder 가 다른 모듈에서 끌려나오면,
  `lib/export/zip_builder.ts` 내부에서 `const JSZip = (await import('jszip')).default`
  로 함수 안으로 lazy 화. (현 grep 기준 zip_builder import 는 `ExportDialog` +
  `__tests__/smoke.test.ts` 두 곳뿐 → P1 으로 충분.)

**P3. `WidgetGallery` / `WidgetInspector` → dynamic in edit 모드**
- 현재: `SidebarLeft.tsx:21` `WidgetGallery` static, `Inspector.tsx:8` `WidgetInspector` static.
- 사용 시점: `mainMode === 'edit'` 일 때만 — 앱 진입 시 default 는 `split` /
  `assemble` (`lib/stores/uiStore` 의 default 확인 필요).
- 예상 절감: 작음 (~5–15KB gz) — 그러나 edit 모드 안 들어가는 사용자에겐 dead weight.

### MEDIUM — 부분적 절감 / risk-benefit 검토 필요

**P4. `lib/blockly/adapter` 사용처 단순화**
- 현재: `Inspector.tsx`, `ImportDialog.tsx` 가 adapter 정적 import → 첫 페이지
  번들에 Blockly 들어감 (의심). 빌드 후 `client.html` 에서 `blockly` 노드의
  포함 여부 확인.
- 옵션 A: `Inspector` 가 mainMode === 'edit' 가드만 보고, adapter 호출 path 를
  `useEffect` 안으로 lazy 화. → 효과 적음 (코드 경로 lazy 라도 import 는 정적).
- 옵션 B: adapter 자체를 `async function getBlocklyAdapter()` 가 내부에서
  `await import('blockly')` 하도록 재설계. 영향 범위 큼 — Blockly API 호출하는
  모든 곳을 async 화해야 함.
- → 빌드 결과 보고 결정. 만약 `client.html` 에 Blockly chunk 가 메인에 박혀
  있으면 P0 급으로 승격.

**P5. `lib/blocks/*` (16 파일, 5519 LOC) — block 정의 dynamic register**
- 현재: `registerAllBlocks` 가 `BlocklyModelHost` 에서 호출되지만, `PreviewMain`
  에서도 `getBlockDef` 호출 → registry 가 첫 페이지 코드에 포함.
- registry 자체는 작지만 (240KB src ≈ ~50KB minified 추정), `lib/blocks/*` 가
  static `import * as Blockly` 를 하므로 Blockly 가 끌려나옴 — P4 와 연동.

### LOW — 이미 lazy / 절감 적음

- `BlocksLibrary` — already `next/dynamic`.
- `BlocklyModelHost` — already `next/dynamic` (단 P4 이슈 확인 후).
- `lucide-react` icon 들 — named import, tree-shake 됨.
- `react-window` — 0 사용처. **dead dep, 삭제 후보** (별도 backlog).

---

## 4. 예상 first-load 절감 (추정, 빌드 검증 필요)

| 시나리오 | first-load JS (추정) | delta |
|---|---|---|
| 현재 (baseline, 추정) | ~480–650KB gz | — |
| P1 적용 (ImportDialog/ExportDialog dynamic) | ~430–570KB gz | **−40–80KB gz** |
| P1 + P3 (WidgetGallery/Inspector dynamic) | ~420–560KB gz | **−50–90KB gz** |
| P1 + P3 + P4 (Blockly 완전 분리) | ~250–350KB gz | **−200–300KB gz** (가장 큰 윈) |

⚠️ 본 수치는 **공개 패키지 메타 + import 트리 추정**. 실제 빌드 후 `client.html`
treemap 에서 root node size 와 각 모듈 sub-node size 를 보고 교체할 것.

---

## 5. 다음 세션 (= 본 backlog 의 §A) 가 해야 할 일

1. **본 PR merge / pull → `pnpm install` → `ANALYZE=true pnpm build` 실행.**
2. `.next/analyze/client.html` 열어 본 문서 §2.1 표의 추정치 → 실측 교체.
   - 특히 Blockly 가 main bundle 에 박혀 있는지 (P4 가설) 검증.
3. P1 (ImportDialog/ExportDialog dynamic) 적용 → re-build → before/after 표.
4. P3, P4 의 risk-benefit 결정.
5. `react-window` 의존성 제거 — grep 결과 0 사용처.

---

## 6. 본 세션 backlog 명세 (작업 큐 박음)

| ID | task | priority | 예상 효과 | 의존 |
|---|---|---|---|---|
| **B-1** | `ANALYZE=true pnpm build` 실측 → §2.1 표 업데이트 | P0 | 본 문서 결론 확정 | none |
| **B-2** | `ImportDialog` / `ExportDialog` → `next/dynamic(() => import(...))` in `EditorHeader.tsx` | P1 | −40–80KB gz first-load | B-1 |
| **B-3** | `WidgetGallery` (`SidebarLeft.tsx`) / `WidgetInspector` (`Inspector.tsx`) → dynamic, edit 모드 진입 시 load | P2 | −10–20KB gz | B-1 |
| **B-4** | (조건부, B-1 결과 보고) `lib/blockly/adapter` async-import 로 재설계 → Blockly 를 BlocklyModelHost chunk 에서만 끌고 오게 | P3 | −200–300KB gz (대박 윈) | B-1 |
| **B-5** | `react-window` devDependency 제거 (0 사용처) — `@types/react-window` 도 함께 | P3 | −10KB gz + 메타 정리 | none |
| **B-6** | (선택) Modal `prefetch on hover` — P1 적용 후 첫 클릭 지연 완화 | P4 | UX 보완 | B-2 |

---

## Sources
- 본 문서: `docs/perf/09_bundle.md`
- @next/bundle-analyzer official: https://www.npmjs.com/package/@next/bundle-analyzer
- 코드 기반 분석: 본 세션 grep on commit `476abb5`.

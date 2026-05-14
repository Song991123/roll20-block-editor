# Roll20 Block Editor

블록 코딩으로 Roll20 커스텀 캐릭터 시트를 만드는 도구. 비전공자도 HTML / CSS / Sheet Worker 안 만지고 시트 빌드 가능.

> **상태:** Phase 1 (Next.js + Blockly bootstrap). 130 Roll20 블록은 Phase 2 마이그레이션 진행 중.

## 스택

- Next.js 16 (App Router, static export)
- React 19 + TypeScript
- Blockly 12 (Zelos renderer)
- Zustand (상태)
- Tailwind CSS v4
- shadcn-ui (Phase 2~)
- react-window / idb-keyval (Phase 5 성능 최적화)

## 개발

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # → out/ (정적 export)
pnpm lint
```

## 배포

`main` 브랜치 push → GitHub Actions 가 자동으로 GitHub Pages 배포.

URL: https://song991123.github.io/roll20-block-editor/

## 디렉토리

```
web/
├─ app/                          Next.js App Router
├─ components/editor/            EditorShell / BlockWorkspace / Header
├─ lib/
│  ├─ blocks/                    130 블록 정의 (Phase 2)
│  ├─ generators/                generator 함수 (Phase 2)
│  ├─ preview/                   autoPrefix / runtimeCss / Web Worker (Phase 3)
│  ├─ stores/                    Zustand 4 stores
│  └─ utils/
├─ data/examples/                정적 example XML (Phase 4)
├─ public/examples/              정적 fetch 대상 XML
└─ .github/workflows/deploy.yml  GH Pages CI/CD
```

## 라이선스

MIT (Phase 7 에서 LICENSE 파일 추가).

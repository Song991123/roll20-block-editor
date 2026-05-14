# Roll20 Block Editor

비전공자를 위한 Roll20 캐릭터 시트 블록 코딩 에디터.
HTML / CSS / Sheet Worker 코드를 직접 만지지 않고도 블록을 끌어다 놓아 시트를 만들 수 있어요.

> 미리보기 화면: _TODO — GIF / screenshot 추가 예정_

## 사용법

1. 좌측 카테고리에서 블록을 끌어다 워크스페이스에 놓아 시트를 만들거나
2. 우측 상단 **예시 불러오기** 에서 미리 만들어진 시트를 불러와 살펴보세요.
3. 우측 패널에서 생성되는 HTML / CSS / 번역 / 미리보기를 실시간으로 확인할 수 있습니다.

배포된 에디터: <https://song991123.github.io/roll20-block-editor/>

## 스택

- Next.js 16 (App Router · 정적 export)
- React 19 + TypeScript
- Blockly 12 (Zelos renderer · 커스텀 다크 테마)
- Tailwind CSS v4 · shadcn-ui primitives
- Zustand · sonner · lucide-react

## 개발

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # → out/ (정적 export)
pnpm lint
```

## 배포

`main` 브랜치 push → GitHub Actions 가 `out/` 을 GitHub Pages 로 자동 배포합니다.

## 디렉토리

```
web/
├─ app/                Next.js App Router (layout / page / globals.css)
├─ components/
│  ├─ editor/          EditorShell · Header · BlockWorkspace · RightPanel · EmptyWorkspaceHint
│  └─ ui/              shadcn primitives (button · tooltip · dropdown · tabs · sheet ...)
├─ lib/
│  ├─ blocks/          블록 정의 · 카테고리 · 테마
│  ├─ stores/          Zustand
│  └─ utils/
└─ public/
```

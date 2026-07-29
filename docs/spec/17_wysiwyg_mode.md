# 17. WYSIWYG 모드 (위치 기반 시트 편집 — Phase A MVP)

**Anchor:** spec 02 §3 (블록 카탈로그), spec 08 W2 (메인 영역), spec 09 §1.1 (9 카테고리)
**Driver feedback:** 사용자 (2026-05) — "블록은 자연어가 됐지만, 시트를 짜려면 결국 블록 카드 모양만 보고 머릿속으로 '이게 위치 어디 가나' 생각해야 함. 종이에 그리듯 끌어다 놓고 싶다."

---

## §1. 비전 (Vision)

**비전공자가 실 위젯을 드래그-드롭 + 위치 조정으로 Roll20 시트 (캐릭터 시트 + 굴림 결과 틀) 를 만든다.**

- 워크스페이스에 블록을 쌓는 게 *아니라*, 시트 캔버스에 위젯을 **놓는다.**
- 위젯은 블록 (논리) 이 아니라 **실 모양 (input/select/button…)** 으로 표시 — 미리보기 ≒ 캔버스.
- 위치 = `position: absolute; left/top/width/height` — 자유.
- 이름 (`name`) = Roll20 의 `attr_xxx` 식별자 — **영어 + 숫자 + `_` 만**.

블록 모드 (워크스페이스) 는 *제거되지 않음.* WYSIWYG 모드는 블록 모드 와 동급의 **편집 모드** 로 추가됨. 사용자가 [편집] / [조립] 토글로 전환.

---

## §2. 확정된 결정 (Phase A 사용자 ack 완료)

| ID | 결정 | 메모 |
|---|---|---|
| W1 | 시트 폭 **850px** | Roll20 default 표준 |
| W2 | snap **8px** + off 토글 | 인스펙터 픽셀 미세조정 가능 |
| W3 | 스타일 = 클래스 + 별도 CSS (능력 제한 X) | 인스펙터 안 `class` 필드 + CSS workspace |
| W4 | **6 카테고리** 위젯 갤러리 | 기본 / 입력 / 표시 / 굴림 / 컨테이너 / 굴림 결과 틀 |
| W5 | 양방향 sync = Phase A 안 *간단* 포함 (hover/click) | full 양방향 = Phase B |
| W6 | 인스펙터 안 **위치 섹션** (별도 탭 X) | 위치/크기/이름/클래스 한 패널 |
| W7 | 모드 토글 = **메인 영역 상단** | [✏ 편집] / [🟦 조립] / [📄 미리보기] |
| W8 | 위치 = **`position: absolute`** | 좌표 = x/y px |
| W9 | 위젯 카드 = **실 위젯 모양** | input 위젯 = `<input>` 박스 그대로 |
| W10 | 초기 위젯 **12개** | 10 sheet + 2 rolltemplate |
| W11 | undo/redo **100 step** | Phase A 는 stub (Phase B 본 구현) |
| W12 | DnD = **@dnd-kit/core + 자체 pointer** | drag = dnd-kit / move = pointer |

---

## §3. 추가 결정 (사용자 ack 후 변경)

| ID | 결정 | 메모 |
|---|---|---|
| N1 | `name` 속성 (= Roll20 `attr_` 식별자) — **regex `/^[a-z][a-z0-9_]*$/i` 강제** | 한국어 / 공백 / 특수 차단. 인스펙터에서 invalid = 빨강 outline + 에러 메시지 |
| N2 | 미리보기 **9 레이어** + **굴림 결과 틀 별도 sub-canvas** | 시트 + 굴림 결과 틀이 서로 다른 렌더 컨텍스트. 굴림 결과 틀 캔버스 폭 = **280px** (Roll20 채팅 default) |
| N3 | `name` 속성 있는 모든 element 호버 시 **tooltip 표시** | `attr_strength` 형태로 식별자 노출. 캔버스 와 미리보기 양쪽 |
| A 옵션 | [편집] 모드 안 **sub-tab [시트] / [굴림틀]** | tab X = 캔버스 width 자체가 다름 |

---

## §4. 모드 구조

### §4.1 메인 영역 모드 (W7)

```
[✏ 편집]   [🟦 조립]   [📄 미리보기]
   ▼          ▼            ▼
┌──────┐  ┌──────┐    ┌──────┐
│ 캔버스│  │블록스택│    │렌더링│
│(시트)│  │       │    │       │
│      │  │       │    │       │
└──────┘  └──────┘    └──────┘
```

- **편집** — WYSIWYG 캔버스. 좌측 위젯 갤러리 + 캔버스 + 우측 인스펙터.
- **조립** — 기존 Blockly 워크스페이스. 변경 없음.
- **미리보기** — 기존 PreviewMain. 변경 없음 (+ 레이어 토글 추가).
- **분할** — 옵션 (편집 + 미리보기 동시) — Phase A 는 [편집] 단독 우선.

### §4.2 편집 모드 sub-tab (A 옵션)

```
편집 모드 캔버스 위 sub-toolbar:

[시트 (850px)]  [굴림틀 (280px)]   |  폭▾ 줌+/− snap■
   ↑ 선택됨            ↑ 클릭하면 캔버스 폭/저장공간 전환
```

- **시트** — `sheetWidgets[]` 렌더, 캔버스 폭 = 850px.
- **굴림틀** — `rolltemplateWidgets[]` 렌더, 캔버스 폭 = 280px.

저장 공간은 `workspaceStore` 안 2 배열 (시트 / 굴림틀).

---

## §5. 위젯 갤러리 (W4 + W9 + W10)

### §5.1 카테고리 6개

| ID | 한국어 라벨 | 포함 위젯 (Phase A) |
|---|---|---|
| `basic` | 기본 | 제목, 이미지 |
| `input` | 입력 | 텍스트 입력칸, 숫자 입력칸, 여러 줄 입력칸, 체크박스, 선택 메뉴 |
| `display` | 표시 | (Phase A 0, Phase B 확장) |
| `dice` | 굴림 | 버튼, 굴림 버튼 |
| `container` | 컨테이너 | 그룹 박스 |
| `rolltemplate` | 굴림 결과 틀 | {{필드}}, 결과 헤더 |

### §5.2 12개 초기 위젯

**시트 모드 (10):**

| # | 이름 | 카테고리 | 실 렌더 | 기본 attrs |
|---|---|---|---|---|
| 1 | 텍스트 입력칸 | input | `<input type="text">` | `{ name: '', value: '' }` |
| 2 | 숫자 입력칸 | input | `<input type="number">` | `{ name: '', value: '0' }` |
| 3 | 체크박스 | input | `<input type="checkbox">` | `{ name: '' }` |
| 4 | 선택 메뉴 | input | `<select><option>…</option></select>` | `{ name: '', options: [] }` |
| 5 | 여러 줄 입력칸 | input | `<textarea>` | `{ name: '' }` |
| 6 | 버튼 | dice | `<button>` | `{ label: '버튼' }` |
| 7 | 굴림 버튼 | dice | `<button class="roll">🎲</button>` | `{ name: '', label: '굴림', formula: '' }` |
| 8 | 제목 | basic | `<h2>` | `{ text: '제목' }` |
| 9 | 이미지 | basic | `<img>` placeholder | `{ src: '' }` |
| 10 | 그룹 박스 | container | `<fieldset>` | `{ legend: '' }` |

**굴림틀 모드 (2 — Phase B 에서 확장):**

| # | 이름 | 카테고리 | 실 렌더 | 기본 attrs |
|---|---|---|---|---|
| 11 | {{필드}} | rolltemplate | `<span>{{name}}</span>` | `{ name: '' }` |
| 12 | 결과 헤더 | rolltemplate | `<h3>` | `{ text: 'Roll Result' }` |

### §5.3 위젯 카드 모양 (W9)

- **실 위젯 모양 mini-render** — 카드 안에 실 input/button/etc 렌더 (disabled).
- 라벨 = 한국어 자연어 (예: "텍스트 입력칸").
- 클릭 또는 drag 가능. drag preview = 실 위젯 모양.

---

## §6. 캔버스 (W1 + W8)

### §6.1 컨테이너

- **시트** — `width: 850px; min-height: 1100px; position: relative;`
- **굴림 결과 틀** — `width: 280px; min-height: 400px; position: relative;`

배경 = 미리보기 시뮬레이션 — `autoPrefix` (D62) + runtime.css 적용.

빈 상태 empty state: "위젯을 드래그해서 시작하세요" + 화살표 좌측 갤러리.

### §6.2 좌표계

- 좌상단 = (0, 0).
- 모든 위젯 = `position: absolute; top: y; left: x; width: w; height: h;`.
- snap 8px 가 on 이면 좌표 `Math.round(v / 8) * 8`.

### §6.3 폭 dropdown

| 모드 | 옵션 |
|---|---|
| 시트 | 640 / 740 / 850 (default) / 960 / 1000 / custom |
| 굴림 결과 틀 | 260 / 280 (default) / 300 / 350 |

---

## §7. 인스펙터 (W6 + N1)

편집 모드 + 위젯 선택 시 인스펙터 panel:

```
┌──────────────────────┐
│ 위치 / 크기            │
│   x     [    200] px │
│   y     [    100] px │
│   너비  [    150] px │
│   높이  [     32] px │
├──────────────────────┤
│ 이름 (Roll20 attr)    │
│   [strength________] │ ← regex /^[a-z][a-z0-9_]*$/i
│   ⓘ 영어 + 숫자 + _ 만 │
├──────────────────────┤
│ 클래스                │
│   [stat-box________] │
├──────────────────────┤
│ 기본값                │
│   [____________]    │
└──────────────────────┘
```

### §7.1 이름 검증 (N1)

```ts
const NAME_RE = /^[a-z][a-z0-9_]*$/i;
function isValidAttrName(s: string): boolean {
  return s === '' || NAME_RE.test(s);
}
```

invalid 입력 시:
- 입력 box 빨강 outline (`ring-2 ring-red-500`).
- 아래 빨강 텍스트 "영어 + 숫자 + _ 만 가능 — 예: strength, hp_max".
- store 에는 update 안 함 (사용자가 고치는 동안 stale 안 됨 — controlled draft).

---

## §8. 양방향 sync (W5 부분 + N3)

### §8.1 Phase A 안 포함

- 캔버스 → 인스펙터: 위젯 클릭 = 선택 / 인스펙터 갱신.
- 인스펙터 → 캔버스: 값 변경 = 캔버스 즉시 reflect.
- 미리보기 hover → 캔버스 outline (옅은).
- 미리보기 click → 캔버스 outline (강조) + 인스펙터 갱신.
- 캔버스 widget click → 미리보기 element 강조.
- N3: `name` 속성 있는 모든 element 호버 시 tooltip = `attr_${name}`.

### §8.2 Phase B+ (Phase A 아님)

- preview ↔ blocks ↔ canvas 3 way.
- conflict resolution / divergence indicator.
- collaborative editing.

---

## §9. 미리보기 레이어 (N2)

### §9.1 9 레이어 (toggle 메뉴)

| ID | 라벨 | 활성 element |
|---|---|---|
| `all` | 전체 | 모든 element 정상 |
| `structure` | 구조 | `<fieldset>`, `<div>`, `<section>` (컨테이너만) |
| `input` | 입력 | `<input>`, `<select>`, `<textarea>` |
| `roll` | 굴림 버튼 | `<button.roll>` 또는 `data-role="roll"` |
| `text` | 텍스트 | `<h1-6>`, `<p>`, `<span>` 텍스트 |
| `image` | 이미지 | `<img>` |
| `table` | 표 | `<table>`, `<tr>`, `<td>` |
| `repeating` | 반복 영역 | `[data-rfh]` repeating field section |
| `custom` | 사용자정의 | `[class]` 가 user-defined class 인 것 |

### §9.2 비활성 element 표시

```css
.layer-filter[data-active="input"] :not(input):not(select):not(textarea) {
  opacity: 0.3;
  pointer-events: none;
}
```

iframe srcdoc 에 inject. uiStore 의 `previewLayer` 값에 따라 root 의 `data-active` 갱신.

### §9.3 굴림 결과 틀 별도 sub-canvas

굴림 결과 틀은 Roll20 채팅에 표시되므로 시트 캔버스와 별도. 폭 280px (Roll20 채팅 default).

---

## §10. workspaceStore 확장

```ts
interface WidgetInstance {
  id: string;
  type: WidgetType;       // 'text-input' | 'number-input' | ...
  x: number;
  y: number;
  width: number;
  height: number;
  attrs: {
    name?: string;
    class?: string;
    label?: string;
    value?: string;
    [key: string]: unknown;
  };
  style?: Partial<CSSStyleDeclaration>;
}

interface WorkspaceState {
  // ... 기존 ...
  sheetWidgets: WidgetInstance[];
  rolltemplateWidgets: WidgetInstance[];
  addWidget(target: 'sheet' | 'rolltemplate', type: WidgetType, x: number, y: number): string;
  removeWidget(target: 'sheet' | 'rolltemplate', id: string): void;
  updateWidget(target: 'sheet' | 'rolltemplate', id: string, partial: Partial<WidgetInstance>): void;
}
```

---

## §11. 의존성

**Phase A 외부 의존성 0.** HTML5 native DnD (`draggable` + `ondragover` + `ondrop` + `dataTransfer`) 와 pointer events 만으로 충분. `@dnd-kit/core` 는 Phase B (a11y + sortable) 에서 추가.

---

## §12. 마일스톤 (Phase A → Phase B)

### Phase A MVP (이 spec)

- A-0 spec doc.
- A-1 edit mode state + shell.
- A-2 EditCanvas 컨테이너 (850 / 280).
- A-3 위젯 갤러리 (12 위젯 / 6 카테고리).
- A-4 드래그-드롭 to 캔버스.
- A-5 선택 + 이동 (pointer + 키보드).
- A-6 인스펙터 위치/이름 (N1 강제).
- A-7 9 레이어 토글 (미리보기).
- A-8 양방향 sync (간단) + N3 hover.
- A-9 라이브 검증.

### Phase B (다음 세션)

- 리사이즈 핸들 (8 방향).
- 멀티 선택 + 정렬 (좌/우/중앙 등).
- 컨테이너 위젯 안에 nested.
- undo/redo 100 step 본 구현.
- 양방향 sync full (blocks ↔ canvas).
- Phase C 위젯 (반복 영역, 탭, 등).

### Phase B-shadow — Shadow DOM 양방향 sync (이 commit)

> 별도 spec `21_wysiwyg_unified.md` 가 task 에 언급됐으나 repo 에 미존재 — 본 §12 에 통합.

- **shadow click → store**: `mountSheetShadow({ onSelect })` → ShadowRoot click delegation 이 `closest('[data-r20-block-id]')` 로 ancestor 식별 → `workspaceStore.setSelectedBlockId(id, 'preview')`.
- **store → shadow outline**: mount 결과의 `setSelected(blockId | null)` API. 외부에서 selectedBlockId 변경 시 PreviewMain effect 가 호출 → 모든 `.r20-selected` 제거 후 새 element 부착. CSS = `outline: 2px solid #f60; outline-offset: 2px` (Shadow inline `<style>`).
- **store → 좌측 트리**: `WorkspaceTree` 의 row 가 `selectedBlockId` 비교 → `bg-orange-500/20 + ring-orange-500/60` 으로 시각 페어링 (Shadow outline 색과 동일 톤).
- 무한 루프 방지: origin 라벨 (`'preview' | 'tree'`) 로 sync src 구분.
- 검증: live e2e 는 sandbox env 에서 npm install/dev 실행 가능 여부에 의존 — 코드 path inspection 으로 emit (`data-r20-block-id` 자동 박힘) ↔ shadowMount click delegation ↔ store ↔ effect re-emit 의 4 cycle 모두 연결됨.

### Phase C-shadow — Shadow DOM drag-to-move (이 commit)

> 별도 spec `21_wysiwyg_unified.md` 미존재 — Phase B-shadow 와 함께 본 §12 에 통합.

#### 변경 요약 (한 줄)

Shadow DOM 안 element 를 pointer drag → `LEFT_PX/TOP_PX` field 가 있는 블록만 위치 round-trip. 다른 블록은 안전 무시. 입력 요소 위에선 drag 발화 X (native focus 보존).

#### 흐름

1. `mountSheetShadow` 가 새 콜백 `onDragStart / onDragMove / onDragEnd` 노출.
2. ShadowRoot 의 `pointerdown` → 가장 가까운 `[data-r20-block-id]` ancestor → state 기록 + `host.setPointerCapture`.
3. `pointermove` 가 `DRAG_THRESHOLD_PX (3px)` 초과 시점에 `onDragStart` 호출 + 호스트에 `data-r20-dragging` 속성 + element 에 `.r20-dragging` 클래스 (cursor: grabbing, 점선 outline).
4. PreviewMain 의 `onDragMove(blockId, dx, dy)` → adapter 에서 `hasBlockField('LEFT_PX')` & `hasBlockField('TOP_PX')` 검사 → rAF 1프레임 합쳐서 `setBlockField` 두 번. zoom 보정 = `host.getBoundingClientRect().width / host.offsetWidth`.
5. `Blockly.setFieldValue` → `BLOCK_CHANGE` 이벤트 → BlocklyModelHost listener → `bumpStructure` → 500ms 디바운스 후 emit → preview 재mount → 새 LEFT/TOP 으로 그려짐.
6. `pointerup` → pending rAF flush → `onDragEnd` → 다음 click 한 번 suppress (browser 의 drag→click 자연 발화 방어).

#### API 변경

`lib/blockly/adapter.ts` — 3개 메서드 추가:

- `hasBlockField(key, blockId, fieldName): boolean`
- `getBlockField(key, blockId, fieldName): string | null`
- `setBlockField(key, blockId, fieldName, value): boolean` — 값 변경 시 true.

기존 `setFieldValue` (반환 void) 와 별도 — 호출자 호환성 유지.

#### 신규 블록

`r20_pos_div` — Container 카테고리, c-shape. 필드 = LEFT_PX, TOP_PX, WIDTH_PX, HEIGHT_PX, CLASS. emit = `<div class="sheet-..." style="position:absolute;left:Xpx;top:Ypx;width:Wpx;height:Hpx;">...</div>`. WYSIWYG drag 의 round-trip 시연 + 자유 배치 박스 사용자 시나리오.

기존 블록 (r20_div / r20_input 등) 은 LEFT_PX/TOP_PX 없음 → drag 시도해도 console.debug 로 무시 + dragOrigin.hasPos=false → setBlockField 미호출. UX 비손상.

#### 입력 요소 보존

`pointerdown` 핸들러가 `closest('input, textarea, select, button, option')` 체크 → 매치 시 drag state 미설정 + 즉시 return. native focus / typing / submit 동작 그대로. 단, click delegation 은 그대로 작동 — `onSelect` 가 click 시점에 호출됨.

#### 성능 메모

- pointermove 60-120Hz → rAF 안에서 한 번만 setBlockField. 결과적으로 ≤60 setFieldValue 호출/초.
- 각 setFieldValue 는 BLOCK_CHANGE 이벤트 → bumpStructure (queueMicrotask coalesce → 1회/microtask).
- emit 디바운스 500ms → 드래그 중 preview 재렌더 X, 드롭 후 한 번만.
- 단점: undo history 가 매 frame 항목 누적 (Blockly Events.setGroup 미사용). 후속 commit 에서 `Blockly.Events.setGroup(true)` wrap 으로 단일 undo 단위로 묶을 예정.

#### 검증

- typecheck: 변경 4파일 (shadowMount.ts / adapter.ts / container.ts / PreviewMain.tsx) 모두 TS 에러 0. pre-existing 'sonner' 모듈 누락 에러는 본 sandbox 환경 한계 (node_modules 부분 복사) — 본 commit 과 무관.
- live e2e: 본 sandbox 에선 next dev 실행 가능 disk 공간 부족 → 코드 path inspection 으로만 검증. UI 라이브 측정은 host 환경 / 다음 commit 에서.

#### 알려진 caveat / 후속

- undo 단위 미정 (위 성능 메모 참조).
- 미세 정밀 모드 (Shift+drag = 1px snap, 기본 = 8px snap) 미구현 — Phase D 후보.
- container resize 핸들 미구현 (8 방향) — Phase B 본 spec 의 별도 항목.
- 모바일 (터치) — pointer events 가 통합 처리하지만 라이브 측정 미진행.

### Phase D-shadow — Shadow DOM inline text edit (이 commit)

> Phase B / C 연장선 — dblclick → contentEditable swap.

#### 변경 요약 (한 줄)

미리보기 안 텍스트 element 더블클릭 → contentEditable 활성 → blur 시 `setBlockField` 로 round-trip. 우선 'TEXT', 'LABEL', 'VALUE', 'CONTENT' 필드 순으로 매치.

#### 흐름

1. `mountSheetShadow` 가 새 콜백 `onEditText(blockId, newText)` 노출.
2. ShadowRoot 의 `dblclick` → 가장 가까운 `[data-r20-block-id]` ancestor → 직속 TEXT_NODE 가진 element 이면 그 element, 아니면 blockEl 자체를 textEl 로 선택.
3. textEl 이 input/textarea/select/button/label 등 form element 이면 무시 — native 단어 선택/포커스 보존.
4. `contenteditable="true"` + `.r20-editing` 클래스 + focus + 전체 선택 (Shadow Root `getSelection()` 우선, fallback `window.getSelection()`).
5. blur 시 `contenteditable` 제거 + `.r20-editing` 제거. orig 와 비교해 변경 있을 때만 `onEditText` 호출.
6. Enter (shift 없이) → blur. Escape → 원본 복구 후 blur.
7. PreviewMain `onEditText` → 활성 + html/css/i18n 워크스페이스 순회로 블록 찾고, `hasBlockField` 로 'TEXT' → 'LABEL' → 'VALUE' → 'CONTENT' 첫 매치 필드에 `setBlockField`. 셋 다 없으면 console.debug 후 noop.
8. `setBlockField` → `BLOCK_CHANGE` 이벤트 → bumpStructure → 500ms 디바운스 후 emit → preview 재mount → 새 텍스트 박힘.

#### Phase C 와의 격리

- pointerdown 핸들러가 `editingState != null` 또는 `target.isContentEditable` 일 때 즉시 return → drag/select 발화 안 됨. 마우스 selection 은 native.
- form element / contentEditable 위에서는 dblclick 도 native word-select 우선 — `isFormElement` 첫 체크.

#### 시각 피드백

- 편집 중 element: `outline: 2px dashed #16a34a` (green), `background: rgba(22,163,74,0.06)`, `cursor: text`.
- drag (orange dashed #f60) / select (orange solid #f60) 와 색으로 구분.
- CSS 는 `shadowMount.ts` inline 과 `lib/preview/shadowSelectOverlay.css` 양쪽 동기화 (overlay 파일은 import 안 됨, 동일 내용 유지 책임).

#### 검증

- typecheck/lint: pending (다음 step).
- live e2e: pending — 본 sandbox disk/네트워크 제한으로 다음 환경에서 측정.
- 라이브 측정 안 한 항목: 영시영 1부 헤더 라벨 더블클릭 → 입력 → blur → 코드 패널 emit 새 값 verify. screenshot 미수집.

#### 알려진 caveat / 후속

- 멀티라인 (textarea 같은) 텍스트 편집 — 현재는 `Enter` 가 blur 트리거하므로 단일 줄만. 추후 Shift+Enter 가 줄바꿈 + Enter 가 commit 으로 분기 검토.
- 빈 문자열 commit — 현재는 `'' !== orig` 면 그대로 commit. setBlockField 도 빈 값 허용 → 블록은 빈 텍스트 보존. UX 이의 시 후속.
- 부분 selection 후 dblclick → 첫 dblclick 만 잡힘 (editingState 검사). 두 번째 dblclick 으로 다른 element 편집 → blur 가 먼저 발화하므로 자연스럽게 swap.
- emit 디바운스 500ms — blur → 새 텍스트 박힘까지 사용자 체감 0.5초. drag 와 동일 정책.
- Phase E (context menu — 우클릭 메뉴) 진행 가능 (본 Phase D 가 차단 없음).

#### Phase D fix — emit commit 누락 (이 commit, local_86b826b4 검증 반영)

라이브 verify 세션 `local_86b826b4` 에서 발견된 결함: dblclick → contentEditable → 시각 텍스트 변경 OK 인데 blur 후 코드 패널의 raw HTML 에 새 값이 박히지 않음.

원인:

- `adapter.setBlockField` 가 `block.setFieldValue` 를 호출하면 정상 경로에선 `BLOCK_CHANGE` 이벤트 → `BlocklyModelHost` changeListener → `bumpStructure` → `useEmitPipeline` 디바운스 (500ms) → emit cache 갱신이 발화한다.
- 그러나 `perfHook.injectXml` / `adapter.hydrateFromXml*` 의 `Blockly.Events.disable()` 카운터가 (예외 경로 또는 nested 호출에서) 미해소된 채 남아 있으면 후속 `setFieldValue` 가 BLOCK_CHANGE 를 발화하지 못한다. 그 결과 structureVersion 이 안 올라가 emit 도 안 돈다.
- 또한 Blockly v12 의 외부 (UI 아닌) `setFieldValue` 호출이 일부 경로에서 이벤트 전파를 빼먹는 케이스가 동일 증상을 만든다.

수정 (belt + suspenders):

1. `lib/blockly/adapter.ts` — `setBlockField` 호출 직전 `Blockly.Events.isEnabled()` 가 false 면 1회 `enable()` 로 끌어올린 뒤 `setFieldValue` 호출, finally 에서 `disable()` 로 원상복구. caller 의 `Events.disable` 카운터에 영향 없음 (-1 까지 떨어트려도 `isEnabled()` ≤0 → false 동작 그대로).
2. `components/editor/PreviewMain.tsx` — `onEditText` 핸들러가 `setBlockField` 성공 시 (`ok === true`) `useWorkspaceStore.getState().bumpStructure(ws, count)` 를 명시적으로 호출. 정상 경로의 이벤트 발화가 살아있을 땐 동일 frame 내 중복 bump (`counter+2`) 가 되지만 `useEmitPipeline` 은 한 frame 내 다회 호출에도 500ms 디바운스로 1회만 emit 실행 → 무해.

검증 (라이브):

- 합성 sample `<h1>Heading</h1><label>NameLabel</label>` import → h1 더블클릭 → "Edited" 입력 → Enter → 500ms 후 코드 패널 raw HTML 에 `<h1>Edited</h1>` 박힘 확인 (스크린샷 저장).
- 회귀: 정상 경로 (이벤트 발화 살아있는 일반 add-block) 에서도 동일 emit 1회만 실행 — devtools Performance 에서 confirm.

후속:

- 본 fix 는 증상에 대한 robust 처리. 근본적으로 Blockly v12 의 외부 setFieldValue 이벤트 전파 신뢰성을 별도 spike 로 측정해 (시트 단위 100회 호출 → 100회 BLOCK_CHANGE) 라이브러리 측 fix 요청 여부 결정.

#### Phase D fix — add-block bumpStructure 누락 (local_1abb2993)

Phase D 의 emit-commit fix 검증 세션이 부수 발견: 블록 라이브러리에서 BlockTile 클릭 (또는 캔버스에 drag-drop) → 블록은 워크스페이스에 정상 시각 추가되지만 `useWorkspaceStore.blockCount` 가 0 으로 유지 → `PreviewEmptyState` 영구 표시 → 미리보기 영구 빈 화면.

원인:

- `adapter.appendBlockToWorkspace` 가 `ws.newBlock(blockType) + initSvg + render` 만 호출하고 `BLOCK_CREATE` 이벤트를 명시 발화하지 않음. Blockly v12 의 `WorkspaceSvg.newBlock` 은 데이터 구조만 만들 뿐 이벤트 발화 책임은 호출자 몫.
- 결과로 `BlocklyModelHost` 의 changeListener (BLOCK_CREATE → `getAllBlocks().length` → `bumpStructure`) 가 트리거되지 않아 store 의 `blockCount === 0` 유지. `useEmitPipeline` 은 `structureVersion` 의존이라 emit 디바운스도 발동 안 함.
- BlocksLibrary BlockTile click / BlocklyModelHost onDrop / PreviewMain onDrop — 세 입력 경로 모두 `useWorkspaceStore.appendBlockToActive → adapter.appendBlockToWorkspace` 단일 진입점 통과 → 한 곳 fix 로 전부 회복.

수정 (belt + suspenders):

1. `lib/blockly/adapter.ts` — `appendBlockToWorkspace` 마지막에 `Blockly.Events.fire(new Blockly.Events.BlockCreate(block))` 명시 호출. `Events.isEnabled()` 가 false 면 1회 `enable()` 로 끌어올린 뒤 fire, finally 에서 원상복구 — `hydrateFromXml*` 의 disable 카운터 미해소 상태에서도 안전. 추가로 `countBlocks(key)` 메서드 노출 (캐퍼링용).
2. `lib/stores/workspaceStore.ts` — `appendBlockToActive` 가 새 id 획득 직후 `adapter.countBlocks(key)` → `bumpStructure(key, count)` 명시 호출. 정상 경로의 이벤트 발화가 살아있을 땐 동일 frame 내 중복 bump (counter+2) 가 되지만 emit 디바운스로 1회만 emit 실행 — 무해.

검증 (라이브):

- 빈 워크스페이스 → BlockTile (`r20_text_input`) 클릭 → `useWorkspaceStore.getState().blockCount > 0` 확인 → `PreviewEmptyState` 사라지고 미리보기 iframe 안 렌더 시작 → 코드 패널 raw HTML 에 emit 결과 박힘.
- 회귀: drag-from-library → workspace drop, drag-from-library → preview-overlay drop 도 동일 fix 로 회복 (세 경로 단일 진입점).

후속:

- Blockly v12 가 `WorkspaceSvg.appendBlock` 류 고수준 API 를 도입하면 본 belt+suspenders 제거 가능. `lib/examples/index.ts` 의 `bumpStructure` 명시 호출 패턴과 동일한 안전망.

### Phase E-shadow — Shadow DOM 우클릭 컨텍스트 메뉴 (이 commit)

> Phase B / C / D 연장선 — contextmenu 이벤트 → ShadowContextMenu 컴포넌트 → adapter 액션.

#### 변경 요약 (한 줄)

미리보기 안 element 우클릭 → 5개 항목 메뉴 (속성/복사/위로 이동/아래로 이동/삭제) → adapter API 디스패치 → 워크스페이스 변경 → emit → preview 재mount.

#### 흐름

1. `mountSheetShadow` 가 새 콜백 `onContextMenu(blockId, x, y)` 노출. ShadowRoot 의 `contextmenu` 이벤트 listener 가 가장 가까운 `[data-r20-block-id]` ancestor 찾고, 매치 시 `preventDefault()` + `stopPropagation()` + `opts.onContextMenu?.(blockId, e.clientX, e.clientY)`.
2. `editingState != null` (Phase D contentEditable 활성) 면 listener 가 즉시 return — native 메뉴 보존 (텍스트 편집 중 잘라내기/복사 필요).
3. form element (input/textarea/select/button/option/label) 위 우클릭도 Shadow 메뉴를 띄움 — 사용자 멘탈 모델 (블록 단위 조작) 통일.
4. PreviewMain 에 `contextMenuState: { blockId, x, y } | null` state. 콜백이 setter 호출 → React 가 `ShadowContextMenu` 를 (x, y) 의 `position: fixed` 으로 렌더.
5. ShadowContextMenu 는 외부 mousedown (capture phase) 또는 Escape 키 → `onClose` → state null.
6. 항목 클릭 → `onAction(action)` → PreviewMain `dispatchContextAction(action, blockId)` → adapter API.

#### 5개 항목

| 항목 | 키 | adapter API | 동작 / 실패 |
|---|---|---|---|
| 속성 | `inspect` | `setSelectedBlockId(id, 'inspector')` + sidebar right 펼침 + `setSidebarRightTab('attrs')` | 항상 OK |
| 복사 | `duplicate` | `adapter.duplicateBlock(ws, id)` — `Blockly.Xml.blockToDom` → `domToBlock`, +20px 오프셋 | 실패 시 toast `복사 지원 예정 (이 블록은 복제 불가)` |
| 위로 이동 | `moveUp` | `adapter.moveBlockUp(ws, id)` — top-level Y 좌표 swap | statement chain / 이미 최상단 → false → toast `위로 이동 지원 예정` |
| 아래로 이동 | `moveDown` | `adapter.moveBlockDown(ws, id)` — 대칭 | 동일 |
| 삭제 | `delete` | `adapter.deleteBlock(ws, id)` — `block.dispose(true)` (healStack) | 실패 시 toast `삭제 실패` |

#### adapter 추가 API (4개)

`lib/blockly/adapter.ts`:

- `deleteBlock(key, blockId): boolean` — `getBlockById` → `dispose(true)`. block 없으면 false. healStack=true 로 prev/next 연결 보존.
- `duplicateBlock(key, blockId): string | null` — `Blockly.Xml.blockToDom(b, true)` → `Blockly.Xml.domToBlock(dom, ws)`. 새 블록을 원본 +20px 위치로 이동. 반환 = 새 block id 또는 null.
- `moveBlockUp(key, blockId): boolean` — top-level only. `getParent()` 있으면 false (statement chain 미지원). `getTopBlocks(true)` 의 idx 가 0 이면 false. 그 외엔 prev 와 Y 좌표 swap (X 도 함께 swap).
- `moveBlockDown(key, blockId): boolean` — 대칭. idx 가 마지막이면 false.

#### 워크스페이스 키 탐색

PreviewMain `dispatchContextAction` 은 active 워크스페이스 우선, 없으면 html → css → i18n 순으로 `adapter.getBlock(ws, blockId)` 가 매치되는 첫 워크스페이스 선택. drag/edit Phase 와 동일 전략 — block 의 워크스페이스 추적 metadata 없이도 안전.

#### Phase B/C/D 와의 격리

- click delegation (Phase B) — `contextmenu` 는 `click` 와 분리된 이벤트 → 우클릭이 selection 을 갱신하지 않음 (사용자가 우클릭으로 다른 블록의 메뉴를 띄워도 selection 은 유지).
- pointer drag (Phase C) — `button !== 0` 으로 우클릭은 drag 시작 안 함. 기존 가드와 자연스럽게 분리.
- inline edit (Phase D) — editingState 활성 중엔 contextmenu listener 즉시 return → native 메뉴 보존.

#### 시각

- 메뉴 width 160px, 항목 padding 6px/12px, hover bg-accent.
- '삭제' 항목 = `text-destructive` (빨강) — destructive action 시각 표시.
- viewport 경계 보정 — clamp 로 화면 밖 안 나가게 (`window.innerWidth - W - 4` / `window.innerHeight - H - 4`).
- 메뉴 자체 우클릭은 `e.preventDefault()` 로 native 메뉴 중첩 방지.

#### 검증

- typecheck/lint: pending (다음 step).
- live e2e: 작은 sample import → 미리보기 안 element 우클릭 → 메뉴 표시 → "삭제" 클릭 → 워크스페이스 + 미리보기에서 사라짐 확인 (screenshot 첨부).

#### 알려진 caveat / 후속

- statement chain (next/prev connection) 안 블록의 위/아래 이동 미구현 — Blockly connection 재배치 비용 + edge case 가 많아 별도 Phase 후보.
- 메뉴 안 키보드 navigation (Tab/Arrow) 미지원 — Radix DropdownMenu 로 마이그레이션 시 자동 획득.
- 우클릭 → 메뉴 → "속성" 클릭 시 selection origin = 'inspector' — 'preview' 가 아닌 'inspector' 로 둠 (사용자 의도가 Inspector 열기). 양방향 sync 트리거 차이 없음.
- emit 디바운스 500ms — 삭제/복사 → 새 미리보기까지 0.5초 체감. Phase B/C/D 와 동일 정책.
- Phase F (양방향 sync 강화) 진행 가능 (본 Phase E 가 차단 없음).


### Phase B coverage 확대 — 모든 emit element 에 data-r20-block-id (이 commit)

> Phase B (click delegation) / C (drag) / D (inline edit) / E (context menu) 의 모든 미리보기 인터랙션이 의존하는 `[data-r20-block-id]` 탐색 — top-level 만이 아니라 emit 그래프의 모든 element 에 박혀야 의미 있게 동작. 이 commit 이 그 coverage 를 채운다.

#### 변경 요약 (한 줄)

`EmitEngine.runGenerator` 가 element-emit shape (stack/c/cap/hat/e) 인 모든 block 의 첫 opening tag 에 `data-r20-block-id` 를 주입 — top-level / nested / statement chain 안 / value slot 깊이 무관.

#### 배경 (라이브 verify 발견)

Phase C+D 라이브 verify 세션 (`local_86b826b4`) — D&D 5e 시트 import (509 top-level 블록) 후 미리보기 안 `[data-r20-block-id]` element 가 **단 2개** 로 측정됨. 즉 h1 / label / 대부분 input / 컨테이너 안 자식 element 가 모두 미박힘 → 클릭해도 가장 가까운 ancestor 가 외곽 root 1개로 walk → 모든 클릭이 같은 (또는 없는) block 으로 매칭. WYSIWYG 의 select / drag / dblclick / contextmenu 가 사실상 작동 X.

#### 원인

이전 정책 (`emit.ts`):

- `runGenerator` 는 generator 의 결과 (raw HTML 문자열) 를 그대로 반환.
- `wrapTopLevel` 만 `injectBlockIdAttr` 호출 → **top-level 블록의 outer element 한 개** 에만 id 주입.
- `statementToCode` / `valueToCode` 가 재귀 호출하는 child 의 emit 은 raw 그대로 join → child element 에는 id 없음.

플랫 시트 (가로 줄 + 박스 안에 h1, label, input 다수 — 6K+ top-level) 의 경우 element 의 대다수가 자식 → id coverage 가 한 자릿수 ‰ 수준.

#### 수정

`runGenerator` 에 id 주입 단계 추가:

```ts
const raw = def.generator(block, this);
const normalized = normalizeGen(raw);
const shape: BlockShape = def.shape ?? 'stack';
if (
  normalized.code &&
  shape !== 'reporter' &&
  shape !== 'boolean'
) {
  const injected = injectBlockIdAttr(normalized.code, block.id);
  if (injected !== null) {
    return { code: injected, order: normalized.order, def };
  }
}
return { ...normalized, def };
```

- 모든 element-shape (stack / c / cap / hat / e) 의 emit 결과의 첫 opening tag 에 자기 block id 박힘.
- reporter / boolean 은 값 식 (`@{strength}` 등) — element 아님, attribute 안에 들어가면 깨지므로 **건드리지 않음**. (top-level 일 때는 `wrapTopLevel` 가 별도로 `<input>` wrapper 만들어 id 박음 — 기존 정책 유지.)
- `wrapTopLevel` 의 `injectBlockIdAttr` 호출은 이제 idempotent no-op (이미 박힌 id 위에 다시 작업 시 unchanged 반환).
- CSS / i18n 워크스페이스 → generator 가 element 가 아닌 텍스트/JSON 식 emit → `injectBlockIdAttr` 가 null 반환 → 통과 (영향 없음).

#### 출력 contract 영향

emit HTML 문자열에 `data-r20-block-id="<blockId>"` 가 추가되는 element 수가 늘어남. Roll20 가 이 attribute 를 무시하므로 시트 호환성 영향 0 (이미 wrapper 한 개에 박혔던 정책의 자연 확장).

#### 회귀 영향

- 영시영 1부 매칭: emit 변경은 import (matchHtml / matchCss / i18n) 와 격리. 매칭 6134/6134 유지.
- 기존 import 라운드트립 테스트 (basic / i18n_text / i18n_placeholder / inline_bold / conditional_view) — emit 의존 X (import 측 helper 단위 테스트).
- export 묶음 / sanitize 단위 — sanitize 가 `data-r20-block-id` 를 strip 하므로 export ZIP 안 sheet.html 은 변동 X.

#### Phase D 잔재 충돌 회피

- Phase D 의 `shadowMount.ts` 의 `closest('[data-r20-block-id]')` 탐색이 그대로 동작 — element 자체에 attribute 있으니 walk 즉시 매치.
- Phase D 의 dblclick → contentEditable 텍스트 노드 매핑 — 텍스트 노드 부모가 attribute 가진 block element 와 일치 → 더 안전.
- Phase E 의 contextmenu listener — 동일하게 closest 탐색, coverage 늘어남.

#### 알려진 caveat / 후속

- nested element 가 둘 이상인 generator (예: `<label><input>...</label>`) — 첫 element (label) 에만 id 박힘. 내부 input 의 단독 select 는 label 의 click handler 가 처리. (각 input/label 을 별도 block 으로 분해하려면 import 그래프 변경 필요 — 별도 phase.)
- `r20_select` 의 generator 가 emit 하는 `<select>...<option>...</option></select>` — `<select>` 에 select block id, `<option>` 에는 별도 `r20_select_option` block 의 id (statement chain 으로 들어옴) → 자연 분리.
- `injectBlockIdAttr` 가 null 반환하는 케이스 (pure 텍스트, 주석만, void prefix) — 변동 없이 raw 통과 → 기존 fallback (`wrapTopLevel` 의 `<div>` 래퍼) 가 top-level 에만 보호망 역할.

---

### Phase F-shadow — 양방향 sync 강화 + partial re-render API (이 commit)

**Anchor**: docs/spec/17_wysiwyg_mode.md §13. 이전 phases: §12 Phase A/B/C/D/E.

#### 변경 요약 (한 줄)

좌측 트리 → 미리보기 sync 완성 (tree row 클릭 → Shadow 안 element outline + viewport 밖이면 부드럽게 scroll-into-view), Inspector → 미리보기 즉시 갱신 belt+suspenders (Phase D fix 동일 패턴), 그리고 partial re-render `updateBlock(blockId, newOuterHtml)` API 만 노출 (wire 는 follow-up backlog).

#### Step 1 — tree → preview sync

지금까지: preview 안 element 클릭 → store 의 `selectedBlockId` 갱신 → 트리 row 가 자체 selected style 부착 (one-way: preview→tree).
Phase F: 정반대 방향도 활성. `selectionOrigin` 이 `'tree'` 일 때만 scroll 발동.

- `lib/preview/shadowMount.ts` `setSelected(blockId, opts?)` 시그니처 확장:
  - `opts.scrollIntoView === true` 이면 element 의 `getBoundingClientRect` 로 viewport 안인지 검사 후 밖이면 `scrollIntoView({behavior:'smooth', block:'center', inline:'nearest'})` 호출.
  - JSDOM / 일부 환경에선 `scrollIntoView` 미지원 → `try/catch` 로 swallow.
- `components/editor/PreviewMain.tsx`:
  - `selectionOrigin` 을 store subscription 으로 추가.
  - 기존 selectedId effect 가 `shadowSetSelectedRef.current?.(selectedId, { scrollIntoView: selectionOrigin === 'tree' })` 호출.
  - mount 직후 초기 outline 복원 시엔 `scrollIntoView: false` (init 시점 갑작스러운 점프 방지).
- `components/editor/WorkspaceTree.tsx`:
  - 이미 row click → `setSelected(node.id, 'tree')` 호출 중 (변경 없음). origin propagation 만 위 단계에서 활성.

#### Step 2 — Inspector → preview 즉시 갱신 (belt+suspenders)

정상 경로: Inspector 필드 입력 → `adapter.setFieldValue` → Blockly `BLOCK_CHANGE` 이벤트 → `BlocklyModelHost` changeListener → `bumpStructure` → `useEmitPipeline` 디바운스 → emit → Shadow re-mount.

Phase D fix 검증 세션 (`local_86b826b4`) 에서 동일 시나리오로 발견된 케이스: `hydrateFromXml` / perfHook `injectXml` 의 `Events.disable` 카운터가 미해소 상태로 남으면 `setFieldValue` 가 BLOCK_CHANGE 를 발화하지 않아 emit 갱신이 안 됨. PreviewMain `onEditText` 가 이미 동일 패턴으로 `adapter.setBlockField` (events-guard 포함) + 명시 `bumpStructure` 를 호출 중.

Phase F: `Inspector.onFieldChange` 도 동일 패턴으로 통일.

```ts
const ok = adapter.setBlockField(key, selectedId, name, value);
if (ok) {
  const count = adapter.listAllBlocks(key).length;
  useWorkspaceStore.getState().bumpStructure(key, count);
}
```

- `setBlockField` 는 `Blockly.Events.isEnabled()` 가 false 면 1회 enable 후 setFieldValue → finally 원복 (이벤트 보장).
- 명시 `bumpStructure` — 동일 frame 내 중복 bump 는 useEmitPipeline 의 디바운스가 1회만 실행하므로 무해.

#### Step 3 — partial re-render API (현재는 spec only)

현 mount 사이클: `parts` (`html` + `css` + `i18n` 합성본) 가 바뀌면 `useEffect` 의 cleanup → `shadow.innerHTML = ''` → 새 `mountSheetShadow` 호출 → 전체 DOM 재구성. 큰 sheet (수백~수천 element) 에서 비쌈, 그리고 선택 outline / contentEditable state / scroll position 이 매 재mount 마다 리셋.

Phase F 가 노출하는 API:

```ts
export interface ShadowMountResult {
  // ...
  updateBlock: (blockId: string, newOuterHtml: string) => boolean;
}
```

- element 찾기: `shadow.querySelector('[data-r20-block-id="<escaped>"]')`.
- 없으면 false → 호출자가 full re-mount fallback.
- `target.outerHTML = newOuterHtml` 로 swap. 다른 element 의 DOM 노드 / scroll / cE state 보존.
- contentEditable 활성 중이면 swap 보류 (false 반환) — 사용자의 입력 잃지 않게.

**현재 호출자 wire 안 됨 — follow-up backlog 항목.** 이유: emit pipeline 이 현재 sheet 전체 HTML 만 emit (블록 단위 diff 없음). diff 를 만들려면:

1. `lib/preview/emit.ts` 가 blockId → outerHTML 매핑 추가 emit (예: `Map<blockId, html>`).
2. PreviewMain 이 이전 emit 의 mapping 을 ref 로 보관, 새 emit 마다 diff 추출 (added / changed / removed blockId).
3. changed 만 `updateBlock` 호출. added / removed 는 full re-mount (DOM tree 구조 변경 위험).

본 phase 가 API 만 노출하고 wire 는 미루는 이유: emit 변경 + diff 인프라가 비용이 크고, 현재 sheet 크기 (수십~수백 element) 에선 full re-mount 가 체감 안 됨. 시트가 수천 element 로 자라면 본격 도입.

#### 시각 / UX

- tree→preview scroll: orange outline (`#f60`, Phase B 와 동일) + smooth scroll-into-view. 색은 동일하지만 `scroll` 동작이 추가됐을 뿐.
- preview→tree: 기존 그대로 (orange row 강조, Phase B).
- Inspector→preview: 사용자에 보이는 차이 0 (정상 경로에서 이미 동작), 단 hydrate 직후 첫 입력에서도 즉시 갱신이 보장됨 (Phase D fix 패턴 적용).

#### Phase A~E 와의 격리

- Phase B (select outline) — `setSelected` 의 추가 `opts` 인자는 optional → 기존 caller 영향 0.
- Phase C (drag-to-move) — 변경 없음.
- Phase D (inline text edit) — `updateBlock` 이 contentEditable 활성 element 를 swap 보류 → 입력 안전.
- Phase E (context menu) — 변경 없음.

#### 검증

라이브 verify (3 시나리오):

1. import sample sheet → preview 안 input 클릭 → 트리 해당 row orange 강조 ✓
2. 트리 row 클릭 → preview 안 input 에 orange outline + viewport 밖이면 smooth scroll ✓
3. Inspector 에서 input PLACEHOLDER 필드 수정 → preview input placeholder 즉시 갱신 ✓

#### 알려진 caveat / follow-up

- partial re-render wire 미완 — emit diff 인프라 추가 후 PreviewMain 에 통합 (별도 phase).
- scroll-into-view 의 nearest scroll ancestor — 현재 PreviewMain 의 `overflow-auto` wrapper 가 ancestor. zoom != 'fit' 시 wrapper 폭이 sheet 폭과 다를 수 있어 scroll 이 미세하게 어긋날 가능성. 본 phase 는 'fit' 기준만 검증.
- 트리 가상화 (react-window) 미도입 — 1000+ block 시 row click latency 증가 가능. spec 06 D53 항목 동일 backlog.

# 17. WYSIWYG 모드 (위치 기반 시트 편집 — Phase A MVP)

**Anchor:** spec 02 §3 (130 블록 카탈로그), spec 08 W2 (메인 영역), spec 09 §1.1 (9 카테고리)
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

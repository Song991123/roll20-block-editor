# 22. 자동 저장 (Autosave) — IndexedDB 기반 복구

**Anchor:**
- docs/spec/10_system_architecture.md §4.1 (workspaceStore = single source)
- docs/spec/10_system_architecture.md §4.5 (settingsStore)
- docs/spec/14_risk_register.md (R5 작업 손실 / R10 quota)

**Driver feedback:** 사용자 — "블록 50개 깔아놓고 새로고침 한 번에 다 날아갔다. 적어도 한 번은 묻고 복구할 수 있게 해달라."

---

## §1. 비전 (Vision)

**의도치 않은 새로고침 / 탭 종료 / 크래시에서 작업을 잃지 않는다.**

- 저장은 백그라운드 — 사용자 행동 없음.
- 복구는 **묻는다** — mount 시 배너로 [복구] / [무시] 두 버튼.
- 저장소 = **IndexedDB** (localStorage 5MB 한계 회피 + 비동기 → 메인 스레드 영향 X).

---

## §2. 확정된 결정

| ID | 결정 | 메모 |
|---|---|---|
| A1 | 자동 저장 default **ON** | 페르소나 #1 우려 ("내가 모르는 사이 뭐가 저장됨") 는 복구 시점에 묻는 정책으로 해소 |
| A2 | 복구 default **묻는다** (자동 hydrate X) | 의도치 않게 옛 상태 덮어쓰기 방지 |
| A3 | 저장 단위 = **3 워크스페이스 (html/css/i18n) 합본 1 record** | wrapper `<r20-autosave>` 안에 `<ws key="html">CDATA</ws>` 3개 |
| A4 | debounce **5000ms** (`autosaveDebounceMs`) | structureVersion 첫 변경부터 5초 idle 시 저장 |
| A5 | size 상한 **10MB** (`MAX_PAYLOAD_BYTES`) | 넘으면 skip + 토스트 1회 (rate-limited) |
| A6 | quota 초과 → **graceful fallback** (자동 OFF X) | 토스트만, 다음 변경에 재시도. autosave OFF 는 사용자 의도 |
| A7 | key = **hardcoded** (`autosave-current`) | 사용자 입력이 key 가 되지 않음. 향후 multi-sheet 시 sheet name 별 key — 그 때 `isValidKey` regex 통과 강제 |
| A8 | autosave 토글 = settingsStore.autosave | UI 토글 별도 추가 안 함 (settings panel 자체가 없음) — default ON 유지 |
| A9 | sheet 종류 hardcoding **0** | 영시영 / D&D / CoC 무관 — XML 그대로 저장/복구 |

---

## §3. 데이터 모델

### §3.1 IndexedDB 스키마

- DB name: `roll20-block-editor`
- Object store: `workspaces` (keyPath = `key`)
- Version: 1

Record:
```ts
interface SavedRecord {
  key: string;       // 현재는 'autosave-current' hardcoded
  xml: string;       // combined wrapper XML
  meta: {
    ts: number;       // Date.now() ms
    blockCount: number;
    bytes?: number;
    version?: number; // schema version (현재 1)
  };
}
```

### §3.2 Combined XML 형식

```xml
<r20-autosave version="1" ts="1716000000000">
  <ws key="html"><![CDATA[<xml>...</xml>]]></ws>
  <ws key="css"><![CDATA[<xml>...</xml>]]></ws>
  <ws key="i18n"><![CDATA[<xml>...</xml>]]></ws>
</r20-autosave>
```

`]]>` 가 inner XML 안에 들어있는 경우 `]]]]><![CDATA[>` 로 split (CDATA 종결 방어).

### §3.3 Preview metadata, version 2

`r20-autosave version="2"` preserves non-workspace preview metadata used by the real render/export path. Current metadata:

```xml
<preview>
  <asset-replacement-map><![CDATA[old URL => new URL]]></asset-replacement-map>
</preview>
```

This stores the user's local-only asset relink map so external/dead sheet assets can be previewed, edited, and exported consistently after reload. The map is restored into `previewStore` by the autosave recovery banner. Version 1 records remain valid; missing preview metadata restores as an empty/undefined map.

---

## §4. 저장 흐름

1. EditorShell mount → `installAutosave()` 호출 (settings.autosave === true).
2. `useWorkspaceStore.subscribe` 가 3 워크스페이스 `structureVersion` 합산을 감시.
3. 합산이 바뀔 때마다 → `setTimeout(autosaveDebounceMs)` 재시작.
4. 타임아웃 만료 → `buildCombinedXml()` → `saveWorkspace(AUTOSAVE_KEY, xml, meta)`.
5. 실패 시 `notifyError(kind)` — 같은 에러 30초당 1회 토스트.

**Hot path 영향:** structureVersion 자체는 perf-critical (spec 10 §4.1 hot path #3). 구독은 selector-less subscribe — 비교는 단순 정수 합산 → 마이크로초 단위. serialize 는 debounce 후 1회만, 메인 스레드 양보 후.

---

## §5. 복구 흐름

1. EditorShell mount → `loadWorkspace(AUTOSAVE_KEY)`.
2. 결과 있으면 `AutosaveBanner` 표시 — "X초 전 / N블록".
3. **[복구]** 클릭:
   - `parseCombinedXml(xml)` → `{html, css, i18n}`.
   - 각 워크스페이스에 `adapter.hydrateFromXml(key, xml)`.
   - explicit `bumpStructure(key, count)` — Blockly.Events.disable 안의 hydrate 가 listener 를 못 깨우는 케이스 대비.
4. **[무시]** 클릭: `deleteWorkspace(AUTOSAVE_KEY)`.
5. **[X]** 닫기: 둘 다 안 함 — 다음 진입 때 다시 표시.

### §5.1 손상 데이터

`parseCombinedXml` 가 null 반환 (DOMParser 오류 / root nodeName 불일치) → 토스트 "복구 실패 — 데이터 형식을 읽을 수 없습니다" + 자동 삭제 (계속 banner 띄울 이유 없음).

---

## §6. 안전장치 (R5 / R10 / V10)

| 케이스 | 처리 |
|---|---|
| IDB 미지원 (private mode 일부, 매우 오래된 browser) | `saveWorkspace` → `idb-unavailable` 반환, 토스트 1회, 그 외 silent |
| Quota 초과 (`QuotaExceededError`) | 토스트 1회, autosave OFF 안 함, 다음 변경에 재시도 |
| Payload > 10MB | 저장 skip + 토스트 "10MB 초과" |
| 손상 / 형식 어김 | 복구 시 토스트 + 자동 삭제 |
| key 변조 (future multi-sheet) | `isValidKey` regex `^[a-z0-9][a-z0-9_\-]{0,63}$` 강제 |
| 영시영 / 시트 종류 의존 | **없음** — combined XML wrapper 만 보고 hydrate. 어느 sheet든 동일 동작 |

---

## §7. 테스트 시나리오 (R5 회귀)

| ID | 시나리오 | 기대 결과 |
|---|---|---|
| T-A1 | 빈 워크스페이스 → 블록 5개 추가 → 5초 대기 → 새로고침 | 배너 표시 → [복구] → 5개 블록 복원 |
| T-A2 | autosave OFF → 블록 추가 → 새로고침 | 배너 안 뜸 |
| T-A3 | 배너 [무시] → 새로고침 | 배너 안 뜸 |
| T-A4 | 배너 [X] → 새로고침 | 배너 다시 뜸 |
| T-A5 | XML > 10MB 강제 | save skip + 토스트 |
| T-A6 | 손상 XML 강제 (devtools 로 record 수정) | 복구 시 토스트 + 자동 삭제 |

수동 검증 단계 — 자동화 시 Playwright + IndexedDB stub 필요 (현 repo 에 e2e harness 없음).

---

## §8. 파일

- `lib/persist/indexeddb.ts` — IDB wrapper (open/get/put/list/delete + key 검증 + size 가드).
- `lib/persist/autosave.ts` — install/flush/buildCombined/parseCombined.
- `components/editor/AutosaveBanner.tsx` — 복구 UI.
- `components/editor/EditorShell.tsx` — mount hook (install + restore).
- `lib/stores/settingsStore.ts` — `autosave`, `autosaveDebounceMs`.

---

## §9. 향후 작업

- **Settings UI 토글** — settings panel 자체가 생기면 [자동 저장 ON/OFF] 추가.
- **Multi-sheet** — sheet name 별 key. `isValidKey` 가 이미 future-proof.
- **History (backup slots)** — `backupSlots` (default 5) — 자동 저장이 5분마다 새 slot. 현재는 single-slot.
- **Diff view** — 복구 전 "현 상태 vs 복구 후" diff (block count / 변경 카테고리) 미리보기.

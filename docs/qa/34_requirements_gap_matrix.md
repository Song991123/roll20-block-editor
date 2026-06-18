# 34. Requirements Gap Matrix

Date: 2026-06-12

This matrix breaks the operating requirements into actionable work. Use it with `docs/qa/31_active_todo.md`.

## Server and Environment Hygiene

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | Stop unnecessary project dev servers. | `netstat` showed no `127.0.0.1:3000` listener and no Node/pnpm dev process. | Recheck before starting new local servers. |
| VERIFY | P1 | Identify unknown listeners safely. | Remaining listeners were system/user apps such as Discord, Steam, OneDrive, Wacom, and security modules. Command-line inspection was permission-blocked. | Do not stop user/system apps without explicit confirmation. |

## Preview and Roll20 Parity

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P0 | Shared preview/edit render path. | `buildSheetDoc` and `buildSheetParts` share baseline/runtime/layer CSS; `scripts/preview_edit_visual_smoke.mjs` captures imported fixture preview root vs edit root with 0 console/page errors, mismatch bounds/quadrants, roll-button diagnostics, and edit-toolbar occlusion metrics. Current diagnostic mismatch: AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.25%. `scripts/imported_edit_sync_smoke.mjs` additionally proves selected imported input nodes can move through edit mode, land at the same preview position, emit matching absolute CSS, and survive edited emit -> re-import -> emit stability checks for 3 fixtures. | Fix remaining fixture-specific visual differences, classify/cache external 403 assets, keep edit chrome outside sheet capture, and then compare against actual Roll20 sandbox/test-room output before marking DONE. |
| VERIFY | P0 | Computed CSS cascade leak report. | Standalone `buildSheetDoc` report (`reports/cascade-leak/cascade-leak-results.md`) and live static app Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both found 0 app-like final winners in sampled visible sheet elements across 3 fixtures. `preview_edit_visual_smoke` now reports 0 resource issues for the local preview/edit screenshot path after iframe referrer policy alignment. | Keep as VERIFY until imported edit/reimport asset failures are normalized/cached and actual Roll20 comparison is captured. |
| TODO | P0 | Actual Roll20 visual comparison. | Local baseline packaging passes for the latest run: `reports/roll20-actual-compare/2026-06-18-actual-diff-ready/local-baseline-results.md`. Chrome reached Roll20 Custom Sheet Sandbox and created an isolated verification sandbox; sandbox tools expose HTML/CSS/Translation file inputs. Upload is currently blocked by Chrome extension file access (`fileChooser.setFiles failed: Not allowed`), with local-only evidence under `reports/roll20-actual-compare/2026-06-18-actual-diff-ready/roll20-sandbox-observation/`. | Enable file URL access for the Codex Chrome extension, upload the payload in the kept sandbox editor, save `roll20-sandbox.png` / `roll20-chat.png` into the ignored run folder, then rerun `scripts/roll20_actual_screenshot_diff.mjs`. Room View Check remains observation-only. |
| DOING | P0 | Reference-image pixel diff pipeline. | Inventory/render/diff reports exist; viewport/crop/default state are not normalized. Local preview/edit screenshot path now records resource diagnostics and has 0 resource issues for the 3 prepared fixtures. Imported edit/reimport path still classifies external image failures: AW2E 10, Les-Oublies 5, YSHY 23. | Normalize viewport/state/crop, decide whether to cache/rewrite external image assets for local verification only, and expand fixture set. |
| TODO | P1 | Legacy mode verification. | Auto-prefix and legacy CSS sanitize are separated in reports; true legacy sanitizer not implemented. | Add explicit preview/export legacy mode checks. |

## Import/Export and Runtime

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | L2 browser roundtrip. | 3/3 fixtures PASS (`reports/roundtrip-browser/`). Section/toggle multi-class guard + worker-body normalization made import idempotent over its own emit. Imported edit-step smoke now PASS for 3 fixtures in `reports/imported-edit-sync/`. | Expand fixture set and add a true import -> edit -> export -> re-import structural comparison. |
| DONE | P0 | Roll20 mapping fidelity for the real user sheet. | `reports/mapping-fidelity/mapping-fidelity-yshy.md`: every Roll20-meaningful token category (attr names, inputs, roll buttons name+value, data-i18n, placeholders, disabled, translation keys, CSS selectors) is now an exact multiset match for YSHY 1부; 10 import/emit defects fixed. | Extend the same token audit to AW2E/Les-Oublies raw-fallback regions and to export(.zip) output. |
| TODO | P0 | Worker JS separate workspace. | Worker matched/raw counts exist in reports; worker block workspace not split. | Design worker workspace and preserve source mapping. |
| VERIFY | P1 | Rolltemplate/chat rendering. | `scripts/rolltemplate_chat_smoke.mjs` verifies local preview iframe roll button -> ChatPane card rendering. It clears chat per fixture and checks 1 card, 280px rolltemplate width, and no app-only `rolltemplate:name` debug label. AW2E, Les-Oublies, and YSHY PASS with real user-click after `r20_hidden_input` class preservation restored Les-Oublies tab/default-state CSS selectors. | Add actual Roll20 sandbox/test-room chat smoke and compare Roll20 chat pane message styling against a real room/sandbox capture. |

## Edit Mode UX

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P0 | Edit mode is real preview plus overlays. | Edit canvas uses `buildSheetParts` and Shadow DOM. `preview_edit_visual_smoke` PASS across 3 imported fixtures: AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.25%. `imported_edit_sync_smoke` PASS across the same 3 fixtures: real pointer drag, edit/preview same block position, emitted absolute CSS check, and edited emit re-import stability. | Continue reducing fixture-specific mismatch and compare against actual Roll20 sandbox/test-room output before DONE. |
| DONE | P1 | Flow-aware gallery drop and existing-object drag smoke. | Browser smoke PASS with real dragover/drop DragEvents: background drop -> absolute, container drop -> flow nesting without `position:absolute`; existing section mouse drag updates computed position and emitted CSS rule to the same coordinates. Imported real-fixture object movement is now covered by `reports/imported-edit-sync/`. | Expand imported fixture coverage and add richer canvas insertion indicators. |
| DONE | P1 | Droppable container affordances. | Real drag/drop + screenshots captured: dropped section exposes `data-r20-layer-role="frame"`, `data-r20-can-drop="1"`; dragover onto the section exposes `hostDropMode=inside` and active target `data-r20-drop-mode="inside"`; nested input visible in `c2-input-nested.png` and in the layer panel. | Add richer before/after canvas insertion lines for sibling placement. |
| VERIFY | P1 | Before/after/inside drop zones. | Layer panel row dragover now separates top/middle/bottom into `before`, `inside`, and `after`; canvas widget dragover marks active container `inside`; adapter has top-level `moveBlockBefore`/`moveBlockAfter`, `inside` uses container nesting, and leaf children inside a Blockly statement chain can reorder before/after siblings. `scripts/edit_flow_browser_smoke.mjs` verifies row modes, canvas inside indicator, plus nested input reorder in emitted HTML. | Add non-leaf subtree reordering where safe, imported-sheet layer reorder coverage, and before/after canvas insertion indicators. |
| TODO | P1 | Absolute positioning inside frames/groups. | Drag commit supports containing block measurement and relative parent fallback. | Add explicit UX mode and tests for absolute-inside-frame. |

## Branching and Deployment

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | Verify latest production deploy. | Pages 200; latest Actions run for `37c1090` succeeded. | Record each future deploy after push. |
| DONE | P0 | Create `dev` branch and CI. | `dev` was pushed to origin; `main` CI, `dev` CI, and Pages deploy passed when checked on 2026-06-12. | Use `dev` for pre-merge integration work and recheck Actions after each push. |
| TODO | P1 | Separate public test page. | GitHub Pages is currently production only. | Choose Vercel/Netlify, second Pages repo, or same-site `/dev/`. |

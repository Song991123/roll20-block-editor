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
| VERIFY | P0 | Shared preview/edit render path. | `buildSheetDoc` and `buildSheetParts` share baseline/runtime/layer CSS; `scripts/preview_edit_visual_smoke.mjs` captures imported fixture preview root vs edit root with 0 console/page errors, mismatch bounds/quadrants, roll-button diagnostics, and edit-toolbar occlusion metrics. Current diagnostic mismatch after preserving hidden input classes: AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.26%. Les-Oublies now renders its intended default tab state instead of a falsely empty state. | Fix remaining fixture-specific visual differences, keep edit chrome outside sheet capture, and then compare against actual Roll20 sandbox/test-room output before marking DONE. |
| VERIFY | P0 | Computed CSS cascade leak report. | Standalone `buildSheetDoc` report (`reports/cascade-leak/cascade-leak-results.md`) and live static app Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both found 0 app-like final winners in sampled visible sheet elements across 3 fixtures. | Keep as VERIFY until preview/edit screenshot comparison and asset parity are normalized. |
| TODO | P0 | Actual Roll20 visual comparison. | Local baseline packaging now passes for the latest run: `reports/roll20-actual-compare/2026-06-18-actual-diff-ready/local-baseline-results.md`. Added `scripts/roll20_actual_screenshot_diff.mjs` to compare local preview screenshots against local-only Roll20 screenshots after capture; latest diff report is all SKIP because no actual Roll20 screenshots are present. | Run Room View Check for solo rooms and Custom Sheet Upload Check in sandbox/test room; save `roll20-sandbox.png`, `roll20-room.png`, or `roll20-chat.png` into the ignored run folder, then rerun the diff helper. |
| DOING | P0 | Reference-image pixel diff pipeline. | Inventory/render/diff reports exist; viewport/crop/default state are not normalized. Live cascade smoke also recorded external imgur 403s for AW2E/YSHY fixture assets. | Normalize viewport/state/crop, classify/cache external image assets, and expand fixture set. |
| TODO | P1 | Legacy mode verification. | Auto-prefix and legacy CSS sanitize are separated in reports; true legacy sanitizer not implemented. | Add explicit preview/export legacy mode checks. |

## Import/Export and Runtime

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | L2 browser roundtrip. | 3/3 fixtures PASS (`reports/roundtrip-browser/`). Section/toggle multi-class guard + worker-body normalization made import idempotent over its own emit. | Add an edit step between roundtrips; expand fixture set. |
| DONE | P0 | Roll20 mapping fidelity for the real user sheet. | `reports/mapping-fidelity/mapping-fidelity-yshy.md`: every Roll20-meaningful token category (attr names, inputs, roll buttons name+value, data-i18n, placeholders, disabled, translation keys, CSS selectors) is now an exact multiset match for YSHY 1부; 10 import/emit defects fixed. | Extend the same token audit to AW2E/Les-Oublies raw-fallback regions and to export(.zip) output. |
| TODO | P0 | Worker JS separate workspace. | Worker matched/raw counts exist in reports; worker block workspace not split. | Design worker workspace and preserve source mapping. |
| VERIFY | P1 | Rolltemplate/chat rendering. | `scripts/rolltemplate_chat_smoke.mjs` verifies local preview iframe roll button -> ChatPane card rendering. It clears chat per fixture and checks 1 card, 280px rolltemplate width, and no app-only `rolltemplate:name` debug label. AW2E, Les-Oublies, and YSHY PASS with real user-click after `r20_hidden_input` class preservation restored Les-Oublies tab/default-state CSS selectors. | Add actual Roll20 sandbox/test-room chat smoke and compare Roll20 chat pane message styling against a real room/sandbox capture. |

## Edit Mode UX

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P0 | Edit mode is real preview plus overlays. | Edit canvas uses `buildSheetParts` and Shadow DOM. `preview_edit_visual_smoke` now proves preview/edit root captures pass across 3 imported fixtures: AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.26%. Les-Oublies mismatch is no longer hidden by a missing default tab state. | Continue reducing fixture-specific mismatch and add imported real-sheet drag/edit-step screenshot comparison. |
| DONE | P1 | Flow-aware gallery drop and existing-object drag smoke. | Browser smoke PASS with real dragover/drop DragEvents: background drop -> absolute, container drop -> flow nesting without `position:absolute`; existing section mouse drag updates computed position and emitted CSS rule to the same coordinates. Report: `reports/edit-flow-smoke/edit-flow-smoke-results.md`. | Extend the same check to imported real-sheet objects and before/after/inside drop zones. |
| DONE | P1 | Droppable container affordances. | Real drag/drop + screenshots captured: dropped section exposes `data-r20-layer-role="frame"`, `data-r20-can-drop="1"`; nested input visible in `c2-input-nested.png` and in the layer panel. | Add hover-time drop-target highlight screenshot during an in-flight drag. |
| TODO | P1 | Before/after/inside drop zones. | Current layer move tries nest first then fallback before; zones are not explicit. | Implement explicit layer panel zones and canvas insertion indicators. |
| TODO | P1 | Absolute positioning inside frames/groups. | Drag commit supports containing block measurement and relative parent fallback. | Add explicit UX mode and tests for absolute-inside-frame. |

## Branching and Deployment

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | Verify latest production deploy. | Pages 200; latest Actions run for `37c1090` succeeded. | Record each future deploy after push. |
| DONE | P0 | Create `dev` branch and CI. | `dev` was pushed to origin; `main` CI, `dev` CI, and Pages deploy passed when checked on 2026-06-12. | Use `dev` for pre-merge integration work and recheck Actions after each push. |
| TODO | P1 | Separate public test page. | GitHub Pages is currently production only. | Choose Vercel/Netlify, second Pages repo, or same-site `/dev/`. |

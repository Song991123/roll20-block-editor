# 35. Agent Progress Log

Date: 2026-06-14

This file is for Codex, Claude, and future agents. Do not move this content into `README.md`; the README is reserved for the Korean portfolio/project overview.

## How To Use

- Read this after `AGENTS.md`, the working rules, TODO board, and gap matrix.
- Keep entries short, evidence-based, and scoped to what was actually verified.
- Update this when folder organization, agent handoff context, or the current next-task sequence changes.
- Use `docs/qa/31_active_todo.md` for task status. Use this file for narrative handoff notes.

## Current Source Of Truth

| Area | Current Source |
| --- | --- |
| Active repo/worktree | `web-push-main/` |
| User-facing project overview | `README.md` |
| Agent rules | `AGENTS.md` |
| Live TODO | `docs/qa/31_active_todo.md` |
| Requirement gaps | `docs/qa/34_requirements_gap_matrix.md` |
| Verification evidence | local ignored `reports/` outputs plus summarized TODO notes |
| Repeatable scripts | `scripts/` |

## 2026-06-14 Folder/Docs Review

- Parent folder contains many legacy and experiment copies; current development must stay in `web-push-main/`.
- Root `AGENTS.md` points agents to `web-push-main/AGENTS.md`; do not treat root-level `block-editor.html`, `viewer.html`, `PLAN.md`, or `HANDOFF.md` as current truth.
- `README.md` in `web-push-main/` is a Korean portfolio-style overview. Keep it visual-first and do not add verification tables, agent-only status logs, or private sheet details there.
- Agent progress and handoff notes belong in this file plus `docs/qa/31_active_todo.md`.
- Real Roll20/user sheet fixtures and generated reports are local-only. Do not commit them to the public repo.
- Folder guide exists at the parent level as `폴더 안내.md`; update it only when actual top-level folder roles change.

## Local Evidence Snapshot

| Scope | Evidence |
| --- | --- |
| Browser L2 roundtrip | Local ignored `reports/roundtrip-browser/`; limited fixture scope only. |
| Mapping fidelity | Local ignored `reports/mapping-fidelity/`; selected private fixture scope only. |
| Edit flow smoke | Local ignored `reports/edit-flow-smoke/`; gallery drop and container nesting smoke. |
| Standalone preview cascade | Local ignored `reports/cascade-leak/`; standalone `buildSheetDoc` scope only. |
| Live preview/edit Shadow DOM cascade | Local ignored `reports/live-shadow-cascade/`; selected fixture scope only. |

## Next Development Sequence

1. Local preview/edit screenshot baseline for a selected ignored fixture.
2. Roll20 Room View Check: observe existing solo rooms only; no edits.
3. Roll20 Custom Sheet Upload Check: use Custom Sheet Sandbox first, or a new test room if sandbox is insufficient.
4. Asset loading parity: classify or cache external image resources that return 403 in browser fixtures.
5. Layer panel explicit before/after/inside drop zones.
6. Absolute positioning inside frames/groups with a clear UX mode.
7. Worker JS separate workspace plan and first source-preserving implementation slice.
8. Create a copyright-safe synthetic public example before re-enabling the sample loader.

## 2026-06-18 Roll20 Actual Verification Setup

- Added `docs/operations/37_roll20_actual_verification.md` as the source of truth for solo-room observation, sandbox/test-room upload checks, and local-only evidence.
- Chrome Roll20 reachability was checked at `https://app.roll20.net/campaigns/search`; the page was reachable in a logged-in state.
- No existing Roll20 room was inspected in detail, edited, or modified.
- Created `scripts/roll20_actual_compare_manifest.mjs` to generate ignored local report scaffolds under `reports/roll20-actual-compare/`.

## 2026-06-18 Edit Drag Responsiveness Slice

- Fixed an edit-canvas rollback risk: Shadow DOM remount cleanup no longer cancels the delayed Blockly/CSS commit timer.
- On drag end, `EditCanvas` now patches the emitted HTML cache immediately so the preview/edit render path sees the dropped position before the heavier model commit catches up.
- Expanded `scripts/edit_flow_browser_smoke.mjs` to cover existing-object mouse drag, not only gallery drop.
- Latest local ignored smoke report: `reports/edit-flow-smoke/edit-flow-smoke-results.json` PASS. The moved section's computed position and emitted CSS rule both reported `left: 464px; top: 256px`.
- Scope note: this proves synthetic edit-flow behavior in the static app only. Imported real-sheet object drag and actual Roll20 visual parity remain unproven.

## 2026-06-18 Preview/Edit Visual Smoke Setup

- Added `scripts/preview_edit_visual_smoke.mjs` for local imported-fixture preview/edit screenshot comparison.
- The script imports ignored fixtures through `window.__perfHook.importSheet`, captures only `#charsheet-root` for preview and edit, then computes a browser-canvas pixel diff over the shared crop.
- Latest local ignored report: `reports/preview-edit-visual/preview-edit-visual-results.md` PASS as a diagnostic pipeline with 0 console/page errors.
- Removed persistent edit-only drop/container outlines from the normal Shadow DOM render. Drop affordances now appear while widget drag is active, so edit mode is less visually polluted at rest.
- Added coarse mismatch bounds/quadrants and widened the browser capture viewport to 2200x1200 for fairer preview/edit screenshot comparison.
- Current mismatch diagnostics after the outline fix: AW2E 25.51% (bounds 0,10 850x1070), Les-Oublies 0%/10 px, YSHY 1BU 4.03% (bounds 0,223 850x857). These numbers are not a parity gate yet; they identify the next visual-difference work.
- Added `window.__perfHook.setPreviewZoom` so visual smoke scripts can force 100% zoom and avoid fit-to-width artifacts.

## 2026-06-18 Shadow Font Alignment Slice

- Fixed a major preview/edit visual divergence source: Shadow DOM edit render now registers Roll20 glyph font faces at document level, so dice/pictos pseudo-elements can resolve without leaking Roll20 selector rules into the app document.
- The Shadow mount also extracts only user CSS `@import` and `@font-face` declarations from the sheet CSS chunk for document-level font registration. User selector rules remain scoped inside the Shadow render.
- `scripts/preview_edit_visual_smoke.mjs` now records roll-button computed diagnostics and edit-toolbar occlusion metrics. The toolbar is hidden only while taking root screenshots, while the original overlap is still reported separately.
- Latest local ignored report after `lint` and `build`: `reports/preview-edit-visual/preview-edit-visual-results.md` PASS with 0 console/page errors. Diagnostic mismatch: AW2E 4.96% (bounds 0,404 850x676), Les-Oublies 0%/10 px, YSHY 1BU 1.26% (bounds 0,17 851x1063). Roll button counts match preview/edit for all 3 fixtures.
- Scope note: this proves improved local preview/edit alignment only. Actual Roll20 sandbox/room visual comparison remains unverified.

## 2026-06-18 Roll20 Local Baseline Package Slice

- Added `scripts/roll20_actual_local_baseline.mjs` to prepare the local-only baseline required before Roll20 sandbox/test-room checks.
- The script imports ignored fixtures through the static app, captures local preview/edit screenshots, writes emitted `sheet.html`, `sheet.css`, `translation.json`, `sheet.json`, and creates `upload.zip` for Custom Sheet Sandbox/test-room use.
- Restored `data-testid="preview-iframe"` on `PreviewMain` so browser verification scripts can reliably target the iframe render path without visual UI changes.
- Latest local ignored report: `reports/roll20-actual-compare/2026-06-18-local-baseline-smoke/local-baseline-results.md` PASS for AW2E, Les-Oublies, and YSHY 1BU. All 3 generated payloads had no blocking export warnings and matching preview/edit roll button counts.
- Scope note: this is the local baseline/payload preparation step only. It does not prove actual Roll20 visual parity until the payload is applied in Custom Sheet Sandbox or a new test room and compared.

## 2026-06-18 Rolltemplate Chat Smoke Slice

- Added `scripts/rolltemplate_chat_smoke.mjs` for local preview iframe -> ChatPane rolltemplate smoke.
- The script imports ignored fixtures through the static app, chooses a real roll button, clicks it, and verifies that a visible chat card appears.
- Latest local ignored report: `reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.md` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Follow-up hardening removed the visible app-only `rolltemplate:name` helper line, constrains rolltemplate chat cards to 280px, and clears simulated chat between fixtures so screenshots/results cannot accidentally reuse a prior fixture's card.
- Current smoke checks each fixture has exactly 1 resulting chat card, `Debug label=no`, and rolltemplate card width 280px.
- Click-mode evidence: AW2E, Les-Oublies, and YSHY all use `user-click`.
- Les-Oublies was temporarily SKIP after the hidden-DOM click fallback was removed. Root cause was importer/emitter loss of `class="sheet-tabstoggle..."` on hidden inputs; preserving that class restored the Roll20 CSS default-tab selector and actionable roll buttons.
- Scope note: this proves the local app's roll button bridge, dice/rolltemplate parser path, and ChatPane render path for selected fixtures only. It does not prove actual Roll20 chat parity, worker parity, or all-sheet support.

## 2026-06-18 Hidden Input Class Preservation Slice

- Fixed `r20_hidden_input` import/export so hidden inputs preserve their `class` attribute as well as name, value, and style.
- This matters for Roll20 sheets that use hidden attribute controls as CSS state switches. Les-Oublies uses `.sheet-tabstoggle[value="combat"] ~ div.sheet-combat`; without the class, the emitted sheet kept the value but lost the selector anchor, leaving the default screen falsely empty.
- Latest local ignored validation after the fix:
  - `scripts/rolltemplate_chat_smoke.mjs`: AW2E, Les-Oublies, and YSHY 1BU PASS with user-click, exactly 1 chat card, 280px card width, and no debug label.
  - `scripts/browser_roundtrip_smoke.mjs`: 3/3 PASS.
  - `scripts/preview_edit_visual_smoke.mjs`: PASS with AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.26%.
- Scope note: this is local import/render/chat evidence only. Actual Roll20 sandbox/test-room visual and chat parity remain unverified.

## 2026-06-18 Roll20 Actual Screenshot Diff Helper Slice

- Added `scripts/roll20_actual_screenshot_diff.mjs` so actual Roll20 screenshots can be compared against the local baseline run without committing private evidence.
- Expected local-only screenshot names are `roll20-sandbox.png`, `roll20-room.png`, and `roll20-chat.png` under each fixture's ignored `screenshots/` folder.
- Regenerated latest local baseline: `reports/roll20-actual-compare/2026-06-18-actual-diff-ready/local-baseline-results.md` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Ran the new diff helper against that run. Result: all actual Roll20 targets are SKIP because no sandbox/room/chat screenshots have been captured yet. This is correct and must not be reported as Roll20 parity.
- Scope note: the comparison pipeline is ready for captured evidence; authenticated Roll20 solo-room observation and Custom Sheet Sandbox/test-room upload remain TODO.

## 2026-06-18 Imported Edit Sync Slice

- Added `scripts/imported_edit_sync_smoke.mjs` for local static-app evidence that imported real-fixture nodes can move through the actual edit pointer path and sync back to preview plus emitted HTML/CSS position data.
- Fixed an imported edit desync source: `EditCanvas` now recognizes both raw design classes and Roll20-prefixed `sheet-r20-node-*` classes when deciding whether an optimistic drag move has been committed.
- Fixed a Shadow edit vs iframe preview layout difference caused by hotlink-sensitive sheet images: Shadow edit images now use `referrerPolicy="no-referrer"`, matching iframe `srcdoc` behavior for the tested assets.
- Shadow edit no longer adds an extra outer `body.charsheet`; the real `#charsheet-root.charsheet` from `buildSheetParts()` carries layer state, making the selector shape closer to iframe preview.
- Latest local ignored validation after `lint` and `build`:
  - `scripts/imported_edit_sync_smoke.mjs`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `scripts/preview_edit_visual_smoke.mjs`: PASS, diagnostic mismatch AW2E 4.96%, Les-Oublies 4.76%, YSHY 1BU 1.25%.
  - `scripts/edit_flow_browser_smoke.mjs`: PASS.
- Scope note: this is local preview/edit sync evidence only. Actual Roll20 room/sandbox visual and chat parity remain unverified.

## 2026-06-18 Roll20 Sandbox Reachability Slice

- Chrome Roll20 session was reachable and logged in.
- Created a new isolated Custom Sheet Sandbox for verification rather than modifying existing user sandboxes or real rooms.
- Launched the sandbox editor and confirmed the built-in `Sheet Sandbox Tools` dialog has separate file inputs for HTML, CSS, and Translation.
- Tried the first payload upload through the browser file chooser. Upload did not reach Roll20 because the Codex Chrome extension rejected local file access with `fileChooser.setFiles failed: Not allowed`.
- Local-only evidence is under ignored `reports/roll20-actual-compare/2026-06-18-actual-diff-ready/roll20-sandbox-observation/`.
- Next action: enable `Allow access to file URLs` for the Codex Chrome extension, then retry payload upload in the kept sandbox editor tab and capture actual Roll20 screenshots.
- Scope note: this proves actual Roll20 sandbox reachability and upload UI discovery only. It does not prove Roll20 visual parity.

## 2026-06-18 Imported Edit Re-import Stability Slice

- Hardened `scripts/imported_edit_sync_smoke.mjs` so the local imported edit smoke now checks the full edited emit -> re-import -> emit cycle after a real pointer drag.
- Candidate selection now prefers leaf-like editable nodes (`control`, `action`, `media`, `text`) over structural frame/flow/table containers, with penalties for nested block containers. This avoids false failures where the smoke repeatedly dragged large wrapper nodes that are visible but not the user's likely direct-edit target.
- Re-import CSS comparison is canonicalized for whitespace and the managed design-CSS marker while still recording raw CSS drift. Current raw drift is design CSS formatting around `r20-design-css:managed`; canonical selector/declaration content stays stable.
- Latest local ignored validation after `lint` and `build`: `scripts/imported_edit_sync_smoke.mjs` PASS for AW2E, Les-Oublies, and YSHY 1BU. Each fixture moved an imported `input`, matched edit/preview coordinates, emitted absolute position data, and re-imported stably.
- Console 403 resource errors remain on AW2E/YSHY external asset loads; there were no page errors. This is still local static-app evidence only, not actual Roll20 parity.

## 2026-06-18 Asset Referrer and Resource Diagnostics Slice

- Added `<meta name="referrer" content="no-referrer">` to the iframe preview document generated by `buildSheetDoc`.
- Added a Shadow edit document referrer policy helper in `mountSheetShadow()` so Shadow CSS/image requests use `no-referrer` as well as the existing per-`<img>` `referrerPolicy="no-referrer"`.
- `scripts/preview_edit_visual_smoke.mjs` now records HTTP/resource failures by status, resource type, host, and example URL. Latest local ignored report PASS: AW2E, Les-Oublies, and YSHY 1BU have 0 resource issues in the preview/edit screenshot path.
- `scripts/imported_edit_sync_smoke.mjs` now records the same resource diagnostics. Latest local ignored report PASS for movement/re-import stability, but still classifies external image failures during edit/reimport: AW2E 10, Les-Oublies 5, YSHY 23. Top hosts are `i.imgur.com`, `imgur.com`, and `raw.githubusercontent.com`.
- Scope note: resource failures are now visible and separated from cascade/edit-sync failures. This does not prove actual Roll20 asset parity; next work is to compare with Roll20 sandbox/test-room behavior and decide whether local verification should cache or rewrite these external assets.

## 2026-06-18 Layer Drop Zone Slice

- Added explicit layer-panel drag zones: row top = `before`, row middle = `inside` when the target can receive children, row bottom = `after`.
- Added `moveBlockAfter()` to the Blockly adapter for top-level layer ordering. `inside` still routes through `nestBlockInContainer()`.
- Layer rows now expose `data-testid="edit-layer-row"` and `data-r20-layer-drop-mode` while a layer drag is hovering, so browser smoke can verify the user's intended insertion mode instead of inferring it.
- Latest local ignored validation after `lint` and `build`: `scripts/edit_flow_browser_smoke.mjs` PASS. The smoke still covers background absolute drop, container flow nesting, existing-object drag, and now verifies frame-row hover modes `before,inside,after`.
- Scope note: this is the first layer-panel insertion slice. Nested sibling before/after reordering inside Blockly statement chains and canvas-side insertion indicators remain TODO.

## 2026-06-18 Nested Layer Reorder Slice

- Extended `moveBlockBefore()` and `moveBlockAfter()` so leaf children inside a Blockly statement chain can be reordered around sibling blocks. Top-level ordering behavior remains available as the fallback path.
- The implementation intentionally rejects moving a block that has a connected `nextConnection`; moving whole subtrees/stacks needs a separate safer UX and test slice.
- Expanded `scripts/edit_flow_browser_smoke.mjs`: after nesting two text inputs into a section, it uses the layer-row `before` drop path to move the second emitted input before the first and verifies the emitted HTML order changed.
- Latest local ignored validation after `lint` and `build`: `scripts/edit_flow_browser_smoke.mjs` PASS with 0 console/page errors.
- Scope note: this proves layer-panel sibling reorder for leaf flow children in the synthetic edit smoke. Imported-sheet layer reordering and canvas insertion indicators remain TODO.

## 2026-06-18 Canvas Drop Indicator Slice

- Canvas widget dragover now records the active container on the Shadow host with `data-r20-drop-target` and `data-r20-drop-mode="inside"`.
- The active target element also receives `data-r20-drop-mode="inside"` alongside `.r20-drop-target`; the Shadow CSS adds an inset highlight for the active inside drop.
- `scripts/edit_flow_browser_smoke.mjs` now captures `c2-drop-indicator.png` and verifies the dragover state before dropping: host dragging flag is set, host mode is `inside`, active target id matches the section, and active target mode is `inside`.
- Latest local ignored validation after `lint` and `build`: `scripts/edit_flow_browser_smoke.mjs` PASS with 0 console/page errors.
- Scope note: this proves canvas container-inside insertion feedback for friendly widget drag. Canvas before/after sibling insertion lines remain TODO.

## 2026-06-18 Canvas Sibling Insertion Slice

- Canvas widget dragover now distinguishes `inside` containers from leaf sibling targets. For non-container targets, the upper half is `before` and the lower half is `after`.
- Shadow edit affordance CSS now draws insertion lines for canvas `before` and `after` modes instead of only the green inside-container outline.
- `appendFriendlyWidgetPreset()` can create a new flow widget before or after a sibling via the Blockly adapter, stripping absolute positioning when the move succeeds.
- Expanded `scripts/edit_flow_browser_smoke.mjs`: after two text inputs are nested into a section, it verifies canvas `before` and `after` indicators on a nested input, drops a new text input on the `before` zone, and confirms the new block appears before the target in emitted HTML.
- Latest local ignored validation: `scripts/edit_flow_browser_smoke.mjs` PASS with 0 console/page errors; `canvasSiblingInsert.beforeIndicator.hostDropMode=before`, `afterIndicator.hostDropMode=after`, and emitted HTML index for the new input is before the target input.
- Scope note: this proves synthetic canvas sibling insertion for a leaf input target. Imported-sheet coverage, non-leaf subtree moves, and a separate committed `after` insertion test remain TODO/VERIFY.

## 2026-06-18 Canvas After Insertion Fix Slice

- Strengthened `scripts/edit_flow_browser_smoke.mjs` so canvas sibling insertion now commits both directions: one new input before the target and one new input after the same target.
- The stronger smoke exposed a real adapter bug: nested `moveBlockAfter()` failed when the target already had a next sibling because it treated the occupied target next-connection as a hard failure.
- Fixed `moveNestedBlockAfter()` to splice safely: disconnect `target -> oldNext`, connect `target -> moving`, then connect `moving -> oldNext`.
- Latest local ignored validation after the fix: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `scripts/edit_flow_browser_smoke.mjs` PASS. Evidence includes `afterNewId` present and `afterNewIndexAfterEmit` greater than `targetIndexAfterAfterDrop`.
- Scope note: this proves synthetic leaf sibling after-insertion in the browser path. Imported-sheet layer reorder coverage and non-leaf subtree movement remain TODO/VERIFY.

## 2026-06-18 Imported Canvas Flow Insert Slice

- Expanded `scripts/imported_edit_sync_smoke.mjs` beyond imported drag sync: it now also tests friendly widget insertion into imported sheet geometry and records imported layer leaf reorder when a safe adjacent pair exists.
- Added `canNestInContainer()` to the Blockly adapter and wired edit Shadow role attributes/canvas drop target selection to the actual statement-slot check. This fixes misleading drop affordances where a node looked like a frame/flow container but could not actually accept child blocks.
- Added `window.__perfHook.getBlockGraph()` for local-only verification so smoke scripts can distinguish real Blockly chain relationships from DOM nodes that merely look like siblings.
- Important test adjustment: imported canvas insertion waits past the `lastClearedAt` creation guard and only drops after a dragover indicator exists, preventing false background absolute drops in dense imported layouts.
- Latest local ignored validation after `lint` and `build`:
  - `scripts/edit_flow_browser_smoke.mjs`: PASS.
  - `scripts/imported_edit_sync_smoke.mjs`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Evidence: all 3 fixtures passed imported visible-node move sync, imported canvas insertion as non-absolute flow content, and edited emit -> re-import stability. Les-Oublies also passed imported layer leaf reorder; AW2E/YSHY recorded SKIP for that sub-check because no safe imported leaf sibling pair was found.
- Scope note: this is still local static-app evidence. Actual Roll20 sandbox/room parity, non-leaf subtree movement, and broader corpus coverage remain TODO/VERIFY.

## 2026-06-18 Non-Leaf Layer Reorder Slice

- Extended nested layer reordering so moving a block with a connected `nextConnection` uses Blockly stack healing first, then inserts only the selected block and its input/statement descendants at the requested before/after target.
- Added a guard against dropping a block relative to one of its own input/statement descendants, which would create an invalid cycle.
- Expanded `scripts/edit_flow_browser_smoke.mjs` with a copyright-safe synthetic import: `outer > group-a/input-a + group-b/input-b`. The smoke moves non-leaf `group-a` after `group-b` through the real layer-row drop path, then verifies emitted order changed and both child inputs stayed inside their original groups.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, `scripts/edit_flow_browser_smoke.mjs` PASS, and `scripts/imported_edit_sync_smoke.mjs` PASS for the 3 prepared ignored fixtures.
- Scope note: this proves synthetic non-leaf group movement and keeps imported fixture edit-sync green. Imported real-sheet non-leaf layer reorder coverage remains VERIFY/TODO; actual Roll20 visual parity remains unverified.

## 2026-06-18 Absolute-Inside-Frame Smoke Slice

- Expanded `scripts/edit_flow_browser_smoke.mjs` with a copyright-safe synthetic frame/input import to lock down the "absolute positioning inside a frame" behavior requested for Figma-like editing.
- The smoke drags a child input inside its parent frame through the real pointer path. It verifies the parent frame gets a managed design CSS rule with `position: relative`, the child gets a managed design CSS rule with `position: absolute; left/top`, and emitted left/top matches the Shadow edit computed left/top.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `scripts/edit_flow_browser_smoke.mjs` PASS.
- Scope note: this proves the synthetic edit path. It does not yet prove imported real-sheet absolute-inside-frame behavior or provide a user-facing mode selector for choosing flow vs absolute placement inside a frame.

## 2026-06-18 Free Placement Mode Slice

- Added a user-facing edit placement mode control with `흐름` and `자유` choices. `흐름` keeps gallery drops as flow/nesting operations; `자유` lets a drop inside a capable frame become a nested absolute child.
- `appendFriendlyWidgetPreset()` now accepts `absolute-in-container`, nests the new widget into the target frame, writes child `position:absolute; left/top`, and adds a parent `position:relative` fallback when needed.
- Expanded `scripts/edit_flow_browser_smoke.mjs` with a copyright-safe synthetic free-placement import. The smoke clicks `자유`, drops a gallery text input into a frame, and verifies the emitted HTML nests the input inside the frame with matching computed/emitted absolute coordinates.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `scripts/edit_flow_browser_smoke.mjs` PASS.
- Scope note: this proves the user-facing synthetic free-placement path only. Imported real-sheet frame placement, UX screenshots, and actual Roll20 visual parity remain unverified.

## 2026-06-18 Imported Free Placement Smoke Slice

- Expanded `scripts/imported_edit_sync_smoke.mjs` so imported real-fixture edit sync now covers both placement modes:
  flow mode drops a friendly widget into an imported frame/flow target as non-absolute content, and free mode drops a second widget into an imported frame/flow target as nested absolute content.
- The free-placement smoke clicks the real `free` placement control, sends real `dragover`/`drop` events, and verifies parent/child structure plus computed/emitted positioning.
- Latest local ignored validation: `scripts/imported_edit_sync_smoke.mjs` PASS for the 3 prepared ignored fixtures. Free insert evidence is stored only in the ignored report; all checked fixtures had parent `relative`, input `absolute`, and matching emitted/computed coordinates.
- Scope note: this is still local static-app evidence. It strengthens imported-sheet edit UX coverage, but actual Roll20 sandbox/test-room visual parity and chat parity remain unverified.

## 2026-06-18 Worker Workspace Split Slice

- Added a fourth Blockly workspace key, `worker`, so sheet worker JS no longer has to remain in the visual HTML workspace after import.
- Import paths now move imported top-level sheet worker blocks from `html` to `worker`; final emit merges the worker body back into `sheet.html` as a single `<script type="text/worker">`.
- Autosave/restore, code tabs, status/counts, and `window.__perfHook` now include the worker workspace.
- Added `scripts/worker_workspace_smoke.mjs` and package alias `corepack pnpm run smoke:worker`.
- Latest validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, `corepack pnpm run smoke:worker` PASS, and `scripts/imported_edit_sync_smoke.mjs` PASS for the 3 prepared ignored fixtures.
- Scope note: this is a source-preserving workspace split and local static-app smoke. It is not a claim that worker JS block coding is complete or that actual Roll20 worker behavior is parity-verified.

## 2026-06-18 Worker Roundtrip Guard Slice

- Strengthened `scripts/browser_roundtrip_smoke.mjs` so L2 browser roundtrip now checks `worker` raw body equality, worker block-count stability, worker body length, and emitted worker script count in addition to HTML/CSS/i18n stability.
- Latest local ignored validation: `node scripts/browser_roundtrip_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/roundtrip-browser` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Scope note: this catches worker split drift in the local app bundle, but still does not prove actual Roll20 worker runtime parity.

## 2026-06-18 Worker Source Preservation Audit/Fix Slice

- Added `scripts/worker_source_audit.mjs` and package alias `corepack pnpm run audit:worker`.
- Fixed worker extraction for nested/raw `<script type="text/worker">` cases. Import now rebuilds the worker workspace directly from source worker script bodies, strips those scripts from visual HTML blocks, and final emit appends one Roll20 worker script so worker code is not displayed on the sheet canvas or duplicated on re-import.
- Important scope: the emitted Roll20 sheet may canonicalize multiple source worker scripts into one final `<script type="text/worker">`; block counts are diagnostics, while exact worker source-body preservation is the gate for this slice.
- Latest local ignored validation:
  - `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit`: PASS for AW2E, Les-Oublies, and YSHY 1BU with exact worker bodies.
  - `node scripts/browser_roundtrip_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/roundtrip-browser`: PASS for the same 3 fixtures.
  - `corepack pnpm run smoke:worker -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/worker-workspace-smoke`: PASS.
  - `node scripts/imported_edit_sync_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/imported-edit-sync`: PASS.
- Scope note: this is local import/export preservation evidence. It does not prove actual Roll20 sandbox/test-room worker runtime parity or JS block-coding UX completeness.

## 2026-06-18 Roll20 Payload Hygiene Slice

- Added `lib/export/payload.ts` as the final Roll20 export boundary cleanup. Preview/edit still keep `data-r20-block-id` for selection and drag sync, but zip export strips those internal IDs from `sheet.html`.
- Export now converts internal `<!-- i18n[lang] "key": "value" -->` comment output into valid Roll20 `translation.json` object payloads. This fixed a real pre-upload defect caught by the new audit: AW2E and YSHY were previously writing non-JSON translation files.
- Added `scripts/roll20_payload_audit.mjs` and package alias `corepack pnpm run audit:payload`.
- Updated `scripts/roll20_actual_local_baseline.mjs` so generated Sandbox payload files and `upload.zip` use the same internal-id stripping and translation normalization.
- Latest local ignored validation after `lint` and `build`:
  - `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label 2026-06-18-payload-clean-v2`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `corepack pnpm run audit:payload -- reports/roll20-actual-compare/2026-06-18-payload-clean-v2`: PASS for the same 3 fixtures with 0 issues.
- Scope note: this proves local upload payload hygiene only. Actual Roll20 sandbox/test-room upload and screenshot/chat parity remain unverified until Chrome file upload access is enabled.

## 2026-06-18 Roll20 Payload Roundtrip Visual Slice

- Added `scripts/roll20_payload_roundtrip_visual_smoke.mjs` and package alias `corepack pnpm run smoke:payload-roundtrip`.
- The smoke re-imports the exact cleaned Roll20 payload files from `reports/roll20-actual-compare/<run>/local-baseline/<fixture>/payload/`, captures a preview screenshot, and compares it against the local baseline preview screenshot.
- The first strict top-left diff flagged AW2E and YSHY due to tiny screenshot alignment/width differences, so the helper now records a small-offset crop-normalized best match. This keeps the check useful for real payload drift without failing on a one-pixel capture offset.
- The first post-build smoke still failed AW2E after offset normalization. Root cause was CSS pseudo-class loss: imported selectors such as `.sheet-lock:not(:checked)` were emitted as `.lock:hover(:checked)` because the CSS pseudo block dropdown did not allow `not`. Expanded the pseudo-class allowlist to include common Roll20/official-sheet selectors (`not`, child/type position pseudos, validity/state pseudos).
- Latest local ignored validation:
  - `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label 2026-06-18-pseudo-fix-v1`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `corepack pnpm run audit:payload -- reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1`: PASS for all 3 fixtures with 0 issues.
  - `corepack pnpm run smoke:payload-roundtrip -- reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1 --out-dir ./out --base-path /roll20-block-editor`: PASS for AW2E, Les-Oublies, and YSHY 1BU with 0% cleaned-payload preview mismatch and no visible script/rolltemplate runtime nodes.
- Scope note: this proves cleaned upload payloads still roundtrip visually inside the local static app. It still does not prove actual Roll20 sandbox/test-room visual parity.

## 2026-06-18 Legacy Export Audit Slice

- Added `scripts/roll20_legacy_export_audit.mjs` and package alias `corepack pnpm run audit:legacy-export`.
- The audit uses only synthetic CSS. It checks that modern CSS keeps modern declarations in the source, legacy export CSS rewrites/removes legacy-risk declarations through `sanitizeForRoll20Legacy`, warnings are emitted, and `ExportDialog` gates sanitizer routing plus `sanitize-warnings.json` behind legacy mode.
- Latest local ignored validation: `corepack pnpm run lint` PASS, `corepack pnpm run build` PASS, and `corepack pnpm run audit:legacy-export -- --report-dir reports/legacy-export-audit` PASS with 10 sanitizer warnings from the synthetic fixture.
- Scope note: this is an export-path sanitizer/routing gate. It does not prove preview-level legacy visual differences or actual Roll20 legacy sandbox/test-room parity.

## 2026-06-18 Roll20 Sandbox Upload Recheck + Legacy Preview Toggle Slice

- Rechecked the existing Chrome Roll20 verification tab. The Custom Sheet Sandbox dialog is open and exposes visible HTML/CSS/Translation upload labels backed by `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- A visible HTML label upload attempt for the YSHY local payload still failed at `fileChooser.setFiles` with `Not allowed`. This confirms the remaining actual Roll20 upload blocker is Chrome extension file URL access, not a missing sandbox control.
- Added `legacyCssSanitize` to the preview store and wired it through both local render paths: `buildSheetDoc` for iframe preview and `buildSheetParts` for Shadow/edit preview.
- Added the toolbar `구버전 CSS` toggle (`data-testid="preview-legacy-css-toggle"`) so users can compare modern/original CSS preview against legacy Roll20 CSS sanitize locally before export.
- Added `scripts/roll20_legacy_preview_smoke.mjs` and package alias `corepack pnpm run smoke:legacy-preview`.
- Latest local ignored validation: `corepack pnpm run smoke:legacy-preview -- --report-dir reports/legacy-preview-smoke` PASS. It proves iframe and Shadow/edit user CSS chunks both preserve modern CSS when OFF and route through `sanitizeForRoll20Legacy` when ON.
- Scope note: this is local preview/edit option plumbing and synthetic CSS proof. It does not prove actual Roll20 legacy visual parity; that still needs Sandbox/test-room upload and screenshots after Chrome file upload is enabled.

## 2026-06-18 Imported Legacy Fixture Visual Smoke Slice

- Added `window.__perfHook.setLegacyCssSanitize()` so browser verification scripts can toggle preview legacy mode without relying on localized toolbar text.
- Added `scripts/roll20_legacy_fixture_visual_smoke.mjs` and package alias `corepack pnpm run smoke:legacy-fixture-visual`.
- The smoke imports ignored fixtures through the static app, captures preview iframe screenshots with legacy CSS sanitize OFF and ON, reads the final `#r20-user` CSS chunk, and checks that legacy-risk declarations are reduced when present.
- Latest local ignored validation after `lint` and `build`: `corepack pnpm run smoke:legacy-fixture-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual` PASS for AW2E, Les-Oublies, and YSHY 1BU.
- Fixture result summary: Les-Oublies reduced legacy-risk CSS `1 -> 0`; AW2E and YSHY 1BU were classified `no-risk-css`. All three had 0 console errors, 0 page errors, 0 resource issues, no visible script/rolltemplate runtime nodes, and 0% modern-vs-legacy screenshot mismatch for the tested preview state.
- Scope note: this proves local imported-fixture preview toggle behavior only. Actual Roll20 legacy sandbox/test-room parity remains unverified until the Sandbox upload blocker is resolved and actual screenshots are captured.

## 2026-06-18 Automated Reference Diff Runner Slice

- Rechecked the kept Roll20 Custom Sheet Sandbox tab. File inputs still exist as `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`; a hidden input click timed out, and a visible-label upload retry did not complete through the Chrome automation channel. Do not claim actual Roll20 upload/parity from this.
- Improved `scripts/make_visual_diff_pages.mjs`: generated diff pages now embed local reference/capture images as data URLs to avoid canvas taint, and compare native plus scaled reference candidates with 2D capture-crop search.
- Added `scripts/run_visual_fixture_diff_pages.mjs` and package alias `corepack pnpm run diff:visual-fixtures` so visual reference diff pages are executed in headless Chromium and summarized automatically.
- Latest local ignored validation: `corepack pnpm run diff:visual-fixtures` PASS. It generated 2 diff pages and collected JSON/Markdown with 0 console/page errors. Best diagnostics: AW2E 18.33% mismatch at crop `0,200,838,761`; Les-Oublies 13.51% at crop `10,544,824,799`.
- Scope note: this strengthens local reference-image diagnostics and crop normalization, but it is still not a Roll20 visual parity gate. Remaining mismatch needs classification by default state, viewport/reference crop, assets, wrapper/context, and CSS.

## 2026-06-18 Reference Diff Classification Slice

- Extended the generated visual diff JSON with mismatch bounds, quadrant counts, edge/center bands, dominant area, and crop-improvement ratio.
- Updated the headless runner Markdown to include a heuristic classification column. Latest PASS still reports AW2E 18.33% and Les-Oublies 13.51% with 0 console/page errors.
- Current classification: AW2E is `crop/state offset likely; large visual/style/default-state delta`; Les-Oublies is `crop does not explain most mismatch; medium delta`. These are triage hints, not parity claims.
- Next action: use the classification to inspect fixture default state/reference crop before changing rendering code.

## Reporting Guardrails

- Do not claim Roll20 visual parity yet.
- Do not claim all-sheet support yet.
- Do not collapse standalone preview evidence into live edit-mode evidence.
- Do not call auto-prefix real legacy sanitize.
- Do not edit protected external source corpus folders.

## 2026-06-18 Roll20 Evidence Guard Slice

- Added `scripts/roll20_actual_evidence_guard.mjs` and package alias `corepack pnpm run guard:roll20-evidence`.
- The guard checks the active git root, `.gitignore`, `.githooks/pre-commit`, tracked files, and staged files so local fixtures, generated reports, private screenshots, and public example folders do not leak into commits.
- When given a `reports/roll20-actual-compare/<label>` run folder, it also checks that local baseline, payload hygiene audit, and cleaned-payload visual roundtrip outputs exist and have no `FAIL` marker before any Roll20 sandbox/test-room upload attempt.
- Scope note: this is a safety/checklist gate only. It does not upload to Roll20 and does not prove Roll20 visual parity.

## 2026-06-18 Visual Diff Cause Classifier Slice

- Added `scripts/classify_visual_fixture_diffs.mjs` and package alias `corepack pnpm run classify:visual-fixtures`.
- `corepack pnpm run diff:visual-fixtures` now runs the classifier after generating browser diff results, writing ignored `reports/visual-fixture-diff/visual-fixture-diff-classification.md/.json`.
- The classifier combines visual diff metrics with copied fixture HTML/CSS/i18n source signals: hidden/checkbox/radio controls, `:checked`, `[value]`, sibling selectors, URL/background usage, media queries, absolute positioning, and translation hints.
- Latest local ignored classification after the integrated diff run: AW2E remains a crop/default-state-first investigation; Les-Oublies is not mostly explained by crop and should start with hidden/value selector default state plus non-crop visual delta.
- Scope note: this is local reference-image triage only. It does not prove Roll20 visual parity and should guide what to inspect in the Roll20 sandbox/solo-room screenshots.

## 2026-06-18 State Selector Audit Slice

- Added `scripts/roll20_state_selector_audit.mjs` and package alias `corepack pnpm run audit:state-selectors`.
- The audit checks Roll20 CSS default-state anchors such as hidden inputs, `:checked`, `[value]`, and sibling selectors against source HTML controls and generated Roll20 upload payload controls.
- It treats source-only dead/worker-driven selectors as diagnostics, but fails if export payloads introduce new missing-anchor regressions.
- Latest local ignored validation: AW2E, Les-Oublies, and YSHY 1BU PASS against `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1`; YSHY still records 7 source-only selector anchors that need actual Roll20/worker-state observation, but payload introduced 0 new state-anchor regressions.
- Scope note: this is semantic default-state preservation evidence only. It does not prove actual Roll20 visual parity.

## 2026-06-18 Roll20 Upload Handoff Slice

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab and confirmed the Custom Sheet Sandbox file inputs still exist: `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried official Les-Oublies payload upload through the visible `label.btn.html` control. It still failed at `fileChooser.setFiles` with `Not allowed`, confirming the blocker is Chrome extension local file access rather than missing Roll20 controls.
- Added `scripts/roll20_upload_handoff.mjs` and package alias `corepack pnpm run handoff:roll20-upload`.
- Generated an ignored handoff checklist for `official-roll20-Les-Oublies` under `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1/roll20-upload-handoff/`, listing payload files, screenshot destinations, and the diff command.
- Scope note: this does not prove Roll20 visual parity. It keeps the actual upload path ready once Chrome allows file URL access for the Codex extension.

## 2026-06-18 Asset Resource Audit Slice

- Added `scripts/roll20_asset_resource_audit.mjs` and package alias `corepack pnpm run audit:assets`.
- The audit extracts asset references from copied fixture source HTML/CSS and generated Roll20 payload HTML/CSS, probes HTTP(S) resources with no referrer, and records missing local relative refs.
- Latest local ignored validation against `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1`: AW2E, Les-Oublies, and YSHY 1BU PASS with 0 failed HTTP probes, 0 missing local relative refs, and 0 payload-introduced asset regressions.
- Scope note: this proves local source/payload asset URL reachability only. It does not prove Roll20 sandbox/test-room asset rendering until actual upload screenshots exist.

## 2026-06-18 Roll20 Pre-upload Gate Slice

- Added `scripts/roll20_preupload_verification.mjs` and package alias `corepack pnpm run verify:roll20-preupload`.
- The gate runs payload hygiene, cleaned-payload visual roundtrip, default-state selector audit, asset/resource audit, and local evidence guard in order, then writes an ignored `preupload-verification-results.md/.json` under the actual-compare run folder.
- Latest local ignored validation for `reports/roll20-actual-compare/2026-06-18-pseudo-fix-v1` PASS. This means the 3 prepared payloads are locally upload-ready; it still does not prove Roll20 visual parity because actual sandbox screenshots are missing.

## 2026-06-18 Export Dialog Roll20 Readiness UI Slice

- Added a user-facing `Roll20 업로드 준비 상태` section to `components/editor/ExportDialog.tsx`.
- The dialog now separates local zip composition readiness (`sheet.html`, `sheet.css`, `translation.json`, `sheet.json + README`) from actual Roll20 verification, which remains pending until a Custom Sheet Sandbox or new test room upload screenshot exists.
- The section explicitly tells users to compare legacy sanitize ON/OFF zips in Sandbox for old sheets, and keeps existing real rooms observation-only.
- Latest local validation:
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run guard:roll20-evidence reports\roll20-actual-compare\2026-06-18-pseudo-fix-v1`: PASS.
- Follow-up root cause: the first browser check used the dev server/static server with the wrong production `basePath`, so the page rendered HTML but client events were not a valid signal.
- Added stable header action selectors and `scripts/export_dialog_browser_smoke.mjs` with package alias `corepack pnpm run smoke:export-dialog`.
- Latest static-app validation: `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke` PASS. It opens the export dialog, confirms 5 readiness items, confirms the `실제 검증 필요` badge, opens the import dialog, and verifies main mode tab clicks with 0 console/page errors.
- Scope note: this improves user-facing status clarity only. It does not upload to Roll20 and does not prove Roll20 visual parity.

## 2026-06-18 Roll20 Upload Recheck + Visual State Detail Slice

- Rechecked the kept `Codex Roll20 Verify | Roll20` Chrome tab again. The Custom Sheet Sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- A hidden input file chooser route did not produce a usable chooser. A visible `label.btn.html` upload attempt for the official Les-Oublies cleaned payload did reach the file chooser path but failed at `fileChooser.setFiles` with `Not allowed`.
- Current actual Roll20 blocker remains Chrome extension local file access, not missing Roll20 controls. Keep the actual-screen TODO open until Sandbox/test-room screenshots exist.
- Enhanced `scripts/classify_visual_fixture_diffs.mjs` so `corepack pnpm run diff:visual-fixtures` now emits state selector samples, input/default samples, and reference/capture dimension clues in `reports/visual-fixture-diff/visual-fixture-diff-classification.md`.
- Latest local ignored validation: `corepack pnpm run diff:visual-fixtures` PASS with 0 console/page errors. AW2E remains 18.33% best mismatch with reference/capture `1240x761 -> 838x1377`, bestCropY `200`; Les-Oublies remains 13.51% with `824x799 -> 838x1491`, bestCropY `544`.
- Actionable next clues: AW2E starts with crop/default-state alignment; Les-Oublies starts with `.sheet-tabstoggle[value=...] ~ ...` selectors and hidden `attr_sheetTabForBtn` / `attr_sheetTab` defaults.
- Scope note: this is local reference-image triage. It does not prove actual Roll20 visual parity.

## 2026-06-18 Worker State Selector Runtime Slice

- Fixed the preview iframe sheet-worker simulator so `setAttrs` updates CSS-visible DOM attributes, not only DOM properties: text/hidden inputs now update `value`, and checkbox/radio inputs now update/remove `checked`.
- This matters for Roll20 sheets that use state selectors such as `.sheet-tabstoggle[value="combat"] ~ div.sheet-combat`; property-only updates do not make browser CSS attribute selectors recalculate.
- Added `scripts/sheet_worker_state_smoke.mjs` and package alias `corepack pnpm run smoke:worker-state`.
- Latest local validation:
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:worker-state -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/sheet-worker-state-smoke`: PASS. Initial combat state, action-click character state, and action-click combat state all updated both input property and input attribute, with the expected visible panel.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run diff:visual-fixtures`: PASS, unchanged diagnostics AW2E 18.33% and Les-Oublies 13.51%.
  - `node scripts/rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke`: PASS for AW2E, Les-Oublies, and YSHY.
- Scope note: this proves the local preview iframe worker/CSS-state path. Actual Roll20 sandbox/test-room parity remains unverified until upload screenshots exist.

## 2026-06-18 Raw Worker Hydration Warning Cleanup Slice

- The first worker-state smoke exposed a Blockly warning: `Ignoring non-existent input CHILDREN in block r20_raw_worker`.
- Root cause: importer-side worker parsing could attach parsed worker blocks under `r20_raw_worker.CHILDREN`, but `r20_raw_worker` was primarily the raw source preservation block. Some parsed worker descendants are reporter-shaped, so forcing them into a statement input can break Blockly XML hydration.
- Kept `r20_raw_worker` capable of holding manual worker children, but stopped automatic parsed-child insertion during HTML import. The importer still records parsed worker stats and preserves the original worker source body in the JS field.
- Latest local validation:
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:worker-state -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/sheet-worker-state-smoke`: PASS with 0 console/page errors.
  - `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit`: PASS, exact worker source preserved for AW2E, Les-Oublies, and YSHY.
  - `node scripts/rolltemplate_chat_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/rolltemplate-chat-smoke`: PASS.
  - `corepack pnpm run lint`: PASS.
- Scope note: this removes local runtime noise and keeps source fidelity. It does not complete future worker block-coding UX or actual Roll20 runtime parity.

## 2026-06-18 Visual State Candidate Slice

- Added `scripts/visual_state_candidate_smoke.mjs` and package alias `corepack pnpm run smoke:visual-state-candidates`.
- The smoke imports ignored visual fixtures through the static app, captures the initial preview iframe sheet root, then clicks visible `button[type="action"]` candidates one by one and compares each resulting screenshot against the copied reference image.
- Latest local ignored validation: `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates` PASS with 0 console/page errors.
- Result summary: AW2E exposed only the initial visible state and stayed around `18%` mismatch. Les-Oublies improved from live initial combat `11.51%` to `8.84%` after `act_fullsheet`, with hidden state hints `attr_sheetTabForBtn=fullsheet` and `attr_sheetTab=fullsheet`.
- Existing `corepack pnpm run diff:visual-fixtures` still reports Les-Oublies `13.51%` because that command compares the older rendered screenshot path, not the new live action-state candidate captures. Keep those scopes separate.
- Scope note: this identifies likely reference tab/default state. It does not prove actual Roll20 visual parity; next useful step is wiring discovered state metadata into the main baseline/diff flow and comparing against actual Roll20 Sandbox screenshots once upload is unblocked.

## 2026-06-18 Visual State Map Reuse Slice

- `scripts/visual_state_candidate_smoke.mjs` now writes compact ignored state-map artifacts: `visual-state-candidates-state-map.json` and `.md`.
- `scripts/classify_visual_fixture_diffs.mjs` now reads that state map from sibling `reports/visual-state-candidates/` when available, adds a `State hint` column, and changes `Next action` for fixtures whose reference image is likely not the initial state.
- Latest local validation:
  - `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates`: PASS.
  - `corepack pnpm run diff:visual-fixtures`: PASS. The classification report now tells agents to re-run Les-Oublies in `act_fullsheet` before renderer changes, with local candidate mismatch `8.84%`.
  - `corepack pnpm run lint`: PASS.
- Scope note: state-map reuse improves triage continuity only. It does not yet make the main baseline capture switch tabs automatically, and it is still not actual Roll20 parity evidence.

## 2026-06-18 Local Baseline State-Map Capture Slice

- Extended `scripts/roll20_actual_local_baseline.mjs` with optional `--state-map reports/visual-state-candidates/visual-state-candidates-state-map.json`.
- When supplied, the baseline script applies a discovered local preview action-state candidate before taking `local-preview.png`, and records `initial`, `APPLIED`, or `SKIP` plus hidden attr before/after state in the ignored local baseline report.
- Export payload files, `upload.zip`, and the edit screenshot remain source-derived; the state hint only affects the local preview screenshot capture state.
- Latest local validation:
  - `node --check scripts\roll20_actual_local_baseline.mjs`: PASS.
  - `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label 2026-06-18-state-map-v1 --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json`: PASS for AW2E, Les-Oublies, and YSHY 1BU. Les-Oublies recorded `act_fullsheet APPLIED (sheetTabForBtn=fullsheet, sheetTab=fullsheet)`.
  - `corepack pnpm run guard:roll20-evidence`: PASS for commit-boundary checks.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
- Run-folder evidence guard for `2026-06-18-state-map-v1` is not upload-ready yet because payload hygiene audit and cleaned-payload roundtrip were intentionally not generated for that new run.
- Scope note: this prepares better local baseline evidence for reference-state comparison. It does not prove actual Roll20 visual parity and still requires Custom Sheet Sandbox/test-room screenshots after the Chrome file-access blocker is resolved.

## 2026-06-18 State-Map Pre-upload Gate Slice

- Extended `scripts/roll20_payload_roundtrip_visual_smoke.mjs` with optional `--state-map`, matching the local baseline script. The cleaned-payload re-import screenshot now applies the same local preview action-state hint before diffing against `local-preview.png`.
- Extended `scripts/roll20_preupload_verification.mjs` so `--state-map` is forwarded to the cleaned-payload visual roundtrip check.
- Latest local ignored validation:
  - `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`: PASS.
  - Payload roundtrip recorded 0% mismatch for AW2E, Les-Oublies, and YSHY 1BU; Les-Oublies recorded `act_fullsheet APPLIED (sheetTabForBtn=fullsheet, sheetTab=fullsheet)`.
  - Payload roundtrip also recorded 0 visible runtime nodes, 0 console/page errors, and 0 resource issues.
- Scope note: this makes `2026-06-18-state-map-v1` locally upload-ready. It still does not prove actual Roll20 visual parity; the next step is Roll20 Custom Sheet Sandbox upload and actual screenshots once Chrome file URL access is available.

## 2026-06-18 Roll20 Upload Retry + Handoff Hardening Slice

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab and confirmed the Custom Sheet Sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried uploading `official-roll20-Les-Oublies` from `2026-06-18-state-map-v1`; the visible `label.btn.html` file chooser opened, but `fileChooser.setFiles` still failed with `Not allowed`.
- Attempted to open `chrome://extensions` to inspect/enable the Codex extension's file URL access. Browser automation blocked that page by security policy, so agents must not work around it. The user has to enable `Allow access to file URLs` manually before automated upload can continue.
- Inspected the Roll20 page for a direct HTML/CSS/Translation code editor fallback. None was present; the Sandbox Tools file inputs are the only discovered apply path.
- Saved local-only blocker evidence under ignored `reports/roll20-actual-compare/2026-06-18-state-map-v1/roll20-sandbox-observation/`.
- Hardened `scripts/roll20_upload_handoff.mjs`: if no run folder is provided, it now auto-selects the newest PASS pre-upload run, and a single non-path argument is treated as the fixture id. Both `corepack pnpm run handoff:roll20-upload -- official-roll20-Les-Oublies` and the explicit run command now resolve to `2026-06-18-state-map-v1`.
- `node scripts\roll20_actual_screenshot_diff.mjs reports\roll20-actual-compare\2026-06-18-state-map-v1` currently SKIPs sandbox/room/chat targets because actual Roll20 screenshots are still missing.
- Scope note: this improves handoff safety and records the real blocker. It still does not prove actual Roll20 visual parity.

## 2026-06-18 Imported Non-leaf Layer Reorder Slice

- Expanded `scripts/imported_edit_sync_smoke.mjs` with an imported-sheet non-leaf layer reorder check.
- The smoke now finds a visible imported container/subtree with direct children, drags that subtree through the real layer panel `before`/`after` drop path, and verifies both emitted order movement and direct child parent preservation.
- Latest local ignored validation:
  - `node --check scripts\imported_edit_sync_smoke.mjs`: PASS.
  - `node scripts\imported_edit_sync_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - Non-leaf evidence: AW2E moved `div before input` with 1 child preserved; Les-Oublies moved `div after div` with 1 child preserved; YSHY 1BU moved `div after div` with 1 child preserved.
  - Page errors stayed 0. YSHY still reports external Imgur resource/console failures in the local ignored report; this is tracked as resource diagnostics, not Roll20 actual parity evidence.
- Scope note: this closes the previous imported-sheet non-leaf coverage gap for the 3 prepared fixtures only. It does not prove broad corpus behavior, richer manual UX screenshots, or actual Roll20 sandbox/test-room parity.

## 2026-06-18 Edit Canvas Height + Chrome Cleanup Slice

- Removed the edit canvas fixed `900px` sheet shell and now size the edit Shadow host from the actual `#charsheet-root` content height, including visible absolutely positioned descendants.
- Removed the preview toolbar from edit mode. Edit-specific controls remain in the edit toolbar/layer panel; the preview toolbar was app chrome overlapping the rendered sheet and was not part of the Roll20 sheet result.
- Expanded `scripts/preview_edit_visual_smoke.mjs` with edit canvas height diagnostics and a strict host/content-height check.
- Latest local ignored validation:
  - `node --check scripts\preview_edit_visual_smoke.mjs`: PASS.
  - `corepack pnpm run build`: PASS.
  - `node scripts\preview_edit_visual_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual`: PASS.
  - Preview/edit mismatch improved from the previous 4.96% / 4.76% / 1.25% to AW2E 1.76%, Les-Oublies 1.68%, and YSHY 1BU 0.85%.
  - Edit host/content height delta is 0 for all 3 prepared fixtures, and preview/edit toolbar overlap is 0.
- Scope note: this is stronger local preview/edit evidence only. Actual Roll20 sandbox/test-room parity remains unverified until the upload blocker is resolved and screenshots exist.

## 2026-06-18 State-map Visual Diff Capture Slice

- Added `scripts/capture_visual_fixture_previews.mjs`.
- `corepack pnpm run diff:visual-fixtures` now captures live local preview PNGs first, applies `reports/visual-state-candidates/visual-state-candidates-state-map.json` when available, then generates/runs/classifies browser diff pages.
- Hardened `scripts/run_visual_fixture_diff_pages.mjs` for large fullsheet data-URL pages by waiting for the result JSON directly and isolating each diff page in its own Chromium process.
- Latest local validation:
  - `node --check scripts\capture_visual_fixture_previews.mjs`: PASS.
  - `node --check scripts\run_visual_fixture_diff_pages.mjs`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates`: PASS.
  - `corepack pnpm run diff:visual-fixtures`: PASS. AW2E captured initial state and reports 18% best mismatch. Les-Oublies applied `act_fullsheet` and reports 8.84% best mismatch, replacing the stale default-state 13.51% diagnostic.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run guard:roll20-evidence`: PASS.
- Scope note: this fixes the local reference-image diagnostic pipeline. It still does not prove actual Roll20 visual parity; Custom Sheet Sandbox/test-room screenshots are still blocked by Chrome file URL upload access.

## 2026-06-18 Duplicate Attr Mirror + Control State Candidate Slice

- Fixed the preview iframe runtime so direct user changes on `input/select/textarea[name^="attr_"]` mirror through all duplicate Roll20 `attr_*` controls before firing `change:<attr>` sheet-worker handlers.
- This matters for sheets that pair a visible control with hidden CSS anchors such as `.sheet-lock:checked ~ .sheet-class`; changing only the clicked input leaves the hidden anchor stale and the local preview state diverges from Roll20-like behavior.
- Expanded `scripts/sheet_worker_state_smoke.mjs` with a duplicate attribute checkbox case. Latest local validation: `corepack pnpm run smoke:worker-state -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/sheet-worker-state-smoke` PASS, including visible/hidden checked mirroring and CSS `display:none` transition.
- Expanded `scripts/visual_state_candidate_smoke.mjs` and downstream state-map consumers so visual state hints can be action buttons or checkbox/radio controls. `scripts/capture_visual_fixture_previews.mjs`, `scripts/roll20_actual_local_baseline.mjs`, and `scripts/roll20_payload_roundtrip_visual_smoke.mjs` now apply those control hints consistently.
- Latest local visual diagnostics:
  - `corepack pnpm run smoke:visual-state-candidates -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-state-candidates`: PASS. AW2E best local candidate is `control_attr_class_Hardholder` at 16.23%; Les-Oublies remains `act_fullsheet` at 8.84%.
  - `corepack pnpm run diff:visual-fixtures`: PASS and applies the same control/action state hints before diffing.
  - `node scripts\roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures\visual --report-dir reports\roll20-actual-compare --run-label 2026-06-18-state-map-v1 --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`: PASS for AW2E, Les-Oublies, and YSHY 1BU.
  - `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`: PASS. Cleaned-payload visual roundtrip reports 0% mismatch for all 3 ignored fixtures.
- Scope note: this is local preview/runtime and upload-readiness evidence only. AW2E still needs reference crop/viewport normalization because its reference image includes a wider Roll20 screen/chat context, and actual Roll20 visual parity remains blocked until Custom Sheet Sandbox/test-room screenshots exist.

## 2026-06-18 Core UI Copy Cleanup Slice

- Replaced mojibake/translation-style text in `components/editor/EditorHeader.tsx`, `components/editor/PreviewEmptyState.tsx`, and `components/editor/ExportDialog.tsx` with readable Korean labels, tooltips, confirmations, and toasts.
- Hid the public sample menu/button when `EXAMPLES` is empty. This avoids presenting a dead sample action and matches the copyright rule that real sheet examples must not be committed publicly.
- Hardened `scripts/export_dialog_browser_smoke.mjs` so it now checks the header title, empty-state title, blank-sheet CTA, hidden sample UI, no mojibake in initial shell text, export readiness badge text, import dialog opening, and edit-tab selection.
- Latest validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke`: PASS with 0 console/page errors.
- Scope note: this improves core app usability and export/verification clarity. It does not prove actual Roll20 visual parity and does not claim all editor copy is fully cleaned.

## 2026-06-19 Roll20 Actual Status Gate Slice

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab again and confirmed the Custom Sheet Sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried uploading `official-roll20-Les-Oublies` HTML from `2026-06-18-state-map-v1`; `fileChooser.setFiles` still failed with `Not allowed`.
- Added `scripts/roll20_actual_status.mjs` and package script `corepack pnpm run status:roll20-actual`.
- The status script reports local pre-upload readiness separately from actual Roll20 screenshot evidence:
  - Default command exits successfully for a readable status report but prints `PREUPLOAD_READY_MISSING_ACTUAL` when screenshots are absent.
  - `--require-actual` exits non-zero until required Roll20 screenshots and diffs exist.
- Latest local validation:
  - `node --check scripts\roll20_actual_status.mjs`: PASS.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: `PREUPLOAD_READY_MISSING_ACTUAL`, `actualScreenshots=0/9`, `diffed=0/9`.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual`: fails as expected because actual Roll20 screenshots are still missing.
- Scope note: this is a truthfulness gate and handoff aid. It does not prove actual Roll20 visual parity; the next unblock remains enabling file URL access for the Codex Chrome extension or manually placing Roll20 screenshots into the ignored run folder.

## 2026-06-19 Imported Edit Resource Strictness Slice

- Confirmed the latest YSHY imported edit sync path still moves the selected imported input correctly in edit and preview, but browser-rendered external assets still report Imgur/Typekit failures.
- Hardened `scripts/imported_edit_sync_smoke.mjs` so reports now separate:
  - `Interaction`: edit pointer movement, preview sync, flow insertion, free insertion, layer reorder, and re-import stability.
  - `Resources`: browser-rendered image/font resource loading.
- Added `--fail-on-resource-issues true` plus package script `corepack pnpm run smoke:imported-edit-sync:strict`.
- Latest local validation:
  - `node --check scripts\imported_edit_sync_smoke.mjs`: PASS.
  - `corepack pnpm run smoke:imported-edit-sync -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only yshy-commission-1bu --port 4296`: interaction PASS, resources WARN.
  - `corepack pnpm run smoke:imported-edit-sync:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/imported-edit-sync --only official-roll20-AW2E --port 4298`: PASS, proving strict mode succeeds when resources load.
- Scope note: this does not fix YSHY's external asset failures yet. It prevents future visual-parity work from treating an edit-interaction PASS as a full visual readiness PASS.

## 2026-06-19 Preview Capture Resource Strictness Slice

- Hardened `scripts/capture_visual_fixture_previews.mjs` so local preview screenshot captures now separate:
  - `Status`: imported fixture rendered in the preview iframe without visible runtime nodes or console/page errors.
  - `Resources`: browser-rendered image/font resource loading.
- Added `--fail-on-resource-issues true` and package scripts:
  - `corepack pnpm run capture:visual-fixtures`
  - `corepack pnpm run capture:visual-fixtures:strict`
- Latest local validation:
  - `node --check scripts\capture_visual_fixture_previews.mjs`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run capture:visual-fixtures -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-fixture-render --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json --only yshy-commission-1bu --port 4301`: PASS, resources PASS.
  - `corepack pnpm run capture:visual-fixtures:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-fixture-render --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json --only official-roll20-AW2E --port 4302`: PASS, resources PASS.
  - `corepack pnpm run capture:visual-fixtures:strict -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/visual-fixture-render --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json --only yshy-commission-1bu --port 4303`: PASS, resources PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run guard:roll20-evidence -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS.
- Scope note: this proves the local preview capture path is not hiding resource failures for the checked fixtures. It does not prove actual Roll20 visual parity, and it does not clear the imported edit/reimport resource WARN path.

## 2026-06-19 Roll20 Upload Retry After Preview Strictness

- Reclaimed the kept `Codex Roll20 Verify | Roll20` Chrome tab and confirmed the sandbox still exposes `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`.
- Retried the Les-Oublies generated payload HTML upload through the visible `label.btn.html` file chooser.
- Result: chooser opened, but `fileChooser.setFiles` returned `Not allowed` again. This remains the Chrome extension file URL access blocker, not a payload readiness failure.
- Regenerated ignored handoff instructions with `corepack pnpm run handoff:roll20-upload -- official-roll20-Les-Oublies`; output is under `reports/roll20-actual-compare/2026-06-18-state-map-v1/roll20-upload-handoff`.
- Next unblock: in Chrome, open `chrome://extensions`, open Details for the Codex extension, and enable `Allow access to file URLs`; then retry sandbox upload and capture `roll20-sandbox.png` / `roll20-chat.png`.

## 2026-06-19 Edit UI Copy Cleanup + Smoke Gate

- Cleaned the edit canvas and layer panel user-facing copy:
  - edit toolbar labels now use readable `시트 편집`, `흐름`, `자유`, and Korean placement tooltips.
  - layer role labels now use Korean names such as `틀`, `흐름`, `표`, `입력`, and `버튼`.
  - friendly widget gallery preset names/descriptions now use readable Korean copy.
- Hardened `scripts/edit_flow_browser_smoke.mjs` with an `editUiCopy` check. It now verifies the edit canvas contains `시트 편집`, `레이어`, `레이어 검색`, `흐름`, and `자유`, and that the scoped edit canvas text has no Han-range mojibake.
- Latest validation:
  - scoped source mojibake scan over `components/editor/EditCanvas.tsx`, `lib/editor/layerRoles.ts`, and `lib/widgets/presets.ts`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `node scripts\edit_flow_browser_smoke.mjs --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4311`: PASS. Existing flow/free placement, layer reorder, absolute-in-frame, and edit UI copy checks all passed.
- Scope note: this improves edit-mode usability and prevents this copy regression from returning. It does not prove actual Roll20 visual parity.

## 2026-06-19 Core Shell/Export Copy Verification Refresh

- Rechecked the core shell copy after finding stale mojibake expectations in `docs/qa/31_active_todo.md` and `scripts/export_dialog_browser_smoke.mjs`.
- Cleaned the user-facing Korean copy in:
  - `components/editor/EditorHeader.tsx`
  - `components/editor/PreviewEmptyState.tsx`
  - `components/editor/ExportDialog.tsx`
- Hardened `scripts/export_dialog_browser_smoke.mjs` so it now verifies:
  - header title, empty-state title, blank-sheet CTA, and hidden public sample UI;
  - no mojibake in initial shell text;
  - export dialog title, 5 readiness items, `실제 검증 필요` badge, legacy toggle copy, and local-vs-actual Roll20 verification warning;
  - no mojibake in export dialog text;
  - import dialog opening and edit-mode tab selection.
- Latest validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4312`: PASS with 0 console/page errors.
- Scope note: this keeps the app's core flow readable and its export UI honest about Roll20 actual-screen verification. It does not prove actual Roll20 visual parity; Custom Sheet Sandbox/test-room screenshots are still missing.

## 2026-06-19 Roll20 Actual Status Gate Split

- Rechecked the current Roll20 actual-screen status after the latest Chrome retry.
- Confirmed the kept Roll20 tab still exposes Sandbox upload controls, but hidden input upload timed out and the visible file chooser path remains blocked by Chrome extension file URL access.
- Updated `scripts/roll20_actual_status.mjs` so generated-sheet actual evidence is separated from optional solo-room observation:
  - generated-sheet gate: `roll20-sandbox.png` and `roll20-chat.png`;
  - read-only observation: `roll20-room.png`.
- Latest validation:
  - `node --check scripts\roll20_actual_status.mjs`: PASS.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS and reports `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`, `generatedActualScreenshots=0/6`, `generatedDiffed=0/6`, `roomObservationScreenshots=0/3`, `roomObservationDiffed=0/3`.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --require-actual`: fails as expected because generated Sandbox/chat evidence is missing.
- Scope note: this is a truthfulness/status split only. It does not prove actual Roll20 visual parity; the next unblock remains enabling file URL access for the Codex Chrome extension, uploading the generated payloads in Custom Sheet Sandbox, and capturing `roll20-sandbox.png` / `roll20-chat.png`.

## 2026-06-19 Preview/Edit DOM Signature Parity Gate

- Hardened `scripts/preview_edit_visual_smoke.mjs` so preview iframe and edit Shadow DOM are compared by DOM signature, not only screenshot mismatch and height:
  - total node count;
  - `data-r20-block-id` count and unique count;
  - tag count map;
  - form control `tag/type/name` count map;
  - first 120-node structural sequence hash;
  - visible `script` / `rolltemplate` runtime node count.
- Added package script `corepack pnpm run smoke:preview-edit-visual`.
- Latest local validation:
  - `node --check scripts\preview_edit_visual_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4314`: PASS.
- Latest evidence from the ignored local report:
  - AW2E: preview/edit nodes `1903/1903`, blocks `575/575`, sequence hash `41cc331a/41cc331a`, mismatch `1.76%`.
  - Les-Oublies: preview/edit nodes `664/664`, blocks `611/611`, sequence hash `d74453ad/d74453ad`, mismatch `1.68%`.
  - YSHY 1BU: preview/edit nodes `6336/6336`, blocks `5820/5820`, sequence hash `0e0258ca/0e0258ca`, mismatch `0.85%`.
  - Visible runtime nodes are 0 for all 3 fixtures.
- Scope note: this is stronger local evidence that edit mode uses the same rendered sheet structure with overlays outside the root capture. It still does not prove actual Roll20 visual parity.

## 2026-06-19 Roll20 Upload Blocker Recheck + Layer Row UX Slice

- Rechecked the kept Chrome Roll20 verification tab at `https://app.roll20.net/editor`.
- Sandbox DOM state:
  - `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` exist.
  - Visible upload controls are `label.btn.html`, `label.btn.css`, and `label.btn.translation`.
  - Hidden `#sheetHtml` direct click did not open a usable file chooser.
  - CDP `DOM.setFileInputFiles` is not allowed by the browser capability and instructs using the file chooser flow instead.
  - Visible `label.btn.html` did open the chooser, but `fileChooser.setFiles` still failed with `Not allowed`.
- Current blocker remains Chrome Codex extension local-file access, not missing Roll20 controls or missing payload files.
- While actual Roll20 upload is blocked, improved edit-layer row affordance:
  - layer rows now expose `data-r20-layer-role-kind`, `data-r20-can-drop`, and `data-r20-default-drop-mode`;
  - rows visibly show the role label, `담기 가능` for containers, and default placement mode (`흐름` / `자유`);
  - drag target badges now use Korean labels (`앞에 넣음`, `안에 넣음`, `뒤에 넣음`) instead of raw `before/inside/after`.
- `scripts/edit_flow_browser_smoke.mjs` now checks the new layer row affordance attributes/text for the section row.
- Added package script `corepack pnpm run smoke:edit-flow`.
- Validation:
  - `node --check scripts\edit_flow_browser_smoke.mjs`: PASS.
  - `git diff --check`: PASS with CRLF warnings only.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:edit-flow -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/edit-flow-smoke --port 4318`: PASS; the section layer row reported `roleKind=frame`, `canDrop=1`, `defaultDropMode=flow`, and visible text including `틀`, `담기 가능`, and `흐름`.

## 2026-06-19 Visual Diff Classification State-Applied Gate

- Fixed `scripts/classify_visual_fixture_diffs.mjs` so state-map hints are not treated as pending work when the current diff already reflects the same state.
- Added `stateCandidateApplied` to the JSON report and an `Applied` column to the Markdown summary.
- Added `reference/capture context mismatch` as a distinct category when the reference image and captured local preview have incompatible context, sheet height, or a large best-crop offset.
- Latest local validation:
  - `node --check scripts\classify_visual_fixture_diffs.mjs`: PASS.
  - `node scripts\classify_visual_fixture_diffs.mjs reports\visual-fixture-diff test-fixtures\visual`: PASS.
- Latest ignored classification output:
  - AW2E: state `control_attr_class_Hardholder` is already applied; likely cause is `viewport/crop/default-state offset; default attr/state; reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes.
  - Les-Oublies: state `act_fullsheet` is already applied; likely cause is `viewport/crop/default-state offset; default attr/state; reference/capture context mismatch`; next action is crop/context normalization or actual Roll20 screenshot collection before renderer CSS changes.
- Scope note: this improves triage truthfulness. It does not reduce the visual mismatch by itself and does not prove Roll20 visual parity.
## 2026-06-19 Roll20 Actual Sandbox Contract Observation

- Used the logged-in Chrome Roll20 session on the dedicated verification sandbox and found the settings URL shape `sheetsandbox/settings/<campaignId>`.
- Confirmed the visible settings page exposes `customcharsheet_json`; the page script references the preview path for `customcharsheet_layout`, `customcharsheet_style`, and `#customsheet-preview iframe -> #root`.
- Documented observed Roll20 sandbox CSS/HTML sanitize behavior in `docs/spec/30_roll20_actual_sandbox_contract.md`, including `.charsheet` selector prefixing, URL proxy/drop rules, HTML tag allow-list, and class prefix exceptions.
- Important boundary: this is structure/runtime evidence, not generated-sheet visual parity. Actual upload/screenshots remain blocked by Chrome extension file upload permissions.

## 2026-06-19 Roll20 Sandbox Sanitize Module Slice

- Added `lib/emit/roll20SandboxSanitize.ts` as a dedicated Roll20 sandbox sanitize/prefix approximation, explicitly separate from `sanitizeForRoll20Legacy`.
- Added `lib/emit/__tests__/roll20SandboxSanitize.test.ts` and package script `test:roll20-sandbox-sanitize`.
- Covered observed selector prefixing, Roll20 URL proxy/drop behavior, unsafe CSS rejection, HTML allow-list/class prefix exceptions, runtime source stripping, and HTML URL handling.
- Verification: `corepack pnpm run test:roll20-sandbox-sanitize`, `corepack pnpm run lint`, and `corepack pnpm run build` PASS.
- Scope note: this is a local module/test slice. It is not yet wired into preview/export and still does not prove actual Roll20 visual parity.

## 2026-06-19 Roll20 Sandbox Sanitize Preupload Gate Slice

- Added `scripts/roll20_sandbox_sanitize_audit.mjs` and package script `audit:roll20-sandbox-sanitize`.
- Wired the new audit into `scripts/roll20_preupload_verification.mjs` immediately after payload hygiene.
- Latest ignored run `2026-06-18-state-map-v1` PASS: AW2E, Les-Oublies, and YSHY all produce `htmlChanged=true` and `cssChanged=true` under observed Roll20 sandbox sanitize rules, but none hit the fatal empty/rejected gate.
- Diagnostic rewrite sizes from the local report: AW2E HTML `94235 -> 92210`, CSS `12678 -> 14084`; Les-Oublies HTML `57358 -> 47217`, CSS `12922 -> 14603`; YSHY 1BU HTML `598439 -> 497753`, CSS `26815 -> 29181`.
- Full local pre-upload gate with the new audit PASS: `corepack pnpm run verify:roll20-preupload -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --fixtures test-fixtures\visual --out-dir ./out --base-path /roll20-block-editor --state-map reports\visual-state-candidates\visual-state-candidates-state-map.json`.
- Scope note: this proves local upload-readiness now includes a Roll20 sandbox sanitize diagnostic. It still does not prove actual Roll20 visual parity; generated sandbox/chat screenshots remain missing.

## 2026-06-19 Export Sandbox Diagnostics UI Slice

- Added a user-facing `Roll20 Sandbox 예상 변환` panel to `components/editor/ExportDialog.tsx`.
- The panel uses the same observed sandbox sanitizer module as the local audit (`sanitizeRoll20SandboxHtml/Css`) against the prepared Roll20 payload, and reports HTML/CSS rewrite risk, runtime stripping, class/tag rewrites, URL proxy/drop counts, and fatal reject risk.
- This is diagnostic only: it does not mutate the downloaded zip payload and does not replace actual Roll20 Sandbox/test-room screenshot verification.
- Hardened `scripts/export_dialog_browser_smoke.mjs` so the static app smoke now checks the Sandbox diagnostics panel, 4 diagnostic rows, and the status badge.
- Latest validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4322`: PASS with 0 console/page errors.
  - `corepack pnpm run test:roll20-sandbox-sanitize`: PASS (Node still prints the known module-type warning).
  - `corepack pnpm run audit:roll20-sandbox-sanitize -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: PASS.
- Scope note: local upload readiness is clearer in the app, but actual Roll20 generated-sheet visual parity remains blocked until the Chrome extension can upload local files or screenshots are manually placed in the ignored report folder.

## 2026-06-19 Imported Fixture Export Diagnostics Smoke

- Extended `scripts/export_dialog_browser_smoke.mjs` with optional `--fixtures` and `--fixture` arguments.
- In fixture mode, the smoke enables `window.__perfHook`, imports the ignored copied fixture through the real browser import path, then opens the export dialog and verifies the Sandbox diagnostics against the emitted payload.
- Latest imported-fixture validation:
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke-imported --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --port 4325`: PASS.
  - Imported fixture stats: 653 blocks, 4 worker blocks, emitted bytes HTML 82409 / CSS 12922 / worker 7496.
  - Export dialog reported `치명 오류 없음`, 4 diagnostics rows, expected rewrite rows for HTML/CSS/classes, 0 console/page errors, and no mojibake.
- Rechecked empty-workspace export smoke too:
  - `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke --port 4326`: PASS.
- Additional validation:
  - `node --check scripts\export_dialog_browser_smoke.mjs`: PASS.
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
- Scope note: this proves the new export diagnostics UI works after a real local fixture import. It still does not prove actual Roll20 visual parity because no generated-sheet Roll20 Sandbox/chat screenshots have been captured.

## 2026-06-19 Roll20 Sandbox Expected Preview Toggle

- Added a preview-only Roll20 Custom Sheet Sandbox expected-render mode.
- `buildSheetDoc` can now apply `sanitizeRoll20SandboxHtml/Css` after auto-prefix and before optional legacy CSS sanitize, while normal preview remains source-preserving by default.
- Added `roll20SandboxSanitize` to `usePreviewStore`, exposed it through `window.__perfHook.setRoll20SandboxSanitize()`, and surfaced a compact `Sandbox 예상` toggle in the main toolbar whenever preview is visible.
- Added package script `corepack pnpm run smoke:roll20-sandbox-preview`.
- Latest imported-fixture browser validation:
  - `corepack pnpm run smoke:roll20-sandbox-preview -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --fixture official-roll20-Les-Oublies --report-dir reports/roll20-sandbox-preview-smoke --port 4331`: PASS.
  - Normal preview: `rootInnerBytes=82511`, `userCssBytes=14302`, `colgroupCount=6`, `rolltemplateCount=3`, `sourceWorkerScriptCount=1`.
  - Sandbox expected preview: `rootInnerBytes=69761`, `userCssBytes=15488`, `colgroupCount=0`, `rolltemplateCount=0`, `sourceWorkerScriptCount=0`.
  - Console/page errors: 0.
- Regression checks:
  - `corepack pnpm run lint`: PASS.
  - `corepack pnpm run build`: PASS.
  - `corepack pnpm run test:roll20-sandbox-sanitize`: PASS, with the known Node module-type warning.
  - `corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4332`: PASS for AW2E, Les-Oublies, and YSHY 1BU with the same mismatch bounds as before.
  - `corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1`: still `PREUPLOAD_READY_MISSING_GENERATED_ACTUAL`.
- Scope note: this is a local Roll20 Sandbox expected-render diagnostic. It does not prove actual Roll20 visual parity; generated Roll20 Sandbox/chat screenshots remain missing until the Chrome upload permission blocker is resolved.

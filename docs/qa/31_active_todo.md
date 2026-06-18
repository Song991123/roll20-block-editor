# 31. Active TODO Board

Date: 2026-05-19

This board is the live working list for Codex/Claude/other agents. Keep claims tied to evidence. Do not mark browser roundtrip, Roll20 visual parity, or full import/export as done unless the linked report proves that exact level.

## Status Legend

- TODO: not started.
- DOING: actively being worked on.
- BLOCKED: cannot proceed without external account/tool/permission.
- VERIFY: code or docs changed; needs lint/build/browser/corpus verification.
- DONE: verified with the command/report named in the note.

## Now

| Status | Owner | Task | Evidence / Next Check |
| --- | --- | --- | --- |
| DOING | Codex | Keep this TODO board current while work proceeds. | Update after each implementation/verification batch. |
| DONE | Codex agents | Audit why edit canvas and preview can diverge. | Report: split renderer/CSS path risk. Rechecked against current `web-push-main` before patching. |
| DONE | Codex agents | Audit worker JS and rolltemplate/chat path. | Report: current branch already has chat tab; worker layer still needs long-term split. |
| DONE | Codex agents | Audit CI/CD and browser roundtrip setup. | Report: use current `web-push-main` as source of truth; older `web` notes are stale where they conflict. |
| DONE | Claude CLI | Run read-only cross-review when auth/tooling allows. | Claude CLI `2.1.144`; review confirmed current reports prove Node import determinism only. |
| DONE | Codex/Claude | First Figma-like flow drop slice for edit mode. | Browser smoke PASS: `reports/edit-flow-smoke/edit-flow-smoke-results.md`. Real `dragover`/`drop` DragEvents verified: background drop -> absolute frame, drop over section -> flow nesting with no `position:absolute`, 0 console errors. Existing-object mouse drag is now covered too: latest smoke moved a section and confirmed computed position and emitted CSS rule both landed at `left: 464px; top: 256px`. Smoke runs against static `out/` export via `scripts/edit_flow_browser_smoke.mjs`; no dev server needed. |
| DONE | Codex | Organize project docs and operating rules. | Added `docs/operations/33_working_rules_and_requirements.md`, `docs/PROJECT_STRUCTURE.md`, `docs/README.md`, `reports/README.md`, and `scripts/README.md`; `lint` and `build` passed. |
| DONE | Codex | Archive stale QA markdown and add folder indexes. | Moved old `qa_*` snapshots into `docs/qa/archive/`; added README indexes for docs subfolders; `lint` and `build` passed. |
| DONE | Codex | Split requirements into actionable gap matrix and branch plan. | Added `docs/qa/34_requirements_gap_matrix.md`, `docs/operations/34_branch_and_deployment_plan.md`, and CI workflow. `lint`, `build`, `main` CI, `dev` CI, and Pages deploy passed. |
| DONE | Codex | Harden shared agent rules with mandatory references. | Added startup checklist, source safety, forbidden claims, branch/deploy rules, and minimum verification commands to `docs/operations/33_working_rules_and_requirements.md`; `lint` and `build` passed. |
| DONE | Codex | Move agent-only rules out of README files. | Added root `AGENTS.md`, removed agent-only startup rule text from README files, and linked `AGENTS.md` from the operations rulebook; `lint` and `build` passed. |
| DONE | Codex | Add standalone preview cascade leak diagnostics. | Added `scripts/make_cascade_leak_pages.mjs` and `scripts/serve_static_dir.mjs`; Browser-computed report: `reports/cascade-leak/cascade-leak-results.md`. |
| DONE | Codex | Add live Shadow DOM cascade leak diagnostics. | `scripts/live_shadow_cascade_smoke.mjs` PASS for AW2E, Les-Oublies, YSHY 1BU: preview/edit Shadow DOM sampled visible properties had 0 app-like CSS winners. Report: `reports/live-shadow-cascade/live-shadow-cascade-results.md`. Imgur resource 403s remain asset parity follow-up, not cascade leakage. |
| DONE | Codex | Add imported fixture preview/edit screenshot smoke. | `scripts/preview_edit_visual_smoke.mjs` PASS after `build`: 3 fixtures rendered preview root + edit root with 0 console/page errors. Latest diagnostic mismatch after aligning Shadow DOM font registration: AW2E 4.96%, Les-Oublies 0% (10 pixels), YSHY 1BU 1.26%; this is local preview/edit parity evidence, not Roll20 actual-screen parity. |
| DOING | Codex | Add Roll20 actual-screen verification workflow. | Local baseline package PASS: `reports/roll20-actual-compare/2026-06-18-local-baseline-smoke/local-baseline-results.md` generated preview/edit screenshots plus Sandbox payload files and `upload.zip` for 3 ignored fixtures. Chrome can reach logged-in Roll20 `campaigns/search` page. Next check: solo-room observation -> Custom Sheet Sandbox/test-room upload check. Evidence must stay in ignored `reports/roll20-actual-compare/`. |

## Critical Product Tasks

| Status | Priority | Task | Notes |
| --- | ---: | --- | --- |
| VERIFY | P0 | Make edit canvas and preview render from the same emitted HTML/CSS path, with edit overlays only. | `scripts/preview_edit_visual_smoke.mjs` now captures imported fixture preview root vs edit root with coarse mismatch bounds/quadrants, render diagnostics, and edit-toolbar occlusion metrics. Latest PASS: AW2E 4.96% (bounds 0,404 850x676), Les-Oublies 0%/10 px, YSHY 1BU 1.26% (bounds 0,17 851x1063). Roll button counts match preview/edit (AW2E 13, Les-Oublies 40, YSHY 808). Needs remaining fixture-specific visual fixes and actual Roll20 comparison before DONE. |
| DONE | P0 | Hide `script`, `script[type="text/worker"]`, and `rolltemplate` from sheet canvas in every render mode. | `lib/preview/buildDoc.ts` now hard-hides them after user CSS in iframe and shadow/edit render paths; fixture render report confirms source script/rolltemplate nodes remain for runtime/chat extraction. |
| TODO | P0 | Preserve worker JS as a separate future block-coding workspace. | Current reports include worker matched/raw counts. |
| DONE | P0 | Implement real browser L2 roundtrip: import -> emit -> import -> compare. | **3/3 fixtures PASS** (AW2E, Les-Oublies, YSHY 1부 6531 blocks): `reports/roundtrip-browser/browser-roundtrip-results.md`. Fix chain: worker wrapper newline + indent growth, section/toggle multi-class guard, whitespace-only line growth. This proves browser emit stability for 3 fixtures only — NOT all-sheet support. Next: roundtrip-with-edit-step, expand fixtures. |
| VERIFY | P0 | Add visual/cascade leak verification for Roll20 preview. | Standalone report (`reports/cascade-leak/cascade-leak-results.md`) and live Shadow DOM report (`reports/live-shadow-cascade/live-shadow-cascade-results.md`) both show 0 app-like CSS winners across 3 fixtures. Still needs screenshot diff normalization and asset loading parity. |
| DOING | P0 | Build screenshot-based sheet visual verification from existing preview images. | Inventory, fixture prep, shared preview render, and browser capture smoke are working. Next: normalize viewport/crop and add pixel diff against references. |
| DONE | P0 | Add first browser-canvas pixel diff harness. | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; first diagnostic diff computed for 2 fixtures. Needs viewport/state/crop normalization before parity gating. |
| DOING | P0 | Normalize visual diff viewport, initial sheet state, and crop region. | First pass added multi-mode diff. Best diagnostics: AW2E 24.3% native top-left, Les Oublies 14.0% vertical crop. Still not parity gating. |
| TODO | P1 | Improve raw fallback coverage for sheets such as custom Magica. | Current custom-magica coverage is 95.7%, rawFallback 76. |
| TODO | P1 | Make layer panel useful as a Figma-like hierarchy/reparenting surface. | Tree must allow grouping/reparenting, not just viewing. |
| TODO | P1 | Define absolute positioning inside frames/groups. | Coordinates should be relative to containing block; frame must become `position: relative` when needed. |
| DONE | P1 | Add shared DOM layer role classification for edit UX. | `lib/editor/layerRoles.ts` gives frame/flow/table/control/action/text/media/runtime roles used by the layer panel, gallery drop detection, and Shadow DOM edit affordance CSS. Real drag/drop browser smoke passed (`reports/edit-flow-smoke/`): dropped section exposes `data-r20-layer-role="frame"` + `data-r20-can-drop="1"` and receives flow children. |
| VERIFY | P1 | Expand Roll20 worker simulator and chat rolltemplate rendering. | Local chat smoke now clears chat per fixture and checks exactly 1 card, 280px rolltemplate width, and no app-only `rolltemplate:name` debug label. Latest PASS: `reports/rolltemplate-chat-smoke/rolltemplate-chat-smoke-results.md`. AW2E/YSHY used real `user-click`; Les-Oublies required `dom-click-fallback`, so default visible-state/actionability remains TODO. Actual Roll20 chat parity remains TODO. Worker simulator split still TODO. |
| TODO | P1 | Add explicit modern/legacy Roll20 preview/export mode checks. | Existing export toggle exists; preview-level proof still needed. |
| TODO | P0 | Run Roll20 actual-screen check with Chrome session. | Local baseline payloads are now generated by `scripts/roll20_actual_local_baseline.mjs` for 3 ignored fixtures with no blocking export warnings. Chrome login reachability confirmed at `campaigns/search`; no room inspected or modified yet. Existing solo rooms are observation-only; generated sheet checks must use Custom Sheet Sandbox first or a new test room. Store screenshots/reports locally only. |
| VERIFY | P1 | Separate auto-prefix preview sanitize from real legacy Roll20 CSS sanitize in fixture reports. | `scripts/render_visual_fixture_doc.mjs` now reports `Auto-prefix` and `Legacy CSS sanitize` separately; actual legacy CSS sanitizer preview mode remains TODO. |
| DONE | P0 | Establish `dev` branch and predeploy CI. | `dev` branch pushed to origin; CI passed on `main` and `dev` when checked on 2026-06-12. `main` remains the only GitHub Pages deploy branch. |
| TODO | P1 | Decide separate public preview hosting for `dev`. | GitHub Pages currently provides one repo site; recommended options are Vercel/Netlify, a second Pages repo, or a same-site `/dev/` artifact merge. |
| DONE | P2 | Move old duplicated QA files into `docs/qa/archive/` after checking references. | `rg` showed no code/script references outside QA self-references; archived old v1/v2 QA snapshots and added `docs/qa/README.md`. |
| DONE | P0 | Render prepared visual fixtures through the shared preview document path. | `reports/visual-fixture-render/visual-fixture-render.md`; rendered 3 copied fixtures through `buildSheetDoc`. This is not visual parity yet. |

## Verified So Far

| Status | Scope | Evidence |
| --- | --- | --- |
| DONE | Full corpus static inventory | `reports/corpus-static-audit/corpus-static-audit.md`; 1434 sheets, 18676 files. |
| DONE | Selected Node import determinism | `reports/roundtrip-node/summary.md`; 7 selected fixtures PASS at Node-side import determinism level. |
| DONE | Malformed `<` parser hang fix | `custom-magica` dropped from >300000 ms timeout to 61 ms in `reports/roundtrip-node/summary.md`. |
| DONE | CI/CD deploy for latest commit | GitHub Actions run for `1620b61` completed successfully and GitHub Pages returned 200. |
| DONE | Claude CLI setup | Installed `@anthropic-ai/claude-code`; executable path `C:\Users\acorn\AppData\Roaming\npm\claude.cmd`; verified version `2.1.144`. |
| DONE | Local smoke after render CSS patch | `corepack pnpm run lint`, `corepack pnpm run build`, and `http://127.0.0.1:3000/` browser load with no console errors. |
| DONE | Visual reference inventory | `reports/visual-reference-inventory/visual-reference-inventory.md`; found 1497 source sheet folders, 9114 images, 491 visual candidates. |
| DONE | Visual fixture preparation smoke | `scripts/prepare_visual_fixture.mjs` copied `official-roll20:Les-Oublies` and `official-roll20:AW2E` into ignored `test-fixtures/visual/` with manifests. |
| DONE | Explicit YSHY 1BU fixture smoke | `scripts/prepare_explicit_fixture.mjs` copied `1부 HTML.html`, `1부 CSS.css`, and `번역.txt` into ignored fixture `yshy-commission-1bu`; `buildSheetDoc` render and Browser Use load completed with 0 console errors/warnings. |
| DONE | Roll20 dialog class context restored | `buildSheetDoc` and `buildSheetParts` now put `ui-dialog ui-widget ui-widget-content ui-corner-all` on `#dialog-window`; regenerated YSHY fixture confirms wrapper context while visible dialog chrome remains suppressed. |
| DONE | Visual fixture render smoke | `scripts/render_visual_fixture_doc.mjs` wrote standalone preview HTML for 2 copied fixtures and `reports/visual-fixture-render/visual-fixture-render.md`. |
| DONE | Preview non-canvas node hiding | `script`, `script[type="text/worker"]`, and `rolltemplate` get final-source-order hidden CSS with zero layout/hit-test footprint in both build paths. |
| DONE | Browser capture smoke for visual fixtures | Opened both generated fixture HTML files through Browser Use; captured local PNGs with 0 console errors. Full-page captures show fixture-state/viewport normalization is still needed before pixel diff. |
| DONE | Browser-canvas diagnostic pixel diff | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; 2 fixtures diffed with 0 browser console errors. Multi-mode diff added after first pass. |
| DONE | Visual fixture render terminology refresh | `node scripts/render_visual_fixture_doc.mjs`; report now renders 3 fixtures and no longer labels preview auto-prefix as legacy sanitize. |
| DONE | Documentation structure index | `docs/README.md`, `docs/PROJECT_STRUCTURE.md`, `reports/README.md`, and `scripts/README.md` document where future work should live. |
| DONE | Edit-flow smoke hook compile check | Added `window.__perfHook.appendFriendlyWidgetForEditSmoke()` for flow-vs-absolute widget insertion diagnostics; `corepack pnpm run lint` and `corepack pnpm run build` passed on 2026-06-12. |
| DONE | Edit-flow browser smoke (real DragEvents) | `scripts/edit_flow_browser_smoke.mjs` PASS in headless Chromium against static `out/`: hook flow/absolute paths + real dragover/drop nesting into a frame container, 0 console errors. Report: `reports/edit-flow-smoke/edit-flow-smoke-results.md`. Fixed `lastClearedAt` guard making the hook smoke always return null. `lint`/`build` re-passed on 2026-06-12. |
| DONE | First browser L2 roundtrip harness | `scripts/browser_roundtrip_smoke.mjs` + `reports/roundtrip-browser/`. Now **3/3 PASS** after the mapping-fidelity fix batch. `lint`/`build` passed on 2026-06-12. |
| VERIFY | Local rolltemplate chat smoke | `scripts/rolltemplate_chat_smoke.mjs` PASS for AW2E, Les-Oublies, and YSHY 1BU in the static app. Each fixture now clears prior chat first and verifies 1 card, 280px width, `Debug label=no`. This proves local preview roll button -> ChatPane card rendering only; Les-Oublies used `dom-click-fallback`, and actual Roll20 chat/sandbox parity is still unverified. |
| DONE | YSHY mapping-fidelity verification + 10-defect fix batch | `reports/mapping-fidelity/mapping-fidelity-yshy.md`. All Roll20-meaningful token categories now EXACT between source and emit for YSHY 1부 (attr 1069, inputs 1049, roll buttons 808 name+value, data-i18n 1083, placeholders 140, disabled 6, i18n keys 399). Fixed: DOMParser self-closing tag swallowing, r20_skill_row missing field definitions,  XML-illegal separator, placeholder->value pollution, i18n key mangling, placeholder/data-i18n/disabled loss on input/textarea/heading/caption, CSS attribute-selector space loss, section/toggle multi-class guard, whitespace-line indent growth, hook bumpStructure. `lint`/`build`/smoke/roundtrip all re-passed 2026-06-12. |

## Forbidden Claims

- Do not say "100% import/export" yet.
- Do not say "Roll20 visual parity" yet.
- Do not say "all sheets are supported" yet.
- Do not say worker JS block coding is complete yet.

## External Source Safety

Never write into:

- `D:\훙냥냥\마렌상\roll20-character-sheets-master`
- `D:\훙냥냥\마렌상\티알\[중요]커스텀시트`
- `D:\훙냥냥\마렌상\티알\0 CoC\영시영\H님 커미션\시트`

If fixtures are needed, copy selected files into workspace-owned ignored folders only.

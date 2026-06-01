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
| VERIFY | Codex | First Figma-like flow drop slice for edit mode. | Gallery drops over frame/flow/table DOM nodes now nest as flow children instead of always absolute. `lint` and `build` passed; still needs browser drag/drop smoke. |

## Critical Product Tasks

| Status | Priority | Task | Notes |
| --- | ---: | --- | --- |
| VERIFY | P0 | Make edit canvas and preview render from the same emitted HTML/CSS path, with edit overlays only. | First patch: `buildSheetDoc`/`buildSheetParts` now always include Roll20 baseline/runtime/layer CSS so iframe/shadow/edit use the same sheet render CSS stack. `lint`, `build`, and localhost load passed; still needs imported-sheet visual parity check. |
| DONE | P0 | Hide `script`, `script[type="text/worker"]`, and `rolltemplate` from sheet canvas in every render mode. | `lib/preview/buildDoc.ts` now hard-hides them after user CSS in iframe and shadow/edit render paths; fixture render report confirms source script/rolltemplate nodes remain for runtime/chat extraction. |
| TODO | P0 | Preserve worker JS as a separate future block-coding workspace. | Current reports include worker matched/raw counts. |
| TODO | P0 | Implement real browser L2 roundtrip: import -> emit -> import -> compare. | Current `reports/roundtrip-node/summary.md` is Node import determinism only. |
| TODO | P0 | Add visual/cascade leak verification for Roll20 preview. | Need computed CSS origin and screenshot diff. |
| DOING | P0 | Build screenshot-based sheet visual verification from existing preview images. | Inventory, fixture prep, shared preview render, and browser capture smoke are working. Next: normalize viewport/crop and add pixel diff against references. |
| DONE | P0 | Add first browser-canvas pixel diff harness. | `reports/visual-fixture-diff/visual-fixture-diff-results.md`; first diagnostic diff computed for 2 fixtures. Needs viewport/state/crop normalization before parity gating. |
| DOING | P0 | Normalize visual diff viewport, initial sheet state, and crop region. | First pass added multi-mode diff. Best diagnostics: AW2E 24.3% native top-left, Les Oublies 14.0% vertical crop. Still not parity gating. |
| TODO | P1 | Improve raw fallback coverage for sheets such as custom Magica. | Current custom-magica coverage is 95.7%, rawFallback 76. |
| TODO | P1 | Make layer panel useful as a Figma-like hierarchy/reparenting surface. | Tree must allow grouping/reparenting, not just viewing. |
| TODO | P1 | Define absolute positioning inside frames/groups. | Coordinates should be relative to containing block; frame must become `position: relative` when needed. |
| VERIFY | P1 | Add shared DOM layer role classification for edit UX. | `lib/editor/layerRoles.ts` now gives frame/flow/table/control/action/text/media/runtime roles used by the layer panel and gallery drop detection. Needs canvas hover/drop affordance CSS next. |
| TODO | P1 | Expand Roll20 worker simulator and chat rolltemplate rendering. | `on`, `getAttrs`, `setAttrs`, `getSectionIDs` first; then roll execution. |
| TODO | P1 | Add explicit modern/legacy Roll20 preview/export mode checks. | Existing export toggle exists; preview-level proof still needed. |
| VERIFY | P1 | Separate auto-prefix preview sanitize from real legacy Roll20 CSS sanitize in fixture reports. | `scripts/render_visual_fixture_doc.mjs` now reports `Auto-prefix` and `Legacy CSS sanitize` separately; actual legacy CSS sanitizer preview mode remains TODO. |
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

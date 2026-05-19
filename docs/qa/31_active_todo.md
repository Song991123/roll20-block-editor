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

## Critical Product Tasks

| Status | Priority | Task | Notes |
| --- | ---: | --- | --- |
| VERIFY | P0 | Make edit canvas and preview render from the same emitted HTML/CSS path, with edit overlays only. | First patch: `buildSheetDoc`/`buildSheetParts` now always include Roll20 baseline/runtime/layer CSS so iframe/shadow/edit use the same sheet render CSS stack. `lint`, `build`, and localhost load passed; still needs imported-sheet visual parity check. |
| TODO | P0 | Hide `script`, `script[type="text/worker"]`, and `rolltemplate` from sheet canvas in every render mode. | They belong to worker/chat layers, not visible sheet HTML. |
| TODO | P0 | Preserve worker JS as a separate future block-coding workspace. | Current reports include worker matched/raw counts. |
| TODO | P0 | Implement real browser L2 roundtrip: import -> emit -> import -> compare. | Current `reports/roundtrip-node/summary.md` is Node import determinism only. |
| TODO | P0 | Add visual/cascade leak verification for Roll20 preview. | Need computed CSS origin and screenshot diff. |
| TODO | P1 | Improve raw fallback coverage for sheets such as custom Magica. | Current custom-magica coverage is 95.7%, rawFallback 76. |
| TODO | P1 | Make layer panel useful as a Figma-like hierarchy/reparenting surface. | Tree must allow grouping/reparenting, not just viewing. |
| TODO | P1 | Define absolute positioning inside frames/groups. | Coordinates should be relative to containing block; frame must become `position: relative` when needed. |
| TODO | P1 | Expand Roll20 worker simulator and chat rolltemplate rendering. | `on`, `getAttrs`, `setAttrs`, `getSectionIDs` first; then roll execution. |
| TODO | P1 | Add explicit modern/legacy Roll20 preview/export mode checks. | Existing export toggle exists; preview-level proof still needed. |

## Verified So Far

| Status | Scope | Evidence |
| --- | --- | --- |
| DONE | Full corpus static inventory | `reports/corpus-static-audit/corpus-static-audit.md`; 1434 sheets, 18676 files. |
| DONE | Selected Node import determinism | `reports/roundtrip-node/summary.md`; 7 selected fixtures PASS at Node-side import determinism level. |
| DONE | Malformed `<` parser hang fix | `custom-magica` dropped from >300000 ms timeout to 61 ms in `reports/roundtrip-node/summary.md`. |
| DONE | CI/CD deploy for latest commit | GitHub Actions run for `1620b61` completed successfully and GitHub Pages returned 200. |
| DONE | Claude CLI setup | Installed `@anthropic-ai/claude-code`; executable path `C:\Users\acorn\AppData\Roaming\npm\claude.cmd`; verified version `2.1.144`. |
| DONE | Local smoke after render CSS patch | `corepack pnpm run lint`, `corepack pnpm run build`, and `http://127.0.0.1:3000/` browser load with no console errors. |

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

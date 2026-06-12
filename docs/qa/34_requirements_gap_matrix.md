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
| VERIFY | P0 | Shared preview/edit render path. | `buildSheetDoc` and `buildSheetParts` share baseline/runtime/layer CSS; edit uses Shadow DOM mount. | Import real sheets and compare preview/edit screenshots. |
| TODO | P0 | Computed CSS cascade leak report. | Not yet implemented. | Add script/browser diagnostic for selected fixture elements and CSS origins. |
| TODO | P0 | Actual Roll20 visual comparison. | Roll20 authenticated/manual comparison not recorded in current report. | Compare real Roll20 editor/sandbox with service render for selected sheets. |
| DOING | P0 | Reference-image pixel diff pipeline. | Inventory/render/diff reports exist; viewport/crop/default state are not normalized. | Normalize viewport/state/crop and expand fixture set. |
| TODO | P1 | Legacy mode verification. | Auto-prefix and legacy CSS sanitize are separated in reports; true legacy sanitizer not implemented. | Add explicit preview/export legacy mode checks. |

## Import/Export and Runtime

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| TODO | P0 | L2 browser roundtrip. | Node roundtrip exists; browser import/edit/export/import compare does not. | Build browser-driven roundtrip script. |
| TODO | P0 | Worker JS separate workspace. | Worker matched/raw counts exist in reports; worker block workspace not split. | Design worker workspace and preserve source mapping. |
| TODO | P1 | Rolltemplate/chat rendering. | Chat tab exists; rolltemplate parity not proven. | Expand rolltemplate execution/render checks. |

## Edit Mode UX

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| VERIFY | P0 | Edit mode is real preview plus overlays. | Edit canvas uses `buildSheetParts` and Shadow DOM. | Compare imported sheet edit vs preview screenshots. |
| VERIFY | P1 | Flow-aware gallery drop. | Gallery drop can nest into frame/flow/table and strip absolute positioning. | Add stable real drag/drop browser smoke. |
| VERIFY | P1 | Droppable container affordances. | `data-r20-layer-role`, `data-r20-can-drop`, candidate and target highlights exist. | Verify with real drag/drop and screenshot. |
| TODO | P1 | Before/after/inside drop zones. | Current layer move tries nest first then fallback before; zones are not explicit. | Implement explicit layer panel zones and canvas insertion indicators. |
| TODO | P1 | Absolute positioning inside frames/groups. | Drag commit supports containing block measurement and relative parent fallback. | Add explicit UX mode and tests for absolute-inside-frame. |

## Branching and Deployment

| Status | Priority | Requirement | Current Evidence | Next Action |
| --- | ---: | --- | --- | --- |
| DONE | P0 | Verify latest production deploy. | Pages 200; latest Actions run for `37c1090` succeeded. | Record each future deploy after push. |
| VERIFY | P0 | Create `dev` branch and CI. | CI workflow added in this batch. | Push `dev` and confirm CI run. |
| TODO | P1 | Separate public test page. | GitHub Pages is currently production only. | Choose Vercel/Netlify, second Pages repo, or same-site `/dev/`. |

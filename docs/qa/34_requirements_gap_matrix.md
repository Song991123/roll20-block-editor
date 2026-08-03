# Requirements Gap Matrix

Date: 2026-08-03

| Status | Priority | Requirement | Current Evidence | Next Proof |
| --- | --- | --- | --- | --- |
| DONE LOCAL | P0 | Preview and Edit use the same rendered sheet. | One persistent Roll20 iframe owns both modes; edit controls are parent overlays. | Keep this invariant in every browser smoke. |
| DONE LOCAL | P0 | Structural layer selection remains stable. | Layer and friendly-widget selection markers are isolated; repeated full edit-flow smoke passes. | Add keyboard and undo/redo coverage. |
| PARTIAL | P0 | Figma-like direct manipulation. | Flow/free placement, before/inside/after, grouping, container roles, multi-move, long-list navigation, and nested 2D individual translate/rotate/scale plus transform-list stacks work locally. Same-parent first free placement uses a guarded node-attribute patch, keeps runtime class/style state, and falls back on any unrelated HTML change in modern and legacy browser smoke. Fresh 9,000-item measurement passes every current edit-ready, optimistic-paint, scheduling, planning, transfer, final-ACK, iframe-apply, drift, and error budget. | Review dense imported trees as a user workflow; cover longer/dynamic or animated transform stacks, 3D/perspective, and longer mixed histories. |
| PARTIAL | P0 | Universal HTML mapping. | Common semantic, form, table, list, conditional, repeating, Rolltemplate, raw fallback, and inert stored-JS paths have synthetic tests; grouped radios, multi-select, readonly, disabled, nested option groups, safe user `data-*` attributes, native range/date/color controls, and other safe HTML void tags preserve leaf semantics. | Expand remaining uncommon and malformed structure coverage without source-specific branches. |
| PARTIAL | P0 | Universal CSS mapping. | Common declarations, complex selector fallback, managed CSS, custom properties, nested conditional at-rules, `@font-face`, paused animation, local-only data assets, malformed fallback, and separate compatibility transforms have tests. Declaration values preserve semicolons inside strings/functions. | Verify user-owned hosted assets and broaden unsupported syntax coverage. |
| PARTIAL | P0 | Translation and default state. | Translation, grouped radio/default selection, multi-select state, visible/hidden conditional areas, and Preview/Edit parity pass locally; the current anonymous payloads also have modern and legacy destination evidence. | Broaden default-state and translation coverage without treating the current synthetic suite as all-sheet proof. |
| PARTIAL | P0 | Sheet Worker support. | A separate Worker workspace and useful parser/runtime subset exist. Canonical multi-event listeners, callback event variables, previous/new values, player/worker sources, and `setAttrs` silent/completion behavior pass local browser proof. Valid unique repeating templates cover full, section-field, section-wide, and plain-field aliases, row-context shorthand, reorder/`_reporder`, and Worker/player removal data. Invalid duplicate or underscored section names stay losslessly editable, surface an import error, and block export. Unsupported statements remain lossless raw code with source-derived diagnostics. Cold-load import waits for all model workspaces instead of reporting analysis without applying blocks. | Add broader APIs and actual valid Roll20 execution proof; arbitrary non-byte-stable formatting and unsupported statements still remain raw. |
| PARTIAL | P0 | Roll buttons and result cards. | Local roll execution, chat history, template editing, and managed result-card CSS work synthetically. | Verify actual Roll20 chat markup and behavior in modern and legacy destinations. |
| PARTIAL | P0 | Asset preservation. | URLs remain authored unless the user explicitly replaces them; unsafe/local targets are diagnosed. | Verify user-owned assets through actual Roll20 upload and loading. |
| DONE ACTUAL SYNTHETIC | P0 | Modern and legacy contracts remain separate. | Preview/edit/export switch compatibility mode together; modern preparation and legacy sanitizing are distinct code paths, with separate owner-only destination evidence for the current anonymous suite. | Keep both modes in every new actual verification; one mode never proves the other. |
| DONE ACTUAL SYNTHETIC | P0 | Modern actual-screen proof. | A dedicated owner-only modern test room persisted and rendered the current anonymous generated payloads. Supported automated Custom Sheet Sandbox file selection remains blocked, but it is no longer the only allowed modern evidence destination. | Expand to broader anonymous structures and user-owned assets through a supported visible upload. |
| DONE ACTUAL SYNTHETIC | P0 | Legacy actual-screen proof. | A dedicated owner-only legacy-enabled test room rendered the current anonymous generated payloads with legacy sanitization selected. | Expand to broader anonymous structures; never use modern Sandbox evidence for legacy. |
| DONE CURRENT TREE | P0 | Copyright and private evidence safety. | Generated evidence roots are ignored, tracked real samples are forbidden, and deterministic CI/pre-commit document privacy guards pass. | Decide clean-history publication separately; current-tree proof does not purge Git history. |
| DONE LOCAL | P1 | CI/CD quality gate. | Unit/safety verification, lint, and production build run on pushed branches. | Keep checking the exact pushed commit and Pages only after production merges. |
| PARTIAL | P1 | Plain Korean and pastel product UI. | Major editor controls use visual choices; compact desktop plus 390x844 and 768x900 browser checks cover full-width edit rendering, contained side drawers, and an overlay layer tree. | Remove remaining broken/technical copy; review landscape, touch drag, and dense imports. |

## Claim Boundary

- `DONE LOCAL` means the named local implementation and test passed.
- `DONE ACTUAL SYNTHETIC` means the named anonymous generated payload passed in
  the correct Roll20 destination; it does not prove every sheet.
- `PARTIAL` means useful behavior exists but the full requirement is not proven.
- `VERIFY EXTERNAL` requires fresh evidence from the correct Roll20 destination.
- `BLOCKED EXTERNAL` names a real external boundary and is not completion.

No row in this matrix proves all-sheet support or complete Roll20 visual parity.

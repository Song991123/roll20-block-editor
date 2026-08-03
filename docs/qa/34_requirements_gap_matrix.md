# Requirements Gap Matrix

Date: 2026-08-03

| Status | Priority | Requirement | Current Evidence | Next Proof |
| --- | --- | --- | --- | --- |
| DONE LOCAL | P0 | Preview and Edit use the same rendered sheet. | One persistent Roll20 iframe owns both modes; edit controls are parent overlays. | Keep this invariant in every browser smoke. |
| DONE LOCAL | P0 | Structural layer selection remains stable. | Layer and friendly-widget selection markers are isolated; repeated full edit-flow smoke passes. | Add keyboard and undo/redo coverage. |
| PARTIAL | P0 | Figma-like direct manipulation. | Flow/free placement, before/inside/after, grouping, container roles, multi-move, and long-list navigation work locally. | Review nested absolute placement, resizing, alignment, and dense imported trees. |
| PARTIAL | P0 | Universal HTML mapping. | Common semantic, form, table, list, conditional, repeating, Rolltemplate, raw fallback, and inert Page JS paths have synthetic tests; grouped radios, multi-select, readonly, disabled, nested option groups, safe user `data-*` attributes, native range/date/color controls, and other safe HTML void tags preserve leaf semantics. | Expand remaining uncommon and malformed structure coverage without source-specific branches. |
| PARTIAL | P0 | Universal CSS mapping. | Common declarations, complex selector fallback, managed CSS, custom properties, nested conditional at-rules, `@font-face`, paused animation, local-only data assets, malformed fallback, and separate compatibility transforms have tests. Declaration values preserve semicolons inside strings/functions. | Verify user-owned hosted assets and broaden unsupported syntax coverage. |
| PARTIAL | P0 | Translation and default state. | Translation, grouped radio/default selection, multi-select state, visible/hidden conditional areas, and Preview/Edit parity pass in the current anonymous browser fixtures. | Verify the same current generated payload in both Roll20 destinations. |
| PARTIAL | P0 | Sheet Worker support. | A useful inert parser/runtime subset exists and ordinary scripts stay hidden. | Create a dedicated JavaScript workspace and explicit fallback for unsupported syntax. |
| PARTIAL | P0 | Roll buttons and result cards. | Local roll execution, chat history, template editing, and managed result-card CSS work synthetically. | Verify actual Roll20 chat markup and behavior in modern and legacy destinations. |
| PARTIAL | P0 | Asset preservation. | URLs remain authored unless the user explicitly replaces them; unsafe/local targets are diagnosed. | Verify user-owned assets through actual Roll20 upload and loading. |
| DONE LOCAL | P0 | Modern and legacy contracts remain separate. | Preview/edit/export switch compatibility mode together; modern preparation and legacy sanitizing are distinct code paths. | Obtain actual evidence for each destination independently. |
| BLOCKED EXTERNAL | P0 | Modern actual-screen proof. | Supported browser automation reaches the visible chooser but lacks permission to attach the generated file. | Use a user-visible supported selection; do not bypass the boundary. |
| VERIFY EXTERNAL | P0 | Legacy actual-screen proof. | Legacy requires a new dedicated legacy-enabled test room; modern Sandbox cannot prove it. | Create or use only that dedicated destination after participant preflight. |
| IN PROGRESS | P0 | Copyright and private evidence safety. | Generated evidence roots are ignored and tracked real samples are forbidden. Current operating docs are being compacted. | Add a deterministic documentation privacy guard and decide clean-history publication. |
| DONE LOCAL | P1 | CI/CD quality gate. | Unit/safety verification, lint, and production build run on pushed branches. | Keep checking the exact pushed commit and Pages only after production merges. |
| PARTIAL | P1 | Plain Korean and pastel product UI. | Major editor controls use visual choices and the redesign branch is active. | Remove remaining broken/technical copy and perform screenshot-based UX review. |

## Claim Boundary

- `DONE LOCAL` means the named local implementation and test passed.
- `PARTIAL` means useful behavior exists but the full requirement is not proven.
- `VERIFY EXTERNAL` requires fresh evidence from the correct Roll20 destination.
- `BLOCKED EXTERNAL` names a real external boundary and is not completion.

No row in this matrix proves all-sheet support or complete Roll20 visual parity.

# Product Reset And Short-Term Goals

Date: 2026-08-03
Status: ACTIVE

## Objective

Build a general Roll20 custom-sheet editor where users import or author HTML,
CSS, translation data, and later Sheet Worker JavaScript. Preview and Edit use
the same rendered sheet document. Visual editing adds overlays and
structure-aware operations without redrawing or flattening the authored sheet.

The product supports modern and legacy Roll20 as separate contracts. It ships
no copied sheet, screenshot, or source-derived example. The application shell
uses an original light pastel visual system and plain Korean task language.

## Product Invariants

- App CSS never enters the sheet iframe.
- Preview and Edit share wrapper, baseline, runtime mode, translation state,
  assets, intrinsic size, and authored CSS.
- Edit-only selection, drop, resize, and alignment UI stays outside exported
  HTML and CSS.
- Flow, flex, grid, list, table, conditional, and repeating structures preserve
  valid parent-child relationships.
- Absolute placement is explicit and relative to the intended containing
  frame.
- Modern output and legacy sanitization switch as one destination choice across
  Preview, Edit, export, and verification.
- Ordinary scripts remain inert and invisible. Sheet Worker support uses a
  separate controlled source and runtime boundary.
- Public content contains only product-authored assets and synthetic tests.

## Current State

- `DONE LOCAL`: Preview and Edit use one persistent iframe, with editor-owned
  overlays and separate structural/widget selection channels.
- `DONE LOCAL`: structure-aware before, inside, and after movement; explicit
  free placement; grouping; table/list guards; and long-layer navigation have
  synthetic browser coverage.
- `PARTIAL`: generic HTML, CSS, translation, Rolltemplate, and supported worker
  mapping exists. Broader unsupported-source preservation remains open.
- `PARTIAL`: the pastel application shell and task-oriented controls exist, but
  dense editing, first-run guidance, resize/alignment, and remaining technical
  copy need review.
- `VERIFY EXTERNAL`: actual modern Sandbox and dedicated legacy-room parity
  require fresh generated-payload evidence. Local tests cannot satisfy either
  destination.

## Execution Order

1. Keep tracked docs and product assets free of private/source-derived evidence.
2. Prove Preview/Edit unity with anonymous synthetic browser tests.
3. Close generic import/export losses with synthetic regression cases.
4. Improve direct manipulation, parent-aware placement, resize, alignment,
   keyboard selection, and undo/redo without forking the render surface.
5. Validate a generated payload in modern Sandbox.
6. Validate the same contract separately in a new legacy-enabled test room.
7. Finish user-language and pastel-shell review across desktop and compact
   viewports.

## Evidence Gates

- Focused contract tests for every changed behavior.
- Full `ci:verify`, lint, production build, and relevant browser smoke.
- No console or page errors in browser evidence.
- Project server hygiene after every browser run.
- GitHub Actions success for the exact pushed commit.
- Actual Roll20 parity remains open until both destination-specific runs use a
  current generated payload and comparable state, assets, and crop.

## Ownership

- One integration owner merges and pushes shared branches.
- Parallel agents use separate worktrees or produce read-only reports.
- Design work may change application chrome and interaction styling, but not
  the Roll20 renderer contract or private evidence roots.
- Renderer, mapping, and edit-model changes include their own focused tests.

Current task status lives in `docs/qa/31_active_todo.md`. Compact implementation
handoff lives in `docs/operations/35_agent_progress_log.md`.

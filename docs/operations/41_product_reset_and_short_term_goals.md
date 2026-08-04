# Product Reset And Short-Term Goals

Date: 2026-08-03
Status: ACTIVE

## Objective

The long-term product is a visual Roll20 sheet studio where a user can import
or author HTML, CSS, translation data, and Sheet Worker JavaScript without
being forced into source code. The import-first Alpha proves the foundation:
import, actual-like Preview, lossless block mapping, diagnostics, and modern or
legacy export.

Figma-like visual editing remains in the codebase but is not an Alpha
completion gate. It will be exposed only as an experimental feature until the
render and mapping foundation passes the measured corpus harness. The product
ships no copied sheet, screenshot, or source-derived example.

## Fixed Product Priority

1. Preview must reproduce the imported sheet in the correct modern or legacy
   Roll20 contract, with comparable state, assets, translation, Worker output,
   and result cards.
2. HTML, CSS, translation, Rolltemplate, and supported Worker source must map
   to blocks and layers generically and preserve unsupported source losslessly.
3. Alpha diagnostics and export must explain preservation, warnings, and
   blocking failures without claiming unsupported parity.
4. Figma-like editing resumes for Beta on that same rendered document. It must
   not maintain a second visual model or hide mapping/render gaps.
5. Product chrome, branding, and onboarding improve usability but do not count
   as completion of the renderer or mapping gates.

## Alpha Progress Model

Date: 2026-08-04

| Alpha gate | Weight |
| --- | ---: |
| Corpus lossless roundtrip | 35 |
| Modern and legacy local Preview | 25 |
| Actual Roll20 representative verification | 20 |
| Export and diagnostics | 10 |
| Alpha UX, CI, and privacy | 10 |

No numeric Alpha progress is reported until the corpus harness emits its first
complete baseline. A discovered case without a result row is unfinished. Local
synthetic success cannot raise an actual Roll20 gate to complete.

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
- `DEFERRED BETA`: the shared-render visual editing foundation remains covered
  by local regression tests but receives no new Figma-like feature work during
  the import-first Alpha.
- `PARTIAL`: the pastel application shell and task-oriented controls exist, but
  the import-first flow, experimental-feature boundary, and remaining technical
  copy need review.
- `VERIFY EXTERNAL`: actual modern Sandbox and dedicated legacy-room parity
  require fresh generated-payload evidence. Local tests cannot satisfy either
  destination.

## Execution Order

1. Keep tracked docs and product assets free of private/source-derived evidence
   throughout every gate.
2. Close Preview differences against the correct actual modern and legacy
   Roll20 destinations with anonymous generated payloads.
3. Expand generic import, block/layer mapping, source preservation, Worker,
   state, asset, and result-card coverage without source-specific branches.
4. Repeat actual modern and legacy checks for every newly supported contract.
5. Make import, Preview, diagnostics, compatibility selection, and export the
   default Alpha flow. Keep the visual editor behind an experimental toggle.
6. Resume direct manipulation for Beta only after the Alpha gates are stable.

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

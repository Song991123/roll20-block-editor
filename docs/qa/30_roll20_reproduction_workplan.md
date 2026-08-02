# Roll20 Reproduction Workplan

Date: 2026-08-03

## Goal

Imported or user-authored HTML, CSS, translation data, and future JavaScript
must remain editable and render consistently across the product's Preview,
Edit, export, modern Roll20, and legacy Roll20 contracts.

## Safety Boundary

- Never modify external sheet sources.
- External validation inputs are ephemeral and read-only.
- Do not retain their identity, URL, source, media, screenshots, local path,
  hash, or source-derived measurements in tracked files or permanent reports.
- Commit only anonymous synthetic tests that reproduce a generic defect.
- Existing Roll20 rooms are observation-only. Generated writes use only Custom
  Sheet Sandbox or a new dedicated test room.

## Phase 1 - Mapping Contract

1. Parse each supported HTML/CSS/translation construct into an editable block.
2. Preserve unsupported constructs through an explicit raw fallback.
3. Keep stable internal IDs for Edit/Preview synchronization.
4. Strip internal IDs only at the final Roll20 export boundary.
5. Verify emit -> re-import stability with anonymous synthetic fixtures.

Acceptance:

- No source node silently disappears.
- Loss or fallback is explicit and testable.
- Modern and legacy output remain separate.

## Phase 2 - Runtime Contract

1. Keep ordinary page scripts inert and invisible.
2. Parse the supported Sheet Worker subset into a dedicated workspace.
3. Preserve unsupported worker source without executing it.
4. Model default attributes, conditional visibility, repeating sections,
   translation lookup, Roll buttons, and result-card invocation.

Acceptance:

- Initial state is deterministic in local Preview/Edit.
- Worker and Roll behavior has focused synthetic tests.
- Unsupported JavaScript is never presented as fully supported.

## Phase 3 - Shared Render Surface

1. Use one persistent Roll20 wrapper and iframe for Preview and Edit.
2. Apply Roll20 baseline, authored CSS, translation, compatibility mode, and
   runtime state through one render contract.
3. Keep editor overlays and app UI outside the sheet stylesheet.
4. Preserve intrinsic width and height; zoom scales the whole sheet surface.

Acceptance:

- Switching Preview/Edit does not remount or redraw a second sheet.
- Computed structure and styles stay aligned after edits.
- No application CSS leaks into the sheet document.

## Phase 4 - Direct Manipulation

1. Classify frame, flow, table, control, action, text, media, and runtime layers.
2. Show valid before/inside/after targets.
3. Keep flow children in document order and free children relative to an
   explicit containing frame.
4. Support selection, grouping, movement, resize/alignment, keyboard actions,
   undo/redo, and long-list navigation without breaking DOM validity.

Acceptance:

- Model, Edit, Preview, emitted HTML/CSS, and re-import agree after every
  structural operation.
- Drag feedback is immediate; source updates occur without visible rollback.

## Phase 5 - Actual Roll20 Verification

1. Generate a copyright-safe anonymous payload through the normal export path.
2. Verify modern mode in Custom Sheet Sandbox.
3. Verify legacy mode in a new dedicated legacy-enabled test room.
4. Compare initial state, translation, worker, Roll/result card, assets,
   intrinsic geometry, and screenshots under the same payload.
5. Classify differences before changing renderer CSS.

Acceptance:

- Both destinations have fresh same-payload evidence.
- Evidence remains ignored and local.
- Public status records only pass/partial/blocked and generic findings.

## Phase 6 - Release

1. Run focused tests, full verification, lint, build, browser smoke, privacy
   guard, server hygiene, and GitHub CI.
2. Verify GitHub Pages only after a production merge.
3. Publish no real sheet samples or private evidence.
4. Resolve Git-history privacy before claiming a clean public release.

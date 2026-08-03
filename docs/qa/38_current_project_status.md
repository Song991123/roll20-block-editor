# Current Project Status

Date: 2026-08-03

## Product

This project is a visual Roll20 custom-sheet editor. Users import or author
HTML, CSS, translation data, and Sheet Worker source; the product maps those
sources to blocks and layers, renders them in a Roll20-like environment, and
exports a Roll20 upload package. Unsupported ordinary JavaScript is retained as
inert source but cannot be presented as Roll20 behavior.

## Implemented Locally

- Persistent Roll20 iframe shared by Preview and Edit.
- Separate modern and legacy compatibility modes.
- HTML/CSS/translation import and block emission with explicit fallback paths.
- Layer tree with container roles, grouping, before/inside/after movement,
  flow placement, explicit free placement, multi-selection, multi-move, and
  local 2D affine coordinate conversion for transformed containing frames.
- Managed visual CSS for common sections, controls, text, images, tables, Roll
  buttons, and result cards.
- Local Sheet Worker subset, default-attribute behavior, Roll execution, chat
  history, and result-card rendering.
- Separate inert ordinary-JS source workspace and a final Roll20 output filter
  with a non-executable ZIP backup.
- Local autosave and Roll20-oriented export.
- Synthetic browser, import/export, sanitizer, privacy, lint, and build gates.

## Verified Boundaries

- Edit is the same rendered sheet as Preview plus edit-only overlays.
- Layer/widget selection channels are isolated and repeated browser runs pass.
- Internal editor IDs are removed at the export boundary.
- Ordinary page JavaScript stays inert and invisible in the sheet surface.
- Final Roll20 HTML excludes non-Worker scripts while preserving exact source
  tags in a ZIP text backup.
- Dedicated owner-only modern and legacy destinations verify the current
  anonymous synthetic payload suite. This is not broad-sheet parity.
- The corrected legacy matrix now follows the exact export preparation boundary,
  has 8/8 authoritative actual captures and diffs, and verifies valid repeating
  Worker interactions plus deterministic result-card structure.
- Public product assets contain no bundled real sheet sample.

These are scoped local and actual-synthetic results. They do not prove
arbitrary-sheet or broad Roll20 parity.

## Not Finished

- Supported automated modern Custom Sheet Sandbox upload remains blocked at
  the visible file chooser, though dedicated-room modern evidence exists.
- Broader modern and legacy actual-screen coverage beyond the current anonymous
  synthetic suite.
- Broad uncommon-structure import/edit coverage.
- Broader structured Sheet Worker blocks and unsupported-syntax diagnostics.
- Dense imported-tree usability, longer or dynamic transform stacks,
  individual CSS transform properties, 3D/perspective cases, and mixed-operation
  history review.
- Final user-facing Korean copy and full responsive shell review.
- Historical Git privacy decision after current-tree cleanup.

## Safety

- Existing Roll20 rooms are observation-only and require a fresh visible
  participant count of exactly one.
- Generated writes are allowed only in Custom Sheet Sandbox or a newly created
  dedicated test room.
- External sheet inputs and all resulting evidence remain ephemeral and
  ignored. Tracked documents keep only generic product findings.

## Next Order

1. Broaden modern and legacy anonymous actual-screen coverage without using
   existing user rooms.
2. Obtain supported modern Sandbox file-selection evidence when the visible
   permission boundary allows it.
3. Expand Worker block coverage and uncommon HTML/CSS mapping.
4. Build broad full-root candidate comparisons before changing global renderer
   CSS; the current gate intentionally holds that patch.
5. Continue direct-manipulation UX using synthetic regression coverage.

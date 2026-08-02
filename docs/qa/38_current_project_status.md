# Current Project Status

Date: 2026-08-03

## Product

This project is a visual Roll20 custom-sheet editor. Users import or author
HTML, CSS, translation data, and eventually JavaScript; the product maps those
sources to blocks and layers, renders them in a Roll20-like environment, and
exports a Roll20 upload package.

## Implemented Locally

- Persistent Roll20 iframe shared by Preview and Edit.
- Separate modern and legacy compatibility modes.
- HTML/CSS/translation import and block emission with explicit fallback paths.
- Layer tree with container roles, grouping, before/inside/after movement,
  flow placement, explicit free placement, multi-selection, and multi-move.
- Managed visual CSS for common sections, controls, text, images, tables, Roll
  buttons, and result cards.
- Local Sheet Worker subset, default-attribute behavior, Roll execution, chat
  history, and result-card rendering.
- Local autosave and Roll20-oriented export.
- Synthetic browser, import/export, sanitizer, privacy, lint, and build gates.

## Verified Boundaries

- Edit is the same rendered sheet as Preview plus edit-only overlays.
- Layer/widget selection channels are isolated and repeated browser runs pass.
- Internal editor IDs are removed at the export boundary.
- Ordinary page JavaScript stays inert and invisible in the sheet surface.
- Public product assets contain no bundled real sheet sample.

These are local and synthetic results. They do not prove arbitrary-sheet or
actual Roll20 parity.

## Not Finished

- Modern Custom Sheet Sandbox upload and same-payload actual-screen proof.
- Separate legacy-enabled test-room proof.
- Broad uncommon-structure import/edit coverage.
- Complete Sheet Worker/JavaScript block workspace.
- Final direct-manipulation UX: resizing, alignment, keyboard workflows,
  nested absolute placement, and undo/redo review.
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

1. Finish current-tree privacy cleanup and its deterministic guard.
2. Obtain supported modern Sandbox upload evidence.
3. Run the separate legacy test-room check.
4. Classify actual differences before changing global renderer CSS.
5. Continue direct-manipulation UX using synthetic regression coverage.

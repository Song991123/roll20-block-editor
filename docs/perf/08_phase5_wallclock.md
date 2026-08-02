# Editor Wall-Clock Policy

Date: 2026-08-03

## User-Visible Budget

- Drag feedback updates visually during the pointer move without emitting the
  full source on every frame.
- Pointer-up keeps the object at the dropped position while the authoritative
  model and managed CSS commit.
- CSS-only changes avoid replacing the sheet root.
- Structural changes use keyed or validated optimistic updates where safe.
- Large layer lists remain virtualized and navigable.

## Measurement

- Measure pointer frame time, drop-to-visible time, source commit time, render
  apply time, root replacement count, and browser errors in ignored reports.
- Use anonymous synthetic stress inputs for committed regression tests.
- Do not retain private input identity or source-derived measurements in tracked
  performance documents.
- Optimization must preserve render truth, DOM structure, modern/legacy
  separation, and undoability.

## Gate

No optimization is complete from code inspection alone. Run the relevant
browser smoke against a production build, inspect timing hooks, finish the full
interaction sequence, and confirm all temporary servers exit.

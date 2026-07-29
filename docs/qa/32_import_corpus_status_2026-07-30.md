# Anonymous Import Corpus Status

## Current Evidence

- An ignored five-fixture corpus covers representative custom, modern, small
  legacy, and large legacy inputs.
- Fixture manifests redact source paths by default. Generated sheets,
  screenshots, and reports remain ignored local evidence and are not public
  product content.
- Anonymous custom inputs and the modern input passed the imported
  edit/preview synchronization smoke.
- The small legacy input passed direct movement and apply with equal
  edit/preview coordinates.

## Open Findings

- FIXED LOCAL: A malformed opening fragment already present in the small legacy
  input (`<td<span ...>`) was being mistaken for a valid `td` prefix when the
  editor injected `data-r20-block-id`. The emitter now requires a complete
  opening-tag boundary and leaves malformed raw content behind a valid outer
  selection wrapper.
- VERIFIED LOCAL: After rebuilding, the small legacy browser roundtrip passed;
  imported edit/preview synchronization and resource checks also passed.
- The large legacy input reached 100% structural match but took approximately
  33 seconds and did not complete the edit acknowledgement smoke. Large-sheet
  interaction performance remains open.
- Roll20 evidence remains `0/6` generated and `0/3` room observation. The
  isolated Sandbox chooser rejected local file assignment; no payload was sent
  and no room was changed.

## Cleanup Boundary

- A second user-authorized deletion attempt was rejected by the host before
  execution because recursive forced deletion is disallowed.
- No alternate shell or deletion bypass was used. The explicitly listed
  generated targets remain pending a supported cleanup mechanism.

## Next P0

Keep the malformed-tag regression test in the emit contract and continue the
large-sheet performance investigation. Actual Roll20 upload evidence remains
separate from local renderer results.

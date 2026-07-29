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

- The small legacy browser roundtrip still reports HTML drift caused by invalid
  opening fragments already present in the input (`<td<span ...>`). The first
  import preserves them as raw HTML; the second browser parse normalizes the
  surrounding structure. This requires an explicit malformed-input policy and
  a focused regression test before completion.
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

Decide whether malformed input should be rejected with a clear import warning
or preserved as an opaque source island, then add a regression test. Keep
actual Roll20 upload evidence separate from local renderer results.

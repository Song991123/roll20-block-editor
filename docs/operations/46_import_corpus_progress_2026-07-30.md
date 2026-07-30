# Import Corpus Progress

## 2026-07-30

- Prepared five ignored, source-redacted fixtures covering two custom inputs,
  one modern input with translation data, and two legacy-size inputs.
- Verified custom and modern imported edit/preview synchronization.
- Verified direct movement and apply for the small legacy input, with matching
  edit/preview coordinates.
- Fixed the partial-tag block-id injection bug for malformed `<td<span ...>`
  fragments and added an emit-contract regression test.
- Reverified the small legacy browser roundtrip and imported edit/preview
  synchronization after rebuild; both passed.
- Kept the large legacy performance gate open: structural match reached 100%,
  import took about 33 seconds, and edit acknowledgement timed out.
- Kept actual Roll20 evidence open at `0/6` generated and `0/3` observation;
  the Sandbox chooser rejected local file assignment.
- Recorded the cleanup retry as host-policy blocked. No deletion bypass was
  used and no protected source folder was touched.
- Rejected two browser-render optimization experiments after live testing:
  the public `rendered` flag caused a headless-workspace error, while SVG hook
  suppression did not finish the large smoke within three minutes. Both code
  experiments were fully reverted; the large import remains an open P0.
- A hidden-preview follow-up using the same hook suppression also exceeded
  approximately `70s` before completion and was reverted. The next design
  must separate the model workspace from the SVG workspace rather than patch
  Blockly's rendered hooks.
- Implemented the separate workspace boundary: preview/edit register
  `Blockly.Workspace` model instances, while assemble/split register rendered
  `WorkspaceSvg` instances and restore the same XML when the mode changes.
- Measured a large anonymous legacy fixture through the real browser hook after
  switching to preview: `inject 789.6ms`, hook total `1.54s`, browser wall time
  about `2.0s`, `36,436` blocks, and `100%` structural match.
- Measured a small mode roundtrip with `919` total blocks: preview(headless) ->
  assemble(SVG) -> preview(headless) preserved every workspace count; four SVG
  hosts were present in assemble and application console errors were `0`.
- Verification gate: lint, build, `ci:verify`, and anonymous custom fixture
  imported edit/preview synchronization passed after the change.
- Added `test:blockly-headless` to the CI verification list to protect the
  common adapter contract from accidentally requiring SVG methods again.
- Boundary: the large fixture's SVG assemble entry remains unmeasured and
  actual Roll20 modern/Sandbox and legacy-room evidence remains separate.
- Rechecked the available Roll20 tab; it is currently at the login page, so
  actual Sandbox and room evidence remain blocked at `0/6` and `0/3`. No room
  or external sheet state was changed.
- Added a `5,000`-block SVG render guard. Large imports now switch the UI and
  diagnostic hook to preview before hydration, and visible assemble/split
  keeps the model headless.
- Added a virtualized large-workspace structure browser and authored-value
  previews. It preserves the model/Inspector path without creating thousands
  of SVG nodes.
- Verified `smoke:large-workspace-browser` with a synthetic 5,200-input import:
  `headless-large`, 5,200 blocks, 17 visible rows, 0 SVG blocks, search and
  selection pass, and 0 console/page errors. Lint and build pass.
- Boundary: this is navigation/selection evidence, not full virtualized block
  drag editing or Roll20 parity. Actual modern Sandbox upload and isolated
  legacy-room evidence remain separate.

## 2026-07-30 Local interaction rerun

- Re-ran `smoke:large-workspace-browser` against the generated local build.
  The anonymous corpus produced 5,205 model blocks, 17 visible structure rows,
  20 virtual edit-layer rows, `headless-large`, one persistent iframe, zero
  SVG blocks, and zero console/page errors.
- The real layer-panel `inside` path reparented the source frame beneath the
  target frame. The layer snapshot, emitted HTML, and iframe DOM agreed on the
  resulting nesting.
- `smoke:imported-edit-sync:strict` and `smoke:edit-flow` both passed with
  their resource and interaction assertions enabled.
- This strengthens local edit/import evidence only; it does not promote the
  actual Roll20 upload, worker/chat, or universal all-sheet gates.

## 2026-07-30 Synthetic visual baseline re-established

- Recreated a disposable anonymous fixture only for local regression after the
  previous fixture purge. No third-party or user sheet material was restored.
- Modern and legacy preview/edit visual smoke both returned `EXACT` with `0%`
  mismatch, `0 ppm`, and translation `3/3`.
- Persistent preview surface smoke returned reload count `0` in both modes.
- The result is local baseline evidence; Roll20 Sandbox and legacy-room
  evidence remain unverified.

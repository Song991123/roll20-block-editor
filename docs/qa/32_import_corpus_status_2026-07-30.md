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

## 2026-07-30 Performance Experiment Boundary

- REJECTED: Setting `WorkspaceSvg.rendered=false` during XML hydration makes
  Blockly 12.5.1 treat the SVG workspace as headless and throws before the
  large fixture can be imported. No code change was retained.
- REJECTED: Temporarily suppressing `BlockSvg.initSvg`/`queueRender` and
  replaying one render pass did not finish the large browser smoke within
  three minutes. It is not counted as a performance improvement and was
  fully reverted.
- REJECTED FOLLOW-UP: Applying the same hook boundary without the final SVG
  replay while the preview mode was hidden still did not return the large
  model import within approximately `70s`. This variant was also fully
  reverted; a separate model workspace is required before claiming a hidden
  import fast path.
- CURRENT BASELINE: Pure HTML matching remains approximately `0.55s` with
  `100%` structural coverage; the large browser path still has approximately
  `36,436` HTML blocks and remains an open render/import bottleneck.
- VERIFIED LOCAL: Preview/edit now use headless Blockly model workspaces while
  assemble/split alone create SVG workspaces. On the large anonymous legacy
  fixture, preview-mode import measured `inject 789.6ms`, hook total `1.54s`,
  browser wall time about `2.0s`, `36,436` blocks, and `100%` structural match.
- VERIFIED LOCAL: A small anonymous fixture survived preview(headless) ->
  assemble(SVG) -> preview(headless) with `919` total blocks before and after,
  four SVG hosts visible during assemble, and no application console errors.
- CLAIM BOUNDARY: This removes the local SVG import bottleneck for hidden
  preview/edit mode; it does not prove large SVG assemble entry is fast or
  prove actual Roll20 visual parity.
- SAFETY: The failed experiments did not alter source fixtures or public
  assets. The generated local smoke report remains ignored evidence only.

## 2026-07-30 Roll20 Browser Recheck

- VERIFY BLOCKED: The available Roll20 browser tab currently shows the login
  page, not the isolated Sheet Sandbox. No existing room was opened, no
  participant state was inferred, and no upload/chat/settings action occurred.
- CURRENT EVIDENCE: Generated actual screenshots remain `0/6`, room
  observation screenshots remain `0/3`, and live Roll20 parity is unverified.

## 2026-07-30 Large Workspace Guard

- IMPLEMENTED: Workspaces above `5,000` blocks now stay headless even when
  assemble/split is visible. The visible surface now includes a virtualized
  structure browser instead of leaving the user with only a passive notice.
- IMPLEMENTED: The UI import dialog and diagnostic perf hook both switch to
  preview and wait for the mode transition before hydrating a large import.
- IMPLEMENTED: Structure rows use the same selected-block state as the normal
  Inspector. Authored field values are preferred over static Blockly labels so
  imported names remain searchable.
- VERIFIED STATIC: `lint`, TypeScript build, `ci:verify`, the headless adapter
  test, and the render-policy boundary test pass.
- VERIFIED BROWSER: `smoke:large-workspace-browser` passed with a synthetic
  5,200-input import: `headless-large`, 5,200 model blocks, 17 visible rows,
  zero SVG blocks, last-item search, one selected row, and zero console/page
  errors.
- CLAIM BOUNDARY: The virtualized browser proves navigation and selection, not
  full large-sheet block drag/reparenting or actual Roll20 parity.

## Next P0

Keep the malformed-tag regression test in the emit contract, add imported
large-sheet subtree movement coverage to the virtualized browser, and resume
supported Roll20 upload evidence. Actual Roll20 results remain separate from
local renderer results.

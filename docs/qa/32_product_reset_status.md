# Product Reset Status

Updated: 2026-07-19

This is the current evidence ledger for the active product-reset goal. A green
local gate is not evidence of visual equality in a live Roll20 room.

## Evidence Snapshot

| Area | Current evidence | State | Boundary |
| --- | --- | --- | --- |
| HTML/CSS/i18n structural import | 27/27 contract cases | VERIFIED LOCAL | Does not prove arbitrary sheet fidelity |
| Legacy CSS compatibility | 16/16 sanitizer cases | VERIFIED LOCAL | Does not prove a legacy Roll20 room |
| Modern Sandbox safety boundary | 7/7 contract cases | VERIFIED LOCAL | Does not prove a user upload |
| Preview/edit render surface | 6/6 local modern/legacy comparisons at 0% mismatch | VERIFIED LOCAL | Same local surface only |
| Layer and placement interaction | edit-flow smoke, layer before/inside/after, flow/free placement, cycle guard, role palette | VERIFIED LOCAL | Figma-level usability still needs visual review |
| Imported preview/edit round-trip | 4/4 anonymous fixtures: shared iframe edit sync and edited HTML/CSS/i18n re-import stable | VERIFIED LOCAL | Does not prove live Roll20 parity or arbitrary source fidelity |
| Semantic inline import coverage | 3/3 local fixture imports keep small/u/sub/sup containers and nested translation blocks editable; one fixture reaches 100% HTML/CSS match | VERIFIED LOCAL | One legacy fixture still has 2 HTML and 1 CSS residual fallback |
| Generated layout CSS | authored position block emits paired class + CSS rule | VERIFIED LOCAL | Imported source inline styles remain loss-aware |
| Live Roll20 modern Sandbox | 1 anonymous synthetic payload activated in a real sheet iframe; rolltemplate chat observed; 1.6458% root-only mismatch | VERIFIED EXTERNAL DIAGNOSTIC | Not a general parity result |
| Live Roll20 solo-room wrapper | Modern and legacy rooms observed read-only: 900px iframe, modern 850px root, legacy 860px root | VERIFIED EXTERNAL PRIVATE | Wrapper contract only; not our export parity |
| Authorized user-sheet Sandbox upload | No successful browser file handoff | VERIFY | Must be completed in the dedicated Sandbox |
| Legacy-room visual parity | No dedicated legacy-room capture | VERIFY | Sandbox is modern-only |
| UI product reset | Pastel/pink shell, light root/portal baseline, and core Korean product copy slice | PARTIAL | Full information architecture and visual UX reset remain |
| Public copyright boundary | CI evidence guard, ignored local fixtures/reports, no tracked private corpus | VERIFIED LOCAL | Recheck before every public release |
| CI/CD | GitHub Actions run `29657697204` passed for `3373d59` | VERIFIED REMOTE | Deployment smoke remains separate |

## Current Counts

- Local contract groups passed: `27/27`, `16/16`, `7/7`, and `6/6` visual
  comparisons.
- Imported edit round-trip: `4/4` anonymous local fixtures passed the canonical
  iframe sync path and stable re-import check; the largest fixture remained
  below the current import/inject budgets.
- Semantic and table coverage: generic inline, table-column, and CSS import
  matchers pass their local contracts. The affected anonymous fixture is
  `1839/1839` HTML and `103/103` CSS; the remaining legacy diagnostic is now
  `637/637` HTML and `109/109` CSS with `0` raw fallbacks. Worker JavaScript
  partials remain and arbitrary-source fidelity is not complete.
- Live Roll20 synthetic Sandbox activations: `1` with real iframe and rolltemplate chat evidence.
- Live Roll20 solo-room wrapper observations: `2` (modern and legacy, read-only).
- Live Roll20 diagnostic root captures: `1` synthetic modern root at `1.6458%`
  root-only mismatch.
- Live Roll20 user-owned sheet captures: `0`.
- Live Roll20 legacy-room captures: `0`.
- Full product UI reset slices: `3` small shell/palette, core-copy, and layer-role slices; this is not
  completion of the redesign.
- Root UI baseline: forced `html.dark` removed; the app and portals now default
  to the pastel/light token set, while explicit `.dark` remains opt-in.

## Next Order

1. Keep the dedicated Roll20 Sandbox and legacy-room evidence separate from
   local fixture evidence.
2. Fix or document the supported file handoff needed for the authorized
   user-sheet upload. Do not infer success from a file-input click or a local
   pre-upload report.
3. Finish the same-render-surface and layer/container interaction audit.
4. Start the full pastel/pink information-architecture reset on a separate
   design-scoped branch after the renderer baseline is frozen.
5. Re-run local gates, copyright guard, deployment check, and browser smoke
   before calling any product-reset item complete.

## Actual Roll20 Evidence Rebaseline

- VERIFIED EXTERNAL PRIVATE: the dedicated Sandbox activated one anonymous
  synthetic payload in a real sheet iframe. The authored root was `850 x 260`
  inside a `900px` iframe; one input, one roll button, translated text, and a
  real default rolltemplate chat result were observed.
- VERIFIED EXTERNAL PRIVATE: read-only observation of one solo modern room and
  one solo legacy room measured the shared `900px` iframe wrapper, with modern
  `850px` and legacy `860px` authored roots. No existing room was edited.
- DIAGNOSTIC: same-root synthetic local-vs-Roll20 capture measured `1.6458%`
  mismatch after crop alignment. This is a renderer diagnostic, not a general
  parity score.
- VERIFY: an authorized user-imported sheet still needs a fresh activation
  probe and normalized root screenshot before it can count as user-sheet parity.
- PREPARED LOCAL: the latest PASS pre-upload run now has a missing-only handoff
  and modern-runtime browser upload/activation snippets for one user-owned
  local fixture. No snippet has been executed in Roll20 yet.

## DOM Role Plan Slice

- DOCUMENTED: `docs/ux/32_dom_layer_editing_plan.md` maps imported DOM signals
  to frame, flow, table, input, button, text, image, and sheet-action roles.
- FIXED: role labels and role colors now use readable Korean and light pastel
  contrast in `lib/editor/layerRoles.ts`.
- VERIFIED LOCAL: role classification, cycle protection, and iframe drop target
  tests passed. Full nested browser acceptance remains open.

## Imported Round-Trip Gate

- FIXED: the canonical iframe preview/edit smoke now runs the same edited
  payload through import -> emit a second time instead of silently skipping the
  round-trip assertion on the production render path.
- VERIFIED LOCAL: `smoke:imported-edit-sync:strict` passed for four anonymous
  fixtures; each reported stable HTML after block-id normalization, stable
  canonical CSS, stable i18n, and a positive second import block count.
- BOUNDARY: this strengthens local synchronization evidence only. It does not
  increase the live Roll20 user-sheet capture count, which remains `0`.

## Semantic Inline Mapping Gate

- FIXED: generic `small`, `u`, `sub`, and `sup` elements now map to a
  `r20_inline_container` block with a statement slot. Nested `data-i18n`
  elements remain individual translation blocks instead of forcing raw HTML.
- VERIFIED LOCAL: import structure tests passed `28/28`; the affected local
  fixture reached `100%` HTML/CSS coverage, and imported preview/edit sync plus
  modern/legacy visual smoke still pass.
- BOUNDARY: this is a general importer improvement, not a claim that every
  arbitrary HTML/CSS construct is mapped. The remaining legacy fixture has
  two HTML and one CSS residual fallback and stays open for the next slice.

## Import and Capture Stability Recheck

- VERIFIED LOCAL: generic inline, table-column, and CSS import matchers now
  pass `test:import-structure` at `30/30`. The direct legacy diagnostic is
  `637/637` HTML and `109/109` CSS with zero raw fallbacks; worker JavaScript
  partials remain a separate axis.
- FIXED: the visual harness waits for computed CSS `background-image`,
  `mask-image`, and `list-style-image` resources in addition to `<img>` and
  fonts before taking comparison captures.
- VERIFIED LOCAL: two complete modern/legacy runs passed all six local cases at
  `0%` preview/edit pixel mismatch on both runs.
- BOUNDARY: this is local importer/render evidence only. Authorized user-sheet
  upload remains `0`, and dedicated legacy-room visual parity remains `VERIFY`.

## Layer Tree Interaction Slice

- VERIFIED LOCAL: the edit-mode layer panel now has collapsible container rows
  and automatically expands the selected object's ancestor path. Search keeps
  matching descendants visible even when a parent was collapsed.
- VERIFIED LOCAL: `smoke:edit-flow` clicked a real collapse toggle, verified
  that the nested layer disappeared and returned, then selected the nested
  object through the shared iframe and verified automatic ancestor expansion
  plus row selection. Console and page error counts were both zero.
- VERIFIED LOCAL: lint, production build, `ci:verify`, and strict imported
  edit-sync passed after adding this acceptance coverage.
- BOUNDARY: this proves the local layer interaction path only. Full browser
  drag/reorder acceptance and live Roll20 visual parity remain `VERIFY`.

## Modern Sandbox Handoff Recheck

- PREPARED LOCAL: a fresh ignored modern-mode handoff was generated from the
  current local payload with `legacy:false`.
- VERIFY BLOCKED: the supported Chrome file chooser rejected `setFiles` with
  `Not allowed`, and the isolated page-evaluation surface lacks DOM creation
  APIs for the generated File-event snippet. No upload occurred.
- CURRENT COUNTS: authorized user-sheet captures `0`; dedicated legacy-room
  captures `0`; commit `0aa4f14` CI `success`.

## Reporting Rule

Every future progress report must label each item as `DONE`, `VERIFIED LOCAL`,
`VERIFIED REMOTE`, `DIAGNOSTIC`, `PARTIAL`, `VERIFY`, or `BLOCKED`. The words
"100%", "Roll20과 동일", and "완료" require evidence at the same scope as the
claim.

# 30. Roll20 Actual Sandbox Contract

Date: 2026-06-19

This note records direct Roll20 Custom Sheet Sandbox observations from the
logged-in Chrome session. It is implementation evidence for preview/export
behavior, not visual parity proof.

## Observed Surface

- Verification used a dedicated Roll20 sandbox/test campaign.
- Settings URL shape observed: `https://app.roll20.net/sheetsandbox/settings/<campaignId>`.
- The settings page exposes a Sheet.json editor through:
  - `textarea[name=customcharsheet_json]`
  - Ace editor target `data-target="customcharsheet_json"`
- The page script also references the custom preview/update path for:
  - `textarea[name=customcharsheet_layout]`
  - `textarea[name=customcharsheet_style]`
  - `#customsheet-preview iframe`
- Direct guessed editor URLs such as `/sheetsandbox/<id>` and
  `/sheetsandbox/editor/<id>` returned Roll20 not-found pages during this
  observation. Do not assume those routes exist.

## Observed Sandbox Sanitization

Roll20's sandbox preview script does more than load base CSS. The local preview
must model these behaviors separately from our legacy compatibility toggle.

Important update, 2026-06-19: a later read-only probe of the actual generated
character iframe found that the rendered CSSOM for the uploaded Les-Oublies
payload still contained unprefixed state selectors such as `.tabstoggle[...]`,
while the rendered HTML state anchors were prefixed as `.sheet-tabstoggle`.
Those selectors therefore did not match the actual panels, and Roll20 showed
multiple tab panels even while the hidden state inputs were `combat`. Treat the
older blanket CSS-prefix observation below as an incomplete settings-preview
observation until it is reverified across another fixture and the actual
character iframe path.

### CSS

- Remove mobile CSS blocks marked by `/* start mobile */ ... /* end mobile */`.
- Remove CSS comments.
- For each selector:
  - Convert leading ID selectors to class selectors.
  - Prefix selectors with `.charsheet ` unless already `.charsheet`,
    `@font-face`, `.sheet-rolltemplate-*`, or `@import`.
- Reject/clear CSS when suspicious tokens are detected, including script-like
  words, behavior/expression bindings, unsafe imports, HTML brackets, high/low
  bytes, and entity charsets.
- Rewrite URL references:
  - Preserve Roll20-hosted URLs such as `https://s3.amazonaws.com/files.d20.io`,
    `https://files.d20.io`, and `https://app.roll20.net/images/`.
  - Proxy other `http(s)` URLs through `https://imgsrv.roll20.net/?src=...`.
  - Drop non-http/non-Roll20 URL references.

### HTML

- Remove `<mobile>...</mobile>`, `<web>`, and `<mobile>` wrapper markers.
- Sanitize HTML through an allow-list.
- Allowed tags observed in the sandbox preview path:
  `br`, `input`, `textarea`, `div`, `span`, `label`, `hr`, `img`, `b`, `i`,
  `strong`, `em`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `p`, `table`, `tr`,
  `td`, `tbody`, `thead`, `th`, `tfoot`, `select`, `option`, `optgroup`,
  `fieldset`, `button`, `ul`, `li`, `ol`, `caption`.
- Class/group tokens are preserved only when they already begin with one of:
  - `attr_`
  - `sheet-`
  - `repeating_`
  - `roll_`
  - `act_`
- Other class tokens are prefixed with `sheet-`.
- Sanitized HTML is inserted into the preview iframe root with
  `#customsheet-preview iframe -> #root`.

## Distinction From Legacy Compatibility

Do not conflate these two layers:

| Layer | Purpose | Current Local Status |
| --- | --- | --- |
| Roll20 sandbox sanitize/prefix | Actual Roll20 custom sheet preview behavior for HTML/CSS source before rendering. | Modeled in `lib/emit/roll20SandboxSanitize.ts` and surfaced in the Export dialog "Roll20 Sandbox 고급 진단" panel. This is an evidence-backed approximation of the observed sandbox behavior, not proven pixel parity. |
| Legacy CSS compatibility toggle | Optional export/preview transform for older Roll20 CSS support, such as transform/keyframes/var/position handling. | Implemented separately in `lib/emit/sanitize.ts` (`sanitizeForRoll20Legacy`). It is intentionally distinct from the sandbox sanitize/prefix model above and from Roll20's own `legacySanitization` runtime class-prefixing. |

## Current Evidence Boundary

Actual generated-sheet visual parity is still unproven. Chrome can reach the
Roll20 Custom Sheet Sandbox. A 2026-07-16 live handler inspection confirmed that
the in-editor `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` controls use a
delegated `change` handler: `FileReader` reads the supplied browser `File`, the
page submits form-encoded base64 source to `/sheetsandbox/savesheetsettings`,
then invokes `reloadSheetData()` and `reloadOpenCharacters()`. The generated
upload helper now dispatches that same handler; its direct endpoint fallback is
allowed only when no file-input handler ran, so it cannot duplicate an upload.

The first generated Les-Oublies Roll20 sandbox screenshot exists locally and
diffs against the local baseline at `18.81%` mismatch. A real Roll20 roll button
click produced a `sheet-rolltemplate-classic-roll` chat DOM message, but a
trustworthy chat-pane screenshot is still missing. Therefore the current state is
partial actual evidence, not Roll20 visual parity.

2026-07-16 runtime-mode note: the current Custom Sheet Sandbox reports a modern
runtime and preserved an authored `attr-input` class. A dedicated legacy test
room with legacy sanitization enabled produced `sheet-attr-input` from the same
source. Therefore modern and legacy evidence are separate contracts. Generated
activation checks derive the expected mode from `sheet.json` and must return
`RUNTIME_MODE_MISMATCH` before screenshot evidence when the destination runtime
does not match. Handler execution and a matching mode still prove only upload
activation, not visual parity.

Observed geometry for the current prepared payload:

| Runtime | Sample class | Sample size | Root `cssWidth` | Root scroll size |
| --- | --- | ---: | ---: | ---: |
| Modern Custom Sheet Sandbox | `attr-input` | `210x26px` | `850px` | `1189x1936` |
| Dedicated legacy test room | `sheet-attr-input` | `52x40px` | `850px` | `896x1917` |

Both observations found translated `name` and `strength` markers and zero
source script nodes. These measurements prove mode divergence; they do not prove
that either local renderer is pixel-identical to Roll20.

Later evidence supersedes the `18.81%` visible-top screenshot as the main
Les-Oublies generated-sheet comparison: a stitched full-height actual Roll20 root
image is available locally and currently differs from the local preview by
`6.90%`. This is still not parity. The new state visibility diagnostic command

```bash
corepack pnpm run diagnose:roll20-state-visibility -- reports\roll20-actual-compare\2026-06-18-state-map-v1
```

classifies the captured fixture as
`ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`. This means the local
Roll20 expected-render path must not blindly assume CSS selector prefixing until
the actual character iframe behavior is modeled and rechecked.

2026-06-19 update: the dedicated sandbox endpoint/settings-form fallback also
rendered YSHY 1BU in the actual Roll20 character iframe. Fresh local-only
computed-style evidence found a `.charactersheet` root at `850px` width with
`1049` inputs, `808` roll buttons, `88` tables, and `9` scripts. The active
computed-style diagnostic now compares `3/3` fixtures with
`missingActualStyle=0`, but still reports `DO_NOT_PROMOTE_DIRECTLY`.

2026-06-19 renderer-gate update: AW2E's older stitched full-root screenshot is
still cutoff-prone (`9168px` stitched vs `11788.087px` live sidecar), but a
scroll-metrics source candidate now qualifies for diagnostic renderer-candidate
comparison (`rootDelta +8.188px`, `panelY +16.6px`, `panelH +0.2px`). Status may
therefore report `reliableTrustedFullRoot=3/3` with
`trustedFullRootCutoffUnresolved=0`. This is not visual parity and not renderer
readiness: the renderer gate still holds production CSS because reliable patch
families disagree across fixtures.

2026-06-19 blocker-matrix update: the scroll-metrics-aware matrix shows that
AW2E source-state already matches live root/panel geometry tightly (`11/11`
panels, `maxY 16.6px`, `maxH 9.05px`), while Les-Oublies and YSHY remain best
on `inline-block+text-input-height`. Treat this as two renderer axes, not one
global CSS tweak: Les/YSHY need the Roll20 input/inline-flow baseline modeled,
while AW2E stays on the selector/default-state/source-state path until the gate
proves a shared fix.

2026-06-19 input-flow update: `diagnose:roll20-input-flow-axis` now compares
source-state against inline/text-input-height candidates with actual computed
style sidecars. Latest result is `SPLIT_RENDERER_AXIS_CONFIRMED`: Les-Oublies
and YSHY are inline/text-input-best, but AW2E's scroll-metrics source-state is
already closer to the actual root (`+8.188px`) and worsens under the inline/text
candidate (`+47.188px`). Do not ship a global input/inline-flow CSS patch until
this split is represented in the renderer model and the action gate agrees.

2026-06-19 production-path model update: `buildSheetDoc()` and
`buildSheetParts()` now accept a gated `roll20RendererModel` diagnostic option.
The new `input-flow-27` / `input-flow-276` models are off by default and are not
a user-facing renderer fix. `smoke:roll20-full-root-candidates` includes
production-path candidates that reproduce the previous post-load diagnostic
patch numbers for Les-Oublies and YSHY while preserving the AW2E warning: AW2E
still prefers source-state under scroll-metrics. Keep the action gate as the
authority before enabling any model globally.

2026-06-19 boundary-gate update: `diagnose:roll20-input-flow-axis` now emits
machine-readable model boundaries. Current evidence marks Les-Oublies and YSHY
as `APPLY_CANDIDATE_FOR_THIS_AXIS`, but AW2E as `BLOCK_GLOBAL_MODEL`; therefore
`globalModelSafe=NO`. `gate:roll20-renderer-action` surfaces this directly and
must continue to block global input-flow until broader fixture evidence proves
that source/state-dominant sheets are not harmed.

## Implementation Implications

- DONE: The dedicated local module for Roll20 sandbox sanitize/prefix behavior
  exists at `lib/emit/roll20SandboxSanitize.ts`, separate from
  `sanitizeForRoll20Legacy` (`lib/emit/sanitize.ts`). Its contract is covered by
  `test:roll20-sandbox-sanitize` (7/7).
- DONE (partial): The Export dialog reports which layers were applied — the
  "Roll20 Sandbox 고급 진단" panel shows the sandbox sanitize/prefix diff, and
  the legacy toggle reports `sanitizeForRoll20Legacy` warnings. The run-level
  status summary (`scripts/roll20_actual_status.mjs`) does not yet surface the
  per-fixture modern/legacy runtime mode; that is tracked as a NEXT item under
  the legacy_sanitization tooling note below.
- For the actual generated character iframe path, do not blanket-prefix CSS
  selectors until another probe proves that Roll20 does so in that path. The
  current implementation uses `sanitizeRoll20SandboxCss(css, {
  prefixSelectors: false })` for local actual expected-render diagnostics while
  preserving the older prefixing behavior as an explicit sanitizer option.
- Screenshot diff classification must not request more renderer CSS changes
  when the remaining mismatch is missing actual Roll20 screenshot or crop/state
  context.
- Translation remains unverified in this observed UI path. Treat translation
  application as a separate evidence item until the actual upload path is
  completed.

## Upload Path Contract Equivalence

Question: does the manual file-selection upload and the generated auto-upload
snippet reach Roll20 through the same contract?

Answer from code + the 2026-07-16 live handler inspection: yes, they converge on
the same Roll20 delegated file-input `change` handler.

- Manual path: a person opens `Sheet Sandbox Tools` and selects files for
  `#sheetHtml`, `#sheetCss`, `#sheetTranslation`. Roll20's delegated `change`
  handler reads each `File` with `FileReader`, POSTs form-encoded base64 source
  to `/sheetsandbox/savesheetsettings`, then calls `reloadSheetData()` and
  `reloadOpenCharacters()`.
- Auto path: `scripts/roll20_upload_snippet.mjs` builds browser `File` objects
  from the local baseline payload and dispatches `input`/`change` on the same
  three inputs, invoking the identical delegated handler
  (`uploadContract: 'roll20-delegated-file-input-change'`). It does not
  hand-build or POST a bypass request as the primary path.
- Fallback only: the snippet's direct POST to `/sheetsandbox/savesheetsettings`
  uses the same form-encoded base64 shape and the same reload helpers, and it is
  gated to run only when the file-input handler could not run
  (`not-needed-file-input-handler-dispatched`). So the fallback cannot diverge
  from, or duplicate, a successful file-input upload.

Equivalence boundary: this establishes an equal *upload contract*. Upload
execution is not render proof. Both paths still require the activation probe to
report `VISIBLE_MATCH` with a matching runtime mode, then fresh sheet-root and
chat screenshots, before any visual-parity claim.

## legacy_sanitization State in Verification Tooling

Roll20 exposes a `legacySanitization` runtime flag (modern = `false`, legacy =
`true`), driven by the sheet's `sheet.json` `legacy` metadata. Distinguishing it
is required so a legacy payload is never validated against a modern runtime (or
vice versa).

Where the state is already distinguishable:

- `sheet.json` carries `legacy` (`lib/export/manifest.ts` / `lib/export/types.ts`);
  the Export dialog and preview store select it through one atomic
  modern/legacy control (`setRoll20CompatibilityMode`).
- `scripts/roll20_actual_local_baseline.mjs` resolves the per-fixture legacy
  mode (`resolveLegacyMode`), writes it into the emitted `sheet.json`, and prints
  a `Legacy` column in the baseline results table.
- `scripts/roll20_upload_snippet.mjs` derives the expected `modern|legacy`
  runtime from `sheet.json` (`resolveExpectedRuntimeMode`) and both the upload
  and activation snippets read Roll20's `legacySanitization` at runtime,
  returning `RUNTIME_MODE_MISMATCH` before any evidence is accepted when the
  observed runtime does not match the payload. This is exercised by
  `test:roll20-upload-snippet`.

Known gap (NEXT): the run-level `scripts/roll20_actual_status.mjs` summary does
not yet surface the per-fixture expected runtime mode alongside its sandbox/chat
evidence rows. Until it does, the authoritative per-run mode signals are the
baseline `Legacy` column and the upload/activation snippet
`RUNTIME_MODE_MISMATCH` result.

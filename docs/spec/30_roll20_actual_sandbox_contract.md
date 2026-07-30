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
character iframe found that the rendered CSSOM for the uploaded fixture-B
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
| Roll20 sandbox sanitize/prefix | Actual Roll20 custom sheet preview behavior for HTML/CSS source before rendering. | Observed and documented here; implementation gap remains. |
| Legacy CSS compatibility toggle | Optional export/preview transform for older Roll20 CSS support, such as transform/keyframes/var/position handling. | Existing local sanitizer covers part of this but is not the actual sandbox prefix/sanitize contract. |

## Current Evidence Boundary

Actual generated-sheet visual parity is still unproven. Chrome can reach the
Roll20 Custom Sheet Sandbox. A 2026-07-16 live handler inspection confirmed that
the in-editor `#sheetHtml`, `#sheetCss`, and `#sheetTranslation` controls use a
delegated `change` handler: `FileReader` reads the supplied browser `File`, the
page submits form-encoded base64 source to `/sheetsandbox/savesheetsettings`,
then invokes `reloadSheetData()` and `reloadOpenCharacters()`. The generated
upload helper now dispatches that same handler; its direct endpoint fallback is
allowed only when no file-input handler ran, so it cannot duplicate an upload.

The first generated fixture-B Roll20 sandbox screenshot exists locally and
diffs against the local baseline at `18.81%` mismatch. A real Roll20 roll button
click produced a `sheet-rolltemplate-classic-roll` chat DOM message, but a
trustworthy chat-pane screenshot is still missing. Therefore the current state is
partial actual evidence, not Roll20 visual parity.

2026-07-16 runtime-mode note: the current Custom Sheet Sandbox reports a modern
runtime and preserved an authored `attr-input` class. Custom Sheet Sandbox does
not recognize or reproduce the legacy runtime, so it is a modern-only validation
destination. A dedicated legacy test room with legacy sanitization enabled
produced `sheet-attr-input` from the same source. Therefore modern and legacy
evidence are separate contracts. A legacy package rendered in Sandbox is a
destination mismatch, not legacy evidence and not a legacy renderer failure. Generated
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

### 2026-07-17 Mode-Specific External Font Observation

A fresh read-only computed-style/CSSOM capture narrowed one part of that mode
divergence. For the same uploaded external `@font-face` declaration:

- modern Roll20 retained the direct CDN URL and `document.fonts.check()` was
  true;
- legacy Roll20 exposed an `imgsrv.roll20.net` URL and the same font check was
  false, so intrinsic table sizing used a fallback font.

The local shared render contract now mirrors this measured distinction only for
external URLs inside user `@font-face` blocks. Modern preview/edit keeps the
authored URL; legacy preview/edit uses the proxy URL. Exported CSS keeps the
authored URL in both modes because Roll20 applies its own runtime processing;
the selected destination remains encoded by `sheet.json.legacy` and the legacy
CSS compatibility transform. This observation must not be generalized to
background/image URLs until equivalent modern and legacy evidence is captured.

The focused local result is partial: modern remains `1189x1936`, matching the
measured actual root, while legacy is `898x1918` versus actual `896x1917`. The
legacy final table height is within about `0.61px`, but its two intrinsic column
widths still differ by about `12px`. Do not claim pixel parity or add a
fixture-specific width rule from this evidence.

### 2026-07-17 Superseding Runtime Asset Observation

The earlier font-only observation above is now superseded by a complete host-
surface inventory for the same prepared payload in both dedicated runtimes.
The mode split is not "proxy every external URL".

| Surface | Modern Roll20 | Legacy Roll20 |
| --- | --- | --- |
| HTML `<img src>` (`11`) | `imgsrv.roll20.net` | authored Imgur host |
| user `<style>` URLs (`15`) | authored hosts | `imgsrv.roll20.net` |
| HTML inline-style URLs (`3`) | authored Imgur host | `imgsrv.roll20.net` |
| image load result | `11/11` loaded | `11/11` loaded |
| root scroll size | `1189x1936` | `896x1917` |

This was collected read-only from the dedicated modern Sandbox character and
dedicated legacy test-room character. No sheet source or room setting was
changed. Official documentation explains the broader sanitizer generations,
but the current per-surface direction above comes from direct current runtime
evidence.

Local preview/edit runtime behavior now mirrors this split through
`lib/preview/runtimeAssetPolicy.ts` after class/allow-list handling. The policy
is preview-only: authored workspace source and exported ZIP HTML/CSS retain the
user's URLs so Roll20 can apply its own runtime processing. Relative URLs, data
URLs, and existing Roll20-managed URLs are not silently re-proxied.

The optional `roll20SandboxSanitize` diagnostic no longer proxies both HTML and
CSS before the mode-specific policy. Standalone sanitizer calls keep their
backward-compatible URL-rewrite default, while the shared render contract asks
the sanitizer to preserve URLs and then applies the measured modern or legacy
runtime rule once.

Ignored Chrome 150 local evidence at
`%TEMP%\roll20-runtime-asset-policy-r20` matches the host direction in both
modes, including all three inline-style URLs. It is not visual-parity evidence:
all local remote images and both font paths failed to load, shortening the local
roots to `1187x1879` modern and `895x1861` legacy. An asset-complete same-browser
recapture remains required before geometry or pixel claims.

Later evidence supersedes the `18.81%` visible-top screenshot as the main
fixture-B generated-sheet comparison: a stitched full-height actual Roll20 root
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
rendered fixture-C 1BU in the actual Roll20 character iframe. Fresh local-only
computed-style evidence found a `.charactersheet` root at `850px` width with
`1049` inputs, `808` roll buttons, `88` tables, and `9` scripts. The active
computed-style diagnostic now compares `3/3` fixtures with
`missingActualStyle=0`, but still reports `DO_NOT_PROMOTE_DIRECTLY`.

2026-06-19 renderer-gate update: fixture-A's older stitched full-root screenshot is
still cutoff-prone (`9168px` stitched vs `11788.087px` live sidecar), but a
scroll-metrics source candidate now qualifies for diagnostic renderer-candidate
comparison (`rootDelta +8.188px`, `panelY +16.6px`, `panelH +0.2px`). Status may
therefore report `reliableTrustedFullRoot=3/3` with
`trustedFullRootCutoffUnresolved=0`. This is not visual parity and not renderer
readiness: the renderer gate still holds production CSS because reliable patch
families disagree across fixtures.

2026-06-19 blocker-matrix update: the scroll-metrics-aware matrix shows that
fixture-A source-state already matches live root/panel geometry tightly (`11/11`
panels, `maxY 16.6px`, `maxH 9.05px`), while fixture-B and fixture-C remain best
on `inline-block+text-input-height`. Treat this as two renderer axes, not one
global CSS tweak: Les/fixture-C need the Roll20 input/inline-flow baseline modeled,
while fixture-A stays on the selector/default-state/source-state path until the gate
proves a shared fix.

2026-06-19 input-flow update: `diagnose:roll20-input-flow-axis` now compares
source-state against inline/text-input-height candidates with actual computed
style sidecars. Latest result is `SPLIT_RENDERER_AXIS_CONFIRMED`: fixture-B
and fixture-C are inline/text-input-best, but fixture-A's scroll-metrics source-state is
already closer to the actual root (`+8.188px`) and worsens under the inline/text
candidate (`+47.188px`). Do not ship a global input/inline-flow CSS patch until
this split is represented in the renderer model and the action gate agrees.

2026-06-19 production-path model update: `buildSheetDoc()` and
`buildSheetParts()` now accept a gated `roll20RendererModel` diagnostic option.
The new `input-flow-27` / `input-flow-276` models are off by default and are not
a user-facing renderer fix. `smoke:roll20-full-root-candidates` includes
production-path candidates that reproduce the previous post-load diagnostic
patch numbers for fixture-B and fixture-C while preserving the fixture-A warning: fixture-A
still prefers source-state under scroll-metrics. Keep the action gate as the
authority before enabling any model globally.

2026-06-19 boundary-gate update: `diagnose:roll20-input-flow-axis` now emits
machine-readable model boundaries. Current evidence marks fixture-B and fixture-C
as `APPLY_CANDIDATE_FOR_THIS_AXIS`, but fixture-A as `BLOCK_GLOBAL_MODEL`; therefore
`globalModelSafe=NO`. `gate:roll20-renderer-action` surfaces this directly and
must continue to block global input-flow until broader fixture evidence proves
that source/state-dominant sheets are not harmed.

## Implementation Implications

- Add a dedicated local module for Roll20 sandbox sanitize/prefix behavior,
  separate from `sanitizeForRoll20Legacy`.
- Preview/edit/export should be able to report which layer was applied:
  source-preserving mode, Roll20 sandbox sanitize/prefix, and legacy
  compatibility mode.
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

## 2026-07-30 Wrapper/Root Measurement Contract

The local evidence comparator now uses `scripts/lib/roll20Geometry.mjs` to
represent the visible surface as five layers:

| Layer | Meaning | Comparison rule |
| --- | --- | --- |
| `iframe` | Roll20 character-frame viewport | context only |
| `dialog` | Roll20 dialog chrome/content shell | compare parent-relative inset when captured |
| `form` | `sheetform` content allocation | compare parent-relative size and origin |
| `root` | `.charactersheet.charsheet` outer box | report separately from authored canvas |
| `content` | root content-box/authored sheet canvas | primary sheet geometry comparison |

The contract uses CSS pixels, records missing parent layers as non-comparable,
and returns `PASS_WITH_CONTEXT_DELTA` when the authored canvas is comparable but
the wrapper differs. A result is never promoted to parity from that status.
This prevents a `900px` Roll20 iframe with an `860px` root and `20px` inset from
being compared as if its wrapper were the user's authored sheet width.

The current anonymous probe measured an `860 x 200px` Roll20 root with roughly
`840 x 180px` content, while the local default synthetic surface measured an
`850 x 200px` root with roughly `830 x 180px` content. This is recorded as an
open generic viewport/root decision, not as permission for a fixture-specific
CSS patch or a universal parity claim.

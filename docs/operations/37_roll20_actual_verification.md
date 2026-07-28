# 37. Roll20 Actual-Screen Verification

Date: 2026-06-18

This document defines how agents verify that this editor's preview/edit output matches what Roll20 actually shows. It is intentionally strict because Roll20 rooms may contain private campaign material and real sheet assets.

## Goal

- Confirm whether local preview/edit renders match Roll20's actual sheet display.
- Separate observation of existing rooms from applying our generated sheet.
- Keep all real room screenshots, uploaded sheet source, exports, and generated reports local-only.

## Existing-Room Participant Preflight

This check is mandatory before opening an existing room for observation or any
other browser interaction.

1. Read the current visible participant/member count from the room page.
2. If the count is missing, stale, or cannot be verified, stop and do not use
   the room.
3. If the count is greater than one, exclude the room entirely. Do not upload,
   save, send chat, change settings, open character editors, or otherwise
   interact with that room.
4. Do not infer solitude from a room name, old chat history, or a previously
   observed count. Recheck immediately before any observation.
5. Use Custom Sheet Sandbox for modern generated-sheet interaction. Use a newly
   created dedicated test room for legacy interaction. Existing rooms are
   observation-only and never an upload destination.

The participant preflight is a safety gate, not a visual-parity measurement.
When it fails, record `ROOM_EXCLUDED_PARTICIPANT_STATE_UNKNOWN_OR_NONSOLO` and
continue only with local evidence or an isolated Sandbox/test room.

## Modern And Legacy Are Separate Required Destinations

- Custom Sheet Sandbox is a modern-runtime validation surface. It does not
  recognize or reproduce the legacy runtime, even when the uploaded package is
  intended for legacy Roll20.
- Verify modern output in Custom Sheet Sandbox. Verify legacy sanitization,
  class prefixing, runtime asset handling, and geometry only in a dedicated
  legacy-enabled test room.
- Treat a legacy package observed in Sandbox as a destination mismatch, not as
  legacy visual evidence and not as a product failure.
- A modern Sandbox result never passes a legacy test-room gate, and a legacy
  result never passes the modern gate.
- Measure the same prepared payload independently in both modes. Record root
  scroll size, top-level landmarks, final-layout contributors, focused state,
  and representative attribute state before changing renderer CSS.
- On 2026-07-17 the prepared comparison measured modern actual/local root
  scroll at `1189x1936` in both modes. Legacy measured `896x1917` actual versus
  `895x1919` local. The remaining legacy height delta was localized mainly to
  one final asset-table row (`111.537px` actual versus `113.14px` local), while
  the modern row was effectively exact (`113.138px` versus `113.14px`).
- This measurement is a scoped diagnostic, not all-sheet visual parity. Do not
  add fixture-specific selectors or a guessed pixel offset. Recapture generic
  table spacing, collapse, layout, and width-allocation evidence first.

## Isolated Diagnostic Output

When refreshing diagnostics from a canonical `reports/roll20-actual-compare/<run>`
folder, prefer temp output folders so locked Windows files and canonical evidence
are not rewritten during investigation:

```powershell
corepack pnpm run diagnose:roll20-geometry -- reports\roll20-actual-compare\<run> --out-dir ..\_tmp_codex_smoke\geometry-<label>
corepack pnpm run diagnose:roll20-height-drift -- reports\roll20-actual-compare\<run> <fixture-id> --out-dir ..\_tmp_codex_smoke\height-drift-<label>
corepack pnpm run smoke:roll20-full-root-candidates -- reports\roll20-actual-compare\<run> --out-dir ..\_tmp_codex_smoke\full-root-candidates-<label>
corepack pnpm run diagnose:roll20-chat-table-intrinsic-probe -- reports\roll20-actual-compare\<run> <local-smoke-json> --out-dir ..\_tmp_codex_smoke\table-intrinsic-<label>
corepack pnpm run diagnose:roll20-chat-font-intrinsic -- reports\roll20-actual-compare\<run> --out-dir ..\_tmp_codex_smoke\font-intrinsic-<label>
```

`smoke:roll20-full-root-candidates` also sends its temporary `buildDoc.ts`
compile to `out-dir/.build` when `--out-dir` is supplied. Use `--build-dir`
only when a separate writable compile directory is needed.

Isolated output proves the diagnostic can be rerun safely. It does not update
canonical renderer gates by itself and must not be reported as visual parity.

When refreshing actual Roll20 CDP evidence and the canonical screenshot folder
is locked or should not be rewritten, keep the new evidence in ignored temp
output and pass the sidecar path forward explicitly:

```powershell
corepack pnpm run probe:roll20-sheet-frame -- --run-dir reports\roll20-actual-compare\<run> `
  --fixture <fixture-id> `
  --out-dir ..\_tmp_codex_smoke\sheet-frame-<fixture>-<label>

corepack pnpm run plan:roll20-chat-capture -- reports\roll20-actual-compare\<run> <fixture-id> `
  --require-current-metrics `
  --all `
  --out-dir ..\_tmp_codex_smoke\chat-plan-<fixture>-<label>

corepack pnpm run capture:roll20-chat-cdp -- --run-dir reports\roll20-actual-compare\<run> `
  --fixture <fixture-id> `
  --snippet ..\_tmp_codex_smoke\chat-plan-<fixture>-<label>\snippets\<fixture-id>-chat-dom-probe-snippet.js `
  --sheet-frame-evidence ..\_tmp_codex_smoke\sheet-frame-<fixture>-<label>\roll20-sandbox-dom-evidence.json `
  --out-dir ..\_tmp_codex_smoke\chat-capture-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-table-layout-constraint -- reports\roll20-actual-compare\<run> <local-smoke-json> `
  --actual-sidecar <fixture-id>=..\_tmp_codex_smoke\chat-capture-<fixture>-<label>\roll20-chat-dom-evidence.json `
  --out-dir ..\_tmp_codex_smoke\table-layout-constraint-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-intrinsic-width -- reports\roll20-actual-compare\<run> <local-smoke-json> `
  --actual-sidecar <fixture-id>=..\_tmp_codex_smoke\chat-capture-<fixture>-<label>\roll20-chat-dom-evidence.json `
  --out-dir ..\_tmp_codex_smoke\intrinsic-width-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-table-intrinsic-probe -- reports\roll20-actual-compare\<run> <local-smoke-json> `
  --actual-sidecar <fixture-id>=..\_tmp_codex_smoke\chat-capture-<fixture>-<label>\roll20-chat-dom-evidence.json `
  --out-dir ..\_tmp_codex_smoke\table-intrinsic-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-min-content -- reports\roll20-actual-compare\<run> <local-smoke-json> `
  --actual-sidecar <fixture-id>=..\_tmp_codex_smoke\chat-capture-<fixture>-<label>\roll20-chat-dom-evidence.json `
  --font-glyph-dir ..\_tmp_codex_smoke\font-glyph-<fixture>-<label> `
  --intrinsic-width-dir ..\_tmp_codex_smoke\intrinsic-width-<fixture>-<label> `
  --table-intrinsic-dir ..\_tmp_codex_smoke\table-intrinsic-<fixture>-<label> `
  --table-layout-dir ..\_tmp_codex_smoke\table-layout-constraint-<fixture>-<label> `
  --source-context-dir ..\_tmp_codex_smoke\source-context-<fixture>-<label> `
  --out-dir ..\_tmp_codex_smoke\min-content-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-source-intrinsic -- reports\roll20-actual-compare\<run> `
  --source-context-dir ..\_tmp_codex_smoke\source-context-<fixture>-<label> `
  --intrinsic-width-dir ..\_tmp_codex_smoke\intrinsic-width-<fixture>-<label> `
  --table-intrinsic-dir ..\_tmp_codex_smoke\table-intrinsic-<fixture>-<label> `
  --table-layout-dir ..\_tmp_codex_smoke\table-layout-constraint-<fixture>-<label> `
  --min-content-dir ..\_tmp_codex_smoke\min-content-<fixture>-<label> `
  --out-dir ..\_tmp_codex_smoke\source-intrinsic-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-font-glyph -- reports\roll20-actual-compare\<run> <local-smoke-json> `
  --actual-sidecar <fixture-id>=..\_tmp_codex_smoke\chat-capture-<fixture>-<label>\roll20-chat-dom-evidence.json `
  --out-dir ..\_tmp_codex_smoke\font-glyph-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-font-fallback -- reports\roll20-actual-compare\<run> `
  --fixture <fixture-id> `
  --actual-sidecar ..\_tmp_codex_smoke\chat-capture-<fixture>-<label>\roll20-chat-dom-evidence.json `
  --out-dir ..\_tmp_codex_smoke\font-fallback-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-source-context -- reports\roll20-actual-compare\<run> `
  --actual-sidecar <fixture-id>=..\_tmp_codex_smoke\chat-capture-<fixture>-<label>\roll20-chat-dom-evidence.json `
  --out-dir ..\_tmp_codex_smoke\source-context-<fixture>-<label>

corepack pnpm run diagnose:roll20-chat-font-intrinsic -- reports\roll20-actual-compare\<run> `
  --font-glyph-dir ..\_tmp_codex_smoke\font-glyph-<fixture>-<label> `
  --out-dir ..\_tmp_codex_smoke\font-intrinsic-<fixture>-<label>
```

Do not copy temp snippets or sidecars into the canonical report folder just to
make later commands pass. Either pass explicit overrides (`--snippet`,
`--sheet-frame-evidence`, `--actual-sidecar`, `--font-glyph-dir`) or recapture
the canonical run in a clean session. Temp actual evidence is still local-only
and not a parity claim.

To test a renderer action gate against isolated root diagnostics without copying
those reports back into the canonical run, pass the report directories as
overrides:

```powershell
corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\<run> `
  --full-root-dir ..\_tmp_codex_smoke\full-root-candidates-<label> `
  --geometry-dir ..\_tmp_codex_smoke\geometry-<label> `
  --chat-source-intrinsic-dir ..\_tmp_codex_smoke\source-intrinsic-<fixture>-<label> `
  --out-dir ..\_tmp_codex_smoke\renderer-gate-<label>
```

The gate records `reportOverrides` in its JSON output. If an override directory
is provided but the expected report JSON is missing, the command must fail
rather than silently falling back to stale canonical evidence.

For chat candidate style proof, use isolated output and include the current
fixture-best candidates when the next gate decision depends on them:

```powershell
corepack pnpm run diagnose:roll20-chat-candidate-style -- reports\roll20-actual-compare\<run> `
  --include-best-per-fixture `
  --out-dir ..\_tmp_codex_smoke\chat-candidate-style-proof-<label>
```

`--include-candidates <comma-list>` can be used for one-off named candidates.
The style-proof report records its selection in JSON/Markdown. If a template
gate best candidate is absent from style proof, treat that as insufficient
evidence, not as a production-ready CSS candidate.

When a new chat candidate smoke report must be written to ignored temp output
instead of `reports/`, pass that temp evidence into downstream diagnostics:

```powershell
node scripts\rolltemplate_chat_smoke.mjs `
  --out-dir .\out `
  --base-path /roll20-block-editor `
  --fixtures test-fixtures\visual `
  --report-dir ..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate> `
  --chat-geometry-policy <policy> `
  --chat-typography-policy <policy>

corepack pnpm run diagnose:roll20-chat-candidates -- reports\roll20-actual-compare\<run> `
  --candidate-screenshots <candidate>=..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\screenshots `
  --out-dir ..\_tmp_codex_smoke\chat-candidates-<candidate>

corepack pnpm run diagnose:roll20-chat-row-raster-candidates -- reports\roll20-actual-compare\<run> `
  --candidate-smoke <candidate>=..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\rolltemplate-chat-smoke-results.json `
  --candidate-screenshots <candidate>=..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\screenshots `
  --out-dir ..\_tmp_codex_smoke\row-raster-<candidate>

corepack pnpm run diagnose:roll20-chat-candidate-style -- reports\roll20-actual-compare\<run> `
  --candidate-comparison-dir ..\_tmp_codex_smoke\chat-candidates-<candidate> `
  --candidate-smoke <candidate>=..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\rolltemplate-chat-smoke-results.json `
  --include-candidates <candidate> `
  --out-dir ..\_tmp_codex_smoke\chat-style-<candidate>

corepack pnpm run gate:roll20-chat-candidate-experiment -- reports\roll20-actual-compare\<run> `
  --candidate <candidate> `
  --candidate-smoke ..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\rolltemplate-chat-smoke-results.json `
  --candidate-screenshots ..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\screenshots `
  --out-dir ..\_tmp_codex_smoke\candidate-experiment-<candidate>
```

For combined YSHY/CoC one-off candidates, a `STYLE_COMPATIBLE` or
`STYLE_COMPATIBLE_NEEDS_PIXEL_REVIEW` style proof is not enough. The candidate
must also avoid cross-fixture pixel regression and row-raster regression. The
rejected `yshy-coc-table-source-context-fallback-only` run is the current
example: style proof was compatible for YSHY, but candidate comparison and row
raster still required `HOLD_PRODUCTION_RENDERER_PATCH`.

When a fresh local smoke needs to be compared against actual Roll20 intrinsic
table/cell sizing, pass the smoke path and isolate the output:

```powershell
corepack pnpm run diagnose:roll20-chat-intrinsic-width -- reports\roll20-actual-compare\<run> `
  ..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\rolltemplate-chat-smoke-results.json `
  --out-dir ..\_tmp_codex_smoke\intrinsic-width-<candidate>
```

This is especially important for AW2E-style candidates: a policy can be
`APPLIED` while still breaking intrinsic cell allocation. Treat the intrinsic
report as a blocker/guidance report, not production CSS approval.

When the next question is whether a local/candidate smoke preserves Roll20's
cell and column allocation, run the cell allocation probe. Candidate smokes may
be fixture-scoped; fixtures absent from a candidate smoke are reported as
`SCENARIO_NOT_IN_LOCAL_SMOKE`, not as renderer failures:

```powershell
corepack pnpm run diagnose:roll20-chat-cell-allocation -- reports\roll20-actual-compare\<run> `
  reports\rolltemplate-chat-smoke\rolltemplate-chat-smoke-results.json `
  --candidate-smoke <candidate>=..\_tmp_codex_smoke\rolltemplate-chat-smoke-<candidate>\rolltemplate-chat-smoke-results.json `
  --out-dir ..\_tmp_codex_smoke\chat-cell-allocation-<candidate>
```

Use this before promoting table/cell typography candidates. A result such as
`BROAD_STYLE_BREAKS_CELL_ALLOCATION` means the candidate matched some computed
styles but changed the actual text-cell allocation too much to be production
safe.

To feed that isolated evidence into the template-scope and renderer gates
without rewriting canonical reports:

```powershell
corepack pnpm run gate:roll20-chat-template-scope -- reports\roll20-actual-compare\<run> `
  --cell-allocation-dir ..\_tmp_codex_smoke\chat-cell-allocation-<candidate> `
  --out-dir ..\_tmp_codex_smoke\chat-template-scope-<candidate>

corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\<run> `
  --cell-allocation-dir ..\_tmp_codex_smoke\chat-cell-allocation-<candidate> `
  --chat-template-scope-dir ..\_tmp_codex_smoke\chat-template-scope-<candidate> `
  --out-dir ..\_tmp_codex_smoke\renderer-gate-<candidate>
```

The full refresh chain also runs the default cell allocation probe before the
template-scope gate. Candidate-specific smoke still needs explicit
`--candidate-smoke` plus the override flow above.

## Verification Tracks

| Track | Purpose | Allowed Actions | Forbidden Actions |
| --- | --- | --- | --- |
| Room View Check | Observe how existing sheets appear in Roll20 rooms. | Use Chrome session, inspect solo rooms only, capture local ignored screenshots if needed. | Do not edit room settings, sheet code, character data, macros, handouts, or chat. |
| Custom Sheet Upload Check | Test our site's export in Roll20. | Use Roll20 Custom Sheet Sandbox first; create/use a new test room only if sandbox is insufficient. | Do not apply generated sheets to existing real rooms. |
| Local Baseline Check | Compare local preview/edit before Roll20 upload. | Use ignored fixtures/reports; capture local preview/edit screenshots. | Do not commit fixtures, screenshots, generated reports, or source-derived HTML. |

## Required Flow

1. Prepare local baseline:
   - Copy selected HTML/CSS/translation into ignored `test-fixtures/`.
   - Import into the app.
   - Capture local preview screenshot.
   - Capture local edit screenshot.
   - Export the generated zip or HTML/CSS/translation payload for sandbox use.
   - Repeatable command:
     `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label <label>`
   - Then run payload hygiene audit before uploading:
     `corepack pnpm run audit:payload -- reports/roll20-actual-compare/<label>`
   - The payload audit must pass before upload. It checks for app UI/edit overlay/internal id leakage, valid Roll20 JSON translation payloads, and zip/file consistency.
   - Then run the Roll20 sandbox sanitize diagnostic before uploading:
     `corepack pnpm run audit:roll20-sandbox-sanitize -- reports/roll20-actual-compare/<label>`
   - The sandbox sanitize audit must pass before upload. It applies the observed Roll20 Custom Sheet Sandbox sanitize/prefix approximation to generated payload HTML/CSS and reports expected selector prefixing, URL proxy/drop behavior, runtime stripping, and allow-list effects. Passing means no locally detected fatal reject/empty payload condition; it does not prove Roll20 visual parity.
   - Then run cleaned-payload visual roundtrip before uploading:
     `corepack pnpm run smoke:payload-roundtrip -- reports/roll20-actual-compare/<label> --out-dir ./out --base-path /roll20-block-editor`
   - The payload roundtrip smoke must pass before upload. It re-imports the cleaned Roll20 payload, captures a preview screenshot, and compares it against the local baseline preview so export-only cleanup cannot silently change the sheet before Roll20 sees it.
   - Then run the local evidence guard before any Roll20 upload:
     `corepack pnpm run guard:roll20-evidence -- reports/roll20-actual-compare/<label>`
   - The guard must pass. It verifies that copied fixtures, generated reports, private screenshots, and public example folders are not tracked/staged, and that the local baseline, payload audit, and cleaned-payload roundtrip outputs exist for the selected run.
   - To summarize the current actual-screen evidence state without making a parity claim:
     `corepack pnpm run status:roll20-actual -- reports/roll20-actual-compare/<label>`
   - To fail when generated-sheet Roll20 Sandbox/chat screenshots and diffs are still missing:
     `corepack pnpm run status:roll20-actual -- reports/roll20-actual-compare/<label> --require-actual`
   - Or run the full local pre-upload gate:
     `corepack pnpm run verify:roll20-preupload -- reports/roll20-actual-compare/<label> --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor`
   - The pre-upload gate first regenerates the local baseline and upload payloads for the selected run, then reruns payload hygiene, Roll20 sandbox sanitize diagnostics, cleaned-payload visual roundtrip, default-state selector audit, asset/resource audit, and evidence guard. Passing means the payload is ready to upload; it still does not prove Roll20 visual parity.
   - If the local baseline was captured with action/control-state hints, pass the same state map through the pre-upload gate:
     `corepack pnpm run verify:roll20-preupload -- reports/roll20-actual-compare/<label> --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json`
     - `--state-map` affects only local screenshot state normalization for baseline/payload comparison. It may click a local action button or local checkbox/radio control before screenshot capture. It does not mutate the Roll20 upload payload files.
     - If `payload-roundtrip` fails after renderer changes, regenerate the local baseline with the same code and state map before diagnosing export drift. A stale `local-preview.png` can create false visual mismatches even when source preview and cleaned payload render identically.
   - If external assets were relinked, pass the user-owned local map into the local baseline/pre-upload gate:
     `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/roll20-actual-compare --run-label <label> --asset-map-file <local-map.txt>`
     or:
     `corepack pnpm run verify:roll20-preupload -- reports/roll20-actual-compare/<label> --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor --asset-map-file <local-map.txt>`
     - The map is URL text only. It is applied to local preview/edit screenshots and emitted upload payload HTML/CSS, but the map file and generated evidence remain local-only.
     - Run `corepack pnpm run plan:roll20-asset-relink -- reports/roll20-actual-compare/<label> --map-file <local-map.txt>` first; only `COVERED_ROLL20_READY` HTTP(S) targets are suitable for Roll20 Sandbox upload.
2. Observe existing Roll20 solo rooms:
   - Use the user's logged-in Chrome session.
   - Identify rooms where the user is alone or intended for testing.
   - Observe default sheet state, wrapper, tab, dialog sizing, rolltemplate/chat behavior, and asset loading.
   - Do not modify anything in these rooms.
3. Verify generated sheet:
   - Prefer Roll20 Custom Sheet Sandbox.
   - If sandbox cannot represent the required behavior, use a new test room.
   - Apply only the generated test sheet there.
   - Capture initial sheet, basic input state, roll button/chat smoke, and asset-loading behavior.
4. Compare and classify:
   - Local preview vs local edit.
   - Local preview vs Roll20 sandbox/test room.
   - Roll20 sandbox/test room vs existing solo-room observation when relevant.

## Difference Categories

- wrapper/context
- Roll20 base CSS
- user CSS cascade
- default attr/state
- translation/i18n
- worker JS
- rolltemplate/chat
- asset loading
- viewport/crop/sheet size
- edit overlay
- optimistic drag/commit latency

## Evidence Storage

- Local-only report root: `reports/roll20-actual-compare/`
- Local-only source/fixture root: `test-fixtures/`
- Local-only private screenshots: `docs/portfolio/private/` or the report root.
- Public commit rule: commit scripts and sanitized docs only. Do not commit generated evidence.
- Public leak guard:
  `corepack pnpm run guard:roll20-evidence -- reports/roll20-actual-compare/<label>`
  must be run before committing a Roll20 actual-screen verification batch.

## Local Baseline Artifact Layout

`scripts/roll20_actual_local_baseline.mjs` writes this structure under the ignored run folder:

| Path | Use |
| --- | --- |
| `local-baseline-results.md` / `.json` | Local import/emit/payload summary and next Roll20 checklist. |
| `local-baseline/<fixture>/screenshots/local-preview.png` | Local preview root screenshot. |
| `local-baseline/<fixture>/screenshots/local-edit.png` | Local edit root screenshot. |
| `local-baseline/<fixture>/payload/sheet.html` | Emitted HTML for Custom Sheet Sandbox/test room. |
| `local-baseline/<fixture>/payload/sheet.css` | Emitted CSS for Custom Sheet Sandbox/test room. |
| `local-baseline/<fixture>/payload/translation.json` | Emitted translation payload, normalized to `{}` when empty. |
| `local-baseline/<fixture>/payload/sheet.json` | Minimal local verification manifest. |
| `local-baseline/<fixture>/upload.zip` | Convenience zip containing the payload files. |
| `actual-screenshot-diff/actual-screenshot-diff-results.md` / `.json` | Local-only screenshot comparison report generated after Roll20 screenshots are placed beside local baseline screenshots. Missing Roll20 screenshots are SKIP, not PASS. |
| `payload-audit/roll20-payload-audit-results.md` / `.json` | Local-only upload payload hygiene report. Must pass before Custom Sheet Sandbox/test-room upload. |
| `payload-roundtrip-visual/payload-roundtrip-visual-results.md` / `.json` | Local-only cleaned-payload re-import visual report. Must pass before Custom Sheet Sandbox/test-room upload. |
| evidence guard command output | Console-only safety result from `corepack pnpm run guard:roll20-evidence -- <run-dir>`. It must be PASS before upload/commit, but does not prove Roll20 visual parity. |

Passing this local baseline proves the selected fixture can be imported, emitted,
captured locally, and packaged for Roll20. It does not prove the generated sheet
matches Roll20 until the sandbox/test-room screenshot and chat/roll smoke are
captured and compared.

## Screenshot Diff Helper

After a Roll20 sandbox/test-room or solo-room screenshot is captured, save it next
to the local baseline screenshots using one of these names:

| Path | Meaning |
| --- | --- |
| `local-baseline/<fixture>/screenshots/roll20-sandbox.png` | Screenshot from Custom Sheet Sandbox or a new test room. |
| `local-baseline/<fixture>/screenshots/roll20-sandbox-root.png` | Normalized visible sheet-root crop from Custom Sheet Sandbox or a new test room. When present, diff/status helpers use this before the fallback `roll20-sandbox.png`. |
| `local-baseline/<fixture>/screenshots/roll20-sandbox-root-full-dpr-corrected.png` | Preferred stitched full-height sheet-root screenshot from Custom Sheet Sandbox or a new test room when Chrome screenshots were captured with DPR-corrected sheet-root clips. Diff/status/candidate helpers use this before legacy full-root, visible root, and viewport screenshots. |
| `local-baseline/<fixture>/screenshots/roll20-sandbox-root-full.png` | Legacy stitched full-height sheet-root screenshot. Use only as fallback when DPR-corrected evidence is missing, and audit it before renderer conclusions. |
| `local-baseline/<fixture>/screenshots/roll20-room.png` | Read-only screenshot from an existing solo room. |
| `local-baseline/<fixture>/screenshots/roll20-chat.png` | Rolltemplate/chat screenshot from Roll20. |

Then run:

```bash
node scripts/roll20_actual_screenshot_diff.mjs reports/roll20-actual-compare/<run-label>
```

The helper compares local preview screenshots against the actual Roll20
screenshots with a diagnostic crop search. The result is evidence for
classification, not an automatic visual parity claim. If a Roll20 screenshot is
missing, the target stays SKIP and must remain unverified.

A fallback `roll20-sandbox.png` viewport screenshot is not enough to enter the
diff. The diff helper must mark it `SUSPECT` unless adjacent positive iframe
DOM/root evidence proves the sheet rendered, such as
`roll20-sandbox-dom-evidence.json` with non-empty iframe/root markers or a
preferred root capture/manifest. This prevents endpoint-storage or blank-iframe
screenshots from being reported as visual comparisons.

The upload handoff helper follows the same rule. `--missing-only` must keep a
fixture visible when its only generated-sheet screenshot is a fallback viewport
without positive DOM/root evidence, because that fixture still lacks proven
Roll20 render evidence.

For Roll20 chat/rolltemplate checks, DOM evidence alone is not visual evidence.
`roll20-chat-dom-evidence.json` may prove that a message or rolltemplate marker
exists, but the generated-sheet gate still needs `roll20-chat.png` before chat
visual parity can be investigated. The strongest evidence is both files: the
PNG for visual comparison and the DOM sidecar tying that screenshot to a real
Roll20 message/rolltemplate.

The chat PNG and DOM sidecar must describe the same capture moment. Status,
handoff, and screenshot-diff helpers reject `roll20-chat.png` when the sidecar is
missing, lacks rendered rolltemplate markers, or is stale relative to the PNG.
Default Roll20 chat tips, invite text, or page-level screenshots are not accepted
as rolltemplate visual evidence.

The chat PNG must also prove foreground chat capture, not just a matching
timestamp and image scale. Roll20 character/dialog windows can overlap the broad
`#rightsidebar` area while the DOM sidecar still finds hidden or background chat
templates. Current probes must record `chatElementSelector`; older sidecars that
lack it are foreground-suspect and must be recaptured. Prefer a visible
`#textchat` or `.textchatcontainer` root. A broad `#rightsidebar` capture is
accepted only when the sidecar also proves the text chat tab/root is foreground.

On high-DPR Roll20 tabs, verify the screenshot coordinate space before trusting
CDP chat crops. A CSS `getBoundingClientRect()` clip can capture the wrong
screen region when the browser screenshot surface expects device-pixel
coordinates. If a debug crop shows the Sandbox Tools, VTT grid, or another
wrong region instead of the rolltemplate, multiply the CSS template rect by
`devicePixelRatio`, capture a physical PNG, then DPR-correct/downscale that PNG
back to the CSS clip size. Record this as `captureDprCorrection` in the sidecar
and rerun the capture plan/status gates. Do not tune ChatPane CSS from a crop
until the saved PNG visibly contains the intended rolltemplate.

When `status:roll20-actual` reports `missingGenerated=<fixture>:chat:<reason>`,
generate a focused chat recapture plan:

```bash
corepack pnpm run plan:roll20-chat-capture -- reports/roll20-actual-compare/<label> [fixture-id]
```

When chat screenshots already exist but `status:roll20-actual` reports stale
current row/typography/paint-filter sidecars, run the combined handoff:

```bash
corepack pnpm run handoff:roll20-chat-current -- reports/roll20-actual-compare/<label>
```

This runs the current-metrics audit, regenerates a `--require-current-metrics`
chat recapture plan, self-tests the probe shape, and writes an ignored local
handoff report. It is a recapture checklist only; it does not replace the
actual Roll20 `roll20-chat.png` and `roll20-chat-dom-evidence.json` evidence.

Before attempting CDP capture, run the CDP preflight:

```bash
corepack pnpm run preflight:roll20-cdp -- --run-dir reports/roll20-actual-compare/<label>
```

The preflight writes an ignored report, lists Roll20 tabs if the CDP endpoint is
reachable, and prints the exact Chrome/Edge launch command plus per-fixture
capture commands when the endpoint is closed. It does not launch a browser
unless `--launch` is passed, and it does not capture or upload evidence.
The preflight must only count real top-level Roll20 page targets. Third-party
iframes or service pages whose URL merely contains an encoded Roll20 referrer
must stay in the raw target list and must not be treated as Roll20 readiness
evidence.
The sheet-frame probe and chat capture helpers must use the same Roll20 page
filter as preflight; do not reintroduce raw substring page matching in later
capture steps.
`READY` means a matching Roll20 editor/campaign target is present; login and
challenge pages are reported separately as `LOGIN_REQUIRED` or
`CHALLENGE_OR_WAITING` and must not be used for capture.
When `--launch` is passed, the helper starts a visible Chrome/Edge window,
waits briefly, and rechecks the CDP endpoint. The ignored report records both
the initial status and post-launch status, so a fresh temp profile that lands on
`https://app.roll20.net/login` is recorded as `LOGIN_REQUIRED` instead of being
mistaken for capture readiness.
The CDP chat capture helper applies the same readiness guard before clicking or
probing the page. Use `corepack pnpm run test:roll20-chat-cdp-readiness` after
changing that classifier.

The plan writes ignored local output under
`reports/roll20-actual-compare/<label>/roll20-chat-capture-plan/`. It lists the
exact `roll20-chat.png` and `roll20-chat-dom-evidence.json` destinations,
suggested roll button names from the generated payload, follow-up commands, and
a browser-side DOM probe snippet. The generated snippet must include
`rolltemplates[].rect`, `clip`, `screenshotClipApplied`, and `chatCssEvidence`,
because `diagnose:roll20-chat-parity` uses those fields for normalized
rolltemplate crop comparison and CSS activation classification. This is
planning/snippet output only. It does not replace the actual Roll20 screenshot,
and it does not prove chat visual parity.

Before relying on a new version of the generated chat probe, run:

```bash
corepack pnpm run test:roll20-chat-capture-plan
```

This self-test executes the generated snippet against a fake Roll20 chat DOM and
verifies the expected evidence shape. It proves only that the capture helper can
emit the required fields; it does not prove that Roll20 has been captured or
that local chat rendering matches Roll20.

Use `corepack pnpm run status:roll20-actual -- <run-dir> --require-actual` after
the diff helper when a work batch claims actual-screen coverage. This command
does not prove visual parity by itself; it proves whether the generated-sheet
`roll20-sandbox.png` and `roll20-chat.png` evidence files and diffs exist or
whether the batch is still blocked/missing evidence. `roll20-room.png` is
reported separately as read-only solo-room observation evidence, not as the
required generated-sheet upload gate.

After the diff helper, run the difference classifier before changing renderer
CSS:

```bash
corepack pnpm run classify:roll20-actual -- reports/roll20-actual-compare/<run-label>
```

The classifier separates viewport/crop/sheet-size issues, Roll20 sandbox
sanitize/prefix rewrites, default attr/state hints, asset URL proxying, and
missing chat/room evidence. Its output is triage only. It must not be reported as
visual parity.

When a preferred `roll20-sandbox-root.png` has adjacent crop metadata, the
classifier must keep two signals separate: the crop may still be only the
visible top of a tall Roll20 sheet, and the compared visible viewport may still
have its own mismatch. Treat a matched visible viewport mismatch as a concrete
CSS/assets/default-state investigation target, but do not use it as proof of
full-sheet parity.

For a matched visible viewport mismatch, run the local crop diagnostic:

```bash
corepack pnpm run diagnose:roll20-visible-crop -- reports/roll20-actual-compare/<run-label>
```

This writes ignored crop/overlay PNGs and reports whether simple top-aligned
horizontal crop drift explains the mismatch. A low crop gain means the next
inspection should focus on actual/local CSS, default state, asset rendering, and
Roll20 scale/layout context. The diagnostic is still local-only triage, not
visual parity.

If Chrome can capture the visible Roll20 editor but the character iframe
document cannot be read, save a full viewport screenshot plus measured
iframe/dialog metadata under the ignored screenshot folder, then crop a
preferred sheet-root image:

```bash
corepack pnpm run crop:roll20-actual -- --image <viewport.png> --meta <meta.json> --out <roll20-sandbox-root.png> --rect iframeRect --inset-css left,top,right,bottom
```

This crop is diagnostic. If it captures only the visible top of a tall sheet,
classify the result as partial-height viewport/crop evidence. If the diff helper
also compares against a matching local visible viewport, inspect any remaining
visible-crop mismatch separately, then capture a full-height/scroll-stitched
Roll20 sheet root before making any full-sheet parity claim.

When Chrome/CDP can read and scroll the character iframe or its Roll20
`#dialog-window` scroller, capture multiple viewport segments and stitch them
into the preferred full-height root evidence:

Before recapturing a fixture that is currently missing trusted full-root
evidence, generate a local-only capture handoff plan:

```bash
corepack pnpm run plan:roll20-root-capture -- reports/roll20-actual-compare/<run-label> [fixture-id]
```

The plan report stays under the ignored run folder. It lists missing required
files, existing diagnostic-only captures, successful trusted manifests from the
same run, follow-up commands, and a browser metrics snippet for collecting
iframe/root geometry. This is planning evidence only; it is not visual parity.

```bash
corepack pnpm run stitch:roll20-actual-root -- --manifest <roll20-root-stitch-manifest.json> --out <roll20-sandbox-root-full-dpr-corrected.png>
```

The manifest and segment PNGs are local-only evidence. They must remain under
`reports/roll20-actual-compare/<label>/...` and must not be committed. A stitched
image changes the comparison from visible-top evidence to fuller root evidence,
but it is still diagnostic until the mismatch is classified.

When the capture uses DPR-corrected Chrome sheet-root clips, write the stitched
output as `roll20-sandbox-root-full-dpr-corrected.png`. The diff/status/
classifier/full-root candidate helpers prefer this file over the older
`roll20-sandbox-root-full.png`.

When the browser screenshot API returns pixels in a coordinate scale that does
not match `devicePixelRatio`, prefer clipped root-segment screenshots. Save each
visible root slice with Chrome's screenshot `clip`, then set `"cropImage": "full"`
for that segment in the stitch manifest. This makes the stitcher draw the whole
clipped image into the CSS destination rectangle and avoids confusing Roll20
geometry evidence with browser screenshot scaling artifacts.

Before treating any stitched full-root file as sheet-root evidence, audit the
metadata:

```bash
corepack pnpm run audit:roll20-root-stitch -- reports/roll20-actual-compare/<run-label>
```

This audit must pass before renderer CSS conclusions are drawn from stitched
full-root evidence. A failed audit means the evidence can include Roll20 VTT
toolbar/grid context, missing top/bottom sheet segments, or screenshot scale
mismatch. In that case, recapture with sheet-root-only clipping first. If
trusted DPR-corrected evidence exists, older suspect full-root metadata is
recorded as superseded rather than blocking the fixture.

2026-06-19 Chrome observation note: the Roll20 editor character iframe exposed
`.charactersheet` via CDP `DOM.getBoxModel` at about `852px` CSS width and
`4122px` CSS height. Chrome screenshots needed `devicePixelRatio` correction
for clean sheet-only clipping; uncorrected full-image clipped segments scaled
`682px` source width into `852px` destination width and visibly included VTT
grid/toolbar context. Treat that older stitched evidence as suspect.

When the iframe DOM/CSS remains unreadable, run the context diagnostic after the
diff/classifier/crop diagnostics:

```bash
corepack pnpm run diagnose:roll20-visible-context -- reports/roll20-actual-compare/<run-label>
```

This command consolidates local preview size/state, actual iframe/crop metadata,
Roll20 sandbox sanitize rewrites, visible-crop gain, and chat DOM-vs-screenshot
evidence into ranked hypotheses. It is a triage report only. It must not be used
as a substitute for actual iframe computed-style evidence, full-height root
capture, or a trustworthy chat screenshot.

When the next question is whether the mismatch is mostly caused by the measured
Roll20 visible frame/inset context, run:

```bash
corepack pnpm run smoke:roll20-same-context-visible -- reports/roll20-actual-compare/<run-label>
```

This renders local payload candidates with normal preview, local Sandbox expected
sanitize, measured frame inset, and fit-to-visible-width captures, then compares
them against the existing actual Roll20 root crop. If these candidates do not
materially improve the mismatch, do not keep tuning crop/inset guesses; move to
actual computed-style/state/asset evidence and full-height Roll20 capture.

If Chrome/Playwright frame access or a CDP isolated execution world can read the
Roll20 character iframe, save local-only JSON probes under:

```text
reports/roll20-actual-compare/<run-label>/live-iframe-probe/<fixture-id>-iframe-metrics.json
reports/roll20-actual-compare/<run-label>/live-iframe-probe/<fixture-id>-computed-styles.json
```

The computed-style probe should include the actual default state, root rect,
root computed style, and representative selectors such as `html`, `body`,
`form.sheetform`, `.charactersheet`, `.sheet-fullsheet`, `.sheet-combat`,
`table`, `input`, and Roll20 buttons. Then rerun:

```bash
corepack pnpm run smoke:roll20-same-context-visible -- reports/roll20-actual-compare/<run-label>
```

When the matching probe file exists, the smoke report compares actual iframe
computed styles against the best local candidate. Treat these CSS differences as
renderer root-cause evidence, but still not as visual parity. Keep the JSON files
ignored and never commit actual Roll20 sheet source, screenshots, or probe
outputs.

## Chrome Safety

- Use existing Chrome/Roll20 login state only for the requested verification.
- Do not inspect cookies, local storage, passwords, or session stores.
- Do not read private room/chat contents beyond what is necessary to identify that the room is safe for observation.
- Confirm before creating a new Roll20 room or submitting sheet code if the action has not already been explicitly authorized for that exact destination.
- Existing solo rooms are for default-state/wrapper/chat observation only. Generated sheets go to Custom Sheet Sandbox first, then a new test room only when sandbox evidence is insufficient.

## Dedicated Sandbox Upload Fallback

Use this fallback only in the dedicated verification Custom Sheet Sandbox or a
new test room created for verification. Do not use it on existing real rooms.

Chrome file chooser automation may fail with `fileChooser.setFiles failed: Not
allowed`. The Roll20 in-editor `Sheet Sandbox Tools` file inputs were observed to
read the chosen file with `FileReader`, then POST base64 source to:

```text
/sheetsandbox/savesheetsettings
```

Observed payload shape:

```json
{
  "campaignid": "<sandbox campaign id>",
  "html": "<base64 sheet HTML>"
}
```

The same endpoint accepts `css` and `translation` keys. After the HTML/CSS/
translation source is saved, the settings page must still save a Sheet.json
manifest through `textarea[name=customcharsheet_json]`; otherwise Roll20 can
store the source but the character iframe may not load the custom sheet.

When writing `customcharsheet_json` through the settings-page fallback, fill it
with the settings-page wrapper shape `{ sheet, userOptions, jsoninfo }` derived
from the export payload's `sheet.json`. A 2026-06-21 live recheck showed that
writing the plain exported `sheet.json` text directly can make `/editor` return
an `unexpected token` JSON parse error around `{ "html": "sheet.html", ... }`.
If Roll20 later changes this contract, update this document only after a live
settings-save -> editor-reload check proves the new shape. Endpoint/file-input
success and a settings-page success message remain storage/configuration
evidence only until a fresh character iframe DOM/root screenshot proves the
custom sheet actually rendered.

2026-06-20 recheck: the settings page may keep the real JSON source in an Ace
editor registry named `editors.json`. Updating only
`textarea[name="customcharsheet_json"]` can leave the Ace editor holding the
previous fixture manifest, which then saves stale sheet metadata. Generated
upload snippets must set both the textarea/value targets and
`editors.json.setValue(text, -1)` when that object is present, then record
`aceJsonSet` and `editorKeys` in the local ignored handoff log. Do not directly
POST a hand-built `FormData(settingsform)` as a shortcut; the real
`#save-changes-button` path performs Roll20's page-side serialization and avoids
corrupting the editor's advanced settings JSON.

For legacy official sheets, preserve the source `sheet.json` legacy mode. A
fixture whose official manifest declares `"legacy": true` must not be uploaded
with a generated `"legacy": false` manifest. Also note that endpoint `200`
responses are not enough for legacy coverage: AW2E returned `200` for generated
and official source payloads but still produced an empty character iframe in the
dedicated sandbox. A later YSHY restore through the same endpoint path also
returned `200` but reopened blank, so treat this fallback as storage-only until
a fresh iframe DOM/root check proves activation. Use the browser file-input
upload path, a complete settings-form save path, or another verified Roll20
sandbox condition before treating such a fixture as rendered.

Agents must record this as an external Roll20 sandbox side effect in
`docs/operations/35_agent_progress_log.md`. The fallback proves only that the
payload reached the dedicated sandbox. It does not prove visual parity until a
trustworthy `roll20-sandbox.png` and, separately, rolltemplate/chat evidence are
captured and diffed.

## File Upload Gotcha

Roll20 Custom Sheet Sandbox uploads HTML, CSS, and Translation through browser
file inputs in the in-editor `Sheet Sandbox Tools` dialog. Browser automation
may be unable to operate the native chooser, but file-URL extension permission
is not part of Roll20's upload contract. Generate the local upload helper:

```bash
corepack pnpm run snippet:roll20-upload -- [reports/roll20-actual-compare/<label>] [fixture-id]
```

The snippet creates browser `File` objects and dispatches `change` on Roll20's
actual inputs. Live inspection on 2026-07-16 confirmed the delegated handler
uses `FileReader`, sends form-encoded base64 source to
`/sheetsandbox/savesheetsettings`, and reloads sheet data/open characters. The
explicit endpoint fallback runs only when the file-input handler did not run.
Do not submit both paths.

The generated source and report stay under the ignored run folder. After save
and editor reload, run the generated activation checker. Its expected
`modern|legacy` mode comes from `sheet.json` unless explicitly overridden. A
`RUNTIME_MODE_MISMATCH`, parse error, missing sheet body, or unproven iframe
blocks screenshot promotion.

When an existing ignored report is locked, generate a fresh handoff without
rewriting it:

```bash
corepack pnpm run snippet:roll20-upload -- <run-dir> <fixture-id> --out-dir <ignored-local-folder>
```

The activation checker includes bounded `renderEvidence` for every accessible
sheet document: root geometry/scroll size, top-level rows and direct-child
computed styles, focused-control state, and representative attribute values.
Keep this output local-only. Compare modern and legacy results independently;
the evidence is intended to separate state/focus differences from real
mode-specific layout differences before a renderer patch.

If the dedicated sandbox upload fallback above is used instead of file chooser
upload, still keep the handoff/checklist and status commands current. Screenshot
evidence remains the gate; endpoint success alone is not Roll20 visual parity.
Fallback viewport screenshots are not enough by themselves: `roll20-sandbox.png`
must have positive iframe DOM/root sidecar evidence, or the status command will
report it as `SUSPECT` and exclude it from generated actual evidence counts.
DPR-corrected full-root/root captures with their JSON sidecars/manifests remain
the preferred evidence.

## 2026-07-16 Export Dialog Runtime Note

- The export dialog selects the same modern/legacy compatibility state used by preview/edit and writes it to `sheet.json` plus `README.txt`.
- The browser smoke rejects the stale file-permission instruction and requires the preview/export mode-sync explanation. Zip readiness remains local-only; Roll20 visual parity still requires matching-runtime Sandbox/test-room screenshots.

## 2026-06-19 Sandbox Upload Snippet Fallback

- Added `scripts/roll20_upload_snippet.mjs` and package command `corepack pnpm run snippet:roll20-upload`.
- The helper writes ignored, local-only snippets under `reports/roll20-actual-compare/<label>/roll20-upload-handoff/snippets/`.
- The generated snippet embeds source-derived payload bytes and must not be committed.
- Use only in the dedicated Roll20 Custom Sheet Sandbox editor/settings page. It creates browser `File` objects and dispatches `change` events on `#sheetHtml`, `#sheetCss`, and `#sheetTranslation`, then fills `customcharsheet_json` when that field exists.
- The generated upload and activation snippets derive the expected modern/legacy runtime from `sheet.json` by default. `RUNTIME_MODE_MISMATCH` blocks visual capture; use `--expected-runtime-mode modern|legacy` only when intentionally overriding the manifest for diagnosis.
- The helper also writes a matching `*-activation-check-snippet.js`. After save/reload, run that checker on `https://app.roll20.net/editor`; capture Roll20 root/chat evidence only after it returns `VISIBLE_MATCH` and the visible sheet/chat is clearly the intended fixture. `ROLL20_EDITOR_PARSE_ERROR` and `NOT_PROVEN` both block evidence capture.
- By default, generated upload snippets are non-submitting helpers. Use `corepack pnpm run snippet:roll20-upload -- <run-dir> <fixture-id> --apply-settings --endpoint-campaign-id <id>` only for the dedicated Sandbox/test room when an agent intentionally needs a snippet that POSTs the endpoint fallback and clicks the settings save button.
- When filling `customcharsheet_json`, the generated snippet uses the settings-page `{ sheet, userOptions, jsoninfo }` wrapper. The plain exported `sheet.json` text is a known-bad path for the current verified Sandbox settings page because it caused a live `/editor` parse error on 2026-06-21.
- On settings pages with an Ace editor, the generated snippet must also update `editors.json`; the logged `aceJsonSet` field is evidence that the real settings editor was touched.
- Run `corepack pnpm run test:roll20-upload-snippet` after changing upload snippet generation. It fails if the settings-page manifest builder regresses back to the plain exported `sheet.json` shape or if the generated activation checker no longer distinguishes `VISIBLE_MATCH`, `ROLL20_EDITOR_PARSE_ERROR`, and `NOT_PROVEN`.
- The snippet report validates `translation.json`, `sheet.json`, and the generated settings-page manifest before embedding them. If Roll20 still displays a translation JSON parse warning after a PASS report, treat it as an upload/settings application problem until a fresh Roll20-side sidecar proves otherwise.
- The snippet runtime logs visible Roll20 Sandbox warning text after dispatching the file changes. Preserve that console result in the local ignored report notes when diagnosing translation/i18n failures.
- This reproduces the observed Roll20 delegated file-input handler without controlling the native chooser. It is not Roll20 visual parity and still requires fresh matching-runtime sandbox root/chat screenshots plus status/diff gates afterward.

## 2026-07-18 Browser-Side Synthetic Upload Confirmation

- The native chooser remained unavailable to the browser control surface, so a
  local-only synthetic payload was applied through the observed file-input
  handler path in the dedicated solo verification room.
- Fresh evidence confirmed the Roll20 character-sheet iframe rendered the
  translated synthetic title/label, input, and roll button. Clicking the roll
  button produced a real chat entry with the expected template fields and a
  resolved result.
- This is modern Sandbox runtime evidence for one anonymous synthetic payload.
  It does not prove full visual parity, asset completeness, worker parity, or
  the separate legacy-room contract. Keep the screenshot/payload ignored.

## 2026-07-18 Legacy Room Synthetic Smoke

- The dedicated solo legacy verification room had Roll20's legacy sanitization
  option checked before saving the synthetic payload.
- After saving synthetic HTML/CSS/translation, the reopened character iframe
  rendered the translated title/label, an input, and a roll button.
- Clicking the roll button produced a scoped chat DOM entry with the expected
  test field and a resolved result.
- The observed dialog wrapper used Roll20's `ui-dialog` widget classes; the
  iframe measured 900px by approximately 673.55px in this legacy mode.
- Screenshot and JSON sidecar remain local ignored evidence only. This smoke
  proves a legacy runtime path, not full visual parity, universal mapping,
  worker parity, or asset completeness.

## 2026-07-19 Modern Sandbox Activation Recheck

- VERIFIED: A fresh anonymous synthetic modern payload was opened in the
  dedicated Sandbox character viewer. The real iframe exposed the translated
  sheet title/label, input, and `type="roll"` control.
- VERIFIED: The live authored surface measured `850 x 260` inside the `900px`
  Roll20 iframe. The surrounding `#dialog-window` used the Roll20 viewer
  wrapper and measured `900px` wide by approximately `365.6px` high in this
  synthetic state.
- VERIFIED: Clicking the roll control produced a real chat entry using the
  default rolltemplate, with `Test` and a resolved `Result 5` observed in the
  chat DOM.
- EVIDENCE: Keep the screenshot and metrics in the ignored local directory
  `reports/roll20-actual-compare/live-browser/2026-07-19-synthetic-modern/`.
  Do not promote them to tracked or public assets.
- LIMIT: This proves modern Sandbox activation and chat runtime smoke for one
  anonymous payload. It does not prove visual parity for arbitrary imports,
  asset/worker parity, or legacy support. Those remain separate gates.

## 2026-07-19 Local Root Contract Cross-Check

- VERIFIED: The local `buildSheetDoc` render of the same anonymous payload
  matched the external Sandbox root metrics: `900px` iframe width, `850px`
  authored width, `260px` authored height, static positioning, visible
  overflow, two controls, and one roll button.
- CLASSIFIED: Full Roll20 viewer height is larger because its nav/tab chrome is
  present. The local product preview hides that chrome by design, so comparison
  must crop to the authored sheet root instead of treating outer dialog height
  as parity evidence.
- EVIDENCE: The local result is stored in the ignored
  `sandbox-local-compare.json` sidecar in the synthetic-modern evidence folder.
- LIMIT: Root geometry agreement is not pixel parity. Asset decoding, complete
  CSS paint, worker behavior, and legacy-room comparison remain unverified.

## 2026-07-19 Root-Only PNG Capture and Diff

The first trustworthy root-only image comparison for the anonymous modern
Sandbox payload was completed. The character iframe was measured at `900px`,
the authored root at `850 x 260`, and the browser zoom at `1.25`. CDP captured
the root as a true PNG at physical `1063 x 325`; the local render used the same
device scale. The capture metadata records a one-pixel x/y crop alignment
correction caused by the browser zoom coordinate space.

The normalized diagnostic result is `5,686 / 345,475` pixels above RGB
threshold `60`, `1.6458%` mismatch, RMS RGB `10.654`. This is evidence for the
anonymous synthetic root only. It must not be promoted to arbitrary sheet
parity: Roll20 viewer chrome, chat/rolltemplate paint, asset loading, worker
runtime, user-imported sources, and the legacy-enabled room still require
independent evidence.

All images and sidecars remain ignored under
`reports/roll20-actual-compare/live-browser/2026-07-19-synthetic-modern/`.

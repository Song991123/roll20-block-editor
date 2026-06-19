# 37. Roll20 Actual-Screen Verification

Date: 2026-06-18

This document defines how agents verify that this editor's preview/edit output matches what Roll20 actually shows. It is intentionally strict because Roll20 rooms may contain private campaign material and real sheet assets.

## Goal

- Confirm whether local preview/edit renders match Roll20's actual sheet display.
- Separate observation of existing rooms from applying our generated sheet.
- Keep all real room screenshots, uploaded sheet source, exports, and generated reports local-only.

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
file inputs in the in-editor `Sheet Sandbox Tools` dialog. If Chrome reports
`fileChooser.setFiles failed: Not allowed`, enable local file access for the
Codex Chrome extension:

1. Open `chrome://extensions`.
2. Open Details for the Codex extension.
3. Enable `Allow access to file URLs`.
4. Return to the Roll20 sandbox editor and retry the upload.

If the upload remains blocked, generate a local handoff checklist:

```bash
corepack pnpm run handoff:roll20-upload -- [reports/roll20-actual-compare/<label>] [fixture-id]
```

If the run folder is omitted, the handoff script selects the newest PASS
pre-upload run. Agents must not try to bypass Chrome's blocked
`chrome://extensions` automation page; the user must enable file URL access
manually when that browser policy blocks inspection.

The checklist stays under the ignored run folder and lists exact payload files,
screenshot destinations, and the diff command to run after screenshots exist.

If the dedicated sandbox upload fallback above is used instead of file chooser
upload, still keep the handoff/checklist and status commands current. Screenshot
evidence remains the gate; endpoint success alone is not Roll20 visual parity.
Fallback viewport screenshots are not enough by themselves: `roll20-sandbox.png`
must have positive iframe DOM/root sidecar evidence, or the status command will
report it as `SUSPECT` and exclude it from generated actual evidence counts.
DPR-corrected full-root/root captures with their JSON sidecars/manifests remain
the preferred evidence.

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
   - The pre-upload gate reruns payload hygiene, Roll20 sandbox sanitize diagnostics, cleaned-payload visual roundtrip, default-state selector audit, asset/resource audit, and evidence guard. Passing means the payload is ready to upload; it still does not prove Roll20 visual parity.
   - If the local baseline was captured with action/control-state hints, pass the same state map through the pre-upload gate:
     `corepack pnpm run verify:roll20-preupload -- reports/roll20-actual-compare/<label> --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json`
   - `--state-map` affects only local screenshot state normalization for baseline/payload comparison. It may click a local action button or local checkbox/radio control before screenshot capture. It does not mutate the Roll20 upload payload files.
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
| `local-baseline/<fixture>/screenshots/roll20-sandbox-root.png` | Preferred normalized sheet-root crop from Custom Sheet Sandbox or a new test room. When present, diff/status helpers use this before the fallback `roll20-sandbox.png`. |
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

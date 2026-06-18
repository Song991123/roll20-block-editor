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
   - Then run cleaned-payload visual roundtrip before uploading:
     `corepack pnpm run smoke:payload-roundtrip -- reports/roll20-actual-compare/<label> --out-dir ./out --base-path /roll20-block-editor`
   - The payload roundtrip smoke must pass before upload. It re-imports the cleaned Roll20 payload, captures a preview screenshot, and compares it against the local baseline preview so export-only cleanup cannot silently change the sheet before Roll20 sees it.
   - Then run the local evidence guard before any Roll20 upload:
     `corepack pnpm run guard:roll20-evidence -- reports/roll20-actual-compare/<label>`
   - The guard must pass. It verifies that copied fixtures, generated reports, private screenshots, and public example folders are not tracked/staged, and that the local baseline, payload audit, and cleaned-payload roundtrip outputs exist for the selected run.
   - Or run the full local pre-upload gate:
     `corepack pnpm run verify:roll20-preupload -- reports/roll20-actual-compare/<label> --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor`
   - The pre-upload gate reruns payload hygiene, cleaned-payload visual roundtrip, default-state selector audit, asset/resource audit, and evidence guard. Passing means the payload is ready to upload; it still does not prove Roll20 visual parity.
   - If the local baseline was captured with action-state hints, pass the same state map through the pre-upload gate:
     `corepack pnpm run verify:roll20-preupload -- reports/roll20-actual-compare/<label> --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor --state-map reports/visual-state-candidates/visual-state-candidates-state-map.json`
   - `--state-map` affects only local screenshot state normalization for baseline/payload comparison. It does not mutate the Roll20 upload payload files.
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

## Chrome Safety

- Use existing Chrome/Roll20 login state only for the requested verification.
- Do not inspect cookies, local storage, passwords, or session stores.
- Do not read private room/chat contents beyond what is necessary to identify that the room is safe for observation.
- Confirm before creating a new Roll20 room or submitting sheet code if the action has not already been explicitly authorized for that exact destination.
- Existing solo rooms are for default-state/wrapper/chat observation only. Generated sheets go to Custom Sheet Sandbox first, then a new test room only when sandbox evidence is insufficient.

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
corepack pnpm run handoff:roll20-upload -- reports/roll20-actual-compare/<label> [fixture-id]
```

The checklist stays under the ignored run folder and lists exact payload files,
screenshot destinations, and the diff command to run after screenshots exist.

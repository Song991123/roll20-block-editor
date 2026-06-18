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

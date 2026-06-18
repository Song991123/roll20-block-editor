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

## Chrome Safety

- Use existing Chrome/Roll20 login state only for the requested verification.
- Do not inspect cookies, local storage, passwords, or session stores.
- Do not read private room/chat contents beyond what is necessary to identify that the room is safe for observation.
- Confirm before creating a new Roll20 room or submitting sheet code if the action has not already been explicitly authorized for that exact destination.

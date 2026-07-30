# 38. Current Project Status

Date: 2026-07-30

This is an anonymous handoff snapshot. It contains no real sheet names,
creator names, source URLs, screenshots, private room identifiers, or
source-derived measurements. Private evidence, when needed, stays in ignored
local output and is deleted after the verification batch.

## Current Evidence

- LOCAL PASS: Anonymous synthetic preview/edit rendering is exact in both
  modern and legacy local contracts for the current regression fixture.
- LOCAL PASS: The pre-upload gate passed local baseline generation, payload
  hygiene, Sandbox-sanitize approximation, cleaned-payload roundtrip, state
  selectors, asset checks, and evidence guard.
- LOCAL PASS: The persistent iframe/edit overlay path, worker separation,
  hidden runtime nodes, roll control simulation, and structured layer drops
  have dedicated smoke coverage.
- EXTERNAL PARTIAL: The Roll20 `Sheet Sandbox Tools` dialog was visible and
  the anonymous synthetic HTML/CSS/Translation file events were dispatched.
  Roll20 reported modern runtime, but no visible sheet root, iframe, form,
  attribute, or roll button appeared afterward.
- EXTERNAL BLOCKED: The supported native file chooser timed out and reset the
  browser connection. No Sandbox screenshot or generated-sheet parity diff was
  captured.
- LEGACY VERIFY OPEN: Legacy output must be checked separately in a dedicated
  legacy-enabled test room. A modern Sandbox result cannot satisfy that gate.

## Status Matrix

| Area | Status | Evidence boundary |
| --- | --- | --- |
| Universal HTML/CSS/translation mapping | VERIFY/PARTIAL | Synthetic and local regression paths exist; arbitrary official/community/custom coverage is not proven. |
| Future JS/worker preservation | VERIFY/PARTIAL | Separate workspace/export and hidden-runtime smokes pass locally; actual Roll20 worker execution is not proven. |
| Modern local preview/edit surface | VERIFY/GOOD_LOCAL | Preview and edit share the persistent iframe surface with an edit-only overlay. |
| Modern Roll20 Sandbox render | BLOCKED_EXTERNAL | Upload dispatch occurred, but visible sheet activation and screenshot evidence are missing. |
| Legacy Roll20 render | VERIFY/OPEN | Requires a separate dedicated legacy-enabled destination and current evidence. |
| Rolltemplate/chat parity | VERIFY/SYNTHETIC_ONLY | Local chat simulation works; actual template-by-template visual parity is unproven. |
| Asset loading/relink | VERIFY/PARTIAL | Safety checks and relink guidance exist; user-owned HTTP(S) asset targets are required for real asset-paint comparison. |
| Figma-like edit UX | VERIFY/PARTIAL | Flow/free placement, before/inside/after drops, layer roles, and canvas controls exist; broad imported-sheet UX still needs polish. |
| Public copyright safety | VERIFY/ONGOING | Real or derived sheets, screenshots, fixtures, and reports are excluded from the public tree. |

## Goal Progress

These are planning estimates, not completion claims.

| Area | Current estimate | Remaining proof |
| --- | ---: | --- |
| Local edit/drop UX | 60% | More direct-manipulation polish and broader anonymous regression coverage. |
| Local preview/edit synchronization | 70% | More arbitrary DOM structures and asset/state combinations. |
| Actual Roll20 renderer reproduction | 35% | A visible modern Sandbox render and a separate legacy-room render with normalized comparison. |
| Actual Roll20 chat/rolltemplate reproduction | 30% | Current generated-sheet chat/template evidence and scoped visual comparison. |
| Whole user-ready product | 45% | Actual Roll20 gates, broader mapping coverage, asset policy completion, and Figma-like polish. |

## Not Safe To Claim

- Full Roll20 visual parity.
- All official/community/custom sheets are supported.
- Full worker JS or rolltemplate parity.
- Full legacy Roll20 visual parity.
- Edit mode is fully Figma-like for arbitrary imported sheets.

## Next P0

1. Recover a stable visible Sandbox upload path or open a dedicated Sandbox
   character sheet after a user-assisted upload.
2. Capture positive sheet-root, runtime-state, input, roll-control, and chat
   evidence before any parity comparison.
3. Keep legacy verification separate in a dedicated legacy-enabled room.
4. Do not promote global renderer or ChatPane CSS from synthetic/local evidence.
5. Keep every source-derived payload and report local-only, then remove it
   after the verification batch.

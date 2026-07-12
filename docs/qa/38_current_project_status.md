# 38. Current Project Status and ETA

Date: 2026-06-21

This is a compact status snapshot for handoff and planning. It must not be used to claim full Roll20 visual parity. Generated reports and private sheet evidence remain local-only and ignored.

## Current Status Summary

| Area | Status | Current Evidence | Meaning |
| --- | --- | --- | --- |
| Local import/export baseline | VERIFY/PARTIAL | Existing local baseline/preupload reports pass for the active `2026-06-18-state-map-v1` run. | Prepared fixtures can be imported, emitted, packaged, and checked locally. This is not actual Roll20 parity. |
| Local preview vs edit | VERIFY/GOOD_LOCAL | `smoke:preview-edit-visual` PASS on 2026-06-21: AW2E `1.86%`, Les-Oublies `2.07%`, YSHY `1.02%`. | Preview/edit share enough local rendering behavior to keep improving edit UX, but exact Roll20 parity is still unproven. |
| Actual Roll20 sheet root | VERIFY/PARTIAL | `status:roll20-actual`: `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, but AW2E still has a high root-cutoff risk superseded only by diagnostic scroll-metrics evidence. | Sheet-root evidence exists for the prepared fixtures, but renderer promotion still needs cautious cross-fixture interpretation. |
| Actual Roll20 chat/rolltemplate | DOING/BLOCKED_CAPTURE | `generatedActualScreenshots=4/6`, `generatedDiffed=4/6`, `chatNeedsNormalizedCapture=2`, missing AW2E/YSHY trusted chat captures. | This is the biggest current Roll20 parity blocker. DOM-only or page-only screenshots are not accepted. |
| Renderer promotion | BLOCKED | `gate:roll20-renderer-action`: `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererBlockers=9`, `rendererReady=NO`. | No production Roll20 renderer CSS/chat patch should be promoted yet. |
| Edit-mode UX | VERIFY/PARTIAL | Edit smoke and imported-edit sync evidence cover flow/free drops, before/inside/after layer modes, imported fixture movement, direct canvas width editing, and separated sheet/rolltemplate canvas widths. | Usable pieces exist, but it still needs more direct-manipulation polish, clearer layer visualization, and broader fixture coverage. |
| Public copyright safety | VERIFY/ONGOING | Evidence guard passes and real fixtures/reports remain ignored. | Current workflow is respecting the rule that real sheets and screenshots must not be committed. |

## Progress Compared With Goal Start

These percentages are coarse planning estimates based on current gates, not completion claims.

| Area | Goal-start Estimate | Current Estimate | Why |
| --- | ---: | ---: | --- |
| Local edit/drop UX | 20% | 58-68% | Flow drop, absolute drop, before/inside/after layer modes, frame-relative free placement, layer structure visibility, and direct canvas width controls now pass smoke checks. |
| Local preview/edit visual sync | 20-30% | ~70% | Current fixture smoke is `1.02-2.07%` mismatch, enough for continued UX work but not actual Roll20 parity. |
| Actual Roll20 sheet-root reproduction | 0-10% | 55-65% | Trusted/reliable full-root evidence is `3/3`, but AW2E root evidence still has diagnostic/cutoff caveats. |
| Actual Roll20 chat/rolltemplate reproduction | 0-5% | 25-35% | Some evidence and diagnostics exist, but trustworthy generated chat capture is still `4/6` with `2` normalized captures needed. |
| Whole user-ready product goal | 10-15% | 35-45% | The foundation is real now, but renderer promotion, broader sheet coverage, legacy mode proof, and Figma-like polish are still incomplete. |

## Latest Measured Commands

```text
corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1
=> PARTIAL_GENERATED_ACTUAL_SCREENSHOTS
=> generatedActualScreenshots=4/6
=> generatedDiffed=4/6
=> trustedFullRoot=3/3
=> chatNeedsNormalizedCapture=2
=> rendererReady=NO

corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1
=> HOLD_PRODUCTION_RENDERER_PATCH
=> rendererBlockers=9

corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336
=> PASS official-roll20-AW2E mismatch=1.86%
=> PASS official-roll20-Les-Oublies mismatch=2.07%
=> PASS yshy-commission-1bu mismatch=1.02%

corepack pnpm run smoke:edit-flow -- --port 4352
=> PASS canvasWidthControl sheet 850 -> 930
=> PASS rolltemplate canvas width 280
=> PASS returning to sheet restores width 930
```

## What Is Actually Usable Today

- Users can import prepared Roll20 sheet HTML/CSS/translation into the local app path.
- Local preview/edit rendering is close enough for development on the current 3 prepared fixtures.
- Export/payload readiness and safety gates exist.
- Edit mode has working foundations for direct manipulation, layer rows, flow/free placement, and before/inside/after insertion.
- Edit mode exposes fixed-canvas controls: sheet width starts at 850px, rolltemplate width starts at 280px, and users can switch between fit zoom and 100%.
- Worker scripts and rolltemplates are separated from visible sheet nodes in local pipelines.

## What Is Not Yet Safe To Claim

- Do not claim Roll20 visual parity.
- Do not claim all official/community/custom sheets are supported.
- Do not claim Roll20 chat/rolltemplate parity.
- Do not claim the production renderer is ready.
- Do not claim edit mode is fully Figma-like.
- Do not claim legacy Roll20 mode is proven in actual Roll20.

## Realistic ETA

These are planning estimates, not promises. They assume focused work and no new Roll20 platform blocker.

| Target | Estimate | Exit Criteria |
| --- | ---: | --- |
| Evidence-safe MVP checkpoint | 2-4 working days | AW2E/YSHY trusted chat captures are recaptured or clearly replaced by a verified adapter; renderer gate blockers are reduced and documented; no false evidence path remains. |
| Usable private alpha for the current 3 prepared fixtures | 5-9 working days | Import/export, local preview/edit, Roll20 root/chat comparison, and edit UX smoke are coherent enough that a user can test real sheets without agents hand-holding every step. |
| Broader beta across mixed official/custom sheets | 2-4 weeks | More fixtures from official and user corpora pass mapping, local preview/edit, export, legacy-mode routing, and Roll20 sandbox checks without private assets being committed. |
| "All sheets work" level | Not currently estimable as a short task | Requires a much larger corpus matrix, unsupported Roll20 edge-case policy, legacy/new sheet split, worker/runtime coverage, asset handling policy, and repeated actual Roll20 verification. Treat this as a product program, not a few-day fix. |

## Next P0 Work

1. Get trustworthy AW2E and YSHY `roll20-chat.png` evidence.
   - Preferred: CDP-enabled Roll20 tab with `probe:roll20-sheet-frame` followed by `capture:roll20-chat-cdp`.
   - Current 2026-07-12 handoff improvement: `capture:roll20-chat-cdp --plan-only` now prints the exact sheet-frame probe command and gated capture command for each fixture.
   - Current 2026-07-12 preflight improvement: `preflight:roll20-cdp` now also prints probe commands before capture commands.
   - Alternative: build and verify a full-screenshot crop adapter that proves the saved PNG visibly contains the foreground text chat panel.
2. Keep renderer patches on hold until chat/root evidence supports them.
3. Continue edit-mode UX polish in parallel:
   - clearer layer target visualization,
   - less delayed-feeling drag commits,
   - stronger imported-sheet direct manipulation smoke,
   - better frame/container affordances for users who do not understand DOM trees.

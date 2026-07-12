# 38. Current Project Status and ETA

Date: 2026-07-13

This is a compact status snapshot for handoff and planning. It must not be used to claim full Roll20 visual parity. Generated reports and private sheet evidence remain local-only and ignored.

## Current Status Summary

| Area | Status | Current Evidence | Meaning |
| --- | --- | --- | --- |
| Local import/export baseline | VERIFY/PARTIAL | Existing local baseline/preupload reports pass for the active `2026-06-18-state-map-v1` run. | Prepared fixtures can be imported, emitted, packaged, and checked locally. This is not actual Roll20 parity. |
| Local preview vs edit | VERIFY/GOOD_LOCAL | `smoke:preview-edit-visual` PASS on 2026-07-13: AW2E `1.86%`, Les-Oublies `2.07%`, YSHY `1.02%`. `smoke:imported-edit-sync` also passes for the prepared fixtures. | Preview/edit share enough local rendering behavior to keep improving edit UX, but exact Roll20 parity is still unproven. |
| Actual Roll20 sheet root | VERIFY/PARTIAL | `status:roll20-actual`: `trustedFullRoot=3/3`, `reliableTrustedFullRoot=3/3`, but AW2E still has a high root-cutoff risk superseded only by diagnostic scroll-metrics evidence. | Sheet-root evidence exists for the prepared fixtures, but renderer promotion still needs cautious cross-fixture interpretation. |
| Actual Roll20 chat/rolltemplate | DOING/HIGH_MISMATCH | `status:roll20-actual` now reports `generatedActualScreenshots=6/6`, `generatedDiffed=6/6`, `generatedAuthoritative=YES`, `chatCaptureSuspects=0`, `chatNormalizedCompared=3/3`, and `chatNeedsNormalizedCapture=0`. However, same-structure high mismatch remains `2/3`, max aligned mismatch `20.68%`. | Capture/evidence plumbing is no longer the main blocker. The current blocker is renderer/model parity for AW2E and YSHY chat templates. |
| Renderer promotion | BLOCKED | `gate:roll20-renderer-action`: `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererBlockers=8`, `rendererReady=NO`. The gate also reports asset-relink blockers for AW2E/YSHY and split template scopes `.sheet-rolltemplate-aw` vs `.sheet-rolltemplate-coc`. | No production Roll20 renderer CSS/chat patch should be promoted yet. Global ChatPane tweaks are specifically unsafe. |
| Runtime visibility | VERIFY/GOOD_LOCAL | `verify:runtime-visibility` PASS on 2026-07-13. It wraps worker workspace separation, worker state smoke, Sandbox expected-preview runtime stripping, preview/edit visible-runtime-node checks, and local rolltemplate chat smoke. | Local preview/edit no longer show raw worker/rolltemplate source for the prepared fixtures, while local chat simulation still works. This is not actual Roll20 parity. |
| Edit-mode UX | VERIFY/PARTIAL | Edit smoke and imported-edit sync evidence cover flow/free drops, before/inside/after layer modes, imported fixture movement, direct canvas width editing, and separated sheet/rolltemplate canvas widths. | Usable pieces exist, but it still needs more direct-manipulation polish, clearer layer visualization, and broader fixture coverage. |
| Public copyright safety | VERIFY/ONGOING | Evidence guard passes and real fixtures/reports remain ignored. | Current workflow is respecting the rule that real sheets and screenshots must not be committed. |

## Progress Compared With Goal Start

These percentages are coarse planning estimates based on current gates, not completion claims.

| Area | Goal-start Estimate | Current Estimate | Why |
| --- | ---: | ---: | --- |
| Local edit/drop UX | 20% | 58-68% | Flow drop, absolute drop, before/inside/after layer modes, frame-relative free placement, layer structure visibility, and direct canvas width controls now pass smoke checks. |
| Local preview/edit visual sync | 20-30% | ~70% | Current fixture smoke is `1.02-2.07%` mismatch, enough for continued UX work but not actual Roll20 parity. |
| Actual Roll20 sheet-root reproduction | 0-10% | 60-70% | Trusted/reliable full-root evidence is `3/3`, but AW2E still relies on diagnostic scroll-metrics replacement for safe interpretation. |
| Actual Roll20 chat/rolltemplate reproduction | 0-5% | 40-50% | Capture quality improved to authoritative `6/6` generated screenshots/diffs with `3/3` normalized chat comparisons, but AW2E/YSHY still mismatch visually and renderer remains held. |
| Whole user-ready product goal | 10-15% | 45-55% | Evidence plumbing and local editing are much stronger, but actual Roll20 renderer promotion, asset relink, broader sheet coverage, legacy mode proof, and Figma-like polish are still incomplete. |

## Latest Measured Commands

```text
corepack pnpm run status:roll20-actual -- reports\roll20-actual-compare\2026-06-18-state-map-v1
=> GENERATED_ACTUAL_SCREENSHOTS_DIFFED
=> generatedActualScreenshots=6/6
=> generatedDiffed=6/6
=> generatedAuthoritative=YES
=> chatCaptureSuspects=0
=> trustedFullRoot=3/3
=> reliableTrustedFullRoot=3/3
=> chatNeedsNormalizedCapture=0
=> chatSameStructureHighMismatch=2/3
=> chatSameStructureMaxAlignedMismatch=20.68%
=> rendererReady=NO

corepack pnpm run gate:roll20-renderer-action -- reports\roll20-actual-compare\2026-06-18-state-map-v1
=> HOLD_PRODUCTION_RENDERER_PATCH
=> rendererBlockers=8
=> asset relink blocks AW2E/YSHY chat background judgment
=> split template scopes block global ChatPane CSS

corepack pnpm run smoke:preview-edit-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/preview-edit-visual --port 4336
=> PASS official-roll20-AW2E mismatch=1.86%
=> PASS official-roll20-Les-Oublies mismatch=2.07%
=> PASS yshy-commission-1bu mismatch=1.02%

corepack pnpm run smoke:edit-flow -- --port 4352
=> PASS canvasWidthControl sheet 850 -> 930
=> PASS rolltemplate canvas width 280
=> PASS returning to sheet restores width 930

corepack pnpm run verify:runtime-visibility -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/runtime-visibility-verify --port 4389
=> PASS worker-workspace
=> PASS worker-state
=> PASS sandbox-preview-runtime-hidden
=> PASS preview-edit-runtime-hidden
=> PASS rolltemplate-chat
```

## What Is Actually Usable Today

- Users can import prepared Roll20 sheet HTML/CSS/translation into the local app path.
- Local preview/edit rendering is close enough for development on the current 3 prepared fixtures.
- Export/payload readiness and safety gates exist.
- Edit mode has working foundations for direct manipulation, layer rows, flow/free placement, and before/inside/after insertion.
- Edit mode exposes fixed-canvas controls: sheet width starts at 850px, rolltemplate width starts at 280px, and users can switch between fit zoom and 100%.
- Worker scripts and rolltemplates are separated from visible sheet nodes in local pipelines, and `verify:runtime-visibility` now checks that path in one command.

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

1. Resolve asset relink blockers for AW2E/YSHY.
   - Current `plan:roll20-chat-browser-paint` result is `BROWSER_PAINT_BLOCKED_BY_RELINK`.
   - Fill the ignored `asset-relink-map-template.txt` with user-owned HTTP(S) replacement URLs before treating background/image mismatch as renderer evidence.
2. Build narrower chat renderer models instead of global ChatPane CSS.
   - AW2E: `.sheet-rolltemplate-aw` message/content width plus exact text metrics.
   - YSHY/CoC: `.sheet-rolltemplate-coc` table intrinsic, sanitize-order, and font-context model.
3. Keep production renderer patches on hold until `gate:roll20-renderer-action` allows promotion.
4. Continue edit-mode UX polish in parallel:
   - clearer layer target visualization,
   - less delayed-feeling drag commits,
   - stronger imported-sheet direct manipulation smoke,
   - better frame/container affordances for users who do not understand DOM trees.

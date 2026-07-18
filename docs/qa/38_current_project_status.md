# 38. Current Project Status and ETA

Date: 2026-07-19

This is a compact status snapshot for handoff and planning. It must not be used to claim full Roll20 visual parity. Generated reports and private sheet evidence remain local-only and ignored.

## Superseding Evidence: 2026-07-18

- ACTUAL ROLL20 SYNTHETIC: A browser-side synthetic HTML/CSS/translation
  payload rendered in both a modern solo Sandbox room and a dedicated
  legacy-enabled solo room. Both rendered the translated title/label, input,
  and roll control; both produced a scoped Roll20 chat entry with a resolved
  result. The legacy room had `legacy_sanitization` checked before save.
- LOCAL SYNTHETIC PREVIEW/EDIT: The same anonymous payload passed the live app
  smoke in both `modern` and `legacy` modes with `870x280` preview/edit roots,
  exact pixel diff (`0` mismatched pixels), `0` computed-style differences,
  `0` visible-geometry differences, translation `2/2`, and visible runtime
  nodes `0`.
- CLAIM BOUNDARY: These are synthetic runtime and local synchronization gates,
  not full visual parity. They do not prove every official/custom sheet,
  asset loading, worker parity, rolltemplate parity, or normalized screenshot
  equivalence against Roll20.
- EVIDENCE LOCATION: Screenshots, payloads, and JSON sidecars stay under
  ignored `.tmp/`; no real or third-party sheet source is public.

### Root Geometry Recheck

- ACTUAL LEGACY: The dedicated legacy synthetic `.charactersheet` root was
  measured at `860x280` inside a `900px` iframe, with no scroll overflow.
- LOCAL: The matching preview/edit root is `870x280`; local preview/edit
  remains exact against itself, but it is 10px wider than the actual legacy
  inner root.
- GATE: The normalized comparison now correctly reports
  `legacy rootGeometry=FAIL`, while modern remains
  `rootGeometry=NOT_COMPARABLE` until its inner root is measured.
- INTERPRETATION: The synthetic runtime contract is active, but the renderer
  still has a concrete crop/width mismatch. No visual parity claim is allowed.

### Live Solo Room Geometry: 2026-07-19

- ACTUAL LEGACY OBSERVATION: In the dedicated `Codex Roll20 Legacy Verify`
  room (`0 players`), a real character viewer exposed a sheet root of
  `860x280` inside a `900px` iframe. The outer Roll20 dialog measured
  `906.8x429.8px`; the root was `position: static` and `overflow: visible`.
- ACTUAL MODERN OBSERVATION: In the solo `[3팀]아무도 없는 섬 Copy` room
  (`0 players`), a real character viewer exposed a sheet root of
  `850x1992.16` inside a `900px` iframe. The outer dialog measured
  `906.8x379.8px`; the root was `position: relative` and `overflow: hidden`.
- ACTUAL BASELINE: Both live iframes loaded Roll20 jquery-ui, `base.css`,
  `charsheet.css`, and inline sheet CSS. This confirms that the local renderer
  contract needs both wrapper geometry and the baseline CSS family, not only a
  copied sheet stylesheet.
- PRIVATE EVIDENCE: Screenshots and metrics are stored only under the ignored
  `reports/roll20-actual-compare/live-browser/2026-07-19-solo-room-observation/`.
- LIMIT: These observations measure Roll20's real runtime and sheet roots; they
  do not yet prove that our exported payload matches either sheet. Sandbox or
  dedicated-room anonymous export upload plus normalized screenshot diff is
  still required.

## Current Status Summary

| Area | Status | Current Evidence | Meaning |
| --- | --- | --- | --- |
| Local import/export baseline | VERIFY/PARTIAL | Existing local baseline/preupload reports pass for the active `2026-06-18-state-map-v1` run. | Prepared fixtures can be imported, emitted, packaged, and checked locally. This is not actual Roll20 parity. |
| Local preview vs edit | VERIFY/GOOD_LOCAL | `smoke:preview-edit-visual` PASS on 2026-07-13: AW2E `1.86%`, Les-Oublies `2.07%`, YSHY `1.02%`. `smoke:imported-edit-sync` also passes for the prepared fixtures. | Preview/edit share enough local rendering behavior to keep improving edit UX, but exact Roll20 parity is still unproven. |
| Actual Roll20 sheet root | VERIFY/PARTIAL | Live solo-room observation now measures both a modern root (`850x1992.16`) and legacy root (`860x280`) inside `900px` iframes, with `906.8px` outer dialogs. | Real wrapper/root contracts are known for two rooms, but our anonymous export has not yet been applied and diffed in Roll20. |
| Actual Roll20 chat/rolltemplate | VERIFY/SYNTHETIC_ONLY | The modern and legacy synthetic roll control produced real scoped chat entries with resolved results. Existing prepared-fixture mismatch reports remain historical/fixture-specific evidence. | Chat runtime plumbing works for the synthetic contract; actual template-by-template visual parity remains unproven. |
| Renderer promotion | BLOCKED | `gate:roll20-renderer-action`: `HOLD_PRODUCTION_RENDERER_PATCH`, `rendererBlockers=8`, `rendererReady=NO`. The gate also reports asset-relink blockers for AW2E/YSHY and split template scopes `.sheet-rolltemplate-aw` vs `.sheet-rolltemplate-coc`. | No production Roll20 renderer CSS/chat patch should be promoted yet. Global ChatPane tweaks are specifically unsafe. |
| Asset relink / browser paint | BLOCKED_BY_USER_ASSET_URLS | `plan:roll20-asset-relink` reports `RELINK_MAP_REQUIRED`: AW2E and YSHY are `MISSING_RELINK`. `plan:roll20-chat-browser-paint` reports `BROWSER_PAINT_BLOCKED_BY_RELINK`. Import/export can generate commented relink drafts, export smoke verifies the draft path, and placeholder targets are now rejected/count as `미입력` instead of being applied. The CLI relink plan also keeps placeholder maps at `MISSING_RELINK` with `mapEntries=0`. | The product can guide users toward the needed map and avoids false relink readiness, but it still needs real user-owned HTTP(S) replacement URLs before background/paint pixels can be judged or renderer CSS promoted for those fixtures. |
| Roll20 CDP readiness | VERIFY/READY_NO_CAPTURE_PLANNED | `preflight:roll20-cdp` on 2026-07-13 reports `READY`, `targets=8`, `roll20Targets=2`, `plannedFixtures=0`, and writes to ignored temp fallback when the canonical report folder is read-only. | Browser/CDP plumbing is reachable, but the current capture plan has no missing/stale fixtures. Do not recapture blindly; continue renderer/template/asset diagnostics unless a fresh live capture is explicitly needed. |
| Runtime visibility | VERIFY/GOOD_LOCAL | `verify:runtime-visibility` PASS on 2026-07-13. It wraps worker workspace separation, worker state smoke, Sandbox expected-preview runtime stripping, preview/edit visible-runtime-node checks, and local rolltemplate chat smoke. | Local preview/edit no longer show raw worker/rolltemplate source for the prepared fixtures, while local chat simulation still works. This is not actual Roll20 parity. |
| Edit-mode UX | VERIFY/PARTIAL | Edit smoke and imported-edit sync evidence cover flow/free drops, before/inside/after layer modes, imported fixture movement, direct canvas width editing, separated sheet/rolltemplate canvas widths, and layer-row mini-maps for droppable frame rows. | Usable pieces exist, but it still needs more direct-manipulation polish, richer layer visualization on real imported sheets, and broader fixture coverage. |
| Public copyright safety | VERIFY/ONGOING | Evidence guard passes and real fixtures/reports remain ignored. | Current workflow is respecting the rule that real sheets and screenshots must not be committed. |

## Progress Compared With Goal Start

These percentages are coarse planning estimates based on current gates, not completion claims.

| Area | Goal-start Estimate | Current Estimate | Why |
| --- | ---: | ---: | --- |
| Local edit/drop UX | 20% | 58-68% | Flow drop, absolute drop, before/inside/after layer modes, frame-relative free placement, layer structure visibility, and direct canvas width controls now pass smoke checks. |
| Local preview/edit visual sync | 20-30% | ~70% | Current fixture smoke is `1.02-2.07%` mismatch, enough for continued UX work but not actual Roll20 parity. |
| Actual Roll20 sheet-root reproduction | 0-10% | 65-75% | Live modern and legacy authored roots are now measured from solo rooms; export application and normalized parity against those roots remain open. |
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

corepack pnpm run preflight:roll20-cdp -- --run-dir reports\roll20-actual-compare\2026-06-18-state-map-v1
=> READY
=> targets=8
=> roll20Targets=2
=> plannedFixtures=0
=> report write fallback to ..\_tmp_codex_smoke because canonical reports folder is read-only
=> next: do not recapture blindly; continue renderer/template/asset diagnostics unless a fresh capture is intentional

corepack pnpm run plan:roll20-asset-relink -- reports\roll20-actual-compare\2026-06-18-state-map-v1 --map-file ..\_tmp_codex_smoke\asset-relink-empty-map.txt
=> RELINK_MAP_REQUIRED
=> AW2E MISSING_RELINK
=> YSHY MISSING_RELINK
=> report/template fallback to ..\_tmp_codex_smoke because canonical reports folder is read-only

corepack pnpm run plan:roll20-chat-browser-paint -- reports\roll20-actual-compare\2026-06-18-state-map-v1
=> BROWSER_PAINT_BLOCKED_BY_RELINK
=> AW2E BLOCKED_BY_ASSET_RELINK
=> YSHY BLOCKED_BY_ASSET_RELINK
=> Les-Oublies PAINT_SECONDARY_NO_BACKGROUND_IMAGE

corepack pnpm run smoke:legacy-fixture-visual -- --port 4410
=> 95.9s
=> PASS official-roll20-AW2E risk=0->0 diff=16.90%
=> PASS official-roll20-Les-Oublies risk=1->0 diff=0.04%
=> PASS yshy-commission-1bu risk=0->0 diff=35.73%
=> LEGACY FIXTURE VISUAL SMOKE PASS
=> diagnostic modern/legacy diff only; not actual Roll20 parity

corepack pnpm run diagnose:roll20-chat-renderer-policy -- reports\roll20-actual-compare\2026-06-18-state-map-v1
=> HOLD_GLOBAL_CHAT_RENDERER_PATCH
=> AW2E NEEDS_NEW_DIAGNOSTIC_MODEL
=> YSHY NEEDS_NARROW_TEMPLATE_MODEL
=> global candidate promotion remains rejected

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
- Import and export dialogs can generate local-only commented asset relink drafts for external/relative URLs.
- If a placeholder target is uncommented by mistake, the app warns and refuses to apply it as a replacement URL.
- Edit mode has working foundations for direct manipulation, layer rows with compact structure mini-maps, flow/free placement, and before/inside/after insertion.
- Edit mode exposes fixed-canvas controls: sheet width starts at 850px, rolltemplate width starts at 280px, and users can switch between fit zoom and 100%.
- The layer panel now supports one-level outward extraction for nested
  statement blocks, preserving the remaining inner chain and outer order.
- Worker scripts and rolltemplates are separated from visible sheet nodes in local pipelines, and `verify:runtime-visibility` now checks that path in one command.

## What Is Not Yet Safe To Claim

- Do not claim Roll20 visual parity.
- Do not claim all official/community/custom sheets are supported.
- Do not claim Roll20 chat/rolltemplate parity.
- Do not claim the production renderer is ready.
- Do not claim edit mode is fully Figma-like.
- Do not claim full legacy Roll20 visual parity. Only the dedicated synthetic
  legacy runtime path is currently proven.

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
   - better frame/container affordances for users who do not understand DOM trees,
   - browser-level smoke for layer insertion followed by outward extraction.

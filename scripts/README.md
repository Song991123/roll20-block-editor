# Script Index

Date: 2026-06-14

Run scripts from the project root unless noted otherwise.

## Common Commands

| Command | Purpose |
| --- | --- |
| `corepack pnpm run lint` | Lint the app. |
| `corepack pnpm run build` | Production build/type check. |
| `node scripts/visual_reference_inventory.mjs` | Inventory visual reference candidates. |
| `node scripts/prepare_visual_fixture.mjs <inventory_json> <out_root> <selector>` | Copy selected source sheets into workspace-owned visual fixtures. |
| `node scripts/prepare_explicit_fixture.mjs <fixture_root> <fixture_id> --html <path> --css <path> [--i18n <path>]` | Copy an explicit sheet into a fixture. |
| `node scripts/render_visual_fixture_doc.mjs` | Render prepared visual fixtures into standalone preview HTML. |
| `node scripts/make_visual_diff_pages.mjs` | Build visual diff pages and diagnostics. |
| `corepack pnpm run diff:visual-fixtures` | Generate visual diff pages, run them in headless Chromium, collect `visual-fixture-diff-results.md/.json`, and write a heuristic cause classification report. This automates reference-image diagnostics but is still not a Roll20 visual parity gate. |
| `corepack pnpm run classify:visual-fixtures -- reports/visual-fixture-diff test-fixtures/visual` | Rebuild only the visual diff cause classification from an existing diff result. Writes ignored `visual-fixture-diff-classification.md/.json`. |
| `node scripts/make_cascade_leak_pages.mjs` | Build browser-computed CSS cascade diagnostic pages from rendered fixture HTML. |
| `node scripts/live_shadow_cascade_smoke.mjs --out-dir ./out --report-dir reports/live-shadow-cascade [--only <fixtureId>]` | Live static app smoke for preview/edit Shadow DOM CSS winners after real browser import. Needs `corepack pnpm run build` first. |
| `node scripts/preview_edit_visual_smoke.mjs --out-dir ./out --report-dir reports/preview-edit-visual [--only <fixtureId>]` | Live static app screenshot smoke comparing imported fixture preview root vs edit root. Writes local-only screenshots and pixel diagnostics; not a Roll20 parity gate. Needs `corepack pnpm run build` first. |
| `node scripts/imported_edit_sync_smoke.mjs --out-dir ./out --report-dir reports/imported-edit-sync [--only <fixtureId>]` | Live static app smoke for imported real-fixture edit drag: tries visible imported nodes, verifies edit and preview land on the same block position, and checks emitted HTML/CSS position data. Not a Roll20 parity gate. Needs `corepack pnpm run build` first. |
| `node scripts/rolltemplate_chat_smoke.mjs --out-dir ./out --report-dir reports/rolltemplate-chat-smoke [--only <fixtureId>]` | Browser smoke for preview iframe roll button -> ChatPane rolltemplate rendering. Writes local-only chat screenshots/results; not actual Roll20 chat parity. Needs `corepack pnpm run build` first. |
| `corepack pnpm run audit:worker -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/worker-source-audit` | Browser import/export audit for source `<script type="text/worker">` preservation. Writes local-only results and treats exact worker body preservation as the gate; not actual Roll20 worker runtime parity. Needs `corepack pnpm run build` first. |
| `node scripts/roll20_actual_compare_manifest.mjs [run-label]` | Create an ignored local checklist/report scaffold for Roll20 room/sandbox/test-room comparison evidence. |
| `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --report-dir reports/roll20-actual-compare --run-label <label> [--only <fixtureId>]` | Import ignored fixtures through the static app, capture local preview/edit screenshots, and write Roll20 Sandbox payload files plus `upload.zip` into ignored `reports/roll20-actual-compare/<label>/`. Needs `corepack pnpm run build` first. |
| `corepack pnpm run audit:payload -- reports/roll20-actual-compare/<label>` | Audit generated Roll20 upload payloads for app UI/edit overlay/internal id leakage, JSON validity, and zip/file consistency. Local-only hygiene gate; not actual Roll20 visual parity. |
| `corepack pnpm run audit:state-selectors -- --fixtures test-fixtures/visual --payload-run reports/roll20-actual-compare/<label> --report-dir reports/state-selector-audit` | Audit hidden/value/checked CSS state selectors against source HTML controls and generated payload controls. Catches default-tab/default-state anchor loss; not visual parity. |
| `corepack pnpm run audit:assets -- --fixtures test-fixtures/visual --payload-run reports/roll20-actual-compare/<label> --report-dir reports/asset-resource-audit` | Scan fixture/payload HTML/CSS asset URLs and probe HTTP(S) reachability with no referrer. Catches payload-introduced missing/failed asset regressions; not visual parity. |
| `corepack pnpm run guard:roll20-evidence -- reports/roll20-actual-compare/<label>` | Check that private fixtures/reports/examples are not tracked/staged and that a Roll20 actual-screen run has local baseline, payload audit, and cleaned-payload roundtrip evidence before sandbox/test-room upload. This is a safety guard, not a parity claim. |
| `corepack pnpm run handoff:roll20-upload -- reports/roll20-actual-compare/<label> [fixture-id]` | Create an ignored local upload checklist with exact Roll20 Sandbox payload paths, screenshot destinations, and the screenshot diff command. Use when Chrome blocks automated file upload. |
| `corepack pnpm run verify:roll20-preupload -- reports/roll20-actual-compare/<label> --fixtures test-fixtures/visual --out-dir ./out --base-path /roll20-block-editor` | Run the full local pre-upload gate: payload audit, cleaned-payload visual roundtrip, state selector audit, asset audit, and evidence guard. Passing means ready to upload, not Roll20 visual parity. |
| `corepack pnpm run audit:legacy-export -- --report-dir reports/legacy-export-audit` | Audit the synthetic legacy export path: modern CSS remains untouched, legacy CSS runs through `sanitizeForRoll20Legacy`, and `ExportDialog` only writes `sanitize-warnings.json` in legacy mode. Local-only sanitizer/export routing gate; not actual Roll20 legacy visual parity. |
| `corepack pnpm run smoke:legacy-preview -- --report-dir reports/legacy-preview-smoke` | Smoke the local preview/edit legacy CSS toggle through `buildSheetDoc` and `buildSheetParts` with synthetic CSS. Confirms iframe and Shadow/edit render paths consume `legacyCssSanitize`; not actual Roll20 legacy visual parity. |
| `corepack pnpm run smoke:legacy-fixture-visual -- --out-dir ./out --base-path /roll20-block-editor --fixtures test-fixtures/visual --report-dir reports/legacy-fixture-visual` | Import ignored fixtures into the static app, capture preview iframe screenshots with legacy CSS sanitize off/on, and verify that legacy-risk CSS is reduced when applicable. Local-only visual smoke; not actual Roll20 legacy visual parity. |
| `corepack pnpm run smoke:export-dialog -- --out-dir ./out --base-path /roll20-block-editor --report-dir reports/export-dialog-smoke` | Static-app browser smoke for header import/export actions and the Roll20 export readiness panel. Confirms the export dialog opens, readiness items render, the actual-verification badge is visible, and main mode tab clicks still work. |
| `corepack pnpm run smoke:payload-roundtrip -- reports/roll20-actual-compare/<label> --out-dir ./out --base-path /roll20-block-editor` | Re-import cleaned Roll20 payload files through the static app and compare payload preview screenshots against the local baseline screenshots. Local-only pre-upload visual gate; not actual Roll20 visual parity. |
| `node scripts/roll20_actual_screenshot_diff.mjs reports/roll20-actual-compare/<label>` | Compare local baseline screenshots against local-only Roll20 screenshots named `roll20-sandbox.png`, `roll20-room.png`, or `roll20-chat.png`. Missing Roll20 screenshots are SKIP, not PASS. |
| `node scripts/serve_static_dir.mjs <root_dir> [port]` | Serve workspace-owned reports/fixtures over localhost for browser verification. |
| `node scripts/run_selected_roundtrip.mjs` | Run selected Node-side roundtrip checks. |
| `node scripts/edit_flow_browser_smoke.mjs --out-dir ./out --report-dir reports/edit-flow-smoke` | Headless-browser smoke for the flow drop slice: perf-hook append paths plus real dragover/drop DragEvents on the edit canvas. Needs `corepack pnpm run build` first and a playwright chromium-headless-shell install. |
| `node scripts/browser_roundtrip_smoke.mjs --out-dir ./out --report-dir reports/roundtrip-browser [--only <fixtureId>]` | Browser L2 roundtrip: importSheet -> emit -> re-import -> compare (block ids stripped) over `test-fixtures/visual/*`. Same build/browser prerequisites as the edit-flow smoke. |

## Output Rules

- Scripts should write local evidence to ignored `reports/<pipeline>/`.
- Temporary build files should go under `.tmp/`.
- Copied external sheet files should go under ignored `test-fixtures/`.
- Do not commit generated reports, fixture HTML, source screenshots, or copied sheet assets.
- Scripts must not mutate external source folders.

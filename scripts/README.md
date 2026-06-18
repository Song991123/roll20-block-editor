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
| `node scripts/make_cascade_leak_pages.mjs` | Build browser-computed CSS cascade diagnostic pages from rendered fixture HTML. |
| `node scripts/live_shadow_cascade_smoke.mjs --out-dir ./out --report-dir reports/live-shadow-cascade [--only <fixtureId>]` | Live static app smoke for preview/edit Shadow DOM CSS winners after real browser import. Needs `corepack pnpm run build` first. |
| `node scripts/preview_edit_visual_smoke.mjs --out-dir ./out --report-dir reports/preview-edit-visual [--only <fixtureId>]` | Live static app screenshot smoke comparing imported fixture preview root vs edit root. Writes local-only screenshots and pixel diagnostics; not a Roll20 parity gate. Needs `corepack pnpm run build` first. |
| `node scripts/roll20_actual_compare_manifest.mjs [run-label]` | Create an ignored local checklist/report scaffold for Roll20 room/sandbox/test-room comparison evidence. |
| `node scripts/roll20_actual_local_baseline.mjs --out-dir ./out --report-dir reports/roll20-actual-compare --run-label <label> [--only <fixtureId>]` | Import ignored fixtures through the static app, capture local preview/edit screenshots, and write Roll20 Sandbox payload files plus `upload.zip` into ignored `reports/roll20-actual-compare/<label>/`. Needs `corepack pnpm run build` first. |
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

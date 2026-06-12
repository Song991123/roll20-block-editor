# Script Index

Date: 2026-06-12

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
| `node scripts/serve_static_dir.mjs <root_dir> [port]` | Serve workspace-owned reports/fixtures over localhost for browser verification. |
| `node scripts/run_selected_roundtrip.mjs` | Run selected Node-side roundtrip checks. |

## Output Rules

- Scripts should write durable evidence to `reports/<pipeline>/`.
- Temporary build files should go under `.tmp/`.
- Copied external sheet files should go under `test-fixtures/`.
- Scripts must not mutate external source folders.

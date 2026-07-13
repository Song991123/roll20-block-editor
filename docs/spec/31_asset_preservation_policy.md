# 31. Asset Preservation Policy

Date: 2026-07-13

This project must not redistribute real Roll20 sheet assets, but visual parity cannot be judged honestly when a source image URL has already become a Roll20/Imgur placeholder. Asset handling is therefore a product requirement, not a renderer afterthought.

## Evidence Trigger

Current Roll20 chat evidence shows this failure mode:

- Local and actual Roll20 background CSS declarations can match.
- Local and actual Roll20 proxy bytes can also match.
- The original source URL can still resolve to a tiny placeholder such as `removed.png`.
- In that case, changing ChatPane CSS cannot recover the intended original sheet image.

Use:

```powershell
corepack pnpm run diagnose:roll20-chat-background-assets -- reports\roll20-actual-compare\<label>
corepack pnpm run plan:roll20-chat-assets -- reports\roll20-actual-compare\<label>
corepack pnpm run plan:roll20-asset-relink -- reports\roll20-actual-compare\<label> --map-file <local-map.txt>
```

## Product Requirements

| Priority | Requirement | Reason |
| --- | --- | --- |
| P0 | Export and verification UI must warn when external image/font URLs are present. | `zip` export does not embed those assets, so Roll20 may load a placeholder or different proxy result. |
| P0 | If an imported sheet references dead external assets, the app must ask the user to relink or rehost them before claiming visual parity. | A dead source URL is outside CSS renderer control. |
| P0 | Do not commit copied third-party sheet assets, screenshots, or generated fixture reports. | Public repo must remain copyright-safe. |
| P1 | Add a local-only asset replacement map for verification and export. | Users need a path to replace dead URLs with their own hosted/local-approved assets. |
| P1 | Keep asset evidence in ignored `reports/` or `test-fixtures/`. | Verification needs evidence, but public commits must stay clean. |

## Current Implementation

- Export dialog has a local-only URL replacement map using `old URL => new URL` lines.
- The map rewrites the local preview iframe, edit Shadow render, final export payload HTML/CSS, and the export-side sandbox diagnostics/preflight view.
- The app does not download, embed, publish, or commit the referenced assets.
- The zip includes only a small `asset-replacements.json` summary with counts/warnings, not the original URL list.
- Browser smoke verifies a synthetic replacement reaches both preview iframe `srcdoc` and edit Shadow DOM render without leaking the original URL.
- Import-side and export-side detection can generate a commented replacement-map draft from detected external/relative asset refs. The draft is inert until the user replaces `<paste-user-owned-https-url-here>` with a user-owned hosted URL and removes the comment marker.
- If a draft placeholder target is accidentally uncommented, the replacement parser rejects it, reports a warning, and counts it as `placeholderTargets` instead of applying it to preview/edit/export output.
- The current replacement map is persisted in the IndexedDB autosave/manual-save XML under preview metadata and restored through the autosave recovery banner.
- Browser smoke verifies the synthetic replacement map is saved into IndexedDB, survives reload, and is restored into `previewStore`.
- The export dialog can save named local-only replacement-map profiles. Profiles store URL replacement text only, not image/font bytes, and are persisted in the autosave/manual-save XML so users can switch between sheet-specific relink sets during repeated verification.
- `plan:roll20-asset-relink` can check an exported/copied replacement-map text file against current asset-preservation blockers. It reports whether each required fixture is missing a relink, uses a local-only data URL, or is ready for local preview/edit/export plus Roll20 Sandbox re-comparison.
- The export dialog can copy the active replacement-map text or save it as a local txt file. The text file is the handoff format for `plan:roll20-asset-relink --map-file`; it stores URL rules only and no asset bytes.
- `plan:roll20-asset-relink` also writes an ignored `asset-relink-map-template.txt` beside its report. The template lists commented candidate source/proxy URL rules for unresolved blockers, so the user can fill user-owned HTTP(S) targets without agents copying asset bytes into the repo.
- `roll20_actual_local_baseline.mjs` and `verify:roll20-preupload` accept `--asset-map-file <local-map.txt>`. When provided, the map is applied to local preview/edit screenshots and to the emitted Roll20 upload payload HTML/CSS before Sandbox comparison.
- Multi-project named asset libraries, replacement history, and Roll20-side rehost verification are still TODO.

## UI Behavior

Export/import checks should distinguish:

- `external-url`: the sheet references an HTTP(S) asset.
- `roll20-proxy-url`: the sheet already references `imgsrv.roll20.net`.
- `imgur-page-url`: the sheet references an Imgur page-style URL that may not be a stable direct image.
- `relative-url`: the sheet references a local relative asset path that is not in the Roll20 zip.
- `placeholder-risk`: current diagnostics show the source/proxy resolves to a placeholder.

The user-facing wording should be plain:

> This sheet uses external images or fonts. Roll20 will fetch them again when the sheet is loaded. If a source image was deleted or blocked, Roll20 may show a placeholder. Relink or rehost those assets before treating the preview as final.

## Renderer Rule

When `plan:roll20-chat-assets` reports `SOURCE_ASSET_LOST_RELINK_REQUIRED`, keep renderer CSS on hold. Do not promote width, font, paint, or background-size candidates until the asset source is relinked or the mismatch is explicitly classified as acceptable placeholder behavior.

## Safety Rule

The app may help the user identify and replace asset URLs, but it must not silently upload, publish, or commit real sheet assets. Replacement maps and downloaded verification files must stay local-only unless the user explicitly provides copyright-safe assets for public use.

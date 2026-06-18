# Reports Index

Date: 2026-06-14

`reports/` is a local verification output folder. Generated report files are ignored by Git because they may contain real Roll20 sheet names, derived HTML, screenshots, asset URLs, or private fixture details.

Keep this README as the only public index unless the user explicitly approves a sanitized report artifact.

## Local Report Types

| Folder | Local Scope |
| --- | --- |
| `corpus-static-audit/` | Static inventory of local source corpora and risk flags. |
| `roundtrip-node/` | Node-side import/emit diagnostics for selected local fixtures. |
| `roundtrip-browser/` | Browser-side import/emit roundtrip diagnostics. |
| `edit-flow-smoke/` | Browser evidence for edit-mode drag/drop behavior. |
| `mapping-fidelity/` | Source-vs-emit token audits for selected private fixtures. |
| `visual-reference-inventory/` | Local reference image inventory. |
| `visual-fixture-render/` | Standalone fixture HTML render output. |
| `visual-fixture-diff/` | Browser screenshot/pixel-diff diagnostics. |
| `cascade-leak/` | Standalone preview CSS cascade diagnostics. |
| `live-shadow-cascade/` | Live app preview/edit Shadow DOM cascade diagnostics. |
| `roll20-actual-compare/` | Local Roll20 room/sandbox/test-room screenshot comparison and classification notes. |

## Evidence Rules

- A local report can support an internal TODO claim, but it should not be published automatically.
- A successful render means the pipeline produced HTML, not that the sheet is visually identical to Roll20.
- Pixel diff scores are diagnostic until viewport, crop, default state, assets, and translations are normalized.
- Legacy CSS sanitize must be reported separately from auto-prefix.
- If a public artifact is needed, create a sanitized summary without real sheet contents, screenshots, names, or asset URLs.

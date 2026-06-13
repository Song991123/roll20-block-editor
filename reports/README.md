# Reports Index

Date: 2026-06-14

Reports are evidence, but each report has a limited scope. Do not use a report to prove more than it actually checked.

| Report Folder | Scope | Does Not Prove |
| --- | --- | --- |
| `corpus-static-audit/` | Static inventory of sheet corpus files and risk flags. | Visual parity or import correctness. |
| `roundtrip-node/` | Node-side import/emit diagnostics for selected fixtures. | Browser behavior, real Roll20 behavior, or pixel parity. |
| `visual-reference-inventory/` | Candidate reference images and sheet folders. | That any reference is the correct default state. |
| `visual-fixture-render/` | Fixture HTML rendered through the preview document builder. | Pixel parity with Roll20 or reference images. |
| `visual-fixture-diff/` | Browser/canvas screenshot diff diagnostics. | Final visual parity until viewport, crop, default state, translation, worker state, and assets are normalized. |
| `cascade-leak/` | Browser-computed CSS cascade diagnostics for rendered fixture HTML. | Live Next.js edit-mode Shadow DOM leakage or visual parity. |
| `live-shadow-cascade/` | Live static Next.js app import path, preview Shadow DOM, and edit Shadow DOM computed CSS winner diagnostics for 3 fixtures. | Roll20 visual parity, screenshot parity, or asset availability. |
| `edit-flow-smoke/` | Headless-browser smoke for gallery widget drop: hook paths plus real dragover/drop DragEvents (background -> absolute, container -> flow nesting). | OS-level pointer drags, existing-object mouse drag, imported-sheet behavior, or visual parity. |
| `roundtrip-browser/` | Browser L2 roundtrip (import -> emit -> re-import -> emit compare, ids stripped) for 3 fixtures. | Source fidelity (e1 vs source), visual parity, all-sheet support, or roundtrip-with-edits. |
| `mapping-fidelity/` | Source-vs-emit multiset audit of Roll20-meaningful tokens (attr names, roll buttons, i18n keys, placeholders, CSS selectors) for YSHY 1부, plus the fixed-defect ledger. | Visual parity, Roll20 sandbox runtime behavior, or the same exactness for sheets other than YSHY 1부. |

## Evidence Rules

- A successful render means the pipeline produced HTML, not that the sheet is visually correct.
- A pixel diff number is diagnostic until the compared states are proven equivalent.
- Console errors/warnings must be recorded with browser runs.
- Legacy CSS sanitize must be reported separately from auto-prefix.
- GitHub Pages checks must be recorded separately from local checks.

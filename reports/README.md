# Reports Index

Date: 2026-06-12

Reports are evidence, but each report has a limited scope. Do not use a report to prove more than it actually checked.

| Report Folder | Scope | Does Not Prove |
| --- | --- | --- |
| `corpus-static-audit/` | Static inventory of sheet corpus files and risk flags. | Visual parity or import correctness. |
| `roundtrip-node/` | Node-side import/emit diagnostics for selected fixtures. | Browser behavior, real Roll20 behavior, or pixel parity. |
| `visual-reference-inventory/` | Candidate reference images and sheet folders. | That any reference is the correct default state. |
| `visual-fixture-render/` | Fixture HTML rendered through the preview document builder. | Pixel parity with Roll20 or reference images. |
| `visual-fixture-diff/` | Browser/canvas screenshot diff diagnostics. | Final visual parity until viewport, crop, default state, translation, worker state, and assets are normalized. |

## Evidence Rules

- A successful render means the pipeline produced HTML, not that the sheet is visually correct.
- A pixel diff number is diagnostic until the compared states are proven equivalent.
- Console errors/warnings must be recorded with browser runs.
- Legacy CSS sanitize must be reported separately from auto-prefix.
- GitHub Pages checks must be recorded separately from local checks.

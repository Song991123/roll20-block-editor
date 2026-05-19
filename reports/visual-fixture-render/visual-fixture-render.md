# Visual Fixture Render

Generated: 2026-05-19T08:03:43.210Z

This report proves prepared visual fixtures can be rendered through `lib/preview/buildDoc.ts` into standalone preview HTML. It does not prove visual parity yet; screenshot capture and pixel comparison are the next step.

Fixture count: 3

| Fixture | Corpus | Legacy sanitize | Source HTML | Source CSS | Rendered HTML | Reference | Hidden-layer static check |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `official-roll20-AW2E` | official-roll20 | on | 107169 | 14997 | 3631651 | preview.jpg | hidden css present; source script 1, rolltemplate 1 |
| `official-roll20-Les-Oublies` | official-roll20 | on | 62693 | 16080 | 3580761 | LesOubliesPreview.png | hidden css present; source script 4, rolltemplate 3 |
| `yshy-commission-1bu` | yshy-commission | on | 731925 | 33044 | 4310197 |  | hidden css present; source script 1, rolltemplate 19 |

Next check: open each generated HTML in a browser viewport, capture PNG, then compare against the reference image with a thresholded pixel-diff report.

## Hidden Canvas Elements

2026-05-19: The preview hidden-layer CSS was strengthened so `script`, `script[type="text/worker"]`, and `rolltemplate` nodes are not just `display:none`, but also hidden from layout, hit-testing, and visible overflow. The regenerated fixtures still contain source worker/template nodes for runtime/chat use, but the canvas layer should not show their text.

## YSHY 1BU Smoke

2026-05-19: Added ignored local fixture `test-fixtures/visual/yshy-commission-1bu` from the user's commission files: `1부 HTML.html`, `1부 CSS.css`, and `번역.txt`. Rendered through `buildSheetDoc` with legacy sanitize on. Browser Use opened the generated HTML and reported 0 console errors/warnings. A local-only viewport screenshot was saved under `reports/visual-fixture-render/screenshots/`.

## Browser Capture Smoke

2026-05-19: Opened generated HTML files through Browser Use and captured local-only PNGs under `reports/visual-fixture-render/screenshots/`. Browser console errors/warnings: 0 for the checked fixtures.

Observation: full-page captures are not yet equivalent to reference-image comparison. Some fixtures render repeated/default sheet states in full-page mode, so the next implementation must normalize viewport, initial tab/state, crop region, and diff threshold before claiming visual parity.

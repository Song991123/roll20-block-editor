# Visual Fixture Render

Generated: 2026-05-19T08:00:28.743Z

This report proves prepared visual fixtures can be rendered through `lib/preview/buildDoc.ts` into standalone preview HTML. It does not prove visual parity yet; screenshot capture and pixel comparison are the next step.

Fixture count: 2

| Fixture | Corpus | Legacy sanitize | Source HTML | Source CSS | Rendered HTML | Reference | Hidden-layer static check |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `official-roll20-AW2E` | official-roll20 | on | 107169 | 14997 | 3631651 | preview.jpg | hidden css present; source script 1, rolltemplate 1 |
| `official-roll20-Les-Oublies` | official-roll20 | on | 62693 | 16080 | 3580761 | LesOubliesPreview.png | hidden css present; source script 4, rolltemplate 3 |

Next check: open each generated HTML in a browser viewport, capture PNG, then compare against the reference image with a thresholded pixel-diff report.

## Hidden Canvas Elements

2026-05-19: The preview hidden-layer CSS was strengthened so `script`, `script[type="text/worker"]`, and `rolltemplate` nodes are not just `display:none`, but also hidden from layout, hit-testing, and visible overflow. The regenerated fixtures still contain source worker/template nodes for runtime/chat use, but the canvas layer should not show their text.

## Browser Capture Smoke

2026-05-19: Opened the 2 generated HTML files through Browser Use and captured local-only PNGs under `reports/visual-fixture-render/screenshots/`. Browser console errors/warnings: 0 for both fixtures.

Observation: full-page captures are not yet equivalent to reference-image comparison. Some fixtures render repeated/default sheet states in full-page mode, so the next implementation must normalize viewport, initial tab/state, crop region, and diff threshold before claiming visual parity.

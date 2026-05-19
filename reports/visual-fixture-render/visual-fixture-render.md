# Visual Fixture Render

Generated: 2026-05-19T07:29:01.135Z

This report proves prepared visual fixtures can be rendered through `lib/preview/buildDoc.ts` into standalone preview HTML. It does not prove visual parity yet; screenshot capture and pixel comparison are the next step.

Fixture count: 2

| Fixture | Corpus | Legacy sanitize | Source HTML | Source CSS | Rendered HTML | Reference | Hidden-layer static check |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `official-roll20-AW2E` | official-roll20 | on | 107169 | 14997 | 3631073 | preview.jpg | hidden css present; source script 1, rolltemplate 1 |
| `official-roll20-Les-Oublies` | official-roll20 | on | 62693 | 16080 | 3580183 | LesOubliesPreview.png | hidden css present; source script 4, rolltemplate 3 |

Next check: open each generated HTML in a browser viewport, capture PNG, then compare against the reference image with a thresholded pixel-diff report.

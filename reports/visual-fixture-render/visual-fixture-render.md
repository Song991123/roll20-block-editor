# Visual Fixture Render

Generated: 2026-06-01T23:30:50.370Z

This report proves prepared visual fixtures can be rendered through `lib/preview/buildDoc.ts` into standalone preview HTML. It does not prove visual parity yet; screenshot capture and pixel comparison are the next step.

Fixture count: 3

| Fixture | Corpus | Auto-prefix | Legacy CSS sanitize | Source HTML | Source CSS | Rendered HTML | Reference | Hidden-layer static check |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- | --- |
| `official-roll20-AW2E` | official-roll20 | on | not-applied | 107169 | 14997 | 3631703 | preview.jpg | hidden css present; source script 1, rolltemplate 1 |
| `official-roll20-Les-Oublies` | official-roll20 | on | not-applied | 62693 | 16080 | 3580813 | LesOubliesPreview.png | hidden css present; source script 4, rolltemplate 3 |
| `yshy-commission-1bu` | yshy-commission | on | not-applied | 731925 | 33044 | 4310249 |  | hidden css present; source script 1, rolltemplate 19 |

Next check: open each generated HTML in a browser viewport, capture PNG, then compare against the reference image with a thresholded pixel-diff report.

# Visual Fixture Render

Generated: 2026-05-19T08:08:36.821Z

This report proves prepared visual fixtures can be rendered through `lib/preview/buildDoc.ts` into standalone preview HTML. It does not prove visual parity yet; screenshot capture and pixel comparison are the next step.

Fixture count: 3

| Fixture | Corpus | Legacy sanitize | Source HTML | Source CSS | Rendered HTML | Reference | Hidden-layer static check |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `official-roll20-AW2E` | official-roll20 | on | 107169 | 14997 | 3631703 | preview.jpg | hidden css present; source script 1, rolltemplate 1 |
| `official-roll20-Les-Oublies` | official-roll20 | on | 62693 | 16080 | 3580813 | LesOubliesPreview.png | hidden css present; source script 4, rolltemplate 3 |
| `yshy-commission-1bu` | yshy-commission | on | 731925 | 33044 | 4310249 |  | hidden css present; source script 1, rolltemplate 19 |

Next check: open each generated HTML in a browser viewport, capture PNG, then compare against the reference image with a thresholded pixel-diff report.

## Roll20 Dialog Context

2026-05-19: The YSHY smoke initially had Roll20 base CSS loaded, but the preview wrapper did not carry Roll20's outer dialog classes. That meant the page had the CSS payload but was not fully emulating the character dialog context. `buildSheetDoc` and `buildSheetParts` now emit `ui-dialog ui-widget ui-widget-content ui-corner-all` on `#dialog-window`, while the preview chrome suppression CSS still prevents the dialog frame/titlebar from appearing.

Regenerated fixture evidence: `reports/visual-fixture-render/html/yshy-commission-1bu.html` contains `<div class="ui-dialog ui-widget ui-widget-content ui-corner-all r20-preview-dialog" id="dialog-window" ...>`. Browser Use reopened the YSHY fixture after regeneration with 0 console errors/warnings.

## YSHY 1BU Smoke

2026-05-19: Added ignored local fixture `test-fixtures/visual/yshy-commission-1bu` from the user's commission files: `1부 HTML.html`, `1부 CSS.css`, and `번역.txt`. Rendered through `buildSheetDoc` with legacy sanitize on. Browser Use opened the generated HTML and reported 0 console errors/warnings. A local-only viewport screenshot was saved under `reports/visual-fixture-render/screenshots/`.

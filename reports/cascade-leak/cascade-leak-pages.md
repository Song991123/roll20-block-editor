# Cascade Leak Diagnostic Pages

Generated: 2026-06-12T02:44:02.546Z

These pages are rendered fixture HTML with an injected browser-side cascade analyzer. Open a page in the browser and read `[data-testid="cascade-result"]` or `window.__R20_CASCADE_DIAGNOSTIC__`.

Scope: standalone `buildSheetDoc` fixture output. This checks the preview document CSS stack and does not by itself prove the live Next.js app shell cannot leak into Shadow DOM edit mode.

Page count: 3

| Fixture | Source HTML bytes | Diagnostic page |
| --- | ---: | --- |
| `official-roll20-AW2E` | 3631703 | `reports\cascade-leak\html\official-roll20-AW2E.html` |
| `official-roll20-Les-Oublies` | 3580813 | `reports\cascade-leak\html\official-roll20-Les-Oublies.html` |
| `yshy-commission-1bu` | 4310249 | `reports\cascade-leak\html\yshy-commission-1bu.html` |

Next check: open each page in Browser Use, collect the JSON result, and update `reports/cascade-leak/cascade-leak-results.md` with app-like/user/Roll20 winner counts.

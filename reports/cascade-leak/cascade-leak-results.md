# Cascade Leak Results

Generated: 2026-06-12

Scope: standalone `buildSheetDoc` fixture HTML served from `reports/cascade-leak/html/` and measured in the in-app browser through `getComputedStyle` plus browser CSSOM rule matching. This is not yet the live Next.js Shadow DOM edit-mode leak report.

| Fixture | Status | Sampled elements | Stylesheets | App-like winners | Roll20 winners | User CSS winners | Browser/default | Inline |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `yshy-commission-1bu` | computed | 36 | 8 | 0 | 312 | 32 | 569 | 23 |
| `official-roll20-Les-Oublies` | computed | 36 | 8 | 0 | 362 | 34 | 536 | 4 |
| `official-roll20-AW2E` | computed | 36 | 8 | 0 | 313 | 32 | 588 | 3 |

## Findings

- No sampled visible sheet element had `app-preview-runtime`, `app-layer-filter`, `preview-hidden-runtime`, or external/app CSS as the final cascade winner in the standalone preview document.
- Roll20 sources and user sheet CSS are both actively winning cascade decisions, so the standalone `buildSheetDoc` CSS stack is measurable and not only rendering through browser defaults.
- `#dialog-window`, `.dialog`, `.tab-content`, and `.sheetform` are intentionally affected by `roll20-dialog-context`; this is wrapper reproduction, not app UI leakage.
- This result does not prove the live edit canvas Shadow DOM cannot leak app UI CSS. That still needs a live app Shadow DOM diagnostic after importing a real fixture.

## Next Checks

- Add the same cascade collector to the live edit canvas Shadow DOM path after importing a real fixture.
- Compare preview iframe and edit Shadow DOM winners for the same element selectors.
- Keep screenshot diff normalization separate; this report is cascade-only.

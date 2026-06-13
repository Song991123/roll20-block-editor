# Live Shadow Cascade Results

Generated: 2026-06-13T16:35:40.910Z

Scope: live static Next.js app, real browser import path, preview Shadow DOM, and edit Shadow DOM. This does not prove Roll20 visual parity.

Overall: PASS

| Fixture | Import blocks | Preview app-like winners | Edit app-like winners | Preview Roll20 winners | Edit Roll20 winners | Console errors | HTTP >=400 | Page errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `official-roll20-AW2E` | 589 | 0 | 0 | 281 | 281 | 2 | 2 | 0 |
| `official-roll20-Les-Oublies` | 655 | 0 | 0 | 267 | 267 | 0 | 0 | 0 |
| `yshy-commission-1bu` | 6531 | 0 | 0 | 264 | 264 | 9 | 9 | 0 |

## Notes

- `app-like` means `app-preview-runtime`, `app-layer-filter`, `preview-hidden-runtime`, external/app CSS, or unlabeled app CSS winning a sampled visible sheet element property.
- `edit-shadow-host-reset` is reported separately in JSON and is not counted as app UI leakage; it is the Shadow DOM isolation/reset layer.
- HTTP/console resource errors are recorded separately. They do not imply app CSS cascade leakage, but they remain follow-up work for asset parity.
- Large full JSON details are in `live-shadow-cascade-results.json`; do not use this report as a Roll20 visual parity claim.

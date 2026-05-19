# Selected Roundtrip Node Audit

Generated: 2026-05-19T06:47:34.736Z

Scope: Node-side import determinism and structural fingerprint checks. This is not the browser Blockly emit roundtrip and not visual parity.

| Sheet | Status | HTML blocks | Top-level | CSS blocks | i18n blocks | Worker matched/raw | Import ms | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| custom-magica | PASS | 4332 | 88 | 3514 | 0 | 228/27 | 61 | coverage 95.7%, html 1710/1786, css 315/315, rawFallback 76, rawPartial true |
| custom-rampion | PASS | 7755 | 89 | 2102 | 399 | 154/2 | 128 | coverage 100%, html 6965/6965, css 261/261, rawFallback 0, rawPartial null |
| custom-underwater | PASS | 7724 | 91 | 1937 | 399 | 154/2 | 135 | coverage 100%, html 6931/6934, css 239/240, rawFallback 4, rawPartial true |
| official-coc7 | PASS | 11214 | 115 | 2815 | 477 | 301/58 | 127 | coverage 100%, html 9499/9500, css 329/329, rawFallback 1, rawPartial true |
| official-dnd5e | PASS | 13047 | 2 | 5832 | 0 | 23/12 | 128 | coverage 99.8%, html 11012/11036, css 577/577, rawFallback 24, rawPartial true |
| official-pf2-roll20 | PASS | 960 | 5 | 9066 | 0 | 18/36 | 94 | coverage 99.5%, html 825/829, css 650/650, rawFallback 4, rawPartial true |
| yshy-1bu | PASS | 6682 | 7 | 1697 | 399 | 154/2 | 71 | coverage 100%, html 6124/6124, css 193/193, rawFallback 0, rawPartial null |

## Blocking Truth

- PASS here only means the importer is deterministic for the same input.
- It does not prove HTML/CSS byte-identical export, Roll20 visual parity, sheet worker behavior, or roll template chat rendering.
- Browser roundtrip still requires the Playwright/browser path in `scripts/emit_roundtrip_playwright.mjs` or an equivalent in-app browser automation harness.
- TIMEOUT means the current importer is not yet acceptable for that sheet class.

## Source Safety

- Source sheet directories were read only.
- Generated raw JSON reports are local-only and ignored by git.

# Visual Fixture Diff Results

Generated: 2026-05-19

This is the first browser-canvas diagnostic diff between existing sheet reference images and captured preview renders. It is not a pass/fail visual parity claim yet. The harness now reports multiple compare modes, including native top-left crop, scaled reference, and coarse vertical crop search.

| Fixture | Reference size | Capture size | Best mode | Best crop | Best mismatch | Native top-left | Console |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| `official-roll20-AW2E` | 1240x761 | 838x1377 | native-top-left | 0,0,838,761 | 0.242662 | 0.242662 | 0 errors/warnings |
| `official-roll20-Les-Oublies` | 824x799 | 838x1491 | scaled-reference-best-y | 0,544,824,799 | 0.139638 | 0.143713 | 0 errors/warnings |

## Interpretation

- The preview path can render both copied fixtures in a browser without console errors.
- The current capture dimensions still do not match the reference dimensions, especially for `official-roll20-AW2E`.
- Coarse vertical crop search slightly improves `official-roll20-Les-Oublies`, confirming that full-page capture includes extra repeated/default sheet content.
- Scaling the reference does not improve `official-roll20-AW2E`; the next likely issue is reference screenshot state/viewport mismatch rather than simple page offset.
- These values are useful as regression diagnostics now, but they should not be treated as visual parity PASS/FAIL yet.

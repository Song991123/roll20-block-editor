# Visual Fixture Diff Results

Generated: 2026-05-19

This is the first browser-canvas diagnostic diff between existing sheet reference images and captured preview renders. It is not a pass/fail visual parity claim yet because the current compare uses an initial top-left crop. The next step is viewport/state/crop normalization.

| Fixture | Reference size | Capture size | Compared size | Mismatch ratio | RMS RGB | Console |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `official-roll20-AW2E` | 1240x761 | 838x1377 | 838x761 | 0.242662 | 98.744 | 0 errors/warnings |
| `official-roll20-Les-Oublies` | 824x799 | 838x1491 | 824x799 | 0.143713 | 50.511 | 0 errors/warnings |

## Interpretation

- The preview path can render both copied fixtures in a browser without console errors.
- The current capture dimensions do not match the reference dimensions, especially for `official-roll20-AW2E`.
- Full-page captures can include repeated/default sheet states or extra vertical content, so pixel diff must normalize the intended viewport, selected tab/state, and crop region before it can be used as a parity gate.
- These values are useful as regression diagnostics now, but they should not be treated as visual parity PASS/FAIL yet.

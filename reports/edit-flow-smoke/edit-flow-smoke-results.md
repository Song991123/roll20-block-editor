# Edit-Flow Browser Smoke (Figma-like flow drop slice)

Date: 2026-06-12
Script: `scripts/edit_flow_browser_smoke.mjs`
Environment: headless Chromium (chrome-headless-shell 148, playwright-core 1.60) against the static `out/` export served locally. Run in a sandboxed Linux environment because the previous Windows-shell detached dev-server session kept dying; the static export removes the dev-server dependency entirely.

## Result: PASS (all checks)

Raw data: `edit-flow-smoke-results.json`. Screenshots: `c0-edit-empty.png`, `c1-section-dropped.png`, `c2-input-nested.png`.

## What was verified

| Test | Path | Expected | Observed |
| --- | --- | --- | --- |
| A | `window.__perfHook.appendFriendlyWidgetForEditSmoke({mode:'flow'})` | widget nested under container, no `position:absolute` | `nested=true`, `htmlHasAbsoluteWidget=false`, widget style `width: 180px` |
| B | same hook, `mode:'absolute'` | widget top-level with `position:absolute` | `nested=false`, `htmlHasAbsoluteWidget=true`, style `width: 180px; position: absolute; left: 76px; top: 76px` |
| C1 | REAL `dragover`+`drop` DragEvents (DataTransfer with `application/x-r20-friendly-widget`, same payload as WidgetGallery) onto empty edit-canvas background | section created as absolute object | section rendered with `position: absolute; left: 326px; top: 200px`, `data-r20-layer-role="frame"`, `data-r20-can-drop="1"` |
| C2 | REAL DragEvents with clientX/Y over the rendered section (hit-test through `shadowRoot.elementFromPoint`) | text input nests into section in flow mode | input rendered INSIDE the section div in Shadow DOM, style `width: 180px;` (no absolute), status text `글자 입력 inserted into 박스 (그룹)`, `rootHtmlBlocks=1`, emitted HTML has `<div …><input …>` nesting |
| Console | whole run | no errors | 0 console errors, 0 page errors |

## Bug found and fixed during this run

`appendFriendlyWidgetPreset` has a product guard that ignores drops for 1.2 s after `clearAll()` (`lastClearedAt`). The hook smoke calls `clearAll()` immediately before appending, so `appendFriendlyWidgetForEditSmoke` always returned `containerId:null` in a real browser — the previous session's lint/build-only verification could not catch this.

- Fix 1 (`lib/perf/hook.ts`): the measurement hook now resets `lastClearedAt` before appending (the hook is measurement-only; the user-facing guard is untouched).
- Fix 2 (`scripts/edit_flow_browser_smoke.mjs`): Test C intentionally uses the REAL product drop path, so the script waits out the 1.2 s guard instead of bypassing it, and retries the hook smoke until Blockly's lazy init has registered the workspaces (first `appendBlockToActive` can return `null` on cold start).

## How to rerun

```
corepack pnpm install            # playwright-core is now a devDependency
npx playwright-core install chromium-headless-shell
corepack pnpm run build          # produces out/
node scripts/edit_flow_browser_smoke.mjs --out-dir ./out --report-dir reports/edit-flow-smoke
```

On Linux without root, missing chromium shared libraries can be provided by extracting the Ubuntu debs (libxdamage1, libgbm1, libnss3, libasound2, …) into a folder and exporting `LD_LIBRARY_PATH`.

## What this does NOT prove

- Not Roll20 visual parity; not imported-sheet edit/preview equality.
- The DragEvents are synthesized `dispatchEvent` calls (real event objects through the real handlers and the real `elementFromPoint` hit-testing), not OS-level pointer drags. Mouse-driven drag of EXISTING canvas objects (`onDragStart`/`onDragMove` shadow path) is still unverified.
- Before/after/inside drop zone UX (explicit zones) remains TODO.

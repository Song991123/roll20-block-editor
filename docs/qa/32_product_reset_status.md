# Product Reset Status

Updated: 2026-07-19

This is the current evidence ledger for the active product-reset goal. A green
local gate is not evidence of visual equality in a live Roll20 room.

## Evidence Snapshot

| Area | Current evidence | State | Boundary |
| --- | --- | --- | --- |
| HTML/CSS/i18n structural import | 27/27 contract cases | VERIFIED LOCAL | Does not prove arbitrary sheet fidelity |
| Legacy CSS compatibility | 16/16 sanitizer cases | VERIFIED LOCAL | Does not prove a legacy Roll20 room |
| Modern Sandbox safety boundary | 7/7 contract cases | VERIFIED LOCAL | Does not prove a user upload |
| Preview/edit render surface | 6/6 local modern/legacy comparisons at 0% mismatch | VERIFIED LOCAL | Same local surface only |
| Layer and placement interaction | edit-flow smoke, layer before/inside/after, flow/free placement, cycle guard | VERIFIED LOCAL | Figma-level usability still needs visual review |
| Generated layout CSS | authored position block emits paired class + CSS rule | VERIFIED LOCAL | Imported source inline styles remain loss-aware |
| Live Roll20 modern | 1 anonymous synthetic root capture; 1.6458% root-only mismatch | VERIFIED DIAGNOSTIC | Not a general parity result |
| Authorized user-sheet Sandbox upload | No successful browser file handoff | VERIFY | Must be completed in the dedicated Sandbox |
| Legacy-room visual parity | No dedicated legacy-room capture | VERIFY | Sandbox is modern-only |
| UI product reset | Pastel/pink shell, role palette, and light root/portal baseline slice | PARTIAL | Full information architecture and visual UX reset remain |
| Public copyright boundary | CI evidence guard, ignored local fixtures/reports, no tracked private corpus | VERIFIED LOCAL | Recheck before every public release |
| CI/CD | GitHub Actions run `29655022844` passed | VERIFIED REMOTE | Deployment smoke remains separate |

## Current Counts

- Local contract groups passed: `27/27`, `16/16`, `7/7`, and `6/6` visual
  comparisons.
- Live Roll20 diagnostic captures: `1` synthetic modern root.
- Live Roll20 user-owned sheet captures: `0`.
- Live Roll20 legacy-room captures: `0`.
- Full product UI reset slices: `1` small shell/palette slice; this is not
  completion of the redesign.
- Root UI baseline: forced `html.dark` removed; the app and portals now default
  to the pastel/light token set, while explicit `.dark` remains opt-in.

## Next Order

1. Keep the dedicated Roll20 Sandbox and legacy-room evidence separate from
   local fixture evidence.
2. Fix or document the supported file handoff needed for the authorized
   user-sheet upload. Do not infer success from a file-input click or a local
   pre-upload report.
3. Finish the same-render-surface and layer/container interaction audit.
4. Start the full pastel/pink information-architecture reset on a separate
   design-scoped branch after the renderer baseline is frozen.
5. Re-run local gates, copyright guard, deployment check, and browser smoke
   before calling any product-reset item complete.

## Reporting Rule

Every future progress report must label each item as `DONE`, `VERIFIED LOCAL`,
`VERIFIED REMOTE`, `DIAGNOSTIC`, `PARTIAL`, `VERIFY`, or `BLOCKED`. The words
"100%", "Roll20과 동일", and "완료" require evidence at the same scope as the
claim.

# Roll20 Actual Verification

Date: 2026-08-03

This contract governs authenticated Roll20 checks. It is an operational safety
document, not a repository for screenshots, sheet identities, room names,
payload source, or measured results.

## Destinations

### Existing Room

- Observation only.
- Before opening a sheet, read the current visible participant/member state.
- Use the room only when exactly one participant is visibly confirmed.
- Missing, unreadable, zero, or greater-than-one state means stop.
- Never upload, save settings, send chat, or modify a sheet in an existing room.

### Custom Sheet Sandbox

- Preferred destination for generated modern payloads.
- Modern-only evidence. It does not prove legacy behavior.
- Upload only through the visible supported file-selection flow.
- Do not use hidden inputs, undocumented endpoints, or page-script workarounds.

### Dedicated Legacy Test Room

- Required for legacy-mode evidence.
- Create or use only a room dedicated to this verification purpose.
- Confirm the legacy option and participant state before applying a payload.
- Never treat modern Sandbox output as legacy proof.

## Local Preparation

1. Generate an anonymous synthetic payload through the product's normal export
   path for the intended compatibility mode.
2. Run local import, Preview/Edit, export, payload, sanitizer, and asset gates.
3. Store payloads and all results only under ignored local evidence roots.
4. Confirm no real sheet source, screenshot, asset map, or generated report is
   staged or tracked.
5. Confirm no unnecessary project server is running before browser work.

## Participant Preflight

Before any existing-room observation or test-room write:

1. Read the current visible room state.
2. Prefer a visible participant/member count. If the current Roll20 UI does
   not expose that count, a visible player zone with exactly one visible player
   card may be used as the fallback evidence.
3. If both sources are visible, require them to agree. Missing, hidden,
   conflicting, zero, or greater-than-one evidence means stop.
4. Confirm the resulting participant count is exactly one.
5. Record only generic `PASS` or `STOP` in tracked status documents.
6. Keep screenshots and room-specific evidence local and ignored.
7. Repeat the preflight if the room reloads or participant state changes.

A room name, old chat log, owner status, or prior observation is not current
proof of solitude.

## Upload Boundary

- File selection must be user-visible or supported by the active browser tool.
- If the chooser rejects the local file, stop before transmission.
- Do not type local paths into page fields, synthesize a hidden file input,
  call save endpoints directly, or reuse an existing user's room.
- A successful file selection or settings save is not render proof. Continue to
  the rendered character iframe and interaction checks.

## Required Checks

Use the same generated payload for local and actual comparison.

1. Wrapper and sheet-root context.
2. Initial visible state and default attributes.
3. Translation text and placeholders.
4. Authored CSS, Roll20 baseline, and compatibility processing.
5. Form controls, repeating sections, and conditional visibility.
6. Sheet Worker initialization and supported interactions.
7. Roll button execution and result-card/chat output.
8. User-owned asset loading and failure behavior.
9. Intrinsic width, full height, overflow, zoom-independent geometry, and crop.
10. Console errors and blocked resources.

## Comparison Classes

Classify a difference before changing product CSS:

- wrapper/context;
- Roll20 baseline;
- authored CSS cascade;
- modern preparation;
- legacy sanitizing;
- default attribute or state;
- translation;
- Sheet Worker/runtime;
- Roll/result-card/chat;
- asset loading;
- viewport/crop;
- edit overlay only.

Do not promote a global renderer rule from one payload-specific symptom.

## Evidence Policy

- Keep screenshots, DOM captures, CSSOM, payloads, room identifiers, console
  logs, and measurement reports ignored and local.
- Remove ephemeral external inputs after converting a generic defect into an
  anonymous synthetic regression.
- Tracked TODO/progress files may record only `DONE`, `VERIFY`, `PARTIAL`,
  `BLOCKED`, the generic finding, the verification command, and commit/CI state.
- Never record source identity, URL, distinctive markup, machine path, room
  name, campaign identifier, or source-derived measurement.

## Completion Rule

Actual Roll20 parity remains unproven until a current generated payload passes
both modern Sandbox and dedicated legacy-room verification. HTTP success,
settings persistence, local fixture rendering, or one destination alone is not
enough.

## Cleanup

After each run:

1. close temporary test pages that are no longer needed;
2. stop project-owned servers and confirm zero project/CDP listeners;
3. remove ephemeral copied inputs when no longer needed;
4. verify Git staging contains no local evidence;
5. update only the generic current status.

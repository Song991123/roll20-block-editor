# 30. Roll20 Actual Sandbox Contract

Date: 2026-06-19

This note records direct Roll20 Custom Sheet Sandbox observations from the
logged-in Chrome session. It is implementation evidence for preview/export
behavior, not visual parity proof.

## Observed Surface

- Verification used a dedicated Roll20 sandbox/test campaign.
- Settings URL shape observed: `https://app.roll20.net/sheetsandbox/settings/<campaignId>`.
- The settings page exposes a Sheet.json editor through:
  - `textarea[name=customcharsheet_json]`
  - Ace editor target `data-target="customcharsheet_json"`
- The page script also references the custom preview/update path for:
  - `textarea[name=customcharsheet_layout]`
  - `textarea[name=customcharsheet_style]`
  - `#customsheet-preview iframe`
- Direct guessed editor URLs such as `/sheetsandbox/<id>` and
  `/sheetsandbox/editor/<id>` returned Roll20 not-found pages during this
  observation. Do not assume those routes exist.

## Observed Sandbox Sanitization

Roll20's sandbox preview script does more than load base CSS. The local preview
must model these behaviors separately from our legacy compatibility toggle.

### CSS

- Remove mobile CSS blocks marked by `/* start mobile */ ... /* end mobile */`.
- Remove CSS comments.
- For each selector:
  - Convert leading ID selectors to class selectors.
  - Prefix selectors with `.charsheet ` unless already `.charsheet`,
    `@font-face`, `.sheet-rolltemplate-*`, or `@import`.
- Reject/clear CSS when suspicious tokens are detected, including script-like
  words, behavior/expression bindings, unsafe imports, HTML brackets, high/low
  bytes, and entity charsets.
- Rewrite URL references:
  - Preserve Roll20-hosted URLs such as `https://s3.amazonaws.com/files.d20.io`,
    `https://files.d20.io`, and `https://app.roll20.net/images/`.
  - Proxy other `http(s)` URLs through `https://imgsrv.roll20.net/?src=...`.
  - Drop non-http/non-Roll20 URL references.

### HTML

- Remove `<mobile>...</mobile>`, `<web>`, and `<mobile>` wrapper markers.
- Sanitize HTML through an allow-list.
- Allowed tags observed in the sandbox preview path:
  `br`, `input`, `textarea`, `div`, `span`, `label`, `hr`, `img`, `b`, `i`,
  `strong`, `em`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `p`, `table`, `tr`,
  `td`, `tbody`, `thead`, `th`, `tfoot`, `select`, `option`, `optgroup`,
  `fieldset`, `button`, `ul`, `li`, `ol`, `caption`.
- Class/group tokens are preserved only when they already begin with one of:
  - `attr_`
  - `sheet-`
  - `repeating_`
  - `roll_`
  - `act_`
- Other class tokens are prefixed with `sheet-`.
- Sanitized HTML is inserted into the preview iframe root with
  `#customsheet-preview iframe -> #root`.

## Distinction From Legacy Compatibility

Do not conflate these two layers:

| Layer | Purpose | Current Local Status |
| --- | --- | --- |
| Roll20 sandbox sanitize/prefix | Actual Roll20 custom sheet preview behavior for HTML/CSS source before rendering. | Observed and documented here; implementation gap remains. |
| Legacy CSS compatibility toggle | Optional export/preview transform for older Roll20 CSS support, such as transform/keyframes/var/position handling. | Existing local sanitizer covers part of this but is not the actual sandbox prefix/sanitize contract. |

## Current Blocker

Actual generated-sheet visual parity is still unproven. Chrome can reach the
Roll20 Custom Sheet Sandbox, but automated file upload is blocked because the
Codex Chrome extension cannot currently set local files in the chooser. Enable
Chrome extension file access or manually place the generated payload and
screenshots into the ignored report folder before claiming Roll20 visual parity.

## Implementation Implications

- Add a dedicated local module for Roll20 sandbox sanitize/prefix behavior,
  separate from `sanitizeForRoll20Legacy`.
- Preview/edit/export should be able to report which layer was applied:
  source-preserving mode, Roll20 sandbox sanitize/prefix, and legacy
  compatibility mode.
- Screenshot diff classification must not request more renderer CSS changes
  when the remaining mismatch is missing actual Roll20 screenshot or crop/state
  context.
- Translation remains unverified in this observed UI path. Treat translation
  application as a separate evidence item until the actual upload path is
  completed.

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

Important update, 2026-06-19: a later read-only probe of the actual generated
character iframe found that the rendered CSSOM for the uploaded Les-Oublies
payload still contained unprefixed state selectors such as `.tabstoggle[...]`,
while the rendered HTML state anchors were prefixed as `.sheet-tabstoggle`.
Those selectors therefore did not match the actual panels, and Roll20 showed
multiple tab panels even while the hidden state inputs were `combat`. Treat the
older blanket CSS-prefix observation below as an incomplete settings-preview
observation until it is reverified across another fixture and the actual
character iframe path.

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

## Current Evidence Boundary

Actual generated-sheet visual parity is still unproven. Chrome can reach the
Roll20 Custom Sheet Sandbox. Automated file chooser upload is blocked because
the Codex Chrome extension cannot currently set local files in the chooser, but
the dedicated sandbox accepted generated source through the observed
`/sheetsandbox/savesheetsettings` endpoint after base64 encoding each HTML/CSS/
translation payload and saving `customcharsheet_json` on the settings page.

The first generated Les-Oublies Roll20 sandbox screenshot exists locally and
diffs against the local baseline at `18.81%` mismatch. A real Roll20 roll button
click produced a `sheet-rolltemplate-classic-roll` chat DOM message, but a
trustworthy chat-pane screenshot is still missing. Therefore the current state is
partial actual evidence, not Roll20 visual parity.

Later evidence supersedes the `18.81%` visible-top screenshot as the main
Les-Oublies generated-sheet comparison: a stitched full-height actual Roll20 root
image is available locally and currently differs from the local preview by
`6.90%`. This is still not parity. The new state visibility diagnostic command

```bash
corepack pnpm run diagnose:roll20-state-visibility -- reports\roll20-actual-compare\2026-06-18-state-map-v1
```

classifies the captured fixture as
`ACTUAL_CSS_STATE_SELECTORS_DO_NOT_MATCH_PREFIXED_HTML`. This means the local
Roll20 expected-render path must not blindly assume CSS selector prefixing until
the actual character iframe behavior is modeled and rechecked.

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

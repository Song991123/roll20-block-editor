# Import Corpus Progress

## 2026-07-30

- Prepared five ignored, source-redacted fixtures covering two custom inputs,
  one modern input with translation data, and two legacy-size inputs.
- Verified custom and modern imported edit/preview synchronization.
- Verified direct movement and apply for the small legacy input, with matching
  edit/preview coordinates.
- Fixed the partial-tag block-id injection bug for malformed `<td<span ...>`
  fragments and added an emit-contract regression test.
- Reverified the small legacy browser roundtrip and imported edit/preview
  synchronization after rebuild; both passed.
- Kept the large legacy performance gate open: structural match reached 100%,
  import took about 33 seconds, and edit acknowledgement timed out.
- Kept actual Roll20 evidence open at `0/6` generated and `0/3` observation;
  the Sandbox chooser rejected local file assignment.
- Recorded the cleanup retry as host-policy blocked. No deletion bypass was
  used and no protected source folder was touched.
- Rejected two browser-render optimization experiments after live testing:
  the public `rendered` flag caused a headless-workspace error, while SVG hook
  suppression did not finish the large smoke within three minutes. Both code
  experiments were fully reverted; the large import remains an open P0.
- Rechecked the available Roll20 tab; it is currently at the login page, so
  actual Sandbox and room evidence remain blocked at `0/6` and `0/3`. No room
  or external sheet state was changed.

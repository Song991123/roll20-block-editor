# Import Corpus Progress

## 2026-07-30

- Prepared five ignored, source-redacted fixtures covering two custom inputs,
  one modern input with translation data, and two legacy-size inputs.
- Verified custom and modern imported edit/preview synchronization.
- Verified direct movement and apply for the small legacy input, with matching
  edit/preview coordinates.
- Kept the small legacy roundtrip open because malformed `<td<span ...>`
  fragments already exist in the input and are normalized on reimport.
- Kept the large legacy performance gate open: structural match reached 100%,
  import took about 33 seconds, and edit acknowledgement timed out.
- Kept actual Roll20 evidence open at `0/6` generated and `0/3` observation;
  the Sandbox chooser rejected local file assignment.
- Recorded the cleanup retry as host-policy blocked. No deletion bypass was
  used and no protected source folder was touched.

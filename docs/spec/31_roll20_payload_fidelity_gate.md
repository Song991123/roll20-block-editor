# 31. Roll20 Payload Fidelity Gate

Date: 2026-07-31

## Purpose

The local export path must prove that the content produced by the editor is the
same content that the Roll20 upload helper places in browser `File` objects.
This gate is intentionally separate from actual Roll20 visual parity: Roll20
does not return the uploaded file bytes through the browser page.

## Checks

`node scripts/roll20_payload_fidelity_gate.mjs` can compare one ignored payload
directory with its generated upload snippet and optional local evidence:

| Check | Evidence | PASS means |
| --- | --- | --- |
| `fileBinding` | `sheet.html`, `sheet.css`, `translation.json`, optional `sheet.json` and generated snippet | names, byte lengths, SHA-256 values, and decoded base64 bytes are identical |
| `appEmit` | local baseline result | payload hashes/lengths equal the recorded editor emit |
| `zipBinding` | `upload.zip` | ZIP entries equal the payload files byte-for-byte |
| `localDomCss` | payload roundtrip result | local import/render has populated DOM, no visible worker/template nodes, no unexpected errors, and accepted screenshot mismatch |
| `worker` | worker source audit | worker-bearing payload has exact canonical source/emitted worker preservation |

Missing optional evidence is reported as `VERIFY`, never silently promoted to
`PASS`. A payload without a worker is `N/A` for the worker check.

## Usage

```text
node scripts/roll20_payload_fidelity_gate.mjs \
  --payload-dir <ignored-payload-dir> \
  --snippet <ignored-upload-snippet.js> \
  --baseline-report <local-baseline-results.json> \
  --fixture <fixture-id> \
  --roundtrip-report <payload-roundtrip-visual-results.json> \
  --worker-audit <worker-source-audit-results.json> \
  --out <ignored-report.json>
```

The report contains hashes, counts, and statuses only. It must stay under an
ignored local evidence path. Real or derived sheet source, screenshots, room
identifiers, and creator identity must not be copied into public docs.

## Claim Boundary

- A local `PASS` proves export/upload-snippet fidelity, not that Roll20 saved
  the files or rendered them identically.
- External attachment identity remains `VERIFY` until a Roll20-supported
  readback or equivalent browser evidence exists.
- Actual modern Sandbox and dedicated legacy-room evidence still requires
  fresh one-participant preflight, visible root/state evidence, normalized
  screenshot/computed-style comparison, and separate worker/chat checks.

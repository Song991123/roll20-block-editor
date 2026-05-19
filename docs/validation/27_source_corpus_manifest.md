# 27. Source Corpus Manifest

Date: 2026-05-19

This document is the shared source-of-truth for the Roll20 sheet corpus used by Codex, Claude, or any future agent. These folders are **read-only source material**. Do not edit, normalize, unzip in place, rename, delete, or write generated files into them.

## Non-Destructive Rule

All source folders below are evidence. They must be treated like fixtures from a user archive.

Allowed:
- Read files.
- Compute hashes, counts, and diagnostics.
- Copy a selected sheet into a workspace-owned fixture folder before testing.

Forbidden:
- Editing source files in place.
- Writing generated files beside the originals.
- Running formatter/conversion tools directly inside the source folders.
- Reporting "100%" without a reproducible report artifact.

When a test needs mutation, create a copy under a workspace-owned path such as:

```text
D:\훙냥냥\마렌상\영시영 시트 고치기\web-push-main\test-fixtures\corpus-working\
```

## Corpus Roots

| Corpus | Path | Role | Current Read Result |
|---|---|---|---|
| Official Roll20 sheets | `D:\훙냥냥\마렌상\roll20-character-sheets-master` | Broad compatibility corpus. Use for official patterns, sandbox idioms, sheet workers, rolltemplates, and default-view controls. | Exists |
| User custom sheet archive | `D:\훙냥냥\마렌상\티알\[중요]커스텀시트` | Real user-created and downloaded custom sheets. Must not be damaged. | Exists |
| YSHY commission sheets | `D:\훙냥냥\마렌상\티알\0 CoC\영시영\H님 커미션\시트` | Primary high-fidelity stress case: 1부/2부/3부 HTML and CSS plus translation file. | Exists |

Note: The path `D:\훙냥냥\마렌상\티알[중요]커스텀시트` was checked and does not exist. The actual custom archive root includes the `티알` directory and the `[중요]커스텀시트` child.

## File Inventory

Text-like candidates are counted by extension: `.html`, `.htm`, `.css`, `.json`, `.js`, `.txt`.

| Corpus | `.json` | `.html` | `.htm` | `.css` | `.js` | `.txt` | Candidate Files | Candidate Bytes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Official Roll20 sheets | 14,120 | 2,006 | 22 | 1,597 | 747 | 51 | 18,543 | 717,082,278 |
| User custom archive | 2 | 29 | 0 | 31 | 0 | 64 | 126 | 14,999,965 |
| YSHY commission sheets | 0 | 3 | 0 | 3 | 0 | 1 | 7 | 2,320,059 |

## YSHY Commission Files

The YSHY commission folder currently contains:

| File | Bytes | Required Role |
|---|---:|---|
| `1부 HTML.html` | 731,925 | Primary HTML fixture |
| `1부 CSS.css` | 33,044 | Primary CSS fixture |
| `2부 HTML.html` | 731,925 | Era variant HTML fixture |
| `2부 CSS.css` | 33,044 | Era variant CSS fixture |
| `3부 HTML.html` | 731,925 | Era variant HTML fixture |
| `3부 CSS.css` | 33,044 | Era variant CSS fixture |
| `번역.txt` | 25,152 | Required translation/i18n fixture |

Important: YSHY "1부 html2 / 1부 css2" work must be tested together with the translation file. A render that uses only HTML and CSS is incomplete for this sheet family.

## Observed Pattern Pressure

The corpus contains the features that the editor must handle generically:

| Feature | Official Samples | User Custom Archive | YSHY Commission |
|---|---:|---:|---:|
| `type="roll"` | DnD_5e: 172, 13th Age by Roll20: 14 | 5,638 | 0 observed in YSHY commission files |
| `<rolltemplate` | CoC 7th: 25, 13th Age by Roll20: 8 | 184 | 57 |
| `<script type="text/worker"` | DnD_5e: 1, CoC 7th: 1, 13th Age: 1 | 51 | 3 |
| `on(...)` sheet workers | CoC 7th: 37, 13th Age: 18 | 466 | 15 |
| `getAttrs(...)` | CoC 7th: 106 | 871 | 159 |
| `setAttrs(...)` | CoC 7th: 129 | 4,951 | 186 |
| `:checked` CSS/default-view controls | DnD_5e: 85, CoC 7th: 52, 13th Age: 106 | 756 | 117 |
| `repeating_` sections | CoC 7th: 211, 13th Age: 111 | 836 | 96 |
| `sheet-tab` controls | CoC 7th: 678 | 788 | 0 observed in YSHY commission files |
| `pulp` / era default logic | CoC 7th: 1,011 | 619 | 215 |
| `1920` era default references | CoC 7th: 42 | 104 | 16 |
| checkbox inputs | DnD_5e: 1,305, CoC 7th: 636 | 5,116 | 1,281 |

These are not YSHY-specific. The editor must represent them as generic Roll20 sheet concepts.

## Representative Official Sheets

Use these as early official compatibility gates:

| Sheet | Why |
|---|---|
| `DnD_5e` | Many roll buttons, checkboxes, expression-heavy roll values, and tab CSS. Existing docs record expression flattening as a roundtrip loss source. |
| `Call_of_Cthulhu_7th_Ed` | Pulp/default era logic, many sheet workers, rolltemplates, repeating sections, and `sheet-tab` controls. |
| `13th Age by Roll20` | Smaller official sheet with rolltemplates, repeating sections, sheet workers, and `:checked` CSS. Useful as a fast official smoke case. |
| `Pathfinder by Roll20` or `Pathfinder Second Edition by Roll20` | Pathfinder directories exist and should be added to the official gate after the harness can batch safely. |

## Current Known Truth

Existing verification docs already state that full byte-identical roundtrip was not complete:

- `docs/validation/verify/emit_full_roundtrip_stage2.md` records Stage 2 FAIL cases and later partial fixes.
- DnD 5e improved from `r2=234` blocks to `r2=383`, but still had remaining expression-flattening loss.
- CSS roundtrip was closer than HTML, but HTML and expression trees were not universally lossless.

Therefore no agent may claim universal import/export completeness until the corpus gate produces per-sheet PASS reports.


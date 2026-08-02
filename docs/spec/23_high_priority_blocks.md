# High-Priority Block Coverage

Date: 2026-08-03

Prioritize generic constructs that preserve visible layout, state, Roll20
runtime behavior, or source fidelity:

1. semantic containers and direct text;
2. form controls and default values;
3. table, list, and repeating structures;
4. translation text and attributes;
5. Roll buttons, attribute references, and Rolltemplates;
6. conditional visibility and value switches;
7. CSS rules, at-rules, variables, and complex fallback;
8. Sheet Worker events, attribute access, loops, conditions, and row helpers;
9. ordinary script preservation as inert source;
10. explicit raw fallback for every unsupported construct.

## Acceptance

- Matchers use syntax and structure, never a source name or fingerprint.
- Imported attributes, styles, classes, text, and runtime source are preserved.
- A higher-level composite is used only when conservative matching retains all
  semantics.
- Tests include positive, rejection, emit, re-import, and compatibility paths.
- Tracked status records only generic outcomes; source-specific measurements
  remain local and ignored.

The current detailed source-to-block rules live in
`docs/spec/29_universal_roll20_mapping_contract.md`.

# 36. Public Portfolio and Copyright Rules

Date: 2026-06-14

This repo may be public while the product is still stabilizing. Treat the public README and committed assets as portfolio material, not as the full private verification archive.

## Portfolio README Rules

- README is a first-glance Korean portfolio page.
- Put the visual hook first: one-line pitch, badges, screenshot, and compact cards.
- Keep detailed evidence, TODOs, and agent logs out of README.
- Do not include a "verified scope" table in README. Link to internal docs instead.
- Prefer screenshots and diagrams over long paragraphs.
- Use skimmable cards: problem/solution, core experience, tech cards, implementation highlights.
- Use only copyright-safe screenshots. Empty app UI and synthetic demo screens are allowed.

## Copyright and Source Safety

- Do not commit real Roll20 reference sheets, community sheets, commissioned sheets, user custom sheets, translations, reference images, fixture copies, or generated HTML built from them.
- Do not commit generated verification reports that contain real sheet names, source snippets, screenshots, external asset URLs, or token inventories.
- Real sheet verification belongs in ignored local folders only:
  - `test-fixtures/`
  - `reports/<pipeline>/`
  - `reports/roll20-actual-compare/`
  - `.tmp/`
  - `docs/portfolio/private/`
- Even local operational notes must stay anonymous: use fixture IDs and generic findings only. Do not put creator/sheet names, source URLs, distinctive snippets, asset URLs, screenshots, or source-derived measurements in TODOs, progress logs, handoffs, or portfolio material.
- Roll20 room screenshots, sandbox screenshots, exported custom sheet zips, and room/sheet names are verification evidence, not public assets.
- Public examples must be synthetic and copyright-safe. `public/examples/` is ignored until such examples are intentionally created.
- If the project later becomes private, this rule can be revisited, but public branches should still avoid redistributing third-party sheet assets.

## Commit Boundary

- Work from the active Next/React worktree: `web-push-main/`.
- Before committing, run `git rev-parse --show-toplevel` and confirm it points to `web-push-main`.
- Commit source code, hand-authored docs, and copyright-safe portfolio assets only.
- Do not commit parent-folder material or local development corpora.
- Keep generated reports local unless the user explicitly approves publishing a sanitized report.

## Research Notes

Portfolio README references reviewed on 2026-06-14 emphasized:

- Recruiters skim first, so start with a concise project pitch and visual proof.
- Screenshots, diagrams, badges, and clean formatting improve first-glance readability.
- Detailed install/verification information should exist, but should not bury the project story.
- README should answer what the project is, why it exists, what was built, and how to run it.

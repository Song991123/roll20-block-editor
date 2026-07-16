# 40. Roll20 Render Reference Inventory

Date: 2026-07-15

Purpose: keep external Roll20/editor references in one place so render work does not depend on memory, vague forum claims, or bundled copyrighted samples.

## Rules For Using References

- Public docs, official repositories, and forum posts can guide implementation.
- Do not copy private, commissioned, or downloaded sheet source into the public app.
- Do not add real sheet screenshots, generated fixture HTML, generated reports, or third-party preview images to the repo.
- If a source is not official, treat it as a hypothesis until verified in Roll20 Sandbox or a dedicated test room.
- Official/community sheet repositories are pattern corpora, not in-app samples. Use them for ignored local fixtures or read-only analysis only.

## Source Inventory

| Source | Evidence | Use | Caveat |
| --- | --- | --- | --- |
| Roll20 official `roll20-character-sheets` GitHub repository | The repository documents expected sheet package files: HTML, CSS, preview image, `sheet.json`, and notes inputs, roll buttons, repeating sections, roll templates, and sheet workers. It also states repository HTML/CSS are MIT licensed. | Use as the broadest pattern corpus for official/community sheet structures, `sheet.json`, worker patterns, translations, repeating sections, roll templates, and preview metadata. | Do not bundle these sheets into the app. Keep reference/fixture use local and ignored unless a deliberately sanitized synthetic fixture is created. |
| Roll20 Help Center: Character Sheet Translation | Roll20 documents `data-i18n` text replacement, translation JSON, and translated element attributes `title`, `alt`, `aria-label`, `label`, and `placeholder`. | Keep preview, edit, worker `getTranslationByKey`, chat, and export on one translation map and cover every documented attribute. | Documentation explains the contract but does not replace a Sandbox screenshot/runtime comparison. |
| Roll20 forum permalink `Character Sheet Enhancements!` | Roll20 discussion notes mention the `legacy` field in `sheet.json`, custom sheet setting checkbox behavior, and rolltemplate legacy HTML/CSS behavior. | Treat legacy mode as a real runtime option. Test rolltemplate rendering separately from sheet iframe/preview rendering. | Forum posts are dated. Verify current behavior in Sandbox/CDP before shipping behavior based on the post. |
| GrapesJS homepage/docs | GrapesJS exposes pages/layers managers, symbols, JSON output, and HTML/CSS/JS export. | Useful architecture reference for layer manager, component model, export pipeline, and visual editing vocabulary. | Not Roll20-aware. Do not drop it in as a replacement for Roll20 sanitizer/runtime mapping. |
| GrapesJS discussion about external HTML templates | Maintainers/users describe why arbitrary external HTML editing is hard: script execution is blocked, non-componentized HTML needs normalization, CSS can leak, and assets can be messy. | Confirms our need for an import-normalization pipeline, block/layer classification, asset relink checks, and CSS isolation. | It is an editor-framework discussion, not Roll20 behavior evidence. |
| GrapesJS iframe/doctype issue | A reported rendering mismatch involved iframe standards mode and doctype behavior. | Check that preview/edit render paths use the same doctype/mode and wrapper context when comparing local vs Roll20. | It is a general iframe clue. Actual Roll20 wrapper evidence still wins. |

## Implementation Takeaways

1. A Roll20 sheet is not only HTML/CSS. Translation files, `sheet.json`, workers, roll buttons, repeating sections, roll templates, default attrs, and legacy mode all affect visible behavior.
2. Rolltemplate/chat parity is a separate renderer problem from sheet preview/edit parity.
3. External HTML editing needs a controlled model:
   - parse and preserve source structure;
   - classify DOM roles;
   - isolate app CSS from sheet CSS;
   - keep assets explicit and user-owned;
   - export HTML/CSS/translation without hidden app-only state.
4. Any "looks close" renderer patch must pass source/intrinsic, template-scope, asset, row-raster, style-proof, local preview/edit, and Roll20 Sandbox/test-room checks before being called production-ready.

## Useful Links

- [Roll20 character sheets repository](https://github.com/Roll20/roll20-character-sheets)
- [Roll20 Help Center: Character Sheet Translation](https://help.roll20.net/hc/en-us/articles/360037773493-Character-Sheet-Translation)
- [Roll20 forum permalink: Character Sheet Enhancements](https://app.roll20.net/forum/permalink/9885203/)
- [GrapesJS](https://grapesjs.com/)
- [GrapesJS discussion: external HTML templates](https://github.com/GrapesJS/grapesjs/discussions/6732)
- [GrapesJS issue: iframe rendering mode clue](https://github.com/GrapesJS/grapesjs/issues/3285)

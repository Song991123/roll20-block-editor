# 34. Branch and Deployment Plan

Date: 2026-06-12

## Current State

| Item | State | Evidence |
| --- | --- | --- |
| Production branch | `main` | `.github/workflows/deploy.yml` deploys only on `main` push. |
| Production page | GitHub Pages | `https://song991123.github.io/roll20-block-editor/` returned HTTP 200 on 2026-06-12. |
| Latest production deploy | Current when checked | GitHub Actions latest Pages run completed successfully on 2026-06-12. Recheck after every push because documenting a SHA creates another deploy. |
| Development branch | `dev` | Created from current `main` and pushed to origin. |
| Development CI | New `CI` workflow | Runs lint/build on `main`, `dev`, and PRs; `main` and `dev` CI passed when checked on 2026-06-12. |

## Branch Rules

| Branch | Purpose | Deployment |
| --- | --- | --- |
| `main` | Stable public branch. Only merge after verification. | Deploys to GitHub Pages. |
| `dev` | Integration/testing branch. Agents can push coherent batches here before promoting to `main`. | CI lint/build only for now. |
| `codex/*` | Short-lived task branches when useful. | No deployment by default. |

## Why `dev` Does Not Deploy to a Second GitHub Pages Site Yet

GitHub Pages normally exposes one Pages site per repository. The current `actions/deploy-pages` workflow already uses that site for `main`. A separate public test page needs one of these strategies:

| Option | Result | Tradeoff |
| --- | --- | --- |
| Keep GitHub Pages for `main`, use Vercel/Netlify preview for `dev` | Clean production/test split | Requires connecting another host. |
| Create a separate preview repository for GitHub Pages | Two GitHub Pages URLs | Adds repo sync/deploy complexity. |
| Deploy both production and dev builds into subfolders of one Pages artifact | One site with `/` and `/dev/` | More complex workflow; easy to overwrite production if not careful. |
| Use Actions artifacts for `dev` only | Safe predeploy build checks | Not a public test page. |

Recommended next step: keep `main` as GitHub Pages production, create `dev` with CI now, then add Vercel/Netlify or a separate Pages repo when the user wants a public test URL.

## Promotion Flow

1. Work lands on `dev` or a short-lived `codex/*` branch.
2. CI must pass: lint and build.
3. Run local/browser checks for any UI or preview changes.
4. Merge or cherry-pick to `main`.
5. GitHub Pages deploy runs from `main`.
6. Verify the public URL and record the result in `docs/qa/31_active_todo.md`.

## TODO

| Status | Task |
| --- | --- |
| DONE | Push `dev` branch to origin at the current `main` commit. |
| DONE | Confirm CI runs on `dev`. |
| TODO | Decide public preview hosting strategy: Vercel/Netlify, second Pages repo, or same-site `/dev/` artifact merge. |
| TODO | Add a deploy verification script that records page status, latest Actions SHA, and commit match. |

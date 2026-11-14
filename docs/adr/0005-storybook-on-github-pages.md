# 0005. Storybook hosting: GitHub Pages, build once, deploy the tested artifact

- Status: Accepted
- Date: 2026-11-14

## Context and Problem Statement

The component library `@adlersoft/kontur-ui` is documented in Storybook (`apps/ui-storybook`).
Until now it could only be seen by cloning the repo. A reviewer (recruiter, team lead) must
be able to open one link and see every component, both themes and the keyboard behaviour.
This is the first continuous delivery (CD) of the repo, so it also sets the pattern for how
we publish: where, what, when and how to roll back.

## Decision Drivers

- **What is published must be what was tested.** CI already runs axe on every story and the
  keyboard e2e against the Storybook build; the public page must be those same files.
- Only after a green CI on `main`; never from a pull request (forks included).
- No extra accounts or long-lived secrets; least privilege for the deploy.
- Free, HTTPS, stable URL next to the code.
- Simple to explain and to roll back.

## Considered Options

1. **GitHub Pages, deploy job inside `ci.yml` (`needs: main`) that publishes the artifact
   uploaded by the CI job**
2. GitHub Pages, separate workflow triggered by `workflow_run` after CI
3. External host (Chromatic, Netlify, Vercel)

## Decision Outcome

Chosen option: **1**. Principle: **build once, deploy the tested artifact**.

- **Build once.** The CI job `main` builds Storybook in the step
  `build-storybook` (Nx). The e2e step reuses this output from the Nx cache (`static-storybook`
  → `build-storybook`, cache hit) and runs axe + keyboard tests against it. Nothing rebuilds
  it afterwards.
- **Deploy the tested artifact.** On `main` only, after the e2e step, the same folder
  `dist/storybook/ui-storybook` is uploaded with `actions/upload-pages-artifact`
  (`retention-days: 14`). The job `deploy-storybook` (`needs: main`) publishes exactly this
  artifact with `actions/deploy-pages` to the `github-pages` environment.
- **When.** `deploy-storybook` runs only if the CI job is green (`needs`) and only for
  `push` / `workflow_dispatch` on `refs/heads/main`. Pull requests — from branches or forks —
  never reach it: the condition excludes the `pull_request` event, and the upload step has
  the same condition, so a PR never even produces a Pages artifact.
- **Least privilege.** The workflow default stays `contents: read`. Only `deploy-storybook`
  gets `pages: write` and `id-token: write` (OIDC: GitHub issues the job a short-lived token
  for Pages instead of a stored secret). The build/test job never has write rights.
- **Queue, not cancel, on `main`.** `cancel-in-progress` is true only for pull requests, so a
  new push to `main` cannot abort a deployment half-way. The deploy job additionally uses the
  concurrency group `pages` without cancellation.
- **What is published.** Only the static Storybook of `libs/ui`: component docs, stories,
  both themes. The apps are not published while they are empty shells. Source maps stay in:
  the repo is public, they contain nothing secret and help debugging.
- **Subpath.** Pages serves the site under `/kontur/`. The Storybook build uses relative
  URLs; checked before the first deploy by serving the build under `/kontur/` locally
  (0 responses ≥ 400, fonts incl. the Cyrillic subset loaded).

### How to roll back

1. **Normal:** `git revert` the bad commit and push. CI tests the reverted state and the
   deploy job publishes it. The history explains what happened.
2. **Fast:** in the Actions tab open an older green run of `CI` and use "Re-run jobs" on
   `deploy-storybook`. It republishes that run's artifact — possible while the artifact
   exists (`retention-days: 14`).
3. **Emergency:** Settings → Pages → Unpublish site.

### Consequences

- Good: the public Storybook is byte-for-byte the build that passed axe and the keyboard e2e,
  so no separate smoke test on the published URL is needed; only hosting can differ (subpath,
  HTTPS, headers), and the subpath is checked.
- Good: no secrets, no external account, write rights only in one small job.
- Good: one workflow file; the dependency "deploy after green CI" is a plain `needs`.
- Bad: on busy days pushes to `main` queue instead of cancelling each other (slower).
- Bad: no per-PR preview — GitHub Pages hosts one site per repo. Revisit if PR previews
  become necessary (option 3).

## Pros and Cons of the Options

### Deploy job in `ci.yml` (`needs: main`)

- Good: publishes the tested bytes; no rebuild; artifact passes between jobs of one run.
- Bad: `ci.yml` grows by one job.

### Separate workflow via `workflow_run`

- Good: CI and CD in separate files.
- Bad: runs on a fresh machine without the Nx cache (no Nx Cloud), so it would rebuild
  Storybook — the published build would not be the tested one — or it must download the
  artifact from another run (more permissions and moving parts).
- Bad: `workflow_run` always uses the workflow file from the default branch, which is
  harder to reason about.

### External host (Chromatic, Netlify, Vercel)

- Good: PR previews; Chromatic adds visual review.
- Bad: another account and a secret token in the repo settings; not needed yet.

# SignFlow · Belegscan · Kontur

Portfolio monorepo: two German B2B products built on one Angular design system.

| Project              | What it is                                                                | Path                |
| -------------------- | ------------------------------------------------------------------------- | ------------------- |
| **SignFlow**         | Document signing — envelopes, signing route, audit log (desktop-first)    | `apps/signflow`     |
| **Belegscan**        | Receipt recognition — on-device OCR, VAT, batch import (mobile-first PWA) | `apps/belegscan`    |
| **Kontur UI**        | Shared Angular component library, published as `@adlersoft/kontur-ui`     | `libs/ui`           |
| **Kontur Storybook** | Living documentation of the component library                             | `apps/ui-storybook` |

UI languages: German (default), English, Russian. Accessibility target: WCAG 2.1 AA / BITV 2.0.

> Status: workspace foundation (001), Kontur design tokens + fonts (003), first components in Storybook: Button/IconButton (004), TextField (005), Checkbox (006), token contrast test (007), Radio (008). The apps are empty shells; features follow task by task.

## Tech stack

Nx 24 · Angular 22 (standalone, zoneless, signals, OnPush) · pnpm 12 · Node 24 ·
Vitest · Playwright + axe · Storybook 10 · ESLint with module boundaries · Prettier ·
Husky + commitlint · GitHub Actions.

## Getting started

```sh
nvm use                     # Node 24 (from .nvmrc)
npm install -g pnpm@12.18.0 # or: corepack enable
pnpm install

pnpm nx serve signflow      # http://localhost:4200
pnpm nx serve belegscan     # http://localhost:4201
pnpm nx storybook ui-storybook  # http://localhost:4400
```

### Known issue: Kaspersky and nx.js

- **Symptom:** any `nx` command (also Playwright's `webServer`) fails with
  `Error: Cannot find module '…\node_modules\nx\dist\bin\nx.js'`.
- **Cause:** a false positive of Kaspersky's proactive defence
  (`PDM:Trojan.Win32.Generic`). It deletes `nx.js` from `node_modules`. The file is
  genuine: `nx@24.0.6` is built by the official nrwl/nx CI, and its hash matches the npm
  registry.
- **Prevent:** add an exclusion for the project folder in Kaspersky.
- **Check the file** (expected SHA-256 for `nx@24.0.6`:
  `2a1c0e6bcf0c3d7279da32a56422d9727815007e7525f66309391d52c4a77d1d`):

  ```sh
  sha256sum node_modules/nx/dist/bin/nx.js                          # Git Bash
  Get-FileHash node_modules/nx/dist/bin/nx.js -Algorithm SHA256     # PowerShell
  ```

- **Restore** (reinstalls from the lockfile, changes nothing in `package.json` or
  `pnpm-lock.yaml`), then check the hash again:

  ```sh
  pnpm install --frozen-lockfile --force
  ```

The expected hash changes with every `nx` version. After an upgrade, take the hash from
a clean install, for example in CI, and update it here. The npm `integrity` field hashes
the whole package tarball, not this single file.

## Quality checks

```sh
pnpm nx run-many -t lint test build   # all projects
pnpm nx affected -t lint test build   # only what your change touches
pnpm nx run-many -t e2e               # Playwright: app smoke + axe, Storybook stories axe + fonts (needs: pnpm exec playwright install chromium)
pnpm nx format:check --all            # Prettier
```

Every commit is checked by Husky (format check, Conventional Commits); every push and
pull request by [CI](.github/workflows/ci.yml).

## Repository map

| Path               | Content                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `apps/`            | Applications and their e2e projects                                                                                           |
| `libs/`            | Libraries (`ui` now; `receipt-parser`, `shared/*` later)                                                                      |
| `tools/tokens`     | Generator: `docs/design/tokens.json` → `libs/ui/src/styles/tokens.css` ([ADR-0002](docs/adr/0002-design-tokens-generator.md)) |
| `docs/design/`     | Design source of truth: Kontur tokens, component specs, screen mockups                                                        |
| `docs/adr/`        | Architecture Decision Records ([index](docs/adr/README.md))                                                                   |
| `docs/plans/`      | Plans of larger tasks                                                                                                         |
| `docs/journal/`    | What was built in each task and why ([index](docs/journal/README.md))                                                         |
| `docs/glossary.md` | Domain terms in DE / EN / RU                                                                                                  |

## Architecture rules

Each project carries a `scope:*` tag (`signflow`, `belegscan`, `shared`) and a `type:*` tag
(`app`, `feature`, `data-access`, `ui`, `util`). ESLint (`@nx/enforce-module-boundaries`)
rejects imports across products and upward through layers — see
[ADR-0001](docs/adr/0001-nx-monorepo-with-pnpm.md).

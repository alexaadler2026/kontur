# SignFlow · Belegscan · Kontur

Portfolio monorepo: two German B2B products built on one Angular design system.

| Project              | What it is                                                                | Path                |
| -------------------- | ------------------------------------------------------------------------- | ------------------- |
| **SignFlow**         | Document signing — envelopes, signing route, audit log (desktop-first)    | `apps/signflow`     |
| **Belegscan**        | Receipt recognition — on-device OCR, VAT, batch import (mobile-first PWA) | `apps/belegscan`    |
| **Kontur UI**        | Shared Angular component library, published as `@adlersoft/kontur-ui`     | `libs/ui`           |
| **Kontur Storybook** | Living documentation of the component library                             | `apps/ui-storybook` |

UI languages: German (default), English, Russian. Accessibility target: WCAG 2.1 AA / BITV 2.0.

> Status: task 001 — workspace foundation. The apps are empty shells; features follow task by task.

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

## Quality checks

```sh
pnpm nx run-many -t lint test build   # all projects
pnpm nx affected -t lint test build   # only what your change touches
pnpm nx run-many -t e2e               # Playwright smoke + axe (needs: pnpm exec playwright install chromium)
pnpm nx format:check --all            # Prettier
```

Every commit is checked by Husky (format check, Conventional Commits); every push and
pull request by [CI](.github/workflows/ci.yml).

## Repository map

| Path               | Content                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| `apps/`            | Applications and their e2e projects                                    |
| `libs/`            | Libraries (`ui` now; `receipt-parser`, `shared/*` later)               |
| `docs/design/`     | Design source of truth: Kontur tokens, component specs, screen mockups |
| `docs/adr/`        | Architecture Decision Records ([index](docs/adr/README.md))            |
| `docs/plans/`      | Plans of larger tasks                                                  |
| `docs/journal/`    | What was built in each task and why ([index](docs/journal/README.md))  |
| `docs/glossary.md` | Domain terms in DE / EN / RU                                           |

## Architecture rules

Each project carries a `scope:*` tag (`signflow`, `belegscan`, `shared`) and a `type:*` tag
(`app`, `feature`, `data-access`, `ui`, `util`). ESLint (`@nx/enforce-module-boundaries`)
rejects imports across products and upward through layers — see
[ADR-0001](docs/adr/0001-nx-monorepo-with-pnpm.md).

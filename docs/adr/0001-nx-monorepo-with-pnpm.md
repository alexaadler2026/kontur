# 0001. Nx monorepo with pnpm, Vitest and Playwright

- Status: Accepted
- Date: 2026-11-13

## Context and Problem Statement

The portfolio contains two products (SignFlow, Belegscan), each with a frontend and
later a NestJS backend, plus a shared component library (`libs/ui`, published to npm),
a Storybook, and shared libraries. They share the design system, TypeScript types and
tooling. We need one repository layout and toolchain that keeps these parts
consistent, lets CI check only what changed, and stays explainable in an interview.

## Decision Drivers

- One place for shared code (design tokens, components, API types) without
  publishing every change first.
- Enforceable architecture: SignFlow must not import Belegscan code.
- Fast CI: only check projects affected by a change.
- Mainstream tooling the German enterprise market recognises.
- Simple enough that every config file can be explained.

## Considered Options

1. **Nx monorepo** (integrated, Angular plugin)
2. Angular CLI workspace with multiple projects
3. Turborepo + Angular CLI
4. Separate repositories per app and library

## Decision Outcome

Chosen option: **Nx 24 monorepo**, because it is the only option that gives
dependency-graph-aware `affected` commands, module-boundary lint rules (tags) and
first-class generators for Angular, NestJS, Storybook and Playwright in one tool.

Toolchain decisions that come with it:

| Area            | Choice                                                                                                    | Why                                                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager | **pnpm 12** (pinned via `packageManager`)                                                                 | Strict: code cannot import a package it did not declare; fast installs via a content-addressed store; build scripts of dependencies run only when allowed in `pnpm-workspace.yaml` (`allowBuilds`) — a supply-chain safeguard |
| Node.js         | **24 LTS, exact patch pinned** (`.nvmrc` = `engines.node`, e.g. 24.22.3; amended 2026-11-23, journal 038) | One version everywhere: CI and the future Dockerfile read `.nvmrc`; `pnpm check:node-version` and `engineStrict` refuse any other Node                                                                                        |
| Unit tests      | **Vitest** via `@angular/build:unit-test` (`vitest-angular`)                                              | Angular's official runner since v21; no extra adapter (AnalogJS) and no Jest/ESM friction                                                                                                                                     |
| E2E tests       | **Playwright**                                                                                            | Cross-browser, auto-waiting, built-in axe integration via `@axe-core/playwright`                                                                                                                                              |
| Bundler         | **esbuild** (`@angular/build:application`)                                                                | Angular default; required by `vitest-angular`                                                                                                                                                                                 |
| Formatting      | **Prettier** (`nx format`)                                                                                | De-facto standard, zero debate                                                                                                                                                                                                |
| Remote cache    | **None** (Nx Cloud skipped)                                                                               | No external service or account needed; can be added later in a new ADR                                                                                                                                                        |

The workspace root was written by hand from the files of `create-nx-workspace`,
because the Nx 24 presets either produce a TypeScript project-references setup that
Angular does not support (`apps`) or a demo shop application with SSR and Docker
(`angular-monorepo`). Only the root configs were kept; every dependency was then
added with `nx add` / generators.

### Consequences

- Good: `nx affected -t lint test build` checks only changed projects, locally and in CI.
- Good: tags (`scope:*`, `type:*`) and `@nx/enforce-module-boundaries` turn the
  architecture into a lint error instead of a code-review comment.
- Good: one lockfile, one TypeScript and Angular version for all projects.
- Bad: Nx is an extra layer to learn (project graph, plugins, inferred targets).
- Bad: Nx and Angular majors must be upgraded together (`nx migrate`).

## Pros and Cons of the Options

### Nx monorepo

- Good: affected commands, module boundaries, generators, caching.
- Bad: extra abstraction over the Angular CLI.

### Angular CLI multi-project workspace

- Good: no extra tool, official.
- Bad: no affected detection, no boundary rules, no NestJS/Playwright integration.

### Turborepo + Angular CLI

- Good: simple task runner with caching.
- Bad: no Angular generators, no boundary rules; Angular support is manual.

### Separate repositories

- Good: full isolation.
- Bad: shared types and components need publishing for every change; versions drift.

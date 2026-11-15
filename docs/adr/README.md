# Architecture Decision Records

An ADR is a short document that records one architectural decision: the problem,
the options that were considered, what was chosen and what follows from it.
ADRs are written in English and follow the [MADR](https://adr.github.io/madr/) format.

## Rules

- One decision per ADR. File name: `NNNN-short-title.md`, numbered in order.
- An accepted ADR is never rewritten. If a decision changes, write a new ADR and
  set the old one to `Superseded by ADR-NNNN`.
- Read the relevant ADR before changing architecture (see `CLAUDE.md`).

## Index

| ADR                                     | Title                                                                      | Status   |
| --------------------------------------- | -------------------------------------------------------------------------- | -------- |
| [0000](0000-npm-scope-adlersoft.md)     | npm scope `@adlersoft` for published packages                              | Accepted |
| [0001](0001-nx-monorepo-with-pnpm.md)   | Nx monorepo with pnpm, Vitest and Playwright                               | Accepted |
| [0002](0002-design-tokens-generator.md) | Design tokens: CSS generated from tokens.json by an own script             | Accepted |
| [0003](0003-component-styles.md)        | Component styles: k-* classes ported 1:1, shared styles in kontur-base.css | Accepted |
| [0004](0004-form-controls-cva.md)       | Form controls: ControlValueAccessor over a native input, state in signals  | Accepted |

## Template

```markdown
# NNNN. <Short title of the decision>

- Status: Proposed | Accepted | Superseded by ADR-NNNN
- Date: YYYY-MM-DD

## Context and Problem Statement

<What is the problem? Why does it need a decision now?>

## Decision Drivers

- <criterion 1>
- <criterion 2>

## Considered Options

1. <option A>
2. <option B>

## Decision Outcome

Chosen option: "<option>", because <justification against the drivers>.

### Consequences

- Good: <…>
- Bad: <…>

## Pros and Cons of the Options

### <option A>

- Good: <…>
- Bad: <…>
```

| [0005](0005-storybook-on-github-pages.md) | Storybook on GitHub Pages: build once, deploy the tested artifact | Accepted |
| [0006](0006-i18n-transloco.md) | i18n: Transloco with ICU in the apps, the library stays i18n-agnostic | Accepted |

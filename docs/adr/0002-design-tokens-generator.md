# 0002. Design tokens: CSS generated from tokens.json by an own script

- Status: Accepted
- Date: 2026-11-14

## Context and Problem Statement

The Kontur design system lives in `docs/design/tokens.json` (v2): colours for light and
dark theme, shadows, spacing, radius, control sizes, font families, text styles and
self-hosted fonts split into latin and cyrillic subsets. `docs/design/README.md`
requires the CSS for `libs/ui` to be **generated** from this file and to match the
reference `docs/design/tokens.css` 1:1. Copying values by hand would let the CSS
silently drift from the design system.

How do we turn `tokens.json` into CSS, and how do we make sure the CSS stays in sync?

## Decision Drivers

- Output must equal `docs/design/tokens.css` rule for rule (testable).
- Every line of the toolchain must be explainable in an interview.
- No unnecessary dependencies.
- A reviewer must see the resulting CSS in a pull request.
- A forgotten regeneration must fail CI, not reach production.

## Considered Options

1. **Own generator** — a small TypeScript script (~100 lines) with a golden test
2. **Style Dictionary** — the de-facto standard token build tool
3. Hand-written CSS, copied from `tokens.css`

## Decision Outcome

Chosen option: **own generator**, because our `tokens.json` has its own format
(lists of `{ name, value: { light, dark } }`, plus the Kontur extensions
`type.fontSubsets`, `type.fonts[].subset`, `letterSpacing` and `fontVariantNumeric`).
Style Dictionary would need a converter into its format **and** custom formats for
the two themes, `@font-face` with `unicode-range` and the text-style classes — more
configuration than the generator itself. A ~100-line pure function is easier to
explain and is verified by a golden test against `docs/design/tokens.css`.

How it is wired:

- `tools/tokens` (Nx project `tokens`): pure function `generateTokensCss(tokens)` plus
  a CLI run directly by Node 24 (type stripping, `erasableSyntaxOnly`).
- Nx target `tokens:generate` with `inputs` (`tokens.json`, fonts, generator source)
  and `outputs` (`libs/ui/src/styles/tokens.css`, `libs/ui/src/styles/fonts`) — cached.
- **The generated CSS and fonts are committed** in `libs/ui`, so reviewers see the
  real CSS diff in a pull request.
- `tokens:check` regenerates in memory and compares with the committed files; CI runs
  it on every build and fails if they differ.

**Revisit when** other platforms (iOS/Android) or several brands need the same tokens —
that is the problem Style Dictionary is built for.

### Consequences

- Good: zero new dependencies; the whole pipeline fits on one screen.
- Good: the golden test proves the output equals the design-system reference.
- Good: CSS changes are visible in code review; drift fails CI.
- Bad: generated files live in the repository and must not be edited by hand
  (the file header says so; `tokens:check` catches it).
- Bad: new token categories need code changes in the generator.

## Pros and Cons of the Options

### Own generator

- Good: fits our JSON format exactly, fully explainable, golden-tested.
- Bad: we maintain it ourselves.

### Style Dictionary

- Good: industry standard, multi-platform outputs (CSS, iOS, Android), known in interviews.
- Bad: needs a converter for our JSON plus custom formats for themes, font faces and
  text styles; more configuration than code saved.

### Hand-written CSS

- Good: nothing to build.
- Bad: values are copied by hand and drift silently from the design system; violates
  "generate from tokens.json" in `docs/design/README.md`.

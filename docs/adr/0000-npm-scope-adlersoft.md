# 0000. npm scope `@adlersoft` for published packages

- Status: Accepted
- Date: 2026-11-13

## Context and Problem Statement

`libs/ui` is published to npm, and `libs/receipt-parser` and `libs/shared/api-types`
may follow. Every package needs a scope, and the scope is also the TypeScript import
path used everywhere in the monorepo (`import { … } from '@scope/…'`). Changing it
later means touching every import, so it has to be decided before the first library
is generated.

## Decision Drivers

- The scope must be **guaranteed to be ours**: publishing must never fail because
  someone else owns the name.
- **Authorship is visible at once**: a recruiter who sees the package on npm should
  know who built it.
- No confusion with existing, unrelated libraries.

## Considered Options

1. `@kontur` — named after the design system
2. `@adler` / `@adlerdev` — short personal names
3. `@adlersoft` — the owner's registered npm username

## Decision Outcome

Chosen option: **`@adlersoft`**, because it is the only option that satisfies both
"guaranteed ours" and "authorship visible": the username `adlersoft` is registered on
npmjs.com by the owner, so the scope belongs to the owner.

Package names:

| Library | Package |
| --- | --- |
| `libs/ui` | `@adlersoft/kontur-ui` |
| `libs/receipt-parser` | `@adlersoft/receipt-parser` |
| `libs/shared/api-types` | `@adlersoft/shared-api-types` |

The design-system name stays visible in the package name (`kontur-ui`).

### Consequences

- Good: publishing cannot be blocked by a name conflict.
- Good: the author is visible in every import and on npm.
- Bad: import paths are longer than with a short scope (`@adlersoft/kontur-ui`
  instead of `@kontur/ui`).
- Bad: renaming later would touch every import in the repo — this is why the
  decision is recorded before any code exists.

## Pros and Cons of the Options

### `@kontur`

- Good: short, matches the design system.
- Bad: availability cannot be verified in advance — an npm scope is only reserved
  by creating an organisation or user with that name.
- Bad: "Kontur" is already used as the name of a UI library (`@skbkontur/react-ui`),
  which invites confusion.

### `@adler` / `@adlerdev`

- Good: short, personal.
- Bad: both are already taken by other npm users — not available.

### `@adlersoft`

- Good: registered by the owner, guaranteed available, shows authorship.
- Bad: slightly longer import paths.

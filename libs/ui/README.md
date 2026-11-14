# @adlersoft/kontur-ui

Angular component library of the **Kontur** design system, shared by SignFlow and
Belegscan and published to npm (scope decision: [ADR-0000](../../docs/adr/0000-npm-scope-adlersoft.md)).

- Design source of truth: [`docs/design/`](../../docs/design/README.md) — tokens,
  component specs and the target API (`api-contracts.d.ts`).
- Components are standalone, OnPush, signal-based; CSS classes `k-*` map 1:1 to components.
- Stories live next to the components (`*.stories.ts`) and are shown by `apps/ui-storybook`.

## Styles

| File                         | Origin                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| `src/styles/tokens.css`      | **Generated** from `docs/design/tokens.json` — do not edit                 |
| `src/styles/fonts/*.woff2`   | **Copied** by the generator (IBM Plex, latin + cyrillic, OFL)              |
| `src/styles/kontur-base.css` | Shared styles (ADR-0003): page base, focus ring, keyframes, reduced motion |

Generator and decision: [`tools/tokens`](../../tools/tokens), [ADR-0002](../../docs/adr/0002-design-tokens-generator.md).

```sh
pnpm nx run tokens:generate   # after changing docs/design/tokens.json
pnpm nx run tokens:check      # fails if the committed CSS is out of date (runs in CI)
```

Apps include the styles in `project.json` → `build.options.styles` and set
`<body class="body">` (generated text style). Themes: light by default (`:root`),
dark via `data-theme="dark"` on `<html>`.

Package consumers get the same files under `src/styles/` of the npm package.

## Status

Tokens and fonts are in place; components follow. The `test` target is added together
with the first component and its spec, because the Angular unit-test builder fails when
a project has no spec files.

```sh
pnpm nx build ui      # ng-packagr build into dist/libs/ui
pnpm nx lint ui
```

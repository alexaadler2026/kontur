# @adlersoft/kontur-ui

Angular component library of the **Kontur** design system, shared by SignFlow and
Belegscan and published to npm (scope decision: [ADR-0000](../../docs/adr/0000-npm-scope-adlersoft.md)).

- Design source of truth: [`docs/design/`](../../docs/design/README.md) — tokens,
  component specs and the target API (`api-contracts.d.ts`).
- Components are standalone, OnPush, signal-based; CSS classes `k-*` map 1:1 to components.
- Stories live next to the components (`*.stories.ts`) and are shown by `apps/ui-storybook`.

Status: empty skeleton (task 001). The `test` target is added together with the first
component and its spec (task 002), because the Angular unit-test builder fails when a
project has no spec files.

```sh
pnpm nx build ui      # ng-packagr build into dist/libs/ui
pnpm nx lint ui
```

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

Apps include `tokens.css` and `kontur-base.css` in `project.json` → `build.options.styles` and set
`<body class="body">` (generated text style). Themes: light by default (`:root`),
dark via `data-theme="dark"` on `<html>`.

Package consumers get the same files under `src/styles/` of the npm package.

## Components

Live docs: **[Storybook](https://alexaadler2026.github.io/kontur/)** — every component, both themes, keyboard behaviour. It is
the exact build that passed axe and the keyboard e2e in CI ([ADR-0005](../../docs/adr/0005-storybook-on-github-pages.md)).

| Component   | Selector                                                                                                                  | Spec                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Button      | `<button k-button>`, `<a k-button>`                                                                                       | [Button.md](../../docs/design/components/Button.md)       |
| IconButton  | `<button k-icon-button ariaLabel="…">`                                                                                    | [Button.md](../../docs/design/components/Button.md)       |
| TextField   | `<k-form-field label="…"><input k-input /></k-form-field>`                                                                | [TextField.md](../../docs/design/components/TextField.md) |
| Checkbox    | `<k-checkbox label="…" [formControl]="…" />`                                                                              | [Checkbox.md](../../docs/design/components/Checkbox.md)   |
| Radio       | `<k-radio-group legend="…" name="…" [formControl]="…"><k-radio value="…" label="…" /></k-radio-group>`                    | [Radio.md](../../docs/design/components/Radio.md)         |
| Switch      | `<k-switch label="…" [formControl]="…" />` — instant settings only; with a Save button use Checkbox                       | [Switch.md](../../docs/design/components/Switch.md)       |
| Badge       | `<k-badge tone="success">Signiert</k-badge>` — status as text + dot shape, never colour only                              | [Badge.md](../../docs/design/components/Badge.md)         |
| Avatar      | `<k-avatar name="Anna Berger" />` — initials, role="img" named by the full name                                           | [Avatar.md](../../docs/design/components/Avatar.md)       |
| AvatarStack | `<k-avatar-stack [names]="…" size="sm" ariaLabel="…" />` — max 3 + "+N", one image with one label                         | [Avatar.md](../../docs/design/components/Avatar.md)       |
| Tag         | `<k-tag removable (removed)="…">NDA</k-tag>` — button named "Entfernen NDA"; the consumer removes the tag and moves focus | [Tag.md](../../docs/design/components/Tag.md)             |

**Radio `name` must be unique on the page.** Radios with the same `name` outside a `<form>`
are one group for the browser: choosing in one `k-radio-group` would uncheck the other, and
arrow keys would jump between them. Inside a `<form>` the scope is that form.

## For developers

**Missing context (a component used outside its parent):**

- If the component **does not work at all** without the context → throw a clear error
  **always**, in every mode. Example: `k-radio` without `k-radio-group` has no `name` and no
  form value; in production it would otherwise fail with "Cannot read properties of null".
- If it **works, only worse** → a clear error **only in dev mode** (`isDevMode()`). Example:
  `k-input` without `k-form-field` still works as a field, just without label and ARIA links.

Styles: shared rules in `src/styles/kontur-base.css`, component rules next to each
component, ported 1:1 from `docs/design/components.css` ([ADR-0003](../../docs/adr/0003-component-styles.md)).

```sh
pnpm nx test ui                 # Angular Testing Library specs (Vitest)
pnpm nx build ui                # ng-packagr build into dist/libs/ui
pnpm nx lint ui
pnpm nx e2e ui-storybook-e2e    # axe on every story + font subset loading
```

# 0003. Component styles: k-\* classes ported 1:1, shared styles in kontur-base.css

- Status: Accepted
- Date: 2026-11-14

## Context and Problem Statement

`docs/design/components.css` is the reference CSS of all 21 Kontur components. Its
classes (`k-btn`, `k-btn--primary`, `.is-loading` …) are also used by the screen mockups
in `docs/design/screens/*.html`. `libs/ui` now gets its first component (Button) and sets
the pattern for the other 20: where does component CSS live, how is it scoped, and where
do rules go that many components share (focus ring, keyframes, reduced motion)?

Several contracts in `api-contracts.d.ts` use attribute selectors on native elements
(`<button k-button>`, `<a k-button>`) to keep native semantics.

## Decision Drivers

- The implementation must match the reference 1:1 — the same class names as the mockups.
- Porting 20 more components must be mechanical, not a rewrite.
- No duplicated rules (a focus ring copied into 15 components drifts).
- Every line explainable; no clever build tricks.

## Considered Options

1. **`ViewEncapsulation.None` + reference classes on the host**, shared rules in one global file
2. Emulated encapsulation with `:host(.k-btn--primary)` selectors
3. Everything in one global stylesheet (port `components.css` as a whole)

## Decision Outcome

Chosen option: **1**.

- **Component styles live next to the component** (`libs/ui/src/lib/<name>/<name>.css`)
  and contain only that component's section of `components.css`, copied verbatim.
  The component uses `ViewEncapsulation.None` and sets the reference classes on its host
  element (e.g. `k-btn k-btn--primary`). The styles are loaded with the component.
- **Shared styles live in `libs/ui/src/styles/kontur-base.css`** and are loaded globally
  next to `tokens.css` (apps and Storybook via `styles` in `project.json`; npm consumers
  via the package's `src/styles/`):
  - the "base" section of `components.css`: box-sizing, `.k-body`, `.k-num`, `.k-label`,
    `.k-caption`, `.k-link`;
  - the `:focus-visible` / `.is-focus` rule for all `k-*` controls;
  - all `@keyframes` (`k-spin`, `k-shimmer`, `k-indeterminate`);
  - the `prefers-reduced-motion` block;
  - the page base (`body` background and colour via tokens).
- Rule of thumb: **shared → `kontur-base.css`, component-specific → next to the component.**
  Icon rules (`.k-btn .k-ico`, `.k-menu-item .k-ico` …) are component-specific in the
  reference, so they stay with their component.
- **One reference section = one CSS file**, used by every component that needs it.
  Some sections style several components (the "Form field" section also styles
  `.k-select`: `.k-field, .k-select { … }`), so they are not split: FormField owns
  `form-field.css`, and Select will list the same file in its `styleUrls` instead of
  copying the rules. (Amendment 2026-11-14, task 005.)
- Size `md` is the absence of a modifier, exactly as in the reference
  (`k-btn` = 36 px, `k-btn--sm`, `k-btn--touch`); there is no `k-btn--md`.

### Consequences

- Good: the DOM of a component equals the mockup markup; specs and screenshots compare directly.
- Good: porting the next component = copy its section + write the host bindings.
- Good: one focus-ring rule for the whole library.
- Bad: component CSS is global once loaded. Mitigated by the `k-` prefix on every class;
  apps must not define `k-*` classes themselves.
- Bad: `kontur-base.css` must be included by every consumer (documented in `libs/ui/README.md`).

## Pros and Cons of the Options

### ViewEncapsulation.None + reference classes

- Good: 1:1 with reference and mockups, mechanical porting.
- Bad: no style isolation beyond the naming convention.

### Emulated encapsulation with `:host(...)`

- Good: Angular scopes the styles.
- Bad: every selector is rewritten (`.k-btn--primary` → `:host(.k-btn--primary)`), the CSS
  no longer matches the reference, and children projected via `<ng-content>` (icons) are
  outside the component's scope.

### One global stylesheet for everything

- Good: simplest to wire.
- Bad: every app loads the CSS of all 21 components; no link between a component and its styles.

# 0022. Icons: Lucide through `@lucide/angular`, one standalone component per icon

- Status: Accepted
- Date: 2026-11-17

## Context and Problem Statement

Kontur draws icons as inline stroke SVG in Lucide style (`docs/design/README.md`,
components such as Alert name the Lucide icon per tone). So far `libs/ui` copies the few
icons it needs by hand (the warning triangle of field errors, the "x" of Tag). The sign-in
screen (task 8), Alert (UI-17) and every later screen need many more. We need one way to
put an icon into a template that matches the mockups, does not bloat the bundle and is
accessible.

The design README named the package `lucide-angular`. Checked on 2026-11-17:
`lucide-angular` 1.0.0 is **deprecated** on npm ("Please use @lucide/angular instead") and
declares `@angular/core` `13.x - 21.x` as peer dependency — it does not support our
Angular 22. Its official successor is `@lucide/angular` (same Lucide project, ISC license,
peer `@angular/core >=17`, only dependency `tslib`, "standalone, signal based, zoneless").

## Decision Drivers

- Icons look exactly like the mockups (Lucide, `stroke-width` 2, `currentColor`, sizes
  14/16/18/24 from `components.css`).
- Only the icons in use end up in the bundle (Lucide has about 2,000).
- An icon name that does not exist fails at build time, not at run time.
- Accessibility: decorative icons hidden from screen readers, meaning carried by text.
- Works with Angular 22, signals, OnPush, zoneless; maintained.
- Usable inside the published library `@adlersoft/kontur-ui`.

## Considered Options

1. **`@lucide/angular`, one standalone component per icon** (`<svg lucideCircleAlert>`)
2. `@lucide/angular` with the dynamic icon (`<svg [lucideIcon]="'circle-alert'">` and
   `provideLucideIcons()`)
3. `lucide-angular` (the package named in the design README)
4. Hand-copied SVG (the current state)
5. An SVG sprite file
6. An icon font
7. Material Symbols

## Decision Outcome

Chosen: **1, `@lucide/angular`, one standalone component per icon.**

- An icon is a component on the native `<svg>`:
  `<svg lucideCircleAlert class="k-ico" aria-hidden="true"></svg>`. The element stays an
  `<svg>`, so the `k-*` CSS of the reference (`.k-alert > .k-ico`, `.k-btn .k-ico`, …)
  applies 1:1 (ADR-0003).
- Each icon is imported where it is used (`imports: [LucideCircleAlert]`). Only those
  icons are bundled; a misspelled name does not compile.
- **Names follow the Kontur specs** (`info`, `circle-check`, `triangle-alert`,
  `circle-alert`, `x`, …). Some of them are aliases in current Lucide (`circle-alert` →
  `circle-exclamation-point`); aliases work as selectors and component names.
- **Size and stroke** come from the reference: the `k-*` CSS sets the size where the
  reference has a rule; otherwise `size` is set to the mockup's value. Stroke width stays
  Lucide's default 2, colour `currentColor`.
- **Accessibility:** without a `title` the component sets `aria-hidden="true"`. Icons are
  decorative; the text next to them carries the meaning (WCAG 1.1.1, 1.4.1 — e.g. Alert
  tones differ in icon shape and in text, not only in colour). An icon-only button gets
  its name from the button's `aria-label` (`k-icon-button` requires it), never from the
  icon.
- **Dependency:** `@lucide/angular` is a `peerDependency` of `@adlersoft/kontur-ui`
  (the consumer installs it once; no second copy) and a dependency of the workspace.
  Version range `~1.73.0`: patch updates only; minor updates are taken on purpose.
  (1.74.0 was released on the day of the decision and is blocked by pnpm's minimum
  release age, a supply-chain guard; the rule is not bypassed.)

### Consequences

- Good: icons are identical to the Lucide originals the mockups are drawn from; no manual
  copying of paths.
- Good: tree-shaking per icon; compile-time check of names.
- Good: signal-based, OnPush and zoneless friendly, like the rest of the code base.
- Bad: one more runtime dependency of the published library (small, ISC, no transitive
  dependencies besides `tslib`).
- Bad: Lucide sometimes redraws icons (e.g. `triangle-alert`); a minor update can change
  a glyph slightly. Updates are deliberate and checked in Storybook.
- `docs/design/README.md` is corrected to name `@lucide/angular`.

## Pros and Cons of the Options

### `@lucide/angular`, component per icon

- Good: see above.
- Bad: one import per icon in each component.

### `@lucide/angular`, dynamic icon by name

- Good: an icon can be chosen from data (a string).
- Bad: names are checked only at run time; every icon must be registered with
  `provideLucideIcons()`; an icon passed as a string is easy to forget there. Kept as a
  fallback for the rare data-driven case, not the default.

### `lucide-angular`

- Bad: deprecated; does not declare Angular 22 support. Rejected.

### Hand-copied SVG

- Good: no dependency.
- Bad: every icon is copied by hand, paths drift from Lucide, no updates; does not scale
  to the screens of waves 1–3.

### SVG sprite

- Good: one cached file.
- Bad: must be shipped and referenced as an asset by every consumer of the npm library;
  `<use href>` across origins is fragile; all icons are loaded, used or not.

### Icon font

- Bad: blurry at small sizes, stroke width cannot follow the mockups, screen readers may
  read the glyphs, fails when the font is blocked.

### Material Symbols

- Bad: different visual language from Kontur.

## More Information

- Package: <https://www.npmjs.com/package/@lucide/angular>, docs
  <https://lucide.dev/guide/packages/angular>.
- ADR-0003 (component styles 1:1 with the reference), ADR-0004 (accessibility of
  controls).

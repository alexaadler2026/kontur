# 0006. i18n: Transloco with ICU in the apps, the component library stays i18n-agnostic

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

The product UI has three languages: **German (default), English, Russian** (CLAUDE.md,
`docs/design/README.md`). The user switches the language **at runtime, without a reload**.
Plurals must follow the language rules (Russian has three forms: 1 документ / 2 документа /
5 документов), and dates, numbers and currency must follow the active locale
(de `12.11.2026`, `1.234,56 €`; en `12/11/2026`, `€1,234.56`; ru `12.11.2026`, `1 234,56 €`).

The component library `@adlersoft/kontur-ui` is published to npm and must not force an i18n
library on its consumers. Its few built-in accessibility strings ("Entfernen", "1–7 von 12")
come from `KonturIntl` (contract: `api-contracts.d.ts`).

We need to decide: which i18n library the apps use, how plurals and formats work, where the
boundary of the library is, where translation files live, how a missing key is caught and
who translates.

## Decision Drivers

- Runtime language switch without reload (hard requirement).
- ICU plurals and select; CLDR plural categories per language.
- Locale formats via `Intl`, following the active language.
- `libs/ui` free of any i18n library (it is a published package).
- Missing or broken translations fail CI, not production.
- Simple enough that the owner can explain every part in an interview.

## Considered Options

1. **Transloco** (`@jsverse/transloco` 8.4 + `@jsverse/transloco-messageformat` 8.4, MIT)
2. `@angular/localize` (Angular's built-in i18n, 22.2)
3. ngx-translate (`@ngx-translate/core` 18 + `ngx-translate-messageformat-compiler` 7)
4. Own thin layer on signals + `intl-messageformat`

## Decision Outcome

Chosen option: **1, Transloco with the messageformat transpiler**, in the apps only.

### Languages and switching

- Languages `de` (default), `en`, `ru`. `setActiveLang()` switches at runtime; translation
  files are loaded lazily per language over HTTP.
- On every switch the app sets `<html lang>` to the active language, so screen readers use
  the right pronunciation (WCAG 3.1.1 Language of Page).
- Start language: saved choice → browser languages (`navigator.languages`) → `de`.
  Persisting the choice is implemented with the first app screen.

### Plurals and formats

- Plurals and selects **only as ICU messages** in the translation files, compiled by
  messageformat with CLDR categories (ru: `one` / `few` / `many` / `other`).
  `count + " Dokumente"` is forbidden.
- Dates, numbers and currency **via `Intl`** with the locale of the active language:

  | Language | Locale  | Date         | Currency     |
  | -------- | ------- | ------------ | ------------ |
  | de       | `de-DE` | `12.11.2026` | `1.234,56 €` |
  | en       | `en-GB` | `12/11/2026` | `€1,234.56`  |
  | ru       | `ru-RU` | `12.11.2026` | `1 234,56 €` |

  **`en` means `en-GB`** (European date order, as in the design README), not `en-US`.

- Angular's `DatePipe` / `CurrencyPipe` are not used for UI text: they read `LOCALE_ID`,
  which is fixed at bootstrap and cannot follow a runtime switch.
- `Intl` uses non-breaking spaces in some formats (U+00A0 / U+202F, e.g. in `1 234,56 €`).
  Tests compare with the output of `Intl` or normalise these spaces; they never hard-code a
  plain space.

### Boundary of the component library

- `libs/ui` depends on **no** i18n library. Enforced by ESLint (`no-restricted-imports` for
  `@jsverse/*`, `@ngx-translate/*` and `@angular/localize` in `libs/ui`) and by
  `@nx/dependency-checks`.
- Component texts (labels, hints, errors) are passed in already translated (contract).
- Built-in accessibility strings come from **`KonturIntl`**: an abstract injectable class
  (pattern: Angular Material's `MatPaginatorIntl`) with signal-based members, e.g.
  `removeLabel()`, `rangeLabel(from, to, total)` ("1–7 von 12"), `matchCount(n, m)`.
  Numbers inside are formatted with `Intl` for the intl's locale; plurals follow CLDR.
- The library ships **`KonturIntlDe` (default), `KonturIntlEn` and `KonturIntlRu`** — the
  product UI languages, so the library works in all three without an app adapter.
- An app replaces the provider (`{ provide: KonturIntl, useClass: AppKonturIntl }`) with an
  implementation on top of Transloco, so built-in strings switch together with the app.
- `KonturIntl` is implemented in code with the first component that needs it (Tag or
  Pagination); this ADR fixes its shape.

### Translation files

- Each app owns its files: `apps/<app>/public/i18n/{de,en,ru}.json` (served as static
  files). The Storybook prototype keeps its files in `apps/ui-storybook/src/i18n/`.
- `de.json` is the source; every other language file must have exactly the same keys.

### The language list is configuration, not code

Real use of the product is in Kyrgyzstan (`docs/business-processes.md`), so a further
language such as Kyrgyz (`ky`) must be possible without rework. Therefore every translation
folder has **one** config, `languages.json`:

```json
{
  "source": "de",
  "languages": [
    { "code": "de", "locale": "de-DE", "name": "Deutsch" },
    { "code": "en", "locale": "en-GB", "name": "English (en-GB)" },
    { "code": "ru", "locale": "ru-RU", "name": "Русский" }
  ]
}
```

- The app reads it for the language switcher, Transloco (`availableLangs`, default and
  fallback) and the `Intl` locale; `tools/i18n-check` reads the same file.
- **Adding a language = one `<code>.json` file + one line in `languages.json`.** No code
  changes. The new language is checked like the others, with its own CLDR plural rules
  (`ky-KG`: `one`, `other`).
- `KonturIntl` in `libs/ui` ships only de, en and ru. For another language the app provides
  its own implementation (it replaces the provider anyway).
- Kyrgyz itself is not added now (owner, 2026-11-15).

### Missing or broken translations

- **CI:** `tools/i18n-check` (Vitest, runs with `nx run-many -t test`) checks every
  translation folder:
  - `languages.json` is valid: the source is a configured language, every locale is a
    valid BCP 47 tag;
  - every configured language has a file, and every file is a configured language;
  - every language has exactly the keys of the source (no missing, no extra);
  - every message parses as ICU;
  - every plural has all CLDR forms of its locale, taken from `Intl.PluralRules`
    (ru: `one`, `few`, `many`, `other`).
- **Runtime:** in development and tests a missing key is reported as an error by Transloco's
  missing handler; in production the German text is shown as fallback.
  - _Implementation note (2026-11-22, journal 030):_ the production fallback is done by our
    missing handler, not by Transloco's `useFallbackTranslation`. That option loads a
    language and German together (`forkJoin`). A failed `de.json` then failed the start
    language as well, and German was fetched twice. German is loaded in parallel at start
    (one 10 s deadline). The handler shows its text when the active language lacks a key.

### Who translates

- **de** is the source. Texts from the mockups are taken as they are. New German texts are
  written by Claude and listed in the task report as "for review"; the owner (German B1)
  does not let them through unreviewed.
- **en** is written by Claude and reviewed by the owner.
- **ru** is reviewed by the owner (native speaker).
- Machine translation is only a draft; nothing is committed without the review above.
- A pull request without all three languages fails CI (key parity check).

### Consequences

- Good: runtime switch, lazy loading, ICU plurals, missing-key handling and test helpers out
  of the box; widely used in Angular enterprise projects.
- Good: the published library stays independent; consumers can use any i18n library by
  replacing `KonturIntl`.
- Good: broken or incomplete translations fail CI.
- Bad: two runtime dependencies in the apps. `transloco-messageformat` 8.4 requires the
  peer `@jsverse/utils` **exactly `1.0.0-beta.5`** (a beta). Checked on install
  (2026-11-15): pnpm resolves exactly that version, no new peer issue. Watch it on upgrades.
- Bad: formats are our own small `Intl` helpers instead of Angular pipes (because of
  `LOCALE_ID`).

## Pros and Cons of the Options

### Transloco

- Good: `setActiveLang` at runtime, lazy per-language JSON, signal API, missing handler,
  fallback language, testing module; ICU through the official messageformat plugin.
- Bad: two packages; a beta peer dependency (see above).

### `@angular/localize`

- Good: built into Angular, compile-time extraction, ICU support, no runtime cost.
- Bad: **translations are compiled into the build — one build and one URL per language,
  switching means a reload.** Fails the main requirement.

### ngx-translate

- Good: runtime switch, very widespread.
- Bad: ICU only through a third-party compiler plugin from another author; lazy loading,
  fallback and missing-key handling need more own code.

### Own layer on signals + `intl-messageformat`

- Good: about 150 lines, every line explainable, no framework coupling.
- Bad: loaders, fallback, missing keys, caching and test helpers are all our own — a
  re-implementation of Transloco with more risk.

# docs/design — design source of truth

This folder is the reference for every UI task in this repo (see CLAUDE.md →
"Design source of truth"). It is a **snapshot** of the design system "Kontur" and
the SignFlow / Belegscan mockups, exported on 2026-11-13. Do not edit these files
to make an implementation "fit": if the design must change, the owner changes it
in the design system first and a new snapshot replaces this folder.

## What is where

| Path | What it is | How to use it |
| --- | --- | --- |
| `tokens.json` | All design tokens (colors for light + dark, typography, spacing, radius, shadow, sizes), each with a usage note and its contrast ratio. v2 adds Kontur extension keys: `type.fontSubsets` (cyrillic files + `unicodeRanges` per subset), `type.fonts[].subset`, `letterSpacing` and `fontVariantNumeric` on text styles. Version history: `meta.changelog` (v4 adds `error-hover`/`error-active` for the danger button) | Source for `libs/ui` design tokens. Generate the CSS from it; never hard-code a value. Generated output must equal `tokens.css` 1:1 (font faces = `type.fonts` + `type.fontSubsets.files`, each with the `unicode-range` of its subset) |
| `tokens.css` | The same tokens compiled to CSS custom properties (`:root` = light, `[data-theme="dark"]`) + `@font-face` | Reference output: what the generated CSS must look like |
| `components.css` | Reference CSS for every component (`k-*` classes) incl. states `.is-hover/.is-focus/.is-active/.is-disabled/.is-invalid/.is-loading/.is-selected` | Visual and behavioral spec. Port to component styles in `libs/ui`; `k-btn` → `<k-button>`, etc. |
| `api-contracts.d.ts` | Target public API of each `libs/ui` component (inputs, variants, states) | Contract for the component's signal inputs/outputs. Propose deviations, don't silently change |
| `kontur-brandbook.md` | Principles, accessibility rules, contrast table, typography, spacing | Read once before the first UI task |
| `components/<Name>.md` | Spec of one component: purpose, rules, tokens used | Read before implementing the component |
| `components/<Name>.html` / `.png` | Live preview / screenshot of all states of the component | Open the `.html` in a browser to inspect; compare your Storybook story with the `.png` |
| `screens/<product>/<Screen>.png` | Screenshot of a mockup screen | Visual target for the screen |
| `screens/<product>/<Screen>.html` | The same screen as static HTML built only from tokens + `k-*` classes | Read the markup for exact structure, copy text, spacing and which component goes where |
| `fonts/` | IBM Plex Sans 400/500/600, IBM Plex Mono 400/500 (woff2, OFL license), each in two subsets: latin (`*.woff2`, covers German) and cyrillic (`*-cyrillic.woff2`, covers Russian) | Self-host these; no Google Fonts CDN (DSGVO). Keep the `unicode-range` split from `tokens.css`: a German page never downloads the cyrillic files |
| `logos/` | Working marks: Kontur, SignFlow, Belegscan (SVG) | App icons / header logos |

## Non-negotiable rules from the design system
1. Colors only via tokens. Text pairs are verified ≥ 4.5:1 (control borders,
   focus ring ≥ 3:1) in both themes — keep using the same pairs.
2. Status is never shown by color alone: badge dot shapes (circle = success,
   diamond = warning, square = error, ring = info) + text; OCR confidence frames
   differ by line style (solid / dashed / dotted) + a percentage.
3. Numbers, dates, hashes: IBM Plex Mono with tabular figures (`.k-num`),
   right-aligned in tables.
4. Borders, not shadows. Shadows only on overlays (menu, dialog, toast).
5. Two control borders: `border-subtle` for dividers/cards (decorative),
   `border-input` for inputs/checkboxes (must be ≥ 3:1, WCAG 1.4.11).
6. Three UI languages: **German (default), English, Russian**. Mockups show German
   (plus one English screen). Formats follow the active locale via Intl /
   Angular locale data: de `12.11.2026`, `1.234,56 €`; en-GB `12/11/2026`,
   `€1,234.56`; ru `12.11.2026`, `1 234,56 €`. Layouts must survive long German
   words and longer Russian strings (no fixed widths on buttons/columns).
   Russian has three plural forms (1 документ / 2 документа / 5 документов) —
   use ICU plural rules, never `count + " documents"`.

## Components (22)

| Group | Component | Purpose |
| --- | --- | --- |
| Actions | Button | 4 variants: primary, secondary, ghost, danger; sizes 36/32/44 |
| Forms | TextField | Label, hint, error; mono variant for numbers/IBAN |
| Forms | Select | Combobox with search |
| Forms | DatePicker | de-DE calendar, DD.MM.YYYY |
| Forms | Checkbox / Radio / Switch | Basic choice controls |
| Data | DataTable | Toolbar, sort, row selection, pagination, skeleton, empty |
| Data | Badge / Tag / Avatar | Status, filters, people |
| Overlays | Dialog / Toast / Tooltip / DropdownMenu | CDK Overlay based |
| Feedback | Alert | InlineAlert in forms and blocks, Banner at the top of the shell (v4.4) |
| Navigation | Tabs / Stepper / Breadcrumbs / SideNav | Navigation patterns |
| Upload & Progress | FileDrop / Progress | Upload zone, linear/ring/spinner |

## Screens

**SignFlow** (desktop-first, 1440 px; one mobile screen 390 px)

| File | Screen |
| --- | --- |
| `Main` | 01 · Übersicht — dashboard: counters, "requires your action", activity |
| `Dokumente` | 02 · Dokumente — tabs, table with filters and bulk actions |
| `Vorbereitung` | 03 · Umlauf vorbereiten — stepper, PDF pages, signature fields per signer |
| `Details` | 04 · Dokumentdetails — metadata, SHA-256, signing route, audit log |
| `Signieren` | 05 · Signieren — signer view with the signature dialog |
| `SignierenMobil` | 06 · Signieren on mobile (390) |
| `DokumenteLeer` / `DokumenteLaden` / `DokumenteFehler` | States: empty / skeleton / load error |
| `DocumentsEN` | 02 in English (i18n check) |
| `DetailsDunkel` | 04 in dark theme |
| `Anmelden` / `AnmeldenMobil` / `AnmeldenDunkel` | Sign-in: empty / field errors on mobile / form error in dark theme. Behaviour and texts: `Anmelden.md` |

**Belegscan** (mobile-first PWA, 390 px; desktop screens 1440 px)

| File | Screen |
| --- | --- |
| `Main` | 01 · Aufnahme — camera viewfinder, offline banner, gallery, batch |
| `Zuschnitt` | 02 · Crop & perspective with 4 handles |
| `Erkennung` | 03 · On-device recognition progress |
| `EditorMobil` | 04 · Receipt editor: OCR frames by confidence, items, VAT 7/19 %, TSE check |
| `Belege` | 05 · Receipt list grouped by month, swipe actions |
| `EditorDesktop` | 04 · Editor on desktop: review queue, sum mismatch error |
| `Dashboard` | 06 · Spending dashboard |
| `StapelImport` | 07 · Batch import: files + ZIP, processing queue, duplicates |
| `ErkennungFehler` / `BelegeLeer` | States: unreadable photo / empty list |
| `BelegeDunkel` | 05 in dark theme |

## Known simplifications in the mockups
- The "paper" of PDF pages and receipt photos uses fixed off-white/grey colors —
  it imitates content, not UI, and is intentionally outside the tokens.
- Charts on the dashboard are drawn with plain bars; pick a charting approach in
  an ADR when implementing it.
- Icons are inline stroke SVG in Lucide style; use the `@lucide/angular` package (ADR-0022; `lucide-angular` is deprecated).

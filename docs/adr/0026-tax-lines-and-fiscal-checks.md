# 0026. Receipt data model: a list of tax lines per receipt, country profiles as code, fiscal proofs as an extensible list

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

Belegscan must hold receipts from different countries without being rebuilt for each
(`business-processes.md`, "Countries, currencies, taxes"):

- **Germany — full support in v1:** VAT 7 % and 19 %, check of the TSE QR code.
- **Other countries:** any currency, tax entered by hand; fiscal QR codes of other
  countries are v2.
- The owner's model for v1 (answer 27 and the note for wave 3): **a list of tax lines per
  receipt, from zero to several** — name, rate, base, amount. Kyrgyzstan: usually VAT
  12 % and sales tax (НсП); rates can differ; a receipt may have no tax at all. German
  7 / 19 % is a special case of the same model.
- Amounts are exact (ADR-0008): totals in minor units, unit prices and quantities as
  decimal strings, only when printed on the receipt (answer 26). The line amount is the
  line total as printed.
- Checks: sum of items = total; TSE QR (Germany only). Confidence per field.

## Decision Drivers

- One model for all countries; a new country must not need a schema migration.
- Record what is printed; do not compute or "correct" tax.
- The same checks must run offline in the browser and again on the server.
- Fiscal QR codes of other countries must fit later without redesign.
- Analytics never mixes currencies.

## Considered Options

1. **Generic tax lines + country profiles in a shared code library + a list of fiscal
   proofs with a scheme name**
2. Fixed columns for German VAT (`vat7`, `vat19`) plus free-text fields for others
3. A fully configurable tax engine (tax definitions as data, editable in the UI)

## Decision Outcome

Chosen option: **1**.

### Receipt (the parts relevant here)

| Field              | Type                                           | Note                                                                                          |
| ------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `country`          | ISO 3166-1 code                                | selects the profile; chosen by the user, pre-set from the group                               |
| `currency`         | ISO 4217 code from the pinned table (ADR-0008) | one currency per receipt                                                                      |
| `total`            | Money                                          | as printed                                                                                    |
| `pricesIncludeTax` | boolean                                        | whether item amounts already contain tax (typical for shop receipts; false for most invoices) |
| `items[]`          | see below                                      | zero or more                                                                                  |
| `taxLines[]`       | see below                                      | **zero or more**                                                                              |
| `fiscalProofs[]`   | see below                                      | zero or more                                                                                  |
| `source`           | `photo`, `file`, `e-invoice`, `manual`         | where the data came from                                                                      |
| `documentNumber`   | text, optional                                 | invoice or receipt number when present                                                        |

### Item

| Field                   | Type                      | Note                                                                        |
| ----------------------- | ------------------------- | --------------------------------------------------------------------------- |
| `description`           | text                      |                                                                             |
| `lineTotal`             | Money                     | the line total **as printed**                                               |
| `quantity`, `unitPrice` | decimal strings, optional | only when printed                                                           |
| `taxCodes[]`            | references to tax lines   | **several allowed**: in Kyrgyzstan VAT and sales tax apply to the same item |

### Tax line

| Field                 | Type                        | Note                                                                                    |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| `code`                | short text                  | the marker linking items to this line ("A", "B", or generated)                          |
| `kind`                | `vat`, `sales_tax`, `other` | for grouping in export and analytics                                                    |
| `label`               | text                        | as printed or typed: "MwSt 7 %", "НДС", "НсП"                                           |
| `rate`                | decimal string, optional    | percent; absent when the receipt does not state it                                      |
| `net`, `tax`, `gross` | Money, each optional        | **what the receipt prints** — some print net and tax, some gross and tax, some only tax |

German receipt = two tax lines of kind `vat` with rates 7 and 19. Kyrgyz receipt = one
`vat` line and one `sales_tax` line, or none.

### Country profiles — code, not configuration

A small library shared by browser and server (`platform:neutral`, next to
`receipt-parser`). A profile provides:

- default currency and the usual tax lines offered in the editor
  (DE: VAT 7 %, VAT 19 %; KG: VAT 12 %, sales tax with an editable rate; others: empty);
- keywords for the parser (ADR-0023);
- which fiscal proof schemes exist for the country and their validators.

`DE` is complete in v1; `KG` and a generic default provide defaults only. Every value a
profile pre-fills can be edited — a profile never blocks saving a receipt whose taxes
differ from the usual ones.

### Checks

Run in the browser (offline) and again on the server on save — same library, same code.
A check produces a result with a code and severity; the UI shows it as a notice and on
the field.

| Check                                                                                                | Severity                                                                        |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Sum of item totals (+ tax, if prices exclude tax) = receipt total — integer comparison               | error shown; "difference as an item" offered, as on the mockup                  |
| For a tax line with net, tax and gross: net + tax = gross                                            | error shown                                                                     |
| A tax line's amount is consistent with its rate, within a tolerance of **1 minor unit per tax line** | **hint only** — receipts round in different ways; we do not decide who is right |
| Fiscal proof agrees with the receipt (see below)                                                     | per scheme                                                                      |

None of the checks blocks saving; they affect the status ("to check") and
auto-confirmation.

### Fiscal proofs

`fiscalProofs[]`, each:

| Field                 | Note                                                                                                        |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `scheme`              | e.g. `de-tse`; later `kg-…`, `ru-…` — **adding a country adds a scheme name and a validator, not a column** |
| `raw`                 | the QR payload exactly as scanned                                                                           |
| `parsed`              | structured content, shape defined per scheme                                                                |
| `result`              | `matches`, `differs`, `unreadable`, `not_checked`                                                           |
| `checkedAt`, `detail` | when, and which values differed                                                                             |

**`de-tse` in v1:** the QR code on German receipts is read (by the camera pipeline or
from the photo), its content parsed, and its amounts compared with the recognised total
and tax amounts. This is a **consistency check of the content**. Verifying the TSE's
**cryptographic signature** is not in v1, and the wording in the UI must not suggest it:
the label is **"TSE-Daten stimmen überein"**, not "TSE geprüft" (owner's decision; the
mockup is corrected by the owner).

### Analytics and currency

- Every sum is grouped by currency; no conversion in v1. A view for one currency at a
  time or separate totals per currency — never one mixed number.
- **Which receipts count** (owner's decision): all receipts except those in the trash.
  A filter "confirmed only" is offered, and the share of unconfirmed receipts is always
  visible next to the totals ("Offene Prüfung" on the mockup), so nobody mistakes
  unchecked numbers for final ones.
- Tax totals are grouped by `kind` and rate within a currency.

### Change history

A plain record per change of a receipt: who, when, which fields, old and new value; also
confirmation, un-confirmation, trash and restore. **No hash chain** (owner's decision):
unlike the SignFlow protocol (ADR-0017) it is a working log for the accountant, not
evidence against tampering.

### Storage

- PostgreSQL tables `receipts`, `receipt_items`, `receipt_tax_lines`,
  `receipt_fiscal_proofs`; item-to-tax links in a join table. `parsed` and per-field
  confidence are JSON columns, validated by the application.
- Field confidence is stored per field path, so the editor can highlight exactly what the
  recogniser was unsure about.

### Consequences

- Good: Germany, Kyrgyzstan and "any country" are the same structure; nothing German is
  hard-wired into the schema.
- Good: a new fiscal QR scheme is a validator plus a profile entry.
- Good: the offline check and the server check cannot disagree — one library.
- Good: we store what the paper says; no invented numbers.
- Bad: more tables and joins than two VAT columns.
- Bad: profiles are code — adding a country's defaults needs a release (acceptable; a
  receipt from an unknown country can always be entered with manual tax lines).
- Bad: optional net / tax / gross means consumers (export, analytics) must handle absent
  values.
- Bad: the TSE check compares amounts only; the label says exactly that, and signature
  verification stays on the v2 list.

## Pros and Cons of the Options

### Generic tax lines + profiles + fiscal proof list

- Good: matches how receipts actually differ between countries; extensible by addition.
- Bad: more general than Germany alone needs.

### Fixed German columns

- Good: simplest queries for the demo market.
- Bad: the real users are in Kyrgyzstan — two taxes on one item and other rates do not
  fit; every new country would be a migration.

### Configurable tax engine

- Good: new taxes without a release.
- Bad: a product in itself (definitions, validity periods, UI, validation); far beyond
  v1 and beyond "enter the rate by hand".

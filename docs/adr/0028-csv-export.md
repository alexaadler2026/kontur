# 0028. CSV export v1: a ZIP with three linked tables, fixed format for Excel and 1C, protected against formula injection

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

`business-processes.md`, process 5: export v1 is a **universal CSV** (receipt fields,
items, taxes, currency) that can also be loaded into 1C by a processing script. Real DATEV
format and a 1C adapter are v2. The owner will clarify the 1C exchange format later and
asked for a structure that is easy to load into 1C and described well enough that the
adapter later needs no change to the model.

Questions: one row per receipt or per item? Which encoding and separator work in Excel
and in 1C?

## Decision Drivers

- Opens correctly by double-click in Excel with German and Russian regional settings.
- Loadable by a 1C processing script without guessing.
- Loses nothing: a receipt has 0..n items and 0..n tax lines (ADR-0026).
- Stable: a consumer written today keeps working.
- Receipt text comes from recognition — it must not be able to run formulas in Excel.

## Considered Options

Structure:

1. **Three files in one ZIP: receipts, items, tax lines — linked by receipt id**
2. One file, one row per receipt (items and taxes squeezed into columns or dropped)
3. One file, one row per item, receipt columns repeated
4. One file with a row-type column

Number format: **decimal comma + parallel integer columns** / decimal point / per-user
choice.

## Decision Outcome

Chosen: **structure 1, fixed format.**

### Structure

A ZIP named (illustrative) `belegscan-export_<group>_<from>_<to>.zip`:

| File           | One row per | Key                                                              |
| -------------- | ----------- | ---------------------------------------------------------------- |
| `receipts.csv` | receipt     | `receipt_id`                                                     |
| `items.csv`    | item        | `receipt_id`, `item_no`                                          |
| `taxes.csv`    | tax line    | `receipt_id`, `tax_code`                                         |
| `README.txt`   | —           | column descriptions, `schema_version`, export time, filters used |

- `receipts.csv` alone is the answer to "one row per receipt" — an accountant can open
  just that file. `items.csv` is "one row per item". Nothing is repeated, nothing is
  lost, and tax lines — which do not fit into fixed columns — have their own table.
- For 1C: three tables with keys map directly to a document header and its table parts.
  The later 1C adapter reads the same three shapes (from the API instead of files);
  **the data model does not change**.

**Columns** (stable English names in `snake_case`; illustrative, final list in the task):

- `receipts.csv`: `receipt_id`, `document_number`, `date`, `merchant`, `country`,
  `currency`, `total`, `total_minor`, `payment_method`, `category`, `status`, `source`,
  `prices_include_tax`, `confirmed_by`, `confirmed_at`, `auto_confirmed`,
  `fiscal_scheme`, `fiscal_result`, `created_by`, `created_at`, `document_sha256`
- `items.csv`: `receipt_id`, `item_no`, `description`, `quantity`, `unit_price`,
  `line_total`, `line_total_minor`, `currency`, `tax_codes`
- `taxes.csv`: `receipt_id`, `tax_code`, `kind`, `label`, `rate`, `net`, `net_minor`,
  `tax`, `tax_minor`, `gross`, `gross_minor`, `currency`

### Format

| Aspect               | Choice                                                                      | Why                                                                                                         |
| -------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Encoding             | UTF-8 **with BOM**                                                          | Excel recognises UTF-8 only with the BOM; without it Cyrillic and umlauts turn into garbage. 1C reads UTF-8 |
| Separator            | semicolon                                                                   | Excel with German or Russian settings expects `;` — the comma is the decimal sign there                     |
| Decimal sign         | comma, no thousands separator (`15,86`)                                     | Excel in these locales reads it as a number; with a point, `15.86` may be read as text or a date            |
| Machine-safe amounts | parallel `*_minor` integer columns (`1586`)                                 | exact in every locale and program — the columns a script should use                                         |
| Dates                | `YYYY-MM-DD`                                                                | unambiguous; Excel recognises it in every locale                                                            |
| Date-times           | ISO 8601 UTC                                                                |                                                                                                             |
| Quoting              | RFC 4180: fields with `;`, quotes or line breaks are quoted, quotes doubled |                                                                                                             |
| Line ends            | CRLF                                                                        | what Excel and RFC 4180 expect                                                                              |
| Header row           | yes, column names never translated                                          | scripts depend on them                                                                                      |
| Empty value          | empty field                                                                 | absent net/tax/gross stay empty, not `0`                                                                    |

The format is **fixed, not a user setting**: one format means one thing to document and
test, and a script written for it keeps working. English-locale Excel is not the target
(users are in Kyrgyzstan and Germany); the `*_minor` columns work there too.

### Formula injection

A merchant name or item text read from a receipt can begin with `=`, `+`, `-` or `@`.
Excel would treat such a cell as a formula — a known attack through exported files.
Every **text** field that starts with one of these characters (or a tab / carriage
return) is prefixed with an apostrophe.

- **Decided by column type, never by content.** Each column is declared as text, number,
  date, code or boolean. Only text columns are ever prefixed. Numeric columns are
  produced only from numbers, so a negative amount (a refund) stays `-2,50` and `-250`.
- **Text columns** (with the illustrative column list above): `document_number`,
  `merchant`, `category`, `payment_method`, `confirmed_by`, `created_by` in
  `receipts.csv`; `description`, `tax_codes` in `items.csv`; `tax_code`, `label` in
  `taxes.csv`. The generated `README.txt` lists the text columns of its own schema
  version. Ids, dates, amounts, `*_minor`, rates, quantities, currency and country
  codes, `status`, `source`, `kind`, fiscal scheme and result, and booleans never carry
  the prefix.
- **The apostrophe is visible to scripts** (owner's correction, 2026-11-16). Excel hides
  a leading apostrophe; a 1C processing script reads it as part of the text — the item
  "-10% Rabatt" arrives as `'-10% Rabatt`. Therefore `README.txt` states the rule for
  consumers:

  > In a text column, if a value starts with `'` and the next character is one of
  > `=`, `+`, `-`, `@`, tab or carriage return, remove the first character.

- **The rule is exact.** A text that itself begins with an apostrophe followed by one of
  these characters is prefixed as well, so removing one apostrophe always gives back the
  original text. A golden-file test exports such values and applies the README rule.
- `tax_code` appears in two files and is transformed the same way in both, so the link
  between `items.csv` and `taxes.csv` holds with or without stripping.
- The later 1C adapter reads the API, not the files; none of this applies to it.

### Versioning

`schema_version` (starting at 1) in `README.txt`. Adding a column at the end does not
change the version; renaming, removing or re-ordering does.

### Where and what

- Generated **on the server**, streamed, for one group and a date range (illustrative:
  `GET /api/v1/groups/{groupId}/export?from=…&to=…&status=…`), subject to the group
  policy of ADR-0011. Online only.
- Receipts in the trash are never exported.
- **Default: confirmed receipts only** (owner's decision), with a switch "all (except
  trash)". The `status` column carries each receipt's status, and `README.txt` records
  which filter was used.
- One export contains whatever currencies the receipts have; every amount row carries its
  currency, and nothing is summed across rows.

### Consequences

- Good: opens by double-click in the Excel versions our users have; loadable by script
  without locale guessing thanks to the integer columns.
- Good: complete — items and any number of tax lines survive.
- Good: the same three shapes serve the later 1C adapter and a DATEV mapping.
- Good: exported text cannot execute as a formula.
- Bad: the formula protection changes some text values; every script that reads the files
  must apply the one-line README rule, or it will see stray apostrophes.
- Bad: a ZIP with three files is one step more than a single CSV for a casual user
  (who opens `receipts.csv` and ignores the rest).
- Bad: amounts appear twice (readable and integer) — wider files.
- Bad: decimal comma is wrong for English-locale Excel; documented, with the integer
  columns as the way out.

## Pros and Cons of the Options

### Three linked files

- Good: normalised, lossless, maps to 1C documents with table parts.
- Bad: needs the README and a ZIP.

### One row per receipt

- Good: simplest to read.
- Bad: items are lost or crammed into one cell; tax lines need a fixed number of columns
  that Kyrgyz and German receipts do not share.

### One row per item with repeated receipt columns

- Good: one file; pivot-table friendly.
- Bad: receipt totals repeat on every row and get summed by mistake; receipts without
  items vanish or need fake rows; tax lines still do not fit.

### One file with a row-type column

- Good: one file, lossless.
- Bad: columns mean different things per row type — hostile to Excel and to scripts.

### Decimal point / user-selectable format

- Decimal point: correct for scripts, wrong for the users' Excel. Selectable: every
  option doubles the test matrix and makes "the format" ambiguous for the 1C script.

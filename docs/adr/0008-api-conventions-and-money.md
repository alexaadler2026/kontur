# 0008. API conventions: errors, lists, dates, identifiers, versioning and money

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

ADR-0007 fixes how the contract is produced. This ADR fixes what every endpoint looks like,
so that two APIs written over months stay consistent and the generated client behaves the
same everywhere. Money needs special care: the product handles EUR, KGS, RUB and others,
and sums must be exact (`business-processes.md`: integers in minor units, unit prices as
exact decimal strings, no floating point).

All endpoints shown here are **illustrative examples, not the final API**.

## Decision Drivers

- One rule per topic; no per-endpoint creativity.
- The server never sends user-facing text: the frontend translates (de / en / ru, ADR-0006).
- Exact money arithmetic on both sides of the wire.
- The mockups: page numbers ("1–7 von 12"), sortable columns, a few explicit filters.
- Concurrent edits must not overwrite each other silently (Belegscan groups).

## Considered Options

Errors: **RFC 9457 Problem Details with stable codes** / ad-hoc `{ message }` / localized
messages from the server.

Pagination: **offset (page + pageSize)** / cursor (keyset).

Money amounts: **integer minor units + ISO 4217 code** / decimal string for everything /
JSON number with fractions.

Identifiers: **UUIDv7** / auto-increment integers / UUIDv4.

Versioning: **path prefix `/api/v1`** / header / media type.

## Decision Outcome

### Errors — RFC 9457

Every error response has `Content-Type: application/problem+json`:

```json
{
  "type": "urn:kontur:problem:envelope.pdf_encrypted",
  "title": "PDF is password-protected",
  "status": 422,
  "code": "envelope.pdf_encrypted",
  "instance": "/api/v1/envelopes",
  "traceId": "0193a1c2-…",
  "errors": [{ "pointer": "/signers/0/email", "code": "validation.email", "params": {} }]
}
```

- `code` is the stable, machine-readable identifier (also the last part of `type`).
  `title` and `detail` are English, for developers and logs — **never shown to users**.
- `errors[]` appears for validation failures: JSON Pointer to the field, a code, and
  `params` for the message (e.g. `{ "max": 25 }`).
- **All codes live in one TypeScript registry** on the server and appear in the spec as an
  enum. The frontend maps `code` → translation key `errors.<code>`. The existing
  `i18n-check` is extended: every code in the spec must have a key in `de.json` (and thus
  in en/ru). Unknown code at runtime → generic message by HTTP status.
- Status codes: 400 malformed, 401 not signed in, 404 not found **or not allowed to know**
  (ADR-0011), 403 signed in but action forbidden on a visible resource, 409 conflict
  (stale version, illegal state transition), 413 too large, 415 wrong type, 422 validation
  or business rule, 429 rate limit (`Retry-After`), 500 unexpected (no internals leaked).

#### Results (task 3a, 2026-11-22)

- Registry: `apps/signflow-api/src/problem/problem-codes.ts` (code → status, English
  title); moves to `libs/shared/api-kit` in task 6. First codes: `validation.invalid`,
  `validation.required`, `validation.email`, `request.malformed`, `request.not_found`,
  `server.internal`. The contract lists them as the `ProblemCode` enum.
- A validation failure is 422 with top-level code `validation.invalid` and one
  `errors[]` entry per field. class-validator rules map to codes (`isNotEmpty`/`isDefined`
  → `validation.required`, `isEmail` → `validation.email`, any other → `validation.invalid`);
  "required" wins over the other rules of the same field. Entry order is not part of the
  contract.
- **The sent value is never copied** into `errors[]` (class-validator keeps it in
  `ValidationError.value`); only pointer, code and the rule's params. Only a 500 is
  logged — `traceId`, method, path without query, status and the stack — never a body or
  an error message of a 4xx (V8's JSON parse error quotes a slice of the input).
- Unparseable JSON → 400 `request.malformed`; unknown route → 404 `request.not_found`;
  for now **any other 4xx** from Nest/Express also becomes `request.malformed` — 413/415
  get their own codes with the first upload endpoint.
- Every operation declares a `default` response `application/problem+json` →
  `ProblemDetailsDto`, added once in `createOpenApiDocument`.

### Lists — pagination, sorting, filters

```
GET /api/v1/envelopes?page=2&pageSize=25&sort=-updatedAt,title&status=waiting&status=signed&q=nordlicht
→ { "items": [...], "page": 2, "pageSize": 25, "totalItems": 47 }
```

- `page` is 1-based; `pageSize` default 25, max 100.
- `sort`: comma-separated fields, `-` prefix = descending; each endpoint whitelists its
  sortable fields; unknown field → 400.
- Filters are **explicit named query parameters** per endpoint (repeatable for "any of");
  date ranges as `dueFrom` / `dueTo`; free text as `q`. No generic filter language.

### Dates and time

- Instants: ISO 8601 in UTC with `Z` (`2026-11-04T10:20:00Z`), schema `format: date-time`.
- Calendar dates without time (due date, receipt date): `YYYY-MM-DD`, `format: date`.
  A due date expires at the end of that day in the installation time zone
  (production: `Asia/Bishkek`); the server decides, the client only displays.
- The client formats with `Intl` for the active locale (ADR-0006).

### Identifiers

- UUIDv7 strings, generated by the database default. Time-ordered (good for indexes),
  not guessable in sequence, safe in URLs. Clients treat them as opaque.

### Versioning

- Path prefix `/api/v1`. Adding fields or endpoints is not a breaking change. A breaking
  change creates `/api/v2` next to v1. Frontend and API ship together (ADR-0014), so v2 is
  expected to be rare.

### Concurrent edits

- Resources that several people can edit carry an integer `version`. An update sends the
  version it was based on; if the stored version is newer the server answers
  **409 `conflict.stale`** and changes nothing. The client reloads and the user decides.

### Files

- Upload: `multipart/form-data`. Download: a streaming endpoint with `Content-Disposition`.
  Never base64 inside JSON.

### Money

Three kinds of numbers, three representations:

| Kind                                                   | JSON                                                                  | Prisma / PostgreSQL                  | TypeScript                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| Amount (total, line total, tax amount, contract value) | `{ "amountMinor": 1586, "currency": "EUR" }` — integer in minor units | `BigInt` column + `Char(3)` currency | `interface Money { amountMinor: number; currency: CurrencyCode }` |
| Unit price                                             | `{ "amount": "1.789", "currency": "EUR" }` — exact decimal string     | `Decimal(19,6)` + currency           | `DecimalString` (branded `string`)                                |
| Quantity, tax rate (percent)                           | `"35.42"`, `"19"` — exact decimal string                              | `Decimal(19,6)`                      | `DecimalString`                                                   |

- `amountMinor` is a JSON integer, at most 2^53 − 1 (declared as `maximum` in the schema),
  so it is exact in JavaScript. The column is `BigInt` because a 32-bit integer ends at
  about 21 million units of currency; the server converts `bigint` ↔ `number` at the DTO
  boundary and rejects unsafe values.
- The number of minor digits per currency comes from a **pinned table of supported
  currencies** in `libs/shared/api-kit` with the ISO 4217 exponent (EUR 2, KGS 2, RUB 2,
  USD 2, …), covered by a test. It is part of the contract (the currency enum in the
  spec), so server and client use the same values. A currency that is not in the table is
  rejected with 422 (`money.currency_unsupported`).
  **`Intl` is not used for this**: its data comes from the CLDR version built into each
  runtime and may differ between Node, browsers and ISO 4217 — the same stored integer
  could then be read as a different amount. `Intl` is used for display formatting only.
  Adding a currency is a reviewed change to the table; an exponent is never changed for a
  currency that already has stored amounts.
- Decimal strings match `^-?\d+(\.\d+)?$`. Negative values are allowed (deposit returns,
  discounts).
- **Arithmetic:** amounts are added and compared as integers; adding two `Money` values
  with different currencies throws. Decimal strings are computed with a decimal library
  (server: Prisma's `Decimal`; client: only where a check needs it). Division by 10^n
  happens **only for display**, inside the `Intl` formatting helper.
- **No rounding rule is invented here.** Sums on a receipt are entered or recognised, not
  recomputed; checks compare integers. Where a rounding rule is ever needed it is a
  business decision recorded in `business-processes.md` first.
- `number` with fractions is forbidden for money by a lint rule on the DTO layer and by
  the schema (`type: integer` / `type: string` with pattern).

### Consequences

- Good: the frontend handles every error the same way and translates it itself.
- Good: a missing translation for a new error code fails CI.
- Good: money stays exact from database to screen; currencies cannot be mixed by accident.
- Good: page numbers and totals match the mockups directly.
- Bad: offset pagination gets slow and unstable on very large, fast-changing lists — not
  our scale. Revisit (cursor pagination) if a list exceeds ~100k rows or an infinite
  scroll over live data is needed.
- Bad: `BigInt` ↔ `number` conversion is one more boundary step to test.
- Bad: two money shapes (amount vs unit price) must be explained once.

## Pros and Cons of the Options

### RFC 9457 with codes

- Good: an IETF standard; one shape; machine-readable; language-neutral.
- Bad: slightly more verbose than `{ message }`.

### Localized messages from the server

- Good: no mapping on the client.
- Bad: the server would need the user's language for every request and all translations;
  contradicts ADR-0006 (translations live in the apps) and the runtime language switch.

### Cursor pagination

- Good: stable and fast on huge lists.
- Bad: no page numbers, no "page 2 of 5" — the mockups show both.

### Decimal string for all amounts

- Good: one representation.
- Bad: every sum and comparison needs a decimal library on the client; integers are
  simpler and cannot carry an invalid number of digits.

### JSON number with fractions

- Bad: binary floating point cannot represent 0.1 exactly (`0.1 + 0.2 !== 0.3`); forbidden
  by the requirements.

### Auto-increment integers / UUIDv4

- Integers: reveal counts and are guessable. UUIDv4: random order hurts index locality.
  UUIDv7 has neither problem.

### Header or media-type versioning

- Good: clean URLs.
- Bad: invisible in logs and the browser, harder to test by hand; no benefit here.

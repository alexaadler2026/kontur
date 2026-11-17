# 0027. E-invoices: the embedded XML is read in the browser with PDF.js and a small own mapper; only that attachment is touched

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

Process 3 of Belegscan (`business-processes.md`): PDF invoices with embedded structured
data — ZUGFeRD / Factur-X, including the XRechnung profile — are read **from the XML
inside the PDF, without recognition**: exact and immediate. Decisions by the owner:

- such an invoice becomes an ordinary receipt (Beleg) with items and the source marker
  "E-Rechnung"; it is a feature for the German market and the portfolio, and comes
  **last** in the Belegscan order (answer 29);
- in Belegscan only the ZUGFeRD / XRechnung XML attachment is read; every other
  attachment is ignored (answer 7 of wave 1);
- recognition of arbitrary multi-page invoices is v2.

The question: read the XML in the browser or on the server, and with which library.

## Decision Drivers

- Same behaviour offline as online; consistent with recognition in the browser.
- An attachment inside a PDF is untrusted input: read one known file, ignore the rest.
- We need about twenty fields, not a full e-invoicing implementation.
- Few dependencies of uncertain future.

## Considered Options

Where: **browser** / server.

Where the XML is parsed (the import pipeline of ADR-0025 runs in a Web Worker, and the
browser's XML parser, `DOMParser`, **does not exist in workers**):

- **on the page, with `DOMParser`** / in the worker, with a small JavaScript XML parser.

How:

1. **PDF.js to get the attachment + an own mapper for the fields we need**
2. A JavaScript e-invoice library that extracts and parses (several exist)
3. Server-side with an established Java library (Mustang) behind a service

## Decision Outcome

Chosen: **browser, option 1.**

### Why the browser

Recognition, checks and the editor already run in the browser and offline (ADR-0023,
ADR-0024). Reading an XML attachment is far lighter than recognition. Doing it on the
server would make e-invoices the one import that needs a connection and a different code
path.

### How

1. **Detect:** in the import pipeline (ADR-0025), a PDF is opened with PDF.js (already
   used for rendering). Its list of embedded files is read.
2. **Select exactly one attachment** by the names the standards define
   (`factur-x.xml`, `zugferd-invoice.xml`, `ZUGFeRD-invoice.xml`, `xrechnung.xml`).
   **No other attachment is read, extracted, shown or offered for download.**
3. **Parse** the XML **on the page** with the browser's built-in parser (`DOMParser`).
   The worker hands the attachment's bytes to the page; the page parses and maps
   (step 4) and hands the plain receipt data back to the queue. It is the one step of
   the pipeline that leaves the worker.

   Guards, in this order:
   - size limit **2 MB**, checked in the worker before the hand-over (real invoices are
     tens of kilobytes; parsing even the limit takes a fraction of a second);
   - a document with a **DOCTYPE is rejected** — CII invoices have none, and without a
     DOCTYPE there are no entity definitions at all, neither external ones nor the
     self-multiplying kind. The check runs on the **attachment's bytes, before
     `DOMParser` is called** (a search for `<!DOCTYPE`, ignoring case). Checking
     `document.doctype` after parsing would be too late: entities are expanded while
     the document is parsed;
   - `DOMParser` **does not throw** on broken XML: it returns a document that contains a
     `<parsererror>` element. We check for that element explicitly (in any namespace —
     browsers place it differently) and treat it as "cannot be read";
   - the expected root element and namespace (UN/CEFACT Cross Industry Invoice, "CII").

   The parsed document is only read; it is never inserted into the page, so nothing in
   it can run.

4. **Map** to the receipt model (ADR-0026) with an own, small, table-driven mapper:

   | Receipt field          | From the invoice                                                              |
   | ---------------------- | ----------------------------------------------------------------------------- |
   | merchant               | seller name                                                                   |
   | `documentNumber`, date | invoice number, issue date                                                    |
   | `currency`, `total`    | invoice currency, grand total                                                 |
   | `pricesIncludeTax`     | false (invoices state net line amounts)                                       |
   | `items[]`              | lines: name, quantity, net unit price, line net amount, VAT category and rate |
   | `taxLines[]`           | VAT breakdown: rate, basis (net), tax amount                                  |
   | `country`              | seller country                                                                |
   | `source`               | `e-invoice`                                                                   |

   Decimal values are taken as strings and converted to minor units with the pinned
   currency table — no floating point on the way.

5. **Result:** all fields have confidence 100 % and the marker "from e-invoice". The
   normal checks of ADR-0026 still run (an invoice can be inconsistent too). The user
   sees the receipt in the editor like any other.
6. **Stored:** the original PDF as the document (ADR-0012), the mapped data, and the
   SHA-256 of the XML that was read.

**Why the page and not a parser inside the worker**

- No new dependency. The alternative is a JavaScript XML parser from npm with entity
  handling switched off — one more package to review and keep updated, for an input that
  is by definition untrusted. The browser's parser is the most tested XML parser we can
  get and costs nothing.
- The reason to work in a worker is to keep the page responsive during heavy work. An
  XML file of a few kilobytes is not heavy work.
- The mapper reads a standard DOM `Document`, which tests get from the same API.
- Price: the mapper is browser code, not `platform:neutral`; if the server ever has to
  read the XML itself (it does not in v1), the parser choice is reopened. The mapper
  stays behind one function (`readEInvoice(bytes) → receipt data`), so this is a swap,
  not a redesign.

Extracting the attachment relies on PDF.js running inside our worker, which task 81
verifies (ADR-0025); if PDF.js has to run on the page, the attachment is read there and
this step simply has no hand-over.

If no known attachment is found, the PDF goes the normal way (render and recognise). If
one is found but cannot be parsed or mapped, the user is told and can enter the data by
hand; the PDF is still kept.

### The server

- Receives the PDF and the mapped data like any receipt. It **does not parse the XML** in
  v1: receipt data is user-editable anyway, so the server gains no trust by re-reading
  it. It applies the upload rules of ADR-0012 for PDFs (JavaScript and launch actions
  rejected; attachments are stored as part of the file but never served individually).

### Scope

| In v1                                                                                                           | Later                                                                 |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| PDF with embedded CII XML: ZUGFeRD 2.x / Factur-X, all profiles that carry lines; XRechnung as a CII attachment | Standalone XML files without a PDF; UBL syntax; ZUGFeRD 1.0           |
| Reading                                                                                                         | Validation against the standard's business rules; creating e-invoices |

Profiles without line items (MINIMUM, BASIC WL) yield a receipt with totals and tax lines
but no items.

### Tests

Official, openly published sample invoices of the standards are used as fixtures if their
licence allows redistribution in a public repository; otherwise synthetic invoices are
generated. No real invoice enters the repository (same rule as ADR-0013 and ADR-0023).

### Consequences

- Good: e-invoices work offline and through the same pipeline as everything else.
- Good: exactly one attachment is touched; hidden content in a PDF is never unpacked.
- Good: about two hundred lines of mapper that the owner can read, instead of a library
  for a whole standard.
- Bad: we maintain the mapper when the standard changes (the fields we read are core
  fields and stable).
- Bad: no formal validation — a malformed but parseable invoice is accepted as data and
  only our own sum checks apply.
- Bad: UBL-only XRechnung files and standalone XML are not supported in v1.

## Pros and Cons of the Options

### PDF.js + own mapper

- Good: no new dependency (PDF.js is already there); small and explainable.
- Bad: ours to maintain.

### XML parser in the worker instead of `DOMParser` on the page

- Good: the whole pipeline stays in one thread; the mapper would also run in Node.
- Bad: a new dependency that parses untrusted input; its safety depends on options we
  must set correctly (entities off) and keep correct across updates.

### A JavaScript e-invoice library

- Good: more formats and profiles; some validate.
- Bad: the available packages are young, small projects (some at version 0.x, single
  maintainers), several bring a second PDF library or a WebAssembly XML engine into the
  bundle; we would use a fraction of them. Re-evaluate when validation or UBL is needed —
  the mapper sits behind a function that a library could replace.

### Server-side with Mustang (Java)

- Good: the reference implementation; full validation.
- Bad: a Java runtime and service for one import path; breaks offline.

## Sources checked (2026-11-16)

- File names and version history of ZUGFeRD / Factur-X attachments: <https://www.formx.ai/blog/zugferd-extraction-api/>
- Examples of current JavaScript libraries: <https://github.com/stafyniaksacha/facturx>,
  <https://www.pkgstats.com/pkg:e-rechnung-parser>, <https://socket.dev/npm/package/@attestwire/en16931>

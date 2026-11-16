# 0013. PDF processing in SignFlow: stamping on the server, append-only (incremental) saves, hashes of every version

- Status: Accepted, library pending spike
- Date: 2026-11-15

## Context and Problem Statement

SignFlow puts signatures, stamps, names and dates into a PDF and adds a protocol page
(`business-processes.md`, processes 0, 2 and 4). v1 is a **simple electronic signature**:
a visible image plus a protocol — no cryptographic signature (answer 20).

Rules from the owner's answers:

- One PDF per envelope. The "original" is the file before any signature; its SHA-256 is
  recorded. After **each** signature the hash of the intermediate version is written to the
  protocol; the final hash after completion (12).
- Later signers see earlier signatures (13).
- A PDF that already has a digital signature is accepted with a warning; keep that
  signature valid if incremental saving allows it (18).
- Limits: 25 MB, 200 pages; encrypted PDFs rejected (18, ADR-0012).
- A public "upload the file, compare the fingerprint" page is v2; the fingerprint is then
  computed in the browser (19). The architecture must not prevent it.

We need to decide where the PDF is modified, with which library, and how versions and
fingerprints relate.

## Decision Drivers

- The final document must be produced by a party every signer can trust.
- "The document was not changed" must be explainable and checkable.
- Cyrillic and Kyrgyz letters (ң, ө, ү) in names and on the protocol page.
- Node.js only; no second runtime; permissive licence (public repo).
- Honest about library risk: PDF files in the wild are messy.

## Considered Options

Where:

1. **Server**
2. Browser (the signer's device produces the PDF)

Library:

A. **`@cantoo/pdf-lib`** (maintained fork of pdf-lib with incremental update)
B. LibPDF (by Documenso)
C. Original `pdf-lib`
D. MuPDF.js (WASM)
E. A Java sidecar (Apache PDFBox / OpenPDF)

Save strategy: **incremental update (append-only)** / full rewrite.

## Decision Outcome

Chosen: **server (1), `@cantoo/pdf-lib` (A) behind a `PdfStamper` interface, incremental
update** — the library is confirmed or replaced by option B after a time-boxed spike.

### Why the server

A signer's browser is not a trusted place to build the document: a modified client could
send back a PDF with different contract text. The server takes only **inputs** from the
client — which field, the signature image — and builds the PDF itself from the stored
version. The date and name in "date" and "name" fields are written by the server, not sent
by the client.

The browser's jobs: render pages (PDF.js) for placing and filling fields, capture the
signature as a PNG (drawn, typed or uploaded — **every signature arrives as an image**, so
the server needs no handwriting fonts), and later compute SHA-256 locally (Web Crypto) for
the v2 verification page.

### Append-only versions

A PDF can be changed by **appending** a new section to the end of the file; the earlier
bytes stay untouched (incremental update). We always save this way.

- Version 0 = the uploaded original, N₀ bytes, hash H₀.
- Each signing step appends an increment → version k, hash Hₖ, written to the protocol.
- Completion appends the protocol page(s) → final version, hash H_final.

Consequences of this choice:

- **The original is literally inside every later version**: the first N₀ bytes of the
  final file are the original. "Unchanged" can be checked without trusting our rendering:
  hash the first N₀ bytes and compare with H₀. N₀ and H₀ are in the protocol.
- **Existing digital signatures stay cryptographically intact**, because the bytes they
  cover are not rewritten. A PDF reader may still report "changed after signing", and a
  signature that forbids any change (certification level) will be shown as invalid — hence
  the warning to the user on upload.
- Files grow a little with each step (acceptable).

Each version is stored as its own immutable encrypted file (ADR-0012). Signing steps on
one envelope are serialised with a database row lock, so two parallel signers cannot both
append to the same version.

### How content is placed

- Field positions are stored **relative to the page** (fractions 0–1 of the visible page
  box, top-left origin), independent of zoom and screen. The server converts them to PDF
  coordinates, taking page rotation and crop box into account. A unit-tested conversion
  function is shared conceptually with the frontend's overlay.
- Signatures and stamps are drawn as images; names, dates and initials as text with an
  embedded, subsetted font that covers Latin, Cyrillic and Kyrgyz letters (an open-licence
  font; chosen in the spike).
- No AcroForm signature fields are created in v1 (they belong to cryptographic signatures).

### Protocol page

- Appended by the server at completion: document title, H₀ and N₀, every event (time in
  the installation time zone and UTC, person, event, IP), the hash after each signature,
  and the version id of the consent text each signer accepted.
- **IP addresses on the page.** Every participant receives the final PDF, so the page
  would hand each participant the others' IP addresses. An installation setting controls
  the display: `PROTOCOL_PAGE_IP = masked | full | hidden`, default **`masked`**
  (IPv4: last octet replaced, `198.51.100.x`; IPv6: only the first 48 bits shown). The
  database always stores the full address; the owner sees it in the protocol screen and
  the CSV export. (Listed for the lawyer.)
- **Language.** Chosen per document (de / en / ru); the default is the sender's UI
  language at the moment of sending. Stored on the envelope, so the page does not change
  if someone switches language later.
- H_final cannot be printed inside the file it describes; it is stored in the database,
  shown in the UI and in the CSV export.

### Execution

- Stamping runs synchronously in the request, inside a worker thread (does not block other
  requests), with a time limit. No job queue in v1.
- `PdfStamper` is the only module that imports the PDF library.

### Spike before acceptance (first PDF task)

A fixed corpus in the repo. **Requirement: the repository is public, so the corpus
contains only synthetic files (generated for this purpose, with invented content) or
openly licensed samples — never a real document**, not even an "unimportant" one. Each
file's origin and licence is listed in the corpus README.

Contents: a word-processor export, a scan-like image PDF, a PDF with Cyrillic and Kyrgyz
text, a PDF digitally signed with a throw-away test certificate, a rotated-page PDF, a
200-page PDF, and — as **rejection** cases for the validation of ADR-0012 — a
password-protected PDF, a PDF with JavaScript and an e-invoice with an embedded XML file.

Pass criteria for the library: loads all; stamps an image and Cyrillic/Kyrgyz text at the
right place on rotated pages; saves incrementally (original bytes are a prefix of the
output); the existing signature still validates in Adobe Reader; output opens in Adobe
Reader, Chrome and Firefox; 200 pages within the time limit. If `@cantoo/pdf-lib` fails a
criterion, LibPDF is tested against the same corpus. The result is recorded in the journal
and this ADR's status is updated.

### Profile images

- One saved signature and several named stamps per user: PNG with transparency, ≤ 1 MB,
  ≤ 2000 px per side (ADR-0012), stored encrypted like any file.

### Consequences

- Good: every signer gets a document built by the server from verified inputs.
- Good: a simple, strong integrity story (original bytes are a prefix; hash chain of
  versions in the protocol).
- Good: existing signatures are not destroyed.
- Good: the library is replaceable behind one interface.
- Bad: depends on a community fork whose maintainers promise support only "as long as they
  need it" — mitigated by the interface, the corpus tests and a named alternative.
- Bad: our output does not claim PDF/A conformance; a PDF/A input may no longer validate
  as PDF/A after stamping.
- Bad: a visible signature image is not tamper-evident by itself — integrity rests on the
  stored hashes until a cryptographic seal is added (v2, answer 20).

## Pros and Cons of the Options

### Server

- Good: trusted, uniform output; one place for fonts, protocol and hashing.
- Bad: the server sees the plaintext (already accepted in ADR-0012).

### Browser

- Good: less server work; file could stay on the device.
- Bad: the client decides the document's bytes — unacceptable for a signing service;
  large PDFs on phones; fonts and protocol duplicated in the bundle.

### `@cantoo/pdf-lib`

- Good: pdf-lib's well-known API and documentation; adds incremental update; pure
  TypeScript, MIT.
- Bad: a fork with limited maintenance promises.

### LibPDF

- Good: written by a document-signing company for exactly this workflow (robust parsing,
  incremental saves, signatures).
- Bad: new; small community; less material to learn from. Kept as the tested alternative.

### Original `pdf-lib`

- Bad: unmaintained since 2021; no incremental save — every save would rewrite the file
  and invalidate existing signatures.

### MuPDF.js

- Good: very robust engine.
- Bad: AGPL or commercial licence; WASM binary; lower-level API.

### Java sidecar

- Good: PDFBox is the reference for PDF signing.
- Bad: a second runtime, image and deployment unit for one function.

### Full rewrite on save

- Good: smaller, cleaner files.
- Bad: destroys existing signatures and the "original is a prefix" property.

## Sources checked (2026-11-15)

- `@cantoo/pdf-lib` README (incremental update, maintenance note): <https://unpkg.com/@cantoo/pdf-lib@2.7.1/README.md>
- LibPDF, incremental saves: <https://libpdf.documenso.com/docs/concepts/incremental-saves>
- LibPDF announcement: <https://documenso.com/blog/introducing-libpdf-the-pdf-library-typescript-deserves>

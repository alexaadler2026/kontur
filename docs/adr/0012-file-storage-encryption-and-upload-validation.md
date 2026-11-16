# 0012. Files: storage behind an interface, envelope encryption at rest, strict upload validation

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

The products store user files: PDFs and their signed versions, signature and stamp images
(SignFlow), receipt photos (Belegscan). `business-processes.md` requires them to be stored
**encrypted**. The owner chose the threat model (answer 5, variant A):

> Protected against theft of the disk and of backups, and against a database leak without
> the key. The server administrator technically has access.

We need to decide where the bytes live, how they are encrypted, where the keys are and how
they rotate, and how an upload is checked before it is accepted.

## Decision Drivers

- Honest protection for the chosen threat model; no claim beyond it.
- Standard primitives from Node's `crypto`; no home-made cryptography.
- Key rotation must not require re-encrypting every file.
- A stolen backup must be useless without a key that is not in the backup.
- The server redistributes uploaded PDFs to other people (signers) — it must not pass on
  obviously dangerous files.
- 4 GB RAM server (ADR-0014); limits: PDF ≤ 25 MB and ≤ 200 pages.

## Considered Options

Storage location:

1. **Local volume on the server, behind a `FileStore` interface**
2. S3-compatible object storage in the EU
3. `bytea` columns in PostgreSQL

Encryption:

A. **Application-level envelope encryption (per-file key wrapped by a master key)**
B. Full-disk / volume encryption only (LUKS)
C. One application key for all files
D. End-to-end encryption in the browser (excluded by answer 5)

Malware handling: **structural checks + reject active content** / ClamAV scan.

## Decision Outcome

Chosen: **1 + A + structural checks**.

### Storage

- Interface `FileStore { put(key, bytes); get(key); delete(key) }`. First implementation:
  a directory on a Docker volume. Keys are random ids; original file names are metadata in
  the database only.
- Files are **immutable**: written once, never modified. A new version is a new file.
  (This also makes backups consistent, ADR-0014.)
- An S3-compatible implementation can be added without touching callers. Trigger: disk
  usage above ~60 % or a second server.

### Encryption — envelope encryption

- For each file the server generates a random 256-bit **data key (DEK)** and encrypts the
  file with **AES-256-GCM** (random 96-bit nonce, authentication tag stored with the
  ciphertext). The file's id is passed as additional authenticated data, so a ciphertext
  cannot be swapped under another database row unnoticed.
- The DEK is itself encrypted ("wrapped") with the **master key (KEK)**, also AES-256-GCM,
  and stored in the `files` row together with `kekId`.
- The **KEK** is a 32-byte random value in a secret file on the server, mounted into the
  API container (ADR-0014). It is **not** in the database, the repo, the image or the
  backup. The owner keeps a copy offline (password manager + printed). **Losing the KEK
  means losing all files** — stated in the runbook.
- **Rotation:** add a new KEK with a new `kekId`, run a command that re-wraps every DEK
  (database rows only; files are not touched), then retire the old KEK. Planned once a
  year and after any suspicion of a leak.
- The **SHA-256 of the plaintext** is computed on upload and stored; it is the fingerprint
  shown to users and used for integrity checks.
- Files of ≤ 25 MB are encrypted in memory in one pass. Larger limits would need chunked
  streaming — not in v1.
- Database columns (names, e-mails, amounts) are **not** encrypted at field level. Backups
  are additionally encrypted as a whole by the backup tool (ADR-0014).

### What each party can see (the honest statement)

| Who has what                                      | Can read files?                       |
| ------------------------------------------------- | ------------------------------------- |
| Stolen disk image or volume only                  | No — ciphertext, DEKs are wrapped     |
| Stolen database dump only                         | No — wrapped DEKs without the KEK     |
| Stolen backup (database + files)                  | No — the KEK is not in the backup     |
| Application user                                  | Only what ADR-0011 allows             |
| Server administrator (root on the running server) | **Yes** — has KEK, database and files |

### Deleting

- Deleting a file removes the ciphertext and its row (including the wrapped DEK).
- Copies remain in backups until the backup retention ends (ADR-0014: 35 days at most).
  Users are told so in the data-protection text, in these words (translated per UI
  language): _"Deleted data disappears from backups no later than 35 days after
  deletion."_ Proof-preserving deletion of documents (keep hash
  and protocol) is decided in wave 2.

### Upload validation

Applied in this order; each failure has its own error code (ADR-0008).

1. **Size** — limited at the reverse proxy and again in the application.
2. **Type by content** — magic bytes (`%PDF-`, PNG signature), never the file extension or
   the `Content-Type` header.
3. **Structure** — the file is parsed by the PDF library **in a worker thread with a time
   and memory limit**; a parser that hangs or explodes (decompression bomb) is killed and
   the file rejected.
4. **PDF rules (SignFlow)**
   - password-protected / encrypted → rejected (`file.pdf_encrypted`);
   - more than 200 pages → rejected;
   - contains JavaScript or launch actions → rejected (`file.pdf_active_content`) —
     **in both products**;
   - contains **embedded files (attachments) → rejected** (`file.pdf_embedded_files`):
     SignFlow forwards the document to signers and must not pass on hidden content;
   - contains existing digital signatures → accepted, flagged, the user is warned
     (ADR-0013).

   **Belegscan** treats embedded files differently (details in the e-invoice ADR,
   wave 3): only the ZUGFeRD / XRechnung XML attachment is read; every other attachment
   is ignored and never extracted, executed or offered for download separately.

5. **Images for the profile** (signature, stamps): PNG only, ≤ 1 MB, ≤ 2000 px per side
   (read from the PNG header), must decode.

Serving files back: always through an authorised endpoint, with
`Content-Disposition: attachment` (file name encoded per RFC 6266 for Cyrillic),
`X-Content-Type-Options: nosniff` and a sandboxing CSP on the response. No static path.

**ZIP bombs:** in v1 the server never unpacks archives (Belegscan unpacks in the browser;
limits there are decided in wave 3).

**No ClamAV in v1.** Uploaders are invited users; the scanner needs more than 1 GB of RAM
for its signatures and only finds known malware. Rejecting active content removes the
main PDF attack path. Revisit when uploads open to less trusted users.

Receipt photo validation (formats, re-encoding) is decided with the Belegscan ADRs (wave 3).

### Consequences

- Good: a leaked backup, database dump or disk does not expose documents.
- Good: key rotation is a quick metadata operation.
- Good: tampering with a stored file is detected on read (GCM tag) and by the hash.
- Good: storage can move to object storage later without changing business code.
- Bad: the KEK is a single point of failure — offline copy and runbook are mandatory.
- Bad: no protection against a compromised running server or its administrator.
- Bad: rejecting PDFs with JavaScript will occasionally refuse a legitimate form-heavy PDF.
- Bad: PDFs with attachments — including e-invoices (ZUGFeRD) — cannot be sent through
  SignFlow in v1; the error message says why.
- Bad: files pass through API memory (bounded by the 25 MB limit).

## Pros and Cons of the Options

### Local volume behind an interface

- Good: no extra service, no network dependency, fast; fits tens of users.
- Bad: disk is finite; must be monitored and backed up off-site.

### S3-compatible object storage

- Good: practically unlimited, server becomes stateless.
- Bad: another provider, credentials, latency and failure mode; not needed at this volume.

### `bytea` in PostgreSQL

- Good: one backup, transactional.
- Bad: bloats the database and its dumps; 25 MB values strain memory and replication.

### Envelope encryption (A)

- Good: per-file keys; cheap rotation; standard pattern (same idea as cloud KMS).
- Bad: more concepts (DEK, KEK, wrapping) than a single key.

### Disk encryption only (B)

- Good: transparent; no application code.
- Bad: protects only a powered-off disk. Backups and database dumps taken from the running
  system are plaintext; on a VPS the unlock key at boot is awkward.

### One application key (C)

- Good: simplest code.
- Bad: rotation means re-encrypting every file; one key encrypts unlimited data.

### ClamAV

- Good: catches known malware in any file type.
- Bad: > 1 GB RAM, signature updates, another container; low value for invited users.

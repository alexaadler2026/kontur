# 0025. Batch import in the browser: one worker pipeline, ZIP read entry by entry with hard limits, HEIC and PDF converted on demand

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

Batch import (`business-processes.md`, process 2): JPG, PNG, HEIC, PDF and ZIP; at most
200 files and 250 MB; **ZIP is unpacked in the browser, streaming**; files are recognised
one by one, locally, with pause and cancel; options for skipping duplicates,
auto-confirmation and a common category; a summary at the end.

A 250 MB archive must not be loaded into memory at once, and an archive is also the
classic carrier of a "ZIP bomb" — a small file that unpacks to gigabytes.

## Decision Drivers

- Constant, small memory use regardless of archive size; works on a laptop and, for
  smaller batches, on a phone.
- The limits are enforced before and during unpacking, not after.
- The UI stays responsive; pause and cancel take effect at once.
- A reload in the middle must not lose the batch.
- Large decoders are loaded only when a file needs them.

## Considered Options

ZIP: **zip.js, reading entries from the file on disk** / fflate (streaming inflate) /
JSZip (loads everything).

Where: **in the browser** (decided) — server-side unpacking is not considered.

Concurrency: **one file at a time in one worker** / several workers in parallel.

## Decision Outcome

### One pipeline for every source

```
files or ZIP entries → queue → [ decode → normalise → e-invoice? → recognise → parse ] → local store → sync
                                 (Web Worker, one file at a time)

normalise → document copy (stored)  +  working copy (recognition only)
```

- Single photos, multi-selected files and ZIP entries all enter the same queue; the
  stages are the same code as single capture (ADR-0023) and end in the same local store
  and sync queue (ADR-0024).
- **One file at a time.** Recognition already uses the available CPU; parallel files
  would multiply memory, which is the scarce resource on phones.
- **Pause / cancel:** the queue stops handing out work at once; the file in progress is
  aborted through an `AbortSignal`. Finished receipts stay.
- **Survives reload:** the batch (file list, per-file status, options) is stored in
  IndexedDB. After a reload, finished files are kept; for the rest the browser asks the
  user to pick the files again, because a web page cannot keep access to files on disk
  across reloads in all browsers.

### ZIP

- Library: **zip.js**. It reads the archive's table of contents from the `File` object
  with random access and then decompresses **one entry at a time as a stream**. The
  250 MB file stays on disk; only the current entry is in memory.
- **Checks before unpacking** (from the table of contents):

  | Check                                 | Limit                                                                            |
  | ------------------------------------- | -------------------------------------------------------------------------------- |
  | Archive size                          | ≤ 250 MB                                                                         |
  | Number of file entries                | ≤ 200                                                                            |
  | Declared uncompressed size, per entry | ≤ 25 MB                                                                          |
  | Declared uncompressed size, total     | ≤ 500 MB                                                                         |
  | Entry type by extension               | jpg, jpeg, png, heic, pdf — everything else is skipped and listed in the summary |
  | Encrypted entries, nested archives    | skipped, listed                                                                  |

- **Checks while unpacking:** the stream is counted; if an entry produces more bytes than
  it declared or than the per-entry limit, it is aborted (a manipulated archive can lie
  in its table of contents). The running total is checked against the total limit.
- Entry names are used only as display labels. Folders, hidden files and system entries
  (`__MACOSX`, `.DS_Store`) are ignored. Nothing is written to a file system, so path
  tricks in names have no effect.

### Formats

| Format   | Handling                                                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JPG, PNG | decoded by the browser                                                                                                                                                                                                           |
| HEIC     | decoded by the browser where it can (Safari); otherwise a WebAssembly decoder, **loaded only when the first HEIC file appears**                                                                                                  |
| PDF      | first checked for an embedded e-invoice (ADR-0027) — if present, no recognition; otherwise pages are rendered with PDF.js (already in the product) and recognised. v1 recognises single-receipt PDFs; multi-page invoices are v2 |

- Type is decided by **magic bytes**, not by the extension.
- **PDF.js inside our worker is an assumption to verify, not a fact** (task 81). PDF.js
  normally starts a worker of its own and draws on a canvas; our pipeline already runs in
  a worker. Task 81 proves on the target browsers (Chrome on Android, Safari on iOS,
  desktop) that opening a PDF, listing its attachments and rendering a page work there.
  If they do not, these PDF steps move to the page and hand the worker a bitmap or the
  attachment bytes; the queue, the limits and everything after decoding stay as they
  are.
- Canvases and bitmaps are released explicitly after each file.

### Two images from one photo: the document copy and the working copy

Normalisation produces **two different images for two different jobs** (owner's
correction, 2026-11-16). The stored image is evidence for the accountant and the tax
office; the image for recognition only has to be fast. One reduced copy for both would
risk making the small print of a receipt (tax number, fiscal number, VAT amounts)
unreadable in the archive.

|              | Document copy — **stored**                                            | Working copy — **recognition**                           |
| ------------ | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Purpose      | the document: shown, exported, kept                                   | input of `OcrEngine`                                     |
| Lives        | IndexedDB → upload → encrypted on the server (ADR-0012)               | in memory only, released after the file                  |
| Format       | JPEG, quality 85                                                      | whatever the engine needs                                |
| Longest side | **up to 3000 px; never enlarged** — a smaller original keeps its size | reduced further; the size is set by the spike (ADR-0023) |
| Metadata     | **no EXIF, no GPS**; orientation applied to the pixels                | —                                                        |
| Size         | target ≤ 2.5 MB                                                       | —                                                        |

- **Size rule for the document copy:** if the file exceeds the target, quality goes to 80,
  then 75; only then is the longest side reduced, and **never below 2000 px**. A file
  that is still over the target is stored anyway and counted in a metric — a document is
  never dropped for its size.
- **Why 3000 px:** a lower-case letter of 6–7 pt print is about 1.2 mm high and stays
  readable from roughly 8 px, which is about 200 dpi on the paper. At 3000 px that covers
  a receipt up to about 38 cm long (2500 px: about 32 cm) when the receipt fills the
  frame.
- **What the number does not guarantee:** pixels of the image are not pixels of the
  receipt. A receipt that fills half the frame, or is longer than about 38 cm, still has
  small text. Therefore a **capture hint**: if the median height of recognised text lines
  is below a threshold, the user sees "text is small — move closer". The threshold comes
  from the spike. Receipts photographed in several parts are v2.
- Applies to every raster source — camera, JPG, PNG, HEIC. **PDFs are always kept as the
  original file.**
- **Test "6–7 pt text stays readable"** — in two parts, because the recognition engine
  does not exist yet when normalisation is built. The fixture is the same in both: a
  synthetic receipt, 80 × 300 mm, with lines in 6 pt and 7 pt (tax number, fiscal number,
  VAT amounts, the letters ң, ө, ү), put through normalisation.
  - **Task 63 — pixel checks on the document copy, no engine needed:** the longest side
    is 3000 px or the original size; no EXIF or GPS block is present; the orientation is
    upright; the file is within the size target; the lower-case letters of the 6 pt lines
    are at least 8 px high, measured in the image.
  - **Task 64 — reading check, once the engine is there:** the digit strings of the 6 pt
    and 7 pt lines are read back from the document copy without error.
  - One printed-and-photographed sample is checked by eye once and recorded in the
    journal.
- Whether a photo without the original file is accepted as an accounting document in
  Kyrgyzstan remains **lawyer question 33**.

### Options from the mockup

- **Skip duplicates:** checked locally against the offline window (merchant + date +
  total) and again by the server on sync (ADR-0024), because the local copy may not know
  everything in the group.
- **Auto-confirm:** off by default; applies only when all conditions of
  `business-processes.md` hold; such receipts are marked "confirmed automatically". The
  server re-checks the conditions — a client cannot auto-confirm what the rules forbid,
  and only where the user's role may confirm at all (ADR-0011).
- **Common category:** applied as a default the user can change.

### Summary

Counts by outcome (recognised, to check, unreadable, duplicate, skipped with reason), as
on the mockup. Skipped files name the reason code (ADR-0008 style), translated by the
frontend.

### Consequences

- Good: memory use is bounded by one entry and one decoded image, not by the archive.
- Good: ZIP bombs are stopped twice — by declared sizes and by counting real bytes.
- Good: one pipeline to test for three ways of importing.
- Good: HEIC support costs nothing for users who never import HEIC.
- Good: the archive keeps small print readable while recognition stays fast — the two
  sizes are tuned independently.
- Bad: stored photos are larger than a recognition-sized copy would be (up to about
  2.5 MB instead of a few hundred kB) — more storage, longer uploads on mobile data.
- Bad: the original camera file is not kept; if the lawyer's answer to question 33
  requires it, the document copy rule changes (the pipeline does not).
- Bad: 200 files one at a time take minutes; the UI must make progress and pausing
  obvious.
- Bad: after a reload the user must re-select unfinished files.
- Bad: HEIC decoding in WebAssembly is slow and the decoder is large when it is needed.
- Bad: phones may still struggle with very large batches — the UI recommends a desktop
  for big archives.

## Pros and Cons of the Options

### zip.js with random access

- Good: reads from the file without loading it; streams per entry; supports large
  archives (ZIP64); runs in workers.
- Bad: a larger library than a bare inflate.

### fflate streaming

- Good: very small and fast.
- Bad: stream-oriented unzip reads the archive front to back — fine, but checking the
  whole table of contents _before_ unpacking (our first line of defence) is more work.

### JSZip

- Bad: loads the whole archive into memory — exactly what must not happen.

### Several workers in parallel

- Good: faster on desktops.
- Bad: memory multiplies; ordering, pause and progress get harder. Can be added later
  behind the same queue if desktops need it.

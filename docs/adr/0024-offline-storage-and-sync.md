# 0024. Belegscan offline: local store in IndexedDB, an operation queue with idempotent requests, version-based conflicts decided by the user

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

Belegscan is used on a phone in a shop. Requirements (`business-processes.md` and the
owner's answers):

- Recognition works without network; data **and photos** go to the server when the
  connection returns. Photos are stored encrypted on the server (ADR-0012).
- Without network: capture, recognition, and the list of receipts already loaded.
  Analytics is online only. The app is installable as a PWA (answer 25).
- Receipts belong to a group; several members may edit the same receipt. On a conflict
  the second person is told "the receipt was changed, refresh" and decides; nobody is
  overwritten silently (answer 24).
- A confirmed receipt can be edited only by an accountant (answer 23).

All endpoints shown are **illustrative examples, not the final API**.

## Decision Drivers

- A receipt captured offline must never be lost and never be created twice.
- Simple enough to explain: no merge algorithms the owner cannot defend in an interview.
- Works on iOS Safari, which lacks some background APIs.
- The server stays the source of truth for group data.
- Tens of users, thousands of receipts — not a distributed database problem.

## Considered Options

1. **Own thin sync: IndexedDB + operation queue + idempotent REST + version check**
2. A sync framework / local-first database (RxDB, PowerSync, ElectricSQL)
3. CRDTs (automatic merging)
4. Online only, with recognition offline but saving blocked

## Decision Outcome

Chosen option: **1**.

### On the device

- **IndexedDB** (through a small typed wrapper) holds:

  | Store      | Content                                                                |
  | ---------- | ---------------------------------------------------------------------- |
  | `receipts` | receipts of the active groups: server copy plus local unsynced changes |
  | `blobs`    | photos / PDFs not yet uploaded, and thumbnails for the offline list    |
  | `queue`    | pending operations, in order                                           |
  | `meta`     | sync cursor per group, last signed-in user, app version                |

- **Service worker** (Angular's): caches the app shell, translation files and the OCR
  model files (ADR-0023) so the app starts offline, and handles updates ("new version
  available").
- The app asks the browser for **persistent storage**, and the UI recommends installing
  the PWA: browsers may evict the data of sites that are not installed and not used for a
  while. Unsynced items are shown with a clear marker until they reach the server.
- Offline list window: the current and the two previous months per group; older months
  load on demand when online.

### Identity and idempotency

- The client creates the receipt id (UUIDv7, ADR-0008) at capture time.
- Create and update are **idempotent**: (illustrative)
  `PUT /api/v1/groups/{groupId}/receipts/{id}`. Sending the same operation twice — after
  a timeout, a retry, a reload — yields the same result, not a duplicate.
- **Order of checks on the server — id first, duplicates last** (owner's correction):
  1. policy (ADR-0011);
  2. look up the receipt **by id**. Found and the request repeats what is stored → the
     stored result is returned again. Found and it is an update → version check
     (see Conflicts);
  3. only for an id the server has never seen: the duplicate search (merchant + date +
     total within the group).

  The duplicate search never matches the receipt's own id, on create or on update.
  Otherwise a retry after a lost response would be answered with `receipt.duplicate`
  pointing at the receipt itself — the client would be told that its own receipt already
  exists and offer the user "keep anyway". Tested in the API (task 60) and in the sync
  engine (task 68): send, drop the response, send again → the same success, one receipt.

- The photo is a separate idempotent upload keyed by the receipt id and the file's
  SHA-256 (`PUT …/receipts/{id}/document`). The receipt shows "document pending" on other
  devices until it arrives.

### The queue

- Every local change appends an operation (`create`, `update`, `uploadDocument`, `trash`,
  `confirm`). A sync engine sends them **in order per receipt** when the app is open and
  online: at start, on the browser's `online` event, when the tab becomes visible, and
  on a timer.
- **Background Sync is used only as an enhancement** where the browser has it. It is not
  relied on, because iOS Safari does not offer it; the baseline is "sync while the app is
  open".
- Failures: network or 5xx → retry with growing delays. 4xx → the operation is parked
  with its error code and shown to the user; it never blocks other receipts.
- Photos upload after their receipt's data, one at a time; an interrupted upload restarts
  (files are small after normalisation, ADR-0025).

### Pulling changes

- (Illustrative) `GET …/receipts?changedSince=<cursor>` returns changed receipts and
  tombstones (trashed or deleted ids) since the cursor; the response carries the next
  cursor. This is the same request the polling helper of ADR-0018 uses when online.

### Conflicts

Each receipt has an integer `version` (ADR-0008). An update names the version it started
from.

| Situation                                                               | Server answer                                        | What the user sees                                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Someone else changed the receipt meanwhile                              | 409 `conflict.stale` with the current server version | "This receipt was changed by … — your changes are kept as a draft." Both versions side by side; the user takes theirs, the other, or edits again |
| The receipt was confirmed meanwhile and the user is not an accountant   | 403                                                  | "Confirmed by …; your change was not applied." Local draft shown read-only, then discarded on acknowledgement                                    |
| The receipt was moved to the trash meanwhile                            | 409 `receipt.trashed`                                | Offer to restore (if allowed) or discard the change                                                                                              |
| Duplicate of an existing receipt in the group (merchant + date + total) | 409 `receipt.duplicate` with the existing id         | "Already imported" with "keep anyway"                                                                                                            |

**No automatic merging.** For a receipt, a silently merged total is worse than a
question.

### Signing in and out

- The session is the cookie of ADR-0010. Offline, the app opens for the **last signed-in
  user** with the local data; nothing can be sent until the server confirms the session.
  If the session expired, the user signs in again and the queue continues — local data
  is kept.
- Signing out clears the local stores; so does signing in as a different user.
- **Signing out with unsynced items is not a simple "warn and allow"** (owner's decision):
  a receipt is an accounting document and losing it is expensive.
  - The ordinary sign-out button is **unavailable** while anything is unsynced.
  - Instead the user sees a warning with the number of receipts and the button
    **"Jetzt synchronisieren"**, which runs the queue; when it is empty, sign-out works
    as usual.
  - A separate, visually dangerous action **"Nicht hochgeladene Belege verwerfen und
    abmelden"** (danger button, the number of receipts in its text, confirmation dialog)
    discards the unsynced receipts and signs out. It exists because the alternative —
    a user who can never sign out of a phone without network — is worse.
  - Parked operations (4xx) count as unsynced.
  - Signing in as a different user on the same device goes through the same gate.

### What is not protected

Data in IndexedDB is **not encrypted by us** on the device; it is as protected as the
phone itself (screen lock, device encryption). Encrypting it in the browser would need a
key that the same browser stores next to the data — protection in name only. Accepted by
the owner on condition that the privacy text says so plainly.

### Consequences

- Good: capture works in a basement; nothing is lost or doubled on a bad connection.
- Good: every piece is ordinary — a table, a queue, HTTP status codes.
- Good: works on iOS without background APIs.
- Good: conflicts are rare by nature (few people, short edits) and always visible.
- Bad: sync happens only while the app is open; a user who captures offline and never
  reopens the app keeps the receipts on the phone.
- Bad: browser storage can be evicted or cleared by the user; unsynced receipts would be
  lost — hence the marker and the install recommendation.
- Bad: our own sync code must be tested carefully (reload in the middle, double send,
  reordered responses) — the largest test effort in Belegscan.
- Bad: photos and receipt data sit unencrypted in the browser profile.

## Pros and Cons of the Options

### Own thin sync

- Good: fits the simple shape of the data (independent receipts); fully explainable.
- Bad: we write and test it ourselves.

### Sync framework / local-first database

- Good: replication, conflict handling and offline queries out of the box.
- Bad: brings its own server component or protocol, its own data model and often a
  licence; hides exactly the logic the owner must be able to explain; heavy for
  "upload receipts later".

### CRDTs

- Good: concurrent edits merge without conflicts — right for collaborative text.
- Bad: a merged receipt can be wrong in a way nobody chose (one person's total with
  another's items); the owner explicitly wants the user to decide.

### Online only for saving

- Good: no sync at all.
- Bad: fails the main mobile scenario.

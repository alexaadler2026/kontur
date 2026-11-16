# 0017. Protocol and deletion: per-document hash chain with personal data kept outside it, proof-preserving deletion, retention settings

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

SignFlow's protocol records every event on a document: time, person, event, IP
(`business-processes.md`). It is the evidence behind a simple electronic signature. The
rules to satisfy:

- **Integrity:** can a record be forged or back-dated?
- **Deletion with proof:** deleting a document erases the PDFs; the SHA-256 fingerprint
  and who signed what and when remain.
- **Retention:** one setting per installation ("delete signed documents after N months");
  the UI warns that accounting documents may have to be kept by law.
- **Not forever** (answer 6): the protocol is kept as long as the law requires. It must be
  possible to **anonymise** a record (name, e-mail, IP) without breaking the integrity
  check. The owner suggested: personal data outside the hash chain, only a salted hash of
  it inside — "say if this is too complex for v1".

## Decision Drivers

- An altered, removed or inserted record must be detectable.
- Honest about the limit: what can someone with full database access do?
- Erasing personal data and proving integrity must not contradict each other.
- No external services, no blockchain; explainable on a whiteboard.

## Considered Options

1. **Hash chain per document, personal data in a separate table referenced by a salted
   digest, head hash anchored in documents the participants hold**
2. Plain append-only table protected by database permissions only
3. Hash chain with personal data inside the hashed record
4. One global chain for the whole installation
5. External anchoring from day one (RFC 3161 time-stamp authority, public ledger)

## Decision Outcome

Chosen option: **1**. It is **not too complex for v1**: one extra table, one digest
function and one verification routine — about two tasks.

### The chain

Each envelope has its own chain. An event row contains:

| Field        | Meaning                                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `seq`        | 1, 2, 3 … without gaps, per envelope                                                |
| `occurredAt` | server time (UTC)                                                                   |
| `type`       | event type (uploaded, sent, code confirmed, signed, …)                              |
| `data`       | non-personal facts: file hash after this step, field ids, consent text version      |
| `actorRef`   | stable pseudonymous reference to the participant ("signer 2")                       |
| `piiDigest`  | HMAC-SHA-256 of the personal data of this event, keyed with a per-event random salt |
| `prevHash`   | `hash` of the previous event (a fixed value for `seq = 1`)                          |
| `hash`       | SHA-256 over a canonical serialisation of all fields above                          |

- **Canonical serialisation** = a fixed field order and encoding, versioned
  (`chainVersion`), so the same event always produces the same bytes.
- Changing, deleting or inserting any event breaks every `hash` after it.

### Personal data outside the chain

- Table `audit_pii (eventId, name, email, ip, userAgent, salt)`.
- The chain contains only `piiDigest`. With the salt present, anyone verifying can
  recompute the digest and confirm the personal data was not altered.
- **Deleting the `audit_pii` row including its salt removes the person from the
  protocol.** The chain still verifies (the digest is just a value in it), but the digest
  can no longer be linked to a person: without the salt it cannot be recomputed or
  brute-forced from guesses. The UI then shows "signer 2".
- **This step alone is pseudonymisation, not anonymisation.** The person can still be
  identified from other places. The next section lists everything that must go before we
  may call a record anonymised.

### Pseudonymised or anonymised — the full list

Two words, used strictly:

- **Pseudonymised:** the name is replaced by a reference ("signer 2"), but data that
  re-identifies the person still exists somewhere in our system.
- **Anonymised:** nothing in our system allows re-identification any more.

**Anonymising an envelope** (at the end of protocol retention, after the PDFs are gone)
erases or replaces all of the following, in one transaction, with a chain event
"anonymised":

| Where                                                          | What happens                                                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `audit_pii` (name, e-mail, IP, user agent, salt)               | rows deleted                                                                                   |
| Participants of the envelope (name, e-mail, letter language)   | name → "signer n" / "reviewer n", e-mail and language erased                                   |
| Envelope: title, counterparty, contract value                  | title → "document" + short id; counterparty and value erased                                   |
| Envelope: sender's message, decline reason, review remark      | erased (free text may name people)                                                             |
| Link tokens, one-time codes, participant sessions (ADR-0016)   | rows deleted                                                                                   |
| Attempt counters and lock records with IP (ADR-0010, ADR-0016) | rows deleted                                                                                   |
| Outbox and captured letters for the envelope (ADR-0015)        | rows deleted (recipient address, template parameters)                                          |
| Delivery status / bounce records for the envelope              | rows deleted                                                                                   |
| Reference to the sender's account                              | kept only as the internal user id while the account exists; erased when the account is deleted |

What remains afterwards: envelope id, status, dates, file hashes, the chain with event
types and times — no names, addresses or free text.

**What we cannot erase, and say so:**

- copies outside our system: the final PDF (with the protocol page) held by the
  participants, letters in their mailboxes, the mail provider's own delivery logs for its
  retention period;
- our backups for up to 35 days (ADR-0014) and server logs for up to 14 days (ADR-0020);
- the global list of undeliverable addresses (ADR-0015) is not tied to an envelope and
  has its own lifetime;
- a file hash is not a name, but whoever holds the file can recognise it by its hash.

**A request by one participant while the document still exists** can only be
**pseudonymisation**: their rows in `audit_pii`, the participant table, tokens, sessions,
counters and letters are erased as above — but the PDF itself (their name and signature
image), the title and the message written by the sender remain until the document is
deleted, and they remain consciously: they belong to the sender's document and to the
other participants' evidence. The UI and the privacy text use the word "pseudonymised"
for this case. Whether the operator may refuse or postpone such a request until the
document's retention ends is a question for the lawyer.

### How strong is this — honestly

- It **detects** accidental corruption, partial tampering, and any change by someone who
  cannot rewrite the whole chain.
- It does **not** stop someone with full write access to the database who recomputes the
  whole chain of a document. A hash chain alone never does.
- Therefore the **head hash is anchored outside our database**, in things the participants
  already hold:
  - printed on the protocol page of the final PDF (ADR-0013) that every participant gets;
  - included in the completion e-mail and in each signer's "you signed" confirmation.
    A rewritten chain no longer matches these copies.
- Database permissions add a second layer: the application's database role can insert and
  read audit events but not update or delete them; deletion at the end of retention is
  done by a separate maintenance role used only by the retention job.
- A `verify` routine recomputes all chains; it runs nightly and in the restore drill
  (ADR-0014) and alerts on a mismatch (ADR-0020).
- Stronger, later: a time-stamp from an external authority (RFC 3161) or the service's
  cryptographic seal on the final PDF — v2, not prevented by this design.

### Deleting a document, keeping the proof

When the owner deletes a document (or retention does):

| Erased                                                   | Kept                                              |
| -------------------------------------------------------- | ------------------------------------------------- |
| All PDF versions (ciphertext and wrapped keys, ADR-0012) | The envelope record: id, title, status, dates     |
| Field positions, signature and stamp images used         | H₀, N₀, the hash of every version, the final hash |
| Personal message, draft data                             | The whole protocol chain and its `audit_pii` rows |

- A "document deleted" event is appended to the chain first.
- Anyone who kept their copy of the final PDF can still prove it is the signed one: its
  SHA-256 equals the stored final hash.
- Deleted files leave the backups within 35 days (ADR-0014).

### Retention settings (per installation, ADR-0009)

| Setting                     | Meaning                                                                       | Default                                                |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ |
| `RETENTION_DOCUMENT_MONTHS` | delete PDFs N months after the envelope reached a final state                 | off                                                    |
| `RETENTION_PROTOCOL_MONTHS` | anonymise the envelope (full list above) N months after the PDFs were deleted | off, until the lawyer answers (confirmed by the owner) |

- A daily job inside the API (guarded by a database lock so it runs once) applies them.
- The delete dialog and the settings screen warn that accounting documents may have to be
  kept by law (text per jurisdiction — lawyer).
- Drafts are not removed automatically in v1.

### Belegscan

Receipts keep a change history (who edited, who confirmed; answer 23) and a 30-day trash
(answer 31). Whether that history needs the hash chain or a plain log is decided with the
Belegscan ADRs (wave 3); the audit module is written so that both are possible.

### Consequences

- Good: tampering is detectable, and for completed documents detectable by the
  participants themselves.
- Good: a personal-data erasure request can be fulfilled without destroying evidence of
  what happened.
- Good: proof survives deletion of the document.
- Bad: not tamper-proof against a database administrator before a document is completed
  and its head hash has left the system — stated plainly.
- Bad: a canonical serialisation must never change silently; changes need a new
  `chainVersion` and tests with fixed vectors.
- Bad: after anonymisation nobody — including us — can show who "signer 2" was.
- Bad: anonymisation touches many tables; a table added later and forgotten would leave
  personal data behind. A test creates a fully used envelope with marker values in every
  personal field, anonymises it and searches the whole database for the markers.
- Bad: two database roles to configure and test.

## Pros and Cons of the Options

### Chain + personal data outside + anchors

- Good: integrity and erasure together; external witnesses for free.
- Bad: more concepts than a plain log.

### Append-only table by permissions only

- Good: trivial.
- Bad: nothing detects a change made with higher privileges or in a restored backup.

### Personal data inside the hashed record

- Good: simplest chain.
- Bad: erasing a name breaks the chain — integrity and data protection collide.

### One global chain

- Good: also proves the order of events across documents.
- Bad: deleting one document's protocol at the end of its retention would break the chain
  for all others.

### External anchoring from day one

- Good: strongest evidence.
- Bad: an external service and its availability in the signing path; more than a simple
  electronic signature needs. Planned as an upgrade.

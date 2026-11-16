# 0016. Access without an account: long-lived link plus a one-time e-mail code at every entry

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

Signers and reviewers in SignFlow have no account (`business-processes.md`, roles). They
get a link by e-mail. Decisions already made by the owner:

- The link is valid for a limited time and is **not single-use**: corporate mail scanners
  open links and would "burn" it.
- At every entry the person confirms with a **one-time code sent by e-mail**.
- Code guessing must be prevented.
- If the e-mail belongs to an account, the document also appears in that user's inbox and
  can be signed after a normal login; the link works too (answer 10).
- A corrected signer e-mail invalidates the old link (answer 15).

All endpoints shown are **illustrative examples, not the final API**.

## Decision Drivers

- Opening the link must never change anything (scanners, previews).
- A leaked or forwarded link alone must not allow signing.
- Guessing a code must be hopeless, without letting an attacker lock a signer out forever.
- The secret in the link should not end up in logs.
- Honest wording of what the check proves.

## Considered Options

1. **Link token + one-time code by e-mail, short participant session**
2. Single-use magic link (no code)
3. Link only (possession of the link is enough)
4. Mandatory account for signers
5. Code by SMS

## Decision Outcome

Chosen option: **1**.

### The link

- Each participant of an envelope gets a random 256-bit token. The database stores only
  its SHA-256 hash, bound to (envelope, participant).
- The token travels in the **URL fragment** (illustrative:
  `https://sign.<domain>/s#<token>`). The fragment is not sent to the server by the
  browser, so it does not appear in proxy logs or `Referer` headers. The SPA reads it and
  sends it in a POST body.
- **GET changes nothing.** A scanner that opens the link loads the SPA shell and nothing
  else.
- Validity: while the envelope is waiting for this participant's action. Signing is
  blocked while the envelope is overdue and possible again after the sender extends the
  due date (the same link). The token is revoked when the e-mail is corrected, the
  envelope is voided or declined, or the sender re-sends the invitation.
- After completion the same link (with a code, as always) lets the participant download
  the final PDF for **30 days**. The PDF is never attached to a letter.

### The one-time code

| Parameter (defaults, configurable) | Value                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Format                             | 6 digits, random from a cryptographic generator                                                                                |
| Lifetime                           | 10 minutes                                                                                                                     |
| Attempts per code                  | 5, then the code is dead                                                                                                       |
| Resend cooldown                    | 60 seconds                                                                                                                     |
| Codes per participant              | 5 per hour, 10 per day                                                                                                         |
| Lock                               | 15 wrong entries within 24 hours (counted across all codes) → access locked; **unlocks automatically 24 hours after the lock** |

- Flow: SPA posts the token → server answers "code sent to m•••@example.org" → letter via
  the outbox (ADR-0015) → person types the code → server issues a **participant session**.
- Only an HMAC of the code (server secret) is stored; comparison is constant-time.
- **Guessing arithmetic:** 5 attempts at one of 1,000,000 codes is a 0.0005 % chance per
  code. Wrong entries are counted per participant across all codes, so an attacker gets
  at most 15 guesses per day (0.0015 %) however they spread them.
- **The lock is a daily budget, not a punishment.** It ends by itself after 24 hours, so
  a signer who simply mistyped does not need the sender. The sender is notified and the
  event is written to the protocol; the sender can end the lock earlier by re-sending the
  invitation (new link, old one revoked).
- **Arithmetic with automatic unlock:** at most 15 guesses per 24 hours. Over 30 days
  that is 450 guesses against 1,000,000 equally likely codes (each code is new and
  random, so earlier misses teach nothing): a chance of about 0.045 %. The attacker
  also needs the secret link first, the sender is alerted on the first lock, and the
  link stops working when the envelope is completed, voided or re-sent.

### Participant session

- Cookie `__Host-psid` (HttpOnly, Secure, SameSite=Lax, host-only), separate from the
  account cookie of ADR-0010. Idle timeout 30 minutes, absolute 2 hours; every new visit
  needs a new code.
- The session carries a `participant` principal bound to **one envelope** (ADR-0011): it
  can read that envelope, act on its own fields, decline, and download the result.
  Nothing else.
- Same CSRF protection as account sessions.

### Participants who have an account

- If the participant's e-mail equals a verified account e-mail, the envelope appears in
  that user's inbox; signing there needs no code (the login is the proof).
- The e-mailed link still works and still asks for a code. It does not log the person
  into their account.

### Protocol events

"Invitation sent", "code sent", "identity confirmed by e-mail code", "document opened",
"signed" / "declined" / "review confirmed" / "returned", "access locked" — each with time,
IP and user agent. "Document opened" is written only after the code was accepted, so
scanner visits never appear as a person opening the document.

### What the check proves — and what not

The link and the code go to the same mailbox. Together they prove **control of that
mailbox at the moment of signing**, not the person's identity. This is what a simple
electronic signature means, and the protocol words it exactly so ("identity confirmed by
e-mail code"). The code adds protection against a link that leaked through forwarding, a
shared archive or a compromised scanner long after it was sent.

### Consequences

- Good: mail scanners cannot consume or trigger anything.
- Good: a link in the wrong hands is useless without live access to the mailbox.
- Good: no account, password or app for the signer.
- Good: the token is absent from server and proxy logs.
- Bad: every visit costs the signer one e-mail round trip; slow mail delivery blocks
  signing (hence the deliverability test in ADR-0015).
- Bad: a compromised mailbox defeats both factors — inherent to this signature level.
- Bad: the limits are a trade-off; a legitimate signer who mistypes 15 times waits
  24 hours or asks the sender to re-send.

## Pros and Cons of the Options

### Link + code

- Good: robust against scanners and leaked links; simple for the signer.
- Bad: depends on fast e-mail delivery.

### Single-use magic link

- Good: one click.
- Bad: mail security scanners click links before the user does and consume them — the
  reason this option was excluded in `business-processes.md`.

### Link only

- Good: no friction.
- Bad: anyone who sees the link (forwarded mail, browser history on a shared computer)
  can sign.

### Mandatory account

- Good: strong, reusable identity; inbox for all documents.
- Bad: nobody creates an account to sign one contract; kills the main use case.

### SMS code

- Good: a second, independent channel.
- Bad: cost per message, phone numbers as additional personal data, delivery to Kyrgyz
  and Russian operators uncertain. A candidate for a higher signature level in v2.

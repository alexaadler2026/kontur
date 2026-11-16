# 0015. E-mail: EU transactional provider over SMTP behind a `Mailer` port, database outbox, authenticated sending domain, sending limits

- Status: Accepted, provider pending deliverability test
- Date: 2026-11-16

## Context and Problem Statement

Both products depend on e-mail: invitations, password recovery, signing requests,
one-time codes (ADR-0016), reminders, completion notices. A signing request that lands in
spam means the product does not work. The owner decided (answers, stage 1): a
transactional e-mail provider with data in the EU, because a self-run SMTP server on a new
domain is too risky for deliverability. Real users are in Kyrgyzstan, so mailboxes at
Gmail, Microsoft, Mail.ru and Yandex all matter.

Requirements from `business-processes.md`: only invited users can cause mail to be sent;
the demo never sends mail to the outside (it is shown in a demo inbox); each recipient
has a letter language (de / en / ru).

## Decision Drivers

- Deliverability to the mailboxes our users really have.
- Provider replaceable by configuration; no vendor SDK in business code.
- A letter must never be lost because the provider was down for a minute, and never sent
  for a change that was rolled back.
- The service must not become a spam relay; our domain reputation is an asset.
- Data in the EU; few processors.
- No message broker (scale: tens of users).

## Considered Options

Delivery: **EU transactional provider** / own SMTP server / a global provider's EU region.

Integration: **SMTP behind a `Mailer` port** / the provider's HTTP API and SDK.

Reliability: **outbox table in PostgreSQL with an in-process dispatcher** / send inside the
request / a message queue.

## Decision Outcome

### Port and transports

`Mailer` is an interface with one method (send a rendered message). Three transports,
chosen by `MAIL_TRANSPORT` (ADR-0009):

| Transport | Used in                                 | What it does                                                          |
| --------- | --------------------------------------- | --------------------------------------------------------------------- |
| `smtp`    | production; local development (Mailpit) | standard SMTP submission with TLS                                     |
| `capture` | demo                                    | stores the message in the database for the demo inbox; nothing leaves |
| `memory`  | tests                                   | keeps messages in memory for assertions                               |

SMTP is the integration protocol because every provider speaks it: changing provider is a
change of host and credentials. The only provider-specific code is a small webhook
adapter for bounces.

### Provider

First choice: **Scaleway Transactional Email** (French company, data in France, SMTP and
API, pay per message, no marketing suite attached). Fallback: **Brevo** (French, data in
France and Germany, larger free allowance, stricter anti-abuse automation).

**Confirmed by a test, not by a comparison table.** Before the first real signing request,
a deliverability matrix is run from the real domain: the real templates in three
languages → test mailboxes at Gmail, Microsoft 365 / Outlook, Mail.ru, Yandex and one
corporate mailbox. Recorded: inbox or spam, authentication results in the headers, time
to arrive (one-time codes must arrive within seconds). If the first provider fails for a
mailbox family our users depend on, the fallback is tested the same way. The result is
recorded in the journal and this ADR's status is updated.

### Outbox

- Sending a letter = **inserting a row into `outbox_emails` in the same database
  transaction as the business change** (e.g. "envelope sent"). If the transaction rolls
  back, no letter exists; if it commits, the letter cannot be forgotten.
- A dispatcher inside the API process picks up pending rows (`FOR UPDATE SKIP LOCKED`),
  sends them, and marks them sent. Failures are retried with growing delays; after the
  last attempt the row is marked failed and reported (ADR-0020).
- One-time codes use the same path; the dispatcher is woken immediately on insert.
- The row keeps recipient, template, language, status and timestamps — **not** the
  rendered body with codes or links after sending.

### Sender identity and DNS

- Mail is sent from a dedicated subdomain (`mail.<domain>`), e.g.
  `SignFlow <no-reply@mail.<domain>>`, so a reputation problem cannot hurt other mail of
  the main domain. `Reply-To` is the sender of the envelope: answers go to a person.
- **SPF** (which servers may send for the domain), **DKIM** (a signature proving the
  letter was not altered and comes from the domain; 2048-bit key) and **DMARC** (what
  receivers should do when both fail, and where to report).
- DMARC rollout: `p=none` with reports for 2–4 weeks → `quarantine` → `reject`.
- The display name never contains free text typed by a user without "via SignFlow".

### Content

- Letters are rendered on the server from templates per language (de / en / ru), as plain
  text plus simple HTML, with all user-supplied text (document title, personal message)
  escaped. Links point only to our own hosts.
- **This is the one place where the server holds user-facing text.** ADR-0008's rule
  ("the server sends codes, the frontend translates") is about API responses; a letter
  has no frontend. The letter texts live in translation files next to the API and are
  covered by the same key-parity and ICU check as the apps (ADR-0006).
- A letter is written in the **recipient's** language as stored on the envelope.
- Documents are never attached; letters carry links (ADR-0016).

### Limits against abuse

| Limit (confirmed by the owner; configurable) | Value                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| Who can trigger mail                         | signed-in, invited users only; participants only for their own one-time codes |
| New recipients per user per day              | 50                                                                            |
| Manual reminder to the same signer           | once per 24 hours                                                             |
| One-time codes                               | see ADR-0016                                                                  |
| Global letters per day (circuit breaker)     | 1000 — when reached, sending pauses and the owner is alerted                  |

- A hard bounce or spam complaint (provider webhook, signature verified) marks the address
  as undeliverable; the sender sees "letter not delivered" on the signer instead of
  waiting forever. Further mail to that address is suppressed until someone corrects it.

### Demo

`capture` transport only. The start-up check (ADR-0009) refuses to start a sandbox
installation with a real transport. Captured letters belong to the visitor's sandbox and
are shown in the demo inbox (ADR-0019).

### Consequences

- Good: a letter is sent exactly when its business change is committed; provider outages
  are absorbed by retries.
- Good: provider change = configuration; no SDK lock-in.
- Good: the sender sees undelivered addresses; reputation is protected by limits and DMARC.
- Good: demo cannot send mail by construction.
- Bad: one more processor sees recipient addresses, document titles and one-time codes
  (contract and lawyer question).
- Bad: delivery to Mail.ru / Yandex from an EU provider is not guaranteed — hence the test.
- Bad: the dispatcher lives in the API process; with several API instances it would need
  the row locking it already uses, nothing more — but it is not a general job system.
- Bad: bounce handling is provider-specific code.

## Pros and Cons of the Options

### EU transactional provider

- Good: established sending reputation, authentication set-up, bounce feedback.
- Bad: cost per message (small), another contract.

### Own SMTP server

- Good: no third party.
- Bad: a new IP and domain have no reputation; large mailbox providers reject or junk such
  mail; blocklists and feedback loops become our job.

### Global provider with an EU region

- Good: very strong deliverability and tooling.
- Bad: EU storage but a non-EU company — one more question for the lawyer; not needed if
  the EU provider passes the test.

### SMTP vs provider API

- SMTP: portable and testable with Mailpit. API: richer features (templates, tags) that we
  do not use; ties code to one vendor.

### Outbox vs send in the request vs queue

- In the request: a slow or failing provider makes the user's action slow or fail, and a
  rolled-back transaction may already have sent a letter.
- Queue (Redis, RabbitMQ): solves the same problem with a new service to run. The outbox
  needs only the database we already have.

## Sources checked (2026-11-15)

- EU providers, ownership, data location, free allowances: <https://ahasend.com/blog/best-european-email-apis-2026/>
- Brevo and Mailjet company and data facts: <https://europeanpurpose.com/compare/brevo-vs-mailjet>

# 0019. Demo: the real backend on a small server of its own, one temporary sandbox per visitor

- Status: Accepted (the owner accepted the cost of the second server on 2026-11-16)
- Date: 2026-11-16

## Context and Problem Statement

The demo is how a recruiter judges the portfolio (`CLAUDE.md`, goal "IT MUST WORK").
Requirements collected so far:

- Free hosting; entry within seconds; **no sleeping server** that answers after 30–60 s.
- Demo data is fictitious and reset regularly; letters never leave the system.
- **A sandbox per visitor** (answer 33): "Demo starten" creates a temporary, isolated
  account with ready data that disappears after 24 hours; uploads are restricted;
  visitors do not see each other.
- A demo inbox inside the demo shows the letters, links and codes (answer 32).
- The owner's warning: a public sandbox with uploads **on the server that holds the real
  documents** is extra attack surface for production. Compare honestly.

ADR-0009 deliberately left open whether the demo uses the real backend.

## Decision Drivers

- Loads and responds immediately, every time.
- No added risk for the production installation.
- Shows the real product; does not create a second product to maintain.
- Cost; "free" was a requirement.
- Explainable: what exactly does the recruiter see?

## Considered Options

1. **Frontend only on GitHub Pages; the API is imitated in the browser** (request
   interception built on the same OpenAPI contract, state in the browser)
2. **Free cloud tiers** for NestJS + PostgreSQL
3. **Own infrastructure**
   - 3a. demo containers on the production server
   - 3b. demo on a separate small server

## Comparison

|                                    | 1. Imitation in the browser                     | 2. Free cloud tier               | 3a. On the production server | 3b. Separate small server |
| ---------------------------------- | ----------------------------------------------- | -------------------------------- | ---------------------------- | ------------------------- |
| Cost                               | free                                            | free                             | free                         | a few euros a month       |
| First response                     | instant                                         | cold start or sleep              | instant                      | instant                   |
| Sandbox per visitor                | automatic (data lives in the visitor's browser) | must be built                    | must be built                | must be built             |
| Real backend shown                 | **no**                                          | yes                              | yes                          | yes                       |
| Risk for production data           | none                                            | none                             | **yes**                      | none                      |
| Same image as production           | no (no backend at all)                          | partly (no local disk for files) | yes                          | yes                       |
| Extra code that is not the product | **a second, stateful fake backend**             | storage adapter for the demo     | sandbox module               | sandbox module            |
| Exercises the deploy path          | no                                              | no                               | yes                          | yes                       |

Details behind the table:

**1. Imitation in the browser.** Generated mocks give the _shape_ of responses (ADR-0007),
not behaviour. A demo where you send a document, receive a code, sign and see the status
change needs state and rules: in effect a second implementation of the backend's logic,
including PDF stamping, running in the browser. Two implementations drift apart: the demo
may work while the product is broken, or the reverse. It conflicts with "the owner must
understand everything" (twice the logic) and shows a recruiter something that is not the
system.

**2. Free cloud tiers** (conditions checked 2026-11-15; they change often):

- Typical free web services stop after a period without traffic and need from several
  seconds up to about a minute to wake — exactly the behaviour the requirements exclude.
- Free managed PostgreSQL is either time-limited (deleted after some weeks) or limited to
  a few compute hours a month.
- Free containers have no persistent disk, so our file store (ADR-0012) would need a
  different adapter just for the demo — the demo would no longer be the tested image.
- A free "always on" virtual machine exists (Oracle Always Free), but idle free instances
  are reclaimed after a week of low use — and a demo is idle most of the time.

**3a. On the production server.** Free and immediate, but anonymous visitors create
accounts and upload files on the machine that holds real contracts and the file master
key. Containers reduce the risk; they do not remove it (shared kernel, shared disk and
memory, shared reverse proxy). A bug in the sandbox code would be a bug next to
production data.

**3b. Separate small server.** Everything of 3a without the shared machine.

## Decision Outcome

Chosen option: **3b — the real backend on its own small server, with a sandbox per
visitor.**

### Deviation from the requirements (said directly)

"Free" is not met: the demo server costs a few euros a month. Every free option fails
another requirement — instant response (2), no risk for production (3a) or showing the
real product without a second backend (1). If the cost is not acceptable, the fallback is
**3a with the isolation rules below**, with the remaining risk accepted in writing.

The second server also hosts error tracking (ADR-0020), so it has a second purpose.
Suggested size: 2 vCPU, 4 GB RAM, 40 GB disk (2 GB RAM is enough without error tracking).

### What runs there

- The **same images** as production (ADR-0009, ADR-0014), configured with
  `REGISTRATION_MODE=sandbox`, `MAIL_TRANSPORT=capture`, small upload limits and
  `ACCOUNT_TTL_HOURS=24`.
- Hosts `sign-demo.<domain>` and `beleg-demo.<domain>`.
- **No production secret exists on this server**: its own database, its own file master
  key generated on the machine, its own deploy key. No backups — the data is disposable.
- **Deployed automatically on every green `main`.** The demo is therefore always the
  latest tested build, and the deploy path used for production (by button) is exercised
  many times before each production release.

### The sandbox

- The demo landing page has one button, **"Demo starten"**. It creates a temporary user
  and a session and opens the dashboard with seeded data — no login form, no password on
  the page. (This replaces "demo account with login and password on the demo page" in
  `business-processes.md` §0; the document should be updated.)
- **Seed data** follows the mockups (documents in every status, a completed one with a
  protocol, receipts with different confidence levels) and is created by the same seed
  code the e2e tests use.
- **Isolation:** everything a sandbox user creates belongs to that user; the scoped
  queries of ADR-0011 already prevent seeing anything else. There is no shared demo data.
- **Lifetime:** the user has `expiresAt = now + 24 h`. A job every 15 minutes deletes
  expired users with all their rows and files.
- **Limits** (configuration):

  | Limit                   | Value                                                                   |
  | ----------------------- | ----------------------------------------------------------------------- |
  | New sandboxes per IP    | 5 per hour                                                              |
  | Live sandboxes in total | 300; beyond that, a friendly "try again later"                          |
  | Uploads                 | PDF only, ≤ 2 MB, ≤ 5 files per sandbox (same validation as production) |
  | Envelopes per sandbox   | 10                                                                      |
  | Letters                 | captured only; any recipient address is accepted and nothing is sent    |

- **Sample documents** are offered ("use a sample contract"), so nobody needs to upload
  anything to try the flow.
- **Demo inbox:** lists the captured letters of this sandbox. Opening a signing link
  from it starts the participant flow (ADR-0016) in a new tab; the code is in the next
  letter. One person can play sender and signer.
- **Visible notice** on every page: demo, data is deleted after 24 hours, do not upload
  real documents. `noindex` for search engines. Legal notice and privacy text as the
  lawyer advises.
- Belegscan demo: the same mechanism; recognition already runs in the browser.

### Isolation rules if the fallback 3a is ever used

Separate Compose project and Docker network; separate PostgreSQL instance; separate
volume and file master key; memory and CPU limits; no access to production secrets;
stricter upload limits; the demo is switched off first when the server is under load.

### Consequences

- Good: the recruiter uses the real system and gets in with one click.
- Good: production data shares nothing with anonymous visitors.
- Good: demo = tested image; continuous proof that deployment works.
- Good: the sandbox code is small (create, seed, expire, limit) and the seed is reused by
  tests.
- Bad: not free; a second server to patch.
- Bad: sandbox and capture code ships in the production image, disabled by configuration
  (ADR-0009's start-up check).
- Bad: a public upload endpoint exists, even if small and isolated — it will be probed.
- Bad (accepted risk): the error tracker that receives **production** error events runs
  on this server, next to the public sandbox. Measures and the comparison with a third
  server and with Sentry cloud are in ADR-0020; in short: scrubbed events only, own host
  name, login required, own Docker network with no route to the demo containers, own
  project and DSN for production.
- Bad: after 24 hours a returning visitor starts from scratch.

## Sources checked (2026-11-15)

- Oracle Always Free, reclamation of idle instances: <https://docs.oracle.com/iaas/Content/FreeTier/resourceref.htm>
- Free-tier conditions of managed platforms were read from the providers' pricing pages;
  they change frequently and must be re-checked if this decision is revisited.

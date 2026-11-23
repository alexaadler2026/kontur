# 0020. Monitoring: Sentry SDKs sending scrubbed errors to a self-hosted tracker, structured logs, health checks and external heartbeats

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

One person operates the system. Without monitoring, the first sign of a problem is a user
writing "it does not work" — or nobody noticing that backups stopped. The owner allowed
external services if data stays in the EU and asked for a justified choice between cloud
and self-hosted error monitoring (answer 2).

Error reports are not harmless: a stack trace or request can contain names, e-mail
addresses, document titles or one-time codes.

## Decision Drivers

- Know about an error before the user reports it; know when a scheduled job did **not** run.
- No personal data or document content in monitoring.
- Few processors (each one is a contract and a lawyer question).
- Monitoring must still work when the production server is down.
- Small footprint; one person; explainable.

## Considered Options

Error tracking:

1. **Sentry SDKs → self-hosted Bugsink on the second server**
2. Sentry SDKs → Sentry cloud, EU region
3. Sentry SDKs → self-hosted GlitchTip
4. Self-hosted Sentry
5. Logs only

Logs: **structured JSON to stdout with rotation** / a log stack (Loki, ELK).

Availability: **external heartbeat and uptime checks** / self-hosted checks only.

## Decision Outcome

### Errors — option 1

- Both Angular apps and both APIs use the **Sentry SDKs**. The SDK protocol is a de-facto
  standard: the receiving side is chosen by one setting (the DSN).
- The receiver is **Bugsink**, a single container, on the demo server (ADR-0019) at its
  own host name. It gets production and demo events as separate projects.
- **Why not on the production server:** a tracker on the monitored machine is silent
  exactly when that machine dies, and it would take memory from PDF processing.
- **Why self-hosted rather than Sentry cloud (EU):** error events stay on our own
  infrastructure — no additional processor. Sentry's EU region stores event data in
  Frankfurt and is available on the free plan, but the company is in the US, some account
  metadata stays there, and there is no EU contracting entity. Because the SDK is the
  same, moving to Sentry cloud later is a DSN change.

**Accepted risk: production error events on the server with the public sandbox.**
Anonymous visitors upload files to the demo on the same machine. If the demo application
were broken out of, the attacker would be next to the tracker's data. What that data is:
scrubbed events — stack traces, routes with ids, internal user ids, build SHA. No
documents, no names, no addresses, as long as scrubbing works. Measures:

- own host name (`errors.<domain>`), served only over TLS;
- the Bugsink UI requires a login with a strong password; registration is closed; access
  to the UI can additionally be limited to the owner's IP addresses at the proxy
  (the event-ingest path must stay open: browsers send errors from anywhere);
- separate projects and DSNs for production and demo, so demo noise cannot hide or forge
  production issues, and a leaked demo DSN is useless for production;
- Bugsink runs in its own Docker network with its own volume; the demo containers have
  no network route to it except through the public proxy, like any stranger;
- container limits (memory, CPU), non-root, read-only file system as in ADR-0014;
- scrubbing is verified by a test (below) — this is the control that makes the remaining
  risk small;
- event retention in the tracker: 30 days.

Alternatives for production events, compared:

|                                   | Bugsink on server 2 (chosen) | Third small server              | Sentry cloud, EU region      |
| --------------------------------- | ---------------------------- | ------------------------------- | ---------------------------- |
| Isolation from the public sandbox | containers and networks      | full                            | full                         |
| Cost and operations               | none extra                   | another server to pay and patch | none                         |
| New data processor                | no                           | no                              | yes (US company, EU storage) |
| If the scrubber has a gap         | data on our own server       | data on our own server          | data at a third party        |

Because events are scrubbed and the tracker is replaceable by one setting, the extra
server or the extra processor buys little today. **Trigger to move production events to
a third server or to Sentry EU:** the scrubbing rules are ever relaxed (for example to
attach request data for debugging), or the demo server shows any sign of compromise.

**Scrubbing — the part that matters most.** Applied in the SDK before anything is sent,
and tested:

- `sendDefaultPii` off; no IP address, cookies or headers.
- No request or response bodies, no form values, no query strings.
- User = internal id only; never name or e-mail.
- Breadcrumbs: navigation and HTTP status only; no console text, no input contents.
- Link tokens are in the URL fragment (ADR-0016) and are stripped anyway.
- A unit test feeds the scrubber an event full of sample personal data and asserts that
  none of it survives.

Every error response already carries a `traceId` (ADR-0008); the same id is attached to
the event, and the UI shows it in the error message so a user can quote it.

Releases are tagged with the commit SHA, so an error points to the exact deployed build.

### Logs

- APIs write **structured JSON lines to stdout** (one object per event: time, level,
  message, `traceId`, route, status, duration). Docker keeps them with size-based
  rotation; they are read with `docker logs` and standard tools.
- A redaction list removes authorization data, cookies, passwords, codes and e-mail
  bodies; request bodies are never logged. The reverse proxy's access log omits query
  strings.
- Logs contain IP addresses, so they are personal data: kept **14 days**.
- No central log stack in v1. Trigger to add one: more than one server producing
  application logs, or an incident that could not be investigated with what we had.

### Health and heartbeats

- Each API exposes (illustrative) `/api/v1/health/live` (the process answers) and
  `/api/v1/health/ready` (database reachable, migrations applied, file store writable).
  The deploy script waits for `ready` (ADR-0014).
- An **external** service checks the public URLs every minute and receives **heartbeats**
  from scheduled jobs. A heartbeat check turns the question around: the job reports "I
  ran"; if the report does not arrive on time, the service raises the alarm. This catches
  the dangerous case — a job that silently stopped.

  | Heartbeat                                                            | Expected         |
  | -------------------------------------------------------------------- | ---------------- |
  | Backup (ADR-0014)                                                    | every 6 hours    |
  | Restore drill (ADR-0014)                                             | monthly          |
  | Protocol chain verification (ADR-0017)                               | nightly          |
  | Retention job (ADR-0017)                                             | daily            |
  | Mail dispatcher: no letter pending longer than 10 minutes (ADR-0015) | every 5 minutes  |
  | Disk below 70 %, certificate valid for more than 14 days             | hourly           |
  | Demo sandbox clean-up (ADR-0019)                                     | every 15 minutes |

- The service is external on purpose (it must outlive both our servers), EU-hosted, and
  receives **no personal data** — only "check X is alive". Healthchecks.io is the first
  candidate; location and terms are confirmed at sign-up.
- Alerts go to the owner by **e-mail and Telegram**, both sent **by that external
  service** — never through our own mail provider or servers, which may be the thing that
  is broken. Telegram reaches the phone at once; e-mail is the written record. The alert
  text contains the check name and time only, no user data.
- Logs are kept 14 days (confirmed by the owner).

#### Results (task 5b, 2026-11-23)

- `GET /api/v1/health/ready` (SignFlow): 200 `{ status, version }` when the database
  answers **and** every migration of the build (`prisma/migrations`, copied into the build)
  is in `_prisma_migrations` as finished and not rolled back. Otherwise 503
  `server.unavailable` (new code, translated in de/en/ru). A warning line gives the
  reason without values: `not ready: database unreachable (<code>)` or
  `not ready: migration <name> not applied`. Liveness never touches the database. The
  file-store check comes with the file store.
- Database errors are logged as **name, error code, model** only, never with their
  message or stack. PostgreSQL quotes what was sent (`invalid input syntax for type uuid:
"<value>"`), and that value may be personal data. An integration test with a secret value
  proves that neither the response nor the log contains it. Deliberate `ProblemException`s
  (such as the 503) are not logged by the filter.

### Not in v1

Metrics dashboards (Prometheus, Grafana), tracing and performance monitoring. Trigger:
a performance problem that logs and error reports cannot explain.

### To verify in the task

Bugsink's licence terms for self-hosting, its real memory use under a container limit
(published figures differ), and whether it resolves JavaScript source maps. If it fails,
GlitchTip is tested the same way; Sentry cloud EU is the third choice.

### Consequences

- Good: errors arrive with the build, route and trace id, without personal data.
- Good: silent failures of backups, jobs and mail are detected.
- Good: monitoring survives an outage of the production server.
- Good: no new processor for error data; the tracker is swappable by one setting.
- Bad: we operate and patch the tracker; if the demo server dies we lose error tracking
  until it is back (uptime alerts still work — they are external).
- Bad (accepted risk): production error events live on the server that hosts the public
  sandbox (ADR-0019). Mitigated by scrubbing, isolation and login as listed above; the
  trigger to move them is written down.
- Bad: aggressive scrubbing sometimes removes the detail that would explain a bug; the
  trace id and logs are the way back.
- Bad: no dashboards or trends in v1.

## Pros and Cons of the Options

### Bugsink, self-hosted

- Good: one container; Sentry-SDK compatible; built for self-hosting.
- Bad: young product, small team; error tracking only.

### Sentry cloud, EU region

- Good: no operations; most complete product; free plan for one user with a monthly
  error quota.
- Bad: another processor, a US company; quota and single-user limit on the free plan.

### GlitchTip, self-hosted

- Good: open source, Sentry-SDK compatible, also uptime checks.
- Bad: several containers (application, worker, PostgreSQL, Redis) for the same job.

### Self-hosted Sentry

- Bad: documented minimum of 16 GB RAM and dozens of containers — larger than everything
  else we run together.

### Logs only

- Good: nothing to install.
- Bad: nobody reads logs until something is already known to be wrong; frontend errors in
  users' browsers never reach server logs at all.

## Sources checked (2026-11-15)

- Sentry EU region, what stays in the US, plans: <https://intercom.help/sentryio/en/articles/13964378>
- Sentry data storage locations: <https://docs.sentry.io/organization/data-storage-location/>
- Bugsink requirements and positioning: <https://www.bugsink.com/self-hosted-sentry-support/>
- Bugsink vs GlitchTip: <https://www.bugsink.com/blog/bugsink-vs-glitchtip/>
- Self-hosted error tracking, memory comparison: <https://www.ssdnodes.com/learn/self-hosted-error-tracking-sentry-alternatives>

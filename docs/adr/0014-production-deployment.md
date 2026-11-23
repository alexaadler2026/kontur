# 0014. Production deployment: dedicated server, Docker Compose, Caddy, manual release of the tested image, off-site backups with restore drills

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

The production installation runs on the owner's server in the Netherlands for users in
Kyrgyzstan: tens of users, real documents. The repo is public; secrets live only in GitHub
Environments and on the server (answer 3). Backups must be off-site; external services are
allowed if data stays in the EU (answer 2). The repo's delivery principle is **build once,
deploy the tested artifact** (ADR-0005).

This ADR decides the server, how the software runs on it, TLS, secrets, database
migrations, how a release gets there and back (rollback), and backups including proof that
a restore works. Error monitoring and the demo's hosting are separate ADRs (wave 2).

## Decision Drivers

- What runs in production is the image that passed CI.
- One person operates it: few parts, each explainable, a written runbook.
- A failed release must be undone in minutes without touching data.
- A lost server must be rebuilt from the repo, the secrets and the backup.
- A deleted document must really disappear within a stated time (backups included).

## Considered Options

Server: **new dedicated VPS** / the existing server shared with the CRM.

Runtime: **Docker Compose** / Kamal / a self-hosted PaaS (Coolify, Dokku) / k3s / Node
directly under systemd.

Reverse proxy: **Caddy** / Traefik / nginx + certbot.

Release trigger: **manual, with approval** / automatic on every green `main`.

Backup: **restic to EU object storage** / provider snapshots only / pg_dump to the same disk.

## Decision Outcome

### Server — a new one

Recommended minimum for v1: **2 vCPU, 4 GB RAM, 40 GB SSD, current Ubuntu LTS, EU
location.** Rough budget: PostgreSQL ~0.5 GB, two API containers ~0.3 GB each, proxy and
system ~0.5 GB, the rest is headroom for PDF processing and password hashing. Disk: system
and images ~10 GB; files are expected to grow by well under 1 GB a month; alert at 70 %.
2 GB RAM works but leaves no room for the demo or a monitoring container.

Why not next to the CRM:

- **Blast radius:** a hole in either system exposes the other's data, volumes and the
  file master key.
- **Resources:** PDF stamping and Argon2 create memory spikes; the 50 GB disk is shared.
- **Coupled maintenance:** OS and Docker upgrades, reboots and proxy changes hit both.
- **Ports 80/443** can belong to one proxy only; the existing set-up would have to be
  rebuilt around ours or vice versa.

Sharing is acceptable only as a short stopgap, if: own Linux user and Compose project, own
Docker network, memory and CPU limits per container, the existing proxy routes by host
name, at least 20 GB free disk, separate secrets and a separate backup repository.

Hardening: firewall open for 22/80/443 only, SSH keys only, unattended security upgrades,
PostgreSQL not published, containers non-root with read-only file systems and dropped
capabilities, log rotation.

### Runtime — Docker Compose

One `compose.yaml` in the repo describes production:

| Service     | What                                                           |
| ----------- | -------------------------------------------------------------- |
| `caddy`     | TLS, HTTP→HTTPS, routes hosts to the apps, request size limits |
| `signflow`  | **one image: NestJS API + the built Angular SPA**              |
| `belegscan` | same for Belegscan                                             |
| `postgres`  | one instance, two databases, one role per app                  |
| `migrate-*` | one-shot containers that run database migrations               |
| `backup`    | scheduled backup and restore-drill jobs                        |

- **API and SPA ship in one image per product.** They are generated from the same contract
  (ADR-0007), so they are released and rolled back together; a client/API version mismatch
  cannot be deployed.
- Images are referenced by **immutable digest**, never by `latest`.

### Reverse proxy — Caddy

Automatic certificates (Let's Encrypt) and renewal with a configuration of a few lines per
host. Security headers (HSTS, CSP, `nosniff`, frame and referrer policy) are set by the
applications, so tests cover them; Caddy enforces body size limits.

### Secrets

- Files under a root-only directory on the server, mounted as Compose secrets: file master
  key (ADR-0012), database passwords, mail provider key, backup repository password.
- GitHub holds only what the deploy job needs (SSH key, host) in the `production`
  Environment. Nothing secret in the repo, images or logs. Non-secret settings: an env
  file on the server, documented by `.env.example` (ADR-0009).

### Database migrations

- Prisma migrations are files in the repo. Production runs **`prisma migrate deploy`** in
  a one-shot container **before** the new application version starts; failure stops the
  release with the old version still running.
- **Every migration must work with the previous application version** (expand → migrate
  code → contract in a later release). This is what makes rolling back the application
  safe without rolling back the database.
- CI applies all migrations to an empty Testcontainers database on every run.
- A backup is taken automatically right before migrating.

#### Results (task 5a, 2026-11-22)

- **PostgreSQL image `postgres:18.7-trixie`** (owner): Debian, not alpine — musl has no
  real locales, so alpine sorts text by bytes (a test sorting German and Cyrillic words
  fails there, recorded mutation). 18 for the built-in `uuidv7()` (ADR-0008). One constant
  (`apps/signflow-api/src/database/postgres-image.ts`) for Testcontainers; a test keeps
  `compose.dev.yaml` on the same tag; production takes it in task 23.
- **Prisma 7.10.1** (pinned): `prisma-client` generator (ESM TypeScript, not committed,
  target `prisma-generate`), `pg` driver adapter, no Rust query engine. No install
  scripts are allowed (`allowBuilds: false`); the CLI fetches its schema engine on first
  use.
- **`test-integration`** (CI step, needs Docker): every test file gets a fresh database
  with all migrations applied by `prisma migrate deploy`; a second test replays the
  migrations in an empty shadow database and requires `prisma migrate diff` to be empty
  (schema changed without a migration → red).
- E-mail unique regardless of case via **`citext`** (owner's rule); the extension is
  created by hand in the first migration, because Prisma does not manage extensions.

### Release — manual, of the tested image

1. On every push to `main`, CI tests, **builds the images once**, runs the e2e suite
   against those images, and pushes them to GitHub Container Registry tagged with the
   commit SHA.
2. Production is released by **`workflow_dispatch` with a commit SHA**, in the GitHub
   Environment `production` (required approval by the owner). Nothing is rebuilt.
3. The job connects over SSH as a restricted deploy user that can only run the server's
   `deploy.sh <sha>`: pull by digest → backup → migrate → start → wait for the health
   endpoint → on failure switch back to the previous digest automatically.

Manual because production holds real documents, some releases migrate data and one person
must choose the moment. Pull requests and forks never reach this job or its secrets.
(The demo will deploy automatically on every green `main`, so the deploy path itself is
exercised constantly — wave 2.)

**Rollback:** run the same workflow with the previous SHA. Data problems are fixed forward;
a database restore is for disasters only.

### Backups and restore drills

- **What:** `pg_dump` of both databases, then the files volume (already ciphertext), then
  the server configuration (no secrets).
- **Tool and place:** restic to S3-compatible object storage in the EU, at a different
  provider than the server. restic encrypts on the client; the storage sees only
  ciphertext. Credentials for the bucket allow adding but not deleting where the provider
  supports it.
- **Schedule:** every 6 hours. Dump first, files second: files are immutable (ADR-0012),
  so the file snapshot always contains everything the dump refers to.
- **Retention:** 14 daily + 4 weekly snapshots, **nothing older than 35 days**.
  This number is the answer to "when is a deleted document really gone", and it is what
  users are told (ADR-0012): _"Deleted data disappears from backups no later than 35 days
  after deletion."_ A working decision; the lawyer confirms it.
- **Not in the backup:** the file master key and the restic password. Both are kept
  offline by the owner. Without them the backup is unreadable — by a thief and by us.
- **Targets (confirmed by the owner):** recovery point objective 6 hours (lose at most
  6 hours of data); recovery time objective 4 hours.

Proof that restore works:

- **Monthly automatic drill** on the server: restore the latest snapshot into a temporary
  database and directory, check that tables are non-empty, decrypt a random sample of
  files with the master key and compare each SHA-256 with the database. Result goes to a
  heartbeat check; a missed or failed drill sends an alert. The backup job reports to a
  heartbeat too.
- **Twice a year by hand:** rebuild on a fresh server from the runbook
  `docs/runbooks/restore.md`. The first such run is part of going live.

### Consequences

- Good: production runs the exact images that passed the tests; release and rollback are
  the same one-click action.
- Good: one file shows everything that runs; a new server is set up from the runbook.
- Good: backups are useless to a thief and proven restorable every month.
- Good: the CRM and these products cannot take each other down.
- Bad: a second server to pay for and patch.
- Bad: single server — hardware failure means downtime until restore (hours). Accepted
  for tens of users.
- Bad: short downtime (seconds) at each release; no zero-downtime switch in v1.
- Bad: expand/contract migrations take discipline and sometimes two releases.
- Bad: GitHub Actions gets SSH access to the server (limited to one command).

## Pros and Cons of the Options

### Docker Compose

- Good: one declarative file; same images as CI; ubiquitous knowledge.
- Bad: no built-in zero-downtime or multi-server story (not needed).

### Kamal

- Good: zero-downtime deploys over SSH.
- Bad: another tool and its conventions for a problem we accept (seconds of downtime).

### Self-hosted PaaS (Coolify, Dokku)

- Good: UI, automatic TLS, git-push deploys.
- Bad: hides what happens; typically rebuilds on the server — not the tested artifact.

### k3s / Kubernetes

- Bad: operational weight far beyond one server and tens of users.

### Node under systemd

- Good: fewest layers.
- Bad: server state drifts from CI; "works in CI" is no longer "works in production".

### Traefik / nginx + certbot

- Traefik: configuration by container labels needs access to the Docker socket (a
  security consideration) and is harder to read. nginx + certbot: two tools and a renewal
  job for what Caddy does by default.

### Automatic release on green `main`

- Good: no manual step; small releases.
- Bad: migrations and real documents without a human choosing the time; fits the demo.

### Provider snapshots only / dumps on the same disk

- Bad: same provider or same disk as the thing being protected; restore of single items
  and regular restore tests are impractical.

# 0009. Environments and configuration: one build, behaviour chosen by validated runtime settings

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

The same code runs in four places: a developer machine, CI, the public demo and the
production installation. They differ in behaviour (`business-processes.md` §0): who can
register, whether e-mails leave the system, upload limits, data lifetime. The repo
principle is **build once, deploy the tested artifact** (ADR-0005). How do we get different
behaviour without different builds, and where do host names and secrets come from?

## Decision Drivers

- The artifact that passed CI is the artifact that runs — in demo and in production.
- A wrong or missing setting must stop the start, not surface later as a strange bug.
- No `if (demo)` scattered through the code.
- Secrets never in the repository, the image or the frontend bundle.
- Demo and production must not share browser state (cookies, IndexedDB, service worker).

## Considered Options

1. **Runtime configuration: environment variables for the API (validated at start), a
   small public config endpoint for the SPA; behaviour as named feature settings**
2. Build-time configuration: Angular `environment.*.ts` file replacements and one image
   per environment
3. One `APP_MODE=demo|production` switch read all over the code

## Decision Outcome

Chosen option: **1**.

### Environments

| Environment | Purpose           | Database                      | Mail                              | Registration        |
| ----------- | ----------------- | ----------------------------- | --------------------------------- | ------------------- |
| local       | development       | Postgres in Docker Compose    | captured locally (Mailpit)        | invite              |
| ci          | tests             | Testcontainers Postgres       | captured in memory                | invite              |
| demo        | recruiter, anyone | own database, wiped regularly | captured, shown in the demo inbox | sandbox per visitor |
| production  | real use          | own database                  | real provider                     | invite only         |

Where the demo runs, and whether it uses the real backend or an in-browser imitation, is
decided in **ADR-0019**. This ADR does not pre-empt that choice: it only makes sure that
**if** the demo runs the real backend, it is a configuration of the same image and needs
no separate build. The `demo` column below and the demo-only settings apply in that case.

### API configuration

- Read from environment variables (and secret files, ADR-0014) **once at start**, parsed
  into one typed, immutable config object and validated. Missing or invalid → the process
  exits with a message naming the variable. Code injects the config object; nothing reads
  `process.env` directly (lint rule).
- Behaviour is expressed as **individual named settings**, not as "demo mode":

  | Setting (illustrative names)   | production     | demo            |
  | ------------------------------ | -------------- | --------------- |
  | `REGISTRATION_MODE`            | `invite`       | `sandbox`       |
  | `MAIL_TRANSPORT`               | `provider`     | `capture`       |
  | `UPLOAD_MAX_MB`                | `25`           | small           |
  | `UPLOAD_MAX_FILES_PER_ACCOUNT` | unlimited      | few             |
  | `ACCOUNT_TTL_HOURS`            | none           | `24`            |
  | `INSTALLATION_TIME_ZONE`       | `Asia/Bishkek` | `Europe/Berlin` |
  | `RETENTION_MONTHS`             | owner's choice | n/a             |

  Each setting is tested on its own. A dangerous combination is rejected at start
  (e.g. `REGISTRATION_MODE=sandbox` together with `MAIL_TRANSPORT=provider`).

#### Results (task 4a, 2026-11-22)

- `apps/signflow-api/src/config/load-config.ts`: a class-validator schema (the same
  language as the DTOs, no `@nestjs/config`), read once, only the schema's variables,
  returned frozen. `main.ts` loads it **before** Nest starts; a `ConfigError` prints one
  line per problem and exits with code 1. Messages name the variable, never its value.
- Defaults (owner, 2026-11-22): **a secret never has a default**; a default only when the
  value is the same in every environment and harmless. Everything else is required.
- First and only setting: `PORT` (default 3333). The others above are added by the
  tasks that need them; the combination check comes with the second of
  `MAIL_TRANSPORT` (task 27) and `REGISTRATION_MODE` (task 50).
- Lint: `process.env` is forbidden in `src/` except `load-config.ts` (and tests that start
  a child process). `apps/signflow-api/.env.example` lists exactly the schema's settings
  (test). `GET /api/v1/config` → `PublicConfigDto { version }`.

#### Results (task 5a, 2026-11-22)

- Second setting: **`DATABASE_URL`**, required, no default (it holds a password), must be a
  `postgresql://` URL; never printed. `AppModule.forRoot(config)` puts the validated object
  under the DI token `APP_CONFIG`. HTTP unit tests and the contract generator pass
  `offlineConfig()`, whose address leads nowhere. Prisma connects only on the first
  query, so they never touch a database.
- `nx serve` sets the local `compose.dev.yaml` address for the dev target only;
  `serve-e2e` sets the offline address until e2e needs data.

### Frontend configuration

- The SPA bundle contains **no environment-specific values**. Before bootstrap it loads
  public settings from the API (illustrative: `GET /api/v1/config` →
  `{ registrationMode, uploadMaxMb, demo: { inbox: true }, version }`) with an app
  initializer and exposes them through an injectable signal-based `AppConfig`.
- Angular `fileReplacements` are not used for environment values.
- The config response contains nothing secret; it is public by definition.

#### Results (task 4b, 2026-11-22)

- `AppConfig` (`apps/signflow/src/app/config/app-config.ts`): `settings()` is a read-only
  signal with the `PublicConfigDto` or `undefined` = "no settings". `provideAppConfig()`
  loads it through the generated `ConfigService` in an app initializer.
- The request fails or hangs → the app starts anyway, `settings()` stays `undefined`,
  the reason goes to `console.error` (owner, 2026-11-22). A screen that needs the
  settings shows `errors.generic.network` itself.
- Angular runs all app initializers at once: translations and settings load **in
  parallel**, sharing one `STARTUP_TIMEOUT_MS` (10 s). Test with fake timers: both
  requests hang → the start completes at 10 s, not before; a sequential mutation fails.

### Host names and browser isolation

One domain, one host per app and environment, one level deep:

| Host                  | What                 |
| --------------------- | -------------------- |
| `sign.<domain>`       | SignFlow production  |
| `beleg.<domain>`      | Belegscan production |
| `sign-demo.<domain>`  | SignFlow demo        |
| `beleg-demo.<domain>` | Belegscan demo       |

- **One demo host per app, not a shared `demo.`**: cookies, `localStorage`, IndexedDB and
  the service worker are scoped to the origin. Two apps under one host would share them;
  demo under the production host would mix demo data into the real offline store.
- The API is served **under the same origin** as its SPA (`/api/...`). No CORS, and the
  session cookie stays host-only (no `Domain` attribute, ADR-0010).

### Secrets

- Live only on the server (files with restricted permissions, ADR-0014) and in GitHub
  Environments for the deploy job. Never in the image, the repo, logs or the SPA.
- `.env.example` in the repo documents every variable with a harmless value; CI checks
  that it lists exactly the variables the config schema knows (same "source → check" idea).

### Consequences

- Good: with a real-backend demo (ADR-0019), demo and production run byte-identical
  images; a demo bug is a production bug found early.
- Good: mis-configuration fails loudly at start.
- Good: each behaviour difference is a named, tested setting.
- Bad: one extra request before the SPA starts (small, cacheable for the session).
- Bad: the demo-only code paths (sandbox, mail capture) ship inside the production image —
  disabled by configuration and guarded by the start-up combination check.

## Pros and Cons of the Options

### Runtime configuration

- Good: build once; standard twelve-factor practice; easy to explain.
- Bad: needs a validated config layer and an initializer on the client.

### Build-time `environment.ts` and images per environment

- Good: Angular's default; no start-up request.
- Bad: demo and production would be different builds — what was tested is not what runs;
  contradicts ADR-0005's principle.

### A single `APP_MODE` switch

- Good: one variable.
- Bad: hides several independent behaviours behind one word; `if (mode === 'demo')` spreads
  through the code and is hard to test in isolation.

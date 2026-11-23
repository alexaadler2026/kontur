# Architecture Decision Records

An ADR is a short document that records one architectural decision: the problem,
the options that were considered, what was chosen and what follows from it.
ADRs are written in English and follow the [MADR](https://adr.github.io/madr/) format.

## Rules

- One decision per ADR. File name: `NNNN-short-title.md`, numbered in order.
- An accepted ADR is never rewritten. If a decision changes, write a new ADR and
  set the old one to `Superseded by ADR-NNNN`.
- Read the relevant ADR before changing architecture (see `CLAUDE.md`).

## Index

| ADR                                     | Title                                                                      | Status   |
| --------------------------------------- | -------------------------------------------------------------------------- | -------- |
| [0000](0000-npm-scope-adlersoft.md)     | npm scope `@adlersoft` for published packages                              | Accepted |
| [0001](0001-nx-monorepo-with-pnpm.md)   | Nx monorepo with pnpm, Vitest and Playwright                               | Accepted |
| [0002](0002-design-tokens-generator.md) | Design tokens: CSS generated from tokens.json by an own script             | Accepted |
| [0003](0003-component-styles.md)        | Component styles: k-* classes ported 1:1, shared styles in kontur-base.css | Accepted |
| [0004](0004-form-controls-cva.md)       | Form controls: ControlValueAccessor over a native input, state in signals  | Accepted |

## Template

```markdown
# NNNN. <Short title of the decision>

- Status: Proposed | Accepted | Superseded by ADR-NNNN
- Date: YYYY-MM-DD

## Context and Problem Statement

<What is the problem? Why does it need a decision now?>

## Decision Drivers

- <criterion 1>
- <criterion 2>

## Considered Options

1. <option A>
2. <option B>

## Decision Outcome

Chosen option: "<option>", because <justification against the drivers>.

### Consequences

- Good: <…>
- Bad: <…>

## Pros and Cons of the Options

### <option A>

- Good: <…>
- Bad: <…>
```

| [0005](0005-storybook-on-github-pages.md) | Storybook on GitHub Pages: build once, deploy the tested artifact | Accepted |
| [0006](0006-i18n-transloco.md) | i18n: Transloco with ICU in the apps, the library stays i18n-agnostic | Accepted |
| [0007](0007-api-contract.md) | API contract: REST + OpenAPI 3.1, generated from NestJS code, client and mocks generated from the committed spec | Accepted |
| [0008](0008-api-conventions-and-money.md) | API conventions: errors, lists, dates, identifiers, versioning and money | Accepted |
| [0009](0009-environments-and-configuration.md) | Environments and configuration: one build, behaviour chosen by validated runtime settings | Accepted |
| [0010](0010-authentication.md) | Authentication: own accounts, server-side sessions in an httpOnly cookie, invitation only | Accepted |
| [0011](0011-authorization.md) | Authorization: deny by default, roles plus ownership checks as pure policy functions | Accepted |
| [0012](0012-file-storage-encryption-and-upload-validation.md) | Files: storage behind an interface, envelope encryption at rest, strict upload validation | Accepted |
| [0013](0013-pdf-processing.md) | PDF processing in SignFlow: stamping on the server, append-only (incremental) saves, hashes of every version | Accepted, library pending spike |
| [0014](0014-production-deployment.md) | Production deployment: dedicated server, Docker Compose, Caddy, manual release of the tested image, off-site backups with restore drills | Accepted |
| [0015](0015-email.md) | E-mail: EU transactional provider over SMTP behind a `Mailer` port, database outbox, authenticated sending domain, sending limits | Accepted, provider pending deliverability test |
| [0016](0016-external-participant-access.md) | Access without an account: long-lived link plus a one-time e-mail code at every entry | Accepted |
| [0017](0017-audit-trail-and-deletion.md) | Protocol and deletion: per-document hash chain with personal data kept outside it, proof-preserving deletion, retention settings | Accepted |
| [0018](0018-data-refresh-polling.md) | Keeping screens up to date: conditional polling in v1, with a written trigger for Server-Sent Events | Accepted |
| [0019](0019-demo-hosting-and-sandbox.md) | Demo: the real backend on a small server of its own, one temporary sandbox per visitor | Accepted |
| [0020](0020-monitoring-logs-health.md) | Monitoring: Sentry SDKs sending scrubbed errors to a self-hosted tracker, structured logs, health checks and external heartbeats | Accepted |
| [0021](0021-forms-signal-forms.md) | Forms in the apps: Signal Forms, errors shown on leaving a field or on submit, server errors mapped from Problem Details | Accepted |
| [0023](0023-receipt-recognition.md) | Receipt recognition: ONNX models in a Web Worker behind an `OcrEngine` interface; the model is chosen by a spike with fixed criteria | Proposed, model pending spike |
| [0024](0024-offline-storage-and-sync.md) | Belegscan offline: local store in IndexedDB, an operation queue with idempotent requests, version-based conflicts decided by the user | Accepted |
| [0025](0025-batch-import-in-the-browser.md) | Batch import in the browser: one worker pipeline, ZIP read entry by entry with hard limits, HEIC and PDF converted on demand | Accepted |
| [0026](0026-tax-lines-and-fiscal-checks.md) | Receipt data model: a list of tax lines per receipt, country profiles as code, fiscal proofs as an extensible list | Accepted |
| [0027](0027-e-invoices-zugferd-xrechnung.md) | E-invoices: the embedded XML is read in the browser with PDF.js and a small own mapper; only that attachment is touched | Accepted |
| [0028](0028-csv-export.md) | CSV export v1: a ZIP with three linked tables, fixed format for Excel and 1C, protected against formula injection | Accepted |
| [0022](0022-icons-lucide-angular.md) | Icons: Lucide through `@lucide/angular`, one standalone component per icon | Accepted |
| [0029](0029-test-worker-limit.md) | Test parallelism: Vitest workers limited in one shared config by "Nx parallel × maxWorkers ≤ cores" | Accepted |

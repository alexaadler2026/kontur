# 0007. API contract: REST + OpenAPI 3.1, generated from NestJS code, client and mocks generated from the committed spec

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

SignFlow and Belegscan each have an Angular frontend and a NestJS backend in one Nx
monorepo. Frontend and backend must agree on every request and response. Until now
`CLAUDE.md` says "OpenAPI generated" and "shared types via `libs/shared/api-types`" without
saying what the source of truth is, how the Angular client is produced, how tests get mock
data and how drift is caught.

The repo already has a working pattern (ADR-0002): **one source of truth → generation →
a check in CI that fails on drift** (`tokens.json` → `tokens.css` → `tokens:check`).
We want the same for the API.

## Decision Drivers

- One source of truth; drift between server, spec and client must fail CI.
- The owner reviews the API in a pull request as a readable diff.
- Mainstream tooling a German enterprise team recognises.
- Angular 22 idioms: standalone, `inject()`, signals, `httpResource` for reads.
- Mocks for unit tests and Storybook come from the same contract.
- Scale: tens of users, two small APIs, one developer. Simple beats clever.

## Considered Options

API style:

1. **REST + OpenAPI 3.1**
2. GraphQL
3. gRPC / gRPC-Web
4. OData

Source of truth:

A. **Code-first: NestJS DTO classes and controllers → generated `openapi.json`, committed**
B. Contract-first: hand-written `openapi.yaml`, server validated against it

Angular client generator:

i. **Orval (`orval` + `@orval/angular`)**
ii. OpenAPI Generator (`typescript-angular`)
iii. Hey API (`@hey-api/openapi-ts` with the Angular plugin)
iv. ng-openapi-gen / ng-openapi
v. Hand-written services on top of types from `openapi-typescript`

## Decision Outcome

Chosen: **REST + OpenAPI 3.1 (1), code-first with a committed spec (A), Orval (i).**

### The pipeline

```
DTO classes + controllers (NestJS, class-validator, @nestjs/swagger)
        │  nx run <app>-api:openapi            (generate)
        ▼
libs/<app>/api-contract/openapi.json           (committed, reviewed in the PR)
        │  nx run <app>-api-client:generate    (Orval; output NOT committed, Nx-cached)
        ▼
Angular client (HttpClient services + httpResource helpers) + TypeScript models
+ MSW request handlers for tests and Storybook
```

- **Source of truth: the DTO classes.** One class carries validation (`class-validator`),
  the TypeScript type and the schema (`@nestjs/swagger`, with its CLI plugin reading the
  validation decorators). This keeps `CLAUDE.md` as it is: "DTO validation with
  class-validator. OpenAPI generated."
- **The spec is generated and committed** as `libs/<app>/api-contract/openapi.json`
  (sorted keys, stable output), exactly like `tokens.css`: the reviewer sees the API change
  as a diff.
- **`api:check`** regenerates the spec in memory and compares it with the committed file.
  CI fails if they differ. It runs with `lint` on every affected build.
- **The Angular client is generated from the committed spec** by Orval into
  `libs/<app>/api-client/src/generated/` (git-ignored). `build`, `test` and `lint` of the
  consumers depend on the `generate` target; Nx caches it by the spec's hash. Because it is
  always derived, it cannot drift, so it needs no check of its own.
  - Reads: `httpResource` helpers (signals). Writes: injectable `HttpClient` services.
    Orval's `both` retrieval mode produces exactly this split.
  - Generated code is never edited by hand and never imported by `libs/ui`.
- **Mocks:** Orval generates MSW handlers from the same spec. They use the `examples` from
  the spec (deterministic), not random data. Used in Vitest component tests (`msw/node`)
  and Storybook. Playwright e2e for the main journeys runs against the real API with a
  Testcontainers Postgres, not against mocks.
- **Spec version:** the document declares `openapi: 3.1.0`.

### Change to `CLAUDE.md` (said directly)

`libs/shared/api-types` as a place for **hand-written** shared request/response types is
dropped. Types shared between front and back are now **generated** from the spec. The line
becomes: "Shared API types are generated from `libs/<app>/api-contract/openapi.json`; do
not hand-write request or response types." Server-side building blocks used by both APIs
(Problem Details, Money, pagination DTOs) live in a server library `libs/shared/api-kit`.

### Nx tags and module boundaries

The new libraries get tags, and `@nx/enforce-module-boundaries` turns the rules into lint
errors (ADR-0001). A third tag dimension `platform:*` is added next to `scope:*` and
`type:*`; exact names are aligned with the existing tags in the task that introduces them.

| Library                                                   | Tags                                               |
| --------------------------------------------------------- | -------------------------------------------------- |
| `libs/<app>/api-contract` (the spec)                      | `scope:<app>`, `type:contract`, `platform:neutral` |
| `libs/<app>/api-client` (generated Angular client, mocks) | `scope:<app>`, `type:data-access`, `platform:web`  |
| `libs/shared/api-kit` (server DTO building blocks)        | `scope:shared`, `type:util`, `platform:server`     |
| `libs/shared/auth-server`                                 | `scope:shared`, `type:feature`, `platform:server`  |
| `libs/shared/auth-client`                                 | `scope:shared`, `type:data-access`, `platform:web` |
| `libs/ui`                                                 | `scope:shared`, `type:ui`, `platform:web`          |

Rules:

- `platform:web` may depend on `platform:web` and `platform:neutral` only —
  **the frontend cannot import a server library**.
- `platform:server` may depend on `platform:server` and `platform:neutral` only.
- `type:ui` may depend on `type:ui` only — **`libs/ui` imports none of the libraries
  above** (it stays a publishable, API-agnostic package).
- `scope:signflow` and `scope:belegscan` may depend on their own scope and `scope:shared`,
  never on each other.
- `type:contract` depends on nothing.

### To verify in the first task (not assumed)

- The backends start on **Nest 12** with `@nestjs/swagger` 12 (ESM). Task 1 checks that
  Prisma and class-validator / class-transformer work in that set-up, and that the
  generated document declares 3.1.0 and spells nullability the 3.1 way.
- Status of `httpResource` in Angular 22 (stable or still experimental). If experimental,
  it is still used for reads, behind the generated helpers, so a later API change touches
  generated code only.

#### Results (task 1a, 2026-11-21)

- **Nest 12 is ESM-only** (`"type": "module"` in `@nestjs/*` 12). `@nx/nest` 24.0.6 still
  requires `@nestjs/* <12`, so `signflow-api` is created with the `@nx/node` generator and
  Nest 12 (`common`, `core`, `platform-express`, `testing` ~12.5.1, `swagger` ~12.1.2) is
  installed by hand. The app compiles with `tsc` (`@nx/js:tsc`, `module: nodenext`) because
  Nest needs `emitDecoratorMetadata` and the `@nestjs/swagger` compiler plugin, which
  esbuild/oxc cannot run.
- **Tests compile with `tsc` too.** Vitest's default transform has the same gap, so a
  small Vite plugin (`apps/signflow-api/vite-plugin-tsc.mts`) compiles each file with the
  TypeScript compiler and the same plugin options as the build (read from `project.json`).
- **class-validator / class-transformer work** with Nest 12: global `ValidationPipe`;
  the plugin turns `@IsIn(['ok'])` (and the literal type `'ok'`) into `enum: ["ok"]`, JSDoc
  into `description` and `@example` into `example`.
- **The document declares `openapi: 3.1.0`** (`DocumentBuilder.setOpenAPIVersion`), and
  `nullable: true` is written the 3.1 way, `type: ["string", "null"]` — checked on a
  test-only DTO, `HealthDto` has no nullable field.
- **Prisma is not part of task 1.** The stable line is 7.10.1 (`latest` points at an
  8.0 release candidate); it is pinned and installed in task 5, together with Testcontainers.
- **`httpResource` is stable** in Angular 22 (`@publicApi 22.0`) and is used without caveats.

### Consequences

- Good: one place to change an endpoint; validation, types and docs cannot disagree.
- Good: the API diff is visible in every pull request; forgotten regeneration fails CI.
- Good: frontend tests and Storybook use data shaped by the real contract.
- Good: standard NestJS; nothing unusual to explain to a new team member.
- Bad: the API is designed in TypeScript decorators, not in a neutral document; schema
  precision depends on careful decorators (patterns, examples, error responses).
- Bad: a new endpoint needs a DTO and a controller stub before the frontend can generate
  its client (cheap, but an ordering constraint).
- Bad: generated client is not visible in the PR diff (only the spec is).
- Revisit when a second, non-TypeScript consumer or an external partner needs the API
  designed before code exists → contract-first.

## Pros and Cons of the Options

### REST + OpenAPI 3.1

- Good: resources map directly to the domain (envelopes, receipts); HTTP caching, status
  codes, file upload/download are native; best tooling; expected in German enterprise.
- Bad: several round trips for composite screens (acceptable at this scale).

### GraphQL

- Good: client chooses fields; one round trip for nested data.
- Bad: solves over-/under-fetching for many different clients — we have one client per API.
  File upload, HTTP caching and error handling (always 200) need extra conventions; adds a
  schema layer, resolvers and N+1 protection.

### gRPC / gRPC-Web

- Good: strict contracts, streaming, efficient binary format — for service-to-service calls.
- Bad: browsers need a proxy (gRPC-Web); not debuggable in the network tab; we have no
  service-to-service traffic.

### OData

- Good: standard query language for filter/sort/page; common in the Microsoft/SAP world.
- Bad: exposes a generic query surface over the data model — more attack surface and
  authorization work than a handful of explicit filters; weak NestJS/Angular tooling.

### Code-first (A)

- Good: one class = validation + type + schema; no second validation mechanism; matches
  `CLAUDE.md`; mainstream NestJS.
- Bad: spec quality depends on decorators; API design happens in code.

### Contract-first (B)

- Good: API designed and reviewed before code; language-neutral.
- Bad: the server must be kept in line with the YAML by a second mechanism (e.g.
  `express-openapi-validator` instead of class-validator, plus response checks in tests) —
  more moving parts for one developer and a change to `CLAUDE.md`.

### Orval (i)

- Good: actively maintained, widely used; Angular output with `HttpClient` services,
  `httpResource` helpers or both; MSW mock generation in the same tool; optional runtime
  validation.
- Bad: multi-framework tool, Angular is one target among several; configuration surface is
  large — we pin the version and keep `orval.config.ts` small.

### OpenAPI Generator `typescript-angular` (ii)

- Good: the oldest and best-known generator; many options.
- Bad: needs Java in CI and locally; output style predates standalone/signals; no mock
  generation.

### Hey API (iii)

- Good: modern architecture, plugin system, `httpResource` output.
- Bad: its Angular plugin is marked beta; no built-in MSW generation.

### ng-openapi-gen / ng-openapi (iv)

- Good: Angular-only, small, idiomatic.
- Bad: smaller communities (ng-openapi is a young single-maintainer project); mocks need a
  second tool.

### Hand-written services on generated types (v)

- Good: every line explainable; no generator lock-in.
- Bad: URLs, parameters and methods are typed by hand again — exactly the drift this ADR
  removes.

## Sources checked (2026-11-15)

- Orval Angular output modes: <https://cdn.jsdelivr.net/npm/@orval/angular@8.9.0/README.md>
- Orval mock (MSW) option: <https://orval.dev/reference/configuration/output>
- Hey API Angular plugin (beta): <https://heyapi.dev/docs/openapi/typescript/plugins/angular/v20>
- `@nestjs/swagger` 12 release notes: <https://newreleases.io/project/npm/@nestjs/swagger/release/12.0.0>
- `express-openapi-validator` (3.1, Express 5): <https://cdimascio.github.io/express-openapi-validator-documentation>

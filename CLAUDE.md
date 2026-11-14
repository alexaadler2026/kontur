# CLAUDE.md — portfolio monorepo

## Mission — three goals (all three are required; priority on conflict is below)
1. **PORTFOLIO.** This repo proves Senior Frontend / Angular Lead level for the
   German enterprise market. Architecture over feature count; an ADR for every
   decision; accessibility and i18n from day one; commit history that reads
   like a story.
2. **IT MUST WORK.** A working demo beats any beautiful architecture. A recruiter
   opens the link: if it does not load or a button does not respond, nothing else
   matters. Finish each feature to a working state before starting the next.
   Green CI is a merge condition, not a formality. Fix broken things before
   building new ones.
3. **THE OWNER MUST UNDERSTAND EVERYTHING.** Claude writes the code, but Alexander
   answers for it in interviews. Any line he cannot explain is a liability, not an
   asset. Explaining is part of the work, not an extra.

When goals conflict: understanding >= working >= portfolio polish. Prefer a
simpler solution that works and is understood over a clever one.

## Explain & Teach (non-negotiable)
- In chat, explain in **Russian, in plain words, like to a smart beginner**:
  before coding — the plan and why this approach; after — what changed and how
  to verify it by hand (exact commands + expected output). Define every term
  (signal, DI, interceptor, …) in one phrase on first use.
- After EVERY completed task, write a journal entry `docs/journal/NNN-<slug>.md`
  following `docs/journal/TEMPLATE.md`:
  - **RU — full explanation** (what, why, how, real-life analogy, alternatives,
    what can break, one interview question + answer);
  - **EN — full** (same structure; repo and interview language);
  - **DE — short summary** (5–10 sentences, B1 level) + **Fachwortschatz** table
    (Deutsch | English | Русский) with the task's key terms.
- A task without a journal entry is NOT done — same severity as a failing test.
- Keep a table of contents in `docs/journal/README.md`.
- Journal explains; `docs/adr/` (English, MADR format) still records decisions.
- When Alexander says "объясни проще" — rewrite simpler, without complaining.

## Design source of truth
- Design system "Kontur" and the SignFlow/Belegscan mockups are the reference.
  Local copies live in `docs/design/` (tokens.json, component specs, API
  contracts, screen PNGs). Do not invent colors, spacing or component behavior —
  take them from the tokens and specs. CSS custom properties map 1:1 to Kontur
  tokens; `k-*` classes map 1:1 to libs/ui components.

## Context
Nx monorepo. Apps: apps/signflow (+ apps/signflow-api), apps/belegscan
(+ apps/belegscan-api), apps/ui-storybook.
Libs: libs/ui (component library, published to npm), libs/receipt-parser,
libs/shared/*.
Decisions live in docs/adr/. Read the relevant ADR before changing architecture.
Plans for larger tasks live in docs/plans/. Domain terms in docs/glossary.md.

## Workflow
- Always propose a plan first for anything touching more than 2 files; wait for approval.
- Small steps: one task = one PR, ideally under 400 changed lines.
- Write or update a failing test first, then implement.
- After changes run: nx affected -t lint test build. Report results honestly.
- Run e2e locally with CI=true so Playwright starts its own fresh server; never reuse the owner's running dev server.
- Never modify or delete a test just to make it pass. If a test seems wrong, stop and explain.
- Never run git push, never commit .env or secrets.
- Use conventional commits (feat:, fix:, refactor:, test:, docs:, chore:).

## Angular rules
- Latest stable Angular. Standalone components only, no NgModules.
- Signals for state: signal(), computed(), input(), output(), model(). linkedSignal/resource where they fit.
- New control flow (@if, @for with track, @switch). No *ngIf/*ngFor.
- ChangeDetectionStrategy.OnPush everywhere. inject() instead of constructor DI.
- Typed reactive forms. No `any`; strict TypeScript.
- RxJS only for streams/events (HTTP, websockets, debounce); convert to signals at the edge.
- State: NgRx SignalStore per feature. No global god-store.
- Feature folder structure: feature / data-access / ui / util; respect Nx module boundaries.

## UI and quality
- Reuse libs/ui before creating new components. New generic component -> libs/ui.
- Accessibility: WCAG 2.1 AA (BITV 2.0). Keyboard support, focus management, ARIA, visible focus. axe must pass.
- All user-facing text through i18n. UI languages: **de (default), en, ru** — the user
  switches language at runtime. No hard-coded strings. Plurals and formats via ICU /
  Intl (Russian has 3 plural forms). Dates, numbers, currency formatted per active
  locale. The i18n approach (library, runtime switching) is decided in its own ADR.
- Styling via design tokens (CSS custom properties). No hard-coded colors.

## Testing
- Unit/component: Vitest or Jest + Angular Testing Library (test behaviour, not internals).
- E2E: Playwright for main user journeys.
- Backend: NestJS unit tests + integration tests against Testcontainers Postgres.

## Backend
- NestJS, Prisma, PostgreSQL. DTO validation with class-validator. OpenAPI generated.
- Shared types between front and back via libs/shared/api-types.

## When unsure
Ask. Do not invent requirements, endpoints or business rules.

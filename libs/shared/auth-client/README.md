# @adlersoft/auth-client

Browser side of the session (ADR-0010), shared by SignFlow and Belegscan: `SessionStore`
(NgRx SignalStore), `authGuard` / `guestGuard`, the 401 interceptor and `safeReturnUrl`.
It knows no app: the app gives it a `SessionApi` adapter over its generated client
(`provideAuthClient`). Plan: `docs/plans/044-sign-in.md` (8-2).

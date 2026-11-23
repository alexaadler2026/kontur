# 0010. Authentication: own accounts, server-side sessions in an httpOnly cookie, invitation only

- Status: Accepted
- Date: 2026-11-15

## Context and Problem Statement

v1 uses its own accounts (`business-processes.md` §0): registration only by invitation,
separate accounts for SignFlow and Belegscan, production users in Kyrgyzstan. The apps are
SPAs served from the same origin as their API (ADR-0009). We need to decide how a user
proves who they are, how the browser stays signed in, how passwords are stored and
recovered, whether 2FA is in v1, and where the border to a future external identity
provider lies.

Access for people **without** an account (signers, reviewers: link + one-time code) is a
separate decision in wave 2.

## Decision Drivers

- A stolen database must not reveal passwords.
- XSS must not be able to steal the login; a session must be revocable immediately.
- Scale: tens of users, one API instance, no Redis.
- Every part explainable; no home-made cryptography.
- A later move to Keycloak / OIDC must not require rewriting the SPA.

## Considered Options

Session mechanism:

1. **Server-side session, opaque id in an httpOnly cookie**
2. JWT access + refresh tokens stored in the browser (`localStorage` / memory)
3. JWT inside an httpOnly cookie (stateless session)

Password hashing: **Argon2id** / bcrypt / scrypt.

Second factor in v1: **no (prepared)** / TOTP for everyone / TOTP for admins.

## Decision Outcome

### Sessions (option 1)

- On login the server creates a random 256-bit session id, stores **its SHA-256 hash** in
  the `sessions` table (user, created, last seen, expiry, user agent, IP) and sends the id
  in a cookie:
  `__Host-sid=<id>; HttpOnly; Secure; SameSite=Lax; Path=/` — no `Domain` attribute, so it
  belongs to exactly one host (`sign.<domain>` ≠ `beleg.<domain>`).
- Lifetime (defaults, configurable): idle timeout 7 days (sliding), absolute 30 days.
- A new session id is issued at login (no session fixation). Logout deletes the row.
  Changing or resetting the password deletes **all** sessions of the user.
- **CSRF:** the API is same-origin only. For every state-changing method the server checks
  `Origin` / `Sec-Fetch-Site` and rejects cross-site requests; `SameSite=Lax` is the
  second layer. The API accepts JSON and multipart only.
- The SPA never sees a token. It learns who is signed in from
  (illustrative) `GET /api/v1/session`; a 401 anywhere sends the user to the login screen.

### Passwords

- **Argon2id** with at least the OWASP baseline parameters (19 MiB memory, 2 iterations,
  1 lane), stored as a PHC string (algorithm, parameters and salt inside the hash), so
  parameters can be raised later and old hashes are upgraded at the next login.
- **Parameters (task 7a, 2026-11-23): 46 MiB, 2 passes, 1 lane**, target 200–500 ms per
  hash. Measured on the owner's laptop (i7-8565U): OWASP baseline 121 ms (below target),
  19 MiB/t=4 193 ms, 32 MiB/t=3 268 ms, **46 MiB/t=2 274–327 ms**, 64 MiB/t=2 396 ms
  (medians). More memory was preferred over more passes: memory is what makes guessing on
  GPUs expensive. CI reports its own time as an annotation ("Argon2id timing" step,
  journal 037).
- **Implementation (amended 2026-11-23, task 7a): Node's built-in `crypto.argon2`**,
  behind the `PasswordHasher` interface in `libs/shared/auth-server`. Checked: added in
  Node 24.7.0, no "experimental" marker in the Node 24.22.3 documentation (the `crypto`
  module is "Stability: 2 - Stable"), no `ExperimentalWarning` at run time on 24.11.0. It
  returns raw bytes; the PHC string is built and parsed by our code (~40 lines, tested).
  No native add-on and no install script. Fallback if a pinned Node marks it experimental:
  `@node-rs/argon2` (prebuilt binaries, no install script). The `argon2` package is not
  used: it needs an install script, and install scripts stay forbidden (owner).
- Passwords are normalised to **Unicode NFC** before hashing and checking: "ü" typed as
  U+00FC or as u + U+0308 is the same password.
- **Policy (amended 2026-11-23): minimum 15 characters**, maximum 128, counted as
  characters (code points after NFC), no composition rules. Why 15 and not 12: NIST SP
  800-63B rev. 4 requires 15 for a password used as the only factor, and v1 has no 2FA.
- **Rejected passwords:** (1) on a bundled list of common passwords — SecLists (MIT)
  `xato-net-10-million-passwords-1000000`, `Pwdb_top-1000000` and
  `100k-most-used-passwords-NCSC`, only entries of 15–128 characters (shorter ones fail the
  length rule anyway; the usual 10k list has a single such entry), NFC lower case, about
  16,000 entries, compared ignoring case; (2) containing the user's e-mail address or its
  part before `@` (when that part has at least 3 characters); (3) containing a product
  name (`signflow`, `belegscan`, `kontur`) — NIST "context-specific words".
- Checking passwords against a breach database (Have I Been Pwned, k-anonymity) is an
  idea for v2: it is an external service.
- Login errors are generic ("e-mail or password wrong").
- **Throttling** (counters in Postgres) is designed so that an attacker cannot lock the
  owner out of their own account:
  - failures are counted per **(account, IP) pair**: after 5 failures that pair is
    delayed, growing up to a 15-minute lock. The owner, coming from another IP, is not
    affected;
  - failures are counted separately per **IP** across all accounts (password spraying):
    the IP is slowed down and then blocked for a time;
  - a lock of the **whole account** happens only when failures arrive from many IPs
    (distributed guessing), and only together with an **e-mail to the owner** saying what
    happened and offering a password-reset link, which also lifts the lock.
- A general per-IP rate limit (in memory, one instance) protects all auth endpoints.
- **Response while throttled:** HTTP **429** with Problem Details code
  **`auth.throttled`** (ADR-0008; one translation key `errors.auth.throttled`, no separate title, so
  the rule `errors.<code>` has no exception) and the standard **`Retry-After`** header in seconds. The
  frontend shows the waiting time in minutes, **rounded up** (`Math.ceil(seconds / 60)`),
  through the ICU plural `{minutes}`. The response does not say which counter (pair, IP,
  account) was hit.

### Invitation, first admin, recovery

- **Invitation:** an authorised user (ADR-0011) enters an e-mail; the server stores the
  hash of a random token (valid 7 days) and sends a link. **Opening the link (GET) changes
  nothing** — mail scanners may open it. The token is consumed only by the POST that sets
  the password. Accepting an invitation proves ownership of the e-mail address.
- **First admin:** created by a command run on the server; it prints a one-time set-up
  link. There is no default password.
- **Recovery:** "forgot password" always answers the same way (no account enumeration) and
  mails a link (token hash stored, valid 1 hour, consumed on POST). Success ends all
  sessions.
- **Changing the e-mail** requires confirming the new address by link, because SignFlow's
  inbox matches documents to accounts by verified e-mail.

### Second factor

- **Not in v1.** With tens of invited users, 2FA adds enrolment, recovery codes and a
  lost-device process — roughly doubling the authentication surface. v1 relies on Argon2id,
  throttling, revocable sessions and invitation-only access.
- **Prepared:** login is a two-step flow on the server (credentials verified → session
  issued), so a TOTP or passkey step can be inserted between the two without changing the
  session model. First candidate for v2: mandatory TOTP for administrators.

### Two apps, one implementation

- Each API has its own `users` and `sessions` tables in its own database. Nothing is
  shared at runtime.
- The code is shared: `libs/shared/auth-server` (hashing, sessions, tokens, guards,
  throttling) and `libs/shared/auth-client` (session store, guard, 401 handling).
- Users may carry an `expiresAt` (used by the demo sandbox, decided in wave 2).

### Border to a future identity provider (Keycloak / OIDC)

- The application code depends on two things only: the session cookie and a
  `CurrentUser { id, roles }` object produced by a guard.
- A future ADR can replace _how the session is created_: the API becomes an OIDC client
  (Authorization Code flow with PKCE), validates the provider's tokens **on the server**
  and still issues the same session cookie ("backend for frontend"). The SPA and all
  business endpoints stay unchanged; password, invitation and recovery code is removed;
  `users` gains the provider's subject id.

### Consequences

- Good: the login cannot be read by JavaScript; logout and "sign out everywhere" take
  effect at once.
- Good: no token refresh logic in the SPA; no CORS.
- Good: database leak reveals neither passwords nor usable session ids (only hashes).
- Bad: one database lookup per request (negligible here).
- Bad: no 2FA in v1 — a phished password gives access until the session is revoked.
- Bad: two user bases to operate (by product decision).

## Pros and Cons of the Options

### Server-side session in an httpOnly cookie

- Good: revocable, invisible to scripts, tiny client code; well understood.
- Bad: needs CSRF protection and server state.

### JWT in `localStorage` or memory

- Good: stateless API; natural for third-party APIs and mobile clients.
- Bad: any XSS can copy the token; revocation needs a deny-list (server state again);
  refresh-token rotation logic in the SPA. No benefit for a same-origin SPA.

### JWT in an httpOnly cookie

- Good: no session table.
- Bad: cannot be revoked before expiry without server state; still needs CSRF protection;
  token size in every request.

### bcrypt / scrypt

- bcrypt: proven, but not memory-hard and truncates at 72 bytes. scrypt: memory-hard and
  built into Node, but Argon2id is the current first recommendation (OWASP, winner of the
  Password Hashing Competition).

### TOTP for everyone / for admins in v1

- Good: strong protection against stolen passwords.
- Bad: enrolment, recovery codes and support cases before the product has users; moved to
  v2 deliberately, with the insertion point prepared.

## Sources checked (2026-11-15)

- Node.js `crypto.argon2`: <https://nodejs.org/api/crypto.html>
- OWASP Password Storage Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>

# 0018. Keeping screens up to date: conditional polling in v1, with a written trigger for Server-Sent Events

- Status: Accepted
- Date: 2026-11-16

## Context and Problem Statement

Some screens show state that other people change: a signer signs, and the sender's
detail page and dashboard should show "2/3" without a manual reload. In Belegscan a
colleague confirms a receipt. The question was: Server-Sent Events, WebSocket, an
AsyncAPI contract — or none of them?

The owner agreed (stage 1) that v1 uses polling and asked for the condition under which
we switch to SSE.

## Decision Drivers

- Tens of users; state changes are minutes apart, not milliseconds.
- No new infrastructure or protocol in v1.
- Polling must be cheap for the server and invisible for the user.
- The switch to push must be a local change, not a rewrite.

## Considered Options

1. **Conditional polling (ETag) on the few screens that need it**
2. Server-Sent Events (SSE)
3. WebSocket
4. No refresh (manual reload only)

## Decision Outcome

Chosen option: **1**.

### How

- Only screens whose data other people change poll: SignFlow dashboard, document list and
  document detail; Belegscan review queue and receipt list. Forms and editors do not.
- Interval: **30 seconds** while the tab is visible. Polling **stops when the tab is
  hidden** (Page Visibility API) and refreshes once immediately when it becomes visible
  again or the network returns.
- **Conditional requests:** the server sends an `ETag` (a short fingerprint of the
  response's state). The client repeats it in `If-None-Match`; if nothing changed the
  server answers **304 Not Modified** with no body. An unchanged poll costs one indexed
  query and a few hundred bytes.
- Errors back off (30 s → 60 s → 120 s, capped), so a struggling server is not hammered.
- After the user's own action (sign, remind, void) the client reloads at once; it does
  not wait for the next tick.
- Implementation: one small helper around the generated `httpResource` reads
  (ADR-0007) — a timer, the visibility check and `reload()`. Components do not know
  whether data arrives by polling or push.
- Belegscan's offline synchronisation is a different mechanism (wave 3) and not covered
  here.

### When we switch to SSE

Any one of these is the trigger for a new ADR:

1. A feature needs updates the user perceives as immediate (under ~5 seconds): several
   people working on one document at the same time, live progress of a long server job,
   a notification bell that must not lag.
2. Polling becomes a visible load: more than ~200 clients open at the same time, or
   polling is more than about a third of all API requests (measured from the logs,
   ADR-0020).
3. Mobile users report battery or data cost from polling.

Then: **SSE**, not WebSocket — the data flows one way (server → browser), SSE is plain
HTTP, works with our session cookie and reverse proxy, and the browser's `EventSource`
reconnects by itself. The event stream would carry only "resource X changed"; the client
still fetches through the REST API. The event names get an **AsyncAPI** document at that
point; writing one before events exist would describe nothing.

WebSocket only if the browser must send a continuous stream to the server (e.g. live
co-editing) — nothing in v1 or v2 plans does.

### Consequences

- Good: no new protocol, server component or failure mode in v1.
- Good: works through every proxy and corporate network.
- Good: one helper to replace when push arrives.
- Bad: a change by someone else appears up to 30 seconds late.
- Bad: every open tab produces a request every 30 seconds (cheap, but not zero).
- Bad: ETag computation must be correct — a stale ETag would hide changes; covered by
  tests ("change → different ETag").

## Pros and Cons of the Options

### Conditional polling

- Good: simplest; stateless server; cache-friendly.
- Bad: latency up to the interval; wasted requests when nothing changes.

### Server-Sent Events

- Good: immediate; one-way stream over HTTP; automatic reconnect.
- Bad: one open connection per tab; the server must know which client is interested in
  which resource and publish changes from every write path — real work that v1 does not
  need.

### WebSocket

- Good: bidirectional and immediate.
- Bad: its own protocol (authentication, reconnect, heartbeats are ours to build);
  bidirectionality is unused here.

### No refresh

- Good: nothing to build.
- Bad: the dashboard lies until the user reloads; the mockups show live counters.

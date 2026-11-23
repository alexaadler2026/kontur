/**
 * Sign-in throttling rules (ADR-0010). Pure functions: the API stores the failures (in
 * PostgreSQL) and asks these how long a client must wait. Numbers come from settings;
 * defaults by the owner (2026-11-23).
 */

const MINUTE_S = 60;

/** The (account, IP) pair: free failures before the delay starts, and the longest lock. */
export interface PairPolicy {
  freeFailures: number;
  maxLockMinutes: number;
}

/** One IP across all accounts (password spraying): failures allowed per sliding window. */
export interface IpPolicy {
  maxFailures: number;
  windowMinutes: number;
}

/**
 * Lock of a pair after `failures` failures, in seconds: 0 below `freeFailures`, then
 * 1, 2, 4, 8 … minutes (doubling with each further failure), at most `maxLockMinutes`.
 * Doubling makes guessing slow quickly while a person who mistyped five times waits only
 * a minute.
 */
export function pairLockSeconds(failures: number, policy: PairPolicy): number {
  if (failures < policy.freeFailures) return 0;
  const minutes = Math.min(
    2 ** (failures - policy.freeFailures),
    policy.maxLockMinutes,
  );
  return minutes * MINUTE_S;
}

/** Seconds a pair must still wait: its lock counts from its last failure. */
export function pairRetryAfterSeconds(
  pair: { failures: number; lastFailureAt: Date | undefined },
  now: Date,
  policy: PairPolicy,
): number {
  if (!pair.lastFailureAt) return 0;
  const lockedUntil =
    pair.lastFailureAt.getTime() +
    pairLockSeconds(pair.failures, policy) * 1000;
  return secondsUntil(lockedUntil, now);
}

/**
 * Seconds an IP must still wait. `nthNewestFailureAt` is the time of its
 * `maxFailures`-th most recent failure (undefined when it has fewer): while that one is
 * inside the window, the IP has reached the limit — until it leaves the window.
 */
export function ipRetryAfterSeconds(
  nthNewestFailureAt: Date | undefined,
  now: Date,
  policy: IpPolicy,
): number {
  if (!nthNewestFailureAt) return 0;
  return secondsUntil(
    nthNewestFailureAt.getTime() + policy.windowMinutes * MINUTE_S * 1000,
    now,
  );
}

function secondsUntil(time: number, now: Date): number {
  return Math.max(0, Math.ceil((time - now.getTime()) / 1000));
}

/**
 * At most `limit` requests per key (an IP) per minute, counted in memory — enough for one
 * API instance (ADR-0010, ADR-0014). Fixed one-minute windows: simple and cheap; a burst at
 * a window edge can reach 2 × limit, which is fine for a coarse first line of defence.
 */
export class RequestRateLimiter {
  private readonly windows = new Map<
    string,
    { start: number; count: number }
  >();
  private lastSweep: number;

  constructor(
    private readonly limit: number,
    private readonly clock: () => number = Date.now,
  ) {
    this.lastSweep = clock();
  }

  /** Counts one request; returns 0 if it may pass, else the seconds until it may retry. */
  hit(key: string): number {
    const now = this.clock();
    this.sweep(now);
    let window = this.windows.get(key);
    if (!window || now - window.start >= 60_000) {
      window = { start: now, count: 0 };
      this.windows.set(key, window);
    }
    window.count++;
    if (window.count <= this.limit) return 0;
    return Math.max(1, Math.ceil((window.start + 60_000 - now) / 1000));
  }

  /** Number of keys held in memory (for tests). */
  get size(): number {
    return this.windows.size;
  }

  /** At most once a minute: drop the windows that are over. */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, window] of this.windows) {
      if (now - window.start >= 60_000) this.windows.delete(key);
    }
  }
}

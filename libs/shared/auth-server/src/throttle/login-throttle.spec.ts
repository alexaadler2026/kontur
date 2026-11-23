import { describe, expect, it } from 'vitest';
import {
  ipRetryAfterSeconds,
  pairLockSeconds,
  pairRetryAfterSeconds,
  RequestRateLimiter,
} from './login-throttle.js';

// ADR-0010, numbers by the owner (2026-11-23): pair "account + IP" — after 5 failures a
// growing delay, at most 15 minutes; one IP across all accounts — 50 failures in 15 minutes;
// all auth endpoints — 20 requests per minute per IP, in memory.

const PAIR = { freeFailures: 5, maxLockMinutes: 15 };
const now = new Date('2026-11-23T12:00:00Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe('pairLockSeconds: the growing delay of one (account, IP) pair', () => {
  it('the first 5 failures cost nothing (typos happen)', () => {
    for (const failures of [0, 1, 4]) {
      expect(pairLockSeconds(failures, PAIR)).toBe(0);
    }
  });

  it('from the 5th failure on: 1, 2, 4, 8 minutes, then capped at 15', () => {
    expect(
      [5, 6, 7, 8, 9, 10, 50].map((n) => pairLockSeconds(n, PAIR)),
    ).toEqual([60, 120, 240, 480, 900, 900, 900]);
  });

  it('the numbers come from the settings', () => {
    expect(pairLockSeconds(3, { freeFailures: 3, maxLockMinutes: 2 })).toBe(60);
    expect(pairLockSeconds(9, { freeFailures: 3, maxLockMinutes: 2 })).toBe(
      120,
    );
  });
});

describe('pairRetryAfterSeconds: the lock counts from the last failure', () => {
  it('5 failures, the last 20 s ago → wait 40 more seconds', () => {
    expect(
      pairRetryAfterSeconds({ failures: 5, lastFailureAt: ago(20) }, now, PAIR),
    ).toBe(40);
  });

  it('5 failures, the last 61 s ago → free again', () => {
    expect(
      pairRetryAfterSeconds({ failures: 5, lastFailureAt: ago(61) }, now, PAIR),
    ).toBe(0);
  });

  it('no failures → 0', () => {
    expect(
      pairRetryAfterSeconds(
        { failures: 0, lastFailureAt: undefined },
        now,
        PAIR,
      ),
    ).toBe(0);
  });
});

describe('ipRetryAfterSeconds: 50 failures in a sliding 15-minute window', () => {
  const IP = { maxFailures: 50, windowMinutes: 15 };

  it('the 50th most recent failure is inside the window → wait until it leaves it', () => {
    // 50th newest failure 10 minutes ago: it leaves the 15-minute window in 5 minutes.
    expect(ipRetryAfterSeconds(ago(600), now, IP)).toBe(300);
  });

  it('the 50th most recent failure is older than the window (or there is none) → 0', () => {
    expect(ipRetryAfterSeconds(ago(15 * 60), now, IP)).toBe(0);
    expect(ipRetryAfterSeconds(undefined, now, IP)).toBe(0);
  });
});

describe('RequestRateLimiter: N requests per minute per key, in memory', () => {
  it('20 requests pass, the 21st in the same minute waits until the minute is over', () => {
    let time = now.getTime();
    const limiter = new RequestRateLimiter(20, () => time);

    for (let i = 0; i < 20; i++) {
      expect(limiter.hit('203.0.113.7')).toBe(0);
    }
    time += 15_000;
    expect(limiter.hit('203.0.113.7')).toBe(45);
  });

  it('another IP has its own counter', () => {
    const limiter = new RequestRateLimiter(1, () => now.getTime());

    expect(limiter.hit('203.0.113.7')).toBe(0);
    expect(limiter.hit('203.0.113.7')).toBeGreaterThan(0);
    expect(limiter.hit('198.51.100.1')).toBe(0);
  });

  it('a new minute starts a new count', () => {
    let time = now.getTime();
    const limiter = new RequestRateLimiter(1, () => time);

    limiter.hit('203.0.113.7');
    time += 60_000;
    expect(limiter.hit('203.0.113.7')).toBe(0);
  });

  it('forgets keys whose minute is over (memory does not grow with every IP ever seen)', () => {
    let time = now.getTime();
    const limiter = new RequestRateLimiter(5, () => time);

    for (let i = 0; i < 1000; i++) limiter.hit(`10.0.${i >> 8}.${i & 255}`);
    expect(limiter.size).toBe(1000);
    time += 61_000;
    limiter.hit('203.0.113.7');
    expect(limiter.size).toBe(1);
  });
});

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createSessionToken,
  hashSessionToken,
  isSessionActive,
  readSessionCookie,
  SESSION_COOKIE,
} from './session.js';

const DAY = 24 * 60 * 60 * 1000;

describe('session token (ADR-0010)', () => {
  it('is 256 random bits as 43 Base64url characters, different every time', () => {
    const a = createSessionToken();
    const b = createSessionToken();

    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(a.token, 'base64url')).toHaveLength(32);
    expect(a.token).not.toBe(b.token);
  });

  it('the database gets only the SHA-256 of the token, never the token', () => {
    const { token, tokenHash } = createSessionToken();

    expect(tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(hashSessionToken(token)).toBe(tokenHash);
    expect(tokenHash).not.toContain(token);
  });
});

describe('readSessionCookie', () => {
  const token = createSessionToken().token;

  it('is the __Host- cookie: bound to one host, Secure, Path=/ (no Domain)', () => {
    expect(SESSION_COOKIE).toBe('__Host-sid');
  });

  it('finds the session cookie among others', () => {
    expect(readSessionCookie(`theme=dark; __Host-sid=${token}; lang=de`)).toBe(
      token,
    );
  });

  it('no cookie header, or no session cookie → undefined', () => {
    expect(readSessionCookie(undefined)).toBeUndefined();
    expect(readSessionCookie('theme=dark')).toBeUndefined();
  });

  it('ignores a cookie whose name only ends with the name', () => {
    expect(readSessionCookie(`x__Host-sid=${token}`)).toBeUndefined();
  });

  it('ignores a value that cannot be a token (no database lookup for junk)', () => {
    expect(readSessionCookie('__Host-sid=short')).toBeUndefined();
    expect(readSessionCookie(`__Host-sid=${token}%00`)).toBeUndefined();
  });
});

describe('isSessionActive: 7 days without activity, at most 30 days', () => {
  const now = new Date('2026-11-23T12:00:00Z');
  const idleMs = 7 * DAY;
  const at = (ms: number) => new Date(now.getTime() + ms);

  it('active: seen a day ago, absolute end in the future', () => {
    expect(
      isSessionActive(
        { lastSeenAt: at(-DAY), expiresAt: at(DAY) },
        now,
        idleMs,
      ),
    ).toBe(true);
  });

  it('ended: not seen for 7 days', () => {
    expect(
      isSessionActive(
        { lastSeenAt: at(-idleMs), expiresAt: at(DAY) },
        now,
        idleMs,
      ),
    ).toBe(false);
  });

  it('ended: the absolute end has passed, even if seen just now', () => {
    expect(
      isSessionActive({ lastSeenAt: now, expiresAt: now }, now, idleMs),
    ).toBe(false);
  });
});

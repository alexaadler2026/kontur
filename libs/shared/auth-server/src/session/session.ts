import { createHash, randomBytes } from 'node:crypto';

/**
 * Server-side sessions (ADR-0010). The browser holds a random token in an httpOnly cookie;
 * the database holds only the SHA-256 of that token, so a leaked database gives no usable
 * session. The `__Host-` prefix makes the browser accept the cookie only with Secure,
 * Path=/ and no Domain: it belongs to exactly one host.
 */
export const SESSION_COOKIE = '__Host-sid';

const TOKEN_BYTES = 32; // 256 bits
const TOKEN = /^[A-Za-z0-9_-]{43}$/; // 32 bytes as Base64url without padding

/** SHA-256 of a session token, hex: the only form in which a token is stored. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A new session token (for the cookie) and its hash (for the database). */
export function createSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashSessionToken(token) };
}

/**
 * The session token from a `Cookie` request header, or undefined. A value that cannot be a
 * token is ignored, so junk never reaches the database.
 */
export function readSessionCookie(
  header: string | undefined,
): string | undefined {
  for (const pair of header?.split(';') ?? []) {
    const separator = pair.indexOf('=');
    if (pair.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    const value = pair.slice(separator + 1).trim();
    return TOKEN.test(value) ? value : undefined;
  }
  return undefined;
}

/**
 * A session is active while it was used within the idle time (sliding, default 7 days) and
 * its absolute end (default 30 days after login) has not come.
 */
export function isSessionActive(
  session: { lastSeenAt: Date; expiresAt: Date },
  now: Date,
  idleMs: number,
): boolean {
  return (
    now.getTime() < session.expiresAt.getTime() &&
    now.getTime() - session.lastSeenAt.getTime() < idleMs
  );
}

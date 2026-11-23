import {
  Argon2idPasswordHasher,
  hashSessionToken,
  SESSION_COOKIE,
} from '@adlersoft/auth-server';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../database/testing/test-database.js';
import { startApiOn } from '../testing/api-on-database.js';

// ADR-0010: POST /session signs in (cookie), GET /session says who is signed in,
// DELETE /session signs out. Owner's decision 2026-11-23 (one resource "session").

const PASSWORD = 'Grüne Berge über Bischkek';
const DAY = 24 * 60 * 60 * 1000;
const hasher = new Argon2idPasswordHasher();

/** The token from a Set-Cookie header (supertest never sends Secure cookies over http). */
function sessionToken(response: request.Response): string {
  const header = ([] as string[])
    .concat(response.headers['set-cookie'] ?? [])
    .find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
  if (!header) throw new Error('no session cookie in the response');
  return header.slice(SESSION_COOKIE.length + 1).split(';')[0];
}

describe('sessions on a real PostgreSQL (ADR-0010)', () => {
  let db: TestDatabase;
  let app: INestApplication;
  let prisma: PrismaService['client'];
  let userId: string;

  const http = () => request(app.getHttpServer());
  const signIn = (email: string, password: string) =>
    http().post('/api/v1/session').send({ email, password });
  const withCookie = (token: string) => `${SESSION_COOKIE}=${token}`;

  beforeAll(async () => {
    db = await startTestDatabase();
    ({ app } = await startApiOn(db.url));
    prisma = app.get(PrismaService).client;
  });

  afterAll(async () => {
    await app?.close();
    await db?.container.stop();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    const user = await prisma.user.create({
      data: {
        email: 'Aigul.Sadykova@Firma.kg',
        passwordHash: await hasher.hash(PASSWORD),
      },
    });
    userId = user.id;
  });

  it('right e-mail and password → 204 and the __Host- cookie with all its attributes', async () => {
    const response = await signIn('Aigul.Sadykova@Firma.kg', PASSWORD).expect(
      204,
    );

    const cookie = ([] as string[]).concat(response.headers['set-cookie'])[0];
    const attributes = cookie.split(';').map((part) => part.trim());
    expect(attributes[0]).toMatch(/^__Host-sid=[A-Za-z0-9_-]{43}$/);
    expect(attributes).toEqual(
      expect.arrayContaining([
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        `Max-Age=${30 * 24 * 60 * 60}`,
      ]),
    );
    expect(cookie).not.toMatch(/Domain=/i);
  });

  it('stores only the SHA-256 of the token, with user, times, user agent and IP', async () => {
    const token = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD)
        .set('User-Agent', 'Vitest/1.0')
        .expect(204),
    );

    const [session] = await prisma.session.findMany();
    expect(session.tokenHash).toBe(hashSessionToken(token));
    expect(JSON.stringify(session)).not.toContain(token);
    expect(session.userId).toBe(userId);
    expect(session.userAgent).toBe('Vitest/1.0');
    expect(session.ip).toMatch(/127\.0\.0\.1|::1/);
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(
      30 * DAY,
    );
  });

  it('the e-mail is found whatever its case', async () => {
    await signIn('aigul.sadykova@firma.kg', PASSWORD).expect(204);
  });

  it('GET /session with the cookie → 200 with id and e-mail', async () => {
    const token = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD),
    );

    const response = await http()
      .get('/api/v1/session')
      .set('Cookie', withCookie(token))
      .expect(200);

    expect(response.body).toEqual({
      user: { id: userId, email: 'Aigul.Sadykova@Firma.kg' },
    });
  });

  it('GET /session without a cookie or with an unknown token → 401 auth.unauthenticated', async () => {
    for (const cookie of [undefined, withCookie('A'.repeat(43))]) {
      const call = http().get('/api/v1/session');
      if (cookie) call.set('Cookie', cookie);
      const response = await call.expect(401);
      expect(response.body.code).toBe('auth.unauthenticated');
    }
  });

  it('wrong password, unknown e-mail, user without password: the same 401, no cookie', async () => {
    await prisma.user.create({ data: { email: 'invited@firma.kg' } });

    const answers = await Promise.all([
      signIn('Aigul.Sadykova@Firma.kg', 'Grüne Berge über Bischkek!'),
      signIn('nobody@firma.kg', PASSWORD),
      signIn('invited@firma.kg', PASSWORD),
    ]);

    for (const response of answers) {
      expect(response.status).toBe(401);
      expect(response.body.code).toBe('auth.invalid_credentials');
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    // The body does not say which of the two was wrong. Only traceId differs: it is unique
    // per request by design (ADR-0008).
    const sameAsFirst = { ...answers[0].body, traceId: expect.any(String) };
    expect(answers[1].body).toEqual(sameAsFirst);
    expect(answers[2].body).toEqual(sameAsFirst);
  });

  it('every sign-in gets a new token (no session fixation); both devices stay signed in', async () => {
    const first = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD),
    );
    const second = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD),
    );

    expect(second).not.toBe(first);
    for (const token of [first, second]) {
      await http()
        .get('/api/v1/session')
        .set('Cookie', withCookie(token))
        .expect(200);
    }
  });

  it('DELETE /session → 204, cookie cleared, row deleted, the old cookie no longer works', async () => {
    const token = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD),
    );

    const response = await http()
      .delete('/api/v1/session')
      .set('Cookie', withCookie(token))
      .expect(204);

    const cleared = ([] as string[]).concat(response.headers['set-cookie'])[0];
    expect(cleared).toMatch(/^__Host-sid=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(await prisma.session.count()).toBe(0);
    await http()
      .get('/api/v1/session')
      .set('Cookie', withCookie(token))
      .expect(401);
  });

  it('DELETE /session without a session is fine too (204): signing out twice is not an error', async () => {
    await http().delete('/api/v1/session').expect(204);
  });

  it('activity keeps the session alive (sliding): GET moves "last seen" forward', async () => {
    const token = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD),
    );
    await prisma.session.updateMany({
      data: { lastSeenAt: new Date(Date.now() - 6 * DAY) },
    });

    await http()
      .get('/api/v1/session')
      .set('Cookie', withCookie(token))
      .expect(200);

    const [session] = await prisma.session.findMany();
    expect(Date.now() - session.lastSeenAt.getTime()).toBeLessThan(60_000);
  });

  it('7 days without activity → 401, and the row is gone', async () => {
    const token = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD),
    );
    await prisma.session.updateMany({
      data: { lastSeenAt: new Date(Date.now() - 7 * DAY - 1000) },
    });

    await http()
      .get('/api/v1/session')
      .set('Cookie', withCookie(token))
      .expect(401);
    expect(await prisma.session.count()).toBe(0);
  });

  it('30 days after sign-in → 401, even when used every day', async () => {
    const token = sessionToken(
      await signIn('Aigul.Sadykova@Firma.kg', PASSWORD),
    );
    await prisma.session.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await http()
      .get('/api/v1/session')
      .set('Cookie', withCookie(token))
      .expect(401);
  });

  it('a hash made with older parameters is replaced at sign-in (needsRehash)', async () => {
    const weak = new Argon2idPasswordHasher({
      memoryKiB: 19 * 1024,
      passes: 2,
      parallelism: 1,
    });
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await weak.hash(PASSWORD) },
    });

    await signIn('Aigul.Sadykova@Firma.kg', PASSWORD).expect(204);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(hasher.needsRehash(user.passwordHash ?? '')).toBe(false);
    expect(await hasher.verify(user.passwordHash ?? '', PASSWORD)).toBe(true);
  });
});

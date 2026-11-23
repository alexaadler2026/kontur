import { randomBytes } from 'node:crypto';
import {
  createSessionToken,
  hashSessionToken,
  isSessionActive,
  type PasswordHasher,
} from '@adlersoft/auth-server';
import { ProblemException } from '@adlersoft/api-kit';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../config/app-config.token.js';
import type { AppConfig } from '../config/load-config.js';
import { PrismaService } from '../database/prisma.service.js';
import { LoginThrottle } from './login-throttle.js';

/** DI token of the password hasher (an interface has no runtime value to inject by). */
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Last seen" is written at most this often (owner, 2026-11-23): the SPA polls every 30 s
 * (ADR-0018), and a write per request would load the database for nothing. Against an idle
 * timeout of days, 5 minutes of inaccuracy does not matter.
 */
export const LAST_SEEN_RESOLUTION_MS = 5 * 60 * 1000;

/** Used when the connection gives no address (should not happen; never null in the table). */
const UNKNOWN_IP = 'unknown';

/** Where a sign-in came from: stored with the session, shown later in "my sessions". */
export interface ClientInfo {
  userAgent?: string;
  ip?: string | undefined;
}

/** Signing in and out, and finding the user of a session token (ADR-0010). */
@Injectable()
export class SessionService {
  /** A real Argon2id hash of a random password, made once, for unknown e-mails. */
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly throttle: LoginThrottle,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Checks e-mail and password; on success creates a session and returns its token (for
   * the cookie). Any failure is the same `auth.invalid_credentials`, and takes about the
   * same time: an unknown e-mail is still checked against a dummy hash, so the answer time
   * does not reveal which e-mails have an account.
   *
   * Throttling (ADR-0010) is checked first: a waiting client gets 429 `auth.throttled`
   * without a password check (no Argon2 time or memory spent), and that attempt is not
   * counted. A failure is counted for the (e-mail, IP) pair and the IP; a success resets
   * the pair.
   */
  async signIn(
    email: string,
    password: string,
    client: ClientInfo,
  ): Promise<string> {
    const ip = client.ip ?? UNKNOWN_IP;
    const wait = await this.throttle.retryAfterSeconds(email, ip, new Date());
    if (wait > 0) {
      throw new ProblemException('auth.throttled', undefined, {
        retryAfterSeconds: wait,
      });
    }

    const user = await this.prisma.client.user.findUnique({ where: { email } });
    const stored = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await this.hasher.verify(stored, password);
    if (!user?.passwordHash || !valid) {
      await this.throttle.recordFailure(email, ip);
      throw new ProblemException('auth.invalid_credentials');
    }
    await this.throttle.reset(email, ip);

    // Parameters were raised since this hash was made: the password is known right now,
    // so store a new hash with today's parameters (ADR-0010).
    if (this.hasher.needsRehash(user.passwordHash)) {
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.hasher.hash(password) },
      });
    }

    // Always a new token: a token known before sign-in is never upgraded (no fixation).
    const { token, tokenHash } = createSessionToken();
    const now = new Date();
    await this.prisma.client.session.create({
      data: {
        tokenHash,
        userId: user.id,
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(
          now.getTime() + this.config.SESSION_ABSOLUTE_DAYS * DAY_MS,
        ),
        userAgent: client.userAgent?.slice(0, 512),
        ip,
      },
    });
    return token;
  }

  /**
   * The user of an active session, or undefined. An ended session is deleted; an active
   * one gets "last seen" moved to now (the idle time is sliding) — at most every 5 minutes.
   */
  async findUser(
    token: string | undefined,
  ): Promise<{ id: string; email: string } | undefined> {
    if (!token) return undefined;
    const session = await this.prisma.client.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });
    if (!session) return undefined;

    const now = new Date();
    if (
      !isSessionActive(session, now, this.config.SESSION_IDLE_DAYS * DAY_MS)
    ) {
      await this.prisma.client.session.deleteMany({
        where: { id: session.id },
      });
      return undefined;
    }
    if (
      now.getTime() - session.lastSeenAt.getTime() >=
      LAST_SEEN_RESOLUTION_MS
    ) {
      await this.prisma.client.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
    }
    return { id: session.user.id, email: session.user.email };
  }

  /** Signs out: deletes the session of this token. Unknown or missing token: nothing to do. */
  async signOut(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.client.session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  /** How long the browser keeps the cookie: until the absolute end of the session. */
  get cookieMaxAgeMs(): number {
    return this.config.SESSION_ABSOLUTE_DAYS * DAY_MS;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(randomBytes(32).toString('base64url'));
    return this.dummyHash;
  }
}

import {
  ipRetryAfterSeconds,
  type IpPolicy,
  type PairPolicy,
  pairRetryAfterSeconds,
} from '@adlersoft/auth-server';
import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG } from '../config/app-config.token.js';
import type { AppConfig } from '../config/load-config.js';
import { PrismaService } from '../database/prisma.service.js';

/** Failures of a pair older than this are forgotten, even without a successful sign-in. */
const PAIR_MEMORY_MS = 24 * 60 * 60 * 1000;

/**
 * Failed sign-ins in PostgreSQL, and how long a client must wait (ADR-0010). Two counters:
 * the (e-mail, IP) pair — so guessing from one address never locks the owner out on
 * another — and the IP across all accounts (password spraying). No lock of the whole
 * account before task 11 (it needs an e-mail to the owner).
 */
@Injectable()
export class LoginThrottle {
  private readonly pair: PairPolicy;
  private readonly ip: IpPolicy;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.pair = {
      freeFailures: config.LOGIN_PAIR_FREE_FAILURES,
      maxLockMinutes: config.LOGIN_PAIR_MAX_LOCK_MINUTES,
    };
    this.ip = {
      maxFailures: config.LOGIN_IP_MAX_FAILURES,
      windowMinutes: config.LOGIN_IP_WINDOW_MINUTES,
    };
  }

  /** Seconds this e-mail from this IP must still wait; 0 = may try now. */
  async retryAfterSeconds(
    email: string,
    ip: string,
    now: Date,
  ): Promise<number> {
    const failures = this.prisma.client.loginFailure;
    const [pair, nthNewestFromIp] = await Promise.all([
      failures.aggregate({
        where: {
          email,
          ip,
          createdAt: { gt: new Date(now.getTime() - PAIR_MEMORY_MS) },
        },
        _count: true,
        _max: { createdAt: true },
      }),
      // The IP's maxFailures-th most recent failure: if it is inside the window, the IP
      // has reached the limit (ipRetryAfterSeconds).
      failures.findFirst({
        where: { ip },
        orderBy: { createdAt: 'desc' },
        skip: this.ip.maxFailures - 1,
        select: { createdAt: true },
      }),
    ]);
    return Math.max(
      pairRetryAfterSeconds(
        {
          failures: pair._count,
          lastFailureAt: pair._max.createdAt ?? undefined,
        },
        now,
        this.pair,
      ),
      ipRetryAfterSeconds(nthNewestFromIp?.createdAt, now, this.ip),
    );
  }

  async recordFailure(email: string, ip: string): Promise<void> {
    await this.prisma.client.loginFailure.create({ data: { email, ip } });
  }

  /** A successful sign-in: this pair starts from zero. The IP's count stays. */
  async reset(email: string, ip: string): Promise<void> {
    await this.prisma.client.loginFailure.deleteMany({ where: { email, ip } });
  }
}

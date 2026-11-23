import {
  Argon2idPasswordHasher,
  ConcurrencyLimitedPasswordHasher,
  type PasswordHasher,
} from '@adlersoft/auth-server';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { APP_CONFIG } from '../config/app-config.token.js';
import type { AppConfig } from '../config/load-config.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { LoginThrottle } from './login-throttle.js';
import { SameOriginGuard } from './same-origin.guard.js';
import { SessionController } from './session.controller.js';
import {
  ARGON2_HASHER,
  PASSWORD_HASHER,
  SessionService,
} from './session.service.js';

/** Sign-in, sessions, throttling and the CSRF guard (ADR-0010). */
@Module({
  controllers: [SessionController],
  providers: [
    SessionService,
    LoginThrottle,
    // One instance: its in-memory counter is shared by every endpoint that uses it.
    AuthRateLimitGuard,
    // A factory, not useClass: Nest would try to inject the optional parameters argument.
    { provide: ARGON2_HASHER, useFactory: () => new Argon2idPasswordHasher() },
    // Argon2id behind a queue: at most ARGON2_MAX_CONCURRENT hashes at once (46 MiB each),
    // at most ARGON2_MAX_QUEUE waiting; one more → 503 at once.
    {
      provide: PASSWORD_HASHER,
      inject: [ARGON2_HASHER, APP_CONFIG],
      useFactory: (argon2: PasswordHasher, config: AppConfig) =>
        new ConcurrencyLimitedPasswordHasher(
          argon2,
          config.ARGON2_MAX_CONCURRENT,
          config.ARGON2_MAX_QUEUE,
        ),
    },
    // Global: guards every route of the app, not only /session.
    { provide: APP_GUARD, useClass: SameOriginGuard },
  ],
})
export class SessionModule {}

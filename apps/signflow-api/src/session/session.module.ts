import {
  Argon2idPasswordHasher,
  ConcurrencyLimitedPasswordHasher,
} from '@adlersoft/auth-server';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { APP_CONFIG } from '../config/app-config.token.js';
import type { AppConfig } from '../config/load-config.js';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';
import { LoginThrottle } from './login-throttle.js';
import { SameOriginGuard } from './same-origin.guard.js';
import { SessionController } from './session.controller.js';
import { PASSWORD_HASHER, SessionService } from './session.service.js';

/** Sign-in, sessions, throttling and the CSRF guard (ADR-0010). */
@Module({
  controllers: [SessionController],
  providers: [
    SessionService,
    LoginThrottle,
    // One instance: its in-memory counter is shared by every endpoint that uses it.
    AuthRateLimitGuard,
    // Argon2id behind a queue: at most ARGON2_MAX_CONCURRENT hashes at once (46 MiB each).
    {
      provide: PASSWORD_HASHER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new ConcurrencyLimitedPasswordHasher(
          new Argon2idPasswordHasher(),
          config.ARGON2_MAX_CONCURRENT,
        ),
    },
    // Global: guards every route of the app, not only /session.
    { provide: APP_GUARD, useClass: SameOriginGuard },
  ],
})
export class SessionModule {}

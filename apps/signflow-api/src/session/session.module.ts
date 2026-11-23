import { Argon2idPasswordHasher } from '@adlersoft/auth-server';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SameOriginGuard } from './same-origin.guard.js';
import { SessionController } from './session.controller.js';
import { PASSWORD_HASHER, SessionService } from './session.service.js';

/** Sign-in, sessions and the CSRF guard (ADR-0010). */
@Module({
  controllers: [SessionController],
  providers: [
    SessionService,
    // A factory, not useClass: Nest would try to inject the optional parameters argument.
    {
      provide: PASSWORD_HASHER,
      useFactory: () => new Argon2idPasswordHasher(),
    },
    // Global: guards every route of the app, not only /session.
    { provide: APP_GUARD, useClass: SameOriginGuard },
  ],
})
export class SessionModule {}

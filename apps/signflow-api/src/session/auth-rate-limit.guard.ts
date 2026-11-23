import { RequestRateLimiter } from '@adlersoft/auth-server';
import { ProblemException } from '@adlersoft/api-kit';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { APP_CONFIG } from '../config/app-config.token.js';
import type { AppConfig } from '../config/load-config.js';

/**
 * The first line of defence on sign-in endpoints (ADR-0010): at most
 * AUTH_RATE_LIMIT_PER_MINUTE requests per minute per IP, counted in memory, before
 * validation and before the database. Over the limit: 429 `auth.throttled` + Retry-After.
 * Put on an endpoint with `@UseGuards(AuthRateLimitGuard)`; one counter for all of them.
 */
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly limiter: RequestRateLimiter;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.limiter = new RequestRateLimiter(config.AUTH_RATE_LIMIT_PER_MINUTE);
  }

  canActivate(context: ExecutionContext): boolean {
    const { ip } = context.switchToHttp().getRequest<{ ip?: string }>();
    const wait = this.limiter.hit(ip ?? 'unknown');
    if (wait > 0) {
      throw new ProblemException('auth.throttled', undefined, {
        retryAfterSeconds: wait,
      });
    }
    return true;
  }
}

import {
  isCrossSiteRequest,
  type RequestHeaders,
} from '@adlersoft/auth-server';
import { ProblemException } from '@adlersoft/api-kit';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

/**
 * CSRF protection (ADR-0010), registered for every route (APP_GUARD): a state-changing
 * request from another site → 403 `request.cross_site`. Runs before validation and before
 * the controller, so such a request never touches the database.
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; headers: RequestHeaders }>();
    if (isCrossSiteRequest(request.method, request.headers)) {
      throw new ProblemException('request.cross_site');
    }
    return true;
  }
}

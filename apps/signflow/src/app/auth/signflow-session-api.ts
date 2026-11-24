import { inject, Injectable } from '@angular/core';
import type {
  Credentials,
  SessionApi,
  SessionUser,
} from '@adlersoft/auth-client';
import { SessionService } from '@adlersoft/signflow-api-client';
import { map, type Observable } from 'rxjs';

/**
 * The session calls of libs/shared/auth-client over SignFlow's generated client
 * (ADR-0007, ADR-0010). Errors stay Angular's HttpErrorResponse.
 */
@Injectable()
export class SignflowSessionApi implements SessionApi {
  private readonly session = inject(SessionService);

  get(): Observable<SessionUser> {
    return this.session.getSession().pipe(map((answer) => answer.user));
  }

  create(credentials: Credentials): Observable<void> {
    return this.session.createSession(credentials);
  }

  delete(): Observable<void> {
    return this.session.deleteSession();
  }
}

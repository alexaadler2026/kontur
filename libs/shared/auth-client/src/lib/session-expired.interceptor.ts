import {
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AUTH_CLIENT_CONFIG, SESSION_EXPIRED } from './session-api';
import { SessionStore } from './session.store';

/**
 * ADR-0010: "a 401 anywhere sends the user to the login screen". Only when somebody WAS
 * signed in (then the session has ended on the server); before that the guards decide.
 * The 401 of the session resource itself is an answer (wrong password, nobody signed in),
 * not an expiry. The caller still gets its error.
 *
 * Register in the app: provideHttpClient(withInterceptors([sessionExpiredInterceptor])).
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  const { loginPath, sessionPath } = inject(AUTH_CLIENT_CONFIG);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        pathOf(request.url) !== sessionPath &&
        store.signedIn()
      ) {
        store.markSignedOut();
        void router.navigate([loginPath], {
          queryParams: { returnUrl: router.url },
          state: { [SESSION_EXPIRED]: true },
        });
      }
      return throwError(() => error);
    }),
  );
};

/** "/api/v1/session?x=1" → "/api/v1/session" (also for absolute URLs). */
function pathOf(url: string): string {
  return new URL(url, 'http://localhost').pathname;
}

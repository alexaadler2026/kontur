import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/** Who is signed in — the user of GET /session (ADR-0010). */
export interface SessionUser {
  id: string;
  email: string;
}

export interface Credentials {
  email: string;
  password: string;
}

/**
 * The three session calls (ADR-0010). The library knows no app: each app implements this
 * over its own generated client (ADR-0007) and passes it to provideAuthClient().
 * Errors are the HttpErrorResponse of Angular's HttpClient, unchanged.
 */
export interface SessionApi {
  /** GET /session → the user, or 401 when nobody is signed in. */
  get(): Observable<SessionUser>;
  /** POST /session → 204 and the cookie (no body). */
  create(credentials: Credentials): Observable<void>;
  /** DELETE /session → 204, also without a session. */
  delete(): Observable<void>;
}

export const SESSION_API = new InjectionToken<SessionApi>('SESSION_API');

export interface AuthClientConfig {
  /** The sign-in route of the app. */
  loginPath: string;
  /** The path of the session resource: its 401 is an answer, not an expiry. */
  sessionPath: string;
}

export const AUTH_CLIENT_CONFIG = new InjectionToken<AuthClientConfig>(
  'AUTH_CLIENT_CONFIG',
);

/** Navigation state key of the redirect after an ended session (owner: not in the URL). */
export const SESSION_EXPIRED = 'sessionExpired';

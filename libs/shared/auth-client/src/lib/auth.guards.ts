import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { safeReturnUrl } from './safe-return-url';
import { AUTH_CLIENT_CONFIG } from './session-api';
import { SessionStore } from './session.store';

/**
 * Pages for signed-in people. Without a session → the sign-in page, with the requested
 * path as returnUrl (only an id in the path, never personal data: ADR-0008).
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  // inject() before the first await: after it, the injection context is gone.
  const store = inject(SessionStore);
  const router = inject(Router);
  const { loginPath } = inject(AUTH_CLIENT_CONFIG);

  await store.load();
  return store.signedIn()
    ? true
    : router.createUrlTree([loginPath], {
        queryParams: { returnUrl: state.url },
      });
};

/** The sign-in page: whoever is already signed in goes on to returnUrl (or "/"). */
export const guestGuard: CanActivateFn = async (route) => {
  const store = inject(SessionStore);
  const router = inject(Router);

  await store.load();
  return store.signedIn()
    ? router.parseUrl(safeReturnUrl(route.queryParams['returnUrl']))
    : true;
};
